# Canvas Electron App

A desktop application for Canvas with integrated local server capabilities.

## Setup

1. Clone this repository:
   ```bash
   git clone https://github.com/canvas-ai/canvas-electron.git
   cd canvas-electron
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Initialize the server submodule and install its dependencies:
   ```bash
   npm run update-submodules
   npm run install:server
   ```

## Running the App

### Development Mode

Start the application in development mode:
```bash
npm start
```

When started, the app will:
1. Attempt to start a local Canvas server instance using PM2
2. If local server fails, it will attempt to connect to the default remote server
3. You can switch between local and remote server connections via the tray menu

### Running the Server Separately

You can also run the server separately using:
```bash
# Start the server with normal logging
npm run server:start

# Start the server with debug logging
npm run server:dev

# Build the server UI components
npm run server:build
```

### Build and Package

Build the application:
```bash
npm run build
```

Package the application for distribution:
```bash
npm run package
```

## Server Connection Options

The app provides multiple ways to connect to Canvas servers:

1. **Local Server**: Runs an instance of the Canvas server locally within the app using PM2
   - Automatically attempts to start on app launch
   - Can be manually started/stopped via the tray menu
   - PM2 manages the server process for improved reliability
   - View server statistics (memory, CPU, uptime) in the tray menu

2. **Remote Server**: Connect to a remote Canvas server instance
   - Default remote server is pre-configured
   - Custom remote servers can be added via the connection dialog

## About PM2 Integration

PM2 is used to manage the local server process for several benefits:
- Process monitoring and auto-restart
- Resource usage statistics
- Reliable startup and shutdown
- Log management

The app uses PM2's programmatic API to:
- Start and stop the server
- Monitor server status
- Collect performance metrics
- Handle process lifecycle

## Troubleshooting

If you encounter issues with the local server:

1. Check that the server submodule is properly initialized:
   ```bash
   npm run update-submodules
   npm run install:server
   ```

2. Make sure your system meets the requirements specified in the Canvas Server documentation

3. Check server logs by running with verbose logging:
   ```bash
   npm run server:dev
   ```

4. View PM2 process list to check server status:
   ```bash
   npx pm2 list
   ```

5. View detailed PM2 logs:
   ```bash
   npx pm2 logs canvas-server
   ```

## License

AGPL-3.0-or-later

## ! Refactor in progress

- Contribute via https://github.com/orgs/canvas-ai/projects/2 (some contributions are paid)
- (something vaguely resembling a) Documentation at https://github.com/canvas-ai

## Components

- Tray
- Toolbox (super+c)
- Canvas

## Canvas(the UI element) plugins test-list

- https://www.rowsncolumns.app/
- https://konvajs.org/api
- https://pixijs.com/
