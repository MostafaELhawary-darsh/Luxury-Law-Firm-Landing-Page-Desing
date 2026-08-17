/*
# M12-M17 — Intellectual Property & Technology Sector Engines

Creates 6 new module schemas for the IP & Digital Sovereignty sector:
1. M12 — Patent & Technological Innovation Engine
2. M13 — Copyright & Digital Protection Engine
3. M14 — Cybersecurity & Data Protection Engine
4. M15 — Cyber Crime & IT Law Engine
5. M16 — Digital Transaction & E-Signature Engine
6. M17 — Digital Publishing & Multimedia Engine

All tables follow the existing m##_ prefix convention with RLS enabled (single-tenant, no auth gating).
*/

-- ═══════════════════════════════════════════════
-- M12 — Patent & Technological Innovation Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m12_patents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patent_number text NOT NULL UNIQUE,
  patent_title text NOT NULL,
  patent_type text DEFAULT 'utility',
  stage text DEFAULT 'idea',
  status text DEFAULT 'draft',
  inventors jsonb DEFAULT '[]'::jsonb,
  assignee text,
  international_class text,
  filing_date date,
  grant_date date,
  priority_date date,
  deposit_certificate_hash text,
  technical_specifications text,
  engineering_drawings jsonb DEFAULT '[]'::jsonb,
  lab_results text,
  is_software_patent boolean DEFAULT false,
  is_trade_secret boolean DEFAULT false,
  financial_value numeric(14,2) DEFAULT 0,
  filing_fees numeric(14,2) DEFAULT 0,
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m10_linked boolean DEFAULT false,
  m54_cost_center_opened boolean DEFAULT false,
  m53_archived boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  m52_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m12_patents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m12_patents" ON m12_patents;
