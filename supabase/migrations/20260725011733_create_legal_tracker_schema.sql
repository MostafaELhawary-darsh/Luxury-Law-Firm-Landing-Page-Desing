/*
# Create Legal Tracker (Agile Legal Care) schema

Implements the "360 Legal Care" client tracking model with strict separation
between the client-facing view (sanitized, milestone-based) and the internal
firm view (risk %, WIP docs, billable hours, internal notes).

1. New Tables
- `lt_matters` — tracker matters (linked to lf_matters/lf_clients). Holds the
  triage lane (green/yellow/red), current milestone index, and client visibility.
- `lt_milestones` — ordered milestone definitions per matter (the progress bar stages).
  Each milestone has a client-facing label and an internal label.
- `lt_client_actions` — items requiring client action (the Action Center).
  Status: pending / completed. Has a client-facing description only.
- `lt_updates` — sanitized timeline entries visible to the client. Each entry has
  a client-facing message and an optional internal-only note (never shown to client).
- `lt_internal_notes` — internal firm notes (risk assessment, strategy). Never exposed
  to the client view. Includes risk_percentage, strategy text, and WIP doc references.
- `lt_documents` — document registry. visibility = 'client' (final/review) or 'internal' (WIP/draft).
  Only 'client' documents appear in the client view.

2. Security
- Single-tenant app (no sign-in screen). RLS enabled on every table.
- All policies use TO anon, authenticated with USING(true)/WITH CHECK(true)
  because the data is intentionally shared within the firm.

3. Design Principles (from the Agile Legal Care model)
- Client view shows: milestone progress bar, action center, sanitized update log, final documents.
- Client view NEVER shows: risk %, internal notes, WIP/draft documents, billable hours, strategy.
- Internal view shows everything.
*/

-- TRACKER MATTERS
CREATE TABLE IF NOT EXISTS lt_matters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  lf_matter_id uuid REFERENCES lf_matters(id) ON DELETE SET NULL,
  client_id uuid REFERENCES lf_clients(id) ON DELETE SET NULL,
  client_name text,
  triage_lane text NOT NULL DEFAULT 'green',
  current_milestone_index int NOT NULL DEFAULT 0,
  matter_type text DEFAULT 'تقاضي',
  status text NOT NULL DEFAULT 'نشط',
  next_hearing_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lt_matters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lt_matters" ON lt_matters;
CREATE POLICY "anon_select_lt_matters" ON lt_matters FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lt_matters" ON lt_matters;
CREATE POLICY "anon_insert_lt_matters" ON lt_matters FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lt_matters" ON lt_matters;
CREATE POLICY "anon_update_lt_matters" ON lt_matters FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lt_matters" ON lt_matters;
CREATE POLICY "anon_delete_lt_matters" ON lt_matters FOR DELETE TO anon, authenticated USING (true);

-- MILESTONES (ordered progress stages per matter)
CREATE TABLE IF NOT EXISTS lt_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid REFERENCES lt_matters(id) ON DELETE CASCADE,
  step_index int NOT NULL,
  client_label text NOT NULL,
  internal_label text NOT NULL,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lt_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lt_milestones" ON lt_milestones;
CREATE POLICY "anon_select_lt_milestones" ON lt_milestones FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lt_milestones" ON lt_milestones;
CREATE POLICY "anon_insert_lt_milestones" ON lt_milestones FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lt_milestones" ON lt_milestones;
CREATE POLICY "anon_update_lt_milestones" ON lt_milestones FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lt_milestones" ON lt_milestones;
CREATE POLICY "anon_delete_lt_milestones" ON lt_milestones FOR DELETE TO anon, authenticated USING (true);

