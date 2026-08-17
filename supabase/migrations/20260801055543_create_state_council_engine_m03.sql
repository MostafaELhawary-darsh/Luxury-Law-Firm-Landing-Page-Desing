/*
# Create State Council Court Engine (M3) schema

The sovereign tool for disputes where the state or administrative bodies are a party.
Specializes in: annulment of administrative decisions (appointment, promotion, license
revocation), public works & government procurement contracts, administrative appeals
before the Supreme Administrative Court.

4-stage lifecycle: Ingestion → Deadline Control → Operational Integration → Resolution

Integration: M10 (smart case core), M59 (admin contracts), M54 (financial engine)

1. New Tables:
- `m03_state_council_cases`: State council cases with 4-stage lifecycle.
- `m03_council_parties`: Parties (state bodies, administrative entities, individuals).
- `m03_council_deadlines`: Auto-calculated 60-day annulment deadlines + hearing dates.
- `m03_contract_links`: Links to M59 administrative contract engine for procurement disputes.
- `m03_council_audit_logs`: Immutable ZK-Audit trail.

2. Security: RLS enabled, anon+authenticated full CRUD.
*/

-- STATE COUNCIL CASES
CREATE TABLE IF NOT EXISTS m03_state_council_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text NOT NULL UNIQUE,
  case_title text NOT NULL,
  case_category text DEFAULT 'annulment',
  dispute_subtype text,
  stage text DEFAULT 'ingestion',
  court text,
  court_circuit text,
  challenged_decision text,
  challenged_decision_date date,
  challenged_authority text,
  decision_type text,
  filing_date date,
  next_hearing_date date,
  judgment_date date,
  judgment_outcome text,
  is_final boolean DEFAULT false,
  success_rate_estimate numeric(5,2) DEFAULT 0,
  financial_value numeric(14,2) DEFAULT 0,
  court_fees numeric(14,2) DEFAULT 0,
  compensation_claimed numeric(14,2) DEFAULT 0,
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m10_linked boolean DEFAULT false,
  m54_cost_center_opened boolean DEFAULT false,
  m59_contract_linked boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  m52_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE m03_state_council_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m03_cases" ON m03_state_council_cases;
CREATE POLICY "anon_select_m03_cases" ON m03_state_council_cases FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m03_cases" ON m03_state_council_cases;
CREATE POLICY "anon_insert_m03_cases" ON m03_state_council_cases FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m03_cases" ON m03_state_council_cases;
CREATE POLICY "anon_update_m03_cases" ON m03_state_council_cases FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m03_cases" ON m03_state_council_cases;
CREATE POLICY "anon_delete_m03_cases" ON m03_state_council_cases FOR DELETE TO anon, authenticated USING (true);

-- COUNCIL PARTIES
CREATE TABLE IF NOT EXISTS m03_council_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m03_state_council_cases(id) ON DELETE CASCADE,
  party_type text NOT NULL,
  name text NOT NULL,
  role text,
  authority_type text,
  contact_info text,
  legal_representation text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m03_council_parties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m03_parties" ON m03_council_parties;
CREATE POLICY "anon_select_m03_parties" ON m03_council_parties FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m03_parties" ON m03_council_parties;
CREATE POLICY "anon_insert_m03_parties" ON m03_council_parties FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m03_parties" ON m03_council_parties;
CREATE POLICY "anon_update_m03_parties" ON m03_council_parties FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m03_parties" ON m03_council_parties;
CREATE POLICY "anon_delete_m03_parties" ON m03_council_parties FOR DELETE TO anon, authenticated USING (true);

-- COUNCIL DEADLINES
CREATE TABLE IF NOT EXISTS m03_council_deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m03_state_council_cases(id) ON DELETE CASCADE,
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

