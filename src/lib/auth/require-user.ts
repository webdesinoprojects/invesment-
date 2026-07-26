import "server-only";

import { redirect } from "next/navigation";

import { getPrisma } from "@/lib/db/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthenticatedUser = {
  id: string;
  authUserId: string;
  memberId: string;
  fullName: string;
  status: "PENDING" | "ACTIVE" | "BLOCKED";
};

export async function requireUser(): Promise<AuthenticatedUser> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const authUserId = data?.claims?.sub;

  if (!authUserId) {
    redirect("/login");
  }

  const profile = await getPrisma().userProfile.findUnique({
    where: { authUserId },
    select: {
      id: true,
      authUserId: true,
      memberId: true,
      fullName: true,
      status: true,
    },
  });

  if (!profile || profile.status === "BLOCKED") {
    await supabase.auth.signOut();
    redirect("/login");
  }

  return profile;
}
