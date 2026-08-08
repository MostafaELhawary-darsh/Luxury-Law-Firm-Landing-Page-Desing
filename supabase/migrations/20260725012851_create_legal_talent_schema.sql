/*
# Create Legal Talent Architecture (HR) schema

Implements the "Legal Talent Architecture" model with two pillars:
1. Interactive Task Boards (Agile HR Boards) — 5-column kanban for internal
   legal requests with smart load balancing and automated escalation.
2. KPI Scorecards — 4-axis balanced legal scorecard for attorney evaluation,
   quarterly reviews, peer feedback, and client reviews.

1. New Tables
- `lt_attorney_profiles` — extended attorney profile: specialties, mentor,
  onboarding status, rotation history, disconnect status, active card count.
- `lt_board_cards` — kanban cards across 5 columns (incoming, triage,
  in_progress, review, completed). Linked to lf_attorneys for assignment.
  Includes specialty, urgency, SLA deadline, overdue flag.
- `lt_kpi_scores` — quarterly KPI scores per attorney across 4 axes:
  quality (35%), efficiency (25%), client_experience (25%), institutional (15%).
  Total weighted score + classification (exceptional/proficient/needs_development).
- `lt_peer_feedback` — 360-degree peer feedback between attorneys.
- `lt_client_reviews` — post-service client reviews of attorneys (NPS-style).
- `lt_rotation_log` — strategic rotation history between departments.

2. Security
- Single-tenant app (no sign-in screen). RLS enabled on every table.
- All policies use TO anon, authenticated with USING(true)/WITH CHECK(true).

3. Design Notes
- Board cards feed into KPI scores automatically when moved to 'completed'.
- Escalation logic: cards not in 'in_progress' within 25% of SLA deadline
  are flagged overdue (handled in frontend + can be backstopped by a scheduled check).
- Load balancing: frontend reads active card count per attorney and suggests
  the least-busy attorney in the matching specialty.
*/

-- ATTORNEY PROFILES
CREATE TABLE IF NOT EXISTS lt_attorney_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lf_attorney_id uuid REFERENCES lf_attorneys(id) ON DELETE CASCADE,
  name text NOT NULL,
  specialties text[] DEFAULT '{}',
  mentor_role text DEFAULT 'none',
  onboarding_status text DEFAULT 'active',
  onboarding_day int DEFAULT 90,
  current_department text DEFAULT 'general',
  disconnect_active boolean DEFAULT false,
  active_cards_count int DEFAULT 0,
  hire_date date DEFAULT now()::date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lt_attorney_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lt_profiles" ON lt_attorney_profiles;
CREATE POLICY "anon_select_lt_profiles" ON lt_attorney_profiles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lt_profiles" ON lt_attorney_profiles;
CREATE POLICY "anon_insert_lt_profiles" ON lt_attorney_profiles FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lt_profiles" ON lt_attorney_profiles;
CREATE POLICY "anon_update_lt_profiles" ON lt_attorney_profiles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lt_profiles" ON lt_attorney_profiles;
CREATE POLICY "anon_delete_lt_profiles" ON lt_attorney_profiles FOR DELETE TO anon, authenticated USING (true);

-- BOARD CARDS (Kanban)
CREATE TABLE IF NOT EXISTS lt_board_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  column_status text NOT NULL DEFAULT 'incoming',
  specialty text NOT NULL DEFAULT 'general',
  urgency text NOT NULL DEFAULT 'normal',
  deadline timestamptz,
  assigned_attorney_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  assigned_attorney_name text,
  requested_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  is_overdue boolean DEFAULT false,
  escalation_sent boolean DEFAULT false
);

ALTER TABLE lt_board_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lt_cards" ON lt_board_cards;
CREATE POLICY "anon_select_lt_cards" ON lt_board_cards FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lt_cards" ON lt_board_cards;
CREATE POLICY "anon_insert_lt_cards" ON lt_board_cards FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lt_cards" ON lt_board_cards;
CREATE POLICY "anon_update_lt_cards" ON lt_board_cards FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lt_cards" ON lt_board_cards;
CREATE POLICY "anon_delete_lt_cards" ON lt_board_cards FOR DELETE TO anon, authenticated USING (true);

-- KPI SCORES
CREATE TABLE IF NOT EXISTS lt_kpi_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attorney_id uuid REFERENCES lf_attorneys(id) ON DELETE CASCADE,
  attorney_name text NOT NULL,
  quarter text NOT NULL,
  quality_score numeric(5,2) DEFAULT 0,
  efficiency_score numeric(5,2) DEFAULT 0,
  client_experience_score numeric(5,2) DEFAULT 0,
  institutional_score numeric(5,2) DEFAULT 0,
  total_score numeric(5,2) DEFAULT 0,
  classification text DEFAULT 'needs_development',
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lt_kpi_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lt_kpi" ON lt_kpi_scores;
CREATE POLICY "anon_select_lt_kpi" ON lt_kpi_scores FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lt_kpi" ON lt_kpi_scores;
CREATE POLICY "anon_insert_lt_kpi" ON lt_kpi_scores FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lt_kpi" ON lt_kpi_scores;
CREATE POLICY "anon_update_lt_kpi" ON lt_kpi_scores FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lt_kpi" ON lt_kpi_scores;
CREATE POLICY "anon_delete_lt_kpi" ON lt_kpi_scores FOR DELETE TO anon, authenticated USING (true);

