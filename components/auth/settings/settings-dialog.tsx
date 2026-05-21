"use client"

import { useAuth } from "@better-auth-ui/react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Settings } from "./settings"

export type SettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { localization } = useAuth()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(86svh,760px)] max-w-3xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden p-0">
        <DialogHeader className="border-b px-5 pt-5 pb-4">
          <DialogTitle>{localization.settings.settings}</DialogTitle>
          <DialogDescription>
            Manage your profile, sign-in methods, and active sessions.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto px-5 py-5">
          <Settings view="account" navigation="local" />
        </div>
      </DialogContent>
    </Dialog>
  )
}
