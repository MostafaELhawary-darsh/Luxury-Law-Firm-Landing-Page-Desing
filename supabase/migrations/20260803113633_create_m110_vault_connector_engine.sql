-- M110: Sovereign Vault Gateway (البوابة الخلفية السيادية)
-- External entity data ingestion, cryptographic sealing, WORM storage, semantic indexing

-- Provider registry (tax, customs, civil registry, etc.)
CREATE TABLE IF NOT EXISTS m110_vault_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code text NOT NULL UNIQUE,
  provider_name text NOT NULL,
  provider_name_ar text NOT NULL,
  provider_type text NOT NULL,
  api_endpoint text,
  protocol_type text DEFAULT 'REST',
  auth_method text DEFAULT 'mTLS',
  rate_limit_per_min int DEFAULT 30,
  rate_limit_per_hour int DEFAULT 500,
  active boolean DEFAULT true,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE m110_vault_providers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m110_providers" ON m110_vault_providers;
CREATE POLICY "anon_select_m110_providers" ON m110_vault_providers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m110_providers" ON m110_vault_providers;
CREATE POLICY "anon_insert_m110_providers" ON m110_vault_providers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m110_providers" ON m110_vault_providers;
CREATE POLICY "anon_update_m110_providers" ON m110_vault_providers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m110_providers" ON m110_vault_providers;
CREATE POLICY "anon_delete_m110_providers" ON m110_vault_providers FOR DELETE TO anon, authenticated USING (true);

-- Data pull operations (the core workflow pipeline)
CREATE TABLE IF NOT EXISTS m110_vault_pulls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pull_number text NOT NULL,
  pull_title text NOT NULL,
  provider_id uuid REFERENCES m110_vault_providers(id),
  provider_code text,
  pull_type text DEFAULT 'document',
  stage text DEFAULT 'ingestion',
  status text DEFAULT 'active',
  -- Stage 1: Ingestion & Sanitization
  source_format text,
  source_url text,
  file_hash_pre text,
  malware_scan_passed boolean DEFAULT false,
  sanitized boolean DEFAULT false,
  -- Stage 2: Cryptographic Sealing
  content_hash text,
  hash_algorithm text DEFAULT 'SHA3-512',
  digital_signature text,
  hsm_key_id text,
  sealed boolean DEFAULT false,
  sealed_at timestamptz,
  -- Stage 3: Vault Partitioning
  vault_partition text,
  worm_committed boolean DEFAULT false,
  worm_committed_at timestamptz,
  storage_path text,
  -- Stage 4: Semantic Indexing
  metadata_extracted jsonb,
  entity_id_linked text,
  ocr_processed boolean DEFAULT false,
  ocr_text text,
  -- Stage 5: Retrieval & Audit
  retrieval_count int DEFAULT 0,
  last_retrieved_at timestamptz,
  tunnel_id text,
  -- Integration links
  m85_tax_linked boolean DEFAULT false,
  m10_case_opened boolean DEFAULT false,
  m53_document_id text,
  m54_finance_linked boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  m109_biometric_signed boolean DEFAULT false,
  cost_center_id text,
  -- Security
  ecdh_key_exchange text,
  payload_encrypted boolean DEFAULT false,
  rate_limited boolean DEFAULT false,
  -- Metadata
  description text,
  advisor_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE m110_vault_pulls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m110_pulls" ON m110_vault_pulls;
CREATE POLICY "anon_select_m110_pulls" ON m110_vault_pulls FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m110_pulls" ON m110_vault_pulls;
CREATE POLICY "anon_insert_m110_pulls" ON m110_vault_pulls FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m110_pulls" ON m110_vault_pulls;
CREATE POLICY "anon_update_m110_pulls" ON m110_vault_pulls FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m110_pulls" ON m110_vault_pulls;
CREATE POLICY "anon_delete_m110_pulls" ON m110_vault_pulls FOR DELETE TO anon, authenticated USING (true);