-- PEER FEEDBACK
CREATE TABLE IF NOT EXISTS lt_peer_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  reviewer_name text,
  reviewee_id uuid REFERENCES lf_attorneys(id) ON DELETE CASCADE,
  reviewee_name text NOT NULL,
  collaboration_score numeric(5,2) DEFAULT 0,
  knowledge_sharing_score numeric(5,2) DEFAULT 0,
  comment text,
  quarter text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lt_peer_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lt_peer" ON lt_peer_feedback;
CREATE POLICY "anon_select_lt_peer" ON lt_peer_feedback FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lt_peer" ON lt_peer_feedback;
CREATE POLICY "anon_insert_lt_peer" ON lt_peer_feedback FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lt_peer" ON lt_peer_feedback;
CREATE POLICY "anon_update_lt_peer" ON lt_peer_feedback FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lt_peer" ON lt_peer_feedback;
CREATE POLICY "anon_delete_lt_peer" ON lt_peer_feedback FOR DELETE TO anon, authenticated USING (true);

-- CLIENT REVIEWS
CREATE TABLE IF NOT EXISTS lt_client_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attorney_id uuid REFERENCES lf_attorneys(id) ON DELETE CASCADE,
  attorney_name text NOT NULL,
  client_name text,
  clarity_score numeric(5,2) DEFAULT 0,
  responsiveness_score numeric(5,2) DEFAULT 0,
  professionalism_score numeric(5,2) DEFAULT 0,
  nps_score int DEFAULT 0,
  comment text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lt_client_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lt_reviews" ON lt_client_reviews;
CREATE POLICY "anon_select_lt_reviews" ON lt_client_reviews FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lt_reviews" ON lt_client_reviews;
CREATE POLICY "anon_insert_lt_reviews" ON lt_client_reviews FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lt_reviews" ON lt_client_reviews;
CREATE POLICY "anon_update_lt_reviews" ON lt_client_reviews FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lt_reviews" ON lt_client_reviews;
CREATE POLICY "anon_delete_lt_reviews" ON lt_client_reviews FOR DELETE TO anon, authenticated USING (true);

-- ROTATION LOG
CREATE TABLE IF NOT EXISTS lt_rotation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attorney_id uuid REFERENCES lf_attorneys(id) ON DELETE CASCADE,
  attorney_name text NOT NULL,
  from_department text,
  to_department text NOT NULL,
  start_date date NOT NULL DEFAULT now()::date,
  end_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lt_rotation_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lt_rotation" ON lt_rotation_log;
