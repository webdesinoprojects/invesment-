"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function UserRouteError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto grid min-h-[60svh] w-full max-w-3xl place-items-center px-4 py-8">
      <section className="w-full rounded-lg border border-destructive/30 bg-card p-6 text-center">
        <TriangleAlert className="mx-auto size-8 text-destructive" aria-hidden="true" />
        <h1 className="mt-4 text-lg font-semibold">Account data could not be loaded</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The request failed before the page was completed. No action was submitted.
        </p>
        <Button type="button" onClick={reset} className="mt-5">
          <RefreshCw aria-hidden="true" />
          Try again
        </Button>
      </section>
    </main>
  );
}
