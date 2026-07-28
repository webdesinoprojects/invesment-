import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/admin/session";
import { DepositReviewControls } from "@/features/admin/deposits/components/deposit-review-controls";
import { WithdrawalControls } from "@/features/admin/withdrawals/components/withdrawal-controls";
import { formatDecimalCurrency } from "@/features/admin/shared/format-decimal";
import { MemberStatusControls } from "@/features/admin/members/components/member-status-controls";
import { InvestmentStatusControls } from "@/features/admin/investments/components/investment-status-controls";
import { ManualActivationForm } from "@/features/admin/investments/components/manual-activation-form";
import { ManualRoiForm } from "@/features/admin/roi/manual-roi-form";
import { SettingEditor } from "@/features/admin/settings/setting-editor";
import { AdministratorControls, InviteAdministratorForm } from "@/features/admin/administrators/components";
import { AdminListing as Listing } from "@/components/admin/admin-listing";
import { Prisma } from "@/generated/prisma/client";
import Link from "next/link";
import { getSystemHealth } from "@/features/admin/health/get-system-health";

const money=(v:{toString():string}|string|null|undefined)=>formatDecimalCurrency(v);
const when=(v:Date)=>new Intl.DateTimeFormat("en",{dateStyle:"medium",timeStyle:"short"}).format(v);
export default async function AdminModulePage({params,searchParams}:{params:Promise<{slug:string[]}>;searchParams:Promise<{q?:string;page?:string}>}) {
 const [{slug},filters]=await Promise.all([params,searchParams]); const key=slug.join("/"); const prisma=getPrisma(); const session=await requireAdmin();
 const query=(filters.q??"").trim().slice(0,100);const page=Math.max(1,Number.parseInt(filters.page??"1",10)||1);const pageSize=25;const skip=(page-1)*pageSize;
 if(key.startsWith("members")){
  if(slug.length===2&&slug[1]!=="pending"&&slug[1]!=="blocked"){
   const detailId=slug[1];if(!detailId)notFound();
   const member=await prisma.userProfile.findUnique({where:{id:detailId},include:{sponsor:{select:{memberId:true,fullName:true}},_count:{select:{directReferrals:true,descendantLinks:true,investments:true,depositRequests:true,withdrawalRequests:true}}}});
   if(!member)notFound();
   const [wallet,investments,incomes,deposits,withdrawals,audits,notes]=await Promise.all([
    prisma.walletLedgerEntry.findMany({where:{userId:member.id},orderBy:{sequence:"desc"},take:10}),
    prisma.investment.findMany({where:{userId:member.id},orderBy:{createdAt:"desc"}}),
    prisma.incomeLedgerEntry.groupBy({by:["type","status"],where:{userId:member.id},_sum:{amount:true},_count:true}),
    prisma.depositRequest.findMany({where:{userId:member.id},orderBy:{submittedAt:"desc"},take:10}),
    prisma.withdrawalRequest.findMany({where:{userId:member.id},orderBy:{submittedAt:"desc"},take:10}),
    prisma.auditLog.findMany({where:{targetUserId:member.id},orderBy:{createdAt:"desc"},take:10}),
    prisma.adminUserNote.findMany({where:{userId:member.id},include:{authorAdmin:{select:{displayName:true}}},orderBy:{createdAt:"desc"},take:10}),
   ]);
   return <div className="space-y-6"><Listing title={`${member.fullName} · ${member.memberId}`} description="Complete member investigation view from persisted records." headers={["Email","Mobile","Country","Status","Rank","Sponsor","Direct","Downline"]} rows={[{cells:[member.email,member.mobile,member.countryCode,member.status,member.rank,member.sponsor?`${member.sponsor.fullName} · ${member.sponsor.memberId}`:"—",member._count.directReferrals,Math.max(0,member._count.descendantLinks-1)]}]}/><Listing title="Wallet ledger" description="Latest immutable balance movements." headers={["Direction","Category","Amount","Balance","Description","Date"]} rows={wallet.map(x=>({cells:[x.direction,x.category,money(x.amount),money(x.balanceAfter),x.description,when(x.createdAt)]}))}/><Listing title="Investments and ROI progress" description="All member investment contracts." headers={["Amount","Paid out","Cap","ROI","Status","Activated"]} rows={investments.map(x=>({cells:[money(x.amount),money(x.paidOutAmount),money(x.payoutCapAmount),`${x.monthlyRoiPercent}%`,x.status,when(x.activatedAt)]}))}/><Listing title="Income totals" description="Persisted income ledger totals." headers={["Type","Status","Records","Amount"]} rows={incomes.map(x=>({cells:[x.type,x.status,x._count,money(x._sum.amount)]}))}/><Listing title="Payment requests" description="Latest deposits and withdrawals." headers={["Type","Amount","Status","Reference","Date"]} rows={[...deposits.map(x=>({cells:["Deposit",money(x.amount),x.status,x.transactionHash??"—",when(x.submittedAt)]})),...withdrawals.map(x=>({cells:["Withdrawal",money(x.amount),x.status,x.paymentHash??x.walletAddress,when(x.submittedAt)]}))]}/><Listing title="Audit and administrator notes" description="Administrative traceability for this member." headers={["Type","Actor / action","Detail","Date"]} rows={[...audits.map(x=>({cells:["Audit",x.action,x.reason??x.outcome,when(x.createdAt)]})),...notes.map(x=>({cells:["Note",x.authorAdmin.displayName,x.note,when(x.createdAt)]}))]}/></div>;
  }
  const status=key.endsWith("pending")?"PENDING":key.endsWith("blocked")?"BLOCKED":undefined;
  const data=await prisma.userProfile.findMany({where:{...status?{status}:{},...query?{OR:[{memberId:{contains:query,mode:"insensitive"}},{fullName:{contains:query,mode:"insensitive"}},{email:{contains:query,mode:"insensitive"}},{mobile:{contains:query}}]}:{}},orderBy:{createdAt:"desc"},skip,take:pageSize+1,include:{_count:{select:{directReferrals:true,investments:true}}}});const hasMore=data.length>pageSize;const rows=data.slice(0,pageSize);
  return <Listing pagination={{path:`/admin/${key}`,query,page,hasMore}} title={status?`${status[0]}${status.slice(1).toLowerCase()} members`:"All members"} description="Review identities, account status and network activity." headers={["Member","Contact","Country","Team","Investments","Status","Joined","Actions"]} rows={rows.map(x=>({id:x.id,cells:[<Link key={x.id} href={`/admin/members/${x.id}`} className="font-semibold text-emerald-700 hover:underline">{x.fullName} · {x.memberId}</Link>,x.email,x.countryCode,x._count.directReferrals,x._count.investments,x.status,when(x.createdAt)],action:session.role!=="VIEWER"?<MemberStatusControls id={x.id} status={x.status} member={`${x.fullName} · ${x.memberId}`} />:<span>View only</span>}))}/>;
 }
 if(key.startsWith("deposits")){
  const pending=key.endsWith("pending"); const data=await prisma.depositRequest.findMany({where:{...pending?{status:"PENDING" as const}:{},...query?{OR:[{transactionHash:{contains:query,mode:"insensitive"}},{user:{is:{OR:[{memberId:{contains:query,mode:"insensitive"}},{fullName:{contains:query,mode:"insensitive"}}]}}}]}:{}},include:{user:true},orderBy:{submittedAt:"desc"},skip,take:pageSize+1});const hasMore=data.length>pageSize;const rows=data.slice(0,pageSize);
  return <Listing pagination={{path:`/admin/${key}`,query,page,hasMore}} title={pending?"Pending deposits":"Deposit history"} description="Verify QR payments and credit approved member wallets." headers={["Member","Amount","Network","Transaction","Status","Submitted","Actions"]} rows={rows.map(x=>({id:x.id,cells:[`${x.user.fullName} · ${x.user.memberId}`,money(x.amount),x.network,x.transactionHash??"Not supplied",x.status,when(x.submittedAt)],action:x.status==="PENDING"&&session.role!=="VIEWER"?<DepositReviewControls id={x.id} member={`${x.user.fullName} · ${x.user.memberId}`} amount={money(x.amount)} />:<span>Reviewed</span>}))}/>;
 }
 if(key.startsWith("withdrawals")){
  const status=key.endsWith("pending")?"PENDING":key.endsWith("processing")?"PROCESSING":undefined; const data=await prisma.withdrawalRequest.findMany({where:{...status?{status}:{},...query?{OR:[{walletAddress:{contains:query,mode:"insensitive"}},{paymentHash:{contains:query,mode:"insensitive"}},{user:{is:{OR:[{memberId:{contains:query,mode:"insensitive"}},{fullName:{contains:query,mode:"insensitive"}}]}}}]}:{}},include:{user:true},orderBy:{submittedAt:"desc"},skip,take:pageSize+1});const hasMore=data.length>pageSize;const rows=data.slice(0,pageSize);
  return <Listing pagination={{path:`/admin/${key}`,query,page,hasMore}} title={status==="PENDING"?"Pending withdrawals":status==="PROCESSING"?"Processing withdrawals":"Withdrawal history"} description="Manage the payout queue and manual payment lifecycle." headers={["Member","Amount","Net","Wallet","Status","Submitted","Actions"]} rows={rows.map(x=>({id:x.id,cells:[`${x.user.fullName} · ${x.user.memberId}`,money(x.amount),money(x.netAmount),x.walletAddress,x.status,when(x.submittedAt)],action:session.role!=="VIEWER"&&["PENDING","PROCESSING"].includes(x.status)?<WithdrawalControls id={x.id} status={x.status} member={`${x.user.fullName} · ${x.user.memberId}`} amount={money(x.amount)} />:<span>Closed</span>}))}/>;
 }
 if(key.startsWith("investments")){
  const data=await prisma.investment.findMany({...query?{where:{user:{is:{OR:[{memberId:{contains:query,mode:"insensitive"}},{fullName:{contains:query,mode:"insensitive"}}]}}}}:{},include:{user:true},orderBy:{createdAt:"desc"},skip,take:pageSize+1});const hasMore=data.length>pageSize;const rows=data.slice(0,pageSize);
  return <>{key.endsWith("activate")&&session.role==="SUPER_ADMIN"&&<ManualActivationForm/>}<Listing pagination={{path:`/admin/${key}`,query,page,hasMore}} title={key.endsWith("activate")?"Manual activation":"All investments"} description="Monitor and control every active investment contract." headers={["Member","Amount","ROI","Duration","Paid out","Status","Activated","Actions"]} rows={rows.map(x=>({id:x.id,cells:[`${x.user.fullName} · ${x.user.memberId}`,money(x.amount),`${x.monthlyRoiPercent}%`,`${x.durationMonths} months`,money(x.paidOutAmount),x.status,when(x.activatedAt)],action:session.role!=="VIEWER"?<InvestmentStatusControls id={x.id} status={x.status}/>:<span>View only</span>}))}/></>;
 }
 if(key==="wallet-ledger"){const data=await prisma.walletLedgerEntry.findMany({...query?{where:{user:{is:{OR:[{memberId:{contains:query,mode:"insensitive"}},{fullName:{contains:query,mode:"insensitive"}}]}}}}:{},include:{user:true},orderBy:{sequence:"desc"},skip,take:pageSize+1});const hasMore=data.length>pageSize;return <Listing pagination={{path:`/admin/${key}`,query,page,hasMore}} title="Wallet ledger" description="Immutable member wallet movements and running balances." headers={["Sequence","Member","Direction","Category","Amount","Balance","Description","Date"]} rows={data.slice(0,pageSize).map(x=>({cells:[x.sequence.toString(),`${x.user.fullName} · ${x.user.memberId}`,x.direction,x.category,money(x.amount),money(x.balanceAfter),x.description,when(x.createdAt)]}))}/>;}
 if(key==="income-ledger"){const data=await prisma.incomeLedgerEntry.findMany({...query?{where:{user:{is:{OR:[{memberId:{contains:query,mode:"insensitive"}},{fullName:{contains:query,mode:"insensitive"}}]}}}}:{},include:{user:true},orderBy:{creditedAt:"desc"},skip,take:pageSize+1});const hasMore=data.length>pageSize;return <Listing pagination={{path:`/admin/${key}`,query,page,hasMore}} title="Income ledger" description="ROI, direct, level, rank and salary income records." headers={["Member","Type","Amount","Level","Status","Description","Credited"]} rows={data.slice(0,pageSize).map(x=>({cells:[`${x.user.fullName} · ${x.user.memberId}`,x.type,money(x.amount),x.level??"—",x.status,x.description,when(x.creditedAt)]}))}/>;}
 if(key.startsWith("roi/")){const data=await prisma.roiRun.findMany({orderBy:{startedAt:"desc"},skip,take:pageSize+1});const hasMore=data.length>pageSize;return <>{key.endsWith("runs")&&session.role==="SUPER_ADMIN"&&<ManualRoiForm/>}<Listing pagination={{path:`/admin/${key}`,query,page,hasMore}} title={key.endsWith("runs")?"ROI runs":"ROI run history"} description="Review scheduled and manual return distribution batches." headers={["Run date","Trigger","Processed","Credited","Failed","Status","Started","Completed","Failure detail"]} rows={data.slice(0,pageSize).map(x=>({cells:[x.runDate.toLocaleDateString(),x.trigger,x.processed,x.credited,x.failed,x.status,when(x.startedAt),x.completedAt?when(x.completedAt):"—",x.errorDetail??"—"]}))}/></>;}
 if(key==="audit-logs"){const data=await prisma.auditLog.findMany({...query?{where:{OR:[{action:{contains:query,mode:"insensitive"}},{entityType:{contains:query,mode:"insensitive"}},{reason:{contains:query,mode:"insensitive"}}]}}:{},orderBy:{createdAt:"desc"},skip,take:pageSize+1,include:{actorAdmin:true}});const hasMore=data.length>pageSize;return <Listing pagination={{path:`/admin/${key}`,query,page,hasMore}} title="Audit logs" description="Permanent record of administrative and system actions." headers={["Action","Entity","Actor","Outcome","Reason","Date"]} rows={data.slice(0,pageSize).map(x=>({cells:[x.action,x.entityType,x.actorAdmin?.displayName??"System",x.outcome,x.reason??"—",when(x.createdAt)]}))}/>;}
 if((key==="settings"||key==="administrators"||key==="roles")&&session.role!=="SUPER_ADMIN") notFound();
 if(key==="administrators"){const data=await prisma.adminProfile.findMany({orderBy:{createdAt:"desc"}});return <><InviteAdministratorForm/><Listing title="Administrators" description="Supabase-authenticated administrative identities and access roles." headers={["Name","Email","Role","Active","Last login","Created","Actions"]} rows={data.map(x=>({cells:[x.displayName,x.email??"—",x.role,x.isActive?"Yes":"No",x.lastLoginAt?when(x.lastLoginAt):"Never",when(x.createdAt)],action:<AdministratorControls id={x.id} role={x.role} isActive={x.isActive}/>}))}/></>;}
 if(key==="settings"){const data=await prisma.systemSetting.findMany({orderBy:{key:"asc"}});return <Listing title="System settings" description="Strictly validated, versioned operational configuration." headers={["Key","Value","Version","Description","Updated","Actions"]} rows={data.map(x=>({cells:[x.key,JSON.stringify(x.value),x.version,x.description??"—",when(x.updatedAt)],action:["investment_configuration","withdrawal_configuration","deposit_configuration"].includes(x.key)?<SettingEditor settingKey={x.key} value={JSON.stringify(x.value,null,2)} version={x.version}/>:<span className="text-xs text-slate-400">Read only</span>}))}/>;}
 if(key==="referrals/tree"){const data=await prisma.referralClosure.findMany({where:{depth:{gt:0},...query?{OR:[{ancestor:{is:{OR:[{memberId:{contains:query,mode:"insensitive"}},{fullName:{contains:query,mode:"insensitive"}}]} }},{descendant:{is:{OR:[{memberId:{contains:query,mode:"insensitive"}},{fullName:{contains:query,mode:"insensitive"}}]}}}]}:{}},include:{ancestor:{select:{memberId:true,fullName:true,isReferralActive:true}},descendant:{select:{memberId:true,fullName:true,isReferralActive:true}}},orderBy:[{ancestorId:"asc"},{depth:"asc"}],skip,take:pageSize+1});const hasMore=data.length>pageSize;return <Listing pagination={{path:`/admin/${key}`,query,page,hasMore}} title="Referral tree" description="Persisted ancestor-to-descendant closure relationships by depth." headers={["Sponsor / ancestor","Member / descendant","Depth","Ancestor eligible","Member eligible"]} rows={data.slice(0,pageSize).map(x=>({cells:[`${x.ancestor.fullName} · ${x.ancestor.memberId}`,`${x.descendant.fullName} · ${x.descendant.memberId}`,x.depth,x.ancestor.isReferralActive?"Yes":"No",x.descendant.isReferralActive?"Yes":"No"]}))}/>;}
 if(key==="referrals/analytics"){const [depths,incomes]=await Promise.all([prisma.referralClosure.groupBy({by:["depth"],where:{depth:{gt:0}},_count:true,orderBy:{depth:"asc"}}),prisma.incomeLedgerEntry.groupBy({by:["type","level"],where:{type:{in:["DIRECT_REFERRAL","LEVEL_INCOME"]},status:"CREDITED"},_count:true,_sum:{amount:true},orderBy:{level:"asc"}})]);return <Listing title="Team analytics" description="Persisted closure depth and paid commission records; eligibility is never inferred from display counts." headers={["Metric","Level","Records","Amount"]} rows={[...depths.map(x=>({cells:["Referral closure",x.depth,x._count,"—"]})),...incomes.map(x=>({cells:[x.type,x.level??1,x._count,money(x._sum.amount)]}))]}/>;}
 if(key==="reports"){
  const [members,deposits,withdrawals,investments,incomes,wallets]=await Promise.all([
   prisma.userProfile.groupBy({by:["status"],_count:true}),
   prisma.depositRequest.groupBy({by:["status"],_count:true,_sum:{amount:true,approvedAmount:true}}),
   prisma.withdrawalRequest.groupBy({by:["status"],_count:true,_sum:{amount:true,netAmount:true}}),
   prisma.investment.groupBy({by:["status"],_count:true,_sum:{amount:true,paidOutAmount:true,payoutCapAmount:true}}),
   prisma.incomeLedgerEntry.groupBy({by:["type","status"],_count:true,_sum:{amount:true}}),
   prisma.walletLedgerEntry.findMany({distinct:["userId"],orderBy:[{userId:"asc"},{sequence:"desc"}],select:{balanceAfter:true}}),
  ]);
  const liability=wallets.reduce((sum,row)=>sum.plus(row.balanceAfter),new Prisma.Decimal(0));
  return <Listing title="Reports" description="Live member, payment, investment, income and wallet-liability reconciliation." headers={["Dataset","Status / type","Records","Gross amount","Secondary amount"]} rows={[
   ...members.map(x=>({cells:["Members",x.status,x._count,"—","—"]})),
   ...deposits.map(x=>({cells:["Deposits",x.status,x._count,money(x._sum.amount),money(x._sum.approvedAmount)]})),
   ...withdrawals.map(x=>({cells:["Withdrawals",x.status,x._count,money(x._sum.amount),money(x._sum.netAmount)]})),
   ...investments.map(x=>({cells:["Investments",x.status,x._count,money(x._sum.amount),`${money(x._sum.paidOutAmount)} / ${money(x._sum.payoutCapAmount)}`]})),
   ...incomes.map(x=>({cells:["Income",`${x.type} · ${x.status}`,x._count,money(x._sum.amount),"—"]})),
   {cells:["Wallet liability","Latest balances",wallets.length,money(liability),"—"]},
  ]}/>;
 }
 if(key==="roles"){
  const roles=await prisma.adminProfile.groupBy({by:["role"],_count:true});
  return <Listing title="Roles & permissions" description="Administrator role assignments currently stored in the database." headers={["Role","Assigned administrators"]} rows={roles.map(x=>({cells:[x.role,x._count]}))}/>;
 }
 if(key==="system-health"){
  const health=await getSystemHealth();
  return <Listing title="System health" description="Live checks without exposing connection strings, keys or environment values." headers={["Check","Current value"]} rows={[
   {cells:["Database connectivity",`Successful · ${health.latencyMs} ms query batch`]},{cells:["Last successful ROI",health.lastSuccess?`${health.lastSuccess.runDate.toLocaleDateString()} · ${health.lastSuccess.completedAt?when(health.lastSuccess.completedAt):"completed"}`:"No successful ROI run"]},
   {cells:["Last failed ROI",health.lastFailure?`${health.lastFailure.runDate.toLocaleDateString()} · ${health.lastFailure.errorDetail??"No detail"}`:"No failed ROI run"]},{cells:["Stalled processing withdrawals (>24h)",health.stalled]},
   {cells:["Required settings",health.missingSettings.length===0?"All required settings present":`Missing: ${health.missingSettings.join(", ")}`]},{cells:["Latest successful audit",health.lastAudit?when(health.lastAudit.createdAt):"No successful audit record"]},
   {cells:["Application version",process.env.npm_package_version??"Not supplied by runtime"]},
  ]}/>;
 }
 notFound();
}