-- Immutable audit ledger (hash-chained, tamper-evident)
CREATE TABLE IF NOT EXISTS m110_vault_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pull_id uuid,
  provider_code text,
  action text NOT NULL,
  actor text,
  actor_role text,
  stage text,
  detail text,
  hash_chain text NOT NULL,
  previous_hash text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m110_vault_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m110_audit" ON m110_vault_audit;
CREATE POLICY "anon_select_m110_audit" ON m110_vault_audit FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m110_audit" ON m110_vault_audit;
CREATE POLICY "anon_insert_m110_audit" ON m110_vault_audit FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m110_audit" ON m110_vault_audit;
CREATE POLICY "anon_update_m110_audit" ON m110_vault_audit FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m110_audit" ON m110_vault_audit;
CREATE POLICY "anon_delete_m110_audit" ON m110_vault_audit FOR DELETE TO anon, authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_m110_pulls_stage ON m110_vault_pulls(stage);
CREATE INDEX IF NOT EXISTS idx_m110_pulls_provider ON m110_vault_pulls(provider_id);
CREATE INDEX IF NOT EXISTS idx_m110_pulls_provider_code ON m110_vault_pulls(provider_code);
CREATE INDEX IF NOT EXISTS idx_m110_audit_pull ON m110_vault_audit(pull_id);
CREATE INDEX IF NOT EXISTS idx_m110_audit_hash ON m110_vault_audit(hash_chain);

-- Register M110 in M92 engine registry
INSERT INTO m92_engine_registry (engine_code, engine_name, engine_name_ar, category, department, description, icon) VALUES
  ('M110', 'VaultConnectorEngine',
   'البوابة الخلفية السيادية لربط الجهات الخارجية',
   'infrastructure', 'البوابة السيادية',
   'سحب البيانات من الجهات الحكومية وتشفيرها بختم SHA3-512 وحفظها في مستودع WORM وفهرسة دلالية',
   'Vault')
ON CONFLICT (engine_code) DO NOTHING;

-- Seed providers
INSERT INTO m110_vault_providers (provider_code, provider_name, provider_name_ar, provider_type, api_endpoint, protocol_type, auth_method, rate_limit_per_min, rate_limit_per_hour, active, description) VALUES
  ('TAX', 'Tax Authority API', 'مصلحة الضرائب', 'tax', 'https://api.tax.gov.sa/v2', 'REST', 'mTLS', 30, 500, true, 'بروتوكول الربط مع مصلحة الضرائب لسحب الفواتير الإلكترونية والبيانات الضريبية'),
  ('CUSTOMS', 'Customs Authority API', 'مصلحة الجمارك', 'customs', 'https://api.customs.gov.sa/v1', 'gRPC', 'mTLS', 20, 300, true, 'بروتوكول الربط مع مصلحة الجمارك لسحب بيانات التخليص الجمركي والواردات'),
  ('CIVIL', 'Civil Registry API', 'السجل المدني', 'civil', 'https://api.civil.gov.sa/v1', 'REST', 'OAuth2', 60, 1000, true, 'بروتوكول الربط مع السجل المدني للتحقق من الهويات والوثائق الشخصية'),
  ('COMMERCIAL', 'Commercial Registry API', 'السجل التجاري', 'commercial', 'https://api.commercial.gov.sa/v1', 'REST', 'mTLS', 25, 400, true, 'بروتوكول الربط مع السجل التجاري لسحب بيانات الشركات والكيانات التجارية'),
  ('JUDICIAL', 'Judicial Portal API', 'البوابة القضائية', 'judicial', 'https://api.judicial.gov.sa/v1', 'gRPC', 'mTLS', 15, 200, true, 'بروتوكول الربط مع البوابة القضائية لسحب المراسلات والأحكام')
ON CONFLICT (provider_code) DO NOTHING;

