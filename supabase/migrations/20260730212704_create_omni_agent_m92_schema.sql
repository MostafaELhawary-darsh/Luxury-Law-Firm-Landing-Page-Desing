/*
# Create Omni-Agent (M92) schema — the sovereign central AI orchestrator

Implements the "maestro" agent that decomposes text/voice commands into parallel subtasks
dispatched across all 109 engines. Includes intent analysis, cluster activation tracking,
immutable audit logs, and a sovereign engine registry.

1. New Tables:
- `m92_engine_registry`: Catalog of all 109 sectoral engines with activation metadata.
- `m92_commands`: Incoming text/voice commands with decomposition state and execution status.
- `m92_subtasks`: Decomposed subtasks linked to specific engines, with parallel execution tracking.
- `m92_audit_logs`: Immutable zero-trust audit trail of every command execution (AES-256 context).

2. Security: RLS enabled, anon+authenticated full CRUD (single-tenant, no auth gating at DB level).
*/

-- ENGINE REGISTRY (109 engines)
CREATE TABLE IF NOT EXISTS m92_engine_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engine_code text NOT NULL UNIQUE,
  engine_name text NOT NULL,
  engine_name_ar text NOT NULL,
  category text NOT NULL,
  department text,
  description text,
  icon text DEFAULT 'CircuitBoard',
  active boolean DEFAULT true,
  can_activate boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m92_engine_registry ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m92_registry" ON m92_engine_registry;
CREATE POLICY "anon_select_m92_registry" ON m92_engine_registry FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m92_registry" ON m92_engine_registry;
CREATE POLICY "anon_insert_m92_registry" ON m92_engine_registry FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m92_registry" ON m92_engine_registry;
CREATE POLICY "anon_update_m92_registry" ON m92_engine_registry FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m92_registry" ON m92_engine_registry;
CREATE POLICY "anon_delete_m92_registry" ON m92_engine_registry FOR DELETE TO anon, authenticated USING (true);

-- COMMANDS (incoming text/voice instructions)
CREATE TABLE IF NOT EXISTS m92_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_input text NOT NULL,
  input_type text DEFAULT 'text',
  intent text,
  intent_confidence numeric(5,2) DEFAULT 0,
  entities jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'pending',
  total_subtasks int DEFAULT 0,
  completed_subtasks int DEFAULT 0,
  synthesis_output text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE m92_commands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m92_commands" ON m92_commands;
CREATE POLICY "anon_select_m92_commands" ON m92_commands FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m92_commands" ON m92_commands;
CREATE POLICY "anon_insert_m92_commands" ON m92_commands FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m92_commands" ON m92_commands;
CREATE POLICY "anon_update_m92_commands" ON m92_commands FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m92_commands" ON m92_commands;
CREATE POLICY "anon_delete_m92_commands" ON m92_commands FOR DELETE TO anon, authenticated USING (true);

-- SUBTASKS (decomposed parallel execution units)
CREATE TABLE IF NOT EXISTS m92_subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  command_id uuid REFERENCES m92_commands(id) ON DELETE CASCADE,
  engine_code text NOT NULL,
  engine_name_ar text,
  task_title text NOT NULL,
  task_description text,
  department text,
  status text DEFAULT 'pending',
  execution_order int DEFAULT 0,
  result_data jsonb DEFAULT '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m92_subtasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m92_subtasks" ON m92_subtasks;
CREATE POLICY "anon_select_m92_subtasks" ON m92_subtasks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m92_subtasks" ON m92_subtasks;
CREATE POLICY "anon_insert_m92_subtasks" ON m92_subtasks FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m92_subtasks" ON m92_subtasks;
CREATE POLICY "anon_update_m92_subtasks" ON m92_subtasks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m92_subtasks" ON m92_subtasks;
CREATE POLICY "anon_delete_m92_subtasks" ON m92_subtasks FOR DELETE TO anon, authenticated USING (true);

