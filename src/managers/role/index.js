// src/managers/role/index.js

const Docker = require('dockerode');
const DockerCompose = require('dockerode-compose');

class RoleManager {
    constructor(dockerConfigs) {
        this.dockerBackends = new Map();
        this.roles = new Map();

        // Initialize Docker backends
        dockerConfigs.forEach(config => {
            const { name, ...dockerOptions } = config;
            this.dockerBackends.set(name, new Docker(dockerOptions));
        });
    }

    /**
     * Driver management methods
     */

    async listDrivers() {
        // For now, we only support Docker
        return ['docker'];
    }

    getDriver(driverName = 'docker') {
        if (driverName === 'docker') {
            return Docker;
        }
        throw new Error(`Unsupported driver: ${driverName}`);
    }

    /**
     * Role Backend methods
     */

    listBackends() {
        return Array.from(this.dockerBackends.keys());
    }

    getBackend(backendName) {
        const backend = this.dockerBackends.get(backendName);
        if (!backend) {
            throw new Error(`Docker backend not found: ${backendName}`);
        }
        return backend;2
    }

    listRoles() {
        return Array.from(this.roles.keys());
    }

    getRole(roleName) {
        return this.roles.get(roleName);
    }

    async startRole(roleName, backendName) {
        const role = this.roles.get(roleName);
        if (!role) {
            throw new Error(`Role not found: ${roleName}`);
        }
        const backend = this.getBackend(backendName);
        const compose = new DockerCompose(backend, role.path);
        await compose.up({ log: true });
    }

    async stopRole(roleName, backendName) {
        const role = this.roles.get(roleName);
        if (!role) {
            throw new Error(`Role not found: ${roleName}`);
        }
        const backend = this.getBackend(backendName);
        const compose = new DockerCompose(backend, role.path);
        await compose.down({ log: true });
    }

    async restartRole(roleName, backendName) {
        await this.stopRole(roleName, backendName);
        await this.startRole(roleName, backendName);
    }

    async addRole(roleName, rolePath, backendName) {
        if (this.roles.has(roleName)) {
            throw new Error(`Role already exists: ${roleName}`);
        }
        this.roles.set(roleName, { name: roleName, path: rolePath, backend: backendName });
        // You might want to validate the docker-compose.yml file here
    }

    async removeRole(roleName) {
        if (!this.roles.has(roleName)) {
            throw new Error(`Role not found: ${roleName}`);
        }
        const role = this.roles.get(roleName);
        await this.stopRole(roleName, role.backend);
        this.roles.delete(roleName);
    }

    async attachRole(roleName) {
        const role = this.roles.get(roleName);
        if (!role) {
            throw new Error(`Role not found: ${roleName}`);
        }
        // This method would typically involve setting up any necessary connections
        // or configurations to integrate the role with the Canvas application
        console.log(`Role ${roleName} attached to Canvas`);
    }

    async isRoleRunning(roleName) {
        const role = this.roles.get(roleName);
        if (!role) {
            throw new Error(`Role not found: ${roleName}`);
        }
        const backend = this.getBackend(role.backend);
        const containers = await backend.listContainers();
        return containers.some(container => container.Names[0].includes(roleName));
    }

    async listContainers(backend) {
        const docker = this.getBackend(backend)
        try {
            // List all containers (including stopped ones)
            const containers = await docker.listContainers({ all: true });

            // Print container information
            containers.forEach(container => {
                console.log(`ID: ${container.Id}`);
                console.log(`Names: ${container.Names}`);
                console.log(`Image: ${container.Image}`);
                console.log(`State: ${container.State}`);
                console.log(`Status: ${container.Status}`);
                console.log('---');
            });

            return containers;
        } catch (error) {
            console.error('Error listing containers:', error);
        }


    }

}

//module.exports = RoleManager;


const roleManager = new RoleManager([
    { name: 'local', socketPath: '/var/run/docker.sock' },
    { name: 'nas', host: 'nas.lan', port: 2375 }
]);

// List all backends
const backends = roleManager.listBackends();
console.log('Available backends:', backends);

// Add a role
//roleManager.addRole('minio-s3', '/path/to/minio/docker-compose', 'local');

// Start the role on the local backend
//roleManager.startRole('minio-s3', 'local');

// List containers on the NAS
(async () => {
    const list = await roleManager.listContainers('local')
    console.log(list)
})()
