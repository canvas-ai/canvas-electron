/**
 * Config (to-be-moved to LocalStore)
 */

const config = {
    sync:{
        autoRestoreSession: false,  // Restores all tabs from the backend on startup
        autoSaveSession: false,     // Saves all tabs to the backend as they are created
    },
    transport: {
        protocol: 'http',
        host: '127.0.0.1',
        port: 3001
    }
}


/**
 * Runtime Variables
 */

let context;
let store;

let syncQueue = new Map()

let TabSchema;
let tabs;
let tabUrls = {};   // Workaround for the missing tab info on onRemoved() and onMove()
let watchTabProperties = {
    properties: [
        "url",
        "hidden",
        "pinned",
        "mutedInfo"
    ]
}


/**
 * Socket.io
 */

// TODO: Configure based on config.json
const socket = io.connect(`${config.transport.protocol}://${config.transport.host}:${config.transport.port}`);

socket.on('connect', () => {
    console.log('[socket.io] Client connected to server');
    fetchContextUrl();
    fetchTabSchema();
    fetchStoredUrls();
});

socket.on('connect_error', function(error) {
    console.log(`[socket.io] Connection to "${config.transport.protocol}://${config.transport.host}:${config.transport.port}" failed`);
    console.error(error.message); // Error message will give you more detail about the error.
});

socket.on('connect_timeout', function() {
    console.log('[socket.io] Connection Timeout');
});

socket.on('disconnect', () => {
    console.log('[socket.io] Client disconnected from server');
});


/**
 * Message Handlers
 */

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Message received: ', message);

    switch(message.action) {

        case 'get:context:url':
            sendResponse(context.url);
            break;

        case 'get:tab:schema':
            sendResponse(TabSchema);

        //case 'get:tab':
        case 'syncTab':
        case 'syncTabs':

        default:
            console.error(`Unknown message action: ${message.action}`);
            break;

    }

});


/**
 * Browser event listeners
 */

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
        tabUrls[tabId] = tab.url;

        let doc = formatTabProperties(tab);

        // Update backend
        console.log(`Tab ID ${tabId} changed, sending update to backend`)
        insertDocument(doc)

        // Update browser
        console.log(`Tab ID ${tabId} changed, sending update to browser extension`)
        browser.runtime.sendMessage({ tabs: tabs });

    }
}, watchTabProperties)

browser.tabs.onMoved.addListener((tabId, moveInfo) => {
    let url = tabUrls[tabId];
    let tab = {
        id: tabId,
        url: url,
        index: moveInfo.toIndex
    };

    // Update backend
    console.log(`Tab ID ${tabId} moved from ${moveInfo.fromIndex} to ${moveInfo.toIndex}, sending update to backend`);
    let doc = Tab
    doc.data = stripTabProperties(tab)
    updateDocument(doc)

});

browser.browserAction.onClicked.addListener((tab, OnClickData) => {

    // Ignore empty tabs
    if (!tab.url || tab.url == "about:newtab" || tab.url == "about:blank") return

    // Update backend
    console.log(`Sending update to backend for tab ${tab.id}`);
    tabUrls[tab.id] = tab.url;

    let doc = Tab
    doc.data = stripTabProperties(tab)

    updateDocument(doc)

});

browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
    let url = tabUrls[tabId];
    let tab = {
        id: tabId,
        url: url
    };

    // Ignore empty tabs
    if (!tab.url || tab.url == "about:newtab" || tab.url == "about:blank") return

    let doc = Tab
    doc.data = stripTabProperties(tab)

    // Update backend
    console.log(`Tab ID ${tabId} removed, updating backend`);
    removeDocument(doc)

    // Update browser
    console.log(`Tab ID ${tabId} removed, sending update to browser extension`)
    browser.runtime.sendMessage({ tabs: tabs });

    delete tabUrls[tabId]
});


/**
 * Functions (new api)
 */

function saveTabToBackend(tab, cb) {
    let doc = formatTabProperties(tab);
    socket.emit('index:insertDocument', doc, (res) => {
        console.log('Document inserted: ', res);
        if (cb) cb(res)
    });
}

function loadTabFromBackend(tabID, cb) {
    socket.emit('index:getDocuments', tabID, (res) => {
        console.log('Document fetched: ', res);
        if (cb) cb(res)
    });
}

function saveTabsToBackend() {

}

function loadTabsFromBackend() {

}





/**
 * Functions
 */

// Fetch context URL, Tab schema, and stored URLs from the server
function fetchContextUrl() {
    socket.emit('context:get:url', {}, function(data) {
        context = data;
        console.log('Context URL fetched: ', context);
    });
}

function fetchTabSchema() {
    socket.emit('index:schema:get', {type: 'data/abstr/tab', version: '2'}, function(data) {
        if (!data || data.status == 'error') return console.error('Tab schema not found');
        Tab = data;
        console.log('Tab schema fetched: ', Tab);
    });
}

function fetchStoredUrls() {
    socket.emit('listDocuments', {
        context: context,
        type: 'data/abstraction/tab',
    }, (data) => {
        tabUrls = data;
        console.log('Stored URLs fetched: ', tabUrls);
    });
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




/**
 * Utils
 */

function sanitizePath(path) {
    if (path == '/') return 'universe:///'
    path = 'universe://' + path
    path = path.replace(/\/\//g, '/')
    return path
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

function formatTabProperties(tab) {
    return {
        ...Tab,
        type: 'data/abstraction/tab',
        data: {
            browser: 'firefox',
            url: tab.url,
            title: tab.title,
        },
        meta: {
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
        }

    }

}
