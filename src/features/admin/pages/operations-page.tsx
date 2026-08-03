import { AdminListing as Listing } from "@/components/admin/admin-listing";
import { can } from "@/features/admin/permissions";
import { getPrisma } from "@/lib/db/prisma";
import { requireAdminPermission } from "@/server/permissions/admin-permissions";

import {
  AdministratorControls,
  InviteAdministratorForm,
} from "../administrators/components";
import { getSystemHealth } from "../health/get-system-health";
import {
  SettingCreator,
  type RequiredSettingKey,
} from "../settings/setting-creator";
import { SettingEditor } from "../settings/setting-editor";
import { adminDate } from "./format";
import type { AdminPageContext } from "./page-context";

export async function renderAuditPage(context: AdminPageContext) {
  await requireAdminPermission("audit.view");
  const data = await getPrisma().auditLog.findMany({
    ...(context.query
      ? {
          where: {
            OR: [
              { action: { contains: context.query, mode: "insensitive" as const } },
              { entityType: { contains: context.query, mode: "insensitive" as const } },
              { reason: { contains: context.query, mode: "insensitive" as const } },
            ],
          },
        }
      : {}),
    orderBy: { createdAt: "desc" },
    skip: context.skip,
    take: context.pageSize + 1,
    include: { actorAdmin: { select: { displayName: true } } },
  });
  return (
    <Listing
      pagination={{
        path: `/admin/${context.key}`,
        query: context.query,
        page: context.page,
        hasMore: data.length > context.pageSize,
      }}
      title="Audit logs"
      description="Permanent record of administrative and system actions."
      headers={["Action", "Entity", "Actor", "Outcome", "Reason", "Date"]}
      rows={data.slice(0, context.pageSize).map((audit) => ({
        cells: [
          audit.action,
          audit.entityType,
          audit.actorAdmin?.displayName ?? "System",
          audit.outcome,
          audit.reason ?? "—",
          adminDate(audit.createdAt),
        ],
      }))}
    />
  );
}

export async function renderSettingsPage(context: AdminPageContext) {
  await requireAdminPermission("settings.view");
  const data = await getPrisma().systemSetting.findMany({ orderBy: { key: "asc" } });
  const canManage = can(context.session.role, "settings.manage");
  const configuredKeys = new Set(data.map((setting) => setting.key));
  const missingKeys = ([
    "investment_configuration",
    "withdrawal_configuration",
    "deposit_configuration",
  ] satisfies RequiredSettingKey[]).filter((key) => !configuredKeys.has(key));
  return (
    <>
      {canManage && missingKeys.length ? (
        <section className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-bold text-amber-950">Required configuration is missing</h2>
          <p className="mt-1 text-xs text-amber-800">
            Initialize each missing setting before accepting live financial operations.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {missingKeys.map((key) => <SettingCreator key={key} settingKey={key} />)}
          </div>
        </section>
      ) : null}
      <Listing
        title="System settings"
        description="Strictly validated, versioned operational configuration."
        headers={["Key", "Value", "Version", "Description", "Updated", "Actions"]}
        rows={data.map((setting) => ({
          cells: [
            setting.key,
            JSON.stringify(setting.value),
            setting.version,
            setting.description ?? "—",
            adminDate(setting.updatedAt),
          ],
          action:
            canManage &&
            ["investment_configuration", "withdrawal_configuration", "deposit_configuration"].includes(
              setting.key,
            ) ? (
              <SettingEditor
                settingKey={setting.key}
                value={JSON.stringify(setting.value, null, 2)}
                version={setting.version}
              />
            ) : (
              <span className="text-xs text-slate-400">Read only</span>
            ),
        }))}
      />
    </>
  );
}

export async function renderAdministratorsPage(context: AdminPageContext) {
  await requireAdminPermission("administrators.view");
  const data = await getPrisma().adminProfile.findMany({ orderBy: { createdAt: "desc" } });
  const canManage = can(context.session.role, "administrators.manage");
  return (
    <>
      {canManage ? <InviteAdministratorForm /> : null}
      <Listing
        title="Administrators"
        description="Supabase-authenticated administrative identities and access roles."
        headers={["Name", "Email", "Role", "Active", "Last login", "Created", "Actions"]}
        rows={data.map((administrator) => ({
          cells: [
            administrator.displayName,
            administrator.email ?? "—",
            administrator.role,
            administrator.isActive ? "Yes" : "No",
            administrator.lastLoginAt ? adminDate(administrator.lastLoginAt) : "Never",
            adminDate(administrator.createdAt),
          ],
          action: canManage ? (
            <AdministratorControls
              id={administrator.id}
              name={administrator.displayName}
              role={administrator.role}
              isActive={administrator.isActive}
            />
          ) : (
            <span>View only</span>
          ),
        }))}
      />
    </>
  );
}

export async function renderRolesPage() {
  await requireAdminPermission("administrators.view");
  const roles = await getPrisma().adminProfile.groupBy({ by: ["role"], _count: true });
  return (
    <Listing
      title="Roles & permissions"
      description="Administrator role assignments currently stored in the database."
      headers={["Role", "Assigned administrators"]}
      rows={roles.map((role) => ({ cells: [role.role, role._count] }))}
    />
  );
}

export async function renderSystemHealthPage() {
  await requireAdminPermission("health.view");
  const health = await getSystemHealth();
  return (
    <Listing
      title="System health"
      description="Live operational checks without connection strings, keys or environment values."
      headers={["Check", "Current value"]}
      rows={[
        { cells: ["Database connectivity", `Successful · ${health.latencyMs} ms query batch`] },
        {
          cells: [
            "Scheduled ROI heartbeat",
            health.lastScheduled
              ? `${health.lastScheduled.status} · ${adminDate(health.lastScheduled.startedAt)}`
              : "No scheduled ROI heartbeat",
          ],
        },
        {
          cells: [
            "Last successful ROI",
            health.lastSuccess
              ? `${health.lastSuccess.runDate.toLocaleDateString()} · ${
                  health.lastSuccess.completedAt
                    ? adminDate(health.lastSuccess.completedAt)
                    : "completed"
                }`
              : "No successful ROI run",
          ],
        },
        {
          cells: [
            "Last failed ROI",
            health.lastFailure
              ? `${health.lastFailure.runDate.toLocaleDateString()} · ${
                  health.lastFailure.errorDetail ?? "No detail"
                }`
              : "No failed ROI run",
          ],
        },
        {
          cells: [
            "Missed ROI business dates (last 7)",
            health.missedRoiDates.length ? health.missedRoiDates.join(", ") : "None",
          ],
        },
        { cells: ["Stalled processing withdrawals (>24h)", health.stalledWithdrawals] },
        { cells: ["Overdue pending deposits (>24h)", health.overdueDeposits] },
        { cells: ["Failed ROI runs (24h)", health.failedRuns] },
        {
          cells: [
            "Required settings",
            health.missingSettings.length
              ? `Missing: ${health.missingSettings.join(", ")}`
              : "All required settings present",
          ],
        },
        {
          cells: [
            "Invalid settings",
            health.invalidSettings.length
              ? health.invalidSettings.join(", ")
              : "All persisted settings validate",
          ],
        },
        {
          cells: [
            "Latest successful audit",
            health.lastAudit ? adminDate(health.lastAudit.createdAt) : "No successful audit record",
          ],
        },
        { cells: ["Application version", process.env.npm_package_version ?? "Not supplied by runtime"] },
      ]}
    />
  );
}
