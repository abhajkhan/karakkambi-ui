import { useState } from 'react';
import type { Message } from '../types';
import { formatTimeOnly } from '../utils/timeFormatter';
import { useSwipeable } from "react-swipeable";

interface Props {
  message: Message;
  onReply: (message: Message) => void;
  repliedMessage?: Message | null;
}

export const MessageBubble = ({ message, onReply, repliedMessage }: Props) => {
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const handlers = useSwipeable({
    onSwipeStart: () => setIsSwiping(true),
    onSwiped: () => {
      setIsSwiping(false);
      setSwipeProgress(0);
    },
    onSwiping: (event) => {
      // Only track right swipes (positive delta)
      if (event.deltaX > 0) {
        // Calculate progress (0 to 1) with max 100px swipe distance
        const progress = Math.min(event.deltaX / 100, 1);
        setSwipeProgress(progress);
      }
    },
    onSwipedRight: () => onReply(message),
    delta: 30, // Lower threshold for more responsive feel
    preventScrollOnSwipe: true,
    trackTouch: true,
    trackMouse: true, // Enable for desktop touchpad
  });

  // Calculate transform based on swipe progress
  const swipeTransform = isSwiping ? `translateX(${swipeProgress * 80}px)` : 'translateX(0)';
  const replyOpacity = isSwiping ? Math.min(swipeProgress * 1.5, 1) : 0;
  const bubbleOpacity = isSwiping ? Math.max(1 - swipeProgress * 0.3, 0.7) : 1;

  return (
    <div {...handlers} className="relative group">
      {/* Reply indicator that appears behind the bubble */}
      <div 
        className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-2 transition-opacity duration-150"
        style={{ 
          opacity: replyOpacity,
          pointerEvents: 'none'
        }}
      >
        <div className="px-3 py-1.5 rounded-full bg-blue-600 text-white text-xs font-medium shadow-lg">
          Reply
        </div>
      </div>

      <div 
        className="flex justify-start mb-2 animate-fadeIn"
        style={{
          transform: swipeTransform,
          transition: isSwiping ? 'none' : 'transform 200ms ease-out',
        }}
      >
        <div 
          className="max-w-[85%] sm:max-w-md px-3 py-1.5 rounded-lg shadow-lg bg-gray-800/90 backdrop-blur-xl text-gray-100 border border-gray-700/50"
          style={{ opacity: bubbleOpacity }}
        >

          {/* Flex container that wraps. 
          Items-end keeps the time aligned with the bottom of the last line.
      */}
          <div className="flex flex-wrap items-end gap-x-4">

            {/* Message Text: flex-grow ensures it takes up space, 
            but allows the timestamp to sit next to it. */}
            <div className="text-[14px] leading-relaxed break-words flex-grow min-w-0">
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
