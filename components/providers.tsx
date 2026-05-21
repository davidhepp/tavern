"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { captchaPlugin } from "@better-auth-ui/react/plugins";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { CloudflareTurnstile } from "@/components/auth/cloudflare-turnstile";
import { authClient } from "@/lib/auth-client";
import { getQueryClient } from "@/lib/query-client";
import { AuthProvider } from "./auth/auth-provider";
import { Toaster } from "./ui/sonner";

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider
        authClient={authClient}
        redirectTo="/"
        socialProviders={["github"]}
        emailAndPassword={{
          requireEmailVerification: true,
        }}
        plugins={[
          captchaPlugin({
            render: CloudflareTurnstile,
          }),
        ]}
        navigate={({ to, replace }) =>
          replace ? router.replace(to) : router.push(to)
        }
        Link={Link}
      >
        {children}

        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
