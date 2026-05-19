import { authQueryKeys, viewPaths } from "@better-auth-ui/core";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Settings } from "@/components/auth/settings/settings";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { getQueryClient } from "@/lib/query-client";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{
    path: string;
  }>;
}) {
  const { path } = await params;

  if (!Object.values(viewPaths.settings).includes(path)) {
    notFound();
  }

  const requestHeaders = await headers();
  const queryClient = getQueryClient();

  const session = await auth.api.getSession({
    headers: requestHeaders,
  });
  queryClient.setQueryData(authQueryKeys.session, session);

  if (!session) {
    redirect("/auth/sign-in");
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="w-full max-w-3xl mx-auto p-4 md:p-6 space-y-4">
        <Button variant="outline" asChild>
          <Link href="/">
            <ArrowLeft />
            Back
          </Link>
        </Button>
        <Settings path={path} />
      </div>
    </HydrationBoundary>
  );
}
