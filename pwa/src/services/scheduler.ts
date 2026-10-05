import { Task, ScheduleBlock, DigitalTwinProfile } from '../types';

export const SchedulerService = {
  scheduleDay(
    tasks: Task[],
    existingBlocks: ScheduleBlock[],
    profile: DigitalTwinProfile,
    dateOffsetDays: number = 0
  ): ScheduleBlock[] {
    const plannedTasks = tasks.filter((t) => t.status === 'PLANNED' || t.status === 'IN_PROGRESS');
    if (plannedTasks.length === 0) return existingBlocks;

    // Target day boundaries
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + dateOffsetDays);

    const [wakeH, wakeM] = profile.wakeTime.split(':').map(Number);
    const [sleepH, sleepM] = profile.sleepTime.split(':').map(Number);

    const dayStart = new Date(targetDate);
    dayStart.setHours(wakeH || 7, wakeM || 0, 0, 0);

    const dayEnd = new Date(targetDate);
    dayEnd.setHours(sleepH || 23, sleepM || 30, 0, 0);

    // Keep locked blocks and unavailable blocks
    const preservedBlocks = existingBlocks.filter(
      (b) => b.isLocked || b.category === 'UNAVAILABLE' || b.startTime < dayStart.getTime() || b.startTime > dayEnd.getTime()
    );

    const newBlocks: ScheduleBlock[] = [...preservedBlocks];

    // Priority sorting
    const priorityWeight: Record<string, number> = {
      CRITICAL: 4,
      IMPORTANT: 3,
      NORMAL: 2,
      FLEXIBLE: 1,
    };

    const sortedTasks = [...plannedTasks].sort((a, b) => {
      const pDiff = (priorityWeight[b.priority] || 1) - (priorityWeight[a.priority] || 1);
      if (pDiff !== 0) return pDiff;
      if (a.deadline && b.deadline) return a.deadline - b.deadline;
      return b.durationMinutes - a.durationMinutes;
    });

    const bufferMs = profile.defaultBufferMinutes * 60 * 1000;
    const nowMs = Date.now();
    let searchStart = dateOffsetDays === 0 && nowMs > dayStart.getTime() ? nowMs + 10 * 60 * 1000 : dayStart.getTime();

    // Round searchStart up to nearest 15 mins
    searchStart = Math.ceil(searchStart / (15 * 60 * 1000)) * (15 * 60 * 1000);

    for (const task of sortedTasks) {
      // Check if already placed in preserved blocks
      if (newBlocks.some((b) => b.taskId === task.id)) continue;

      const durationMs = task.durationMinutes * 60 * 1000;
      let slotFound = false;

      // Try peak focus window first if Study or Project
      const isPeakEligible = task.category === 'STUDY' || task.category === 'PROJECT';
      if (isPeakEligible) {
        const peakStart = new Date(targetDate);
        peakStart.setHours(profile.peakFocusStartHour, 0, 0, 0);
        const peakEnd = new Date(targetDate);
        peakEnd.setHours(profile.peakFocusEndHour, 0, 0, 0);

        if (peakStart.getTime() >= searchStart) {
          const candidateSlot = this.findFreeSlot(
            peakStart.getTime(),
            peakEnd.getTime(),
            durationMs,
            bufferMs,
            newBlocks
          );
          if (candidateSlot) {
            newBlocks.push({
              id: `block-${task.id}-${Date.now()}`,
              taskId: task.id,
              title: task.title,
              startTime: candidateSlot.start,
              endTime: candidateSlot.start + durationMs,
              category: task.category,
              priority: task.priority,
              isLocked: false,
              explanation: `Placed during your peak evening focus window (${profile.peakFocusStartHour}:00 - ${profile.peakFocusEndHour}:00).`,
            });
            slotFound = true;
          }
        }
      }

      // General search throughout the day
      if (!slotFound) {
        const candidateSlot = this.findFreeSlot(
          searchStart,
          dayEnd.getTime(),
          durationMs,
          bufferMs,
          newBlocks
        );

        if (candidateSlot) {
          newBlocks.push({
            id: `block-${task.id}-${Date.now()}`,
            taskId: task.id,
            title: task.title,
            startTime: candidateSlot.start,
            endTime: candidateSlot.start + durationMs,
            category: task.category,
            priority: task.priority,
            isLocked: false,
            explanation: `Optimally placed with a ${profile.defaultBufferMinutes}-minute buffer before and after.`,
          });
          slotFound = true;
        }
      }
    }

    return newBlocks.sort((a, b) => a.startTime - b.startTime);
  },

  findFreeSlot(
    windowStart: number,
    windowEnd: number,
    durationMs: number,
    bufferMs: number,
    existingBlocks: ScheduleBlock[]
  ): { start: number; end: number } | null {
    let currentStart = windowStart;

    while (currentStart + durationMs <= windowEnd) {
      const candidateEnd = currentStart + durationMs;

      // Check collision with any existing block + buffer
      const collision = existingBlocks.find(
        (b) => currentStart < b.endTime + bufferMs && candidateEnd + bufferMs > b.startTime
      );

      if (!collision) {
        return { start: currentStart, end: candidateEnd };
      }

      // Jump past the colliding block
      currentStart = Math.ceil((collision.endTime + bufferMs) / (15 * 60 * 1000)) * (15 * 60 * 1000);
    }

    return null;
  },

  handleUnavailableInterval(
    startHour: number,
    startMinute: number,
    endHour: number,
    endMinute: number,
    label: string,
    tasks: Task[],
    existingBlocks: ScheduleBlock[],
    profile: DigitalTwinProfile,
    targetDateOffsetDays: number = 0
  ): { updatedBlocks: ScheduleBlock[]; explanation: string } {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + targetDateOffsetDays);

    const start = new Date(targetDate);
    start.setHours(startHour, startMinute, 0, 0);

    const end = new Date(targetDate);
    end.setHours(endHour, endMinute, 0, 0);

    const unavailBlock: ScheduleBlock = {
      id: `unavail-${Date.now()}`,
      title: label || 'Unavailable',
      startTime: start.getTime(),
      endTime: end.getTime(),
      category: 'UNAVAILABLE',
      priority: 'CRITICAL',
      isLocked: true,
      explanation: `Marked as unavailable: ${label}`,
    };

    // Remove overlapping unlocked blocks
    const filteredBlocks = existingBlocks.filter(
      (b) => b.isLocked || b.endTime <= start.getTime() || b.startTime >= end.getTime()
    );

    const combined = [...filteredBlocks, unavailBlock];
    const rescheduled = this.scheduleDay(tasks, combined, profile, targetDateOffsetDays);

    const timeFmt = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const explanation = `Marked ${timeFmt(start)} – ${timeFmt(end)} as unavailable (${label}). I've automatically shifted your other activities into remaining open slots.`;

    return { updatedBlocks: rescheduled, explanation };
  },
};
