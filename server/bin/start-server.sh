#!/bin/bash

# entrypoint.sh to start the server with arguments
cd /opt/canvas-server/ || exit 1
yarn start "$@"
