"use client";

import { Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function CopyReferralLink({
  url,
  isActive,
}: {
  url: string;
  isActive: boolean;
}) {
  const [restrictionOpen, setRestrictionOpen] = useState(false);

  async function copyLink() {
    if (!isActive) {
      setRestrictionOpen(true);
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Referral link copied.");
    } catch {
      toast.error("Could not copy the link. Select and copy it manually.");
    }
  }

  return (
    <>
      <Button type="button" onClick={copyLink} className="h-10 shrink-0">
        <Copy aria-hidden="true" />
        Copy link
      </Button>
      <AlertDialog open={restrictionOpen} onOpenChange={setRestrictionOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Referral access is locked</AlertDialogTitle>
            <AlertDialogDescription>
              Referral privileges are available only after your account has an
              approved active investment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Understood</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
