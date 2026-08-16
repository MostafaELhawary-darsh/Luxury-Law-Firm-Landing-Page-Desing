-- M114 GenOffice Sovereign Document Editor Engine
-- Tables for local-only document editing with JWT sessions, watermarking, and audit trails

-- Document sessions (JWT-secured editing sessions)
CREATE TABLE IF NOT EXISTS m114_editor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token text UNIQUE NOT NULL,
  document_id uuid,
  user_id uuid,
  permissions text NOT NULL DEFAULT 'edit', -- read, edit, print, sign
  jwt_issued_at timestamptz DEFAULT now(),
  jwt_expires_at timestamptz NOT NULL,
  editor_url text,
  iframe_origin text DEFAULT 'http://localhost:8080',
  status text NOT NULL DEFAULT 'active', -- active, closed, expired
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Sovereign documents (source of truth, stored locally)
CREATE TABLE IF NOT EXISTS m114_sovereign_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_number text UNIQUE NOT NULL,
  document_title text NOT NULL,
  document_format text NOT NULL DEFAULT 'docx', -- docx, odt, pdf, xlsx, pptx
  file_path_raw text, -- path in storage/documents/raw/
  file_path_signed text, -- path in storage/documents/signed/
  file_hash text, -- SHA3-256 hash
  file_size_bytes bigint DEFAULT 0,
  version_number integer DEFAULT 1,
  stage text NOT NULL DEFAULT 'draft', -- draft, editing, reviewing, approved, signed, archived
  encrypted boolean DEFAULT false,
  watermark_text text, -- dynamic watermark for anti-leak
  metadata jsonb DEFAULT '{}', -- sovereign code, edit fingerprint, institutional seal
  template_used boolean DEFAULT false,
  template_id uuid,
  description text,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Document templates (sovereign legal templates)
CREATE TABLE IF NOT EXISTS m114_document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code text UNIQUE NOT NULL,
  template_name text NOT NULL,
  template_name_ar text,
  template_type text NOT NULL DEFAULT 'contract', -- contract, memo, pleading, affidavit, power_of_attorney
  template_format text NOT NULL DEFAULT 'docx',
  template_content jsonb DEFAULT '{}', -- structured content placeholder
  template_description text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Audit logs (sovereign, tamper-proof hash chain)
CREATE TABLE IF NOT EXISTS m114_editor_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES m114_editor_sessions(id) ON DELETE CASCADE,
  document_id uuid REFERENCES m114_sovereign_documents(id) ON DELETE CASCADE,
  action text NOT NULL, -- session_opened, document_loaded, edit_started, forcesave, autosave, session_closed, watermark_applied, signed
  actor text,
  actor_role text,
  detail text,
  hash_chain text NOT NULL,
  previous_hash text,
  accessed_fields text[] DEFAULT '{}',
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE m114_editor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE m114_sovereign_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE m114_document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE m114_editor_audit ENABLE ROW LEVEL SECURITY;

-- RLS policies for m114_editor_sessions
CREATE POLICY "select_own_m114_sessions" ON m114_editor_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m114_sessions" ON m114_editor_sessions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m114_sessions" ON m114_editor_sessions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m114_sessions" ON m114_editor_sessions FOR DELETE TO authenticated USING (true);

-- RLS policies for m114_sovereign_documents
CREATE POLICY "select_own_m114_docs" ON m114_sovereign_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m114_docs" ON m114_sovereign_documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m114_docs" ON m114_sovereign_documents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m114_docs" ON m114_sovereign_documents FOR DELETE TO authenticated USING (true);

-- RLS policies for m114_document_templates
CREATE POLICY "select_own_m114_templates" ON m114_document_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m114_templates" ON m114_document_templates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m114_templates" ON m114_document_templates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m114_templates" ON m114_document_templates FOR DELETE TO authenticated USING (true);

-- RLS policies for m114_editor_audit
CREATE POLICY "select_own_m114_audit" ON m114_editor_audit FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m114_audit" ON m114_editor_audit FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m114_audit" ON m114_editor_audit FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m114_audit" ON m114_editor_audit FOR DELETE TO authenticated USING (true);

-- Insert default templates
INSERT INTO m114_document_templates (template_code, template_name, template_name_ar, template_type, template_description) VALUES
  ('TPL-LEASE', 'Lease Agreement', 'عقد إيجار', 'contract', 'قالب عقد إيجار سيادي مع شروط قابلة للتخصيص'),
  ('TPL-MEMO', 'Legal Memorandum', 'مذكرة قانونية', 'memo', 'قالب مذكرة قانونية بهيكلية احترافية'),
  ('TPL-PLEAD', 'Court Pleading', 'مذكرة دفاع', 'pleading', 'قالب مذكرة دفاع قضائي'),
  ('TPL-AFFID', 'Affidavit', 'إقرار مشهر', 'affidavit', 'قالب إقرار مشهر بشهود'),
  ('TPL-POA', 'Power of Attorney', 'توكيل', 'power_of_attorney', 'قالب توكيل رسمي')
ON CONFLICT (template_code) DO NOTHING;