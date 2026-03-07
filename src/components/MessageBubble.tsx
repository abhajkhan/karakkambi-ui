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
  scrollToMessage?: (messageId: string) => void;
}

export const MessageBubble = ({ message, onReply, repliedMessage, scrollToMessage }: Props) => {
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(message.voiceDuration ?? 0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Flash highlight when this message is scrolled to
  const triggerHighlight = () => {
    const el = bubbleRef.current;
    if (!el) return;
    el.classList.remove('msg-highlight');
    // Force reflow so re-adding the class restarts the animation
    void el.offsetHeight;
    el.classList.add('msg-highlight');
    const timer = setTimeout(() => el.classList.remove('msg-highlight'), 1400);
    return () => clearTimeout(timer);
  };

  // Expose triggerHighlight via a data attribute on the DOM element so the
  // parent can call it by looking up the element by id
  // (avoids prop-drilling a ref callback)
  useEffect(() => {
    const el = document.getElementById(`msg-${message.id}`);
    if (el) {
      (el as any).__triggerHighlight = triggerHighlight;
    }
  }, [message.id]);

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

  const togglePlayPause = async () => {
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
      try {
        setIsPlaying(true);
        await audio.play();
      } catch (err) {
        // Browser rejected playback (autoplay policy, element unmounted, etc.)
        console.warn('Audio playback failed:', err);
        setIsPlaying(false);
        audioManager.release(audio);
      }
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
    <div {...handlers} className="relative group" id={`msg-${message.id}`} ref={bubbleRef}>
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
                <button
                  onClick={() => scrollToMessage?.(repliedMessage.id)}
                  className="w-full text-left text-xs text-gray-400 border-l-2 border-blue-500 pl-2 mb-1 flex items-center gap-1.5 hover:text-gray-200 hover:border-blue-400 transition-colors cursor-pointer rounded-sm"
                  title="Jump to message"
                >
                  {repliedMessage.voiceUrl ? (
                    <>
                      <svg className="w-3 h-3 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      <span className="italic">Voice message</span>
                    </>
                  ) : (
                    <span className="truncate">{repliedMessage.text}</span>
                  )}
                </button>
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
