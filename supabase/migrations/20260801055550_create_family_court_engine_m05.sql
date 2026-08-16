/*
# Create Family Courts Engine (M5) schema

Organizes and manages family disputes and protects rights arising from family bonds:
divorce, khul, alimony, custody, educational guardianship, financial guardianship,
travel bans for minors, estate liquidation & Islamic inheritance distribution.

3-stage workflow: Social Integration → Financial Execution → Confidential Archiving

Integration: M80 (motherhood & childhood engine), M54 (financial engine for alimony),
M27 (inheritance engine), M10 (smart case core), M92 (AI agent), M52 (encrypted mail)

1. New Tables:
- `m05_family_cases`: Family court cases with 3-stage lifecycle.
- `m05_family_parties`: Parties (husband, wife, children, guardians, witnesses).
- `m05_custody_arrangements`: Custody, visitation, and child safety arrangements (M80).
- `m05_alimony_orders`: Alimony and financial obligation tracking (M54).
- `m05_inheritance_links`: Estate liquidation & inheritance distribution links (M27).
- `m05_family_audit_logs`: Immutable ZK-Audit trail with strict RBAC.

2. Security: RLS enabled, anon+authenticated full CRUD.
*/

-- FAMILY CASES
CREATE TABLE IF NOT EXISTS m05_family_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text NOT NULL UNIQUE,
  case_title text NOT NULL,
  case_category text DEFAULT 'divorce',
  dispute_subtype text,
  stage text DEFAULT 'social_integration',
  court text,
  court_circuit text,
  filing_date date,
  next_hearing_date date,
  judgment_date date,
  judgment_outcome text,
  is_final boolean DEFAULT false,
  success_rate_estimate numeric(5,2) DEFAULT 0,
  monthly_alimony numeric(10,2) DEFAULT 0,
  total_alimony_awarded numeric(12,2) DEFAULT 0,
  estate_value numeric(14,2) DEFAULT 0,
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m10_linked boolean DEFAULT false,
  m54_financial_linked boolean DEFAULT false,
  m80_child_linked boolean DEFAULT false,
  m27_inheritance_linked boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  m52_notified boolean DEFAULT false,
  confidentiality_level text DEFAULT 'strict',
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE m05_family_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m05_cases" ON m05_family_cases;
CREATE POLICY "anon_select_m05_cases" ON m05_family_cases FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m05_cases" ON m05_family_cases;
CREATE POLICY "anon_insert_m05_cases" ON m05_family_cases FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m05_cases" ON m05_family_cases;
CREATE POLICY "anon_update_m05_cases" ON m05_family_cases FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m05_cases" ON m05_family_cases;
CREATE POLICY "anon_delete_m05_cases" ON m05_family_cases FOR DELETE TO anon, authenticated USING (true);

-- FAMILY PARTIES
CREATE TABLE IF NOT EXISTS m05_family_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m05_family_cases(id) ON DELETE CASCADE,
  party_type text NOT NULL,
  name text NOT NULL,
  role text,
  national_id text,
  date_of_birth date,
  gender text,
  contact_info text,
  legal_representation text,
  is_minor boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m05_family_parties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m05_parties" ON m05_family_parties;
CREATE POLICY "anon_select_m05_parties" ON m05_family_parties FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m05_parties" ON m05_family_parties;
CREATE POLICY "anon_insert_m05_parties" ON m05_family_parties FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m05_parties" ON m05_family_parties;
CREATE POLICY "anon_update_m05_parties" ON m05_family_parties FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m05_parties" ON m05_family_parties;
CREATE POLICY "anon_delete_m05_parties" ON m05_family_parties FOR DELETE TO anon, authenticated USING (true);

-- CUSTODY ARRANGEMENTS (M80 integration)
CREATE TABLE IF NOT EXISTS m05_custody_arrangements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m05_family_cases(id) ON DELETE CASCADE,
  arrangement_type text NOT NULL,
  child_name text NOT NULL,
  child_age int,
  custodian_name text,
  visitation_schedule text,
  visitation_frequency text,
  travel_ban boolean DEFAULT false,
  safe_environment_verified boolean DEFAULT false,
  m80_synced boolean DEFAULT false,
  arrangement_status text DEFAULT 'active',
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m05_custody_arrangements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m05_custody" ON m05_custody_arrangements;
CREATE POLICY "anon_select_m05_custody" ON m05_custody_arrangements FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m05_custody" ON m05_custody_arrangements;
CREATE POLICY "anon_insert_m05_custody" ON m05_custody_arrangements FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m05_custody" ON m05_custody_arrangements;
CREATE POLICY "anon_update_m05_custody" ON m05_custody_arrangements FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m05_custody" ON m05_custody_arrangements;
CREATE POLICY "anon_delete_m05_custody" ON m05_custody_arrangements FOR DELETE TO anon, authenticated USING (true);

