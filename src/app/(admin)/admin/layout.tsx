import type { ReactNode } from "react";
import { connection } from "next/server";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/admin/session";
import { getPrisma } from "@/lib/db/prisma";
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await connection();
  const session = await requireAdmin();
  const prisma = getPrisma();
  const [deposits, withdrawals, members] = await Promise.all([
    prisma.depositRequest.count({ where: { status: "PENDING" } }),
    prisma.withdrawalRequest.count({ where: { status: { in: ["PENDING", "PROCESSING"] } } }),
    prisma.userProfile.count({ where: { status: "PENDING" } }),
  ]);
  return <AdminShell session={session} pendingActions={deposits + withdrawals + members}>{children}</AdminShell>;
}
