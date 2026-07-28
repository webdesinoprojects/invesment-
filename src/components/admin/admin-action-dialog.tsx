"use client";

import { X } from "lucide-react";
import { useId, useRef, type ReactNode } from "react";

export function AdminActionDialog({
  triggerLabel,
  title,
  description,
  children,
  triggerClassName = "rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white",
}: {
  triggerLabel: string;
  title: string;
  description: string;
  children: ReactNode;
  triggerClassName?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={triggerClassName}
      >
        {triggerLabel}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
        className="m-auto w-[min(92vw,520px)] rounded-2xl border border-slate-200 bg-white p-0 text-slate-950 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm"
      >
        <div className="relative p-5 sm:p-6">
          <button
            type="button"
            aria-label="Close dialog"
            onClick={() => dialogRef.current?.close()}
            className="absolute right-4 top-4 grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="size-4" />
          </button>
          <h2 id={titleId} className="pr-10 text-lg font-bold">{title}</h2>
          <p id={descriptionId} className="mt-1 pr-8 text-sm leading-6 text-slate-600">
            {description}
          </p>
          <div className="mt-5">{children}</div>
        </div>
      </dialog>
    </>
  );
}
