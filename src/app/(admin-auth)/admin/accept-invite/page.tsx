import { ShieldCheck } from "lucide-react";

import { BrandMark } from "@/components/brand/brand-mark";
import { AcceptAdminInviteForm } from "@/features/admin/auth/accept-invite-form";

export const metadata = { title: "Accept administrator invitation" };

export default function AcceptAdminInvitePage() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#f4f7f5] px-5 py-12 text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(34,197,94,.14),transparent_30%),radial-gradient(circle_at_90%_85%,rgba(15,23,42,.08),transparent_30%)]" />
      <section className="relative w-full max-w-md rounded-[28px] border border-white bg-white/90 p-8 shadow-[0_30px_90px_rgba(15,23,42,.14)] backdrop-blur md:p-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandMark className="size-12" priority />
            <div>
              <p className="font-bold">NEX-GEN POWER</p>
              <p className="text-xs text-slate-500">Administration</p>
            </div>
          </div>
          <ShieldCheck className="size-7 text-emerald-600" />
        </div>
        <div className="mt-9">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-600">
            Administrator invitation
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Set your password</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Finish account setup to enter the admin console with the role assigned to you.
          </p>
        </div>
        <AcceptAdminInviteForm />
      </section>
    </main>
  );
}
