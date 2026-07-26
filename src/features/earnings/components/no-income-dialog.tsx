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

export function NoIncomeDialog({ show }: { show: boolean }) {
  return (
    <AlertDialog defaultOpen={show}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>No rank income</AlertDialogTitle>
          <AlertDialogDescription>Income does not exist.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>Understood</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
