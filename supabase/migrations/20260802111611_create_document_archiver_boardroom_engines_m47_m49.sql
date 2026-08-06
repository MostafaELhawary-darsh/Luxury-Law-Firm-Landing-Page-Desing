/*
# M47-M49 — Document Recognition, Bulk Archiver & Boardroom Governance Engines

Creates 3 new module schemas:

1. M47 — Intelligent Document Recognition & Routing Engine (محرك التعرف الذكي والتوجيه التلقائي للمستندات)
   - Document records with OCR, routing suggestions, human-in-loop approval, audit logs
   - Integrates: M48, M50, M54, M92

2. M48 — Bulk Folder & File Smart Archiver Engine (محرك الأرشفة الذكية الجماعية وإدارة الملفات الضخمة)
   - Archive batches with bulk scanning, classification, encryption, audit logs
   - Integrates: M47, M50, M55, M54, M46, M92

3. M49 — Sovereign Boardroom & Executive Governance Engine (محرك حوكمة وإدارة اجتماعات مجالس الإدارة السيادية)
   - Boardroom meetings with zero-trust, speaker diarization, e-voting, audit logs
   - Integrates: M54, M51, M48, M109, M92

Note: M50 (PredictiveRiskEngine), M51 (InternalTaskEngine), and M52 (SovereignMail) already exist
in the system and are NOT recreated here to avoid duplication.

All tables follow the existing m##_ prefix convention with RLS enabled (single-tenant, no auth gating).
*/

-- ═══════════════════════════════════════════════
-- M47 — Intelligent Document Recognition & Routing Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m47_document_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_number text NOT NULL UNIQUE,
  document_title text NOT NULL,
  document_type text DEFAULT 'unclassified',
  stage text DEFAULT 'ingestion',
  status text DEFAULT 'active',
  source_channel text DEFAULT 'web_upload',
  ocr_processed boolean DEFAULT false,
  ocr_language text DEFAULT 'arabic',
  extracted_metadata text,
  routing_suggestion text,
  routing_target_module text,
  human_approved boolean DEFAULT false,
  approved_by text,
  encrypted boolean DEFAULT false,
  sha3_hash text,
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m48_archived boolean DEFAULT false,
  m50_risk_checked boolean DEFAULT false,
  m54_finance_linked boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m47_document_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m47_doc" ON m47_document_records;
