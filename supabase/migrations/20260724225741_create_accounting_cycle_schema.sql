/*
# Create accounting cycle tables for law firm trust-to-operating transfer

1. New Tables:
- `lf_chart_of_accounts`: Chart of accounts with codes (trust bank, operating bank, client receivables, trust liability, fee revenue, VAT, disbursements)
- `lf_journal_entries`: Journal entry headers with stage tracking
- `lf_journal_lines`: Individual debit/credit lines per journal entry

2. Security: RLS enabled, anon+authenticated full CRUD.
*/

-- CHART OF ACCOUNTS
CREATE TABLE IF NOT EXISTS lf_chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code text NOT NULL UNIQUE,
  account_name text NOT NULL,
  account_type text NOT NULL,
  is_trust_account boolean DEFAULT false,
  normal_balance text DEFAULT 'debit',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lf_chart_of_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lf_coa" ON lf_chart_of_accounts;
CREATE POLICY "anon_select_lf_coa" ON lf_chart_of_accounts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lf_coa" ON lf_chart_of_accounts;
CREATE POLICY "anon_insert_lf_coa" ON lf_chart_of_accounts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lf_coa" ON lf_chart_of_accounts;
CREATE POLICY "anon_update_lf_coa" ON lf_chart_of_accounts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lf_coa" ON lf_chart_of_accounts;
CREATE POLICY "anon_delete_lf_coa" ON lf_chart_of_accounts FOR DELETE TO anon, authenticated USING (true);

-- JOURNAL ENTRIES (headers)
CREATE TABLE IF NOT EXISTS lf_journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number text NOT NULL UNIQUE,
  stage int NOT NULL,
  stage_name text NOT NULL,
  description text NOT NULL,
  matter_id uuid,
  client_name text,
  invoice_number text,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  entry_date date NOT NULL DEFAULT now()::date,
  is_posted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lf_journal_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lf_journal" ON lf_journal_entries;
CREATE POLICY "anon_select_lf_journal" ON lf_journal_entries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lf_journal" ON lf_journal_entries;
CREATE POLICY "anon_insert_lf_journal" ON lf_journal_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lf_journal" ON lf_journal_entries;
CREATE POLICY "anon_update_lf_journal" ON lf_journal_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lf_journal" ON lf_journal_entries;
CREATE POLICY "anon_delete_lf_journal" ON lf_journal_entries FOR DELETE TO anon, authenticated USING (true);

-- JOURNAL LINES (individual debit/credit entries)
CREATE TABLE IF NOT EXISTS lf_journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id uuid REFERENCES lf_journal_entries(id) ON DELETE CASCADE,
  account_code text NOT NULL,
  account_name text NOT NULL,
  debit numeric(14,2) DEFAULT 0,
  credit numeric(14,2) DEFAULT 0,
  line_description text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lf_journal_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lf_jlines" ON lf_journal_lines;
CREATE POLICY "anon_select_lf_jlines" ON lf_journal_lines FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lf_jlines" ON lf_journal_lines;
CREATE POLICY "anon_insert_lf_jlines" ON lf_journal_lines FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lf_jlines" ON lf_journal_lines;
CREATE POLICY "anon_update_lf_jlines" ON lf_journal_lines FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lf_jlines" ON lf_journal_lines;
CREATE POLICY "anon_delete_lf_jlines" ON lf_journal_lines FOR DELETE TO anon, authenticated USING (true);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_lf_journal_stage ON lf_journal_entries(stage);
CREATE INDEX IF NOT EXISTS idx_lf_journal_date ON lf_journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_lf_jlines_entry ON lf_journal_lines(journal_entry_id);
