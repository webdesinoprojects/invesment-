const INDIA_OFFSET_MINUTES = 330;
const MINUTE_MS = 60_000;

function getIndiaCalendarParts(date: Date): {
  year: number;
  month: number;
  day: number;
} {
  const indiaTime = new Date(date.getTime() + INDIA_OFFSET_MINUTES * MINUTE_MS);
  return {
    year: indiaTime.getUTCFullYear(),
    month: indiaTime.getUTCMonth(),
    day: indiaTime.getUTCDate(),
  };
}

function formatDateKey(year: number, month: number, day: number): string {
  return `${year.toString().padStart(4, "0")}-${(month + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

export function getIndiaDateKey(date = new Date()): string {
  const { year, month, day } = getIndiaCalendarParts(date);
  return formatDateKey(year, month, day);
}

export function getIndiaDateValue(date = new Date()): Date {
  return new Date(`${getIndiaDateKey(date)}T00:00:00.000Z`);
}

export function addMonthsToIndiaDateKey(date: Date, months: number): string {
  const parts = getIndiaCalendarParts(date);
  const targetMonthStart = new Date(Date.UTC(parts.year, parts.month + months, 1));
  const year = targetMonthStart.getUTCFullYear();
  const month = targetMonthStart.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  return formatDateKey(year, month, Math.min(parts.day, lastDay));
}

export function getIndiaBusinessDayBounds(date = new Date()): {
  start: Date;
  end: Date;
} {
  const indiaTime = new Date(date.getTime() + INDIA_OFFSET_MINUTES * MINUTE_MS);
  const start = new Date(
    Date.UTC(
      indiaTime.getUTCFullYear(),
      indiaTime.getUTCMonth(),
      indiaTime.getUTCDate(),
    ) -
      INDIA_OFFSET_MINUTES * MINUTE_MS,
  );

  return { start, end: new Date(start.getTime() + 24 * 60 * MINUTE_MS) };
}
