import React, { useState, useEffect } from 'react';
import { StorageService } from './services/storage';
import { SchedulerService } from './services/scheduler';
import { GeminiService } from './services/gemini';
import { SpeechService } from './services/speech';
import { Task, ScheduleBlock, DigitalTwinProfile, MemoryFact, ChatMessage, AiAction } from './types';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { AssistantView } from './components/AssistantView';
import { ScheduleView } from './components/ScheduleView';
import { TasksView } from './components/TasksView';
import { DigitalTwinView } from './components/DigitalTwinView';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('assistant');
  const [profile, setProfile] = useState<DigitalTwinProfile>(StorageService.getProfile());
  const [tasks, setTasks] = useState<Task[]>(StorageService.getTasks());
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>(StorageService.getScheduleBlocks());
  const [memories, setMemories] = useState<MemoryFact[]>(StorageService.getMemories());
  const [messages, setMessages] = useState<ChatMessage[]>(StorageService.getMessages());
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Sync state to storage
  useEffect(() => {
    StorageService.saveProfile(profile);
  }, [profile]);

  useEffect(() => {
    StorageService.saveTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    StorageService.saveScheduleBlocks(scheduleBlocks);
  }, [scheduleBlocks]);

  useEffect(() => {
    StorageService.saveMemories(memories);
  }, [memories]);

  useEffect(() => {
    StorageService.saveMessages(messages);
  }, [messages]);

  // Execute AI action on database
  const executeAiAction = (action: AiAction): string => {
    switch (action.type) {
      case 'SCHEDULE_TASK': {
        const newTask = StorageService.addTask({
          title: action.title || 'New Task',
          durationMinutes: action.durationMinutes || 45,
          category: action.category || 'PERSONAL',
          priority: action.priority || 'NORMAL',
          status: 'PLANNED',
        });
        const currentTasks = StorageService.getTasks();
        setTasks(currentTasks);

        const currentBlocks = StorageService.getScheduleBlocks();
        const updatedBlocks = SchedulerService.scheduleDay(
          currentTasks,
          currentBlocks,
          profile,
          action.targetDateOffsetDays || 0
        );
        setScheduleBlocks(updatedBlocks);
        return `Scheduled "${newTask.title}" for ${newTask.durationMinutes} minutes.`;
      }

      case 'RESCHEDULE_TASK': {
        const query = (action.taskQuery || '').toLowerCase();
        const currentTasks = StorageService.getTasks();
        const target = currentTasks.find((t) => t.title.toLowerCase().includes(query));
        if (target) {
          StorageService.updateTask(target.id, { status: 'POSTPONED' });
          const updatedTasks = StorageService.getTasks();
          setTasks(updatedTasks);

          const currentBlocks = StorageService.getScheduleBlocks().filter((b) => b.taskId !== target.id);
          const updatedBlocks = SchedulerService.scheduleDay(updatedTasks, currentBlocks, profile, 1);
          setScheduleBlocks(updatedBlocks);
          return `Moved "${target.title}" to tomorrow.`;
        }
        return `Could not find task matching "${action.taskQuery}".`;
      }

      case 'DELETE_TASK': {
        const query = (action.taskQuery || '').toLowerCase();
        const currentTasks = StorageService.getTasks();
        const target = currentTasks.find((t) => t.title.toLowerCase().includes(query));
        if (target) {
          StorageService.deleteTask(target.id);
          setTasks(StorageService.getTasks());
          setScheduleBlocks(StorageService.getScheduleBlocks());
          return `Deleted task "${target.title}".`;
        }
        return `No task matching "${action.taskQuery}" found.`;
      }

      case 'CLEAR_ALL_TASKS': {
        StorageService.saveTasks([]);
        StorageService.saveScheduleBlocks([]);
        setTasks([]);
        setScheduleBlocks([]);
        return 'Cleared all tasks and schedule blocks.';
      }

      case 'COMPLETE_TASK': {
        const query = (action.taskQuery || '').toLowerCase();
        const currentTasks = StorageService.getTasks();
        const target = currentTasks.find((t) => t.title.toLowerCase().includes(query));
        if (target) {
          StorageService.updateTask(target.id, { status: 'COMPLETED' });
          setTasks(StorageService.getTasks());
          const remainingBlocks = StorageService.getScheduleBlocks().filter((b) => b.taskId !== target.id);
          setScheduleBlocks(remainingBlocks);
          return `Marked "${target.title}" complete.`;
        }
        return `Task "${action.taskQuery}" completed.`;
      }

      case 'SET_UNAVAILABLE': {
        const currentTasks = StorageService.getTasks();
        const currentBlocks = StorageService.getScheduleBlocks();
        const res = SchedulerService.handleUnavailableInterval(
          action.startHour || 17,
          action.startMinute || 0,
          action.endHour || 20,
          action.endMinute || 0,
          action.label || 'Unavailable',
          currentTasks,
          currentBlocks,
          profile,
          action.targetDateOffsetDays || 0
        );
        setScheduleBlocks(res.updatedBlocks);
        return res.explanation;
      }

      case 'UPDATE_PREFERENCE': {
        const newMem = StorageService.addMemory(action.key || 'Preference', action.value || '', 'CONVERSATION');
        setMemories(StorageService.getMemories());
        return `Updated preference: ${newMem.fact}`;
      }

      default:
        return '';
    }
  };

  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text,
      timestamp: Date.now(),
    };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsProcessing(true);

    try {
      const result = await GeminiService.generateResponse(
        text,
        updatedMessages,
        profile,
        tasks,
        scheduleBlocks,
        memories
      );

      const executedActions: string[] = [];
      for (const action of result.actions) {
        const summary = executeAiAction(action);
        if (summary) executedActions.push(summary);
      }

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        text: result.replyText,
        timestamp: Date.now(),
        actionsExecuted: executedActions.length > 0 ? executedActions : undefined,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (profile.voiceEnabled) {
        SpeechService.speak(result.replyText, profile.speechRate);
      }
    } catch (e) {
      console.error(e);
      const fallbackMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        text: "I ran into a problem processing that. Check your connection or API key in Settings.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddTask = (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask = StorageService.addTask(taskData);
    const updatedTasks = StorageService.getTasks();
    setTasks(updatedTasks);

    const updatedBlocks = SchedulerService.scheduleDay(updatedTasks, scheduleBlocks, profile, 0);
    setScheduleBlocks(updatedBlocks);
  };

  const handleToggleTaskStatus = (taskId: string) => {
    const current = tasks.find((t) => t.id === taskId);
    if (!current) return;

    const newStatus = current.status === 'COMPLETED' ? 'PLANNED' : 'COMPLETED';
    StorageService.updateTask(taskId, { status: newStatus });
    const updatedTasks = StorageService.getTasks();
    setTasks(updatedTasks);

    if (newStatus === 'COMPLETED') {
      const remainingBlocks = scheduleBlocks.filter((b) => b.taskId !== taskId);
      setScheduleBlocks(remainingBlocks);
    } else {
      const updatedBlocks = SchedulerService.scheduleDay(updatedTasks, scheduleBlocks, profile, 0);
      setScheduleBlocks(updatedBlocks);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    StorageService.deleteTask(taskId);
    setTasks(StorageService.getTasks());
    setScheduleBlocks(StorageService.getScheduleBlocks());
  };

  const handleCompleteTask = (taskId: string) => {
    handleToggleTaskStatus(taskId);
  };

  const handlePostponeTask = (taskId: string) => {
    executeAiAction({
      type: 'RESCHEDULE_TASK',
      taskQuery: tasks.find((t) => t.id === taskId)?.title || '',
      targetDateOffsetDays: 1,
    });
  };

  const handleDeleteBlock = (blockId: string) => {
    const remaining = scheduleBlocks.filter((b) => b.id !== blockId);
    setScheduleBlocks(remaining);
  };

  const handleReScheduleDay = () => {
    const updated = SchedulerService.scheduleDay(tasks, scheduleBlocks, profile, 0);
    setScheduleBlocks(updated);
  };

  const handleExportData = () => {
    const dataStr = StorageService.exportAllDataJson();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `paoa-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleWipeData = () => {
    StorageService.clearAllData();
    setTasks([]);
    setScheduleBlocks([]);
    setMemories([]);
    setMessages([]);
    window.location.reload();
  };

  const pendingCount = tasks.filter((t) => t.status === 'PLANNED' || t.status === 'IN_PROGRESS').length;

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col font-sans">
      <Navbar profile={profile} activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 w-full max-w-5xl mx-auto overflow-x-hidden">
        {activeTab === 'assistant' && (
          <AssistantView
            messages={messages}
            onSendMessage={handleSendMessage}
            profile={profile}
            tasks={tasks}
            scheduleBlocks={scheduleBlocks}
            memories={memories}
            onExecuteAction={executeAiAction}
            isProcessing={isProcessing}
            setIsProcessing={setIsProcessing}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleView
            scheduleBlocks={scheduleBlocks}
            tasks={tasks}
            profile={profile}
            onCompleteTask={handleCompleteTask}
            onPostponeTask={handlePostponeTask}
            onDeleteBlock={handleDeleteBlock}
            onReScheduleDay={handleReScheduleDay}
          />
        )}

        {activeTab === 'tasks' && (
          <TasksView
            tasks={tasks}
            onAddTask={handleAddTask}
            onToggleTaskStatus={handleToggleTaskStatus}
            onDeleteTask={handleDeleteTask}
          />
        )}

        {activeTab === 'settings' && (
          <DigitalTwinView
            profile={profile}
            memories={memories}
            onUpdateProfile={(updates) => setProfile((p) => ({ ...p, ...updates }))}
            onAddMemory={(topic, fact) => {
              StorageService.addMemory(topic, fact);
              setMemories(StorageService.getMemories());
            }}
            onDeleteMemory={(id) => {
              StorageService.deleteMemory(id);
              setMemories(StorageService.getMemories());
            }}
            onExportData={handleExportData}
            onWipeData={handleWipeData}
          />
        )}
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} pendingTasksCount={pendingCount} />
    </div>
  );
};

export default App;
