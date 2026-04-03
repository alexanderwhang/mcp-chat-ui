import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Message } from '../api/types';

/**
 * Custom hook for managing chat state
 * Tool execution is now handled by the Python agent
 */
export const useChat = () => {
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
    setMessages((prev) => [...prev, message]);
  }, []);

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  /**
   * Handle chat error
   */
  const handleError = useCallback((errorMessage: string) => {
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