/*
# RBAC Management Boards — Role-Based Access Control

## Overview
Implements the 5 specialized management boards with RBAC + ABAC access control.
Each board has its own KPIs, workflows, and decisive control switches.
Only Partners see all boards; department heads see only their domain.

## New Tables

1. **laas_rbac_roles** — Role definitions and permissions
   - id (uuid PK)
   - role_id (text, unique) — e.g. ROLE_PARTNER, ROLE_CFO
   - display_name_ar (text)
   - description (text)
   - mfa_required (bool, default true)
   - hardware_key_required (bool, default false)
   - allowed_dashboards (text[])
   - permissions (text[])
   - is_active (bool, default true)
   - created_at, updated_at

2. **laas_client_success_actions** — Proactive client success interventions
   - id (uuid PK)
   - subscriber_id (FK → laas_subscribers)
   - action_type (text) — autopilot_protection / trello_sync / renewal_offer / stagnation_alert
   - company_type (text) — financial / commercial / legal_firm
   - stagnation_days (int)
   - points_balance (int)
   - points_spent (int, nullable)
   - service_title (text, nullable)
   - service_summary (text, nullable)
   - trello_card_id (text, nullable)
   - trello_list_name (text, nullable)
   - status (text) — pending / executed / synced / failed
   - executed_by (text)
   - created_at, updated_at

3. **laas_trello_syncs** — Trello integration log
   - id (uuid PK)
   - subscriber_id (FK → laas_subscribers)
   - action_id (FK → laas_client_success_actions, nullable)
   - board_name (text)
   - list_name (text)
   - card_name (text)
   - card_url (text, nullable)
   - trello_card_id (text, nullable)
   - sync_status (text) — connected / pending / failed / synced
   - webhook_health (text, default 'connected')
   - created_at

4. **laas_financial_ops_log** — Financial operations audit trail
   - id (uuid PK)
   - action_type (text) — pricing_adjustment / partner_payout / wallet_freeze / escrow_settlement
   - target_entity (text)
   - points_before (int, nullable)
   - points_after (int, nullable)
   - cash_value (numeric, nullable)
   - specialty (text, nullable)
   - status (text) — pending / executed / reversed
   - executed_by (text)
   - notes (text, nullable)
   - created_at

5. **laas_security_events** — Cybersecurity & sovereignty events
   - id (uuid PK)
   - event_type (text) — mass_download / anonymization_check / sandbox_breach / unauthorized_access / sandbox_purge
   - severity (text) — critical / warning / info
   - source_entity (text)
   - source_ip (text, nullable)
   - description (text)
   - action_taken (text, nullable)
   - status (text) — active / isolated / resolved / logged
   - resolved_at (timestamptz, nullable)
   - created_at

## Security
- RLS enabled on all tables with anon+authenticated CRUD.
*/

-- ===== laas_rbac_roles =====
CREATE TABLE IF NOT EXISTS laas_rbac_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id text UNIQUE NOT NULL,
  display_name_ar text NOT NULL,
  description text NOT NULL DEFAULT '',
  mfa_required boolean DEFAULT true,
  hardware_key_required boolean DEFAULT false,
  allowed_dashboards text[] DEFAULT '{}',
  permissions text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE laas_rbac_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "laas_rbac_roles_select" ON laas_rbac_roles;
CREATE POLICY "laas_rbac_roles_select" ON laas_rbac_roles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_rbac_roles_insert" ON laas_rbac_roles;
CREATE POLICY "laas_rbac_roles_insert" ON laas_rbac_roles FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_rbac_roles_update" ON laas_rbac_roles;
CREATE POLICY "laas_rbac_roles_update" ON laas_rbac_roles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "laas_rbac_roles_delete" ON laas_rbac_roles;
CREATE POLICY "laas_rbac_roles_delete" ON laas_rbac_roles FOR DELETE TO anon, authenticated USING (true);

