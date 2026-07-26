import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function QueryPagination({
  basePath,
  query,
  page,
  totalPages,
  totalRows,
  rowLabel,
}: {
  basePath: string;
  query: Record<string, string>;
  page: number;
  totalPages: number;
  totalRows: number;
  rowLabel: string;
}) {
  if (totalPages <= 1) return null;

  const pageHref = (nextPage: number) => {
    const parameters = new URLSearchParams(query);
    parameters.set("page", String(nextPage));
    return `${basePath}?${parameters.toString()}`;
  };

  return (
    <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
      <p className="text-xs text-muted-foreground">
        Page {page} of {totalPages} - {totalRows} {rowLabel}
      </p>
      <div className="flex gap-2">
        {page <= 1 ? (
          <Button variant="outline" size="icon" disabled aria-label="Previous page">
            <ChevronLeft aria-hidden="true" />
          </Button>
        ) : (
          <Button asChild variant="outline" size="icon">
            <Link href={pageHref(page - 1)} aria-label="Previous page">
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
            <Link href={pageHref(page + 1)} aria-label="Next page">
              <ChevronRight aria-hidden="true" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
