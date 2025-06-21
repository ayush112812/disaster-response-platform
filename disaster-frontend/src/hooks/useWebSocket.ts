import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { config } from '../config';

interface UseWebSocketReturn {
  socket: Socket | null;
  connected: boolean;
  error: Error | null;
  sendMessage: (type: string, data: any) => void;
}

export const useWebSocket = (): UseWebSocketReturn => {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize socket connection
    const socket = io(config.websocketUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
      setConnected(true);
      setError(null);
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err);
      setError(err);
      setConnected(false);
    });

    socket.on('error', (err) => {
      console.error('WebSocket error:', err);
      setError(new Error(err.message));
    });

    // Handle ping/pong for connection monitoring
    socket.on('ping', () => {
      socket.emit('pong');
    });

    socketRef.current = socket;

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.removeAllListeners();
        socket.close();
      }
    };
  }, []);

  // Function to send messages through the socket
  const sendMessage = useCallback((type: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(type, data);
    } else {
      console.warn('Cannot send message: WebSocket is not connected');
    }
  }, []);

  return {
    socket: socketRef.current,
    connected,
    error,
    sendMessage,
  };
};