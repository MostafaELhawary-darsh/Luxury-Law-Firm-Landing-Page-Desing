-- M03: Criminal Law Engine tables
CREATE TABLE IF NOT EXISTS m03_criminal_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text NOT NULL UNIQUE,
  case_title text NOT NULL,
  crime_type text NOT NULL DEFAULT 'felony',
  stage text NOT NULL DEFAULT 'investigation',
  court text,
  filing_date date,
  assigned_advisor_id uuid,
  description text,
  m10_linked boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  m52_notified boolean DEFAULT false,
  cost_center_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS m03_investigations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m03_criminal_cases(id) ON DELETE CASCADE,
  investigation_type text NOT NULL DEFAULT 'interrogation',
  investigator_name text,
  investigation_date date,
  location text,
  findings text,
  confidentiality_level text NOT NULL DEFAULT 'confidential',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS m03_evidence_chain (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m03_criminal_cases(id) ON DELETE CASCADE,
  evidence_type text NOT NULL DEFAULT 'physical',
  evidence_title text NOT NULL,
  collected_from text,
  collection_date date,
  chain_of_custody text,
  hash_fingerprint text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS m03_criminal_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m03_criminal_cases(id) ON DELETE CASCADE,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  accessed_fields text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m03_criminal_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE m03_investigations ENABLE ROW LEVEL SECURITY;
ALTER TABLE m03_evidence_chain ENABLE ROW LEVEL SECURITY;
ALTER TABLE m03_criminal_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_m03_cases" ON m03_criminal_cases FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m03_cases" ON m03_criminal_cases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m03_cases" ON m03_criminal_cases FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m03_cases" ON m03_criminal_cases FOR DELETE TO authenticated USING (true);

CREATE POLICY "select_own_m03_inv" ON m03_investigations FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m03_inv" ON m03_investigations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m03_inv" ON m03_investigations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m03_inv" ON m03_investigations FOR DELETE TO authenticated USING (true);

CREATE POLICY "select_own_m03_evi" ON m03_evidence_chain FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m03_evi" ON m03_evidence_chain FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m03_evi" ON m03_evidence_chain FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m03_evi" ON m03_evidence_chain FOR DELETE TO authenticated USING (true);

CREATE POLICY "select_own_m03_audit" ON m03_criminal_audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m03_audit" ON m03_criminal_audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m03_audit" ON m03_criminal_audit_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m03_audit" ON m03_criminal_audit_logs FOR DELETE TO authenticated USING (true);

-- M09 MOJ Integration tables
CREATE TABLE IF NOT EXISTS m09_moj_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_number text NOT NULL UNIQUE,
  submission_type text NOT NULL DEFAULT 'case_filing',
  target_court text,
  case_reference text,
  payload_summary text,
  status text NOT NULL DEFAULT 'pending',
  submitted_at timestamptz,
  moj_reference text,
  response_summary text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS m09_moj_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES m09_moj_submissions(id) ON DELETE CASCADE,
  response_type text NOT NULL,
  response_data jsonb,
  received_at timestamptz DEFAULT now(),
  processed boolean DEFAULT false,
  notes text
);

CREATE TABLE IF NOT EXISTS m09_moj_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type text NOT NULL,
  direction text NOT NULL DEFAULT 'outbound',
  endpoint text,
  status text NOT NULL DEFAULT 'pending',
  records_affected int DEFAULT 0,
  error_message text,
  synced_at timestamptz DEFAULT now()
);

ALTER TABLE m09_moj_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE m09_moj_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE m09_moj_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_m09_sub" ON m09_moj_submissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m09_sub" ON m09_moj_submissions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m09_sub" ON m09_moj_submissions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m09_sub" ON m09_moj_submissions FOR DELETE TO authenticated USING (true);

CREATE POLICY "select_own_m09_res" ON m09_moj_responses FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m09_res" ON m09_moj_responses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m09_res" ON m09_moj_responses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m09_res" ON m09_moj_responses FOR DELETE TO authenticated USING (true);

CREATE POLICY "select_own_m09_sync" ON m09_moj_sync_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m09_sync" ON m09_moj_sync_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m09_sync" ON m09_moj_sync_log FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m09_sync" ON m09_moj_sync_log FOR DELETE TO authenticated USING (true);

