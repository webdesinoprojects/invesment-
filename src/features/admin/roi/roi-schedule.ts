const INDIA_OFFSET_MINUTES = 330;
const AUTOMATIC_ROI_ALERT_HOUR = 2;
const ROI_STALLED_AFTER_MS = 20 * 60 * 1000;

export function isAutomaticRoiExpected(now: Date): boolean {
  const indiaTime = new Date(
    now.getTime() + INDIA_OFFSET_MINUTES * 60 * 1000,
  );
  return indiaTime.getUTCHours() >= AUTOMATIC_ROI_ALERT_HOUR;
}

export function isRoiRunStalled(startedAt: Date, now: Date): boolean {
  return now.getTime() - startedAt.getTime() > ROI_STALLED_AFTER_MS;
}