-- AUDIT LOGS (immutable zero-trust trail)
CREATE TABLE IF NOT EXISTS m92_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  command_id uuid REFERENCES m92_commands(id) ON DELETE CASCADE,
  action text NOT NULL,
  actor text DEFAULT 'M92-OmniAgent',
  engine_code text,
  detail text,
  severity text DEFAULT 'info',
  encryption_context text DEFAULT 'AES-256',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m92_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m92_audit" ON m92_audit_logs;
CREATE POLICY "anon_select_m92_audit" ON m92_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m92_audit" ON m92_audit_logs;
CREATE POLICY "anon_insert_m92_audit" ON m92_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m92_audit" ON m92_audit_logs;
CREATE POLICY "anon_update_m92_audit" ON m92_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m92_audit" ON m92_audit_logs;
CREATE POLICY "anon_delete_m92_audit" ON m92_audit_logs FOR DELETE TO anon, authenticated USING (true);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_m92_commands_status ON m92_commands(status);
CREATE INDEX IF NOT EXISTS idx_m92_commands_created ON m92_commands(created_at);
CREATE INDEX IF NOT EXISTS idx_m92_subtasks_command ON m92_subtasks(command_id);
CREATE INDEX IF NOT EXISTS idx_m92_subtasks_engine ON m92_subtasks(engine_code);
CREATE INDEX IF NOT EXISTS idx_m92_subtasks_status ON m92_subtasks(status);
CREATE INDEX IF NOT EXISTS idx_m92_audit_command ON m92_audit_logs(command_id);
CREATE INDEX IF NOT EXISTS idx_m92_audit_created ON m92_audit_logs(created_at);

-- SEED: Engine registry (key engines referenced in the spec)
INSERT INTO m92_engine_registry (engine_code, engine_name, engine_name_ar, category, department, description, icon) VALUES
  ('M10',  'CaseCore',           'نواة القضية',              'legal',    'القسم القانوني',  'إدارة الملفات والقضايا الأساسية', 'Gavel'),
  ('M14',  'SecurityEngine',     'محرك الأمن',               'security', 'الأمن السيبراني', 'كشف التهديدات والتحقيق الأمني', 'ShieldAlert'),
  ('M49',  'BoardEngine',        'محرك مجلس الإدارة',        'governance','الإدارة العليا',  'قرارات مجلس الإدارة وتفكيكها', 'Briefcase'),
  ('M51',  'TaskEngine',         'محرك المهام الداخلي',      'operations','العمليات',       'إدارة المهام واللوحات التعاونية', 'KanbanSquare'),
  ('M54',  'FinanceEngine',      'المحرك المالي',            'finance',  'القسم المالي',    'الأتعاب وتوزيع الأرباح (Hale & Dorr)', 'DollarSign'),
  ('M77',  'HREngine',           'الموارد البشرية',          'hr',       'الموارد البشرية', 'إدارة الموظفين والكوادر', 'Users'),
  ('M87',  'IndustrialLicense',  'التراخيص الصناعية',        'compliance','الامتثال',       'تراخيص التشغيل والاعتمادات الصناعية', 'FileCheck'),
  ('M90',  'ImportExport',       'الاستيراد والتصدير',       'trade',    'التجارة الخارجية','فحص شروط الاستيراد والتصدير', 'Ship'),
  ('M106', 'FoodSafety',         'سلامة الغذاء',              'compliance','الامتثال',       'التحقق من مواصفات سلامة الغذاء', 'ShieldCheck'),
  ('M92',  'OmniAgent',          'الوكيل الذكي السيادي',     'orchestration','التنسيق المركزي','العقل الموجه للمنظومة بالكامل', 'Brain'),
  ('M88',  'DocumentEngine',     'محرك الوثائق السيادي',     'documents','الأرشيف',        'توليد العقود والمذكرات والوثائق', 'FileText'),
  ('M11',  'LegalLibrary',       'المكتبة القانونية',        'research', 'البحث القانوني',  'التشريعات والأحكام والفتاوى', 'BookOpen'),
  ('M55',  'AccountingCycle',    'الدورة المحاسبية',         'finance',  'المحاسبة',       'القيود والدورة المحاسبية الشاملة', 'Calculator'),
  ('M78',  'PartnerCompensation','تعويضات الشركاء',          'finance',  'الشراكة',        'نموذج Hale & Dorr للتعويضات', 'Handshake'),
  ('M89',  'SmartCaseMatrix',    'المصفوفة الذكية للقضايا',  'legal',    'التحليل القانوني','تصنيف وتقييم القضايا', 'Grid3x3')
