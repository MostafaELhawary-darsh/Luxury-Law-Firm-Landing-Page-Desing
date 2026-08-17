/*
# M9 — Execution & Enforcement Engine (محرك التنفيذ وإشكالات التنفيذ القضائي)
Final stage of litigation lifecycle: converts final judgments into physical reality.
Stages: writ_receipt → file_opening → obstacle_management → completion
Integration: M1-M8 (source judgments), M54 (financial collection), M10 (smart case core), M92 (omni-agent), M52 (mail)
*/

CREATE TABLE IF NOT EXISTS m09_execution_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text NOT NULL UNIQUE,
  case_title text NOT NULL,
  source_engine text,
  source_case_number text,
  source_case_id uuid,
  stage text DEFAULT 'writ_receipt',
  court text,
  enforcement_writ_number text,
  enforcement_writ_date date,
  bailiff_name text,
  bailiff_office text,
  police_coordination boolean DEFAULT false,
  target_amount numeric(14,2) DEFAULT 0,
  collected_amount numeric(14,2) DEFAULT 0,
  enforcement_type text DEFAULT 'monetary',
  property_seized text,
  assets_description text,
  enforcement_location text,
  filing_date date,
  completion_date date,
  enforcement_status text DEFAULT 'pending',
  is_completed boolean DEFAULT false,
  cost_center_id text,
  assigned_advisor_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  m10_linked boolean DEFAULT false,
  m54_collection_linked boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  m52_notified boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE m09_execution_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m09_cases" ON m09_execution_cases;
CREATE POLICY "anon_select_m09_cases" ON m09_execution_cases FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m09_cases" ON m09_execution_cases;
CREATE POLICY "anon_insert_m09_cases" ON m09_execution_cases FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m09_cases" ON m09_execution_cases;
CREATE POLICY "anon_update_m09_cases" ON m09_execution_cases FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m09_cases" ON m09_execution_cases;
CREATE POLICY "anon_delete_m09_cases" ON m09_execution_cases FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m09_enforcement_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m09_execution_cases(id) ON DELETE CASCADE,
  party_type text NOT NULL,
  name text NOT NULL,
  role text,
  authority_type text,
  contact_info text,
  legal_representation text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m09_enforcement_parties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m09_parties" ON m09_enforcement_parties;
