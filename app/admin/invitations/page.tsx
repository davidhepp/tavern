import { randomBytes, randomUUID } from "node:crypto";
import { authQueryKeys } from "@better-auth-ui/core";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Ticket } from "lucide-react";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/admin-nav";
import {
  InvitationHistoryCard,
  type InvitationHistoryItem,
} from "@/components/admin/invitation-history-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDeployVersion } from "@/lib/deploy-version";
import { getQueryClient } from "@/lib/query-client";
import { invitationCode, user as userTable } from "@/schema";

function valueFrom(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function generateInvitationCode() {
  return randomBytes(6).toString("hex").toUpperCase();
}

async function requestHeaders() {
  return headers();
}

async function requireAdminSession() {
  const requestHeaderList = await requestHeaders();
  const session = await auth.api.getSession({ headers: requestHeaderList });

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

  return { session, headers: requestHeaderList };
}

async function createInvitationAction(formData: FormData) {
  "use server";

  const { session } = await requireAdminSession();

  await db.insert(invitationCode).values({
    id: randomUUID(),
    code: generateInvitationCode(),
    note: valueFrom(formData, "note") || null,
    createdBy: session.user.id,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/invitations");
}

async function revokeInvitationAction(formData: FormData) {
  "use server";

  await requireAdminSession();

  await db
    .update(invitationCode)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(invitationCode.id, valueFrom(formData, "invitationId")),
        isNull(invitationCode.usedAt),
        isNull(invitationCode.revokedAt),
      ),
    );

  revalidatePath("/admin");
  revalidatePath("/admin/invitations");
}

export default async function AdminInvitationsPage() {
  const requestHeaderList = await headers();
  const queryClient = getQueryClient();
  const session = await auth.api.getSession({ headers: requestHeaderList });
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

  const invitations = await db
    .select()
    .from(invitationCode)
    .orderBy(desc(invitationCode.createdAt))
    .limit(5);
  const invitationUserIds = Array.from(
    new Set(
      invitations
        .flatMap((invitation) => [invitation.createdBy, invitation.usedBy])
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const invitationUsers = invitationUserIds.length
    ? await db
        .select({
          id: userTable.id,
          name: userTable.name,
          email: userTable.email,
        })
        .from(userTable)
        .where(inArray(userTable.id, invitationUserIds))
    : [];
  const invitationUserById = new Map(
    invitationUsers.map((user) => [user.id, user]),
  );
  const invitationHistoryItems: InvitationHistoryItem[] = invitations.map(
    (invitation) => ({
      ...invitation,
      creator: invitation.createdBy
        ? invitationUserById.get(invitation.createdBy)
        : undefined,
      usedByUser: invitation.usedBy
        ? invitationUserById.get(invitation.usedBy)
        : undefined,
    }),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <main className="min-h-dvh bg-background">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
          <AdminNav deployVersion={getDeployVersion()} />

          <header>
            <p className="text-sm text-muted-foreground">Admin</p>
            <h1 className="text-2xl font-semibold tracking-normal">
              Invitations
            </h1>
          </header>

          <section className="grid gap-4 lg:grid-cols-[380px_1fr]">
            <CreateInvitationCard />
            <InvitationHistoryCard
              invitations={invitationHistoryItems}
              revokeInvitationAction={revokeInvitationAction}
            />
          </section>
        </div>
      </main>
    </HydrationBoundary>
  );
}

function CreateInvitationCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="size-4" />
          Invitation code
        </CardTitle>
        <CardDescription>
          Generate a one-time code for email and password registration.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={createInvitationAction} className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Internal note</Label>
            <Textarea
              name="note"
              placeholder="Who this invite is for, request context, or ticket reference"
            />
          </div>
          <Button type="submit">
            <Ticket />
            Generate code
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
