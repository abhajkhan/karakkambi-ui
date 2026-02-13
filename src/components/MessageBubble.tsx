import type { Message } from '../types';

interface Props {
  message: Message;
}

export const MessageBubble = ({ message }: Props) => {

  return (
  <div className="flex justify-start mb-2 animate-fadeIn">
    <div className="max-w-[85%] sm:max-w-md px-3 py-1.5 rounded-lg shadow-lg bg-gray-800/90 backdrop-blur-xl text-gray-100 border border-gray-700/50">
      
      {/* Flex container that wraps. 
          Items-end keeps the time aligned with the bottom of the last line.
      */}
      <div className="flex flex-wrap items-end justify-end gap-x-4">
        
        {/* Message Text: flex-grow ensures it takes up space, 
            but allows the timestamp to sit next to it. */}
        <p className="text-[14px] leading-relaxed break-words flex-grow">
          {message.text}
        </p>

        {/* Timestamp: 
            - mt-1 adds a tiny bit of vertical space if it wraps to a new line.
            - ml-auto ensures it stays right-aligned. 
        */}
        <div className="mb-[-2px] ml-auto">
          <p className="text-[10px] text-gray-500 whitespace-nowrap">
            {message.createdAt}
          </p>
        </div>

      </div>
    </div>
  </div>
);
};
