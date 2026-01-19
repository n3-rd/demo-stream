-- Enable UUID generation extension if available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- users (auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  username TEXT UNIQUE,
  password TEXT,
  company_name TEXT NOT NULL,
  company_logo TEXT,
  superuser BOOLEAN DEFAULT FALSE,
  company_address TEXT,
  company_website TEXT,
  phone TEXT,
  phone_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- viewroom_users
CREATE TABLE IF NOT EXISTS viewroom_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  login_name TEXT NOT NULL,
  company UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_viewroom_users_active ON viewroom_users(is_active);
CREATE INDEX IF NOT EXISTS idx_viewroom_users_company ON viewroom_users(company);

-- verification_codes
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  code TEXT NOT NULL,
  phone_number TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  verification_type TEXT CHECK (verification_type IN ('email','sms')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_verification_codes_email_code ON verification_codes(user_email, code);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires ON verification_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_verification_codes_used ON verification_codes(used);

-- admin_phone_verification (used in admin registration flow)
CREATE TABLE IF NOT EXISTS admin_phone_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  verification_code TEXT NOT NULL,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  company_name TEXT NOT NULL,
  password TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_phone_verification_unique ON admin_phone_verification(phone, email, used);

-- ai_assistants
CREATE TABLE IF NOT EXISTS ai_assistants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  viewrooom_connections UUID[] DEFAULT '{}',
  engagements JSONB,
  training_files TEXT[] DEFAULT '{}',
  status BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- content_library
CREATE TABLE IF NOT EXISTS content_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('video','pdf','document','image')) NOT NULL,
  file TEXT NOT NULL,
  thumbnail TEXT,
  owner_company UUID REFERENCES users(id) ON DELETE SET NULL,
  shared_with UUID[] DEFAULT '{}',
  library_type TEXT[] DEFAULT '{}',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- locations
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  phone TEXT NOT NULL,
  hours JSONB NOT NULL,
  owner_company UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- quotes
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  email TEXT,
  description TEXT,
  to_company UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- representatives
CREATE TABLE IF NOT EXISTS representatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  avatar TEXT,
  company UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  schedule JSONB,
  location UUID REFERENCES locations(id) ON DELETE SET NULL,
  scheduled_meetings JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- room_videos
CREATE TABLE IF NOT EXISTS room_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  representatives UUID[] DEFAULT '{}',
  name TEXT,
  phone TEXT,
  email TEXT,
  video TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- room_videos_duplicate
CREATE TABLE IF NOT EXISTS room_videos_duplicate (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  representatives UUID[] DEFAULT '{}',
  name TEXT,
  phone TEXT,
  email TEXT,
  video_ref TEXT,
  owner_company UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- rooms
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_company UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  representative UUID[] DEFAULT '{}',
  host_content UUID[] DEFAULT '{}',
  representative_content UUID[] DEFAULT '{}',
  scheduled BOOLEAN DEFAULT FALSE,
  schedule_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- scheduled_rooms
CREATE TABLE IF NOT EXISTS scheduled_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  representative UUID[] DEFAULT '{}',
  host_content UUID[] DEFAULT '{}',
  representative_content UUID[] DEFAULT '{}',
  scheduled BOOLEAN DEFAULT FALSE,
  schedule_time TIMESTAMPTZ,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  room_id TEXT,
  additional_information TEXT,
  meeting_status TEXT,
  meeting_duration INTEGER,
  join_before_minutes INTEGER,
  participants_joined JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- uploaded_videos
CREATE TABLE IF NOT EXISTS uploaded_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  video_url TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  video TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- videos
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- updated_at triggers
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'users_set_updated_at') THEN
    CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'content_library_set_updated_at') THEN
    CREATE TRIGGER content_library_set_updated_at BEFORE UPDATE ON content_library FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'locations_set_updated_at') THEN
    CREATE TRIGGER locations_set_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'representatives_set_updated_at') THEN
    CREATE TRIGGER representatives_set_updated_at BEFORE UPDATE ON representatives FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'rooms_set_updated_at') THEN
    CREATE TRIGGER rooms_set_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'ai_assistants_set_updated_at') THEN
    CREATE TRIGGER ai_assistants_set_updated_at BEFORE UPDATE ON ai_assistants FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;