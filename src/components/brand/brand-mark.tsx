import Image from "next/image";

import { BRAND_LOGO_PATH, BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  priority?: boolean;
};

export function BrandMark({ className, priority = false }: BrandMarkProps) {
  return (
    <Image
      src={BRAND_LOGO_PATH}
      alt={`${BRAND_NAME} logo`}
      width={256}
      height={256}
      priority={priority}
      className={cn("shrink-0 object-contain", className)}
    />
  );
}
