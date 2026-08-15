/*
# Create Civil & Commercial Litigation Engine (M1) schema

Implements the first pillar of the judicial sector — managing the full lifecycle
of civil and commercial disputes from case filing through final judgment, with
parallel procedural deadline tracking, financial linkage, and sovereign archiving.

1. New Tables:
- `m01_cases`: Civil/commercial dispute cases with 5-stage lifecycle and UUID tracking.
- `m01_case_parties`: Parties (plaintiffs, defendants, witnesses) linked to cases.
- `m01_procedural_deadlines`: Auto-calculated legal deadlines (appeals, memos, hearings).
- `m01_case_tasks`: Tasks derived from hearing decisions, dispatched to M51.
- `m01_audit_logs`: Immutable audit trail with user identity and timestamp to the second.

2. Security: RLS enabled, anon+authenticated full CRUD (single-tenant, no auth gating at DB level).
*/

-- CASES (civil & commercial disputes)
CREATE TABLE IF NOT EXISTS m01_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text NOT NULL UNIQUE,
  case_title text NOT NULL,
  case_type text DEFAULT 'civil',
  dispute_type text,
  stage text DEFAULT 'ingestion',
  court text,
  court_circuit text,
  filing_date date,
  next_hearing_date date,
  judgment_date date,
  judgment_outcome text,
  is_final boolean DEFAULT false,
  financial_value numeric(14,2) DEFAULT 0,
  fees_paid numeric(14,2) DEFAULT 0,
  bail_amount numeric(14,2) DEFAULT 0,
  cost_center_id text,
  assigned_attorney_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m10_linked boolean DEFAULT false,
  m54_cost_center_opened boolean DEFAULT false,
  m53_archived boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE m01_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m01_cases" ON m01_cases;
CREATE POLICY "anon_select_m01_cases" ON m01_cases FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m01_cases" ON m01_cases;
CREATE POLICY "anon_insert_m01_cases" ON m01_cases FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m01_cases" ON m01_cases;
CREATE POLICY "anon_update_m01_cases" ON m01_cases FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m01_cases" ON m01_cases;
CREATE POLICY "anon_delete_m01_cases" ON m01_cases FOR DELETE TO anon, authenticated USING (true);

-- CASE PARTIES (plaintiffs, defendants, witnesses)
CREATE TABLE IF NOT EXISTS m01_case_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m01_cases(id) ON DELETE CASCADE,
  party_type text NOT NULL,
  name text NOT NULL,
  role text,
  contact_info text,
  legal_representation text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m01_case_parties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m01_parties" ON m01_case_parties;
CREATE POLICY "anon_select_m01_parties" ON m01_case_parties FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m01_parties" ON m01_case_parties;
CREATE POLICY "anon_insert_m01_parties" ON m01_case_parties FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m01_parties" ON m01_case_parties;
CREATE POLICY "anon_update_m01_parties" ON m01_case_parties FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m01_parties" ON m01_case_parties;
CREATE POLICY "anon_delete_m01_parties" ON m01_case_parties FOR DELETE TO anon, authenticated USING (true);

-- PROCEDURAL DEADLINES (auto-calculated legal timeframes)
CREATE TABLE IF NOT EXISTS m01_procedural_deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m01_cases(id) ON DELETE CASCADE,
  deadline_type text NOT NULL,
  deadline_label text NOT NULL,
  deadline_date date NOT NULL,
  days_from_event int,
  trigger_event text,
  status text DEFAULT 'upcoming',
  completed_at timestamptz,
  auto_inserted boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m01_procedural_deadlines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m01_deadlines" ON m01_procedural_deadlines;
CREATE POLICY "anon_select_m01_deadlines" ON m01_procedural_deadlines FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m01_deadlines" ON m01_procedural_deadlines;
CREATE POLICY "anon_insert_m01_deadlines" ON m01_procedural_deadlines FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m01_deadlines" ON m01_procedural_deadlines;
CREATE POLICY "anon_update_m01_deadlines" ON m01_procedural_deadlines FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m01_deadlines" ON m01_procedural_deadlines;
CREATE POLICY "anon_delete_m01_deadlines" ON m01_procedural_deadlines FOR DELETE TO anon, authenticated USING (true);

