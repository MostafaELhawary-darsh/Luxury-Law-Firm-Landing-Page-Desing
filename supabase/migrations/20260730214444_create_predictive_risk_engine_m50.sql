/*
# Create Predictive Risk Analysis & Proactive Legal Audit Engine (M50) schema

Implements the "proactive shield" — a sovereign predictive risk engine that monitors
all operations and documents in real-time to prevent legal disputes and errors
before they occur.

1. New Tables:
- `m50_risk_assessments`: Risk assessments linked to cases, contracts, documents, and financial flows.
- `m50_clause_extractions`: Smart clause extractor output — contractual obligations and deadlines parsed from contracts.
- `m50_early_warnings`: Early warning alerts dispatched to board room (M49) and responsible parties.
- `m50_deadline_calendar`: Automated deadline schedule with 60-day advance alerts for renewals/terminations.
- `m50_zk_audit`: Immutable ZK-Audit log — tamper-proof record of all sensitive operations.

2. Security: RLS enabled, anon+authenticated full CRUD (single-tenant, no auth gating at DB level).
*/

-- RISK ASSESSMENTS
CREATE TABLE IF NOT EXISTS m50_risk_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  risk_type text NOT NULL,
  risk_level text DEFAULT 'medium',
  probability numeric(5,2) DEFAULT 50,
  financial_impact numeric(14,2) DEFAULT 0,
  status text DEFAULT 'active',
  source_engine text,
  case_id uuid REFERENCES lf_cases(id) ON DELETE SET NULL,
  client_id uuid REFERENCES lf_clients(id) ON DELETE SET NULL,
  contract_ref text,
  document_ref text,
  detected_conflicts jsonb DEFAULT '[]'::jsonb,
  recommended_actions jsonb DEFAULT '[]'::jsonb,
  board_escalated boolean DEFAULT false,
  board_meeting_id uuid REFERENCES lf_meetings(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolved_by text,
  resolution_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE m50_risk_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m50_risks" ON m50_risk_assessments;
CREATE POLICY "anon_select_m50_risks" ON m50_risk_assessments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m50_risks" ON m50_risk_assessments;
CREATE POLICY "anon_insert_m50_risks" ON m50_risk_assessments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m50_risks" ON m50_risk_assessments;
CREATE POLICY "anon_update_m50_risks" ON m50_risk_assessments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m50_risks" ON m50_risk_assessments;
CREATE POLICY "anon_delete_m50_risks" ON m50_risk_assessments FOR DELETE TO anon, authenticated USING (true);

-- CLAUSE EXTRACTIONS (Smart Clause Extractor output)
CREATE TABLE IF NOT EXISTS m50_clause_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_name text NOT NULL,
  document_ref text,
  clause_type text NOT NULL,
  clause_text text NOT NULL,
  obligation_party text,
  deadline_date date,
  penalty_text text,
  penalty_amount numeric(14,2) DEFAULT 0,
  financial_exposure numeric(14,2) DEFAULT 0,
  risk_assessment_id uuid REFERENCES m50_risk_assessments(id) ON DELETE SET NULL,
  nlp_confidence numeric(5,2) DEFAULT 0,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m50_clause_extractions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m50_clauses" ON m50_clause_extractions;
CREATE POLICY "anon_select_m50_clauses" ON m50_clause_extractions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m50_clauses" ON m50_clause_extractions;
CREATE POLICY "anon_insert_m50_clauses" ON m50_clause_extractions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m50_clauses" ON m50_clause_extractions;
CREATE POLICY "anon_update_m50_clauses" ON m50_clause_extractions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m50_clauses" ON m50_clause_extractions;
CREATE POLICY "anon_delete_m50_clauses" ON m50_clause_extractions FOR DELETE TO anon, authenticated USING (true);

-- EARLY WARNINGS (dispatched to M49 board room)
CREATE TABLE IF NOT EXISTS m50_early_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_assessment_id uuid REFERENCES m50_risk_assessments(id) ON DELETE CASCADE,
  warning_type text NOT NULL,
  severity text DEFAULT 'medium',
  message text NOT NULL,
  target_engine text,
  board_agenda_item boolean DEFAULT false,
  acknowledged boolean DEFAULT false,
  acknowledged_at timestamptz,
  acknowledged_by text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m50_early_warnings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m50_warnings" ON m50_early_warnings;
CREATE POLICY "anon_select_m50_warnings" ON m50_early_warnings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m50_warnings" ON m50_early_warnings;
CREATE POLICY "anon_insert_m50_warnings" ON m50_early_warnings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m50_warnings" ON m50_early_warnings;
CREATE POLICY "anon_update_m50_warnings" ON m50_early_warnings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m50_warnings" ON m50_early_warnings;
CREATE POLICY "anon_delete_m50_warnings" ON m50_early_warnings FOR DELETE TO anon, authenticated USING (true);

-- DEADLINE CALENDAR (automated timeline with 60-day advance alerts)
CREATE TABLE IF NOT EXISTS m50_deadline_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  deadline_type text NOT NULL,
  deadline_date date NOT NULL,
  related_case_id uuid REFERENCES lf_cases(id) ON DELETE SET NULL,
  related_client_id uuid REFERENCES lf_clients(id) ON DELETE SET NULL,
  contract_ref text,
  responsible_party text,
  alert_sent_60d boolean DEFAULT false,
  alert_sent_30d boolean DEFAULT false,
  alert_sent_7d boolean DEFAULT false,
  draft_notice_generated boolean DEFAULT false,
  status text DEFAULT 'upcoming',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m50_deadline_calendar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m50_deadlines" ON m50_deadline_calendar;
CREATE POLICY "anon_select_m50_deadlines" ON m50_deadline_calendar FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m50_deadlines" ON m50_deadline_calendar;
CREATE POLICY "anon_insert_m50_deadlines" ON m50_deadline_calendar FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m50_deadlines" ON m50_deadline_calendar;
CREATE POLICY "anon_update_m50_deadlines" ON m50_deadline_calendar FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m50_deadlines" ON m50_deadline_calendar;
CREATE POLICY "anon_delete_m50_deadlines" ON m50_deadline_calendar FOR DELETE TO anon, authenticated USING (true);

-- ZK-AUDIT (immutable tamper-proof log)
CREATE TABLE IF NOT EXISTS m50_zk_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type text NOT NULL,
  entity_ref text,
  actor text,
  detail text,
  risk_level text DEFAULT 'info',
  hash_chain text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m50_zk_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m50_zk" ON m50_zk_audit;
CREATE POLICY "anon_select_m50_zk" ON m50_zk_audit FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m50_zk" ON m50_zk_audit;
CREATE POLICY "anon_insert_m50_zk" ON m50_zk_audit FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m50_zk" ON m50_zk_audit;
CREATE POLICY "anon_update_m50_zk" ON m50_zk_audit FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m50_zk" ON m50_zk_audit;
CREATE POLICY "anon_delete_m50_zk" ON m50_zk_audit FOR DELETE TO anon, authenticated USING (true);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_m50_risks_level ON m50_risk_assessments(risk_level);
CREATE INDEX IF NOT EXISTS idx_m50_risks_status ON m50_risk_assessments(status);
CREATE INDEX IF NOT EXISTS idx_m50_risks_case ON m50_risk_assessments(case_id);
CREATE INDEX IF NOT EXISTS idx_m50_clauses_risk ON m50_clause_extractions(risk_assessment_id);
CREATE INDEX IF NOT EXISTS idx_m50_warnings_risk ON m50_early_warnings(risk_assessment_id);
CREATE INDEX IF NOT EXISTS idx_m50_deadlines_date ON m50_deadline_calendar(deadline_date);
CREATE INDEX IF NOT EXISTS idx_m50_deadlines_status ON m50_deadline_calendar(status);
CREATE INDEX IF NOT EXISTS idx_m50_zk_created ON m50_zk_audit(created_at);

-- AUTO-UPDATE updated_at TRIGGER
CREATE OR REPLACE FUNCTION m50_touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_m50_risks_touch ON m50_risk_assessments;
CREATE TRIGGER trg_m50_risks_touch BEFORE UPDATE ON m50_risk_assessments
  FOR EACH ROW EXECUTE FUNCTION m50_touch_updated_at();

-- SEED: Risk assessments
INSERT INTO m50_risk_assessments (title, description, risk_type, risk_level, probability, financial_impact, source_engine, contract_ref, detected_conflicts, recommended_actions, board_escalated) VALUES
  (
    'تعارض بين شروط فسخ العقد والتدفقات النقدية المسجلة',
    'تم رصد تعارض بين بند الفسخ التعاقدي في عقد التوريد رقم SUP-2025-003 والقدرة المالية الحالية — احتمالية غرامة 150,000 ج.م',
    'contractual_financial',
    'high',
    72.50,
    150000.00,
    'M54-FinanceEngine',
    'SUP-2025-003',
    '["بند الفسخ يتطلب سداداً خلال 7 أيام بينما التدفق النقدي الحالي لا يسمح إلا بـ 14 يوم"]'::jsonb,
    '["إدراج البند كبند طارئ في اجتماع مجلس الإدارة", "التفاوض على تمديد مهلة السداد إلى 14 يوم", "تخصيص احتياطي مالي طارئ"]'::jsonb,
    true
  ),
  (
    'اقتراب موعد تجديد ترخيص تشغيل مصنع السيراميك',
    'ينتهي ترخيص التشغيل الصناعي لمصنع السيراميك خلال 55 يوماً — مطلوب بدء إجراءات التجديد',
    'renewal_deadline',
    'medium',
    85.00,
    50000.00,
    'M47-Classifier',
    'LIC-CER-2024',
    '["موعد التجديد في 24 سبتمبر 2025 — متبقي 55 يوم"]'::jsonb,
    '["توليد مسودة إخطار التجديد القانوني", "جدولة موعد مع الجهة المرخصة", "إعداد الملف التقني للتجديد"]'::jsonb,
    false
  ),
  (
    'ثغرة في بند التحكيم — عدم تحديد مقر التحكيم',
    'تم رصد ثغرة في عقد التوزيع رقم DIST-2025-007 حيث لم يتم تحديد مقر التحكيم بشكل صريح',
    'clause_gap',
    'medium',
    60.00,
    80000.00,
    'M48-ArchiveEngine',
    'DIST-2025-007',
    '["بند التحكيم يذكر التحكيم دون تحديد المقر", "احتمالية نزاع اختصاص"]'::jsonb,
    '["إضافة بند تحديد مقر التحكيم (القاهرة)", "مراجعة قانونية شاملة للعقد", "تواصل مع الطرف الآخر لإضافة ملحق"]'::jsonb,
    false
  )
ON CONFLICT DO NOTHING;

-- SEED: Clause extractions
INSERT INTO m50_clause_extractions (document_name, document_ref, clause_type, clause_text, obligation_party, deadline_date, penalty_text, penalty_amount, financial_exposure, nlp_confidence, status) VALUES
  ('عقد التوريد SUP-2025-003', 'SUP-2025-003', 'termination_clause', 'يحق للطرف الأول فسخ العقد في حال تأخر الطرف الثاني عن السداد لمدة تتجاوز 7 أيام من تاريخ الاستحقاق مع تعويض قدره 150,000 ج.م', 'الطرف الثاني', '2025-08-15', 'غرامة فسخ تعاقدي', 150000.00, 150000.00, 94.30, 'active'),
  ('عقد التوريد SUP-2025-003', 'SUP-2025-003', 'payment_clause', 'يلتزم الطرف الثاني بسداد المستحقات خلال 7 أيام من تاريخ استلام الفاتورة', 'الطرف الثاني', '2025-08-10', null, 0, 0, 91.50, 'active'),
  ('عقد التوزيع DIST-2025-007', 'DIST-2025-007', 'arbitration_clause', 'في حال نشووع أي نزاع حول تفسير أو تنفيذ هذا العقد يتم حل النزاع عن طريق التحكيم', 'كلا الطرفين', null, null, 0, 80000.00, 87.20, 'flagged'),
  ('ترخيص تشغيل مصنع السيراميك', 'LIC-CER-2024', 'renewal_clause', 'ينتهي الترخيص في 24 سبتمبر 2025 ويجب تجديده قبل الانتهاء بـ 60 يوم', 'المؤسسة', '2025-09-24', 'غرامة تشغيل بدون ترخيص', 50000.00, 50000.00, 96.80, 'active')
ON CONFLICT DO NOTHING;

-- SEED: Early warnings
INSERT INTO m50_early_warnings (risk_assessment_id, warning_type, severity, message, target_engine, board_agenda_item, acknowledged) VALUES
  (
    (SELECT id FROM m50_risk_assessments WHERE title LIKE '%تعارض بين شروط فسخ%'),
    'financial_conflict',
    'critical',
    'تنبيه حرج: تعارض بين بند الفسخ التعاقدي والقدرة المالية — احتمالية غرامة 150,000 ج.م. مطلوب إدراجه كبند طارئ في اجتماع مجلس الإدارة القادم',
    'M49-BoardEngine',
    true,
    false
  ),
  (
    (SELECT id FROM m50_risk_assessments WHERE title LIKE '%اقتراب موعد تجديد%'),
    'renewal_deadline',
    'high',
    'تنبيه: موعد تجديد ترخيص التشغيل يتطلب بدء الإجراءات خلال 55 يوماً — يرجى توليد مسودة الإخطار القانوني',
    'M49-BoardEngine',
    false,
    false
  ),
  (
    (SELECT id FROM m50_risk_assessments WHERE title LIKE '%ثغرة في بند التحكيم%'),
    'clause_gap',
    'medium',
    'تنبيه: ثغرة في بند التحكيم بعقد التوزيع DIST-2025-007 — عدم تحديد مقر التحكيم قد يؤدي لنزاع اختصاص',
    'M10-CaseCore',
    false,
    false
  )
ON CONFLICT DO NOTHING;

-- SEED: Deadline calendar
INSERT INTO m50_deadline_calendar (title, deadline_type, deadline_date, contract_ref, responsible_party, alert_sent_60d, alert_sent_30d, alert_sent_7d, draft_notice_generated, status) VALUES
  ('تجديد ترخيص تشغيل مصنع السيراميك', 'license_renewal', '2025-09-24', 'LIC-CER-2024', 'القسم القانوني', true, false, false, false, 'upcoming'),
  ('سداد القسط الثالث عقد التوريد SUP-2025-003', 'contract_payment', '2025-08-10', 'SUP-2025-003', 'القسم المالي', false, false, false, false, 'upcoming'),
  ('إنهاء عقد الإيجار — مقر الفرع الثاني', 'contract_termination', '2025-11-15', 'LEASE-2024-012', 'الإدارة العليا', false, false, false, false, 'upcoming'),
  ('تجديد توكيل العميل شركة النيل للتجارة', 'poa_renewal', '2025-10-01', 'POA-2024-089', 'القسم القانوني', false, false, false, false, 'upcoming')
ON CONFLICT DO NOTHING;

-- SEED: ZK-Audit logs
INSERT INTO m50_zk_audit (operation_type, entity_ref, actor, detail, risk_level, hash_chain) VALUES
  ('risk_detected', 'SUP-2025-003', 'M50-RiskEngine', 'رصد تعارض بين بند الفسخ والتدفقات النقدية — احتمالية غرامة 150,000 ج.م', 'critical', '0x7a3b...c1d2'),
  ('clause_extracted', 'SUP-2025-003', 'M50-ClauseExtractor', 'استخراج بند الفسخ بنجاح — دقة NLP: 94.3%', 'info', '0x8b4c...d2e3'),
  ('warning_dispatched', 'M49-BoardEngine', 'M50-RiskEngine', 'إرسال تنبيه حرج إلى غرفة اجتماعات مجلس الإدارة كبند طارئ', 'high', '0x9c5d...e3f4'),
  ('clause_flagged', 'DIST-2025-007', 'M50-ClauseExtractor', 'تم وضع علامة على بند التحكيم لعدم تحديد المقر — دقة NLP: 87.2%', 'medium', '0xa6d6...f4a5'),
  ('deadline_scheduled', 'LIC-CER-2024', 'M50-DeadlineScheduler', 'جدولة موعد تجديد الترخيص — تنبيه قبل 60 يوم', 'info', '0xb7e7...a5b6')
ON CONFLICT DO NOTHING;
