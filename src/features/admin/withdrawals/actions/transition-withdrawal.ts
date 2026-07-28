"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPermission } from "@/server/permissions/admin-permissions";
import type { AdminActionResult } from "../../shared/action-result";
import { transitionWithdrawalSchema } from "../schemas/transition-withdrawal";
import { transitionWithdrawal } from "../services/transition-withdrawal";

export async function transitionWithdrawalAction(_state: AdminActionResult, formData: FormData): Promise<AdminActionResult> {
  const parsed = transitionWithdrawalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, code: "VALIDATION", message: "Check the withdrawal details.", fieldErrors: parsed.error.flatten().fieldErrors };
  const admin = await requireAdminPermission("withdrawals.process");
  try {
    const result = await transitionWithdrawal({ ...parsed.data, adminId: admin.adminId });
    if (!result.ok) return { ok: false, code: result.code, message: result.code === "DUPLICATE_HASH" ? "That payment hash is already recorded." : "The withdrawal changed or cannot use this transition." };
    revalidatePath("/admin");
    return { ok: true, data: undefined, message: "Withdrawal updated successfully." };
  } catch {
    return { ok: false, code: "FAILED", message: "The withdrawal could not be updated." };
  }
}
