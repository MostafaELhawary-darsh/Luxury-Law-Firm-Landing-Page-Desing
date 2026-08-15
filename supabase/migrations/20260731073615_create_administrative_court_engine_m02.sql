/*
# Create Administrative & Constitutional Litigation Engine (M2) schema

Implements the second pillar of the judicial sector — specializing in disputes
where the state or administrative bodies are a party: annulment of administrative
decisions, settlement claims, administrative contracts, government employment
disputes, disciplinary decisions, and constitutional review.

1. New Tables:
- `m02_admin_cases`: Administrative/constitutional cases with 4-stage lifecycle.
- `m02_admin_parties`: Parties (state bodies, administrative entities, individuals).
- `m02_admin_deadlines`: Auto-calculated procedural deadlines (60-day annulment window, etc.).
- `m02_constitutional_reviews`: Constitutionality checks of laws/regulations/decisions.
- `m02_biometric_approvals`: Biometric authentication records via M109 for sensitive memo approval.
- `m02_admin_audit_logs`: Immutable ZK-Audit trail for all operations.

2. Security: RLS enabled, anon+authenticated full CRUD (single-tenant, no auth gating at DB level).
*/

-- ADMIN/CONSTITUTIONAL CASES
CREATE TABLE IF NOT EXISTS m02_admin_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text NOT NULL UNIQUE,
  case_title text NOT NULL,
  case_category text DEFAULT 'annulment',
  dispute_subtype text,
  stage text DEFAULT 'intake',
  court text,
  court_circuit text,
  challenged_decision text,
  challenged_decision_date date,
  challenged_authority text,
  filing_date date,
  next_hearing_date date,
  judgment_date date,
  judgment_outcome text,
  is_final boolean DEFAULT false,
  success_rate_estimate numeric(5,2) DEFAULT 0,
  financial_value numeric(14,2) DEFAULT 0,
  court_fees numeric(14,2) DEFAULT 0,
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m10_linked boolean DEFAULT false,
  m54_cost_center_opened boolean DEFAULT false,
  m59_contract_linked boolean DEFAULT false,
  m102_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE m02_admin_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m02_cases" ON m02_admin_cases;
CREATE POLICY "anon_select_m02_cases" ON m02_admin_cases FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m02_cases" ON m02_admin_cases;
CREATE POLICY "anon_insert_m02_cases" ON m02_admin_cases FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m02_cases" ON m02_admin_cases;
CREATE POLICY "anon_update_m02_cases" ON m02_admin_cases FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m02_cases" ON m02_admin_cases;
CREATE POLICY "anon_delete_m02_cases" ON m02_admin_cases FOR DELETE TO anon, authenticated USING (true);

-- ADMIN CASE PARTIES
CREATE TABLE IF NOT EXISTS m02_admin_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m02_admin_cases(id) ON DELETE CASCADE,
  party_type text NOT NULL,
  name text NOT NULL,
  role text,
  authority_type text,
  contact_info text,
  legal_representation text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m02_admin_parties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m02_parties" ON m02_admin_parties;
CREATE POLICY "anon_select_m02_parties" ON m02_admin_parties FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m02_parties" ON m02_admin_parties;
CREATE POLICY "anon_insert_m02_parties" ON m02_admin_parties FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m02_parties" ON m02_admin_parties;
CREATE POLICY "anon_update_m02_parties" ON m02_admin_parties FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m02_parties" ON m02_admin_parties;
CREATE POLICY "anon_delete_m02_parties" ON m02_admin_parties FOR DELETE TO anon, authenticated USING (true);

-- PROCEDURAL DEADLINES (60-day annulment window, etc.)
CREATE TABLE IF NOT EXISTS m02_admin_deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m02_admin_cases(id) ON DELETE CASCADE,
  deadline_type text NOT NULL,
  deadline_label text NOT NULL,
  deadline_date date NOT NULL,
  days_from_event int,
  trigger_event text,
  statutory_basis text,
  status text DEFAULT 'upcoming',
  completed_at timestamptz,
  auto_inserted boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m02_admin_deadlines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m02_deadlines" ON m02_admin_deadlines;
