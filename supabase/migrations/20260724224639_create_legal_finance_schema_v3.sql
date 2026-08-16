/*
# Create legal financial management tables for law firm (v3)

Fixes circular FK: lf_time_entries <-> lf_invoice_items.
Creates tables without cross-references first, then adds FKs via ALTER TABLE.

1. New Tables:
- lf_clients, lf_attorneys, lf_matters, lf_fee_agreements
- lf_invoices, lf_time_entries (no circular FK initially)
- lf_invoice_items, lf_trust_accounts, lf_trust_transactions
- lf_disbursements, lf_partners, lf_partner_draws
2. Security: RLS enabled, anon+authenticated full CRUD on all tables.
*/

-- CLIENTS
CREATE TABLE IF NOT EXISTS lf_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, company text, email text, phone text,
  credit_limit numeric(14,2) DEFAULT 0,
  payment_terms_days int DEFAULT 30,
  status text DEFAULT 'نشط',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE lf_clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lf_clients" ON lf_clients;
CREATE POLICY "anon_select_lf_clients" ON lf_clients FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lf_clients" ON lf_clients;
CREATE POLICY "anon_insert_lf_clients" ON lf_clients FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lf_clients" ON lf_clients;
CREATE POLICY "anon_update_lf_clients" ON lf_clients FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lf_clients" ON lf_clients;
CREATE POLICY "anon_delete_lf_clients" ON lf_clients FOR DELETE TO anon, authenticated USING (true);

-- ATTORNEYS
CREATE TABLE IF NOT EXISTS lf_attorneys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL DEFAULT 'محامي مشارك',
  hourly_rate numeric(10,2) NOT NULL DEFAULT 500,
  target_hours numeric(6,1) DEFAULT 180,
  is_partner boolean DEFAULT false,
  email text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE lf_attorneys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lf_attorneys" ON lf_attorneys;
CREATE POLICY "anon_select_lf_attorneys" ON lf_attorneys FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lf_attorneys" ON lf_attorneys;
CREATE POLICY "anon_insert_lf_attorneys" ON lf_attorneys FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lf_attorneys" ON lf_attorneys;
CREATE POLICY "anon_update_lf_attorneys" ON lf_attorneys FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lf_attorneys" ON lf_attorneys;
CREATE POLICY "anon_delete_lf_attorneys" ON lf_attorneys FOR DELETE TO anon, authenticated USING (true);

-- MATTERS
CREATE TABLE IF NOT EXISTS lf_matters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_code text NOT NULL UNIQUE,
  title text NOT NULL,
  client_id uuid REFERENCES lf_clients(id) ON DELETE SET NULL,
  originating_partner_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  responsible_attorney_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  status text DEFAULT 'مفتوح',
  opened_date date DEFAULT now()::date,
  closed_date date,
  work_suspended boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE lf_matters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lf_matters" ON lf_matters;
CREATE POLICY "anon_select_lf_matters" ON lf_matters FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lf_matters" ON lf_matters;
CREATE POLICY "anon_insert_lf_matters" ON lf_matters FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lf_matters" ON lf_matters;
CREATE POLICY "anon_update_lf_matters" ON lf_matters FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lf_matters" ON lf_matters;
CREATE POLICY "anon_delete_lf_matters" ON lf_matters FOR DELETE TO anon, authenticated USING (true);

-- FEE AGREEMENTS
CREATE TABLE IF NOT EXISTS lf_fee_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid REFERENCES lf_matters(id) ON DELETE CASCADE,
  fee_type text NOT NULL DEFAULT 'hourly',
  hourly_rate numeric(10,2),
  fixed_amount numeric(14,2),
  contingency_percentage numeric(5,2),
  monthly_retainer numeric(14,2),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE lf_fee_agreements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lf_fee" ON lf_fee_agreements;
CREATE POLICY "anon_select_lf_fee" ON lf_fee_agreements FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lf_fee" ON lf_fee_agreements;
CREATE POLICY "anon_insert_lf_fee" ON lf_fee_agreements FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lf_fee" ON lf_fee_agreements;
CREATE POLICY "anon_update_lf_fee" ON lf_fee_agreements FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lf_fee" ON lf_fee_agreements;
CREATE POLICY "anon_delete_lf_fee" ON lf_fee_agreements FOR DELETE TO anon, authenticated USING (true);

