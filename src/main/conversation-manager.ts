import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import { Conversation, ChatMessage } from '../shared/types';

// Path helpers
const getDataPath = (): string => {
  if (process.platform === 'win32') {
    return join(process.env.APPDATA || homedir(), 'Canvas', 'electron');
  }
  return join(homedir(), '.canvas', 'electron');
};

const getAgentsPath = (): string => join(getDataPath(), 'agents');

const getAgentPath = (agentName: string): string => join(getAgentsPath(), agentName);

export class ConversationManager {

  async getConversations(agentName: string): Promise<Conversation[]> {
    const agentPath = getAgentPath(agentName);

    try {
      // Ensure the agent directory exists
      await fs.mkdir(agentPath, { recursive: true });

      // Read all conversation files
      const files = await fs.readdir(agentPath);
      const conversationFiles = files.filter(file =>
        file.endsWith('-conversation.json')
      );

      const conversations: Conversation[] = [];

      for (const file of conversationFiles) {
        try {
          const filePath = join(agentPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const conversation: Conversation = JSON.parse(content);

          // Ensure the conversation has the required properties
          if (conversation.id && conversation.messages) {
            conversations.push(conversation);
          }
        } catch (error) {
          console.error(`Error reading conversation file ${file}:`, error);
        }
      }

      // Sort by updatedAt descending (most recent first)
      return conversations.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

    } catch (error) {
      console.error(`Error loading conversations for agent ${agentName}:`, error);
      return [];
    }
  }

  async saveConversation(conversation: Conversation): Promise<void> {
    const agentPath = getAgentPath(conversation.agentName);

    try {
      // Ensure the agent directory exists
      await fs.mkdir(agentPath, { recursive: true });

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${timestamp}-conversation.json`;
      const filePath = join(agentPath, filename);

      // Update the conversation timestamps
      const now = new Date();
      if (!conversation.createdAt) {
        conversation.createdAt = now;
      }
      conversation.updatedAt = now;

      // If no ID, generate one
      if (!conversation.id) {
        conversation.id = uuidv4();
      }

      // Generate title if not provided
      if (!conversation.title && conversation.messages.length > 0) {
        const firstUserMessage = conversation.messages.find(m => m.role === 'user');
        if (firstUserMessage) {
          conversation.title = firstUserMessage.content.substring(0, 50) +
            (firstUserMessage.content.length > 50 ? '...' : '');
        } else {
          conversation.title = `Conversation ${new Date().toLocaleDateString()}`;
        }
      }

      // Write the conversation to file
      await fs.writeFile(filePath, JSON.stringify(conversation, null, 2));

    } catch (error) {
      console.error('Error saving conversation:', error);
      throw error;
    }
  }

  async deleteConversation(conversationId: string, agentName: string): Promise<void> {
    const agentPath = getAgentPath(agentName);

    try {
      // Read all conversation files to find the one with the matching ID
      const files = await fs.readdir(agentPath);
      const conversationFiles = files.filter(file =>
        file.endsWith('-conversation.json')
      );

      for (const file of conversationFiles) {
        try {
          const filePath = join(agentPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const conversation: Conversation = JSON.parse(content);

          if (conversation.id === conversationId) {
            await fs.unlink(filePath);
            return;
          }
        } catch (error) {
          console.error(`Error checking conversation file ${file}:`, error);
        }
      }

      throw new Error(`Conversation with ID ${conversationId} not found`);

    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }

  async createNewConversation(agentName: string): Promise<Conversation> {
    return {
      id: uuidv4(),
      title: `New Conversation ${new Date().toLocaleDateString()}`,
      agentName,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async addMessageToConversation(
    conversationId: string,
    agentName: string,
    message: ChatMessage
  ): Promise<void> {
    const conversations = await this.getConversations(agentName);
    const conversation = conversations.find(c => c.id === conversationId);

    if (!conversation) {
      throw new Error(`Conversation with ID ${conversationId} not found`);
    }

    // Ensure message has an ID and timestamp
    if (!message.id) {
      message.id = uuidv4();
    }
    if (!message.timestamp) {
      message.timestamp = new Date();
    }

    conversation.messages.push(message);
    await this.saveConversation(conversation);
  }
}
