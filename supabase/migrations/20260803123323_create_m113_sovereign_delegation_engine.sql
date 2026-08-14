-- M113: Sovereign Graduated Delegation Protocol (بروتوكول التفويض السيادي المتدرج)
-- Multi-sig quorum for emergency access when biometric authentication (M109) is unavailable

-- Delegation requests (emergency access petitions)
CREATE TABLE IF NOT EXISTS m113_delegation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number text NOT NULL,
  request_title text NOT NULL,
  requester_id text,
  requester_name text,
  requester_role text,
  target_files text[] DEFAULT '{}',
  emergency_level text DEFAULT 'operational',
  quorum_required int DEFAULT 2,
  quorum_collected int DEFAULT 0,
  status text DEFAULT 'pending',
  trigger_reason text,
  m109_biometric_failed boolean DEFAULT false,
  m109_failure_count int DEFAULT 0,
  manual_declaration boolean DEFAULT false,
  -- Quorum members
  quorum_members text[] DEFAULT '{}',
  -- Signatures
  signatures jsonb DEFAULT '[]',
  -- Emergency token
  emergency_token text,
  token_issued boolean DEFAULT false,
  token_issued_at timestamptz,
  token_expires_at timestamptz,
  token_scope text,
  -- Audit
  m52_notified boolean DEFAULT false,
  m49_board_vote boolean DEFAULT false,
  m92_monitoring boolean DEFAULT false,
  m108_continuity boolean DEFAULT false,
  shamir_shares int DEFAULT 0,
  shamir_threshold int DEFAULT 0,
  zk_audit_frozen boolean DEFAULT false,
  hash_chain text NOT NULL,
  previous_hash text,
  -- Metadata
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE m113_delegation_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m113_requests" ON m113_delegation_requests;
CREATE POLICY "anon_select_m113_requests" ON m113_delegation_requests FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m113_requests" ON m113_delegation_requests;
CREATE POLICY "anon_insert_m113_requests" ON m113_delegation_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m113_requests" ON m113_delegation_requests;
CREATE POLICY "anon_update_m113_requests" ON m113_delegation_requests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m113_requests" ON m113_delegation_requests;
CREATE POLICY "anon_delete_m113_requests" ON m113_delegation_requests FOR DELETE TO anon, authenticated USING (true);

-- Quorum votes (individual member signatures)
CREATE TABLE IF NOT EXISTS m113_quorum_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delegation_id uuid NOT NULL,
  voter_id text NOT NULL,
  voter_name text NOT NULL,
  voter_role text NOT NULL,
  vote_decision text NOT NULL,
  e_token_id text,
  digital_signature text,
  signed_at timestamptz DEFAULT now(),
  clearance_level text,
  hash_chain text NOT NULL,
  previous_hash text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m113_quorum_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m113_votes" ON m113_quorum_votes;
CREATE POLICY "anon_select_m113_votes" ON m113_quorum_votes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m113_votes" ON m113_quorum_votes;
CREATE POLICY "anon_insert_m113_votes" ON m113_quorum_votes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m113_votes" ON m113_quorum_votes;
CREATE POLICY "anon_update_m113_votes" ON m113_quorum_votes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m113_votes" ON m113_quorum_votes;
CREATE POLICY "anon_delete_m113_votes" ON m113_quorum_votes FOR DELETE TO anon, authenticated USING (true);

-- Delegation audit trail (ZK-Audit immutable log)
CREATE TABLE IF NOT EXISTS m113_delegation_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delegation_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  microsecond_ts text,
  hash_chain text NOT NULL,
  previous_hash text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m113_delegation_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m113_audit" ON m113_delegation_audit;
CREATE POLICY "anon_select_m113_audit" ON m113_delegation_audit FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m113_audit" ON m113_delegation_audit;
CREATE POLICY "anon_insert_m113_audit" ON m113_delegation_audit FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m113_audit" ON m113_delegation_audit;
CREATE POLICY "anon_update_m113_audit" ON m113_delegation_audit FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m113_audit" ON m113_delegation_audit;
CREATE POLICY "anon_delete_m113_audit" ON m113_delegation_audit FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m113_requests_status ON m113_delegation_requests(status);
CREATE INDEX IF NOT EXISTS idx_m113_votes_delegation ON m113_quorum_votes(delegation_id);
CREATE INDEX IF NOT EXISTS idx_m113_audit_delegation ON m113_delegation_audit(delegation_id);

-- Register M113 in M92 engine registry
INSERT INTO m92_engine_registry (engine_code, engine_name, engine_name_ar, category, department, description, icon) VALUES
  ('M113', 'SovereignDelegationEngine',
   'بروتوكول التفويض السيادي المتدرج',
   'security', 'الأمن السيادي',
   'بروتوكول تفويض متدرج بالمصادقة الجماعية المشفرة Multi-Sig Quorum للوصول الاضطراري للملفات فائقة السرية',
   'ShieldCheck')
ON CONFLICT (engine_code) DO NOTHING;

