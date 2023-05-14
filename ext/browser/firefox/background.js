/**
 * Variables
 */

let context = {};
let tabUrls = {};   // Workaround for the missing tab info on onRemoved() and onMove()
let settings = {
    autoUpdateTabs: true
};  // TODO: Load from localStorage/Canvas


/**
 * Socket.io
 */

const socket = io.connect('http://127.0.0.1:8001');
socket.on('connect', () => {
    console.log('Client connected to server');
});

socket.on('context:url', (res) => {
    context.url = res
    console.log(`Got context URL: "${context.url}"`)
});

socket.on('disconnect', () => {
    console.log('Client disconnected from server');
});

socket.emit('context:get', 'url', (res) => {
    context.url = res
    console.log(`Got context URL: "${context.url}"`)
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

// Initialize tabUrls
browser.tabs.query({}).then((tabs) => {
    for (const tab of tabs) { tabUrls[tab.id] = tab.url; }
})

browser.tabs.onCreated.addListener((tab) => {
    if (tab.url !== "about:newtab") {
        return    // Noop, covered by onUpdated event handler
    }

    console.log(`Tab created: ${tab.id}`);
})

browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
    let url = tabUrls[tabId];
    let tab = {
        id: tabId,
        url: url
    };

    if (!tab.url) {
        console.log(`Tab removed, tab url not cached, no update sent to backend`)
        return
    }

    console.log(`Tab ID ${tabId} removed, updating backend`);
    socket.emit('data/abstraction/tab', 'remove', tab);
    delete tabUrls[tabId]
});

browser.browserAction.onClicked.addListener((tab, OnClickData) => {
    console.log(`Sending update to backend for tab ${tab.id}`);
    tabUrls[tab.id] = tab.url;

    console.log(stripTabProperties(tab))
    socket.emit('data/abstraction/tab', 'update', stripTabProperties(tab));
});

if (settings.autoUpdateTabs) {

    let tabProperties = {
        properties: [
            "url",
            "hidden",
            "pinned",
            "mutedInfo"
        ]
    }

    browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        // Only trigger if url is set and is different from what we already have cached
        // Assuming we already have the current session stored
        if (changeInfo.url && tabUrls[tabId] !== tab.url) {
            console.log(`Tab ID ${tabId} changed, sending update to backend`)

            tabUrls[tabId] = tab.url;
            socket.emit('data/abstraction/tab', 'update', stripTabProperties(tab));
        }
    }, tabProperties)

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

}


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
