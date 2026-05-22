"use client";

import { useSession } from "@better-auth-ui/react";
import { XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function ImpersonationBanner() {
  const { data: session, isPending } = useSession(authClient);
  const [pending, setPending] = useState(false);
  const impersonatedBy = session?.session.impersonatedBy;

  if (isPending || !impersonatedBy) return null;

  async function stopImpersonating() {
    setPending(true);

    const { error } = await authClient.admin.stopImpersonating();

    if (error) {
      setPending(false);
      toast.error(error.message || "Could not stop impersonating.");
      return;
    }

    window.location.assign("/admin/users");
  }

  return (
    <div className="border-b bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>
          You are impersonating {session.user.email}. Actions are being performed
          as this user.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={stopImpersonating}
        >
          <XCircle />
          {pending ? "Stopping..." : "Stop impersonating"}
        </Button>
      </div>
    </div>
  );
}
