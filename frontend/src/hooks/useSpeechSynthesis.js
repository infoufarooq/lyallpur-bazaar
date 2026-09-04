import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom React hook for browser text-to-speech synthesis with backend fallback.
 * Uses browser window.speechSynthesis when available, with dynamic voice parameters,
 * language mapping (ur-PK / en-US), persistent mute state saved in localStorage,
 * and automatic fallback to backend /api/assistant/speak endpoint.
 *
 * @returns {Object} { isSpeaking, isMuted, toggleMute, speak, stopSpeaking }
 */
export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    try {
      return localStorage.getItem('lyallpur_assistant_muted') === 'true';
    } catch {
      return false;
    }
  });

  const audioRef = useRef(null);
  const utteranceRef = useRef(null);
  const isMutedRef = useRef(isMuted);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const stopSpeaking = useCallback(() => {
    if (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      window.speechSynthesis
    ) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        // Ignore cancellation errors
      }
    }

    if (utteranceRef.current) {
      utteranceRef.current.onstart = null;
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
      utteranceRef.current = null;
    }

    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch (e) {
        // Ignore audio pause errors
      }
      audioRef.current = null;
    }

    setIsSpeaking(false);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('lyallpur_assistant_muted', String(next));
      } catch (e) {
        console.warn('Failed to save mute preference to localStorage:', e);
      }
      if (next) {
        stopSpeaking();
      }
      return next;
    });
  }, [stopSpeaking]);

  const playServerAudio = useCallback((textToSpeak, langCode) => {
    const baseUrl = import.meta.env?.VITE_API_URL || '/api';
    const url = `${baseUrl}/assistant/speak`;
    const normalizedLang =
      langCode === 'ur' || langCode === 'ur-PK' ? 'ur' : 'en';

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: textToSpeak, language: normalizedLang }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Audio generation failed with status ${res.status}`);
        }
        return res.blob();
      })
      .then((blob) => {
        if (isMutedRef.current) return;

        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        const cleanup = () => {
          setIsSpeaking(false);
          audioRef.current = null;
          URL.revokeObjectURL(audioUrl);
        };

        audio.onplay = () => setIsSpeaking(true);
        audio.onended = cleanup;
        audio.onerror = cleanup;

        audio.play().catch((err) => {
          console.warn('Audio playback failed:', err);
          cleanup();
        });
      })
      .catch((err) => {
        console.warn('Fallback speech fetch failed:', err);
        setIsSpeaking(false);
      });
  }, []);

  const speak = useCallback(
    (text, language = 'en') => {
      if (isMutedRef.current || !text || !text.trim()) return;

      stopSpeaking();

      const isUrdu = language === 'ur' || language === 'ur-PK';
      const targetLang = isUrdu ? 'ur-PK' : 'en-US';

      // 1. Try Browser window.speechSynthesis
      if (
        typeof window !== 'undefined' &&
        'speechSynthesis' in window &&
        window.speechSynthesis &&
        typeof window.SpeechSynthesisUtterance !== 'undefined'
      ) {
        try {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = targetLang;
          utterance.rate = 1.0;
          utterance.pitch = 1.0;

          utterance.onstart = () => {
            setIsSpeaking(true);
          };

          utterance.onend = () => {
            setIsSpeaking(false);
            utteranceRef.current = null;
          };

          utterance.onerror = (event) => {
            utteranceRef.current = null;
            // Suppress fallback if explicitly stopped / canceled
            if (event.error === 'interrupted' || event.error === 'canceled') {
              setIsSpeaking(false);
              return;
            }
            console.warn(
              'Browser speech synthesis error, falling back to server TTS:',
              event
            );
            playServerAudio(text, language);
          };

          utteranceRef.current = utterance;

          // Resume if synthesis got stuck in paused state (browser quirk workaround)
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }

          window.speechSynthesis.speak(utterance);
          return;
        } catch (err) {
          console.warn(
            'SpeechSynthesis speak failed, attempting server fallback:',
            err
          );
        }
      }

      // 2. Fallback to server /api/assistant/speak endpoint
      playServerAudio(text, language);
    },
    [stopSpeaking, playServerAudio]
  );

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, [stopSpeaking]);

  return {
    isSpeaking,
    isMuted,
    toggleMute,
    speak,
    stopSpeaking,
  };
}

export default useSpeechSynthesis;
