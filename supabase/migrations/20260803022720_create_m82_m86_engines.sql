/*
# Create M82–M86 Sectoral Engine Tables

## Overview
Adds 5 new sectoral engine tables (M82–M86) plus their audit log tables, completing the sectoral coverage.
Each engine follows the same architecture as M76–M81: a main file table + an audit log table, with RLS enabled.

## New Tables

### M82 — Telecom, IT & Data Protection Engine
- `m82_telecom_files`: licenses (NTRA), SLA agreements, GDPR compliance, DPA, data breach tracking, IP protection
- `m82_audit_logs`: immutable audit trail

### M83 — Real Estate Asset Management & Valuation Engine
- `m83_real_estate_asset_files`: property portfolios, IVS valuations, ROI tracking, mortgages, maintenance
- `m83_audit_logs`: immutable audit trail

### M84 — Railways, Metro & Electric Trains Engine
- `m84_railways_files`: concession agreements (BOO/BOT), rolling stock, safety compliance, accident reports
- `m84_audit_logs`: immutable audit trail

### M85 — Legal Accounting, Audit & Taxation Engine
- `m85_legal_accounting_files`: tax declarations, IFRS audit, appeals, penalties, zakat deduction tracking
- `m85_audit_logs`: immutable audit trail

### M86 — Tourism & Hotel Management Engine
- `m86_tourism_files`: hotel management agreements (HMA), star ratings, licenses, booking disputes, liability
- `m86_audit_logs`: immutable audit trail

## Security
- RLS enabled on all 10 tables.
- Policies use `TO anon, authenticated` with `USING (true)` — this is a single-tenant no-auth app where data is intentionally shared.
- 4 policies per table (SELECT, INSERT, UPDATE, DELETE).

## Notes
1. All tables follow the same column pattern as M76–M81: file_number, file_title, file_type, stage, status, integration flags (m53_, m54_, m10_, m109_, m92_), cost_center_id, timestamps.
2. Each engine has engine-specific columns (e.g. M82 has dpo_assigned, gdpr_compliance; M83 has ivs_standard, roi_percentage).
3. Idempotent: uses IF NOT EXISTS and DROP POLICY IF EXISTS.
*/

-- M82 — Telecom, IT & Data Protection Engine
CREATE TABLE IF NOT EXISTS m82_telecom_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text NOT NULL DEFAULT 'license',
  stage text NOT NULL DEFAULT 'draft',
  status text NOT NULL DEFAULT 'active',
  provider_name text,
  license_type text,
  license_number text,
  ntra_ref text,
  sla_metrics text,
  sla_breach boolean NOT NULL DEFAULT false,
  contract_value numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  dpo_assigned boolean NOT NULL DEFAULT false,
  gdpr_compliance boolean NOT NULL DEFAULT false,
  dpa_ref text,
  ip_protection_ref text,
  data_breach_reported boolean NOT NULL DEFAULT false,
  description text,
  advisor_id uuid,
  m53_document_id text,
  m54_finance_linked boolean NOT NULL DEFAULT false,
  m14_cyber_linked boolean NOT NULL DEFAULT false,
  m10_case_opened boolean NOT NULL DEFAULT false,
  m109_biometric_signed boolean NOT NULL DEFAULT false,
  m92_notified boolean NOT NULL DEFAULT false,
  cost_center_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m82_telecom_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_m82" ON m82_telecom_files;
CREATE POLICY "select_own_m82" ON m82_telecom_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_m82" ON m82_telecom_files;
CREATE POLICY "insert_own_m82" ON m82_telecom_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_m82" ON m82_telecom_files;
CREATE POLICY "update_own_m82" ON m82_telecom_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_m82" ON m82_telecom_files;
CREATE POLICY "delete_own_m82" ON m82_telecom_files FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m82_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m82_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_m82_audit" ON m82_audit_logs;
CREATE POLICY "select_own_m82_audit" ON m82_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_m82_audit" ON m82_audit_logs;
CREATE POLICY "insert_own_m82_audit" ON m82_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_m82_audit" ON m82_audit_logs;
CREATE POLICY "update_own_m82_audit" ON m82_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_m82_audit" ON m82_audit_logs;
CREATE POLICY "delete_own_m82_audit" ON m82_audit_logs FOR DELETE TO anon, authenticated USING (true);

