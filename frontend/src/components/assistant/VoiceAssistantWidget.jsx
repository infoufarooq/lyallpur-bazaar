import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Sparkles,
  Bot,
  ChevronDown
} from 'lucide-react';
import client from '../../api/client';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../../hooks/useSpeechSynthesis';
import VoiceVisualizer from './VoiceVisualizer';
import AssistantProductCard from './AssistantProductCard';

/**
 * Helper to render simple markdown (bold text, newlines, bullet points).
 */
function renderFormattedMessage(content) {
  if (!content) return null;
  const lines = content.split('\n');
  return lines.map((line, lineIdx) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <React.Fragment key={lineIdx}>
        {parts.map((part, partIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={partIdx} className="font-bold">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        })}
        {lineIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

/**
 * Customer-facing floating voice shopping assistant widget for Lyallpur Bazaar.
 * Supports spoken/typed queries in Urdu and English, displays real-time animated
 * waveform, interactive product carousel with direct cart addition, and quick action pills.
 */
export default function VoiceAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState('en'); // 'en' or 'ur'
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hello! I am your Lyallpur Bazaar assistant. Ask me about fresh groceries, lawn fabrics, or delivery across Faisalabad!',
      products: [],
      suggested_actions: ['Show Lawn Suits', 'Grocery Staples', 'Delivery Rates']
    }
  ]);

  const messagesEndRef = useRef(null);
  const messagesRef = useRef(messages);
  const languageRef = useRef(language);
  const isLoadingRef = useRef(isLoading);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  const { isSpeaking, isMuted, toggleMute, speak, stopSpeaking } = useSpeechSynthesis();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const sendMessage = useCallback(
    async (textToSend) => {
      const query = typeof textToSend === 'string' ? textToSend : inputText;
      if (!query || !query.trim() || isLoadingRef.current) return;

      setInputText('');
      stopSpeaking();

      const currentLang = languageRef.current;
      const userMsg = { role: 'user', content: query.trim() };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const historyPayload = messagesRef.current.slice(-4).map((m) => ({
          role: m.role,
          content: m.content
        }));

        const res = await client.post('/assistant/chat', {
          message: query.trim(),
          language: currentLang,
          history: historyPayload
        });

        const assistantMsg = {
          role: 'assistant',
          content: res.data.reply,
          products: res.data.products || [],
          suggested_actions: res.data.suggested_actions || []
        };

        setMessages((prev) => [...prev, assistantMsg]);
        speak(res.data.reply, currentLang);
      } catch (err) {
        console.error('Assistant error:', err);
        const errorMsg = {
          role: 'assistant',
          content:
            currentLang === 'ur'
              ? 'معذرت، رابطہ نہیں ہو سکا۔ براہ کرم دوبارہ کوشش کریں۔'
              : 'Sorry, I had trouble connecting. Please try again in a moment.',
          products: [],
          suggested_actions:
            currentLang === 'ur'
              ? ['دوبارہ کوشش کریں', 'لان کے سوٹ دکھائیں', 'روزمرہ راشن']
              : ['Try again', 'Show Lawn Suits', 'Grocery Staples']
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [inputText, speak, stopSpeaking]
  );

  const handleSpeechResult = useCallback(
    (spokenText) => {
      if (spokenText && spokenText.trim()) {
        sendMessage(spokenText.trim());
      }
    },
    [sendMessage]
  );

  const {
    isListening,
    interimTranscript,
    startListening,
    stopListening,
    isSupported,
    error: speechError
  } = useSpeechRecognition({
    onResult: handleSpeechResult,
    language: language === 'ur' ? 'ur-PK' : 'en-US'
  });

  const toggleLanguage = () => {
    const next = language === 'en' ? 'ur' : 'en';
    setLanguage(next);
    stopSpeaking();
    stopListening();

    setMessages((prev) => {
      // If conversation is just the initial greeting, update it to the target language
      if (prev.length === 1 && prev[0].role === 'assistant') {
        return [
          {
            role: 'assistant',
            content:
              next === 'ur'
                ? 'خوش آمدید! میں لائل پور بازار کا اسسٹنٹ ہوں۔ مجھ سے اشیائے خورونوش، لان کے سوٹ یا فیصل آباد میں ڈیلیوری کے بارے میں پوچھیں!'
                : 'Hello! I am your Lyallpur Bazaar assistant. Ask me about fresh groceries, lawn fabrics, or delivery across Faisalabad!',
            products: [],
            suggested_actions:
              next === 'ur'
                ? ['لان کے سوٹ دکھائیں', 'روزمرہ راشن', 'ڈیلیوری ریٹس']
                : ['Show Lawn Suits', 'Grocery Staples', 'Delivery Rates']
          }
        ];
      }
      return prev;
    });
  };

  const handleMicClick = () => {
    stopSpeaking();
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleDrawerClose = () => {
    stopSpeaking();
    stopListening();
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* 1. Minimized Floating Action Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border-2 border-white cursor-pointer"
          title="Open AI Voice Assistant"
          aria-label="Open AI Voice Assistant"
        >
          <div className="relative">
            <Sparkles
              className="w-5 h-5 animate-spin text-amber-300"
              style={{ animationDuration: '6s' }}
            />
            <Mic className="w-4 h-4 absolute -bottom-1 -right-1 text-white" />
          </div>
          <span className="text-sm font-extrabold tracking-tight">
            Ask Lyallpur AI
          </span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-200" />
          </span>
        </button>
      )}

      {/* 2. Expanded Conversational Drawer */}
      {isOpen && (
        <div className="w-96 max-w-[calc(100vw-2rem)] h-[540px] max-h-[calc(100vh-6rem)] bg-white rounded-3xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-800 text-white p-3.5 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-xs">
                <Bot className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold leading-none flex items-center gap-1.5">
                  <span>Lyallpur Concierge</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                </h3>
                <span className="text-[11px] text-emerald-100 font-medium">
                  {isListening
                    ? language === 'ur'
                      ? 'سن رہا ہے...'
                      : 'Listening...'
                    : isSpeaking
                    ? language === 'ur'
                      ? 'بول رہا ہے...'
                      : 'Speaking...'
                    : language === 'ur'
                    ? 'آن لائن اور تیار'
                    : 'Online & Ready'}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5">
              {/* Language Toggle */}
              <button
                type="button"
                onClick={toggleLanguage}
                className="px-2.5 py-1 bg-white/15 hover:bg-white/25 active:bg-white/30 rounded-lg text-xs font-bold transition-all border border-white/20 text-white cursor-pointer"
                title={language === 'en' ? 'Switch to Urdu (اردو)' : 'Switch to English'}
              >
                {language === 'en' ? '🌐 UR' : '🌐 EN'}
              </button>

              {/* Mute/Unmute */}
              <button
                type="button"
                onClick={toggleMute}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white/90 cursor-pointer"
                title={isMuted ? 'Unmute Assistant Voice' : 'Mute Assistant Voice'}
                aria-label={isMuted ? 'Unmute Assistant Voice' : 'Mute Assistant Voice'}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-rose-300" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>

              {/* Minimize */}
              <button
                type="button"
                onClick={handleDrawerClose}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white/80 cursor-pointer"
                title="Minimize Assistant"
                aria-label="Minimize Assistant"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Waveform Bar */}
          <VoiceVisualizer
            isListening={isListening}
            isSpeaking={isSpeaking}
            language={language}
          />

          {/* Speech Error Banner (if mic permissions denied) */}
          {speechError && (
            <div className="mx-3 mt-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-center justify-between">
              <span>Microphone note: {speechError}</span>
            </div>
          )}

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/60">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${
                  m.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none shadow-xs'
                      : 'bg-white text-gray-800 border border-gray-100 shadow-xs rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-line">
                    {renderFormattedMessage(m.content)}
                  </p>
                </div>

                {/* Product Recommendations Horizontal Carousel */}
                {m.products && m.products.length > 0 && (
                  <div className="mt-2.5 w-full overflow-x-auto pb-1.5 flex gap-2.5 scrollbar-thin">
                    {m.products.map((prod) => (
                      <AssistantProductCard key={prod.id} product={prod} />
                    ))}
                  </div>
                )}

                {/* Suggested Action Chips */}
                {m.suggested_actions && m.suggested_actions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.suggested_actions.map((act, actIdx) => (
                      <button
                        key={actIdx}
                        type="button"
                        onClick={() => sendMessage(act)}
                        className="px-2.5 py-1 bg-white hover:bg-emerald-50 active:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full text-[11px] font-semibold transition-colors shadow-2xs hover:border-emerald-300 cursor-pointer"
                      >
                        {act}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Real-time Interim Speech Bubble */}
            {isListening && interimTranscript && (
              <div className="flex flex-col items-end">
                <div className="max-w-[85%] px-3.5 py-2 rounded-2xl rounded-br-none text-xs bg-emerald-100 text-emerald-900 italic border border-emerald-200 animate-pulse">
                  "{interimTranscript}..."
                </div>
              </div>
            )}

            {isLoading && (
              <div className="flex items-center gap-2 p-2 text-xs text-gray-500 font-medium">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                <span>
                  {language === 'ur'
                    ? 'سوچ رہا ہے اور کاتالوگ تلاش کر رہا ہے...'
                    : 'Thinking & searching catalog...'}
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Controls */}
          <div className="p-3 bg-white border-t border-gray-100">
            <div className="flex items-center gap-2">
              {/* Push-To-Talk Mic Button */}
              {isSupported ? (
                <button
                  type="button"
                  onClick={handleMicClick}
                  className={`p-2.5 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                    isListening
                      ? 'bg-rose-500 text-white shadow-lg ring-4 ring-rose-200 animate-pulse'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:bg-emerald-200'
                  }`}
                  title={isListening ? 'Stop listening' : 'Speak to search or ask'}
                  aria-label={isListening ? 'Stop listening' : 'Speak to search or ask'}
                >
                  {isListening ? (
                    <MicOff className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </button>
              ) : null}

              {/* Text Input Fallback */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex-1 flex items-center gap-1.5 bg-gray-50 rounded-2xl border border-gray-200 px-3 py-1.5 focus-within:border-emerald-500 focus-within:bg-white transition-all"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    language === 'ur'
                      ? 'یہاں ٹائپ کریں یا بولیں...'
                      : 'Ask or search products...'
                  }
                  className="w-full bg-transparent text-xs text-gray-900 focus:outline-none placeholder-gray-400"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isLoading}
                  className="p-1.5 text-emerald-600 hover:text-emerald-700 disabled:opacity-30 transition-opacity cursor-pointer"
                  title="Send query"
                  aria-label="Send query"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
