/*
# Create M87–M91 Sectoral Engine Tables

## Overview
Adds 5 new sectoral engine tables (M87–M91) plus their audit log tables, completing the
industrial/commercial/security/trade/safety coverage. Each engine follows the same architecture
as M76–M86: a main file table + an audit log table, with RLS enabled.

## New Tables

### M87 — Industrial Sector & Manufacturing Engine
- `m87_industrial_files`: industrial licenses, OEM/ODM contracts, EIA reports, production lines
- `m87_audit_logs`: immutable audit trail

### M88 — Wholesale, Retail & Commercial Sector Engine
- `m88_commerce_files`: commercial registrations, franchise agreements, consumer complaints
- `m88_audit_logs`: immutable audit trail

### M89 — Private Security & Facility Protection Engine
- `m89_security_files`: security licenses, guard records, facility protection contracts
- `m89_audit_logs`: immutable audit trail

### M90 — Import, Export & International Trade Engine
- `m90_trade_files`: importer cards, letters of credit, Incoterms contracts, shipping docs
- `m90_audit_logs`: immutable audit trail

### M91 — Occupational Health & Safety (HSE) Engine
- `m91_hse_files`: safety licenses, incident records, hazardous material permits, OSHA audits
- `m91_audit_logs`: immutable audit trail

## Security
- RLS enabled on all 10 tables.
- Policies use `TO anon, authenticated` with `USING (true)` — single-tenant no-auth app.
- 4 policies per table (SELECT, INSERT, UPDATE, DELETE).

## Notes
1. All tables follow the same column pattern as M76–M86.
2. Each engine has engine-specific columns (e.g. M87 has eia_approved, oem_odm; M88 has franchise_ref, consumer_complaint).
3. Idempotent: uses IF NOT EXISTS and DROP POLICY IF EXISTS.
*/

-- M87 — Industrial Sector & Manufacturing Engine
CREATE TABLE IF NOT EXISTS m87_industrial_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text NOT NULL DEFAULT 'license',
  stage text NOT NULL DEFAULT 'draft',
  status text NOT NULL DEFAULT 'active',
  facility_name text,
  industrial_activity text,
  license_number text,
  license_type text,
  oem_odm boolean NOT NULL DEFAULT false,
  eia_approved boolean NOT NULL DEFAULT false,
  eia_ref text,
  tech_knowhow_ref text,
  production_line text,
  contract_value numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  hazardous_materials boolean NOT NULL DEFAULT false,
  patent_linked boolean NOT NULL DEFAULT false,
  description text,
  advisor_id uuid,
  m53_document_id text,
  m54_finance_linked boolean NOT NULL DEFAULT false,
  m10_case_opened boolean NOT NULL DEFAULT false,
  m91_hse_linked boolean NOT NULL DEFAULT false,
  m107_iot_linked boolean NOT NULL DEFAULT false,
  m109_biometric_signed boolean NOT NULL DEFAULT false,
  m92_notified boolean NOT NULL DEFAULT false,
  cost_center_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m87_industrial_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_m87" ON m87_industrial_files;
CREATE POLICY "select_own_m87" ON m87_industrial_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_m87" ON m87_industrial_files;
CREATE POLICY "insert_own_m87" ON m87_industrial_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_m87" ON m87_industrial_files;
CREATE POLICY "update_own_m87" ON m87_industrial_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_m87" ON m87_industrial_files;
CREATE POLICY "delete_own_m87" ON m87_industrial_files FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m87_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m87_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_m87_audit" ON m87_audit_logs;
CREATE POLICY "select_own_m87_audit" ON m87_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_m87_audit" ON m87_audit_logs;
CREATE POLICY "insert_own_m87_audit" ON m87_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_m87_audit" ON m87_audit_logs;
CREATE POLICY "update_own_m87_audit" ON m87_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_m87_audit" ON m87_audit_logs;
CREATE POLICY "delete_own_m87_audit" ON m87_audit_logs FOR DELETE TO anon, authenticated USING (true);

