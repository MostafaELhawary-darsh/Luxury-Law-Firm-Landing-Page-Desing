-- M76 — Corporate Legal Departments & In-House Counsel Operations Core
CREATE TABLE IF NOT EXISTS m76_inhouse_legal_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text NOT NULL DEFAULT 'contract_review',
  stage text NOT NULL DEFAULT 'draft',
  status text NOT NULL DEFAULT 'active',
  company_name text,
  contract_value numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  external_firm text,
  external_firm_fees numeric NOT NULL DEFAULT 0,
  risk_level text,
  legal_opinion_ref text,
  investigation_status text,
  clm_stage text,
  description text,
  advisor_id uuid,
  m53_document_id text,
  m54_finance_linked boolean NOT NULL DEFAULT false,
  m10_case_opened boolean NOT NULL DEFAULT false,
  m77_hr_linked boolean NOT NULL DEFAULT false,
  m109_biometric_signed boolean NOT NULL DEFAULT false,
  m92_notified boolean NOT NULL DEFAULT false,
  cost_center_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m76_inhouse_legal_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_m76" ON m76_inhouse_legal_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m76" ON m76_inhouse_legal_files FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m76" ON m76_inhouse_legal_files FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m76" ON m76_inhouse_legal_files FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS m76_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m76_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_m76_audit" ON m76_audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m76_audit" ON m76_audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m76_audit" ON m76_audit_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m76_audit" ON m76_audit_logs FOR DELETE TO authenticated USING (true);

-- M77 — Human Resources & Personnel Management Core
CREATE TABLE IF NOT EXISTS m77_hr_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text NOT NULL DEFAULT 'employment',
  stage text NOT NULL DEFAULT 'draft',
  status text NOT NULL DEFAULT 'active',
  employee_name text,
  employee_id_number text,
  department text,
  position text,
  hire_date date,
  termination_date date,
  base_salary numeric NOT NULL DEFAULT 0,
  allowances numeric NOT NULL DEFAULT 0,
  deductions numeric NOT NULL DEFAULT 0,
  net_salary numeric NOT NULL DEFAULT 0,
  leave_balance numeric NOT NULL DEFAULT 0,
  performance_rating text,
  disciplinary_action text,
  description text,
  advisor_id uuid,
  m53_document_id text,
  m54_finance_linked boolean NOT NULL DEFAULT false,
  m72_insurance_linked boolean NOT NULL DEFAULT false,
  m76_legal_linked boolean NOT NULL DEFAULT false,
  m109_biometric_signed boolean NOT NULL DEFAULT false,
  m92_notified boolean NOT NULL DEFAULT false,
  cost_center_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m77_hr_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_m77" ON m77_hr_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m77" ON m77_hr_files FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m77" ON m77_hr_files FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m77" ON m77_hr_files FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS m77_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m77_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_m77_audit" ON m77_audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m77_audit" ON m77_audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m77_audit" ON m77_audit_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m77_audit" ON m77_audit_logs FOR DELETE TO authenticated USING (true);

-- M78 — Compound & HOA Management Engine
CREATE TABLE IF NOT EXISTS m78_compound_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text NOT NULL DEFAULT 'maintenance',
  stage text NOT NULL DEFAULT 'draft',
  status text NOT NULL DEFAULT 'active',
  compound_name text,
  unit_number text,
  owner_name text,
  tenant_name text,
  maintenance_fund numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  violation_type text,
  penalty_amount numeric NOT NULL DEFAULT 0,
  meeting_ref text,
  bylaws_ref text,
  description text,
  advisor_id uuid,
  m53_document_id text,
  m54_finance_linked boolean NOT NULL DEFAULT false,
  m10_case_opened boolean NOT NULL DEFAULT false,
  m77_hr_linked boolean NOT NULL DEFAULT false,
  m109_biometric_signed boolean NOT NULL DEFAULT false,
  m92_notified boolean NOT NULL DEFAULT false,
  cost_center_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m78_compound_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_m78" ON m78_compound_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m78" ON m78_compound_files FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m78" ON m78_compound_files FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m78" ON m78_compound_files FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS m78_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m78_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_m78_audit" ON m78_audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m78_audit" ON m78_audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m78_audit" ON m78_audit_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m78_audit" ON m78_audit_logs FOR DELETE TO authenticated USING (true);

