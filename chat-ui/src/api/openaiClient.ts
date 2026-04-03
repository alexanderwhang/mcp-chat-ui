import type {
  ChatCompletionResponse,
  Message,
} from './types';

/**
 * Configuration for the Python Agent API client
 * The agent acts as a proxy for LLM and MCP tool execution
 */
export interface AgentConfig {
  baseUrl: string;
  apiKey?: string;
  defaultModel?: string;
}

/**
 * Agent API client that communicates with the Python agent
 * The agent handles LLM interactions and MCP tool execution
 */
export class AgentClient {
  private readonly config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  /**
   * Send a chat completion request through the Python agent
   * The agent will handle tool calls automatically
   */
  async complete(
    messages: Message[],
    model?: string,
    tools?: any[],
    stream = false
  ): Promise<ChatCompletionResponse | ReadableStream<Uint8Array>> {
    const request = {
      messages,
      tools: tools?.length ? tools : undefined,
      model: model || this.config.defaultModel || 'llama3.2',
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    if (stream) {
      throw new Error('Streaming is not supported through the Python agent');
    }

    const response = await fetch(`${this.config.baseUrl}/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json() as ChatCompletionResponse;
    return data;
  }

  /**
   * Build a formatted tool definition for the API
   */
  buildToolDefinition(
    name: string,
    description?: string,
    parameters?: Record<string, unknown>
  ): any {
    return {
      type: 'function' as const,
      function: {
        name,
        description,
        parameters: parameters || { type: 'object', properties: {} },
      },
    };
  }
}

// Default configuration (can be overridden via environment variables)
const DEFAULT_CONFIG: AgentConfig = {
  baseUrl: import.meta.env.VITE_AGENT_BASE_URL || 'http://localhost:8000',
  apiKey: import.meta.env.VITE_AGENT_API_KEY,
  defaultModel: import.meta.env.VITE_DEFAULT_MODEL || 'llama3.2',
};

export const agentClient = new AgentClient(DEFAULT_CONFIG);