#!/bin/bash

# Docs
# https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html

if dpkg -l | grep -q "nvidia-container-toolkit"; then
    echo "nvidia-container-toolkit already installed."
    exit 0
fi

# Download and install the public GPG key
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
    sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

# Add the container-runtime repository
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
    sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
    sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

# Install the container-runtime
sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit

# Configure the container-runtime
sudo nvidia-ctk runtime configure --runtime=docker

# Restart docker
sudo systemctl restart docker
