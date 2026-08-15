/*
# M41-M46 — Specialized Sectoral & Administrative Governance Engines

Creates 6 new module schemas:

1. M41 — Pre-University & Schools Education Engine (محرك قطاع التعليم قبل الجامعي والمدارس)
   - School licenses, teacher contracts, student disputes, audit logs
   - Integrates: M54, M10, M77, M46, M109, M92

2. M42 — Local Administration & Occupations Engine (محرك الإدارة المحلية والإشغالات)
   - Building licenses, commercial activities, reconciliation files, audit logs
   - Integrates: M54, M83, M10, M107, M46, M109, M92

3. M43 — Transport, Logistics & Fleet Engine (محرك النقل والمواصلات واللوجستيات)
   - Fleet contracts, logistics, cargo tracking, audit logs
   - Integrates: M107, M54, M91, M46, M10, M109, M92

4. M44 — Administrative Governance & Org Structures Engine (محرك الحوكمة الإدارية والهياكل التنظيمية)
   - Org charts, authority matrix, meetings, regulations, audit logs
   - Integrates: M48, M54, M51, M46, M109, M92

5. M45 — Internal Investigations & Disciplinary Engine (نواة التحقيقات الداخلية والمحاسبة الإدارية)
   - Investigation files, disciplinary actions, hearings, audit logs
   - Integrates: M10, M77, M54, M56, M46, M109, M92

6. M46 — Knowledge Management & Smart Documents Engine (محرك إدارة المعرفة والوثائق الذكية)
   - Document indexing, semantic search, retention policies, audit logs
   - Integrates: M10, M53, M54, M92

All tables follow the existing m##_ prefix convention with RLS enabled (single-tenant, no auth gating).
*/

-- ═══════════════════════════════════════════════
-- M41 — Pre-University & Schools Education Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m41_education_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL UNIQUE,
  file_title text NOT NULL,
  file_type text DEFAULT 'school_license',
  stage text DEFAULT 'intake',
  status text DEFAULT 'active',
  institution_name text NOT NULL,
  institution_type text DEFAULT 'private_school',
  license_status text DEFAULT 'pending',
  naqaae_accredited boolean DEFAULT false,
  teacher_name text,
  student_name text,
  fee_dispute boolean DEFAULT false,
  disciplinary_action boolean DEFAULT false,
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m54_finance_linked boolean DEFAULT false,
  m10_case_opened boolean DEFAULT false,
  m77_hr_linked boolean DEFAULT false,
  m46_compliance_checked boolean DEFAULT false,
  m109_biometric_signed boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m41_education_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m41_edu" ON m41_education_files;
