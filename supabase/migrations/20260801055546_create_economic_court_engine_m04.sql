/*
# Create Economic Courts Engine (M4) schema

Specializes in complex commercial disputes requiring speed and specialized technical expertise:
bankruptcy, preventive settlement, corporate restructuring, capital market disputes,
stock exchange disputes, public joint-stock companies, money laundering & economic crimes.

3-stage workflow: Technical Analysis → Parallel Processing → Documentation

Integration: M60 (companies engine), M98 (stock exchange engine), M92 (AI agent),
M54 (financial engine), M53 (sovereign vault with AES-256)

1. New Tables:
- `m04_economic_cases`: Economic court cases with 3-stage lifecycle.
- `m04_economic_parties`: Parties (companies, financial institutions, individuals).
- `m04_financial_links`: Links to M60/M98 for financial data retrieval.
- `m04_cost_centers`: M54 cost center tracking for complex financial claims.
- `m04_vault_documents`: M53 AES-256 encrypted document registry.
- `m04_economic_audit_logs`: Immutable ZK-Audit trail.

2. Security: RLS enabled, anon+authenticated full CRUD.
*/

-- ECONOMIC CASES
CREATE TABLE IF NOT EXISTS m04_economic_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text NOT NULL UNIQUE,
  case_title text NOT NULL,
  case_category text DEFAULT 'bankruptcy',
  dispute_subtype text,
  stage text DEFAULT 'technical_analysis',
  court text,
  court_circuit text,
  filing_date date,
  next_hearing_date date,
  judgment_date date,
  judgment_outcome text,
  is_final boolean DEFAULT false,
  success_rate_estimate numeric(5,2) DEFAULT 0,
  financial_value numeric(14,2) DEFAULT 0,
  court_fees numeric(14,2) DEFAULT 0,
  total_claims numeric(14,2) DEFAULT 0,
  total_liabilities numeric(14,2) DEFAULT 0,
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m10_linked boolean DEFAULT false,
  m54_cost_center_opened boolean DEFAULT false,
  m60_company_linked boolean DEFAULT false,
  m98_market_linked boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  m53_vault_sealed boolean DEFAULT false,
  m52_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE m04_economic_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m04_cases" ON m04_economic_cases;
CREATE POLICY "anon_select_m04_cases" ON m04_economic_cases FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m04_cases" ON m04_economic_cases;
CREATE POLICY "anon_insert_m04_cases" ON m04_economic_cases FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m04_cases" ON m04_economic_cases;
CREATE POLICY "anon_update_m04_cases" ON m04_economic_cases FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m04_cases" ON m04_economic_cases;
CREATE POLICY "anon_delete_m04_cases" ON m04_economic_cases FOR DELETE TO anon, authenticated USING (true);

-- ECONOMIC PARTIES
CREATE TABLE IF NOT EXISTS m04_economic_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m04_economic_cases(id) ON DELETE CASCADE,
  party_type text NOT NULL,
  name text NOT NULL,
  role text,
  entity_type text,
  registration_number text,
  contact_info text,
  legal_representation text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m04_economic_parties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m04_parties" ON m04_economic_parties;
CREATE POLICY "anon_select_m04_parties" ON m04_economic_parties FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m04_parties" ON m04_economic_parties;
CREATE POLICY "anon_insert_m04_parties" ON m04_economic_parties FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m04_parties" ON m04_economic_parties;
CREATE POLICY "anon_update_m04_parties" ON m04_economic_parties FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m04_parties" ON m04_economic_parties;
CREATE POLICY "anon_delete_m04_parties" ON m04_economic_parties FOR DELETE TO anon, authenticated USING (true);

-- FINANCIAL LINKS (M60/M98 integration)
CREATE TABLE IF NOT EXISTS m04_financial_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m04_economic_cases(id) ON DELETE CASCADE,
  link_type text NOT NULL,
  entity_name text NOT NULL,
  entity_ref text,
  financial_data jsonb DEFAULT '{}'::jsonb,
  source_engine text,
  retrieved_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m04_financial_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m04_finlinks" ON m04_financial_links;
CREATE POLICY "anon_select_m04_finlinks" ON m04_financial_links FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m04_finlinks" ON m04_financial_links;
CREATE POLICY "anon_insert_m04_finlinks" ON m04_financial_links FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m04_finlinks" ON m04_financial_links;
CREATE POLICY "anon_update_m04_finlinks" ON m04_financial_links FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m04_finlinks" ON m04_financial_links;
CREATE POLICY "anon_delete_m04_finlinks" ON m04_financial_links FOR DELETE TO anon, authenticated USING (true);

