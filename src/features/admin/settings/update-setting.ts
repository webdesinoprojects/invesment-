"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { configurationSchemas } from "@/features/settings/schemas/configuration";
import { requireAdminPermission } from "@/server/permissions/admin-permissions";

import type { AdminActionResult } from "../shared/action-result";
import { updateSystemSetting } from "./service";

const inputSchema = z.object({
  key: z.enum([
    "investment_configuration",
    "withdrawal_configuration",
    "deposit_configuration",
  ]),
  value: z.string().min(2).max(4000),
  version: z.coerce.number().int().positive(),
  reason: z.string().trim().min(3).max(500),
  confirmed: z.literal("true"),
});

export async function updateSettingAction(
  _state: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  const parsed = inputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "Check the setting value, version, reason and confirmation.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  let json: unknown;
  try {
    json = JSON.parse(parsed.data.value);
  } catch {
    return { ok: false, code: "INVALID_JSON", message: "The setting value is not valid JSON." };
  }
  const value = configurationSchemas[parsed.data.key].safeParse(json);
  if (!value.success) {
    return {
      ok: false,
      code: "INVALID_SETTING",
      message: value.error.issues[0]?.message ?? "The setting does not match its supported schema.",
    };
  }
  const admin = await requireAdminPermission("settings.manage");
  try {
    const result = await updateSystemSetting({
      key: parsed.data.key,
      value: value.data,
      version: parsed.data.version,
      reason: parsed.data.reason,
      adminId: admin.adminId,
    });
    if (!result.ok) {
      return {
        ok: false,
        code: result.code,
        message:
          result.code === "NOT_FOUND"
            ? "This setting does not exist."
            : "This setting changed. Refresh before saving again.",
      };
    }
    revalidatePath("/admin/settings");
    return {
      ok: true,
      data: undefined,
      message: "Setting updated with a revision and audit record.",
    };
  } catch {
    return { ok: false, code: "FAILED", message: "The setting could not be updated." };
  }
}
