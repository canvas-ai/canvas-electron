#!/bin/bash

# Canvas role config
CANVAS_ROLE_NAME="canvas-s3minio"

# Get the directory of the current script
SCRIPT_DIR=$(dirname "${BASH_SOURCE[0]}")

# Load Canvas .env file
set -o allexport
source $SCRIPT_DIR/../../../var/.env
set +o allexport


# Prepare data and config directories for Minio
DATA_DIR="${CANVAS_PATHS_USER_DATA}/roles/s3minio"
CONFIG_DIR="${CANVAS_PATHS_USER_CONFIG}/roles/s3minio"

# Create directories if they don't exist
mkdir -p "$DATA_DIR"
mkdir -p "$CONFIG_DIR"

# Create a default config.env file
if [ ! -f $CONFIG_DIR/config.env ]; then
    echo "MINIO_ROOT_USER=CANVAS_ADMIN" >> $CONFIG_DIR/config.env
    echo "MINIO_ROOT_PASSWORD=CANVAS_ADMIN_PASS" >> $CONFIG_DIR/config.env
	echo "MINIO_API_PORT=7001" >> $CONFIG_DIR/config.env
	echo "MINIO_CONSOLE_PORT=7002" >> $CONFIG_DIR/config.env
fi

# Load minio .env file
set -o allexport
source $CONFIG_DIR/config.env
set +o allexport

# Minio config defaults
MINIO_API_PORT="${MINIO_API_PORT:-7001}"
MINIO_CONSOLE_PORT="${MINIO_CONSOLE_PORT:-7002}"


# Run Minio container
docker run -d \
  --name $CANVAS_ROLE_NAME \
  -v "$CONFIG_DIR:/opt/minio" \
  -v "$DATA_DIR:/data" \
  -e "MINIO_ROOT_USER=$MINIO_ROOT_USER" \
  -e "MINIO_ROOT_PASSWORD=$MINIO_ROOT_PASSWORD" \
  -e "MINIO_CONFIG_ENV_FILE=/opt/minio/config.env" \
  -p $MINIO_API_PORT:$MINIO_API_PORT \
  -p $MINIO_CONSOLE_PORT:$MINIO_CONSOLE_PORT \
  minio/minio server /data --address ":$MINIO_API_PORT" --console-address ":$MINIO_CONSOLE_PORT"