-- CLIENT ACTIONS (Action Center)
CREATE TABLE IF NOT EXISTS lt_client_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid REFERENCES lt_matters(id) ON DELETE CASCADE,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  due_date date,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE lt_client_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lt_actions" ON lt_client_actions;
CREATE POLICY "anon_select_lt_actions" ON lt_client_actions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lt_actions" ON lt_client_actions;
CREATE POLICY "anon_insert_lt_actions" ON lt_client_actions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lt_actions" ON lt_client_actions;
CREATE POLICY "anon_update_lt_actions" ON lt_client_actions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lt_actions" ON lt_client_actions;
CREATE POLICY "anon_delete_lt_actions" ON lt_client_actions FOR DELETE TO anon, authenticated USING (true);

-- SANITIZED UPDATES (Timeline)
CREATE TABLE IF NOT EXISTS lt_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid REFERENCES lt_matters(id) ON DELETE CASCADE,
  client_message text NOT NULL,
  internal_note text,
  update_type text DEFAULT 'progress',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lt_updates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lt_updates" ON lt_updates;
CREATE POLICY "anon_select_lt_updates" ON lt_updates FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lt_updates" ON lt_updates;
CREATE POLICY "anon_insert_lt_updates" ON lt_updates FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lt_updates" ON lt_updates;
CREATE POLICY "anon_update_lt_updates" ON lt_updates FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lt_updates" ON lt_updates;
CREATE POLICY "anon_delete_lt_updates" ON lt_updates FOR DELETE TO anon, authenticated USING (true);

-- INTERNAL NOTES (Black Box — risk, strategy, never client-visible)
CREATE TABLE IF NOT EXISTS lt_internal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid REFERENCES lt_matters(id) ON DELETE CASCADE,
  risk_percentage numeric(5,2),
  strategy text,
  note_text text NOT NULL,
  author_role text DEFAULT 'مُشخّص قانوني',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lt_internal_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lt_notes" ON lt_internal_notes;
CREATE POLICY "anon_select_lt_notes" ON lt_internal_notes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lt_notes" ON lt_internal_notes;
CREATE POLICY "anon_insert_lt_notes" ON lt_internal_notes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lt_notes" ON lt_internal_notes;
CREATE POLICY "anon_update_lt_notes" ON lt_internal_notes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lt_notes" ON lt_internal_notes;
CREATE POLICY "anon_delete_lt_notes" ON lt_internal_notes FOR DELETE TO anon, authenticated USING (true);

-- DOCUMENTS (visibility-controlled)
CREATE TABLE IF NOT EXISTS lt_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid REFERENCES lt_matters(id) ON DELETE CASCADE,
  name text NOT NULL,
  doc_type text NOT NULL DEFAULT 'عقد',
  visibility text NOT NULL DEFAULT 'internal',
  status text NOT NULL DEFAULT 'draft',
  file_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lt_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lt_docs" ON lt_documents;
CREATE POLICY "anon_select_lt_docs" ON lt_documents FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lt_docs" ON lt_documents;
CREATE POLICY "anon_insert_lt_docs" ON lt_documents FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lt_docs" ON lt_documents;
CREATE POLICY "anon_update_lt_docs" ON lt_documents FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lt_docs" ON lt_documents;
CREATE POLICY "anon_delete_lt_docs" ON lt_documents FOR DELETE TO anon, authenticated USING (true);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_lt_matters_client ON lt_matters(client_id);
CREATE INDEX IF NOT EXISTS idx_lt_milestones_matter ON lt_milestones(matter_id);
CREATE INDEX IF NOT EXISTS idx_lt_actions_matter ON lt_client_actions(matter_id);
CREATE INDEX IF NOT EXISTS idx_lt_updates_matter ON lt_updates(matter_id);
CREATE INDEX IF NOT EXISTS idx_lt_notes_matter ON lt_internal_notes(matter_id);
CREATE INDEX IF NOT EXISTS idx_lt_docs_matter ON lt_documents(matter_id);

