/*
# M18-M22 — Investment, Trade & Real Estate Sector Engines

Creates 5 new module schemas:

1. M18 — Digital Assets & AI Governance Engine (محرك الأصول الرقمية والذكاء الاصطناعي)
   - AI asset registration, bias audit, compliance tracking, audit logs
   - Integrates: M92 (guardrails), M14 (monitoring), M54 (finance), M109 (biometric), M53 (vault)

2. M19 — Commercial Contracts & Procurement Engine (محرك العقود التجارية والتوريدات)
   - Contract lifecycle, milestones, risk assessment, audit logs
   - Integrates: M53 (documents), M50 (risk), M16 (signing), M54 (finance), M10 (deadlines), M51 (tasks), M52 (mail), M92

3. M20 — Mergers & Acquisitions Engine (محرك عقود الشركات والاستحواذ)
   - M&A deals, due diligence items, audit logs
   - Integrates: M53 (documents), M49 (board), M16 (signing), M54 (finance), M50 (risk), M83 (assets), M92

4. M21 — Foreign Direct Investment & Company Formation Engine (محرك الاستثمار الأجنبي المباشر)
   - FDI applications, shareholders, audit logs
   - Integrates: M53 (documents), M16 (signing), M54 (finance), M50 (risk), M51 (tasks), M92

5. M22 — Real Estate & Property Development Engine (محرك العقارات والتطوير العقاري)
   - Property transactions, sub-transactions, audit logs
   - Integrates: M53 (documents), M16 (signing), M54 (finance), M10 (deadlines), M51 (tasks), M50 (risk), M83 (assets), M92

All tables follow the existing m##_ prefix convention with RLS enabled (single-tenant, no auth gating).
*/

-- ═══════════════════════════════════════════════
-- M18 — Digital Assets & AI Governance Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m18_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_number text NOT NULL UNIQUE,
  asset_name text NOT NULL,
  asset_type text DEFAULT 'ai_model',
  stage text DEFAULT 'ingestion',
  status text DEFAULT 'draft',
  asset_uuid text,
  owner_entity text,
  ai_model_name text,
  ai_model_version text,
  bias_audit_passed boolean DEFAULT false,
  transparency_score numeric(5,2) DEFAULT 0,
  compliance_status text DEFAULT 'pending',
  is_encrypted boolean DEFAULT true,
  encryption_standard text DEFAULT 'AES-256',
  financial_value numeric(14,2) DEFAULT 0,
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m92_guardrails_verified boolean DEFAULT false,
  m14_monitoring_active boolean DEFAULT false,
  m54_finance_linked boolean DEFAULT false,
  m109_biometric_required boolean DEFAULT false,
  m53_archived boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m18_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m18_assets" ON m18_assets;
