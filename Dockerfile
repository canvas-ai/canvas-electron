# Official Node.js 20.x image as base
FROM node:20

# Working directory
WORKDIR /opt

# Install basic dependencies
RUN apt-get update && apt-get install -y --no-install-recommends git curl \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Clone the repository
RUN git clone --branch main https://github.com/canvas-ai/canvas-server canvas-server

# Lets switch the workdir
WORKDIR /opt/canvas-server

# Install application dependencies
RUN yarn install

# Accept CONFIG_DIR as a build argument
ARG CONFIG_DIR=./config

# Copy default server configuration tu support portable deployments
COPY ${CONFIG_DIR} /opt/canvas-server/config

# Expose port 8000
EXPOSE 8000

# Start the application using npm/node
CMD ["yarn", "start"]

# ENTRYPOINT [ "/opt/canvas-server/bin/start-server.sh" ]

