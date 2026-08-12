/*
# Create partner compensation distribution tables (v2 - fixed typo)

Implements 4 compensation models + 3 accounting mechanisms.
1. New Tables: lf_comp_models, lf_partner_points, lf_invoice_roles,
   lf_bonus_pool_evals, lf_capital_reserves, lf_year_end_settlements, lf_comp_journal_entries
2. Security: RLS enabled, anon+authenticated full CRUD.
*/

-- COMPENSATION MODELS CONFIG
CREATE TABLE IF NOT EXISTS lf_comp_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type text NOT NULL,
  model_name text NOT NULL,
  is_active boolean DEFAULT false,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE lf_comp_models ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lf_comp_models" ON lf_comp_models;
CREATE POLICY "anon_select_lf_comp_models" ON lf_comp_models FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lf_comp_models" ON lf_comp_models;
CREATE POLICY "anon_insert_lf_comp_models" ON lf_comp_models FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lf_comp_models" ON lf_comp_models;
CREATE POLICY "anon_update_lf_comp_models" ON lf_comp_models FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lf_comp_models" ON lf_comp_models;
CREATE POLICY "anon_delete_lf_comp_models" ON lf_comp_models FOR DELETE TO anon, authenticated USING (true);

-- PARTNER POINTS (Lockstep)
CREATE TABLE IF NOT EXISTS lf_partner_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES lf_partners(id) ON DELETE CASCADE,
  year int NOT NULL DEFAULT EXTRACT(year FROM now())::int,
  points int NOT NULL DEFAULT 10,
  max_points int DEFAULT 50,
  years_as_partner int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE lf_partner_points ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lf_ppoints" ON lf_partner_points;
CREATE POLICY "anon_select_lf_ppoints" ON lf_partner_points FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lf_ppoints" ON lf_partner_points;
CREATE POLICY "anon_insert_lf_ppoints" ON lf_partner_points FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lf_ppoints" ON lf_partner_points;
CREATE POLICY "anon_update_lf_ppoints" ON lf_partner_points FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lf_ppoints" ON lf_partner_points;
CREATE POLICY "anon_delete_lf_ppoints" ON lf_partner_points FOR DELETE TO anon, authenticated USING (true);

-- INVOICE ROLES (Hale & Dorr 3-role)
CREATE TABLE IF NOT EXISTS lf_invoice_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES lf_invoices(id) ON DELETE CASCADE,
  finder_attorney_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  finder_percentage numeric(5,2) DEFAULT 15,
  minder_attorney_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  minder_percentage numeric(5,2) DEFAULT 15,
  grinder_attorney_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  grinder_percentage numeric(5,2) DEFAULT 60,
  firm_reserve_percentage numeric(5,2) DEFAULT 10,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE lf_invoice_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lf_inv_roles" ON lf_invoice_roles;
CREATE POLICY "anon_select_lf_inv_roles" ON lf_invoice_roles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lf_inv_roles" ON lf_invoice_roles;
CREATE POLICY "anon_insert_lf_inv_roles" ON lf_invoice_roles FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lf_inv_roles" ON lf_invoice_roles;
CREATE POLICY "anon_update_lf_inv_roles" ON lf_invoice_roles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lf_inv_roles" ON lf_invoice_roles;
CREATE POLICY "anon_delete_lf_inv_roles" ON lf_invoice_roles FOR DELETE TO anon, authenticated USING (true);

