#!/bin/bash

# Set default values
IMAGE_NAME="canvas-server"
IMAGE_TAG="portable"
DOCKERFILE="Dockerfile"
CONFIG_DIR="./config"

# Function to display usage information
usage() {
    echo "Usage: $0 [-n image_name] [-t image_tag] [-f dockerfile] [-c config_dir]"
    echo "  -n: Image name (default: canvas-server)"
    echo "  -t: Image tag (default: portable)"
    echo "  -f: Dockerfile to use (default: Dockerfile)"
    echo "  -c: Config directory to copy (default: ./config)"
    exit 1
}

# Parse command line options
while getopts "n:t:f:c:h" opt; do
    case $opt in
        n) IMAGE_NAME="$OPTARG" ;;
        t) IMAGE_TAG="$OPTARG" ;;
        f) DOCKERFILE="$OPTARG" ;;
        c) CONFIG_DIR="$OPTARG" ;;
        h) usage ;;
        \?) echo "Invalid option -$OPTARG" >&2; usage ;;
    esac
done

# Check if config directory exists
if [ ! -d "$CONFIG_DIR" ]; then
    echo "Error: Config directory $CONFIG_DIR does not exist."
    exit 1
fi

# Check if Dockerfile exists
if [ ! -f "$DOCKERFILE" ]; then
    echo "Error: Dockerfile $DOCKERFILE does not exist."
    exit 1
fi

# Build the Docker image
echo "Building Docker image: $IMAGE_NAME:$IMAGE_TAG"
echo "Using config directory: $CONFIG_DIR"
echo "Using Dockerfile: $DOCKERFILE"

docker build -t "$IMAGE_NAME:$IMAGE_TAG" \
             -f "$DOCKERFILE" \
             --build-arg CONFIG_DIR="$CONFIG_DIR" \
             .

# Check if the build was successful
if [ $? -eq 0 ]; then
    echo "Docker image $IMAGE_NAME:$IMAGE_TAG built successfully!"
else
    echo "Error: Docker image build failed."
    exit 1
fi
