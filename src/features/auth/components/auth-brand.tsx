import { Leaf, Zap } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function AuthBrand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/login"
      className="inline-flex items-center gap-2 text-foreground"
      aria-label="Nature Power login"
    >
      <span
        className={cn(
          "relative grid place-items-center rounded-md border border-primary/40 bg-primary/10 text-primary",
          compact ? "size-8" : "size-11",
        )}
      >
        <Leaf className={compact ? "size-4" : "size-6"} aria-hidden="true" />
        <Zap
          className="absolute -right-1 -bottom-1 size-3.5 fill-amber-400 text-amber-400"
          aria-hidden="true"
        />
      </span>
      <span className={cn("font-semibold", compact ? "text-base" : "text-xl")}>
        Nature<span className="text-primary">Power</span>
      </span>
    </Link>
  );
}