-- ===== laas_client_success_actions =====
CREATE TABLE IF NOT EXISTS laas_client_success_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid REFERENCES laas_subscribers(id) ON DELETE CASCADE,
  action_type text NOT NULL DEFAULT 'stagnation_alert',
  company_type text DEFAULT 'commercial',
  stagnation_days integer DEFAULT 0,
  points_balance integer DEFAULT 0,
  points_spent integer,
  service_title text,
  service_summary text,
  trello_card_id text,
  trello_list_name text,
  status text NOT NULL DEFAULT 'pending',
  executed_by text DEFAULT 'الشريك الإداري',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cs_actions_subscriber ON laas_client_success_actions(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_cs_actions_status ON laas_client_success_actions(status);

ALTER TABLE laas_client_success_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "laas_cs_actions_select" ON laas_client_success_actions;
CREATE POLICY "laas_cs_actions_select" ON laas_client_success_actions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_cs_actions_insert" ON laas_client_success_actions;
CREATE POLICY "laas_cs_actions_insert" ON laas_client_success_actions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_cs_actions_update" ON laas_client_success_actions;
CREATE POLICY "laas_cs_actions_update" ON laas_client_success_actions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "laas_cs_actions_delete" ON laas_client_success_actions;
CREATE POLICY "laas_cs_actions_delete" ON laas_client_success_actions FOR DELETE TO anon, authenticated USING (true);

-- ===== laas_trello_syncs =====
CREATE TABLE IF NOT EXISTS laas_trello_syncs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid REFERENCES laas_subscribers(id) ON DELETE CASCADE,
  action_id uuid REFERENCES laas_client_success_actions(id) ON DELETE SET NULL,
  board_name text NOT NULL DEFAULT 'لوحة المنصة القانونية',
  list_name text NOT NULL DEFAULT '🛡️ الحماية الاستباقية',
  card_name text NOT NULL,
  card_url text,
  trello_card_id text,
  sync_status text NOT NULL DEFAULT 'pending',
  webhook_health text DEFAULT 'connected',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trello_subscriber ON laas_trello_syncs(subscriber_id);

ALTER TABLE laas_trello_syncs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "laas_trello_select" ON laas_trello_syncs;
CREATE POLICY "laas_trello_select" ON laas_trello_syncs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_trello_insert" ON laas_trello_syncs;
CREATE POLICY "laas_trello_insert" ON laas_trello_syncs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_trello_update" ON laas_trello_syncs;
CREATE POLICY "laas_trello_update" ON laas_trello_syncs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "laas_trello_delete" ON laas_trello_syncs;
CREATE POLICY "laas_trello_delete" ON laas_trello_syncs FOR DELETE TO anon, authenticated USING (true);

-- ===== laas_financial_ops_log =====
CREATE TABLE IF NOT EXISTS laas_financial_ops_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL DEFAULT 'pricing_adjustment',
  target_entity text,
  points_before integer,
  points_after integer,
  cash_value numeric,
  specialty text,
  status text NOT NULL DEFAULT 'pending',
  executed_by text DEFAULT 'المدير المالي',
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finops_created ON laas_financial_ops_log(created_at DESC);

ALTER TABLE laas_financial_ops_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "laas_finops_select" ON laas_financial_ops_log;
CREATE POLICY "laas_finops_select" ON laas_financial_ops_log FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_finops_insert" ON laas_financial_ops_log;
CREATE POLICY "laas_finops_insert" ON laas_financial_ops_log FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_finops_update" ON laas_financial_ops_log;
CREATE POLICY "laas_finops_update" ON laas_financial_ops_log FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "laas_finops_delete" ON laas_financial_ops_log;
CREATE POLICY "laas_finops_delete" ON laas_financial_ops_log FOR DELETE TO anon, authenticated USING (true);

-- ===== laas_security_events =====
CREATE TABLE IF NOT EXISTS laas_security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL DEFAULT 'anonymization_check',
  severity text NOT NULL DEFAULT 'info',
  source_entity text,
  source_ip text,
  description text NOT NULL DEFAULT '',
  action_taken text,
  status text NOT NULL DEFAULT 'logged',
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sec_events_created ON laas_security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sec_events_severity ON laas_security_events(severity);

ALTER TABLE laas_security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "laas_sec_events_select" ON laas_security_events;
CREATE POLICY "laas_sec_events_select" ON laas_security_events FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_sec_events_insert" ON laas_security_events;
CREATE POLICY "laas_sec_events_insert" ON laas_security_events FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_sec_events_update" ON laas_security_events;
CREATE POLICY "laas_sec_events_update" ON laas_security_events FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "laas_sec_events_delete" ON laas_security_events;
CREATE POLICY "laas_sec_events_delete" ON laas_security_events FOR DELETE TO anon, authenticated USING (true);

-- ===== Seed RBAC roles =====
INSERT INTO laas_rbac_roles (role_id, display_name_ar, description, mfa_required, hardware_key_required, allowed_dashboards, permissions)
VALUES
  ('ROLE_PARTNER', 'شريك إداري', 'صلاحيات سيادية كاملة على جميع الواجهات والأزرار الحاسمة', true, true, ARRAY['*'], ARRAY['*:*']),
  ('ROLE_HEAD_OF_LEGAL', 'رئيس الشؤون القانونية والجودة', 'إدارة الجودة الفنية، اعتماد المخرجات، وسحب القضايا', true, false, ARRAY['dashboard_legal_qc'], ARRAY['legal_qc:read','legal_qc:unmask_and_approve','legal_qc:request_revision','legal_qc:emergency_reassign']),
  ('ROLE_HEAD_OF_NETWORK', 'مدير شبكة الخبراء والمحامين', 'إدارة المحامين بالباطن، التوزيع، وضمان جودة البيئة المعزولة', true, false, ARRAY['dashboard_network_whitelabel'], ARRAY['network:read','network:assign_manual','network:release_escrow','network:freeze_lawyer_account']),
  ('ROLE_HEAD_OF_CLIENT_SUCCESS', 'مدير نجاح العملاء والنمو', 'مراقبة حسابات B2B/B2L، تفعيل الاستهلاك الاستباقي، ومزامنة الأنظمة', true, false, ARRAY['dashboard_client_success'], ARRAY['client_success:read','client_success:trigger_autopilot','client_success:sync_trello_api','client_success:send_renewal_offer']),
  ('ROLE_CFO', 'المدير المالي', 'السيطرة على اقتصاديات المحفظة النقطية وتعديل التسعير والتسويات', true, false, ARRAY['dashboard_financial_ops'], ARRAY['finance:read','finance:adjust_point_pricing','finance:payout_partners','finance:freeze_disputed_wallet']),
  ('ROLE_CISO', 'مسؤول الأمن السيبراني وحماية البيانات', 'مراقبة التجهيل، سجلات الوصول، وتفعيل العزل الأمني القسري', true, true, ARRAY['dashboard_security_privacy'], ARRAY['security:read','security:zero_trust_isolate','security:purge_sandbox_cache','security:export_sovereignty_audit'])
ON CONFLICT (role_id) DO NOTHING;

-- ===== Seed sample security events =====
INSERT INTO laas_security_events (event_type, severity, source_entity, source_ip, description, action_taken, status)
VALUES
  ('anonymization_check', 'info', 'محرك التجهيل الآلي', null, 'فحص دوري لسلامة التجهيل — جميع الملفات المرسلة للشبكة بالباطن تم حجب بياناتها بنسبة 100%', null, 'logged'),
  ('mass_download', 'critical', 'محامي-قاهرة-003', '10.0.1.42', 'محاولة تحميل 15 مستند مُجهل في وقت قياسي — تجاوز الحد المسموح', 'مراقبة نشطة — بانتظار قرار العزل', 'active'),
  ('sandbox_breach', 'warning', 'البيئة المعزولة - محامي-جيزة-001', '10.0.2.18', 'محاولة نسخ محتوى من المحرر الآمن إلى الحافظة — تم الحجب آلياً', 'تم حجب العملية وتسجيلها', 'resolved')
ON CONFLICT DO NOTHING;
