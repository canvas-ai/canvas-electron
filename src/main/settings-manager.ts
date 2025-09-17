import Store from 'electron-store';
import { AppSettings, AgentConfig } from '../shared/types';
import { DEFAULT_AGENT_CONFIG } from '../shared/constants';

export class SettingsManager {
  private store: Store<AppSettings>;

  constructor() {
    this.store = new Store<AppSettings>({
      name: 'canvas-settings',
      defaults: {
        agents: [DEFAULT_AGENT_CONFIG],
        defaultAgent: DEFAULT_AGENT_CONFIG.name,
        windowSettings: {
          toolboxWidth: 640,
          toolboxHeight: 452,
          toolboxMarginRight: 460,
        },
      },
    });
  }

  async initialize(): Promise<void> {
    // Ensure we have at least one agent configured
    const settings = this.store.store;
    if (!settings.agents || settings.agents.length === 0) {
      this.store.set('agents', [DEFAULT_AGENT_CONFIG]);
      this.store.set('defaultAgent', DEFAULT_AGENT_CONFIG.name);
    }
  }

  async getSettings(): Promise<AppSettings> {
    return this.store.store;
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    this.store.store = settings;
  }

  async getAgent(name: string): Promise<AgentConfig | undefined> {
    const settings = await this.getSettings();
    return settings.agents.find(agent => agent.name === name);
  }

  async saveAgent(agent: AgentConfig): Promise<void> {
    const settings = await this.getSettings();
    const existingIndex = settings.agents.findIndex(a => a.name === agent.name);
    
    if (existingIndex >= 0) {
      settings.agents[existingIndex] = agent;
    } else {
      settings.agents.push(agent);
    }
    
    await this.saveSettings(settings);
  }

  async deleteAgent(name: string): Promise<void> {
    const settings = await this.getSettings();
    settings.agents = settings.agents.filter(agent => agent.name !== name);
    
    // If we deleted the default agent, set a new default
    if (settings.defaultAgent === name && settings.agents.length > 0) {
      settings.defaultAgent = settings.agents[0].name;
    }
    
    await this.saveSettings(settings);
  }

  async getDefaultAgent(): Promise<AgentConfig | undefined> {
    const settings = await this.getSettings();
    if (settings.defaultAgent) {
      return await this.getAgent(settings.defaultAgent);
    }
    return settings.agents[0];
  }
}