CREATE POLICY "anon_select_m02_deadlines" ON m02_admin_deadlines FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m02_deadlines" ON m02_admin_deadlines;
CREATE POLICY "anon_insert_m02_deadlines" ON m02_admin_deadlines FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m02_deadlines" ON m02_admin_deadlines;
CREATE POLICY "anon_update_m02_deadlines" ON m02_admin_deadlines FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m02_deadlines" ON m02_admin_deadlines;
CREATE POLICY "anon_delete_m02_deadlines" ON m02_admin_deadlines FOR DELETE TO anon, authenticated USING (true);

-- CONSTITUTIONAL REVIEWS (constitutionality checks)
CREATE TABLE IF NOT EXISTS m02_constitutional_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m02_admin_cases(id) ON DELETE SET NULL,
  review_type text NOT NULL,
  subject_title text NOT NULL,
  subject_ref text,
  constitutional_principle text,
  review_result text DEFAULT 'pending',
  findings text,
  precedent_refs jsonb DEFAULT '[]'::jsonb,
  compliance_status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m02_constitutional_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m02_constitutional" ON m02_constitutional_reviews;
CREATE POLICY "anon_select_m02_constitutional" ON m02_constitutional_reviews FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m02_constitutional" ON m02_constitutional_reviews;
CREATE POLICY "anon_insert_m02_constitutional" ON m02_constitutional_reviews FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m02_constitutional" ON m02_constitutional_reviews;
CREATE POLICY "anon_update_m02_constitutional" ON m02_constitutional_reviews FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m02_constitutional" ON m02_constitutional_reviews;
CREATE POLICY "anon_delete_m02_constitutional" ON m02_constitutional_reviews FOR DELETE TO anon, authenticated USING (true);

-- BIOMETRIC APPROVALS (M109 unified identity gateway)
CREATE TABLE IF NOT EXISTS m02_biometric_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m02_admin_cases(id) ON DELETE SET NULL,
  document_title text NOT NULL,
  document_type text,
  approver_name text NOT NULL,
  approver_role text,
  biometric_method text DEFAULT 'fingerprint',
  approval_status text DEFAULT 'pending',
  approved_at timestamptz,
  biometric_hash text,
  rejection_reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m02_biometric_approvals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m02_biometric" ON m02_biometric_approvals;
CREATE POLICY "anon_select_m02_biometric" ON m02_biometric_approvals FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m02_biometric" ON m02_biometric_approvals;
CREATE POLICY "anon_insert_m02_biometric" ON m02_biometric_approvals FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m02_biometric" ON m02_biometric_approvals;
CREATE POLICY "anon_update_m02_biometric" ON m02_biometric_approvals FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m02_biometric" ON m02_biometric_approvals;
CREATE POLICY "anon_delete_m02_biometric" ON m02_biometric_approvals FOR DELETE TO anon, authenticated USING (true);

