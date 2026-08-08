/*
# Multi-Jurisdiction Procedural Engine schema

Extends the Smart Case Matrix with a configurable rules engine for computing
legal deadlines across different legal traditions (Latin/Arab, Common Law,
French civil procedure). Separates "legal logic" from "data infrastructure"
by storing jurisdiction rules as data, not hardcoded constants.

1. New Tables
- `scm_jurisdictions` — country-level jurisdiction definitions with their
  legal tradition, weekend days, and distance-allowance rules.
- `scm_court_types` — court types per jurisdiction (civil, labor, commercial,
  criminal) with their specific deadline rules.
- `scm_holiday_calendars` — official holidays per jurisdiction/year for
  local calendar verification.
- `scm_deadline_rules` — the actual rules: trigger event, deadline type,
  base days, distance allowance, clear-days rule, weekend exclusion logic.
- `scm_procedural_milestones` — generated milestone schedule per case
  (filing, hearings, memo submissions, drop-dead date).

2. Security
- Single-tenant app. RLS enabled on every table with anon/authenticated access.
*/

-- JURISDICTIONS
CREATE TABLE IF NOT EXISTS scm_jurisdictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL UNIQUE,
  country_name text NOT NULL,
  legal_tradition text NOT NULL,
  weekend_days int[] DEFAULT '{5,6}',
  distance_allowance_days int DEFAULT 0,
  distance_rule text,
  clear_days_rule text,
  short_threshold_days int DEFAULT 7,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scm_jurisdictions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_juris" ON scm_jurisdictions;
CREATE POLICY "anon_select_juris" ON scm_jurisdictions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_juris" ON scm_jurisdictions;
CREATE POLICY "anon_insert_juris" ON scm_jurisdictions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_juris" ON scm_jurisdictions;
CREATE POLICY "anon_update_juris" ON scm_jurisdictions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_juris" ON scm_jurisdictions;
CREATE POLICY "anon_delete_juris" ON scm_jurisdictions FOR DELETE TO anon, authenticated USING (true);

-- COURT TYPES
CREATE TABLE IF NOT EXISTS scm_court_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_id uuid REFERENCES scm_jurisdictions(id) ON DELETE CASCADE,
  court_type text NOT NULL,
  court_label text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scm_court_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_courts" ON scm_court_types;
CREATE POLICY "anon_select_courts" ON scm_court_types FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_courts" ON scm_court_types;
CREATE POLICY "anon_insert_courts" ON scm_court_types FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_courts" ON scm_court_types;
CREATE POLICY "anon_update_courts" ON scm_court_types FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_courts" ON scm_court_types;
CREATE POLICY "anon_delete_courts" ON scm_court_types FOR DELETE TO anon, authenticated USING (true);

-- HOLIDAY CALENDARS
CREATE TABLE IF NOT EXISTS scm_holiday_calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_id uuid REFERENCES scm_jurisdictions(id) ON DELETE CASCADE,
  holiday_date date NOT NULL,
  holiday_name text NOT NULL,
  year int NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scm_holiday_calendars ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_holidays" ON scm_holiday_calendars;
CREATE POLICY "anon_select_holidays" ON scm_holiday_calendars FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_holidays" ON scm_holiday_calendars;
CREATE POLICY "anon_insert_holidays" ON scm_holiday_calendars FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_holidays" ON scm_holiday_calendars;
CREATE POLICY "anon_update_holidays" ON scm_holiday_calendars FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_holidays" ON scm_holiday_calendars;
CREATE POLICY "anon_delete_holidays" ON scm_holiday_calendars FOR DELETE TO anon, authenticated USING (true);

-- DEADLINE RULES
CREATE TABLE IF NOT EXISTS scm_deadline_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_id uuid REFERENCES scm_jurisdictions(id) ON DELETE CASCADE,
  court_type text NOT NULL,
  trigger_event text NOT NULL,
  deadline_type text NOT NULL,
  base_days int NOT NULL,
  distance_allowance_applies boolean DEFAULT false,
  clear_days_rule boolean DEFAULT false,
  exclude_weekends_short boolean DEFAULT true,
  exclude_weekends_long boolean DEFAULT false,
  extend_to_next_business_day boolean DEFAULT true,
  legal_basis text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scm_deadline_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_rules" ON scm_deadline_rules;