CREATE POLICY "anon_select_m18_assets" ON m18_assets FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m18_assets" ON m18_assets;
CREATE POLICY "anon_insert_m18_assets" ON m18_assets FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m18_assets" ON m18_assets;
CREATE POLICY "anon_update_m18_assets" ON m18_assets FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m18_assets" ON m18_assets;
CREATE POLICY "anon_delete_m18_assets" ON m18_assets FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m18_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m18_assets(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m18_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m18_audit" ON m18_audit_logs;
CREATE POLICY "anon_select_m18_audit" ON m18_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m18_audit" ON m18_audit_logs;
CREATE POLICY "anon_insert_m18_audit" ON m18_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m18_audit" ON m18_audit_logs;
CREATE POLICY "anon_update_m18_audit" ON m18_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m18_audit" ON m18_audit_logs;
CREATE POLICY "anon_delete_m18_audit" ON m18_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m18_assets_number ON m18_assets(asset_number);
CREATE INDEX IF NOT EXISTS idx_m18_assets_stage ON m18_assets(stage);
CREATE INDEX IF NOT EXISTS idx_m18_audit_case ON m18_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m18_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m18_assets_touch ON m18_assets;
CREATE TRIGGER trg_m18_assets_touch BEFORE UPDATE ON m18_assets
  FOR EACH ROW EXECUTE FUNCTION m18_touch_updated_at();

-- ═══════════════════════════════════════════════
-- M19 — Commercial Contracts & Procurement Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m19_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number text NOT NULL UNIQUE,
  contract_title text NOT NULL,
  contract_type text DEFAULT 'supply',
  stage text DEFAULT 'draft',
  status text DEFAULT 'pending',
  party_a text NOT NULL,
  party_b text NOT NULL,
  contract_value numeric(14,2) DEFAULT 0,
  penalty_clauses text,
  force_majeure_clauses text,
  delivery_deadline date,
  incoterms text,
  is_international boolean DEFAULT false,
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m53_document_id text,
  m50_risk_assessed boolean DEFAULT false,
  m16_signed boolean DEFAULT false,
  m54_cost_center_opened boolean DEFAULT false,
  m10_deadlines_registered boolean DEFAULT false,
  m51_tasks_generated boolean DEFAULT false,
  m52_notified boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m19_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m19_contracts" ON m19_contracts;
CREATE POLICY "anon_select_m19_contracts" ON m19_contracts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m19_contracts" ON m19_contracts;
CREATE POLICY "anon_insert_m19_contracts" ON m19_contracts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m19_contracts" ON m19_contracts;
CREATE POLICY "anon_update_m19_contracts" ON m19_contracts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m19_contracts" ON m19_contracts;
CREATE POLICY "anon_delete_m19_contracts" ON m19_contracts FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m19_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES m19_contracts(id) ON DELETE CASCADE,
  milestone_type text NOT NULL,
  milestone_date date NOT NULL,
  deadline_date date,
  completed boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m19_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m19_milestones" ON m19_milestones;
CREATE POLICY "anon_select_m19_milestones" ON m19_milestones FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m19_milestones" ON m19_milestones;
CREATE POLICY "anon_insert_m19_milestones" ON m19_milestones FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m19_milestones" ON m19_milestones;
CREATE POLICY "anon_update_m19_milestones" ON m19_milestones FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m19_milestones" ON m19_milestones;
CREATE POLICY "anon_delete_m19_milestones" ON m19_milestones FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m19_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m19_contracts(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m19_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m19_audit" ON m19_audit_logs;
CREATE POLICY "anon_select_m19_audit" ON m19_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m19_audit" ON m19_audit_logs;
CREATE POLICY "anon_insert_m19_audit" ON m19_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m19_audit" ON m19_audit_logs;
CREATE POLICY "anon_update_m19_audit" ON m19_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m19_audit" ON m19_audit_logs;
CREATE POLICY "anon_delete_m19_audit" ON m19_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m19_contracts_number ON m19_contracts(contract_number);
CREATE INDEX IF NOT EXISTS idx_m19_contracts_stage ON m19_contracts(stage);
CREATE INDEX IF NOT EXISTS idx_m19_milestones_contract ON m19_milestones(contract_id);
CREATE INDEX IF NOT EXISTS idx_m19_audit_case ON m19_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m19_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m19_contracts_touch ON m19_contracts;
CREATE TRIGGER trg_m19_contracts_touch BEFORE UPDATE ON m19_contracts
  FOR EACH ROW EXECUTE FUNCTION m19_touch_updated_at();

-- ═══════════════════════════════════════════════
-- M20 — Mergers & Acquisitions Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m20_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_number text NOT NULL UNIQUE,
  deal_title text NOT NULL,
  deal_type text DEFAULT 'acquisition',
  stage text DEFAULT 'initiation',
  status text DEFAULT 'active',
  target_company text NOT NULL,
  acquiring_entity text NOT NULL,
  deal_value numeric(14,2) DEFAULT 0,
  share_percentage numeric(5,2) DEFAULT 0,
  is_cross_border boolean DEFAULT false,
  due_diligence_status text DEFAULT 'pending',
  due_diligence_report text,
  escrow_arrangements text,
  antitrust_clearance boolean DEFAULT false,
  conflict_of_interest_flag boolean DEFAULT false,
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m53_document_id text,
  m49_board_approved boolean DEFAULT false,
  m16_signed boolean DEFAULT false,
  m54_finance_linked boolean DEFAULT false,
  m50_risk_assessed boolean DEFAULT false,
  m83_assets_valued boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m20_deals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m20_deals" ON m20_deals;
CREATE POLICY "anon_select_m20_deals" ON m20_deals FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m20_deals" ON m20_deals;
CREATE POLICY "anon_insert_m20_deals" ON m20_deals FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m20_deals" ON m20_deals;
CREATE POLICY "anon_update_m20_deals" ON m20_deals FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m20_deals" ON m20_deals;
CREATE POLICY "anon_delete_m20_deals" ON m20_deals FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m20_due_diligence_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES m20_deals(id) ON DELETE CASCADE,
  category text NOT NULL,
  finding text,
  risk_level text DEFAULT 'medium',
  status text DEFAULT 'pending',
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m20_due_diligence_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m20_dd" ON m20_due_diligence_items;
CREATE POLICY "anon_select_m20_dd" ON m20_due_diligence_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m20_dd" ON m20_due_diligence_items;
CREATE POLICY "anon_insert_m20_dd" ON m20_due_diligence_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m20_dd" ON m20_due_diligence_items;
CREATE POLICY "anon_update_m20_dd" ON m20_due_diligence_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m20_dd" ON m20_due_diligence_items;
CREATE POLICY "anon_delete_m20_dd" ON m20_due_diligence_items FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m20_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m20_deals(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m20_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m20_audit" ON m20_audit_logs;
CREATE POLICY "anon_select_m20_audit" ON m20_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m20_audit" ON m20_audit_logs;
CREATE POLICY "anon_insert_m20_audit" ON m20_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m20_audit" ON m20_audit_logs;
CREATE POLICY "anon_update_m20_audit" ON m20_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m20_audit" ON m20_audit_logs;
CREATE POLICY "anon_delete_m20_audit" ON m20_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m20_deals_number ON m20_deals(deal_number);
CREATE INDEX IF NOT EXISTS idx_m20_deals_stage ON m20_deals(stage);
CREATE INDEX IF NOT EXISTS idx_m20_dd_deal ON m20_due_diligence_items(deal_id);
CREATE INDEX IF NOT EXISTS idx_m20_audit_case ON m20_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m20_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m20_deals_touch ON m20_deals;
CREATE TRIGGER trg_m20_deals_touch BEFORE UPDATE ON m20_deals
  FOR EACH ROW EXECUTE FUNCTION m20_touch_updated_at();

-- ═══════════════════════════════════════════════
-- M21 — Foreign Direct Investment & Company Formation Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m21_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_number text NOT NULL UNIQUE,
  applicant_name text NOT NULL,
  investor_nationality text,
  company_type text DEFAULT 'llc',
  stage text DEFAULT 'initiation',
  status text DEFAULT 'pending',
  capital_amount numeric(14,2) DEFAULT 0,
  currency text DEFAULT 'USD',
  investment_incentives text,
  tax_exemptions text,
  customs_exemptions text,
  gafi_reference text,
  free_zone boolean DEFAULT false,
  security_clearance_status text DEFAULT 'pending',
  bit_reference text,
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m53_document_id text,
  m16_signed boolean DEFAULT false,
  m54_finance_linked boolean DEFAULT false,
  m50_risk_assessed boolean DEFAULT false,
  m51_tasks_generated boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m21_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m21_apps" ON m21_applications;
CREATE POLICY "anon_select_m21_apps" ON m21_applications FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m21_apps" ON m21_applications;
CREATE POLICY "anon_insert_m21_apps" ON m21_applications FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m21_apps" ON m21_applications;
CREATE POLICY "anon_update_m21_apps" ON m21_applications FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m21_apps" ON m21_applications;
CREATE POLICY "anon_delete_m21_apps" ON m21_applications FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m21_shareholders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES m21_applications(id) ON DELETE CASCADE,
  shareholder_name text NOT NULL,
  nationality text,
  share_percentage numeric(5,2) DEFAULT 0,
  capital_contribution numeric(14,2) DEFAULT 0,
  is_foreign boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m21_shareholders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m21_shareholders" ON m21_shareholders;
CREATE POLICY "anon_select_m21_shareholders" ON m21_shareholders FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m21_shareholders" ON m21_shareholders;
CREATE POLICY "anon_insert_m21_shareholders" ON m21_shareholders FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m21_shareholders" ON m21_shareholders;
CREATE POLICY "anon_update_m21_shareholders" ON m21_shareholders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m21_shareholders" ON m21_shareholders;
CREATE POLICY "anon_delete_m21_shareholders" ON m21_shareholders FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m21_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m21_applications(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m21_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m21_audit" ON m21_audit_logs;
CREATE POLICY "anon_select_m21_audit" ON m21_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m21_audit" ON m21_audit_logs;
CREATE POLICY "anon_insert_m21_audit" ON m21_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m21_audit" ON m21_audit_logs;
CREATE POLICY "anon_update_m21_audit" ON m21_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m21_audit" ON m21_audit_logs;
CREATE POLICY "anon_delete_m21_audit" ON m21_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m21_apps_number ON m21_applications(application_number);
CREATE INDEX IF NOT EXISTS idx_m21_apps_stage ON m21_applications(stage);
CREATE INDEX IF NOT EXISTS idx_m21_shareholders_app ON m21_shareholders(application_id);
CREATE INDEX IF NOT EXISTS idx_m21_audit_case ON m21_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m21_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m21_apps_touch ON m21_applications;
CREATE TRIGGER trg_m21_apps_touch BEFORE UPDATE ON m21_applications
  FOR EACH ROW EXECUTE FUNCTION m21_touch_updated_at();

-- ═══════════════════════════════════════════════
-- M22 — Real Estate & Property Development Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m22_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_number text NOT NULL UNIQUE,
  property_title text NOT NULL,
  transaction_type text DEFAULT 'sale',
  stage text DEFAULT 'initiation',
  status text DEFAULT 'pending',
  property_type text DEFAULT 'residential',
  location text,
  area_sqm numeric(10,2) DEFAULT 0,
  property_value numeric(14,2) DEFAULT 0,
  mortgage_registered boolean DEFAULT false,
  mortgage_amount numeric(14,2) DEFAULT 0,
  encumbrance_free boolean DEFAULT true,
  fidic_contract boolean DEFAULT false,
  developer_agreement boolean DEFAULT false,
  registration_status text DEFAULT 'pending',
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m53_document_id text,
  m16_signed boolean DEFAULT false,
  m54_cost_center_opened boolean DEFAULT false,
  m10_deadlines_registered boolean DEFAULT false,
  m51_tasks_generated boolean DEFAULT false,
  m50_risk_assessed boolean DEFAULT false,
  m83_assets_updated boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m22_properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m22_properties" ON m22_properties;
CREATE POLICY "anon_select_m22_properties" ON m22_properties FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m22_properties" ON m22_properties;
CREATE POLICY "anon_insert_m22_properties" ON m22_properties FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m22_properties" ON m22_properties;
CREATE POLICY "anon_update_m22_properties" ON m22_properties FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m22_properties" ON m22_properties;
CREATE POLICY "anon_delete_m22_properties" ON m22_properties FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m22_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES m22_properties(id) ON DELETE CASCADE,
  transaction_type text NOT NULL,
  party_a text NOT NULL,
  party_b text NOT NULL,
  transaction_value numeric(14,2) DEFAULT 0,
  transaction_date date NOT NULL,
  registration_date date,
  notarized boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m22_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m22_txn" ON m22_transactions;
CREATE POLICY "anon_select_m22_txn" ON m22_transactions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m22_txn" ON m22_transactions;
CREATE POLICY "anon_insert_m22_txn" ON m22_transactions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m22_txn" ON m22_transactions;
CREATE POLICY "anon_update_m22_txn" ON m22_transactions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m22_txn" ON m22_transactions;
CREATE POLICY "anon_delete_m22_txn" ON m22_transactions FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m22_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m22_properties(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m22_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m22_audit" ON m22_audit_logs;
CREATE POLICY "anon_select_m22_audit" ON m22_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m22_audit" ON m22_audit_logs;
CREATE POLICY "anon_insert_m22_audit" ON m22_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m22_audit" ON m22_audit_logs;
CREATE POLICY "anon_update_m22_audit" ON m22_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m22_audit" ON m22_audit_logs;
CREATE POLICY "anon_delete_m22_audit" ON m22_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m22_properties_number ON m22_properties(property_number);
CREATE INDEX IF NOT EXISTS idx_m22_properties_stage ON m22_properties(stage);
CREATE INDEX IF NOT EXISTS idx_m22_txn_property ON m22_transactions(property_id);
CREATE INDEX IF NOT EXISTS idx_m22_audit_case ON m22_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m22_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m22_properties_touch ON m22_properties;
CREATE TRIGGER trg_m22_properties_touch BEFORE UPDATE ON m22_properties
  FOR EACH ROW EXECUTE FUNCTION m22_touch_updated_at();

-- ═══════════════════════════════════════════════
-- Seed Data
-- ═══════════════════════════════════════════════

INSERT INTO m18_assets (asset_number, asset_name, asset_type, stage, status, ai_model_name, ai_model_version, bias_audit_passed, transparency_score, compliance_status, financial_value, description)
VALUES ('DAI-2026-001', 'نموذج تحليل العقود السيادي', 'ai_model', 'audited', 'active', 'Sovereign-LLM', 'v2.1', true, 92.50, 'compliant', 350000, 'نموذج ذكاء اصطناعي لتحليل العقود القانونية')
ON CONFLICT DO NOTHING;

INSERT INTO m18_audit_logs (case_id, action, actor, detail, hash_chain)
SELECT id, 'أصل رقمي مسجل', 'النظام', 'تم تسجيل الأصل الرقمي DAI-2026-001', '0x3f7a2c9d'
FROM m18_assets WHERE asset_number='DAI-2026-001' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO m19_contracts (contract_number, contract_title, contract_type, stage, status, party_a, party_b, contract_value, is_international, description)
VALUES ('CON-2026-001', 'عقد توريد أنظمة الحاسوب الفائقة', 'supply', 'draft', 'pending', 'المؤسسة السيادية', 'شركة التقنيات المتقدمة', 850000, true, 'عقد توريد أنظمة حاسوبية عالية الأداء')
ON CONFLICT DO NOTHING;

INSERT INTO m19_audit_logs (case_id, action, actor, detail, hash_chain)
SELECT id, 'عقد مسجل', 'النظام', 'تم تسجيل العقد CON-2026-001', '0x8b4e1f6a'
FROM m19_contracts WHERE contract_number='CON-2026-001' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO m20_deals (deal_number, deal_title, deal_type, stage, status, target_company, acquiring_entity, deal_value, share_percentage, is_cross_border, description)
VALUES ('MA-2026-001', 'استحواذ على شركة التقنية الناشئة', 'acquisition', 'initiation', 'active', 'TechStart Ltd', 'المؤسسة السيادية القابضة', 5000000, 75.00, true, 'صفقة استحواذ على 75% من أسهم شركة التقنية')
ON CONFLICT DO NOTHING;

INSERT INTO m20_due_diligence_items (deal_id, category, finding, risk_level, status)
SELECT id, 'legal', 'تم فحص السجل القانوني للشركة', 'low', 'completed'
FROM m20_deals WHERE deal_number='MA-2026-001' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO m21_applications (application_number, applicant_name, investor_nationality, company_type, stage, status, capital_amount, currency, free_zone, description)
VALUES ('FDI-2026-001', 'Global Manufacturing Corp', 'ألمانية', 'llc', 'initiation', 'pending', 10000000, 'EUR', true, 'تأسيس شركة استثمارية لصناعة السيارات في المنطقة الحرة')
ON CONFLICT DO NOTHING;

INSERT INTO m21_shareholders (application_id, shareholder_name, nationality, share_percentage, capital_contribution, is_foreign)
SELECT id, 'Global Manufacturing Corp', 'ألمانية', 90.00, 9000000, true
FROM m21_applications WHERE application_number='FDI-2026-001' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO m22_properties (property_number, property_title, transaction_type, stage, status, property_type, location, area_sqm, property_value, description)
VALUES ('RE-2026-001', 'مجمع المكاتب الإدارية السيادي', 'sale', 'initiation', 'pending', 'commercial', 'المنطقة المالية الجديدة', 15000.00, 25000000, 'صفقة شراء مجمع إداري للمقر الرئيسي')
ON CONFLICT DO NOTHING;

INSERT INTO m22_audit_logs (case_id, action, actor, detail, hash_chain)
SELECT id, 'عقار مسجل', 'النظام', 'تم تسجيل العقار RE-2026-001', '0x6d2c8e1f'
FROM m22_properties WHERE property_number='RE-2026-001' LIMIT 1
ON CONFLICT DO NOTHING;
