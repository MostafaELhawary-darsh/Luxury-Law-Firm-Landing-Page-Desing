/*
# Smart Legal Operations Room — Meeting Infrastructure

## Overview
Transforms the basic meetings table into a full "Smart Legal Operations Room" with:
- Encrypted meeting participants with roles and join status
- Privilege Mode certificates (no-recording proof)
- Video-authenticated e-signature records
- AI Legal Prompter flashcards (legal hints during meetings)
- Speech-to-Text transcripts with real-time translation
- Smart Minutes of Meeting (MoM) with approval workflow
- Post-meeting automation: task sync, calendar sync, email dispatch
- Meeting recording metadata (encrypted)

## New Tables

1. **lf_meeting_participants** — Participants per meeting
   - id, meeting_id (FK), name, role, email, join_status, joined_at, is_host

2. **lf_meeting_privilege_certs** — Privilege Mode certificates
   - id, meeting_id (FK), activated_at, deactivated_at, certificate_hash, issued_by

3. **lf_meeting_signatures** — Video-authenticated e-signatures
   - id, meeting_id (FK), document_title, signer_name, signed_at, video_hash, pdf_hash, ip_address

4. **lf_meeting_ai_prompts** — AI Legal Prompter flashcards
   - id, meeting_id (FK), trigger_term, legal_reference, suggestion_text, shown_at, dismissed

5. **lf_meeting_transcripts** — Speech-to-Text + translation
   - id, meeting_id (FK), speaker, text_ar, text_translated, language, timestamp_sec

6. **lf_meeting_minutes** — Smart Minutes of Meeting
   - id, meeting_id (FK), content, status (draft/approved/rejected), approved_by, approved_at, created_at

7. **lf_meeting_tasks** — Post-meeting automation tasks
   - id, meeting_id (FK), minute_id (FK), title, assignee, deadline, status, synced_to_trello, trello_card_id

8. **lf_meeting_calendar_sync** — Calendar sync entries
   - id, meeting_id (FK), event_title, event_date, synced_to (google/outlook), sync_status

9. **lf_meeting_email_dispatch** — Email dispatch log
   - id, meeting_id (FK), recipient, subject, sent_at, status, contains_video

## Modified Tables
- **lf_meetings**: ADD columns — privilege_mode (bool), recording_enabled (bool), encryption_key_ref (text), mom_status (text), is_internal (bool), max_participants (int)

## Security
- RLS enabled on all new tables with anon+authenticated CRUD (single-tenant app, no sign-in)
*/

-- ===== Extend lf_meetings =====
ALTER TABLE lf_meetings
  ADD COLUMN IF NOT EXISTS privilege_mode boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS recording_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS encryption_key_ref text,
  ADD COLUMN IF NOT EXISTS mom_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS is_internal boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_participants integer DEFAULT 50;

