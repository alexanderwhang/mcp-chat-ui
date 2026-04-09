import React, { useEffect, useRef } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import type { Message as MessageType } from '../../api/types';
import ChatMessage from './ChatMessage';

/**
 * Props for MessageList component
 */
export interface MessageListProps {
  messages: MessageType[];
  isLoading?: boolean;
  isToolExecuting?: boolean;
}

/**
 * Component to render a scrollable list of chat messages
 */
export const MessageList: React.FC<MessageListProps> = ({ messages, isLoading, isToolExecuting }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  if (messages.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            color: 'text.secondary',
          }}
        >
          <Typography variant="h6" gutterBottom>
            Welcome to Chat
          </Typography>
          <Typography variant="body2">
            Start a conversation by typing below.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      ref={scrollRef}
      sx={{
        flex: 1,
        overflowY: 'auto',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      {messages.map((message) => {
        console.log('Rendering message:', { id: message.id, role: message.role, toolCalls: message.toolCalls?.map(tc => ({ id: tc.id, name: tc.function.name })), toolResults: message.toolResults?.map(tr => ({ toolId: tr.toolId, name: tr.name })) });
        return <ChatMessage key={message.id} message={message} />;
      })}
      
        {isLoading && !isToolExecuting && (
         <Box
           sx={{
             display: 'flex',
             justifyContent: 'flex-start',
             width: '100%',
             mt: -3,
             mb: 2,
           }}
         >
           <Box
             sx={{
               maxWidth: '80%',
               display: 'flex',
               flexDirection: 'column',
               alignItems: 'flex-start',
             }}
           >
               <Paper variant="outlined" sx={{ p: 2 }}>
                 <Typography
                   variant="body1"
                   color="text.secondary"
                   className="pulseFade"
                 >
                   Thinking...
                 </Typography>
               </Paper>
           </Box>
         </Box>
       )}
    </Box>
  );
};

export default MessageList;