/*
# Create internal task engine (M51) schema

Implements the sovereign internal task management and collaborative boards engine (M51),
a fully local alternative to external Kanban tools. All task metadata, legal context,
and security context remain inside the firm's encrypted infrastructure.

1. New Tables:
- `m51_tasks`: Internal task cards with priority, lifecycle, cross-engine links (module_id + resource_id), encrypted attachments, time tracking, and client portal visibility.
- `m51_task_activity`: Audit trail / activity log for every task (creation, status changes, assignments, comments).
- `m51_task_comments`: Collaborative comments on task cards.
- `m51_task_attachments`: Encrypted attachment references linked to the sovereign archive.

2. Security: RLS enabled, anon+authenticated full CRUD (single-tenant, no auth gating at DB level).
*/

-- INTERNAL TASKS (M51)
CREATE TABLE IF NOT EXISTS m51_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  task_type text DEFAULT 'general',
  priority text DEFAULT 'medium',
  status text DEFAULT 'open',
  due_date date,
  assigned_to uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  case_id uuid REFERENCES lf_cases(id) ON DELETE SET NULL,
  client_id uuid REFERENCES lf_clients(id) ON DELETE SET NULL,
  module_id text,
  resource_id text,
  source_engine text,
  auto_generated boolean DEFAULT false,
  client_visible boolean DEFAULT false,
  hours_logged numeric(8,2) DEFAULT 0,
  tags jsonb DEFAULT '[]'::jsonb,
  encrypted_attachments jsonb DEFAULT '[]'::jsonb,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE m51_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m51_tasks" ON m51_tasks;
CREATE POLICY "anon_select_m51_tasks" ON m51_tasks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m51_tasks" ON m51_tasks;
CREATE POLICY "anon_insert_m51_tasks" ON m51_tasks FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m51_tasks" ON m51_tasks;
CREATE POLICY "anon_update_m51_tasks" ON m51_tasks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m51_tasks" ON m51_tasks;
CREATE POLICY "anon_delete_m51_tasks" ON m51_tasks FOR DELETE TO anon, authenticated USING (true);

-- TASK ACTIVITY LOG
CREATE TABLE IF NOT EXISTS m51_task_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES m51_tasks(id) ON DELETE CASCADE,
  actor text,
  action text NOT NULL,
  old_value text,
  new_value text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m51_task_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m51_activity" ON m51_task_activity;
CREATE POLICY "anon_select_m51_activity" ON m51_task_activity FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m51_activity" ON m51_task_activity;
CREATE POLICY "anon_insert_m51_activity" ON m51_task_activity FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m51_activity" ON m51_task_activity;
CREATE POLICY "anon_update_m51_activity" ON m51_task_activity FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m51_activity" ON m51_task_activity;
CREATE POLICY "anon_delete_m51_activity" ON m51_task_activity FOR DELETE TO anon, authenticated USING (true);

-- TASK COMMENTS
CREATE TABLE IF NOT EXISTS m51_task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES m51_tasks(id) ON DELETE CASCADE,
  author text,
  body text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m51_task_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m51_comments" ON m51_task_comments;
CREATE POLICY "anon_select_m51_comments" ON m51_task_comments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m51_comments" ON m51_task_comments;
CREATE POLICY "anon_insert_m51_comments" ON m51_task_comments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m51_comments" ON m51_task_comments;
CREATE POLICY "anon_update_m51_comments" ON m51_task_comments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m51_comments" ON m51_task_comments;
CREATE POLICY "anon_delete_m51_comments" ON m51_task_comments FOR DELETE TO anon, authenticated USING (true);

-- TASK ATTACHMENTS (encrypted references to sovereign archive)
CREATE TABLE IF NOT EXISTS m51_task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES m51_tasks(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_size bigint DEFAULT 0,
  encryption_ref text,
  archive_id text,
  uploaded_by text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m51_task_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m51_attachments" ON m51_task_attachments;
CREATE POLICY "anon_select_m51_attachments" ON m51_task_attachments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m51_attachments" ON m51_task_attachments;
CREATE POLICY "anon_insert_m51_attachments" ON m51_task_attachments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m51_attachments" ON m51_task_attachments;
CREATE POLICY "anon_update_m51_attachments" ON m51_task_attachments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m51_attachments" ON m51_task_attachments;
CREATE POLICY "anon_delete_m51_attachments" ON m51_task_attachments FOR DELETE TO anon, authenticated USING (true);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_m51_tasks_status ON m51_tasks(status);
CREATE INDEX IF NOT EXISTS idx_m51_tasks_priority ON m51_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_m51_tasks_assignee ON m51_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_m51_tasks_case ON m51_tasks(case_id);
CREATE INDEX IF NOT EXISTS idx_m51_tasks_module ON m51_tasks(module_id);
CREATE INDEX IF NOT EXISTS idx_m51_tasks_due ON m51_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_m51_activity_task ON m51_task_activity(task_id);
CREATE INDEX IF NOT EXISTS idx_m51_comments_task ON m51_task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_m51_attachments_task ON m51_task_attachments(task_id);

-- AUTO-UPDATE updated_at TRIGGER
CREATE OR REPLACE FUNCTION m51_touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_m51_tasks_touch ON m51_tasks;
CREATE TRIGGER trg_m51_tasks_touch BEFORE UPDATE ON m51_tasks
  FOR EACH ROW EXECUTE FUNCTION m51_touch_updated_at();

-- SEED: a few demonstration tasks showing cross-engine integration
INSERT INTO m51_tasks (title, description, task_type, priority, status, source_engine, auto_generated, module_id, resource_id, tags)
VALUES
  ('مراجعة قرار مجلس الإدارة رقم 14', 'تفكيك القرار وتوزيع المهام التنفيذية على الأقسام المعنية', 'board_resolution', 'high', 'in_progress', 'M49-BoardEngine', true, 'M49', 'RES-2025-014', '["قرار إداري","مجلس الإدارة"]'),
  ('تدقيق أمني: محاولة اختراق من IP خارجي', 'تم رصد محاولة وصول غير مصرح به من عنوان IP مشبوه — مطلوب تحقيق فوري', 'security_audit', 'critical', 'open', 'M14-SecurityEngine', true, 'M14', 'SEC-ALERT-0042', '["أمن سيبراني","حرج"]'),
  ('إعداد مذكرة الدفع لقضية 2025/134', 'تحضير المذكرة القانونية وربطها بملف القضية في النواة', 'legal_memo', 'high', 'open', 'M10-CaseCore', false, 'M10', 'CASE-2025-134', '["دفوع","نواة القضية"]')
ON CONFLICT DO NOTHING;
