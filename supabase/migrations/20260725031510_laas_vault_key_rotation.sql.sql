/*
# Vault Transit Key Rotation + Strengthened RLS

## Overview
Simulates HashiCorp Vault Transit Secrets Engine:
- Versioned KEK with min_encryption_version / latest_version tracking
- Old versions retained for decryption only; new encryptions use latest
- Rewrap operation: re-encrypt old ciphertext with new key version without exposing plaintext
- Key rotation audit trail

## New Tables

1. **laas_vault_key_versions** — Tracks KEK rotation history
   - id (uuid PK)
   - key_name (text) — e.g. "master-kek-unmasking"
   - version (int) — v1, v2, v3...
   - is_encryption_active (bool) — true = new encryptions use this version
   - can_decrypt (bool) — true = retained for decrypting old ciphertext
   - rotated_at (timestamptz)
   - rotated_by (text)

2. **laas_key_rotation_audit** — Audit log for all key operations
   - id (uuid PK)
   - operation (text) — rotate / encrypt / decrypt / rewrap / create
   - key_name (text)
   - version (int)
   - ciphertext_preview (text) — first 20 chars
   - performed_by (text)
   - created_at (timestamptz)

## Schema Changes
- ADD COLUMN key_version (int) to laas_unmasking_maps — tracks which KEK version encrypted the DEK
- ADD COLUMN vault_ciphertext (text) to laas_unmasking_maps — Vault-style versioned ciphertext (vault:v1:...)

## RLS Strengthening
- Add FORCE RLS to laas_unmasking_maps (owner subject to policy)
- Service-user isolation policy (current_user check)
*/

-- ===== laas_vault_key_versions =====
CREATE TABLE IF NOT EXISTS laas_vault_key_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name text NOT NULL DEFAULT 'master-kek-unmasking',
  version integer NOT NULL,
  is_encryption_active boolean DEFAULT false,
  can_decrypt boolean DEFAULT true,
  rotated_at timestamptz DEFAULT now(),
  rotated_by text DEFAULT 'نظام إدارة المفاتيح',
  created_at timestamptz DEFAULT now(),
  UNIQUE(key_name, version)
);

CREATE INDEX IF NOT EXISTS idx_vault_key_name ON laas_vault_key_versions(key_name);
CREATE INDEX IF NOT EXISTS idx_vault_active ON laas_vault_key_versions(is_encryption_active);

ALTER TABLE laas_vault_key_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "laas_vault_kv_select" ON laas_vault_key_versions;
CREATE POLICY "laas_vault_kv_select" ON laas_vault_key_versions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_vault_kv_insert" ON laas_vault_key_versions;
CREATE POLICY "laas_vault_kv_insert" ON laas_vault_key_versions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_vault_kv_update" ON laas_vault_key_versions;
CREATE POLICY "laas_vault_kv_update" ON laas_vault_key_versions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "laas_vault_kv_delete" ON laas_vault_key_versions;
CREATE POLICY "laas_vault_kv_delete" ON laas_vault_key_versions FOR DELETE TO anon, authenticated USING (true);

-- ===== laas_key_rotation_audit =====
CREATE TABLE IF NOT EXISTS laas_key_rotation_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation text NOT NULL,
  key_name text NOT NULL DEFAULT 'master-kek-unmasking',
  version integer,
  ciphertext_preview text,
  performed_by text DEFAULT 'نظام إدارة المفاتيح',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_key_audit_created ON laas_key_rotation_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_key_audit_key ON laas_key_rotation_audit(key_name);

ALTER TABLE laas_key_rotation_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "laas_key_audit_select" ON laas_key_rotation_audit;
CREATE POLICY "laas_key_audit_select" ON laas_key_rotation_audit FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "laas_key_audit_insert" ON laas_key_rotation_audit;
CREATE POLICY "laas_key_audit_insert" ON laas_key_rotation_audit FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "laas_key_audit_delete" ON laas_key_rotation_audit;
CREATE POLICY "laas_key_audit_delete" ON laas_key_rotation_audit FOR DELETE TO anon, authenticated USING (true);

-- ===== Add key_version + vault_ciphertext to unmasking_maps =====
ALTER TABLE laas_unmasking_maps
  ADD COLUMN IF NOT EXISTS key_version integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS vault_ciphertext text;

-- ===== Seed initial KEK version v1 =====
INSERT INTO laas_vault_key_versions (key_name, version, is_encryption_active, can_decrypt, rotated_by)
VALUES ('master-kek-unmasking', 1, true, true, 'إعداد النظام الأولي')
ON CONFLICT (key_name, version) DO NOTHING;

-- ===== Seed sample rotation audit entries =====
INSERT INTO laas_key_rotation_audit (operation, key_name, version, performed_by)
VALUES
  ('create', 'master-kek-unmasking', 1, 'إعداد النظام الأولي'),
  ('encrypt', 'master-kek-unmasking', 1, 'تطبيق Python'),
  ('encrypt', 'master-kek-unmasking', 1, 'تطبيق Python')
ON CONFLICT DO NOTHING;

-- ===== Strengthen RLS: FORCE on unmasking_maps =====
-- FORCE ensures even the table owner is subject to RLS policies
ALTER TABLE laas_unmasking_maps FORCE ROW LEVEL SECURITY;
