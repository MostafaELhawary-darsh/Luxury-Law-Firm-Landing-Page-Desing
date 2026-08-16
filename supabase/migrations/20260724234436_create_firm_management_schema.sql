/*
# Create firm management schema

Implements the legal firm management platform:
1. Court sessions (judicial agenda) — linked to matters/cases
2. Power of attorney (POA) — linked to clients
3. Tasks — linked to cases, clients, staff
4. Cases (lawsuits) — linked to clients, attorneys, court sessions
5. Staff/advisors — extends attorneys with financial details
6. Bank accounts — firm operating accounts
7. Checks — firm and client checks
8. Salaries — staff salary records
9. Virtual meetings — firm internal meetings

1. New Tables:
- `lf_cases`: Lawsuits with court level, parties, subject
- `lf_court_sessions`: Judicial agenda sessions linked to cases
- `lf_poa`: Powers of attorney linked to clients
- `lf_tasks`: Administrative tasks linked to cases/clients
- `lf_staff`: Staff/advisors with financial details
- `lf_bank_accounts`: Firm bank accounts
- `lf_checks`: Bank checks (firm + client)
- `lf_salaries`: Staff salary records
- `lf_meetings`: Virtual meetings with document sharing

2. Security: RLS enabled, anon+authenticated full CRUD.
*/

-- CASES (lawsuits)
CREATE TABLE IF NOT EXISTS lf_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text NOT NULL,
  case_title text NOT NULL,
  case_type text,
  court_level text,
  court_name text,
  subject text,
  client_id uuid REFERENCES lf_clients(id) ON DELETE SET NULL,
  responsible_attorney_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  opposing_party text,
  status text DEFAULT 'نشطة',
  filed_date date,
  next_session_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lf_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lf_cases" ON lf_cases;
CREATE POLICY "anon_select_lf_cases" ON lf_cases FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lf_cases" ON lf_cases;
CREATE POLICY "anon_insert_lf_cases" ON lf_cases FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lf_cases" ON lf_cases;
CREATE POLICY "anon_update_lf_cases" ON lf_cases FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lf_cases" ON lf_cases;
CREATE POLICY "anon_delete_lf_cases" ON lf_cases FOR DELETE TO anon, authenticated USING (true);

