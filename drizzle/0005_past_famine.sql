DROP TABLE IF EXISTS "assistant_document_chunks" CASCADE;--> statement-breakpoint
ALTER TABLE "ai_assistants" ADD COLUMN IF NOT EXISTS "system_prompt" text;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "content_active_state" jsonb;