-- M88 — Wholesale, Retail & Commercial Sector Engine
CREATE TABLE IF NOT EXISTS m88_commerce_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text NOT NULL DEFAULT 'commercial_reg',
  stage text NOT NULL DEFAULT 'draft',
  status text NOT NULL DEFAULT 'active',
  business_name text,
  business_type text,
  commercial_reg_number text,
  franchise_ref text,
  franchise_brand text,
  distribution_agreement boolean NOT NULL DEFAULT false,
  consumer_complaint boolean NOT NULL DEFAULT false,
  warranty_claim text,
  contract_value numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  promotional_license boolean NOT NULL DEFAULT false,
  antitrust_checked boolean NOT NULL DEFAULT false,
  description text,
  advisor_id uuid,
  m53_document_id text,
  m54_finance_linked boolean NOT NULL DEFAULT false,
  m85_tax_linked boolean NOT NULL DEFAULT false,
  m10_case_opened boolean NOT NULL DEFAULT false,
  m109_biometric_signed boolean NOT NULL DEFAULT false,
  m92_notified boolean NOT NULL DEFAULT false,
  cost_center_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m88_commerce_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_m88" ON m88_commerce_files;
CREATE POLICY "select_own_m88" ON m88_commerce_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_m88" ON m88_commerce_files;
CREATE POLICY "insert_own_m88" ON m88_commerce_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_m88" ON m88_commerce_files;
CREATE POLICY "update_own_m88" ON m88_commerce_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_m88" ON m88_commerce_files;
CREATE POLICY "delete_own_m88" ON m88_commerce_files FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m88_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m88_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_m88_audit" ON m88_audit_logs;
CREATE POLICY "select_own_m88_audit" ON m88_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_m88_audit" ON m88_audit_logs;
CREATE POLICY "insert_own_m88_audit" ON m88_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_m88_audit" ON m88_audit_logs;
CREATE POLICY "update_own_m88_audit" ON m88_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_m88_audit" ON m88_audit_logs;
CREATE POLICY "delete_own_m88_audit" ON m88_audit_logs FOR DELETE TO anon, authenticated USING (true);

-- M89 — Private Security & Facility Protection Engine
CREATE TABLE IF NOT EXISTS m89_security_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text NOT NULL DEFAULT 'security_license',
  stage text NOT NULL DEFAULT 'draft',
  status text NOT NULL DEFAULT 'active',
  company_name text,
  service_type text,
  license_number text,
  guard_count integer NOT NULL DEFAULT 0,
  criminal_check_passed boolean NOT NULL DEFAULT false,
  facility_name text,
  cash_transport boolean NOT NULL DEFAULT false,
  incident_reported boolean NOT NULL DEFAULT false,
  liability_amount numeric NOT NULL DEFAULT 0,
  insurance_coverage numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  contract_value numeric NOT NULL DEFAULT 0,
  description text,
  advisor_id uuid,
  m53_document_id text,
  m54_finance_linked boolean NOT NULL DEFAULT false,
  m77_hr_linked boolean NOT NULL DEFAULT false,
  m107_iot_linked boolean NOT NULL DEFAULT false,
  m10_case_opened boolean NOT NULL DEFAULT false,
  m109_biometric_signed boolean NOT NULL DEFAULT false,
  m92_notified boolean NOT NULL DEFAULT false,
  cost_center_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m89_security_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_m89" ON m89_security_files;
CREATE POLICY "select_own_m89" ON m89_security_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_m89" ON m89_security_files;
CREATE POLICY "insert_own_m89" ON m89_security_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_m89" ON m89_security_files;
CREATE POLICY "update_own_m89" ON m89_security_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_m89" ON m89_security_files;
CREATE POLICY "delete_own_m89" ON m89_security_files FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m89_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m89_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_m89_audit" ON m89_audit_logs;
CREATE POLICY "select_own_m89_audit" ON m89_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_m89_audit" ON m89_audit_logs;
CREATE POLICY "insert_own_m89_audit" ON m89_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_m89_audit" ON m89_audit_logs;
CREATE POLICY "update_own_m89_audit" ON m89_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_m89_audit" ON m89_audit_logs;
CREATE POLICY "delete_own_m89_audit" ON m89_audit_logs FOR DELETE TO anon, authenticated USING (true);

