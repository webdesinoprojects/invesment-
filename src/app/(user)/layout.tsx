import type { ReactNode } from "react";
import { connection } from "next/server";

import { UserShell } from "@/components/layout/user-shell";
import { requireUser } from "@/lib/auth/require-user";

export default async function UserLayout({ children }: { children: ReactNode }) {
  await connection();
  const user = await requireUser();

  return <UserShell user={user}>{children}</UserShell>;
}
