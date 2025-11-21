import React, { useState, useRef, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { formatTimestamp } from '../utils/timeFormatter';
import { MessageBubble } from './MessageBubble';
import { Send, Users, Wifi, WifiOff } from 'lucide-react';
import type { ResponseMessageItem } from '../types/index'
import { get_messages } from '../services/messageService';

const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_URL;

export const ChatRoom = () => {
  const [inputMessage, setInputMessage] = useState('');
  const [historicalMessages, setHistoricalMessages] = useState<ResponseMessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { messages: socketMessages, sendMessage, onlineUsers, connected } = useSocket(SOCKET_SERVER_URL);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch historical messages on mount
  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response_data: ResponseMessageItem[] = await get_messages();
      setHistoricalMessages(response_data);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      setError('Failed to load messages. Please refresh.');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [socketMessages, historicalMessages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      sendMessage(inputMessage);
      setInputMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Combine and sort all messages
  const allMessages = [...historicalMessages, ...socketMessages].sort((a, b) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  // Remove duplicates by ID
  const uniqueMessages = allMessages.filter((msg, index, self) =>
    index === self.findIndex((m) => m.id === msg.id)
  );

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
      {/* Header with Glassmorphism */}
      <header className="backdrop-blur-xl bg-gray-900/70 border-b border-gray-700/50 shadow-2xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left spacer for balance */}
            <div className="w-20 sm:w-24">
              <div className="flex items-center gap-2">
                <Users className="w-3 h-3 text-gray-400" />
                <p className="text-xs text-gray-400 hidden sm:inline">{onlineUsers}</p>
              </div>
            </div>

            {/* Centered Title */}
            <div className="flex-1 text-center">
              <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
                Karakkambi
              </h1>
            </div>

            {/* Connection Status */}
            <div className="w-20 sm:w-24 flex justify-end">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl transition-all ${connected
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                <span className="text-xs font-medium hidden sm:inline">
                  {connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3">
          {/* Loading State */}
          {isLoading && (
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-700/40 backdrop-blur-xl text-gray-400 text-sm border border-gray-600/40">
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
                Loading messages...
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 backdrop-blur-xl text-red-400 text-sm border border-red-500/30">
                {error}
              </div>
            </div>
          )}

          {/* Connection Status */}
          {!connected && !isLoading && (
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/20 backdrop-blur-xl text-yellow-400 text-sm border border-yellow-500/30">
                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                Connecting to server...
              </div>
            </div>
          )}

          {/* Messages */}
          {!isLoading && uniqueMessages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={{
                ...msg,
                createdAt: formatTimestamp(msg.createdAt)
              }}
              isOwn={msg.username === 'You'}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area with Glassmorphism */}
      <div className="backdrop-blur-xl bg-gray-900/70 border-t border-gray-700/50 shadow-2xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex gap-2 sm:gap-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={!connected || isLoading}
              className="flex-1 px-4 py-2.5 bg-gray-800/90 backdrop-blur-xl text-gray-100 placeholder-gray-500 rounded-2xl border border-gray-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-[15px]"
              autoComplete="off"
            />
            <button
              onClick={handleSubmit}
              disabled={!connected || !inputMessage.trim() || isLoading}
              className="px-4 sm:px-6 py-3 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl hover:from-blue-500 hover:to-blue-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 disabled:shadow-none flex items-center justify-center gap-2 font-medium"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">Send</span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        /* Custom scrollbar for dark theme */
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(17, 24, 39, 0.3);
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(75, 85, 99, 0.5);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(107, 114, 128, 0.7);
        }
      `}</style>
    </div>
  );
};