import { formatDate } from './dateUtils';

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
  count?: number,
): string[] => {
  const dates: string[] = [startDate];
  const start = new Date(startDate);
  const currentDate = new Date(start);
  let iterations = 0;
  const maxIterations = 365; // Safety limit

  if (recurrence === 'none') {
    return [startDate];
  }

  const end = endDate ? new Date(endDate) : null;

  while (iterations < maxIterations) {
    iterations += 1;

    switch (recurrence) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      default:
        break;
    }

    if (end && currentDate > end) {
      break;
    }

    if (count && dates.length >= count) {
      break;
    }

    dates.push(formatDate(currentDate));
  }

  return dates;
};

export const getNextOccurrence = (
  date: string,
  recurrence: RecurrenceType,
): string | null => {
  if (recurrence === 'none') {
    return null;
  }

  const nextDate = new Date(date);

  switch (recurrence) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    default:
      break;
  }

  return formatDate(nextDate);
};

