import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/admin/session";
import { reviewDeposit, updateInvestmentStatus, updateMemberStatus, updateWithdrawalStatus } from "@/features/admin/actions";

const money=(v:unknown)=>`$${Number(v??0).toLocaleString("en-US",{maximumFractionDigits:2})}`;
const when=(v:Date)=>new Intl.DateTimeFormat("en",{dateStyle:"medium",timeStyle:"short"}).format(v);
type Row={cells:(string|number)[];id?:string;action?:React.ReactNode};
function Listing({title,description,headers,rows}:{title:string;description:string;headers:string[];rows:Row[]}) {
 return <div className="mx-auto max-w-[1500px]"><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-600">Administration</p><h1 className="mt-1 text-3xl font-bold">{title}</h1><p className="mt-1 text-sm text-slate-500">{description}</p><div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{headers.map(h=><th key={h} className="whitespace-nowrap px-5 py-3">{h}</th>)}</tr></thead><tbody>{rows.length?rows.map((r,i)=><tr key={r.id??i} className="border-t border-slate-100">{r.cells.map((c,j)=><td key={j} className="whitespace-nowrap px-5 py-3">{c}</td>)}{r.action&&<td className="whitespace-nowrap px-5 py-3">{r.action}</td>}</tr>):<tr><td colSpan={headers.length} className="p-12 text-center text-slate-400">No records found in the database</td></tr>}</tbody></table></div></div></div>;
}
const Button=({children,tone="dark"}:{children:React.ReactNode;tone?:string})=><button className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tone==="green"?"bg-emerald-500 text-slate-950":tone==="red"?"bg-red-50 text-red-700":"bg-slate-950 text-white"}`}>{children}</button>;

export default async function AdminModulePage({params}:{params:Promise<{slug:string[]}>}) {
 const {slug}=await params; const key=slug.join("/"); const prisma=getPrisma(); const session=await requireAdmin();
 if(key.startsWith("members")){
  const status=key.endsWith("pending")?"PENDING":key.endsWith("blocked")?"BLOCKED":undefined;
  const data=await prisma.userProfile.findMany({...status?{where:{status}}:{},orderBy:{createdAt:"desc"},take:100,include:{_count:{select:{directReferrals:true,investments:true}}}});
  return <Listing title={status?`${status[0]}${status.slice(1).toLowerCase()} members`:"All members"} description="Review identities, account status and network activity." headers={["Member","Contact","Country","Team","Investments","Status","Joined","Actions"]} rows={data.map(x=>({id:x.id,cells:[`${x.fullName} · ${x.memberId}`,x.email,x.countryCode,x._count.directReferrals,x._count.investments,x.status,when(x.createdAt)],action:session.role!=="VIEWER"?<div className="flex gap-2">{x.status!=="ACTIVE"&&<form action={updateMemberStatus}><input type="hidden" name="id" value={x.id}/><input type="hidden" name="status" value="ACTIVE"/><Button tone="green">Activate</Button></form>}{x.status!=="BLOCKED"&&<form action={updateMemberStatus}><input type="hidden" name="id" value={x.id}/><input type="hidden" name="status" value="BLOCKED"/><Button tone="red">Block</Button></form>}</div>:<span>View only</span>}))}/>;
 }
 if(key.startsWith("deposits")){
  const pending=key.endsWith("pending"); const data=await prisma.depositRequest.findMany({...pending?{where:{status:"PENDING" as const}}:{},include:{user:true},orderBy:{submittedAt:"desc"},take:100});
  return <Listing title={pending?"Pending deposits":"Deposit history"} description="Verify QR payments and credit approved member wallets." headers={["Member","Amount","Network","Transaction","Status","Submitted","Actions"]} rows={data.map(x=>({id:x.id,cells:[`${x.user.fullName} · ${x.user.memberId}`,money(x.amount),x.network,x.transactionHash??"Not supplied",x.status,when(x.submittedAt)],action:x.status==="PENDING"&&session.role!=="VIEWER"?<div className="flex gap-2"><form action={reviewDeposit}><input type="hidden" name="id" value={x.id}/><input type="hidden" name="decision" value="APPROVE"/><Button tone="green">Approve</Button></form><form action={reviewDeposit}><input type="hidden" name="id" value={x.id}/><input type="hidden" name="decision" value="REJECT"/><Button tone="red">Reject</Button></form></div>:<span>Reviewed</span>}))}/>;
 }
 if(key.startsWith("withdrawals")){
  const status=key.endsWith("pending")?"PENDING":key.endsWith("processing")?"PROCESSING":undefined; const data=await prisma.withdrawalRequest.findMany({...status?{where:{status}}:{},include:{user:true},orderBy:{submittedAt:"desc"},take:100});
  return <Listing title={status==="PENDING"?"Pending withdrawals":status==="PROCESSING"?"Processing withdrawals":"Withdrawal history"} description="Manage the payout queue and manual payment lifecycle." headers={["Member","Amount","Net","Wallet","Status","Submitted","Actions"]} rows={data.map(x=>({id:x.id,cells:[`${x.user.fullName} · ${x.user.memberId}`,money(x.amount),money(x.netAmount),x.walletAddress,x.status,when(x.submittedAt)],action:session.role!=="VIEWER"&&["PENDING","PROCESSING","FAILED"].includes(x.status)?<div className="flex gap-2">{x.status!=="PROCESSING"&&<form action={updateWithdrawalStatus}><input type="hidden" name="id" value={x.id}/><input type="hidden" name="status" value="PROCESSING"/><Button>Process</Button></form>}{x.status==="PROCESSING"&&<form action={updateWithdrawalStatus}><input type="hidden" name="id" value={x.id}/><input type="hidden" name="status" value="PAID"/><Button tone="green">Paid</Button></form>}<form action={updateWithdrawalStatus}><input type="hidden" name="id" value={x.id}/><input type="hidden" name="status" value="REJECTED"/><Button tone="red">Reject</Button></form></div>:<span>Closed</span>}))}/>;
 }
 if(key.startsWith("investments")){
  const data=await prisma.investment.findMany({include:{user:true},orderBy:{createdAt:"desc"},take:100});
  return <Listing title={key.endsWith("activate")?"Manual activation":"All investments"} description="Monitor and control every active investment contract." headers={["Member","Amount","ROI","Duration","Paid out","Status","Activated","Actions"]} rows={data.map(x=>({id:x.id,cells:[`${x.user.fullName} · ${x.user.memberId}`,money(x.amount),`${x.monthlyRoiPercent}%`,`${x.durationMonths} months`,money(x.paidOutAmount),x.status,when(x.activatedAt)],action:session.role!=="VIEWER"?<form action={updateInvestmentStatus} className="flex gap-2"><input type="hidden" name="id" value={x.id}/><select name="status" defaultValue={x.status} className="rounded-lg border px-2 text-xs"><option>ACTIVE</option><option>PAUSED</option><option>COMPLETED</option><option>CANCELLED</option></select><Button>Save</Button></form>:<span>View only</span>}))}/>;
 }
 if(key==="wallet-ledger"){const data=await prisma.walletLedgerEntry.findMany({include:{user:true},orderBy:{sequence:"desc"},take:150});return <Listing title="Wallet ledger" description="Immutable member wallet movements and running balances." headers={["Sequence","Member","Direction","Category","Amount","Balance","Description","Date"]} rows={data.map(x=>({cells:[x.sequence.toString(),`${x.user.fullName} · ${x.user.memberId}`,x.direction,x.category,money(x.amount),money(x.balanceAfter),x.description,when(x.createdAt)]}))}/>;}
 if(key==="income-ledger"){const data=await prisma.incomeLedgerEntry.findMany({include:{user:true},orderBy:{creditedAt:"desc"},take:150});return <Listing title="Income ledger" description="ROI, direct, level, rank and salary income records." headers={["Member","Type","Amount","Level","Status","Description","Credited"]} rows={data.map(x=>({cells:[`${x.user.fullName} · ${x.user.memberId}`,x.type,money(x.amount),x.level??"—",x.status,x.description,when(x.creditedAt)]}))}/>;}
 if(key.startsWith("roi/")){const data=await prisma.roiRun.findMany({orderBy:{startedAt:"desc"},take:100});return <Listing title={key.endsWith("runs")?"ROI runs":"ROI run history"} description="Review scheduled and manual return distribution batches." headers={["Run date","Trigger","Processed","Credited","Failed","Status","Started"]} rows={data.map(x=>({cells:[x.runDate.toLocaleDateString(),x.trigger,x.processed,x.credited,x.failed,x.status,when(x.startedAt)]}))}/>;}
 if(key==="audit-logs"){const data=await prisma.auditLog.findMany({orderBy:{createdAt:"desc"},take:200,include:{actorAdmin:true}});return <Listing title="Audit logs" description="Permanent record of administrative and system actions." headers={["Action","Entity","Actor","Outcome","Reason","Date"]} rows={data.map(x=>({cells:[x.action,x.entityType,x.actorAdmin?.displayName??"System",x.outcome,x.reason??"—",when(x.createdAt)]}))}/>;}
 if((key==="settings"||key==="administrators"||key==="roles")&&session.role!=="SUPER_ADMIN") notFound();
 if(key==="administrators"){const data=await prisma.adminProfile.findMany({orderBy:{createdAt:"desc"}});return <Listing title="Administrators" description="Administrative identities and access roles." headers={["Name","Email","Role","Active","Last login","Created"]} rows={data.map(x=>({cells:[x.displayName,x.email??"—",x.role,x.isActive?"Yes":"No",x.lastLoginAt?when(x.lastLoginAt):"Never",when(x.createdAt)]}))}/>;}
 if(key==="settings"){const data=await prisma.systemSetting.findMany({orderBy:{key:"asc"}});return <Listing title="System settings" description="Versioned operational configuration. Changes require an audited workflow." headers={["Key","Value","Version","Description","Updated"]} rows={data.map(x=>({cells:[x.key,JSON.stringify(x.value),x.version,x.description??"—",when(x.updatedAt)]}))}/>;}
 if(key.startsWith("referrals/")){const data=await prisma.userProfile.findMany({where:{sponsorId:{not:null}},include:{sponsor:true,_count:{select:{directReferrals:true}}},take:100,orderBy:{createdAt:"desc"}});return <Listing title={key.endsWith("tree")?"Referral tree":"Team analytics"} description="Sponsor relationships and direct team performance." headers={["Member","Sponsor","Direct team","Rank","Active","Joined"]} rows={data.map(x=>({cells:[`${x.fullName} · ${x.memberId}`,x.sponsor?.fullName??"—",x._count.directReferrals,x.rank,x.isReferralActive?"Yes":"No",when(x.createdAt)]}))}/>;}
 if(key==="reports"){
  const [members,deposits,withdrawals,investments,walletEntries,incomeEntries]=await Promise.all([
   prisma.userProfile.count(),prisma.depositRequest.count(),prisma.withdrawalRequest.count(),
   prisma.investment.count(),prisma.walletLedgerEntry.count(),prisma.incomeLedgerEntry.count(),
  ]);
  return <Listing title="Reports" description="Current record totals queried directly from the database." headers={["Dataset","Database records"]} rows={[
   {cells:["Members",members]},{cells:["Deposit requests",deposits]},{cells:["Withdrawal requests",withdrawals]},
   {cells:["Investments",investments]},{cells:["Wallet ledger entries",walletEntries]},{cells:["Income ledger entries",incomeEntries]},
  ]}/>;
 }
 if(key==="roles"){
  const roles=await prisma.adminProfile.groupBy({by:["role"],_count:true});
  return <Listing title="Roles & permissions" description="Administrator role assignments currently stored in the database." headers={["Role","Assigned administrators"]} rows={roles.map(x=>({cells:[x.role,x._count]}))}/>;
 }
 if(key==="system-health"){
  const [members,audits,lastAudit]=await Promise.all([
   prisma.userProfile.count(),prisma.auditLog.count(),prisma.auditLog.findFirst({orderBy:{createdAt:"desc"},select:{createdAt:true}}),
  ]);
  return <Listing title="System health" description="Live database connectivity and persisted record checks." headers={["Check","Current value"]} rows={[
   {cells:["Database query","Successful"]},{cells:["Member records",members]},{cells:["Audit records",audits]},
   {cells:["Latest audit entry",lastAudit?when(lastAudit.createdAt):"No audit records in database"]},
  ]}/>;
 }
 notFound();
}
