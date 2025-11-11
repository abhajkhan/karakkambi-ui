import type { Message } from '../types';


interface Props {
  message: Message;
  isOwn: boolean;
}

export const MessageBubble = ({ message, isOwn }: Props) => {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs px-4 py-2 rounded-lg ${
        isOwn 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-700 text-gray-100'
      }`}>
        {!isOwn && (
          <p className="text-xs text-gray-300 mb-1">{message.username}</p>
        )}
        <p className="break-words">{message.text}</p>
        
      </div>
    </div>
  );
};