-- INVOICES (no FK to time_entries)
CREATE TABLE IF NOT EXISTS lf_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  matter_id uuid REFERENCES lf_matters(id) ON DELETE CASCADE,
  client_id uuid REFERENCES lf_clients(id) ON DELETE SET NULL,
  issue_date date NOT NULL DEFAULT now()::date,
  due_date date NOT NULL DEFAULT (now()::date + 30),
  subtotal numeric(14,2) DEFAULT 0,
  disbursements_total numeric(14,2) DEFAULT 0,
  total numeric(14,2) DEFAULT 0,
  amount_paid numeric(14,2) DEFAULT 0,
  status text DEFAULT 'مرسلة',
  trust_transfer_done boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE lf_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lf_invoices" ON lf_invoices;
CREATE POLICY "anon_select_lf_invoices" ON lf_invoices FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lf_invoices" ON lf_invoices;
CREATE POLICY "anon_insert_lf_invoices" ON lf_invoices FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lf_invoices" ON lf_invoices;
CREATE POLICY "anon_update_lf_invoices" ON lf_invoices FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lf_invoices" ON lf_invoices;
CREATE POLICY "anon_delete_lf_invoices" ON lf_invoices FOR DELETE TO anon, authenticated USING (true);

-- TIME ENTRIES (no FK to invoices yet — added via ALTER later)
CREATE TABLE IF NOT EXISTS lf_time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid REFERENCES lf_matters(id) ON DELETE CASCADE,
  attorney_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  entry_date date NOT NULL DEFAULT now()::date,
  hours numeric(5,2) NOT NULL,
  description text,
  is_billable boolean DEFAULT true,
  rate numeric(10,2),
  invoiced boolean DEFAULT false,
  invoice_id uuid,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE lf_time_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lf_time" ON lf_time_entries;
CREATE POLICY "anon_select_lf_time" ON lf_time_entries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lf_time" ON lf_time_entries;
CREATE POLICY "anon_insert_lf_time" ON lf_time_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lf_time" ON lf_time_entries;
CREATE POLICY "anon_update_lf_time" ON lf_time_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lf_time" ON lf_time_entries;
CREATE POLICY "anon_delete_lf_time" ON lf_time_entries FOR DELETE TO anon, authenticated USING (true);

-- Add FK from time_entries to invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'lf_time_entries_invoice_id_fkey'
    AND table_name = 'lf_time_entries'
  ) THEN
    ALTER TABLE lf_time_entries
    ADD CONSTRAINT lf_time_entries_invoice_id_fkey
    FOREIGN KEY (invoice_id) REFERENCES lf_invoices(id) ON DELETE SET NULL;
  END IF;
END $$;

