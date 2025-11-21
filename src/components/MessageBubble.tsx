import type { Message } from '../types';

interface Props {
  message: Message;
  isOwn: boolean;
}

export const MessageBubble = ({ message, isOwn }: Props) => {

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3 animate-fadeIn`}>
      <div className={`max-w-[75%] sm:max-w-md px-4 py-3 rounded-2xl shadow-lg ${isOwn
        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-md'
        : 'bg-gray-800/90 backdrop-blur-xl text-gray-100 border border-gray-700/50 rounded-bl-md'
        }`}>

        {/* {!isOwn && (
          <p className="text-xs font-medium text-gray-400 mb-1">{message.username}</p>
        )} */}

        <p className="text-[15px] leading-relaxed break-words">{message.text}</p>
        <p className={`text-[10px] mt-1 ${isOwn ? 'text-blue-200' : 'text-gray-500'}`}>
          {message.createdAt}
        </p>
      </div>
    </div>
  );
};