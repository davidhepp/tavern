import { authQueryKeys } from "@better-auth-ui/core";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import {
  ArrowUpRight,
  CalendarDays,
  CircleCheck,
  Flame,
  Sparkles,
  Users,
} from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { UserButton } from "@/components/auth/user/user-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { auth } from "@/lib/auth";
import { getQueryClient } from "@/lib/query-client";

const stats = [
  {
    label: "Open tabs",
    value: "12",
    note: "3 need attention",
    icon: Flame,
  },
  {
    label: "Crew online",
    value: "8",
    note: "Demo workspace",
    icon: Users,
  },
  {
    label: "This week",
    value: "24",
    note: "Planned check-ins",
    icon: CalendarDays,
  },
];

const activity = [
  "Morning prep list marked ready",
  "Inventory note drafted for Friday",
  "Shift handoff cleaned up",
];

export default async function Home() {
  const queryClient = getQueryClient();
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  queryClient.setQueryData(authQueryKeys.session, session);

  if (!session) {
    redirect("/auth/sign-in");
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <main className="min-h-dvh bg-background">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Tavern dashboard</p>
              <h1 className="text-2xl font-semibold tracking-normal">
                Welcome back, {session.user.name || session.user.email}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <UserButton size="icon" align="end" />
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-3">
            {stats.map((stat) => (
              <Card key={stat.label}>
                <CardHeader>
                  <CardTitle>{stat.label}</CardTitle>
                  <CardDescription>{stat.note}</CardDescription>
                  <CardAction>
                    <div className="flex size-8 items-center justify-center rounded-md bg-muted">
                      <stat.icon className="size-4" />
                    </div>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Today&apos;s board</CardTitle>
                <CardDescription>
                  A compact demo overview for the authenticated workspace.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {activity.map((item, index) => (
                  <div key={item}>
                    {index > 0 ? <Separator className="mb-3" /> : null}
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <CircleCheck className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item}</p>
                        <p className="text-xs text-muted-foreground">
                          Demo status synced a few minutes ago.
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick note</CardTitle>
                <CardDescription>
                  Keep the next action visible for the team.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-muted/40 p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="size-4" />
                    Demo focus
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Review the evening handoff, confirm the prep checklist, and
                    leave one clear note for tomorrow.
                  </p>
                </div>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/settings/security">
                    Account security
                    <ArrowUpRight className="size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </HydrationBoundary>
  );
}
