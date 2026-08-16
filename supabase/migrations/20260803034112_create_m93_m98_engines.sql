/*
# Create M93–M98 Sectoral Engine Tables

## Overview
Adds 6 new sectoral engine tables (M93–M98) plus their audit log tables.
Each engine follows the same architecture as M76–M91: main file table + audit log table, RLS enabled.

## New Tables
### M93 — Marketing, Advertising & Digital Campaigns Engine
- m93_marketing_files: ad licenses, sponsorship contracts, influencer agreements, IP protection
### M94 — Automotive Trade, Rental & Fleet Management Engine
- m94_automotive_files: dealer licenses, leasing contracts, fleet management, insurance claims
### M95 — Automotive Manufacturing & Component Industries Engine
- m95_auto_manufacturing_files: CKD/SKD licenses, tech transfer, local content, OEM contracts
### M96 — Fertilizers, Basic Chemicals & Petrochemicals Engine
- m96_chemicals_files: production licenses, feedstock contracts, hazmat permits, environmental compliance
### M97 — Foreign Nationals, Residency & Global Mobility Engine
- m97_foreign_residency_files: work permits, residency licenses, investor visas, consular docs
### M98 — Stock Exchange, Investment Funds & Capital Markets Engine
- m98_capital_markets_files: fund licenses, IPO prospectuses, portfolio agreements, AML compliance

## Security
- RLS enabled on all 12 tables.
- Policies use TO anon, authenticated with USING (true) — single-tenant no-auth app.
- 4 policies per table (SELECT, INSERT, UPDATE, DELETE).
- Idempotent: uses IF NOT EXISTS and DROP POLICY IF EXISTS.
*/

-- M93 — Marketing, Advertising & Digital Campaigns Engine
CREATE TABLE IF NOT EXISTS m93_marketing_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text NOT NULL DEFAULT 'ad_license',
  stage text NOT NULL DEFAULT 'draft',
  status text NOT NULL DEFAULT 'active',
  campaign_name text,
  platform_type text,
  ad_license_number text,
  license_type text,
  sponsor_brand text,
  influencer_name text,
  influencer_contract boolean NOT NULL DEFAULT false,
  commission_rate numeric NOT NULL DEFAULT 0,
  campaign_budget numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  ip_slogan_protected boolean NOT NULL DEFAULT false,
  trademark_ref text,
  consumer_protection_checked boolean NOT NULL DEFAULT false,
  misleading_ad_flagged boolean NOT NULL DEFAULT false,
  description text,
  advisor_id uuid,
  m53_document_id text,
  m54_finance_linked boolean NOT NULL DEFAULT false,
  m81_media_linked boolean NOT NULL DEFAULT false,
  m10_case_opened boolean NOT NULL DEFAULT false,
  m109_biometric_signed boolean NOT NULL DEFAULT false,
  m92_notified boolean NOT NULL DEFAULT false,
  cost_center_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m93_marketing_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_m93" ON m93_marketing_files;
CREATE POLICY "select_own_m93" ON m93_marketing_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_m93" ON m93_marketing_files;
CREATE POLICY "insert_own_m93" ON m93_marketing_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_m93" ON m93_marketing_files;
CREATE POLICY "update_own_m93" ON m93_marketing_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_m93" ON m93_marketing_files;
CREATE POLICY "delete_own_m93" ON m93_marketing_files FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m93_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m93_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_m93_audit" ON m93_audit_logs;
CREATE POLICY "select_own_m93_audit" ON m93_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_m93_audit" ON m93_audit_logs;
CREATE POLICY "insert_own_m93_audit" ON m93_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_m93_audit" ON m93_audit_logs;
CREATE POLICY "update_own_m93_audit" ON m93_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_m93_audit" ON m93_audit_logs;
CREATE POLICY "delete_own_m93_audit" ON m93_audit_logs FOR DELETE TO anon, authenticated USING (true);

-- M94 — Automotive Trade, Rental & Fleet Management Engine
CREATE TABLE IF NOT EXISTS m94_automotive_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text NOT NULL DEFAULT 'dealer_license',
  stage text NOT NULL DEFAULT 'draft',
  status text NOT NULL DEFAULT 'active',
  dealership_name text,
  business_type text,
  license_number text,
  vehicle_count integer NOT NULL DEFAULT 0,
  lease_type text,
  monthly_installment numeric NOT NULL DEFAULT 0,
  contract_value numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  insurance_policy_ref text,
  insurance_coverage numeric NOT NULL DEFAULT 0,
  accident_claim numeric NOT NULL DEFAULT 0,
  warranty_claim text,
  maintenance_ref text,
  gps_tracking boolean NOT NULL DEFAULT false,
  description text,
  advisor_id uuid,
  m53_document_id text,
  m54_finance_linked boolean NOT NULL DEFAULT false,
  m101_maintenance_linked boolean NOT NULL DEFAULT false,
  m107_iot_linked boolean NOT NULL DEFAULT false,
  m10_case_opened boolean NOT NULL DEFAULT false,
  m109_biometric_signed boolean NOT NULL DEFAULT false,
  m92_notified boolean NOT NULL DEFAULT false,
  cost_center_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m94_automotive_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_m94" ON m94_automotive_files;
