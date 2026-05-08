import { format, startOfDay, parseISO } from 'date-fns';

/** YYYY-MM-DD in the device timezone. */
export function isoDate(date: Date = new Date()): string {
  return format(startOfDay(date), 'yyyy-MM-dd');
}

export function todayISO(): string {
  return isoDate(new Date());
}

export function parseDate(iso: string): Date {
  return parseISO(iso);
}
