import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import { admin, captcha } from "better-auth/plugins";
import { and, eq, isNull } from "drizzle-orm";

import * as schema from "@/schema";

function normalizeInvitationCode(value: unknown) {
  return typeof value === "string"
    ? value.trim().replaceAll("-", "").replaceAll(" ", "").toUpperCase()
    : "";
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: schema,
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
  },
  databaseHooks: {
    user: {
      create: {
        async before(user, context) {
          if (context?.path !== "/sign-up/email") return;

          const code = normalizeInvitationCode(context.body?.invitationCode);

          if (!code) {
            throw new APIError("BAD_REQUEST", {
              message: "An invitation code is required to register.",
            });
          }

          const now = new Date();
          const [invitation] = await db
            .update(schema.invitationCode)
            .set({
              claimedEmail: String(user.email).toLowerCase(),
              claimedAt: now,
              updatedAt: now,
            })
            .where(
              and(
                eq(schema.invitationCode.code, code),
                isNull(schema.invitationCode.claimedAt),
                isNull(schema.invitationCode.usedAt),
                isNull(schema.invitationCode.revokedAt),
              ),
            )
            .returning({ id: schema.invitationCode.id });

          if (!invitation) {
            throw new APIError("BAD_REQUEST", {
              message: "This invitation code is invalid or has already been used.",
            });
          }

          const userData = { ...user };
          delete userData.invitationCode;

          return { data: userData };
        },
        async after(user, context) {
          if (context?.path !== "/sign-up/email") return;

          const code = normalizeInvitationCode(context.body?.invitationCode);
          if (!code) return;

          await db
            .update(schema.invitationCode)
            .set({
              usedBy: user.id,
              usedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(schema.invitationCode.code, code));
        },
      },
    },
  },
  plugins: [
    admin(),
    captcha({
      provider: "cloudflare-turnstile",
      secretKey: process.env.TURNSTILE_SECRET_KEY ?? "",
    }),
  ],
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      disableSignUp: true,
      disableImplicitSignUp: true,
    },
  },
});
