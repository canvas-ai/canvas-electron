/**
 * Server Manager Component
 * Handles starting and stopping the local Canvas server instance using PM2
 */

const path = require('path');
const debug = require('debug')('canvas:server-manager');
const fs = require('fs');
const EventEmitter = require('eventemitter2').EventEmitter2;
const pm2 = require('pm2');
const { spawn } = require('child_process');

class ServerManager extends EventEmitter {
  constructor() {
    super();
    this.isRunning = false;
    this.serverPath = path.join(__dirname, '../../../server');
    this.serverUrl = 'http://127.0.0.1:8000';
    this.serverName = 'canvas-server';
    this.pm2Connected = false;
  }

  /**
   * Checks if the server submodule is properly initialized
   */
  isServerInitialized() {
    try {
      return fs.existsSync(path.join(this.serverPath, 'node_modules'));
    } catch (error) {
      debug('Error checking server initialization:', error);
      return false;
    }
  }

  /**
   * Initialize the server submodule if needed
   */
  async initializeServer() {
    if (this.isServerInitialized()) {
      debug('Server already initialized');
      return true;
    }

    debug('Initializing server submodule...');

    return new Promise((resolve, reject) => {
      const initProcess = spawn('npm', ['run', 'install:server'], {
        cwd: path.join(__dirname, '../../../'),
        shell: true
      });

      initProcess.stdout.on('data', (data) => {
        debug(`Server init: ${data}`);
      });

      initProcess.stderr.on('data', (data) => {
        debug(`Server init error: ${data}`);
      });

      initProcess.on('close', (code) => {
        if (code === 0) {
          debug('Server initialized successfully');
          resolve(true);
        } else {
          debug(`Server initialization failed with code ${code}`);
          reject(new Error(`Server initialization failed with code ${code}`));
        }
      });
    });
  }

  /**
   * Connect to PM2 daemon
   */
  connectToPM2() {
    return new Promise((resolve, reject) => {
      if (this.pm2Connected) {
        resolve();
        return;
      }

      pm2.connect((err) => {
        if (err) {
          debug('PM2 connection error:', err);
          reject(err);
          return;
        }

        this.pm2Connected = true;
        debug('Connected to PM2');
        resolve();
      });
    });
  }

  /**
   * Disconnect from PM2 daemon
   */
  disconnectFromPM2() {
    if (!this.pm2Connected) {
      return;
    }

    pm2.disconnect();
    this.pm2Connected = false;
    debug('Disconnected from PM2');
  }

  /**
   * Check if server is running in PM2
   */
  async isServerRunningInPM2() {
    try {
      await this.connectToPM2();

      return new Promise((resolve) => {
        pm2.list((err, list) => {
          if (err) {
            debug('PM2 list error:', err);
            resolve(false);
            return;
          }

          const server = list.find(p => p.name === this.serverName);
          const isRunning = server && server.pm2_env.status === 'online';

          debug(`Server running in PM2: ${isRunning}`);
          resolve(isRunning);
        });
      });
    } catch (error) {
      debug('Error checking PM2 status:', error);
      return false;
    }
  }

  /**
   * Start the local server instance using PM2
   */
  async startServer() {
    if (await this.isServerRunningInPM2()) {
      debug('Server is already running in PM2');
      this.isRunning = true;
      return this.serverUrl;
    }

    try {
      // Make sure server is initialized first
      if (!this.isServerInitialized()) {
        await this.initializeServer();
      }

      debug('Starting local server using PM2...');

      await this.connectToPM2();

      return new Promise((resolve, reject) => {
        // Start the server using the ecosystem.config.js file
        pm2.start({
          cwd: this.serverPath,
          script: path.join(this.serverPath, 'ecosystem.config.js')
        }, (err) => {
          if (err) {
            debug('PM2 start error:', err);
            reject(err);
            return;
          }

          debug('Server started via PM2');
          this.isRunning = true;

          // Set up a monitor to watch server logs for the "ready" message
          this.monitorServerLogs((ready) => {
            if (ready) {
              this.emit('server:ready', this.serverUrl);
              resolve(this.serverUrl);
            }
          });
        });
      });

    } catch (error) {
      debug('Error starting server:', error);
      throw error;
    }
  }

  /**
   * Monitor server logs to detect when it's ready
   */
  monitorServerLogs(callback) {
    if (!this.pm2Connected) {
      debug('Cannot monitor logs: not connected to PM2');
      return;
    }

    // Stream logs from the server process
    pm2.streamLogs(this.serverName, 0, false, (err, logs) => {
      if (err) {
        debug('Error streaming logs:', err);
        return;
      }

      // Set a timeout in case we never see the ready message
      const timeout = setTimeout(() => {
        callback(true); // Assume server is ready after timeout
      }, 10000);

      // Listen for log messages
      logs.on('data', (data) => {
        const log = data.toString();
        debug(`Server log: ${log}`);

        // Check if server is ready
        if (log.includes('Server listening at')) {
          clearTimeout(timeout);
          callback(true);
        }
      });
    });
  }

  /**
   * Stop the local server instance
   */
  async stopServer() {
    if (!(await this.isServerRunningInPM2())) {
      debug('Server is not running in PM2');
      this.isRunning = false;
      return;
    }

    debug('Stopping local server...');

    try {
      await this.connectToPM2();

      return new Promise((resolve, reject) => {
        pm2.stop(this.serverName, (err) => {
          if (err) {
            debug('PM2 stop error:', err);
            reject(err);
            return;
          }

          debug('Server stopped via PM2');
          this.isRunning = false;
          this.emit('server:stopped');
          resolve();
        });
      });
    } catch (error) {
      debug('Error stopping server:', error);
      throw error;
    }
  }

  /**
   * Get server status and stats
   */
  async getServerStats() {
    try {
      await this.connectToPM2();

      return new Promise((resolve, reject) => {
        pm2.describe(this.serverName, (err, processDescription) => {
          if (err) {
            debug('PM2 describe error:', err);
            reject(err);
            return;
          }

          if (!processDescription || processDescription.length === 0) {
            resolve({
              running: false,
              status: 'stopped',
              memory: 0,
              cpu: 0,
              uptime: 0
            });
            return;
          }

          const process = processDescription[0];

          resolve({
            running: process.pm2_env.status === 'online',
            status: process.pm2_env.status,
            memory: process.monit ? process.monit.memory : 0,
            cpu: process.monit ? process.monit.cpu : 0,
            uptime: process.pm2_env.pm_uptime ? Date.now() - process.pm2_env.pm_uptime : 0,
            pid: process.pid
          });
        });
      });
    } catch (error) {
      debug('Error getting server stats:', error);
      return {
        running: false,
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Get the server URL
   */
  getServerUrl() {
    return this.serverUrl;
  }

  /**
   * Clean up resources when the app is shutting down
   */
  cleanup() {
    this.disconnectFromPM2();
  }
}

module.exports = new ServerManager();
