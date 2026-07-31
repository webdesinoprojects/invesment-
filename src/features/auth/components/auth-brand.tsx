import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function AuthBrand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/login"
      className="inline-flex items-center gap-2 text-foreground"
      aria-label={`${BRAND_NAME} login`}
    >
      <BrandMark className={compact ? "size-9" : "size-12"} priority />
      <span className={cn("font-semibold tracking-normal", compact ? "text-sm sm:text-base" : "text-lg sm:text-xl")}>
        NEX-GEN <span className="text-primary">POWER</span>
      </span>
    </Link>
  );
}
