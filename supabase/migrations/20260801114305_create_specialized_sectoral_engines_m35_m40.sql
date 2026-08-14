/*
# M35-M40 — Specialized & Sectoral Engines

Creates 6 new module schemas:

1. M35 — Customs, Tax & Real Estate Tax Engine (محرك الجمارك والضرائب والضرائب العقارية)
   - Tax files, customs disputes, real estate tax, audit logs
   - Integrates: M54, M90, M83, M46, M10, M109, M92

2. M36 — Environment & Sustainable Development Engine (محرك البيئة والتنمية المستدامة)
   - Environmental compliance, ESG, emissions tracking, audit logs
   - Integrates: M107, M54, M91, M46, M10, M109, M92

3. M37 — Energy & Natural Resources Engine (محرك الطاقة والموارد الطبيعية)
   - Energy concessions, production sharing, mining licenses, audit logs
   - Integrates: M107, M54, M36, M103, M46, M10, M109, M92

4. M38 — Competition & Consumer Protection Engine (محرك المنافسة وحماية المستهلك)
   - Consumer complaints, quality violations, audit logs
   - Integrates: M88, M54, M101, M46, M10, M109, M92

5. M39 — Sports & Sports Federations Engine (محرك الرياضة والاتحادات الرياضية)
   - Sports contracts, sponsorship, broadcasting rights, audit logs
   - Integrates: M53, M54, M10, M80, M77, M105, M109, M92

6. M40 — Academic & Higher Education Engine (محرك القطاع الأكاديمي والتعليم العالي)
   - Academic contracts, promotions, disciplinary, audit logs
   - Integrates: M53, M77, M54, M10, M80, M49, M109, M92

All tables follow the existing m##_ prefix convention with RLS enabled (single-tenant, no auth gating).
*/

-- ═══════════════════════════════════════════════
-- M35 — Customs, Tax & Real Estate Tax Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m35_tax_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL UNIQUE,
  file_title text NOT NULL,
  file_type text DEFAULT 'income_tax',
  stage text DEFAULT 'intake',
  status text DEFAULT 'active',
  taxpayer_name text NOT NULL,
  tax_category text,
  tax_period text,
  declared_amount numeric(14,2) DEFAULT 0,
  assessed_amount numeric(14,2) DEFAULT 0,
  dispute_amount numeric(14,2) DEFAULT 0,
  exemptions_applied text,
  deadline_date date,
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m54_finance_linked boolean DEFAULT false,
  m90_import_export_linked boolean DEFAULT false,
  m83_property_linked boolean DEFAULT false,
  m46_compliance_checked boolean DEFAULT false,
  m10_case_opened boolean DEFAULT false,
  m109_biometric_required boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m35_tax_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m35_tax" ON m35_tax_files;
