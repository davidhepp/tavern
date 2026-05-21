"use client";

import type { CaptchaRenderProps } from "@better-auth-ui/react/plugins";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useEffect, useRef } from "react";

export function CloudflareTurnstile({
  setToken,
  clearToken,
  setReset,
}: CaptchaRenderProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const ref = useRef<TurnstileInstance>(null);

  useEffect(() => {
    setReset(() => ref.current?.reset());
    return () => setReset(null);
  }, [setReset]);

  if (!siteKey) {
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        Turnstile site key is not configured.
      </p>
    );
  }

  return (
    <Turnstile
      ref={ref}
      siteKey={siteKey}
      onSuccess={setToken}
      onError={clearToken}
      onExpire={clearToken}
      options={{
        size: "flexible",
        theme: "dark",
      }}
    />
  );
}