-- M44 Corporate Governance tables
CREATE TABLE IF NOT EXISTS m44_governance_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_name text NOT NULL,
  entity_type text NOT NULL DEFAULT 'company',
  parent_structure_id uuid,
  approval_required boolean DEFAULT true,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS m44_governance_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id uuid REFERENCES m44_governance_structures(id) ON DELETE CASCADE,
  role_name text NOT NULL,
  role_level text NOT NULL DEFAULT 'staff',
  permissions text[] DEFAULT '{}',
  can_approve boolean DEFAULT false,
  can_delegate boolean DEFAULT false,
  reports_to text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS m44_governance_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_name text NOT NULL,
  policy_type text NOT NULL DEFAULT 'administrative',
  effective_date date,
  expiry_date date,
  version text DEFAULT '1.0',
  content text,
  approved_by text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS m44_governance_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text,
  entity_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m44_governance_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE m44_governance_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE m44_governance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE m44_governance_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_m44_str" ON m44_governance_structures FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m44_str" ON m44_governance_structures FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m44_str" ON m44_governance_structures FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m44_str" ON m44_governance_structures FOR DELETE TO authenticated USING (true);

CREATE POLICY "select_own_m44_roles" ON m44_governance_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m44_roles" ON m44_governance_roles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m44_roles" ON m44_governance_roles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m44_roles" ON m44_governance_roles FOR DELETE TO authenticated USING (true);

CREATE POLICY "select_own_m44_pol" ON m44_governance_policies FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m44_pol" ON m44_governance_policies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m44_pol" ON m44_governance_policies FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m44_pol" ON m44_governance_policies FOR DELETE TO authenticated USING (true);

CREATE POLICY "select_own_m44_aud" ON m44_governance_audit FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m44_aud" ON m44_governance_audit FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m44_aud" ON m44_governance_audit FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m44_aud" ON m44_governance_audit FOR DELETE TO authenticated USING (true);

-- M45 Crisis Management tables
CREATE TABLE IF NOT EXISTS m45_crisis_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_title text NOT NULL,
  alert_level text NOT NULL DEFAULT 'warning',
  source_engine text,
  trigger_metric text,
  threshold_value numeric,
  current_value numeric,
  affected_entity text,
  status text NOT NULL DEFAULT 'active',
  triggered_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  response_actions text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS m45_crisis_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_title text NOT NULL,
  incident_type text NOT NULL DEFAULT 'operational',
  severity text NOT NULL DEFAULT 'medium',
  detected_at timestamptz DEFAULT now(),
  contained_at timestamptz,
  resolved_at timestamptz,
  root_cause text,
  impact_assessment text,
  resolution_actions text,
  preventive_measures text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS m45_crisis_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_title text NOT NULL,
  assessment_type text NOT NULL DEFAULT 'risk',
  scope text,
  findings text,
  risk_score numeric DEFAULT 0,
  mitigation_plan text,
  assessed_by text,
  next_review_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS m45_crisis_protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_name text NOT NULL,
  crisis_type text NOT NULL,
  trigger_conditions text,
  response_steps text[] DEFAULT '{}',
  escalation_chain text,
  required_resources text,
  estimated_recovery_time text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE m45_crisis_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE m45_crisis_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE m45_crisis_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE m45_crisis_protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_m45_alerts" ON m45_crisis_alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m45_alerts" ON m45_crisis_alerts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m45_alerts" ON m45_crisis_alerts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m45_alerts" ON m45_crisis_alerts FOR DELETE TO authenticated USING (true);

CREATE POLICY "select_own_m45_inc" ON m45_crisis_incidents FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m45_inc" ON m45_crisis_incidents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m45_inc" ON m45_crisis_incidents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m45_inc" ON m45_crisis_incidents FOR DELETE TO authenticated USING (true);

CREATE POLICY "select_own_m45_assess" ON m45_crisis_assessments FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m45_assess" ON m45_crisis_assessments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m45_assess" ON m45_crisis_assessments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m45_assess" ON m45_crisis_assessments FOR DELETE TO authenticated USING (true);

CREATE POLICY "select_own_m45_proto" ON m45_crisis_protocols FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m45_proto" ON m45_crisis_protocols FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m45_proto" ON m45_crisis_protocols FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m45_proto" ON m45_crisis_protocols FOR DELETE TO authenticated USING (true);