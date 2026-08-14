/*
# White-Label Legal Network — Zero-Trust External Lawyer System

## Overview
Implements the "شبكة المحامين والشركاء بالباطن" — a white-label legal network that lets
the platform expand geographically and across specialties without fixed lawyer salaries.
Client deals only with the platform; complex work is dispatched to vetted external lawyers
behind a zero-trust masking layer. The external lawyer never sees the client's identity,
and the client never knows an external lawyer was used.

## New Tables

1. **laas_external_lawyers** — Registry of vetted external lawyers/partners
   - id (uuid PK)
   - display_name (text) — anonymized name shown in the system (e.g. "محامي-قاهرة-001")
   - real_name (text) — internal-only real name, never exposed to clients
   - email (text)
   - phone (text, nullable)
   - jurisdiction (text) — e.g. "محكمة استئناف القاهرة", "محكمة النقض"
   - specialties (text[]) — e.g. {labor, commercial, corporate}
   - quality_score (numeric, 0-100) — Lawyer Quality Score (LQS)
   - acceptance_rate (numeric, 0-100) — % of their drafts accepted by in-house partners
   - avg_completion_hours (numeric) — average turnaround time
   - total_tasks_completed (int)
   - total_earnings_points (int) — accumulated points earned
   - is_active (bool, default true)
   - is_available (bool, default true) — currently accepting tasks
   - rating (int, 1-5, nullable)
   - created_at, updated_at

2. **laas_external_tasks** — Tasks dispatched to the external network
   - id (uuid PK)
   - subscriber_id (FK → laas_subscribers) — the real client (internal only)
   - lawyer_id (FK → laas_external_lawyers, nullable until assigned)
   - task_type (text) — memo / contract_review / precedent_research / legal_opinion
   - specialty_required (text)
   - jurisdiction_required (text)
   - original_content (text) — the raw unmasked case details (internal only)
   - anonymized_content (text) — masked version sent to external lawyer
   - client_real_name (text) — internal only, used for unmasking
   - opponent_real_name (text, nullable) — internal only
   - allocated_points (int) — total points charged to client
   - lawyer_payout_points (int) — 60% of allocated
   - platform_margin_points (int) — 40% of allocated
   - deadline_hours (int)
   - status (text) — pending_matching / offered / accepted / drafting / submitted / in_review / approved / rejected / completed / cancelled
   - offered_at (timestamptz, nullable)
   - accepted_at (timestamptz, nullable)
   - submitted_at (timestamptz, nullable)
   - approved_at (timestamptz, nullable)
   - escrow_released_pct (numeric, default 0) — 0 / 70 / 100
   - draft_content (text, nullable) — the external lawyer's draft
   - in_house_reviewer (text, nullable) — name of the in-house partner who reviewed
   - review_notes (text, nullable)
   - rejection_reason (text, nullable)
   - created_at, updated_at

3. **laas_escrow_transactions** — Escrow hold and conditional release ledger
   - id (uuid PK)
   - task_id (FK → laas_external_tasks)
   - subscriber_id (FK → laas_subscribers)
   - lawyer_id (FK → laas_external_lawyers)
   - points_held (int) — total points frozen in escrow
   - lawyer_payout_points (int) — 60% portion
   - platform_margin_points (int) — 40% portion
   - initial_release_pct (int, default 70) — released on partner approval
   - final_release_pct (int, default 30) — released after 7-day dispute window
   - initial_released_at (timestamptz, nullable)
   - final_released_at (timestamptz, nullable)
   - status (text) — held / partially_released / fully_released / refunded
   - created_at, updated_at

4. **laas_anonymization_logs** — Audit trail of all masking operations
   - id (uuid PK)
   - task_id (FK → laas_external_tasks)
   - original_field (text) — which field was masked (client_name, opponent_name, etc.)
   - original_value (text) — the real value (internal only)
   - masked_value (text) — the replacement token
   - created_at

## Security
- RLS enabled on all tables with anon+authenticated CRUD (single-tenant demo app).
*/

