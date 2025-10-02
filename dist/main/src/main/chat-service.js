"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const uuid_1 = require("uuid");
const openai_1 = __importDefault(require("openai"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
class ChatService {
    async sendMessage(message, agentConfig) {
        try {
            let responseContent;
            switch (agentConfig.runtime) {
                case 'openai':
                    responseContent = await this.sendToOpenAI(message, agentConfig);
                    break;
                case 'anthropic':
                    responseContent = await this.sendToAnthropic(message, agentConfig);
                    break;
                case 'ollama':
                    responseContent = await this.sendToOllama(message, agentConfig);
                    break;
                default:
                    throw new Error(`Unsupported runtime: ${agentConfig.runtime}`);
            }
            return {
                id: (0, uuid_1.v4)(),
                role: 'assistant',
                content: responseContent,
                timestamp: new Date(),
            };
        }
        catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }
    async sendToOpenAI(message, config) {
        const openai = new openai_1.default({
            apiKey: config.apiToken,
            baseURL: config.apiUrl !== 'https://api.openai.com/v1' ? config.apiUrl : undefined,
        });
        const response = await openai.chat.completions.create({
            model: config.model,
            messages: [
                { role: 'system', content: config.systemPrompt },
                { role: message.role, content: message.content }
            ],
            temperature: config.temperature,
            top_p: config.topP,
            max_tokens: config.maxTokens,
        });
        return response.choices[0]?.message?.content || 'No response generated';
    }
    async sendToAnthropic(message, config) {
        const anthropic = new sdk_1.default({
            apiKey: config.apiToken,
        });
        const response = await anthropic.messages.create({
            model: config.model,
            max_tokens: config.maxTokens || 2048,
            temperature: config.temperature,
            top_p: config.topP,
            system: config.systemPrompt,
            messages: [
                { role: message.role, content: message.content }
            ],
        });
        const content = response.content[0];
        if (content.type === 'text') {
            return content.text;
        }
        return 'No text response generated';
    }
    async sendToOllama(message, config) {
        const response = await fetch(`${config.apiUrl}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(config.apiToken && { 'Authorization': `Bearer ${config.apiToken}` }),
            },
            body: JSON.stringify({
                model: config.model,
                messages: [
                    { role: 'system', content: config.systemPrompt },
                    { role: message.role, content: message.content }
                ],
                options: {
                    temperature: config.temperature,
                    top_p: config.topP,
                },
                stream: false,
            }),
        });
        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return data.message?.content || 'No response generated';
    }
    async testConnection(config) {
        try {
            const testMessage = {
                id: (0, uuid_1.v4)(),
                role: 'user',
                content: 'Hello, this is a connection test.',
                timestamp: new Date(),
            };
            await this.sendMessage(testMessage, config);
            return true;
        }
        catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    }
}
exports.ChatService = ChatService;
//# sourceMappingURL=chat-service.js.map