CREATE POLICY "anon_select_m41_edu" ON m41_education_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m41_edu" ON m41_education_files;
CREATE POLICY "anon_insert_m41_edu" ON m41_education_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m41_edu" ON m41_education_files;
CREATE POLICY "anon_update_m41_edu" ON m41_education_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m41_edu" ON m41_education_files;
CREATE POLICY "anon_delete_m41_edu" ON m41_education_files FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m41_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m41_education_files(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m41_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m41_audit" ON m41_audit_logs;
CREATE POLICY "anon_select_m41_audit" ON m41_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m41_audit" ON m41_audit_logs;
CREATE POLICY "anon_insert_m41_audit" ON m41_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m41_audit" ON m41_audit_logs;
CREATE POLICY "anon_update_m41_audit" ON m41_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m41_audit" ON m41_audit_logs;
CREATE POLICY "anon_delete_m41_audit" ON m41_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m41_edu_number ON m41_education_files(file_number);
CREATE INDEX IF NOT EXISTS idx_m41_edu_stage ON m41_education_files(stage);
CREATE INDEX IF NOT EXISTS idx_m41_audit_case ON m41_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m41_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m41_edu_touch ON m41_education_files;
CREATE TRIGGER trg_m41_edu_touch BEFORE UPDATE ON m41_education_files
  FOR EACH ROW EXECUTE FUNCTION m41_touch_updated_at();

-- ═══════════════════════════════════════════════
-- M42 — Local Administration & Occupations Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m42_local_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL UNIQUE,
  file_title text NOT NULL,
  file_type text DEFAULT 'commercial_license',
  stage text DEFAULT 'intake',
  status text DEFAULT 'active',
  applicant_name text NOT NULL,
  property_location text,
  license_type text,
  reconciliation_status text DEFAULT 'none',
  state_property_flag boolean DEFAULT false,
  committee_assigned boolean DEFAULT false,
  fee_amount numeric(14,2) DEFAULT 0,
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m54_finance_linked boolean DEFAULT false,
  m83_property_linked boolean DEFAULT false,
  m10_case_opened boolean DEFAULT false,
  m107_iot_linked boolean DEFAULT false,
  m46_compliance_checked boolean DEFAULT false,
  m109_biometric_signed boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m42_local_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m42_local" ON m42_local_files;
CREATE POLICY "anon_select_m42_local" ON m42_local_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m42_local" ON m42_local_files;
CREATE POLICY "anon_insert_m42_local" ON m42_local_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m42_local" ON m42_local_files;
CREATE POLICY "anon_update_m42_local" ON m42_local_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m42_local" ON m42_local_files;
CREATE POLICY "anon_delete_m42_local" ON m42_local_files FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m42_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m42_local_files(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m42_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m42_audit" ON m42_audit_logs;
CREATE POLICY "anon_select_m42_audit" ON m42_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m42_audit" ON m42_audit_logs;
CREATE POLICY "anon_insert_m42_audit" ON m42_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m42_audit" ON m42_audit_logs;
CREATE POLICY "anon_update_m42_audit" ON m42_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m42_audit" ON m42_audit_logs;
CREATE POLICY "anon_delete_m42_audit" ON m42_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m42_local_number ON m42_local_files(file_number);
CREATE INDEX IF NOT EXISTS idx_m42_local_stage ON m42_local_files(stage);
CREATE INDEX IF NOT EXISTS idx_m42_audit_case ON m42_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m42_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m42_local_touch ON m42_local_files;
CREATE TRIGGER trg_m42_local_touch BEFORE UPDATE ON m42_local_files
  FOR EACH ROW EXECUTE FUNCTION m42_touch_updated_at();

-- ═══════════════════════════════════════════════
-- M43 — Transport, Logistics & Fleet Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m43_transport_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL UNIQUE,
  file_title text NOT NULL,
  file_type text DEFAULT 'fleet_contract',
  stage text DEFAULT 'intake',
  status text DEFAULT 'active',
  carrier_name text NOT NULL,
  fleet_type text,
  route_description text,
  cargo_description text,
  cargo_value numeric(14,2) DEFAULT 0,
  insurance_covered boolean DEFAULT false,
  tracking_active boolean DEFAULT false,
  delivery_deadline date,
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m107_iot_linked boolean DEFAULT false,
  m54_finance_linked boolean DEFAULT false,
  m91_safety_linked boolean DEFAULT false,
  m46_compliance_checked boolean DEFAULT false,
  m10_case_opened boolean DEFAULT false,
  m109_biometric_required boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m43_transport_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m43_transport" ON m43_transport_files;
CREATE POLICY "anon_select_m43_transport" ON m43_transport_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m43_transport" ON m43_transport_files;
CREATE POLICY "anon_insert_m43_transport" ON m43_transport_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m43_transport" ON m43_transport_files;
CREATE POLICY "anon_update_m43_transport" ON m43_transport_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m43_transport" ON m43_transport_files;
CREATE POLICY "anon_delete_m43_transport" ON m43_transport_files FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m43_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m43_transport_files(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m43_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m43_audit" ON m43_audit_logs;
CREATE POLICY "anon_select_m43_audit" ON m43_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m43_audit" ON m43_audit_logs;
CREATE POLICY "anon_insert_m43_audit" ON m43_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m43_audit" ON m43_audit_logs;
CREATE POLICY "anon_update_m43_audit" ON m43_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m43_audit" ON m43_audit_logs;
CREATE POLICY "anon_delete_m43_audit" ON m43_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m43_transport_number ON m43_transport_files(file_number);
CREATE INDEX IF NOT EXISTS idx_m43_transport_stage ON m43_transport_files(stage);
CREATE INDEX IF NOT EXISTS idx_m43_audit_case ON m43_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m43_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m43_transport_touch ON m43_transport_files;
CREATE TRIGGER trg_m43_transport_touch BEFORE UPDATE ON m43_transport_files
  FOR EACH ROW EXECUTE FUNCTION m43_touch_updated_at();

-- ═══════════════════════════════════════════════
-- M44 — Administrative Governance & Org Structures Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m44_governance_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL UNIQUE,
  file_title text NOT NULL,
  file_type text DEFAULT 'org_structure',
  stage text DEFAULT 'intake',
  status text DEFAULT 'active',
  org_entity text NOT NULL,
  authority_level text,
  financial_limit numeric(14,2) DEFAULT 0,
  delegation_status text DEFAULT 'none',
  meeting_scheduled boolean DEFAULT false,
  regulations_updated boolean DEFAULT false,
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m48_communications_linked boolean DEFAULT false,
  m54_finance_linked boolean DEFAULT false,
  m51_tasks_generated boolean DEFAULT false,
  m46_compliance_checked boolean DEFAULT false,
  m109_biometric_signed boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m44_governance_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m44_gov" ON m44_governance_files;
CREATE POLICY "anon_select_m44_gov" ON m44_governance_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m44_gov" ON m44_governance_files;
CREATE POLICY "anon_insert_m44_gov" ON m44_governance_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m44_gov" ON m44_governance_files;
CREATE POLICY "anon_update_m44_gov" ON m44_governance_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m44_gov" ON m44_governance_files;
CREATE POLICY "anon_delete_m44_gov" ON m44_governance_files FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m44_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m44_governance_files(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m44_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m44_audit" ON m44_audit_logs;
CREATE POLICY "anon_select_m44_audit" ON m44_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m44_audit" ON m44_audit_logs;
CREATE POLICY "anon_insert_m44_audit" ON m44_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m44_audit" ON m44_audit_logs;
CREATE POLICY "anon_update_m44_audit" ON m44_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m44_audit" ON m44_audit_logs;
CREATE POLICY "anon_delete_m44_audit" ON m44_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m44_gov_number ON m44_governance_files(file_number);
CREATE INDEX IF NOT EXISTS idx_m44_gov_stage ON m44_governance_files(stage);
CREATE INDEX IF NOT EXISTS idx_m44_audit_case ON m44_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m44_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m44_gov_touch ON m44_governance_files;
CREATE TRIGGER trg_m44_gov_touch BEFORE UPDATE ON m44_governance_files
  FOR EACH ROW EXECUTE FUNCTION m44_touch_updated_at();

-- ═══════════════════════════════════════════════
-- M45 — Internal Investigations & Disciplinary Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m45_investigation_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL UNIQUE,
  file_title text NOT NULL,
  file_type text DEFAULT 'investigation',
  stage text DEFAULT 'intake',
  status text DEFAULT 'active',
  respondent_name text NOT NULL,
  complainant_name text,
  violation_type text,
  penalty_recommendation text,
  hearing_scheduled boolean DEFAULT false,
  appeal_filed boolean DEFAULT false,
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m10_case_opened boolean DEFAULT false,
  m77_hr_linked boolean DEFAULT false,
  m54_finance_linked boolean DEFAULT false,
  m56_transcription_linked boolean DEFAULT false,
  m46_compliance_checked boolean DEFAULT false,
  m109_biometric_signed boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m45_investigation_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m45_inv" ON m45_investigation_files;
CREATE POLICY "anon_select_m45_inv" ON m45_investigation_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m45_inv" ON m45_investigation_files;
CREATE POLICY "anon_insert_m45_inv" ON m45_investigation_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m45_inv" ON m45_investigation_files;
CREATE POLICY "anon_update_m45_inv" ON m45_investigation_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m45_inv" ON m45_investigation_files;
CREATE POLICY "anon_delete_m45_inv" ON m45_investigation_files FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m45_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m45_investigation_files(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m45_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m45_audit" ON m45_audit_logs;
CREATE POLICY "anon_select_m45_audit" ON m45_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m45_audit" ON m45_audit_logs;
CREATE POLICY "anon_insert_m45_audit" ON m45_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m45_audit" ON m45_audit_logs;
CREATE POLICY "anon_update_m45_audit" ON m45_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m45_audit" ON m45_audit_logs;
CREATE POLICY "anon_delete_m45_audit" ON m45_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m45_inv_number ON m45_investigation_files(file_number);
CREATE INDEX IF NOT EXISTS idx_m45_inv_stage ON m45_investigation_files(stage);
CREATE INDEX IF NOT EXISTS idx_m45_audit_case ON m45_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m45_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m45_inv_touch ON m45_investigation_files;
CREATE TRIGGER trg_m45_inv_touch BEFORE UPDATE ON m45_investigation_files
  FOR EACH ROW EXECUTE FUNCTION m45_touch_updated_at();

-- ═══════════════════════════════════════════════
-- M46 — Knowledge Management & Smart Documents Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m46_knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_number text NOT NULL UNIQUE,
  document_title text NOT NULL,
  document_type text DEFAULT 'legislation',
  stage text DEFAULT 'intake',
  status text DEFAULT 'active',
  source_authority text,
  jurisdiction text,
  keywords text,
  retention_policy text DEFAULT 'permanent',
  ocr_processed boolean DEFAULT false,
  encrypted boolean DEFAULT true,
  access_level text DEFAULT 'restricted',
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m10_case_linked boolean DEFAULT false,
  m53_archived boolean DEFAULT false,
  m54_finance_linked boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m46_knowledge_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m46_km" ON m46_knowledge_documents;
CREATE POLICY "anon_select_m46_km" ON m46_knowledge_documents FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m46_km" ON m46_knowledge_documents;
CREATE POLICY "anon_insert_m46_km" ON m46_knowledge_documents FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m46_km" ON m46_knowledge_documents;
CREATE POLICY "anon_update_m46_km" ON m46_knowledge_documents FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m46_km" ON m46_knowledge_documents;
CREATE POLICY "anon_delete_m46_km" ON m46_knowledge_documents FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m46_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m46_knowledge_documents(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m46_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m46_km_audit" ON m46_audit_logs;
CREATE POLICY "anon_select_m46_km_audit" ON m46_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m46_km_audit" ON m46_audit_logs;
CREATE POLICY "anon_insert_m46_km_audit" ON m46_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m46_km_audit" ON m46_audit_logs;
CREATE POLICY "anon_update_m46_km_audit" ON m46_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m46_km_audit" ON m46_audit_logs;
CREATE POLICY "anon_delete_m46_km_audit" ON m46_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m46_km_number ON m46_knowledge_documents(document_number);
CREATE INDEX IF NOT EXISTS idx_m46_km_stage ON m46_knowledge_documents(stage);
CREATE INDEX IF NOT EXISTS idx_m46_km_audit_case ON m46_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m46_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m46_km_touch ON m46_knowledge_documents;
CREATE TRIGGER trg_m46_km_touch BEFORE UPDATE ON m46_knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION m46_touch_updated_at();

-- ═══════════════════════════════════════════════
-- Seed Data
-- ═══════════════════════════════════════════════

INSERT INTO m41_education_files (file_number, file_title, file_type, stage, status, institution_name, institution_type, license_status, naqaae_accredited, description)
VALUES ('EDU-2026-001', 'طلب ترخيص مدرسة خاصة جديدة', 'school_license', 'intake', 'active', 'مدرسة النيل الدولية', 'international_school', 'pending', false, 'طلب ترخيص لتأسيس مدرسة دولية جديدة')
ON CONFLICT DO NOTHING;

INSERT INTO m42_local_files (file_number, file_title, file_type, stage, status, applicant_name, property_location, license_type, fee_amount, description)
VALUES ('LOC-2026-001', 'ترخيص محل تجاري - وسط المدينة', 'commercial_license', 'intake', 'active', 'السيد محمد التاجر', 'شارع الجمهورية - وسط المدينة', 'commercial_activity', 5000, 'طلب استخراج ترخيص محل تجاري')
ON CONFLICT DO NOTHING;

INSERT INTO m43_transport_files (file_number, file_title, file_type, stage, status, carrier_name, fleet_type, route_description, cargo_value, insurance_covered, tracking_active, description)
VALUES ('TRP-2026-001', 'عقد توريد ونقل أسطول شاحنات', 'fleet_contract', 'intake', 'active', 'شركة النقل السيادية', 'heavy_trucks', 'القاهرة - الإسكندرية', 2500000, true, true, 'عقد توريد ونقل بضائع بين القاهرة والإسكندرية')
ON CONFLICT DO NOTHING;

INSERT INTO m44_governance_files (file_number, file_title, file_type, stage, status, org_entity, authority_level, financial_limit, delegation_status, description)
VALUES ('GOV-2026-001', 'تعديل الهيكل التنظيمي للإدارة المالية', 'org_structure', 'intake', 'active', 'الإدارة المالية', 'executive', 500000, 'delegated', 'تعديل الهيكل التنظيمي ومصفوفة الصلاحيات للإدارة المالية')
ON CONFLICT DO NOTHING;

INSERT INTO m45_investigation_files (file_number, file_title, file_type, stage, status, respondent_name, complainant_name, violation_type, penalty_recommendation, description)
VALUES ('INV-2026-001', 'تحقيق إداري في مخالفة موظف', 'investigation', 'intake', 'active', 'السيد الموظف المخالف', 'المدير المباشر', 'absence_without_leave', 'warning', 'تحقيق في غياب الموظف بدون إذن رسمي')
ON CONFLICT DO NOTHING;

INSERT INTO m46_knowledge_documents (document_number, document_title, document_type, stage, status, source_authority, jurisdiction, keywords, retention_policy, ocr_processed, description)
VALUES ('KM-2026-001', 'قانون حماية المستهلك - النص الكامل', 'legislation', 'intake', 'active', 'مجلس النواب', 'national', 'حماية المستهلك، شكاوى، غرامات', 'permanent', true, 'النص الكامل لقانون حماية المستهلك مع التعديلات')
ON CONFLICT DO NOTHING;
