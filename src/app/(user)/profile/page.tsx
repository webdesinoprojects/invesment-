import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { ProfileOverview } from "@/features/profile/components/profile-overview";
import { getProfileData } from "@/features/profile/queries/get-profile-data";
import { requireUser } from "@/lib/auth/require-user";

export const metadata: Metadata = { title: "My Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const profile = await getProfileData(user.id);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-5 px-4 py-5 sm:px-6 sm:py-7">
      <PageHeader
        title="My Profile"
        description="Review your personal details and manage account security."
      />
      <ProfileOverview profile={profile} />
    </main>
  );
}
