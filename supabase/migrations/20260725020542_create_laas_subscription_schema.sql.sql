/*
# Create Legal-as-a-Service (LaaS) Subscription Platform Schema

## Overview
This migration creates the complete database schema for a "Legal-as-a-Service" subscription platform.
The system replaces traditional fixed-fee retainers with a flexible point-based legal wallet,
segmented across three audiences (B2B Corporate, B2C Individuals, B2L Lawyers), with a full
subscription lifecycle (triage, wallet activation, proactive consumption, zero-waste rollover),
an anti-churn matrix, and a gamified subscriber dashboard.

## New Tables

1. **laas_plans** — Subscription plan definitions (segmented architecture)
2. **laas_subscribers** — Subscriber accounts (companies, individuals, lawyers)
3. **laas_wallets** — Point-based legal credit wallets
4. **laas_services** — Service catalog with credit costs
5. **laas_transactions** — Wallet credit/debit ledger
6. **laas_triage_audits** — Initial legal triage & audit (first 72 hours)
7. **laas_proactive_consumptions** — Proactive consumption records (anti-stagnation)
8. **laas_rollovers** — Zero-waste rollover records at period end
9. **laas_churn_actions** — Anti-churn matrix action log
10. **laas_panic_incidents** — Panic button incident records
11. **laas_protection_meters** — Monthly protection/compliance score tracking

## Security
- RLS enabled on all tables.
- Policies allow anon + authenticated CRUD (single-tenant platform, no sign-in screen).
*/

-- ===== 1. laas_plans =====
CREATE TABLE IF NOT EXISTS laas_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code text UNIQUE NOT NULL,
  segment text NOT NULL CHECK (segment IN ('b2b', 'b2c', 'b2l')),
  name_ar text NOT NULL,
  name_en text NOT NULL,
  description text,
  monthly_price numeric NOT NULL DEFAULT 0,
  annual_price numeric NOT NULL DEFAULT 0,
  credits_included integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ===== 2. laas_subscribers =====
CREATE TABLE IF NOT EXISTS laas_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_code text UNIQUE NOT NULL,
  segment text NOT NULL CHECK (segment IN ('b2b', 'b2c', 'b2l')),
  name text NOT NULL,
  email text,
  phone text,
  entity_type text,
  plan_id uuid REFERENCES laas_plans(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'frozen', 'emergency', 'cancelled')),
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
  current_period_start date NOT NULL DEFAULT CURRENT_DATE,
  current_period_end date NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  auto_renew boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ===== 3. laas_wallets =====
CREATE TABLE IF NOT EXISTS laas_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL REFERENCES laas_subscribers(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0,
  total_granted integer NOT NULL DEFAULT 0,
  total_consumed integer NOT NULL DEFAULT 0,
  total_rolled_over integer NOT NULL DEFAULT 0,
  total_donated integer NOT NULL DEFAULT 0,
  last_activity_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (subscriber_id)
);

-- ===== 4. laas_services =====
CREATE TABLE IF NOT EXISTS laas_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_code text UNIQUE NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  description text,
  credit_cost integer NOT NULL DEFAULT 0,
  category text NOT NULL,
  segment text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ===== 5. laas_transactions =====
CREATE TABLE IF NOT EXISTS laas_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES laas_wallets(id) ON DELETE CASCADE,
  subscriber_id uuid NOT NULL REFERENCES laas_subscribers(id) ON DELETE CASCADE,
  service_id uuid REFERENCES laas_services(id) ON DELETE SET NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('grant', 'consume', 'rollover', 'donate', 'adjust')),
  points integer NOT NULL,
  balance_after integer NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- ===== 6. laas_triage_audits =====
CREATE TABLE IF NOT EXISTS laas_triage_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL REFERENCES laas_subscribers(id) ON DELETE CASCADE,
  segment text NOT NULL,
  audit_data jsonb,
  audit_score integer,
  recommended_plan_id uuid REFERENCES laas_plans(id) ON DELETE SET NULL,
  quarterly_action_plan jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ===== 7. laas_proactive_consumptions =====
CREATE TABLE IF NOT EXISTS laas_proactive_consumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL REFERENCES laas_subscribers(id) ON DELETE CASCADE,
  service_description text NOT NULL,
  points_consumed integer NOT NULL DEFAULT 0,
  result_summary text,
  triggered_by text NOT NULL DEFAULT 'system',
  created_at timestamptz DEFAULT now()
);

