import { LogOut } from "lucide-react";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { logoutAction } from "@/features/auth/actions/logout";
import { AuthBrand } from "@/features/auth/components/auth-brand";
import { requireUser } from "@/lib/auth/require-user";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <main className="min-h-svh bg-background p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between border-b border-border pb-4">
          <AuthBrand compact />
          <form action={logoutAction}>
            <Button type="submit" variant="outline">
              <LogOut aria-hidden="true" />
              Logout
            </Button>
          </form>
        </header>
        <section className="mt-8 rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Authenticated account</p>
          <h1 className="mt-1 text-2xl font-semibold">{user.fullName}</h1>
          <p className="mt-2 font-mono text-sm text-primary">{user.memberId}</p>
          <p className="mt-6 text-sm text-muted-foreground">
            The wallet dashboard is the next feature checkpoint. No placeholder
            balances are being shown.
          </p>
        </section>
      </div>
    </main>
  );
}
