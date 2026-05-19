import { authQueryKeys } from "@better-auth-ui/core";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import {
  Ban,
  KeyRound,
  LogIn,
  ShieldCheck,
  Trash2,
  UserCog,
  UserPlus,
  XCircle,
} from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { forbidden, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { auth } from "@/lib/auth";
import { getQueryClient } from "@/lib/query-client";
import { cn } from "@/lib/utils";

type ListUsersResult = Awaited<ReturnType<typeof auth.api.listUsers>>;
type AdminUser = ListUsersResult["users"][number];
type UserSession = Awaited<
  ReturnType<typeof auth.api.listUserSessions>
>["sessions"][number];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const pageSize = 20;

function valueFrom(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function roleFrom(formData: FormData) {
  return valueFrom(formData, "role") === "admin" ? "admin" : "user";
}

async function requestHeaders() {
  return headers();
}

async function createUserAction(formData: FormData) {
  "use server";

  const email = valueFrom(formData, "email");
  const name = valueFrom(formData, "name");
  const password = valueFrom(formData, "password");

  await auth.api.createUser({
    body: {
      email,
      name,
      password: password || undefined,
      role: roleFrom(formData),
    },
    headers: await requestHeaders(),
  });

  revalidatePath("/admin");
}

async function updateUserAction(formData: FormData) {
  "use server";

  const userId = valueFrom(formData, "userId");
  const name = valueFrom(formData, "name");
  const email = valueFrom(formData, "email");

  await auth.api.adminUpdateUser({
    body: {
      userId,
      data: {
        ...(name ? { name } : {}),
        ...(email ? { email } : {}),
      },
    },
    headers: await requestHeaders(),
  });

  revalidatePath("/admin");
}

async function setRoleAction(formData: FormData) {
  "use server";

  await auth.api.setRole({
    body: {
      userId: valueFrom(formData, "userId"),
      role: roleFrom(formData),
    },
    headers: await requestHeaders(),
  });

  revalidatePath("/admin");
}

async function setPasswordAction(formData: FormData) {
  "use server";

  await auth.api.setUserPassword({
    body: {
      userId: valueFrom(formData, "userId"),
      newPassword: valueFrom(formData, "newPassword"),
    },
    headers: await requestHeaders(),
  });

  revalidatePath("/admin");
}

async function banUserAction(formData: FormData) {
  "use server";

  const expiresIn = Number(valueFrom(formData, "banExpiresIn"));

  await auth.api.banUser({
    body: {
      userId: valueFrom(formData, "userId"),
      banReason: valueFrom(formData, "banReason") || undefined,
      banExpiresIn: Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : undefined,
    },
    headers: await requestHeaders(),
  });

  revalidatePath("/admin");
}

async function unbanUserAction(formData: FormData) {
  "use server";

  await auth.api.unbanUser({
    body: { userId: valueFrom(formData, "userId") },
    headers: await requestHeaders(),
  });

  revalidatePath("/admin");
}

async function revokeSessionAction(formData: FormData) {
  "use server";

  await auth.api.revokeUserSession({
    body: { sessionToken: valueFrom(formData, "sessionToken") },
    headers: await requestHeaders(),
  });

  revalidatePath("/admin");
}

async function revokeSessionsAction(formData: FormData) {
  "use server";

  await auth.api.revokeUserSessions({
    body: { userId: valueFrom(formData, "userId") },
    headers: await requestHeaders(),
  });

  revalidatePath("/admin");
}

async function impersonateUserAction(formData: FormData) {
  "use server";

  await auth.api.impersonateUser({
    body: { userId: valueFrom(formData, "userId") },
    headers: await requestHeaders(),
  });

  redirect("/");
}

async function stopImpersonatingAction() {
  "use server";

  await auth.api.stopImpersonating({
    headers: await requestHeaders(),
  });

  redirect("/admin");
}

async function removeUserAction(formData: FormData) {
  "use server";

  await auth.api.removeUser({
    body: { userId: valueFrom(formData, "userId") },
    headers: await requestHeaders(),
  });

  revalidatePath("/admin");
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const requestHeaderList = await headers();
  const queryClient = getQueryClient();
  const session = await auth.api.getSession({ headers: requestHeaderList });
  queryClient.setQueryData(authQueryKeys.session, session);

  if (!session) {
    redirect("/auth/sign-in");
  }

  const page = Math.max(Number(firstParam(params.page) ?? "1"), 1);
  const search = firstParam(params.search)?.trim() ?? "";
  const selectedUserId = firstParam(params.userId);
  const offset = (page - 1) * pageSize;

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

  const usersResult = await auth.api.listUsers({
    query: {
      limit: pageSize,
      offset,
      sortBy: "createdAt",
      sortDirection: "desc",
      ...(search
        ? {
            searchField: "email" as const,
            searchOperator: "contains" as const,
            searchValue: search,
          }
        : {}),
    },
    headers: requestHeaderList,
  });

  const selectedUser =
    selectedUserId &&
    (await auth.api.getUser({
      query: { id: selectedUserId },
      headers: requestHeaderList,
    }));

  const selectedSessions =
    selectedUserId &&
    (await auth.api.listUserSessions({
      body: { userId: selectedUserId },
      headers: requestHeaderList,
    }));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <main className="min-h-dvh bg-background">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Admin</p>
              <h1 className="text-2xl font-semibold tracking-normal">
                User management
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" asChild>
                <Link href="/">Dashboard</Link>
              </Button>
              <UserButton size="icon" align="end" />
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-3">
            <MetricCard title="Users" value={usersResult.total.toString()} note="Total accounts" />
            <MetricCard
              title="Listed"
              value={usersResult.users.length.toString()}
              note={`Page ${page}`}
            />
            <MetricCard
              title="Permissions"
              value={permission.success ? "Granted" : "Limited"}
              note="Admin API check"
            />
          </section>

          {session.session.impersonatedBy ? (
            <Card>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">Impersonation active</p>
                  <p className="text-sm text-muted-foreground">
                    You are currently browsing as another user.
                  </p>
                </div>
                <form action={stopImpersonatingAction}>
                  <Button type="submit" variant="outline">
                    <XCircle />
                    Stop impersonating
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          <section className="grid gap-4 xl:grid-cols-[1fr_420px]">
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Users</CardTitle>
                  <CardDescription>
                    Search, inspect, and manage accounts through Better Auth admin endpoints.
                  </CardDescription>
                  <CardAction>
                    <form className="flex gap-2" action="/admin">
                      <Input
                        name="search"
                        defaultValue={search}
                        placeholder="Search email"
                        className="w-48"
                      />
                      <Button type="submit" variant="outline">
                        Search
                      </Button>
                    </form>
                  </CardAction>
                </CardHeader>
                <CardContent className="space-y-3">
                  {usersResult.users.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      selected={selectedUserId === user.id}
                    />
                  ))}

                  <div className="flex items-center justify-between pt-2">
                    <Button variant="outline" disabled={page <= 1} asChild={page > 1}>
                      {page > 1 ? (
                        <Link href={`/admin?page=${page - 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`}>
                          Previous
                        </Link>
                      ) : (
                        "Previous"
                      )}
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      {offset + 1}-{offset + usersResult.users.length} of {usersResult.total}
                    </p>
                    <Button
                      variant="outline"
                      disabled={offset + pageSize >= usersResult.total}
                      asChild={offset + pageSize < usersResult.total}
                    >
                      {offset + pageSize < usersResult.total ? (
                        <Link href={`/admin?page=${page + 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`}>
                          Next
                        </Link>
                      ) : (
                        "Next"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <CreateUserCard />
            </div>

            <aside className="flex flex-col gap-4">
              {selectedUser ? (
                <>
                  <UserDetailCard user={selectedUser} />
                  <UserActionsCard user={selectedUser} />
                  <SessionsCard
                    sessions={selectedSessions ? selectedSessions.sessions : []}
                    userId={selectedUser.id}
                  />
                </>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Select a user</CardTitle>
                    <CardDescription>
                      Pick an account from the list to open role, ban, session,
                      impersonation, password, update, and delete actions.
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
            </aside>
          </section>
        </div>
      </main>
    </HydrationBoundary>
  );
}

function MetricCard({
  title,
  value,
  note,
}: {
  title: string;
  value: string;
  note: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{note}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function UserRow({ user, selected }: { user: AdminUser; selected: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between",
        selected && "border-primary bg-primary/5",
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{user.name || "Unnamed user"}</p>
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {user.role || "user"}
          </span>
          {user.banned ? (
            <span className="rounded-md bg-destructive/10 px-1.5 py-0.5 text-xs text-destructive">
              banned
            </span>
          ) : null}
        </div>
        <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        <p className="text-xs text-muted-foreground">Created {formatDate(user.createdAt)}</p>
      </div>
      <Button variant={selected ? "default" : "outline"} asChild>
        <Link href={`/admin?userId=${user.id}`}>Manage</Link>
      </Button>
    </div>
  );
}

function CreateUserCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create user</CardTitle>
        <CardDescription>
          Uses the Better Auth admin create user endpoint.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={createUserAction} className="grid gap-3 md:grid-cols-4">
          <Field label="Name">
            <Input name="name" required placeholder="Alex Morgan" />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" required placeholder="alex@example.com" />
          </Field>
          <Field label="Password">
            <Input name="password" type="password" placeholder="Optional" />
          </Field>
          <Field label="Role">
            <Input name="role" defaultValue="user" />
          </Field>
          <div className="md:col-span-4">
            <Button type="submit">
              <UserPlus />
              Create user
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function UserDetailCard({ user }: { user: AdminUser }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{user.name || "Unnamed user"}</CardTitle>
        <CardDescription>{user.email}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Detail label="User ID" value={user.id} />
        <Detail label="Role" value={user.role || "user"} />
        <Detail label="Email verified" value={user.emailVerified ? "Yes" : "No"} />
        <Detail label="Created" value={formatDate(user.createdAt)} />
        <Detail label="Updated" value={formatDate(user.updatedAt)} />
        <Detail label="Ban reason" value={user.banReason || "None"} />
        <Detail label="Ban expires" value={formatDate(user.banExpires)} />
      </CardContent>
    </Card>
  );
}

function UserActionsCard({ user }: { user: AdminUser }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage user</CardTitle>
        <CardDescription>
          Role, profile, password, ban, impersonation, and deletion actions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={updateUserAction} className="grid gap-3">
          <input type="hidden" name="userId" value={user.id} />
          <Field label="Name">
            <Input name="name" defaultValue={user.name} />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" defaultValue={user.email} />
          </Field>
          <Button type="submit" variant="outline">
            <UserCog />
            Update profile
          </Button>
        </form>

        <Separator />

        <form action={setRoleAction} className="flex gap-2">
          <input type="hidden" name="userId" value={user.id} />
          <Input name="role" defaultValue={user.role || "user"} />
          <Button type="submit" variant="outline">
            <ShieldCheck />
            Set role
          </Button>
        </form>

        <form action={setPasswordAction} className="flex gap-2">
          <input type="hidden" name="userId" value={user.id} />
          <Input name="newPassword" type="password" placeholder="New password" required />
          <Button type="submit" variant="outline">
            <KeyRound />
            Set
          </Button>
        </form>

        <Separator />

        {user.banned ? (
          <form action={unbanUserAction}>
            <input type="hidden" name="userId" value={user.id} />
            <Button type="submit" variant="outline">
              <XCircle />
              Unban user
            </Button>
          </form>
        ) : (
          <form action={banUserAction} className="grid gap-2">
            <input type="hidden" name="userId" value={user.id} />
            <Textarea name="banReason" placeholder="Ban reason" />
            <Input
              name="banExpiresIn"
              type="number"
              min="0"
              placeholder="Expires in seconds, blank for never"
            />
            <Button type="submit" variant="destructive">
              <Ban />
              Ban user
            </Button>
          </form>
        )}

        <Separator />

        <div className="grid gap-2 sm:grid-cols-2">
          <form action={impersonateUserAction}>
            <input type="hidden" name="userId" value={user.id} />
            <Button type="submit" variant="outline" className="w-full">
              <LogIn />
              Impersonate
            </Button>
          </form>
          <form action={removeUserAction}>
            <input type="hidden" name="userId" value={user.id} />
            <Button type="submit" variant="destructive" className="w-full">
              <Trash2 />
              Remove
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

function SessionsCard({
  sessions,
  userId,
}: {
  sessions: UserSession[];
  userId: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User sessions</CardTitle>
        <CardDescription>List and revoke user sessions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {sessions.length ? (
          sessions.map((session) => (
            <div key={session.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{session.id}</p>
                  <p className="text-xs text-muted-foreground">
                    Expires {formatDate(session.expiresAt)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {session.userAgent || "No user agent"}
                  </p>
                </div>
                <form action={revokeSessionAction}>
                  <input type="hidden" name="sessionToken" value={session.token} />
                  <Button type="submit" size="sm" variant="outline">
                    Revoke
                  </Button>
                </form>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No active sessions.</p>
        )}
        <form action={revokeSessionsAction}>
          <input type="hidden" name="userId" value={userId} />
          <Button type="submit" variant="outline" className="w-full">
            Revoke all sessions
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b pb-2 last:border-b-0 last:pb-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="break-all">{value}</span>
    </div>
  );
}