-- ===== lf_meeting_participants =====
CREATE TABLE IF NOT EXISTS lf_meeting_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES lf_meetings(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text DEFAULT 'مشارك',
  email text,
  join_status text DEFAULT 'pending',
  joined_at timestamptz,
  is_host boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting ON lf_meeting_participants(meeting_id);
ALTER TABLE lf_meeting_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_meeting_participants" ON lf_meeting_participants;
CREATE POLICY "anon_crud_meeting_participants" ON lf_meeting_participants FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_meeting_participants" ON lf_meeting_participants FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_meeting_participants" ON lf_meeting_participants FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_meeting_participants" ON lf_meeting_participants FOR DELETE TO anon, authenticated USING (true);

-- ===== lf_meeting_privilege_certs =====
CREATE TABLE IF NOT EXISTS lf_meeting_privilege_certs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES lf_meetings(id) ON DELETE CASCADE,
  activated_at timestamptz DEFAULT now(),
  deactivated_at timestamptz,
  certificate_hash text NOT NULL,
  issued_by text DEFAULT 'مضيف الجلسة',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_privilege_certs_meeting ON lf_meeting_privilege_certs(meeting_id);
ALTER TABLE lf_meeting_privilege_certs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_privilege_certs" ON lf_meeting_privilege_certs;
CREATE POLICY "anon_crud_privilege_certs" ON lf_meeting_privilege_certs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_privilege_certs" ON lf_meeting_privilege_certs FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_privilege_certs" ON lf_meeting_privilege_certs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_privilege_certs" ON lf_meeting_privilege_certs FOR DELETE TO anon, authenticated USING (true);

-- ===== lf_meeting_signatures =====
CREATE TABLE IF NOT EXISTS lf_meeting_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES lf_meetings(id) ON DELETE CASCADE,
  document_title text NOT NULL,
  signer_name text NOT NULL,
  signed_at timestamptz DEFAULT now(),
  video_hash text,
  pdf_hash text,
  ip_address text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_signatures_meeting ON lf_meeting_signatures(meeting_id);
ALTER TABLE lf_meeting_signatures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_signatures" ON lf_meeting_signatures;
CREATE POLICY "anon_crud_signatures" ON lf_meeting_signatures FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_signatures" ON lf_meeting_signatures FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_signatures" ON lf_meeting_signatures FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_signatures" ON lf_meeting_signatures FOR DELETE TO anon, authenticated USING (true);

-- ===== lf_meeting_ai_prompts =====
CREATE TABLE IF NOT EXISTS lf_meeting_ai_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES lf_meetings(id) ON DELETE CASCADE,
  trigger_term text NOT NULL,
  legal_reference text,
  suggestion_text text,
  shown_at timestamptz DEFAULT now(),
  dismissed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_meeting ON lf_meeting_ai_prompts(meeting_id);
ALTER TABLE lf_meeting_ai_prompts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_ai_prompts" ON lf_meeting_ai_prompts;
CREATE POLICY "anon_crud_ai_prompts" ON lf_meeting_ai_prompts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_ai_prompts" ON lf_meeting_ai_prompts FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_ai_prompts" ON lf_meeting_ai_prompts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_ai_prompts" ON lf_meeting_ai_prompts FOR DELETE TO anon, authenticated USING (true);

-- ===== lf_meeting_transcripts =====
CREATE TABLE IF NOT EXISTS lf_meeting_transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES lf_meetings(id) ON DELETE CASCADE,
  speaker text,
  text_ar text NOT NULL,
  text_translated text,
  language text DEFAULT 'العربية',
  timestamp_sec integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_transcripts_meeting ON lf_meeting_transcripts(meeting_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_ts ON lf_meeting_transcripts(timestamp_sec);
ALTER TABLE lf_meeting_transcripts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_transcripts" ON lf_meeting_transcripts;
CREATE POLICY "anon_crud_transcripts" ON lf_meeting_transcripts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_transcripts" ON lf_meeting_transcripts FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_transcripts" ON lf_meeting_transcripts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_transcripts" ON lf_meeting_transcripts FOR DELETE TO anon, authenticated USING (true);

-- ===== lf_meeting_minutes =====
CREATE TABLE IF NOT EXISTS lf_meeting_minutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES lf_meetings(id) ON DELETE CASCADE,
  content text NOT NULL,
  status text DEFAULT 'draft',
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_minutes_meeting ON lf_meeting_minutes(meeting_id);
ALTER TABLE lf_meeting_minutes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_minutes" ON lf_meeting_minutes;
CREATE POLICY "anon_crud_minutes" ON lf_meeting_minutes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_minutes" ON lf_meeting_minutes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_minutes" ON lf_meeting_minutes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_minutes" ON lf_meeting_minutes FOR DELETE TO anon, authenticated USING (true);

-- ===== lf_meeting_tasks =====
CREATE TABLE IF NOT EXISTS lf_meeting_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES lf_meetings(id) ON DELETE CASCADE,
  minute_id uuid REFERENCES lf_meeting_minutes(id) ON DELETE SET NULL,
  title text NOT NULL,
  assignee text,
  deadline date,
  status text DEFAULT 'pending',
  synced_to_trello boolean DEFAULT false,
  trello_card_id text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meeting_tasks_meeting ON lf_meeting_tasks(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_tasks_status ON lf_meeting_tasks(status);
ALTER TABLE lf_meeting_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_meeting_tasks" ON lf_meeting_tasks;
CREATE POLICY "anon_crud_meeting_tasks" ON lf_meeting_tasks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_meeting_tasks" ON lf_meeting_tasks FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_meeting_tasks" ON lf_meeting_tasks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_meeting_tasks" ON lf_meeting_tasks FOR DELETE TO anon, authenticated USING (true);

-- ===== lf_meeting_calendar_sync =====
CREATE TABLE IF NOT EXISTS lf_meeting_calendar_sync (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES lf_meetings(id) ON DELETE CASCADE,
  event_title text NOT NULL,
  event_date timestamptz NOT NULL,
  synced_to text DEFAULT 'google',
  sync_status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_meeting ON lf_meeting_calendar_sync(meeting_id);
ALTER TABLE lf_meeting_calendar_sync ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_calendar_sync" ON lf_meeting_calendar_sync;
CREATE POLICY "anon_crud_calendar_sync" ON lf_meeting_calendar_sync FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_calendar_sync" ON lf_meeting_calendar_sync FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_calendar_sync" ON lf_meeting_calendar_sync FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_calendar_sync" ON lf_meeting_calendar_sync FOR DELETE TO anon, authenticated USING (true);

-- ===== lf_meeting_email_dispatch =====
CREATE TABLE IF NOT EXISTS lf_meeting_email_dispatch (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES lf_meetings(id) ON DELETE CASCADE,
  recipient text NOT NULL,
  subject text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  status text DEFAULT 'pending',
  contains_video boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_dispatch_meeting ON lf_meeting_email_dispatch(meeting_id);
ALTER TABLE lf_meeting_email_dispatch ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_email_dispatch" ON lf_meeting_email_dispatch;
CREATE POLICY "anon_crud_email_dispatch" ON lf_meeting_email_dispatch FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_email_dispatch" ON lf_meeting_email_dispatch FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_email_dispatch" ON lf_meeting_email_dispatch FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_email_dispatch" ON lf_meeting_email_dispatch FOR DELETE TO anon, authenticated USING (true);

-- ===== Seed sample data =====
INSERT INTO lf_meetings (title, meeting_type, scheduled_date, duration_minutes, platform, status, language, is_internal, max_participants, privilege_mode, recording_enabled, mom_status)
VALUES
  ('مداولة سرية — قضية تحكيم شركة النيل', 'مرئية', now() + interval '2 hours', 90, 'Hawari Secure Room', 'مجدولة', 'العربية', false, 4, true, false, 'pending'),
  ('اجتماع فريق المؤسسة — مراجعة القضايا النشطة', 'مرئية', now() + interval '1 day', 60, 'Hawari Secure Room', 'مجدولة', 'العربية', true, 12, false, true, 'pending'),
  ('جلسة توقيع عقد بيع تجاري — موكل ومشتري', 'مرئية', now() + interval '3 days', 45, 'Hawari Secure Room', 'مجدولة', 'العربية', false, 3, false, true, 'pending')
ON CONFLICT DO NOTHING;
