/*
# Voice command system schema

1. New Tables
- `voice_command_log` — records every recognized voice command for audit and future learning.
  - `id` (uuid, primary key)
  - `transcript` (text, the raw recognized speech)
  - `language` (text, e.g. ar-EG / en-US / fr-FR)
  - `command_type` (text, e.g. add_client / navigate / remind / email)
  - `command_payload` (jsonb, structured payload extracted from the transcript)
  - `status` (text, success / unrecognized / failed)
  - `created_at` (timestamptz)
- `voice_email_log` — stores copies of emails dispatched via the voice "send email" command.
  - `id` (uuid, primary key)
  - `recipient` (text, email address)
  - `subject` (text)
  - `body` (text)
  - `created_at` (timestamptz)
- `voice_settings` — single-row table persisting the user's preferred recognition language.
  - `id` (int, primary key, always 1)
  - `language` (text, default 'ar-EG')
  - `updated_at` (timestamptz)

2. Security
- This is a single-tenant app with no sign-in screen, so all tables use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)` because the data is intentionally shared within the firm.
- RLS enabled on every table.
*/

CREATE TABLE IF NOT EXISTS voice_command_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript text NOT NULL,
  language text NOT NULL DEFAULT 'ar-EG',
  command_type text NOT NULL DEFAULT 'unknown',
  command_payload jsonb,
  status text NOT NULL DEFAULT 'success',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE voice_command_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_voice_command_log" ON voice_command_log;
CREATE POLICY "anon_select_voice_command_log" ON voice_command_log FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_voice_command_log" ON voice_command_log;
CREATE POLICY "anon_insert_voice_command_log" ON voice_command_log FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_voice_command_log" ON voice_command_log;
CREATE POLICY "anon_update_voice_command_log" ON voice_command_log FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_voice_command_log" ON voice_command_log;
CREATE POLICY "anon_delete_voice_command_log" ON voice_command_log FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS voice_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient text NOT NULL,
  subject text,
  body text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE voice_email_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_voice_email_log" ON voice_email_log;
CREATE POLICY "anon_select_voice_email_log" ON voice_email_log FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_voice_email_log" ON voice_email_log;
CREATE POLICY "anon_insert_voice_email_log" ON voice_email_log FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_voice_email_log" ON voice_email_log;
CREATE POLICY "anon_update_voice_email_log" ON voice_email_log FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_voice_email_log" ON voice_email_log;
CREATE POLICY "anon_delete_voice_email_log" ON voice_email_log FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS voice_settings (
  id int PRIMARY KEY DEFAULT 1,
  language text NOT NULL DEFAULT 'ar-EG',
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT voice_settings_single_row CHECK (id = 1)
);

ALTER TABLE voice_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_voice_settings" ON voice_settings;
CREATE POLICY "anon_select_voice_settings" ON voice_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_voice_settings" ON voice_settings;
CREATE POLICY "anon_insert_voice_settings" ON voice_settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_voice_settings" ON voice_settings;
CREATE POLICY "anon_update_voice_settings" ON voice_settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO voice_settings (id, language)
VALUES (1, 'ar-EG')
ON CONFLICT (id) DO NOTHING;
