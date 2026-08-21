"use server";

import { revalidatePath } from "next/cache";
import type { AdminActionResult } from "../../shared/action-result";
import { reviewDepositSchema } from "../schemas/review-deposit";
import { reviewDeposit } from "../services/review-deposit";
import { requireAdminPermission } from "@/server/permissions/admin-permissions";

export async function reviewDepositAction(_state: AdminActionResult, formData: FormData): Promise<AdminActionResult> {
  const parsed = reviewDepositSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, code: "VALIDATION", message: "Check the review details.", fieldErrors: parsed.error.flatten().fieldErrors };
  const admin = await requireAdminPermission("deposits.review");
  try {
    const result = await reviewDeposit({ ...parsed.data, adminId: admin.adminId });
    if (!result.ok) return { ok: false, code: result.code, message: result.code === "NOT_FOUND" ? "Deposit request not found." : "This deposit was already reviewed." };
    revalidatePath("/admin");
    return { ok: true, data: undefined, message: "Legacy deposit request rejected." };
  } catch {
    return { ok: false, code: "FAILED", message: "The deposit review could not be completed." };
  }
}