-- Seed example pull
INSERT INTO m110_vault_pulls (pull_number, pull_title, provider_id, provider_code, pull_type, stage, status, source_format, source_url, file_hash_pre, malware_scan_passed, sanitized, content_hash, hash_algorithm, digital_signature, hsm_key_id, sealed, sealed_at, vault_partition, worm_committed, worm_committed_at, storage_path, metadata_extracted, entity_id_linked, ocr_processed, ocr_text, m85_tax_linked, m10_case_opened, m53_document_id, m54_finance_linked, m92_notified, m109_biometric_signed, cost_center_id, ecdh_key_exchange, payload_encrypted, rate_limited, description)
SELECT 'PULL-2025-001', 'سحب بيان ضريبي - شركة الأطلس التجارية', p.id, 'TAX', 'document', 'sealed', 'active', 'PDF', 'https://api.tax.gov.sa/v2/invoices/12345', 'sha256:3a7f...b2c1', true, true, 'sha3-512:9e2f4a7c...d8b1', 'SHA3-512', 'sig:rsa4096:7c3a...f9e2', 'hsm-key-001', true, now() - interval '2 hours', 'tax-partition', true, now() - interval '1 hour', '/vault/tax/2025/000001.pdf', '{"vat_number":"300123456700003","period":"Q4-2024","amount":45000}'::jsonb, 'CR-12345', true, 'فاتورة ضريبية للربع الرابع 2024 - شركة الأطلس التجارية', true, false, 'DOC-M110-000001', true, true, false, 'CC-M110-001', 'ecdh:0x4f2a...8b3c', true, false, 'سحب بيان ضريبي ربع سنوي من مصلحة الضرائب ومطابقته مع العقود'
FROM m110_vault_providers p WHERE p.provider_code = 'TAX' LIMIT 1
ON CONFLICT DO NOTHING;

-- Seed audit entry for example pull
INSERT INTO m110_vault_audit (pull_id, provider_code, action, actor, actor_role, stage, detail, hash_chain, previous_hash)
SELECT id, 'TAX', 'pull_initiated', 'النظام', 'النظام', 'ingestion', 'بدء سحب البيان الضريبي من مصلحة الضرائب', 'sha3-512:1a2b...3c4d', '0x0000...0000'
FROM m110_vault_pulls WHERE pull_number = 'PULL-2025-001' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO m110_vault_audit (pull_id, provider_code, action, actor, actor_role, stage, detail, hash_chain, previous_hash)
SELECT id, 'TAX', 'malware_scan_passed', 'النظام', 'النظام', 'ingestion', 'فحص البرمجيات الخبيثة ناجح', 'sha3-512:2b3c...4d5e', 'sha3-512:1a2b...3c4d'
FROM m110_vault_pulls WHERE pull_number = 'PULL-2025-001' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO m110_vault_audit (pull_id, provider_code, action, actor, actor_role, stage, detail, hash_chain, previous_hash)
SELECT id, 'TAX', 'cryptographic_seal', 'النظام', 'النظام', 'sealing', 'ختم المستند بتوقيع SHA3-512 و HSM', 'sha3-512:3c4d...5e6f', 'sha3-512:2b3c...4d5e'
FROM m110_vault_pulls WHERE pull_number = 'PULL-2025-001' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO m110_vault_audit (pull_id, provider_code, action, actor, actor_role, stage, detail, hash_chain, previous_hash)
SELECT id, 'TAX', 'worm_commit', 'النظام', 'النظام', 'partitioning', 'حفظ المستند في قسم WORM المعزول', 'sha3-512:4d5e...6f7a', 'sha3-512:3c4d...5e6f'
FROM m110_vault_pulls WHERE pull_number = 'PULL-2025-001' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO m110_vault_audit (pull_id, provider_code, action, actor, actor_role, stage, detail, hash_chain, previous_hash)
SELECT id, 'TAX', 'semantic_indexed', 'النظام', 'النظام', 'indexing', 'فهرسة دلالية وربط بملف الهوية CR-12345', 'sha3-512:5e6f...7a8b', 'sha3-512:4d5e...6f7a'
FROM m110_vault_pulls WHERE pull_number = 'PULL-2025-001' LIMIT 1
ON CONFLICT DO NOTHING;