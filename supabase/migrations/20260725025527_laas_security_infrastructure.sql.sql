/*
# Security Infrastructure — Fail2ban + Arabic Legal DLP + Encrypted Unmasking Maps

## Overview
Three security systems:
1. Fail2ban IP banning — tracks failed deep link attempts and bans IPs at kernel level
2. Arabic Legal DLP — anonymizes Arabic legal texts using contextual anchors + regex + NER
3. Encrypted Unmasking Maps — envelope encryption (AES-256-GCM) with blind indexing

## New Tables

1. **laas_banned_ips** — Fail2ban-style IP ban records
   - id (uuid PK)
   - ip_address (text, unique)
   - ban_reason (text) — token_enumeration / mass_download / brute_force / revoked_link_access
   - failed_attempts (int)
   - first_attempt_at (timestamptz)
   - last_attempt_at (timestamptz)
   - banned_until (timestamptz) — ban expiry (null = permanent)
   - is_permanent (bool, default false)
   - is_whitelisted (bool, default false) — ignoreip whitelist
   - jail_chain (text) — e.g. f2b-nginx-deeplink
   - status (text) — active / expired / unbanned / whitelisted
   - created_at, updated_at

2. **laas_dlp_audit_logs** — Audit trail for anonymization operations
   - id (uuid PK)
   - doc_id (text)
   - doc_blind_index (text) — HMAC-SHA256 of doc_id
   - entity_type (text) — PARTY_NAME / COMPANY_NAME / NATIONAL_ID / CASE_NUMBER / FINANCIAL_AMOUNT / COMMERCIAL_REG / LOCATION / DOC_REF
   - entity_count (int) — number of entities anonymized
   - anonymization_method (text) — regex / contextual_anchor / ner_model
   - masked_text_preview (text) — first 200 chars of masked text
   - map_id (uuid, nullable) — FK to laas_unmasking_maps
   - executed_by (text)
   - created_at

3. **laas_unmasking_maps** — Encrypted unmasking maps (envelope encryption)
   - id (uuid PK)
   - doc_blind_index (text, unique) — HMAC-SHA256 blind index
   - encrypted_dek (bytea) — encrypted data encryption key
   - encrypted_map_payload (bytea) — AES-256-GCM encrypted JSON map
   - iv (bytea) — initialization vector
   - status (text) — ACTIVE / REVOKED / PURGED / EXPIRED
   - created_at, expires_at
   - purged_at (timestamptz, nullable)

4. **laas_fail2ban_events** — Individual failed attempt log (for pattern detection)
   - id (uuid PK)
   - ip_address (text)
   - http_status (int) — 401 / 403 / 404
   - token_snippet (text) — first 20 chars of attempted token
   - endpoint (text)
   - user_agent (text, nullable)
   - created_at

## Security
- RLS enabled on all tables with anon+authenticated CRUD.
*/

-- ===== laas_banned_ips =====
CREATE TABLE IF NOT EXISTS laas_banned_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text UNIQUE NOT NULL,
  ban_reason text NOT NULL DEFAULT 'token_enumeration',
  failed_attempts integer DEFAULT 1,
  first_attempt_at timestamptz DEFAULT now(),
  last_attempt_at timestamptz DEFAULT now(),
  banned_until timestamptz,
  is_permanent boolean DEFAULT false,
  is_whitelisted boolean DEFAULT false,
  jail_chain text DEFAULT 'f2b-nginx-deeplink',
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_banned_ips_status ON laas_banned_ips(status);
CREATE INDEX IF NOT EXISTS idx_banned_ips_ip ON laas_banned_ips(ip_address);

ALTER TABLE laas_banned_ips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "laas_banned_ips_select" ON laas_banned_ips;
CREATE POLICY "laas_banned_ips_select" ON laas_banned_ips FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_banned_ips_insert" ON laas_banned_ips;
CREATE POLICY "laas_banned_ips_insert" ON laas_banned_ips FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_banned_ips_update" ON laas_banned_ips;
CREATE POLICY "laas_banned_ips_update" ON laas_banned_ips FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "laas_banned_ips_delete" ON laas_banned_ips;
CREATE POLICY "laas_banned_ips_delete" ON laas_banned_ips FOR DELETE TO anon, authenticated USING (true);

-- ===== laas_dlp_audit_logs =====
CREATE TABLE IF NOT EXISTS laas_dlp_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id text NOT NULL,
  doc_blind_index text,
  entity_type text NOT NULL DEFAULT 'PARTY_NAME',
  entity_count integer DEFAULT 0,
  anonymization_method text DEFAULT 'contextual_anchor',
  masked_text_preview text,
  map_id uuid,
  executed_by text DEFAULT 'نظام التجهيل الآلي',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dlp_audit_created ON laas_dlp_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dlp_audit_doc ON laas_dlp_audit_logs(doc_blind_index);

ALTER TABLE laas_dlp_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "laas_dlp_audit_select" ON laas_dlp_audit_logs;
CREATE POLICY "laas_dlp_audit_select" ON laas_dlp_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_dlp_audit_insert" ON laas_dlp_audit_logs;
CREATE POLICY "laas_dlp_audit_insert" ON laas_dlp_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_dlp_audit_update" ON laas_dlp_audit_logs;
CREATE POLICY "laas_dlp_audit_update" ON laas_dlp_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "laas_dlp_audit_delete" ON laas_dlp_audit_logs;
CREATE POLICY "laas_dlp_audit_delete" ON laas_dlp_audit_logs FOR DELETE TO anon, authenticated USING (true);

