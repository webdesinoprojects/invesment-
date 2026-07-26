import { LogOut } from "lucide-react";
import type { ReactNode } from "react";

import { BottomNavLinks } from "@/components/layout/bottom-nav-links";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/features/auth/actions/logout";
import { AuthBrand } from "@/features/auth/components/auth-brand";
import type { AuthenticatedUser } from "@/lib/auth/require-user";

function initials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function UserShell({
  user,
  children,
}: {
  user: AuthenticatedUser;
  children: ReactNode;
}) {
  return (
    <div className="min-h-svh bg-background pb-20">
      <header className="sticky top-0 z-40 h-16 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <AuthBrand compact />
          <div
            className="grid size-9 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
            title={`${user.fullName} (${user.memberId})`}
          >
            {initials(user.fullName)}
          </div>
        </div>
      </header>
      {children}
      <nav className="fixed inset-x-0 bottom-0 z-50 h-16 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-full max-w-6xl">
          <BottomNavLinks />
          <form action={logoutAction} className="flex w-[18%] max-w-28">
            <Button
              type="submit"
              variant="ghost"
              className="h-full w-full flex-col gap-1 rounded-none text-[0.68rem] text-muted-foreground"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Logout
            </Button>
          </form>
        </div>
      </nav>
    </div>
  );
}
