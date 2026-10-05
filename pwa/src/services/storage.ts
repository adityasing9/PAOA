import { Task, ScheduleBlock, DigitalTwinProfile, MemoryFact, ChatMessage } from '../types';

const STORAGE_KEYS = {
  TASKS: 'paoa_tasks_v1',
  BLOCKS: 'paoa_blocks_v1',
  PROFILE: 'paoa_profile_v1',
  MEMORIES: 'paoa_memories_v1',
  MESSAGES: 'paoa_messages_v1',
};

const DEFAULT_PROFILE: DigitalTwinProfile = {
  userName: 'Aaditya',
  wakeTime: '07:00',
  sleepTime: '23:30',
  peakFocusStartHour: 17,
  peakFocusEndHour: 20,
  defaultBufferMinutes: 15,
  averageSessionMinutes: 50,
  maxContinuousMinutes: 90,
  geminiApiKey: '',
  voiceEnabled: true,
  speechRate: 1.0,
};

const DEFAULT_MEMORIES: MemoryFact[] = [
  {
    id: 'mem-1',
    topic: 'Focus Window',
    fact: 'Consistently focuses best between 5:00 PM and 8:00 PM in the evening.',
    source: 'BEHAVIORAL_INFERENCE',
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'mem-2',
    topic: 'Study Style',
    fact: 'Prefers 45-60 min deep work blocks over continuous 2+ hour marathons.',
    source: 'BEHAVIORAL_INFERENCE',
    createdAt: Date.now() - 86400000,
  },
  {
    id: 'mem-3',
    topic: 'Daily Routine',
    fact: 'Wakes up around 7:00 AM and winds down around 11:30 PM.',
    source: 'USER_PROFILE',
    createdAt: Date.now(),
  },
];

export const StorageService = {
  getProfile(): DigitalTwinProfile {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
      return data ? { ...DEFAULT_PROFILE, ...JSON.parse(data) } : DEFAULT_PROFILE;
    } catch {
      return DEFAULT_PROFILE;
    }
  },

  saveProfile(profile: DigitalTwinProfile): void {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  },

  getMemories(): MemoryFact[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MEMORIES);
      return data ? JSON.parse(data) : DEFAULT_MEMORIES;
    } catch {
      return DEFAULT_MEMORIES;
    }
  },

  saveMemories(memories: MemoryFact[]): void {
    localStorage.setItem(STORAGE_KEYS.MEMORIES, JSON.stringify(memories));
  },

  addMemory(topic: string, fact: string, source: string = 'CONVERSATION'): MemoryFact {
    const memories = this.getMemories();
    const newMem: MemoryFact = {
      id: `mem-${Date.now()}`,
      topic,
      fact,
      source,
      createdAt: Date.now(),
    };
    this.saveMemories([newMem, ...memories]);
    return newMem;
  },

  deleteMemory(id: string): void {
    const memories = this.getMemories().filter((m) => m.id !== id);
    this.saveMemories(memories);
  },

  getTasks(): Task[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TASKS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveTasks(tasks: Task[]): void {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  },

  addTask(task: Omit<Task, 'id' | 'createdAt'>): Task {
    const tasks = this.getTasks();
    const newTask: Task = {
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: Date.now(),
    };
    this.saveTasks([...tasks, newTask]);
    return newTask;
  },

  updateTask(id: string, updates: Partial<Task>): Task | null {
    const tasks = this.getTasks();
    let updated: Task | null = null;
    const newList = tasks.map((t) => {
      if (t.id === id) {
        updated = { ...t, ...updates };
        return updated;
      }
      return t;
    });
    this.saveTasks(newList);
    return updated;
  },

  deleteTask(id: string): void {
    const tasks = this.getTasks().filter((t) => t.id !== id);
    this.saveTasks(tasks);
    const blocks = this.getScheduleBlocks().filter((b) => b.taskId !== id);
    this.saveScheduleBlocks(blocks);
  },

  getScheduleBlocks(): ScheduleBlock[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BLOCKS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveScheduleBlocks(blocks: ScheduleBlock[]): void {
    localStorage.setItem(STORAGE_KEYS.BLOCKS, JSON.stringify(blocks));
  },

  getMessages(): ChatMessage[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      if (data) return JSON.parse(data);
    } catch {}
    return [
      {
        id: 'msg-init',
        role: 'assistant',
        text: "Hey Aaditya! I'm your Personal AI Operating Assistant. Talk to me naturally, ask what to do next, or tell me when your day changes.",
        timestamp: Date.now(),
      },
    ];
  },

  saveMessages(messages: ChatMessage[]): void {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  },

  clearAllData(): void {
    localStorage.removeItem(STORAGE_KEYS.TASKS);
    localStorage.removeItem(STORAGE_KEYS.BLOCKS);
    localStorage.removeItem(STORAGE_KEYS.MEMORIES);
    localStorage.removeItem(STORAGE_KEYS.MESSAGES);
  },

  exportAllDataJson(): string {
    return JSON.stringify(
      {
        profile: this.getProfile(),
        tasks: this.getTasks(),
        scheduleBlocks: this.getScheduleBlocks(),
        memories: this.getMemories(),
        messages: this.getMessages(),
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  },
};
