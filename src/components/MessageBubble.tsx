import type { Message } from '../types';

interface Props {
  message: Message;
}

export const MessageBubble = ({ message }: Props) => {

  return (
    <div className={`flex justify-start mb-2 animate-fadeIn`}>
      <div className={`max-w-[75%] sm:max-w-md px-3 py-2 rounded-2xl shadow-lg bg-gray-800/90 backdrop-blur-xl text-gray-100 border border-gray-700/50`}>
        <div className="flex flex-row items-end gap-2">
          <p className="text-[14px] leading-relaxed break-words">{message.text}</p>
          <p className="text-[10px] mt-1 text-gray-500 text-right self-end">
        {message.createdAt}
          </p>
        </div>
      </div>
    </div>
  );
};
