/*
# Create legal library tables for Egyptian law digital library

This migration creates the core tables for a comprehensive digital legal library
covering Egyptian legislation, court rulings, fatwas, gazette issues, law structure,
and subject index.

1. New Tables:
- `legislation`: Egyptian laws and decrees (number, year, type, title, issuing authority, publication date, gazette issue, full text, status)
- `court_rulings`: Rulings from various courts (Court of Cassation, Constitutional Court, Supreme Administrative, Administrative Judiciary) with ruling number, judicial year, session dates, principle, summary, full text, court type, circuit
- `fatwas`: Fatwas from the General Assembly (number, year, file number, fatwa date, session date, text, subject, principle)
- `gazette_issues`: Official Gazette issues (issue number, year, publication date, sector, content summary)
- `law_structure`: Hierarchical structure of laws (books, chapters, articles) with parent-child relationships
- `subject_index`: Alphabetical subject index tree for legislation, rulings, and fatwas
- `legislation_amendments`: Track amendments to legislation over time

2. Security:
- Enable RLS on all tables.
- Allow anon + authenticated to SELECT (read) all data — this is a public legal library.
- Allow only authenticated (admin) to INSERT/UPDATE/DELETE.
*/

-- ============================================================
-- LEGISLATION TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS legislation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  legislation_number text NOT NULL,
  year int NOT NULL,
  type text NOT NULL DEFAULT 'قانون',
  issuing_authority text,
  publication_date date,
  gazette_issue_number text,
  gazette_issue_date date,
  full_text text,
  status text DEFAULT 'ساري',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE legislation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_legislation" ON legislation;
CREATE POLICY "anon_select_legislation" ON legislation FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_legislation" ON legislation;
CREATE POLICY "auth_insert_legislation" ON legislation FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_legislation" ON legislation;
CREATE POLICY "auth_update_legislation" ON legislation FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_legislation" ON legislation;
CREATE POLICY "auth_delete_legislation" ON legislation FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- COURT RULINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS court_rulings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  court_type text NOT NULL,
  ruling_number text NOT NULL,
  judicial_year text,
  session_date date,
  session_date_to date,
  circuit text,
  subject text,
  principle text NOT NULL,
  appeal_summary text,
  ruling_text text,
  ruling_type text DEFAULT 'مدني',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE court_rulings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_court_rulings" ON court_rulings;
CREATE POLICY "anon_select_court_rulings" ON court_rulings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_court_rulings" ON court_rulings;
CREATE POLICY "auth_insert_court_rulings" ON court_rulings FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_court_rulings" ON court_rulings;
CREATE POLICY "auth_update_court_rulings" ON court_rulings FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_court_rulings" ON court_rulings;
CREATE POLICY "auth_delete_court_rulings" ON court_rulings FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- FATWAS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS fatwas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fatwa_number text NOT NULL,
  year text NOT NULL,
  file_number text,
  fatwa_date date,
  session_date date,
  subject text,
  principle text,
  text_content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE fatwas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_fatwas" ON fatwas;
CREATE POLICY "anon_select_fatwas" ON fatwas FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_fatwas" ON fatwas;
CREATE POLICY "auth_insert_fatwas" ON fatwas FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_fatwas" ON fatwas;
CREATE POLICY "auth_update_fatwas" ON fatwas FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_fatwas" ON fatwas;
CREATE POLICY "auth_delete_fatwas" ON fatwas FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- GAZETTE ISSUES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS gazette_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_number text NOT NULL,
  year int NOT NULL,
  publication_date date,
  sector text DEFAULT 'كافة القطاعات',
  content_summary text,
  full_text text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE gazette_issues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_gazette" ON gazette_issues;
CREATE POLICY "anon_select_gazette" ON gazette_issues FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_gazette" ON gazette_issues;
CREATE POLICY "auth_insert_gazette" ON gazette_issues FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_gazette" ON gazette_issues;
CREATE POLICY "auth_update_gazette" ON gazette_issues FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_gazette" ON gazette_issues;
CREATE POLICY "auth_delete_gazette" ON gazette_issues FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- LAW STRUCTURE TABLE (hierarchical: books > chapters > articles)
-- ============================================================
CREATE TABLE IF NOT EXISTS law_structure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legislation_id uuid REFERENCES legislation(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES law_structure(id) ON DELETE CASCADE,
  node_type text NOT NULL DEFAULT 'مادة',
  node_number text,
  title text NOT NULL,
  content text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE law_structure ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_law_structure" ON law_structure;
CREATE POLICY "anon_select_law_structure" ON law_structure FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_law_structure" ON law_structure;
CREATE POLICY "auth_insert_law_structure" ON law_structure FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_law_structure" ON law_structure;
CREATE POLICY "auth_update_law_structure" ON law_structure FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_law_structure" ON law_structure;
CREATE POLICY "auth_delete_law_structure" ON law_structure FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- SUBJECT INDEX TABLE (alphabetical subject tree)
-- ============================================================
CREATE TABLE IF NOT EXISTS subject_index (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES subject_index(id) ON DELETE CASCADE,
  subject_name text NOT NULL,
  category text,
  reference_type text,
  reference_id uuid,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subject_index ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_subject_index" ON subject_index;
CREATE POLICY "anon_select_subject_index" ON subject_index FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_subject_index" ON subject_index;
CREATE POLICY "auth_insert_subject_index" ON subject_index FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_subject_index" ON subject_index;
CREATE POLICY "auth_update_subject_index" ON subject_index FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_subject_index" ON subject_index;
CREATE POLICY "auth_delete_subject_index" ON subject_index FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- LEGISLATION AMENDMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS legislation_amendments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legislation_id uuid REFERENCES legislation(id) ON DELETE CASCADE,
  amending_legislation_id uuid REFERENCES legislation(id),
  amendment_date date,
  amendment_summary text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE legislation_amendments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_amendments" ON legislation_amendments;
CREATE POLICY "anon_select_amendments" ON legislation_amendments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_amendments" ON legislation_amendments;
CREATE POLICY "auth_insert_amendments" ON legislation_amendments FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_amendments" ON legislation_amendments;
CREATE POLICY "auth_update_amendments" ON legislation_amendments FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_amendments" ON legislation_amendments;
CREATE POLICY "auth_delete_amendments" ON legislation_amendments FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_legislation_year ON legislation(year);
CREATE INDEX IF NOT EXISTS idx_legislation_type ON legislation(type);
CREATE INDEX IF NOT EXISTS idx_legislation_number ON legislation(legislation_number);
CREATE INDEX IF NOT EXISTS idx_court_rulings_court_type ON court_rulings(court_type);
CREATE INDEX IF NOT EXISTS idx_court_rulings_number ON court_rulings(ruling_number);
CREATE INDEX IF NOT EXISTS idx_fatwas_year ON fatwas(year);
CREATE INDEX IF NOT EXISTS idx_gazette_year ON gazette_issues(year);
CREATE INDEX IF NOT EXISTS idx_law_structure_legislation ON law_structure(legislation_id);
CREATE INDEX IF NOT EXISTS idx_law_structure_parent ON law_structure(parent_id);
CREATE INDEX IF NOT EXISTS idx_subject_index_parent ON subject_index(parent_id);
