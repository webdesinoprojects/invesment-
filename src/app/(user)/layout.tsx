import type { ReactNode } from "react";
import { connection } from "next/server";

import { requireUser } from "@/lib/auth/require-user";

export default async function UserLayout({ children }: { children: ReactNode }) {
  await connection();
  await requireUser();

  return <>{children}</>;
}
