"use client";

import { LogIn } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { authClient } from "@/lib/auth-client";

export function ImpersonateUserButton({
  email,
  userId,
}: {
  email: string;
  userId: string;
}) {
  const [pending, setPending] = useState(false);

  async function impersonateUser() {
    setPending(true);

    const { error } = await authClient.admin.impersonateUser({
      userId,
    });

    if (error) {
      setPending(false);
      toast.error(error.message || "Could not impersonate this user.");
      return;
    }

    window.location.assign("/");
  }

  return (
    <ConfirmActionButton
      variant="outline"
      className="w-full"
      disabled={pending}
      confirmTitle="Impersonate this user?"
      confirmDescription={`You will leave admin as yourself and browse as ${email}.`}
      confirmLabel="Impersonate"
      onConfirm={impersonateUser}
    >
      <LogIn />
      {pending ? "Starting..." : "Impersonate"}
    </ConfirmActionButton>
  );
}
