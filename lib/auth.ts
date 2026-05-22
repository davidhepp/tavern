import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import { emailLinkTemplate, sendEmailInBackground } from "@/lib/email";
import { admin, captcha } from "better-auth/plugins";
import { and, eq, isNull } from "drizzle-orm";
import { dash, sentinel } from "@better-auth/infra";

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
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      sendEmailInBackground({
        to: user.email,
        subject: "Reset your Tavern password",
        text: `Open this link to reset your Tavern password: ${url}`,
        html: emailLinkTemplate({
          title: "Reset your Tavern password",
          body: "Use this link to choose a new password for your Tavern account. If you did not request this, you can ignore this email.",
          buttonLabel: "Reset password",
          url,
        }),
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      sendEmailInBackground({
        to: user.email,
        subject: "Verify your Tavern email",
        text: `Open this link to verify your Tavern email address: ${url}`,
        html: emailLinkTemplate({
          title: "Verify your Tavern email",
          body: "Confirm this email address to finish setting up your Tavern account.",
          buttonLabel: "Verify email",
          url,
        }),
      });
    },
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
              message:
                "This invitation code is invalid or has already been used.",
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
    dash(),
    admin(),
    captcha({
      provider: "cloudflare-turnstile",
      secretKey: process.env.TURNSTILE_SECRET_KEY ?? "",
    }),
    sentinel(),
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