-- M79 — Sports Clubs & Federations Engine
CREATE TABLE IF NOT EXISTS m79_sports_club_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text NOT NULL DEFAULT 'player_contract',
  stage text NOT NULL DEFAULT 'draft',
  status text NOT NULL DEFAULT 'active',
  club_name text,
  federation_name text,
  sport_category text,
  contract_value numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  sponsorship_included boolean NOT NULL DEFAULT false,
  broadcasting_rights boolean NOT NULL DEFAULT false,
  election_ref text,
  license_type text,
  dispute_status text,
  cgsac_ref text,
  cas_ref text,
  description text,
  advisor_id uuid,
  m53_document_id text,
  m54_finance_linked boolean NOT NULL DEFAULT false,
  m10_case_opened boolean NOT NULL DEFAULT false,
  m77_hr_linked boolean NOT NULL DEFAULT false,
  m109_biometric_signed boolean NOT NULL DEFAULT false,
  m92_notified boolean NOT NULL DEFAULT false,
  cost_center_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m79_sports_club_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_m79" ON m79_sports_club_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m79" ON m79_sports_club_files FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m79" ON m79_sports_club_files FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m79" ON m79_sports_club_files FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS m79_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m79_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_m79_audit" ON m79_audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m79_audit" ON m79_audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m79_audit" ON m79_audit_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m79_audit" ON m79_audit_logs FOR DELETE TO authenticated USING (true);

-- M80 — Maternity, Childhood & Family Welfare Core
CREATE TABLE IF NOT EXISTS m80_family_welfare_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text NOT NULL DEFAULT 'custody',
  stage text NOT NULL DEFAULT 'draft',
  status text NOT NULL DEFAULT 'active',
  case_party text,
  child_name text,
  custody_status text,
  visitation_rights boolean NOT NULL DEFAULT false,
  alimony_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  welfare_type text,
  care_home_license text,
  emergency_report boolean NOT NULL DEFAULT false,
  social_worker_ref text,
  description text,
  advisor_id uuid,
  m53_document_id text,
  m54_finance_linked boolean NOT NULL DEFAULT false,
  m05_family_court_linked boolean NOT NULL DEFAULT false,
  m10_case_opened boolean NOT NULL DEFAULT false,
  m77_hr_linked boolean NOT NULL DEFAULT false,
  m109_biometric_signed boolean NOT NULL DEFAULT false,
  m92_notified boolean NOT NULL DEFAULT false,
  cost_center_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m80_family_welfare_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_m80" ON m80_family_welfare_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m80" ON m80_family_welfare_files FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m80" ON m80_family_welfare_files FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m80" ON m80_family_welfare_files FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS m80_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m80_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_m80_audit" ON m80_audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m80_audit" ON m80_audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m80_audit" ON m80_audit_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m80_audit" ON m80_audit_logs FOR DELETE TO authenticated USING (true);

-- M81 — Media Production & Audiovisual Works Engine
CREATE TABLE IF NOT EXISTS m81_media_production_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text NOT NULL DEFAULT 'production_contract',
  stage text NOT NULL DEFAULT 'draft',
  status text NOT NULL DEFAULT 'active',
  work_title text,
  production_company text,
  work_type text,
  budget_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  royalty_percentage numeric NOT NULL DEFAULT 0,
  distribution_platform text,
  drm_protected boolean NOT NULL DEFAULT false,
  copyright_ref text,
  censorship_license text,
  dispute_status text,
  description text,
  advisor_id uuid,
  m53_document_id text,
  m54_finance_linked boolean NOT NULL DEFAULT false,
  m10_case_opened boolean NOT NULL DEFAULT false,
  m80_ip_linked boolean NOT NULL DEFAULT false,
  m109_biometric_signed boolean NOT NULL DEFAULT false,
  m92_notified boolean NOT NULL DEFAULT false,
  cost_center_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m81_media_production_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_m81" ON m81_media_production_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m81" ON m81_media_production_files FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m81" ON m81_media_production_files FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m81" ON m81_media_production_files FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS m81_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m81_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_m81_audit" ON m81_audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m81_audit" ON m81_audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m81_audit" ON m81_audit_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m81_audit" ON m81_audit_logs FOR DELETE TO authenticated USING (true);