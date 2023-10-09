#!/bin/bash

# Get the directory of the current script
SCRIPT_DIR=$(dirname "${BASH_SOURCE[0]}")

# Load Canvas .env file
set -o allexport
source $SCRIPT_DIR/../../../app/.env
set +o allexport

# Prepare data and config directories for Minio
DATA_DIR="${CANVAS_PATHS_USER_DATA}/roles/s3-minio"
CONFIG_DIR="${CANVAS_PATHS_USER_CONFIG}/roles/s3-minio"

# Create directories if they don't exist
mkdir -p "$DATA_DIR"
mkdir -p "$CONFIG_DIR"

# Create .env file for Minio
if [ ! -f $CONFIG_DIR/.env ]; then
    echo "MINIO_ROOT_USER=CANVAS_ADMIN" >> $CONFIG_DIR/.env
    echo "MINIO_ROOT_PASSWORD=CANVAS_ADMIN_PASS" >> $CONFIG_DIR/.env
fi

# Load minio .env file
set -o allexport
source $CONFIG_DIR/.env
set +o allexport

# Run Minio container
docker run -d \
  --name canvas-role-s3minio \
  -e "MINIO_ROOT_USER=$MINIO_ROOT_USER" \
  -e "MINIO_ROOT_PASSWORD=$MINIO_ROOT_PASSWORD" \
  -v "$DATA_DIR:/data" \
  -v "$CONFIG_DIR:/root/.minio" \
  -p 9000:9000 \
  minio/minio server /data
