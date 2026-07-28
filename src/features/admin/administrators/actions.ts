"use server";
import {revalidatePath}from"next/cache";
import{z}from"zod";
import{requireAdminPermission}from"@/server/permissions/admin-permissions";
import{createSupabaseAdminClient}from"@/lib/supabase/admin";
import{getPrisma}from"@/lib/db/prisma";
import type{AdminActionResult}from"../shared/action-result";

const inviteSchema=z.object({email:z.email().trim().toLowerCase(),displayName:z.string().trim().min(2).max(120),role:z.enum(["SUPER_ADMIN","OPERATOR","VIEWER"]),reason:z.string().trim().min(3).max(500)});
export async function inviteAdministratorAction(_state:AdminActionResult,formData:FormData):Promise<AdminActionResult>{
 const parsed=inviteSchema.safeParse(Object.fromEntries(formData));if(!parsed.success)return{ok:false,code:"VALIDATION",message:"Check the invitation details.",fieldErrors:parsed.error.flatten().fieldErrors};
 const actor=await requireAdminPermission("administrators.manage");
 const supabase=createSupabaseAdminClient();const{data,error}=await supabase.auth.admin.inviteUserByEmail(parsed.data.email);
 if(error||!data.user)return{ok:false,code:"INVITE_FAILED",message:"The Supabase administrator invitation could not be created."};
 try{await getPrisma().$transaction([getPrisma().adminProfile.create({data:{authUserId:data.user.id,email:parsed.data.email,displayName:parsed.data.displayName,role:parsed.data.role,createdByAdminId:actor.adminId}}),getPrisma().auditLog.create({data:{actorAdminId:actor.adminId,action:"ADMIN_INVITE",entityType:"AdminProfile",entityId:data.user.id,after:{email:parsed.data.email,role:parsed.data.role},reason:parsed.data.reason}})]);}
 catch{return{ok:false,code:"PROFILE_FAILED",message:"Invitation was sent but the admin profile could not be created. Reconcile this identity before retrying."};}
 revalidatePath("/admin/administrators");return{ok:true,data:undefined,message:"Administrator invited and profile created."};
}
const lifecycleSchema=z.object({id:z.uuid(),operation:z.enum(["ACTIVATE","DEACTIVATE","ROLE"]),role:z.enum(["SUPER_ADMIN","OPERATOR","VIEWER"]).default("VIEWER"),reason:z.string().trim().min(3).max(500)});
export async function updateAdministratorAction(_state:AdminActionResult,formData:FormData):Promise<AdminActionResult>{
 const parsed=lifecycleSchema.safeParse(Object.fromEntries(formData));if(!parsed.success)return{ok:false,code:"VALIDATION",message:"A valid operation and reason are required."};
 const actor=await requireAdminPermission("administrators.manage");const prisma=getPrisma();
 if(parsed.data.id===actor.adminId&&parsed.data.operation==="DEACTIVATE")return{ok:false,code:"SELF_DEACTIVATE",message:"You cannot deactivate your own active session."};
 try{const result=await prisma.$transaction(async tx=>{const target=await tx.adminProfile.findUnique({where:{id:parsed.data.id}});if(!target)return false;
  if((parsed.data.operation==="DEACTIVATE"||parsed.data.operation==="ROLE")&&target.role==="SUPER_ADMIN"&&(parsed.data.operation!=="ROLE"||parsed.data.role!=="SUPER_ADMIN")){const count=await tx.adminProfile.count({where:{role:"SUPER_ADMIN",isActive:true}});if(count<=1)throw new Error("LAST_SUPER_ADMIN");}
  const data=parsed.data.operation==="DEACTIVATE"?{isActive:false,deactivatedAt:new Date(),deactivationReason:parsed.data.reason,deactivatedByAdminId:actor.adminId}:parsed.data.operation==="ACTIVATE"?{isActive:true,deactivatedAt:null,deactivationReason:null,deactivatedByAdminId:null}:{role:parsed.data.role};
  await tx.adminProfile.update({where:{id:target.id},data});await tx.auditLog.create({data:{actorAdminId:actor.adminId,action:`ADMIN_${parsed.data.operation}`,entityType:"AdminProfile",entityId:target.id,before:{role:target.role,isActive:target.isActive},after:data,reason:parsed.data.reason}});return true;});
  if(!result)return{ok:false,code:"NOT_FOUND",message:"Administrator not found."};revalidatePath("/admin/administrators");return{ok:true,data:undefined,message:"Administrator updated."};
 }catch(error){return{ok:false,code:"FAILED",message:error instanceof Error&&error.message==="LAST_SUPER_ADMIN"?"The final active super administrator cannot be removed.":"Administrator update failed."};}
}