CREATE POLICY "select_own_m94" ON m94_automotive_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_m94" ON m94_automotive_files;
CREATE POLICY "insert_own_m94" ON m94_automotive_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_m94" ON m94_automotive_files;
CREATE POLICY "update_own_m94" ON m94_automotive_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_m94" ON m94_automotive_files;
CREATE POLICY "delete_own_m94" ON m94_automotive_files FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m94_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m94_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_m94_audit" ON m94_audit_logs;
CREATE POLICY "select_own_m94_audit" ON m94_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_m94_audit" ON m94_audit_logs;
CREATE POLICY "insert_own_m94_audit" ON m94_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_m94_audit" ON m94_audit_logs;
CREATE POLICY "update_own_m94_audit" ON m94_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_m94_audit" ON m94_audit_logs;
CREATE POLICY "delete_own_m94_audit" ON m94_audit_logs FOR DELETE TO anon, authenticated USING (true);

-- M95 — Automotive Manufacturing & Component Industries Engine
CREATE TABLE IF NOT EXISTS m95_auto_manufacturing_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text NOT NULL DEFAULT 'assembly_license',
  stage text NOT NULL DEFAULT 'draft',
  status text NOT NULL DEFAULT 'active',
  factory_name text,
  assembly_type text,
  license_number text,
  local_content_percentage numeric NOT NULL DEFAULT 0,
  tech_transfer_ref text,
  oem_licensed boolean NOT NULL DEFAULT false,
  royalty_rate numeric NOT NULL DEFAULT 0,
  supplier_tier text,
  contract_value numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  patent_ref text,
  customs_exemption boolean NOT NULL DEFAULT false,
  export_incentive boolean NOT NULL DEFAULT false,
  quality_standard text,
  description text,
  advisor_id uuid,
  m53_document_id text,
  m54_finance_linked boolean NOT NULL DEFAULT false,
  m80_ip_linked boolean NOT NULL DEFAULT false,
  m90_trade_linked boolean NOT NULL DEFAULT false,
  m10_case_opened boolean NOT NULL DEFAULT false,
  m109_biometric_signed boolean NOT NULL DEFAULT false,
  m92_notified boolean NOT NULL DEFAULT false,
  cost_center_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m95_auto_manufacturing_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_m95" ON m95_auto_manufacturing_files;
CREATE POLICY "select_own_m95" ON m95_auto_manufacturing_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_m95" ON m95_auto_manufacturing_files;
CREATE POLICY "insert_own_m95" ON m95_auto_manufacturing_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_m95" ON m95_auto_manufacturing_files;
CREATE POLICY "update_own_m95" ON m95_auto_manufacturing_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_m95" ON m95_auto_manufacturing_files;
CREATE POLICY "delete_own_m95" ON m95_auto_manufacturing_files FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m95_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m95_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_m95_audit" ON m95_audit_logs;
CREATE POLICY "select_own_m95_audit" ON m95_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_m95_audit" ON m95_audit_logs;
CREATE POLICY "insert_own_m95_audit" ON m95_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_m95_audit" ON m95_audit_logs;
CREATE POLICY "update_own_m95_audit" ON m95_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_m95_audit" ON m95_audit_logs;
CREATE POLICY "delete_own_m95_audit" ON m95_audit_logs FOR DELETE TO anon, authenticated USING (true);

-- M96 — Fertilizers, Basic Chemicals & Petrochemicals Engine
CREATE TABLE IF NOT EXISTS m96_chemicals_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text NOT NULL DEFAULT 'production_license',
  stage text NOT NULL DEFAULT 'draft',
  status text NOT NULL DEFAULT 'active',
  facility_name text,
  chemical_type text,
  license_number text,
  production_capacity numeric NOT NULL DEFAULT 0,
  feedstock_ref text,
  feedstock_type text,
  hazmat_permit_ref text,
  hazardous_materials boolean NOT NULL DEFAULT false,
  eia_approved boolean NOT NULL DEFAULT false,
  eia_ref text,
  emission_monitoring boolean NOT NULL DEFAULT false,
  export_certificate text,
  quality_analysis_ref text,
  contract_value numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  description text,
  advisor_id uuid,
  m53_document_id text,
  m54_finance_linked boolean NOT NULL DEFAULT false,
  m91_hse_linked boolean NOT NULL DEFAULT false,
  m107_iot_linked boolean NOT NULL DEFAULT false,
  m90_trade_linked boolean NOT NULL DEFAULT false,
  m109_biometric_signed boolean NOT NULL DEFAULT false,
  m92_notified boolean NOT NULL DEFAULT false,
  cost_center_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m96_chemicals_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_m96" ON m96_chemicals_files;