-- ===== 8. laas_rollovers =====
CREATE TABLE IF NOT EXISTS laas_rollovers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL REFERENCES laas_subscribers(id) ON DELETE CASCADE,
  period_end date NOT NULL,
  remaining_points integer NOT NULL DEFAULT 0,
  rollover_points integer NOT NULL DEFAULT 0,
  donated_points integer NOT NULL DEFAULT 0,
  training_points integer NOT NULL DEFAULT 0,
  rollover_type text NOT NULL CHECK (rollover_type IN ('rollover', 'training', 'probono')),
  created_at timestamptz DEFAULT now()
);

-- ===== 9. laas_churn_actions =====
CREATE TABLE IF NOT EXISTS laas_churn_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL REFERENCES laas_subscribers(id) ON DELETE CASCADE,
  churn_trigger text NOT NULL CHECK (churn_trigger IN ('nonpayment', 'inactive', 'cancel_request')),
  smart_action text NOT NULL CHECK (smart_action IN ('emergency_mode', 'proactive_consumption', 'frozen_subscription')),
  action_details text,
  status text NOT NULL DEFAULT 'triggered' CHECK (status IN ('triggered', 'resolved', 'active')),
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- ===== 10. laas_panic_incidents =====
CREATE TABLE IF NOT EXISTS laas_panic_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL REFERENCES laas_subscribers(id) ON DELETE CASCADE,
  incident_type text NOT NULL,
  description text,
  points_consumed integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
  assigned_attorney text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- ===== 11. laas_protection_meters =====
CREATE TABLE IF NOT EXISTS laas_protection_meters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL REFERENCES laas_subscribers(id) ON DELETE CASCADE,
  month date NOT NULL,
  compliance_score integer NOT NULL DEFAULT 0,
  contracts_reviewed integer NOT NULL DEFAULT 0,
  consultations_done integer NOT NULL DEFAULT 0,
  risk_alerts integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ===== Indexes =====
