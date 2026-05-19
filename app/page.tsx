import { authQueryKeys } from "@better-auth-ui/core";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { GameLibraryDashboard } from "@/app/game-library-dashboard";
import { auth } from "@/lib/auth";
import { getGameLibrary, getGameLibraryStats } from "@/lib/game-library";
import { getQueryClient } from "@/lib/query-client";

export default async function Home() {
  const queryClient = getQueryClient();
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  queryClient.setQueryData(authQueryKeys.session, session);

  if (!session) {
    redirect("/auth/sign-in");
  }

  const [library, stats] = await Promise.all([
    getGameLibrary(),
    getGameLibraryStats(),
  ]);
  const userRole =
    "role" in session.user ? (session.user.role as string | undefined) : "";
  const isAdmin = userRole?.split(",").includes("admin") ?? false;

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <GameLibraryDashboard
        isAdmin={isAdmin}
        library={library}
        stats={stats}
      />
    </HydrationBoundary>
  );
}
