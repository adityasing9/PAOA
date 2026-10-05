import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX, Sparkles, Bot, User, CheckCircle2 } from 'lucide-react';
import { ChatMessage, DigitalTwinProfile, Task, ScheduleBlock, MemoryFact, AiAction } from '../types';
import { GeminiService } from '../services/gemini';
import { SpeechService } from '../services/speech';

interface AssistantViewProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  profile: DigitalTwinProfile;
  tasks: Task[];
  scheduleBlocks: ScheduleBlock[];
  memories: MemoryFact[];
  onExecuteAction: (action: AiAction) => void;
  isProcessing: boolean;
  setIsProcessing: (val: boolean) => void;
}

export const AssistantView: React.FC<AssistantViewProps> = ({
  messages,
  onSendMessage,
  profile,
  isProcessing,
}) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(profile.voiceEnabled);
  const [interimText, setInterimText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    'What should I do now?',
    'I need to study DSA for 2 hours tonight',
    'I want to run tomorrow morning',
    "I'm going out with friends from 5 to 8",
    'Why did you schedule this?',
    'What do you know about me?',
    'Clear all tasks',
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isProcessing) return;

    setInputText('');
    setInterimText('');
    await onSendMessage(text);
  };

  const handleToggleVoice = () => {
    if (isListening) {
      SpeechService.stopListening();
      setIsListening(false);
      setInterimText('');
    } else {
      SpeechService.stopSpeaking();
      const started = SpeechService.startListening(
        (transcript, isFinal) => {
          if (isFinal) {
            setIsListening(false);
            setInterimText('');
            handleSend(transcript);
          } else {
            setInterimText(transcript);
          }
        },
        (err) => {
          console.warn('Voice error:', err);
          setIsListening(false);
          setInterimText('');
        },
        () => {
          setIsListening(false);
        }
      );
      if (started) {
        setIsListening(true);
      }
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-125px)] max-w-3xl mx-auto pb-4">
      {/* Speech Toggle / Status Header */}
      <div className="flex items-center justify-between px-4 py-2 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#00F0FF]" />
          <span>{profile.geminiApiKey ? 'Gemini 2.0 Conversational AI' : 'Offline Rule Mode'}</span>
        </div>
        <button
          onClick={() => {
            const next = !speechEnabled;
            setSpeechEnabled(next);
            if (!next) SpeechService.stopSpeaking();
          }}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-200 cursor-pointer"
        >
          {speechEnabled ? (
            <>
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Voice ON</span>
            </>
          ) : (
            <>
              <VolumeX className="w-3.5 h-3.5 text-slate-500" />
              <span>Voice Muted</span>
            </>
          )}
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div key={msg.id} className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {!isUser && (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00F0FF] to-[#6366F1] flex items-center justify-center shrink-0 mt-0.5 shadow-md shadow-cyan-500/10">
                  <Bot className="w-4 h-4 text-black" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-xs shadow-md shadow-indigo-600/20'
                    : 'bg-[#131B28] text-slate-100 border border-[#233044] rounded-tl-xs shadow-md shadow-black/30'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Executed Actions Badge */}
                {Boolean(msg.actionsExecuted && msg.actionsExecuted.length > 0) && (
                  <div className="mt-2.5 pt-2 border-t border-slate-700/50 space-y-1">
                    {msg.actionsExecuted!.map((act, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{act}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className={`text-[10px] mt-1.5 ${isUser ? 'text-indigo-200' : 'text-slate-500'} text-right`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {isUser && (
                <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-slate-200" />
                </div>
              )}
            </div>
          );
        })}

        {/* Thinking Indicator */}
        {isProcessing && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00F0FF] to-[#6366F1] flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-black" />
            </div>
            <div className="bg-[#131B28] border border-[#233044] rounded-2xl rounded-tl-xs px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs text-slate-400">PAOA is thinking...</span>
            </div>
          </div>
        )}

        {/* Live Speech Recognition Waveform */}
        {isListening && (
          <div className="bg-[#131B28] border border-[#00F0FF]/40 rounded-2xl p-4 flex flex-col items-center gap-3 animate-pulse">
            <div className="flex items-center gap-1.5 h-8">
              <span className="w-1 bg-[#00F0FF] rounded-full animate-wave" style={{ animationDelay: '0.1s' }} />
              <span className="w-1 bg-[#00F0FF] rounded-full animate-wave" style={{ animationDelay: '0.3s' }} />
              <span className="w-1 bg-[#6366F1] rounded-full animate-wave" style={{ animationDelay: '0.2s' }} />
              <span className="w-1 bg-[#00F0FF] rounded-full animate-wave" style={{ animationDelay: '0.4s' }} />
              <span className="w-1 bg-[#6366F1] rounded-full animate-wave" style={{ animationDelay: '0.25s' }} />
            </div>
            <p className="text-xs text-cyan-300 font-medium">
              {interimText || 'Listening... Speak naturally'}
            </p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestion Chips */}
      <div className="px-4 py-2 overflow-x-auto no-scrollbar flex items-center gap-2">
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            disabled={isProcessing}
            className="text-xs whitespace-nowrap bg-[#131B28] hover:bg-[#1C273A] text-slate-300 hover:text-white border border-[#233044] hover:border-cyan-500/50 px-3 py-1.5 rounded-full transition-all cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="px-4 pt-1">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center bg-[#131B28] border border-[#233044] focus-within:border-[#00F0FF] rounded-2xl px-2 py-1.5 shadow-lg transition-colors"
        >
          <button
            type="button"
            onClick={handleToggleVoice}
            className={`p-2.5 rounded-xl transition-all cursor-pointer ${
              isListening
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 animate-pulse'
                : 'text-slate-400 hover:text-[#00F0FF] hover:bg-[#1A2332]'
            }`}
            title={isListening ? 'Stop listening' : 'Start voice input'}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isListening ? 'Listening...' : 'Ask or tell PAOA...'}
            disabled={isProcessing}
            className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isProcessing}
            className="p-2.5 rounded-xl bg-gradient-to-r from-[#00F0FF] to-[#6366F1] text-black font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-all cursor-pointer shadow-md shadow-cyan-500/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
