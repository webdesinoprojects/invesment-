"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { runDailyRoi } from "@/features/roi/services/run-daily-roi";
import { getPrisma } from "@/lib/db/prisma";
import { requireAdminPermission } from "@/server/permissions/admin-permissions";

import type { AdminActionResult } from "../shared/action-result";

const schema = z.object({ date: z.iso.date(), confirmed: z.literal("true") });

export async function runManualRoiAction(
  _state: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "Choose a valid ROI business date and confirm the run.",
    };
  }

  const admin = await requireAdminPermission("roi.run");
  const runDate = new Date(`${parsed.data.date}T06:30:00.000Z`);
  if (runDate.getTime() > Date.now()) {
    return { ok: false, code: "FUTURE_DATE", message: "ROI cannot run for a future date." };
  }

  try {
    const result = await runDailyRoi(runDate, admin.adminId);
    if (!result.executed) {
      return {
        ok: true,
        data: undefined,
        message: result.alreadyCompleted
          ? "This business date was already completed. No new work or audit entry was created."
          : "A run for this business date is already active. No duplicate work was started.",
      };
    }

    await getPrisma().auditLog.create({
      data: {
        actorAdminId: admin.adminId,
        action: "ROI_MANUAL_RUN",
        entityType: "RoiRun",
        entityId: parsed.data.date,
        outcome: result.status === "FAILED" ? "FAILED" : "SUCCESS",
        after: {
          status: result.status,
          processed: result.processed,
          credited: result.credited,
          failed: result.failed,
        },
      },
    });
    revalidatePath("/admin");

    if (result.status === "FAILED") {
      return {
        ok: true,
        data: undefined,
        message:
          `ROI applied ${result.credited} successful credits and ${result.failed} failed. ` +
          "Successful credits remain applied; retry processes only missing credits.",
      };
    }
    return {
      ok: true,
      data: undefined,
      message: `ROI completed: ${result.credited} credits, ${result.failed} failed.`,
    };
  } catch {
    await getPrisma().auditLog.create({
      data: {
        actorAdminId: admin.adminId,
        action: "ROI_MANUAL_RUN",
        entityType: "RoiRun",
        entityId: parsed.data.date,
        outcome: "FAILED",
        errorCode: "RUN_ABORTED",
      },
    }).catch(() => undefined);
    return {
      ok: false,
      code: "FAILED",
      message: "The ROI run aborted. Review run history before retrying.",
    };
  }
}
