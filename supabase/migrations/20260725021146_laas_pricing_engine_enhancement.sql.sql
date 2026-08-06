/*
# LaaS Pricing Engine Enhancement

## Overview
This migration upgrades the LaaS platform with a professional point-based pricing model:
- Adds internal cost tracking (valuation engine) to plans and services
- Adds volume discount tiers to plans
- Adds urgency multiplier and top-up pricing to transactions
- Creates a proactive consumption rules engine table
- Re-seeds plans with the new tiered structure (Startup/SME/Enterprise, Pay-as-you-go/Family Shield, Researcher/Full-Service)
- Re-seeds services with the detailed burn-rate matrix (3 categories, 8 services)

## New Tables
1. **laas_proactive_rules** — Rules engine for automated proactive consumption
   - id, subscriber_id (nullable for global rules), segment, trigger_days_inactive,
     points_to_consume, service_description, action_type, is_active, last_triggered_at, created_at

## Modified Tables
- **laas_plans**: adds internal_cost_per_point, volume_discount_pct, tier_label, validity_months
- **laas_services**: adds internal_cost_points, complexity_tier, sla_hours, is_automated
- **laas_transactions**: adds urgency_multiplier, original_points, is_topup, topup_markup_pct
- **laas_wallets**: adds topup_balance, total_topup_purchased

## Security
- RLS enabled on laas_proactive_rules with anon+authenticated CRUD policies.
*/

-- ===== Add columns to laas_plans =====
ALTER TABLE laas_plans
  ADD COLUMN IF NOT EXISTS internal_cost_per_point numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS volume_discount_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tier_label text,
  ADD COLUMN IF NOT EXISTS validity_months integer DEFAULT 1;

-- ===== Add columns to laas_services =====
ALTER TABLE laas_services
  ADD COLUMN IF NOT EXISTS internal_cost_points numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS complexity_tier text DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS sla_hours integer,
  ADD COLUMN IF NOT EXISTS is_automated boolean DEFAULT false;

-- ===== Add columns to laas_transactions =====
ALTER TABLE laas_transactions
  ADD COLUMN IF NOT EXISTS urgency_multiplier numeric DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS original_points integer,
  ADD COLUMN IF NOT EXISTS is_topup boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS topup_markup_pct numeric DEFAULT 0;

-- ===== Add columns to laas_wallets =====
ALTER TABLE laas_wallets
  ADD COLUMN IF NOT EXISTS topup_balance integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_topup_purchased integer DEFAULT 0;

-- ===== Create laas_proactive_rules =====
CREATE TABLE IF NOT EXISTS laas_proactive_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid REFERENCES laas_subscribers(id) ON DELETE CASCADE,
  segment text NOT NULL CHECK (segment IN ('b2b', 'b2c', 'b2l')),
  trigger_days_inactive integer NOT NULL DEFAULT 45,
  points_to_consume integer NOT NULL DEFAULT 20,
  service_description text NOT NULL,
  action_type text NOT NULL DEFAULT 'auto_audit' CHECK (action_type IN ('auto_audit', 'contract_review', 'precedent_summary', 'compliance_check', 'custom')),
  is_active boolean NOT NULL DEFAULT true,
  last_triggered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_laas_proactive_rules_segment ON laas_proactive_rules(segment);

ALTER TABLE laas_proactive_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "laas_proactive_rules_select" ON laas_proactive_rules;
CREATE POLICY "laas_proactive_rules_select" ON laas_proactive_rules FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_proactive_rules_insert" ON laas_proactive_rules;
CREATE POLICY "laas_proactive_rules_insert" ON laas_proactive_rules FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_proactive_rules_update" ON laas_proactive_rules;
CREATE POLICY "laas_proactive_rules_update" ON laas_proactive_rules FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "laas_proactive_rules_delete" ON laas_proactive_rules;
CREATE POLICY "laas_proactive_rules_delete" ON laas_proactive_rules FOR DELETE TO anon, authenticated USING (true);

-- ===== Re-seed Plans with new tiered structure =====
-- First clear old plans (safe: no subscribers reference them yet in this dev environment)
DELETE FROM laas_plans;

