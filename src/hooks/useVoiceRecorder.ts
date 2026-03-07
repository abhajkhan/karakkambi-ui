import { useState, useRef, useCallback } from 'react';

interface VoiceRecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlob: Blob | null;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
}

interface UseVoiceRecorderReturn {
  state: VoiceRecordingState;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  cancelRecording: () => void;
  uploadRecording: (blob?: Blob, replyTo?: string, finalDuration?: number) => Promise<string | null>;
  reset: () => void;
}

export const useVoiceRecorder = (onVoiceMessage?: (voiceUrl: string, duration: number, size: number, replyTo?: string, cloudinaryPublicId?: string) => void): UseVoiceRecorderReturn => {
  const [state, setState] = useState<VoiceRecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioBlob: null,
    isUploading: false,
    uploadProgress: 0,
    error: null
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0); // accumulated time before pauses
  const durationIntervalRef = useRef<number | null>(null);

  // Get supported MIME type
  const getSupportedMimeType = (): string => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/ogg'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm'; // fallback
  };

  // Start the duration timer
  const startDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    durationIntervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = pausedDurationRef.current + Math.floor((Date.now() - startTimeRef.current) / 1000);
        setState(prev => ({ ...prev, duration: elapsed }));
      }
    }, 1000);
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    mediaRecorderRef.current = null;
    startTimeRef.current = 0;
    pausedDurationRef.current = 0;
    chunksRef.current = [];
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });

      streamRef.current = stream;

      // Create MediaRecorder with low bitrate for efficiency
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: getSupportedMimeType(),
        audioBitsPerSecond: 32000 // 32kbps for optimal compression
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      startTimeRef.current = Date.now();
      pausedDurationRef.current = 0;

      // Set up data available handler
      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Set up event listeners for recording
      mediaRecorder.onstart = () => {
        setState(prev => ({ ...prev, isRecording: true, isPaused: false }));
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setState(prev => ({
          ...prev,
          error: 'Recording error occurred',
          isRecording: false,
          isPaused: false
        }));
      };

      // Start recording
      mediaRecorder.start();

      // Wait a bit for the recorder to actually start
      await new Promise(resolve => setTimeout(resolve, 100));

      if (mediaRecorder.state !== 'recording') {
        throw new Error(`Failed to start recording. State: ${mediaRecorder.state}`);
      }

      // Update duration every second
      startDurationTimer();

      setState({
        isRecording: true,
        isPaused: false,
        duration: 0,
        audioBlob: null,
        isUploading: false,
        uploadProgress: 0,
        error: null
      });

    } catch (error) {
      console.error('Error starting recording:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to access microphone',
        isRecording: false,
        isPaused: false
      }));
    }
  }, [startDurationTimer]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== 'recording') return;

    recorder.pause();

    // Accumulate elapsed time before pausing
    pausedDurationRef.current += Math.floor((Date.now() - startTimeRef.current) / 1000);
    startTimeRef.current = 0;

    // Stop the timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    setState(prev => ({ ...prev, isPaused: true }));
  }, []);

  // Resume recording
  const resumeRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== 'paused') return;

    recorder.resume();
    startTimeRef.current = Date.now();

    // Restart the timer
    startDurationTimer();

    setState(prev => ({ ...prev, isPaused: false }));
  }, [startDurationTimer]);

  // Stop recording – returns the blob directly
  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const recorder = mediaRecorderRef.current;

      if (!recorder || (recorder.state !== 'recording' && recorder.state !== 'paused')) {
        reject(new Error('No active recording'));
        return;
      }

      // Set up the stop handler to resolve the promise
      recorder.onstop = () => {
        if (chunksRef.current.length === 0) {
          reject(new Error('No audio data recorded'));
          return;
        }

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType
        });

        // Calculate final duration
        let finalDuration = pausedDurationRef.current;
        if (startTimeRef.current) {
          finalDuration += Math.floor((Date.now() - startTimeRef.current) / 1000);
        }

        setState(prev => ({
          ...prev,
          audioBlob: blob,
          isRecording: false,
          isPaused: false,
          duration: finalDuration
        }));

        // Stop duration timer and stream, but keep refs for upload
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        resolve(blob);
      };

      // Set up error handler
      recorder.onerror = (event) => {
        console.error('Recorder error during stop:', event);
        reject(new Error('Recording error during stop'));
        cleanup();
      };

      // Stop the recorder
      try {
        recorder.stop();
      } catch (error) {
        console.error('Error stopping recorder:', error);
        reject(error);
        cleanup();
      }
    });
  }, [cleanup]);

  // Cancel recording
  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && (recorder.state === 'recording' || recorder.state === 'paused')) {
      recorder.stop();
    }
    cleanup();
    setState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      audioBlob: null,
      isUploading: false,
      uploadProgress: 0,
      error: null
    });
  }, [cleanup]);

  // Upload recording to Cloudinary
  // Accepts an optional blob parameter to avoid stale closure issues.
  // finalDuration should be passed explicitly by the caller (captured before stopRecording
  // clears state) to avoid reading a stale state.duration from the closure.
  const uploadRecording = useCallback(async (blob?: Blob, replyTo?: string, finalDuration?: number): Promise<string | null> => {
    const audioBlob = blob || state.audioBlob;

    if (!audioBlob) {
      setState(prev => ({ ...prev, error: 'No audio to upload' }));
      return null;
    }

    try {
      setState(prev => ({ ...prev, isUploading: true, uploadProgress: 0, error: null }));

      // Generate unique public ID
      const publicId = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = Math.floor(Date.now() / 1000);

      // Get upload signature from backend — use env var, not hardcoded localhost
      const backendUrl = (import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000').replace(/\/$/, '');
      const signatureResponse = await fetch(`${backendUrl}/api/upload/signature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ publicId, timestamp })
      });

      if (!signatureResponse.ok) {
        throw new Error('Failed to get upload signature');
      }

      const signatureData = await signatureResponse.json();

      // Create FormData for Cloudinary upload
      const formData = new FormData();
      formData.append('file', audioBlob);
      formData.append('api_key', signatureData.api_key);
      formData.append('timestamp', signatureData.timestamp.toString());
      formData.append('signature', signatureData.signature);
      formData.append('public_id', signatureData.public_id);
      formData.append('folder', 'voice_messages');

      // Upload to Cloudinary
      const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${signatureData.cloud_name}/video/upload`, {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const uploadResult = await uploadResponse.json();
      const voiceUrl = uploadResult.secure_url;
      // public_id returned by Cloudinary — needed by backend for cleanup
      const cloudinaryPublicId: string = uploadResult.public_id;

      // Use explicitly passed finalDuration to avoid stale state closure.
      // Fall back to state.duration only if not provided.
      const duration = finalDuration !== undefined ? finalDuration : state.duration;
      const size = audioBlob.size;

      // Send voice message via callback
      if (onVoiceMessage) {
        onVoiceMessage(voiceUrl, duration, size, replyTo, cloudinaryPublicId);
      }

      setState(prev => ({
        ...prev,
        isUploading: false,
        uploadProgress: 100,
        audioBlob: null,
        duration: 0
      }));

      return voiceUrl;

    } catch (error) {
      console.error('Upload error:', error);
      setState(prev => ({
        ...prev,
        isUploading: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      }));
      return null;
    }
  }, [state.audioBlob, state.duration, onVoiceMessage]);

  // Reset state
  const reset = useCallback(() => {
    cleanup();
    setState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      audioBlob: null,
      isUploading: false,
      uploadProgress: 0,
      error: null
    });
  }, [cleanup]);

  return {
    state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    uploadRecording,
    reset
  };
};
