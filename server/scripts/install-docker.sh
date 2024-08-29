#!/bin/bash

# This script is a (working) draft only
# It is intended to be used as a reference for setting up Docker and Docker Compose

check_docker_installed() {
    if ! command -v docker &> /dev/null; then
        echo "Docker could not be found, installing..."
        install_docker
    else
        echo "Docker is already installed."
        docker_version=$(docker --version)
        echo "Current Docker version: $docker_version"
    fi
}

install_docker() {
    sudo apt-get update
    sudo apt-get install -y \
        apt-transport-https \
        ca-certificates \
        curl \
        software-properties-common

    # Add Docker’s official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -

    # Set up the stable repository
    sudo add-apt-repository \
       "deb [arch=amd64] https://download.docker.com/linux/ubuntu \
       $(lsb_release -cs) \
       stable"

    # Update the apt package index again
    sudo apt-get update
    # Install the latest version of Docker CE
    sudo apt-get install -y docker-ce

    # Add the current user to the Docker group to avoid using 'sudo' with Docker commands
    sudo usermod -aG docker $USER
    echo "Docker installed successfully."
}

check_docker_compose_installed() {
    if ! command -v docker-compose &> /dev/null; then
        echo "Docker Compose could not be found, installing..."
        install_docker_compose
    else
        echo "Docker Compose is already installed."
        docker_compose_version=$(docker-compose --version)
        echo "Current Docker Compose version: $docker_compose_version"
    fi
}

install_docker_compose() {
    # Install Docker Compose
    sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "Docker Compose installed successfully."
}

# Main
check_docker_installed
check_docker_compose_installed

# Build and run Docker containers without using cache
docker-compose build --force-rm --no-cache --pull
docker-compose up --detach
