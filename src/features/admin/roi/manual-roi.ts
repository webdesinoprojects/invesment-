"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminPermission } from "@/server/permissions/admin-permissions";
import { runDailyRoi } from "@/features/roi/services/run-daily-roi";
import { getPrisma } from "@/lib/db/prisma";
import type { AdminActionResult } from "../shared/action-result";

const schema=z.object({date:z.iso.date()});
export async function runManualRoiAction(_state:AdminActionResult,formData:FormData):Promise<AdminActionResult>{
 const parsed=schema.safeParse(Object.fromEntries(formData));
 if(!parsed.success)return{ok:false,code:"VALIDATION",message:"Choose a valid ROI business date."};
 const admin=await requireAdminPermission("roi.run");
 const runDate=new Date(`${parsed.data.date}T06:30:00.000Z`);
 if(runDate.getTime()>Date.now())return{ok:false,code:"FUTURE_DATE",message:"ROI cannot run for a future date."};
 try{
  const result=await runDailyRoi(runDate,admin.adminId);
  await getPrisma().auditLog.create({data:{actorAdminId:admin.adminId,action:"ROI_MANUAL_RUN",entityType:"RoiRun",entityId:parsed.data.date,after:{status:result.status,processed:result.processed,credited:result.credited,failed:result.failed}}});
  revalidatePath("/admin");
  return{ok:true,data:undefined,message:`ROI ${result.status.toLowerCase()}: ${result.credited} credits, ${result.failed} failed.`};
 }catch{return{ok:false,code:"FAILED",message:"The ROI run failed safely. Review run history before retrying."};}
}