CREATE POLICY "anon_select_lt_rotation" ON lt_rotation_log FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lt_rotation" ON lt_rotation_log;
CREATE POLICY "anon_insert_lt_rotation" ON lt_rotation_log FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lt_rotation" ON lt_rotation_log;
CREATE POLICY "anon_update_lt_rotation" ON lt_rotation_log FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lt_rotation" ON lt_rotation_log;
CREATE POLICY "anon_delete_lt_rotation" ON lt_rotation_log FOR DELETE TO anon, authenticated USING (true);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_lt_cards_column ON lt_board_cards(column_status);
CREATE INDEX IF NOT EXISTS idx_lt_cards_attorney ON lt_board_cards(assigned_attorney_id);
CREATE INDEX IF NOT EXISTS idx_lt_kpi_attorney ON lt_kpi_scores(attorney_id);
CREATE INDEX IF NOT EXISTS idx_lt_peer_reviewee ON lt_peer_feedback(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_lt_reviews_attorney ON lt_client_reviews(attorney_id);
CREATE INDEX IF NOT EXISTS idx_lt_rotation_attorney ON lt_rotation_log(attorney_id);

-- SEED ATTORNEY PROFILES
INSERT INTO lt_attorney_profiles (id, lf_attorney_id, name, specialties, mentor_role, onboarding_status, current_department, active_cards_count)
SELECT
  gen_random_uuid(),
  a.id,
  a.name,
  CASE a.name
    WHEN 'أحمد المنصوري' THEN ARRAY['شركات', 'استحواذات', 'تأسيس']
    WHEN 'سارة الزهراني' THEN ARRAY['عمالي', 'نزاعات']
    WHEN 'خالد العتيبي' THEN ARRAY['تجاري', 'عقود', 'تحكيم']
    WHEN 'نورة القحطاني' THEN ARRAY['جنائي', 'تفتيش', 'تحقيق']
    ELSE ARRAY['عام']
  END,
  CASE WHEN a.is_partner THEN 'mentor' ELSE 'none' END,
  'active',
  CASE a.name
    WHEN 'أحمد المنصوري' THEN 'شركات'
    WHEN 'سارة الزهراني' THEN 'عمالي'
    WHEN 'خالد العتيبي' THEN 'تجاري'
    WHEN 'نورة القحطاني' THEN 'جنائي'
    ELSE 'general'
  END,
  CASE a.name
    WHEN 'سارة الزهراني' THEN 3
    WHEN 'خالد العتيبي' THEN 2
    WHEN 'نورة القحطاني' THEN 1
    ELSE 0
  END
FROM lf_attorneys a
WHERE a.name IN ('أحمد المنصوري', 'سارة الزهراني', 'خالد العتيبي', 'نورة القحطاني')
ON CONFLICT DO NOTHING;

-- SEED BOARD CARDS
INSERT INTO lt_board_cards (title, description, column_status, specialty, urgency, deadline, assigned_attorney_name, requested_by)
VALUES
  ('بحث قانوني: أحكام مسؤولية المدين المتضامن', 'طلب بحث معمق حول أحكام المدين المتضامن في نظام التفتيش', 'incoming', 'تجاري', 'normal', now()::timestamptz + interval '5 days', NULL, 'أحمد المنصوري'),
  ('مراجعة مسودة عقد توريد دولي', 'مراجعة بنود العقد وتحديد الثغرات المحتملة', 'triage', 'تجاري', 'urgent', now()::timestamptz + interval '2 days', 'خالد العتيبي', 'سارة الزهراني'),
  ('تحضير مذكرة دفاع عمالي', 'تحضير مذكرة رد على دفاع الخصم في نزاع عمالي', 'in_progress', 'عمالي', 'urgent', now()::timestamptz + interval '3 days', 'سارة الزهراني', 'نورة القحطاني'),
  ('صياغة نظام أساسي لشركة محافظ', 'صياغة النظام الأساسي وفق متطلبات الحوكمة', 'review', 'شركات', 'normal', now()::timestamptz + interval '1 day', 'أحمد المنصوري', 'خالد العتيبي'),
  ('استشارة: اختصاص محكمة عمالية', 'تحديد الاختصاص المكاني في نزاع عمالي عبر الحدود', 'completed', 'عمالي', 'normal', now()::timestamptz - interval '2 days', 'سارة الزهراني', 'أحمد المنصوري')
ON CONFLICT DO NOTHING;

-- SEED KPI SCORES (Q2 2026)
INSERT INTO lt_kpi_scores (attorney_name, quarter, quality_score, efficiency_score, client_experience_score, institutional_score, total_score, classification)
VALUES
  ('أحمد المنصوري', 'Q2-2026', 92, 88, 90, 85, 89.45, 'exceptional'),
  ('سارة الزهراني', 'Q2-2026', 85, 78, 88, 80, 83.05, 'proficient'),
  ('خالد العتيبي', 'Q2-2026', 88, 82, 85, 75, 83.35, 'proficient'),
  ('نورة القحطاني', 'Q2-2026', 72, 68, 70, 65, 69.50, 'needs_development')
ON CONFLICT DO NOTHING;

-- SEED PEER FEEDBACK
INSERT INTO lt_peer_feedback (reviewer_name, reviewee_name, collaboration_score, knowledge_sharing_score, comment, quarter)
VALUES
  ('أحمد المنصوري', 'سارة الزهراني', 90, 85, 'تعاون ممتاز في قضية النيل، التزام بالمواعيد', 'Q2-2026'),
  ('خالد العتيبي', 'سارة الزهراني', 85, 80, 'مشاركة فعالة في تحضير المذكرات', 'Q2-2026'),
  ('سارة الزهراني', 'خالد العتيبي', 88, 82, 'دقيق في مراجعة العقود، يوفر وقت الفريق', 'Q2-2026')
ON CONFLICT DO NOTHING;

-- SEED CLIENT REVIEWS
INSERT INTO lt_client_reviews (attorney_name, client_name, clarity_score, responsiveness_score, professionalism_score, nps_score, comment)
VALUES
  ('أحمد المنصوري', 'شركة الأهرام القابضة', 95, 90, 92, 10, 'شرح واضح لخطوات الاستحواذ، تجربة احترافية'),
  ('سارة الزهراني', 'شركة النيل للتجارة', 85, 88, 90, 8, 'متجاوبة وتشرح الموقف القانوني ببساطة'),
  ('خالد العتيبي', 'مجموعة رأس المال الذكي', 88, 80, 85, 7, 'مراجعة دقيقة للعقد، تأخر قليل في الرد')
ON CONFLICT DO NOTHING;