CREATE POLICY "select_own_m96" ON m96_chemicals_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_m96" ON m96_chemicals_files;
CREATE POLICY "insert_own_m96" ON m96_chemicals_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_m96" ON m96_chemicals_files;
CREATE POLICY "update_own_m96" ON m96_chemicals_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_m96" ON m96_chemicals_files;
CREATE POLICY "delete_own_m96" ON m96_chemicals_files FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m96_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m96_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_m96_audit" ON m96_audit_logs;
CREATE POLICY "select_own_m96_audit" ON m96_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_m96_audit" ON m96_audit_logs;
CREATE POLICY "insert_own_m96_audit" ON m96_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_m96_audit" ON m96_audit_logs;
CREATE POLICY "update_own_m96_audit" ON m96_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_m96_audit" ON m96_audit_logs;
CREATE POLICY "delete_own_m96_audit" ON m96_audit_logs FOR DELETE TO anon, authenticated USING (true);

-- M97 — Foreign Nationals, Residency & Global Mobility Engine
CREATE TABLE IF NOT EXISTS m97_foreign_residency_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text NOT NULL DEFAULT 'work_permit',
  stage text NOT NULL DEFAULT 'draft',
  status text NOT NULL DEFAULT 'active',
  foreign_national_name text,
  nationality text,
  passport_number text,
  residency_type text,
  permit_number text,
  sponsor_name text,
  employer_name text,
  contract_value numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  tax_deduction numeric NOT NULL DEFAULT 0,
  social_insurance boolean NOT NULL DEFAULT false,
  consular_ref text,
  deportation_flagged boolean NOT NULL DEFAULT false,
  renewal_deadline date,
  description text,
  advisor_id uuid,
  m53_document_id text,
  m54_finance_linked boolean NOT NULL DEFAULT false,
  m77_hr_linked boolean NOT NULL DEFAULT false,
  m10_case_opened boolean NOT NULL DEFAULT false,
  m109_biometric_signed boolean NOT NULL DEFAULT false,
  m92_notified boolean NOT NULL DEFAULT false,
  cost_center_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m97_foreign_residency_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_m97" ON m97_foreign_residency_files;
CREATE POLICY "select_own_m97" ON m97_foreign_residency_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_m97" ON m97_foreign_residency_files;
CREATE POLICY "insert_own_m97" ON m97_foreign_residency_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_m97" ON m97_foreign_residency_files;
CREATE POLICY "update_own_m97" ON m97_foreign_residency_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_m97" ON m97_foreign_residency_files;
CREATE POLICY "delete_own_m97" ON m97_foreign_residency_files FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m97_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m97_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_m97_audit" ON m97_audit_logs;
CREATE POLICY "select_own_m97_audit" ON m97_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_m97_audit" ON m97_audit_logs;
CREATE POLICY "insert_own_m97_audit" ON m97_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_m97_audit" ON m97_audit_logs;
CREATE POLICY "update_own_m97_audit" ON m97_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_m97_audit" ON m97_audit_logs;
CREATE POLICY "delete_own_m97_audit" ON m97_audit_logs FOR DELETE TO anon, authenticated USING (true);

-- M98 — Stock Exchange, Investment Funds & Capital Markets Engine
CREATE TABLE IF NOT EXISTS m98_capital_markets_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text NOT NULL DEFAULT 'fund_license',
  stage text NOT NULL DEFAULT 'draft',
  status text NOT NULL DEFAULT 'active',
  fund_name text,
  fund_type text,
  license_number text,
  listing_ref text,
  portfolio_value numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  ipo_ref text,
  disclosure_ref text,
  insider_trading_flagged boolean NOT NULL DEFAULT false,
  aml_compliant boolean NOT NULL DEFAULT false,
  kyc_verified boolean NOT NULL DEFAULT false,
  market_maker_ref text,
  custodian_ref text,
  distribution_amount numeric NOT NULL DEFAULT 0,
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
ALTER TABLE m98_capital_markets_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_m98" ON m98_capital_markets_files;
CREATE POLICY "select_own_m98" ON m98_capital_markets_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_m98" ON m98_capital_markets_files;
CREATE POLICY "insert_own_m98" ON m98_capital_markets_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_m98" ON m98_capital_markets_files;
CREATE POLICY "update_own_m98" ON m98_capital_markets_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_m98" ON m98_capital_markets_files;
CREATE POLICY "delete_own_m98" ON m98_capital_markets_files FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m98_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE m98_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_m98_audit" ON m98_audit_logs;
CREATE POLICY "select_own_m98_audit" ON m98_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_m98_audit" ON m98_audit_logs;
CREATE POLICY "insert_own_m98_audit" ON m98_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_m98_audit" ON m98_audit_logs;
CREATE POLICY "update_own_m98_audit" ON m98_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_m98_audit" ON m98_audit_logs;
CREATE POLICY "delete_own_m98_audit" ON m98_audit_logs FOR DELETE TO anon, authenticated USING (true);