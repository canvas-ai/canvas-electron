(function() {
    jQuery.noConflict();
    $ = function(selector,context) { 
        return new jQuery.fn.init(selector,context||example.doc); 
    };
    $.fn = $.prototype = jQuery.fn;

if (window.module) module = window.module;

const socket = io.connect('http://127.0.0.1:8001');
let context = {}

function updateContextTree() {
  socket.emit('context:get', 'tree', function(res) {
    // Parse the response data as JSON
    var treeData = [res];

    console.log(JSON.stringify(treeData, null, 2))

    // Update the jstree data with the received data
    $('#context-tree').jstree(true).settings.core.data = treeData;
    $('#context-tree').jstree(true).refresh();
    $('#context-tree').jstree(true).open_all()
  });
}

function updateContextBreadcrums(url) {

    // Get the #context-url div
    const contextUrlDiv = $('#context-url');

    // Clear the contents of the div
    contextUrlDiv.empty();

    // Split the URL into parts
    url = new URL(url)
    const urlParts = url.pathname.split('/').filter(Boolean);

    // Iterate over the URL parts and create links
    for (let i = 0; i < urlParts.length; i++) {
        // Create a link element for the URL part
        const linkEl = $('<a>', {
        text: urlParts[i],
        class: 'context-url-link',
        href: '#',
        click: function(e) {
            e.preventDefault();
            // Do something when the link is clicked (e.g. navigate to the URL)
        }
        });

        // Append the link element to the #context-url div
        contextUrlDiv.append(linkEl);

        // Add a separator between URL parts (except for the last part)
        if (i < urlParts.length - 1) {
            contextUrlDiv.append($('<span>', { text: '/' }));
        }
    }
}

$('#context-tree').jstree({
    "core" : {
        "animation" : 0,
        "multiple" : false,
        "check_callback" : true,
        "themes" : { "stripes" : true },
        'data' : updateContextTree(),
        'open_all': true,
        "check_callback": true,
        "themes" : {
            "variant" : "large"
        }
    },
    "types" : {
        "#" : {
        "max_children" : 1,
        "max_depth" : 4,
        "valid_children" : ["root"]
        },
        "root" : {
        "icon" : "/static/3.3.15/assets/images/tree_icon.png",
        "valid_children" : ["default"]
        },
        "default" : {
        "valid_children" : ["default","file"]
        },
        "file" : {
        "icon" : "glyphicon glyphicon-file",
        "valid_children" : []
        }
    },
    "plugins" : [
        "contextmenu", "dnd", "search",
        "types", "wholerow" // "state"
    ]
});

$('#context-tree').on('select_node.jstree', function(e, data) {
    const nodePath = sanitizePath(data.instance.get_path(data.node, '/', false))
    console.log('Selected node path:', nodePath);
    socket.emit('context:set', nodePath)
});

$('#context-tree').on('create_node.jstree', function(e, data) {
  const nodePath = sanitizePath(data.instance.get_path(data.node, '/', false));
  const newNode = data.node;
  console.log('New node:', newNode);
});

$('#context-tree').on('rename_node.jstree', function(e, data) {

    const nodePath = sanitizePath(data.instance.get_path(data.node, '/', false))

    // Get the old name of the node
    const oldName = data.old;

    // Get the renamed node
    const newName = data.node.text;

    // Send an event to the backend
    console.log('Renamed node:', newName)
    console.log('Old name:', oldName)
    //socket.emit('node:rename', oldName, newName);

    // Send an event to the backend
    console.log('New node path to insert:', nodePath)
    socket.emit('context:insert', nodePath);

});

socket.emit('context:get', 'url', (res) => {
    context.url = res
    console.log(`Current context URL: "${context.url}"`)
})

socket.on('context:url', (url) => {
    context.url = url;
    console.log(`Context URL changed to: "${context.url}"`);
    updateContextBreadcrums(url)
    updateContextTree()
})



socket.on('context:tree', (res) => {
    context.tree = res
    console.log(res)
    $('#context-tree').jstree(true).settings.core.data = [res];
    $('#context-tree').jstree(true).refresh();
})


function sanitizePath(path) {
    if (path == '/') return 'universe:///'
    path = 'universe://' + path
    path = path.replace(/\/\//g, '/')
    return path
}

let tabUrls = {};   // Workaround for the missing tab info on onRemoved() and onMove()
let autosync = false

// Initialize tabUrls
browser.tabs.query({}).then((tabs) => {
    for (const tab of tabs) { tabUrls[tab.id] = tab.url; }
})

// Initialize context URL
socket.emit('context/get', 'url', (url) => {
    context = url
    console.log(`Current context URL: ${context}`)
})


/**
 * Browser event listeners
 */

browser.tabs.onCreated.addListener((tab) => {
    console.log(`Tab created: ${tab.id}`);
    if (tab.url !== "about:newtab") {
        return    // Noop, covered by onUpdated event handler
    }
})

if (autosync) {
    let tabProperties = { properties: [ "url", "hidden", "pinned", "mutedInfo" ] }
    browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {

        // Only trigger if url is set and is different from what we alreayd have cached
        // Assuming we already have the current session stored
        if (changeInfo.url && tabUrls[tabId] !== tab.url) {

            console.log(`Tab ID ${tabId} changed, sending update to backend`)
            tabUrls[tabId] = tab.url;
            socket.emit('data/abstr/tab', 'update', stripTabProperties(tab));
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
        socket.emit('data/abstr/tab', 'update', tab);
    });

}

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
    socket.emit('data/abstr/tab', 'remove', tab);
    delete tabUrls[tabId]
});


/**
 * Menu
 */

browser.browserAction.onClicked.addListener((tab, OnClickData) => {
    console.log(`Sending update to backend for tab ${tab.id}`);
    tabUrls[tab.id] = tab.url;
    console.log(stripTabProperties(tab))
    socket.emit('data/abstr/tab', 'update', stripTabProperties(tab));
});


/**
 * Context event listeners
 */

// Subscribe to the data/abstr/tab events, this way we
// get updated data sent our way as soon as the context changes
socket.emit('subscribe', 'data/abstr/tab', updateBrowserTabs);

socket.on('data/abstr/tab', (tabArray) => {
    updateBrowserTabs(tabArray)
});

socket.on('context/change', (url) => {
    console.log(`Context URL changed to ${url}`)
})


/**
 * Functions
 */

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

})