import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Message } from '../types/index';

export const useSocket = (serverUrl: string) => {

  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<number>(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Connect to external Socket.io server
    const socketIo = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    socketIo.on('connect', () => {
      console.log('Connected to server:', socketIo.id);
      setConnected(true);
    });

    socketIo.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    socketIo.on('receive_message', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    socketIo.on('user_joined', () => {
      setOnlineUsers(prev => prev + 1);
    });

    socketIo.on('user_left', () => {
      setOnlineUsers(prev => Math.max(0, prev - 1));
    });

    socketIo.on('online_count', (count: number) => {
      setOnlineUsers(count);
    });

    setSocket(socketIo);

    return () => {
      socketIo.disconnect();
    };
  }, [serverUrl]);

  const sendMessage = (message: string) => {
    if (socket && message.trim() && connected) {
      socket.emit('send_message', message);
    }
  };

  return { socket, messages, sendMessage, onlineUsers, connected };
};