-- COURT SESSIONS (judicial agenda)
CREATE TABLE IF NOT EXISTS lf_court_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES lf_cases(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  session_time time DEFAULT '10:00',
  court_name text,
  circuit text,
  session_type text,
  attendees_plaintiff boolean DEFAULT false,
  attendees_defendant boolean DEFAULT false,
  documents_submitted text,
  requests_submitted text,
  defenses_submitted text,
  memos_submitted text,
  court_decision text,
  ruling_text text,
  status text DEFAULT 'مجدولة',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lf_court_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lf_sessions" ON lf_court_sessions;
CREATE POLICY "anon_select_lf_sessions" ON lf_court_sessions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lf_sessions" ON lf_court_sessions;
CREATE POLICY "anon_insert_lf_sessions" ON lf_court_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lf_sessions" ON lf_court_sessions;
CREATE POLICY "anon_update_lf_sessions" ON lf_court_sessions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lf_sessions" ON lf_court_sessions;
CREATE POLICY "anon_delete_lf_sessions" ON lf_court_sessions FOR DELETE TO anon, authenticated USING (true);

-- POWERS OF ATTORNEY
CREATE TABLE IF NOT EXISTS lf_poa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poa_number text NOT NULL,
  poa_type text,
  client_id uuid REFERENCES lf_clients(id) ON DELETE CASCADE,
  issued_date date NOT NULL,
  expiry_date date,
  scope text,
  notary_name text,
  status text DEFAULT 'سارية',
  document_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lf_poa ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lf_poa" ON lf_poa;
CREATE POLICY "anon_select_lf_poa" ON lf_poa FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lf_poa" ON lf_poa;
CREATE POLICY "anon_insert_lf_poa" ON lf_poa FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lf_poa" ON lf_poa;
CREATE POLICY "anon_update_lf_poa" ON lf_poa FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lf_poa" ON lf_poa;
CREATE POLICY "anon_delete_lf_poa" ON lf_poa FOR DELETE TO anon, authenticated USING (true);

-- TASKS
CREATE TABLE IF NOT EXISTS lf_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  task_type text,
  priority text DEFAULT 'متوسطة',
  status text DEFAULT 'بانتظار',
  due_date date,
  assigned_to uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  case_id uuid REFERENCES lf_cases(id) ON DELETE SET NULL,
  client_id uuid REFERENCES lf_clients(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lf_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lf_tasks" ON lf_tasks;
CREATE POLICY "anon_select_lf_tasks" ON lf_tasks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lf_tasks" ON lf_tasks;
CREATE POLICY "anon_insert_lf_tasks" ON lf_tasks FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lf_tasks" ON lf_tasks;
CREATE POLICY "anon_update_lf_tasks" ON lf_tasks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lf_tasks" ON lf_tasks;
CREATE POLICY "anon_delete_lf_tasks" ON lf_tasks FOR DELETE TO anon, authenticated USING (true);

-- STAFF (extends attorneys with financial details)
CREATE TABLE IF NOT EXISTS lf_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attorney_id uuid REFERENCES lf_attorneys(id) ON DELETE CASCADE,
  staff_type text NOT NULL,
  department text,
  hire_date date,
  base_salary numeric(14,2) DEFAULT 0,
  allowances numeric(14,2) DEFAULT 0,
  bank_account text,
  tax_id text,
  social_insurance_number text,
  status text DEFAULT 'نشط',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lf_staff ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lf_staff" ON lf_staff;
CREATE POLICY "anon_select_lf_staff" ON lf_staff FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lf_staff" ON lf_staff;
CREATE POLICY "anon_insert_lf_staff" ON lf_staff FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lf_staff" ON lf_staff;
CREATE POLICY "anon_update_lf_staff" ON lf_staff FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lf_staff" ON lf_staff;
CREATE POLICY "anon_delete_lf_staff" ON lf_staff FOR DELETE TO anon, authenticated USING (true);

-- BANK ACCOUNTS
CREATE TABLE IF NOT EXISTS lf_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name text NOT NULL,
  account_number text NOT NULL,
  iban text,
  account_type text,
  currency text DEFAULT 'EGP',
  current_balance numeric(14,2) DEFAULT 0,
  status text DEFAULT 'نشط',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lf_bank_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lf_bank" ON lf_bank_accounts;
CREATE POLICY "anon_select_lf_bank" ON lf_bank_accounts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lf_bank" ON lf_bank_accounts;
CREATE POLICY "anon_insert_lf_bank" ON lf_bank_accounts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lf_bank" ON lf_bank_accounts;
CREATE POLICY "anon_update_lf_bank" ON lf_bank_accounts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lf_bank" ON lf_bank_accounts;
CREATE POLICY "anon_delete_lf_bank" ON lf_bank_accounts FOR DELETE TO anon, authenticated USING (true);

-- CHECKS
CREATE TABLE IF NOT EXISTS lf_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_number text NOT NULL,
  bank_account_id uuid REFERENCES lf_bank_accounts(id) ON DELETE SET NULL,
  client_id uuid REFERENCES lf_clients(id) ON DELETE SET NULL,
  check_type text NOT NULL,
  amount numeric(14,2) NOT NULL,
  issue_date date NOT NULL,
  due_date date NOT NULL,
  payee text,
  status text DEFAULT 'بانتظار',
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lf_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lf_checks" ON lf_checks;
CREATE POLICY "anon_select_lf_checks" ON lf_checks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lf_checks" ON lf_checks;
CREATE POLICY "anon_insert_lf_checks" ON lf_checks FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lf_checks" ON lf_checks;
CREATE POLICY "anon_update_lf_checks" ON lf_checks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lf_checks" ON lf_checks;
CREATE POLICY "anon_delete_lf_checks" ON lf_checks FOR DELETE TO anon, authenticated USING (true);

-- SALARIES
CREATE TABLE IF NOT EXISTS lf_salaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES lf_staff(id) ON DELETE CASCADE,
  month int NOT NULL,
  year int NOT NULL,
  base_amount numeric(14,2) NOT NULL DEFAULT 0,
  allowances_amount numeric(14,2) DEFAULT 0,
  deductions numeric(14,2) DEFAULT 0,
  net_amount numeric(14,2) NOT NULL DEFAULT 0,
  payment_date date,
  status text DEFAULT 'بانتظار',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lf_salaries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lf_salaries" ON lf_salaries;
CREATE POLICY "anon_select_lf_salaries" ON lf_salaries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lf_salaries" ON lf_salaries;
CREATE POLICY "anon_insert_lf_salaries" ON lf_salaries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lf_salaries" ON lf_salaries;
CREATE POLICY "anon_update_lf_salaries" ON lf_salaries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lf_salaries" ON lf_salaries;
CREATE POLICY "anon_delete_lf_salaries" ON lf_salaries FOR DELETE TO anon, authenticated USING (true);

-- VIRTUAL MEETINGS
CREATE TABLE IF NOT EXISTS lf_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  meeting_type text NOT NULL,
  scheduled_date timestamptz NOT NULL,
  duration_minutes int DEFAULT 60,
  platform text,
  meeting_url text,
  organizer_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  agenda text,
  participants jsonb DEFAULT '[]'::jsonb,
  shared_documents jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'مجدولة',
  language text DEFAULT 'العربية',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lf_meetings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lf_meetings" ON lf_meetings;
CREATE POLICY "anon_select_lf_meetings" ON lf_meetings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lf_meetings" ON lf_meetings;
CREATE POLICY "anon_insert_lf_meetings" ON lf_meetings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lf_meetings" ON lf_meetings;
CREATE POLICY "anon_update_lf_meetings" ON lf_meetings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lf_meetings" ON lf_meetings;
CREATE POLICY "anon_delete_lf_meetings" ON lf_meetings FOR DELETE TO anon, authenticated USING (true);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_lf_cases_client ON lf_cases(client_id);
CREATE INDEX IF NOT EXISTS idx_lf_cases_attorney ON lf_cases(responsible_attorney_id);
CREATE INDEX IF NOT EXISTS idx_lf_sessions_case ON lf_court_sessions(case_id);
CREATE INDEX IF NOT EXISTS idx_lf_sessions_date ON lf_court_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_lf_poa_client ON lf_poa(client_id);
CREATE INDEX IF NOT EXISTS idx_lf_tasks_case ON lf_tasks(case_id);
CREATE INDEX IF NOT EXISTS idx_lf_tasks_assignee ON lf_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_lf_staff_attorney ON lf_staff(attorney_id);
CREATE INDEX IF NOT EXISTS idx_lf_checks_due ON lf_checks(due_date);
CREATE INDEX IF NOT EXISTS idx_lf_salaries_staff ON lf_salaries(staff_id);
CREATE INDEX IF NOT EXISTS idx_lf_meetings_date ON lf_meetings(scheduled_date);
