"use client";

import { useEffect } from "react";
import { toast } from "sonner";

const successMessages: Record<string, string> = {
  "game-created": "Game created.",
  "game-updated": "Game saved.",
  "game-deleted": "Game deleted.",
  "resource-created": "Resource added.",
  "resource-updated": "Resource saved.",
  "resource-deleted": "Resource deleted.",
};

const errorMessages: Record<string, string> = {
  "game-create-failed": "Could not create the game.",
  "game-update-failed": "Could not save the game.",
  "game-delete-failed": "Could not delete the game.",
  "resource-create-failed": "Could not add the resource.",
  "resource-update-failed": "Could not save the resource.",
  "resource-delete-failed": "Could not delete the resource.",
};

export function GameActionToaster({
  success,
  error,
}: {
  success?: string;
  error?: string;
}) {
  useEffect(() => {
    if (success && successMessages[success]) {
      toast.success(successMessages[success]);
    }

    if (error && errorMessages[error]) {
      toast.error(errorMessages[error]);
    }
  }, [success, error]);

  return null;
}
