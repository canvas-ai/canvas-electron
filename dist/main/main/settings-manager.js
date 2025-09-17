"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsManager = void 0;
const electron_store_1 = __importDefault(require("electron-store"));
const constants_1 = require("../shared/constants");
class SettingsManager {
    store;
    constructor() {
        this.store = new electron_store_1.default({
            name: 'canvas-settings',
            defaults: {
                agents: [constants_1.DEFAULT_AGENT_CONFIG],
                defaultAgent: constants_1.DEFAULT_AGENT_CONFIG.name,
                windowSettings: {
                    toolboxWidth: 640,
                    toolboxHeight: 452,
                    toolboxMarginRight: 460,
                },
            },
        });
    }
    async initialize() {
        // Ensure we have at least one agent configured
        const settings = this.store.store;
        if (!settings.agents || settings.agents.length === 0) {
            this.store.set('agents', [constants_1.DEFAULT_AGENT_CONFIG]);
            this.store.set('defaultAgent', constants_1.DEFAULT_AGENT_CONFIG.name);
        }
    }
    async getSettings() {
        return this.store.store;
    }
    async saveSettings(settings) {
        this.store.store = settings;
    }
    async getAgent(name) {
        const settings = await this.getSettings();
        return settings.agents.find(agent => agent.name === name);
    }
    async saveAgent(agent) {
        const settings = await this.getSettings();
        const existingIndex = settings.agents.findIndex(a => a.name === agent.name);
        if (existingIndex >= 0) {
            settings.agents[existingIndex] = agent;
        }
        else {
            settings.agents.push(agent);
        }
        await this.saveSettings(settings);
    }
    async deleteAgent(name) {
        const settings = await this.getSettings();
        settings.agents = settings.agents.filter(agent => agent.name !== name);
        // If we deleted the default agent, set a new default
        if (settings.defaultAgent === name && settings.agents.length > 0) {
            settings.defaultAgent = settings.agents[0].name;
        }
        await this.saveSettings(settings);
    }
    async getDefaultAgent() {
        const settings = await this.getSettings();
        if (settings.defaultAgent) {
            return await this.getAgent(settings.defaultAgent);
        }
        return settings.agents[0];
    }
}
exports.SettingsManager = SettingsManager;
//# sourceMappingURL=settings-manager.js.map