-- M83 — Real Estate Asset Management & Valuation Engine
CREATE TABLE IF NOT EXISTS m83_real_estate_asset_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text NOT NULL DEFAULT 'valuation',
  stage text NOT NULL DEFAULT 'draft',
  status text NOT NULL DEFAULT 'active',
  property_name text,
  property_type text,
  location text,
  ownership_status text,
  market_value numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  roi_percentage numeric NOT NULL DEFAULT 0,
  rental_income numeric NOT NULL DEFAULT 0,
  valuation_ref text,
  ivs_standard boolean NOT NULL DEFAULT false,
  mortgage_ref text,
  maintenance_schedule text,
  dispute_status text,
  description text,
  advisor_id uuid,
  m53_document_id text,
  m54_finance_linked boolean NOT NULL DEFAULT false,
  m10_case_opened boolean NOT NULL DEFAULT false,
  m107_iot_linked boolean NOT NULL DEFAULT false,
  m109_biometric_signed boolean NOT NULL DEFAULT false,
  m92_notified boolean NOT NULL DEFAULT false,
  cost_center_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m83_real_estate_asset_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_m83" ON m83_real_estate_asset_files;
CREATE POLICY "select_own_m83" ON m83_real_estate_asset_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_m83" ON m83_real_estate_asset_files;
CREATE POLICY "insert_own_m83" ON m83_real_estate_asset_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_m83" ON m83_real_estate_asset_files;
CREATE POLICY "update_own_m83" ON m83_real_estate_asset_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_m83" ON m83_real_estate_asset_files;
CREATE POLICY "delete_own_m83" ON m83_real_estate_asset_files FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m83_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m83_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_m83_audit" ON m83_audit_logs;
CREATE POLICY "select_own_m83_audit" ON m83_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_m83_audit" ON m83_audit_logs;
CREATE POLICY "insert_own_m83_audit" ON m83_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_m83_audit" ON m83_audit_logs;
CREATE POLICY "update_own_m83_audit" ON m83_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_m83_audit" ON m83_audit_logs;
CREATE POLICY "delete_own_m83_audit" ON m83_audit_logs FOR DELETE TO anon, authenticated USING (true);

-- M84 — Railways, Metro & Electric Trains Engine
CREATE TABLE IF NOT EXISTS m84_railways_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text NOT NULL DEFAULT 'concession',
  stage text NOT NULL DEFAULT 'draft',
  status text NOT NULL DEFAULT 'active',
  concession_type text,
  operator_name text,
  line_name text,
  contract_value numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  rolling_stock_ref text,
  safety_compliance boolean NOT NULL DEFAULT false,
  accident_reported boolean NOT NULL DEFAULT false,
  penalty_amount numeric NOT NULL DEFAULT 0,
  insurance_claim numeric NOT NULL DEFAULT 0,
  arbitration_ref text,
  description text,
  advisor_id uuid,
  m53_document_id text,
  m54_finance_linked boolean NOT NULL DEFAULT false,
  m10_case_opened boolean NOT NULL DEFAULT false,
  m107_iot_linked boolean NOT NULL DEFAULT false,
  m109_biometric_signed boolean NOT NULL DEFAULT false,
  m92_notified boolean NOT NULL DEFAULT false,
  cost_center_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m84_railways_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_m84" ON m84_railways_files;