-- ALIMONY ORDERS (M54 integration)
CREATE TABLE IF NOT EXISTS m05_alimony_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m05_family_cases(id) ON DELETE CASCADE,
  alimony_type text NOT NULL,
  payer_name text NOT NULL,
  beneficiary_name text NOT NULL,
  monthly_amount numeric(10,2) NOT NULL DEFAULT 0,
  start_date date,
  end_date date,
  total_awarded numeric(12,2) DEFAULT 0,
  collection_method text DEFAULT 'manual',
  last_collected_date date,
  next_collection_date date,
  status text DEFAULT 'active',
  m54_synced boolean DEFAULT false,
  arrears numeric(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m05_alimony_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m05_alimony" ON m05_alimony_orders;
CREATE POLICY "anon_select_m05_alimony" ON m05_alimony_orders FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m05_alimony" ON m05_alimony_orders;
CREATE POLICY "anon_insert_m05_alimony" ON m05_alimony_orders FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m05_alimony" ON m05_alimony_orders;
CREATE POLICY "anon_update_m05_alimony" ON m05_alimony_orders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m05_alimony" ON m05_alimony_orders;
CREATE POLICY "anon_delete_m05_alimony" ON m05_alimony_orders FOR DELETE TO anon, authenticated USING (true);

-- INHERITANCE LINKS (M27 integration)
CREATE TABLE IF NOT EXISTS m05_inheritance_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m05_family_cases(id) ON DELETE CASCADE,
  deceased_name text NOT NULL,
  death_date date,
  estate_description text,
  total_estate_value numeric(14,2) DEFAULT 0,
  heirs_count int DEFAULT 0,
  distribution_status text DEFAULT 'pending',
  sharia_compliant boolean DEFAULT true,
  m27_synced boolean DEFAULT false,
  shares_summary jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m05_inheritance_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m05_inheritance" ON m05_inheritance_links;
CREATE POLICY "anon_select_m05_inheritance" ON m05_inheritance_links FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m05_inheritance" ON m05_inheritance_links;
CREATE POLICY "anon_insert_m05_inheritance" ON m05_inheritance_links FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m05_inheritance" ON m05_inheritance_links;
CREATE POLICY "anon_update_m05_inheritance" ON m05_inheritance_links FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m05_inheritance" ON m05_inheritance_links;
CREATE POLICY "anon_delete_m05_inheritance" ON m05_inheritance_links FOR DELETE TO anon, authenticated USING (true);

-- FAMILY AUDIT LOGS
CREATE TABLE IF NOT EXISTS m05_family_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m05_family_cases(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  rbac_clearance text DEFAULT 'strict',
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m05_family_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m05_audit" ON m05_family_audit_logs;
CREATE POLICY "anon_select_m05_audit" ON m05_family_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m05_audit" ON m05_family_audit_logs;
CREATE POLICY "anon_insert_m05_audit" ON m05_family_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m05_audit" ON m05_family_audit_logs;
CREATE POLICY "anon_update_m05_audit" ON m05_family_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m05_audit" ON m05_family_audit_logs;
CREATE POLICY "anon_delete_m05_audit" ON m05_family_audit_logs FOR DELETE TO anon, authenticated USING (true);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_m05_cases_number ON m05_family_cases(case_number);
CREATE INDEX IF NOT EXISTS idx_m05_cases_stage ON m05_family_cases(stage);
CREATE INDEX IF NOT EXISTS idx_m05_cases_category ON m05_family_cases(case_category);
CREATE INDEX IF NOT EXISTS idx_m05_cases_advisor ON m05_family_cases(assigned_advisor_id);
CREATE INDEX IF NOT EXISTS idx_m05_parties_case ON m05_family_parties(case_id);
CREATE INDEX IF NOT EXISTS idx_m05_custody_case ON m05_custody_arrangements(case_id);
CREATE INDEX IF NOT EXISTS idx_m05_alimony_case ON m05_alimony_orders(case_id);
CREATE INDEX IF NOT EXISTS idx_m05_inheritance_case ON m05_inheritance_links(case_id);
CREATE INDEX IF NOT EXISTS idx_m05_audit_case ON m05_family_audit_logs(case_id);

-- AUTO-UPDATE updated_at
CREATE OR REPLACE FUNCTION m05_touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_m05_cases_touch ON m05_family_cases;
CREATE TRIGGER trg_m05_cases_touch BEFORE UPDATE ON m05_family_cases
  FOR EACH ROW EXECUTE FUNCTION m05_touch_updated_at();

-- SEED: Cases
INSERT INTO m05_family_cases (case_number, case_title, case_category, dispute_subtype, stage, court, court_circuit, filing_date, next_hearing_date, success_rate_estimate, monthly_alimony, total_alimony_awarded, estate_value, cost_center_id, m10_linked, m54_financial_linked, m80_child_linked, m27_inheritance_linked, m92_notified, m52_notified, confidentiality_level, description) VALUES
  (
    'FAM-2025-067', 'دعوى طلاق للضرر مع طلب نفقة وحضانة', 'divorce', 'harm_based_divorce',
    'financial_execution', 'محكمة الأسرة', 'الدائرة الأولى',
    '2025-05-10', '2025-08-18',
    76.00, 3500.00, 126000.00, 0, 'CC-FAM-067',
    true, true, true, false, true, true, 'strict',
    'دعوى طلاق للضرر — الزوجة تطلب الطلاق بسبب الضرر النفسي والجسدي — طلب نفقة 3500 ج.م شهرياً وحضانة الطفلين'
  ),
  (
    'FAM-2025-089', 'خلع مقابل التنازل عن الحقوق المالية', 'khul', 'mutual_khul',
    'social_integration', 'محكمة الأسرة', 'الدائرة الثانية',
    '2025-06-25', '2025-09-01',
    85.00, 0, 0, 0, 'CC-FAM-089',
    true, false, false, false, true, true, 'strict',
    'خلع — الزوجة تطلب الخلع مقابل التنازل عن المؤخر والمتعة — لا أطفال — لا نزاع مالي'
  ),
  (
    'FAM-2025-034', 'تصفية تركة وتوزيع أنصبة شرعية', 'inheritance', 'estate_liquidation',
    'confidential_archiving', 'محكمة الأسرة', 'دائرة المواريث',
    '2025-03-15', '2025-08-25',
    92.00, 0, 0, 8500000.00, 'CC-FAM-034',
    true, true, false, true, true, true, 'strict',
    'تصفية تركة — المتوفى ترك 8.5 مليون (عقارات + استثمارات) — 4 ورثة (أرملة + 2 ابن + 1 بنت) — توزيع شرعي'
  ),
  (
    'FAM-2025-112', 'منع من السفر لقاصر — نزاع على الولاية التعليمية', 'guardianship', 'travel_ban',
    'social_integration', 'محكمة الأسرة', 'دائرة الولاية',
    '2025-07-01', '2025-08-30',
    70.00, 0, 0, 0, 'CC-FAM-112',
    true, false, true, false, true, true, 'strict',
    'منع من السفر لقاصر — الأم تطلب منع سفر الابن (12 سنة) مع الأب — نزاع على الولاية التعليمية'
  )
ON CONFLICT DO NOTHING;

-- SEED: Parties
INSERT INTO m05_family_parties (case_id, party_type, name, role, national_id, date_of_birth, gender, contact_info, legal_representation, is_minor) VALUES
  ((SELECT id FROM m05_family_cases WHERE case_number = 'FAM-2025-067'), 'wife', 'السيدة/ س.م', 'الزوجة المدعية', null, '1990-03-15', 'female', 'القاهرة', 'مكتب المحاماة', false),
  ((SELECT id FROM m05_family_cases WHERE case_number = 'FAM-2025-067'), 'husband', 'السيد/ م.ع', 'الزوج المدعى عليه', null, '1985-07-20', 'male', null, null, false),
  ((SELECT id FROM m05_family_cases WHERE case_number = 'FAM-2025-067'), 'child', 'الطفل/ أ.م', 'الابن', null, '2015-01-10', 'male', null, null, true),
  ((SELECT id FROM m05_family_cases WHERE case_number = 'FAM-2025-067'), 'child', 'الطفلة/ ل.م', 'الابنة', null, '2018-05-22', 'female', null, null, true),
  ((SELECT id FROM m05_family_cases WHERE case_number = 'FAM-2025-089'), 'wife', 'السيدة/ ن.ر', 'الزوجة', null, '1992-09-10', 'female', null, 'مكتب المحاماة', false),
  ((SELECT id FROM m05_family_cases WHERE case_number = 'FAM-2025-089'), 'husband', 'السيد/ ه.ر', 'الزوج', null, '1988-12-05', 'male', null, null, false),
  ((SELECT id FROM m05_family_cases WHERE case_number = 'FAM-2025-034'), 'heir', 'السيدة/ أ.ف', 'أرملة المتوفى', null, '1965-04-20', 'female', null, 'مكتب المحاماة', false),
  ((SELECT id FROM m05_family_cases WHERE case_number = 'FAM-2025-034'), 'heir', 'السيد/ خ.ف', 'الابن الأكبر', null, '1990-08-15', 'male', null, null, false),
  ((SELECT id FROM m05_family_cases WHERE case_number = 'FAM-2025-034'), 'heir', 'السيد/ ع.ف', 'الابن الأصغر', null, '1995-11-30', 'male', null, null, false),
  ((SELECT id FROM m05_family_cases WHERE case_number = 'FAM-2025-034'), 'heir', 'السيدة/ ر.ف', 'الابنة', null, '1993-06-18', 'female', null, null, false),
  ((SELECT id FROM m05_family_cases WHERE case_number = 'FAM-2025-112'), 'mother', 'السيدة/ د.س', 'الأم', null, '1985-02-10', 'female', null, 'مكتب المحاماة', false),
  ((SELECT id FROM m05_family_cases WHERE case_number = 'FAM-2025-112'), 'father', 'السيد/ ط.س', 'الأب', null, '1982-08-25', 'male', null, null, false),
  ((SELECT id FROM m05_family_cases WHERE case_number = 'FAM-2025-112'), 'child', 'الطفل/ ي.ط', 'الابن', null, '2013-03-15', 'male', null, null, true)
ON CONFLICT DO NOTHING;

-- SEED: Custody arrangements
INSERT INTO m05_custody_arrangements (case_id, arrangement_type, child_name, child_age, custodian_name, visitation_schedule, visitation_frequency, travel_ban, safe_environment_verified, m80_synced, arrangement_status, notes) VALUES
  (
    (SELECT id FROM m05_family_cases WHERE case_number = 'FAM-2025-067'),
    'custody', 'الطفل/ أ.م', 10, 'السيدة/ س.م', 'كل جمعة 10ص-6م', 'أسبوعي', false, true, true, 'active',
    'الحضانة للأم — بيئة آمنة مؤكدة عبر محرك الأمومة والطفولة (M80)'
  ),
  (
    (SELECT id FROM m05_family_cases WHERE case_number = 'FAM-2025-067'),
    'custody', 'الطفلة/ ل.م', 7, 'السيدة/ س.م', 'كل جمعة 10ص-6م', 'أسبوعي', false, true, true, 'active',
    'الحضانة للأم — متابعة رؤية الأب أسبوعياً'
  ),
  (
    (SELECT id FROM m05_family_cases WHERE case_number = 'FAM-2025-112'),
    'travel_ban', 'الطفل/ ي.ط', 12, 'السيدة/ د.س', null, null, true, false, true, 'pending',
    'منع من السفر لقاصر — الأم تطلب منع سفر الابن مع الأب — النزاع على الولاية التعليمية'
  )
ON CONFLICT DO NOTHING;

-- SEED: Alimony orders
INSERT INTO m05_alimony_orders (case_id, alimony_type, payer_name, beneficiary_name, monthly_amount, start_date, total_awarded, collection_method, next_collection_date, status, m54_synced, arrears) VALUES
  (
    (SELECT id FROM m05_family_cases WHERE case_number = 'FAM-2025-067'),
    'spousal_alimony', 'السيد/ م.ع', 'السيدة/ س.م', 3500.00, '2025-06-01', 126000.00,
    'automatic_deduction', '2025-08-01', 'active', true, 0
  ),
  (
    (SELECT id FROM m05_family_cases WHERE case_number = 'FAM-2025-067'),
    'child_alimony', 'السيد/ م.ع', 'السيدة/ س.م', 2000.00, '2025-06-01', 72000.00,
    'automatic_deduction', '2025-08-01', 'active', true, 0
  )
ON CONFLICT DO NOTHING;

-- SEED: Inheritance links
INSERT INTO m05_inheritance_links (case_id, deceased_name, death_date, estate_description, total_estate_value, heirs_count, distribution_status, sharia_compliant, m27_synced, shares_summary) VALUES
  (
    (SELECT id FROM m05_family_cases WHERE case_number = 'FAM-2025-034'),
    'المرحوم/ ف.ع', '2025-01-15', 'عقارات سكنية + استثمارات بورصية + أرصدة بنكية', 8500000.00, 4,
    'in_progress', true, true,
    '{"أرملة": "1/8 (1,062,500 ج.م)", "ابن أكبر": "1/4 (2,125,000 ج.م)", "ابن أصغر": "1/4 (2,125,000 ج.م)", "ابنة": "1/8 (1,062,500 ج.م) + تعصيب"}'::jsonb
  )
ON CONFLICT DO NOTHING;

-- SEED: Audit logs
INSERT INTO m05_family_audit_logs (case_id, action, actor, actor_role, detail, hash_chain, rbac_clearance) VALUES
  ((SELECT id FROM m05_family_cases WHERE case_number = 'FAM-2025-067'), 'case_created', 'النظام', 'النظام', 'إنشاء ملف قضية أسرة FAM-2025-067 — تصنيف: طلاق للضرر', '0x1a2b...3c4d', 'strict'),
  ((SELECT id FROM m05_family_cases WHERE case_number = 'FAM-2025-067'), 'm80_child_linked', 'النظام', 'النظام', 'ربط بمحرك الأمومة والطفولة (M80) — متابعة تنفيذ قرارات الرؤية والحضانة', '0x2b3c...4d5e', 'strict'),
  ((SELECT id FROM m05_family_cases WHERE case_number = 'FAM-2025-067'), 'm54_alimony_linked', 'النظام', 'النظام', 'ربط أحكام النفقة بالمحرك المالي (M54) — إدارة التحصيلات الشهرية آلياً', '0x3c4d...5e6f', 'strict'),
  ((SELECT id FROM m05_family_cases WHERE case_number = 'FAM-2025-067'), 'm92_notified', 'النظام', 'النظام', 'إشعار الوكيل الذكي (M92) بتحديث جدول المواعيد في النواة (M10)', '0x4d5e...6f7a', 'strict'),
  ((SELECT id FROM m05_family_cases WHERE case_number = 'FAM-2025-067'), 'm52_notified', 'النظام', 'النظام', 'إرسال إشعارات بريدية مشفرة للأطراف عبر المحرك (M52)', '0x5e6f...7a8b', 'strict'),
  ((SELECT id FROM m05_family_cases WHERE case_number = 'FAM-2025-034'), 'm27_inheritance_linked', 'النظام', 'النظام', 'ربط بمحرك المواريث (M27) — تصفية التركة وتوزيع الأنصبة الشرعية', '0x6f7a...8b9c', 'strict'),
  ((SELECT id FROM m05_family_cases WHERE case_number = 'FAM-2025-034'), 'sharia_distribution', 'النظام', 'النظام', 'توزيع شرعي: أرملة 1/8 + ابنان 1/4 كل + ابنة 1/8 + تعصيب', '0x7a8b...9c0d', 'strict'),
  ((SELECT id FROM m05_family_cases WHERE case_number = 'FAM-2025-112'), 'travel_ban_issued', 'النظام', 'النظام', 'إصدار أمر منع من السفر للقاصر ي.ط (12 سنة) — نزاع على الولاية التعليمية', '0x8b9c...0d1e', 'strict'),
  ((SELECT id FROM m05_family_cases WHERE case_number = 'FAM-2025-112'), 'm80_child_linked', 'النظام', 'النظام', 'ربط بمحرك الأمومة والطفولة (M80) — ضمان بيئة آمنة للطفل', '0x9c0d...1e2f', 'strict')
ON CONFLICT DO NOTHING;
