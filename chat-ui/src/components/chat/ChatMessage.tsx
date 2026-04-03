import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import type { Message as MessageType } from '../../api/types';
import ToolCallBlockComponent from './ToolCallBlock';

/**
 * Props for ChatMessage component
 */
export interface ChatMessageProps {
  message: MessageType;
}

/**
 * Component to render an individual chat message with optional tool calls
 */
export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isTool = message.role === 'tool';

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        width: '100%',
        mb: 2,
      }}
    >
      <Box
        sx={{
          maxWidth: '80%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: isUser ? 'flex-end' : 'flex-start',
        }}
      >
        {/* Message sender label */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mb: 0.5 }}
        >
          {isUser ? 'You' : isAssistant ? 'Assistant' : 'Tool'}
        </Typography>

        {/* Tool calls for assistant messages - render FIRST */}
        {isAssistant &&
          message.toolCalls?.map((toolCall) => {
            const toolResult = message.toolResults?.find(
              (tr) => tr.toolId === toolCall.id
            );
            
            return (
              <ToolCallBlockComponent
                key={toolCall.id}
                name={toolCall.function.name}
                input={toolCall.function.arguments as Record<string, unknown>}
                output={toolResult?.output}
                  status={toolResult?.status || 'executing'}
              />
            );
          })}

        {/* Message content */}
        <Paper
          elevation={isUser ? 2 : 0}
          sx={{
            p: 2,
            backgroundColor: isUser ? 'primary.main' : isTool ? 'action.disabledBackground' : undefined,
            color: isUser ? 'primary.contrastText' : undefined,
          }}
        >
          <Typography
            variant="body1"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {message.content}
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
};

export default ChatMessage;