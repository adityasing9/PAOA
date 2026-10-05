import React, { useState } from 'react';
import { Plus, CheckCircle2, Circle, Trash2, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { Task, TaskCategory, Priority } from '../types';
import confetti from 'canvas-confetti';

interface TasksViewProps {
  tasks: Task[];
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  onToggleTaskStatus: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  onAddTask,
  onToggleTaskStatus,
  onDeleteTask,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ACTIVE');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(45);
  const [category, setCategory] = useState<TaskCategory>('STUDY');
  const [priority, setPriority] = useState<Priority>('NORMAL');

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'ACTIVE') return t.status === 'PLANNED' || t.status === 'IN_PROGRESS';
    if (filter === 'COMPLETED') return t.status === 'COMPLETED';
    return true;
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddTask({
      title: title.trim(),
      durationMinutes: Number(duration) || 45,
      category,
      priority,
      status: 'PLANNED',
    });

    setTitle('');
    setDuration(45);
    setIsModalOpen(false);
  };

  const getPriorityBadge = (p: Priority) => {
    switch (p) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'IMPORTANT':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      case 'NORMAL':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'FLEXIBLE':
        return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 pb-20 space-y-4">
      {/* Header & Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white m-0">Task Manager</h2>
          <p className="text-xs text-slate-400 m-0">
            {tasks.filter((t) => t.status !== 'COMPLETED').length} active tasks
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 bg-gradient-to-r from-[#00F0FF] to-[#6366F1] text-black font-semibold text-xs px-3.5 py-2 rounded-xl shadow-md shadow-cyan-500/20 hover:opacity-90 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 p-1 bg-[#131B28] rounded-xl border border-[#233044] w-fit">
        {(['ACTIVE', 'COMPLETED', 'ALL'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filter === tab ? 'bg-cyan-500/20 text-[#00F0FF]' : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-2.5">
        {filteredTasks.length === 0 ? (
          <div className="bg-[#131B28] border border-[#233044] rounded-2xl p-8 text-center text-slate-400 text-xs">
            No tasks found in this view.
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isCompleted = task.status === 'COMPLETED';

            return (
              <div
                key={task.id}
                className={`bg-[#131B28] border border-[#233044] rounded-2xl p-3.5 flex items-center justify-between gap-3 transition-all ${
                  isCompleted ? 'opacity-50' : 'hover:border-cyan-500/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (!isCompleted) {
                        confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
                      }
                      onToggleTaskStatus(task.id);
                    }}
                    className="text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer shrink-0"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  <div className="space-y-1">
                    <h4
                      className={`text-sm font-semibold m-0 ${
                        isCompleted ? 'line-through text-slate-500' : 'text-white'
                      }`}
                    >
                      {task.title}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        <span>{task.durationMinutes}m</span>
                      </span>
                      <span>•</span>
                      <span className="uppercase text-[10px] tracking-wide text-slate-400">
                        {task.category}
                      </span>
                      <span>•</span>
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded border ${getPriorityBadge(
                          task.priority
                        )}`}
                      >
                        {task.priority}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onDeleteTask(task.id)}
                  className="text-slate-500 hover:text-rose-400 p-2 rounded-lg transition-colors cursor-pointer"
                  title="Delete Task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Add Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131B28] border border-[#233044] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white m-0">Add New Task</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Study DSA Graph Algorithms"
                  className="w-full bg-[#0B0F17] border border-[#233044] focus:border-[#00F0FF] rounded-xl px-3 py-2 text-white placeholder-slate-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full bg-[#0B0F17] border border-[#233044] focus:border-[#00F0FF] rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TaskCategory)}
                    className="w-full bg-[#0B0F17] border border-[#233044] focus:border-[#00F0FF] rounded-xl px-3 py-2 text-white outline-none"
                  >
                    <option value="STUDY">Study</option>
                    <option value="PROJECT">Project</option>
                    <option value="EXERCISE">Exercise</option>
                    <option value="ROUTINE">Routine</option>
                    <option value="PERSONAL">Personal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Priority Level</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['CRITICAL', 'IMPORTANT', 'NORMAL', 'FLEXIBLE'] as const).map((p) => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setPriority(p)}
                      className={`py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all cursor-pointer ${
                        priority === p
                          ? 'border-[#00F0FF] bg-cyan-500/20 text-[#00F0FF]'
                          : 'border-[#233044] bg-[#0B0F17] text-slate-400 hover:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-[#00F0FF] to-[#6366F1] text-black font-bold py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 hover:opacity-90 transition-all cursor-pointer"
                >
                  Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
