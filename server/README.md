# Canvas Server

Server component for the Canvas project

## ! Refactor in progress

**! use the main branch for now**  
**! beware of the mess in dev**  
**! beware of the upcoming schema change**

`Universe -> |||| (bitmaps) -> Contexts -> User`

## Installation

### Linux

```bash
$ git clone https://github.com/canvas-ai/canvas-server /path/to/canvas-server
$ cd /path/to/canvas-server/src
$ npm install
$ npm start # or npm pm2:start
```

To automatically start canvas-server as a system (or user) service, please consult https://pm2.keymetrics.io/docs/usage/startup/

### Windows

```cmd
> git clone https://github.com/canvas-ai/canvas-server /path/to/canvas-server
> cd /path/to/canvas-server/src
> npm install
> npm start
```

### Docker

```bash
$ git clone https://github.com/canvas-ai/canvas-server /path/to/canvas-server
$ cd /path/to/canvas-server
$ docker-compose up --build
# or, to ensure you are running the latest and greatest
# $ docker-compose build --no-cache
# $ docker-compose up --force-recreate
# Cleanup
$ docker-compose down --rmi all

```

Supported ENV vars with their defaults

```bash
CANVAS_SERVER_CONFIG: ${CANVAS_SERVER_CONFIG:-./config}
CANVAS_SERVER_DATA: ${CANVAS_SERVER_DATA:-./data}
CANVAS_SERVER_VAR: ${CANVAS_SERVER_VAR:-./var}
CANVAS_SERVER_EXT: ${CANVAS_SERVER_EXT:-./extensions}
CANVAS_USER_HOME: ${CANVAS_USER_HOME:-./user}
CANVAS_USER_CONFIG: ${CANVAS_USER_CONFIG:-./user/config}
CANVAS_USER_DATA: ${CANVAS_USER_DATA:-./user/data}
CANVAS_USER_CACHE: ${CANVAS_USER_CACHE:-./user/cache}
CANVAS_USER_INDEX: ${CANVAS_USER_INDEX:-./user/index}
CANVAS_USER_DB: ${CANVAS_USER_DB:-./user/db}
CANVAS_USER_WORKSPACES: ${CANVAS_USER_WORKSPACES:-./user/workspaces}
```

## Configuration

All settings stored in ./config are meant as server-defaults  
To enable a seamless roaming/portable experience, make sure everything non-default is configured in your `CANVAS_USER_CONFIG` directory (defaults to **./user/config** in portable mode, **~/.canvas/config** || **Canvas/Config** otherwise)  
Modules (should) have some sensible defaults..

```bash
# To disable "portable" mode, create /path/to/canvas-server/user/.ignore
# or set CANVAS_USER_CONFIG

# Edit canvas-server configuration before starting the server
$ cd /path/to/canvas-server/config  # Or ~/.canvas/config
$ cp example-server.json server.json 
$ cp example-client.json client.json
# Or /path/to/canvas-server/config/example-*.json  ~/.canvas/config/*.json
```

## Update Canvas Server

```bash
$ cd /path/to/canvas-server
# Stop the canvas server
$ npm run stop # or npm run pm2:stop
$ rm -rf ./node_modules # Ensure we have a clean plate
# Fetch the latest version of canvas-server from Github
$ git pull origin main # or dev if you are feeling adventurous
$ npm install
$ npm start # or npm run pm2:start
```
