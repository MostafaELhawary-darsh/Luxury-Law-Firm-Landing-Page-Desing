-- M70 — International Organizations & Regional Bodies Governance Core
CREATE TABLE IF NOT EXISTS m70_intl_org_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text NOT NULL DEFAULT 'hq_agreement',
  stage text NOT NULL DEFAULT 'draft',
  status text NOT NULL DEFAULT 'active',
  organization_name text,
  organization_type text,
  hq_agreement_ref text,
  immunity_scope text,
  host_country text,
  fund_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  undt_case_ref text,
  procurement_ref text,
  ingo_compliance boolean NOT NULL DEFAULT false,
  description text,
  advisor_id uuid,
  m53_document_id text,
  m54_finance_linked boolean NOT NULL DEFAULT false,
  m10_case_opened boolean NOT NULL DEFAULT false,
  m85_tax_linked boolean NOT NULL DEFAULT false,
  m16_esign_linked boolean NOT NULL DEFAULT false,
  m109_biometric_signed boolean NOT NULL DEFAULT false,
  m92_notified boolean NOT NULL DEFAULT false,
  cost_center_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m70_intl_org_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_m70" ON m70_intl_org_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m70" ON m70_intl_org_files FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m70" ON m70_intl_org_files FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m70" ON m70_intl_org_files FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS m70_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m70_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_m70_audit" ON m70_audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m70_audit" ON m70_audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m70_audit" ON m70_audit_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m70_audit" ON m70_audit_logs FOR DELETE TO authenticated USING (true);

-- M71 — NGOs & Civil Society Governance Core
CREATE TABLE IF NOT EXISTS m71_ngo_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text NOT NULL DEFAULT 'founding',
  stage text NOT NULL DEFAULT 'draft',
  status text NOT NULL DEFAULT 'active',
  organization_name text,
  registration_number text,
  founding_ref text,
  donor_name text,
  funding_source text,
  fund_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  kyc_verified boolean NOT NULL DEFAULT false,
  inspection_status text,
  license_type text,
  description text,
  advisor_id uuid,
  m53_document_id text,
  m54_finance_linked boolean NOT NULL DEFAULT false,
  m10_case_opened boolean NOT NULL DEFAULT false,
  m109_biometric_signed boolean NOT NULL DEFAULT false,
  m92_notified boolean NOT NULL DEFAULT false,
  cost_center_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m71_ngo_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_m71" ON m71_ngo_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m71" ON m71_ngo_files FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m71" ON m71_ngo_files FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m71" ON m71_ngo_files FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS m71_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m71_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_m71_audit" ON m71_audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m71_audit" ON m71_audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m71_audit" ON m71_audit_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m71_audit" ON m71_audit_logs FOR DELETE TO authenticated USING (true);

-- M72 — Social Insurance & Economic Security Core
CREATE TABLE IF NOT EXISTS m72_insurance_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text NOT NULL DEFAULT 'subscription',
  stage text NOT NULL DEFAULT 'draft',
  status text NOT NULL DEFAULT 'active',
  employer_name text,
  employee_name text,
  subscription_number text,
  insurance_type text,
  base_wage numeric NOT NULL DEFAULT 0,
  variable_wage numeric NOT NULL DEFAULT 0,
  contribution_amount numeric NOT NULL DEFAULT 0,
  pension_type text,
  injury_status text,
  settlement_ref text,
  description text,
  advisor_id uuid,
  m53_document_id text,
  m54_finance_linked boolean NOT NULL DEFAULT false,
  m10_case_opened boolean NOT NULL DEFAULT false,
  m65_medical_linked boolean NOT NULL DEFAULT false,
  m77_hr_linked boolean NOT NULL DEFAULT false,
  m109_biometric_signed boolean NOT NULL DEFAULT false,
  m92_notified boolean NOT NULL DEFAULT false,
  cost_center_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m72_insurance_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_m72" ON m72_insurance_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m72" ON m72_insurance_files FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m72" ON m72_insurance_files FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m72" ON m72_insurance_files FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS m72_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m72_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_m72_audit" ON m72_audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m72_audit" ON m72_audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m72_audit" ON m72_audit_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m72_audit" ON m72_audit_logs FOR DELETE TO authenticated USING (true);

-- M73 — Employment Contracts & Labor Relations Core
CREATE TABLE IF NOT EXISTS m73_labor_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text NOT NULL DEFAULT 'employment_contract',
  stage text NOT NULL DEFAULT 'draft',
  status text NOT NULL DEFAULT 'active',
  employer_name text,
  employee_name text,
  contract_type text,
  contract_start date,
  contract_end date,
  monthly_wage numeric NOT NULL DEFAULT 0,
  end_of_service_amount numeric NOT NULL DEFAULT 0,
  collective_agreement_ref text,
  settlement_ref text,
  dispute_status text,
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
ALTER TABLE m73_labor_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_m73" ON m73_labor_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m73" ON m73_labor_files FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m73" ON m73_labor_files FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m73" ON m73_labor_files FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS m73_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m73_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_m73_audit" ON m73_audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m73_audit" ON m73_audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m73_audit" ON m73_audit_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m73_audit" ON m73_audit_logs FOR DELETE TO authenticated USING (true);

-- M74 — Press & Media Institutions Governance Core
CREATE TABLE IF NOT EXISTS m74_media_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text NOT NULL DEFAULT 'licensing',
  stage text NOT NULL DEFAULT 'draft',
  status text NOT NULL DEFAULT 'active',
  media_outlet_name text,
  license_number text,
  license_type text,
  platform_type text,
  drm_protected boolean NOT NULL DEFAULT false,
  copyright_ref text,
  dispute_status text,
  regulatory_body text,
  description text,
  advisor_id uuid,
  m53_document_id text,
  m54_finance_linked boolean NOT NULL DEFAULT false,
  m10_case_opened boolean NOT NULL DEFAULT false,
  m77_hr_linked boolean NOT NULL DEFAULT false,
  m80_ip_linked boolean NOT NULL DEFAULT false,
  m109_biometric_signed boolean NOT NULL DEFAULT false,
  m92_notified boolean NOT NULL DEFAULT false,
  cost_center_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m74_media_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_m74" ON m74_media_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m74" ON m74_media_files FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m74" ON m74_media_files FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m74" ON m74_media_files FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS m74_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m74_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_m74_audit" ON m74_audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m74_audit" ON m74_audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m74_audit" ON m74_audit_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m74_audit" ON m74_audit_logs FOR DELETE TO authenticated USING (true);

-- M75 — Banks & Financial Institutions Governance Core
CREATE TABLE IF NOT EXISTS m75_banking_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text NOT NULL DEFAULT 'credit_facility',
  stage text NOT NULL DEFAULT 'draft',
  status text NOT NULL DEFAULT 'active',
  bank_name text,
  branch_name text,
  license_number text,
  kyc_verified boolean NOT NULL DEFAULT false,
  aml_status text,
  credit_facility_type text,
  facility_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  guarantee_type text,
  ucp_ref text,
  basel_compliant boolean NOT NULL DEFAULT false,
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
ALTER TABLE m75_banking_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_m75" ON m75_banking_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m75" ON m75_banking_files FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m75" ON m75_banking_files FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m75" ON m75_banking_files FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS m75_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m75_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_m75_audit" ON m75_audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_m75_audit" ON m75_audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_m75_audit" ON m75_audit_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_m75_audit" ON m75_audit_logs FOR DELETE TO authenticated USING (true);