-- SEED SAMPLE DATA
INSERT INTO lt_matters (id, title, client_name, triage_lane, current_milestone_index, matter_type, status, next_hearing_date)
VALUES
  ('a0000000-0000-4000-8000-000000000001', 'نزاع عمالي — شركة النيل للتجارة', 'شركة النيل للتجارة', 'yellow', 2, 'تقاضي', 'نشط', '2026-08-15'),
  ('a0000000-0000-4000-8000-000000000002', 'تأسيس شركة إدارة محافظ مالية', 'مجموعة رأس المال الذكي', 'green', 1, 'تأسيس', 'نشط', NULL),
  ('a0000000-0000-4000-8000-000000000003', 'استحواذ على شركة الأهرام للنقل', 'شركة الأهرام القابضة', 'red', 0, 'استحواذ', 'نشط', '2026-07-30')
ON CONFLICT (id) DO NOTHING;

-- Milestones for matter 1 (labor dispute)
INSERT INTO lt_milestones (matter_id, step_index, client_label, internal_label, is_completed) VALUES
  ('a0000000-0000-4000-8000-000000000001', 0, 'الاستلام وتحليل الطلب', 'استلام ملف القضية وتحليل أولي للموقف', true),
  ('a0000000-0000-4000-8000-000000000001', 1, 'تحضير صحيفة الدعوى', 'صياغة صحيفة الدعوى وتجهيز المستندات', true),
  ('a0000000-0000-4000-8000-000000000001', 2, 'جلسات المرافعة وتبادل المذكرات', 'مرافعة + تبادل مذكرات مع الخصم', false),
  ('a0000000-0000-4000-8000-000000000001', 3, 'حجز الدعوى للحكم', 'حجز للحكم بعد إغلاق باب المرافعة', false),
  ('a0000000-0000-4000-8000-000000000001', 4, 'منطوق الحكم', 'صدور الحكم', false)
ON CONFLICT DO NOTHING;

-- Milestones for matter 2 (company formation)
INSERT INTO lt_milestones (matter_id, step_index, client_label, internal_label, is_completed) VALUES
  ('a0000000-0000-4000-8000-000000000002', 0, 'استلام المستندات وتقديم الطلب', 'استلام المستندات + تقديم للسجل التجاري', true),
  ('a0000000-0000-4000-8000-000000000002', 1, 'المراجعة التنظيمية', 'مراجعة الهيئة + مواءمة النظام الأساسي', false),
  ('a0000000-0000-4000-8000-000000000002', 2, 'في انتظار موافقة الجهة الحكومية', 'انتظار رد الهيئة الرقابية', false),
  ('a0000000-0000-4000-8000-000000000002', 3, 'إصدار الترخيص النهائي', 'إصدار الترخيص وتسليم العقد', false)
ON CONFLICT DO NOTHING;

-- Milestones for matter 3 (acquisition — red lane)
INSERT INTO lt_milestones (matter_id, step_index, client_label, internal_label, is_completed) VALUES
  ('a0000000-0000-4000-8000-000000000003', 0, 'تقييم الصفقة والاستحقاق', 'due diligence + تقييم المخاطر', false),
  ('a0000000-0000-4000-8000-000000000003', 1, 'صياغة اتفاقية الاستحواذ', 'صياغة SPA + مفاوضات', false),
  ('a0000000-0000-4000-8000-000000000003', 2, 'إغلاق الصفقة', 'Closing + نقل الملكية', false),
  ('a0000000-0000-4000-8000-000000000003', 3, 'ما بعد الإغلاق', 'Post-closing integration', false)
ON CONFLICT DO NOTHING;

-- Client actions
INSERT INTO lt_client_actions (matter_id, description, status, due_date) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'التوقيع على التوكيل الجديد المُعدّل', 'pending', '2026-07-28'),
  ('a0000000-0000-4000-8000-000000000002', 'توفير المستند المالي للسنة الأخيرة', 'pending', '2026-07-30'),
  ('a0000000-0000-4000-8000-000000000001', 'مراجعة قائمة الشهود المقترحين', 'completed', '2026-07-20')
ON CONFLICT DO NOTHING;

