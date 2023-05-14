
/**
 * After spending quite some time trying to get messaging running
 * between the background script and the UI script
 * browser.runtime.connect()
 * browser.runtime.sendMessage()
 *
 * I decided to go with socket.io, please fix this! :)
 */

const socket = io.connect('http://127.0.0.1:8001');
socket.on('connect', () => {
    console.log('(UI) Client connected to server');
});

function getContextUrl() {
    socket.emit('context:get', 'url', (res) => {
        console.log(`(UI) Got context URL: "${res}"`)
        updateContextBreadcrumbs(sanitizePath(res))
    })
}

document.addEventListener("DOMContentLoaded", function () {
  var elems = document.querySelectorAll(".collapsible");
  var instances = M.Collapsible.init(elems, {
    accordion: false,
  });

  console.log('DOM loaded');
  getContextUrl()

});


/**
 * Functions
 */

function sanitizePath(path) {
    if (path == '/') return 'universe:///'
    path = path.replace(/\/\//g, '/').replace(/\:/g, '')
    return path
}

function updateContextBreadcrumbs(url) {

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
