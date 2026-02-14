import React, { useState, useRef, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { getDateKey, formatDateForDisplay } from '../utils/timeFormatter';
import { MessageBubble } from './MessageBubble';
import { Send, Users, Wifi, WifiOff } from 'lucide-react';
import type { Message } from '../types/index'
import { get_messages } from '../services/messageService';
import { MAX_MESSAGE_LENGTH, MESSAGE_COOLDOWN } from '../constants';

const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_URL;

const HEADER_HEIGHT = 64;
const FOOTER_HEIGHT = 80;

export const ChatRoom = () => {
  const [inputMessage, setInputMessage] = useState('');
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  const [historicalMessages, setHistoricalMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const { messages: socketMessages, sendMessage, onlineUsers, connected } = useSocket(SOCKET_SERVER_URL);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);
  const lastMessageTimeRef = useRef<number>(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

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
    if (!container) return;

    // Existing pagination logic
    if (container.scrollTop === 0 && !isLoading && hasMore && historicalMessages.length > 0) {
      const oldScrollHeight = container.scrollHeight;
      const oldestMessage = historicalMessages[0];
      await fetchMessages(oldestMessage.createdAt);
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight - oldScrollHeight;
      });
    }

    // New bottom-detection logic
    const threshold = 120;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;

    setShowScrollToBottom(distanceFromBottom > threshold);
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

    sendMessage(inputMessage, replyTarget?.id);
    setInputMessage('');
    setReplyTarget(null);
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

  // Group messages by date for floating date bubbles
  const getDateSeparator = (currentMsg: Message, prevMsg: Message | undefined): string | null => {
    if (!prevMsg) {
      // First message ever - always show date
      return formatDateForDisplay(currentMsg.createdAt);
    }

    const currentDateKey = getDateKey(currentMsg.createdAt);
    const prevDateKey = getDateKey(prevMsg.createdAt);

    // If dates are different, show date bubble
    if (currentDateKey !== prevDateKey) {
      return formatDateForDisplay(currentMsg.createdAt);
    }

    return null;
  };

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
          {!isLoading && uniqueMessages.map((msg, index) => {
            const prevMsg = index > 0 ? uniqueMessages[index - 1] : undefined;
            const dateSeparator = getDateSeparator(msg, prevMsg);

            console.log('Rendering message:', msg,"\n Messages List: ", uniqueMessages);
            const repliedMessage = msg.replyTo
            ? uniqueMessages.find(m => m.id === msg.replyTo)
            : null;

            return (
              <React.Fragment key={msg.id}>
                {dateSeparator && (
                  <div className="flex justify-center my-4">
                    <div className="px-3 py-1 rounded-full bg-gray-700/60 backdrop-blur-xl text-xs text-gray-300 border border-gray-600/40 shadow-lg">
                      {dateSeparator}
                    </div>
                  </div>
                )}
                <MessageBubble
                  key={msg.id}
                  message={{
                    ...msg,
                    createdAt: msg.createdAt
                  }}
                  onReply={setReplyTarget}
                  repliedMessage = {repliedMessage}
                />
              </React.Fragment>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
        {showScrollToBottom && (
          <button
            onClick={() => {
              const container = scrollContainerRef.current;
              if (container) {
                container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
              }
            }}
            className="
              fixed 
              bottom-[100px] 
              right-4 
              z-50
              flex 
              items-center 
              justify-center 
              w-10 
              h-10 
              rounded-full 
              bg-blue-600 
              text-white 
              shadow-lg 
              active:scale-95 
              transition-transform
            "
            aria-label="Scroll to bottom"
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              fill='none'
              viewBox='0 0 24 24'
              strokeWidth='2'
              stroke='currentColor'
              className='w-5 h-5'
            >
              <path strokeLinecap='round' strokeLinejoin='round' d='M19 9l-7 7-7-7' />
            </svg>
          </button>
        )}

      </div>

      {/* Fixed Footer / Input area */}
      <footer
        className="backdrop-blur-xl bg-gray-900/70 border-t border-gray-700/50 shadow-2xl fixed left-0 right-0 bottom-0 z-50"
        style={{
          // Dynamic height: expands when there's a reply target
          height: replyTarget ? 'auto' : `${FOOTER_HEIGHT}px`,
          minHeight: `${FOOTER_HEIGHT}px`,
          display: 'flex',
          alignItems: 'flex-start',
          boxSizing: 'border-box',
          paddingTop: '12px',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
          paddingBottom: '12px',
        }}
      >
        <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 box-border">
          {/* Reply Preview Section */}
          <div 
            className={`overflow-hidden transition-all duration-300 ease-out ${
              replyTarget ? 'max-h-20 opacity-100 mb-2' : 'max-h-0 opacity-0'
            }`}
          >
            {replyTarget && (
              <div className="flex items-start gap-3 px-4 py-3 bg-gradient-to-r from-gray-800/95 to-gray-800/80 backdrop-blur-xl rounded-xl border border-blue-500/30 shadow-lg shadow-blue-500/10 animate-fadeIn">
                {/* Reply Indicator Bar */}
                <div className="flex flex-col items-center gap-1 pt-0.5">
                  <div className="w-0.5 h-full min-h-[20px] bg-gradient-to-b from-blue-500 to-blue-400 rounded-full" />
                </div>
                
                {/* Reply Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  <svg 
                    className="w-4 h-4 text-blue-400" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" 
                    />
                  </svg>
                </div>
                
                {/* Reply Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-blue-400 font-medium mb-0.5">
                    Replying to
                  </p>
                  <p className="text-sm text-gray-300 truncate">
                    {replyTarget.text}
                  </p>
                </div>
                
                {/* Cancel Reply Button */}
                <button
                  onClick={() => setReplyTarget(null)}
                  className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all active:scale-90"
                >
                  <svg 
                    className="w-4 h-4" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      d="M6 18L18 6M6 6l12 12" 
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Input Field */}
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
          {validationError && (
            <p className="mt-2 text-sm text-red-400 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              {validationError}
            </p>
          )}
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
