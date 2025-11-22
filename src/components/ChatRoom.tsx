import React, { useState, useRef, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { formatTimestamp } from '../utils/timeFormatter';
import { MessageBubble } from './MessageBubble';
import { Send, Users, Wifi, WifiOff } from 'lucide-react';
import type { ResponseMessageItem } from '../types/index'
import { get_messages } from '../services/messageService';
import { MAX_MESSAGE_LENGTH, MESSAGE_COOLDOWN } from '../constants';

const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_URL;

const HEADER_HEIGHT = 64;
const FOOTER_HEIGHT = 94;

export const ChatRoom = () => {
  const [inputMessage, setInputMessage] = useState('');
  const [historicalMessages, setHistoricalMessages] = useState<ResponseMessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const { messages: socketMessages, sendMessage, onlineUsers, connected } = useSocket(SOCKET_SERVER_URL);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);
  const lastMessageTimeRef = useRef<number>(0);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Fetch historical messages on mount
  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async (cursor?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response_data = await get_messages(cursor);

      if (response_data.length < 50) {
        setHasMore(false);
      }

      if (cursor) {
        setHistoricalMessages(prev => [...response_data, ...prev]);
      } else {
        setHistoricalMessages(response_data);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      setError('Failed to load messages. Please refresh.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleScroll = async () => {
    const container = scrollContainerRef.current;
    if (!container || isLoading || !hasMore) return;

    if (container.scrollTop === 0 && historicalMessages.length > 0) {
      const oldScrollHeight = container.scrollHeight;
      const oldestMessage = historicalMessages[0];

      await fetchMessages(oldestMessage.createdAt);

      // Restore scroll position
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight - oldScrollHeight;
      });
    }
  };

  // Auto-scroll to bottom when new socket messages arrive or on initial load
  useEffect(() => {
    if (isInitialLoadRef.current && !isLoading && historicalMessages.length > 0) {
      // Initial load done
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      isInitialLoadRef.current = false;
    } else if (socketMessages.length > 0) {
      // New socket message
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [socketMessages, isLoading, historicalMessages.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputMessage.trim()) return;

    if (inputMessage.length > MAX_MESSAGE_LENGTH) {
      setValidationError(`Message exceeds ${MAX_MESSAGE_LENGTH} characters`);
      return;
    }

    const now = Date.now();
    if (now - lastMessageTimeRef.current < MESSAGE_COOLDOWN) {
      setValidationError(`Please wait ${MESSAGE_COOLDOWN / 1000}s before sending another message`);
      return;
    }

    sendMessage(inputMessage);
    setInputMessage('');
    setValidationError(null);
    lastMessageTimeRef.current = now;
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
    <div
      className="relative w-full h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden"
      style={{
        // Respect device safe areas on phones with notches
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        boxSizing: 'border-box',
      }}
    >
      {/* Fixed Header */}
      <header
        className="backdrop-blur-xl bg-gray-900/70 border-b border-gray-700/50 shadow-2xl fixed top-0 left-0 right-0 z-50"
        style={{ height: `${HEADER_HEIGHT}px`, display: 'flex', alignItems: 'center' }}
      >
        <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 box-border">
          <div className="flex items-center justify-between min-w-0">
            {/* Left spacer for balance */}
            <div className="w-20 sm:w-24 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Users className="w-3 h-3 text-gray-400" />
                <p className="text-xs text-gray-400 sm:inline truncate">Online : {onlineUsers}</p>
              </div>
            </div>

            {/* Centered Title */}
            <div className="flex-1 text-center min-w-0 px-2">
              <h1 className="text-lg sm:text-2xl font-semibold text-white tracking-tight truncate chilanka-regular">
                കരക്കമ്പി 💬
              </h1>
            </div>

            {/* Connection Status */}
            <div className="w-20 sm:w-24 flex justify-end flex-shrink-0">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl transition-all ${connected
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                <span className="text-xs font-medium hidden sm:inline truncate">
                  {connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Scrollable messages area.
          We set an explicit height calc to fill the area between the fixed header and footer.
          This avoids any extra vertical scrolling when there are no messages. */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="w-full overflow-y-auto overflow-x-hidden"
        style={{
          // height = viewport - header - footer
          height: `calc(100vh - ${HEADER_HEIGHT}px - ${15}px)`,
          paddingTop: `${HEADER_HEIGHT}px`, // push content below header visually (so inner content can be centered in its own container)
          boxSizing: 'border-box',
        }}
      >
        <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-3 box-border min-w-0">
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
          {!isLoading && uniqueMessages.length === 0 && (
            <div className="text-center text-sm text-gray-400 py-8">
              No messages yet. Say hello.
            </div>
          )}
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

      {/* Fixed Footer / Input area */}
      <footer
        className="backdrop-blur-xl bg-gray-900/70 border-t border-gray-700/50 shadow-2xl fixed left-0 right-0 bottom-0 z-50"
        style={{
          height: `${FOOTER_HEIGHT}px`,
          display: 'flex',
          alignItems: 'center',
          boxSizing: 'border-box',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
      >
        <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 box-border">
          <form onSubmit={handleSubmit} className="flex gap-2 sm:gap-3 items-center min-w-0">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => {
                setInputMessage(e.target.value);
                if (validationError) setValidationError(null);
              }}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={!connected || isLoading}
              className={`flex-1 min-w-0 px-4 py-2.5 bg-gray-800/90 backdrop-blur-xl text-gray-100 placeholder-gray-500 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-[15px] ${inputMessage.length > MAX_MESSAGE_LENGTH ? 'border-red-500/50' : 'border-gray-700/50'
                }`}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={!connected || !inputMessage.trim() || isLoading}
              className="flex items-center justify-center gap-2 font-medium flex-shrink-0 px-3 sm:px-6 py-3 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl hover:from-blue-500 hover:to-blue-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 disabled:shadow-none"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">Send</span>
            </button>
          </form>

          {/* Validation Feedback */}
          <div className="flex justify-between items-center mt-2 px-2">
            <span className="text-xs text-red-400 min-h-[1.25rem]">
              {validationError}
            </span>
            <span className={`text-xs font-medium transition-colors ${inputMessage.length > MAX_MESSAGE_LENGTH
              ? 'text-red-400'
              : inputMessage.length > MAX_MESSAGE_LENGTH * 0.9
                ? 'text-yellow-400'
                : 'text-gray-500'
              }`}>
              {inputMessage.length} / {MAX_MESSAGE_LENGTH}
            </span>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }

        /* Prevent horizontal overflow from long words/children */
        html, body, #root { overflow-x: hidden; }

        /* Small helper to allow truncation inside flex containers */
        .min-w-0 { min-width: 0; }

        /* Custom scrollbar for dark theme */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: rgba(17, 24, 39, 0.3); }
        ::-webkit-scrollbar-thumb { background: rgba(75, 85, 99, 0.5); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(107, 114, 128, 0.7); }
      `}</style>
    </div >
  );
};
