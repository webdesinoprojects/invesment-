const BUSINESS_TIME_ZONE = "Asia/Kolkata";

export function getBusinessDayOfMonth(date = new Date()): number {
  const day = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    timeZone: BUSINESS_TIME_ZONE,
  }).format(date);

  return Number(day);
}

export function isWithdrawalOpen(allowedDays: number[], date = new Date()): boolean {
  return allowedDays.includes(getBusinessDayOfMonth(date));
}
