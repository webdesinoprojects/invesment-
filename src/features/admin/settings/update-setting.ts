"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminPermission } from "@/server/permissions/admin-permissions";
import { runSerializable } from "../shared/transaction";
import type { AdminActionResult } from "../shared/action-result";
import { Prisma } from "@/generated/prisma/client";

const money=z.string().regex(/^(?:0|[1-9]\d{0,13})(?:\.\d{1,6})?$/);
const configs={
 investment_configuration:z.object({minimumAmount:money,monthlyRoiPercent:money,durationMonths:z.number().int().min(1).max(120),directCommissionPercent:money,levelCommissionPercent:money,maxLevelDepth:z.number().int().min(1).max(5)}).strict(),
 withdrawal_configuration:z.object({minimumAmount:money,allowedDays:z.array(z.number().int().min(1).max(31)).min(1)}).strict(),
 deposit_configuration:z.object({walletAddress:z.string().regex(/^0x[a-fA-F0-9]{40}$/),network:z.string().min(2).max(16),minimumAmount:money}).strict(),
}as const;
const inputSchema=z.object({key:z.enum(["investment_configuration","withdrawal_configuration","deposit_configuration"]),value:z.string().min(2).max(4000),version:z.coerce.number().int().positive(),reason:z.string().trim().min(3).max(500)});

export async function updateSettingAction(_state:AdminActionResult,formData:FormData):Promise<AdminActionResult>{
 const parsed=inputSchema.safeParse(Object.fromEntries(formData));
 if(!parsed.success)return{ok:false,code:"VALIDATION",message:"Check the setting value, version and reason.",fieldErrors:parsed.error.flatten().fieldErrors};
 let json:unknown;try{json=JSON.parse(parsed.data.value)}catch{return{ok:false,code:"INVALID_JSON",message:"The setting value is not valid JSON."};}
 const value=configs[parsed.data.key].safeParse(json);
 if(!value.success)return{ok:false,code:"INVALID_SETTING",message:"The setting does not match its supported schema."};
 const admin=await requireAdminPermission("settings.manage");
 try{
  const result=await runSerializable(async tx=>{
   const current=await tx.systemSetting.findUnique({where:{key:parsed.data.key}});
   if(!current||current.version!==parsed.data.version)return false;
   const nextVersion=current.version+1;
   const updated=await tx.systemSetting.updateMany({where:{key:current.key,version:current.version},data:{value:value.data,version:nextVersion,updatedByAdminId:admin.adminId}});
   if(updated.count!==1)return false;
   await tx.systemSettingRevision.create({data:{settingKey:current.key,version:nextVersion,previousValue:current.value===null?Prisma.JsonNull:current.value,nextValue:value.data,reason:parsed.data.reason,changedByAdminId:admin.adminId}});
   await tx.auditLog.create({data:{actorAdminId:admin.adminId,action:"SYSTEM_SETTING_UPDATE",entityType:"SystemSetting",entityId:current.key,before:{version:current.version},after:{version:nextVersion},reason:parsed.data.reason}});
   return true;
  });
  if(!result)return{ok:false,code:"CONFLICT",message:"This setting changed. Refresh before saving again."};
  revalidatePath("/admin/settings");return{ok:true,data:undefined,message:"Setting updated with a revision and audit record."};
 }catch{return{ok:false,code:"FAILED",message:"The setting could not be updated."};}
}
