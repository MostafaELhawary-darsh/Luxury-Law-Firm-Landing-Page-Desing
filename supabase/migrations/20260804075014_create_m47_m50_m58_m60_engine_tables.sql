-- M47 HSE Internal tables
CREATE TABLE IF NOT EXISTS m47_hse_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number text NOT NULL UNIQUE,
  incident_type text NOT NULL DEFAULT 'accident',
  incident_date date NOT NULL,
  location text,
  severity text NOT NULL DEFAULT 'minor',
  description text,
  injured_person text,
  first_aid_given boolean DEFAULT false,
  medical_report text,
  insurance_claim_filed boolean DEFAULT false,
  status text NOT NULL DEFAULT 'reported',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS m47_hse_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_number text NOT NULL UNIQUE,
  inspection_type text NOT NULL DEFAULT 'routine',
  inspector_name text,
  inspection_date date,
  area_inspected text,
  findings text,
  violations_found text,
  corrective_actions text,
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS m47_hse_training (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_title text NOT NULL,
  training_type text NOT NULL DEFAULT 'safety',
  trainer text,
  trainee_count int DEFAULT 0,
  training_date date,
  duration_hours numeric DEFAULT 0,
  certification_issued boolean DEFAULT false,
  expiry_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS m47_hse_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_title text NOT NULL,
  report_type text NOT NULL DEFAULT 'monthly',
  period_start date,
  period_end date,
  summary text,
  recommendations text,
  submitted_to text,
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE m47_hse_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE m47_hse_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE m47_hse_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE m47_hse_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_m47_inc" ON m47_hse_incidents FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m47_inc" ON m47_hse_incidents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m47_inc" ON m47_hse_incidents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m47_inc" ON m47_hse_incidents FOR DELETE TO authenticated USING (true);

CREATE POLICY "select_own_m47_ins" ON m47_hse_inspections FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m47_ins" ON m47_hse_inspections FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m47_ins" ON m47_hse_inspections FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m47_ins" ON m47_hse_inspections FOR DELETE TO authenticated USING (true);

CREATE POLICY "select_own_m47_tr" ON m47_hse_training FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m47_tr" ON m47_hse_training FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m47_tr" ON m47_hse_training FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m47_tr" ON m47_hse_training FOR DELETE TO authenticated USING (true);

CREATE POLICY "select_own_m47_rep" ON m47_hse_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m47_rep" ON m47_hse_reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m47_rep" ON m47_hse_reports FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m47_rep" ON m47_hse_reports FOR DELETE TO authenticated USING (true);

-- M50 Quality Assurance tables
CREATE TABLE IF NOT EXISTS m50_qa_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_title text NOT NULL,
  evaluatee_name text NOT NULL,
  evaluatee_type text NOT NULL DEFAULT 'lawyer',
  evaluation_period text,
  kpi_score numeric DEFAULT 0,
  productivity_score numeric DEFAULT 0,
  quality_score numeric DEFAULT 0,
  timeliness_score numeric DEFAULT 0,
  overall_rating text,
  notes text,
  evaluated_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS m50_qa_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_category text NOT NULL DEFAULT 'productivity',
  target_value numeric,
  actual_value numeric,
  unit text,
  measurement_period text,
  status text NOT NULL DEFAULT 'on_track',
  trend text DEFAULT 'stable',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS m50_qa_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_title text NOT NULL,
  review_type text NOT NULL DEFAULT 'performance',
  reviewed_entity text,
  reviewer text,
  review_date date,
  findings text,
  recommendations text,
  action_items text,
  follow_up_date date,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS m50_qa_improvements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  improvement_title text NOT NULL,
  area text,
  current_state text,
  target_state text,
  action_plan text,
  responsible_person text,
  priority text NOT NULL DEFAULT 'medium',
  progress numeric DEFAULT 0,
  target_date date,
  status text NOT NULL DEFAULT 'planned',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE m50_qa_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE m50_qa_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE m50_qa_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE m50_qa_improvements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_m50_eval" ON m50_qa_evaluations FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m50_eval" ON m50_qa_evaluations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m50_eval" ON m50_qa_evaluations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m50_eval" ON m50_qa_evaluations FOR DELETE TO authenticated USING (true);

CREATE POLICY "select_own_m50_met" ON m50_qa_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m50_met" ON m50_qa_metrics FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m50_met" ON m50_qa_metrics FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m50_met" ON m50_qa_metrics FOR DELETE TO authenticated USING (true);

CREATE POLICY "select_own_m50_rev" ON m50_qa_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m50_rev" ON m50_qa_reviews FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m50_rev" ON m50_qa_reviews FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m50_rev" ON m50_qa_reviews FOR DELETE TO authenticated USING (true);

CREATE POLICY "select_own_m50_imp" ON m50_qa_improvements FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m50_imp" ON m50_qa_improvements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m50_imp" ON m50_qa_improvements FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m50_imp" ON m50_qa_improvements FOR DELETE TO authenticated USING (true);

-- M58 Free Professions tables
CREATE TABLE IF NOT EXISTS m58_free_professionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  profession_type text NOT NULL DEFAULT 'consultant',
  license_number text,
  national_id text,
  phone text,
  email text,
  address text,
  tax_id text,
  active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS m58_professional_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid REFERENCES m58_free_professionals(id) ON DELETE CASCADE,
  license_type text NOT NULL DEFAULT 'practice',
  license_number text NOT NULL,
  issuing_authority text,
  issue_date date,
  expiry_date date,
  renewal_required boolean DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  conditions text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS m58_professional_tax_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid REFERENCES m58_free_professionals(id) ON DELETE CASCADE,
  tax_year int,
  tax_type text NOT NULL DEFAULT 'income',
  filing_number text,
  filing_date date,
  declared_amount numeric DEFAULT 0,
  assessed_amount numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'filed',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS m58_professional_engagements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid REFERENCES m58_free_professionals(id) ON DELETE CASCADE,
  engagement_type text NOT NULL DEFAULT 'consultation',
  counterparty text,
  start_date date,
  end_date date,
  value numeric DEFAULT 0,
  description text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE m58_free_professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE m58_professional_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE m58_professional_tax_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE m58_professional_engagements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_m58_prof" ON m58_free_professionals FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m58_prof" ON m58_free_professionals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m58_prof" ON m58_free_professionals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m58_prof" ON m58_free_professionals FOR DELETE TO authenticated USING (true);

CREATE POLICY "select_own_m58_lic" ON m58_professional_licenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m58_lic" ON m58_professional_licenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m58_lic" ON m58_professional_licenses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m58_lic" ON m58_professional_licenses FOR DELETE TO authenticated USING (true);

CREATE POLICY "select_own_m58_tax" ON m58_professional_tax_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m58_tax" ON m58_professional_tax_files FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m58_tax" ON m58_professional_tax_files FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m58_tax" ON m58_professional_tax_files FOR DELETE TO authenticated USING (true);

CREATE POLICY "select_own_m58_eng" ON m58_professional_engagements FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m58_eng" ON m58_professional_engagements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m58_eng" ON m58_professional_engagements FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m58_eng" ON m58_professional_engagements FOR DELETE TO authenticated USING (true);

-- M60 Corporate Commercial tables
CREATE TABLE IF NOT EXISTS m60_corporate_assemblies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_number text NOT NULL UNIQUE,
  company_name text NOT NULL,
  assembly_type text NOT NULL DEFAULT 'general',
  assembly_date date,
  location text,
  agenda text,
  resolutions_passed text,
  attendance_count int DEFAULT 0,
  voting_results text,
  minutes_file_id text,
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS m60_corporate_alliances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alliance_name text NOT NULL,
  alliance_type text NOT NULL DEFAULT 'joint_venture',
  parties text,
  start_date date,
  end_date date,
  scope text,
  contribution_value numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS m60_share_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  shareholder_name text NOT NULL,
  share_type text NOT NULL DEFAULT 'ordinary',
  share_count int DEFAULT 0,
  percentage numeric DEFAULT 0,
  par_value numeric DEFAULT 0,
  total_value numeric DEFAULT 0,
  transfer_restricted boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS m60_corporate_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number text NOT NULL UNIQUE,
  contract_title text NOT NULL,
  contract_type text NOT NULL DEFAULT 'service',
  party_a text,
  party_b text,
  effective_date date,
  expiry_date date,
  contract_value numeric DEFAULT 0,
  governing_law text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE m60_corporate_assemblies ENABLE ROW LEVEL SECURITY;
ALTER TABLE m60_corporate_alliances ENABLE ROW LEVEL SECURITY;
ALTER TABLE m60_share_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE m60_corporate_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_m60_asm" ON m60_corporate_assemblies FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m60_asm" ON m60_corporate_assemblies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m60_asm" ON m60_corporate_assemblies FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m60_asm" ON m60_corporate_assemblies FOR DELETE TO authenticated USING (true);

CREATE POLICY "select_own_m60_all" ON m60_corporate_alliances FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m60_all" ON m60_corporate_alliances FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m60_all" ON m60_corporate_alliances FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m60_all" ON m60_corporate_alliances FOR DELETE TO authenticated USING (true);

CREATE POLICY "select_own_m60_shr" ON m60_share_distributions FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m60_shr" ON m60_share_distributions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m60_shr" ON m60_share_distributions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m60_shr" ON m60_share_distributions FOR DELETE TO authenticated USING (true);

CREATE POLICY "select_own_m60_con" ON m60_corporate_contracts FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m60_con" ON m60_corporate_contracts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m60_con" ON m60_corporate_contracts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m60_con" ON m60_corporate_contracts FOR DELETE TO authenticated USING (true);