export const SESSION_PERSISTENCE_COOKIE = "np_session_persistence";
export const PERSISTENT_SESSION_MAX_AGE = 400 * 24 * 60 * 60;

export type SessionPersistence = "session" | "persistent";

export function parseSessionPersistence(
  value: string | undefined,
): SessionPersistence {
  return value === "persistent" ? "persistent" : "session";
}

export function applySessionPersistence<
  T extends { expires?: Date; maxAge?: number },
>(
  options: T,
  value: string,
  persistence: SessionPersistence,
): T {
  if (!value || persistence === "persistent") {
    return options;
  }

  const sessionOptions = { ...options };
  delete sessionOptions.expires;
  delete sessionOptions.maxAge;
  return sessionOptions;
}
