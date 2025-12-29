"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationManager = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const uuid_1 = require("uuid");
const paths_1 = require("../shared/paths");
// Path helpers
const getAgentPath = (agentName) => (0, paths_1.getCanvasAgentConversationsDir)((0, paths_1.getLocalAccountRef)(), agentName);
class ConversationManager {
    async getConversations(agentName) {
        const agentPath = getAgentPath(agentName);
        try {
            // Ensure the agent directory exists
            await fs_1.promises.mkdir(agentPath, { recursive: true });
            // Read all conversation files
            const files = await fs_1.promises.readdir(agentPath);
            const conversationFiles = files.filter(file => file.endsWith('-conversation.json'));
            const conversations = [];
            for (const file of conversationFiles) {
                try {
                    const filePath = (0, path_1.join)(agentPath, file);
                    const content = await fs_1.promises.readFile(filePath, 'utf-8');
                    const conversation = JSON.parse(content);
                    // Ensure the conversation has the required properties
                    if (conversation.id && conversation.messages) {
                        conversations.push(conversation);
                    }
                }
                catch (error) {
                    console.error(`Error reading conversation file ${file}:`, error);
                }
            }
            // Sort by updatedAt descending (most recent first)
            return conversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        }
        catch (error) {
            console.error(`Error loading conversations for agent ${agentName}:`, error);
            return [];
        }
    }
    async saveConversation(conversation) {
        const agentPath = getAgentPath(conversation.agentName);
        try {
            // Ensure the agent directory exists
            await fs_1.promises.mkdir(agentPath, { recursive: true });
            // Generate filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${timestamp}-conversation.json`;
            const filePath = (0, path_1.join)(agentPath, filename);
            // Update the conversation timestamps
            const now = new Date();
            if (!conversation.createdAt) {
                conversation.createdAt = now;
            }
            conversation.updatedAt = now;
            // If no ID, generate one
            if (!conversation.id) {
                conversation.id = (0, uuid_1.v4)();
            }
            // Generate title if not provided
            if (!conversation.title && conversation.messages.length > 0) {
                const firstUserMessage = conversation.messages.find(m => m.role === 'user');
                if (firstUserMessage) {
                    conversation.title = firstUserMessage.content.substring(0, 50) +
                        (firstUserMessage.content.length > 50 ? '...' : '');
                }
                else {
                    conversation.title = `Conversation ${new Date().toLocaleDateString()}`;
                }
            }
            // Write the conversation to file
            await fs_1.promises.writeFile(filePath, JSON.stringify(conversation, null, 2));
        }
        catch (error) {
            console.error('Error saving conversation:', error);
            throw error;
        }
    }
    async deleteConversation(conversationId, agentName) {
        const agentPath = getAgentPath(agentName);
        try {
            // Read all conversation files to find the one with the matching ID
            const files = await fs_1.promises.readdir(agentPath);
            const conversationFiles = files.filter(file => file.endsWith('-conversation.json'));
            for (const file of conversationFiles) {
                try {
                    const filePath = (0, path_1.join)(agentPath, file);
                    const content = await fs_1.promises.readFile(filePath, 'utf-8');
                    const conversation = JSON.parse(content);
                    if (conversation.id === conversationId) {
                        await fs_1.promises.unlink(filePath);
                        return;
                    }
                }
                catch (error) {
                    console.error(`Error checking conversation file ${file}:`, error);
                }
            }
            throw new Error(`Conversation with ID ${conversationId} not found`);
        }
        catch (error) {
            console.error('Error deleting conversation:', error);
            throw error;
        }
    }
    async createNewConversation(agentName) {
        return {
            id: (0, uuid_1.v4)(),
            title: `New Conversation ${new Date().toLocaleDateString()}`,
            agentName,
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }
    async addMessageToConversation(conversationId, agentName, message) {
        const conversations = await this.getConversations(agentName);
        const conversation = conversations.find(c => c.id === conversationId);
        if (!conversation) {
            throw new Error(`Conversation with ID ${conversationId} not found`);
        }
        // Ensure message has an ID and timestamp
        if (!message.id) {
            message.id = (0, uuid_1.v4)();
        }
        if (!message.timestamp) {
            message.timestamp = new Date();
        }
        conversation.messages.push(message);
        await this.saveConversation(conversation);
    }
}
exports.ConversationManager = ConversationManager;
//# sourceMappingURL=conversation-manager.js.map