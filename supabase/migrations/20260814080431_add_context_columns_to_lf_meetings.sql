/*
# Add context isolation columns to lf_meetings

1. Modified Tables
- `lf_meetings`
  - `context_type` (text, nullable) — identifies which engine created the meeting (e.g. 'investigation', 'arbitration', 'arbitration_hub', 'dispute')
  - `context_id` (text, nullable) — the entity ID within that engine (e.g. the case/file ID)

2. Notes
- These columns allow each engine to query only its own scheduled meetings, preventing cross-engine mixing.
- Both columns are nullable so existing meetings are unaffected.
- Added an index on (context_type, status) for efficient filtering.
*/

ALTER TABLE lf_meetings
  ADD COLUMN IF NOT EXISTS context_type text,
  ADD COLUMN IF NOT EXISTS context_id text;

CREATE INDEX IF NOT EXISTS idx_lf_meetings_context_type_status
  ON lf_meetings(context_type, status);
