/*
# Create Smart Case Matrix (Core CMS) schema

Implements the "Smart Case Matrix" model — a dynamic, multi-domain case
management core that adapts its pipeline based on case specialty, computes
procedural deadlines automatically, enforces zero-trust access control with
digital Chinese Walls, tracks evidence chain of custody, and builds a
precedent graph from successful legal arguments.

1. New Tables
- `scm_cases` — core case records. Each case has a pipeline_type (litigation,
  corporate, labor, ip) that determines its stage flow, plus a triage lane,
  confidentiality level, and conflict-of-interest flag.
- `scm_pipeline_stages` — ordered stages per case, differing by pipeline type.
  Each stage has a client-facing label and an internal label.
- `scm_case_team` — zero-trust access control. Only listed team members can
  view a case. This is the "Chinese Wall" — enforced by the app filtering on
  this table. (RLS remains open since single-tenant; app enforces visibility.)
- `scm_deadlines` — procedural deadlines computed automatically from case
  events (e.g., appeal window after judgment). Includes holiday exclusion,
  waterfall alert level, and lock status.
- `scm_evidence` — evidence/documents with hash, upload metadata, and
  chain-of-custody tracking. Each item has a visibility level.
- `scm_audit_log` — immutable audit trail of all view/download/edit actions
  on cases and evidence. Never editable by the app (insert-only behavior).
- `scm_precedents` — anonymized legal arguments flagged as key precedents,
  fed into the firm's knowledge library.

2. Security
- Single-tenant app (no sign-in screen). RLS enabled on every table.
- All policies use TO anon, authenticated with USING(true)/WITH CHECK(true).
- The "Chinese Wall" is enforced at the application layer: the frontend filters
  cases by scm_case_team membership. The audit log is insert-only in practice
  (no update/delete policy needed, but we include them for completeness).

3. Deadline Engine Notes
- scm_deadlines stores the computed deadline date, the triggering event,
  the legal basis text, and the alert_level (info / warning / urgent / critical).
- Holiday exclusion is handled in the frontend calculator using a small
  holiday list; the stored deadline is the final adjusted date.
- Waterfall alerts: 7 days = notify attorney, 3 days = notify senior,
  24 hours = notify partner + lock non-urgent cards.
*/

-- CASES
CREATE TABLE IF NOT EXISTS scm_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_code text NOT NULL UNIQUE,
  title text NOT NULL,
  pipeline_type text NOT NULL DEFAULT 'litigation',
  triage_lane text NOT NULL DEFAULT 'green',
  confidentiality text NOT NULL DEFAULT 'standard',
  conflict_of_interest boolean DEFAULT false,
  client_name text,
  opposing_party text,
  court text,
  case_number text,
  current_stage_index int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  judgment_date date,
  judgment_outcome text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE scm_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_scm_cases" ON scm_cases;
CREATE POLICY "anon_select_scm_cases" ON scm_cases FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_scm_cases" ON scm_cases;
CREATE POLICY "anon_insert_scm_cases" ON scm_cases FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_scm_cases" ON scm_cases;
CREATE POLICY "anon_update_scm_cases" ON scm_cases FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_scm_cases" ON scm_cases;
CREATE POLICY "anon_delete_scm_cases" ON scm_cases FOR DELETE TO anon, authenticated USING (true);

-- PIPELINE STAGES
CREATE TABLE IF NOT EXISTS scm_pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES scm_cases(id) ON DELETE CASCADE,
  step_index int NOT NULL,
  client_label text NOT NULL,
  internal_label text NOT NULL,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scm_pipeline_stages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_scm_stages" ON scm_pipeline_stages;
CREATE POLICY "anon_select_scm_stages" ON scm_pipeline_stages FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_scm_stages" ON scm_pipeline_stages;
CREATE POLICY "anon_insert_scm_stages" ON scm_pipeline_stages FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_scm_stages" ON scm_pipeline_stages;
CREATE POLICY "anon_update_scm_stages" ON scm_pipeline_stages FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_scm_stages" ON scm_pipeline_stages;
CREATE POLICY "anon_delete_scm_stages" ON scm_pipeline_stages FOR DELETE TO anon, authenticated USING (true);

-- CASE TEAM (Zero-Trust / Chinese Wall)
CREATE TABLE IF NOT EXISTS scm_case_team (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES scm_cases(id) ON DELETE CASCADE,
  member_name text NOT NULL,
  member_role text NOT NULL DEFAULT 'محامي',
  access_level text NOT NULL DEFAULT 'full',
  added_at timestamptz DEFAULT now()
);

