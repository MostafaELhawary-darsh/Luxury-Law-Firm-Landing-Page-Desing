/*
# M23-M28 — Trade, Finance, Personal Status & Endowments Sector Engines

Creates 6 new module schemas:

1. M23 — Distribution & Commercial Agencies Engine (محرك التوزيع والوكالات التجارية)
   - Agency/franchise contracts, compliance, audit logs
   - Integrates: M53, M26, M16, M54, M10, M51, M80, M92

2. M24 — Maritime & Air Commerce Engine (محرك التجارة البحرية والجوية)
   - Shipments, bills of lading, insurance, audit logs
   - Integrates: M53, M90, M106, M54, M10, M51, M109, M92

3. M25 — Strategic Finance & Investment Engine (محرك التمويل والاستثمار الاستراتيجي)
   - Financing agreements, loans, IPOs, audit logs
   - Integrates: M53, M49, M50, M54, M10, M51, M98, M109, M92

4. M26 — Commercial Compliance & Antitrust Engine (محرك الامتثال التجاري ومنع الاحتكار)
   - Compliance reviews, antitrust checks, audit logs
   - Integrates: M20, M23, M54, M10, M109, M92

5. M27 — Inheritance, Wills & Estate Liquidation Engine (محرك التركات والمواريث)
   - Estates, heirs, liquidation, audit logs
   - Integrates: M83, M98, M54, M46, M22, M10, M109, M92

6. M28 — Endowments & Judicial Guardianship Engine (محرك الأوقاف والحراسة القضائية)
   - Endowments, guardianship, audit logs
   - Integrates: M83, M54, M46, M10, M109, M92

All tables follow the existing m##_ prefix convention with RLS enabled (single-tenant, no auth gating).
*/

-- ═══════════════════════════════════════════════
-- M23 — Distribution & Commercial Agencies Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m23_agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_number text NOT NULL UNIQUE,
  agency_title text NOT NULL,
  contract_type text DEFAULT 'distribution',
  stage text DEFAULT 'draft',
  status text DEFAULT 'pending',
  principal_name text NOT NULL,
  agent_name text NOT NULL,
  territory text,
  is_exclusive boolean DEFAULT false,
  commission_rate numeric(5,2) DEFAULT 0,
  franchise_agreement boolean DEFAULT false,
  brand_license_linked boolean DEFAULT false,
  registration_status text DEFAULT 'pending',
  expiry_date date,
  contract_value numeric(14,2) DEFAULT 0,
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m53_document_id text,
  m26_compliance_checked boolean DEFAULT false,
  m16_signed boolean DEFAULT false,
  m54_finance_linked boolean DEFAULT false,
  m10_deadlines_registered boolean DEFAULT false,
  m51_tasks_generated boolean DEFAULT false,
  m80_trademark_linked boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m23_agencies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m23_agencies" ON m23_agencies;
