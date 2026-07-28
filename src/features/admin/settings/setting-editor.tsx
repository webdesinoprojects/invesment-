"use client";
import{useActionState}from"react";
import{updateSettingAction}from"./update-setting";
import{initialAdminActionResult}from"../shared/action-result";
export function SettingEditor({settingKey,value,version}:{settingKey:string;value:string;version:number}){
 const[state,action,pending]=useActionState(updateSettingAction,initialAdminActionResult);
 return <details><summary className="cursor-pointer text-xs font-bold text-emerald-700">Edit</summary><form action={action} className="mt-2 w-96 max-w-[80vw] space-y-2"><input type="hidden" name="key" value={settingKey}/><input type="hidden" name="version" value={version}/><textarea name="value" defaultValue={value} rows={5} className="w-full rounded-lg border border-slate-200 p-2 font-mono text-[11px]"/><input name="reason" required placeholder="Reason for change" className="w-full rounded-lg border border-slate-200 p-2 text-xs"/><button disabled={pending} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white">Save version {version+1}</button>{state.message&&<p className={`text-xs ${state.ok?"text-emerald-700":"text-red-600"}`}>{state.message}</p>}</form></details>;
}
