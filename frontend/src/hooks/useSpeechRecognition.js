import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom React hook for browser-based speech-to-text recognition.
 * Supports Web Speech API (SpeechRecognition / webkitSpeechRecognition),
 * real-time interim and final transcription, 7-second silence auto-timeout,
 * dynamic language switching (ur-PK vs en-US), and safe lifecycle cleanup.
 *
 * @param {Object} [options={}]
 * @param {Function} [options.onResult] - Callback invoked with final transcription text.
 * @param {string} [options.language='en-US'] - Recognition language ('en', 'en-US', 'ur', 'ur-PK').
 * @returns {Object} { isListening, transcript, interimTranscript, startListening, stopListening, isSupported, error }
 */
export function useSpeechRecognition({ onResult, language = 'en-US' } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const onResultRef = useRef(onResult);

  // Keep onResult callback updated without triggering effect re-execution
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const isSupported =
    typeof window !== 'undefined' &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  const normalizedLang =
    language === 'ur' || language === 'ur-PK' ? 'ur-PK' : 'en-US';

  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionClass();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = normalizedLang;

    const resetSilenceTimer = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        try {
          recognition.stop();
        } catch (e) {
          // Ignore state exceptions if already stopped
        }
      }, 7000);
    };

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      setTranscript('');
      setInterimTranscript('');
      resetSilenceTimer();
    };

    recognition.onresult = (event) => {
      resetSilenceTimer();
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      setInterimTranscript(interim);
      if (final) {
        setTranscript(final);
        if (onResultRef.current) {
          onResultRef.current(final);
        }
      }
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      clearTimeout(timerRef.current);
      if (event.error !== 'no-speech') {
        setError(event.error || 'Speech recognition encountered an error');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      clearTimeout(timerRef.current);
    };

    recognitionRef.current = recognition;

    return () => {
      clearTimeout(timerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore teardown exceptions
        }
      }
    };
  }, [isSupported, normalizedLang]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.lang = normalizedLang;
      setError(null);
      recognitionRef.current.start();
    } catch (err) {
      // Chrome throws InvalidStateError if start() is called when already started
      console.warn('SpeechRecognition start warning:', err);
    }
  }, [normalizedLang]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (err) {
      console.warn('SpeechRecognition stop warning:', err);
    }
    clearTimeout(timerRef.current);
    setIsListening(false);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    isSupported,
    error,
  };
}

export default useSpeechRecognition;
