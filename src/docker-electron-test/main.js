const { app, Tray, Menu } = require('electron');
const Docker = require('dockerode');
const path = require('path');
const { exec } = require('child_process');

let tray = null;
const docker = new Docker(); // For local Docker instance. For remote, use appropriate options.

function createTray() {
  tray = new Tray(path.join(__dirname, 'icon.png')); // Replace with your icon
  updateMenu();

  tray.on('click', (e) => {
    console.log('click');
  });

  tray.on('right-click', (e) => {
    console.log('right-click');
  });
}

async function controlContainer(id, action) {
  const container = docker.getContainer(id);
  try {
    await container[action]();
    // Update the menu after the container action is completed
    await updateMenu();
  } catch (error) {
    console.error(`Error ${action} container:`, error);
    await updateMenu();
  }
}

async function updateMenu() {
  console.log('updateMenu called')
  let containers = await docker.listContainers({ all: true });
  const menuTemplate = [
    { label: 'Docker Containers', enabled: false },
    { type: 'separator' },
    ...containers.map(createContainerMenuItem),
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ];

  const contextMenu = Menu.buildFromTemplate(menuTemplate);
  tray.setContextMenu(contextMenu);
}

function createContainerMenuItem(container) {
  const status = container.State;
  const statusIcon = getStatusIcon(status);

  return {
    label: `${statusIcon} ${container.Names[0].slice(1)}`,
    submenu: [
      { label: 'Start', click: () => controlContainer(container.Id, 'start') },
      { label: 'Stop', click: () => controlContainer(container.Id, 'stop') },
      { label: 'Restart', click: () => controlContainer(container.Id, 'restart') },
      { label: 'Status', click: () => showStatus(container) },
      { label: 'Attach', click: () => attachContainer(container.Id) }
    ]
  };
}

function getStatusIcon(status) {
  switch (status) {
    case 'running':
      return '🟢';
    case 'paused':
      return '🟡';
    default:
      return '🔴';
  }
}

function showStatus(container) {
  // Implement status display (e.g., using a notification or a new window)
  console.log('Container status:', container.State);
}

function attachContainer(id) {
  let command;

  switch (process.platform) {
    case 'darwin': // macOS
      command = `osascript -e 'tell app "Terminal" to do script "docker exec -it ${id} bash"'`;
      break;
    case 'win32': // Windows
      command = `start cmd.exe /K "docker exec -it ${id} bash"`;
      break;
    default: // Linux and others
      command = `x-terminal-emulator -e "docker exec -it ${id} bash"`;
      break;
  }

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error attaching to container: ${error}`);
      return;
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
      return;
    }
    console.log(`Attached to container: ${id}`);
  });
}

app.on('ready', () => {
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