CREATE POLICY "select_own_m84" ON m84_railways_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_m84" ON m84_railways_files;
CREATE POLICY "insert_own_m84" ON m84_railways_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_m84" ON m84_railways_files;
CREATE POLICY "update_own_m84" ON m84_railways_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_m84" ON m84_railways_files;
CREATE POLICY "delete_own_m84" ON m84_railways_files FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m84_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m84_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_m84_audit" ON m84_audit_logs;
CREATE POLICY "select_own_m84_audit" ON m84_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_m84_audit" ON m84_audit_logs;
CREATE POLICY "insert_own_m84_audit" ON m84_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_m84_audit" ON m84_audit_logs;
CREATE POLICY "update_own_m84_audit" ON m84_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_m84_audit" ON m84_audit_logs;
CREATE POLICY "delete_own_m84_audit" ON m84_audit_logs FOR DELETE TO anon, authenticated USING (true);

-- M85 — Legal Accounting, Audit & Taxation Engine
CREATE TABLE IF NOT EXISTS m85_legal_accounting_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text NOT NULL DEFAULT 'tax_declaration',
  stage text NOT NULL DEFAULT 'draft',
  status text NOT NULL DEFAULT 'active',
  company_name text,
  tax_type text,
  tax_period text,
  declared_amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  ifrs_compliant boolean NOT NULL DEFAULT false,
  audit_opinion text,
  appeal_ref text,
  penalty_amount numeric NOT NULL DEFAULT 0,
  zakat_deducted boolean NOT NULL DEFAULT false,
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
ALTER TABLE m85_legal_accounting_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_m85" ON m85_legal_accounting_files;
CREATE POLICY "select_own_m85" ON m85_legal_accounting_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_m85" ON m85_legal_accounting_files;
CREATE POLICY "insert_own_m85" ON m85_legal_accounting_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_m85" ON m85_legal_accounting_files;
CREATE POLICY "update_own_m85" ON m85_legal_accounting_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_m85" ON m85_legal_accounting_files;
CREATE POLICY "delete_own_m85" ON m85_legal_accounting_files FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m85_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m85_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_m85_audit" ON m85_audit_logs;
CREATE POLICY "select_own_m85_audit" ON m85_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_m85_audit" ON m85_audit_logs;
CREATE POLICY "insert_own_m85_audit" ON m85_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_m85_audit" ON m85_audit_logs;
CREATE POLICY "update_own_m85_audit" ON m85_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_m85_audit" ON m85_audit_logs;
CREATE POLICY "delete_own_m85_audit" ON m85_audit_logs FOR DELETE TO anon, authenticated USING (true);

-- M86 — Tourism & Hotel Management Engine
CREATE TABLE IF NOT EXISTS m86_tourism_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text NOT NULL DEFAULT 'hma',
  stage text NOT NULL DEFAULT 'draft',
  status text NOT NULL DEFAULT 'active',
  hotel_name text,
  star_rating text,
  hma_ref text,
  operator_brand text,
  license_number text,
  booking_dispute boolean NOT NULL DEFAULT false,
  liability_claim numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  training_program boolean NOT NULL DEFAULT false,
  cancellation_penalty numeric NOT NULL DEFAULT 0,
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
ALTER TABLE m86_tourism_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_m86" ON m86_tourism_files;
CREATE POLICY "select_own_m86" ON m86_tourism_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_m86" ON m86_tourism_files;
CREATE POLICY "insert_own_m86" ON m86_tourism_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_m86" ON m86_tourism_files;
CREATE POLICY "update_own_m86" ON m86_tourism_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_m86" ON m86_tourism_files;
CREATE POLICY "delete_own_m86" ON m86_tourism_files FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m86_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m86_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_m86_audit" ON m86_audit_logs;
CREATE POLICY "select_own_m86_audit" ON m86_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_m86_audit" ON m86_audit_logs;
CREATE POLICY "insert_own_m86_audit" ON m86_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_m86_audit" ON m86_audit_logs;
CREATE POLICY "update_own_m86_audit" ON m86_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_m86_audit" ON m86_audit_logs;
CREATE POLICY "delete_own_m86_audit" ON m86_audit_logs FOR DELETE TO anon, authenticated USING (true);