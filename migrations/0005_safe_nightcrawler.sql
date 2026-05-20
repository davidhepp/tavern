CREATE TABLE "game_file" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"filename" text NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"checksum" text,
	"uploaded_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_file" ADD CONSTRAINT "game_file_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_file_game_id_idx" ON "game_file" USING btree ("game_id");--> statement-breakpoint
CREATE UNIQUE INDEX "game_file_storage_key_idx" ON "game_file" USING btree ("storage_key");