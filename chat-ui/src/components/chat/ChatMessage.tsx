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
  
  console.log('ChatMessage rendering:', { 
    id: message.id, 
    role: message.role, 
    toolCalls: message.toolCalls?.map(tc => ({ id: tc.id, name: tc.function.name })), 
    toolResults: message.toolResults?.map(tr => ({ toolId: tr.toolId, name: tr.name, status: tr.status }))
  });

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
         {message.content && (
           <Paper
             elevation={isUser ? 2 : 1}
             sx={{
               p: 2,
               backgroundColor: isUser 
                 ? 'primary.main' 
                 : isTool 
                   ? 'action.disabledBackground' 
                   : 'background.default',
               color: isUser ? 'primary.contrastText' : undefined,
               border: isAssistant ? '1px solid' : undefined,
               borderColor: isAssistant ? 'divider' : undefined,
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
         )}
      </Box>
    </Box>
  );
};

export default ChatMessage;