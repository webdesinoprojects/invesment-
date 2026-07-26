import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { TeamTab } from "@/features/team/types/team";

export function TeamPagination({
  tab,
  page,
  totalPages,
  totalRows,
}: {
  tab: TeamTab;
  page: number;
  totalPages: number;
  totalRows: number;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
      <p className="text-xs text-muted-foreground">
        Page {page} of {totalPages} · {totalRows} members
      </p>
      <div className="flex gap-2">
        {page <= 1 ? (
          <Button variant="outline" size="icon" disabled aria-label="Previous page">
            <ChevronLeft aria-hidden="true" />
          </Button>
        ) : (
          <Button asChild variant="outline" size="icon">
            <Link href={`/team?tab=${tab}&page=${page - 1}`} aria-label="Previous page">
              <ChevronLeft aria-hidden="true" />
            </Link>
          </Button>
        )}
        {page >= totalPages ? (
          <Button variant="outline" size="icon" disabled aria-label="Next page">
            <ChevronRight aria-hidden="true" />
          </Button>
        ) : (
          <Button asChild variant="outline" size="icon">
            <Link href={`/team?tab=${tab}&page=${page + 1}`} aria-label="Next page">
              <ChevronRight aria-hidden="true" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
