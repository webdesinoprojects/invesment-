import { timingSafeEqual } from "node:crypto";

import { runDailyRoi } from "@/features/roi/services/run-daily-roi";
import { getCronSecret } from "@/lib/env/server";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const secret = getCronSecret();
  if (!secret) {
    return Response.json({ ok: false, code: "CRON_NOT_CONFIGURED" }, { status: 503 });
  }
  if (!hasValidBearerToken(request, secret)) {
    return Response.json({ ok: false, code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const result = await runDailyRoi();
    const status = result.status === "FAILED" ? 500 : result.status === "RUNNING" ? 202 : 200;
    return Response.json(
      { ok: result.status !== "FAILED", ...result },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { ok: false, code: "ROI_RUN_FAILED" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

function hasValidBearerToken(request: Request, secret: string): boolean {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return false;

  const supplied = Buffer.from(authorization.slice(7), "utf8");
  const expected = Buffer.from(secret, "utf8");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