CREATE INDEX IF NOT EXISTS idx_laas_subscribers_segment ON laas_subscribers(segment);
CREATE INDEX IF NOT EXISTS idx_laas_subscribers_status ON laas_subscribers(status);
CREATE INDEX IF NOT EXISTS idx_laas_transactions_subscriber ON laas_transactions(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_laas_transactions_created ON laas_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_laas_proactive_subscriber ON laas_proactive_consumptions(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_laas_churn_subscriber ON laas_churn_actions(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_laas_protection_subscriber ON laas_protection_meters(subscriber_id);

-- ===== RLS =====
ALTER TABLE laas_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE laas_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE laas_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE laas_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE laas_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE laas_triage_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE laas_proactive_consumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE laas_rollovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE laas_churn_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE laas_panic_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE laas_protection_meters ENABLE ROW LEVEL SECURITY;

-- ===== Policies (anon + authenticated, single-tenant platform) =====
-- laas_plans
DROP POLICY IF EXISTS "laas_plans_select" ON laas_plans;
CREATE POLICY "laas_plans_select" ON laas_plans FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_plans_insert" ON laas_plans;
CREATE POLICY "laas_plans_insert" ON laas_plans FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_plans_update" ON laas_plans;
CREATE POLICY "laas_plans_update" ON laas_plans FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "laas_plans_delete" ON laas_plans;
CREATE POLICY "laas_plans_delete" ON laas_plans FOR DELETE TO anon, authenticated USING (true);

-- laas_subscribers
DROP POLICY IF EXISTS "laas_subscribers_select" ON laas_subscribers;
CREATE POLICY "laas_subscribers_select" ON laas_subscribers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_subscribers_insert" ON laas_subscribers;
CREATE POLICY "laas_subscribers_insert" ON laas_subscribers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_subscribers_update" ON laas_subscribers;
CREATE POLICY "laas_subscribers_update" ON laas_subscribers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "laas_subscribers_delete" ON laas_subscribers;
CREATE POLICY "laas_subscribers_delete" ON laas_subscribers FOR DELETE TO anon, authenticated USING (true);

-- laas_wallets
DROP POLICY IF EXISTS "laas_wallets_select" ON laas_wallets;
CREATE POLICY "laas_wallets_select" ON laas_wallets FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_wallets_insert" ON laas_wallets;
CREATE POLICY "laas_wallets_insert" ON laas_wallets FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_wallets_update" ON laas_wallets;
CREATE POLICY "laas_wallets_update" ON laas_wallets FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "laas_wallets_delete" ON laas_wallets;
CREATE POLICY "laas_wallets_delete" ON laas_wallets FOR DELETE TO anon, authenticated USING (true);

-- laas_services
DROP POLICY IF EXISTS "laas_services_select" ON laas_services;
CREATE POLICY "laas_services_select" ON laas_services FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_services_insert" ON laas_services;
CREATE POLICY "laas_services_insert" ON laas_services FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_services_update" ON laas_services;
CREATE POLICY "laas_services_update" ON laas_services FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "laas_services_delete" ON laas_services;
CREATE POLICY "laas_services_delete" ON laas_services FOR DELETE TO anon, authenticated USING (true);

-- laas_transactions
DROP POLICY IF EXISTS "laas_transactions_select" ON laas_transactions;
CREATE POLICY "laas_transactions_select" ON laas_transactions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_transactions_insert" ON laas_transactions;
CREATE POLICY "laas_transactions_insert" ON laas_transactions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_transactions_update" ON laas_transactions;
CREATE POLICY "laas_transactions_update" ON laas_transactions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "laas_transactions_delete" ON laas_transactions;
CREATE POLICY "laas_transactions_delete" ON laas_transactions FOR DELETE TO anon, authenticated USING (true);

-- laas_triage_audits
DROP POLICY IF EXISTS "laas_triage_select" ON laas_triage_audits;
CREATE POLICY "laas_triage_select" ON laas_triage_audits FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_triage_insert" ON laas_triage_audits;
CREATE POLICY "laas_triage_insert" ON laas_triage_audits FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_triage_update" ON laas_triage_audits;
CREATE POLICY "laas_triage_update" ON laas_triage_audits FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "laas_triage_delete" ON laas_triage_audits;
CREATE POLICY "laas_triage_delete" ON laas_triage_audits FOR DELETE TO anon, authenticated USING (true);

-- laas_proactive_consumptions
DROP POLICY IF EXISTS "laas_proactive_select" ON laas_proactive_consumptions;
CREATE POLICY "laas_proactive_select" ON laas_proactive_consumptions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_proactive_insert" ON laas_proactive_consumptions;
CREATE POLICY "laas_proactive_insert" ON laas_proactive_consumptions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_proactive_update" ON laas_proactive_consumptions;
CREATE POLICY "laas_proactive_update" ON laas_proactive_consumptions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "laas_proactive_delete" ON laas_proactive_consumptions;
CREATE POLICY "laas_proactive_delete" ON laas_proactive_consumptions FOR DELETE TO anon, authenticated USING (true);

-- laas_rollovers
DROP POLICY IF EXISTS "laas_rollovers_select" ON laas_rollovers;
CREATE POLICY "laas_rollovers_select" ON laas_rollovers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_rollovers_insert" ON laas_rollovers;
CREATE POLICY "laas_rollovers_insert" ON laas_rollovers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_rollovers_update" ON laas_rollovers;
CREATE POLICY "laas_rollovers_update" ON laas_rollovers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "laas_rollovers_delete" ON laas_rollovers;
CREATE POLICY "laas_rollovers_delete" ON laas_rollovers FOR DELETE TO anon, authenticated USING (true);

-- laas_churn_actions
DROP POLICY IF EXISTS "laas_churn_select" ON laas_churn_actions;
CREATE POLICY "laas_churn_select" ON laas_churn_actions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_churn_insert" ON laas_churn_actions;
CREATE POLICY "laas_churn_insert" ON laas_churn_actions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_churn_update" ON laas_churn_actions;
CREATE POLICY "laas_churn_update" ON laas_churn_actions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "laas_churn_delete" ON laas_churn_actions;
CREATE POLICY "laas_churn_delete" ON laas_churn_actions FOR DELETE TO anon, authenticated USING (true);

-- laas_panic_incidents
DROP POLICY IF EXISTS "laas_panic_select" ON laas_panic_incidents;
CREATE POLICY "laas_panic_select" ON laas_panic_incidents FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_panic_insert" ON laas_panic_incidents;
CREATE POLICY "laas_panic_insert" ON laas_panic_incidents FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_panic_update" ON laas_panic_incidents;
CREATE POLICY "laas_panic_update" ON laas_panic_incidents FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "laas_panic_delete" ON laas_panic_incidents;
CREATE POLICY "laas_panic_delete" ON laas_panic_incidents FOR DELETE TO anon, authenticated USING (true);

-- laas_protection_meters
DROP POLICY IF EXISTS "laas_protection_select" ON laas_protection_meters;
CREATE POLICY "laas_protection_select" ON laas_protection_meters FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_protection_insert" ON laas_protection_meters;
CREATE POLICY "laas_protection_insert" ON laas_protection_meters FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_protection_update" ON laas_protection_meters;
CREATE POLICY "laas_protection_update" ON laas_protection_meters FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "laas_protection_delete" ON laas_protection_meters;
CREATE POLICY "laas_protection_delete" ON laas_protection_meters FOR DELETE TO anon, authenticated USING (true);

-- ===== Seed: Default Plans =====
INSERT INTO laas_plans (plan_code, segment, name_ar, name_en, description, monthly_price, annual_price, credits_included) VALUES
  ('corp_starter', 'b2b', 'المستشار العام الافتراضي - أساسي', 'Virtual General Counsel - Starter', 'فحص امتثال ربع سنوي + مراجعة 5 عقود/شهر + استشارات غير محدودة', 15000, 150000, 500),
  ('corp_enterprise', 'b2b', 'المستشار العام الافتراضي - مؤسسي', 'Virtual General Counsel - Enterprise', 'امتثال شامل + مراجعة عقود غير محدودة + محامي ميداني مخصص + غرفة عمليات', 45000, 450000, 2000),
  ('individual_shield', 'b2c', 'الدرع الوقائي', 'Preventive Shield', 'استشارات سريعة + مراجعة عقود الإيجار/العمل + توكيلات طوارئ', 2500, 25000, 100),
  ('individual_guardian', 'b2c', 'الحارس القانوني', 'Legal Guardian', 'درع وقائي + متابعة قضائية + تمثيل في 3 جلسات/سنة', 5000, 50000, 300),
  ('lawyer_arsenal', 'b2l', 'ترسانة العمل القانوني', 'Legal Work Arsenal', 'قاعدة بيانات + سوابق قضائية + قوالب عقود ذكية + مكتب افتراضي', 3000, 30000, 200),
  ('lawyer_elite', 'b2l', 'النخبة القانونية', 'Legal Elite', 'ترسانة كاملة + محامون بالإنابة + أولوية في الظهور', 8000, 80000, 600)
ON CONFLICT (plan_code) DO NOTHING;

-- ===== Seed: Default Services =====
INSERT INTO laas_services (service_code, name_ar, name_en, description, credit_cost, category, segment) VALUES
  ('quick_consult', 'استشارة سريعة', 'Quick Consultation', 'استشارة قانونية سريعة عبر الهاتف أو المراسلة', 10, 'consultation', NULL),
  ('contract_review', 'مراجعة عقد', 'Contract Review', 'مراجعة وتدقيق عقد قانوني', 50, 'contract', NULL),
  ('complex_contract_draft', 'صياغة عقد معقد', 'Complex Contract Drafting', 'صياغة عقد قانوني معقد من الصفر', 100, 'contract', NULL),
  ('court_appearance', 'حضور جلسة', 'Court Appearance', 'تمثيل وحضور جلسة قضائية', 150, 'litigation', NULL),
  ('compliance_audit', 'فحص امتثال', 'Compliance Audit', 'فحص دوري للامتثال القانوني للشركة', 80, 'compliance', 'b2b'),
  ('emergency_poa', 'توكيل طوارئ', 'Emergency Power of Attorney', 'إصدار توكيل قانوني طارئ', 30, 'emergency', 'b2c'),
  ('db_access', 'الوصول لقاعدة البيانات', 'Database Access', 'وصول كامل لقاعدة البيانات القانونية لمدة شهر', 20, 'research', 'b2l'),
  ('precedent_search', 'بحث سوابق قضائية', 'Precedent Search', 'بحث متعمق في السوابق القضائية', 25, 'research', 'b2l'),
  ('smart_template', 'قالب عقد ذكي', 'Smart Contract Template', 'استخدام قالب عقد ذكي قابل للتعديل', 15, 'template', 'b2l'),
  ('hot_desk', 'مكتب افتراضي', 'Hot Desk Rental', 'تأجير مكتب افتراضي لليوم', 40, 'facility', 'b2l'),
  ('panic_response', 'استجابة فزع', 'Panic Response', 'تفعيل غرفة عمليات فورية وتوجيه محامي ميداني', 200, 'emergency', NULL)
ON CONFLICT (service_code) DO NOTHING;
