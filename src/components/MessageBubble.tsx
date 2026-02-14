import type { Message } from '../types';
import { formatTimeOnly } from '../utils/timeFormatter';
import { useSwipeable } from "react-swipeable";

interface Props {
  message: Message;
  onReply: (message: Message) => void;
  repliedMessage?: Message | null;
}

export const MessageBubble = ({ message, onReply, repliedMessage }: Props) => {

  const handlers = useSwipeable({
    onSwipedRight: () => onReply(message),
    delta: 50,
    preventScrollOnSwipe: true,
    trackTouch: true
  });

  return (
    <div {...handlers} className="relative">
      <div className="flex justify-start mb-2 animate-fadeIn">
        <div className="max-w-[85%] sm:max-w-md px-3 py-1.5 rounded-lg shadow-lg bg-gray-800/90 backdrop-blur-xl text-gray-100 border border-gray-700/50">

          {/* Flex container that wraps. 
          Items-end keeps the time aligned with the bottom of the last line.
      */}
          <div className="flex flex-wrap items-end justify-end gap-x-4">

            {/* Message Text: flex-grow ensures it takes up space, 
            but allows the timestamp to sit next to it. */}
            <div className="text-[14px] leading-relaxed break-words flex-grow">
              {repliedMessage && (
                <div className="text-xs text-gray-400 border-l-2 border-blue-500 pl-2 mb-1">
                  {repliedMessage.text}
                </div>
              )}
              {message.replyTo && !repliedMessage && (
                <div className="text-xs text-gray-400 border-l-2 border-blue-500 pl-2 mb-1">
                  (Replied to a message that may have been deleted)
                </div>
              )}
              {message.text}
            </div>

            {/* Timestamp: shows only time (e.g., "3:45 PM") */}
            <div className="mb-[-2px] ml-auto">
              <p className="text-[10px] text-gray-500 whitespace-nowrap">
                {formatTimeOnly(message.createdAt)}
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
