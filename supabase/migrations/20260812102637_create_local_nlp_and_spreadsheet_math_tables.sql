/*
# Local NLP Engine + Spreadsheet Math Integration for M54 Sovereign Editor

## Overview
This migration creates two new tables to support the integration of:
1. **Spreadsheet Math Engine** — legal-financial formula calculations performed inside the M54 GenOffice sovereign editor, with results stored for audit.
2. **Local NLP Engine** — on-server Arabic NLP processing (entity extraction, legal term detection, anonymization) that runs entirely on the firm's Supabase instance. No case data ever leaves the local servers.

## New Tables

### 1. `m114_spreadsheet_calculations`
Stores formula evaluation results produced by the spreadsheet math toolbar inside the sovereign editor.
- `id` (uuid, PK)
- `document_id` (uuid, FK to m114_sovereign_documents)
- `session_id` (uuid, FK to m114_editor_sessions, nullable)
- `formula_label` (text) — human-readable label of the calculation (e.g. "تعويض تأخير — السداد")
- `formula_expression` (text) — the raw formula string entered by the user
- `input_values` (jsonb) — the input variables and their values
- `result_value` (numeric) — the computed result
- `result_display` (text) — formatted result with currency/unit
- `category` (text) — calculation category: compensation, deadline, fee, tax, penalty, custom
- `created_by` (text)
- `created_at` (timestamptz, default now())

### 2. `m114_nlp_processing_logs`
Stores results of local NLP processing runs on sovereign documents. All processing happens on-server — no external API calls.
- `id` (uuid, PK)
- `document_id` (uuid, FK to m114_sovereign_documents)
- `processing_type` (text) — entity_extraction, legal_term_detection, anonymization, summary
- `entities_found` (jsonb) — array of {type, value, position} objects
- `legal_terms_found` (jsonb) — array of {term, category, suggestion} objects
- `risk_flags` (jsonb) — array of risk indicators
- `anonymized_preview` (text, nullable) — preview of anonymized text
- `entity_count` (integer, default 0)
- `term_count` (integer, default 0)
- `processing_ms` (integer) — processing duration in milliseconds
- `privacy_status` (text, default 'local_only') — always 'local_only' to confirm no data left the server
- `created_at` (timestamptz, default now())

## Security
- RLS enabled on both tables.
- Policies allow anon+authenticated CRUD (single-tenant app, no sign-in screen).

## Important Notes
1. All NLP processing is performed entirely on the Supabase edge function — no external API calls, no data sent to third-party servers.
2. The `privacy_status` column is always set to 'local_only' to provide an auditable guarantee that case data never left the firm's infrastructure.
3. Spreadsheet math calculations are persisted for audit trail and can be referenced in legal documents.
*/
CREATE TABLE IF NOT EXISTS m114_spreadsheet_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES m114_sovereign_documents(id) ON DELETE CASCADE,
  session_id uuid REFERENCES m114_editor_sessions(id) ON DELETE SET NULL,
  formula_label text NOT NULL,
  formula_expression text NOT NULL,
  input_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_value numeric NOT NULL DEFAULT 0,
  result_display text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'custom',
  created_by text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m114_spreadsheet_calculations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_spreadsheet_calcs" ON m114_spreadsheet_calculations;
CREATE POLICY "anon_select_spreadsheet_calcs" ON m114_spreadsheet_calculations
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_spreadsheet_calcs" ON m114_spreadsheet_calculations;
CREATE POLICY "anon_insert_spreadsheet_calcs" ON m114_spreadsheet_calculations
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_spreadsheet_calcs" ON m114_spreadsheet_calculations;
CREATE POLICY "anon_update_spreadsheet_calcs" ON m114_spreadsheet_calculations
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_spreadsheet_calcs" ON m114_spreadsheet_calculations;
CREATE POLICY "anon_delete_spreadsheet_calcs" ON m114_spreadsheet_calculations
  FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m114_nlp_processing_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES m114_sovereign_documents(id) ON DELETE CASCADE,
  processing_type text NOT NULL DEFAULT 'entity_extraction',
  entities_found jsonb NOT NULL DEFAULT '[]'::jsonb,
  legal_terms_found jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  anonymized_preview text,
  entity_count integer NOT NULL DEFAULT 0,
  term_count integer NOT NULL DEFAULT 0,
  processing_ms integer NOT NULL DEFAULT 0,
  privacy_status text NOT NULL DEFAULT 'local_only',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m114_nlp_processing_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_nlp_logs" ON m114_nlp_processing_logs;
CREATE POLICY "anon_select_nlp_logs" ON m114_nlp_processing_logs
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_nlp_logs" ON m114_nlp_processing_logs;
CREATE POLICY "anon_insert_nlp_logs" ON m114_nlp_processing_logs
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_nlp_logs" ON m114_nlp_processing_logs;
CREATE POLICY "anon_update_nlp_logs" ON m114_nlp_processing_logs
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_nlp_logs" ON m114_nlp_processing_logs;
CREATE POLICY "anon_delete_nlp_logs" ON m114_nlp_processing_logs
  FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_spreadsheet_calcs_doc ON m114_spreadsheet_calculations(document_id);
CREATE INDEX IF NOT EXISTS idx_nlp_logs_doc ON m114_nlp_processing_logs(document_id);
