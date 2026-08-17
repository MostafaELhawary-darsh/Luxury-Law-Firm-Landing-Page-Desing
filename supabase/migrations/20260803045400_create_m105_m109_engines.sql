-- M105: Commercial & International Arbitration & ODR Hub
CREATE TABLE IF NOT EXISTS m105_arbitration_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text DEFAULT 'arbitration',
  stage text DEFAULT 'filed',
  status text DEFAULT 'active',
  claimant_name text,
  respondent_name text,
  arbitration_type text,
  seat_of_arbitration text,
  governing_law text,
  arbitration_rules text,
  number_of_arbitrators int DEFAULT 1,
  arbitrator_names text[],
  tribunal_president text,
  claim_amount numeric DEFAULT 0,
  counterclaim_amount numeric DEFAULT 0,
  currency text DEFAULT 'SAR',
  data_room_access_token text,
  hearing_dates text[],
  award_status text,
  award_date date,
  award_enforcement_status text,
  conflict_check_passed boolean DEFAULT false,
  fee_estimate numeric DEFAULT 0,
  fee_paid numeric DEFAULT 0,
  description text,
  advisor_id uuid,
  m53_document_id text,
  m54_finance_linked boolean DEFAULT false,
  m10_case_opened boolean DEFAULT false,
  m109_biometric_signed boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  cost_center_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE m105_arbitration_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m105" ON m105_arbitration_files;
CREATE POLICY "anon_select_m105" ON m105_arbitration_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m105" ON m105_arbitration_files;
CREATE POLICY "anon_insert_m105" ON m105_arbitration_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m105" ON m105_arbitration_files;
CREATE POLICY "anon_update_m105" ON m105_arbitration_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m105" ON m105_arbitration_files;
CREATE POLICY "anon_delete_m105" ON m105_arbitration_files FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m105_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m105_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m105_audit" ON m105_audit_logs;
CREATE POLICY "anon_select_m105_audit" ON m105_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m105_audit" ON m105_audit_logs;
CREATE POLICY "anon_insert_m105_audit" ON m105_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m105_audit" ON m105_audit_logs;
CREATE POLICY "anon_update_m105_audit" ON m105_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m105_audit" ON m105_audit_logs;
CREATE POLICY "anon_delete_m105_audit" ON m105_audit_logs FOR DELETE TO anon, authenticated USING (true);

-- M106: Food Security, Food Industries & Supply Chain Engine
CREATE TABLE IF NOT EXISTS m106_food_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text DEFAULT 'supply',
  stage text DEFAULT 'draft',
  status text DEFAULT 'active',
  product_name text,
  product_category text,
  license_number text,
  license_type text,
  license_expiry date,
  haccp_certified boolean DEFAULT false,
  iso_22000_certified boolean DEFAULT false,
  shelf_life_days int,
  storage_temp_min numeric,
  storage_temp_max numeric,
  batch_number text,
  origin_country text,
  import_permit_ref text,
  quarantine_status text,
  lab_test_passed boolean DEFAULT false,
  lab_test_ref text,
  recall_issued boolean DEFAULT false,
  recall_reason text,
  supply_contract_ref text,
  contract_value numeric DEFAULT 0,
  currency text DEFAULT 'SAR',
  description text,
  advisor_id uuid,
  m53_document_id text,
  m54_finance_linked boolean DEFAULT false,
  m90_trade_linked boolean DEFAULT false,
  m107_iot_linked boolean DEFAULT false,
  m10_case_opened boolean DEFAULT false,
  m109_biometric_signed boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  cost_center_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE m106_food_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m106" ON m106_food_files;
CREATE POLICY "anon_select_m106" ON m106_food_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m106" ON m106_food_files;
CREATE POLICY "anon_insert_m106" ON m106_food_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m106" ON m106_food_files;
CREATE POLICY "anon_update_m106" ON m106_food_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m106" ON m106_food_files;
CREATE POLICY "anon_delete_m106" ON m106_food_files FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m106_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m106_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m106_audit" ON m106_audit_logs;
CREATE POLICY "anon_select_m106_audit" ON m106_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m106_audit" ON m106_audit_logs;
CREATE POLICY "anon_insert_m106_audit" ON m106_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m106_audit" ON m106_audit_logs;
CREATE POLICY "anon_update_m106_audit" ON m106_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m106_audit" ON m106_audit_logs;
CREATE POLICY "anon_delete_m106_audit" ON m106_audit_logs FOR DELETE TO anon, authenticated USING (true);

