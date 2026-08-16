/*
# M10 — Smart Case Core Engine (نواة القضية الذكية — العصب المركزي)
The central nervous system of the entire platform. Manages case trees, deadlines,
auto-generated defenses, and multi-tenant mode adaptation.
Stages: tree_construction → deadline_calibration → defense_generation → trial_readiness
Integration: M1-M8 (all engines feed into M10), M54 (cost centers), M92 (task distribution), M52 (mail)
Multi-tenant modes: law_firms, legal_departments, government_entities
*/

CREATE TABLE IF NOT EXISTS m10_smart_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text NOT NULL UNIQUE,
  case_title text NOT NULL,
  source_engine text,
  source_case_number text,
  source_case_id uuid,
  stage text DEFAULT 'tree_construction',
  operating_mode text DEFAULT 'law_firms',
  case_category text,
  court text,
  court_circuit text,
  filing_date date,
  next_hearing_date date,
  next_deadline_date date,
  next_deadline_label text,
  judgment_date date,
  judgment_outcome text,
  is_final boolean DEFAULT false,
  case_tree_encrypted boolean DEFAULT false,
  encryption_standard text DEFAULT 'AES-256',
  facts_summary text,
  legal_basis text,
  parties_summary text,
  evidence_summary text,
  defense_draft text,
  success_probability numeric(5,2) DEFAULT 0,
  financial_value numeric(14,2) DEFAULT 0,
  cost_center_id text,
  assigned_attorney_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  client_name text,
  client_type text,
  m54_cost_center_opened boolean DEFAULT false,
  m92_task_distributed boolean DEFAULT false,
  m52_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE m10_smart_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m10_cases" ON m10_smart_cases;
CREATE POLICY "anon_select_m10_cases" ON m10_smart_cases FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m10_cases" ON m10_smart_cases;
CREATE POLICY "anon_insert_m10_cases" ON m10_smart_cases FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m10_cases" ON m10_smart_cases;
CREATE POLICY "anon_update_m10_cases" ON m10_smart_cases FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m10_cases" ON m10_smart_cases;
CREATE POLICY "anon_delete_m10_cases" ON m10_smart_cases FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m10_case_tree_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m10_smart_cases(id) ON DELETE CASCADE,
  node_type text NOT NULL,
  node_title text NOT NULL,
  node_content text,
  parent_node_id uuid REFERENCES m10_case_tree_nodes(id) ON DELETE SET NULL,
  node_order int DEFAULT 0,
  encrypted boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m10_case_tree_nodes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m10_tree" ON m10_case_tree_nodes;
CREATE POLICY "anon_select_m10_tree" ON m10_case_tree_nodes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m10_tree" ON m10_case_tree_nodes;
CREATE POLICY "anon_insert_m10_tree" ON m10_case_tree_nodes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m10_tree" ON m10_case_tree_nodes;
CREATE POLICY "anon_update_m10_tree" ON m10_case_tree_nodes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m10_tree" ON m10_case_tree_nodes;
CREATE POLICY "anon_delete_m10_tree" ON m10_case_tree_nodes FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m10_deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m10_smart_cases(id) ON DELETE CASCADE,
  deadline_type text NOT NULL,
  deadline_label text NOT NULL,
  deadline_date date NOT NULL,
  statutory_basis text,
  days_from_filing int,
  status text DEFAULT 'upcoming',
  completed_at timestamptz,
  auto_calculated boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m10_deadlines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m10_deadlines" ON m10_deadlines;
CREATE POLICY "anon_select_m10_deadlines" ON m10_deadlines FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m10_deadlines" ON m10_deadlines;
CREATE POLICY "anon_insert_m10_deadlines" ON m10_deadlines FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m10_deadlines" ON m10_deadlines;
CREATE POLICY "anon_update_m10_deadlines" ON m10_deadlines FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m10_deadlines" ON m10_deadlines;
CREATE POLICY "anon_delete_m10_deadlines" ON m10_deadlines FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m10_defense_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m10_smart_cases(id) ON DELETE CASCADE,
  draft_title text NOT NULL,
  draft_type text DEFAULT 'statement_of_claim',
  draft_content text,
  legal_gaps_identified text,
  generated_by text DEFAULT 'M10-AI',
  review_status text DEFAULT 'draft',
  reviewed_by text,
  reviewed_at timestamptz,
  version int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m10_defense_drafts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m10_drafts" ON m10_defense_drafts;
