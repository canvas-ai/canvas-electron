
/**
 * After spending quite some time trying to get messaging running
 * between the background script and the UI script
 * browser.runtime.connect()
 * browser.runtime.sendMessage()
 *
 * I decided to go with socket.io, please fix this! :)
 */

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

// TODO: Configure based on config.json
const socket = io.connect(`${config.socketio.protocol}://${config.socketio.host}:${config.socketio.port}`);
socket.on('connect', () => {
    console.log('[socket.io:ui] Client connected to server');
});

socket.on('connect_error', function(error) {
    console.log(`[socket.io:ui] Connection to "${config.socketio.protocol}://${config.socketio.host}:${config.socketio.port}" failed`);
    console.error(error.message); // Error message will give you more detail about the error.
});

socket.on('connect_timeout', function() {
    console.log('[socket.io:ui] Connection Timeout');
});


// Populate the pop-up with the current tabs
browser.tabs.query({}).then((tabs) => {
    updateTabList(tabs);
});

document.addEventListener("DOMContentLoaded", async function() {
    var elems = document.querySelectorAll(".collapsible");
    var instances = M.Collapsible.init(elems, {
        accordion: false,
    });

    console.log('DOM loaded');
    getContextUrl()
    updateTabCount()

});


/**
 * Functions
 */

function getContextUrl() {
    socket.emit('context:get:url', {}, (res) => {
        console.log(`(UI) Got context URL: "${res}"`)
        updateContextBreadcrumbs(sanitizePath(res))
    })
}

function sanitizePath(path) {
    if (path == '/') return 'universe:///'
    path = path.replace(/\/\//g, '/').replace(/\:/g, '')
    return path
}

function updateContextBreadcrumbs(url) {
    console.log('Updating breadcrumbs')

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

    console.log('Updating tab count')
    let tabs = await browser.tabs.query({});
    let count = 0;

    for (let i = 0; i < tabs.length; i++) {
        if (tabs[i].url !== 'about:blank' && tabs[i].url !== 'about:newtab') {
            count++;
        }
    }

    console.log(`Number of open tabs (excluding empty/new tabs): ${count}`);
    document.getElementById('tab-count').textContent = count;
}

document.addEventListener("DOMContentLoaded", updateTabCount);


// Function to update the tab list in your UI
function updateTabList(tabs) {
  const tabListContainer = document.getElementById('tab-list');

  const tabHeader = document.createElement("li");
  tabHeader.className = "collection-header";
  tabHeader.textContent = "Unsynced Tabs";

  // Clear the existing tab list
  tabListContainer.innerHTML = '';
  tabListContainer.appendChild(tabHeader);

  // Generate the updated tab list
  tabs.forEach((tab) => {

    /*
    <li class="collection-item">
        <div>Alvin
            <a href="#!" class="secondary-content">
                <i class="material-icons">send</i>
            </a>
        </div>
    </li>
    */

    const tabItem = document.createElement("li");
    tabItem.className = "collection-item";
    tabItem.textContent = tab.title;

    const tabItemIcon = document.createElement("i");
    tabItemIcon.className = "material-icons secondary-content";
    tabItemIcon.textContent = "close";

    tabItem.appendChild(tabItemIcon);
    tabListContainer.appendChild(tabItem);

  });
}

document.addEventListener("DOMContentLoaded", updateTabList);
