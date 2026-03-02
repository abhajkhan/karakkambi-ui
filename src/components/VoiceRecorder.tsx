import React, { useEffect } from 'react';
import { Mic, MicOff, X } from 'lucide-react';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';

interface Props {
  onVoiceMessage: (voiceUrl: string, duration: number, size: number, replyTo?: string) => void;
  replyTo?: string | null;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<Props> = ({ onVoiceMessage, replyTo, onCancel }) => {
  const { state, startRecording, stopRecording, cancelRecording, uploadRecording } = useVoiceRecorder(onVoiceMessage);

  // Handle mouse/touch events for press-and-hold
  const handleStart = async () => {
    if (state.isRecording) return;
    
    await startRecording();
  };

  const handleEnd = async () => {
    if (!state.isRecording) return;
    
    try {
      await stopRecording();
      
      // Upload the recording
      await uploadRecording(replyTo || undefined);
      
    } catch (error) {
      console.error('Error stopping recording:', error);
      cancelRecording();
    }
  };

  // Handle cancel
  const handleCancel = () => {
    cancelRecording();
    onCancel();
  };

  // Format duration display
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.isRecording) {
        cancelRecording();
      }
    };
  }, [state.isRecording, cancelRecording]);

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-gray-800/95 to-gray-800/80 backdrop-blur-xl rounded-xl border border-red-500/30 shadow-lg shadow-red-500/10 animate-fadeIn">
      
      {/* Recording Status */}
      <div className="flex items-center gap-2">
        {state.isRecording && (
          <>
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 text-sm font-medium">Recording</span>
            <span className="text-white text-sm font-mono">{formatDuration(state.duration)}</span>
          </>
        )}
        
        {state.isUploading && (
          <>
            <div className="w-3 h-3 rounded-full bg-blue-500 animate-spin" />
            <span className="text-blue-400 text-sm font-medium">Uploading...</span>
            <span className="text-white text-sm">{state.uploadProgress}%</span>
          </>
        )}
      </div>

      {/* Microphone Button */}
      <button
        onMouseDown={handleStart}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchEnd={handleEnd}
        disabled={state.isUploading}
        className={`
          relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200
          ${state.isRecording 
            ? 'bg-red-500 hover:bg-red-600 scale-110 shadow-lg shadow-red-500/30' 
            : 'bg-gray-600 hover:bg-gray-500'
          }
          ${state.isUploading ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
        `}
      >
        {state.isRecording ? (
          <MicOff className="w-5 h-5 text-white" />
        ) : (
          <Mic className="w-5 h-5 text-white" />
        )}
        
        {/* Ripple effect when recording */}
        {state.isRecording && (
          <div className="absolute inset-0 rounded-full bg-red-500 animate-ping" />
        )}
      </button>

      {/* Instructions */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400">
          {state.isRecording ? 'Release to send' : 'Press and hold to record'}
        </p>
        {state.error && (
          <p className="text-xs text-red-400 mt-1">{state.error}</p>
        )}
      </div>

      {/* Cancel Button */}
      <button
        onClick={handleCancel}
        disabled={state.isUploading}
        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Visual Feedback */}
      {state.isRecording && (
        <div className="absolute inset-0 rounded-xl border-2 border-red-500/50 animate-pulse" />
      )}
    </div>
  );
};
