import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  role: text("role"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by"),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const invitationCode = pgTable(
  "invitation_code",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    note: text("note"),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    claimedEmail: text("claimed_email"),
    claimedAt: timestamp("claimed_at"),
    usedBy: text("used_by").references(() => user.id, {
      onDelete: "set null",
    }),
    usedAt: timestamp("used_at"),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("invitation_code_code_idx").on(table.code),
    index("invitation_code_created_by_idx").on(table.createdBy),
    index("invitation_code_used_by_idx").on(table.usedBy),
  ],
);

export const game = pgTable(
  "game",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    coverUrl: text("cover_url"),
    platform: text("platform"),
    status: text("status").default("active").notNull(),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    updatedBy: text("updated_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("game_slug_idx").on(table.slug),
    index("game_status_idx").on(table.status),
  ],
);

export const gameResource = pgTable(
  "game_resource",
  {
    id: text("id").primaryKey(),
    gameId: text("game_id")
      .notNull()
      .references(() => game.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    url: text("url").notNull(),
    resourceType: text("resource_type").default("link").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    updatedBy: text("updated_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("game_resource_game_id_idx").on(table.gameId),
    index("game_resource_type_idx").on(table.resourceType),
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  createdInvitationCodes: many(invitationCode, {
    relationName: "createdInvitationCodes",
  }),
  usedInvitationCodes: many(invitationCode, {
    relationName: "usedInvitationCodes",
  }),
  createdGames: many(game, { relationName: "createdGames" }),
  updatedGames: many(game, { relationName: "updatedGames" }),
  createdGameResources: many(gameResource, {
    relationName: "createdGameResources",
  }),
  updatedGameResources: many(gameResource, {
    relationName: "updatedGameResources",
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const invitationCodeRelations = relations(invitationCode, ({ one }) => ({
  creator: one(user, {
    fields: [invitationCode.createdBy],
    references: [user.id],
    relationName: "createdInvitationCodes",
  }),
  usedByUser: one(user, {
    fields: [invitationCode.usedBy],
    references: [user.id],
    relationName: "usedInvitationCodes",
  }),
}));

export const gameRelations = relations(game, ({ many, one }) => ({
  resources: many(gameResource),
  creator: one(user, {
    fields: [game.createdBy],
    references: [user.id],
    relationName: "createdGames",
  }),
  updater: one(user, {
    fields: [game.updatedBy],
    references: [user.id],
    relationName: "updatedGames",
  }),
}));

export const gameResourceRelations = relations(gameResource, ({ one }) => ({
  game: one(game, {
    fields: [gameResource.gameId],
    references: [game.id],
  }),
  creator: one(user, {
    fields: [gameResource.createdBy],
    references: [user.id],
    relationName: "createdGameResources",
  }),
  updater: one(user, {
    fields: [gameResource.updatedBy],
    references: [user.id],
    relationName: "updatedGameResources",
  }),
}));