ALTER TABLE scm_case_team ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_scm_team" ON scm_case_team;
CREATE POLICY "anon_select_scm_team" ON scm_case_team FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_scm_team" ON scm_case_team;
CREATE POLICY "anon_insert_scm_team" ON scm_case_team FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_scm_team" ON scm_case_team;
CREATE POLICY "anon_update_scm_team" ON scm_case_team FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_scm_team" ON scm_case_team;
CREATE POLICY "anon_delete_scm_team" ON scm_case_team FOR DELETE TO anon, authenticated USING (true);

-- DEADLINES (Procedural Engine)
CREATE TABLE IF NOT EXISTS scm_deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES scm_cases(id) ON DELETE CASCADE,
  deadline_type text NOT NULL,
  trigger_event text,
  trigger_date date,
  deadline_date date NOT NULL,
  legal_basis text,
  days_allowed int,
  alert_level text DEFAULT 'info',
  is_locked boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scm_deadlines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_scm_deadlines" ON scm_deadlines;
CREATE POLICY "anon_select_scm_deadlines" ON scm_deadlines FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_scm_deadlines" ON scm_deadlines;
CREATE POLICY "anon_insert_scm_deadlines" ON scm_deadlines FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_scm_deadlines" ON scm_deadlines;
CREATE POLICY "anon_update_scm_deadlines" ON scm_deadlines FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_scm_deadlines" ON scm_deadlines;
CREATE POLICY "anon_delete_scm_deadlines" ON scm_deadlines FOR DELETE TO anon, authenticated USING (true);

-- EVIDENCE (Chain of Custody)
CREATE TABLE IF NOT EXISTS scm_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES scm_cases(id) ON DELETE CASCADE,
  name text NOT NULL,
  doc_type text NOT NULL DEFAULT 'مستند',
  file_hash text,
  file_size bigint,
  uploaded_by text,
  visibility text NOT NULL DEFAULT 'team',
  version_number int DEFAULT 1,
  parent_evidence_id uuid REFERENCES scm_evidence(id) ON DELETE SET NULL,
  uploaded_at timestamptz DEFAULT now(),
  description text
);

ALTER TABLE scm_evidence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_scm_evidence" ON scm_evidence;
CREATE POLICY "anon_select_scm_evidence" ON scm_evidence FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_scm_evidence" ON scm_evidence;
CREATE POLICY "anon_insert_scm_evidence" ON scm_evidence FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_scm_evidence" ON scm_evidence;
CREATE POLICY "anon_update_scm_evidence" ON scm_evidence FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_scm_evidence" ON scm_evidence;
CREATE POLICY "anon_delete_scm_evidence" ON scm_evidence FOR DELETE TO anon, authenticated USING (true);

-- AUDIT LOG (Immutable)
CREATE TABLE IF NOT EXISTS scm_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES scm_cases(id) ON DELETE CASCADE,
  evidence_id uuid REFERENCES scm_evidence(id) ON DELETE SET NULL,
  actor_name text NOT NULL,
  action text NOT NULL,
  action_detail text,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scm_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_scm_audit" ON scm_audit_log;
CREATE POLICY "anon_select_scm_audit" ON scm_audit_log FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_scm_audit" ON scm_audit_log;
CREATE POLICY "anon_insert_scm_audit" ON scm_audit_log FOR INSERT TO anon, authenticated WITH CHECK (true);

-- PRECEDENTS (Anonymized knowledge assets)
CREATE TABLE IF NOT EXISTS scm_precedents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES scm_cases(id) ON DELETE SET NULL,
  title text NOT NULL,
  argument_text text NOT NULL,
  legal_area text NOT NULL,
  outcome text,
  anonymized boolean DEFAULT true,
  flagged_by text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scm_precedents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_scm_precedents" ON scm_precedents;
CREATE POLICY "anon_select_scm_precedents" ON scm_precedents FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_scm_precedents" ON scm_precedents;
CREATE POLICY "anon_insert_scm_precedents" ON scm_precedents FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_scm_precedents" ON scm_precedents;
CREATE POLICY "anon_update_scm_precedents" ON scm_precedents FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_scm_precedents" ON scm_precedents;
CREATE POLICY "anon_delete_scm_precedents" ON scm_precedents FOR DELETE TO anon, authenticated USING (true);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_scm_stages_case ON scm_pipeline_stages(case_id);
CREATE INDEX IF NOT EXISTS idx_scm_team_case ON scm_case_team(case_id);
CREATE INDEX IF NOT EXISTS idx_scm_deadlines_case ON scm_deadlines(case_id);
CREATE INDEX IF NOT EXISTS idx_scm_evidence_case ON scm_evidence(case_id);
CREATE INDEX IF NOT EXISTS idx_scm_audit_case ON scm_audit_log(case_id);
CREATE INDEX IF NOT EXISTS idx_scm_precedents_case ON scm_precedents(case_id);