INSERT INTO laas_plans (plan_code, segment, name_ar, name_en, description, monthly_price, annual_price, credits_included, internal_cost_per_point, volume_discount_pct, tier_label, validity_months) VALUES
  -- B2B Corporate Tiers
  ('corp_startup', 'b2b', 'باقة التأسيس', 'Startup Tier', 'تأسيس الكيان ومراجعة عقود التوظيف الأولى', 5000, 50000, 500, 3.5, 0, 'Startup', 1),
  ('corp_sme', 'b2b', 'باقة النمو', 'SME Tier', 'مدير حساب مخصص + تفويض بحضور لجان فض المنازعات', 13500, 135000, 1500, 3.15, 10, 'SME', 1),
  ('corp_enterprise', 'b2b', 'باة الكيان الشامل', 'Enterprise Tier', 'دمج كامل للخدمات، غرف عمليات طوارئ، تدقيق نافي للجهالة', 40000, 400000, 5000, 2.8, 20, 'Enterprise', 1),
  -- B2C Individual Tiers
  ('individual_payg', 'b2c', 'محفظة الطوارئ', 'Pay-as-you-go', 'لا اشتراك شهري — تدفع عند الحاجة لتوكيل أو استشارة فورية', 2500, 25000, 100, 5.0, 0, 'Pay-as-you-go', 12),
  ('individual_family', 'b2c', 'باقة الدرع العائلي', 'Family Shield', 'مراجعة عقود الإيجار، استشارات الأحوال الشخصية، خدمات التوثيق', 4750, 47500, 300, 4.75, 5, 'Family Shield', 3),
  -- B2L Lawyer Tiers
  ('lawyer_researcher', 'b2l', 'باقة الباحث القانوني', 'Legal Researcher', 'الوصول لقاعدة بيانات السوابق القضائية والمذكرات النموذجية', 2400, 24000, 400, 4.0, 0, 'Researcher', 1),
  ('lawyer_fullservice', 'b2l', 'باقة المحامي الشامل', 'Full-Service Lawyer', 'إسناد قضايا لمحامي المنصة بالباطن (White-labeling)', 6800, 68000, 1000, 3.4, 15, 'Full-Service', 1)
ON CONFLICT (plan_code) DO NOTHING;

-- ===== Re-seed Services with detailed burn-rate matrix =====
DELETE FROM laas_services;

INSERT INTO laas_services (service_code, name_ar, name_en, description, credit_cost, internal_cost_points, complexity_tier, sla_hours, is_automated, category, segment) VALUES
  -- 1. Quick consultations (high margin via automation)
  ('urgent_phone_consult', 'استشارة هاتفية عاجلة', 'Urgent Phone Consultation', 'استشارة قانونية عاجلة عبر الهاتف (15 دقيقة)', 25, 5, 'quick', 2, true, 'consultation', NULL),
  ('standard_contract_review', 'مراجعة عقد قياسي', 'Standard Contract Review', 'مراجعة وتدقيق عقد قياسي (أقل من 5 صفحات)', 50, 12, 'quick', 24, false, 'contract', NULL),
  ('official_extract', 'استخراج مستخرج رسمي', 'Official Document Extract', 'استخراج مستخرج رسمي أو شهادة سلبية', 30, 8, 'quick', 48, true, 'administrative', NULL),
  -- 2. Corporate & compliance (medium to high consumption)
  ('internal_regulation_draft', 'صياغة لائحة تنظيم عمل', 'Internal Regulation Drafting', 'صياغة لائحة تنظيم عمل داخلية متوافقة مع قانون العمل الموحد', 200, 60, 'corporate', 72, false, 'compliance', 'b2b'),
  ('labor_defense_memo', 'إعداد مذكرة دفاع عمالية', 'Labor Defense Memorandum', 'إعداد مذكرة دفاع ابتدائية أمام المحاكم العمالية', 350, 100, 'corporate', 48, false, 'litigation', NULL),
  ('complex_entity_formation', 'تأسيس كيان مالي معقد', 'Complex Entity Formation', 'تأسيس كيان مالي معقد شامل موافقات هيئة الرقابة', 1500, 500, 'corporate', 168, false, 'corporate', 'b2b'),
  -- 3. Emergency & litigation (maximum consumption)
  ('panic_button_response', 'زر الفزع — استجابة ميدانية', 'Panic Button — Field Response', 'تفعيل زر الفزع وانتقال محامٍ ميداني أثناء تفتيش أو تحقيق مفاجئ', 500, 200, 'emergency', 1, false, 'emergency', NULL),
  ('cassation_appeal_draft', 'صياغة صحيفة طعن بالنقض', 'Cassation Appeal Drafting', 'صياغة صحيفة طعن بالنقض أو الإدارية العليا', 800, 300, 'emergency', 96, false, 'litigation', NULL)
ON CONFLICT (service_code) DO NOTHING;

-- ===== Seed default proactive rules =====
INSERT INTO laas_proactive_rules (segment, trigger_days_inactive, points_to_consume, service_description, action_type) VALUES
  ('b2b', 45, 20, 'فحص دوري لعقود الموظفين وفقاً لتعديلات قانون العمل الأخيرة', 'compliance_check'),
  ('b2b', 60, 40, 'مراجعة دورية لسياسات الخصوصية وامتثال حماية البيانات', 'auto_audit'),
  ('b2c', 45, 10, 'تذكير بمراجعة عقد الإيجار السنوي وتحديث التوكيلات المنتهية', 'custom'),
  ('b2l', 30, 15, 'ملخص لأهم 5 أحكام نقض صدرت هذا الشهر في تخصص المحامي', 'precedent_summary')
ON CONFLICT DO NOTHING;
