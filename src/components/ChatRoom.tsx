import { useState, useRef, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { MessageBubble } from './MessageBubble';

const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_URL;

export const ChatRoom = () => {
  const [inputMessage, setInputMessage] = useState('');
  const { messages, sendMessage, onlineUsers, connected } = useSocket(SOCKET_SERVER_URL);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage);
    setInputMessage('');
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      {/* Header */}
      <header className="bg-gray-800 p-4 rounded-t-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">🔒 Karakkambi</h1>
            <p className="text-gray-400 text-sm">Users online: {onlineUsers}</p>
          </div>
          <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} 
               title={connected ? 'Connected' : 'Disconnected'} />
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-900 p-4 space-y-2">
        {!connected && (
          <div className="text-center text-yellow-400 p-4">
            Connecting to server...
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble 
            key={msg.id} 
            message={msg} 
            isOwn={msg.username.includes('Anonymous')} // Simple check
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="bg-gray-800 p-4 rounded-b-lg shadow-lg">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your anonymous message..."
            disabled={!connected}
            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!connected || !inputMessage.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};