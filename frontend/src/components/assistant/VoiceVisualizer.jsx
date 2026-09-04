import React from 'react';

/**
 * Animated soundbars visualizer active during speech listening or synthesis.
 *
 * @param {Object} props
 * @param {boolean} props.isListening - True when microphone recognition is actively listening.
 * @param {boolean} props.isSpeaking - True when assistant speech synthesis is actively playing.
 * @param {string} [props.language='en'] - 'en' or 'ur' for localized status text.
 */
export default function VoiceVisualizer({ isListening, isSpeaking, language = 'en' }) {
  if (!isListening && !isSpeaking) return null;

  const isUrdu = language === 'ur' || language === 'ur-PK';
  const statusLabel = isListening
    ? isUrdu
      ? 'آپ کی آواز سن رہا ہے...'
      : 'Listening to your voice...'
    : isUrdu
    ? 'لائل پور اسسٹنٹ بول رہا ہے...'
    : 'Lyallpur AI Speaking...';

  const barHeights = [40, 75, 100, 60, 90, 50, 80];

  return (
    <div className="flex items-center justify-between py-2 px-3.5 bg-emerald-50 rounded-xl border border-emerald-100 mx-3 mt-2 shadow-xs transition-all">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-xs font-semibold text-emerald-800 animate-pulse">
          {statusLabel}
        </span>
      </div>
      <div className="flex items-end gap-1 h-5" aria-hidden="true">
        {barHeights.map((h, i) => (
          <span
            key={i}
            className="w-1 bg-emerald-500 rounded-full animate-bounce"
            style={{
              height: `${h}%`,
              animationDelay: `${i * 0.1}s`,
              animationDuration: '0.6s',
            }}
          />
        ))}
      </div>
    </div>
  );
}
