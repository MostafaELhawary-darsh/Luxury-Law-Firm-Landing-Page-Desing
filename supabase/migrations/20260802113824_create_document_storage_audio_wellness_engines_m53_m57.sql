/*
# M53, M55, M56, M57 — Document Studio, Storage, Audio-to-Text & Wellness Engines

Creates 4 new module schemas:

1. M53 — Sovereign Document Studio Engine (محرر وعارض المستندات السيادي الشامل)
   - Document records with versioning, track changes, templates, audit logs
   - Integrates: M10, M54, M50, M48, M109, M92

2. M55 — Sovereign Local Object Storage Engine (محرك التخزين السيادي الموزع)
   - Storage records with buckets, WORM protection, encryption, audit logs
   - Integrates: M48, M53, M46, M109, M92

3. M56 — Local Neural Audio-to-Text Engine (محرك التفريغ الصوتي المحلي الذكي)
   - Transcription records with speaker diarization, timestamps, audit logs
   - Integrates: M49, M53, M55, M109, M92

4. M57 — Sovereign Wellness & Fitness Engine (محرك المنظومة الرياضية والصحية للرفاهية المؤسسية)
   - Wellness records with activity tracking, productivity links, audit logs
   - Integrates: M77, M51, M55, M109, M92

Note: M54 (Financial Engine) and M58 (Sports Law) already exist in the system
and are NOT recreated here to avoid duplication.

All tables follow the existing m##_ prefix convention with RLS enabled (single-tenant, no auth gating).
*/

-- ═══════════════════════════════════════════════
-- M53 — Sovereign Document Studio Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m53_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_number text NOT NULL UNIQUE,
  document_title text NOT NULL,
  document_format text DEFAULT 'docx',
  stage text DEFAULT 'draft',
  status text DEFAULT 'active',
  template_used boolean DEFAULT false,
  template_name text,
  version_number integer DEFAULT 1,
  track_changes boolean DEFAULT true,
  voice_dictated boolean DEFAULT false,
  encrypted boolean DEFAULT true,
  sha3_hash text,
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m10_case_linked boolean DEFAULT false,
  m54_finance_linked boolean DEFAULT false,
  m50_risk_checked boolean DEFAULT false,
  m48_archived boolean DEFAULT false,
  m109_biometric_signed boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m53_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m53_doc" ON m53_documents;