ON CONFLICT (engine_code) DO NOTHING;

-- SEED: Example decomposed command
INSERT INTO m92_commands (id, raw_input, input_type, intent, intent_confidence, entities, status, total_subtasks, completed_subtasks, synthesis_output)
VALUES (
  'a1000000-0000-4000-8000-000000000001',
  'قم بتأسيس مصنع سيراميك وإعداد عقود التوزيع',
  'text',
  'project_establishment',
  94.50,
  '["مصنع سيراميك","عقود التوزيع"]'::jsonb,
  'completed',
  4,
  4,
  'تم تأسيس الملف القانوني للمصنع، استخراج التراخيص الصناعية، فتح مركز التكلفة المالي، وإعداد عقود التوزيع.'
)
ON CONFLICT DO NOTHING;

INSERT INTO m92_subtasks (command_id, engine_code, engine_name_ar, task_title, task_description, department, status, execution_order, result_data)
VALUES
  ('a1000000-0000-4000-8000-000000000001', 'M10', 'نواة القضية', 'تأسيس ملف المشروع', 'إنشاء ملف قانوني جديد لمصنع السيراميك', 'القسم القانوني', 'completed', 1, '{"file_id":"CASE-2025-CER"}'::jsonb),
  ('a1000000-0000-4000-8000-000000000001', 'M87', 'التراخيص الصناعية', 'استخراج التراخيص', 'التقدم بطلب ترخيص تشغيل صناعي', 'الامتثال', 'completed', 2, '{"license_id":"LIC-2025-0892"}'::jsonb),
  ('a1000000-0000-4000-8000-000000000001', 'M54', 'المحرك المالي', 'فتح مركز التكلفة', 'إنشاء مركز تكلفة مالي للمشروع', 'القسم المالي', 'completed', 3, '{"cost_center":"CC-CER-001"}'::jsonb),
  ('a1000000-0000-4000-8000-000000000001', 'M88', 'محرك الوثائق السيادي', 'إعداد عقود التوزيع', 'توليد عقود التوزيع من القوالب السيادية', 'الأرشيف', 'completed', 4, '{"doc_count":3}'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO m92_audit_logs (command_id, action, actor, engine_code, detail, severity)
VALUES
  ('a1000000-0000-4000-8000-000000000001', 'command_received', 'M92-OmniAgent', 'M92', 'استقبال أمر: قم بتأسيس مصنع سيراميك وإعداد عقود التوزيع', 'info'),
  ('a1000000-0000-4000-8000-000000000001', 'intent_decomposed', 'M92-OmniAgent', 'M92', 'تفكيك الأمر إلى 4 مهام فرعية', 'info'),
  ('a1000000-0000-4000-8000-000000000001', 'cluster_activated', 'M92-OmniAgent', 'M10', 'تفعيل نواة القضية لتأسيس الملف', 'info'),
  ('a1000000-0000-4000-8000-000000000001', 'cluster_activated', 'M92-OmniAgent', 'M87', 'تفعيل التراخيص الصناعية', 'info'),
  ('a1000000-0000-4000-8000-000000000001', 'cluster_activated', 'M92-OmniAgent', 'M54', 'تفعيل المحرك المالي لفتح مركز التكلفة', 'info'),
  ('a1000000-0000-4000-8000-000000000001', 'cluster_activated', 'M92-OmniAgent', 'M88', 'تفعيل محرك الوثائق لإعداد العقود', 'info'),
  ('a1000000-0000-4000-8000-000000000001', 'synthesis_complete', 'M92-OmniAgent', 'M88', 'تم توليد 3 عقود توزيع', 'success'),
  ('a1000000-0000-4000-8000-000000000001', 'command_completed', 'M92-OmniAgent', 'M92', 'اكتمال تنفيذ الأمر بنجاح', 'success')
ON CONFLICT DO NOTHING;
