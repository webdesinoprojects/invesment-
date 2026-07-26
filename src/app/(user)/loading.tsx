export default function UserRouteLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-5 sm:px-6 sm:py-7" aria-busy="true">
      <div className="h-12 w-full max-w-sm animate-pulse rounded-md bg-muted" />
      <div className="h-28 animate-pulse rounded-lg border border-border bg-card" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-lg border border-border bg-card" />
        ))}
      </div>
      <span className="sr-only">Loading account data</span>
    </main>
  );
}
