import { authQueryKeys } from "@better-auth-ui/core";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import {
  Activity,
  Boxes,
  Clock,
  Download,
  FileArchive,
  Gamepad2,
  Ticket,
  Users,
} from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { forbidden, redirect } from "next/navigation";
import type { ComponentType } from "react";

import { AdminNav } from "@/app/admin/admin-nav";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAdminOverview, type AdminActivityItem } from "@/lib/admin-overview";
import { auth } from "@/lib/auth";
import { getDeployVersion } from "@/lib/deploy-version";
import { formatBytes } from "@/lib/game-file-constraints";
import { formatDateTime } from "@/lib/format-date";
import { getQueryClient } from "@/lib/query-client";

type MetricCardProps = {
  href?: string;
  icon: ComponentType<{ className?: string }>;
  note: string;
  title: string;
  value: string;
};

const activityIcons: Record<AdminActivityItem["type"], ComponentType<{ className?: string }>> = {
  file: FileArchive,
  game: Gamepad2,
  invite: Ticket,
  resource: Boxes,
  user: Users,
};

export default async function AdminOverviewPage() {
  const requestHeaders = await headers();
  const queryClient = getQueryClient();
  const session = await auth.api.getSession({ headers: requestHeaders });
  queryClient.setQueryData(authQueryKeys.session, session);

  if (!session) {
    redirect("/auth/sign-in");
  }

  const permission = await auth.api.userHasPermission({
    body: {
      userId: session.user.id,
      permissions: {
        user: ["list"],
      },
    },
  });

  if (!permission.success) {
    forbidden();
  }

  const overview = await getAdminOverview();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <main className="min-h-dvh bg-background">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
          <AdminNav deployVersion={getDeployVersion()} />

          <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Admin</p>
              <h1 className="text-2xl font-semibold tracking-normal">
                Site overview
              </h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="size-4" />
              Last change {formatDateTime(overview.lastChangedAt)}
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-3">
            <MetricCard
              title="Users"
              value={overview.totals.users.toString()}
              note={`${overview.totals.activeSessions} active sessions`}
              icon={Users}
              href="/admin/users"
            />
            <MetricCard
              title="Downloads"
              value={overview.totals.downloads.toString()}
              note="Every file download event"
              icon={Download}
              href="/admin/downloads"
            />
            <MetricCard
              title="Games"
              value={overview.totals.activeGames.toString()}
              note={`${overview.totals.archivedGames} archived`}
              icon={Gamepad2}
              href="/admin/games"
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-[1fr_380px]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="size-4" />
                  Recent activity
                </CardTitle>
                <CardDescription>
                  Latest account changes, invitations, games, files, and
                  resources.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview.activity.length ? (
                  overview.activity.map((item) => {
                    const Icon = activityIcons[item.type];

                    return (
                      <div
                        key={`${item.type}-${item.id}`}
                        className="flex items-start gap-3 rounded-lg border p-3"
                      >
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {item.title}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {item.detail}
                          </p>
                        </div>
                        <p className="shrink-0 text-xs text-muted-foreground">
                          {formatDateTime(item.at)}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No tracked activity yet.
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-col gap-4">
              <MetricCard
                title="Files"
                value={overview.totals.files.toString()}
                note={`${formatBytes(overview.totals.storageBytes)} stored`}
                icon={FileArchive}
                href="/admin/games"
              />
              <MetricCard
                title="Invitations"
                value={overview.totals.invitations.toString()}
                note={`${overview.totals.openInvitations} open codes`}
                icon={Ticket}
                href="/admin/invitations"
              />
            </div>
          </section>
        </div>
      </main>
    </HydrationBoundary>
  );
}

function MetricCard({ href, icon: Icon, note, title, value }: MetricCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-4" />
          {title}
        </CardTitle>
        {href ? (
          <CardAction>
            <Button variant="outline" size="sm" asChild>
              <Link href={href}>Open</Link>
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-normal">{value}</p>
        <p className="mt-1 text-sm text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}