-- BONUS POOL EVALUATIONS (Hybrid)
CREATE TABLE IF NOT EXISTS lf_bonus_pool_evals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES lf_partners(id) ON DELETE CASCADE,
  year int NOT NULL DEFAULT EXTRACT(year FROM now())::int,
  new_clients_brought int DEFAULT 0,
  billable_hours numeric(6,1) DEFAULT 0,
  cross_sell_score numeric(5,2) DEFAULT 0,
  client_retention_score numeric(5,2) DEFAULT 0,
  leadership_score numeric(5,2) DEFAULT 0,
  bonus_score numeric(5,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE lf_bonus_pool_evals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lf_bonus" ON lf_bonus_pool_evals;
CREATE POLICY "anon_select_lf_bonus" ON lf_bonus_pool_evals FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lf_bonus" ON lf_bonus_pool_evals;
CREATE POLICY "anon_insert_lf_bonus" ON lf_bonus_pool_evals FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lf_bonus" ON lf_bonus_pool_evals;
CREATE POLICY "anon_update_lf_bonus" ON lf_bonus_pool_evals FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lf_bonus" ON lf_bonus_pool_evals;
CREATE POLICY "anon_delete_lf_bonus" ON lf_bonus_pool_evals FOR DELETE TO anon, authenticated USING (true);

-- CAPITAL RESERVES (Holdback)
CREATE TABLE IF NOT EXISTS lf_capital_reserves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year int NOT NULL DEFAULT EXTRACT(year FROM now())::int,
  total_profit numeric(14,2) NOT NULL DEFAULT 0,
  holdback_percentage numeric(5,2) DEFAULT 15,
  holdback_amount numeric(14,2) DEFAULT 0,
  distributable_amount numeric(14,2) DEFAULT 0,
  status text DEFAULT 'محتسب',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE lf_capital_reserves ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lf_reserves" ON lf_capital_reserves;
CREATE POLICY "anon_select_lf_reserves" ON lf_capital_reserves FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lf_reserves" ON lf_capital_reserves;
CREATE POLICY "anon_insert_lf_reserves" ON lf_capital_reserves FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lf_reserves" ON lf_capital_reserves;
CREATE POLICY "anon_update_lf_reserves" ON lf_capital_reserves FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lf_reserves" ON lf_capital_reserves;
CREATE POLICY "anon_delete_lf_reserves" ON lf_capital_reserves FOR DELETE TO anon, authenticated USING (true);

-- YEAR-END SETTLEMENTS (True-Up)
CREATE TABLE IF NOT EXISTS lf_year_end_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES lf_partners(id) ON DELETE CASCADE,
  year int NOT NULL DEFAULT EXTRACT(year FROM now())::int,
  model_type text NOT NULL,
  earned_amount numeric(14,2) DEFAULT 0,
  total_draws numeric(14,2) DEFAULT 0,
  holdback_deducted numeric(14,2) DEFAULT 0,
  net_payable numeric(14,2) DEFAULT 0,
  settlement_status text DEFAULT 'بانتظار',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE lf_year_end_settlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lf_settlements" ON lf_year_end_settlements;
CREATE POLICY "anon_select_lf_settlements" ON lf_year_end_settlements FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lf_settlements" ON lf_year_end_settlements;
CREATE POLICY "anon_insert_lf_settlements" ON lf_year_end_settlements FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lf_settlements" ON lf_year_end_settlements;
CREATE POLICY "anon_update_lf_settlements" ON lf_year_end_settlements FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lf_settlements" ON lf_year_end_settlements;
CREATE POLICY "anon_delete_lf_settlements" ON lf_year_end_settlements FOR DELETE TO anon, authenticated USING (true);

-- COMPENSATION JOURNAL ENTRIES
CREATE TABLE IF NOT EXISTS lf_comp_journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number text NOT NULL UNIQUE,
  entry_type text NOT NULL,
  description text NOT NULL,
  partner_name text,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  debit_account text,
  credit_account text,
  entry_date date NOT NULL DEFAULT now()::date,
  is_posted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE lf_comp_journal_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lf_comp_journal" ON lf_comp_journal_entries;
CREATE POLICY "anon_select_lf_comp_journal" ON lf_comp_journal_entries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lf_comp_journal" ON lf_comp_journal_entries;
CREATE POLICY "anon_insert_lf_comp_journal" ON lf_comp_journal_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lf_comp_journal" ON lf_comp_journal_entries;
CREATE POLICY "anon_update_lf_comp_journal" ON lf_comp_journal_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lf_comp_journal" ON lf_comp_journal_entries;
CREATE POLICY "anon_delete_lf_comp_journal" ON lf_comp_journal_entries FOR DELETE TO anon, authenticated USING (true);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_lf_ppoints_partner ON lf_partner_points(partner_id);
CREATE INDEX IF NOT EXISTS idx_lf_inv_roles_invoice ON lf_invoice_roles(invoice_id);
CREATE INDEX IF NOT EXISTS idx_lf_bonus_partner ON lf_bonus_pool_evals(partner_id);
CREATE INDEX IF NOT EXISTS idx_lf_settlements_partner ON lf_year_end_settlements(partner_id);
CREATE INDEX IF NOT EXISTS idx_lf_comp_journal_type ON lf_comp_journal_entries(entry_type);
