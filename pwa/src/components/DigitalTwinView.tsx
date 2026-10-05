import React, { useState } from 'react';
import { Brain, Key, ExternalLink, CheckCircle2, Shield, Download, Trash2, Plus, Sparkles, Clock, AlertCircle } from 'lucide-react';
import { DigitalTwinProfile, MemoryFact } from '../types';
import { GeminiService } from '../services/gemini';

interface DigitalTwinViewProps {
  profile: DigitalTwinProfile;
  memories: MemoryFact[];
  onUpdateProfile: (updates: Partial<DigitalTwinProfile>) => void;
  onAddMemory: (topic: string, fact: string) => void;
  onDeleteMemory: (id: string) => void;
  onExportData: () => void;
  onWipeData: () => void;
}

export const DigitalTwinView: React.FC<DigitalTwinViewProps> = ({
  profile,
  memories,
  onUpdateProfile,
  onAddMemory,
  onDeleteMemory,
  onExportData,
  onWipeData,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState(profile.geminiApiKey || '');
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // New Memory Form
  const [newTopic, setNewTopic] = useState('');
  const [newFact, setNewFact] = useState('');
  const [showAddMemory, setShowAddMemory] = useState(false);

  const handleTestAndSaveKey = async () => {
    const key = apiKeyInput.trim();
    if (!key) {
      onUpdateProfile({ geminiApiKey: '' });
      setTestResult({ success: false, message: 'API key removed. Running in offline rule mode.' });
      return;
    }

    setIsTestingKey(true);
    setTestResult(null);

    const isValid = await GeminiService.testConnection(key);
    setIsTestingKey(false);

    if (isValid) {
      onUpdateProfile({ geminiApiKey: key });
      setTestResult({ success: true, message: '✓ Successfully connected to Gemini 2.0 Flash!' });
    } else {
      setTestResult({
        success: false,
        message: 'Connection failed. Please verify your Google AI Studio key.',
      });
    }
  };

  const handleAddMemorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim() || !newFact.trim()) return;

    onAddMemory(newTopic.trim(), newFact.trim());
    setNewTopic('');
    setNewFact('');
    setShowAddMemory(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 pb-24 space-y-6">
      {/* 1. Free Gemini AI Card */}
      <section className="bg-[#131B28] border border-[#233044] rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-[#00F0FF]">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white m-0">Free Gemini 2.0 Flash AI Brain</h2>
              <p className="text-xs text-slate-400 m-0">₹0 Operating Cost • Direct Client-Side</p>
            </div>
          </div>

          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              profile.geminiApiKey
                ? 'bg-cyan-500/20 text-[#00F0FF] border-[#00F0FF]/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {profile.geminiApiKey ? 'ACTIVE' : 'OFFLINE'}
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed m-0">
          Google AI Studio provides 100% free API keys (no credit card or billing needed). When active, PAOA has true conversational intelligence, remembers previous turns, and automatically optimizes your schedule.
        </p>

        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Paste your free Gemini key (AIzaSy...)"
              className="flex-1 bg-[#0B0F17] border border-[#233044] focus:border-[#00F0FF] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none font-mono"
            />
            <button
              onClick={handleTestAndSaveKey}
              disabled={isTestingKey}
              className="bg-gradient-to-r from-[#00F0FF] to-[#6366F1] text-black font-bold text-xs px-4 py-2 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer shadow-md shadow-cyan-500/20 shrink-0"
            >
              {isTestingKey ? 'Testing...' : 'Save & Test'}
            </button>
          </div>

          {testResult && (
            <div
              className={`text-xs p-2.5 rounded-xl border flex items-center gap-1.5 ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium"
        >
          <span>Get Free Key from Google AI Studio</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </section>

      {/* 2. Digital Twin Parameters */}
      <section className="bg-[#131B28] border border-[#233044] rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white m-0">Digital Twin Behavioral Model</h2>
            <p className="text-xs text-slate-400 m-0">Your personalized schedule rhythm and habits</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Your Name</label>
            <input
              type="text"
              value={profile.userName}
              onChange={(e) => onUpdateProfile({ userName: e.target.value })}
              className="w-full bg-[#0B0F17] border border-[#233044] focus:border-[#00F0FF] rounded-xl px-3 py-2 text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Buffer Between Tasks (minutes)</label>
            <input
              type="number"
              min="5"
              step="5"
              value={profile.defaultBufferMinutes}
              onChange={(e) => onUpdateProfile({ defaultBufferMinutes: Number(e.target.value) || 15 })}
              className="w-full bg-[#0B0F17] border border-[#233044] focus:border-[#00F0FF] rounded-xl px-3 py-2 text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Typical Wake Time</label>
            <input
              type="time"
              value={profile.wakeTime}
              onChange={(e) => onUpdateProfile({ wakeTime: e.target.value })}
              className="w-full bg-[#0B0F17] border border-[#233044] focus:border-[#00F0FF] rounded-xl px-3 py-2 text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Typical Sleep Time</label>
            <input
              type="time"
              value={profile.sleepTime}
              onChange={(e) => onUpdateProfile({ sleepTime: e.target.value })}
              className="w-full bg-[#0B0F17] border border-[#233044] focus:border-[#00F0FF] rounded-xl px-3 py-2 text-white outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-slate-300 font-semibold mb-1">
              Peak Focus Window: {profile.peakFocusStartHour}:00 to {profile.peakFocusEndHour}:00 (Evening)
            </label>
            <div className="flex gap-2 items-center">
              <span className="text-slate-400">Start:</span>
              <input
                type="number"
                min="0"
                max="23"
                value={profile.peakFocusStartHour}
                onChange={(e) => onUpdateProfile({ peakFocusStartHour: Number(e.target.value) })}
                className="w-20 bg-[#0B0F17] border border-[#233044] focus:border-[#00F0FF] rounded-xl px-2 py-1.5 text-white outline-none"
              />
              <span className="text-slate-400 ml-2">End:</span>
              <input
                type="number"
                min="0"
                max="23"
                value={profile.peakFocusEndHour}
                onChange={(e) => onUpdateProfile({ peakFocusEndHour: Number(e.target.value) })}
                className="w-20 bg-[#0B0F17] border border-[#233044] focus:border-[#00F0FF] rounded-xl px-2 py-1.5 text-white outline-none"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Learned Memories List */}
      <section className="bg-[#131B28] border border-[#233044] rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h2 className="text-base font-bold text-white m-0">What I Know About You</h2>
          </div>

          <button
            onClick={() => setShowAddMemory(!showAddMemory)}
            className="text-xs font-semibold text-[#00F0FF] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Memory</span>
          </button>
        </div>

        {showAddMemory && (
          <form onSubmit={handleAddMemorySubmit} className="bg-[#0B0F17] border border-[#233044] rounded-xl p-3 space-y-2 text-xs">
            <input
              type="text"
              placeholder="Topic (e.g. Study Preference, Energy Window)"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              className="w-full bg-[#131B28] border border-[#233044] rounded-lg px-2.5 py-1.5 text-white outline-none"
            />
            <textarea
              placeholder="Fact (e.g. I dislike studying right after lunch)"
              value={newFact}
              onChange={(e) => setNewFact(e.target.value)}
              rows={2}
              className="w-full bg-[#131B28] border border-[#233044] rounded-lg px-2.5 py-1.5 text-white outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddMemory(false)}
                className="px-3 py-1 text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#00F0FF] text-black font-bold px-3 py-1 rounded-lg"
              >
                Save
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {memories.map((mem) => (
            <div
              key={mem.id}
              className="bg-[#0B0F17] border border-[#1E293B] rounded-xl p-3 flex items-start justify-between gap-3 text-xs"
            >
              <div>
                <span className="font-semibold text-cyan-300 uppercase text-[10px] tracking-wider">
                  {mem.topic}
                </span>
                <p className="text-slate-200 m-0 mt-0.5 leading-relaxed">{mem.fact}</p>
              </div>

              <button
                onClick={() => onDeleteMemory(mem.id)}
                className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                title="Delete memory"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Data Sovereignty & Privacy */}
      <section className="bg-[#131B28] border border-[#233044] rounded-2xl p-5 space-y-3 shadow-xl text-xs">
        <div className="flex items-center gap-2 text-slate-200 font-bold">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Local Privacy & Sovereignty</span>
        </div>
        <p className="text-slate-400 m-0 leading-relaxed">
          All your tasks, daily schedule blocks, and digital twin memories are stored locally on your device in your browser's persistent storage. Nothing is stored on third-party servers.
        </p>

        <div className="flex flex-wrap gap-2.5 pt-2">
          <button
            onClick={onExportData}
            className="flex items-center gap-1.5 bg-[#0B0F17] hover:bg-[#162030] text-slate-300 border border-[#233044] px-3.5 py-2 rounded-xl transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Export Data (JSON)</span>
          </button>

          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to wipe all local PAOA data? This cannot be undone.')) {
                onWipeData();
              }
            }}
            className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Purge All Local Data</span>
          </button>
        </div>
      </section>
    </div>
  );
};
