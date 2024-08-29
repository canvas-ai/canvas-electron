#!/bin/bash

# Canvas role config
CANVAS_ROLE_NAME="canvas-vllm"

# Get the directory of the current script
SCRIPT_DIR=$(dirname "${BASH_SOURCE[0]}")

# Load Canvas .env file
set -o allexport
source $SCRIPT_DIR/../../../app/.env
set +o allexport



# Prepare data and config directories
MODELS_DIR="${CANVAS_PATHS_USER_DATA}/models"
CONFIG_DIR="${CANVAS_PATHS_USER_CONFIG}/roles/vllm"

# Create directories if they don't exist
mkdir -p "$MODELS_DIR"
mkdir -p "$CONFIG_DIR"

# Run VLLM container
docker run -d \
  --name $CANVAS_ROLE_NAME \
  --gpus all \
  --ipc=host \
  -v "$CONFIG_DIR:/opt/config" \
  -v "$MODELS_DIR:/models" \
   nvcr.io/nvidia/pytorch:22.12-py3
