import { io } from 'socket.io-client';

let socket = null;

export function connectSocket() {
  if (socket?.connected) return socket;
  socket = io('http://localhost:5000', {
    transports: ['websocket'],
    autoConnect: true,
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) { socket.disconnect(); socket = null; }
}

export function getSocket() {
  return socket;
}
