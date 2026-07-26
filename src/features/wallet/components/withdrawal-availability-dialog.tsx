"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function WithdrawalAvailabilityDialog({
  show,
  allowedDays,
}: {
  show: boolean;
  allowedDays: number[];
}) {
  return (
    <AlertDialog defaultOpen={show}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Withdrawal window is closed</AlertDialogTitle>
          <AlertDialogDescription>
            Withdrawals open only on {formatAllowedDays(allowedDays)} of every month.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>Understood</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function formatAllowedDays(days: number[]): string {
  return days.map((day) => `${day}${ordinalSuffix(day)}`).join(" and ");
}

function ordinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return "th";
  if (day % 10 === 1) return "st";
  if (day % 10 === 2) return "nd";
  if (day % 10 === 3) return "rd";
  return "th";
}
