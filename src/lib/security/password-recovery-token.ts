import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { getPasswordRecoverySecret } from "@/lib/env/server";

const TOKEN_LIFETIME_SECONDS = 15 * 60;

type RecoveryPayload = {
  sub: string;
  exp: number;
};

export function createPasswordRecoveryToken(userId: string): string | null {
  const secret = getPasswordRecoverySecret();
  if (!secret) return null;

  const payload: RecoveryPayload = {
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + TOKEN_LIFETIME_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

export function verifyPasswordRecoveryToken(token: string, userId: string): boolean {
  const secret = getPasswordRecoverySecret();
  if (!secret) return false;

  const [encodedPayload, suppliedSignature] = token.split(".");
  if (!encodedPayload || !suppliedSignature) return false;

  const expectedSignature = sign(encodedPayload, secret);
  const supplied = Buffer.from(suppliedSignature, "utf8");
  const expected = Buffer.from(expectedSignature, "utf8");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return false;

  try {
    const parsed = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as unknown;
    if (!isRecoveryPayload(parsed)) return false;
    return parsed.sub === userId && parsed.exp >= Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function isRecoveryPayload(value: unknown): value is RecoveryPayload {
  return typeof value === "object"
    && value !== null
    && "sub" in value
    && typeof value.sub === "string"
    && "exp" in value
    && typeof value.exp === "number";
}
