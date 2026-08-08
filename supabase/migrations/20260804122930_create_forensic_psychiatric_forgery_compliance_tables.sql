-- M03 Forensic Medicine tables
CREATE TABLE IF NOT EXISTS m03_forensic_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m03_criminal_cases(id) ON DELETE CASCADE,
  report_type text NOT NULL DEFAULT 'autopsy',
  medical_examiner text,
  examination_date date,
  examination_location text,
  findings text,
  cause_of_death text,
  injury_consistency text,
  report_status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- M03 Psychiatric Evaluation tables
CREATE TABLE IF NOT EXISTS m03_psychiatric_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m03_criminal_cases(id) ON DELETE CASCADE,
  evaluator_name text,
  evaluation_date date,
  subject_name text,
  mental_state text NOT NULL DEFAULT 'sane',
  article_62_invoked boolean DEFAULT false,
  behavioral_notes text,
  cognitive_assessment text,
  volition_assessment text,
  recommendation text NOT NULL DEFAULT 'fit_for_trial',
  report_status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- M03 Forgery Examination tables
CREATE TABLE IF NOT EXISTS m03_forgery_examinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m03_criminal_cases(id) ON DELETE CASCADE,
  examiner_name text,
  examination_date date,
  document_type text NOT NULL DEFAULT 'contract',
  questioned_features text[] DEFAULT '{}',
  ink_analysis text,
  pressure_analysis text,
  authenticity_score numeric DEFAULT 1.0,
  finding_summary text,
  recommended_action text NOT NULL DEFAULT 'accept',
  report_status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- M47 Compliance Checks table (for merged Document & Compliance Engine)
CREATE TABLE IF NOT EXISTS m47_compliance_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid,
  check_type text NOT NULL DEFAULT 'legal_compliance',
  check_result text NOT NULL DEFAULT 'compliant',
  risks_found text[] DEFAULT '{}',
  risk_details text,
  checked_by text,
  checked_at timestamptz DEFAULT now(),
  resolution_status text NOT NULL DEFAULT 'pending',
  resolution_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE m03_forensic_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE m03_psychiatric_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE m03_forgery_examinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE m47_compliance_checks ENABLE ROW LEVEL SECURITY;

-- M03 Forensic RLS policies
CREATE POLICY "select_own_m03_forensic" ON m03_forensic_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m03_forensic" ON m03_forensic_reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m03_forensic" ON m03_forensic_reports FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m03_forensic" ON m03_forensic_reports FOR DELETE TO authenticated USING (true);

-- M03 Psychiatric RLS policies
CREATE POLICY "select_own_m03_psych" ON m03_psychiatric_evaluations FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m03_psych" ON m03_psychiatric_evaluations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m03_psych" ON m03_psychiatric_evaluations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m03_psych" ON m03_psychiatric_evaluations FOR DELETE TO authenticated USING (true);

-- M03 Forgery RLS policies
CREATE POLICY "select_own_m03_forgery" ON m03_forgery_examinations FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m03_forgery" ON m03_forgery_examinations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m03_forgery" ON m03_forgery_examinations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m03_forgery" ON m03_forgery_examinations FOR DELETE TO authenticated USING (true);

-- M47 Compliance RLS policies
CREATE POLICY "select_own_m47_compliance" ON m47_compliance_checks FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m47_compliance" ON m47_compliance_checks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m47_compliance" ON m47_compliance_checks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m47_compliance" ON m47_compliance_checks FOR DELETE TO authenticated USING (true);