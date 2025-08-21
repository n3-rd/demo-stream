CREATE TABLE "admin_phone_verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"verification_code" text NOT NULL,
	"email" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used" boolean DEFAULT false,
	"company_name" text NOT NULL,
	"password" text,
	"website" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_assistants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"viewrooom_connections" text[],
	"engagements" jsonb,
	"training_files" text[],
	"status" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "content_library" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"file" text NOT NULL,
	"thumbnail" text,
	"owner_company" uuid,
	"shared_with" text[],
	"library_type" text[],
	"active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"phone" text NOT NULL,
	"hours" jsonb NOT NULL,
	"owner_company" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text,
	"last_name" text,
	"phone" text,
	"email" text,
	"description" text,
	"to_company" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rep_device_tokens" (
	"rep_id" uuid NOT NULL,
	"device_token" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "rep_device_tokens_rep_id_device_token_pk" PRIMARY KEY("rep_id","device_token")
);
--> statement-breakpoint
CREATE TABLE "representatives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"email" text NOT NULL,
	"phone" text,
	"avatar" text,
	"company" uuid,
	"is_active" boolean DEFAULT true,
	"schedule" jsonb,
	"location" uuid,
	"scheduled_meetings" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "room_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"thumbnail" text,
	"representatives" text[],
	"name" text,
	"phone" text,
	"email" text,
	"video" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "room_videos_duplicate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"thumbnail" text,
	"representatives" text[],
	"name" text,
	"phone" text,
	"email" text,
	"video_ref" text,
	"owner_company" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_company" uuid NOT NULL,
	"title" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"representative" text[],
	"host_content" text[],
	"representative_content" text[],
	"scheduled" boolean DEFAULT false,
	"schedule_time" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"customer_name" text,
	"customer_email" text,
	"customer_phone" text,
	"room_id" text,
	"additional_information" text,
	"representative_id" uuid
);
--> statement-breakpoint
CREATE TABLE "uploaded_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"video_url" text,
	"user_id" uuid,
	"video" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"username" text,
	"password" text,
	"company_name" text NOT NULL,
	"company_logo" text,
	"superuser" boolean DEFAULT false,
	"company_address" text,
	"company_website" text,
	"phone" text,
	"phone_verified" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "verification_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_email" text NOT NULL,
	"code" text NOT NULL,
	"phone_number" text,
	"expires_at" timestamp with time zone NOT NULL,
	"used" boolean DEFAULT false,
	"verification_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video" text NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "viewroom_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"login_name" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"company" uuid NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "viewroom_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "content_library" ADD CONSTRAINT "content_library_owner_company_users_id_fk" FOREIGN KEY ("owner_company") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_owner_company_users_id_fk" FOREIGN KEY ("owner_company") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_to_company_users_id_fk" FOREIGN KEY ("to_company") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rep_device_tokens" ADD CONSTRAINT "rep_device_tokens_rep_id_representatives_id_fk" FOREIGN KEY ("rep_id") REFERENCES "public"."representatives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "representatives" ADD CONSTRAINT "representatives_company_users_id_fk" FOREIGN KEY ("company") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "representatives" ADD CONSTRAINT "representatives_location_locations_id_fk" FOREIGN KEY ("location") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_videos_duplicate" ADD CONSTRAINT "room_videos_duplicate_owner_company_users_id_fk" FOREIGN KEY ("owner_company") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_owner_company_users_id_fk" FOREIGN KEY ("owner_company") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_representative_id_representatives_id_fk" FOREIGN KEY ("representative_id") REFERENCES "public"."representatives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploaded_videos" ADD CONSTRAINT "uploaded_videos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viewroom_users" ADD CONSTRAINT "viewroom_users_company_users_id_fk" FOREIGN KEY ("company") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;