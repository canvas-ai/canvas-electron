/**
 * Config (to-be-moved to config.json / LocalStore)
 */

const config = {
    autoUpdateTabs: true,
    socketio: {
        protocol: 'http',
        host: '127.0.0.1',
        port: 3001
    }
}

/**
 * Runtime Variables
 */

let context = {};
let tabs;


/**
 * Socket.io
 */

// TODO: Configure based on config.json
const socket = io.connect(`${config.socketio.protocol}://${config.socketio.host}:${config.socketio.port}`);
socket.on('connect', () => {
    console.log('[socket.io] Client connected to server');
});

socket.on('connect_error', function(error) {
    console.log(`[socket.io] Connection to "${config.socketio.protocol}://${config.socketio.host}:${config.socketio.port}" failed`);
    console.error(error.message); // Error message will give you more detail about the error.
});

socket.on('connect_timeout', function() {
    console.log('[socket.io] Connection Timeout');
});

socket.on('context:url', (res) => {
    context.url = res
    console.log(`[socket.io] Got context URL: "${context.url}"`)
});

socket.on('disconnect', () => {
    console.log('[socket.io] Client disconnected from server');
});

socket.emit('context:get', 'url', (res) => {
    context.url = res
    console.log(`[socket.io] Got context URL: "${context.url}"`)
})

// Subscribe to tab updates
socket.emit('subscribe', 'data/abstraction/tab', updateBrowserTabs);

// Update tabs on data/abstraction/tab event
socket.on('data/abstraction/tab', (tabArray) => {
    updateBrowserTabs(tabArray)
});


/**
 * Browser event listeners
 */

let tabUrls = {};   // Workaround for the missing tab info on onRemoved() and onMove()
let watchTabProperties = {
    properties: [
        "url",
        "hidden",
        "pinned",
        "mutedInfo"
    ]
}

// Initialize tabUrls
browser.tabs.query({}).then((tabs) => {
    for (const tab of tabs) { tabUrls[tab.id] = tab.url; }
})

browser.tabs.onCreated.addListener((tab) => {
    // noop, we need to wait for the onUpdated event to get the url
    console.log(`Tab created: ${tab.id}`);
})

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Only trigger if url is set and is different from what we already have cached
    // Assuming we already have the current session stored
    if (changeInfo.url && tabUrls[tabId] !== tab.url) {

        // Ignore empty tabs
        if (tab.url == "about:newtab" || tab.url == "about:blank") return

        console.log(`Tab ID ${tabId} changed, sending update to backend`)
        tabUrls[tabId] = tab.url;
        socket.emit('data/abstraction/tab', 'update', stripTabProperties(tab));
    }
}, watchTabProperties)

browser.tabs.onMoved.addListener((tabId, moveInfo) => {
    let url = tabUrls[tabId];
    let tab = {
        id: tabId,
        url: url,
        index: moveInfo.toIndex
    };
    console.log(`Tab ID ${tabId} moved from ${moveInfo.fromIndex} to ${moveInfo.toIndex}, sending update to backend`);
    socket.emit('data/abstraction/tab', 'update', tab);
});

browser.browserAction.onClicked.addListener((tab, OnClickData) => {

    // Ignore empty tabs
    if (!tab.url || tab.url == "about:newtab" || tab.url == "about:blank") return

    // Update backend
    console.log(`Sending update to backend for tab ${tab.id}`);
    tabUrls[tab.id] = tab.url;

    console.log(stripTabProperties(tab))
    socket.emit('data/abstraction/tab', 'update', stripTabProperties(tab));
});

browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
    let url = tabUrls[tabId];
    let tab = {
        id: tabId,
        url: url
    };

    // Ignore empty tabs
    if (!tab.url || tab.url == "about:newtab" || tab.url == "about:blank") return

    // Update backend
    console.log(`Tab ID ${tabId} removed, updating backend`);
    socket.emit('data/abstraction/tab', 'delete', tab);
    delete tabUrls[tabId]
});


/**
 * Functions
 */

function sanitizePath(path) {
    if (path == '/') return 'universe:///'
    path = 'universe://' + path
    path = path.replace(/\/\//g, '/')
    return path
}

function updateBrowserTabs(tabArray, hideInsteadOfRemove = true) {

    browser.tabs.query({}).then((tabs) => {

        let tabsToRemove = tabs.filter(tab => !tabArray.find(newTab => newTab.id === tab.id));
        tabsToRemove.forEach(tab => {
            console.log(`Removing tab ${tab.id}`);
            //browser.tabs.remove(tab.id)
        });

        tabArray.forEach(newTab => {
            if (!tabs.find(tab => tab.id === newTab.id)) {
                console.log(`Creating tab ${tab.id}`);
                //browser.tabs.create(newTab);
            }
        });
    });
}

function stripTabProperties(tab) {
    return {
        //id: tab.id,
        index: tab.index,
        // Restore may fail if windowId does not exist
        // TODO: Handle this case with windows.create()
        // windowId: tab.windowId,
        highlighted: tab.highlighted,
        active: tab.active,
        pinned: tab.pinned,
        hidden: tab.hidden,
        // boolean. Whether the tab is created and made visible in the tab bar without any content
        // loaded into memory, a state known as discarded. The tab's content is loaded when the tab
        // is activated.
        // Defaults to true to conserve memory on restore
        discarded: true, // tab.discarded,
        incognito: tab.incognito,
        //width: 1872,
        //height: 1004,
        //lastAccessed: 1675111332554,
        audible: tab.audible,
        mutedInfo: tab.mutedInfo,
        isArticle: tab.isArticle,
        isInReaderMode: tab.isInReaderMode,
        sharingState: tab.sharingState,
        url: tab.url,
        title: tab.title
    }
}
