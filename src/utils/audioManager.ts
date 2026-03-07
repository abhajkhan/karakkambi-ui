/**
 * Global audio manager – ensures only one audio plays at a time.
 *
 * Usage:
 *   import { audioManager } from '../utils/audioManager';
 *
 *   // Before playing:
 *   audioManager.requestPlay(myAudioElement);
 *
 *   // To stop everything (e.g. when recording starts):
 *   audioManager.stopAll();
 */

let currentAudio: HTMLAudioElement | null = null;
let onStopCallback: (() => void) | null = null;

export const audioManager = {
    /**
     * Request exclusive playback for this audio element.
     * Stops whatever was playing before.
     * An optional callback is invoked if this audio is later pre-empted.
     */
    requestPlay(audio: HTMLAudioElement, onPreempted?: () => void) {
        // Stop the previous audio if it's a different element
        if (currentAudio && currentAudio !== audio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            if (onStopCallback) onStopCallback();
        }

        currentAudio = audio;
        onStopCallback = onPreempted ?? null;
    },

    /**
     * Notify the manager that this audio has ended or was paused by the user.
     */
    release(audio: HTMLAudioElement) {
        if (currentAudio === audio) {
            currentAudio = null;
            onStopCallback = null;
        }
    },

    /**
     * Stop all audio playback (e.g. when starting a voice recording).
     */
    stopAll() {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            if (onStopCallback) onStopCallback();
            currentAudio = null;
            onStopCallback = null;
        }
    }
};
