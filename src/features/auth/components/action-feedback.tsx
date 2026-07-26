import { CircleCheck, TriangleAlert } from "lucide-react";

import type { ActionResult } from "@/types/action-result";

export function ActionFeedback({ state }: { state: ActionResult }) {
  if (state.code === "IDLE" || !state.message) {
    return null;
  }

  return (
    <div
      className={`flex gap-2 rounded-md border px-3 py-2.5 text-sm ${
        state.ok
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-destructive/30 bg-destructive/10 text-destructive"
      }`}
      role={state.ok ? "status" : "alert"}
    >
      {state.ok ? (
        <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      ) : (
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      )}
      <p>{state.message}</p>
    </div>
  );
}
