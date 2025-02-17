/**
 * Canvas
 */

// Utils
const path = require("path");
const debug = require("debug")("canvas");

// App utils
// const Config = require('./utils/config/index.js');
// const log = require('./utils/log/index.js');

// Electron includes
const {
	app,
	globalShortcut,
	protocol,
	BrowserWindow,
	dialog,
	Tray,
	Menu,
	shell,
} = require("electron");

const socketIO = require("socket.io-client");

// Test
//const socket = socketIO.connect("http://138.124.180.38:8000");
const socket = socketIO.connect("http://127.0.0.1:8000");

// Import the toolbox module
const toolbox = require('./components/toolbox');

// Global variables
var contextTree;
var sessionTree;

// Set a few handy runtime variables
//app.setName(APP.name);
//app.version = APP.version;
app.isQuitting = false;

// Enable default sandboxing
app.enableSandbox();

// Lets take care of some electron defaults
//const electronHome = path.join(USER.paths.home, "electron"); // Stash electron-generated garbage here
const electronHome = "/tmp/test";
app.setPath("appData", path.join(electronHome, "appData"));
app.setPath("userData", path.join(electronHome, "userData"));
app.setPath("cache", path.join(electronHome, "cache"));
app.setPath("temp", path.join(electronHome, "temp"));
app.setAppLogsPath(path.join(electronHome, "log"));
app.setPath("crashDumps", path.join(electronHome, "crashDumps"));

// Make sure only one instance of the app is running
const singleton = app.requestSingleInstanceLock();
if (!singleton) {
	console.error("Only one instance of this app is allowed");
	process.exit(1);
	// TODO: Open a new Canvas window instead
}

app.on("second-instance", (e, argv, cwd) => {
	if (!argv) {
		return;
	}
	console.log("2nd instance CLI parser(TODO)");
	console.log(argv);
});

// TODO: Replace with a global argv parser
if (process.argv.some((arg) => arg === "-v" || arg === "--version")) {
	console.log("App: " + app.getVersion());
	console.log("Chromium: " + process.versions.chrome);
	process.exit();
}

app.setAboutPanelOptions({
	applicationName: app.name,
	applicationVersion: `Version: ${app.getVersion()}`,
	iconPath: "./public/icons/logo_1024x1024_v2.png",
});

// Register custom protocols
protocol.registerSchemesAsPrivileged([
	{
		scheme: "universe",
		privileges: {
			standard: true,
			secure: false,
			supportFetchAPI: true,
			corsEnabled: true,
			allowServiceWorkers: true,
		},
	},
	{
		scheme: "context",
		privileges: {
			secure: true,
			standard: false,
			supportFetchAPI: true,
			corsEnabled: true,
			allowServiceWorkers: true,
		},
	},
]);

app.on("ready", async () => {
	debug("App ready");

	socket.emit("session:list", (data) => {
		sessionTree = data.payload;

		console.log(sessionTree);

		socket.emit("context:get:tree", (data) => {
			console.log(data);
			contextTree = data.payload;

			createWindow();
			createTray();
		});
	});

	// Create the toolbox window when the app is ready
	toolbox.createWindow();
	toolbox.registerGlobalShortcut();
});

// MacOS support was blatantly ignored for now
app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});

// Apparently need to keep this one around to avoid app->quit()
app.on("window-all-closed", () => {
	console.log("app.window-all-closed");
	if (process.platform !== "darwin") {
		app.quit();
	}
});

// Before all windows are closed
app.on("before-quit ", function () {
	console.log("app.before-quit");
});

// After all windows are closed
app.on("will-quit", function () {
	console.log("app.will-quit");
	globalShortcut.unregisterAll();
});

process.on("SIGINT", () => {
	console.log("process > app.quit()");
	app.isQuitting = true;
	app.quit() || process.exit(0);
});

function createWindow() {
	const mainWindow = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
		},
	});

	mainWindow.loadFile(path.join(__dirname, "../public/index.html"));
}

function createTray() {
	// console.log(contextTree);

	const appIcon = new Tray(
		path.resolve(__dirname, "..", "public", "icons", "logo_1024x1024_v2.png"),
	);

	const contextMenu = Menu.buildFromTemplate([

		// On top there should be a context url (socket.emit('context:get:url')) as a disabled menu
		{
			label: "Context",
			type: "submenu",
			submenu: renderContextTree([contextTree]),
		},
		{
			label: "Sessions",
			type: "submenu",
			submenu: renderSessionTree(sessionTree),
		},
		{ label: "divided_line_1", type: "separator" },
		{
			label: "Server",
			type: "submenu",
			submenu: [
				{
					label: "Connect",
					type: "normal",
				},
				{
					label: "Disconnet",
					type: "normal",
				},
				{
					label: "status",
					type: "normal",
					icon: path.resolve(
						__dirname,
						"..",
						"public",
						"img",
						"disconnect_status.png",
					),
				},
			],
		},
		{
			label: "Roles",
			type: "normal",
			click: () => {
				console.log("Roles");
			},
		},
		{ label: "divided_line_2", type: "separator" },
		{
			label: "Settings",
			type: "normal",
			click: () => {
				console.log("Settings");
				shell.openPath(USER.paths.config, "config.json");
			},
		},
		{
			label: "About",
			type: "normal",
			role: "about",
		},
		{ label: "divided_line", type: "separator" },
		{ label: "Exit", type: "normal", role: "quit" },
	]);

	appIcon.on("double-click", () => {
		console.log("Tray Icon double clicked");
	});

	appIcon.setToolTip("canvas app");
	appIcon.setContextMenu(contextMenu);
	return appIcon;
}

function renderContextTree(node) {
	const value = node.map((item) => {
		if (item.children && item.children.length > 0) {
			return {
				id: item.id,
				label: item.label,
				type: "submenu",
				submenu: renderContextTree(item.children),
			};
		} else {
			return {
				id: item.id,
				label: item.label,
				type: "normal",
			};
		}
	});

	return value;
}

function renderSessionTree(node) {
	const value = node.map((item) => {
		return {
			id: item.id,
			label: item.id,
			type: "normal",
		};
	});

	return value;
}
