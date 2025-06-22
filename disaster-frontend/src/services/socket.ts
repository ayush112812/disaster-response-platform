import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

export const socket: Socket = io(SOCKET_URL, {
  path: '/socket.io/',
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

// Socket event listeners
socket.on('connect', () => {
  console.log('Connected to WebSocket server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from WebSocket server');
});

socket.on('connect_error', (error) => {
  console.error('WebSocket connection error:', error);
});

// Event types
export interface DisasterUpdate {
  id: string;
  type: 'create' | 'update' | 'delete';
  data: any;
}

export interface SocialMediaUpdate {
  disasterId: string;
  posts: any[];
}

export interface ResourceUpdate {
  disasterId: string;
  resources: any[];
}

// Subscribe to disaster updates
export function subscribeToDisaster(disasterId: string) {
  socket.emit('join_disaster', disasterId);
}

// Unsubscribe from disaster updates
export function unsubscribeFromDisaster(disasterId: string) {
  socket.emit('leave_disaster', disasterId);
}

// Subscribe to specific events
export function subscribeToEvent(event: string, callback: (data: any) => void) {
  socket.on(event, callback);
  return () => socket.off(event, callback);
}

// Helper function to handle WebSocket reconnection
export function handleReconnection(callback: () => void) {
  socket.io.on('reconnect', callback);
  return () => socket.io.off('reconnect', callback);
}