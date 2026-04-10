import React, { useState, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { Box, TextField, Button, Paper } from '@mui/material';

// Logger utility for consistent logging
const logger = {
  log: (message: string, ...data: any[]) => {
    console.log(`[LOG] [ChatInput] ${message}`, ...data);
  },
  info: (message: string, ...data: any[]) => {
    console.info(`[INFO] [ChatInput] ${message}`, ...data);
  },
  warn: (message: string, ...data: any[]) => {
    console.warn(`[WARN] [ChatInput] ${message}`, ...data);
  },
  error: (message: string, ...data: any[]) => {
    console.error(`[ERROR] [ChatInput] ${message}`, ...data);
  }
};

export interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = 'Type a message...',
}) => {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (text.trim() && !disabled) {
      logger.log('INPUT - User sending message', { 
        messageLength: text.length,
        messagePreview: text.substring(0, 50) + (text.length > 50 ? '...' : '')
      });
      onSendMessage(text.trim());
      setText('');

      // Wait for ALL updates (React + DOM + other effects)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          inputRef.current?.focus();
        });
      });
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        backgroundColor: 'background.paper',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          alignItems: 'center',
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          variant="outlined"
          size="small"
          inputRef={inputRef}
        />

        <Button
          variant="contained"
          onClick={handleSend}
          onMouseDown={(e) => e.preventDefault()}
          disabled={!text.trim() || disabled}
        >
          Send
        </Button>
      </Box>
    </Paper>
  );
};

export default ChatInput;