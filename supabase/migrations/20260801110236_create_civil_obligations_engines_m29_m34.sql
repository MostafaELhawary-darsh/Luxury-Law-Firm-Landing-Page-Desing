/*
# M29-M34 — Civil Obligations & Personal Status Sector Engines

Creates 6 new module schemas:

1. M29 — Civil Contracts & Leases Engine (محرك العقود المدنية والإيجارات)
   - Civil contracts, lease agreements (old/new), audit logs
   - Integrates: M53, M46, M10, M54, M83, M30, M109, M92

2. M30 — Compensation & Tort Liability Engine (محرك التعويضات والمسؤولية التقصيرية)
   - Damage claims, tort liability, evidence tracking, audit logs
   - Integrates: M10, M54, M91, M65, M107, M109, M92

3. M31 — Joint Property & Partition Engine (محرك الملكية الشائعة والفرز والتجميع)
   - Joint property cases, partners, partition, audit logs
   - Integrates: M83, M27, M10, M54, M109, M92

4. M32 — Oral Contracts & Civil Evidence Engine (محرك العقود الشفهية والإثبات المدني)
   - Evidence files, witnesses, oral contracts, audit logs
   - Integrates: M10, M54, M56, M46, M109, M92

5. M33 — Real Estate Security & In-Rem Rights Engine (محرك الضمانات والحقوق العينية)
   - Mortgages, pledges, in-rem rights, audit logs
   - Integrates: M83, M22, M54, M75, M10, M107, M109, M92

6. M34 — Consular & Civil Affairs for Individuals Engine (محرك الشؤون القنصلية المدنية للأفراد)
   - Consular cases, document authentication, audit logs
   - Integrates: M97, M109, M46, M10, M54, M92

All tables follow the existing m##_ prefix convention with RLS enabled (single-tenant, no auth gating).
*/

-- ═══════════════════════════════════════════════
-- M29 — Civil Contracts & Leases Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m29_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number text NOT NULL UNIQUE,
  contract_title text NOT NULL,
  contract_type text DEFAULT 'lease',
  stage text DEFAULT 'draft',
  status text DEFAULT 'pending',
  party_a text NOT NULL,
  party_b text NOT NULL,
  property_subject text,
  contract_value numeric(14,2) DEFAULT 0,
  is_old_lease boolean DEFAULT false,
  lease_duration_months integer,
  rent_amount numeric(14,2) DEFAULT 0,
  payment_frequency text DEFAULT 'monthly',
  termination_clauses text,
  compensation_clauses text,
  delivery_handover_conditions text,
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m53_document_id text,
  m46_compliance_checked boolean DEFAULT false,
  m10_deadlines_registered boolean DEFAULT false,
  m54_finance_linked boolean DEFAULT false,
  m83_asset_status_updated boolean DEFAULT false,
  m30_compensation_linked boolean DEFAULT false,
  m109_biometric_signed boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m29_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m29_contracts" ON m29_contracts;
