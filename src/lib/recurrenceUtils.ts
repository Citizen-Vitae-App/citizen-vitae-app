import { addDays, addWeeks, addMonths, addYears, isBefore, isEqual, startOfDay } from 'date-fns';

export interface RecurrenceConfig {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  weekDays: string[];
  endType: 'on_date' | 'after_occurrences';
  endDate?: Date;
  occurrences?: number;
}

export interface OccurrenceDate {
  start: Date;
  end: Date;
}

const DAY_NAME_TO_INDEX: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

const INDEX_TO_DAY_NAME: Record<number, string> = {
  0: 'sun',
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
  6: 'sat',
};

/**
 * Gets the day name (mon, tue, etc.) from a Date object
 */
export function getDayName(date: Date): string {
  return INDEX_TO_DAY_NAME[date.getDay()];
}

/**
 * Generates all occurrence dates for a recurring event
 * Limited to MAX_OCCURRENCES (52) for safety
 */
export function generateOccurrenceDates(
  startDate: Date,
  endDate: Date,
  recurrence: RecurrenceConfig
): OccurrenceDate[] {
  const MAX_OCCURRENCES = 52;
  const occurrences: OccurrenceDate[] = [];
  const duration = endDate.getTime() - startDate.getTime();
  
  const maxOccurrences = recurrence.endType === 'after_occurrences'
    ? Math.min(recurrence.occurrences || MAX_OCCURRENCES, MAX_OCCURRENCES)
    : MAX_OCCURRENCES;

  // For weekly frequency, we need to iterate through each week and check each selected day
  if (recurrence.frequency === 'weekly' && recurrence.weekDays.length > 0) {
    return generateWeeklyOccurrences(startDate, duration, recurrence, maxOccurrences);
  }

  // For other frequencies (daily, monthly, yearly)
  let currentStart = new Date(startDate);
  
  while (occurrences.length < maxOccurrences) {
    // Check if we've passed the end date
    if (recurrence.endType === 'on_date' && recurrence.endDate) {
      if (isBefore(recurrence.endDate, startOfDay(currentStart))) {
        break;
      }
    }

    // Add this occurrence
    occurrences.push({
      start: new Date(currentStart),
      end: new Date(currentStart.getTime() + duration),
    });

    // Advance to next occurrence based on frequency
    currentStart = advanceDate(currentStart, recurrence.frequency, recurrence.interval);
  }

  return occurrences;
}

/**
 * Generates occurrences for weekly frequency with specific days selected
 */
function generateWeeklyOccurrences(
  startDate: Date,
  duration: number,
  recurrence: RecurrenceConfig,
  maxOccurrences: number
): OccurrenceDate[] {
  const occurrences: OccurrenceDate[] = [];
  
  // Sort selected days by day index
  const selectedDayIndices = recurrence.weekDays
    .map(day => DAY_NAME_TO_INDEX[day])
    .sort((a, b) => a - b);

  // Start from the beginning of the week containing startDate
  let currentDate = new Date(startDate);
  const startDayIndex = startDate.getDay();
  
  // Find the starting day index in selected days
  let weekOffset = 0;

  while (occurrences.length < maxOccurrences) {
    // Calculate the actual week start based on interval
    const weekStart = addWeeks(startDate, weekOffset * recurrence.interval);
    
    for (const dayIndex of selectedDayIndices) {
      if (occurrences.length >= maxOccurrences) break;

      // Calculate the date for this day in this week
      const dayOffset = dayIndex - startDate.getDay();
      let occurrenceDate = addDays(weekStart, dayOffset);

      // Skip dates before the original start date
      if (isBefore(occurrenceDate, startOfDay(startDate)) && !isEqual(startOfDay(occurrenceDate), startOfDay(startDate))) {
        continue;
      }

      // Check if we've passed the end date
      if (recurrence.endType === 'on_date' && recurrence.endDate) {
        if (isBefore(recurrence.endDate, startOfDay(occurrenceDate))) {
          return occurrences;
        }
      }

      // Preserve the original time from startDate
      occurrenceDate.setHours(
        startDate.getHours(),
        startDate.getMinutes(),
        startDate.getSeconds(),
        startDate.getMilliseconds()
      );

      occurrences.push({
        start: new Date(occurrenceDate),
        end: new Date(occurrenceDate.getTime() + duration),
      });
    }

    weekOffset++;

    // Safety check to prevent infinite loops
    if (weekOffset > 200) break;
  }

  return occurrences;
}

/**
 * Advances a date by the specified frequency and interval
 */
function advanceDate(
  date: Date,
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly',
  interval: number
): Date {
  switch (frequency) {
    case 'daily':
      return addDays(date, interval);
    case 'weekly':
      return addWeeks(date, interval);
    case 'monthly':
      return addMonths(date, interval);
    case 'yearly':
      return addYears(date, interval);
    default:
      return addDays(date, interval);
  }
}

/**
 * Generates a unique recurrence group ID
 */
export function generateRecurrenceGroupId(): string {
  return crypto.randomUUID();
}