-- M107: IoT & Physical Sovereign Bridge Engine
CREATE TABLE IF NOT EXISTS m107_iot_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text DEFAULT 'sensor',
  stage text DEFAULT 'monitoring',
  status text DEFAULT 'active',
  device_name text,
  device_type text,
  device_serial text,
  protocol_type text,
  gps_coordinates text,
  sensor_metric text,
  sensor_value numeric DEFAULT 0,
  threshold_min numeric,
  threshold_max numeric,
  alert_triggered boolean DEFAULT false,
  alert_severity text,
  alert_timestamp timestamptz,
  vision_analysis_ref text,
  heartbeat_status text,
  last_ping timestamptz,
  encryption_protocol text DEFAULT 'ECDH',
  failover_target text,
  description text,
  advisor_id uuid,
  m53_document_id text,
  m54_finance_linked boolean DEFAULT false,
  m91_hse_linked boolean DEFAULT false,
  m10_case_opened boolean DEFAULT false,
  m109_biometric_signed boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  cost_center_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE m107_iot_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m107" ON m107_iot_files;
CREATE POLICY "anon_select_m107" ON m107_iot_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m107" ON m107_iot_files;
CREATE POLICY "anon_insert_m107" ON m107_iot_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m107" ON m107_iot_files;
CREATE POLICY "anon_update_m107" ON m107_iot_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m107" ON m107_iot_files;
CREATE POLICY "anon_delete_m107" ON m107_iot_files FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m107_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m107_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m107_audit" ON m107_audit_logs;
CREATE POLICY "anon_select_m107_audit" ON m107_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m107_audit" ON m107_audit_logs;
CREATE POLICY "anon_insert_m107_audit" ON m107_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m107_audit" ON m107_audit_logs;
CREATE POLICY "anon_update_m107_audit" ON m107_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m107_audit" ON m107_audit_logs;
CREATE POLICY "anon_delete_m107_audit" ON m107_audit_logs FOR DELETE TO anon, authenticated USING (true);

-- M108: BCP & Sovereign Disaster Recovery Engine
CREATE TABLE IF NOT EXISTS m108_dr_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text DEFAULT 'failover',
  stage text DEFAULT 'monitoring',
  status text DEFAULT 'active',
  server_name text,
  server_role text,
  health_status text,
  heartbeat_latency_ms numeric DEFAULT 0,
  threat_type text,
  threat_severity text,
  failover_triggered boolean DEFAULT false,
  failover_target_server text,
  failover_latency_ms numeric DEFAULT 0,
  war_room_activated boolean DEFAULT false,
  air_gapped boolean DEFAULT false,
  active_active_sync boolean DEFAULT false,
  geo_replication_site text,
  red_alert_issued boolean DEFAULT false,
  api_ports_closed boolean DEFAULT false,
  recovery_point_objective text,
  recovery_time_objective text,
  description text,
  advisor_id uuid,
  m53_document_id text,
  m54_finance_linked boolean DEFAULT false,
  m14_cyber_linked boolean DEFAULT false,
  m10_case_opened boolean DEFAULT false,
  m109_biometric_signed boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  cost_center_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE m108_dr_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m108" ON m108_dr_files;
CREATE POLICY "anon_select_m108" ON m108_dr_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m108" ON m108_dr_files;
CREATE POLICY "anon_insert_m108" ON m108_dr_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m108" ON m108_dr_files;
CREATE POLICY "anon_update_m108" ON m108_dr_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m108" ON m108_dr_files;
CREATE POLICY "anon_delete_m108" ON m108_dr_files FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m108_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m108_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m108_audit" ON m108_audit_logs;
CREATE POLICY "anon_select_m108_audit" ON m108_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m108_audit" ON m108_audit_logs;
CREATE POLICY "anon_insert_m108_audit" ON m108_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m108_audit" ON m108_audit_logs;
CREATE POLICY "anon_update_m108_audit" ON m108_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m108_audit" ON m108_audit_logs;
CREATE POLICY "anon_delete_m108_audit" ON m108_audit_logs FOR DELETE TO anon, authenticated USING (true);

-- M109: Unified Sovereign Identity & Biometric Gateway Engine
CREATE TABLE IF NOT EXISTS m109_biometric_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text DEFAULT 'signing',
  stage text DEFAULT 'challenge',
  status text DEFAULT 'active',
  subject_name text,
  subject_role text,
  identity_type text,
  liveness_check_passed boolean DEFAULT false,
  face_capture_ref text,
  voice_capture_ref text,
  fingerprint_ref text,
  document_hash text,
  sovereign_hash text,
  hash_algorithm text DEFAULT 'SHA3-512',
  biometric_sealed boolean DEFAULT false,
  signing_target_doc text,
  signing_target_engine text,
  challenge_initiated_by text,
  challenge_timestamp timestamptz,
  verification_timestamp timestamptz,
  anti_deepfake_score numeric DEFAULT 0,
  description text,
  advisor_id uuid,
  m53_document_id text,
  m54_finance_linked boolean DEFAULT false,
  m16_esign_linked boolean DEFAULT false,
  m10_case_opened boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  cost_center_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE m109_biometric_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m109" ON m109_biometric_files;