-- Seed example delegation request
INSERT INTO m113_delegation_requests (request_number, request_title, requester_id, requester_name, requester_role, target_files, emergency_level, quorum_required, quorum_collected, status, trigger_reason, m109_biometric_failed, m109_failure_count, manual_declaration, quorum_members, signatures, token_issued, m52_notified, m49_board_vote, m92_monitoring, m108_continuity, shamir_shares, shamir_threshold, zk_audit_frozen, hash_chain, previous_hash, description)
VALUES ('DEL-2025-001', 'تفويض اضطراري لفتح ملف استحواذ فائق السرية', 'exec-001', 'المدير التنفيذي', 'مدير عام', ARRAY['merger-confidential.pdf','financial-records.xlsx'], 'sovereign', 4, 2, 'collecting', 'فشل المصادقة البيومترية 3 مرات', true, 3, false, ARRAY['board-001','board-002','board-003','board-004','board-005'], '[{"voter_id":"board-001","voter_name":"عضو مجلس 1","decision":"approve","signed_at":"2025-01-15T10:00:00Z"},{"voter_id":"board-002","voter_name":"عضو مجلس 2","decision":"approve","signed_at":"2025-01-15T10:05:00Z"}]'::jsonb, false, true, true, true, false, 5, 4, false, 'sha3-512:1a2b...3c4d', '0x0000...0000', 'طلب تفويض لفتح ملفات الاستحواذ السرية بعد تعذر المصادقة البيومترية')
ON CONFLICT DO NOTHING;

-- Seed example votes
INSERT INTO m113_quorum_votes (delegation_id, voter_id, voter_name, voter_role, vote_decision, e_token_id, digital_signature, signed_at, clearance_level, hash_chain, previous_hash)
SELECT d.id, 'board-001', 'عضو مجلس الإدارة 1', 'board_member', 'approve', 'etoken-001', 'sig:rsa4096:7c3a...f9e2', now() - interval '1 hour', 'level-5', 'sha3-512:2b3c...4d5e', 'sha3-512:1a2b...3c4d'
FROM m113_delegation_requests d WHERE d.request_number = 'DEL-2025-001' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO m113_quorum_votes (delegation_id, voter_id, voter_name, voter_role, vote_decision, e_token_id, digital_signature, signed_at, clearance_level, hash_chain, previous_hash)
SELECT d.id, 'board-002', 'عضو مجلس الإدارة 2', 'board_member', 'approve', 'etoken-002', 'sig:rsa4096:8d4b...a0f3', now() - interval '55 minutes', 'level-5', 'sha3-512:3c4d...5e6f', 'sha3-512:2b3c...4d5e'
FROM m113_delegation_requests d WHERE d.request_number = 'DEL-2025-001' LIMIT 1
ON CONFLICT DO NOTHING;

-- Seed example audit entries
INSERT INTO m113_delegation_audit (delegation_id, action, actor, actor_role, detail, microsecond_ts, hash_chain, previous_hash, immutable)
SELECT d.id, 'delegation_requested', 'المدير التنفيذي', 'مدير عام', 'بدء طلب التفويض الاضطراري', '2025-01-15T09:55:00.123456Z', 'sha3-512:1a2b...3c4d', '0x0000...0000', true
FROM m113_delegation_requests d WHERE d.request_number = 'DEL-2025-001' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO m113_delegation_audit (delegation_id, action, actor, actor_role, detail, microsecond_ts, hash_chain, previous_hash, immutable)
SELECT d.id, 'm109_failure_detected', 'النظام', 'النظام', 'فشل المصادقة البيومترية 3 مرات', '2025-01-15T09:56:00.234567Z', 'sha3-512:2b3c...4d5e', 'sha3-512:1a2b...3c4d', true
FROM m113_delegation_requests d WHERE d.request_number = 'DEL-2025-001' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO m113_delegation_audit (delegation_id, action, actor, actor_role, detail, microsecond_ts, hash_chain, previous_hash, immutable)
SELECT d.id, 'm52_notification_sent', 'النظام', 'النظام', 'إرسال إشعار طوارئ عبر البريد السيادي للأعضاء', '2025-01-15T09:57:00.345678Z', 'sha3-512:3c4d...5e6f', 'sha3-512:2b3c...4d5e', true
FROM m113_delegation_requests d WHERE d.request_number = 'DEL-2025-001' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO m113_delegation_audit (delegation_id, action, actor, actor_role, detail, microsecond_ts, hash_chain, previous_hash, immutable)
SELECT d.id, 'vote_received', 'عضو مجلس الإدارة 1', 'board_member', 'تصويت بالموافقة عبر e-Token', '2025-01-15T10:00:00.456789Z', 'sha3-512:4d5e...6f7a', 'sha3-512:3c4d...5e6f', true
FROM m113_delegation_requests d WHERE d.request_number = 'DEL-2025-001' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO m113_delegation_audit (delegation_id, action, actor, actor_role, detail, microsecond_ts, hash_chain, previous_hash, immutable)
SELECT d.id, 'vote_received', 'عضو مجلس الإدارة 2', 'board_member', 'تصويت بالموافقة عبر e-Token', '2025-01-15T10:05:00.567890Z', 'sha3-512:5e6f...7a8b', 'sha3-512:4d5e...6f7a', true
FROM m113_delegation_requests d WHERE d.request_number = 'DEL-2025-001' LIMIT 1
ON CONFLICT DO NOTHING;