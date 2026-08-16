/*
# Create meeting documents table for live session file sharing

1. New Tables
- `lf_meeting_documents`
  - `id` (uuid, primary key)
  - `meeting_id` (uuid, references lf_meetings, cascade delete)
  - `file_name` (text, original uploaded file name)
  - `file_type` (text, mime type or extension category: pdf, doc, image, spreadsheet, etc.)
  - `file_url` (text, public URL of the stored file in Supabase Storage)
  - `file_size` (bigint, size in bytes)
  - `uploaded_by` (text, name of the person who uploaded the file)
  - `uploaded_at` (timestamptz, when the file was uploaded)
  - `is_agenda_item` (boolean, whether this document is part of the pre-set agenda)
  - `display_order` (int, ordering for agenda display)
  - `display_state` (text, 'pending' | 'showing' | 'archived' — controls real-time document display during the session)

2. Security
- Enable RLS on lf_meeting_documents.
- Allow anon + authenticated CRUD (single-tenant app, no sign-in screen).

3. Notes
- This table stores both pre-session agenda documents and documents uploaded live during the session.
- The `display_state` column enables real-time document sharing: when a participant sets a document to 'showing', all participants see it on screen.
- Files are stored in Supabase Storage bucket 'meeting-documents'.
*/

CREATE TABLE IF NOT EXISTS lf_meeting_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES lf_meetings(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL DEFAULT 'file',
  file_url text NOT NULL,
  file_size bigint DEFAULT 0,
  uploaded_by text DEFAULT 'النظام',
  uploaded_at timestamptz DEFAULT now(),
  is_agenda_item boolean DEFAULT false,
  display_order int DEFAULT 0,
  display_state text DEFAULT 'pending'
);

ALTER TABLE lf_meeting_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_meeting_docs" ON lf_meeting_documents;
CREATE POLICY "anon_select_meeting_docs" ON lf_meeting_documents
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_meeting_docs" ON lf_meeting_documents;
CREATE POLICY "anon_insert_meeting_docs" ON lf_meeting_documents
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_meeting_docs" ON lf_meeting_documents;
CREATE POLICY "anon_update_meeting_docs" ON lf_meeting_documents
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_meeting_docs" ON lf_meeting_documents;
CREATE POLICY "anon_delete_meeting_docs" ON lf_meeting_documents
  FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_meeting_docs_meeting_id ON lf_meeting_documents(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_docs_display_state ON lf_meeting_documents(meeting_id, display_state);
