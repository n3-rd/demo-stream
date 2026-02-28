export interface MeetingStatus {
    canJoin: boolean;
    isPast: boolean;
    joinBeforeMinutes: number;
    minutesLeft: number;
}

/**
 * Determine whether a scheduled meeting is currently joinable.
 * Returns `{ canJoin: true }` when no schedule data is present (unscheduled room).
 */
export function getMeetingStatus(data: any): MeetingStatus {
    if (!data) return { canJoin: true, isPast: false, joinBeforeMinutes: 0, minutesLeft: 0 };

    const scheduledRoom = data.scheduledRoom || data;
    const scheduleTime = scheduledRoom?.schedule_time || scheduledRoom?.scheduledTime;
    if (!scheduleTime) return { canJoin: true, isPast: false, joinBeforeMinutes: 0, minutesLeft: 0 };

    const scheduleDate = scheduleTime instanceof Date ? scheduleTime : new Date(scheduleTime);
    const now = new Date();
    const timeDiff = scheduleDate.getTime() - now.getTime();
    const minutesLeft = Math.floor(timeDiff / 60000);
    const isPast = minutesLeft < 0;
    const joinBeforeMinutes = Math.max(scheduledRoom?.join_before_minutes ?? 0, 0);

    const canJoin =
        !isPast &&
        minutesLeft <= joinBeforeMinutes &&
        minutesLeft >= 0 &&
        (joinBeforeMinutes > 0 || minutesLeft === 0);

    console.log('Meeting status check:', {
        now: now.toISOString(),
        scheduledTime: scheduleDate.toISOString(),
        timeDiff,
        minutesLeft,
        joinBeforeMinutes,
        isPast,
        canJoin
    });

    return { canJoin, isPast, minutesLeft, joinBeforeMinutes };
}

/** Return true when the scheduled meeting starts within the next 60 minutes. */
export function isWithinOneHour(scheduledTime: Date | string | null | undefined): boolean {
    if (!scheduledTime) return false;
    const scheduleDate = scheduledTime instanceof Date ? scheduledTime : new Date(scheduledTime);
    const minutesLeft = Math.floor((scheduleDate.getTime() - Date.now()) / 60000);
    return minutesLeft <= 60;
}
