import { createHash, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";

import { auth } from "@/lib/auth";

type AdminActor =
  | { type: "session"; uploadedBy: string }
  | { type: "api-token"; uploadedBy: string };

function roleIncludesAdmin(role: unknown) {
  return typeof role === "string" && role.split(",").includes("admin");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function timingSafeHexEqual(left: string, right: string) {
  if (!/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) {
    return false;
  }

  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");

  return scheme.toLowerCase() === "bearer" && token ? token : null;
}

export async function requireAdminPageSession() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    redirect("/auth/sign-in");
  }

  if (!roleIncludesAdmin("role" in session.user ? session.user.role : "")) {
    forbidden();
  }

  return session;
}

export async function requireAdminRouteActor(
  request: Request,
): Promise<AdminActor | Response> {
  const token = bearerToken(request);

  if (token) {
    const hashes = (process.env.ADMIN_API_TOKEN_HASHES ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const tokenHash = hashToken(token);
    const matchedHash = hashes.find((hash) => timingSafeHexEqual(hash, tokenHash));

    if (matchedHash) {
      return {
        type: "api-token",
        uploadedBy: `api-token:${matchedHash.slice(0, 12)}`,
      };
    }

    return Response.json({ error: "Invalid API token." }, { status: 401 });
  }

  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!roleIncludesAdmin("role" in session.user ? session.user.role : "")) {
    return Response.json({ error: "Admin access required." }, { status: 403 });
  }

  return { type: "session", uploadedBy: session.user.id };
}
