"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

export default function Home() {
  const { data: session, isPending, error } = authClient.useSession();

  if (isPending) {
    return (
      <div className="flex h-dvh w-dvw items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-dvh w-dvw items-center justify-center">
        <p>Something went wrong.</p>
      </div>
    );
  }

  return (
    <div>
      {session ? (
        <div>
          <Button onClick={() => authClient.signOut()}>Sign out</Button>
          <h1>Hello {session.user.name}</h1>
        </div>
      ) : (
        <Button
          onClick={() =>
            authClient.signIn.social({
              provider: "github",
            })
          }
        >
          Sign in with Github
        </Button>
      )}
    </div>
  );
}