CREATE POLICY "anon_select_m10_drafts" ON m10_defense_drafts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m10_drafts" ON m10_defense_drafts;
CREATE POLICY "anon_insert_m10_drafts" ON m10_defense_drafts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m10_drafts" ON m10_defense_drafts;
CREATE POLICY "anon_update_m10_drafts" ON m10_defense_drafts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m10_drafts" ON m10_defense_drafts;
CREATE POLICY "anon_delete_m10_drafts" ON m10_defense_drafts FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m10_smart_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m10_smart_cases(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m10_smart_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m10_audit" ON m10_smart_audit_logs;
CREATE POLICY "anon_select_m10_audit" ON m10_smart_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m10_audit" ON m10_smart_audit_logs;
CREATE POLICY "anon_insert_m10_audit" ON m10_smart_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m10_audit" ON m10_smart_audit_logs;
CREATE POLICY "anon_update_m10_audit" ON m10_smart_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m10_audit" ON m10_smart_audit_logs;
CREATE POLICY "anon_delete_m10_audit" ON m10_smart_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m10_cases_number ON m10_smart_cases(case_number);
CREATE INDEX IF NOT EXISTS idx_m10_cases_stage ON m10_smart_cases(stage);
CREATE INDEX IF NOT EXISTS idx_m10_cases_mode ON m10_smart_cases(operating_mode);
CREATE INDEX IF NOT EXISTS idx_m10_cases_source ON m10_smart_cases(source_engine);
CREATE INDEX IF NOT EXISTS idx_m10_tree_case ON m10_case_tree_nodes(case_id);
CREATE INDEX IF NOT EXISTS idx_m10_deadlines_case ON m10_deadlines(case_id);
CREATE INDEX IF NOT EXISTS idx_m10_deadlines_date ON m10_deadlines(deadline_date);
CREATE INDEX IF NOT EXISTS idx_m10_drafts_case ON m10_defense_drafts(case_id);
CREATE INDEX IF NOT EXISTS idx_m10_audit_case ON m10_smart_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m10_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_m10_cases_touch ON m10_smart_cases;
CREATE TRIGGER trg_m10_cases_touch BEFORE UPDATE ON m10_smart_cases
  FOR EACH ROW EXECUTE FUNCTION m10_touch_updated_at();

INSERT INTO m10_smart_cases (case_number, case_title, source_engine, source_case_number, stage, operating_mode, case_category, court, court_circuit, filing_date, next_hearing_date, next_deadline_date, next_deadline_label, case_tree_encrypted, facts_summary, legal_basis, parties_summary, evidence_summary, defense_draft, success_probability, financial_value, cost_center_id, client_name, client_type, m54_cost_center_opened, m92_task_distributed, m52_notified, description) VALUES
  ('SCC-2025-001', 'منازعة تعويض — شركة الصناعات الغذائية ضد المورد', 'M1', 'CC-2025-031', 'defense_generation', 'law_firms', 'commercial', 'محكمة的经济ية', 'الدائرة التجارية', '2025-06-10', '2025-09-15', '2025-09-10', 'تقديم مذكرة الدفوع', true, 'شركة الصناعات الغذائية تطالب المورد بتعويض 2.5 مليون ج.م عن توريد مواد خام غير مطابقة للمواصفات', 'المواد 67 و 69 من قانون المعاملات المدنية — المسؤولية العقدية', 'المدعي: شركة الصناعات الغذائية — المدعى عليه: شركة المورد التجاري', 'عقود التوريد، فواتير، تقارير الفحص الفني، مراسلات بريدية', 'مسودة صحيفة الدعوى — استناد إلى الإخلال الجسي بالتزامات التعاقدية', 78.00, 2500000.00, 'CC-M10-001', 'شركة الصناعات الغذائية المتحدة', 'corporate', true, true, true, 'قضية تجارية معقدة — تم بناء شجرة القضية وحساب المواعيد آلياً — المسودة في مرحلة المراجعة'),
  ('SCC-2025-002', 'تحقيق إداري — مخالفة مالية في إدارة المشتريات', 'M3', 'SC-2025-018', 'tree_construction', 'government_entities', 'administrative', 'محكمة القضاء الإداري', 'الدائرة الثالثة', '2025-07-01', null, '2025-08-30', 'ميعاد تقديم التحقيقات', true, 'تحقيق إداري في مخالفة مالية بخصوص إجراءات طرح وترسية عقد أشغال عامة', 'قانون تنظيم المناقصات والمزايدات', 'الجهة: وزارة الصحة — المشتبه به: مدير المشتريات', 'تقارير الجهاز المركزي للمحاسبات، مستندات الطرح', null, 65.00, 0, 'CC-M10-002', 'وزارة الصحة', 'government', false, false, true, 'تحقيق إداري حكومي — نمط التشغيل: الجهات الحكومية — شجرة القضية قيد البناء')
ON CONFLICT DO NOTHING;

INSERT INTO m10_case_tree_nodes (case_id, node_type, node_title, node_content, node_order, encrypted) VALUES
  ((SELECT id FROM m10_smart_cases WHERE case_number='SCC-2025-001'), 'fact', 'واقعة التوريد المعيب', 'توريد 50 طن مواد خام غير مطابقة للمواصفات في 15 مارس 2025', 1, true),
  ((SELECT id FROM m10_smart_cases WHERE case_number='SCC-2025-001'), 'party', 'المدعي — شركة الصناعات الغذائية', 'طالب التعويض — متضرر من التوريد المعيب', 2, true),
  ((SELECT id FROM m10_smart_cases WHERE case_number='SCC-2025-001'), 'party', 'المدعى عليه — شركة المورد التجاري', 'المورد — مسؤول عن التوريد المعيب', 3, true),
  ((SELECT id FROM m10_smart_cases WHERE case_number='SCC-2025-001'), 'evidence', 'تقرير الفحص الفني', 'تقرير جهة فحص معتمدة يثبت عدم مطابقة المواد للمواصفات', 4, true),
  ((SELECT id FROM m10_smart_cases WHERE case_number='SCC-2025-001'), 'legal_basis', 'الإخلال الجسي بالتزامات التعاقدية', 'المادة 69 من قانون المعاملات المدنية — التعويض عن الضرر', 5, true),
  ((SELECT id FROM m10_smart_cases WHERE case_number='SCC-2025-002'), 'fact', 'واقعة المخالفة المالية', 'طرح وترسية عقد أشغال عامة بدون اتباع إجراءات المناقصة', 1, true),
  ((SELECT id FROM m10_smart_cases WHERE case_number='SCC-2025-002'), 'party', 'الجهة الإدارية — وزارة الصحة', 'الجهة المتضررة من المخالفة', 2, true),
  ((SELECT id FROM m10_smart_cases WHERE case_number='SCC-2025-002'), 'evidence', 'تقرير الجهاز المركزي للمحاسبات', 'تقرير يثبت مخالفة إجراءات الطرح والترسية', 3, true)
ON CONFLICT DO NOTHING;

INSERT INTO m10_deadlines (case_id, deadline_type, deadline_label, deadline_date, statutory_basis, days_from_filing, status, auto_calculated) VALUES
  ((SELECT id FROM m10_smart_cases WHERE case_number='SCC-2025-001'), 'appeal_window', 'ميعاد استئناف الحكم (40 يوم)', '2025-10-25', 'المادة 187 من قانون المرافعات', 40, 'upcoming', true),
  ((SELECT id FROM m10_smart_cases WHERE case_number='SCC-2025-001'), 'memo_submission', 'تقديم مذكرة الدفوع', '2025-09-10', null, null, 'upcoming', true),
  ((SELECT id FROM m10_smart_cases WHERE case_number='SCC-2025-001'), 'hearing', 'جلسة المرافعة', '2025-09-15', null, null, 'upcoming', true),
  ((SELECT id FROM m10_smart_cases WHERE case_number='SCC-2025-002'), 'investigation_deadline', 'ميعاد تقديم التحقيقات', '2025-08-30', 'قانون تنظيم المناقصات', 60, 'upcoming', true)
ON CONFLICT DO NOTHING;

INSERT INTO m10_defense_drafts (case_id, draft_title, draft_type, draft_content, legal_gaps_identified, generated_by, review_status) VALUES
  ((SELECT id FROM m10_smart_cases WHERE case_number='SCC-2025-001'), 'مسودة صحيفة الدعوى — التعويض عن التوريد المعيب', 'statement_of_claim', 'إن المدعي يطالب بالتعويض عن الأضرار الناجمة عن توريد مواد خام غير مطابقة للمواصفات، حيث أخل المدعى عليه بإلتزاماته التعاقدية إخلالاً جسياً...', 'ثغرة في إثبات نسبة العيب — يلزم تقرير فني إضافي — نقص في تقدير الأضرار غير المباشرة', 'M10-AI', 'under_review')
ON CONFLICT DO NOTHING;

INSERT INTO m10_smart_audit_logs (case_id, action, actor, actor_role, detail, hash_chain) VALUES
  ((SELECT id FROM m10_smart_cases WHERE case_number='SCC-2025-001'), 'tree_constructed', 'النظام', 'النظام', 'بناء شجرة القضية — ربط الوقائع والخصوم والأدلة والأسانيد', '0xa1b2...c3d4'),
  ((SELECT id FROM m10_smart_cases WHERE case_number='SCC-2025-001'), 'aes_encrypted', 'النظام', 'النظام', 'تشفير شجرة القضية بمعيار AES-256', '0xb2c3...d4e5'),
  ((SELECT id FROM m10_smart_cases WHERE case_number='SCC-2025-001'), 'deadlines_calculated', 'النظام', 'النظام', 'حساب المواعيد الإجرائية آلياً — ميعاد الاستئناف 40 يوم', '0xc3d4...e5f6'),
  ((SELECT id FROM m10_smart_cases WHERE case_number='SCC-2025-001'), 'defense_generated', 'M10-AI', 'النظام', 'توليد مسودة صحيفة الدعوى آلياً — استخلاص الثغرات القانونية', '0xd4e5...f6a7'),
  ((SELECT id FROM m10_smart_cases WHERE case_number='SCC-2025-001'), 'm54_cost_center', 'النظام', 'النظام', 'فتح مركز تكلفة في المحرك المالي M54', '0xe5f6...a7b8'),
  ((SELECT id FROM m10_smart_cases WHERE case_number='SCC-2025-001'), 'm92_distributed', 'النظام', 'النظام', 'توزيع التكليفات على المحامين عبر الوكيل الذكي M92', '0xf6a7...b8c9'),
  ((SELECT id FROM m10_smart_cases WHERE case_number='SCC-2025-002'), 'tree_construction_started', 'النظام', 'النظام', 'بدء بناء شجرة القضية — نمط الجهات الحكومية', '0x1a2b...2b3c')
ON CONFLICT DO NOTHING;