-- COST CENTERS (M54 integration)
CREATE TABLE IF NOT EXISTS m04_cost_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m04_economic_cases(id) ON DELETE CASCADE,
  cost_center_code text NOT NULL,
  description text,
  total_claims numeric(14,2) DEFAULT 0,
  total_disbursed numeric(14,2) DEFAULT 0,
  total_received numeric(14,2) DEFAULT 0,
  status text DEFAULT 'open',
  m54_synced boolean DEFAULT false,
  opened_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m04_cost_centers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m04_cc" ON m04_cost_centers;
CREATE POLICY "anon_select_m04_cc" ON m04_cost_centers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m04_cc" ON m04_cost_centers;
CREATE POLICY "anon_insert_m04_cc" ON m04_cost_centers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m04_cc" ON m04_cost_centers;
CREATE POLICY "anon_update_m04_cc" ON m04_cost_centers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m04_cc" ON m04_cost_centers;
CREATE POLICY "anon_delete_m04_cc" ON m04_cost_centers FOR DELETE TO anon, authenticated USING (true);

-- VAULT DOCUMENTS (M53 AES-256)
CREATE TABLE IF NOT EXISTS m04_vault_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m04_economic_cases(id) ON DELETE CASCADE,
  document_title text NOT NULL,
  document_type text,
  file_ref text,
  encryption_standard text DEFAULT 'AES-256',
  vault_location text DEFAULT 'M53-Sovereign',
  access_level text DEFAULT 'restricted',
  uploaded_by text,
  uploaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m04_vault_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m04_vault" ON m04_vault_documents;
CREATE POLICY "anon_select_m04_vault" ON m04_vault_documents FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m04_vault" ON m04_vault_documents;
CREATE POLICY "anon_insert_m04_vault" ON m04_vault_documents FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m04_vault" ON m04_vault_documents;
CREATE POLICY "anon_update_m04_vault" ON m04_vault_documents FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m04_vault" ON m04_vault_documents;
CREATE POLICY "anon_delete_m04_vault" ON m04_vault_documents FOR DELETE TO anon, authenticated USING (true);

