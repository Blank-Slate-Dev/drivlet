// src/lib/roster.ts
// Utility functions for the fortnightly roster system

/**
 * Returns the Monday that starts the current fortnight.
 * Drivlet fortnights are anchored to the first Monday of the year,
 * with 14-day periods rolling forward from there.
 */
export function getCurrentFortnightStart(date: Date = new Date()): Date {
  const year = date.getFullYear();

  // Find the first Monday of the year
  const jan1 = new Date(year, 0, 1);
  const jan1Day = jan1.getDay(); // 0=Sun, 1=Mon, ...
  const daysToFirstMonday = jan1Day === 0 ? 1 : jan1Day === 1 ? 0 : 8 - jan1Day;
  const firstMonday = new Date(year, 0, 1 + daysToFirstMonday);

  // How many ms have elapsed since the first Monday?
  const msPerFortnight = 14 * 24 * 60 * 60 * 1000;
  const elapsed = date.getTime() - firstMonday.getTime();

  if (elapsed < 0) {
    // Date is before the first Monday of the year — use the previous year's anchor
    return getCurrentFortnightStart(new Date(year - 1, 11, 31));
  }

  const fortnightsElapsed = Math.floor(elapsed / msPerFortnight);
  const start = new Date(firstMonday.getTime() + fortnightsElapsed * msPerFortnight);

  // Normalise to midnight UTC
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * Returns an array of 14 Date objects for the fortnight starting at periodStart.
 */
export function getFortnightDates(periodStart: Date): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(periodStart);
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    dates.push(d);
  }
  return dates;
}

/**
 * Formats a shift time range, e.g. "08:00–16:30"
 */
export function formatShiftTime(start: string, end: string): string {
  return `${start}–${end}`;
}

/**
 * Calculates total hours across all shifts.
 * Handles times crossing midnight by treating endTime > startTime as same day.
 */
export function calculateTotalHours(
  shifts: { startTime: string; endTime: string }[]
): number {
  let totalMinutes = 0;

  for (const shift of shifts) {
    const [startH, startM] = shift.startTime.split(':').map(Number);
    const [endH, endM] = shift.endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const diff = endMinutes > startMinutes ? endMinutes - startMinutes : 0;
    totalMinutes += diff;
  }

  return Math.round((totalMinutes / 60) * 10) / 10;
}

/**
 * Returns the periodEnd date (periodStart + 13 days).
 */
export function getPeriodEnd(periodStart: Date): Date {
  const end = new Date(periodStart);
  end.setDate(end.getDate() + 13);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Formats a date range as a human-readable string.
 * e.g. "Mon 10 Mar — Sun 23 Mar 2026"
 */
export function formatPeriodRange(periodStart: Date, periodEnd: Date): string {
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  };
  const optsWithYear: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };
  const start = periodStart.toLocaleDateString('en-AU', opts);
  const end = periodEnd.toLocaleDateString('en-AU', optsWithYear);
  return `${start} — ${end}`;
}

/**
 * Returns all 30-minute time slot strings from 06:00 to 22:00.
 */
export function getTimeOptions(): string[] {
  const options: string[] = [];
  for (let h = 6; h <= 22; h++) {
    options.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 22) options.push(`${String(h).padStart(2, '0')}:30`);
  }
  return options;
}
