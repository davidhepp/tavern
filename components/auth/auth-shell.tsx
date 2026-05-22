import type { ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-6xl items-center gap-8 px-4 py-8 md:grid-cols-[1fr_420px] md:px-6">
      <section className="flex flex-col gap-4">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-muted-foreground">Tavern</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal md:text-4xl">
            A private place for your shared game library.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            Sign in to browse collections, download game files, and keep useful
            resources close without digging through scattered links.
          </p>
        </div>
      </section>

      <section className="flex justify-center md:justify-end">{children}</section>
    </main>
  );
}