CREATE POLICY "anon_select_m09_parties" ON m09_enforcement_parties FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m09_parties" ON m09_enforcement_parties;
CREATE POLICY "anon_insert_m09_parties" ON m09_enforcement_parties FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m09_parties" ON m09_enforcement_parties;
CREATE POLICY "anon_update_m09_parties" ON m09_enforcement_parties FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m09_parties" ON m09_enforcement_parties;
CREATE POLICY "anon_delete_m09_parties" ON m09_enforcement_parties FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m09_enforcement_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m09_execution_cases(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  action_title text NOT NULL,
  action_date date NOT NULL,
  executed_by text,
  result text,
  status text DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m09_enforcement_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m09_actions" ON m09_enforcement_actions;
CREATE POLICY "anon_select_m09_actions" ON m09_enforcement_actions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m09_actions" ON m09_enforcement_actions;
CREATE POLICY "anon_insert_m09_actions" ON m09_enforcement_actions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m09_actions" ON m09_enforcement_actions;
CREATE POLICY "anon_update_m09_actions" ON m09_enforcement_actions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m09_actions" ON m09_enforcement_actions;
CREATE POLICY "anon_delete_m09_actions" ON m09_enforcement_actions FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m09_enforcement_obstacles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m09_execution_cases(id) ON DELETE CASCADE,
  obstacle_type text NOT NULL,
  obstacle_title text NOT NULL,
  obstacle_nature text DEFAULT 'legal',
  filed_by text,
  filed_date date,
  legal_basis text,
  response_memo text,
  response_status text DEFAULT 'pending',
  resolved_date date,
  resolution text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m09_enforcement_obstacles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m09_obstacles" ON m09_enforcement_obstacles;
CREATE POLICY "anon_select_m09_obstacles" ON m09_enforcement_obstacles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m09_obstacles" ON m09_enforcement_obstacles;
CREATE POLICY "anon_insert_m09_obstacles" ON m09_enforcement_obstacles FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m09_obstacles" ON m09_enforcement_obstacles;
CREATE POLICY "anon_update_m09_obstacles" ON m09_enforcement_obstacles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m09_obstacles" ON m09_enforcement_obstacles;
CREATE POLICY "anon_delete_m09_obstacles" ON m09_enforcement_obstacles FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m09_execution_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES m09_execution_cases(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m09_execution_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m09_audit" ON m09_execution_audit_logs;
CREATE POLICY "anon_select_m09_audit" ON m09_execution_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m09_audit" ON m09_execution_audit_logs;
CREATE POLICY "anon_insert_m09_audit" ON m09_execution_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m09_audit" ON m09_execution_audit_logs;
CREATE POLICY "anon_update_m09_audit" ON m09_execution_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m09_audit" ON m09_execution_audit_logs;
CREATE POLICY "anon_delete_m09_audit" ON m09_execution_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m09_cases_number ON m09_execution_cases(case_number);
CREATE INDEX IF NOT EXISTS idx_m09_cases_stage ON m09_execution_cases(stage);
CREATE INDEX IF NOT EXISTS idx_m09_cases_status ON m09_execution_cases(enforcement_status);
CREATE INDEX IF NOT EXISTS idx_m09_parties_case ON m09_enforcement_parties(case_id);
CREATE INDEX IF NOT EXISTS idx_m09_actions_case ON m09_enforcement_actions(case_id);
CREATE INDEX IF NOT EXISTS idx_m09_obstacles_case ON m09_enforcement_obstacles(case_id);
CREATE INDEX IF NOT EXISTS idx_m09_audit_case ON m09_execution_audit_logs(case_id);

CREATE OR REPLACE FUNCTION m09_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_m09_cases_touch ON m09_execution_cases;
CREATE TRIGGER trg_m09_cases_touch BEFORE UPDATE ON m09_execution_cases
  FOR EACH ROW EXECUTE FUNCTION m09_touch_updated_at();

INSERT INTO m09_execution_cases (case_number, case_title, source_engine, source_case_number, stage, court, enforcement_writ_number, enforcement_writ_date, bailiff_name, bailiff_office, police_coordination, target_amount, collected_amount, enforcement_type, enforcement_location, filing_date, enforcement_status, cost_center_id, m10_linked, m54_collection_linked, m92_notified, m52_notified, description) VALUES
  ('EX-2025-003', 'تنفيذ حكم إخلاء عقاري — القضية 2024/1234', 'M1', 'CC-2024-1234', 'obstacle_management', 'محكمة التنفيذ', 'EX-WRIT-003', '2025-06-15', 'المحضر/ أ.م', 'مأمورية التنفيذ بالعاصمة', true, 0, 0, 'eviction', 'القاهرة - حي الزمالك - عقار 12 شارع 26', '2025-06-20', 'obstructed', 'CC-M09-003', true, false, true, true, 'تنفيذ حكم إخلاء نهائي — المحكوم عليه رفع إشكال تنفيذ واقعي بخصوص حيازة العقار'),
  ('EX-2025-007', 'تنفيذ حكم مالي — تحصيل 450,000 ج.م', 'M4', 'EC-2025-007', 'file_opening', 'محكمة التنفيذ', 'EX-WRIT-007', '2025-07-10', 'المحضر/ س.ع', 'مأمورية التنفيذ بالمعادي', false, 450000.00, 120000.00, 'monetary', 'القاهرة - المعادي', '2025-07-15', 'in_progress', 'CC-M09-007', true, true, true, true, 'تنفيذ حكم إفلاس — تحصيل جزئي 120,000 ج.م من أصل 450,000 ج.م — تم الحجز على حساب بنكي')
ON CONFLICT DO NOTHING;

INSERT INTO m09_enforcement_parties (case_id, party_type, name, role, authority_type, contact_info, legal_representation) VALUES
  ((SELECT id FROM m09_execution_cases WHERE case_number='EX-2025-003'), 'creditor', 'السيد/ م.ع', 'المحكوم له', null, null, 'مكتب المحاماة'),
  ((SELECT id FROM m09_execution_cases WHERE case_number='EX-2025-003'), 'debtor', 'السيد/ ر.ح', 'المحكوم عليه', null, null, 'مستشار قانوني'),
  ((SELECT id FROM m09_execution_cases WHERE case_number='EX-2025-003'), 'bailiff', 'المحضر/ أ.م', 'محضر التنفيذ', 'مأمورية', null, null),
  ((SELECT id FROM m09_execution_cases WHERE case_number='EX-2025-007'), 'creditor', 'بنك التنمية', 'المحكوم له', 'مصرفي', null, 'مكتب المحاماة'),
  ((SELECT id FROM m09_execution_cases WHERE case_number='EX-2025-007'), 'debtor', 'شركة التجارة الدولية', 'المحكوم عليه', 'شركة', null, 'مستشار قانوني')
ON CONFLICT DO NOTHING;

INSERT INTO m09_enforcement_actions (case_id, action_type, action_title, action_date, executed_by, result, status) VALUES
  ((SELECT id FROM m09_execution_cases WHERE case_number='EX-2025-003'), 'notice', 'إعلان السند التنفيذي', '2025-06-20', 'المحضر/ أ.م', 'تم إعلان المحكوم عليه', 'completed'),
  ((SELECT id FROM m09_execution_cases WHERE case_number='EX-2025-003'), 'site_visit', 'معاينة موقع التنفيذ', '2025-07-01', 'المحضر/ أ.م', 'رفض المحكوم عليه التسليم — تم رفع إشكال', 'completed'),
  ((SELECT id FROM m09_execution_cases WHERE case_number='EX-2025-007'), 'bank_levy', 'الحجز على الحساب البنكي', '2025-07-18', 'المحضر/ س.ع', 'تم الحجز على حساب بنكي — رصيد 120,000 ج.م', 'completed'),
  ((SELECT id FROM m09_execution_cases WHERE case_number='EX-2025-007'), 'collection', 'تحصيل المبلغ المحجوز', '2025-07-25', 'المحضر/ س.ع', null, 'in_progress')
ON CONFLICT DO NOTHING;

INSERT INTO m09_enforcement_obstacles (case_id, obstacle_type, obstacle_title, obstacle_nature, filed_by, filed_date, legal_basis, response_memo, response_status) VALUES
  ((SELECT id FROM m09_execution_cases WHERE case_number='EX-2025-003'), 'execution_stay', 'إشكال في تنفيذ حكم الإخلاء — ادعاء حيازة', 'factual', 'السيد/ ر.ح', '2025-07-05', 'ادعاء حيازة مادية للعقار قبل صدور الحكم', 'تم إعداد مذكرة الرد — الحيازة غير ثابتة قبل صدور الحكم', 'pending')
ON CONFLICT DO NOTHING;

INSERT INTO m09_execution_audit_logs (case_id, action, actor, actor_role, detail, hash_chain) VALUES
  ((SELECT id FROM m09_execution_cases WHERE case_number='EX-2025-003'), 'writ_received', 'النظام', 'النظام', 'استلام السند التنفيذي من المحرك M1 — القضية CC-2024-1234', '0xa1b2...c3d4'),
  ((SELECT id FROM m09_execution_cases WHERE case_number='EX-2025-003'), 'writ_endorsed', 'النظام', 'النظام', 'تذييل الحكم بالصيغة التنفيذية آلياً', '0xb2c3...d4e5'),
  ((SELECT id FROM m09_execution_cases WHERE case_number='EX-2025-003'), 'file_opened', 'النظام', 'النظام', 'فتح ملف إجراءات التنفيذ وربطه بمحضر التنفيذ', '0xc3d4...e5f6'),
  ((SELECT id FROM m09_execution_cases WHERE case_number='EX-2025-003'), 'obstacle_filed', 'النظام', 'النظام', 'رفع إشكال تنفيذ واقعي — ادعاء حيازة', '0xd4e5...f6a7'),
  ((SELECT id FROM m09_execution_cases WHERE case_number='EX-2025-007'), 'writ_received', 'النظام', 'النظام', 'استلام السند التنفيذي من المحرك M4 — القضية EC-2025-007', '0xe5f6...a7b8'),
  ((SELECT id FROM m09_execution_cases WHERE case_number='EX-2025-007'), 'm54_collection', 'النظام', 'النظام', 'ربط بالمحرك المالي M54 لتحصيل المبالغ المحكوم بها', '0xf6a7...b8c9')
ON CONFLICT DO NOTHING;
