import { ChatMessage, DigitalTwinProfile, Task, ScheduleBlock, MemoryFact, AiAction } from '../types';

export interface GeminiResult {
  replyText: string;
  actions: AiAction[];
}

export const GeminiService = {
  async testConnection(apiKey: string): Promise<boolean> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Hello, reply with OK.' }] }],
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async generateResponse(
    userText: string,
    history: ChatMessage[],
    profile: DigitalTwinProfile,
    tasks: Task[],
    blocks: ScheduleBlock[],
    memories: MemoryFact[]
  ): Promise<GeminiResult> {
    const apiKey = profile.geminiApiKey?.trim();
    if (!apiKey) {
      return this.offlineFallbackResponse(userText, tasks, blocks);
    }

    const systemInstruction = this.buildSystemInstruction(profile, tasks, blocks, memories);
    const contents = this.formatConversationHistory(history, userText);

    const primaryUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    try {
      let res = await fetch(primaryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      });

      if (!res.ok) {
        res = await fetch(fallbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents,
            generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
          }),
        });
      }

      if (!res.ok) {
        throw new Error(`Gemini API error: ${res.statusText}`);
      }

      const json = await res.json();
      const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return this.parseActions(rawText);
    } catch (err) {
      console.warn('Gemini call failed, using offline fallback', err);
      return this.offlineFallbackResponse(userText, tasks, blocks);
    }
  },

  buildSystemInstruction(
    profile: DigitalTwinProfile,
    tasks: Task[],
    blocks: ScheduleBlock[],
    memories: MemoryFact[]
  ): string {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });

    const activeTasksStr = tasks
      .filter((t) => t.status === 'PLANNED' || t.status === 'IN_PROGRESS')
      .map((t) => `- "${t.title}" (${t.durationMinutes}m, Priority: ${t.priority}, Category: ${t.category})`)
      .join('\n') || '- None';

    const blocksStr = blocks
      .map((b) => {
        const start = new Date(b.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        const end = new Date(b.endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        return `- [${start} - ${end}] ${b.title} (${b.category})`;
      })
      .join('\n') || '- Nothing scheduled yet today';

    const memoryStr = memories.map((m) => `- ${m.topic}: ${m.fact}`).join('\n') || '- None';

    return `You are PAOA (Personal AI Operating Assistant), a smart, hyper-personalized, empathetic, and organized AI companion for ${profile.userName}.
Current Time: ${dateStr}, ${timeStr}.

ABOUT THE USER (Digital Twin Profile):
- Wakes at ${profile.wakeTime}, sleeps at ${profile.sleepTime}.
- Peak focus hours: ${profile.peakFocusStartHour}:00 - ${profile.peakFocusEndHour}:00 (Evening focus bias).
- Average study block: ${profile.averageSessionMinutes} mins. Max continuous focus: ${profile.maxContinuousMinutes} mins.
- Preferred buffer between tasks: ${profile.defaultBufferMinutes} mins.

LEARNED MEMORIES & BEHAVIOR:
${memoryStr}

CURRENT SCHEDULE TODAY:
${blocksStr}

ACTIVE TASKS:
${activeTasksStr}

BEHAVIOR RULES:
1. Talk naturally, concisely, and warmly. Keep answers punchy.
2. If the user mentions a vague task without a duration (e.g. "I need to study DSA"), ask how long they want to spend, or suggest splitting into sessions during their peak hours.
3. If the user asks "What should I do now?", reason through the current time, deadlines, and schedule, and recommend the single best next action.
4. When you decide to schedule, reschedule, complete, or delete tasks or set an unavailable window, append an XML action tag at the very end of your response:
<actions>[{"type": "...", ...}]</actions>

Supported action types:
- SCHEDULE_TASK: {"type": "SCHEDULE_TASK", "title": "DSA", "durationMinutes": 60, "startHour": 18, "startMinute": 0, "category": "STUDY", "priority": "IMPORTANT"}
- RESCHEDULE_TASK: {"type": "RESCHEDULE_TASK", "taskQuery": "DSA", "targetDateOffsetDays": 1}
- DELETE_TASK: {"type": "DELETE_TASK", "taskQuery": "DSA"}
- CLEAR_ALL_TASKS: {"type": "CLEAR_ALL_TASKS"}
- COMPLETE_TASK: {"type": "COMPLETE_TASK", "taskQuery": "DBMS"}
- SET_UNAVAILABLE: {"type": "SET_UNAVAILABLE", "startHour": 17, "startMinute": 0, "endHour": 20, "endMinute": 0, "label": "Out with friends"}
- UPDATE_PREFERENCE: {"type": "UPDATE_PREFERENCE", "key": "Study Rhythm", "value": "Prefers evening sessions"}

Ensure the text outside <actions> is a friendly, complete natural conversational response.`;
  },

  formatConversationHistory(history: ChatMessage[], currentUserText: string) {
    const contents: any[] = [];
    const recent = history.slice(-10);

    for (const msg of recent) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.text }],
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: currentUserText }],
    });

    return contents;
  },

  parseActions(rawText: string): GeminiResult {
    const actionRegex = /<actions>([\s\S]*?)<\/actions>/i;
    const match = rawText.match(actionRegex);

    let cleanReply = rawText.replace(actionRegex, '').trim();
    let actions: AiAction[] = [];

    if (match && match[1]) {
      try {
        actions = JSON.parse(match[1].trim());
      } catch (e) {
        console.error('Failed to parse actions JSON:', e);
      }
    }

    return { replyText: cleanReply || rawText, actions };
  },

  offlineFallbackResponse(input: string, tasks: Task[], blocks: ScheduleBlock[]): GeminiResult {
    const lower = input.toLowerCase().trim();

    if (/^(hi|hello|hey|greetings)/.test(lower)) {
      return {
        replyText: "Hey! What's on your mind? Tell me what you'd like to plan, or ask 'What should I do now?'.",
        actions: [],
      };
    }

    if (/what should i do( now)?|what's next|what next/.test(lower)) {
      const active = tasks.filter((t) => t.status === 'PLANNED' || t.status === 'IN_PROGRESS');
      if (active.length > 0) {
        const top = active[0];
        return {
          replyText: `Focus on "${top.title}". You have it scheduled for ${top.durationMinutes} minutes. It's the highest priority task on your list right now.`,
          actions: [],
        };
      }
      return {
        replyText: 'You have no pending tasks right now. Relax, or tell me what you want to achieve next!',
        actions: [],
      };
    }

    if (/clear (all )?tasks|delete all tasks|wipe schedule/.test(lower)) {
      return {
        replyText: 'Cleared all tasks and schedule blocks from your dashboard.',
        actions: [{ type: 'CLEAR_ALL_TASKS' }],
      };
    }

    if (lower.startsWith('delete task ') || lower.startsWith('cancel task ')) {
      const query = lower.replace(/^(delete|cancel) task\s+/, '').trim();
      return {
        replyText: `Deleted task matching "${query}".`,
        actions: [{ type: 'DELETE_TASK', taskQuery: query }],
      };
    }

    // Default task creation detection
    const isTask =
      lower.startsWith('i need to ') ||
      lower.startsWith('i have to ') ||
      lower.startsWith('i want to ') ||
      lower.startsWith('schedule ') ||
      lower.startsWith('study ') ||
      lower.startsWith('work on ') ||
      lower.startsWith('gym') ||
      lower.startsWith('run');

    if (isTask) {
      let duration = 45;
      if (lower.includes('2 hour') || lower.includes('2 hr')) duration = 120;
      else if (lower.includes('1 hour') || lower.includes('1 hr')) duration = 60;
      else if (lower.includes('30 min')) duration = 30;

      let title = input
        .replace(/^(i need to|i have to|i want to|schedule|please schedule)\s+/i, '')
        .replace(/\s+(for|at)\s+\d+.*$/i, '')
        .trim();
      if (!title) title = 'Important Task';

      return {
        replyText: `I've scheduled "${title}" for ${duration} minutes. I've placed it in an optimal free block in your daily timeline.`,
        actions: [
          {
            type: 'SCHEDULE_TASK',
            title,
            durationMinutes: duration,
            category: lower.includes('study') ? 'STUDY' : lower.includes('gym') || lower.includes('run') ? 'EXERCISE' : 'PROJECT',
            priority: 'IMPORTANT',
          },
        ],
      };
    }

    return {
      replyText: "I'm listening! You can tell me what to schedule (e.g. 'Study DSA for 2 hours tonight'), ask 'What should I do now?', or add your free Gemini key in Settings for full conversational AI.",
      actions: [],
    };
  },
};
