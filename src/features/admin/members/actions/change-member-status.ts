"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPermission } from "@/server/permissions/admin-permissions";
import type { AdminActionResult } from "../../shared/action-result";
import { changeMemberStatusSchema } from "../schemas/change-member-status";
import { changeMemberStatus } from "../services/change-member-status";

export async function changeMemberStatusAction(_state: AdminActionResult, formData: FormData): Promise<AdminActionResult> {
  const parsed = changeMemberStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, code: "VALIDATION", message: "Check the member status details.", fieldErrors: parsed.error.flatten().fieldErrors };
  const admin = await requireAdminPermission("members.manage");
  try {
    const result = await changeMemberStatus({ ...parsed.data, adminId: admin.adminId });
    if (!result.ok) return { ok: false, code: result.code, message: result.code === "NOT_FOUND" ? "Member not found." : "Member already has this status." };
    revalidatePath("/admin");
    return { ok: true, data: undefined, message: parsed.data.status === "BLOCKED" ? "Member blocked." : "Member activated." };
  } catch {
    return { ok: false, code: "FAILED", message: "The member status could not be changed." };
  }
}
