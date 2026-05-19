CREATE TABLE "invitation_code" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"note" text,
	"created_by" text,
	"claimed_email" text,
	"claimed_at" timestamp,
	"used_by" text,
	"used_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invitation_code" ADD CONSTRAINT "invitation_code_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation_code" ADD CONSTRAINT "invitation_code_used_by_user_id_fk" FOREIGN KEY ("used_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invitation_code_code_idx" ON "invitation_code" USING btree ("code");--> statement-breakpoint
CREATE INDEX "invitation_code_created_by_idx" ON "invitation_code" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "invitation_code_used_by_idx" ON "invitation_code" USING btree ("used_by");