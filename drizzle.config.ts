import { defineConfig } from "drizzle-kit";

const useProd = process.env.DRIZZLE_ENV === "prod";

export default defineConfig({
  schema: "./schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: useProd ? process.env.PROD_DATABASE_URL! : process.env.DATABASE_URL!,
  },
});
