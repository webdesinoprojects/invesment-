export const ADMIN_LOGIN_MAX_FAILURES = 5;
export const ADMIN_LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const ADMIN_LOGIN_BLOCK_MS = 15 * 60 * 1000;

export function evaluateLoginRateLimit(
  throttle: {
    failureCount: number;
    windowStartedAt: Date;
    blockedUntil: Date | null;
  } | null,
  now: Date,
) {
  if (!throttle) return { allowed: true, remaining: ADMIN_LOGIN_MAX_FAILURES };
  if (throttle.blockedUntil && throttle.blockedUntil > now) {
    return { allowed: false, remaining: 0 };
  }
  if (now.getTime() - throttle.windowStartedAt.getTime() >= ADMIN_LOGIN_WINDOW_MS) {
    return { allowed: true, remaining: ADMIN_LOGIN_MAX_FAILURES };
  }
  return {
    allowed: throttle.failureCount < ADMIN_LOGIN_MAX_FAILURES,
    remaining: Math.max(0, ADMIN_LOGIN_MAX_FAILURES - throttle.failureCount),
  };
}
