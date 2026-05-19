import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="grid max-w-md gap-4 text-center">
        <div>
          <p className="text-sm text-muted-foreground">404</p>
          <h1 className="text-2xl font-semibold">Not found</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          The page you are looking for does not exist.
        </p>
        <div>
          <Button asChild>
            <Link href="/">Return to dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
