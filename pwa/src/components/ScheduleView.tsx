import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, ChevronRight, AlertCircle, RefreshCw, Calendar as CalendarIcon, ShieldCheck } from 'lucide-react';
import { ScheduleBlock, Task, DigitalTwinProfile } from '../types';
import confetti from 'canvas-confetti';

interface ScheduleViewProps {
  scheduleBlocks: ScheduleBlock[];
  tasks: Task[];
  profile: DigitalTwinProfile;
  onCompleteTask: (taskId: string) => void;
  onPostponeTask: (taskId: string) => void;
  onDeleteBlock: (blockId: string) => void;
  onReScheduleDay: () => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  scheduleBlocks,
  tasks,
  profile,
  onCompleteTask,
  onPostponeTask,
  onDeleteBlock,
  onReScheduleDay,
}) => {
  const [selectedBlock, setSelectedBlock] = useState<ScheduleBlock | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTimeMs(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const totalFocusMinutes = scheduleBlocks
    .filter((b) => b.category !== 'UNAVAILABLE')
    .reduce((acc, b) => acc + Math.round((b.endTime - b.startTime) / 60000), 0);

  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'STUDY':
        return 'border-[#00F0FF]/50 bg-cyan-950/30 text-cyan-300';
      case 'PROJECT':
        return 'border-indigo-500/50 bg-indigo-950/30 text-indigo-300';
      case 'EXERCISE':
        return 'border-emerald-500/50 bg-emerald-950/30 text-emerald-300';
      case 'UNAVAILABLE':
        return 'border-amber-500/40 bg-amber-950/20 text-amber-300';
      default:
        return 'border-slate-600/50 bg-slate-900/30 text-slate-300';
    }
  };

  const formatTime = (ms: number) => {
    return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 pb-20 space-y-5">
      {/* Header Summary Cards */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-[#131B28] border border-[#233044] rounded-2xl p-3 flex flex-col">
          <span className="text-[11px] font-medium text-slate-400">Total Planned</span>
          <span className="text-xl font-bold text-white mt-1">{totalFocusMinutes} <span className="text-xs font-normal text-slate-400">mins</span></span>
        </div>

        <div className="bg-[#131B28] border border-[#233044] rounded-2xl p-3 flex flex-col">
          <span className="text-[11px] font-medium text-slate-400">Completed</span>
          <span className="text-xl font-bold text-emerald-400 mt-1">{completedCount}</span>
        </div>

        <div className="bg-[#131B28] border border-[#233044] rounded-2xl p-3 flex flex-col">
          <span className="text-[11px] font-medium text-slate-400">Buffer Rule</span>
          <span className="text-xl font-bold text-[#00F0FF] mt-1">{profile.defaultBufferMinutes} <span className="text-xs font-normal text-slate-400">mins</span></span>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-[#00F0FF]" />
          <h2 className="text-base font-bold text-white m-0">Today's Dynamic Timeline</h2>
        </div>

        <button
          onClick={onReScheduleDay}
          className="flex items-center gap-1.5 text-xs font-semibold bg-[#131B28] hover:bg-[#1A2436] text-cyan-300 border border-[#233044] hover:border-[#00F0FF]/40 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Optimize</span>
        </button>
      </div>

      {/* Timeline Blocks List */}
      <div className="space-y-3">
        {scheduleBlocks.length === 0 ? (
          <div className="bg-[#131B28] border border-[#233044] rounded-2xl p-8 text-center space-y-2">
            <Clock className="w-8 h-8 text-slate-500 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-200 m-0">No blocks scheduled yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Ask PAOA in the Assistant tab to plan something (e.g. "I need to study DSA for 2 hours tonight") or click Optimize.
            </p>
          </div>
        ) : (
          scheduleBlocks.map((block) => {
            const isOngoing = currentTimeMs >= block.startTime && currentTimeMs <= block.endTime;
            const isPast = currentTimeMs > block.endTime;
            const isUnavailable = block.category === 'UNAVAILABLE';
            const durationMins = Math.round((block.endTime - block.startTime) / 60000);

            return (
              <div
                key={block.id}
                onClick={() => setSelectedBlock(block)}
                className={`relative rounded-2xl p-4 border transition-all cursor-pointer ${getCategoryColor(
                  block.category
                )} ${isOngoing ? 'ring-2 ring-[#00F0FF] shadow-lg shadow-cyan-500/10' : ''} ${
                  isPast ? 'opacity-60' : 'hover:scale-[1.01]'
                }`}
              >
                {/* Active pulse tag */}
                {isOngoing && (
                  <span className="absolute -top-2 right-4 bg-[#00F0FF] text-black text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow-sm">
                    In Progress
                  </span>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-300">
                        {formatTime(block.startTime)} – {formatTime(block.endTime)}
                      </span>
                      <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-black/40 text-slate-300">
                        {durationMins}m
                      </span>
                      {block.priority === 'CRITICAL' && (
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          Critical
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-white m-0 tracking-tight">{block.title}</h3>

                    {Boolean(block.explanation) && (
                      <p className="text-xs text-slate-400 m-0 line-clamp-1 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>{block.explanation}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isUnavailable && block.taskId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          confetti({ particleCount: 60, spread: 60, origin: { y: 0.8 } });
                          onCompleteTask(block.taskId!);
                        }}
                        className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 transition-all cursor-pointer"
                        title="Mark Complete"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Selected Block Details Dialog Modal */}
      {selectedBlock && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131B28] border border-[#233044] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                  {selectedBlock.category}
                </span>
                <h3 className="text-lg font-bold text-white m-0 mt-0.5">{selectedBlock.title}</h3>
              </div>
              <button
                onClick={() => setSelectedBlock(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#0B0F17] rounded-xl p-3 border border-[#1E293B] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Scheduled Slot:</span>
                <span className="font-mono text-white font-semibold">
                  {formatTime(selectedBlock.startTime)} – {formatTime(selectedBlock.endTime)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Duration:</span>
                <span className="font-mono text-white font-semibold">
                  {Math.round((selectedBlock.endTime - selectedBlock.startTime) / 60000)} minutes
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Priority:</span>
                <span className="text-white font-semibold">{selectedBlock.priority}</span>
              </div>
            </div>

            {selectedBlock.explanation && (
              <div className="bg-cyan-950/20 border border-cyan-800/40 rounded-xl p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Explainable Decision Logic</span>
                </div>
                <p className="text-xs text-slate-300 m-0 leading-relaxed">{selectedBlock.explanation}</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              {selectedBlock.taskId && (
                <>
                  <button
                    onClick={() => {
                      confetti({ particleCount: 80, spread: 70, origin: { y: 0.7 } });
                      onCompleteTask(selectedBlock.taskId!);
                      setSelectedBlock(null);
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete</span>
                  </button>
                  <button
                    onClick={() => {
                      onPostponeTask(selectedBlock.taskId!);
                      setSelectedBlock(null);
                    }}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Move to Tomorrow
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  onDeleteBlock(selectedBlock.id);
                  setSelectedBlock(null);
                }}
                className="px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs transition-all cursor-pointer"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
