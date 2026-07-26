import type { ReactNode } from "react";

export function AuthShell({
  title,
  description,
  children,
  footer,
  wide = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
  wide?: boolean;
}) {
  return (
    <main className="flex min-h-[calc(100svh-4rem)] items-center justify-center px-4 py-8 sm:px-6">
      <section
        className={`w-full ${wide ? "max-w-xl" : "max-w-md"} rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/30 sm:p-7`}
      >
        <header className="mb-6 space-y-1.5">
          <h1 className="text-2xl font-semibold text-card-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </header>
        {children}
        <footer className="mt-6 border-t border-border pt-5 text-center text-sm text-muted-foreground">
          {footer}
        </footer>
      </section>
    </main>
  );
}
