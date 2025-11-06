import { formatDate, parseTime, timeToMinutes, minutesToTime } from './dateUtils';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

export interface RecurrenceConfig {
  type: RecurrenceType;
  endDate?: string; // YYYY-MM-DD
  count?: number; // Number of occurrences
}

export const generateRecurringDates = (
  startDate: string,
  recurrence: RecurrenceType,
  endDate?: string,
  count?: number
): string[] => {
  const dates: string[] = [startDate];
  const start = new Date(startDate);
  let current = new Date(start);
  let iterations = 0;
  const maxIterations = 365; // Safety limit

  if (recurrence === 'none') {
    return [startDate];
  }

  const end = endDate ? new Date(endDate) : null;

  while (iterations < maxIterations) {
    iterations++;

    switch (recurrence) {
      case 'daily':
        current.setDate(current.getDate() + 1);
        break;
      case 'weekly':
        current.setDate(current.getDate() + 7);
        break;
      case 'monthly':
        current.setMonth(current.getMonth() + 1);
        break;
    }

    // Check if we've exceeded end date
    if (end && current > end) {
      break;
    }

    // Check if we've reached count limit
    if (count && dates.length >= count) {
      break;
    }

    dates.push(formatDate(current));
  }

  return dates;
};

export const getNextOccurrence = (
  date: string,
  recurrence: RecurrenceType
): string | null => {
  if (recurrence === 'none') {
    return null;
  }

  const current = new Date(date);
  const next = new Date(current);

  switch (recurrence) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
  }

  return formatDate(next);
};

