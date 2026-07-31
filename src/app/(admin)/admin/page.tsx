import Link from "next/link";
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, CheckCircle2, Clock3, CircleDollarSign, Network, ShieldAlert, TrendingUp, UserCheck, Users, WalletCards } from "lucide-react";
import { DashboardCharts } from "@/components/admin/dashboard-charts";
import { getPrisma } from "@/lib/db/prisma";
import { formatDecimalCurrency } from "@/features/admin/shared/format-decimal";
import { Prisma } from "@/generated/prisma/client";
import { getIndiaBusinessDayBounds } from "@/lib/date/business-day";
import { getTodayRoiStatus } from "@/features/admin/roi/get-today-roi-status";
import { TodayRoiStatusCard } from "@/features/admin/roi/today-roi-status-card";

const money = (value: { toString(): string } | string | null | undefined) => formatDecimalCurrency(value);
const date = (value: Date) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(value);

export default async function AdminDashboard() {
  const prisma = getPrisma();
  const now = new Date(); const today = getIndiaBusinessDayBounds(now);
  const todayRoiStatusPromise = getTodayRoiStatus(now);
  const months = Array.from({ length: 6 }, (_, index) => {
    const start = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - 4 + index, 1);
    return { start, end, label: start.toLocaleString("en", { month: "short" }) };
  });
  const [
    totalMembers, activeMembers, pendingMembers, blockedMembers, newToday,
    pendingDeposits, pendingWithdrawals, processingWithdrawals, failedWithdrawals, failedRoi,
    investments, approvedDeposits, paidWithdrawals, incomes, registrations, deposits, withdrawals, audits, walletBalances,
    monthly,
  ] = await Promise.all([
    prisma.userProfile.count(), prisma.userProfile.count({where:{status:"ACTIVE"}}), prisma.userProfile.count({where:{status:"PENDING"}}), prisma.userProfile.count({where:{status:"BLOCKED"}}), prisma.userProfile.count({where:{createdAt:{gte:today.start,lt:today.end}}}),
    prisma.depositRequest.aggregate({where:{status:"PENDING"},_count:true,_sum:{amount:true}}),
    prisma.withdrawalRequest.aggregate({where:{status:"PENDING"},_count:true,_sum:{amount:true}}),
    prisma.withdrawalRequest.count({where:{status:"PROCESSING"}}), prisma.withdrawalRequest.count({where:{status:"FAILED"}}), prisma.roiRun.count({where:{status:"FAILED"}}),
    prisma.investment.aggregate({where:{status:"ACTIVE"},_sum:{amount:true}}),
    prisma.depositRequest.aggregate({where:{status:"APPROVED"},_sum:{approvedAmount:true}}),
    prisma.withdrawalRequest.aggregate({where:{status:"PAID"},_sum:{netAmount:true}}),
    prisma.incomeLedgerEntry.groupBy({by:["type"],where:{status:"CREDITED"},_sum:{amount:true}}),
    prisma.userProfile.findMany({take:5,orderBy:{createdAt:"desc"},select:{id:true,memberId:true,fullName:true,email:true,status:true,createdAt:true}}),
    prisma.depositRequest.findMany({take:5,orderBy:{submittedAt:"desc"},include:{user:{select:{fullName:true,memberId:true}}}}),
    prisma.withdrawalRequest.findMany({take:5,orderBy:{submittedAt:"desc"},include:{user:{select:{fullName:true,memberId:true}}}}),
    prisma.auditLog.findMany({take:5,orderBy:{createdAt:"desc"}}),
    prisma.walletLedgerEntry.findMany({distinct:["userId"],orderBy:[{userId:"asc"},{sequence:"desc"}],select:{balanceAfter:true}}),
    Promise.all(months.map(async (m) => {
      const [members, dep, wit] = await Promise.all([
        prisma.userProfile.count({where:{createdAt:{gte:m.start,lt:m.end}}}),
        prisma.depositRequest.aggregate({where:{status:"APPROVED",reviewedAt:{gte:m.start,lt:m.end}},_sum:{approvedAmount:true}}),
        prisma.withdrawalRequest.aggregate({where:{status:"PAID",paidAt:{gte:m.start,lt:m.end}},_sum:{netAmount:true}}),
      ]);
      return {
        label: m.label,
        members,
        deposits: (dep._sum.approvedAmount ?? new Prisma.Decimal(0)).toFixed(6),
        withdrawals: (wit._sum.netAmount ?? new Prisma.Decimal(0)).toFixed(6),
      };
    })),
  ]);
  const income = Object.fromEntries(incomes.map((row) => [row.type, row._sum.amount ?? new Prisma.Decimal(0)]));
  const totalWalletBalance = walletBalances.reduce((sum, entry) => sum.plus(entry.balanceAfter), new Prisma.Decimal(0));
  const todayRoiStatus = await todayRoiStatusPromise;
  const cards = [
    ["Total members",totalMembers,Users,"text-blue-600 bg-blue-50"],["Active members",activeMembers,UserCheck,"text-emerald-600 bg-emerald-50"],["Pending members",pendingMembers,Clock3,"text-amber-600 bg-amber-50"],["Blocked members",blockedMembers,ShieldAlert,"text-red-600 bg-red-50"],
    ["New today",newToday,TrendingUp,"text-violet-600 bg-violet-50"],["Wallet balance",money(totalWalletBalance),WalletCards,"text-indigo-600 bg-indigo-50"],["Active investment",money(investments._sum.amount),CircleDollarSign,"text-emerald-600 bg-emerald-50"],["Approved deposits",money(approvedDeposits._sum.approvedAmount),ArrowDownToLine,"text-cyan-600 bg-cyan-50"],["Pending deposits",money(pendingDeposits._sum.amount),Clock3,"text-amber-600 bg-amber-50"],
    ["Paid withdrawals",money(paidWithdrawals._sum.netAmount),ArrowUpFromLine,"text-slate-700 bg-slate-100"],["Pending withdrawals",money(pendingWithdrawals._sum.amount),Clock3,"text-orange-600 bg-orange-50"],["ROI distributed",money(income.DAILY_ROI),TrendingUp,"text-lime-700 bg-lime-50"],["Referral income",money((income.DIRECT_REFERRAL??new Prisma.Decimal(0)).plus(income.LEVEL_INCOME??new Prisma.Decimal(0))),Network,"text-fuchsia-600 bg-fuchsia-50"],
  ] as const;
  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-600">Command center</p><h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">Dashboard overview</h1><p className="mt-1 text-sm text-slate-500">Financial and operational records from the connected database.</p></div><span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"><CheckCircle2 className="mr-1 inline size-4"/>Queried {new Date().toLocaleTimeString("en",{hour:"2-digit",minute:"2-digit"})}</span></div>
      <TodayRoiStatusCard status={todayRoiStatus} />
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4 2xl:grid-cols-6">{cards.map(([label,value,Icon,color])=><div key={label} className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 p-3 shadow-[0_4px_16px_rgba(15,23,42,.06)] transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_10px_28px_rgba(15,23,42,.1)] sm:p-4"><span className="absolute -right-5 -top-5 size-16 rounded-full bg-emerald-100/40 transition group-hover:scale-125" /><div className={`relative grid size-8 place-items-center rounded-xl ring-1 ring-black/5 sm:size-9 ${color}`}><Icon className="size-4"/></div><p className="relative mt-3 truncate text-[11px] font-semibold text-slate-500 sm:mt-4 sm:text-xs">{label}</p><p className="relative mt-1 break-words text-[clamp(.9rem,4vw,1.25rem)] font-extrabold leading-tight tracking-tight text-slate-950">{value}</p></div>)}</div>
      <DashboardCharts data={monthly} statuses={[{name:"Active",value:activeMembers},{name:"Pending",value:pendingMembers},{name:"Blocked",value:blockedMembers}]} />
      <div className="grid gap-5 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2"><h2 className="font-bold">Pending work</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{[
          ["Deposit requests",pendingDeposits._count,"/admin/deposits/pending"],["Withdrawal requests",pendingWithdrawals._count,"/admin/withdrawals/pending"],["Processing withdrawals",processingWithdrawals,"/admin/withdrawals/processing"],["Pending member approvals",pendingMembers,"/admin/members/pending"],["Failed withdrawals",failedWithdrawals,"/admin/withdrawals/history"],["Failed ROI runs",failedRoi,"/admin/roi/history"],
        ].map(([label,count,href])=><Link key={label} href={String(href)} className="flex items-center justify-between rounded-xl border border-slate-200 p-4 hover:border-emerald-400"><span className="text-sm font-medium">{label}</span><strong className="rounded-lg bg-slate-100 px-2.5 py-1 text-sm">{count}</strong></Link>)}</div></section>
        <section className="rounded-2xl bg-slate-950 p-5 text-white shadow-sm"><h2 className="font-bold">System alerts</h2><div className="mt-4 space-y-3">{failedRoi>0&&<p className="rounded-xl bg-red-500/15 p-3 text-sm text-red-200"><AlertTriangle className="mr-2 inline size-4"/>{failedRoi} failed ROI {failedRoi===1?"run":"runs"} in database</p>}{pendingDeposits._count>10&&<p className="rounded-xl bg-amber-500/15 p-3 text-sm text-amber-200"><Clock3 className="mr-2 inline size-4"/>{pendingDeposits._count} deposits awaiting review</p>}{failedRoi===0&&pendingDeposits._count<=10&&<p className="rounded-xl bg-white/10 p-3 text-sm text-slate-300">No alert conditions found in current database records.</p>}</div><div className="mt-5 grid grid-cols-2 gap-2">{[["Find member","/admin/members"],["Approve deposits","/admin/deposits/pending"],["Process payouts","/admin/withdrawals/pending"],["System health","/admin/system-health"]].map(([l,h])=><Link key={l} href={String(h)} className="rounded-lg bg-white/10 px-3 py-2 text-center text-xs hover:bg-white/15">{l}</Link>)}</div></section>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Table title="Recent registrations" headers={["Member","Email","Status","Date"]} rows={registrations.map(x=>[`${x.fullName} · ${x.memberId}`,x.email,x.status,date(x.createdAt)])}/>
        <Table title="Latest deposit requests" headers={["Member","Transaction","Amount","Status"]} rows={deposits.map(x=>[`${x.user.fullName} · ${x.user.memberId}`,x.transactionHash?.slice(0,14)??"Not supplied",money(x.amount),x.status])}/>
        <Table title="Latest withdrawal requests" headers={["Member","Wallet","Amount","Status"]} rows={withdrawals.map(x=>[`${x.user.fullName} · ${x.user.memberId}`,`${x.walletAddress.slice(0,12)}…`,money(x.amount),x.status])}/>
        <Table title="Recent audit activity" headers={["Action","Entity","Outcome","Date"]} rows={audits.map(x=>[x.action,x.entityType,x.outcome,date(x.createdAt)])}/>
      </div>
    </div>
  );
}
function Table({title,headers,rows}:{title:string;headers:string[];rows:string[][]}) {
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h2 className="font-bold">{title}</h2></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{headers.map(x=><th key={x} className="px-5 py-3 font-semibold">{x}</th>)}</tr></thead><tbody>{rows.length?rows.map((row,i)=><tr key={i} className="border-t border-slate-100">{row.map((cell,j)=><td key={j} className="whitespace-nowrap px-5 py-3">{cell}</td>)}</tr>):<tr><td colSpan={headers.length} className="px-5 py-8 text-center text-slate-400">No records available</td></tr>}</tbody></table></div></section>;
}