-- ===== laas_unmasking_maps =====
CREATE TABLE IF NOT EXISTS laas_unmasking_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_blind_index text UNIQUE NOT NULL,
  encrypted_dek bytea NOT NULL,
  encrypted_map_payload bytea NOT NULL,
  iv bytea NOT NULL,
  status text DEFAULT 'ACTIVE',
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  purged_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_unmasking_blind ON laas_unmasking_maps(doc_blind_index);
CREATE INDEX IF NOT EXISTS idx_unmasking_expires ON laas_unmasking_maps(expires_at);
CREATE INDEX IF NOT EXISTS idx_unmasking_status ON laas_unmasking_maps(status);

ALTER TABLE laas_unmasking_maps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "laas_unmasking_select" ON laas_unmasking_maps;
CREATE POLICY "laas_unmasking_select" ON laas_unmasking_maps FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_unmasking_insert" ON laas_unmasking_maps;
CREATE POLICY "laas_unmasking_insert" ON laas_unmasking_maps FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_unmasking_update" ON laas_unmasking_maps;
CREATE POLICY "laas_unmasking_update" ON laas_unmasking_maps FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "laas_unmasking_delete" ON laas_unmasking_maps;
CREATE POLICY "laas_unmasking_delete" ON laas_unmasking_maps FOR DELETE TO anon, authenticated USING (true);

-- ===== laas_fail2ban_events =====
CREATE TABLE IF NOT EXISTS laas_fail2ban_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  http_status integer NOT NULL DEFAULT 403,
  token_snippet text,
  endpoint text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_f2b_events_ip ON laas_fail2ban_events(ip_address);
CREATE INDEX IF NOT EXISTS idx_f2b_events_created ON laas_fail2ban_events(created_at DESC);

ALTER TABLE laas_fail2ban_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "laas_f2b_events_select" ON laas_fail2ban_events;
CREATE POLICY "laas_f2b_events_select" ON laas_fail2ban_events FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_f2b_events_insert" ON laas_fail2ban_events;
CREATE POLICY "laas_f2b_events_insert" ON laas_fail2ban_events FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_f2b_events_delete" ON laas_fail2ban_events;
CREATE POLICY "laas_f2b_events_delete" ON laas_fail2ban_events FOR DELETE TO anon, authenticated USING (true);

-- ===== Secure Purge Procedure =====
-- Overwrites encrypted data with random noise before DELETE (cryptographic shredding)
CREATE OR REPLACE PROCEDURE secure_purge_unmasking_maps()
LANGUAGE plpgsql
AS $$
DECLARE
    purged_count INT;
BEGIN
    -- Step 1: Cryptographic Shredding — overwrite with random bytes
    UPDATE laas_unmasking_maps
    SET
        encrypted_map_payload = gen_random_bytes(32),
        encrypted_dek = gen_random_bytes(16),
        iv = gen_random_bytes(12),
        status = 'PURGED',
        purged_at = now()
    WHERE expires_at < now()
      AND status != 'PURGED';

    -- Step 2: Delete the overwritten rows
    WITH deleted AS (
        DELETE FROM laas_unmasking_maps
        WHERE expires_at < now() OR status = 'PURGED'
        RETURNING id
    )
    SELECT COUNT(*) INTO purged_count FROM deleted;

    -- Step 3: Log to security events
    IF purged_count > 0 THEN
        INSERT INTO laas_security_events (event_type, severity, source_entity, description, action_taken, status)
        VALUES (
            'sandbox_purge',
            'info',
            'نظام الإتلاف الآمن للخرائط',
            format('تم إتلاف % خرائط تجهيل منتهية الصلاحية بأسلوب الكتابة الفوقية العشوائية', purged_count),
            'Cryptographic Shredding + DELETE',
            'resolved'
        );
    END IF;
END;
$$;

-- ===== Seed sample banned IPs =====
INSERT INTO laas_banned_ips (ip_address, ban_reason, failed_attempts, banned_until, is_permanent, status)
VALUES
  ('198.51.100.45', 'token_enumeration', 7, null, true, 'active'),
  ('203.0.113.78', 'brute_force', 4, now() + interval '24 hours', false, 'active'),
  ('192.0.2.156', 'revoked_link_access', 3, now() + interval '10 minutes', false, 'active'),
  ('127.0.0.1', 'whitelist', 0, null, false, 'whitelisted')
ON CONFLICT (ip_address) DO NOTHING;

-- ===== Seed sample fail2ban events =====
INSERT INTO laas_fail2ban_events (ip_address, http_status, token_snippet, endpoint, user_agent)
VALUES
  ('198.51.100.45', 403, 'eyJhbGciOiJIUzI1Ni', '/v1/auth/claim', 'curl/7.81.0'),
  ('198.51.100.45', 401, 'eyJhbGciOiJIUzI1Ni', '/v1/auth/claim', 'curl/7.81.0'),
  ('198.51.100.45', 404, 'invalid_token_xyz', '/v1/auth/claim', 'python-requests/2.28'),
  ('203.0.113.78', 403, 'eyJhbGciOiJIUzI1Ni', '/v1/auth/claim', 'Mozilla/5.0 (Bot)'),
  ('192.0.2.156', 401, 'expired_token_abc', '/v1/auth/claim', 'Mozilla/5.0')
ON CONFLICT DO NOTHING;
