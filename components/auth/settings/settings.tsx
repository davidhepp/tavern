"use client"

import type { SettingsView } from "@better-auth-ui/core"
import { useAuth, useAuthenticate } from "@better-auth-ui/react"
import { useMemo, useState } from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { AccountSettings } from "./account/account-settings"
import { SecuritySettings } from "./security/security-settings"

export type SettingsProps = {
  className?: string
  path?: string
  /** @remarks `SettingsView` */
  view?: SettingsView
  hideNav?: boolean
  navigation?: "links" | "local"
}

/**
 * Renders the settings UI and activates the appropriate settings view based on `view` or `path`.
 *
 * @param className - Additional CSS class names applied to the root container
 * @param path - Route path used to resolve which settings view to activate when `view` is not provided
 * @param view - Explicit settings view to activate (for example, `"account"` or `"security"`)
 * @param hideNav - When `true`, hides the settings navigation tabs
 * @returns A JSX element rendering the settings layout and the selected settings panel
 */
export function Settings({
  className,
  view,
  path,
  hideNav,
  navigation = "links"
}: SettingsProps) {
  const { authClient, basePaths, localization, viewPaths, Link } = useAuth()
  useAuthenticate(authClient)

  if (!view && !path) {
    throw new Error("[Better Auth UI] Either `view` or `path` must be provided")
  }

  const settingsPathViews = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(viewPaths.settings).map(([k, v]) => [v, k])
      ) as Record<string, SettingsView>,
    [viewPaths.settings]
  )

  const initialView = view || (path ? settingsPathViews[path] : undefined)
  const [localView, setLocalView] = useState<SettingsView>(
    initialView ?? "account"
  )
  const currentView = navigation === "local" ? localView : initialView

  return (
    <Tabs
      value={currentView}
      onValueChange={(value) => setLocalView(value as SettingsView)}
      className={cn("w-full gap-4 md:gap-6", className)}
    >
      <div className={cn(hideNav && "hidden")}>
        <TabsList aria-label={localization.settings.settings}>
          {navigation === "links" ? (
            <TabsTrigger value="account" asChild>
              <Link href={`${basePaths.settings}/${viewPaths.settings.account}`}>
                {localization.settings.account}
              </Link>
            </TabsTrigger>
          ) : (
            <TabsTrigger value="account">
              {localization.settings.account}
            </TabsTrigger>
          )}

          {navigation === "links" ? (
            <TabsTrigger value="security" asChild>
              <Link
                href={`${basePaths.settings}/${viewPaths.settings.security}`}
              >
                {localization.settings.security}
              </Link>
            </TabsTrigger>
          ) : (
            <TabsTrigger value="security">
              {localization.settings.security}
            </TabsTrigger>
          )}
        </TabsList>
      </div>

      <TabsContent value="account" tabIndex={-1}>
        <AccountSettings />
      </TabsContent>

      <TabsContent value="security" tabIndex={-1}>
        <SecuritySettings />
      </TabsContent>
    </Tabs>
  )
}