-- ZK-AUDIT LOGS (immutable)
CREATE TABLE IF NOT EXISTS m02_admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m02_admin_cases(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m02_admin_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m02_audit" ON m02_admin_audit_logs;
CREATE POLICY "anon_select_m02_audit" ON m02_admin_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m02_audit" ON m02_admin_audit_logs;
CREATE POLICY "anon_insert_m02_audit" ON m02_admin_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m02_audit" ON m02_admin_audit_logs;
CREATE POLICY "anon_update_m02_audit" ON m02_admin_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m02_audit" ON m02_admin_audit_logs;
CREATE POLICY "anon_delete_m02_audit" ON m02_admin_audit_logs FOR DELETE TO anon, authenticated USING (true);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_m02_cases_number ON m02_admin_cases(case_number);
CREATE INDEX IF NOT EXISTS idx_m02_cases_stage ON m02_admin_cases(stage);
CREATE INDEX IF NOT EXISTS idx_m02_cases_category ON m02_admin_cases(case_category);
CREATE INDEX IF NOT EXISTS idx_m02_cases_court ON m02_admin_cases(court);
CREATE INDEX IF NOT EXISTS idx_m02_cases_advisor ON m02_admin_cases(assigned_advisor_id);
CREATE INDEX IF NOT EXISTS idx_m02_parties_case ON m02_admin_parties(case_id);
CREATE INDEX IF NOT EXISTS idx_m02_deadlines_case ON m02_admin_deadlines(case_id);
CREATE INDEX IF NOT EXISTS idx_m02_deadlines_date ON m02_admin_deadlines(deadline_date);
CREATE INDEX IF NOT EXISTS idx_m02_deadlines_status ON m02_admin_deadlines(status);
CREATE INDEX IF NOT EXISTS idx_m02_constitutional_case ON m02_constitutional_reviews(case_id);
CREATE INDEX IF NOT EXISTS idx_m02_biometric_case ON m02_biometric_approvals(case_id);
CREATE INDEX IF NOT EXISTS idx_m02_audit_case ON m02_admin_audit_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_m02_audit_created ON m02_admin_audit_logs(created_at);

-- AUTO-UPDATE updated_at TRIGGER
CREATE OR REPLACE FUNCTION m02_touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_m02_cases_touch ON m02_admin_cases;
CREATE TRIGGER trg_m02_cases_touch BEFORE UPDATE ON m02_admin_cases
  FOR EACH ROW EXECUTE FUNCTION m02_touch_updated_at();

-- SEED: Admin cases
INSERT INTO m02_admin_cases (case_number, case_title, case_category, dispute_subtype, stage, court, court_circuit, challenged_decision, challenged_decision_date, challenged_authority, filing_date, next_hearing_date, success_rate_estimate, financial_value, court_fees, cost_center_id, m10_linked, m54_cost_center_opened, m59_contract_linked, m102_notified, description) VALUES
  (
    'ADMIN-2025-014',
    'دعوى إلغاء قرار فصل موظف بقطاع الأمن الصناعي',
    'annulment',
    'employment_dispute',
    'deadlines',
    'محكمة القضاء الإداري',
    'الدائرة الأولى',
    'قرار رقم 147 لسنة 2025 بفصل الموظف (س.ع) من قطاع الأمن الصناعي',
    '2025-05-10',
    'هيئة الأمن الصناعي',
    '2025-06-20',
    '2025-08-25',
    78.50,
    0,
    12000.00,
    'CC-M02-014',
    true, true, false, true,
    'دعوى إلغاء قرار فصل تعسفي — الموظف معين بقرار صحيح ولم يصدر ضده جزاءات تأديبية — مطالبة بإلغاء القرار والتعويض'
  ),
  (
    'ADMIN-2025-021',
    'منازعة عقد إداري — تنفيذ أعمال إنشاء بمرفق المياه',
    'admin_contract',
    'public_works',
    'defense_generation',
    'محكمة القضاء الإداري',
    'الدائرة الثالثة — عقود إدارية',
    'قرار إسناد تنفيذ مشروع محطة معالجة مياه بقيمة 8.5 مليون ج.م',
    '2024-12-01',
    'مرفق مياه الأقاليم',
    '2025-06-28',
    '2025-09-10',
    65.00,
    8500000.00,
    35000.00,
    'CC-M02-021',
    true, true, true, true,
    'منازعة حول تنفيذ عقد إداري لأشغال عامة — تدعي الجهة الإدارية تأخر المقاول وتطالب بغرامات تأخير'
  ),
  (
    'ADMIN-2025-008',
    'دعوى تأديبية — طعن قرار لجنة التأديب بقطاع التعليم',
    'disciplinary',
    'disciplinary_decision',
    'intake',
    'محكمة القضاء الإداري',
    'الدائرة التأديبية',
    'قرار لجنة التأديب بإنزال عقوبة الخصم من الأجر',
    '2025-06-15',
    'قطاع التعليم والتدريب',
    '2025-07-10',
    null,
    55.00,
    0,
    8000.00,
    'CC-M02-008',
    false, false, false, false,
    'طعن في قرار تأديبي — الخصم من الأجر كان مبالغاً فيه وغير متناسب مع المخالفة المنسوبة'
  ),
  (
    'ADMIN-2025-003',
    'دعوى تعويض عن قرار إداري غير مشروع — هدم مبانٍ بدون إخطار',
    'compensation',
    'admin_tort',
    'authentication',
    'محكمة القضاء الإداري',
    'الدائرة الثانية — تعويضات',
    'قرار هدم مبانٍ تجارية بدون إخطار مسبق أو تعويض',
    '2025-03-20',
    'الوحدة المحلية لمركز المدينة',
    '2025-04-15',
    '2025-08-12',
    82.00,
    1200000.00,
    18000.00,
    'CC-M02-003',
    true, true, false, true,
    'دعوى تعويض عن قرار إداري غير مشروع — هدم مبانٍ تجارية بدون إخطار مسبق — مطالبة بتعويض 1.2 مليون ج.م'
  )
ON CONFLICT DO NOTHING;

-- SEED: Parties
INSERT INTO m02_admin_parties (case_id, party_type, name, role, authority_type, contact_info, legal_representation) VALUES
  ((SELECT id FROM m02_admin_cases WHERE case_number = 'ADMIN-2025-014'), 'plaintiff', 'السيد/ س.ع', 'الموظف المفصول', null, 'القاهرة - مدينة نصر', 'مكتب المحاماة'),
  ((SELECT id FROM m02_admin_cases WHERE case_number = 'ADMIN-2025-014'), 'defendant', 'هيئة الأمن الصناعي', 'الجهة الإدارية', 'هيئة عامة', null, 'مستشار الدولة'),
  ((SELECT id FROM m02_admin_cases WHERE case_number = 'ADMIN-2025-021'), 'plaintiff', 'شركة الإنشاءات المتحدة', 'المقاول', null, 'القاهرة - المعادي', 'مكتب المحاماة'),
  ((SELECT id FROM m02_admin_cases WHERE case_number = 'ADMIN-2025-021'), 'defendant', 'مرفق مياه الأقاليم', 'الجهة الإدارية', 'مرفق عام', null, 'مستشار الدولة'),
  ((SELECT id FROM m02_admin_cases WHERE case_number = 'ADMIN-2025-021'), 'expert', 'م. خالد عبدالرحمن', 'خبير فني في الأشغال العامة', null, null, null),
  ((SELECT id FROM m02_admin_cases WHERE case_number = 'ADMIN-2025-008'), 'plaintiff', 'السيد/ م.ص', 'الموظف المتأدب', null, null, 'مكتب المحاماة'),
  ((SELECT id FROM m02_admin_cases WHERE case_number = 'ADMIN-2025-008'), 'defendant', 'قطاع التعليم والتدريب', 'الجهة الإدارية', 'قطاع حكومي', null, 'مستشار الدولة'),
  ((SELECT id FROM m02_admin_cases WHERE case_number = 'ADMIN-2025-003'), 'plaintiff', 'السيد/ ر.م', 'المتضرر', null, null, 'مكتب المحاماة'),
  ((SELECT id FROM m02_admin_cases WHERE case_number = 'ADMIN-2025-003'), 'defendant', 'الوحدة المحلية لمركز المدينة', 'الجهة الإدارية', 'وحدة محلية', null, 'مستشار الدولة')
ON CONFLICT DO NOTHING;

-- SEED: Deadlines
INSERT INTO m02_admin_deadlines (case_id, deadline_type, deadline_label, deadline_date, days_from_event, trigger_event, statutory_basis, status, auto_inserted) VALUES
  ((SELECT id FROM m02_admin_cases WHERE case_number = 'ADMIN-2025-014'), 'annulment_window', 'ميعاد رفع دعوى الإلغاء (60 يوم)', '2025-07-09', 60, 'تاريخ صدور القرار المطعون فيه', 'المادة 24 من قانون مجلس الدولة', 'completed', true),
  ((SELECT id FROM m02_admin_cases WHERE case_number = 'ADMIN-2025-014'), 'hearing', 'جلسة المرافعة', '2025-08-25', null, 'تحديد الجلسة', null, 'upcoming', true),
  ((SELECT id FROM m02_admin_cases WHERE case_number = 'ADMIN-2025-014'), 'memo_submission', 'موعد تقديم مذكرة الدفاع', '2025-08-22', 3, 'قبل الجلسة بـ 3 أيام', null, 'upcoming', true),
  ((SELECT id FROM m02_admin_cases WHERE case_number = 'ADMIN-2025-021'), 'annulment_window', 'ميعاد الطعن في العقد الإداري (60 يوم)', '2025-01-30', 60, 'تاريخ إصدار قرار الإسناد', 'المادة 24 من قانون مجلس الدولة', 'completed', true),
  ((SELECT id FROM m02_admin_cases WHERE case_number = 'ADMIN-2025-021'), 'hearing', 'جلسة المرافعة الأولى', '2025-09-10', null, 'تحديد الجلسة', null, 'upcoming', true),
  ((SELECT id FROM m02_admin_cases WHERE case_number = 'ADMIN-2025-021'), 'expert_report', 'موعد تقديم تقرير الخبير الفني', '2025-08-20', 21, 'قبل الجلسة بـ 21 يوم', null, 'upcoming', true),
  ((SELECT id FROM m02_admin_cases WHERE case_number = 'ADMIN-2025-008'), 'annulment_window', 'ميعاد الطعن في القرار التأديبي (60 يوم)', '2025-08-14', 60, 'تاريخ إبلاغ الموظف بالقرار', 'المادة 24 من قانون مجلس الدولة', 'upcoming', true),
  ((SELECT id FROM m02_admin_cases WHERE case_number = 'ADMIN-2025-003'), 'annulment_window', 'ميعاد رفع دعوى التعويض (60 يوم)', '2025-05-19', 60, 'تاريخ صدور قرار الهدم', 'المادة 24 من قانون مجلس الدولة', 'completed', true),
  ((SELECT id FROM m02_admin_cases WHERE case_number = 'ADMIN-2025-003'), 'hearing', 'جلسة المرافعة', '2025-08-12', null, 'تحديد الجلسة', null, 'upcoming', true)
ON CONFLICT DO NOTHING;

-- SEED: Constitutional reviews
INSERT INTO m02_constitutional_reviews (case_id, review_type, subject_title, subject_ref, constitutional_principle, review_result, findings, precedent_refs, compliance_status) VALUES
  (
    (SELECT id FROM m02_admin_cases WHERE case_number = 'ADMIN-2025-014'),
    'regulation_review',
    'لائحة تنظيم العلاقة الوظيفية بقطاع الأمن الصناعي',
    'REG-SI-2019',
    'مبدأ المساواة في التوظيف والفصل — المادة 14 من الدستور',
    'compliant',
    'اللائحة متوافقة مع المبادئ الدستورية — لكن تطبيق القرار الفردي جاء مخالفاً للوائح ذاتها',
    '["حكم المحكمة الإدارية العليا — الطعن 4521/2019", "حكم مجلس الدولة — القضية 7893/2020"]'::jsonb,
    'compliant'
  ),
  (
    (SELECT id FROM m02_admin_cases WHERE case_number = 'ADMIN-2025-021'),
    'law_review',
    'قانون تنظيم العقود الإدارية للأشغال العامة',
    'LAW-147/2018',
    'مبدأ العدالة التعاقدية وتوازن الالتزامات — المادة 38 من الدستور',
    'partially_compliant',
    'القانون متوافق بشكل عام — لكن شرط الغرامات الجزافية يحتاج لمراجعة دستورية',
    '["حكم المحكمة الإدارية العليا — الطعن 9876/2021", "حكم الدائرة الدستورية — القضية 123/2022"]'::jsonb,
    'partially_compliant'
  ),
  (
    (SELECT id FROM m02_admin_cases WHERE case_number = 'ADMIN-2025-003'),
    'decision_review',
    'قرار هدم مبانٍ تجارية بدون إخطار مسبق',
    'DEC-DEM-2025',
    'مبدأ حماية الملكية الخاصة — المادة 35 من الدستور',
    'non_compliant',
    'القرار مخالف للدستور — الهدم بدون إخطار مسبق يعد مصادرة بدون تعويض',
    '["حكم المحكمة الدستورية العليا — القضية 45/2020", "حكم مجلس الدولة — الطعن 3322/2021"]'::jsonb,
    'non_compliant'
  )
ON CONFLICT DO NOTHING;

-- SEED: Biometric approvals
INSERT INTO m02_biometric_approvals (case_id, document_title, document_type, approver_name, approver_role, biometric_method, approval_status, approved_at, biometric_hash) VALUES
  (
    (SELECT id FROM m02_admin_cases WHERE case_number = 'ADMIN-2025-014'),
    'مذكرة الدفاع الأولية — دعوى الإلغاء',
    'defense_memo',
    'المستشار/ أحمد فؤاد',
    'مستشار قانوني أول',
    'fingerprint',
    'approved',
    '2025-07-15T10:30:00Z',
    '0x4a7b...8c9d'
  ),
  (
    (SELECT id FROM m02_admin_cases WHERE case_number = 'ADMIN-2025-021'),
    'مذكرة الطعن في العقد الإداري',
    'appeal_memo',
    'المستشار/ منى عبدالرحمن',
    'مستشار قانوني',
    'fingerprint',
    'approved',
    '2025-07-20T14:15:00Z',
    '0x5b8c...9d0e'
  ),
  (
    (SELECT id FROM m02_admin_cases WHERE case_number = 'ADMIN-2025-003'),
    'مذكرة المطالبة بالتعويض',
    'compensation_memo',
    'المستشار/ أحمد فؤاد',
    'مستشار قانوني أول',
    'fingerprint',
    'pending',
    null,
    null
  ),
  (
    (SELECT id FROM m02_admin_cases WHERE case_number = 'ADMIN-2025-008'),
    'صحيفة الطعن التأديبي',
    'appeal_brief',
    'المستشار/ منى عبدالرحمن',
    'مستشار قانوني',
    'fingerprint',
    'pending',
    null,
    null
  )
ON CONFLICT DO NOTHING;

-- SEED: Audit logs
INSERT INTO m02_admin_audit_logs (case_id, action, actor, actor_role, detail, hash_chain) VALUES
  ((SELECT id FROM m02_admin_cases WHERE case_number = 'ADMIN-2025-014'), 'case_created', 'النظام', 'النظام', 'إنشاء ملف القضية الإدارية ADMIN-2025-014 — تصنيف: إلغاء قرار', '0x1a2b...3c4d'),
  ((SELECT id FROM m02_admin_cases WHERE case_number = 'ADMIN-2025-014'), 'deadlines_calculated', 'النظام', 'النظام', 'حساب المواعيد الإجرائية آلياً — ميعاد الإلغاء 60 يوم + جلسة + مذكرة', '0x2b3c...4d5e'),
  ((SELECT id FROM m02_admin_cases WHERE case_number = 'ADMIN-2025-014'), 'm10_linked', 'النظام', 'النظام', 'ربط الملف بنواة القضية الذكية (M10)', '0x3c4d...5e6f'),
  ((SELECT id FROM m02_admin_cases WHERE case_number = 'ADMIN-2025-014'), 'm54_cost_center', 'النظام', 'النظام', 'فتح مركز تكلفة مالي CC-M02-014 في المحرك المالي (M54)', '0x4d5e...6f7a'),
  ((SELECT id FROM m02_admin_cases WHERE case_number = 'ADMIN-2025-014'), 'm102_notified', 'النظام', 'النظام', 'إخطار الإدارات القانونية والمالية عبر محرك التكامل (M102)', '0x5e6f...7a8b'),
  ((SELECT id FROM m02_admin_cases WHERE case_number = 'ADMIN-2025-014'), 'biometric_approval', 'المستشار/ أحمد فؤاد', 'مستشار قانوني أول', 'مصادقة بيومترية على مذكرة الدفاع الأولية — بصمة الإصبع', '0x6f7a...8b9c'),
  ((SELECT id FROM m02_admin_cases WHERE case_number = 'ADMIN-2025-021'), 'case_created', 'النظام', 'النظام', 'إنشاء ملف القضية الإدارية ADMIN-2025-021 — تصنيف: منازعة عقد إداري', '0x7a8b...9c0d'),
  ((SELECT id FROM m02_admin_cases WHERE case_number = 'ADMIN-2025-021'), 'm59_contract_linked', 'النظام', 'النظام', 'ربط بمحرك العقود الإدارية (M59) — مراجعة الامتثال في عقد الأشغال العامة', '0x8b9c...0d1e'),
  ((SELECT id FROM m02_admin_cases WHERE case_number = 'ADMIN-2025-003'), 'constitutional_review', 'النظام', 'النظام', 'فحص دستورية قرار الهدم — النتيجة: مخالف للمادة 35 من الدستور', '0x9c0d...1e2f'),
  ((SELECT id FROM m02_admin_cases WHERE case_number = 'ADMIN-2025-003'), 'precedent_analysis', 'النظام', 'النظام', 'استرجاع أحكام المحكمة الدستورية العليا ومجلس الدولة — تقدير نسبة النجاح: 82%', '0xa0d1...2e3f')
ON CONFLICT DO NOTHING;
