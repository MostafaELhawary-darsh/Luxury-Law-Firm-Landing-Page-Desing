/*
# Merge Smart Case Cores — M10 + SCM Unification

Links the M10 case tree nodes and defense drafts to SCM cases via foreign keys,
and adds M10's advanced fields (success probability, financial value, facts, 
legal basis, parties, evidence summary, encryption, operating mode) to scm_cases.

No data is lost — all existing tables and columns are preserved.
New columns are nullable with safe defaults.
*/

-- ═══════════════════════════════════════════════
-- Add M10 fields to scm_cases
-- ═══════════════════════════════════════════════

ALTER TABLE scm_cases
  ADD COLUMN IF NOT EXISTS operating_mode text DEFAULT 'law_firms',
  ADD COLUMN IF NOT EXISTS case_category text DEFAULT 'civil',
  ADD COLUMN IF NOT EXISTS court_circuit text,
  ADD COLUMN IF NOT EXISTS filing_date date,
  ADD COLUMN IF NOT EXISTS next_hearing_date date,
  ADD COLUMN IF NOT EXISTS next_deadline_date date,
  ADD COLUMN IF NOT EXISTS next_deadline_label text,
  ADD COLUMN IF NOT EXISTS success_probability numeric(5,2) DEFAULT 50,
  ADD COLUMN IF NOT EXISTS financial_value numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_center_id text,
  ADD COLUMN IF NOT EXISTS assigned_attorney_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_type text DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS facts_summary text,
  ADD COLUMN IF NOT EXISTS legal_basis text,
  ADD COLUMN IF NOT EXISTS parties_summary text,
  ADD COLUMN IF NOT EXISTS evidence_summary text,
  ADD COLUMN IF NOT EXISTS defense_draft text,
  ADD COLUMN IF NOT EXISTS case_tree_encrypted boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS encryption_standard text DEFAULT 'AES-256',
  ADD COLUMN IF NOT EXISTS m10_stage text DEFAULT 'tree_construction',
  ADD COLUMN IF NOT EXISTS m54_cost_center_opened boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS m92_task_distributed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS m52_notified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_engine text,
  ADD COLUMN IF NOT EXISTS source_case_number text,
  ADD COLUMN IF NOT EXISTS source_case_id text;

-- ═══════════════════════════════════════════════
-- Link M10 tree nodes to SCM cases
-- ═══════════════════════════════════════════════

ALTER TABLE m10_case_tree_nodes
  ADD COLUMN IF NOT EXISTS scm_case_id uuid REFERENCES scm_cases(id) ON DELETE SET NULL;

-- ═══════════════════════════════════════════════
-- Link M10 defense drafts to SCM cases
-- ═══════════════════════════════════════════════

ALTER TABLE m10_defense_drafts
  ADD COLUMN IF NOT EXISTS scm_case_id uuid REFERENCES scm_cases(id) ON DELETE SET NULL;

-- ═══════════════════════════════════════════════
-- Link M10 deadlines to SCM cases
-- ═══════════════════════════════════════════════

ALTER TABLE m10_deadlines
  ADD COLUMN IF NOT EXISTS scm_case_id uuid REFERENCES scm_cases(id) ON DELETE SET NULL;

-- ═══════════════════════════════════════════════
-- Indexes for the new FK columns
-- ═══════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_m10_tree_scm_case ON m10_case_tree_nodes(scm_case_id);
CREATE INDEX IF NOT EXISTS idx_m10_drafts_scm_case ON m10_defense_drafts(scm_case_id);
CREATE INDEX IF NOT EXISTS idx_m10_deadlines_scm_case ON m10_deadlines(scm_case_id);
CREATE INDEX IF NOT EXISTS idx_scm_cases_m10_stage ON scm_cases(m10_stage);
CREATE INDEX IF NOT EXISTS idx_scm_cases_attorney ON scm_cases(assigned_attorney_id);

-- ═══════════════════════════════════════════════
-- Migrate existing m10_smart_cases data to scm_cases
-- (Only for m10 cases that don't have a corresponding scm case)
-- ═══════════════════════════════════════════════

INSERT INTO scm_cases (
  case_code, title, pipeline_type, triage_lane, confidentiality,
  client_name, court, case_number, status, current_stage_index,
  operating_mode, case_category, court_circuit, filing_date,
  next_hearing_date, next_deadline_date, next_deadline_label,
  success_probability, financial_value, cost_center_id,
  assigned_attorney_id, client_type, facts_summary, legal_basis,
  parties_summary, evidence_summary, defense_draft,
  case_tree_encrypted, encryption_standard, m10_stage,
  m54_cost_center_opened, m92_task_distributed, m52_notified,
  source_engine, source_case_number, source_case_id
)
SELECT
  'M10-' || m.case_number,
  m.case_title,
  CASE m.case_category
    WHEN 'commercial' THEN 'corporate'
    WHEN 'labor' THEN 'labor'
    WHEN 'civil' THEN 'litigation'
    ELSE 'litigation'
  END,
  CASE
    WHEN m.success_probability < 40 THEN 'red'
    WHEN m.success_probability < 70 THEN 'yellow'
    ELSE 'green'
  END,
  CASE
    WHEN m.case_tree_encrypted THEN 'restricted'
    ELSE 'standard'
  END,
  m.client_name,
  m.court,
  m.case_number,
  CASE WHEN m.is_final THEN 'closed' ELSE 'active' END,
  0,
  m.operating_mode,
  m.case_category,
  m.court_circuit,
  m.filing_date::date,
  m.next_hearing_date::date,
  m.next_deadline_date::date,
  m.next_deadline_label,
  m.success_probability,
  m.financial_value,
  m.cost_center_id,
  m.assigned_attorney_id,
  m.client_type,
  m.facts_summary,
  m.legal_basis,
  m.parties_summary,
  m.evidence_summary,
  m.defense_draft,
  m.case_tree_encrypted,
  m.encryption_standard,
  m.stage,
  m.m54_cost_center_opened,
  m.m92_task_distributed,
  m.m52_notified,
  m.source_engine,
  m.source_case_number,
  m.source_case_id
FROM m10_smart_cases m
WHERE NOT EXISTS (
  SELECT 1 FROM scm_cases s WHERE s.case_number = m.case_number
);

-- ═══════════════════════════════════════════════
-- Link existing M10 tree nodes, drafts, and deadlines
-- to their corresponding SCM cases
-- ═══════════════════════════════════════════════

UPDATE m10_case_tree_nodes t
SET scm_case_id = s.id
FROM scm_cases s
WHERE s.case_number = (
  SELECT m.case_number FROM m10_smart_cases m WHERE m.id = t.case_id
)
AND t.scm_case_id IS NULL;

UPDATE m10_defense_drafts d
SET scm_case_id = s.id
FROM scm_cases s
WHERE s.case_number = (
  SELECT m.case_number FROM m10_smart_cases m WHERE m.id = d.case_id
)
AND d.scm_case_id IS NULL;

UPDATE m10_deadlines dl
SET scm_case_id = s.id
FROM scm_cases s
WHERE s.case_number = (
  SELECT m.case_number FROM m10_smart_cases m WHERE m.id = dl.case_id
)
AND dl.scm_case_id IS NULL;
