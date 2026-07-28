import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { getPrisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const prisma = getPrisma();
  const [members, deposits, withdrawals] = await Promise.all([
    prisma.userProfile.findMany({
      where: { status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 8,
      select: { id: true, fullName: true, memberId: true, createdAt: true },
    }),
    prisma.depositRequest.findMany({
      where: { status: "PENDING" }, orderBy: { submittedAt: "desc" }, take: 8,
      select: { id: true, amount: true, submittedAt: true, user: { select: { fullName: true, memberId: true } } },
    }),
    prisma.withdrawalRequest.findMany({
      where: { status: { in: ["PENDING", "PROCESSING"] } }, orderBy: { submittedAt: "desc" }, take: 8,
      select: { id: true, amount: true, status: true, submittedAt: true, user: { select: { fullName: true, memberId: true } } },
    }),
  ]);
  const items = [
    ...members.map((x) => ({ id: `member-${x.id}`, type: "MEMBER", title: "New member awaiting approval", detail: `${x.fullName} · ${x.memberId}`, href: "/admin/members/pending", createdAt: x.createdAt.toISOString() })),
    ...deposits.map((x) => ({ id: `deposit-${x.id}`, type: "DEPOSIT", title: "New deposit request", detail: `${x.user.fullName} · $${Number(x.amount).toLocaleString()}`, href: "/admin/deposits/pending", createdAt: x.submittedAt.toISOString() })),
    ...withdrawals.map((x) => ({ id: `withdrawal-${x.id}`, type: "WITHDRAWAL", title: `${x.status === "PROCESSING" ? "Processing" : "New"} withdrawal request`, detail: `${x.user.fullName} · $${Number(x.amount).toLocaleString()}`, href: x.status === "PROCESSING" ? "/admin/withdrawals/processing" : "/admin/withdrawals/pending", createdAt: x.submittedAt.toISOString() })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 15);
  const count = await Promise.all([
    prisma.userProfile.count({ where: { status: "PENDING" } }),
    prisma.depositRequest.count({ where: { status: "PENDING" } }),
    prisma.withdrawalRequest.count({ where: { status: { in: ["PENDING", "PROCESSING"] } } }),
  ]);
  return NextResponse.json({ count: count.reduce((sum, value) => sum + value, 0), items }, {
    headers: { "Cache-Control": "no-store" },
  });
}