-- INVOICE ITEMS (now both tables exist)
CREATE TABLE IF NOT EXISTS lf_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES lf_invoices(id) ON DELETE CASCADE,
  time_entry_id uuid REFERENCES lf_time_entries(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity numeric(5,2),
  rate numeric(10,2),
  amount numeric(14,2) NOT NULL,
  item_type text DEFAULT 'fee',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE lf_invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lf_inv_items" ON lf_invoice_items;
CREATE POLICY "anon_select_lf_inv_items" ON lf_invoice_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lf_inv_items" ON lf_invoice_items;
CREATE POLICY "anon_insert_lf_inv_items" ON lf_invoice_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lf_inv_items" ON lf_invoice_items;
CREATE POLICY "anon_update_lf_inv_items" ON lf_invoice_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lf_inv_items" ON lf_invoice_items;
CREATE POLICY "anon_delete_lf_inv_items" ON lf_invoice_items FOR DELETE TO anon, authenticated USING (true);

-- TRUST ACCOUNTS
CREATE TABLE IF NOT EXISTS lf_trust_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name text NOT NULL,
  account_number text,
  bank_name text,
  balance numeric(14,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE lf_trust_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lf_trust" ON lf_trust_accounts;
CREATE POLICY "anon_select_lf_trust" ON lf_trust_accounts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lf_trust" ON lf_trust_accounts;
CREATE POLICY "anon_insert_lf_trust" ON lf_trust_accounts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lf_trust" ON lf_trust_accounts;
CREATE POLICY "anon_update_lf_trust" ON lf_trust_accounts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lf_trust" ON lf_trust_accounts;
CREATE POLICY "anon_delete_lf_trust" ON lf_trust_accounts FOR DELETE TO anon, authenticated USING (true);

-- TRUST TRANSACTIONS
CREATE TABLE IF NOT EXISTS lf_trust_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_account_id uuid REFERENCES lf_trust_accounts(id) ON DELETE CASCADE,
  matter_id uuid REFERENCES lf_matters(id) ON DELETE CASCADE,
  client_id uuid REFERENCES lf_clients(id) ON DELETE SET NULL,
  transaction_type text NOT NULL,
  amount numeric(14,2) NOT NULL,
  transaction_date date NOT NULL DEFAULT now()::date,
  description text,
  linked_invoice_id uuid,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE lf_trust_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lf_trust_tx" ON lf_trust_transactions;
CREATE POLICY "anon_select_lf_trust_tx" ON lf_trust_transactions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lf_trust_tx" ON lf_trust_transactions;
CREATE POLICY "anon_insert_lf_trust_tx" ON lf_trust_transactions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lf_trust_tx" ON lf_trust_transactions;
CREATE POLICY "anon_update_lf_trust_tx" ON lf_trust_transactions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lf_trust_tx" ON lf_trust_transactions;
CREATE POLICY "anon_delete_lf_trust_tx" ON lf_trust_transactions FOR DELETE TO anon, authenticated USING (true);

-- DISBURSEMENTS
CREATE TABLE IF NOT EXISTS lf_disbursements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid REFERENCES lf_matters(id) ON DELETE CASCADE,
  category text NOT NULL,
  description text,
  amount numeric(14,2) NOT NULL,
  expense_date date NOT NULL DEFAULT now()::date,
  reimbursed boolean DEFAULT false,
  invoice_id uuid REFERENCES lf_invoices(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE lf_disbursements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lf_disb" ON lf_disbursements;
CREATE POLICY "anon_select_lf_disb" ON lf_disbursements FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lf_disb" ON lf_disbursements;
CREATE POLICY "anon_insert_lf_disb" ON lf_disbursements FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lf_disb" ON lf_disbursements;
CREATE POLICY "anon_update_lf_disb" ON lf_disbursements FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lf_disb" ON lf_disbursements;
CREATE POLICY "anon_delete_lf_disb" ON lf_disbursements FOR DELETE TO anon, authenticated USING (true);

-- PARTNERS
CREATE TABLE IF NOT EXISTS lf_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attorney_id uuid REFERENCES lf_attorneys(id) ON DELETE CASCADE,
  equity_share numeric(5,2) DEFAULT 0,
  origination_credit numeric(5,2) DEFAULT 0,
  production_credit numeric(5,2) DEFAULT 0,
  supervision_credit numeric(5,2) DEFAULT 0,
  ytd_revenue numeric(14,2) DEFAULT 0,
  ytd_draws numeric(14,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE lf_partners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lf_partners" ON lf_partners;
CREATE POLICY "anon_select_lf_partners" ON lf_partners FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lf_partners" ON lf_partners;
CREATE POLICY "anon_insert_lf_partners" ON lf_partners FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lf_partners" ON lf_partners;
CREATE POLICY "anon_update_lf_partners" ON lf_partners FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lf_partners" ON lf_partners;
CREATE POLICY "anon_delete_lf_partners" ON lf_partners FOR DELETE TO anon, authenticated USING (true);

-- PARTNER DRAWS
CREATE TABLE IF NOT EXISTS lf_partner_draws (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES lf_partners(id) ON DELETE CASCADE,
  draw_date date NOT NULL DEFAULT now()::date,
  amount numeric(14,2) NOT NULL,
  period text DEFAULT 'monthly',
  settled boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE lf_partner_draws ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lf_draws" ON lf_partner_draws;
CREATE POLICY "anon_select_lf_draws" ON lf_partner_draws FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lf_draws" ON lf_partner_draws;
CREATE POLICY "anon_insert_lf_draws" ON lf_partner_draws FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lf_draws" ON lf_partner_draws;
CREATE POLICY "anon_update_lf_draws" ON lf_partner_draws FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lf_draws" ON lf_partner_draws;
CREATE POLICY "anon_delete_lf_draws" ON lf_partner_draws FOR DELETE TO anon, authenticated USING (true);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_lf_matters_client ON lf_matters(client_id);
CREATE INDEX IF NOT EXISTS idx_lf_time_matter ON lf_time_entries(matter_id);
CREATE INDEX IF NOT EXISTS idx_lf_time_attorney ON lf_time_entries(attorney_id);
CREATE INDEX IF NOT EXISTS idx_lf_trust_tx_matter ON lf_trust_transactions(matter_id);
CREATE INDEX IF NOT EXISTS idx_lf_invoices_matter ON lf_invoices(matter_id);
CREATE INDEX IF NOT EXISTS idx_lf_invoices_client ON lf_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_lf_disb_matter ON lf_disbursements(matter_id);
CREATE INDEX IF NOT EXISTS idx_lf_draws_partner ON lf_partner_draws(partner_id);
