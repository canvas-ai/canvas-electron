import { ChatMessage, AgentConfig } from '../shared/types';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export class ChatService {

  async sendMessage(message: ChatMessage, agentConfig: AgentConfig): Promise<ChatMessage> {
    try {
      let responseContent: string;

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
        id: uuidv4(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
      };

    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  private async sendToOpenAI(message: ChatMessage, config: AgentConfig): Promise<string> {
    const openai = new OpenAI({
      apiKey: config.apiToken,
      baseURL: config.apiUrl !== 'https://api.openai.com/v1' ? config.apiUrl : undefined,
    });

    const response = await openai.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: config.systemPrompt },
        { role: message.role as 'user' | 'assistant', content: message.content }
      ],
      temperature: config.temperature,
      top_p: config.topP,
      max_tokens: config.maxTokens,
    });

    return response.choices[0]?.message?.content || 'No response generated';
  }

  private async sendToAnthropic(message: ChatMessage, config: AgentConfig): Promise<string> {
    const anthropic = new Anthropic({
      apiKey: config.apiToken,
    });

    const response = await anthropic.messages.create({
      model: config.model,
      max_tokens: config.maxTokens || 2048,
      temperature: config.temperature,
      top_p: config.topP,
      system: config.systemPrompt,
      messages: [
        { role: message.role as 'user', content: message.content }
      ],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return content.text;
    }

    return 'No text response generated';
  }

  private async sendToOllama(message: ChatMessage, config: AgentConfig): Promise<string> {
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

    const data: any = await response.json();
    return data.message?.content || 'No response generated';
  }

  async testConnection(config: AgentConfig): Promise<boolean> {
    try {
      const testMessage: ChatMessage = {
        id: uuidv4(),
        role: 'user',
        content: 'Hello, this is a connection test.',
        timestamp: new Date(),
      };

      await this.sendMessage(testMessage, config);
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}
