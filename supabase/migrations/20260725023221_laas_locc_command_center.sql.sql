/*
# Legal Operations Command Center (LOCC)

## Overview
Implements a "مركز قيادة وسيطرة عملياتية" — a signal-driven command center that
replaces static dashboards with an interactive decision engine. It ingests signals
(deviations, risks, opportunities), classifies them by severity, proposes decisions,
and lets the managing partner execute one-click interventions via kill switches.

## New Tables

1. **laas_locc_signals** — Ingested operational signals/anomalies
   - id (uuid PK)
   - signal_type (text) — deadline_risk / security_breach / stagnant_credits / margin_drop / first_pass_drop / anonymization_failure / sla_breach / upload_anomaly
   - severity (text) — critical / warning / opportunity
   - title (text)
   - description (text)
   - source_entity (text) — what triggered it (subscriber name, lawyer name, etc.)
   - source_id (uuid, nullable) — subscriber_id or lawyer_id
   - jurisdiction (text, nullable)
   - hours_remaining (numeric, nullable) — for deadline signals
   - points_value (numeric, nullable) — for financial signals
   - proposed_action (text) — the suggested decision
   - action_type (text) — force_reassign / security_isolate / activate_autopilot / adjust_pricing / escalate / dismiss
   - status (text) — active / acknowledged / executed / dismissed / expired
   - executed_at (timestamptz, nullable)
   - executed_by (text, nullable)
   - execution_result (text, nullable)
   - created_at, updated_at

2. **laas_locc_audit_logs** — Audit trail of every command-center action
   - id (uuid PK)
   - signal_id (FK → laas_locc_signals, nullable)
   - action_type (text)
   - description (text)
   - executed_by (text)
   - severity (text)
   - created_at

3. **laas_locc_reports** — Structured reports (executive, IP, sovereignty)
   - id (uuid PK)
   - report_type (text) — executive_summary / intellectual_asset / sovereignty_audit
   - title (text)
   - period_start (date)
   - period_end (date)
   - summary (text)
   - metrics (jsonb) — key-value metrics
   - generated_by (text)
   - created_at

## Security
- RLS enabled on all tables with anon+authenticated CRUD (single-tenant demo app).
*/

-- ===== laas_locc_signals =====
CREATE TABLE IF NOT EXISTS laas_locc_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type text NOT NULL DEFAULT 'deadline_risk',
  severity text NOT NULL DEFAULT 'warning',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  source_entity text,
  source_id uuid,
  jurisdiction text,
  hours_remaining numeric,
  points_value numeric,
  proposed_action text,
  action_type text NOT NULL DEFAULT 'dismiss',
  status text NOT NULL DEFAULT 'active',
  executed_at timestamptz,
  executed_by text,
  execution_result text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_locc_signals_status ON laas_locc_signals(status);
CREATE INDEX IF NOT EXISTS idx_locc_signals_severity ON laas_locc_signals(severity);
CREATE INDEX IF NOT EXISTS idx_locc_signals_created ON laas_locc_signals(created_at DESC);

ALTER TABLE laas_locc_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "laas_locc_signals_select" ON laas_locc_signals;
CREATE POLICY "laas_locc_signals_select" ON laas_locc_signals FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_locc_signals_insert" ON laas_locc_signals;
CREATE POLICY "laas_locc_signals_insert" ON laas_locc_signals FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_locc_signals_update" ON laas_locc_signals;
CREATE POLICY "laas_locc_signals_update" ON laas_locc_signals FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "laas_locc_signals_delete" ON laas_locc_signals;
CREATE POLICY "laas_locc_signals_delete" ON laas_locc_signals FOR DELETE TO anon, authenticated USING (true);