CREATE POLICY "anon_select_m29_contracts" ON m29_contracts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m29_contracts" ON m29_contracts;
CREATE POLICY "anon_insert_m29_contracts" ON m29_contracts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m29_contracts" ON m29_contracts;
CREATE POLICY "anon_update_m29_contracts" ON m29_contracts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m29_contracts" ON m29_contracts;
CREATE POLICY "anon_delete_m29_contracts" ON m29_contracts FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m29_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m29_contracts(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m29_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m29_audit" ON m29_audit_logs;
CREATE POLICY "anon_select_m29_audit" ON m29_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m29_audit" ON m29_audit_logs;
CREATE POLICY "anon_insert_m29_audit" ON m29_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m29_audit" ON m29_audit_logs;
CREATE POLICY "anon_update_m29_audit" ON m29_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m29_audit" ON m29_audit_logs;
CREATE POLICY "anon_delete_m29_audit" ON m29_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m29_contracts_number ON m29_contracts(contract_number);
CREATE INDEX IF NOT EXISTS idx_m29_contracts_stage ON m29_contracts(stage);
CREATE INDEX IF NOT EXISTS idx_m29_audit_case ON m29_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m29_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m29_contracts_touch ON m29_contracts;
CREATE TRIGGER trg_m29_contracts_touch BEFORE UPDATE ON m29_contracts
  FOR EACH ROW EXECUTE FUNCTION m29_touch_updated_at();

-- ═══════════════════════════════════════════════
-- M30 — Compensation & Tort Liability Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m30_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number text NOT NULL UNIQUE,
  claim_title text NOT NULL,
  claim_type text DEFAULT 'tort',
  stage text DEFAULT 'intake',
  status text DEFAULT 'active',
  claimant_name text NOT NULL,
  defendant_name text NOT NULL,
  incident_date date,
  incident_location text,
  material_damage numeric(14,2) DEFAULT 0,
  moral_damage numeric(14,2) DEFAULT 0,
  total_claimed numeric(14,2) DEFAULT 0,
  fault_established boolean DEFAULT false,
  causation_proven boolean DEFAULT false,
  success_probability numeric(5,2) DEFAULT 0,
  expert_report text,
  police_report text,
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m10_case_opened boolean DEFAULT false,
  m54_finance_linked boolean DEFAULT false,
  m91_safety_report_linked boolean DEFAULT false,
  m65_medical_malpractice_linked boolean DEFAULT false,
  m107_iot_evidence_linked boolean DEFAULT false,
  m109_biometric_verified boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m30_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m30_claims" ON m30_claims;
CREATE POLICY "anon_select_m30_claims" ON m30_claims FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m30_claims" ON m30_claims;
CREATE POLICY "anon_insert_m30_claims" ON m30_claims FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m30_claims" ON m30_claims;
CREATE POLICY "anon_update_m30_claims" ON m30_claims FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m30_claims" ON m30_claims;
CREATE POLICY "anon_delete_m30_claims" ON m30_claims FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m30_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m30_claims(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m30_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m30_audit" ON m30_audit_logs;
CREATE POLICY "anon_select_m30_audit" ON m30_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m30_audit" ON m30_audit_logs;
CREATE POLICY "anon_insert_m30_audit" ON m30_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m30_audit" ON m30_audit_logs;
CREATE POLICY "anon_update_m30_audit" ON m30_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m30_audit" ON m30_audit_logs;
CREATE POLICY "anon_delete_m30_audit" ON m30_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m30_claims_number ON m30_claims(claim_number);
CREATE INDEX IF NOT EXISTS idx_m30_claims_stage ON m30_claims(stage);
CREATE INDEX IF NOT EXISTS idx_m30_audit_case ON m30_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m30_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m30_claims_touch ON m30_claims;
CREATE TRIGGER trg_m30_claims_touch BEFORE UPDATE ON m30_claims
  FOR EACH ROW EXECUTE FUNCTION m30_touch_updated_at();

-- ═══════════════════════════════════════════════
-- M31 — Joint Property & Partition Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m31_joint_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text NOT NULL UNIQUE,
  case_title text NOT NULL,
  case_type text DEFAULT 'partition',
  stage text DEFAULT 'intake',
  status text DEFAULT 'active',
  property_description text NOT NULL,
  property_value numeric(14,2) DEFAULT 0,
  partners_count integer DEFAULT 0,
  partition_method text DEFAULT 'physical',
  expert_assigned text,
  consolidation_proposed boolean DEFAULT false,
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m83_property_valued boolean DEFAULT false,
  m27_estate_linked boolean DEFAULT false,
  m10_case_opened boolean DEFAULT false,
  m54_finance_linked boolean DEFAULT false,
  m109_biometric_required boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m31_joint_properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m31_joint" ON m31_joint_properties;
CREATE POLICY "anon_select_m31_joint" ON m31_joint_properties FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m31_joint" ON m31_joint_properties;
CREATE POLICY "anon_insert_m31_joint" ON m31_joint_properties FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m31_joint" ON m31_joint_properties;
CREATE POLICY "anon_update_m31_joint" ON m31_joint_properties FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m31_joint" ON m31_joint_properties;
CREATE POLICY "anon_delete_m31_joint" ON m31_joint_properties FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m31_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  joint_property_id uuid REFERENCES m31_joint_properties(id) ON DELETE CASCADE,
  partner_name text NOT NULL,
  share_fraction text,
  share_percentage numeric(5,2) DEFAULT 0,
  share_value numeric(14,2) DEFAULT 0,
  is_minors boolean DEFAULT false,
  guardian_name text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m31_partners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m31_partners" ON m31_partners;
CREATE POLICY "anon_select_m31_partners" ON m31_partners FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m31_partners" ON m31_partners;
CREATE POLICY "anon_insert_m31_partners" ON m31_partners FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m31_partners" ON m31_partners;
CREATE POLICY "anon_update_m31_partners" ON m31_partners FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m31_partners" ON m31_partners;
CREATE POLICY "anon_delete_m31_partners" ON m31_partners FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m31_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m31_joint_properties(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m31_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m31_audit" ON m31_audit_logs;
CREATE POLICY "anon_select_m31_audit" ON m31_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m31_audit" ON m31_audit_logs;
CREATE POLICY "anon_insert_m31_audit" ON m31_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m31_audit" ON m31_audit_logs;
CREATE POLICY "anon_update_m31_audit" ON m31_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m31_audit" ON m31_audit_logs;
CREATE POLICY "anon_delete_m31_audit" ON m31_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m31_joint_number ON m31_joint_properties(case_number);
CREATE INDEX IF NOT EXISTS idx_m31_joint_stage ON m31_joint_properties(stage);
CREATE INDEX IF NOT EXISTS idx_m31_partners_joint ON m31_partners(joint_property_id);
CREATE INDEX IF NOT EXISTS idx_m31_audit_case ON m31_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m31_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m31_joint_touch ON m31_joint_properties;
CREATE TRIGGER trg_m31_joint_touch BEFORE UPDATE ON m31_joint_properties
  FOR EACH ROW EXECUTE FUNCTION m31_touch_updated_at();

-- ═══════════════════════════════════════════════
-- M32 — Oral Contracts & Civil Evidence Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m32_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_number text NOT NULL UNIQUE,
  evidence_title text NOT NULL,
  evidence_type text DEFAULT 'oral_contract',
  stage text DEFAULT 'intake',
  status text DEFAULT 'active',
  case_reference text,
  contract_nature text,
  witness_count integer DEFAULT 0,
  oath_type text,
  presumptions text,
  transcription_id text,
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m10_case_opened boolean DEFAULT false,
  m54_finance_linked boolean DEFAULT false,
  m56_transcription_linked boolean DEFAULT false,
  m46_compliance_checked boolean DEFAULT false,
  m109_biometric_verified boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m32_evidence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m32_evidence" ON m32_evidence;
CREATE POLICY "anon_select_m32_evidence" ON m32_evidence FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m32_evidence" ON m32_evidence;
CREATE POLICY "anon_insert_m32_evidence" ON m32_evidence FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m32_evidence" ON m32_evidence;
CREATE POLICY "anon_update_m32_evidence" ON m32_evidence FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m32_evidence" ON m32_evidence;
CREATE POLICY "anon_delete_m32_evidence" ON m32_evidence FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m32_witnesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id uuid REFERENCES m32_evidence(id) ON DELETE CASCADE,
  witness_name text NOT NULL,
  witness_statement text,
  statement_date date,
  is_biometric_verified boolean DEFAULT false,
  contradictions_flag boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m32_witnesses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m32_witnesses" ON m32_witnesses;
CREATE POLICY "anon_select_m32_witnesses" ON m32_witnesses FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m32_witnesses" ON m32_witnesses;
CREATE POLICY "anon_insert_m32_witnesses" ON m32_witnesses FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m32_witnesses" ON m32_witnesses;
CREATE POLICY "anon_update_m32_witnesses" ON m32_witnesses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m32_witnesses" ON m32_witnesses;
CREATE POLICY "anon_delete_m32_witnesses" ON m32_witnesses FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m32_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m32_evidence(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m32_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m32_audit" ON m32_audit_logs;
CREATE POLICY "anon_select_m32_audit" ON m32_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m32_audit" ON m32_audit_logs;
CREATE POLICY "anon_insert_m32_audit" ON m32_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m32_audit" ON m32_audit_logs;
CREATE POLICY "anon_update_m32_audit" ON m32_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m32_audit" ON m32_audit_logs;
CREATE POLICY "anon_delete_m32_audit" ON m32_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m32_evidence_number ON m32_evidence(evidence_number);
CREATE INDEX IF NOT EXISTS idx_m32_evidence_stage ON m32_evidence(stage);
CREATE INDEX IF NOT EXISTS idx_m32_witnesses_evidence ON m32_witnesses(evidence_id);
CREATE INDEX IF NOT EXISTS idx_m32_audit_case ON m32_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m32_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m32_evidence_touch ON m32_evidence;
CREATE TRIGGER trg_m32_evidence_touch BEFORE UPDATE ON m32_evidence
  FOR EACH ROW EXECUTE FUNCTION m32_touch_updated_at();

-- ═══════════════════════════════════════════════
-- M33 — Real Estate Security & In-Rem Rights Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m33_mortgages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mortgage_number text NOT NULL UNIQUE,
  mortgage_title text NOT NULL,
  mortgage_type text DEFAULT 'official_mortgage',
  stage text DEFAULT 'registration',
  status text DEFAULT 'active',
  creditor_name text NOT NULL,
  debtor_name text NOT NULL,
  secured_amount numeric(14,2) DEFAULT 0,
  property_subject text NOT NULL,
  registration_date date,
  renewal_date date,
  release_status text DEFAULT 'active',
  iot_monitoring_active boolean DEFAULT false,
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m83_property_checked boolean DEFAULT false,
  m22_sale_blocked boolean DEFAULT false,
  m54_finance_linked boolean DEFAULT false,
  m75_bank_linked boolean DEFAULT false,
  m10_deadlines_registered boolean DEFAULT false,
  m107_iot_monitoring boolean DEFAULT false,
  m109_biometric_signed boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m33_mortgages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m33_mortgages" ON m33_mortgages;
CREATE POLICY "anon_select_m33_mortgages" ON m33_mortgages FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m33_mortgages" ON m33_mortgages;
CREATE POLICY "anon_insert_m33_mortgages" ON m33_mortgages FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m33_mortgages" ON m33_mortgages;
CREATE POLICY "anon_update_m33_mortgages" ON m33_mortgages FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m33_mortgages" ON m33_mortgages;
CREATE POLICY "anon_delete_m33_mortgages" ON m33_mortgages FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m33_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m33_mortgages(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m33_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m33_audit" ON m33_audit_logs;
CREATE POLICY "anon_select_m33_audit" ON m33_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m33_audit" ON m33_audit_logs;
CREATE POLICY "anon_insert_m33_audit" ON m33_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m33_audit" ON m33_audit_logs;
CREATE POLICY "anon_update_m33_audit" ON m33_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m33_audit" ON m33_audit_logs;
CREATE POLICY "anon_delete_m33_audit" ON m33_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m33_mortgages_number ON m33_mortgages(mortgage_number);
CREATE INDEX IF NOT EXISTS idx_m33_mortgages_stage ON m33_mortgages(stage);
CREATE INDEX IF NOT EXISTS idx_m33_audit_case ON m33_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m33_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m33_mortgages_touch ON m33_mortgages;
CREATE TRIGGER trg_m33_mortgages_touch BEFORE UPDATE ON m33_mortgages
  FOR EACH ROW EXECUTE FUNCTION m33_touch_updated_at();

-- ═══════════════════════════════════════════════
-- M34 — Consular & Civil Affairs for Individuals Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m34_consular_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text NOT NULL UNIQUE,
  case_title text NOT NULL,
  case_type text DEFAULT 'document_authentication',
  stage text DEFAULT 'intake',
  status text DEFAULT 'active',
  foreign_national_name text NOT NULL,
  nationality text,
  host_country text,
  vienna_convention_applied boolean DEFAULT false,
  document_type text,
  notarization_required boolean DEFAULT false,
  apostille_required boolean DEFAULT false,
  legal_representation boolean DEFAULT false,
  applicable_law text,
  consular_fees numeric(14,2) DEFAULT 0,
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m97_foreign_affairs_linked boolean DEFAULT false,
  m109_identity_verified boolean DEFAULT false,
  m46_international_law_referenced boolean DEFAULT false,
  m10_case_opened boolean DEFAULT false,
  m54_finance_linked boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m34_consular_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m34_consular" ON m34_consular_cases;
CREATE POLICY "anon_select_m34_consular" ON m34_consular_cases FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m34_consular" ON m34_consular_cases;
CREATE POLICY "anon_insert_m34_consular" ON m34_consular_cases FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m34_consular" ON m34_consular_cases;
CREATE POLICY "anon_update_m34_consular" ON m34_consular_cases FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m34_consular" ON m34_consular_cases;
CREATE POLICY "anon_delete_m34_consular" ON m34_consular_cases FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m34_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m34_consular_cases(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m34_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m34_audit" ON m34_audit_logs;
CREATE POLICY "anon_select_m34_audit" ON m34_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m34_audit" ON m34_audit_logs;
CREATE POLICY "anon_insert_m34_audit" ON m34_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m34_audit" ON m34_audit_logs;
CREATE POLICY "anon_update_m34_audit" ON m34_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m34_audit" ON m34_audit_logs;
CREATE POLICY "anon_delete_m34_audit" ON m34_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m34_consular_number ON m34_consular_cases(case_number);
CREATE INDEX IF NOT EXISTS idx_m34_consular_stage ON m34_consular_cases(stage);
CREATE INDEX IF NOT EXISTS idx_m34_audit_case ON m34_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m34_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m34_consular_touch ON m34_consular_cases;
CREATE TRIGGER trg34_consular_touch BEFORE UPDATE ON m34_consular_cases
  FOR EACH ROW EXECUTE FUNCTION m34_touch_updated_at();

-- ═══════════════════════════════════════════════
-- Seed Data
-- ═══════════════════════════════════════════════

INSERT INTO m29_contracts (contract_number, contract_title, contract_type, stage, status, party_a, party_b, property_subject, contract_value, is_old_lease, rent_amount, payment_frequency, description)
VALUES ('CIV-2026-001', 'عقد إيجار شقة سكنية بالزمالك', 'lease', 'draft', 'pending', 'المؤسسة السيادية', 'السيد أحمد المصري', 'شقة 12 - الزمالك', 360000, false, 30000, 'monthly', 'عقد إيجار سكني خاضع للقانون الجديد')
ON CONFLICT DO NOTHING;

INSERT INTO m30_claims (claim_number, claim_title, claim_type, stage, status, claimant_name, defendant_name, material_damage, moral_damage, total_claimed, success_probability, description)
VALUES ('CMP-2026-001', 'مطالبة تعويض عن حادث مروري', 'tort', 'intake', 'active', 'السيد خالد العمري', 'سائق المركبة المخالفة', 75000, 25000, 100000, 75.00, 'تعويض عن أضرار مادية ومعنوية ناتجة عن حادث تصادم')
ON CONFLICT DO NOTHING;

INSERT INTO m31_joint_properties (case_number, case_title, case_type, stage, status, property_description, property_value, partners_count, partition_method, description)
VALUES ('JNT-2026-001', 'فرز وتجنيب عقار مشاع', 'partition', 'intake', 'active', 'قطعة أرض سكنية - مدينة نصر', 5000000, 4, 'physical', 'دعوى فرز وتجنيب نصيب أربعة شركاء في عقار مشاع')
ON CONFLICT DO NOTHING;

INSERT INTO m31_partners (joint_property_id, partner_name, share_fraction, share_percentage, share_value, is_minors)
SELECT id, 'الشريك الأول', '1/4', 25.00, 1250000, false
FROM m31_joint_properties WHERE case_number='JNT-2026-001' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO m32_evidence (evidence_number, evidence_title, evidence_type, stage, status, case_reference, contract_nature, witness_count, description)
VALUES ('EVD-2026-001', 'إثبات عقد بيع شفهي', 'oral_contract', 'intake', 'active', ' Case-2026-789', 'بيع منقول شفهي', 3, 'إثبات واقعة بيع شفهي بشهادة ثلاثة شهود')
ON CONFLICT DO NOTHING;

INSERT INTO m32_witnesses (evidence_id, witness_name, witness_statement, is_biometric_verified)
SELECT id, 'الشاهد الأول', 'أشهد على واقعة البيع المباشر', true
FROM m32_evidence WHERE evidence_number='EVD-2026-001' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO m33_mortgages (mortgage_number, mortgage_title, mortgage_type, stage, status, creditor_name, debtor_name, secured_amount, property_subject, description)
VALUES ('MOR-2026-001', 'رهن رسمي على عقار تجاري', 'official_mortgage', 'registration', 'active', 'البنك السيادي الوطني', 'المؤسسة التجارية السيادية', 8000000, 'مجمع تجاري - وسط المدينة', 'رهن رسمي لضمان قرض تجاري')
ON CONFLICT DO NOTHING;

INSERT INTO m34_consular_cases (case_number, case_title, case_type, stage, status, foreign_national_name, nationality, host_country, vienna_convention_applied, document_type, notarization_required, apostille_required, consular_fees, description)
VALUES ('CON-2026-001', 'تصديق وكالة لمواطن أجنبي', 'document_authentication', 'intake', 'active', 'John Smith', 'أمريكية', 'مصر', true, 'power_of_attorney', true, true, 1500, 'تصديق وكالة خاصة لمواطن أمريكي للاستخدام أمام الجهات المصرية')
ON CONFLICT DO NOTHING;
