import React, { useEffect, useState, useCallback } from 'react';
import { X, Send, Pause, Play } from 'lucide-react';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { audioManager } from '../utils/audioManager';

interface Props {
  onVoiceMessage: (voiceUrl: string, duration: number, size: number, replyTo?: string, cloudinaryPublicId?: string) => void;
  replyTo?: string | null;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<Props> = ({ onVoiceMessage, replyTo, onCancel }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const { state, startRecording, stopRecording, pauseRecording, resumeRecording, cancelRecording, uploadRecording } = useVoiceRecorder(onVoiceMessage);

  // Auto-start recording when the component mounts
  useEffect(() => {
    if (!hasStarted) {
      setHasStarted(true);
      // Stop any playing audio before starting the mic
      audioManager.stopAll();
      startRecording().catch((error) => {
        console.error('Error auto-starting recording:', error);
      });
    }
  }, [hasStarted, startRecording]);

  // Handle pause / resume toggle
  const handlePauseResume = useCallback(() => {
    if (state.isPaused) {
      resumeRecording();
    } else {
      pauseRecording();
    }
  }, [state.isPaused, pauseRecording, resumeRecording]);

  // Handle send – stop recording, then upload & send
  const handleSend = useCallback(async () => {
    if (isProcessing) return;
    if (!state.isRecording && !state.isPaused) return;

    setIsProcessing(true);
    // Snapshot duration NOW before stopRecording resets state asynchronously.
    // This is the fix for the stale-closure bug where state.duration read
    // inside uploadRecording would be 0 (already cleared).
    const durationSnapshot = state.duration;
    try {
      const blob = await stopRecording();
      // Pass blob and durationSnapshot directly to avoid stale closure
      await uploadRecording(blob, replyTo || undefined, durationSnapshot);
      onCancel(); // Close the recorder after sending
    } catch (error) {
      console.error('Error sending recording:', error);
      cancelRecording();
    } finally {
      setIsProcessing(false);
    }
  }, [state.isRecording, state.isPaused, state.duration, isProcessing, stopRecording, uploadRecording, replyTo, cancelRecording, onCancel]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setIsProcessing(false);
    cancelRecording();
    onCancel();
  }, [cancelRecording, onCancel]);

  // Format duration display
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Keep a ref to cancelRecording so unmount cleanup always uses the latest version
  const cancelRef = React.useRef(cancelRecording);
  cancelRef.current = cancelRecording;

  // Cleanup only on unmount
  useEffect(() => {
    return () => {
      cancelRef.current();
    };
  }, []);

  return (
    <div className="relative flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-gray-800/95 to-gray-800/80 backdrop-blur-xl rounded-xl border border-red-500/30 shadow-lg shadow-red-500/10 animate-fadeIn">

      {/* Recording Status */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {(state.isRecording || state.isPaused) && (
          <>
            <div className={`w-3 h-3 rounded-full ${state.isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`} />
            <span className={`text-sm font-medium ${state.isPaused ? 'text-yellow-400' : 'text-red-400'}`}>
              {state.isPaused ? 'Paused' : 'Recording'}
            </span>
            <span className="text-white text-sm font-mono">{formatDuration(state.duration)}</span>
          </>
        )}

        {state.isUploading && (
          <>
            <div className="w-3 h-3 rounded-full bg-blue-500 animate-spin" />
            <span className="text-blue-400 text-sm font-medium">Sending...</span>
          </>
        )}

        {!state.isRecording && !state.isPaused && !state.isUploading && (
          <>
            <div className="w-3 h-3 rounded-full bg-gray-500 animate-pulse" />
            <span className="text-gray-400 text-sm font-medium">Starting...</span>
          </>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1 min-w-0">
        {state.error && (
          <p className="text-xs text-red-400 truncate">{state.error}</p>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Pause / Resume Button */}
        {(state.isRecording || state.isPaused) && (
          <button
            onClick={handlePauseResume}
            disabled={isProcessing}
            className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${state.isPaused
              ? 'bg-yellow-500 hover:bg-yellow-400 shadow-lg shadow-yellow-500/20'
              : 'bg-gray-600 hover:bg-gray-500'
              }`}
            title={state.isPaused ? 'Resume' : 'Pause'}
          >
            {state.isPaused ? (
              <Play className="w-4 h-4 text-white" />
            ) : (
              <Pause className="w-4 h-4 text-white" />
            )}
          </button>
        )}

        {/* Send Button */}
        {(state.isRecording || state.isPaused) && (
          <button
            onClick={handleSend}
            disabled={isProcessing || state.isUploading}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 shadow-lg shadow-blue-500/20 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Send"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        )}

        {/* Cancel Button */}
        <button
          onClick={handleCancel}
          disabled={state.isUploading || isProcessing}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Visual Feedback - pulse border when recording */}
      {state.isRecording && (
        <div className="absolute inset-0 rounded-xl border-2 border-red-500/50 animate-pulse pointer-events-none" />
      )}
    </div>
  );
};
