CREATE TABLE "game_file_download" (
	"id" text PRIMARY KEY NOT NULL,
	"file_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_file_download" ADD CONSTRAINT "game_file_download_file_id_game_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."game_file"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_file_download" ADD CONSTRAINT "game_file_download_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "game_file_download_file_user_idx" ON "game_file_download" USING btree ("file_id","user_id");--> statement-breakpoint
CREATE INDEX "game_file_download_file_id_idx" ON "game_file_download" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "game_file_download_user_id_idx" ON "game_file_download" USING btree ("user_id");