CREATE POLICY "anon_select_m47_doc" ON m47_document_records FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m47_doc" ON m47_document_records;
CREATE POLICY "anon_insert_m47_doc" ON m47_document_records FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m47_doc" ON m47_document_records;
CREATE POLICY "anon_update_m47_doc" ON m47_document_records FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m47_doc" ON m47_document_records;
CREATE POLICY "anon_delete_m47_doc" ON m47_document_records FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m47_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m47_document_records(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m47_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m47_audit" ON m47_audit_logs;
CREATE POLICY "anon_select_m47_audit" ON m47_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m47_audit" ON m47_audit_logs;
CREATE POLICY "anon_insert_m47_audit" ON m47_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m47_audit" ON m47_audit_logs;
CREATE POLICY "anon_update_m47_audit" ON m47_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m47_audit" ON m47_audit_logs;
CREATE POLICY "anon_delete_m47_audit" ON m47_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m47_doc_number ON m47_document_records(document_number);
CREATE INDEX IF NOT EXISTS idx_m47_doc_stage ON m47_document_records(stage);
CREATE INDEX IF NOT EXISTS idx_m47_audit_case ON m47_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m47_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m47_doc_touch ON m47_document_records;
CREATE TRIGGER trg_m47_doc_touch BEFORE UPDATE ON m47_document_records
  FOR EACH ROW EXECUTE FUNCTION m47_touch_updated_at();

-- ═══════════════════════════════════════════════
-- M48 — Bulk Folder & File Smart Archiver Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m48_archive_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number text NOT NULL UNIQUE,
  batch_title text NOT NULL,
  source_scope text NOT NULL,
  stage text DEFAULT 'discovery',
  status text DEFAULT 'active',
  total_files integer DEFAULT 0,
  processed_files integer DEFAULT 0,
  classified_files integer DEFAULT 0,
  encrypted_files integer DEFAULT 0,
  proposed_structure text,
  human_approved boolean DEFAULT false,
  approved_by text,
  target_repository text DEFAULT 'sovereign_vault',
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m47_recognition_linked boolean DEFAULT false,
  m50_risk_checked boolean DEFAULT false,
  m55_storage_linked boolean DEFAULT false,
  m54_finance_linked boolean DEFAULT false,
  m46_indexed boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m48_archive_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m48_batch" ON m48_archive_batches;
CREATE POLICY "anon_select_m48_batch" ON m48_archive_batches FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m48_batch" ON m48_archive_batches;
CREATE POLICY "anon_insert_m48_batch" ON m48_archive_batches FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m48_batch" ON m48_archive_batches;
CREATE POLICY "anon_update_m48_batch" ON m48_archive_batches FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m48_batch" ON m48_archive_batches;
CREATE POLICY "anon_delete_m48_batch" ON m48_archive_batches FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m48_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m48_archive_batches(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m48_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m48_audit" ON m48_audit_logs;
CREATE POLICY "anon_select_m48_audit" ON m48_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m48_audit" ON m48_audit_logs;
CREATE POLICY "anon_insert_m48_audit" ON m48_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m48_audit" ON m48_audit_logs;
CREATE POLICY "anon_update_m48_audit" ON m48_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m48_audit" ON m48_audit_logs;
CREATE POLICY "anon_delete_m48_audit" ON m48_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m48_batch_number ON m48_archive_batches(batch_number);
CREATE INDEX IF NOT EXISTS idx_m48_batch_stage ON m48_archive_batches(stage);
CREATE INDEX IF NOT EXISTS idx_m48_audit_case ON m48_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m48_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m48_batch_touch ON m48_archive_batches;
CREATE TRIGGER trg_m48_batch_touch BEFORE UPDATE ON m48_archive_batches
  FOR EACH ROW EXECUTE FUNCTION m48_touch_updated_at();

-- ═══════════════════════════════════════════════
-- M49 — Sovereign Boardroom & Executive Governance Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m49_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_number text NOT NULL UNIQUE,
  meeting_title text NOT NULL,
  meeting_type text DEFAULT 'board_meeting',
  stage text DEFAULT 'scheduled',
  status text DEFAULT 'active',
  scheduled_date timestamptz,
  participants_count integer DEFAULT 0,
  agenda_items integer DEFAULT 0,
  decisions_made integer DEFAULT 0,
  votes_passed integer DEFAULT 0,
  votes_rejected integer DEFAULT 0,
  speaker_diarization boolean DEFAULT false,
  minutes_generated boolean DEFAULT false,
  biometric_verified boolean DEFAULT false,
  encrypted boolean DEFAULT true,
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m54_finance_linked boolean DEFAULT false,
  m51_tasks_generated boolean DEFAULT false,
  m48_archived boolean DEFAULT false,
  m109_biometric_signed boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m49_meetings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m49_meeting" ON m49_meetings;
CREATE POLICY "anon_select_m49_meeting" ON m49_meetings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m49_meeting" ON m49_meetings;
CREATE POLICY "anon_insert_m49_meeting" ON m49_meetings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m49_meeting" ON m49_meetings;
CREATE POLICY "anon_update_m49_meeting" ON m49_meetings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m49_meeting" ON m49_meetings;
CREATE POLICY "anon_delete_m49_meeting" ON m49_meetings FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m49_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m49_meetings(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m49_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m49_audit" ON m49_audit_logs;
CREATE POLICY "anon_select_m49_audit" ON m49_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m49_audit" ON m49_audit_logs;
CREATE POLICY "anon_insert_m49_audit" ON m49_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m49_audit" ON m49_audit_logs;
CREATE POLICY "anon_update_m49_audit" ON m49_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m49_audit" ON m49_audit_logs;
CREATE POLICY "anon_delete_m49_audit" ON m49_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m49_meeting_number ON m49_meetings(meeting_number);
CREATE INDEX IF NOT EXISTS idx_m49_meeting_stage ON m49_meetings(stage);
CREATE INDEX IF NOT EXISTS idx_m49_audit_case ON m49_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m49_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m49_meeting_touch ON m49_meetings;
CREATE TRIGGER trg_m49_meeting_touch BEFORE UPDATE ON m49_meetings
  FOR EACH ROW EXECUTE FUNCTION m49_touch_updated_at();

-- ═══════════════════════════════════════════════
-- Seed Data
-- ═══════════════════════════════════════════════

INSERT INTO m47_document_records (document_number, document_title, document_type, stage, status, source_channel, ocr_processed, ocr_language, routing_suggestion, routing_target_module, human_approved, encrypted, description)
VALUES ('DOC-2026-001', 'عقد إيجار تجاري - تصوير ضوئي', 'lease_contract', 'ingestion', 'active', 'camera_capture', true, 'arabic', 'توجيه إلى محرك الأصول العقارية M83', 'm83', false, true, 'عقد إيجار تم تصويره ضوئياً ويتطلب التوجيه للقسم العقاري')
ON CONFLICT DO NOTHING;

INSERT INTO m48_archive_batches (batch_number, batch_title, source_scope, stage, status, total_files, processed_files, classified_files, encrypted_files, human_approved, description)
VALUES ('ARC-2026-001', 'أرشفة دفعة العقود التاريخية', 'server_01/legal_contracts', 'discovery', 'active', 450, 120, 80, 0, false, 'دفعة أولية من 450 عقد تاريخي تحتاج لهيكلة وأرشفة')
ON CONFLICT DO NOTHING;

INSERT INTO m49_meetings (meeting_number, meeting_title, meeting_type, stage, status, scheduled_date, participants_count, agenda_items, decisions_made, votes_passed, votes_rejected, speaker_diarization, minutes_generated, biometric_verified, encrypted, description)
VALUES ('MTG-2026-001', 'اجتماع مجلس الإدارة الاستثنائي - الربع الأول', 'board_meeting', 'scheduled', 'active', '2026-03-15 10:00:00+00', 7, 5, 0, 0, 0, false, false, false, true, 'اجتماع استثنائي لمجلس الإدارة لمناقشة الميزانية الاستثمارية للربع الأول')
ON CONFLICT DO NOTHING;