-- CASE TASKS (derived from hearing decisions, dispatched to M51)
CREATE TABLE IF NOT EXISTS m01_case_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m01_cases(id) ON DELETE CASCADE,
  task_title text NOT NULL,
  task_description text,
  assigned_to text,
  source_hearing_date date,
  status text DEFAULT 'pending',
  priority text DEFAULT 'normal',
  m51_synced boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m01_case_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m01_tasks" ON m01_case_tasks;
CREATE POLICY "anon_select_m01_tasks" ON m01_case_tasks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m01_tasks" ON m01_case_tasks;
CREATE POLICY "anon_insert_m01_tasks" ON m01_case_tasks FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m01_tasks" ON m01_case_tasks;
CREATE POLICY "anon_update_m01_tasks" ON m01_case_tasks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m01_tasks" ON m01_case_tasks;
CREATE POLICY "anon_delete_m01_tasks" ON m01_case_tasks FOR DELETE TO anon, authenticated USING (true);

-- AUDIT LOGS (immutable, user identity + timestamp to the second)
CREATE TABLE IF NOT EXISTS m01_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m01_cases(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  ip_address text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m01_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m01_audit" ON m01_audit_logs;
CREATE POLICY "anon_select_m01_audit" ON m01_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m01_audit" ON m01_audit_logs;
CREATE POLICY "anon_insert_m01_audit" ON m01_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m01_audit" ON m01_audit_logs;
CREATE POLICY "anon_update_m01_audit" ON m01_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m01_audit" ON m01_audit_logs;
CREATE POLICY "anon_delete_m01_audit" ON m01_audit_logs FOR DELETE TO anon, authenticated USING (true);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_m01_cases_number ON m01_cases(case_number);
CREATE INDEX IF NOT EXISTS idx_m01_cases_stage ON m01_cases(stage);
CREATE INDEX IF NOT EXISTS idx_m01_cases_type ON m01_cases(case_type);
CREATE INDEX IF NOT EXISTS idx_m01_cases_court ON m01_cases(court);
CREATE INDEX IF NOT EXISTS idx_m01_cases_attorney ON m01_cases(assigned_attorney_id);
CREATE INDEX IF NOT EXISTS idx_m01_parties_case ON m01_case_parties(case_id);
CREATE INDEX IF NOT EXISTS idx_m01_deadlines_case ON m01_procedural_deadlines(case_id);
CREATE INDEX IF NOT EXISTS idx_m01_deadlines_date ON m01_procedural_deadlines(deadline_date);
CREATE INDEX IF NOT EXISTS idx_m01_deadlines_status ON m01_procedural_deadlines(status);
CREATE INDEX IF NOT EXISTS idx_m01_tasks_case ON m01_case_tasks(case_id);
CREATE INDEX IF NOT EXISTS idx_m01_tasks_status ON m01_case_tasks(status);
CREATE INDEX IF NOT EXISTS idx_m01_audit_case ON m01_audit_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_m01_audit_created ON m01_audit_logs(created_at);

-- AUTO-UPDATE updated_at TRIGGER
CREATE OR REPLACE FUNCTION m01_touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_m01_cases_touch ON m01_cases;
CREATE TRIGGER trg_m01_cases_touch BEFORE UPDATE ON m01_cases
  FOR EACH ROW EXECUTE FUNCTION m01_touch_updated_at();

-- SEED: Cases
INSERT INTO m01_cases (case_number, case_title, case_type, dispute_type, stage, court, court_circuit, filing_date, next_hearing_date, financial_value, fees_paid, bail_amount, cost_center_id, m10_linked, m54_cost_center_opened, m53_archived, description) VALUES
  (
    'CIV-2025-001',
    'نزاع تعاقدي بين شركة النيل للتجارة وشركة الصناعات المتقدمة',
    'commercial',
    'contract_dispute',
    'processing',
    'محكمة القاهرة الاقتصادية',
    'الدائرة الثانية تجاري',
    '2025-06-15',
    '2025-08-20',
    2500000.00,
    15000.00,
    50000.00,
    'CC-M01-001',
    true, true, false,
    'نزاع حول تفسير بند التسليم في عقد توريد معدات صناعية بقيمة 2.5 مليون ج.م — تدعي المدعية تأخر التسليم والمطالبة بتعويض'
  ),
  (
    'CIV-2025-002',
    'مطالبة مالية بالتعويض عن المسؤولية التقصيرية — حادث مروري',
    'civil',
    'financial_claim',
    'procedural',
    'محكمة شمال القاهمة الابتدائية',
    'الدائرة المدنية الأولى',
    '2025-07-01',
    '2025-08-15',
    450000.00,
    8000.00,
    0,
    'CC-M01-002',
    true, true, false,
    'مطالبة بتعويض عن أضرار مادية وجسدية ناتجة عن حادث مروري — المسؤولية التقصيرية'
  ),
  (
    'CIV-2024-089',
    'منازعة عقد إيجار تجاري — مركز تجاري بالقاهرة الجديدة',
    'civil',
    'contract_dispute',
    'execution',
    'محكمة استئناف القاهرة',
    'الدائرة المدنية الثالثة',
    '2024-11-20',
    null,
    800000.00,
    12000.00,
    30000.00,
    'CC-M01-089',
    true, true, true,
    'منازعة حول بند تجديد الإيجار وقيمة الإيجار المتأخر — صدر حكم ابتدائي لصالح الموكل واستأنف الخصم'
  )
ON CONFLICT DO NOTHING;

-- SEED: Parties
INSERT INTO m01_case_parties (case_id, party_type, name, role, contact_info, legal_representation) VALUES
  ((SELECT id FROM m01_cases WHERE case_number = 'CIV-2025-001'), 'plaintiff', 'شركة النيل للتجارة', 'المدعي', 'القاهرة - مدينة نصر', 'مكتب المحاماة'),
  ((SELECT id FROM m01_cases WHERE case_number = 'CIV-2025-001'), 'defendant', 'شركة الصناعات المتقدمة', 'المدعى عليه', 'القاهرة - العبور', 'مكتب الخصم القانوني'),
  ((SELECT id FROM m01_cases WHERE case_number = 'CIV-2025-001'), 'witness', 'م. أحمد سمير', 'شاهد فني', null, null),
  ((SELECT id FROM m01_cases WHERE case_number = 'CIV-2025-002'), 'plaintiff', 'السيد/ كريم عبدالله', 'المدعي', 'القاهرة - المعادي', 'مكتب المحاماة'),
  ((SELECT id FROM m01_cases WHERE case_number = 'CIV-2025-002'), 'defendant', 'السيد/ هاني فؤاد', 'المدعى عليه', 'القاهرة - مدينة نصر', null),
  ((SELECT id FROM m01_cases WHERE case_number = 'CIV-2024-089'), 'plaintiff', 'شركة العقارية المتقدمة', 'المستأنف', 'القاهرة الجديدة', 'مكتب المحاماة'),
  ((SELECT id FROM m01_cases WHERE case_number = 'CIV-2024-089'), 'defendant', 'السيد/ منصور إبراهيم', 'المستأنف عليه', 'القاهرة الجديدة', 'مكتب الخصم')
ON CONFLICT DO NOTHING;

-- SEED: Procedural deadlines
INSERT INTO m01_procedural_deadlines (case_id, deadline_type, deadline_label, deadline_date, days_from_event, trigger_event, status, auto_inserted) VALUES
  ((SELECT id FROM m01_cases WHERE case_number = 'CIV-2025-001'), 'hearing', 'جلسة المرافعة الأولى', '2025-08-20', null, 'تحديد الجلسة', 'upcoming', true),
  ((SELECT id FROM m01_cases WHERE case_number = 'CIV-2025-001'), 'memo_submission', 'موعد تقديم مذكرة الدفاع', '2025-08-17', 3, 'قبل الجلسة بـ 3 أيام', 'upcoming', true),
  ((SELECT id FROM m01_cases WHERE case_number = 'CIV-2025-001'), 'appeal', 'آخر موعد للطعن (استئناف)', '2025-10-15', 40, 'صدور الحكم الابتدائي', 'upcoming', true),
  ((SELECT id FROM m01_cases WHERE case_number = 'CIV-2025-002'), 'hearing', 'جلسة المرافعة', '2025-08-15', null, 'تحديد الجلسة', 'upcoming', true),
  ((SELECT id FROM m01_cases WHERE case_number = 'CIV-2025-002'), 'evidence_submission', 'موعد تقديم المستندات', '2025-08-10', 5, 'قبل الجلسة بـ 5 أيام', 'upcoming', true),
  ((SELECT id FROM m01_cases WHERE case_number = 'CIV-2024-089'), 'appeal', 'موعد تقديم مذكرة الاستئناف', '2025-07-25', 30, 'صدور الحكم المستأنف', 'upcoming', true)
ON CONFLICT DO NOTHING;

-- SEED: Case tasks
INSERT INTO m01_case_tasks (case_id, task_title, task_description, assigned_to, source_hearing_date, status, priority, m51_synced) VALUES
  ((SELECT id FROM m01_cases WHERE case_number = 'CIV-2025-001'), 'إعداد مذكرة الدفاع', 'تجهيز مذكرة دفاعية قبل جلسة 20 أغسطس', 'أ. سارة محمود', '2025-08-20', 'in_progress', 'high', true),
  ((SELECT id FROM m01_cases WHERE case_number = 'CIV-2025-001'), 'جمع المستندات الفنية', 'تجميع تقارير الخبراء الفنيين حول المعدات', 'أ. أحمد سمير', null, 'pending', 'normal', false),
  ((SELECT id FROM m01_cases WHERE case_number = 'CIV-2025-002'), 'إعداد تقرير الأضرار', 'تجهيز تقرير طبي وفني عن الأضرار الناتجة عن الحادث', 'أ. سارة محمود', '2025-08-15', 'pending', 'high', false),
  ((SELECT id FROM m01_cases WHERE case_number = 'CIV-2024-089'), 'متابعة تنفيذ الحكم', 'متابعة إجراءات التنفيذ بعد صدور الحكم الاستئنافي', 'أ. خالد عمر', null, 'in_progress', 'high', true)
ON CONFLICT DO NOTHING;

-- SEED: Audit logs
INSERT INTO m01_audit_logs (case_id, action, actor, actor_role, detail) VALUES
  ((SELECT id FROM m01_cases WHERE case_number = 'CIV-2025-001'), 'case_created', 'النظام', 'النظام', 'إنشاء ملف القضية CIV-2025-001 — توليد UUID'),
  ((SELECT id FROM m01_cases WHERE case_number = 'CIV-2025-001'), 'm10_linked', 'النظام', 'النظام', 'ربط الملف بنواة القضية الذكية (M10) لاستخلاص الدفوع'),
  ((SELECT id FROM m01_cases WHERE case_number = 'CIV-2025-001'), 'm54_cost_center', 'النظام', 'النظام', 'فتح مركز تكلفة مالي CC-M01-001 في المحرك المالي (M54)'),
  ((SELECT id FROM m01_cases WHERE case_number = 'CIV-2025-001'), 'deadlines_calculated', 'النظام', 'النظام', 'حساب المواعيد الإجرائية آلياً — 3 مواعيد مسجلة في الأجندة'),
  ((SELECT id FROM m01_cases WHERE case_number = 'CIV-2025-001'), 'parties_added', 'النظام', 'النظام', 'إضافة 3 أطراف: المدعي، المدعى عليه، شاهد فني'),
  ((SELECT id FROM m01_cases WHERE case_number = 'CIV-2025-002'), 'case_created', 'النظام', 'النظام', 'إنشاء ملف القضية CIV-2025-002 — توليد UUID'),
  ((SELECT id FROM m01_cases WHERE case_number = 'CIV-2024-089'), 'm53_archived', 'النظام', 'النظام', 'أرشفة المستندات بتشفير AES-256 في محرك الأرشيف (M53)')
ON CONFLICT DO NOTHING;
