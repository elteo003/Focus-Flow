import { describe, expect, it } from 'vitest';
import { generateRecurringDates, getNextOccurrence, type RecurrenceType } from './recurrence';

const toDate = (value: string) => new Date(value);

describe('recurrence utilities', () => {
  it('generates daily recurrences respecting count', () => {
    const dates = generateRecurringDates('2025-01-01', 'daily', undefined, 3);
    expect(dates).toEqual(['2025-01-01', '2025-01-02', '2025-01-03']);
  });

  it('stops recurrence at end date boundary', () => {
    const dates = generateRecurringDates('2025-01-01', 'weekly', '2025-01-15');
    expect(dates).toEqual(['2025-01-01', '2025-01-08', '2025-01-15']);
  });

  it.each<RecurrenceType>(['none', 'daily', 'weekly', 'monthly'])('computes next occurrence for %s', recurrence => {
    const base = '2025-05-10';
    const next = getNextOccurrence(base, recurrence);

    if (recurrence === 'none') {
      expect(next).toBeNull();
      return;
    }

    expect(next).not.toBeNull();
    const nextDate = toDate(next ?? '');
    const baseDate = toDate(base);
    expect(nextDate.getTime()).toBeGreaterThan(baseDate.getTime());
  });
});
