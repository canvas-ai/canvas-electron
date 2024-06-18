# Official Node.js 20.x image as base
FROM node:20

# Working directory
WORKDIR /opt

# Install git
RUN apt-get update && apt-get install -y git curl && apt-get clean

# Clone the repository (dev for now as its more up-to-date)
RUN git clone --branch dev https://github.com/idncsk/canvas-server canvas-server

# Install PM2 globally
#RUN npm install -g pm2

# Lets switch the workdir to our beloved src
WORKDIR /opt/canvas-server/src

# Install application dependencies
RUN npm install

# Expose port 8000
EXPOSE 8000

# Start the application using PM2
#CMD ["pm2-runtime", "start", "main.js"]

# Start the application using npm/node
CMD ["npm", "run", "start"]