ALTER TABLE m03_council_deadlines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m03_deadlines" ON m03_council_deadlines;
CREATE POLICY "anon_select_m03_deadlines" ON m03_council_deadlines FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m03_deadlines" ON m03_council_deadlines;
CREATE POLICY "anon_insert_m03_deadlines" ON m03_council_deadlines FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m03_deadlines" ON m03_council_deadlines;
CREATE POLICY "anon_update_m03_deadlines" ON m03_council_deadlines FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m03_deadlines" ON m03_council_deadlines;
CREATE POLICY "anon_delete_m03_deadlines" ON m03_council_deadlines FOR DELETE TO anon, authenticated USING (true);

-- CONTRACT LINKS (M59 integration)
CREATE TABLE IF NOT EXISTS m03_contract_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m03_state_council_cases(id) ON DELETE CASCADE,
  contract_title text NOT NULL,
  contract_ref text,
  contract_type text,
  contract_value numeric(14,2) DEFAULT 0,
  government_entity text,
  compliance_status text DEFAULT 'pending',
  compliance_findings text,
  m59_synced boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m03_contract_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m03_contracts" ON m03_contract_links;
CREATE POLICY "anon_select_m03_contracts" ON m03_contract_links FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m03_contracts" ON m03_contract_links;
CREATE POLICY "anon_insert_m03_contracts" ON m03_contract_links FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m03_contracts" ON m03_contract_links;
CREATE POLICY "anon_update_m03_contracts" ON m03_contract_links FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m03_contracts" ON m03_contract_links;
CREATE POLICY "anon_delete_m03_contracts" ON m03_contract_links FOR DELETE TO anon, authenticated USING (true);