-- ===== laas_external_lawyers =====
CREATE TABLE IF NOT EXISTS laas_external_lawyers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  real_name text NOT NULL,
  email text,
  phone text,
  jurisdiction text NOT NULL DEFAULT 'محكمة استئناف القاهرة',
  specialties text[] DEFAULT '{}',
  quality_score numeric NOT NULL DEFAULT 50,
  acceptance_rate numeric NOT NULL DEFAULT 0,
  avg_completion_hours numeric DEFAULT 48,
  total_tasks_completed integer DEFAULT 0,
  total_earnings_points integer DEFAULT 0,
  is_active boolean DEFAULT true,
  is_available boolean DEFAULT true,
  rating integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ext_lawyers_specialty ON laas_external_lawyers USING GIN (specialties);
CREATE INDEX IF NOT EXISTS idx_ext_lawyers_jurisdiction ON laas_external_lawyers(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_ext_lawyers_quality ON laas_external_lawyers(quality_score DESC);

ALTER TABLE laas_external_lawyers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "laas_ext_lawyers_select" ON laas_external_lawyers;
CREATE POLICY "laas_ext_lawyers_select" ON laas_external_lawyers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_ext_lawyers_insert" ON laas_external_lawyers;
CREATE POLICY "laas_ext_lawyers_insert" ON laas_external_lawyers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_ext_lawyers_update" ON laas_external_lawyers;
CREATE POLICY "laas_ext_lawyers_update" ON laas_external_lawyers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "laas_ext_lawyers_delete" ON laas_external_lawyers;
CREATE POLICY "laas_ext_lawyers_delete" ON laas_external_lawyers FOR DELETE TO anon, authenticated USING (true);

-- ===== laas_external_tasks =====
CREATE TABLE IF NOT EXISTS laas_external_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid REFERENCES laas_subscribers(id) ON DELETE CASCADE,
  lawyer_id uuid REFERENCES laas_external_lawyers(id) ON DELETE SET NULL,
  task_type text NOT NULL DEFAULT 'memo',
  specialty_required text NOT NULL,
  jurisdiction_required text NOT NULL DEFAULT 'محكمة استئناف القاهرة',
  original_content text NOT NULL DEFAULT '',
  anonymized_content text NOT NULL DEFAULT '',
  client_real_name text,
  opponent_real_name text,
  allocated_points integer NOT NULL DEFAULT 100,
  lawyer_payout_points integer NOT NULL DEFAULT 60,
  platform_margin_points integer NOT NULL DEFAULT 40,
  deadline_hours integer NOT NULL DEFAULT 48,
  status text NOT NULL DEFAULT 'pending_matching',
  offered_at timestamptz,
  accepted_at timestamptz,
  submitted_at timestamptz,
  approved_at timestamptz,
  escrow_released_pct numeric NOT NULL DEFAULT 0,
  draft_content text,
  in_house_reviewer text,
  review_notes text,
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ext_tasks_status ON laas_external_tasks(status);
CREATE INDEX IF NOT EXISTS idx_ext_tasks_lawyer ON laas_external_tasks(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_ext_tasks_subscriber ON laas_external_tasks(subscriber_id);

ALTER TABLE laas_external_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "laas_ext_tasks_select" ON laas_external_tasks;
CREATE POLICY "laas_ext_tasks_select" ON laas_external_tasks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_ext_tasks_insert" ON laas_external_tasks;
CREATE POLICY "laas_ext_tasks_insert" ON laas_external_tasks FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_ext_tasks_update" ON laas_external_tasks;
CREATE POLICY "laas_ext_tasks_update" ON laas_external_tasks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "laas_ext_tasks_delete" ON laas_external_tasks;
CREATE POLICY "laas_ext_tasks_delete" ON laas_external_tasks FOR DELETE TO anon, authenticated USING (true);

-- ===== laas_escrow_transactions =====
CREATE TABLE IF NOT EXISTS laas_escrow_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES laas_external_tasks(id) ON DELETE CASCADE,
  subscriber_id uuid NOT NULL REFERENCES laas_subscribers(id) ON DELETE CASCADE,
  lawyer_id uuid REFERENCES laas_external_lawyers(id) ON DELETE SET NULL,
  points_held integer NOT NULL DEFAULT 0,
  lawyer_payout_points integer NOT NULL DEFAULT 0,
  platform_margin_points integer NOT NULL DEFAULT 0,
  initial_release_pct integer NOT NULL DEFAULT 70,
  final_release_pct integer NOT NULL DEFAULT 30,
  initial_released_at timestamptz,
  final_released_at timestamptz,
  status text NOT NULL DEFAULT 'held',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_escrow_task ON laas_escrow_transactions(task_id);
CREATE INDEX IF NOT EXISTS idx_escrow_status ON laas_escrow_transactions(status);

ALTER TABLE laas_escrow_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "laas_escrow_select" ON laas_escrow_transactions;
CREATE POLICY "laas_escrow_select" ON laas_escrow_transactions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_escrow_insert" ON laas_escrow_transactions;
CREATE POLICY "laas_escrow_insert" ON laas_escrow_transactions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_escrow_update" ON laas_escrow_transactions;
CREATE POLICY "laas_escrow_update" ON laas_escrow_transactions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "laas_escrow_delete" ON laas_escrow_transactions;
CREATE POLICY "laas_escrow_delete" ON laas_escrow_transactions FOR DELETE TO anon, authenticated USING (true);

-- ===== laas_anonymization_logs =====
CREATE TABLE IF NOT EXISTS laas_anonymization_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES laas_external_tasks(id) ON DELETE CASCADE,
  original_field text NOT NULL,
  original_value text NOT NULL,
  masked_value text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anon_logs_task ON laas_anonymization_logs(task_id);

ALTER TABLE laas_anonymization_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "laas_anon_logs_select" ON laas_anonymization_logs;
CREATE POLICY "laas_anon_logs_select" ON laas_anonymization_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_anon_logs_insert" ON laas_anonymization_logs;
CREATE POLICY "laas_anon_logs_insert" ON laas_anonymization_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_anon_logs_delete" ON laas_anonymization_logs;
CREATE POLICY "laas_anon_logs_delete" ON laas_anonymization_logs FOR DELETE TO anon, authenticated USING (true);

-- ===== Seed sample external lawyers =====
INSERT INTO laas_external_lawyers (display_name, real_name, email, jurisdiction, specialties, quality_score, acceptance_rate, avg_completion_hours, total_tasks_completed, is_active, is_available, rating)
VALUES
  ('محامي-قاهرة-001', 'أحمد عبد الرحمن', 'lawyer001@internal.local', 'محكمة استئناف القاهرة', ARRAY['labor', 'commercial'], 92, 88, 36, 47, true, true, 5),
  ('محامي-قاهرة-002', 'منى السيد', 'lawyer002@internal.local', 'محكمة النقض', ARRAY['commercial', 'corporate'], 95, 91, 42, 63, true, true, 5),
  ('محامي-جيزة-001', 'خالد فؤاد', 'lawyer003@internal.local', 'محكمة استئناف الجيزة', ARRAY['labor'], 78, 75, 48, 22, true, true, 4),
  ('محامي-إسكندرية-001', 'سارة حسن', 'lawyer004@internal.local', 'محكمة استئناف الإسكندرية', ARRAY['corporate', 'commercial'], 85, 82, 40, 35, true, true, 4),
  ('محامي-رياض-001', 'عبدالله الزهراني', 'lawyer005@internal.local', 'محكمة الرياض', ARRAY['corporate'], 88, 85, 38, 29, true, false, 5)
ON CONFLICT DO NOTHING;