-- SEED CASES
INSERT INTO scm_cases (id, case_code, title, pipeline_type, triage_lane, confidentiality, client_name, opposing_party, court, case_number, current_stage_index, status, judgment_date, judgment_outcome)
VALUES
  ('b0000000-0000-4000-8000-000000000001', 'SCM-001', 'نزاع عمالي — شركة النيل للتجارة', 'labor', 'yellow', 'standard', 'شركة النيل للتجارة', 'العامل / محمد العتيبي', 'ديوان المظالم', 'ع-2026-123', 2, 'active', NULL, NULL),
  ('b0000000-0000-4000-8000-000000000002', 'SCM-002', 'استحواذ شركة الأهرام على شركة النقل', 'corporate', 'red', 'restricted', 'شركة الأهرام القابضة', 'شركة النقل المتحدة', NULL, NULL, 0, 'active', NULL, NULL),
  ('b0000000-0000-4000-8000-000000000003', 'SCM-003', 'نزاع تجاري — مجموعة رأس المال الذكي', 'litigation', 'green', 'standard', 'مجموعة رأس المال الذكي', 'شركة الإمداد الدولية', 'المحكمة التجارية', 'ت-2026-456', 3, 'active', '2026-06-15', 'حكم لصالح موكلنا'),
  ('b0000000-0000-4000-8000-000000000004', 'SCM-004', 'تسجيل علامة تجارية — منصة فاخر', 'ip', 'green', 'standard', 'منصة فاخر', NULL, 'هيئة الملكية الفكرية', NULL, 1, 'active', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- PIPELINE STAGES (differ by type)
-- Litigation: first degree → appeal → cassation
INSERT INTO scm_pipeline_stages (case_id, step_index, client_label, internal_label, is_completed) VALUES
  ('b0000000-0000-4000-8000-000000000003', 0, 'الاستلام وتحليل النزاع', 'استلام الملف + تقييم أولي', true),
  ('b0000000-0000-4000-8000-000000000003', 1, 'صياغة صحيفة الدعوى', 'صياغة + تقديم للمحكمة', true),
  ('b0000000-0000-4000-8000-000000000003', 2, 'المرافعة أول درجة', 'جلسات + تبادل مذكرات', true),
  ('b0000000-0000-4000-8000-000000000003', 3, 'الاستئناف', 'تقديم استئناف + مرافعة', false),
  ('b0000000-0000-4000-8000-000000000003', 4, 'النقض/التمييز', 'الطعن بالنقض', false)
ON CONFLICT DO NOTHING;

-- Labor: negotiation → labor office → amicable settlement
INSERT INTO scm_pipeline_stages (case_id, step_index, client_label, internal_label, is_completed) VALUES
  ('b0000000-0000-4000-8000-000000000001', 0, 'استلام الملف وتحليل المطالبات', 'تحليل المطالبات + حساب التعويضات', true),
  ('b0000000-0000-4000-8000-000000000001', 1, 'التفاوض الودي', 'محاولة تسوية ودية مع العامل', true),
  ('b0000000-0000-4000-8000-000000000001', 2, 'لجان الفصل والتحكيم', 'تقديم للجنة الفصل في النزاعات', false),
  ('b0000000-0000-4000-8000-000000000001', 3, 'المحكمة العمالية', 'التقاضي أمام المحكمة', false)
ON CONFLICT DO NOTHING;

-- Corporate: due diligence → regulatory → closing
INSERT INTO scm_pipeline_stages (case_id, step_index, client_label, internal_label, is_completed) VALUES
  ('b0000000-0000-4000-8000-000000000002', 0, 'تقييم الصفقة والاستحقاق', 'Due Diligence + تقييم المخاطر', false),
  ('b0000000-0000-4000-8000-000000000002', 1, 'الموافقات التنظيمية', 'تراخيص الهيئات + موافقات', false),
  ('b0000000-0000-4000-8000-000000000002', 2, 'صياغة اتفاقية الاستحواذ', 'صياغة SPA + مفاوضات', false),
  ('b0000000-0000-4000-8000-000000000002', 3, 'إغلاق الصفقة', 'Closing + نقل الملكية', false)
ON CONFLICT DO NOTHING;

-- IP: filing → examination → registration
INSERT INTO scm_pipeline_stages (case_id, step_index, client_label, internal_label, is_completed) VALUES
  ('b0000000-0000-4000-8000-000000000004', 0, 'استلام الطلب وتقديمه', 'تقديم طلب التسجيل', true),
  ('b0000000-0000-4000-8000-000000000004', 1, 'الفحص والبحث', 'فحص الهيئة + بحث المطابقة', false),
  ('b0000000-0000-4000-8000-000000000004', 2, 'النشر والاعتراض', 'نشر العلامة + فترة الاعتراض', false),
  ('b0000000-0000-4000-8000-000000000004', 3, 'إصدار شهادة التسجيل', 'تسجيل نهائي + شهادة', false)
ON CONFLICT DO NOTHING;

-- CASE TEAMS (Chinese Wall)
INSERT INTO scm_case_team (case_id, member_name, member_role, access_level) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'سارة الزهراني', 'محامية مسؤولة', 'full'),
  ('b0000000-0000-4000-8000-000000000001', 'أحمد المنصوري', 'محامٍ شريك مشرف', 'full'),
  ('b0000000-0000-4000-8000-000000000002', 'أحمد المنصوري', 'محامٍ شريك مشرف', 'full'),
  ('b0000000-0000-4000-8000-000000000002', 'خالد العتيبي', 'محامي صفقات', 'full'),
  ('b0000000-0000-4000-8000-000000000003', 'خالد العتيبي', 'محامية مسؤولة', 'full'),
  ('b0000000-0000-4000-8000-000000000003', 'نورة القحطاني', 'محامي مرافعة', 'full'),
  ('b0000000-0000-4000-8000-000000000004', 'سارة الزهراني', 'محامية مسؤولة', 'full')
