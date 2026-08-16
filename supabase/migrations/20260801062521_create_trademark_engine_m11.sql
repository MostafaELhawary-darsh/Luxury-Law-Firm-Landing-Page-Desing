/*
# M11 — Trademarks & Industrial Designs Engine (محرك العلامات التجارية والتصاميم الصناعية)
Intellectual property sector: protects brands, designs, and innovations.
Stages: search_clearance → registration_cycle → opposition_monitoring → protection_enforcement
Integration: M87 (industry sector), M81 (media/arts IP), M54 (finance), M92 (omni-agent), M52 (mail)
*/

CREATE TABLE IF NOT EXISTS m11_trademark_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text NOT NULL UNIQUE,
  case_title text NOT NULL,
  case_category text DEFAULT 'trademark',
  ip_type text DEFAULT 'trademark',
  stage text DEFAULT 'search_clearance',
  trademark_name text,
  trademark_class text,
  design_type text,
  applicant_name text,
  applicant_type text DEFAULT 'corporate',
  registration_number text,
  filing_date date,
  deposit_certificate_date date,
  publication_date date,
  opposition_deadline date,
  registration_grant_date date,
  renewal_date date,
  status text DEFAULT 'searching',
  is_registered boolean DEFAULT false,
  is_opposed boolean DEFAULT false,
  opposition_details text,
  infringement_detected boolean DEFAULT false,
  infringement_details text,
  financial_value numeric(14,2) DEFAULT 0,
  filing_fees numeric(14,2) DEFAULT 0,
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m87_industry_linked boolean DEFAULT false,
  m81_media_linked boolean DEFAULT false,
  m54_finance_linked boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  m52_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE m11_trademark_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m11_cases" ON m11_trademark_cases;
CREATE POLICY "anon_select_m11_cases" ON m11_trademark_cases FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m11_cases" ON m11_trademark_cases;
CREATE POLICY "anon_insert_m11_cases" ON m11_trademark_cases FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m11_cases" ON m11_trademark_cases;
CREATE POLICY "anon_update_m11_cases" ON m11_trademark_cases FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m11_cases" ON m11_trademark_cases;
CREATE POLICY "anon_delete_m11_cases" ON m11_trademark_cases FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m11_search_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m11_trademark_cases(id) ON DELETE CASCADE,
  similar_mark text NOT NULL,
  similar_owner text,
  similar_class text,
  similarity_score numeric(5,2) DEFAULT 0,
  registration_number text,
  status text DEFAULT 'registered',
  conflict_risk text DEFAULT 'low',
  search_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m11_search_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m11_search" ON m11_search_results;
CREATE POLICY "anon_select_m11_search" ON m11_search_results FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m11_search" ON m11_search_results;
CREATE POLICY "anon_insert_m11_search" ON m11_search_results FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m11_search" ON m11_search_results;
CREATE POLICY "anon_update_m11_search" ON m11_search_results FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m11_search" ON m11_search_results;
CREATE POLICY "anon_delete_m11_search" ON m11_search_results FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m11_oppositions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m11_trademark_cases(id) ON DELETE CASCADE,
  opposer_name text NOT NULL,
  opposition_grounds text,
  opposition_date date,
  response_deadline date,
  response_filed boolean DEFAULT false,
  response_memo text,
  status text DEFAULT 'pending',
  outcome text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m11_oppositions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m11_oppositions" ON m11_oppositions;
