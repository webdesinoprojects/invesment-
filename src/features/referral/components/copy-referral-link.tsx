"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function CopyReferralLink({ url }: { url: string; isActive?: boolean }) {
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Referral link copied.");
    } catch {
      toast.error("Could not copy the link. Select and copy it manually.");
    }
  }

  return (
    <Button type="button" onClick={copyLink} className="h-10 shrink-0">
      <Copy aria-hidden="true" />
      Copy link
    </Button>
  );
}
