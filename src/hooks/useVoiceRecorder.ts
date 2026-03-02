import { useState, useRef, useCallback } from 'react';

interface VoiceRecordingState {
  isRecording: boolean;
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
  cancelRecording: () => void;
  uploadRecording: (replyTo?: string) => Promise<string | null>;
  reset: () => void;
}

export const useVoiceRecorder = (onVoiceMessage?: (voiceUrl: string, duration: number, size: number, replyTo?: string) => void): UseVoiceRecorderReturn => {
  const [state, setState] = useState<VoiceRecordingState>({
    isRecording: false,
    duration: 0,
    audioBlob: null,
    isUploading: false,
    uploadProgress: 0,
    error: null
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<number | null>(null);

  // Update duration while recording
  const updateDuration = useCallback(() => {
    if (startTimeRef.current) {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setState(prev => ({ ...prev, duration: elapsed }));
    }
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
      startTimeRef.current = Date.now();

      // Start recording
      mediaRecorder.start();

      // Update duration every second
      durationIntervalRef.current = setInterval(updateDuration, 1000);

      setState({
        isRecording: true,
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
        error: error instanceof Error ? error.message : 'Failed to access microphone'
      }));
    }
  }, [updateDuration]);

  // Stop recording
  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current) {
        reject(new Error('No active recording'));
        return;
      }

      const chunks: BlobPart[] = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: mediaRecorderRef.current!.mimeType });
        setState(prev => ({ ...prev, audioBlob: blob }));
        resolve(blob);
        cleanup();
      };

      // Stop the recorder
      mediaRecorderRef.current.stop();
    });
  }, []);

  // Cancel recording
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
    }
    cleanup();
    setState({
      isRecording: false,
      duration: 0,
      audioBlob: null,
      isUploading: false,
      uploadProgress: 0,
      error: null
    });
  }, [state.isRecording]);

  // Upload recording to Cloudinary
  const uploadRecording = useCallback(async (replyTo?: string): Promise<string | null> => {
    if (!state.audioBlob) {
      setState(prev => ({ ...prev, error: 'No audio to upload' }));
      return null;
    }

    try {
      setState(prev => ({ ...prev, isUploading: true, uploadProgress: 0, error: null }));

      // Generate unique public ID
      const publicId = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = Math.floor(Date.now() / 1000);

      // Get upload signature from backend
      const signatureResponse = await fetch('/api/upload/signature', {
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
      formData.append('file', state.audioBlob);
      formData.append('api_key', signatureData.api_key);
      formData.append('timestamp', signatureData.timestamp.toString());
      formData.append('signature', signatureData.signature);
      formData.append('public_id', signatureData.public_id);
      formData.append('resource_type', 'video');
      formData.append('format', 'auto');
      formData.append('quality', 'low');
      formData.append('bit_rate', '32000');
      formData.append('audio_codec', 'opus');
      formData.append('auto_delete_days', '7');
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

      // Calculate duration and size
      const duration = state.duration;
      const size = state.audioBlob.size;

      // Send voice message via callback
      if (onVoiceMessage) {
        onVoiceMessage(voiceUrl, duration, size, replyTo);
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
      duration: 0,
      audioBlob: null,
      isUploading: false,
      uploadProgress: 0,
      error: null
    });
  }, []);

  // Cleanup function
  const cleanup = () => {
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
  };

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

  return {
    state,
    startRecording,
    stopRecording,
    cancelRecording,
    uploadRecording,
    reset
  };
};
