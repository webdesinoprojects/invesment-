const INDIA_OFFSET_MINUTES = 330;
const MINUTE_MS = 60_000;

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