ON CONFLICT DO NOTHING;

-- DEADLINES
INSERT INTO scm_deadlines (case_id, deadline_type, trigger_event, trigger_date, deadline_date, legal_basis, days_allowed, alert_level, notes) VALUES
  ('b0000000-0000-4000-8000-000000000003', 'استئناف حكم أول درجة', 'صدور حكم أول درجة', '2026-06-15', '2026-07-30', 'ميعاد الاستئناف 30 يوم من تاريخ التبليغ — قانون المرافعات', 30, 'urgent', 'يجب تقديم صحيفة الاستئناف قبل 2026-07-30'),
  ('b0000000-0000-4000-8000-000000000001', 'سقوط الحق بالتقادم', 'تاريخ انتهاء علاقة العمل', '2025-08-01', '2026-08-01', 'تقادم الحقوق العمالية بسنة من انتهاء علاقة العمل — قانون العمل', 365, 'critical', 'تقادم عمالي — الأولوية القصوى')
ON CONFLICT DO NOTHING;

-- EVIDENCE
INSERT INTO scm_evidence (case_id, name, doc_type, file_hash, uploaded_by, visibility, version_number, description) VALUES
  ('b0000000-0000-4000-8000-000000000003', 'صحيفة الدعوى الأصلية', 'صحيفة', 'a3f5b2c1...', 'خالد العتيبي', 'team', 1, 'النسخة المعتمدة المقدمة للمحكمة'),
  ('b0000000-0000-4000-8000-000000000003', 'حكم أول درجة', 'حكم', 'b7e9d4f2...', 'أحمد المنصوري', 'team', 1, 'صورة رسمية من حكم أول درجة'),
  ('b0000000-0000-4000-8000-000000000001', 'عقد العمل', 'عقد', 'c2a8e6b9...', 'سارة الزهراني', 'team', 1, 'نسخة من عقد العمل الأصلي'),
  ('b0000000-0000-4000-8000-000000000001', 'إيصال استلام الراتب', 'مستند مالي', 'd5f1c3a7...', 'سارة الزهراني', 'team', 1, 'إيصالات آخر 6 أشهر')
ON CONFLICT DO NOTHING;

-- AUDIT LOG
INSERT INTO scm_audit_log (case_id, actor_name, action, action_detail) VALUES
  ('b0000000-0000-4000-8000-000000000003', 'خالد العتيبي', 'view', 'عرض صحيفة الدعوى الأصلية'),
  ('b0000000-0000-4000-8000-000000000003', 'أحمد المنصوري', 'upload', 'رفع حكم أول درجة'),
  ('b0000000-0000-4000-8000-000000000003', 'نورة القحطاني', 'download', 'تحميل صحيفة الدعوى للمراجعة'),
  ('b0000000-0000-4000-8000-000000000001', 'سارة الزهراني', 'upload', 'رفع عقد العمل')
ON CONFLICT DO NOTHING;

-- PRECEDENTS
INSERT INTO scm_precedents (case_id, title, argument_text, legal_area, outcome, anonymized, flagged_by) VALUES
  ('b0000000-0000-4000-8000-000000000003', 'دفع بعدم قبول الدعوى لتعدد الخصوم', 'الدفع بعدم قبول الدعوى لتعدد الخصوم وعدم اختصام جميع أطراف النزاع أدى إلى قبول المحكمة للدفع وحجب الخصم الثالث. تم تطبيق نص المادة 41 من قانون المرافعات.', 'تجاري', 'قبول الدفع — حكم لصالح موكلنا', true, 'خالد العتيبي')
ON CONFLICT DO NOTHING;
