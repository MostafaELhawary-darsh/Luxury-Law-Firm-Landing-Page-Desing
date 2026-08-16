/*
# Create meeting chat messages table

1. New Tables
- `lf_meeting_chat_messages`
  - `id` (uuid, primary key)
  - `meeting_id` (uuid, references lf_meetings)
  - `sender_name` (text, the display name of the sender)
  - `sender_role` (text, e.g. "مضيف", "مشارك")
  - `message_text` (text, the chat message content)
  - `is_system` (boolean, default false — for system messages like "X joined")
  - `created_at` (timestamptz, default now())
2. Security
- Enable RLS on lf_meeting_chat_messages.
- Allow anon + authenticated CRUD (single-tenant app, no sign-in screen).
*/

CREATE TABLE IF NOT EXISTS lf_meeting_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES lf_meetings(id) ON DELETE CASCADE,
  sender_name text NOT NULL,
  sender_role text DEFAULT 'مشارك',
  message_text text NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lf_meeting_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_chat" ON lf_meeting_chat_messages;
CREATE POLICY "anon_select_chat" ON lf_meeting_chat_messages
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_chat" ON lf_meeting_chat_messages;
CREATE POLICY "anon_insert_chat" ON lf_meeting_chat_messages
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_chat" ON lf_meeting_chat_messages;
CREATE POLICY "anon_update_chat" ON lf_meeting_chat_messages
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_chat" ON lf_meeting_chat_messages;
CREATE POLICY "anon_delete_chat" ON lf_meeting_chat_messages
  FOR DELETE TO anon, authenticated USING (true);