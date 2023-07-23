/**
 * Runtime Variables
 */

let config = {};
let context = {};
let isConnected = false;


/**
 * Initialize UI
 */

browser.runtime.sendMessage({ action: 'get:socket:status' }, (status) => {
    console.log(`UI | Background canvas connection status: "${status}"`)
    isConnected = status;
});

browser.runtime.sendMessage({ action: 'get:config' }, (cfg) => {
    console.log(`UI | Config: "${JSON.stringify(cfg, null, 2)}"`)
    config = cfg;
});

browser.runtime.sendMessage({ action: 'get:context' }, (ctx) => {
    console.log(`UI | Context: "${JSON.stringify(ctx, null, 2)}"`)
    context = ctx;
});


// Initialize Materialize components
document.addEventListener("DOMContentLoaded", async () => {
    console.log('UI | DOM loaded');

    var mTabElements = document.querySelectorAll(".tabs");
    var mTabs = M.Tabs.init(mTabElements, {});

    var mCollapsibleElements = document.querySelectorAll(".collapsible");
    var mCollapsible = M.Collapsible.init(mCollapsibleElements, {
        accordion: false,
    });

    // Populate the pop-up with
    browser.runtime.sendMessage({ action: 'get:context:url' }, (url) => {
        if (!url) {
            console.log('UI | No context URL received from backend')
            updateContextBreadcrumbs('> Canvas backend not connected')
            return;
        }

        context.url = url
    });

    browser.tabs.query({}).then((tabs) => {
        updateTabList(tabs);
        updateTabCount(tabs);
    });

});


/**
 * Listeners
 */

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('UI | Message received: ', message);
    if (message.type === 'context:url') {
        const url = message.data;
        console.log(`UI | Got context URL: "${url}"`)
        updateContextBreadcrumbs(sanitizePath(url))
        context.url = url
    }
});


/**
 * UI Controls
 */

let syncTabsToCanvasButton = document.getElementById('sync-all-tabs');
syncTabsToCanvasButton.addEventListener('click', () => {
    console.log('UI | Syncing all tabs to canvas')
    browser.runtime.sendMessage({ action: 'insert:tabs' });
})

let openTabsFromCanvasButton = document.getElementById('open-all-tabs');
openTabsFromCanvasButton.addEventListener('click', () => {
    console.log('UI | Opening all tabs from canvas')

})


/**
 * Functions
 */

function updateContextBreadcrumbs(url) {
    console.log('UI | Updating breadcrumbs')
    if (!url) return console.log('UI | No URL provided')
    if (typeof url !== 'string') return console.log('UI | URL is not a string')

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

function updateTabCount(tabs) {
    console.log('UI | Updating tab count')
    if (!tabs || tabs.length < 1) return console.log('UI | No tabs provided')
    let count = 0;

    for (let i = 0; i < tabs.length; i++) {
        if (tabs[i].url !== 'about:blank' && tabs[i].url !== 'about:newtab') {
            count++;
        }
    }

    console.log(`UI | Number of open tabs (excluding empty/new tabs): ${count}`);
    document.getElementById('tab-count').textContent = count;
}

function updateTabList(tabs) {

    if (!tabs || tabs.length < 1) return;

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