CREATE POLICY "anon_select_m53_doc" ON m53_documents FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m53_doc" ON m53_documents;
CREATE POLICY "anon_insert_m53_doc" ON m53_documents FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m53_doc" ON m53_documents;
CREATE POLICY "anon_update_m53_doc" ON m53_documents FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m53_doc" ON m53_documents;
CREATE POLICY "anon_delete_m53_doc" ON m53_documents FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m53_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m53_documents(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m53_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m53_audit" ON m53_audit_logs;
CREATE POLICY "anon_select_m53_audit" ON m53_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m53_audit" ON m53_audit_logs;
CREATE POLICY "anon_insert_m53_audit" ON m53_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m53_audit" ON m53_audit_logs;
CREATE POLICY "anon_update_m53_audit" ON m53_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m53_audit" ON m53_audit_logs;
CREATE POLICY "anon_delete_m53_audit" ON m53_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m53_doc_number ON m53_documents(document_number);
CREATE INDEX IF NOT EXISTS idx_m53_doc_stage ON m53_documents(stage);
CREATE INDEX IF NOT EXISTS idx_m53_audit_case ON m53_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m53_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m53_doc_touch ON m53_documents;
CREATE TRIGGER trg_m53_doc_touch BEFORE UPDATE ON m53_documents
  FOR EACH ROW EXECUTE FUNCTION m53_touch_updated_at();

-- ═══════════════════════════════════════════════
-- M55 — Sovereign Local Object Storage Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m55_storage_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_number text NOT NULL UNIQUE,
  record_title text NOT NULL,
  file_type text DEFAULT 'document',
  stage text DEFAULT 'ingestion',
  status text DEFAULT 'active',
  bucket_name text NOT NULL,
  file_size bigint DEFAULT 0,
  encrypted boolean DEFAULT true,
  worm_protected boolean DEFAULT false,
  sha3_hash text,
  partition text DEFAULT 'legal',
  retention_policy text DEFAULT 'permanent',
  access_level text DEFAULT 'restricted',
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m48_archived boolean DEFAULT false,
  m53_document_linked boolean DEFAULT false,
  m46_indexed boolean DEFAULT false,
  m109_biometric_required boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m55_storage_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m55_storage" ON m55_storage_records;
CREATE POLICY "anon_select_m55_storage" ON m55_storage_records FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m55_storage" ON m55_storage_records;
CREATE POLICY "anon_insert_m55_storage" ON m55_storage_records FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m55_storage" ON m55_storage_records;
CREATE POLICY "anon_update_m55_storage" ON m55_storage_records FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m55_storage" ON m55_storage_records;
CREATE POLICY "anon_delete_m55_storage" ON m55_storage_records FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m55_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m55_storage_records(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m55_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m55_audit" ON m55_audit_logs;
CREATE POLICY "anon_select_m55_audit" ON m55_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m55_audit" ON m55_audit_logs;
CREATE POLICY "anon_insert_m55_audit" ON m55_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m55_audit" ON m55_audit_logs;
CREATE POLICY "anon_update_m55_audit" ON m55_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m55_audit" ON m55_audit_logs;
CREATE POLICY "anon_delete_m55_audit" ON m55_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m55_storage_number ON m55_storage_records(record_number);
CREATE INDEX IF NOT EXISTS idx_m55_storage_stage ON m55_storage_records(stage);
CREATE INDEX IF NOT EXISTS idx_m55_audit_case ON m55_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m55_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m55_storage_touch ON m55_storage_records;
CREATE TRIGGER trg_m55_storage_touch BEFORE UPDATE ON m55_storage_records
  FOR EACH ROW EXECUTE FUNCTION m55_touch_updated_at();

-- ═══════════════════════════════════════════════
-- M56 — Local Neural Audio-to-Text Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m56_transcriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_number text NOT NULL UNIQUE,
  transcription_title text NOT NULL,
  audio_source text DEFAULT 'file_upload',
  stage text DEFAULT 'ingestion',
  status text DEFAULT 'active',
  language text DEFAULT 'arabic',
  speaker_diarization boolean DEFAULT false,
  speaker_count integer DEFAULT 1,
  duration_seconds integer DEFAULT 0,
  transcription_text text,
  timestamp_extracted boolean DEFAULT false,
  encrypted boolean DEFAULT true,
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m49_meeting_linked boolean DEFAULT false,
  m53_document_linked boolean DEFAULT false,
  m55_storage_linked boolean DEFAULT false,
  m109_biometric_verified boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m56_transcriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m56_transcription" ON m56_transcriptions;
CREATE POLICY "anon_select_m56_transcription" ON m56_transcriptions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m56_transcription" ON m56_transcriptions;
CREATE POLICY "anon_insert_m56_transcription" ON m56_transcriptions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m56_transcription" ON m56_transcriptions;
CREATE POLICY "anon_update_m56_transcription" ON m56_transcriptions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m56_transcription" ON m56_transcriptions;
CREATE POLICY "anon_delete_m56_transcription" ON m56_transcriptions FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m56_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m56_transcriptions(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m56_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m56_audit" ON m56_audit_logs;
CREATE POLICY "anon_select_m56_audit" ON m56_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m56_audit" ON m56_audit_logs;
CREATE POLICY "anon_insert_m56_audit" ON m56_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m56_audit" ON m56_audit_logs;
CREATE POLICY "anon_update_m56_audit" ON m56_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m56_audit" ON m56_audit_logs;
CREATE POLICY "anon_delete_m56_audit" ON m56_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m56_transcription_number ON m56_transcriptions(transcription_number);
CREATE INDEX IF NOT EXISTS idx_m56_transcription_stage ON m56_transcriptions(stage);
CREATE INDEX IF NOT EXISTS idx_m56_audit_case ON m56_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m56_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m56_transcription_touch ON m56_transcriptions;
CREATE TRIGGER trg_m56_transcription_touch BEFORE UPDATE ON m56_transcriptions
  FOR EACH ROW EXECUTE FUNCTION m56_touch_updated_at();

-- ═══════════════════════════════════════════════
-- M57 — Sovereign Wellness & Fitness Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m57_wellness_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_number text NOT NULL UNIQUE,
  record_title text NOT NULL,
  record_type text DEFAULT 'activity_log',
  stage text DEFAULT 'intake',
  status text DEFAULT 'active',
  member_name text NOT NULL,
  activity_type text,
  duration_minutes integer DEFAULT 0,
  intensity_level text DEFAULT 'low',
  productivity_score numeric(5,2) DEFAULT 0,
  pomodoro_sessions integer DEFAULT 0,
  team_challenge boolean DEFAULT false,
  encrypted boolean DEFAULT true,
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m77_hr_linked boolean DEFAULT false,
  m51_tasks_linked boolean DEFAULT false,
  m55_storage_linked boolean DEFAULT false,
  m109_biometric_verified boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m57_wellness_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m57_wellness" ON m57_wellness_records;
CREATE POLICY "anon_select_m57_wellness" ON m57_wellness_records FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m57_wellness" ON m57_wellness_records;
CREATE POLICY "anon_insert_m57_wellness" ON m57_wellness_records FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m57_wellness" ON m57_wellness_records;
CREATE POLICY "anon_update_m57_wellness" ON m57_wellness_records FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m57_wellness" ON m57_wellness_records;
CREATE POLICY "anon_delete_m57_wellness" ON m57_wellness_records FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m57_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m57_wellness_records(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m57_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m57_audit" ON m57_audit_logs;
CREATE POLICY "anon_select_m57_audit" ON m57_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m57_audit" ON m57_audit_logs;
CREATE POLICY "anon_insert_m57_audit" ON m57_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m57_audit" ON m57_audit_logs;
CREATE POLICY "anon_update_m57_audit" ON m57_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m57_audit" ON m57_audit_logs;
CREATE POLICY "anon_delete_m57_audit" ON m57_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m57_wellness_number ON m57_wellness_records(record_number);
CREATE INDEX IF NOT EXISTS idx_m57_wellness_stage ON m57_wellness_records(stage);
CREATE INDEX IF NOT EXISTS idx_m57_audit_case ON m57_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m57_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m57_wellness_touch ON m57_wellness_records;
CREATE TRIGGER trg_m57_wellness_touch BEFORE UPDATE ON m57_wellness_records
  FOR EACH ROW EXECUTE FUNCTION m57_touch_updated_at();

-- ═══════════════════════════════════════════════
-- Seed Data
-- ═══════════════════════════════════════════════

INSERT INTO m53_documents (document_number, document_title, document_format, stage, status, template_used, template_name, version_number, track_changes, voice_dictated, encrypted, description)
VALUES ('DOC-2026-001', 'مذكرة دفاع قضائية - محكمة النقض', 'docx', 'draft', 'active', true, 'legal_memo_template', 3, true, true, true, 'مذكرة دفاعية يتم تحريرها تعاونياً مع تفعيل تتبع التغييرات')
ON CONFLICT DO NOTHING;

INSERT INTO m55_storage_records (record_number, record_title, file_type, stage, status, bucket_name, file_size, encrypted, worm_protected, partition, retention_policy, access_level, description)
VALUES ('STG-2026-001', 'أرشيف العقود الموقعة - الربع الأول', 'document', 'ingestion', 'active', 'legal_archive', 524288000, true, true, 'legal', 'permanent', 'restricted', 'أرشيف العقود الموقعة بيومترياً محمي بتقنية WORM')
ON CONFLICT DO NOTHING;

INSERT INTO m56_transcriptions (transcription_number, transcription_title, audio_source, stage, status, language, speaker_diarization, speaker_count, duration_seconds, timestamp_extracted, encrypted, description)
VALUES ('TRC-2026-001', 'تفريغ اجتماع مجلس الإدارة الاستثنائي', 'file_upload', 'ingestion', 'active', 'arabic', true, 7, 5400, true, true, 'تفريغ صوتي لاجتماع مجلس الإدارة مع فصل المتحدثين')
ON CONFLICT DO NOTHING;

INSERT INTO m57_wellness_records (record_number, record_title, record_type, stage, status, member_name, activity_type, duration_minutes, intensity_level, productivity_score, pomodoro_sessions, team_challenge, description)
VALUES ('WEL-2026-001', 'سجل نشاط بدني - قسم التقاضي', 'activity_log', 'intake', 'active', 'أ. محمد المحامي', 'stretching', 15, 'low', 85.00, 4, false, 'تمارين إطالة خلال فترات الاستراحة لتنشيط الدورة الدموية')
ON CONFLICT DO NOTHING;