CREATE POLICY "anon_select_m35_tax" ON m35_tax_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m35_tax" ON m35_tax_files;
CREATE POLICY "anon_insert_m35_tax" ON m35_tax_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m35_tax" ON m35_tax_files;
CREATE POLICY "anon_update_m35_tax" ON m35_tax_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m35_tax" ON m35_tax_files;
CREATE POLICY "anon_delete_m35_tax" ON m35_tax_files FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m35_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m35_tax_files(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m35_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m35_audit" ON m35_audit_logs;
CREATE POLICY "anon_select_m35_audit" ON m35_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m35_audit" ON m35_audit_logs;
CREATE POLICY "anon_insert_m35_audit" ON m35_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m35_audit" ON m35_audit_logs;
CREATE POLICY "anon_update_m35_audit" ON m35_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m35_audit" ON m35_audit_logs;
CREATE POLICY "anon_delete_m35_audit" ON m35_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m35_tax_number ON m35_tax_files(file_number);
CREATE INDEX IF NOT EXISTS idx_m35_tax_stage ON m35_tax_files(stage);
CREATE INDEX IF NOT EXISTS idx_m35_audit_case ON m35_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m35_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m35_tax_touch ON m35_tax_files;
CREATE TRIGGER trg_m35_tax_touch BEFORE UPDATE ON m35_tax_files
  FOR EACH ROW EXECUTE FUNCTION m35_touch_updated_at();

-- ═══════════════════════════════════════════════
-- M36 — Environment & Sustainable Development Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m36_environmental_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL UNIQUE,
  file_title text NOT NULL,
  file_type text DEFAULT 'compliance_audit',
  stage text DEFAULT 'intake',
  status text DEFAULT 'active',
  facility_name text NOT NULL,
  emission_level numeric(10,2) DEFAULT 0,
  emission_limit numeric(10,2) DEFAULT 0,
  compliance_status text DEFAULT 'pending',
  esg_score numeric(5,2) DEFAULT 0,
  carbon_footprint numeric(14,2) DEFAULT 0,
  energy_consumption numeric(14,2) DEFAULT 0,
  inspection_date date,
  next_inspection_date date,
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
ALTER TABLE m36_environmental_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m36_env" ON m36_environmental_files;
CREATE POLICY "anon_select_m36_env" ON m36_environmental_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m36_env" ON m36_environmental_files;
CREATE POLICY "anon_insert_m36_env" ON m36_environmental_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m36_env" ON m36_environmental_files;
CREATE POLICY "anon_update_m36_env" ON m36_environmental_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m36_env" ON m36_environmental_files;
CREATE POLICY "anon_delete_m36_env" ON m36_environmental_files FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m36_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m36_environmental_files(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m36_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m36_audit" ON m36_audit_logs;
CREATE POLICY "anon_select_m36_audit" ON m36_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m36_audit" ON m36_audit_logs;
CREATE POLICY "anon_insert_m36_audit" ON m36_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m36_audit" ON m36_audit_logs;
CREATE POLICY "anon_update_m36_audit" ON m36_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m36_audit" ON m36_audit_logs;
CREATE POLICY "anon_delete_m36_audit" ON m36_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m36_env_number ON m36_environmental_files(file_number);
CREATE INDEX IF NOT EXISTS idx_m36_env_stage ON m36_environmental_files(stage);
CREATE INDEX IF NOT EXISTS idx_m36_audit_case ON m36_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m36_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m36_env_touch ON m36_environmental_files;
CREATE TRIGGER trg_m36_env_touch BEFORE UPDATE ON m36_environmental_files
  FOR EACH ROW EXECUTE FUNCTION m36_touch_updated_at();

-- ═══════════════════════════════════════════════
-- M37 — Energy & Natural Resources Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m37_energy_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_number text NOT NULL UNIQUE,
  project_title text NOT NULL,
  project_type text DEFAULT 'oil_gas',
  stage text DEFAULT 'intake',
  status text DEFAULT 'active',
  concession_area text,
  operator_name text NOT NULL,
  partner_companies text,
  production_share_rate numeric(5,2) DEFAULT 0,
  royalty_rate numeric(5,2) DEFAULT 0,
  contract_value numeric(14,2) DEFAULT 0,
  energy_output numeric(14,2) DEFAULT 0,
  license_expiry date,
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m107_iot_linked boolean DEFAULT false,
  m54_finance_linked boolean DEFAULT false,
  m36_environmental_linked boolean DEFAULT false,
  m103_mining_linked boolean DEFAULT false,
  m46_compliance_checked boolean DEFAULT false,
  m10_case_opened boolean DEFAULT false,
  m109_biometric_required boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m37_energy_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m37_energy" ON m37_energy_projects;
CREATE POLICY "anon_select_m37_energy" ON m37_energy_projects FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m37_energy" ON m37_energy_projects;
CREATE POLICY "anon_insert_m37_energy" ON m37_energy_projects FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m37_energy" ON m37_energy_projects;
CREATE POLICY "anon_update_m37_energy" ON m37_energy_projects FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m37_energy" ON m37_energy_projects;
CREATE POLICY "anon_delete_m37_energy" ON m37_energy_projects FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m37_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m37_energy_projects(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m37_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m37_audit" ON m37_audit_logs;
CREATE POLICY "anon_select_m37_audit" ON m37_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m37_audit" ON m37_audit_logs;
CREATE POLICY "anon_insert_m37_audit" ON m37_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m37_audit" ON m37_audit_logs;
CREATE POLICY "anon_update_m37_audit" ON m37_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m37_audit" ON m37_audit_logs;
CREATE POLICY "anon_delete_m37_audit" ON m37_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m37_energy_number ON m37_energy_projects(project_number);
CREATE INDEX IF NOT EXISTS idx_m37_energy_stage ON m37_energy_projects(stage);
CREATE INDEX IF NOT EXISTS idx_m37_audit_case ON m37_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m37_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m37_energy_touch ON m37_energy_projects;
CREATE TRIGGER trg_m37_energy_touch BEFORE UPDATE ON m37_energy_projects
  FOR EACH ROW EXECUTE FUNCTION m37_touch_updated_at();

-- ═══════════════════════════════════════════════
-- M38 — Competition & Consumer Protection Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m38_consumer_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text NOT NULL UNIQUE,
  case_title text NOT NULL,
  case_type text DEFAULT 'consumer_complaint',
  stage text DEFAULT 'intake',
  status text DEFAULT 'active',
  consumer_name text NOT NULL,
  merchant_name text NOT NULL,
  product_service text,
  complaint_nature text,
  claimed_amount numeric(14,2) DEFAULT 0,
  settlement_status text DEFAULT 'pending',
  warranty_involved boolean DEFAULT false,
  quality_violation boolean DEFAULT false,
  inspection_report text,
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m88_internal_trade_linked boolean DEFAULT false,
  m54_finance_linked boolean DEFAULT false,
  m101_maintenance_linked boolean DEFAULT false,
  m46_compliance_checked boolean DEFAULT false,
  m10_case_opened boolean DEFAULT false,
  m109_biometric_required boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m38_consumer_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m38_consumer" ON m38_consumer_cases;
CREATE POLICY "anon_select_m38_consumer" ON m38_consumer_cases FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m38_consumer" ON m38_consumer_cases;
CREATE POLICY "anon_insert_m38_consumer" ON m38_consumer_cases FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m38_consumer" ON m38_consumer_cases;
CREATE POLICY "anon_update_m38_consumer" ON m38_consumer_cases FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m38_consumer" ON m38_consumer_cases;
CREATE POLICY "anon_delete_m38_consumer" ON m38_consumer_cases FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m38_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m38_consumer_cases(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m38_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m38_audit" ON m38_audit_logs;
CREATE POLICY "anon_select_m38_audit" ON m38_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m38_audit" ON m38_audit_logs;
CREATE POLICY "anon_insert_m38_audit" ON m38_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m38_audit" ON m38_audit_logs;
CREATE POLICY "anon_update_m38_audit" ON m38_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m38_audit" ON m38_audit_logs;
CREATE POLICY "anon_delete_m38_audit" ON m38_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m38_consumer_number ON m38_consumer_cases(case_number);
CREATE INDEX IF NOT EXISTS idx_m38_consumer_stage ON m38_consumer_cases(stage);
CREATE INDEX IF NOT EXISTS idx_m38_audit_case ON m38_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m38_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m38_consumer_touch ON m38_consumer_cases;
CREATE TRIGGER trg_m38_consumer_touch BEFORE UPDATE ON m38_consumer_cases
  FOR EACH ROW EXECUTE FUNCTION m38_touch_updated_at();

-- ═══════════════════════════════════════════════
-- M39 — Sports & Sports Federations Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m39_sports_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number text NOT NULL UNIQUE,
  contract_title text NOT NULL,
  contract_type text DEFAULT 'player_contract',
  stage text DEFAULT 'draft',
  status text DEFAULT 'pending',
  party_a text NOT NULL,
  party_b text NOT NULL,
  sport_category text,
  contract_value numeric(14,2) DEFAULT 0,
  sponsorship_included boolean DEFAULT false,
  broadcasting_rights boolean DEFAULT false,
  image_rights boolean DEFAULT false,
  dispute_status text DEFAULT 'none',
  drc_ref text,
  cas_ref text,
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m53_document_id text,
  m54_finance_linked boolean DEFAULT false,
  m10_case_opened boolean DEFAULT false,
  m80_ip_linked boolean DEFAULT false,
  m77_hr_linked boolean DEFAULT false,
  m105_arbitration_linked boolean DEFAULT false,
  m109_biometric_signed boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m39_sports_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m39_sports" ON m39_sports_contracts;
CREATE POLICY "anon_select_m39_sports" ON m39_sports_contracts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m39_sports" ON m39_sports_contracts;
CREATE POLICY "anon_insert_m39_sports" ON m39_sports_contracts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m39_sports" ON m39_sports_contracts;
CREATE POLICY "anon_update_m39_sports" ON m39_sports_contracts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m39_sports" ON m39_sports_contracts;
CREATE POLICY "anon_delete_m39_sports" ON m39_sports_contracts FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m39_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m39_sports_contracts(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m39_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m39_audit" ON m39_audit_logs;
CREATE POLICY "anon_select_m39_audit" ON m39_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m39_audit" ON m39_audit_logs;
CREATE POLICY "anon_insert_m39_audit" ON m39_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m39_audit" ON m39_audit_logs;
CREATE POLICY "anon_update_m39_audit" ON m39_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m39_audit" ON m39_audit_logs;
CREATE POLICY "anon_delete_m39_audit" ON m39_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m39_sports_number ON m39_sports_contracts(contract_number);
CREATE INDEX IF NOT EXISTS idx_m39_sports_stage ON m39_sports_contracts(stage);
CREATE INDEX IF NOT EXISTS idx_m39_audit_case ON m39_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m39_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m39_sports_touch ON m39_sports_contracts;
CREATE TRIGGER trg_m39_sports_touch BEFORE UPDATE ON m39_sports_contracts
  FOR EACH ROW EXECUTE FUNCTION m39_touch_updated_at();

-- ═══════════════════════════════════════════════
-- M40 — Academic & Higher Education Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m40_academic_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text NOT NULL UNIQUE,
  case_title text NOT NULL,
  case_type text DEFAULT 'promotion',
  stage text DEFAULT 'intake',
  status text DEFAULT 'active',
  institution_name text NOT NULL,
  faculty_member text NOT NULL,
  academic_rank text,
  promotion_eligible boolean DEFAULT false,
  research_points numeric(10,2) DEFAULT 0,
  disciplinary_action boolean DEFAULT false,
  council_decision text,
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m53_document_id text,
  m77_hr_linked boolean DEFAULT false,
  m54_finance_linked boolean DEFAULT false,
  m10_case_opened boolean DEFAULT false,
  m80_ip_linked boolean DEFAULT false,
  m49_board_approved boolean DEFAULT false,
  m109_biometric_signed boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m40_academic_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m40_academic" ON m40_academic_cases;
CREATE POLICY "anon_select_m40_academic" ON m40_academic_cases FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m40_academic" ON m40_academic_cases;
CREATE POLICY "anon_insert_m40_academic" ON m40_academic_cases FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m40_academic" ON m40_academic_cases;
CREATE POLICY "anon_update_m40_academic" ON m40_academic_cases FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m40_academic" ON m40_academic_cases;
CREATE POLICY "anon_delete_m40_academic" ON m40_academic_cases FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m40_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m40_academic_cases(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m40_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m40_audit" ON m40_audit_logs;
CREATE POLICY "anon_select_m40_audit" ON m40_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m40_audit" ON m40_audit_logs;
CREATE POLICY "anon_insert_m40_audit" ON m40_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m40_audit" ON m40_audit_logs;
CREATE POLICY "anon_update_m40_audit" ON m40_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m40_audit" ON m40_audit_logs;
CREATE POLICY "anon_delete_m40_audit" ON m40_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m40_academic_number ON m40_academic_cases(case_number);
CREATE INDEX IF NOT EXISTS idx_m40_academic_stage ON m40_academic_cases(stage);
CREATE INDEX IF NOT EXISTS idx_m40_audit_case ON m40_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m40_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m40_academic_touch ON m40_academic_cases;
CREATE TRIGGER trg_m40_academic_touch BEFORE UPDATE ON m40_academic_cases
  FOR EACH ROW EXECUTE FUNCTION m40_touch_updated_at();

-- ═══════════════════════════════════════════════
-- Seed Data
-- ═══════════════════════════════════════════════

INSERT INTO m35_tax_files (file_number, file_title, file_type, stage, status, taxpayer_name, tax_category, declared_amount, assessed_amount, dispute_amount, description)
VALUES ('TAX-2026-001', 'ملف ضريبة الدخل - المؤسسة الصناعية', 'income_tax', 'intake', 'active', 'المؤسسة الصناعية السيادية', 'income_tax', 2500000, 2700000, 200000, 'ملف ضريبي للربع الرابع')
ON CONFLICT DO NOTHING;

INSERT INTO m36_environmental_files (file_number, file_title, file_type, stage, status, facility_name, emission_level, emission_limit, compliance_status, esg_score, carbon_footprint, energy_consumption, description)
VALUES ('ENV-2026-001', 'تدقيق بيئي للمصنع السيادي', 'compliance_audit', 'intake', 'active', 'المصنع السيادي للصناعات', 45.50, 60.00, 'compliant', 78.00, 1200, 50000, 'تقرير تدقيق بيئي سنوي للمصنع')
ON CONFLICT DO NOTHING;

INSERT INTO m37_energy_projects (project_number, project_title, project_type, stage, status, concession_area, operator_name, production_share_rate, royalty_rate, contract_value, energy_output, description)
VALUES ('ENG-2026-001', 'مشروع استكشاف وتنمية البترول - المنطقة الجنوبية', 'oil_gas', 'intake', 'active', 'المنطقة الجنوبية الاستكشافية', 'الشركة الوطنية للبترول', 35.00, 10.00, 50000000, 25000, 'اتفاقية مشاركة في الإنتاج لاستكشاف البترول')
ON CONFLICT DO NOTHING;

INSERT INTO m38_consumer_cases (case_number, case_title, case_type, stage, status, consumer_name, merchant_name, product_service, complaint_nature, claimed_amount, warranty_involved, quality_violation, description)
VALUES ('CON-2026-001', 'شكوى مستهلك ضد شركة إلكترونيات', 'consumer_complaint', 'intake', 'active', 'السيد عماد الدين', 'شركة الإلكترونيات المتقدمة', 'هاتف ذكي', 'عيب مصنع', 8000, true, true, 'شكوى عيب مصنع في هاتف ذكي ضمن فترة الضمان')
ON CONFLICT DO NOTHING;

INSERT INTO m39_sports_contracts (contract_number, contract_title, contract_type, stage, status, party_a, party_b, sport_category, contract_value, sponsorship_included, broadcasting_rights, image_rights, description)
VALUES ('SPT-2026-001', 'عقد احتراف لاعب كرة قدم', 'player_contract', 'draft', 'pending', 'النادي السيادي الرياضي', 'اللاعب الدولي', 'football', 5000000, true, false, true, 'عقد احتراف لمدة ثلاثة مواسم رياضية')
ON CONFLICT DO NOTHING;

INSERT INTO m40_academic_cases (case_number, case_title, case_type, stage, status, institution_name, faculty_member, academic_rank, promotion_eligible, research_points, disciplinary_action, description)
VALUES ('ACD-2026-001', 'طلب ترقية أستاذ مشارك إلى أستاذ', 'promotion', 'intake', 'active', 'الجامعة السيادية', 'د. أحمد الباحث', 'associate_professor', true, 85.50, false, 'طلب ترقية علمية بناء على الإنتاج البحثي')
ON CONFLICT DO NOTHING;