CREATE POLICY "anon_select_m12_patents" ON m12_patents FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m12_patents" ON m12_patents;
CREATE POLICY "anon_insert_m12_patents" ON m12_patents FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m12_patents" ON m12_patents;
CREATE POLICY "anon_update_m12_patents" ON m12_patents FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m12_patents" ON m12_patents;
CREATE POLICY "anon_delete_m12_patents" ON m12_patents FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m12_prior_art (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patent_id uuid REFERENCES m12_patents(id) ON DELETE CASCADE,
  reference_number text NOT NULL,
  title text,
  source text,
  similarity_score numeric(5,2) DEFAULT 0,
  relevance text DEFAULT 'medium',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m12_prior_art ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m12_prior_art" ON m12_prior_art;
CREATE POLICY "anon_select_m12_prior_art" ON m12_prior_art FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m12_prior_art" ON m12_prior_art;
CREATE POLICY "anon_insert_m12_prior_art" ON m12_prior_art FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m12_prior_art" ON m12_prior_art;
CREATE POLICY "anon_update_m12_prior_art" ON m12_prior_art FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m12_prior_art" ON m12_prior_art;
CREATE POLICY "anon_delete_m12_prior_art" ON m12_prior_art FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m12_lifecycle_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patent_id uuid REFERENCES m12_patents(id) ON DELETE CASCADE,
  milestone_type text NOT NULL,
  milestone_date date NOT NULL,
  deadline_date date,
  completed boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m12_lifecycle_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m12_milestones" ON m12_lifecycle_milestones;
CREATE POLICY "anon_select_m12_milestones" ON m12_lifecycle_milestones FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m12_milestones" ON m12_lifecycle_milestones;
CREATE POLICY "anon_insert_m12_milestones" ON m12_lifecycle_milestones FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m12_milestones" ON m12_lifecycle_milestones;
CREATE POLICY "anon_update_m12_milestones" ON m12_lifecycle_milestones FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m12_milestones" ON m12_lifecycle_milestones;
CREATE POLICY "anon_delete_m12_milestones" ON m12_lifecycle_milestones FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m12_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m12_patents(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m12_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m12_audit" ON m12_audit_logs;
CREATE POLICY "anon_select_m12_audit" ON m12_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m12_audit" ON m12_audit_logs;
CREATE POLICY "anon_insert_m12_audit" ON m12_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m12_audit" ON m12_audit_logs;
CREATE POLICY "anon_update_m12_audit" ON m12_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m12_audit" ON m12_audit_logs;
CREATE POLICY "anon_delete_m12_audit" ON m12_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m12_patents_number ON m12_patents(patent_number);
CREATE INDEX IF NOT EXISTS idx_m12_patents_stage ON m12_patents(stage);
CREATE INDEX IF NOT EXISTS idx_m12_prior_art_patent ON m12_prior_art(patent_id);
CREATE INDEX IF NOT EXISTS idx_m12_milestones_patent ON m12_lifecycle_milestones(patent_id);
CREATE INDEX IF NOT EXISTS idx_m12_audit_case ON m12_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m12_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m12_patents_touch ON m12_patents;
CREATE TRIGGER trg_m12_patents_touch BEFORE UPDATE ON m12_patents
  FOR EACH ROW EXECUTE FUNCTION m12_touch_updated_at();

-- ═══════════════════════════════════════════════
-- M13 — Copyright & Digital Protection Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m13_copyrights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number text NOT NULL UNIQUE,
  work_title text NOT NULL,
  work_type text DEFAULT 'literary',
  stage text DEFAULT 'deposit',
  status text DEFAULT 'draft',
  author_name text NOT NULL,
  author_biometric_id text,
  rights_holder text,
  deposit_hash text,
  drm_protected boolean DEFAULT false,
  is_software_code boolean DEFAULT false,
  source_code_hash text,
  license_type text,
  publication_date date,
  financial_value numeric(14,2) DEFAULT 0,
  filing_fees numeric(14,2) DEFAULT 0,
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m81_media_linked boolean DEFAULT false,
  m54_finance_linked boolean DEFAULT false,
  m53_archived boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  m52_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m13_copyrights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m13_copyrights" ON m13_copyrights;
CREATE POLICY "anon_select_m13_copyrights" ON m13_copyrights FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m13_copyrights" ON m13_copyrights;
CREATE POLICY "anon_insert_m13_copyrights" ON m13_copyrights FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m13_copyrights" ON m13_copyrights;
CREATE POLICY "anon_update_m13_copyrights" ON m13_copyrights FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m13_copyrights" ON m13_copyrights;
CREATE POLICY "anon_delete_m13_copyrights" ON m13_copyrights FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m13_infringements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  copyright_id uuid REFERENCES m13_copyrights(id) ON DELETE CASCADE,
  infringing_party text NOT NULL,
  infringement_type text,
  detected_date date,
  evidence_url text,
  similarity_score numeric(5,2) DEFAULT 0,
  status text DEFAULT 'detected',
  m10_case_opened boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m13_infringements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m13_infringements" ON m13_infringements;
CREATE POLICY "anon_select_m13_infringements" ON m13_infringements FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m13_infringements" ON m13_infringements;
CREATE POLICY "anon_insert_m13_infringements" ON m13_infringements FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m13_infringements" ON m13_infringements;
CREATE POLICY "anon_update_m13_infringements" ON m13_infringements FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m13_infringements" ON m13_infringements;
CREATE POLICY "anon_delete_m13_infringements" ON m13_infringements FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m13_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  copyright_id uuid REFERENCES m13_copyrights(id) ON DELETE CASCADE,
  licensee text NOT NULL,
  license_scope text,
  royalty_rate numeric(5,2) DEFAULT 0,
  start_date date,
  end_date date,
  is_exclusive boolean DEFAULT false,
  m54_finance_linked boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m13_licenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m13_licenses" ON m13_licenses;
CREATE POLICY "anon_select_m13_licenses" ON m13_licenses FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m13_licenses" ON m13_licenses;
CREATE POLICY "anon_insert_m13_licenses" ON m13_licenses FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m13_licenses" ON m13_licenses;
CREATE POLICY "anon_update_m13_licenses" ON m13_licenses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m13_licenses" ON m13_licenses;
CREATE POLICY "anon_delete_m13_licenses" ON m13_licenses FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m13_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m13_copyrights(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m13_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m13_audit" ON m13_audit_logs;
CREATE POLICY "anon_select_m13_audit" ON m13_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m13_audit" ON m13_audit_logs;
CREATE POLICY "anon_insert_m13_audit" ON m13_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m13_audit" ON m13_audit_logs;
CREATE POLICY "anon_update_m13_audit" ON m13_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m13_audit" ON m13_audit_logs;
CREATE POLICY "anon_delete_m13_audit" ON m13_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m13_copyrights_number ON m13_copyrights(registration_number);
CREATE INDEX IF NOT EXISTS idx_m13_copyrights_stage ON m13_copyrights(stage);
CREATE INDEX IF NOT EXISTS idx_m13_infringements_copyright ON m13_infringements(copyright_id);
CREATE INDEX IF NOT EXISTS idx_m13_licenses_copyright ON m13_licenses(copyright_id);
CREATE INDEX IF NOT EXISTS idx_m13_audit_case ON m13_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m13_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m13_copyrights_touch ON m13_copyrights;
CREATE TRIGGER trg_m13_copyrights_touch BEFORE UPDATE ON m13_copyrights
  FOR EACH ROW EXECUTE FUNCTION m13_touch_updated_at();

-- ═══════════════════════════════════════════════
-- M14 — Cybersecurity & Data Protection Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m14_threats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number text NOT NULL UNIQUE,
  incident_title text NOT NULL,
  threat_type text DEFAULT 'intrusion',
  severity text DEFAULT 'medium',
  stage text DEFAULT 'detected',
  status text DEFAULT 'active',
  detected_at timestamptz DEFAULT now(),
  source_ip text,
  target_system text,
  attack_vector text,
  affected_assets jsonb DEFAULT '[]'::jsonb,
  data_breached boolean DEFAULT false,
  gdpr_compliance_flag boolean DEFAULT false,
  zero_trust_violation boolean DEFAULT false,
  containment_status text DEFAULT 'pending',
  financial_impact numeric(14,2) DEFAULT 0,
  cost_center_id text,
  assigned_analyst_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m51_incident_ticket_created boolean DEFAULT false,
  m108_disaster_triggered boolean DEFAULT false,
  m109_biometric_required boolean DEFAULT false,
  m54_finance_linked boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m14_threats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m14_threats" ON m14_threats;
CREATE POLICY "anon_select_m14_threats" ON m14_threats FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m14_threats" ON m14_threats;
CREATE POLICY "anon_insert_m14_threats" ON m14_threats FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m14_threats" ON m14_threats;
CREATE POLICY "anon_update_m14_threats" ON m14_threats FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m14_threats" ON m14_threats;
CREATE POLICY "anon_delete_m14_threats" ON m14_threats FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m14_anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  threat_id uuid REFERENCES m14_threats(id) ON DELETE CASCADE,
  anomaly_type text NOT NULL,
  description text,
  detected_at timestamptz DEFAULT now(),
  velocity_flag boolean DEFAULT false,
  off_hours_flag boolean DEFAULT false,
  scope_breach_flag boolean DEFAULT false,
  decryption_failure_flag boolean DEFAULT false,
  risk_score numeric(5,2) DEFAULT 0,
  auto_alerted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m14_anomalies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m14_anomalies" ON m14_anomalies;
CREATE POLICY "anon_select_m14_anomalies" ON m14_anomalies FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m14_anomalies" ON m14_anomalies;
CREATE POLICY "anon_insert_m14_anomalies" ON m14_anomalies FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m14_anomalies" ON m14_anomalies;
CREATE POLICY "anon_update_m14_anomalies" ON m14_anomalies FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m14_anomalies" ON m14_anomalies;
CREATE POLICY "anon_delete_m14_anomalies" ON m14_anomalies FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m14_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m14_threats(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m14_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m14_audit" ON m14_audit_logs;
CREATE POLICY "anon_select_m14_audit" ON m14_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m14_audit" ON m14_audit_logs;
CREATE POLICY "anon_insert_m14_audit" ON m14_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m14_audit" ON m14_audit_logs;
CREATE POLICY "anon_update_m14_audit" ON m14_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m14_audit" ON m14_audit_logs;
CREATE POLICY "anon_delete_m14_audit" ON m14_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m14_threats_number ON m14_threats(incident_number);
CREATE INDEX IF NOT EXISTS idx_m14_threats_stage ON m14_threats(stage);
CREATE INDEX IF NOT EXISTS idx_m14_threats_severity ON m14_threats(severity);
CREATE INDEX IF NOT EXISTS idx_m14_anomalies_threat ON m14_anomalies(threat_id);
CREATE INDEX IF NOT EXISTS idx_m14_audit_case ON m14_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m14_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m14_threats_touch ON m14_threats;
CREATE TRIGGER trg_m14_threats_touch BEFORE UPDATE ON m14_threats
  FOR EACH ROW EXECUTE FUNCTION m14_touch_updated_at();

-- ═══════════════════════════════════════════════
-- M15 — Cyber Crime & IT Law Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m15_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text NOT NULL UNIQUE,
  case_title text NOT NULL,
  case_category text DEFAULT 'hacking',
  stage text DEFAULT 'investigation',
  status text DEFAULT 'active',
  crime_type text NOT NULL,
  incident_date date,
  suspect_name text,
  suspect_biometric_id text,
  victim_entity text,
  digital_evidence_chain jsonb DEFAULT '[]'::jsonb,
  damage_estimate numeric(14,2) DEFAULT 0,
  recovery_amount numeric(14,2) DEFAULT 0,
  cost_center_id text,
  assigned_attorney_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m10_linked boolean DEFAULT false,
  m14_incident_id text,
  m54_finance_linked boolean DEFAULT false,
  m51_investigation_ticket boolean DEFAULT false,
  m109_identity_verified boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m15_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m15_cases" ON m15_cases;
CREATE POLICY "anon_select_m15_cases" ON m15_cases FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m15_cases" ON m15_cases;
CREATE POLICY "anon_insert_m15_cases" ON m15_cases FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m15_cases" ON m15_cases;
CREATE POLICY "anon_update_m15_cases" ON m15_cases FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m15_cases" ON m15_cases;
CREATE POLICY "anon_delete_m15_cases" ON m15_cases FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m15_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m15_cases(id) ON DELETE CASCADE,
  evidence_type text NOT NULL,
  evidence_hash text NOT NULL,
  collection_date date NOT NULL,
  collected_by text,
  chain_of_custody text,
  is_airgapped boolean DEFAULT true,
  zk_audit_verified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m15_evidence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m15_evidence" ON m15_evidence;
CREATE POLICY "anon_select_m15_evidence" ON m15_evidence FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m15_evidence" ON m15_evidence;
CREATE POLICY "anon_insert_m15_evidence" ON m15_evidence FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m15_evidence" ON m15_evidence;
CREATE POLICY "anon_update_m15_evidence" ON m15_evidence FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m15_evidence" ON m15_evidence;
CREATE POLICY "anon_delete_m15_evidence" ON m15_evidence FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m15_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m15_cases(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m15_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m15_audit" ON m15_audit_logs;
CREATE POLICY "anon_select_m15_audit" ON m15_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m15_audit" ON m15_audit_logs;
CREATE POLICY "anon_insert_m15_audit" ON m15_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m15_audit" ON m15_audit_logs;
CREATE POLICY "anon_update_m15_audit" ON m15_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m15_audit" ON m15_audit_logs;
CREATE POLICY "anon_delete_m15_audit" ON m15_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m15_cases_number ON m15_cases(case_number);
CREATE INDEX IF NOT EXISTS idx_m15_cases_stage ON m15_cases(stage);
CREATE INDEX IF NOT EXISTS idx_m15_evidence_case ON m15_evidence(case_id);
CREATE INDEX IF NOT EXISTS idx_m15_audit_case ON m15_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m15_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m15_cases_touch ON m15_cases;
CREATE TRIGGER trg_m15_cases_touch BEFORE UPDATE ON m15_cases
  FOR EACH ROW EXECUTE FUNCTION m15_touch_updated_at();

-- ═══════════════════════════════════════════════
-- M16 — Digital Transaction & E-Signature Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m16_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_number text NOT NULL UNIQUE,
  document_title text NOT NULL,
  document_type text DEFAULT 'contract',
  stage text DEFAULT 'draft',
  status text DEFAULT 'pending',
  document_hash text,
  signed_at timestamptz,
  signer_name text,
  signer_biometric_id text,
  co_signer_name text,
  co_signer_biometric_id text,
  biometric_liveness_check boolean DEFAULT false,
  is_biometric_signed boolean DEFAULT false,
  m109_biometric_verified boolean DEFAULT false,
  m49_board_meeting_id text,
  m105_arbitration_id text,
  m52_notification_sent boolean DEFAULT false,
  m10_case_linked boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m16_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m16_documents" ON m16_documents;
CREATE POLICY "anon_select_m16_documents" ON m16_documents FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m16_documents" ON m16_documents;
CREATE POLICY "anon_insert_m16_documents" ON m16_documents FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m16_documents" ON m16_documents;
CREATE POLICY "anon_update_m16_documents" ON m16_documents FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m16_documents" ON m16_documents;
CREATE POLICY "anon_delete_m16_documents" ON m16_documents FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m16_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES m16_documents(id) ON DELETE CASCADE,
  signer_name text NOT NULL,
  signer_role text,
  signature_hash text NOT NULL,
  signed_at timestamptz DEFAULT now(),
  biometric_type text,
  biometric_verified boolean DEFAULT false,
  ip_address text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m16_signatures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m16_signatures" ON m16_signatures;
CREATE POLICY "anon_select_m16_signatures" ON m16_signatures FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m16_signatures" ON m16_signatures;
CREATE POLICY "anon_insert_m16_signatures" ON m16_signatures FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m16_signatures" ON m16_signatures;
CREATE POLICY "anon_update_m16_signatures" ON m16_signatures FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m16_signatures" ON m16_signatures;
CREATE POLICY "anon_delete_m16_signatures" ON m16_signatures FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m16_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m16_documents(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m16_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m16_audit" ON m16_audit_logs;
CREATE POLICY "anon_select_m16_audit" ON m16_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m16_audit" ON m16_audit_logs;
CREATE POLICY "anon_insert_m16_audit" ON m16_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m16_audit" ON m16_audit_logs;
CREATE POLICY "anon_update_m16_audit" ON m16_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m16_audit" ON m16_audit_logs;
CREATE POLICY "anon_delete_m16_audit" ON m16_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m16_documents_number ON m16_documents(document_number);
CREATE INDEX IF NOT EXISTS idx_m16_documents_stage ON m16_documents(stage);
CREATE INDEX IF NOT EXISTS idx_m16_signatures_document ON m16_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_m16_audit_case ON m16_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m16_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m16_documents_touch ON m16_documents;
CREATE TRIGGER trg_m16_documents_touch BEFORE UPDATE ON m16_documents
  FOR EACH ROW EXECUTE FUNCTION m16_touch_updated_at();

-- ═══════════════════════════════════════════════
-- M17 — Digital Publishing & Multimedia Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m17_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_number text NOT NULL UNIQUE,
  content_title text NOT NULL,
  content_type text DEFAULT 'article',
  stage text DEFAULT 'ingestion',
  status text DEFAULT 'draft',
  media_format text DEFAULT 'text',
  author_name text NOT NULL,
  publisher text,
  publication_date date,
  content_hash text,
  drm_protected boolean DEFAULT false,
  metadata_extracted boolean DEFAULT false,
  retention_policy text DEFAULT 'standard',
  financial_value numeric(14,2) DEFAULT 0,
  filing_fees numeric(14,2) DEFAULT 0,
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m81_media_production_linked boolean DEFAULT false,
  m74_press_compliance_checked boolean DEFAULT false,
  m54_finance_linked boolean DEFAULT false,
  m53_archived boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m17_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m17_content" ON m17_content;
CREATE POLICY "anon_select_m17_content" ON m17_content FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m17_content" ON m17_content;
CREATE POLICY "anon_insert_m17_content" ON m17_content FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m17_content" ON m17_content;
CREATE POLICY "anon_update_m17_content" ON m17_content FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m17_content" ON m17_content;
CREATE POLICY "anon_delete_m17_content" ON m17_content FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m17_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid REFERENCES m17_content(id) ON DELETE CASCADE,
  licensee text NOT NULL,
  license_type text,
  license_scope text,
  royalty_rate numeric(5,2) DEFAULT 0,
  start_date date,
  end_date date,
  is_exclusive boolean DEFAULT false,
  m54_finance_linked boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m17_licenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m17_licenses" ON m17_licenses;
CREATE POLICY "anon_select_m17_licenses" ON m17_licenses FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m17_licenses" ON m17_licenses;
CREATE POLICY "anon_insert_m17_licenses" ON m17_licenses FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m17_licenses" ON m17_licenses;
CREATE POLICY "anon_update_m17_licenses" ON m17_licenses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m17_licenses" ON m17_licenses;
CREATE POLICY "anon_delete_m17_licenses" ON m17_licenses FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m17_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m17_content(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m17_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m17_audit" ON m17_audit_logs;
CREATE POLICY "anon_select_m17_audit" ON m17_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m17_audit" ON m17_audit_logs;
CREATE POLICY "anon_insert_m17_audit" ON m17_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m17_audit" ON m17_audit_logs;
CREATE POLICY "anon_update_m17_audit" ON m17_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m17_audit" ON m17_audit_logs;
CREATE POLICY "anon_delete_m17_audit" ON m17_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m17_content_number ON m17_content(content_number);
CREATE INDEX IF NOT EXISTS idx_m17_content_stage ON m17_content(stage);
CREATE INDEX IF NOT EXISTS idx_m17_licenses_content ON m17_licenses(content_id);
CREATE INDEX IF NOT EXISTS idx_m17_audit_case ON m17_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m17_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m17_content_touch ON m17_content;
CREATE TRIGGER trg_m17_content_touch BEFORE UPDATE ON m17_content
  FOR EACH ROW EXECUTE FUNCTION m17_touch_updated_at();

-- ═══════════════════════════════════════════════
-- Seed Data
-- ═══════════════════════════════════════════════

INSERT INTO m12_patents (patent_number, patent_title, patent_type, stage, status, inventors, assignee, international_class, description, financial_value, filing_fees)
VALUES ('PAT-2026-001', 'نظام تشفير سيادي موزع للوثائق القانونية', 'utility', 'filed', 'active', '["د. أحمد منصور"]'::jsonb, 'المؤسسة السيادية', 'G06F-21/60', 'براءة اختراع لنظام تشفير AES-256 موزع', 250000, 15000)
ON CONFLICT DO NOTHING;

INSERT INTO m12_prior_art (patent_id, reference_number, title, source, similarity_score, relevance)
SELECT id, 'US-2019-01423', 'Distributed Encryption for Legal Documents', 'USPTO', 0.35, 'low'
FROM m12_patents WHERE patent_number='PAT-2026-001' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO m12_audit_logs (case_id, action, actor, detail, hash_chain)
SELECT id, 'براءة اختراع مسجلة', 'النظام', 'تم تسجيل براءة الاختراع PAT-2026-001', '0x7a3f9c2e'
FROM m12_patents WHERE patent_number='PAT-2026-001' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO m13_copyrights (registration_number, work_title, work_type, stage, status, author_name, deposit_hash, drm_protected, description, financial_value, filing_fees)
VALUES ('CR-2026-001', 'منظومة الإدارة القانونية السيادية - الكود المصدري', 'software', 'registered', 'active', 'فريق التطوير السيادي', '0x9f2a3b7c', true, 'توثيق الكود المصدري للمنظومة كأصل رقمي محمي', 500000, 8000)
ON CONFLICT DO NOTHING;

INSERT INTO m13_audit_logs (case_id, action, actor, detail, hash_chain)
SELECT id, 'حقوق المؤلف مسجلة', 'النظام', 'تم تسجيل حقوق المؤلف CR-2026-001', '0x4e8d1a5f'
FROM m13_copyrights WHERE registration_number='CR-2026-001' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO m14_threats (incident_number, incident_title, threat_type, severity, stage, status, source_ip, target_system, attack_vector, description, financial_impact)
VALUES ('SEC-2026-001', 'محاولة اختراق قاعدة بيانات العقود', 'intrusion', 'high', 'contained', 'resolved', '198.51.100.45', 'خادم العقود السيادي', 'SQL Injection', 'تم رصد محاولة حقن SQL وتم احتواؤها', 50000)
ON CONFLICT DO NOTHING;

INSERT INTO m14_anomalies (threat_id, anomaly_type, description, velocity_flag, off_hours_flag, risk_score, auto_alerted)
SELECT id, 'velocity', 'استعلامات ضخمة في وقت قياسي', true, true, 85.50, true
FROM m14_threats WHERE incident_number='SEC-2026-001' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO m15_cases (case_number, case_title, case_category, stage, status, crime_type, victim_entity, damage_estimate, recovery_amount, description)
VALUES ('CYB-2026-001', 'قضية اختراق خوادم المؤسسة', 'hacking', 'investigation', 'active', 'unauthorized_access', 'المؤسسة السيادية', 120000, 0, 'التحقيق في محاولة اختراق البنية التحتية')
ON CONFLICT DO NOTHING;

INSERT INTO m15_evidence (case_id, evidence_type, evidence_hash, collection_date, collected_by, chain_of_custody, description)
SELECT id, 'log_file', '0x6b1c8d3f', '2026-08-01', 'ضابط الأمن السيبراني', 'تجميع ثم تحليل ثم أرشفة', 'سجلات الخادم المصاب'
FROM m15_cases WHERE case_number='CYB-2026-001' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO m16_documents (document_number, document_title, document_type, stage, status, document_hash, signer_name, is_biometric_signed, description)
VALUES ('SIG-2026-001', 'عقد توريد الأنظمة السيادية رقم 105', 'contract', 'signed', 'completed', '0x2f8a7e4b', 'المدير التنفيذي', true, 'تم التوقيع البيومتري على عقد التوريد')
ON CONFLICT DO NOTHING;

INSERT INTO m17_content (content_number, content_title, content_type, stage, status, media_format, author_name, content_hash, drm_protected, description, financial_value, filing_fees)
VALUES ('PUB-2026-001', 'التقرير السنوي للابتكارات القانونية', 'article', 'published', 'active', 'pdf', 'فريق البحث والتطوير', '0x1c5e9a3d', true, 'تقرير رقمي محمي بحقوق النشر', 35000, 2000)
ON CONFLICT DO NOTHING;