CREATE POLICY "anon_select_rules" ON scm_deadline_rules FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_rules" ON scm_deadline_rules;
CREATE POLICY "anon_insert_rules" ON scm_deadline_rules FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_rules" ON scm_deadline_rules;
CREATE POLICY "anon_update_rules" ON scm_deadline_rules FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_rules" ON scm_deadline_rules;
CREATE POLICY "anon_delete_rules" ON scm_deadline_rules FOR DELETE TO anon, authenticated USING (true);

-- PROCEDURAL MILESTONES
CREATE TABLE IF NOT EXISTS scm_procedural_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES scm_cases(id) ON DELETE CASCADE,
  milestone_type text NOT NULL,
  milestone_label text NOT NULL,
  milestone_date date NOT NULL,
  is_critical boolean DEFAULT false,
  is_completed boolean DEFAULT false,
  rule_id uuid REFERENCES scm_deadline_rules(id) ON DELETE SET NULL,
  jurisdiction_code text,
  legal_basis text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scm_procedural_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_milestones" ON scm_procedural_milestones;
CREATE POLICY "anon_select_milestones" ON scm_procedural_milestones FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_milestones" ON scm_procedural_milestones;
CREATE POLICY "anon_insert_milestones" ON scm_procedural_milestones FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_milestones" ON scm_procedural_milestones;
CREATE POLICY "anon_update_milestones" ON scm_procedural_milestones FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_milestones" ON scm_procedural_milestones;
CREATE POLICY "anon_delete_milestones" ON scm_procedural_milestones FOR DELETE TO anon, authenticated USING (true);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_scm_courts_juris ON scm_court_types(jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_scm_holidays_juris ON scm_holiday_calendars(jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_scm_rules_juris ON scm_deadline_rules(jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_scm_milestones_case ON scm_procedural_milestones(case_id);

-- SEED JURISDICTIONS
INSERT INTO scm_jurisdictions (country_code, country_name, legal_tradition, weekend_days, distance_allowance_days, distance_rule, clear_days_rule, short_threshold_days) VALUES
  ('SA', 'المملكة العربية السعودية', 'latin_arab', '{5,6}', 7, 'ميعاد مسافة 7 أيام للمقيم خارج المدينة', 'لا يوجد قاعدة الأيام الصافية', 7),
  ('EG', 'مصر', 'latin_arab', '{5,6}', 10, 'ميعاد مسافة 10 أيام للمقيم خارج المحافظة أو بالخارج', 'لا يوجد قاعدة الأيام الصافية', 7),
  ('AE', 'الإمارات', 'latin_arab', '{5,6}', 7, 'ميعاد مسافة 7 أيام للمقيم خارج الدولة', 'لا يوجد قاعدة الأيام الصافية', 7),
  ('US', 'الولايات المتحدة', 'common_law', '{0,6}', 0, 'لا يوجد ميعاد مسافة في القواعد الفيدرالية', 'Clear days rule يُطبق في بعض المهل', 7),
  ('GB', 'المملكة المتحدة', 'common_law', '{0,6}', 0, 'لا يوجد ميعاد مسافة', 'Clear days rule: لا يُحسب يوم الإرسال ولا يوم الجلسة', 7),
  ('FR', 'فرنسا', 'french_civil', '{6,0}', 60, 'Délai de distance: شهران إضافيان للمقيم خارج الأراضي الفرنسية (DOM-TOM أو دول أخرى)', 'لا يُحسب يوم الإرسال ولا يوم الاستلام', 7)
ON CONFLICT (country_code) DO NOTHING;

-- SEED COURT TYPES
INSERT INTO scm_court_types (jurisdiction_id, court_type, court_label)
SELECT j.id, c.court_type, c.court_label FROM scm_jurisdictions j
CROSS JOIN (VALUES
  ('civil', 'محكمة مدنية'),
  ('labor', 'محكمة عمالية'),
  ('commercial', 'محكمة تجارية'),
  ('criminal', 'محكمة جنائية'),
  ('appeal', 'محكمة استئناف'),
  ('cassation', 'محكمة نقض/تمييز')
) AS c(court_type, court_label)
ON CONFLICT DO NOTHING;

-- SEED HOLIDAYS (2026) for each jurisdiction
INSERT INTO scm_holiday_calendars (jurisdiction_id, holiday_date, holiday_name, year)
SELECT j.id, h.date::date, h.name, 2026 FROM scm_jurisdictions j
CROSS JOIN (VALUES
  ('2026-01-01', 'رأس السنة الميلادية'),
  ('2026-02-20', 'يوم التأسيس (السعودية)'),
  ('2026-02-22', 'عيد الاتحاد (الإمارات)'),
  ('2026-03-07', 'بداية شهر رمضان (تقريبي)'),
  ('2026-04-04', 'عيد الفطر'),
  ('2026-04-05', 'عيد الفطر'),
  ('2026-04-06', 'عيد الفطر'),
  ('2026-06-10', 'عيد الأضحى'),
  ('2026-06-11', 'عيد الأضحى'),
  ('2026-06-12', 'عيد الأضحى'),
  ('2026-07-04', 'Independence Day (US)'),
  ('2026-07-14', 'Fete Nationale (France)'),
  ('2026-09-23', 'اليوم الوطني (السعودية)'),
  ('2026-12-25', 'Christmas (US/UK/France)'),
  ('2026-12-26', 'Boxing Day (UK)')
) AS h(date, name)
ON CONFLICT DO NOTHING;

-- SEED DEADLINE RULES — Saudi Arabia
INSERT INTO scm_deadline_rules (jurisdiction_id, court_type, trigger_event, deadline_type, base_days, distance_allowance_applies, clear_days_rule, exclude_weekends_short, exclude_weekends_long, extend_to_next_business_day, legal_basis)
SELECT j.id, r.court_type, r.trigger_event, r.deadline_type, r.base_days, r.distance_allowance_applies, r.clear_days_rule, r.exclude_weekends_short, r.exclude_weekends_long, r.extend_to_next_business_day, r.legal_basis
FROM scm_jurisdictions j
CROSS JOIN (VALUES
  ('civil', 'صدور حكم أول درجة', 'استئناف', 30, true, false, true, false, true, 'ميعاد الاستئناف 30 يوم من التبليغ — نظام المرافعات'),
  ('civil', 'صدور حكم استئنافي', 'الطعن بالنقض', 30, true, false, true, false, true, 'ميعاد الطعن بالنقض 30 يوم — نظام المرافعات'),
  ('labor', 'انتهاء علاقة العمل', 'سقوط الحق بالتقادم', 365, false, false, false, false, false, 'تقادم الحقوق العمالية بسنة — قانون العمل'),
  ('commercial', 'صدور حكم تجاري', 'استئناف تجاري', 30, true, false, true, false, true, 'ميعاد الاستئناف 30 يوم — نظام المرافعات التجارية'),
  ('civil', 'صدور حكم غيابي', 'الاعتراض على حكم غيابي', 15, true, false, true, false, true, 'ميعاد الاعتراض 15 يوم — نظام المرافعات')
) AS r(court_type, trigger_event, deadline_type, base_days, distance_allowance_applies, clear_days_rule, exclude_weekends_short, exclude_weekends_long, extend_to_next_business_day, legal_basis)
WHERE j.country_code = 'SA'
ON CONFLICT DO NOTHING;

-- SEED DEADLINE RULES — Egypt
INSERT INTO scm_deadline_rules (jurisdiction_id, court_type, trigger_event, deadline_type, base_days, distance_allowance_applies, clear_days_rule, exclude_weekends_short, exclude_weekends_long, extend_to_next_business_day, legal_basis)
SELECT j.id, r.court_type, r.trigger_event, r.deadline_type, r.base_days, r.distance_allowance_applies, r.clear_days_rule, r.exclude_weekends_short, r.exclude_weekends_long, r.extend_to_next_business_day, r.legal_basis
FROM scm_jurisdictions j
CROSS JOIN (VALUES
  ('civil', 'صدور حكم أول درجة', 'استئناف', 40, true, false, true, false, true, 'ميعاد الاستئناف 40 يوم من الإيداع — قانون المرافعات المصري'),
  ('civil', 'صدور حكم استئنافي', 'الطعن بالنقض', 40, true, false, true, false, true, 'ميعاد الطعن بالنقض 40 يوم — قانون المرافعات'),
  ('labor', 'انتهاء علاقة العمل', 'سقوط الحق بالتقادم', 365, false, false, false, false, false, 'تقادم الحقوق العمالية بسنة — قانون العمل المصري'),
  ('commercial', 'صدور حكم تجاري', 'استئناف تجاري', 30, true, false, true, false, true, 'ميعاد الاستئناف 30 يوم — قانون المرافعات التجارية'),
  ('civil', 'صدور حكم غيابي', 'الاعتراض على حكم غيابي', 10, true, false, true, false, true, 'ميعاد الاعتراض 10 أيام — قانون المرافعات')
) AS r(court_type, trigger_event, deadline_type, base_days, distance_allowance_applies, clear_days_rule, exclude_weekends_short, exclude_weekends_long, extend_to_next_business_day, legal_basis)
WHERE j.country_code = 'EG'
ON CONFLICT DO NOTHING;

-- SEED DEADLINE RULES — US (FRCP)
INSERT INTO scm_deadline_rules (jurisdiction_id, court_type, trigger_event, deadline_type, base_days, distance_allowance_applies, clear_days_rule, exclude_weekends_short, exclude_weekends_long, extend_to_next_business_day, legal_basis)
SELECT j.id, r.court_type, r.trigger_event, r.deadline_type, r.base_days, r.distance_allowance_applies, r.clear_days_rule, r.exclude_weekends_short, r.exclude_weekends_long, r.extend_to_next_business_day, r.legal_basis
FROM scm_jurisdictions j
CROSS JOIN (VALUES
  ('civil', 'service of process', 'response to complaint', 21, false, false, true, false, true, 'FRCP Rule 12: 21 days to respond'),
  ('civil', 'motion filing', 'response to motion', 14, false, false, true, false, true, 'FRCP Rule 6: 14 days to respond to motion'),
  ('civil', 'notice of appeal', 'appeal filing', 30, false, false, true, false, true, 'FRAP Rule 4: 30 days to file notice of appeal'),
  ('civil', 'judgment entry', 'post-trial motions', 28, false, false, true, false, true, 'FRCP Rule 59: 28 days for new trial motion')
) AS r(court_type, trigger_event, deadline_type, base_days, distance_allowance_applies, clear_days_rule, exclude_weekends_short, exclude_weekends_long, extend_to_next_business_day, legal_basis)
WHERE j.country_code = 'US'
ON CONFLICT DO NOTHING;

-- SEED DEADLINE RULES — UK (CPR)
INSERT INTO scm_deadline_rules (jurisdiction_id, court_type, trigger_event, deadline_type, base_days, distance_allowance_applies, clear_days_rule, exclude_weekends_short, exclude_weekends_long, extend_to_next_business_day, legal_basis)
SELECT j.id, r.court_type, r.trigger_event, r.deadline_type, r.base_days, r.distance_allowance_applies, r.clear_days_rule, r.exclude_weekends_short, r.exclude_weekends_long, r.extend_to_next_business_day, r.legal_basis
FROM scm_jurisdictions j
CROSS JOIN (VALUES
  ('civil', 'particulars of claim', 'acknowledgment of service', 14, false, true, true, false, true, 'CPR 7.4: 14 days to acknowledge service'),
  ('civil', 'acknowledgment of service', 'file defense', 28, false, true, true, false, true, 'CPR 15.4: 28 days to file defense'),
  ('civil', 'judgment', 'appeal notice', 21, false, true, true, false, true, 'CPR 52.6: 21 days to file appeal notice')
) AS r(court_type, trigger_event, deadline_type, base_days, distance_allowance_applies, clear_days_rule, exclude_weekends_short, exclude_weekends_long, extend_to_next_business_day, legal_basis)
WHERE j.country_code = 'GB'
ON CONFLICT DO NOTHING;

-- SEED DEADLINE RULES — France (CPC)
INSERT INTO scm_deadline_rules (jurisdiction_id, court_type, trigger_event, deadline_type, base_days, distance_allowance_applies, clear_days_rule, exclude_weekends_short, exclude_weekends_long, extend_to_next_business_day, legal_basis)
SELECT j.id, r.court_type, r.trigger_event, r.deadline_type, r.base_days, r.distance_allowance_applies, r.clear_days_rule, r.exclude_weekends_short, r.exclude_weekends_long, r.extend_to_next_business_day, r.legal_basis
FROM scm_jurisdictions j
CROSS JOIN (VALUES
  ('civil', 'signification acte', 'appel (appelant)', 15, true, true, true, false, true, 'Article 538 CPC: 15 jours pour faire appel + délai de distance'),
  ('civil', 'signification jugement', 'pourvoi en cassation', 15, true, true, true, false, true, 'Article 673 CPC: 15 jours pour pourvoi + délai de distance'),
  ('commercial', 'signification jugement', 'appel commercial', 30, true, true, true, false, true, 'Article 733 CPC: 30 jours pour appel commercial')
) AS r(court_type, trigger_event, deadline_type, base_days, distance_allowance_applies, clear_days_rule, exclude_weekends_short, exclude_weekends_long, extend_to_next_business_day, legal_basis)
WHERE j.country_code = 'FR'
ON CONFLICT DO NOTHING;
