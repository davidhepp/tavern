import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Forbidden() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="grid max-w-md gap-4 text-center">
        <div>
          <p className="text-sm text-muted-foreground">403</p>
          <h1 className="text-2xl font-semibold">Forbidden</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Your account does not have permission to access this page.
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
