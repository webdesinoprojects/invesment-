"use server";
import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/admin/session";

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  if (typeof value !== "string" || !value) throw new Error(`Missing ${name}`);
  return value;
}
export async function updateMemberStatus(formData: FormData) {
  const admin = await requireAdmin(["SUPER_ADMIN","OPERATOR"]);
  const id = field(formData,"id"); const status = field(formData,"status") as "ACTIVE"|"PENDING"|"BLOCKED";
  const prisma = getPrisma();
  const before = await prisma.userProfile.findUniqueOrThrow({where:{id},select:{status:true}});
  await prisma.$transaction([
    prisma.userProfile.update({where:{id},data:{status,blockedAt:status==="BLOCKED"?new Date():null,blockedByAdminId:status==="BLOCKED"?admin.adminId:null,blockReason:status==="BLOCKED"?"Blocked by administrator":null}}),
    prisma.auditLog.create({data:{actorAdminId:admin.adminId,targetUserId:id,action:"MEMBER_STATUS_UPDATE",entityType:"UserProfile",entityId:id,before,after:{status}}}),
  ]);
  revalidatePath("/admin");
}
export async function reviewDeposit(formData: FormData) {
  const admin = await requireAdmin(["SUPER_ADMIN","OPERATOR"]);
  const id=field(formData,"id"); const decision=field(formData,"decision");
  const prisma=getPrisma();
  await prisma.$transaction(async(tx)=>{
    const request=await tx.depositRequest.findUniqueOrThrow({where:{id}});
    if(request.status!=="PENDING") throw new Error("Deposit has already been reviewed.");
    if(decision==="REJECT"){
      await tx.depositRequest.update({where:{id},data:{status:"REJECTED",reviewedById:admin.adminId,reviewSource:"ADMIN",reviewedAt:new Date(),rejectionReason:"Rejected by administrator",version:{increment:1}}});
    } else {
      const latest=await tx.walletLedgerEntry.findFirst({where:{userId:request.userId},orderBy:{sequence:"desc"},select:{balanceAfter:true}});
      const ledger=await tx.walletLedgerEntry.create({data:{userId:request.userId,direction:"CREDIT",category:"DEPOSIT",amount:request.amount,balanceAfter:Number(latest?.balanceAfter??0)+Number(request.amount),referenceType:"DepositRequest",referenceId:request.id,idempotencyKey:`deposit:${request.id}:approval`,description:"Admin-approved deposit",createdByAdminId:admin.adminId}});
      await tx.depositRequest.update({where:{id},data:{status:"APPROVED",approvedAmount:request.amount,reviewedById:admin.adminId,reviewSource:"ADMIN",reviewedAt:new Date(),creditLedgerEntryId:ledger.id,version:{increment:1}}});
    }
    await tx.auditLog.create({data:{actorAdminId:admin.adminId,targetUserId:request.userId,action:`DEPOSIT_${decision}`,entityType:"DepositRequest",entityId:id,before:{status:request.status},after:{status:decision==="REJECT"?"REJECTED":"APPROVED"}}});
  },{isolationLevel:"Serializable"});
  revalidatePath("/admin");
}
export async function updateWithdrawalStatus(formData: FormData) {
  const admin=await requireAdmin(["SUPER_ADMIN","OPERATOR"]);
  const id=field(formData,"id"); const status=field(formData,"status") as "PROCESSING"|"PAID"|"REJECTED"|"FAILED";
  const prisma=getPrisma();
  const request=await prisma.withdrawalRequest.findUniqueOrThrow({where:{id}});
  const allowed:Record<string,string[]>= {PENDING:["PROCESSING","REJECTED"],PROCESSING:["PAID","FAILED","REJECTED"],FAILED:["PROCESSING"]};
  if(!allowed[request.status]?.includes(status)) throw new Error("Invalid withdrawal state transition.");
  await prisma.$transaction([
    prisma.withdrawalRequest.update({where:{id},data:{status,reviewedById:admin.adminId,reviewSource:"ADMIN",reviewedAt:request.reviewedAt??new Date(),processedById:status==="PROCESSING"?admin.adminId:request.processedById,processingStartedAt:status==="PROCESSING"?new Date():request.processingStartedAt,paidById:status==="PAID"?admin.adminId:request.paidById,paidAt:status==="PAID"?new Date():request.paidAt,failedAt:status==="FAILED"?new Date():request.failedAt,rejectionReason:status==="REJECTED"?"Rejected by administrator":request.rejectionReason,failureReason:status==="FAILED"?"Marked failed by administrator":request.failureReason,version:{increment:1}}}),
    prisma.auditLog.create({data:{actorAdminId:admin.adminId,targetUserId:request.userId,action:`WITHDRAWAL_${status}`,entityType:"WithdrawalRequest",entityId:id,before:{status:request.status},after:{status}}}),
  ]);
  revalidatePath("/admin");
}
export async function updateInvestmentStatus(formData: FormData) {
  const admin=await requireAdmin(["SUPER_ADMIN","OPERATOR"]);
  const id=field(formData,"id"); const status=field(formData,"status") as "ACTIVE"|"PAUSED"|"COMPLETED"|"CANCELLED";
  const prisma=getPrisma(); const current=await prisma.investment.findUniqueOrThrow({where:{id}});
  await prisma.$transaction([
    prisma.investment.update({where:{id},data:{status,statusChangedById:admin.adminId,statusReason:"Changed by administrator",pausedAt:status==="PAUSED"?new Date():current.pausedAt,completedAt:status==="COMPLETED"?new Date():current.completedAt,cancelledAt:status==="CANCELLED"?new Date():current.cancelledAt}}),
    prisma.auditLog.create({data:{actorAdminId:admin.adminId,targetUserId:current.userId,action:"INVESTMENT_STATUS_UPDATE",entityType:"Investment",entityId:id,before:{status:current.status},after:{status}}}),
  ]);
  revalidatePath("/admin");
}
