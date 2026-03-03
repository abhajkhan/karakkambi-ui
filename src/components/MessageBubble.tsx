import { useState, useRef, useEffect } from 'react';
import type { Message } from '../types';
import { formatTimeOnly } from '../utils/timeFormatter';
import { useSwipeable } from "react-swipeable";
import { Play, Pause, Volume2 } from 'lucide-react';
import { audioManager } from '../utils/audioManager';

interface Props {
  message: Message;
  onReply: (message: Message) => void;
  repliedMessage?: Message | null;
}

export const MessageBubble = ({ message, onReply, repliedMessage }: Props) => {
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Handle audio playback
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !message.voiceUrl) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audioManager.release(audio);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audioManager.release(audio);
    };
  }, [message.voiceUrl]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      audioManager.release(audio);
    } else {
      // Stop any other playing audio first
      audioManager.requestPlay(audio, () => {
        // Called if this audio is pre-empted by another
        audio.pause();
        audio.currentTime = 0;
        setIsPlaying(false);
      });
      audio.play();
      setIsPlaying(true);
    }
  };

  const formatAudioTime = (time: number): string => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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

            {/* Message Content: text or voice */}
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

              {/* Voice Message Player */}
              {message.voiceUrl ? (
                <div className="flex items-center gap-3 bg-gray-700/50 rounded-lg p-3">
                  {/* Hidden audio element */}
                  <audio
                    ref={audioRef}
                    src={message.voiceUrl}
                    preload="metadata"
                  />

                  {/* Play/Pause Button */}
                  <button
                    onClick={togglePlayPause}
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>

                  {/* Voice Icon and Duration */}
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-300">
                      {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex-1 h-1 bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-100"
                      style={{
                        width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%'
                      }}
                    />
                  </div>
                </div>
              ) : (
                /* Text Message */
                message.text
              )}
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