CREATE POLICY "anon_select_m11_oppositions" ON m11_oppositions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m11_oppositions" ON m11_oppositions;
CREATE POLICY "anon_insert_m11_oppositions" ON m11_oppositions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m11_oppositions" ON m11_oppositions;
CREATE POLICY "anon_update_m11_oppositions" ON m11_oppositions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m11_oppositions" ON m11_oppositions;
CREATE POLICY "anon_delete_m11_oppositions" ON m11_oppositions FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m11_infringement_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m11_trademark_cases(id) ON DELETE CASCADE,
  infringer_name text NOT NULL,
  infringement_type text,
  infringement_details text,
  detection_date date,
  action_taken text,
  legal_action_filed boolean DEFAULT false,
  case_ref text,
  status text DEFAULT 'detected',
  damages_claimed numeric(14,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m11_infringement_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m11_infringement" ON m11_infringement_cases;
CREATE POLICY "anon_select_m11_infringement" ON m11_infringement_cases FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m11_infringement" ON m11_infringement_cases;
CREATE POLICY "anon_insert_m11_infringement" ON m11_infringement_cases FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m11_infringement" ON m11_infringement_cases;
CREATE POLICY "anon_update_m11_infringement" ON m11_infringement_cases FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m11_infringement" ON m11_infringement_cases;
CREATE POLICY "anon_delete_m11_infringement" ON m11_infringement_cases FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m11_trademark_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m11_trademark_cases(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m11_trademark_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m11_audit" ON m11_trademark_audit_logs;
CREATE POLICY "anon_select_m11_audit" ON m11_trademark_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m11_audit" ON m11_trademark_audit_logs;
CREATE POLICY "anon_insert_m11_audit" ON m11_trademark_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m11_audit" ON m11_trademark_audit_logs;
CREATE POLICY "anon_update_m11_audit" ON m11_trademark_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m11_audit" ON m11_trademark_audit_logs;
CREATE POLICY "anon_delete_m11_audit" ON m11_trademark_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m11_cases_number ON m11_trademark_cases(case_number);
CREATE INDEX IF NOT EXISTS idx_m11_cases_stage ON m11_trademark_cases(stage);
CREATE INDEX IF NOT EXISTS idx_m11_cases_category ON m11_trademark_cases(case_category);
CREATE INDEX IF NOT EXISTS idx_m11_cases_status ON m11_trademark_cases(status);
CREATE INDEX IF NOT EXISTS idx_m11_search_case ON m11_search_results(case_id);
CREATE INDEX IF NOT EXISTS idx_m11_oppositions_case ON m11_oppositions(case_id);
CREATE INDEX IF NOT EXISTS idx_m11_infringement_case ON m11_infringement_cases(case_id);
CREATE INDEX IF NOT EXISTS idx_m11_audit_case ON m11_trademark_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m11_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_m11_cases_touch ON m11_trademark_cases;
CREATE TRIGGER trg_m11_cases_touch BEFORE UPDATE ON m11_trademark_cases
  FOR EACH ROW EXECUTE FUNCTION m11_touch_updated_at();

INSERT INTO m11_trademark_cases (case_number, case_title, case_category, ip_type, stage, trademark_name, trademark_class, design_type, applicant_name, applicant_type, registration_number, filing_date, deposit_certificate_date, publication_date, opposition_deadline, status, is_registered, is_opposed, infringement_detected, financial_value, filing_fees, cost_center_id, m87_industry_linked, m81_media_linked, m54_finance_linked, m92_notified, m52_notified, description) VALUES
  ('TM-2025-004', 'تسجيل علامة تجارية — "هواري بريميوم" للمنتجات الغذائية', 'trademark', 'trademark', 'opposition_monitoring', 'هواري بريميوم', 'الفئة 29 — المنتجات الغذائية', null, 'شركة الصناعات الغذائية المتحدة', 'corporate', 'TM-REG-2025-004', '2025-05-10', '2025-05-12', '2025-06-15', '2025-07-15', 'published', false, false, false, 50000.00, 2500.00, 'CC-M11-004', true, false, true, true, true, 'تم نشر العلامة في الجريدة الرسمية — فترة الاعتراضات جارية حتى 15 يوليو 2025'),
  ('ID-2025-009', 'تسجيل تصميم صناعي — نموذج سيراميك مزخرف', 'industrial_design', 'industrial_design', 'registration_cycle', null, null, 'تصميم سيراميك — زخرفة عربية معاصرة', 'شركة السيراميك الوطنية', 'corporate', null, '2025-07-01', '2025-07-03', null, null, 'filing', false, false, false, 30000.00, 1500.00, 'CC-M11-009', true, false, true, true, true, 'طلب تسجيل تصميم صناعي لنموذج سيراميك — تم إيداع الطلب وانتظار النشر'),
  ('TM-2025-012', 'رصد تقليد — علامة "هواري بريميوم" من مصنع غير مرخص', 'infringement', 'trademark', 'protection_enforcement', 'هواري بريميوم', 'الفئة 29', null, 'شركة الصناعات الغذائية المتحدة', 'corporate', 'TM-REG-2025-004', '2025-05-10', '2025-05-12', '2025-06-15', '2025-07-15', 'infringed', true, false, true, 150000.00, 0, 'CC-M11-012', true, false, true, true, true, 'رصد تقليد للعلامة التجارية — منتجات مماثلة في السوق بنفس الاسم والتغليف المقلد')
ON CONFLICT DO NOTHING;

INSERT INTO m11_search_results (case_id, similar_mark, similar_owner, similar_class, similarity_score, registration_number, status, conflict_risk, search_date) VALUES
  ((SELECT id FROM m11_trademark_cases WHERE case_number='TM-2025-004'), 'هواري بريمو', 'شركة الأغذية الحديثة', 'الفئة 29', 65.00, 'TM-REG-2019-882', 'registered', 'medium', '2025-05-08'),
  ((SELECT id FROM m11_trademark_cases WHERE case_number='TM-2025-004'), 'هواري', 'مؤسسة هواري للتجارة', 'الفئة 30', 45.00, 'TM-REG-2015-341', 'registered', 'low', '2025-05-08')
ON CONFLICT DO NOTHING;

INSERT INTO m11_infringement_cases (case_id, infringer_name, infringement_type, infringement_details, detection_date, action_taken, legal_action_filed, case_ref, status, damages_claimed) VALUES
  ((SELECT id FROM m11_trademark_cases WHERE case_number='TM-2025-012'), 'مصنع النيل للأغذية', 'trademark_counterfeiting', 'إنتاج وتسويق منتجات غذائية بنفس الاسم "هواري بريميوم" وتغليف مقلد مطابق للعلامة المسجلة', '2025-07-20', 'إنذار قانوني وإخطار الجهات المختصة', true, 'IP-2025-003', 'legal_action_filed', 150000.00)
ON CONFLICT DO NOTHING;

INSERT INTO m11_trademark_audit_logs (case_id, action, actor, actor_role, detail, hash_chain) VALUES
  ((SELECT id FROM m11_trademark_cases WHERE case_number='TM-2025-004'), 'search_completed', 'النظام', 'النظام', 'إجراء بحث آلي في سجلات العلامات التجارية — عدم وجود تطابق تام', '0xa1b2...c3d4'),
  ((SELECT id FROM m11_trademark_cases WHERE case_number='TM-2025-004'), 'application_filed', 'النظام', 'النظام', 'تقديم طلب القيد وإصدار شهادة الإيداع آلياً', '0xb2c3...d4e5'),
  ((SELECT id FROM m11_trademark_cases WHERE case_number='TM-2025-004'), 'published', 'النظام', 'النظام', 'نشر العلامة في الجريدة الرسمية — بدء فترة الاعتراضات', '0xc3d4...e5f6'),
  ((SELECT id FROM m11_trademark_cases WHERE case_number='TM-2025-004'), 'm87_linked', 'النظام', 'النظام', 'ربط بقطاع الصناعة M87 لحماية ابتكارات المصانع', '0xd4e5...f6a7'),
  ((SELECT id FROM m11_trademark_cases WHERE case_number='ID-2025-009'), 'application_filed', 'النظام', 'النظام', 'تقديم طلب تسجيل تصميم صناعي — إيداع النموذج', '0xe5f6...a7b8'),
  ((SELECT id FROM m11_trademark_cases WHERE case_number='TM-2025-012'), 'infringement_detected', 'النظام', 'النظام', 'رصد تقليد للعلامة التجارية — منتجات مقلدة في السوق', '0xf6a7...b8c9'),
  ((SELECT id FROM m11_trademark_cases WHERE case_number='TM-2025-012'), 'legal_action_filed', 'النظام', 'النظام', 'إقامة دعوى حماية العلامة التجارية — مطالبة بالتعويض', '0x1a2b...2b3c')
ON CONFLICT DO NOTHING;