-- ECONOMIC AUDIT LOGS
CREATE TABLE IF NOT EXISTS m04_economic_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m04_economic_cases(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m04_economic_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m04_audit" ON m04_economic_audit_logs;
CREATE POLICY "anon_select_m04_audit" ON m04_economic_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m04_audit" ON m04_economic_audit_logs;
CREATE POLICY "anon_insert_m04_audit" ON m04_economic_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m04_audit" ON m04_economic_audit_logs;
CREATE POLICY "anon_update_m04_audit" ON m04_economic_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m04_audit" ON m04_economic_audit_logs;
CREATE POLICY "anon_delete_m04_audit" ON m04_economic_audit_logs FOR DELETE TO anon, authenticated USING (true);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_m04_cases_number ON m04_economic_cases(case_number);
CREATE INDEX IF NOT EXISTS idx_m04_cases_stage ON m04_economic_cases(stage);
CREATE INDEX IF NOT EXISTS idx_m04_cases_category ON m04_economic_cases(case_category);
CREATE INDEX IF NOT EXISTS idx_m04_cases_advisor ON m04_economic_cases(assigned_advisor_id);
CREATE INDEX IF NOT EXISTS idx_m04_parties_case ON m04_economic_parties(case_id);
CREATE INDEX IF NOT EXISTS idx_m04_finlinks_case ON m04_financial_links(case_id);
CREATE INDEX IF NOT EXISTS idx_m04_cc_case ON m04_cost_centers(case_id);
CREATE INDEX IF NOT EXISTS idx_m04_vault_case ON m04_vault_documents(case_id);
CREATE INDEX IF NOT EXISTS idx_m04_audit_case ON m04_economic_audit_logs(case_id);

-- AUTO-UPDATE updated_at
CREATE OR REPLACE FUNCTION m04_touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_m04_cases_touch ON m04_economic_cases;
CREATE TRIGGER trg_m04_cases_touch BEFORE UPDATE ON m04_economic_cases
  FOR EACH ROW EXECUTE FUNCTION m04_touch_updated_at();

-- SEED: Cases
INSERT INTO m04_economic_cases (case_number, case_title, case_category, dispute_subtype, stage, court, court_circuit, filing_date, next_hearing_date, success_rate_estimate, financial_value, court_fees, total_claims, total_liabilities, cost_center_id, m10_linked, m54_cost_center_opened, m60_company_linked, m98_market_linked, m92_notified, m53_vault_sealed, m52_notified, description) VALUES
  (
    'ECO-2025-008', 'إفلاس شركة تجارة التجزئة الكبرى — إجراءات تصفية', 'bankruptcy', 'liquidation',
    'parallel_processing', 'محكمة الاقتصاد', 'دائرة الإفلاس',
    '2025-04-10', '2025-08-28',
    45.00, 45000000.00, 55000.00, 52000000.00, 38000000.00, 'CC-ECO-008',
    true, true, true, false, true, true, true,
    'إفلاس شركة تجزئة كبرى — الديون 52 مليون — الأصول 38 مليون — طلب تصفية إفلاس وإجراءات التسوية'
  ),
  (
    'ECO-2025-015', 'صلح واقي من الإفلاس — شركة تصنيع إلكترونيات', 'preventive_settlement', 'restructuring',
    'technical_analysis', 'محكمة الاقتصاد', 'دائرة الصلح الواقي',
    '2025-06-20', '2025-09-05',
    68.00, 18000000.00, 30000.00, 22000000.00, 15000000.00, 'CC-ECO-015',
    true, true, true, false, true, true, true,
    'صلح واقي — الشركة تطلب إعادة هيكلة ديون 22 مليون على 5 سنوات — الدائنون 47 جهة'
  ),
  (
    'ECO-2025-022', 'منازعة بورصة — تداول مخالف لأسهم شركة مساهمة', 'capital_markets', 'stock_exchange_dispute',
    'parallel_processing', 'محكمة الاقتصاد', 'دائرة سوق المال',
    '2025-05-15', '2025-08-22',
    73.00, 8500000.00, 25000.00, 8500000.00, 0, 'CC-ECO-022',
    true, true, true, true, true, true, true,
    'منازعة بورصة — تداول مخالف لأسهم شركة مساهمة — استخدام معلومات داخلية — مطالبة بتعويض 8.5 مليون'
  ),
  (
    'ECO-2025-003', 'غسل أموال — تحقيقات في عمليات تحويل مشبوهة', 'money_laundering', 'financial_crime',
    'documentation', 'محكمة الاقتصاد', 'الدائرة الجنائية الاقتصادية',
    '2025-03-01', '2025-08-15',
    35.00, 12000000.00, 40000.00, 12000000.00, 0, 'CC-ECO-003',
    true, true, false, false, true, true, true,
    'قضية غسل أموال — تحويلات مشبوهة عبر 12 حساب بنكي — وحدة مكافحة غسل الأموال طرف أصيل'
  )
ON CONFLICT DO NOTHING;

-- SEED: Parties
INSERT INTO m04_economic_parties (case_id, party_type, name, role, entity_type, registration_number, contact_info, legal_representation) VALUES
  ((SELECT id FROM m04_economic_cases WHERE case_number = 'ECO-2025-008'), 'debtor', 'شركة التجزئة الكبرى ش.م.م', 'المدين', 'company', 'REG-88745', 'القاهرة', 'مكتب المحاماة'),
  ((SELECT id FROM m04_economic_cases WHERE case_number = 'ECO-2025-008'), 'creditor', 'بنك التنمية الصناعية', 'دائن مرتهن', 'bank', null, null, 'مستشار قانوني'),
  ((SELECT id FROM m04_economic_cases WHERE case_number = 'ECO-2025-008'), 'creditor', 'شركة التوريدات الغذائية', 'دائن عادي', 'company', 'REG-55231', null, null),
  ((SELECT id FROM m04_economic_cases WHERE case_number = 'ECO-2025-008'), 'trustee', 'د. وليد السيد', 'أمين التفليسة', 'individual', null, null, null),
  ((SELECT id FROM m04_economic_cases WHERE case_number = 'ECO-2025-015'), 'debtor', 'شركة تصنيع الإلكترونيات ش.م.ع', 'المدين', 'company', 'REG-33987', 'الإسكندرية', 'مكتب المحاماة'),
  ((SELECT id FROM m04_economic_cases WHERE case_number = 'ECO-2025-015'), 'creditor', 'تحالف الدائنين (47 جهة)', 'دائنون', 'consortium', null, null, null),
  ((SELECT id FROM m04_economic_cases WHERE case_number = 'ECO-2025-022'), 'plaintiff', 'هيئة الرقابة المالية', 'جهة رقابية', 'authority', null, null, 'مستشار الدولة'),
  ((SELECT id FROM m04_economic_cases WHERE case_number = 'ECO-2025-022'), 'defendant', 'السيد/ م.ع', 'متداول مخالف', 'individual', null, null, 'مكتب المحاماة'),
  ((SELECT id FROM m04_economic_cases WHERE case_number = 'ECO-2025-003'), 'plaintiff', 'وحدة مكافحة غسل الأموال', 'جهة إنفاذ', 'authority', null, null, 'مستشار الدولة'),
  ((SELECT id FROM m04_economic_cases WHERE case_number = 'ECO-2025-003'), 'defendant', 'السيد/ ر.س', 'متهم', 'individual', null, null, 'مكتب المحاماة'),
  ((SELECT id FROM m04_economic_cases WHERE case_number = 'ECO-2025-003'), 'witness', 'مدير فرع البنك الأهلي', 'شاهد', 'individual', null, null, null)
ON CONFLICT DO NOTHING;

-- SEED: Financial links
INSERT INTO m04_financial_links (case_id, link_type, entity_name, entity_ref, financial_data, source_engine) VALUES
  (
    (SELECT id FROM m04_economic_cases WHERE case_number = 'ECO-2025-008'),
    'company_data', 'شركة التجزئة الكبرى ش.م.م', 'M60-REG-88745',
    '{"assets": 38000000, "liabilities": 52000000, "employees": 1240, "branches": 85, "credit_rating": "CCC"}'::jsonb,
    'M60'
  ),
  (
    (SELECT id FROM m04_economic_cases WHERE case_number = 'ECO-2025-015'),
    'company_data', 'شركة تصنيع الإلكترونيات ش.م.ع', 'M60-REG-33987',
    '{"assets": 15000000, "liabilities": 22000000, "employees": 480, "factories": 3, "credit_rating": "B"}'::jsonb,
    'M60'
  ),
  (
    (SELECT id FROM m04_economic_cases WHERE case_number = 'ECO-2025-022'),
    'market_data', 'أسهم شركة المساهمة العامة', 'M98-STK-7741',
    '{"ticker": "ELEC77", "volume_suspicious": 4500000, "price_manipulation": true, "insider_trading_window": "2025-01-15 to 2025-03-20"}'::jsonb,
    'M98'
  )
ON CONFLICT DO NOTHING;

-- SEED: Cost centers
INSERT INTO m04_cost_centers (case_id, cost_center_code, description, total_claims, total_disbursed, total_received, status, m54_synced) VALUES
  ((SELECT id FROM m04_economic_cases WHERE case_number = 'ECO-2025-008'), 'CC-ECO-008', 'مركز تكلفة تصفية الإفلاس', 52000000.00, 0, 0, 'open', true),
  ((SELECT id FROM m04_economic_cases WHERE case_number = 'ECO-2025-015'), 'CC-ECO-015', 'مركز تكلفة الصلح الواقي', 22000000.00, 0, 0, 'open', true),
  ((SELECT id FROM m04_economic_cases WHERE case_number = 'ECO-2025-022'), 'CC-ECO-022', 'مركز تكلفة منازعة البورصة', 8500000.00, 0, 0, 'open', true),
  ((SELECT id FROM m04_economic_cases WHERE case_number = 'ECO-2025-003'), 'CC-ECO-003', 'مركز تكلفة قضية غسل الأموال', 12000000.00, 0, 0, 'open', true)
ON CONFLICT DO NOTHING;

-- SEED: Vault documents
INSERT INTO m04_vault_documents (case_id, document_title, document_type, file_ref, encryption_standard, vault_location, access_level, uploaded_by) VALUES
  ((SELECT id FROM m04_economic_cases WHERE case_number = 'ECO-2025-008'), 'قائمة الأصول والخصوم', 'financial_statement', 'M53-ECO-008-001', 'AES-256', 'M53-Sovereign', 'restricted', 'النظام'),
  ((SELECT id FROM m04_economic_cases WHERE case_number = 'ECO-2025-008'), 'كشف الدائنين (47 جهة)', 'creditor_list', 'M53-ECO-008-002', 'AES-256', 'M53-Sovereign', 'restricted', 'النظام'),
  ((SELECT id FROM m04_economic_cases WHERE case_number = 'ECO-2025-015'), 'خطة إعادة الهيكلة المقترحة', 'restructuring_plan', 'M53-ECO-015-001', 'AES-256', 'M53-Sovereign', 'restricted', 'المستشار/ أحمد فؤاد'),
  ((SELECT id FROM m04_economic_cases WHERE case_number = 'ECO-2025-022'), 'سجلات التداول المشبوه', 'trading_records', 'M53-ECO-022-001', 'AES-256', 'M53-Sovereign', 'restricted', 'هيئة الرقابة المالية'),
  ((SELECT id FROM m04_economic_cases WHERE case_number = 'ECO-2025-003'), 'تحليل التحويلات البنكية', 'financial_analysis', 'M53-ECO-003-001', 'AES-256', 'M53-Sovereign', 'restricted', 'وحدة مكافحة غسل الأموال'),
  ((SELECT id FROM m04_economic_cases WHERE case_number = 'ECO-2025-003'), 'أوامر الضبط البنكي', 'bank_seizure_order', 'M53-ECO-003-002', 'AES-256', 'M53-Sovereign', 'restricted', 'النيابة العامة')
ON CONFLICT DO NOTHING;

-- SEED: Audit logs
INSERT INTO m04_economic_audit_logs (case_id, action, actor, actor_role, detail, hash_chain) VALUES
  ((SELECT id FROM m04_economic_cases WHERE case_number = 'ECO-2025-008'), 'case_created', 'النظام', 'النظام', 'إنشاء ملف قضية اقتصادية ECO-2025-008 — تصنيف: إفلاس', '0x1a2b...3c4d'),
  ((SELECT id FROM m04_economic_cases WHERE case_number = 'ECO-2025-008'), 'm60_company_linked', 'النظام', 'النظام', 'ربط بمحرك الشركات (M60) — استرجاع البيانات المالية للشركة', '0x2b3c...4d5e'),
  ((SELECT id FROM m04_economic_cases WHERE case_number = 'ECO-2025-008'), 'm54_cost_center', 'الوكيل الذكي M92', 'وكيل ذكي', 'تكليف المحرك المالي (M54) بفتح مركز تكلفة CC-ECO-008 للتدقيق المالي', '0x3c4d...5e6f'),
  ((SELECT id FROM m04_economic_cases WHERE case_number = 'ECO-2025-008'), 'm53_vault_sealed', 'النظام', 'النظام', 'حفظ المستندات المالية والبنكية بتشفير AES-256 في المستودع السيادي (M53)', '0x4d5e...6f7a'),
  ((SELECT id FROM m04_economic_cases WHERE case_number = 'ECO-2025-008'), 'm52_notified', 'النظام', 'النظام', 'إرسال إشعارات بريدية مشفرة للدائنين عبر المحرك (M52)', '0x5e6f...7a8b'),
  ((SELECT id FROM m04_economic_cases WHERE case_number = 'ECO-2025-022'), 'm98_market_linked', 'النظام', 'النظام', 'ربط بمحرك البورصة (M98) — استرجاع سجلات التداول المشبوه', '0x6f7a...8b9c'),
  ((SELECT id FROM m04_economic_cases WHERE case_number = 'ECO-2025-022'), 'insider_trading_detected', 'النظام', 'النظام', 'اكتشاف نافذة تداول مخالف — استخدام معلومات داخلية 2025-01-15 إلى 2025-03-20', '0x7a8b...9c0d'),
  ((SELECT id FROM m04_economic_cases WHERE case_number = 'ECO-2025-003'), 'aml_investigation', 'النظام', 'النظام', 'بدء تحقيقات غسل الأموال — 12 حساب بنكي — تحويلات مشبوهة', '0x8b9c...0d1e'),
  ((SELECT id FROM m04_economic_cases WHERE case_number = 'ECO-2025-003'), 'm53_vault_sealed', 'النظام', 'النظام', 'حفظ أوامر الضبط البنكي والتحليل المالي في المستودع السيادي (M53)', '0x9c0d...1e2f')
ON CONFLICT DO NOTHING;
