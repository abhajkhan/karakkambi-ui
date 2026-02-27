import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Message } from '../types/index';

const APP_NAME = 'കരക്കമ്പി';

const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
};

const showBrowserNotification = (message: Message) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  new Notification(APP_NAME, {
    body: message.text,
  });
};

export const useSocket = (serverUrl: string) => {

  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<number>(0);
  const [connected, setConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const unreadCountRef = useRef(0);

  // Request notification permission once on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Reset unread count when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        unreadCountRef.current = 0;
        setUnreadCount(0);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

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

    socketIo.on('new_message', (message: Message) => {
      setMessages(prev => [...prev, message]);
      console.log(message);
      if (document.visibilityState !== 'visible') {
        showBrowserNotification(message);
        unreadCountRef.current += 1;
        setUnreadCount(unreadCountRef.current);
      }
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

  const sendMessage = (text: string, replyTarget?: string): { success: boolean; error?: string } => {
    if (!socket) {
      return { success: false, error: 'Socket not initialized' };
    }
    if (!connected) {
      return { success: false, error: 'Not connected to server' };
    }
    if (!text.trim()) {
      return { success: false, error: 'Message cannot be empty' };
    }

    try {
      const payload = { text, replyTo: replyTarget };
      socket.emit('send_message', payload);
      return { success: true };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error: 'Failed to send message' };
    }
  };

  const resetUnreadCount = () => {
    unreadCountRef.current = 0;
    setUnreadCount(0);
  };

  return { socket, messages, sendMessage, onlineUsers, connected, unreadCount, resetUnreadCount };
};