CREATE POLICY "anon_select_m23_agencies" ON m23_agencies FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m23_agencies" ON m23_agencies;
CREATE POLICY "anon_insert_m23_agencies" ON m23_agencies FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m23_agencies" ON m23_agencies;
CREATE POLICY "anon_update_m23_agencies" ON m23_agencies FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m23_agencies" ON m23_agencies;
CREATE POLICY "anon_delete_m23_agencies" ON m23_agencies FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m23_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m23_agencies(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m23_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m23_audit" ON m23_audit_logs;
CREATE POLICY "anon_select_m23_audit" ON m23_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m23_audit" ON m23_audit_logs;
CREATE POLICY "anon_insert_m23_audit" ON m23_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m23_audit" ON m23_audit_logs;
CREATE POLICY "anon_update_m23_audit" ON m23_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m23_audit" ON m23_audit_logs;
CREATE POLICY "anon_delete_m23_audit" ON m23_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m23_agencies_number ON m23_agencies(agency_number);
CREATE INDEX IF NOT EXISTS idx_m23_agencies_stage ON m23_agencies(stage);
CREATE INDEX IF NOT EXISTS idx_m23_audit_case ON m23_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m23_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m23_agencies_touch ON m23_agencies;
CREATE TRIGGER trg_m23_agencies_touch BEFORE UPDATE ON m23_agencies
  FOR EACH ROW EXECUTE FUNCTION m23_touch_updated_at();

-- ═══════════════════════════════════════════════
-- M24 — Maritime & Air Commerce Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m24_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_number text NOT NULL UNIQUE,
  shipment_title text NOT NULL,
  transport_mode text DEFAULT 'sea',
  stage text DEFAULT 'initiation',
  status text DEFAULT 'pending',
  carrier_name text NOT NULL,
  vessel_flight text,
  port_of_loading text,
  port_of_discharge text,
  bill_of_lading_number text,
  charter_party boolean DEFAULT false,
  incoterms text,
  cargo_description text,
  cargo_value numeric(14,2) DEFAULT 0,
  insurance_covered boolean DEFAULT false,
  insurance_amount numeric(14,2) DEFAULT 0,
  demurrage_claims numeric(14,2) DEFAULT 0,
  general_average_flag boolean DEFAULT false,
  expected_arrival date,
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m53_document_id text,
  m90_import_export_linked boolean DEFAULT false,
  m106_food_security_flag boolean DEFAULT false,
  m54_finance_linked boolean DEFAULT false,
  m10_case_opened boolean DEFAULT false,
  m51_tasks_generated boolean DEFAULT false,
  m109_biometric_required boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m24_shipments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m24_shipments" ON m24_shipments;
CREATE POLICY "anon_select_m24_shipments" ON m24_shipments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m24_shipments" ON m24_shipments;
CREATE POLICY "anon_insert_m24_shipments" ON m24_shipments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m24_shipments" ON m24_shipments;
CREATE POLICY "anon_update_m24_shipments" ON m24_shipments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m24_shipments" ON m24_shipments;
CREATE POLICY "anon_delete_m24_shipments" ON m24_shipments FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m24_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m24_shipments(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m24_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m24_audit" ON m24_audit_logs;
CREATE POLICY "anon_select_m24_audit" ON m24_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m24_audit" ON m24_audit_logs;
CREATE POLICY "anon_insert_m24_audit" ON m24_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m24_audit" ON m24_audit_logs;
CREATE POLICY "anon_update_m24_audit" ON m24_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m24_audit" ON m24_audit_logs;
CREATE POLICY "anon_delete_m24_audit" ON m24_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m24_shipments_number ON m24_shipments(shipment_number);
CREATE INDEX IF NOT EXISTS idx_m24_shipments_stage ON m24_shipments(stage);
CREATE INDEX IF NOT EXISTS idx_m24_audit_case ON m24_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m24_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m24_shipments_touch ON m24_shipments;
CREATE TRIGGER trg_m24_shipments_touch BEFORE UPDATE ON m24_shipments
  FOR EACH ROW EXECUTE FUNCTION m24_touch_updated_at();

-- ═══════════════════════════════════════════════
-- M25 — Strategic Finance & Investment Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m25_financings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  financing_number text NOT NULL UNIQUE,
  financing_title text NOT NULL,
  financing_type text DEFAULT 'loan',
  stage text DEFAULT 'initiation',
  status text DEFAULT 'pending',
  financier_name text NOT NULL,
  borrower_name text NOT NULL,
  principal_amount numeric(14,2) DEFAULT 0,
  interest_rate numeric(5,2) DEFAULT 0,
  grace_period_months integer DEFAULT 0,
  maturity_date date,
  collateral_description text,
  is_syndicated boolean DEFAULT false,
  is_ipo boolean DEFAULT false,
  risk_assessment text DEFAULT 'pending',
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m53_document_id text,
  m49_board_approved boolean DEFAULT false,
  m50_risk_assessed boolean DEFAULT false,
  m54_cost_center_opened boolean DEFAULT false,
  m10_deadlines_registered boolean DEFAULT false,
  m51_tasks_generated boolean DEFAULT false,
  m98_stock_exchange_linked boolean DEFAULT false,
  m109_biometric_required boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m25_financings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m25_financings" ON m25_financings;
CREATE POLICY "anon_select_m25_financings" ON m25_financings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m25_financings" ON m25_financings;
CREATE POLICY "anon_insert_m25_financings" ON m25_financings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m25_financings" ON m25_financings;
CREATE POLICY "anon_update_m25_financings" ON m25_financings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m25_financings" ON m25_financings;
CREATE POLICY "anon_delete_m25_financings" ON m25_financings FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m25_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m25_financings(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m25_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m25_audit" ON m25_audit_logs;
CREATE POLICY "anon_select_m25_audit" ON m25_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m25_audit" ON m25_audit_logs;
CREATE POLICY "anon_insert_m25_audit" ON m25_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m25_audit" ON m25_audit_logs;
CREATE POLICY "anon_update_m25_audit" ON m25_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m25_audit" ON m25_audit_logs;
CREATE POLICY "anon_delete_m25_audit" ON m25_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m25_financings_number ON m25_financings(financing_number);
CREATE INDEX IF NOT EXISTS idx_m25_financings_stage ON m25_financings(stage);
CREATE INDEX IF NOT EXISTS idx_m25_audit_case ON m25_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m25_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m25_financings_touch ON m25_financings;
CREATE TRIGGER trg_m25_financings_touch BEFORE UPDATE ON m25_financings
  FOR EACH ROW EXECUTE FUNCTION m25_touch_updated_at();

-- ═══════════════════════════════════════════════
-- M26 — Commercial Compliance & Antitrust Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m26_compliances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_number text NOT NULL UNIQUE,
  review_title text NOT NULL,
  review_type text DEFAULT 'contract_review',
  stage text DEFAULT 'triggered',
  status text DEFAULT 'active',
  target_contract_id text,
  target_deal_id text,
  market_share_pct numeric(5,2) DEFAULT 0,
  concentration_flag boolean DEFAULT false,
  antitrust_clearance boolean DEFAULT false,
  red_alert_triggered boolean DEFAULT false,
  sensitivity_points text,
  review_report text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m20_deal_linked boolean DEFAULT false,
  m23_agency_linked boolean DEFAULT false,
  m54_finance_checked boolean DEFAULT false,
  m10_deadlines_registered boolean DEFAULT false,
  m109_biometric_verified boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m26_compliances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m26_compliances" ON m26_compliances;
CREATE POLICY "anon_select_m26_compliances" ON m26_compliances FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m26_compliances" ON m26_compliances;
CREATE POLICY "anon_insert_m26_compliances" ON m26_compliances FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m26_compliances" ON m26_compliances;
CREATE POLICY "anon_update_m26_compliances" ON m26_compliances FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m26_compliances" ON m26_compliances;
CREATE POLICY "anon_delete_m26_compliances" ON m26_compliances FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m26_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m26_compliances(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m26_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m26_audit" ON m26_audit_logs;
CREATE POLICY "anon_select_m26_audit" ON m26_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m26_audit" ON m26_audit_logs;
CREATE POLICY "anon_insert_m26_audit" ON m26_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m26_audit" ON m26_audit_logs;
CREATE POLICY "anon_update_m26_audit" ON m26_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m26_audit" ON m26_audit_logs;
CREATE POLICY "anon_delete_m26_audit" ON m26_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m26_compliances_number ON m26_compliances(review_number);
CREATE INDEX IF NOT EXISTS idx_m26_compliances_stage ON m26_compliances(stage);
CREATE INDEX IF NOT EXISTS idx_m26_audit_case ON m26_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m26_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m26_compliances_touch ON m26_compliances;
CREATE TRIGGER trg_m26_compliances_touch BEFORE UPDATE ON m26_compliances
  FOR EACH ROW EXECUTE FUNCTION m26_touch_updated_at();

-- ═══════════════════════════════════════════════
-- M27 — Inheritance, Wills & Estate Liquidation Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m27_estates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_number text NOT NULL UNIQUE,
  deceased_name text NOT NULL,
  death_date date,
  stage text DEFAULT 'intake',
  status text DEFAULT 'active',
  total_assets numeric(14,2) DEFAULT 0,
  total_debts numeric(14,2) DEFAULT 0,
  net_estate numeric(14,2) DEFAULT 0,
  school_of_thought text DEFAULT 'hanafi',
  will_present boolean DEFAULT false,
  minors_involved boolean DEFAULT false,
  heirs_count integer DEFAULT 0,
  liquidation_status text DEFAULT 'pending',
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m83_assets_inventoried boolean DEFAULT false,
  m98_stocks_valued boolean DEFAULT false,
  m54_trust_account_opened boolean DEFAULT false,
  m46_zakat_calculated boolean DEFAULT false,
  m22_properties_transferred boolean DEFAULT false,
  m10_deadlines_registered boolean DEFAULT false,
  m109_biometric_verified boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m27_estates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m27_estates" ON m27_estates;
CREATE POLICY "anon_select_m27_estates" ON m27_estates FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m27_estates" ON m27_estates;
CREATE POLICY "anon_insert_m27_estates" ON m27_estates FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m27_estates" ON m27_estates;
CREATE POLICY "anon_update_m27_estates" ON m27_estates FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m27_estates" ON m27_estates;
CREATE POLICY "anon_delete_m27_estates" ON m27_estates FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m27_heirs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id uuid REFERENCES m27_estates(id) ON DELETE CASCADE,
  heir_name text NOT NULL,
  relationship text,
  share_fraction text,
  share_percentage numeric(5,2) DEFAULT 0,
  share_amount numeric(14,2) DEFAULT 0,
  is_minor boolean DEFAULT false,
  guardian_name text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m27_heirs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m27_heirs" ON m27_heirs;
CREATE POLICY "anon_select_m27_heirs" ON m27_heirs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m27_heirs" ON m27_heirs;
CREATE POLICY "anon_insert_m27_heirs" ON m27_heirs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m27_heirs" ON m27_heirs;
CREATE POLICY "anon_update_m27_heirs" ON m27_heirs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m27_heirs" ON m27_heirs;
CREATE POLICY "anon_delete_m27_heirs" ON m27_heirs FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m27_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m27_estates(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m27_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m27_audit" ON m27_audit_logs;
CREATE POLICY "anon_select_m27_audit" ON m27_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m27_audit" ON m27_audit_logs;
CREATE POLICY "anon_insert_m27_audit" ON m27_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m27_audit" ON m27_audit_logs;
CREATE POLICY "anon_update_m27_audit" ON m27_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m27_audit" ON m27_audit_logs;
CREATE POLICY "anon_delete_m27_audit" ON m27_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m27_estates_number ON m27_estates(estate_number);
CREATE INDEX IF NOT EXISTS idx_m27_estates_stage ON m27_estates(stage);
CREATE INDEX IF NOT EXISTS idx_m27_heirs_estate ON m27_heirs(estate_id);
CREATE INDEX IF NOT EXISTS idx_m27_audit_case ON m27_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m27_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m27_estates_touch ON m27_estates;
CREATE TRIGGER trg_m27_estates_touch BEFORE UPDATE ON m27_estates
  FOR EACH ROW EXECUTE FUNCTION m27_touch_updated_at();

-- ═══════════════════════════════════════════════
-- M28 — Endowments & Judicial Guardianship Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS m28_endowments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endowment_number text NOT NULL UNIQUE,
  endowment_title text NOT NULL,
  endowment_type text DEFAULT 'family',
  stage text DEFAULT 'intake',
  status text DEFAULT 'active',
  endower_name text NOT NULL,
  guardian_name text,
  beneficiary_purpose text,
  annual_revenue numeric(14,2) DEFAULT 0,
  annual_expenses numeric(14,2) DEFAULT 0,
  net_revenue numeric(14,2) DEFAULT 0,
  reporting_frequency text DEFAULT 'quarterly',
  next_report_date date,
  termination_status text DEFAULT 'active',
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m83_assets_valued boolean DEFAULT false,
  m54_trust_account_opened boolean DEFAULT false,
  m46_fatwa_referenced boolean DEFAULT false,
  m10_case_linked boolean DEFAULT false,
  m109_biometric_required boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE m28_endowments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m28_endowments" ON m28_endowments;
CREATE POLICY "anon_select_m28_endowments" ON m28_endowments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m28_endowments" ON m28_endowments;
CREATE POLICY "anon_insert_m28_endowments" ON m28_endowments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m28_endowments" ON m28_endowments;
CREATE POLICY "anon_update_m28_endowments" ON m28_endowments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m28_endowments" ON m28_endowments;
CREATE POLICY "anon_delete_m28_endowments" ON m28_endowments FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m28_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m28_endowments(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE m28_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m28_audit" ON m28_audit_logs;
CREATE POLICY "anon_select_m28_audit" ON m28_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m28_audit" ON m28_audit_logs;
CREATE POLICY "anon_insert_m28_audit" ON m28_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m28_audit" ON m28_audit_logs;
CREATE POLICY "anon_update_m28_audit" ON m28_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m28_audit" ON m28_audit_logs;
CREATE POLICY "anon_delete_m28_audit" ON m28_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m28_endowments_number ON m28_endowments(endowment_number);
CREATE INDEX IF NOT EXISTS idx_m28_endowments_stage ON m28_endowments(stage);
CREATE INDEX IF NOT EXISTS idx_m28_audit_case ON m28_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m28_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_m28_endowments_touch ON m28_endowments;
CREATE TRIGGER trg_m28_endowments_touch BEFORE UPDATE ON m28_endowments
  FOR EACH ROW EXECUTE FUNCTION m28_touch_updated_at();

-- ═══════════════════════════════════════════════
-- Seed Data
-- ═══════════════════════════════════════════════

INSERT INTO m23_agencies (agency_number, agency_title, contract_type, stage, status, principal_name, agent_name, territory, is_exclusive, commission_rate, franchise_agreement, contract_value, description)
VALUES ('AGY-2026-001', 'وكالة توزيع المنتجات الالكترونية', 'distribution', 'draft', 'pending', 'المؤسسة السيادية', 'شركة التوزيع المتحد', 'المنطقة الشمالية', true, 12.50, false, 500000, 'عقد توزيع حصري للمنتجات الالكترونية')
ON CONFLICT DO NOTHING;

INSERT INTO m24_shipments (shipment_number, shipment_title, transport_mode, stage, status, carrier_name, vessel_flight, port_of_loading, port_of_discharge, bill_of_lading_number, incoterms, cargo_value, insurance_covered, insurance_amount, description)
VALUES ('SHP-2026-001', 'شحنة معدات صناعية من الصين', 'sea', 'initiation', 'pending', 'Maersk Line', 'MV Sovereign', 'شنغهاي', 'ميناء الدمياط', 'BL-2026-7841', 'CIF', 1200000, true, 50000, 'شحنة معدات صناعية بتأمين شامل')
ON CONFLICT DO NOTHING;

INSERT INTO m25_financings (financing_number, financing_title, financing_type, stage, status, financier_name, borrower_name, principal_amount, interest_rate, grace_period_months, description)
VALUES ('FIN-2026-001', 'اتفاقية تمويل استراتيجي لتوسعة المصنع', 'loan', 'initiation', 'pending', 'البنك السيادي الوطني', 'المؤسسة الصناعية السيادية', 10000000, 5.50, 6, 'قرض مشترك لتمويل التوسعة الصناعية')
ON CONFLICT DO NOTHING;

INSERT INTO m26_compliances (review_number, review_title, review_type, stage, status, market_share_pct, concentration_flag, antitrust_clearance, description)
VALUES ('CMP-2026-001', 'فحص امتثال عقد الوكالة الحصري', 'contract_review', 'triggered', 'active', 35.00, false, true, 'فحص امتثال عقد التوزيع الحصري لقواعد المنافسة')
ON CONFLICT DO NOTHING;

INSERT INTO m27_estates (estate_number, deceased_name, death_date, stage, status, total_assets, total_debts, net_estate, school_of_thought, will_present, heirs_count, description)
VALUES ('EST-2026-001', 'المرحوم محمد عبد الله السيادي', '2026-06-15', 'intake', 'active', 15000000, 2000000, 13000000, 'hanafi', true, 5, 'تصفية تركة تشمل عقارات وأسهم')
ON CONFLICT DO NOTHING;

INSERT INTO m27_heirs (estate_id, heir_name, relationship, share_fraction, share_percentage, share_amount, is_minor)
SELECT id, 'أحمد محمد السيادي', 'ابن', '1/2', 50.00, 6500000, false
FROM m27_estates WHERE estate_number='EST-2026-001' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO m28_endowments (endowment_number, endowment_title, endowment_type, stage, status, endower_name, beneficiary_purpose, annual_revenue, annual_expenses, net_revenue, description)
VALUES ('WQF-2026-001', 'وقف العائلة السيادي الخيري', 'family', 'intake', 'active', 'المرحوم عبد الله السيادي', 'إنفاق على الأيتام وطلاب العلم', 500000, 150000, 350000, 'وقف خيري لإدارة ريعه لصالح الأيتام')
ON CONFLICT DO NOTHING;
