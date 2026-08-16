/*
# Autopilot Shield — Proactive Consumption Engine

## Overview
Implements "نظام الحماية التلقائي" (Autopilot Shield) — a background engine that monitors
subscriber wallets for inactivity + point surplus, then proactively delivers legal value
by consuming idle points. Transforms the platform into a "strategic proactive partner."

## New Tables
1. laas_autopilot_settings — per-subscriber opt-in config (trigger days, surplus threshold, Trello, webhook)
2. laas_proactive_executions — audit log of every proactive action (points, delivery, notification)

## Modified Tables
- laas_proactive_rules: adds profile_type, service_cost, trello_card_title

## Security
- RLS enabled on both new tables with anon+authenticated CRUD.
*/

CREATE TABLE IF NOT EXISTS laas_autopilot_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid UNIQUE NOT NULL REFERENCES laas_subscribers(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT true,
  inactivity_trigger_days integer NOT NULL DEFAULT 20,
  point_surplus_threshold numeric NOT NULL DEFAULT 0.40,
  trello_board_id text,
  trello_inbox_list_id text,
  webhook_url text,
  notification_email text,
  last_run_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE laas_autopilot_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "laas_autopilot_select" ON laas_autopilot_settings;
CREATE POLICY "laas_autopilot_select" ON laas_autopilot_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_autopilot_insert" ON laas_autopilot_settings;
CREATE POLICY "laas_autopilot_insert" ON laas_autopilot_settings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_autopilot_update" ON laas_autopilot_settings;
CREATE POLICY "laas_autopilot_update" ON laas_autopilot_settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "laas_autopilot_delete" ON laas_autopilot_settings;
CREATE POLICY "laas_autopilot_delete" ON laas_autopilot_settings FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS laas_proactive_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL REFERENCES laas_subscribers(id) ON DELETE CASCADE,
  rule_id uuid REFERENCES laas_proactive_rules(id) ON DELETE SET NULL,
  service_description text NOT NULL,
  points_consumed integer NOT NULL DEFAULT 0,
  action_type text NOT NULL DEFAULT 'custom',
  profile_type text,
  inactivity_days integer,
  surplus_pct numeric,
  balance_before integer,
  balance_after integer,
  delivery_status text NOT NULL DEFAULT 'pending',
  delivery_target text NOT NULL DEFAULT 'notification',
  notification_subject text,
  notification_body text,
  trello_card_id text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proactive_exec_subscriber ON laas_proactive_executions(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_proactive_exec_created ON laas_proactive_executions(created_at DESC);

ALTER TABLE laas_proactive_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "laas_proactive_exec_select" ON laas_proactive_executions;
CREATE POLICY "laas_proactive_exec_select" ON laas_proactive_executions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_proactive_exec_insert" ON laas_proactive_executions;
CREATE POLICY "laas_proactive_exec_insert" ON laas_proactive_executions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_proactive_exec_update" ON laas_proactive_executions;
CREATE POLICY "laas_proactive_exec_update" ON laas_proactive_executions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "laas_proactive_exec_delete" ON laas_proactive_executions;
CREATE POLICY "laas_proactive_exec_delete" ON laas_proactive_executions FOR DELETE TO anon, authenticated USING (true);

ALTER TABLE laas_proactive_rules
  ADD COLUMN IF NOT EXISTS profile_type text,
  ADD COLUMN IF NOT EXISTS service_cost integer DEFAULT 20,
  ADD COLUMN IF NOT EXISTS trello_card_title text;

UPDATE laas_proactive_rules SET
  profile_type = 'CORPORATE_FINANCE',
  service_cost = 100,
  trello_card_title = 'تقرير امتثال استباقي: تعميمات هيئة الرقابة المالية'
WHERE segment = 'b2b' AND action_type = 'compliance_check' AND profile_type IS NULL;

UPDATE laas_proactive_rules SET
  profile_type = 'CORPORATE_LABOR',
  service_cost = 75,
  trello_card_title = 'فحص استباقي: تحديث عقود العمل وفقاً لأحكام المحاكم العمالية'
WHERE segment = 'b2b' AND action_type = 'auto_audit' AND profile_type IS NULL;

UPDATE laas_proactive_rules SET
  profile_type = 'LAW_FIRM',
  service_cost = 50,
  trello_card_title = 'تحديثات استباقية: أحدث السوابق القضائية في تخصص المؤسسة'
WHERE segment = 'b2l' AND profile_type IS NULL;

INSERT INTO laas_proactive_rules (segment, trigger_days_inactive, points_to_consume, service_description, action_type, profile_type, service_cost)
SELECT 'b2c', 45, 10, 'تذكير بمراجعة عقد الإيجار السنوي وتحديث التوكيلات المنتهية', 'custom', 'FAMILY_INDIVIDUAL', 10
WHERE NOT EXISTS (SELECT 1 FROM laas_proactive_rules WHERE segment = 'b2c' AND profile_type = 'FAMILY_INDIVIDUAL');
