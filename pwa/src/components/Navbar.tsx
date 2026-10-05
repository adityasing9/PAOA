import React, { useEffect, useState } from 'react';
import { Bot, Sparkles, Wifi, WifiOff } from 'lucide-react';
import { DigitalTwinProfile } from '../types';

interface NavbarProps {
  profile: DigitalTwinProfile;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ profile, activeTab, setActiveTab }) => {
  const [time, setTime] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const hasApiKey = Boolean(profile.geminiApiKey?.trim());

  return (
    <header className="sticky top-0 z-30 bg-[#0B0F17]/90 backdrop-blur-md border-b border-[#1E293B] px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00F0FF] to-[#6366F1] flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Bot className="w-5 h-5 text-black" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold tracking-tight text-white m-0">PAOA</h1>
              <span className="text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-[#151D2A] text-[#00F0FF] border border-[#232E40]">
                {hasApiKey ? 'GEMINI 2.0' : 'LOCAL'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 m-0">Personal AI Operating Assistant</p>
          </div>
        </div>

        {/* Status / Clock */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300 font-mono bg-[#131B28] px-2.5 py-1 rounded-full border border-[#233044]">
            {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-rose-400" />}
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          <div className="text-xs font-mono font-medium text-slate-200 bg-[#131B28] px-2.5 py-1 rounded-full border border-[#233044]">
            {time}
          </div>

          {/* Quick AI key pill if not set */}
          {!hasApiKey && (
            <button
              onClick={() => setActiveTab('settings')}
              className="text-xs font-medium text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full flex items-center gap-1 hover:bg-amber-500/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span className="hidden md:inline">Setup Free AI</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