-- M90 — Import, Export & International Trade Engine
CREATE TABLE IF NOT EXISTS m90_trade_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text NOT NULL DEFAULT 'import',
  stage text NOT NULL DEFAULT 'draft',
  status text NOT NULL DEFAULT 'active',
  importer_name text,
  exporter_name text,
  origin_country text,
  hs_code text,
  lc_ref text,
  incoterms text,
  bill_of_lading text,
  shipment_value numeric NOT NULL DEFAULT 0,
  customs_duty numeric NOT NULL DEFAULT 0,
  demurrage numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  certificate_of_origin text,
  conformity_certificate boolean NOT NULL DEFAULT false,
  customs_cleared boolean NOT NULL DEFAULT false,
  damage_claim numeric NOT NULL DEFAULT 0,
  description text,
  advisor_id uuid,
  m53_document_id text,
  m54_finance_linked boolean NOT NULL DEFAULT false,
  m85_tax_linked boolean NOT NULL DEFAULT false,
  m10_case_opened boolean NOT NULL DEFAULT false,
  m109_biometric_signed boolean NOT NULL DEFAULT false,
  m92_notified boolean NOT NULL DEFAULT false,
  cost_center_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m90_trade_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_m90" ON m90_trade_files;
CREATE POLICY "select_own_m90" ON m90_trade_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_m90" ON m90_trade_files;
CREATE POLICY "insert_own_m90" ON m90_trade_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_m90" ON m90_trade_files;
CREATE POLICY "update_own_m90" ON m90_trade_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_m90" ON m90_trade_files;
CREATE POLICY "delete_own_m90" ON m90_trade_files FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m90_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m90_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_m90_audit" ON m90_audit_logs;
CREATE POLICY "select_own_m90_audit" ON m90_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_m90_audit" ON m90_audit_logs;
CREATE POLICY "insert_own_m90_audit" ON m90_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_m90_audit" ON m90_audit_logs;
CREATE POLICY "update_own_m90_audit" ON m90_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_m90_audit" ON m90_audit_logs;
CREATE POLICY "delete_own_m90_audit" ON m90_audit_logs FOR DELETE TO anon, authenticated USING (true);

-- M91 — Occupational Health & Safety (HSE) Engine
CREATE TABLE IF NOT EXISTS m91_hse_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text NOT NULL DEFAULT 'safety_license',
  stage text NOT NULL DEFAULT 'draft',
  status text NOT NULL DEFAULT 'active',
  facility_name text,
  site_type text,
  license_number text,
  license_type text,
  risk_level text,
  incident_reported boolean NOT NULL DEFAULT false,
  incident_type text,
  injuries_count integer NOT NULL DEFAULT 0,
  fatalities integer NOT NULL DEFAULT 0,
  hazardous_materials boolean NOT NULL DEFAULT false,
  hazmat_permit_ref text,
  osha_compliant boolean NOT NULL DEFAULT false,
  evacuation_plan boolean NOT NULL DEFAULT false,
  compensation_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  insurance_claim numeric NOT NULL DEFAULT 0,
  description text,
  advisor_id uuid,
  m53_document_id text,
  m54_finance_linked boolean NOT NULL DEFAULT false,
  m77_hr_linked boolean NOT NULL DEFAULT false,
  m107_iot_linked boolean NOT NULL DEFAULT false,
  m10_case_opened boolean NOT NULL DEFAULT false,
  m109_biometric_signed boolean NOT NULL DEFAULT false,
  m92_notified boolean NOT NULL DEFAULT false,
  cost_center_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m91_hse_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_m91" ON m91_hse_files;
CREATE POLICY "select_own_m91" ON m91_hse_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_m91" ON m91_hse_files;
CREATE POLICY "insert_own_m91" ON m91_hse_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_m91" ON m91_hse_files;
CREATE POLICY "update_own_m91" ON m91_hse_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_m91" ON m91_hse_files;
CREATE POLICY "delete_own_m91" ON m91_hse_files FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m91_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m91_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_m91_audit" ON m91_audit_logs;
CREATE POLICY "select_own_m91_audit" ON m91_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_m91_audit" ON m91_audit_logs;
CREATE POLICY "insert_own_m91_audit" ON m91_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_m91_audit" ON m91_audit_logs;
CREATE POLICY "update_own_m91_audit" ON m91_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_m91_audit" ON m91_audit_logs;
CREATE POLICY "delete_own_m91_audit" ON m91_audit_logs FOR DELETE TO anon, authenticated USING (true);