-- Sanitized updates
INSERT INTO lt_updates (matter_id, client_message, internal_note, update_type) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'انعقدت الجلسة بتاريخ 2026-07-10. تم استلام مذكرات الخصم، ويعكف الفريق القانوني حالياً على دراستها وتجهيز الرد القانوني المناسب للجلسة القادمة المحددة بتاريخ 2026-08-15.', 'دفاع الخصم قدم مذكرة قوية تثبت استلام العامل لمستحقاته. سنحتاج لطلب أجل للرد وتجهيز طعن بالتزوير على التوقيع. لا يجب إبلاغ العميل بتفاصيل ضعف الموقف الآن.', 'hearing'),
  ('a0000000-0000-4000-8000-000000000002', 'الطلب في مرحلة (المراجعة التنظيمية)، يتم الآن تحديث بعض بنود النظام الأساسي لضمان المطابقة التامة مع لوائح الهيئة. لا يوجد إجراء مطلوب من طرفكم.', 'تم رفض المسودة الأولى من الهيئة لوجود نقص في توافق النظام الأساسي مع متطلبات الحوكمة، نقوم الآن بتعديل البند رقم 4.', 'progress'),
  ('a0000000-0000-4000-8000-000000000003', 'تم فتح غرفة عمليات افتراضية للملف. يجري الفريق حالياً تقييم الصفقة وتحديد المخاطر القانونية المحتملة. سيتم التواصل معكم خلال 24 ساعة بموجز أولي.', 'المخاطر عالية: توجد دعاوى عمالية معلقة ضد الشركة المستهدفة لم يُفصح عنها. نسبة المخاطر 75%. يُنصح بإعادة التفاوض على السعر.', 'critical')
ON CONFLICT DO NOTHING;

-- Internal notes (Black Box)
INSERT INTO lt_internal_notes (matter_id, risk_percentage, strategy, note_text, author_role) VALUES
  ('a0000000-0000-4000-8000-000000000001', 65.00, 'طلب أجل لإعداد الرد + طعن بالتزوير على إيصال استلام المستحقات', 'موقف الخصم أقوى من المتوقع. الإيصال موقّع ومن الصعب الطعن فيه مباشرة. البديل: طعن بالتزوير على التوقيع + طلب خبرة فنية.', 'مُشخّص قانوني'),
  ('a0000000-0000-4000-8000-000000000002', 30.00, 'مواءمة البند 4 + إعادة التقديم خلال أسبوع', 'الرفض من الهيئة إداري وليس جوهري. التعديلات المطلوبة روتينية. لا داعي لإبلاغ العميل بتفاصيل الرفض.', 'مدير نجاح العميل'),
  ('a0000000-0000-4000-8000-000000000003', 75.00, 'إعادة التفاوض على السعر + شرط ضمان الدعاوى', 'دعاوى العمالة المعلقة قد تكلف 2-3 مليون. يجب خصمها من سعر الاستحواذ أو طلب كفالة ضمان من البائع.', 'محامٍ شريك')
ON CONFLICT DO NOTHING;

-- Documents
INSERT INTO lt_documents (matter_id, name, doc_type, visibility, status) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'صحيفة الدعوى — النسخة النهائية', 'صحيفة دعوى', 'client', 'final'),
  ('a0000000-0000-4000-8000-000000000001', 'مذكرة الرد — مسودة أولية', 'مذكرة', 'internal', 'draft'),
  ('a0000000-0000-4000-8000-000000000002', 'النظام الأساسي — للمراجعة النهائية', 'عقد', 'client', 'review'),
  ('a0000000-0000-4000-8000-000000000002', 'النظام الأساسي — مسودة بها تعليقات داخلية', 'عقد', 'internal', 'draft'),
  ('a0000000-0000-4000-8000-000000000003', 'اتفاقية عدم إفصاح (NDA)', 'اتفاقية', 'client', 'final'),
  ('a0000000-0000-4000-8000-000000000003', 'تقرير الاستحقاق — مسودة داخلية', 'تقرير', 'internal', 'draft')
ON CONFLICT DO NOTHING;
