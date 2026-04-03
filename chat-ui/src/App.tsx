import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Alert,
  CssBaseline,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import { MessageList } from './components/chat/MessageList';
import { ChatInput } from './components/input/ChatInput';
import useChat from './hooks/useChat';
import { agentClient } from './api/openaiClient';
import type { Message, ToolCall, ChatCompletionResponse } from './api/types';

/**
 * API message format
 */
interface APIMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content?: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

/**
 * Tool definition from the Python agent
 */
interface AgentTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

/**
 * Main application component
 */
const App: React.FC = () => {
  const { 
    messages, 
    setMessages,
    isLoading, 
    isToolExecuting,
    error, 
    addMessage, 
    setLoading, 
    handleError, 
    setToolExecuting,
  } = useChat();
  const [apiError, setApiError] = useState<string | null>(null);
  const [mcpTools, setMcpTools] = useState<any[]>([]);

  // Load MCP tools from Python agent on mount
  useEffect(() => {
    const loadTools = async () => {
      try {
        const response = await fetch('http://localhost:8001/tools');
        if (response.ok) {
          const data = await response.json();
          const tools: AgentTool[] = data.tools || [];
          const toolDefinitions = tools.map((tool: AgentTool) =>
            agentClient.buildToolDefinition(
              tool.name,
              tool.description,
              tool.inputSchema
            )
          );
          setMcpTools(toolDefinitions);
        }
      } catch (error) {
        console.error('Failed to load MCP tools:', error);
      }
    };
    loadTools();
  }, []);

  // Create MUI theme
  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: 'light',
          primary: {
            main: '#734F96',
          },
          secondary: {
            main: '#dc004e',
          },
        },
      }),
    []
  );

  /**
   * Execute tool calls via the batch endpoint
   */
  const executeToolCalls = async (toolCalls: ToolCall[]): Promise<any[]> => {
    const response = await fetch('http://localhost:8001/tools/call-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool_calls: toolCalls }),
    });

    if (!response.ok) {
      throw new Error('Failed to execute tools');
    }

    const data = await response.json();
    return data.results || [];
  };

  /**
   * Handle sending a message
   */
  const handleSendMessage = async (text: string) => {
    // Add user message
    addMessage(text, 'user');
    setApiError(null);

    try {
      setLoading(true);
      setToolExecuting(false);

      // Prepare messages for API (include tool results in history)
      // Build the message array with proper tool call format
      const apiMessages: APIMessage[] = [];
      
      for (const m of messages) {
        if (m.role === 'tool' && m.toolCallId) {
          // Tool result message
          apiMessages.push({
            role: 'tool',
            content: m.content,
            tool_call_id: m.toolCallId,
          });
        } else if (m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0) {
          // Assistant message with tool calls - this was a tool call request
          // The tool calls have already been executed, so we should NOT include tool_calls
          // in the message sent to the agent. The agent will handle tool calls fresh.
          // Just include the content.
          apiMessages.push({
            role: 'assistant',
            content: m.content,
          });
        } else {
          // Regular user/system message
          apiMessages.push({
            role: m.role,
            content: m.content,
            tool_calls: m.toolCalls?.map((tc) => ({
              id: tc.id,
              type: tc.type,
              function: {
                name: tc.function.name,
                arguments: JSON.stringify(tc.function.arguments),
              },
            })) || undefined,
          });
        }
      }

      // Send to Python agent (returns tool calls without executing)
      const newMessage: APIMessage = {
        role: 'user' as const,
        content: text,
      };

      const response = await fetch('http://localhost:8001/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...apiMessages, newMessage],
          tools: mcpTools.length > 0 ? mcpTools : undefined,
          return_tool_calls_immediately: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const agentResponse = data as ChatCompletionResponse & { tool_calls?: ToolCall[]; tool_results?: any[] };

      // Extract tool calls from response (tool_results will be empty initially)
      const toolCalls = agentResponse.tool_calls || [];
      
      // Build assistant message content
      const content = agentResponse.choices?.[0]?.message?.content || '';

      // Add assistant message with tool calls in "executing" state
      const assistantMessageId = Date.now().toString();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: content,
        toolCalls: toolCalls.length > 0 ? toolCalls.map((tc) => ({
          id: tc.id,
          type: tc.type,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments as Record<string, unknown>,
          },
        })) : undefined,
         toolResults: toolCalls.length > 0 ? toolCalls.map((tc) => ({
           toolId: tc.id,
           name: tc.function.name,
           input: tc.function.arguments as Record<string, unknown>,
           output: 'Executing...',
           status: 'executing',
         })) : undefined,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Execute tool calls
      if (toolCalls.length > 0) {
        try {
          const toolResults = await executeToolCalls(toolCalls);

          // Update the assistant message with tool results
          setMessages((prev) => 
            prev.map((msg) => {
              if (msg.id === assistantMessageId && msg.toolResults) {
                return {
                  ...msg,
                  toolResults: toolResults.map((tr: any, idx: number) => {
                    const toolCall = msg.toolCalls?.[idx];
                    return {
                      toolId: tr.tool_call_id,
                      name: toolCall?.function.name || 'unknown',
                      input: toolCall?.function.arguments as Record<string, unknown> || {},
                      output: Array.isArray(tr.content) ? tr.content[0]?.text || '' : '',
                      status: tr.isError ? 'error' : 'success',
                    };
                  }),
                };
              }
              return msg;
            })
          );

          // Send tool results back to agent to get final response
          if (toolResults.length > 0) {
            try {
              // Build messages with tool results for the final LLM call
              const finalMessages: APIMessage[] = [];
              
              for (const m of messages) {
                if (m.role === 'tool' && m.toolCallId) {
                  // Tool result message
                  finalMessages.push({
                    role: 'tool',
                    content: m.content,
                    tool_call_id: m.toolCallId,
                  });
                } else if (m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0) {
                  // Assistant message with tool calls - this was a tool call request
                  // We should NOT include tool_calls in the message sent to the agent
                  // Just include the content. The tool results will be added separately.
                  finalMessages.push({
                    role: 'assistant',
                    content: m.content,
                  });
                } else {
                  // Regular user/system message
                  finalMessages.push({
                    role: m.role,
                    content: m.content,
                  });
                }
              }

              // Add the new user message
              finalMessages.push({
                role: 'user' as const,
                content: text,
              });

              // Add the assistant message with tool calls (without tool_calls field)
              finalMessages.push({
                role: 'assistant',
                content: content,
              });

              // Add tool result messages
              toolResults.forEach((tr: any) => {
                finalMessages.push({
                  role: 'tool',
                  content: Array.isArray(tr.content) ? tr.content[0]?.text || '' : '',
                  tool_call_id: tr.tool_call_id,
                });
              });

              // Call the agent to get final response with tool results
              const finalResponse = await fetch('http://localhost:8001/chat', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  messages: finalMessages,
                  tools: mcpTools.length > 0 ? mcpTools : undefined,
                  return_tool_calls_immediately: false, // Let agent handle tool results
                }),
              });

              if (finalResponse.ok) {
                const finalData = await finalResponse.json();
                const finalContent = finalData.choices?.[0]?.message?.content || '';

                // Update the assistant message with final content
                setMessages((prev) => 
                  prev.map((msg) => {
                    if (msg.id === assistantMessageId) {
                      return {
                        ...msg,
                        content: finalContent,
                      };
                    }
                    return msg;
                  })
                );
              }
            } catch (error) {
              console.error('Failed to get final response:', error);
            }
          }
        } catch (error) {
          console.error('Failed to execute tools:', error);
          // Update tool results with error status
          setMessages((prev) => 
            prev.map((msg) => {
              if (msg.id === assistantMessageId) {
                return {
                  ...msg,
                  toolResults: msg.toolResults?.map((tr) => ({
                    ...tr,
                    output: 'Error executing tool',
                    status: 'error',
                  })),
                };
              }
              return msg;
            })
          );
        }
      }

    } catch (err: any) {
      setApiError(err.message || 'An error occurred');
      handleError('Failed to get response from API');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'background.default',
        }}
      >
        {/* Header */}
        <Paper
          elevation={2}
          sx={{
            p: 2,
            textAlign: 'center',
            backgroundColor: 'primary.main',
            color: 'primary.contrastText',
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            My Chatty Pal
          </Typography>
        </Paper>

        {/* Error Alert */}
        {(error || apiError) && (
          <Alert
            severity="error"
            sx={{
              mx: 2,
              mt: 1,
            }}
          >
            {error || apiError}
          </Alert>
        )}

        {/* Chat Area */}
        <Container
          maxWidth={false}
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            px: 2,
            py: 1,
            overflow: 'hidden',
          }}
        >
          <MessageList messages={messages} isLoading={isLoading || isToolExecuting} />
        </Container>

        {/* Input Area */}
        <Paper
          elevation={3}
          sx={{
            p: 2,
            backgroundColor: 'background.paper',
            mt: 'auto',
          }}
        >
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={isLoading || isToolExecuting}
            placeholder="Type a message..."
          />
        </Paper>
      </Box>
    </ThemeProvider>
  );
};

export default App;