import "server-only";
import { getPrisma } from "@/lib/db/prisma";

export async function getSystemHealth(){
 const prisma=getPrisma();const started=performance.now();const stalledBefore=new Date(Date.now()-24*60*60*1000);
 const[lastSuccess,lastFailure,stalled,settings,lastAudit]=await Promise.all([
  prisma.roiRun.findFirst({where:{status:"COMPLETED"},orderBy:{completedAt:"desc"},select:{runDate:true,completedAt:true}}),
  prisma.roiRun.findFirst({where:{status:"FAILED"},orderBy:{completedAt:"desc"},select:{runDate:true,completedAt:true,errorDetail:true}}),
  prisma.withdrawalRequest.count({where:{status:"PROCESSING",processingStartedAt:{lt:stalledBefore}}}),
  prisma.systemSetting.findMany({where:{key:{in:["investment_configuration","withdrawal_configuration","deposit_configuration"]}},select:{key:true}}),
  prisma.auditLog.findFirst({where:{outcome:"SUCCESS"},orderBy:{createdAt:"desc"},select:{createdAt:true}}),
 ]);
 const present=new Set(settings.map(x=>x.key));
 return{lastSuccess,lastFailure,stalled,lastAudit,latencyMs:Math.round(performance.now()-started),missingSettings:["investment_configuration","withdrawal_configuration","deposit_configuration"].filter(x=>!present.has(x))};
}
