export type TaskCategory = 'STUDY' | 'PROJECT' | 'EXERCISE' | 'ROUTINE' | 'SOCIAL' | 'PERSONAL' | 'UNAVAILABLE';

export type Priority = 'CRITICAL' | 'IMPORTANT' | 'NORMAL' | 'FLEXIBLE';

export type TaskStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'POSTPONED';

export interface Task {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  category: TaskCategory;
  priority: Priority;
  status: TaskStatus;
  scheduledStart?: number; // timestamp ms
  scheduledEnd?: number;   // timestamp ms
  deadline?: number;
  preferredTimeOfDay?: string;
  createdAt: number;
}

export interface ScheduleBlock {
  id: string;
  taskId?: string;
  title: string;
  startTime: number; // timestamp ms
  endTime: number;   // timestamp ms
  category: TaskCategory;
  priority: Priority;
  isLocked: boolean;
  explanation: string;
}

export interface DigitalTwinProfile {
  userName: string;
  wakeTime: string; // "07:00"
  sleepTime: string; // "23:30"
  peakFocusStartHour: number; // 17
  peakFocusEndHour: number;   // 20
  defaultBufferMinutes: number; // 15
  averageSessionMinutes: number; // 50
  maxContinuousMinutes: number;  // 90
  geminiApiKey: string;
  voiceEnabled: boolean;
  speechRate: number;
}

export interface MemoryFact {
  id: string;
  topic: string;
  fact: string;
  source: string;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  actionsExecuted?: string[];
}

export interface AiAction {
  type: 'SCHEDULE_TASK' | 'RESCHEDULE_TASK' | 'DELETE_TASK' | 'CLEAR_ALL_TASKS' | 'COMPLETE_TASK' | 'SET_UNAVAILABLE' | 'UPDATE_PREFERENCE';
  title?: string;
  durationMinutes?: number;
  targetDateOffsetDays?: number;
  startHour?: number;
  startMinute?: number;
  endHour?: number;
  endMinute?: number;
  category?: TaskCategory;
  priority?: Priority;
  taskQuery?: string;
  label?: string;
  key?: string;
  value?: string;
}
