/*
# Deep Link Verification Service — DMZ Reverse Proxy + Short-Lived Signed Tokens

## Overview
Implements secure deep links for Trello cards. When a client clicks a link from
outside the network, the DMZ gateway verifies the HMAC-signed short-lived token,
enforces MFA challenge, and streams the document in-memory (read-only, no download).

## New Tables

1. **laas_deep_link_tokens** — Short-lived signed tokens for document access
   - id (uuid PK)
   - token (text, unique) — the JWT-like signed token string
   - subscriber_id (FK → laas_subscribers) — the client who owns the document
   - doc_id (text) — the document identifier
   - doc_title (text) — document title for display
   - trello_card_id (text, nullable) — associated Trello card
   - issued_at (timestamptz)
   - expires_at (timestamptz) — TTL typically 30 minutes
   - used_at (timestamptz, nullable) — when the token was first used (one-time)
   - is_revoked (bool, default false) — manual revocation
   - is_one_time (bool, default true) — single-use enforcement
   - created_at, updated_at

2. **laas_mfa_sessions** — MFA challenge sessions for deep link access
   - id (uuid PK)
   - subscriber_id (FK → laas_subscribers)
   - session_token (text, unique) — encrypted session cookie token
   - mfa_verified (bool, default false)
   - otp_code (text, nullable) — the generated OTP/TOTP challenge
   - challenge_at (timestamptz, nullable) — when MFA was challenged
   - verified_at (timestamptz, nullable) — when MFA was confirmed
   - expires_at (timestamptz) — session expiry
   - ip_address (text, nullable)
   - user_agent (text, nullable)
   - created_at, updated_at

3. **laas_document_access_logs** — Audit trail of all document access via deep links
   - id (uuid PK)
   - token_id (FK → laas_deep_link_tokens, nullable)
   - subscriber_id (FK → laas_subscribers)
   - doc_id (text)
   - access_type (text) — token_generated / token_verified / mfa_challenged / mfa_verified / document_streamed / token_revoked / token_expired / access_denied
   - ip_address (text, nullable)
   - user_agent (text, nullable)
   - result (text) — success / denied / expired / revoked / invalid_signature
   - created_at

## Security
- RLS enabled on all tables with anon+authenticated CRUD.
*/

-- ===== laas_deep_link_tokens =====
CREATE TABLE IF NOT EXISTS laas_deep_link_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  subscriber_id uuid REFERENCES laas_subscribers(id) ON DELETE CASCADE,
  doc_id text NOT NULL,
  doc_title text NOT NULL DEFAULT 'مستند قانوني',
  trello_card_id text,
  issued_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  is_revoked boolean DEFAULT false,
  is_one_time boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dlt_token ON laas_deep_link_tokens(token);
CREATE INDEX IF NOT EXISTS idx_dlt_subscriber ON laas_deep_link_tokens(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_dlt_expires ON laas_deep_link_tokens(expires_at);

ALTER TABLE laas_deep_link_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "laas_dlt_select" ON laas_deep_link_tokens;
CREATE POLICY "laas_dlt_select" ON laas_deep_link_tokens FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_dlt_insert" ON laas_deep_link_tokens;
CREATE POLICY "laas_dlt_insert" ON laas_deep_link_tokens FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_dlt_update" ON laas_deep_link_tokens;
CREATE POLICY "laas_dlt_update" ON laas_deep_link_tokens FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "laas_dlt_delete" ON laas_deep_link_tokens;
CREATE POLICY "laas_dlt_delete" ON laas_deep_link_tokens FOR DELETE TO anon, authenticated USING (true);

-- ===== laas_mfa_sessions =====
CREATE TABLE IF NOT EXISTS laas_mfa_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid REFERENCES laas_subscribers(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  mfa_verified boolean DEFAULT false,
  otp_code text,
  challenge_at timestamptz,
  verified_at timestamptz,
  expires_at timestamptz NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mfa_session_token ON laas_mfa_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_mfa_subscriber ON laas_mfa_sessions(subscriber_id);

ALTER TABLE laas_mfa_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "laas_mfa_select" ON laas_mfa_sessions;
CREATE POLICY "laas_mfa_select" ON laas_mfa_sessions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_mfa_insert" ON laas_mfa_sessions;
CREATE POLICY "laas_mfa_insert" ON laas_mfa_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_mfa_update" ON laas_mfa_sessions;
CREATE POLICY "laas_mfa_update" ON laas_mfa_sessions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "laas_mfa_delete" ON laas_mfa_sessions;
CREATE POLICY "laas_mfa_delete" ON laas_mfa_sessions FOR DELETE TO anon, authenticated USING (true);

-- ===== laas_document_access_logs =====
CREATE TABLE IF NOT EXISTS laas_document_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id uuid REFERENCES laas_deep_link_tokens(id) ON DELETE SET NULL,
  subscriber_id uuid REFERENCES laas_subscribers(id) ON DELETE CASCADE,
  doc_id text NOT NULL,
  access_type text NOT NULL DEFAULT 'token_generated',
  ip_address text,
  user_agent text,
  result text NOT NULL DEFAULT 'success',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dal_token ON laas_document_access_logs(token_id);
CREATE INDEX IF NOT EXISTS idx_dal_created ON laas_document_access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dal_access_type ON laas_document_access_logs(access_type);

ALTER TABLE laas_document_access_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "laas_dal_select" ON laas_document_access_logs;
CREATE POLICY "laas_dal_select" ON laas_document_access_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_dal_insert" ON laas_document_access_logs;
CREATE POLICY "laas_dal_insert" ON laas_document_access_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_dal_delete" ON laas_document_access_logs;
CREATE POLICY "laas_dal_delete" ON laas_document_access_logs FOR DELETE TO anon, authenticated USING (true);