-- COUNCIL AUDIT LOGS
CREATE TABLE IF NOT EXISTS m03_council_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m03_state_council_cases(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m03_council_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m03_audit" ON m03_council_audit_logs;
CREATE POLICY "anon_select_m03_audit" ON m03_council_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m03_audit" ON m03_council_audit_logs;
CREATE POLICY "anon_insert_m03_audit" ON m03_council_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m03_audit" ON m03_council_audit_logs;
CREATE POLICY "anon_update_m03_audit" ON m03_council_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m03_audit" ON m03_council_audit_logs;
CREATE POLICY "anon_delete_m03_audit" ON m03_council_audit_logs FOR DELETE TO anon, authenticated USING (true);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_m03_cases_number ON m03_state_council_cases(case_number);
CREATE INDEX IF NOT EXISTS idx_m03_cases_stage ON m03_state_council_cases(stage);
CREATE INDEX IF NOT EXISTS idx_m03_cases_category ON m03_state_council_cases(case_category);
CREATE INDEX IF NOT EXISTS idx_m03_cases_advisor ON m03_state_council_cases(assigned_advisor_id);
CREATE INDEX IF NOT EXISTS idx_m03_parties_case ON m03_council_parties(case_id);
CREATE INDEX IF NOT EXISTS idx_m03_deadlines_case ON m03_council_deadlines(case_id);
CREATE INDEX IF NOT EXISTS idx_m03_deadlines_date ON m03_council_deadlines(deadline_date);
CREATE INDEX IF NOT EXISTS idx_m03_contracts_case ON m03_contract_links(case_id);
CREATE INDEX IF NOT EXISTS idx_m03_audit_case ON m03_council_audit_logs(case_id);

-- AUTO-UPDATE updated_at
CREATE OR REPLACE FUNCTION m03_touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_m03_cases_touch ON m03_state_council_cases;
CREATE TRIGGER trg_m03_cases_touch BEFORE UPDATE ON m03_state_council_cases
  FOR EACH ROW EXECUTE FUNCTION m03_touch_updated_at();

-- SEED: Cases
INSERT INTO m03_state_council_cases (case_number, case_title, case_category, dispute_subtype, stage, court, court_circuit, challenged_decision, challenged_decision_date, challenged_authority, decision_type, filing_date, next_hearing_date, success_rate_estimate, financial_value, court_fees, compensation_claimed, cost_center_id, m10_linked, m54_cost_center_opened, m59_contract_linked, m92_notified, m52_notified, description) VALUES
  (
    'SC-2025-031', 'دعوى إلغاء قرار سحب ترخيص صناعي', 'annulment', 'license_revocation',
    'deadline_control', 'المحكمة الإدارية العليا', 'الدائرة الأولى — إلغاء قرارات إدارية',
    'قرار رقم 88 لسنة 2025 بسحب ترخيص صناعي منشأة كيماويات', '2025-04-12', 'جهاز تنظيم الصناعة',
    'license_revocation', '2025-05-20', '2025-09-15',
    72.00, 0, 15000.00, 0, 'CC-M03-031',
    true, true, false, true, true,
    'دعوى إلغاء قرار سحب ترخيص — المنشأة تدير عملياتها منذ 10 سنوات دون مخالفات — القرار صدر بدون إخطار مسبق'
  ),
  (
    'SC-2025-047', 'منازعة عقد أشغال عامة — تنفيذ طريق إقليمي', 'public_works', 'procurement_contract',
    'operational_integration', 'محكمة القضاء الإداري', 'الدائرة الثالثة — عقود إدارية',
    'قرار إسناد تنفيذ طريق إقليمي بطول 45 كم بقيمة 22 مليون ج.م', '2024-10-15', 'وزارة النقل — قطاع الطرق',
    'contract_award', '2025-01-10', '2025-08-30',
    68.00, 22000000.00, 45000.00, 3200000.00, 'CC-M03-047',
    true, true, true, true, true,
    'منازعة عقد أشغال عامة — المقاول يطالب بتعويض 3.2 مليون عن أعمال إضافية غير منصوص عليها — الجهة الإدارية تدفع الإخلال بالالتزامات'
  ),
  (
    'SC-2025-019', 'طعن إداري — قرار ترقية واجب النفاذ', 'annulment', 'promotion_dispute',
    'ingestion', 'محكمة القضاء الإداري', 'الدائرة الثانية',
    'قرار تجاوز الموظف في الترقية لدرجة مدير عام', '2025-06-01', 'وزارة الخدمة المدنية',
    'promotion_decision', '2025-07-15', null,
    81.00, 0, 8000.00, 0, 'CC-M03-019',
    false, false, false, false, false,
    'طعن في قرار ترقية — الموظف الأحق للترقية تم تجاوزه لمرجعية الأقدمية — طلب إلغاء القرار وإصدار بديل'
  ),
  (
    'SC-2025-052', 'طعن أمام المحكمة الإدارية العليا — قرار فصل تعسفي', 'supreme_appeal', 'employment_termination',
    'resolution', 'المحكمة الإدارية العليا', 'دوائر الطعن',
    'حكم محكمة القضاء الإداري بتأييد قرار الفصل', '2025-02-28', 'هيئة الأمن الصناعي',
    'termination_decision', '2025-03-25', '2025-08-20',
    60.00, 0, 12000.00, 850000.00, 'CC-M03-052',
    true, true, false, true, true,
    'طعن أمام المحكمة الإدارية العليا — حكم أول درجة أيد الفصل — الطعن يستند لعدم تطبيق مبدأ التناسب بين الذنب والعقوبة'
  )
ON CONFLICT DO NOTHING;

-- SEED: Parties
INSERT INTO m03_council_parties (case_id, party_type, name, role, authority_type, contact_info, legal_representation) VALUES
  ((SELECT id FROM m03_state_council_cases WHERE case_number = 'SC-2025-031'), 'plaintiff', 'شركة الكيماويات الصناعية المتحدة', 'صاحب الترخيص', null, 'القاهرة - العاصمة الإدارية', 'مكتب المحاماة'),
  ((SELECT id FROM m03_state_council_cases WHERE case_number = 'SC-2025-031'), 'defendant', 'جهاز تنظيم الصناعة', 'الجهة الإدارية المصدر', 'هيئة تنظيمية', null, 'مستشار الدولة'),
  ((SELECT id FROM m03_state_council_cases WHERE case_number = 'SC-2025-047'), 'plaintiff', 'شركة الإنشاءات الوطنية', 'المقاول المنفذ', null, 'الجيزة', 'مكتب المحاماة'),
  ((SELECT id FROM m03_state_council_cases WHERE case_number = 'SC-2025-047'), 'defendant', 'وزارة النقل — قطاع الطرق', 'الجهة الإدارية', 'وزارة', null, 'مستشار الدولة'),
  ((SELECT id FROM m03_state_council_cases WHERE case_number = 'SC-2025-047'), 'expert', 'م. سمراء عبدالله', 'خبير فني — أشغال طرق', null, null, null),
  ((SELECT id FROM m03_state_council_cases WHERE case_number = 'SC-2025-019'), 'plaintiff', 'السيد/ ع.ج.م', 'الموظف المتضرر', null, null, 'مكتب المحاماة'),
  ((SELECT id FROM m03_state_council_cases WHERE case_number = 'SC-2025-019'), 'defendant', 'وزارة الخدمة المدنية', 'الجهة الإدارية', 'وزارة', null, 'مستشار الدولة'),
  ((SELECT id FROM m03_state_council_cases WHERE case_number = 'SC-2025-052'), 'plaintiff', 'السيد/ ف.ح', 'الموظف المفصول', null, null, 'مكتب المحاماة'),
  ((SELECT id FROM m03_state_council_cases WHERE case_number = 'SC-2025-052'), 'defendant', 'هيئة الأمن الصناعي', 'الجهة الإدارية', 'هيئة عامة', null, 'مستشار الدولة')
ON CONFLICT DO NOTHING;

-- SEED: Deadlines
INSERT INTO m03_council_deadlines (case_id, deadline_type, deadline_label, deadline_date, days_from_event, trigger_event, statutory_basis, status, auto_inserted) VALUES
  ((SELECT id FROM m03_state_council_cases WHERE case_number = 'SC-2025-031'), 'annulment_window', 'ميعاد رفع دعوى الإلغاء (60 يوم)', '2025-06-11', 60, 'تاريخ صدور قرار سحب الترخيص', 'المادة 24 من قانون مجلس الدولة', 'completed', true),
  ((SELECT id FROM m03_state_council_cases WHERE case_number = 'SC-2025-031'), 'hearing', 'جلسة المرافعة', '2025-09-15', null, 'تحديد الجلسة', null, 'upcoming', true),
  ((SELECT id FROM m03_state_council_cases WHERE case_number = 'SC-2025-031'), 'memo_submission', 'تقديم مذكرة الدفاع', '2025-09-12', 3, 'قبل الجلسة بـ 3 أيام', null, 'upcoming', true),
  ((SELECT id FROM m03_state_council_cases WHERE case_number = 'SC-2025-047'), 'annulment_window', 'ميعاد الطعن في العقد الإداري (60 يوم)', '2024-12-14', 60, 'تاريخ إصدار قرار الإسناد', 'المادة 24 من قانون مجلس الدولة', 'completed', true),
  ((SELECT id FROM m03_state_council_cases WHERE case_number = 'SC-2025-047'), 'hearing', 'جلسة المرافعة', '2025-08-30', null, 'تحديد الجلسة', null, 'upcoming', true),
  ((SELECT id FROM m03_state_council_cases WHERE case_number = 'SC-2025-047'), 'expert_report', 'تقرير الخبير الفني', '2025-08-10', 20, 'قبل الجلسة بـ 20 يوم', null, 'upcoming', true),
  ((SELECT id FROM m03_state_council_cases WHERE case_number = 'SC-2025-019'), 'annulment_window', 'ميعاد رفع دعوى الإلغاء (60 يوم)', '2025-07-31', 60, 'تاريخ صدور قرار الترقية', 'المادة 24 من قانون مجلس الدولة', 'upcoming', true),
  ((SELECT id FROM m03_state_council_cases WHERE case_number = 'SC-2025-052'), 'appeal_window', 'ميعاد الطعن أمام المحكمة الإدارية العليا', '2025-05-27', 60, 'تاريخ صدور حكم أول درجة', 'قانون المرافعات أمام مجلس الدولة', 'completed', true),
  ((SELECT id FROM m03_state_council_cases WHERE case_number = 'SC-2025-052'), 'hearing', 'جلسة الطعن', '2025-08-20', null, 'تحديد الجلسة', null, 'upcoming', true)
ON CONFLICT DO NOTHING;

-- SEED: Contract links
INSERT INTO m03_contract_links (case_id, contract_title, contract_ref, contract_type, contract_value, government_entity, compliance_status, compliance_findings, m59_synced) VALUES
  (
    (SELECT id FROM m03_state_council_cases WHERE case_number = 'SC-2025-047'),
    'عقد تنفيذ طريق إقليمي بطول 45 كم',
    'CONTR-TR-2024-088',
    'public_works',
    22000000.00,
    'وزارة النقل — قطاع الطرق',
    'partially_compliant',
    'العقد يتضمن شروط غرامات تأخير غير متناسبة — الأعمال الإضافية غير موثقة بمحاضر استلام مرحلية',
    true
  )
ON CONFLICT DO NOTHING;

-- SEED: Audit logs
INSERT INTO m03_council_audit_logs (case_id, action, actor, actor_role, detail, hash_chain) VALUES
  ((SELECT id FROM m03_state_council_cases WHERE case_number = 'SC-2025-031'), 'case_created', 'النظام', 'النظام', 'إنشاء ملف دعوى مجلس الدولة SC-2025-031 — تصنيف: إلغاء قرار إداري', '0x1a2b...3c4d'),
  ((SELECT id FROM m03_state_council_cases WHERE case_number = 'SC-2025-031'), 'm10_linked', 'النظام', 'النظام', 'ربط الملف بنواة القضية الذكية (M10)', '0x2b3c...4d5e'),
  ((SELECT id FROM m03_state_council_cases WHERE case_number = 'SC-2025-031'), 'deadlines_calculated', 'النظام', 'النظام', 'حساب ميعاد الإلغاء 60 يوم آلياً', '0x3c4d...5e6f'),
  ((SELECT id FROM m03_state_council_cases WHERE case_number = 'SC-2025-031'), 'm54_cost_center', 'النظام', 'النظام', 'فتح مركز تكلفة CC-M03-031 في المحرك المالي (M54)', '0x4d5e...6f7a'),
  ((SELECT id FROM m03_state_council_cases WHERE case_number = 'SC-2025-031'), 'm92_notified', 'النظام', 'النظام', 'إشعار الوكيل الذكي (M92) بتحديث جدول المواعيد', '0x5e6f...7a8b'),
  ((SELECT id FROM m03_state_council_cases WHERE case_number = 'SC-2025-031'), 'm52_notified', 'النظام', 'النظام', 'إرسال إشعارات بريدية مشفرة للأطراف عبر المحرك (M52)', '0x6f7a...8b9c'),
  ((SELECT id FROM m03_state_council_cases WHERE case_number = 'SC-2025-047'), 'm59_contract_linked', 'النظام', 'النظام', 'ربط بمحرك العقود الإدارية (M59) — مراجعة بنود عقد الأشغال العامة', '0x7a8b...9c0d'),
  ((SELECT id FROM m03_state_council_cases WHERE case_number = 'SC-2025-047'), 'compliance_review', 'النظام', 'النظام', 'مراجعة امتثال العقد: متوافق جزئياً — شروط غرامات غير متناسبة', '0x8b9c...0d1e'),
  ((SELECT id FROM m03_state_council_cases WHERE case_number = 'SC-2025-052'), 'supreme_appeal_filed', 'النظام', 'النظام', 'تقديم الطعن أمام المحكمة الإدارية العليا — ميعاد 60 يوم من الحكم', '0x9c0d...1e2f')
ON CONFLICT DO NOTHING;