-- ===== laas_locc_audit_logs =====
CREATE TABLE IF NOT EXISTS laas_locc_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id uuid REFERENCES laas_locc_signals(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  description text NOT NULL DEFAULT '',
  executed_by text NOT NULL DEFAULT 'الشريك الإداري',
  severity text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_locc_audit_created ON laas_locc_audit_logs(created_at DESC);

ALTER TABLE laas_locc_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "laas_locc_audit_select" ON laas_locc_audit_logs;
CREATE POLICY "laas_locc_audit_select" ON laas_locc_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_locc_audit_insert" ON laas_locc_audit_logs;
CREATE POLICY "laas_locc_audit_insert" ON laas_locc_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_locc_audit_delete" ON laas_locc_audit_logs;
CREATE POLICY "laas_locc_audit_delete" ON laas_locc_audit_logs FOR DELETE TO anon, authenticated USING (true);

-- ===== laas_locc_reports =====
CREATE TABLE IF NOT EXISTS laas_locc_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type text NOT NULL DEFAULT 'executive_summary',
  title text NOT NULL,
  period_start date,
  period_end date,
  summary text NOT NULL DEFAULT '',
  metrics jsonb DEFAULT '{}'::jsonb,
  generated_by text NOT NULL DEFAULT 'النظام',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_locc_reports_type ON laas_locc_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_locc_reports_created ON laas_locc_reports(created_at DESC);

ALTER TABLE laas_locc_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "laas_locc_reports_select" ON laas_locc_reports;
CREATE POLICY "laas_locc_reports_select" ON laas_locc_reports FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_locc_reports_insert" ON laas_locc_reports;
CREATE POLICY "laas_locc_reports_insert" ON laas_locc_reports FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_locc_reports_delete" ON laas_locc_reports;
CREATE POLICY "laas_locc_reports_delete" ON laas_locc_reports FOR DELETE TO anon, authenticated USING (true);

-- ===== Seed sample signals =====
INSERT INTO laas_locc_signals (signal_type, severity, title, description, source_entity, jurisdiction, hours_remaining, points_value, proposed_action, action_type, status)
VALUES
  ('deadline_risk', 'critical', 'مهلة طعن تنقضي خلال 24 ساعة', 'محامٍ خارجي لم يرفع المسودة بعد وتبقى 24 ساعة على انقضاء مهلة الطعن', 'مؤسسة الهواري للمحاماة', 'محكمة النقض', 24, null, 'سحب الملف فوراً وتحويله لغرفة الطوارئ الداخلية', 'force_reassign', 'active'),
  ('upload_anomaly', 'critical', 'محاولة تحميل مكثفة للمستندات', 'حساب محامٍ خارجي يحاول تحميل عدد غير طبيعي من المستندات المُجهلة في وقت قياسي', 'محامي-قاهرة-003', null, null, null, 'تعليق الحساب وتجميد الجلسة وإغلاق النفق', 'security_isolate', 'active'),
  ('stagnant_credits', 'warning', '1000 نقطة خاملة منذ 30 يوماً', 'حساب B2B يمتلك 1000 نقطة غير مستهلكة منذ 30 يوماً — خطر عدم التجديد', 'شركة دلتا للاستثمار', null, null, 1000, 'إطلاق محرك الاستهلاك الاستباقي لتدقيق العقود آلياً', 'activate_autopilot', 'active'),
  ('margin_drop', 'warning', 'تراجع هامش ربحية القضايا العمالية', 'ارتفعت تكلفة المحامين بالباطن في القضايا العمالية عن المقبول — الهامش انخفض لـ 25%', 'تخصص: قانون العمل', null, null, null, 'رفع النقاط المطلوبة للخدمات العمالية بنسبة 15%', 'adjust_pricing', 'active'),
  ('first_pass_drop', 'opportunity', 'معدل الاعتماد من المرة الأولى تراجع', 'نسبة المذكرات المعتمدة دون تعديلات تراجعت من 85% إلى 72% هذا الأسبوع', 'المنصة كاملة', null, null, null, 'مراجعة معايير المطابقة وتدريب المحامين الخارجيين', 'escalate', 'active')
ON CONFLICT DO NOTHING;
