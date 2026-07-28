"use server";
import { revalidatePath } from "next/cache";
import { requireAdminPermission } from "@/server/permissions/admin-permissions";
import type { AdminActionResult } from "../../shared/action-result";
import { transitionInvestmentSchema } from "../schemas/transition-investment";
import { transitionInvestment } from "../services/transition-investment";

export async function transitionInvestmentAction(_state: AdminActionResult, formData: FormData): Promise<AdminActionResult> {
  const parsed = transitionInvestmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, code: "VALIDATION", message: "Check the lifecycle change.", fieldErrors: parsed.error.flatten().fieldErrors };
  const admin = await requireAdminPermission("investments.manage");
  try {
    const result = await transitionInvestment({ ...parsed.data, adminId: admin.adminId });
    if (!result.ok) return {
      ok: false,
      code: result.code,
      message:
        result.code === "NOT_FOUND"
          ? "Investment not found."
          : result.code === "CONFLICT"
            ? "The investment changed while this action was running. Refresh and try again."
            : "That lifecycle transition is not allowed.",
    };
    revalidatePath("/admin");
    return { ok: true, data: undefined, message: "Investment status updated." };
  } catch {
    return { ok: false, code: "FAILED", message: "Investment status could not be updated." };
  }
}
