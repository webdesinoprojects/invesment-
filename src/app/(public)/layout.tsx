import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { AuthBrand } from "@/features/auth/components/auth-brand";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh bg-background">
      <header className="h-16 border-b border-border bg-card/70">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <AuthBrand compact />
          <nav className="flex items-center gap-2" aria-label="Authentication">
            <Button asChild variant="ghost">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Register</Link>
            </Button>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
