import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Message } from '../api/types';

// Logger utility for consistent logging
const logger = {
  log: (message: string, ...data: any[]) => {
    console.log(`[LOG] [useChat] ${message}`, ...data);
  },
  info: (message: string, ...data: any[]) => {
    console.info(`[INFO] [useChat] ${message}`, ...data);
  },
  warn: (message: string, ...data: any[]) => {
    console.warn(`[WARN] [useChat] ${message}`, ...data);
  },
  error: (message: string, ...data: any[]) => {
    console.error(`[ERROR] [useChat] ${message}`, ...data);
  }
};

/**
 * Custom hook for managing chat state
 * Tool execution is now handled by the Python agent
 */
export const useChat = () => {
  const messagesRef = useRef<Message[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isToolExecuting, setIsToolExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Add a message to the chat
   */
  const addMessage = useCallback((content: string, role: 'user' | 'assistant') => {
    const message: Message = {
      id: uuidv4(),
      role,
      content,
      timestamp: Date.now(),
    };
    setMessages((prev) => {
      const newMessages = [...prev, message];
      messagesRef.current = newMessages;
      logger.log('HOOK - Added message', {
        message: { id: message.id, role: message.role, contentLength: content.length },
        totalMessages: newMessages.length
      });
      return newMessages;
    });
  }, []);

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    logger.log('HOOK - Clearing all messages');
    setMessages([]);
    messagesRef.current = [];
    setError(null);
  }, []);

  /**
   * Handle chat error
   */
  const handleError = useCallback((errorMessage: string) => {
    logger.error('HOOK - Chat error', { errorMessage });
    setError(errorMessage);
    setIsLoading(false);
  }, []);

  /**
   * Set loading state
   */
  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  /**
   * Set tool executing state
   */
  const setToolExecuting = useCallback((executing: boolean) => {
    setIsToolExecuting(executing);
  }, []);

  return {
    messages,
    setMessages,
    isLoading,
    isToolExecuting,
    error,
    addMessage,
    clearMessages,
    handleError,
    setLoading,
    setToolExecuting,
  };
};

export default useChat;