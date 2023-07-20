
/**
 * After spending quite some time trying to get messaging running
 * between the background script and the UI script
 * browser.runtime.connect()
 * browser.runtime.sendMessage()
 *
 * I decided to go with socket.io, please fix this! :)
 */

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

// TODO: Configure based on config.json
const socket = io.connect(`${config.transport.protocol}://${config.transport.host}:${config.transport.port}`);
socket.on('connect', () => {
    console.log('[socket.io:ui] Client connected to server');
});

socket.on('connect_error', function(error) {
    console.log(`[socket.io:ui] Connection to "${config.transport.protocol}://${config.transport.host}:${config.transport.port}" failed`);
    console.error(error.message); // Error message will give you more detail about the error.
});

socket.on('connect_timeout', function() {
    console.log('[socket.io:ui] Connection Timeout');
});

// Populate the pop-up with the current tabs
browser.tabs.query({}).then((tabs) => {
    updateTabList(tabs);
});



/**
 * UI
 */

// Initialize Materialize components
document.addEventListener("DOMContentLoaded", async function() {
    console.log('UI | DOM loaded');

    var mTabElements = document.querySelectorAll(".tabs");
    var mTabs = M.Tabs.init(mTabElements, {});

    var mCollapsibleElements = document.querySelectorAll(".collapsible");
    var mCollapsible = M.Collapsible.init(mCollapsibleElements, {
        accordion: false,
    });

    getContextUrl()
    updateTabCount()

});


let syncTabsToCanvasButton = document.getElementById('sync-tabs-to-canvas');
syncTabsToCanvasButton.addEventListener('click', () => {
    console.log('UI | Syncing tabs to canvas')
    browser.runtime.sendMessage({ action: 'syncTabsToCanvas2' });
})


/**
 * Functions
 */

function getContextUrl() {
    socket.emit('context:get:url', {}, (res) => {
        console.log(`UI | Got context URL: "${res}"`)
        updateContextBreadcrumbs(sanitizePath(res))
    })
}

function sanitizePath(path) {
    if (path == '/') return 'universe:///'
    path = path.replace(/\/\//g, '/').replace(/\:/g, '')
    return path
}

function updateContextBreadcrumbs(url) {
    console.log('UI | Updating breadcrumbs')

    url = sanitizePath(url)
    const breadcrumbContainer = document.getElementById("breadcrumb-container");
    if (breadcrumbContainer) {
        breadcrumbContainer.innerHTML = ""; // Clear existing breadcrumbs

        const breadcrumbNames = url.split("/").filter((name) => name !== "");
        breadcrumbNames.forEach((name) => {
            const breadcrumbLink = document.createElement("a");
            breadcrumbLink.href = "#!";
            breadcrumbLink.className = "breadcrumb black-text";
            breadcrumbLink.textContent = name;
            breadcrumbContainer.appendChild(breadcrumbLink);
        });
    }
}

async function updateTabCount() {

    console.log('UI | Updating tab count')
    let tabs = await browser.tabs.query({});
    let count = 0;

    for (let i = 0; i < tabs.length; i++) {
        if (tabs[i].url !== 'about:blank' && tabs[i].url !== 'about:newtab') {
            count++;
        }
    }

    console.log(`UI | Number of open tabs (excluding empty/new tabs): ${count}`);
    document.getElementById('tab-count').textContent = count;
}

document.addEventListener("DOMContentLoaded", updateTabCount);


// Function to update the tab list in your UI
function updateTabList(tabs) {

    if (!tabs || tabs.length < 1) return;

    console.log(typeof tabs)
    const tabListContainer = document.getElementById('tab-list');

    // Clear the existing tab list
    tabListContainer.innerHTML = '';

    // Generate the updated tab list
    tabs.forEach((tab) => {

        const tabItem = document.createElement("li");
        tabItem.className = "collection-item";

        const tabItemTitle = document.createElement("p");
        tabItemTitle.textContent = tab.title;

        const tabItemIconSync = document.createElement("i");
        tabItemIconSync.className = "material-icons secondary-content black-text";
        tabItemIconSync.textContent = "sync";

        const tabItemIconLoad = document.createElement("i");
        tabItemIconLoad.className = "material-icons secondary-content";
        tabItemIconLoad.textContent = "close";

        tabItem.appendChild(tabItemTitle);
        tabItem.appendChild(tabItemIconSync);
        tabItem.appendChild(tabItemIconLoad);
        tabListContainer.appendChild(tabItem);

    });
}

document.addEventListener("DOMContentLoaded", updateTabList);
