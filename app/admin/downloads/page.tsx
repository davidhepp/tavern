import { authQueryKeys } from "@better-auth-ui/core";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Download, FileArchive, Users } from "lucide-react";
import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import type { ComponentType } from "react";

import { AdminNav } from "@/components/admin/admin-nav";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAdminDownloads } from "@/lib/admin-downloads";
import { auth } from "@/lib/auth";
import { getDeployVersion } from "@/lib/deploy-version";
import { formatBytes } from "@/lib/game-file-constraints";
import { formatDateTime } from "@/lib/format-date";
import { getQueryClient } from "@/lib/query-client";

type MetricCardProps = {
  icon: ComponentType<{ className?: string }>;
  note: string;
  title: string;
  value: string;
};

export default async function AdminDownloadsPage() {
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

  const { downloads, totals } = await getAdminDownloads();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <main className="min-h-dvh bg-background">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
          <AdminNav deployVersion={getDeployVersion()} />

          <header>
            <p className="text-sm text-muted-foreground">Admin</p>
            <h1 className="text-2xl font-semibold tracking-normal">
              Downloads
            </h1>
          </header>

          <section className="grid gap-4 md:grid-cols-3">
            <MetricCard
              title="Total downloads"
              value={totals.count.toString()}
              note="Every file download event"
              icon={Download}
            />
            <MetricCard
              title="Downloaded files"
              value={totals.files.toString()}
              note="Files with at least one download"
              icon={FileArchive}
            />
            <MetricCard
              title="Downloaders"
              value={totals.users.toString()}
              note="Users who downloaded files"
              icon={Users}
            />
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Download events</CardTitle>
              <CardDescription>
                Latest 100 file downloads with user, file, and exact timestamp.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {downloads.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[880px] text-left text-sm">
                    <thead className="border-b text-xs text-muted-foreground">
                      <tr>
                        <th className="py-2 pr-4 font-medium">Time</th>
                        <th className="py-2 pr-4 font-medium">User</th>
                        <th className="py-2 pr-4 font-medium">Game</th>
                        <th className="py-2 pr-4 font-medium">File</th>
                        <th className="py-2 pr-4 font-medium">Size</th>
                        <th className="py-2 pr-4 font-medium">IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {downloads.map((download) => (
                        <tr key={download.id} className="border-b last:border-b-0">
                          <td className="whitespace-nowrap py-3 pr-4 text-muted-foreground">
                            {formatDateTime(download.at)}
                          </td>
                          <td className="py-3 pr-4">
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {download.userName || "Unnamed user"}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {download.userEmail}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 pr-4">{download.gameTitle}</td>
                          <td className="py-3 pr-4">
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {download.filename}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {download.mimeType}
                              </p>
                            </div>
                          </td>
                          <td className="whitespace-nowrap py-3 pr-4 text-muted-foreground">
                            {formatBytes(download.sizeBytes)}
                          </td>
                          <td className="whitespace-nowrap py-3 pr-4 text-muted-foreground">
                            {download.ipAddress || "Unknown"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No file downloads have been recorded yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </HydrationBoundary>
  );
}

function MetricCard({ icon: Icon, note, title, value }: MetricCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-normal">{value}</p>
        <p className="mt-1 text-sm text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}
