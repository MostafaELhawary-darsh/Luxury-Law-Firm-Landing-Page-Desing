/*
# Create capital reserve management tables

Implements:
- 4 governing factors (collection lag, seasonality, fixed overhead, bad debt risk)
- 4 financial indicators (OpEx coverage, DSO, quick ratio, realization rate)
- 2 holdback policies (fixed percentage, dynamic)
- Quarterly reserve history tracking

1. New Tables:
- `lf_reserve_factors`: Governing factors with risk scores
- `lf_financial_indicators`: The 4 key metrics with thresholds and status
- `lf_holdback_policies`: Active holdback policy configuration
- `lf_reserve_history`: Quarterly reserve balance tracking
- `lf_opex_items`: Fixed overhead expense items

2. Security: RLS enabled, anon+authenticated full CRUD.
*/

-- RESERVE FACTORS (governing factors)
CREATE TABLE IF NOT EXISTS lf_reserve_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factor_key text NOT NULL UNIQUE,
  factor_name text NOT NULL,
  factor_value numeric(14,2) NOT NULL DEFAULT 0,
  risk_score numeric(5,2) DEFAULT 0,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lf_reserve_factors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lf_rf" ON lf_reserve_factors;
CREATE POLICY "anon_select_lf_rf" ON lf_reserve_factors FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lf_rf" ON lf_reserve_factors;
CREATE POLICY "anon_insert_lf_rf" ON lf_reserve_factors FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lf_rf" ON lf_reserve_factors;
CREATE POLICY "anon_update_lf_rf" ON lf_reserve_factors FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lf_rf" ON lf_reserve_factors;
CREATE POLICY "anon_delete_lf_rf" ON lf_reserve_factors FOR DELETE TO anon, authenticated USING (true);

-- FINANCIAL INDICATORS
CREATE TABLE IF NOT EXISTS lf_financial_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_key text NOT NULL UNIQUE,
  indicator_name text NOT NULL,
  current_value numeric(14,2) NOT NULL DEFAULT 0,
  target_min numeric(14,2),
  target_max numeric(14,2),
  unit text DEFAULT '',
  status text DEFAULT 'ضمن الحدود',
  recommendation text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lf_financial_indicators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lf_fi" ON lf_financial_indicators;
CREATE POLICY "anon_select_lf_fi" ON lf_financial_indicators FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lf_fi" ON lf_financial_indicators;
CREATE POLICY "anon_insert_lf_fi" ON lf_financial_indicators FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lf_fi" ON lf_financial_indicators;
CREATE POLICY "anon_update_lf_fi" ON lf_financial_indicators FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lf_fi" ON lf_financial_indicators;
CREATE POLICY "anon_delete_lf_fi" ON lf_financial_indicators FOR DELETE TO anon, authenticated USING (true);

-- HOLDBACK POLICIES
CREATE TABLE IF NOT EXISTS lf_holdback_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_type text NOT NULL,
  policy_name text NOT NULL,
  is_active boolean DEFAULT false,
  fixed_percentage numeric(5,2) DEFAULT 15,
  target_coverage_months int DEFAULT 4,
  dynamic_quarterly_threshold numeric(14,2) DEFAULT 0,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lf_holdback_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lf_hp" ON lf_holdback_policies;
CREATE POLICY "anon_select_lf_hp" ON lf_holdback_policies FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lf_hp" ON lf_holdback_policies;
CREATE POLICY "anon_insert_lf_hp" ON lf_holdback_policies FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lf_hp" ON lf_holdback_policies;
CREATE POLICY "anon_update_lf_hp" ON lf_holdback_policies FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lf_hp" ON lf_holdback_policies;
CREATE POLICY "anon_delete_lf_hp" ON lf_holdback_policies FOR DELETE TO anon, authenticated USING (true);

-- RESERVE HISTORY (quarterly tracking)
CREATE TABLE IF NOT EXISTS lf_reserve_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year int NOT NULL,
  quarter int NOT NULL,
  opening_balance numeric(14,2) DEFAULT 0,
  holdback_amount numeric(14,2) DEFAULT 0,
  distributed_amount numeric(14,2) DEFAULT 0,
  closing_balance numeric(14,2) DEFAULT 0,
  operating_bank_balance numeric(14,2) DEFAULT 0,
  total_opex numeric(14,2) DEFAULT 0,
  coverage_months numeric(5,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lf_reserve_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lf_rh" ON lf_reserve_history;
CREATE POLICY "anon_select_lf_rh" ON lf_reserve_history FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lf_rh" ON lf_reserve_history;
CREATE POLICY "anon_insert_lf_rh" ON lf_reserve_history FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lf_rh" ON lf_reserve_history;
CREATE POLICY "anon_update_lf_rh" ON lf_reserve_history FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lf_rh" ON lf_reserve_history;
CREATE POLICY "anon_delete_lf_rh" ON lf_reserve_history FOR DELETE TO anon, authenticated USING (true);

-- OPEX ITEMS (fixed overhead)
CREATE TABLE IF NOT EXISTS lf_opex_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  description text NOT NULL,
  monthly_amount numeric(14,2) NOT NULL DEFAULT 0,
  is_fixed boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lf_opex_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lf_opex" ON lf_opex_items;
CREATE POLICY "anon_select_lf_opex" ON lf_opex_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lf_opex" ON lf_opex_items;
CREATE POLICY "anon_insert_lf_opex" ON lf_opex_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lf_opex" ON lf_opex_items;
CREATE POLICY "anon_update_lf_opex" ON lf_opex_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lf_opex" ON lf_opex_items;
CREATE POLICY "anon_delete_lf_opex" ON lf_opex_items FOR DELETE TO anon, authenticated USING (true);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_lf_rh_year_quarter ON lf_reserve_history(year, quarter);
