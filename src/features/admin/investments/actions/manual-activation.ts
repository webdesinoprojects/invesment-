"use server";
import { revalidatePath } from "next/cache";
import { requireAdminPermission } from "@/server/permissions/admin-permissions";
import { getPrisma } from "@/lib/db/prisma";
import { getInvestmentSettings } from "@/features/investment/queries/get-investment-settings";
import { activateInvestment } from "@/features/investment/services/activate-investment";
import { compareDecimalStrings } from "@/lib/money/compare-decimal";
import type { AdminActionResult } from "../../shared/action-result";
import { manualActivationSchema } from "../schemas/manual-activation";

export async function manualActivationAction(_state: AdminActionResult, formData: FormData): Promise<AdminActionResult> {
  const parsed=manualActivationSchema.safeParse(Object.fromEntries(formData));
  if(!parsed.success)return{ok:false,code:"VALIDATION",message:"Check the activation details.",fieldErrors:parsed.error.flatten().fieldErrors};
  const admin=await requireAdminPermission("investments.manual");
  const [member,settings]=await Promise.all([
    getPrisma().userProfile.findFirst({where:{OR:[
      {memberId:{equals:parsed.data.memberQuery.toUpperCase()}},
      {email:{equals:parsed.data.memberQuery.toLowerCase()}},
      {mobile:{equals:parsed.data.memberQuery}},
      {fullName:{contains:parsed.data.memberQuery,mode:"insensitive"}},
    ]},orderBy:{createdAt:"asc"},select:{id:true,memberId:true}}),
    getInvestmentSettings(),
  ]);
  if(!member)return{ok:false,code:"NOT_FOUND",message:"Member not found."};
  if(!settings)return{ok:false,code:"NOT_CONFIGURED",message:"Investment settings are not configured."};
  if(compareDecimalStrings(parsed.data.amount,settings.minimumAmount)<0)return{ok:false,code:"AMOUNT_TOO_LOW",message:`Minimum investment is ${settings.minimumAmount} USDT.`};
  try{
    const result=await activateInvestment({payerUserId:member.id,targetMemberId:member.memberId,amount:parsed.data.amount,requestToken:parsed.data.requestToken,settings,adminId:admin.adminId,reason:parsed.data.reason});
    if(!result.ok)return{ok:false,code:result.code,message:result.code==="INSUFFICIENT_FUNDS"?"Member wallet balance is insufficient.":"Activation could not be completed."};
    revalidatePath("/admin");
    return{ok:true,data:undefined,message:"Investment activated using the shared wallet and commission rules."};
  }catch{return{ok:false,code:"FAILED",message:"Manual activation failed."};}
}