CREATE POLICY "anon_select_m109" ON m109_biometric_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m109" ON m109_biometric_files;
CREATE POLICY "anon_insert_m109" ON m109_biometric_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m109" ON m109_biometric_files;
CREATE POLICY "anon_update_m109" ON m109_biometric_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m109" ON m109_biometric_files;
CREATE POLICY "anon_delete_m109" ON m109_biometric_files FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m109_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m109_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m109_audit" ON m109_audit_logs;
CREATE POLICY "anon_select_m109_audit" ON m109_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m109_audit" ON m109_audit_logs;
CREATE POLICY "anon_insert_m109_audit" ON m109_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m109_audit" ON m109_audit_logs;
CREATE POLICY "anon_update_m109_audit" ON m109_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m109_audit" ON m109_audit_logs;
CREATE POLICY "anon_delete_m109_audit" ON m109_audit_logs FOR DELETE TO anon, authenticated USING (true);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_m105_files_stage ON m105_arbitration_files(stage);
CREATE INDEX IF NOT EXISTS idx_m106_files_stage ON m106_food_files(stage);
CREATE INDEX IF NOT EXISTS idx_m107_files_stage ON m107_iot_files(stage);
CREATE INDEX IF NOT EXISTS idx_m108_files_stage ON m108_dr_files(stage);
CREATE INDEX IF NOT EXISTS idx_m109_files_stage ON m109_biometric_files(stage);
CREATE INDEX IF NOT EXISTS idx_m105_audit_case ON m105_audit_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_m106_audit_case ON m106_audit_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_m107_audit_case ON m107_audit_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_m108_audit_case ON m108_audit_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_m109_audit_case ON m109_audit_logs(case_id);

-- Register M105-M109 in M92 engine registry
INSERT INTO m92_engine_registry (engine_code, engine_name, engine_name_ar, category, department, description, icon) VALUES
  ('M105', 'ArbitrationHubEngine',      'منصة التحكيم التجاري والدولي وفض المنازعات', 'disputes', 'التحكيم', 'غرفة تحكيم إلكترونية وإدارة نزاعات وغرف بيانات مشفرة وتوليد أحكام', 'Gavel'),
  ('M108', 'DisasterRecoveryEngine',     'استمرارية الأعمال والتعافي من الكوارث',     'infrastructure', 'البنية التحتية', 'خوادم الظل والتبديل الآلي وبروتوكول غرفة الحرب', 'ShieldAlert')
ON CONFLICT (engine_code) DO NOTHING;

-- Update existing M106, M107, M109 with full details
UPDATE m92_engine_registry SET
  engine_name = 'FoodSecurityEngine',
  engine_name_ar = 'الأمن الغذائي والصناعات الغذائية وسلاسل الإمداد',
  category = 'sectoral',
  department = 'الأمن الغذائي',
  description = 'تراخيص سلامة الغذاء وعقود السلع الاستراتيجية وتتبع الصلاحية وسحب المنتجات',
  icon = 'Wheat'
WHERE engine_code = 'M106';

UPDATE m92_engine_registry SET
  engine_name = 'IoTBridgeEngine',
  engine_name_ar = 'إنترنت الأشياء والرقابة الميدانية السيادية',
  category = 'infrastructure',
  department = 'إنترنت الأشياء',
  description = 'ربط الحساسات الميدانية والرؤية الحاسوبية والأحداث الاستباقية',
  icon = 'Cpu'
WHERE engine_code = 'M107';

UPDATE m92_engine_registry SET
  engine_name = 'BiometricGatewayEngine',
  engine_name_ar = 'بوابة الهوية الرقمية الموحدة والتوقيع البيومتري',
  category = 'security',
  department = 'الهوية والأمن',
  description = 'المصادقة البيومترية المتعددة واختبار الحيوية والتوقيع السيادي SHA3-512',
  icon = 'Fingerprint'
WHERE engine_code = 'M109';

-- SEED: Example M105 arbitration file
INSERT INTO m105_arbitration_files (file_number, file_title, file_type, stage, status, claimant_name, respondent_name, arbitration_type, seat_of_arbitration, governing_law, arbitration_rules, number_of_arbitrators, claim_amount, currency, conflict_check_passed, fee_estimate, fee_paid, m53_document_id, m54_finance_linked, m109_biometric_signed, m92_notified, cost_center_id)
VALUES ('ARB-2025-001', 'تحكيم تجاري - نزاع عقد توريد دولي', 'arbitration', 'constituted', 'active', 'شركة الأطلس التجارية', 'Global Trading Co.', 'international', 'باريس', 'القانون الفرنسي', 'ICC Rules 2021', 3, 2500000, 'SAR', true, 175000, 175000, 'DOC-M105-000001', true, true, true, 'CC-M105-001')
ON CONFLICT DO NOTHING;

INSERT INTO m105_audit_logs (case_id, action, actor, actor_role, detail, hash_chain)
SELECT id, 'arbitration_filed', 'النظام', 'النظام', 'إيداع طلب تحكيم تجاري دولي وفتح غرفة بيانات', '0x7e3a...f1b9'
FROM m105_arbitration_files WHERE file_number = 'ARB-2025-001' LIMIT 1
ON CONFLICT DO NOTHING;