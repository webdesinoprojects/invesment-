import "dotenv/config";

import { parseArgs } from "node:util";

import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";
import { z } from "zod";

const optionsSchema = z.object({
  email: z.email().trim().toLowerCase(),
  name: z.string().trim().min(2).max(120),
  redirectUrl: z.url().refine(
    (value) => new URL(value).protocol === "https:",
    "The invitation redirect must use HTTPS.",
  ),
});

const environmentSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().min(20),
  DATABASE_URL: z.string().min(20),
  DIRECT_URL: z.string().min(20).optional(),
});

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    name: { type: "string" },
    "redirect-url": { type: "string" },
  },
  strict: true,
});

const options = optionsSchema.safeParse({
  email: values.email,
  name: values.name,
  redirectUrl: values["redirect-url"],
});
if (!options.success) {
  throw new Error(
    "Usage: npm run admin:bootstrap -- --email admin@example.com --name \"Administrator\" --redirect-url https://example.com/admin/accept-invite",
  );
}

const environment = environmentSchema.safeParse(process.env);
if (!environment.success) {
  const fields = environment.error.issues.map((issue) => String(issue.path[0])).join(", ");
  throw new Error(`Missing or invalid bootstrap environment fields: ${fields}`);
}

const input = options.data;
const env = environment.data;
const database = new Client({ connectionString: env.DIRECT_URL ?? env.DATABASE_URL });
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
let invitedAuthUserId = null;

try {
  await database.connect();

  const existingProfiles = await database.query(
    `SELECT "authUserId", "email", "role", "isActive"
     FROM "admin_profiles"
     ORDER BY "createdAt" ASC`,
  );
  const existingTarget = existingProfiles.rows.find(
    (profile) => profile.email?.toLowerCase() === input.email,
  );

  if (existingTarget) {
    if (existingTarget.role !== "SUPER_ADMIN" || !existingTarget.isActive) {
      throw new Error("The requested email already has a non-active or non-super-admin profile.");
    }
    console.log(`Initial super admin already exists: ${input.email}`);
    process.exitCode = 0;
  } else if (existingProfiles.rowCount > 0) {
    throw new Error(
      "Bootstrap refused because an administrator profile already exists. Invite additional administrators from the admin console.",
    );
  } else {
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(input.email, {
      redirectTo: input.redirectUrl,
      data: { full_name: input.name, bootstrap_role: "SUPER_ADMIN" },
    });
    if (error || !data.user) {
      throw new Error(error?.message ?? "Supabase did not return an invited user.");
    }
    invitedAuthUserId = data.user.id;

    await database.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
    await database.query("LOCK TABLE admin_profiles IN EXCLUSIVE MODE");
    const concurrentProfile = await database.query(
      'SELECT "id" FROM "admin_profiles" LIMIT 1',
    );
    if (concurrentProfile.rowCount > 0) {
      throw new Error("Bootstrap refused because another administrator was created concurrently.");
    }

    const profile = await database.query(
      `INSERT INTO "admin_profiles" (
        "authUserId", "email", "displayName", "role", "isActive", "updatedAt"
      ) VALUES ($1, $2, $3, 'SUPER_ADMIN', true, CURRENT_TIMESTAMP)
      RETURNING "id"`,
      [invitedAuthUserId, input.email, input.name],
    );
    const profileId = profile.rows[0].id;

    await database.query(
      `INSERT INTO "audit_logs" (
        "actorType", "action", "entityType", "entityId", "reason", "after"
      ) VALUES ('SYSTEM', 'ADMIN_BOOTSTRAP', 'AdminProfile', $1, $2, $3::jsonb)`,
      [
        profileId,
        "Initial production super administrator bootstrap.",
        JSON.stringify({
          email: input.email,
          role: "SUPER_ADMIN",
          redirectUrl: input.redirectUrl,
        }),
      ],
    );
    await database.query("COMMIT");

    console.log(`Initial super-admin invitation sent to ${input.email}.`);
    console.log(`Invitation redirect: ${input.redirectUrl}`);
  }
} catch (error) {
  await database.query("ROLLBACK").catch(() => undefined);
  if (invitedAuthUserId) {
    const cleanup = await supabase.auth.admin.deleteUser(invitedAuthUserId);
    if (cleanup.error) {
      throw new AggregateError(
        [error, cleanup.error],
        "Bootstrap failed and the invited Supabase identity could not be removed. Manual reconciliation is required.",
      );
    }
  }
  throw error;
} finally {
  await database.end().catch(() => undefined);
}
