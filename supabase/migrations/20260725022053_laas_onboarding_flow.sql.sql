/*
# Onboarding Flow — Preventive Value Architecture

## Overview
Implements the client acquisition and qualification pipeline ("هندسة القيمة الوقائية")
that converts large legal entities from traditional billing to the point-based wallet
model in the first meeting. Four stages: Pre-Meeting Diagnostic, Paradigm Shift Pitch,
Live Dashboard Experience, and Frictionless Pilot Conversion.

## New Tables

1. **laas_onboarding_diagnostics** — Pre-meeting compliance scanner results
   - id (uuid PK)
   - company_name (text) — the prospect company
   - contact_name (text, nullable) — who filled the form
   - contact_email (text, nullable) — where to send the diagnostic PDF
   - segment (text) — b2b / b2l / b2c
   - has_employment_contracts (bool) — do they use written employment contracts?
   - has_compliance_officer (bool) — is there a designated compliance officer?
   - tracks_regulatory_updates (bool) — do they monitor regulatory changes?
   - has_dispute_protocol (bool) — is there a dispute response protocol?
   - data_localization_required (bool) — do they need on-premise hosting?
   - risk_score (int, 0-100) — computed vulnerability score
   - risk_gaps (text[]) — array of identified vulnerability labels
   - diagnostic_status (text) — pending / sent / reviewed / converted
   - meeting_scheduled_at (timestamptz, nullable) — first meeting date
   - converted_subscriber_id (uuid, nullable, FK → laas_subscribers) — if they signed up
   - created_at, updated_at

2. **laas_pilot_packs** — Frictionless pilot wallet packs for first-meeting conversion
   - id (uuid PK)
   - diagnostic_id (FK → laas_onboarding_diagnostics, nullable)
   - subscriber_id (FK → laas_subscribers, nullable) — linked once they accept
   - company_name (text)
   - contact_email (text)
   - points_granted (int, default 300) — the 300-point pilot
   - points_consumed (int, default 0)
   - duration_days (int, default 30) — one month pilot
   - status (text) — offered / active / expired / converted / declined
   - offered_at (timestamptz)
   - activated_at (timestamptz, nullable)
   - expires_at (timestamptz, nullable)
   - converted_at (timestamptz, nullable) — when they upgraded to a full plan
   - notes (text, nullable)
   - created_at

## Security
- RLS enabled on both tables with anon+authenticated CRUD (single-tenant demo app).
*/

CREATE TABLE IF NOT EXISTS laas_onboarding_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text,
  contact_email text,
  segment text NOT NULL DEFAULT 'b2b',
  has_employment_contracts boolean DEFAULT false,
  has_compliance_officer boolean DEFAULT false,
  tracks_regulatory_updates boolean DEFAULT false,
  has_dispute_protocol boolean DEFAULT false,
  data_localization_required boolean DEFAULT false,
  risk_score integer NOT NULL DEFAULT 0,
  risk_gaps text[] DEFAULT '{}',
  diagnostic_status text NOT NULL DEFAULT 'pending',
  meeting_scheduled_at timestamptz,
  converted_subscriber_id uuid REFERENCES laas_subscribers(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_diag_status ON laas_onboarding_diagnostics(diagnostic_status);
CREATE INDEX IF NOT EXISTS idx_onboarding_diag_created ON laas_onboarding_diagnostics(created_at DESC);

ALTER TABLE laas_onboarding_diagnostics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "laas_onboarding_select" ON laas_onboarding_diagnostics;
CREATE POLICY "laas_onboarding_select" ON laas_onboarding_diagnostics FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_onboarding_insert" ON laas_onboarding_diagnostics;
CREATE POLICY "laas_onboarding_insert" ON laas_onboarding_diagnostics FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_onboarding_update" ON laas_onboarding_diagnostics;
CREATE POLICY "laas_onboarding_update" ON laas_onboarding_diagnostics FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "laas_onboarding_delete" ON laas_onboarding_diagnostics;
CREATE POLICY "laas_onboarding_delete" ON laas_onboarding_diagnostics FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS laas_pilot_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostic_id uuid REFERENCES laas_onboarding_diagnostics(id) ON DELETE SET NULL,
  subscriber_id uuid REFERENCES laas_subscribers(id) ON DELETE SET NULL,
  company_name text NOT NULL,
  contact_email text,
  points_granted integer NOT NULL DEFAULT 300,
  points_consumed integer NOT NULL DEFAULT 0,
  duration_days integer NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'offered',
  offered_at timestamptz DEFAULT now(),
  activated_at timestamptz,
  expires_at timestamptz,
  converted_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pilot_status ON laas_pilot_packs(status);
CREATE INDEX IF NOT EXISTS idx_pilot_created ON laas_pilot_packs(created_at DESC);

ALTER TABLE laas_pilot_packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "laas_pilot_select" ON laas_pilot_packs;
CREATE POLICY "laas_pilot_select" ON laas_pilot_packs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_pilot_insert" ON laas_pilot_packs;
CREATE POLICY "laas_pilot_insert" ON laas_pilot_packs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_pilot_update" ON laas_pilot_packs;
CREATE POLICY "laas_pilot_update" ON laas_pilot_packs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "laas_pilot_delete" ON laas_pilot_packs;
CREATE POLICY "laas_pilot_delete" ON laas_pilot_packs FOR DELETE TO anon, authenticated USING (true);
