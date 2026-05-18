"use client";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
export default function Home() {
  const { data: session } = authClient.useSession();
  return (
    <div>
      {session ? (
        <div>
          <Button onClick={() => authClient.signOut({})}>Sign out</Button>
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
