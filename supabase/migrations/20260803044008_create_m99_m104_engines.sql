-- M99: Shopping Malls, Commercial Centers & Lease Management Engine
CREATE TABLE IF NOT EXISTS m99_mall_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text DEFAULT 'lease',
  stage text DEFAULT 'draft',
  status text DEFAULT 'active',
  mall_name text,
  unit_number text,
  tenant_name text,
  tenant_type text,
  lease_type text,
  base_rent numeric DEFAULT 0,
  percentage_rent_rate numeric DEFAULT 0,
  pos_linked boolean DEFAULT false,
  monthly_sales numeric DEFAULT 0,
  cam_charges numeric DEFAULT 0,
  utility_charges numeric DEFAULT 0,
  ad_space_revenue numeric DEFAULT 0,
  lease_start date,
  lease_end date,
  renewal_notice_date date,
  eviction_flagged boolean DEFAULT false,
  eviction_reason text,
  civil_defense_approved boolean DEFAULT false,
  health_license_ref text,
  contract_value numeric DEFAULT 0,
  currency text DEFAULT 'SAR',
  description text,
  advisor_id uuid,
  m53_document_id text,
  m54_finance_linked boolean DEFAULT false,
  m85_tax_linked boolean DEFAULT false,
  m10_case_opened boolean DEFAULT false,
  m109_biometric_signed boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  cost_center_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE m99_mall_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m99" ON m99_mall_files;
CREATE POLICY "anon_select_m99" ON m99_mall_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m99" ON m99_mall_files;
CREATE POLICY "anon_insert_m99" ON m99_mall_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m99" ON m99_mall_files;
CREATE POLICY "anon_update_m99" ON m99_mall_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m99" ON m99_mall_files;
CREATE POLICY "anon_delete_m99" ON m99_mall_files FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m99_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m99_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m99_audit" ON m99_audit_logs;
CREATE POLICY "anon_select_m99_audit" ON m99_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m99_audit" ON m99_audit_logs;
CREATE POLICY "anon_insert_m99_audit" ON m99_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m99_audit" ON m99_audit_logs;
CREATE POLICY "anon_update_m99_audit" ON m99_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m99_audit" ON m99_audit_logs;
CREATE POLICY "anon_delete_m99_audit" ON m99_audit_logs FOR DELETE TO anon, authenticated USING (true);

-- M100: Public & Private Libraries, Archives & Knowledge Management Engine
CREATE TABLE IF NOT EXISTS m100_library_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text DEFAULT 'acquisition',
  stage text DEFAULT 'draft',
  status text DEFAULT 'active',
  library_name text,
  library_type text,
  isbn text,
  issn text,
  work_title text,
  author_name text,
  publisher_name text,
  acquisition_type text,
  acquisition_cost numeric DEFAULT 0,
  subscription_annual_fee numeric DEFAULT 0,
  currency text DEFAULT 'SAR',
  deposit_ref text,
  legal_deposit_confirmed boolean DEFAULT false,
  copyright_protected boolean DEFAULT false,
  ip_infringement_flagged boolean DEFAULT false,
  archive_type text,
  digitization_status text,
  classification_system text,
  shelf_number text,
  rare_manuscript boolean DEFAULT false,
  preservation_status text,
  description text,
  advisor_id uuid,
  m53_document_id text,
  m54_finance_linked boolean DEFAULT false,
  m80_ip_linked boolean DEFAULT false,
  m10_case_opened boolean DEFAULT false,
  m109_biometric_signed boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  cost_center_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE m100_library_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m100" ON m100_library_files;
CREATE POLICY "anon_select_m100" ON m100_library_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m100" ON m100_library_files;
CREATE POLICY "anon_insert_m100" ON m100_library_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m100" ON m100_library_files;
CREATE POLICY "anon_update_m100" ON m100_library_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m100" ON m100_library_files;
CREATE POLICY "anon_delete_m100" ON m100_library_files FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m100_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m100_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m100_audit" ON m100_audit_logs;
CREATE POLICY "anon_select_m100_audit" ON m100_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m100_audit" ON m100_audit_logs;
CREATE POLICY "anon_insert_m100_audit" ON m100_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m100_audit" ON m100_audit_logs;
CREATE POLICY "anon_update_m100_audit" ON m100_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m100_audit" ON m100_audit_logs;
CREATE POLICY "anon_delete_m100_audit" ON m100_audit_logs FOR DELETE TO anon, authenticated USING (true);

-- M101: Maintenance, Operations, Facility Management & Warranty Engine
CREATE TABLE IF NOT EXISTS m101_maintenance_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text DEFAULT 'maintenance',
  stage text DEFAULT 'draft',
  status text DEFAULT 'active',
  facility_name text,
  asset_name text,
  asset_serial text,
  maintenance_type text,
  sla_ref text,
  sla_response_hours numeric DEFAULT 0,
  sla_actual_hours numeric DEFAULT 0,
  sla_breach boolean DEFAULT false,
  penalty_amount numeric DEFAULT 0,
  warranty_ref text,
  warranty_expiry date,
  warranty_claim_flagged boolean DEFAULT false,
  parts_cost numeric DEFAULT 0,
  labor_cost numeric DEFAULT 0,
  total_cost numeric DEFAULT 0,
  currency text DEFAULT 'SAR',
  technician_name text,
  iot_sensor_id text,
  predictive_alert boolean DEFAULT false,
  compliance_certificate text,
  contractor_license text,
  description text,
  advisor_id uuid,
  m53_document_id text,
  m54_finance_linked boolean DEFAULT false,
  m107_iot_linked boolean DEFAULT false,
  m88_consumer_linked boolean DEFAULT false,
  m10_case_opened boolean DEFAULT false,
  m109_biometric_signed boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  cost_center_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE m101_maintenance_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m101" ON m101_maintenance_files;
CREATE POLICY "anon_select_m101" ON m101_maintenance_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m101" ON m101_maintenance_files;
CREATE POLICY "anon_insert_m101" ON m101_maintenance_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m101" ON m101_maintenance_files;
CREATE POLICY "anon_update_m101" ON m101_maintenance_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m101" ON m101_maintenance_files;
CREATE POLICY "anon_delete_m101" ON m101_maintenance_files FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m101_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m101_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m101_audit" ON m101_audit_logs;
CREATE POLICY "anon_select_m101_audit" ON m101_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m101_audit" ON m101_audit_logs;
CREATE POLICY "anon_insert_m101_audit" ON m101_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m101_audit" ON m101_audit_logs;
CREATE POLICY "anon_update_m101_audit" ON m101_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m101_audit" ON m101_audit_logs;
CREATE POLICY "anon_delete_m101_audit" ON m101_audit_logs FOR DELETE TO anon, authenticated USING (true);

-- M102: Interdepartmental Synergy & Integration Engine
CREATE TABLE IF NOT EXISTS m102_bridge_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text DEFAULT 'bridge',
  stage text DEFAULT 'draft',
  status text DEFAULT 'active',
  source_department text,
  target_department text,
  bridge_type text,
  event_trigger text,
  cluster_activated text[],
  parallel_tasks_count int DEFAULT 0,
  completed_tasks_count int DEFAULT 0,
  synergy_score numeric DEFAULT 0,
  conflict_flagged boolean DEFAULT false,
  conflict_detail text,
  kpi_label text,
  kpi_value text,
  description text,
  advisor_id uuid,
  m53_document_id text,
  m54_finance_linked boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  m109_biometric_signed boolean DEFAULT false,
  cost_center_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE m102_bridge_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m102" ON m102_bridge_files;
CREATE POLICY "anon_select_m102" ON m102_bridge_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m102" ON m102_bridge_files;
CREATE POLICY "anon_insert_m102" ON m102_bridge_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m102" ON m102_bridge_files;
CREATE POLICY "anon_update_m102" ON m102_bridge_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m102" ON m102_bridge_files;
CREATE POLICY "anon_delete_m102" ON m102_bridge_files FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m102_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m102_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m102_audit" ON m102_audit_logs;
CREATE POLICY "anon_select_m102_audit" ON m102_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m102_audit" ON m102_audit_logs;
CREATE POLICY "anon_insert_m102_audit" ON m102_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m102_audit" ON m102_audit_logs;
CREATE POLICY "anon_update_m102_audit" ON m102_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m102_audit" ON m102_audit_logs;
CREATE POLICY "anon_delete_m102_audit" ON m102_audit_logs FOR DELETE TO anon, authenticated USING (true);

-- M103: Quarries, Mines, Industrial Plants & Allied Enterprises Engine
CREATE TABLE IF NOT EXISTS m103_quarry_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text DEFAULT 'concession',
  stage text DEFAULT 'draft',
  status text DEFAULT 'active',
  quarry_name text,
  quarry_type text,
  concession_ref text,
  license_number text,
  license_type text,
  license_expiry date,
  gps_coordinates text,
  mineral_type text,
  extraction_volume numeric DEFAULT 0,
  royalty_rate numeric DEFAULT 0,
  royalty_amount numeric DEFAULT 0,
  currency text DEFAULT 'SAR',
  environmental_assessment_ref text,
  eia_approved boolean DEFAULT false,
  blasting_permit text,
  safety_compliance boolean DEFAULT false,
  incident_reported boolean DEFAULT false,
  supply_contract_ref text,
  contractor_name text,
  contract_value numeric DEFAULT 0,
  description text,
  advisor_id uuid,
  m53_document_id text,
  m54_finance_linked boolean DEFAULT false,
  m91_hse_linked boolean DEFAULT false,
  m107_iot_linked boolean DEFAULT false,
  m10_case_opened boolean DEFAULT false,
  m109_biometric_signed boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  cost_center_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE m103_quarry_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m103" ON m103_quarry_files;
CREATE POLICY "anon_select_m103" ON m103_quarry_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m103" ON m103_quarry_files;
CREATE POLICY "anon_insert_m103" ON m103_quarry_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m103" ON m103_quarry_files;
CREATE POLICY "anon_update_m103" ON m103_quarry_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m103" ON m103_quarry_files;
CREATE POLICY "anon_delete_m103" ON m103_quarry_files FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m103_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m103_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m103_audit" ON m103_audit_logs;
CREATE POLICY "anon_select_m103_audit" ON m103_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m103_audit" ON m103_audit_logs;
CREATE POLICY "anon_insert_m103_audit" ON m103_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m103_audit" ON m103_audit_logs;
CREATE POLICY "anon_update_m103_audit" ON m103_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m103_audit" ON m103_audit_logs;
CREATE POLICY "anon_delete_m103_audit" ON m103_audit_logs FOR DELETE TO anon, authenticated USING (true);

-- M104: Ceramics, Porcelain & Clay Products Manufacturing & Trade Engine
CREATE TABLE IF NOT EXISTS m104_ceramics_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text NOT NULL,
  file_title text NOT NULL,
  file_type text DEFAULT 'production',
  stage text DEFAULT 'draft',
  status text DEFAULT 'active',
  factory_name text,
  production_line text,
  license_number text,
  license_type text,
  product_type text,
  design_patent_ref text,
  raw_material_source text,
  clay_supplier text,
  feldspar_supplier text,
  energy_type text,
  gas_contract_ref text,
  energy_consumption numeric DEFAULT 0,
  production_capacity numeric DEFAULT 0,
  local_content_percentage numeric DEFAULT 0,
  export_certificate text,
  origin_certificate text,
  distribution_partner text,
  contract_value numeric DEFAULT 0,
  currency text DEFAULT 'SAR',
  description text,
  advisor_id uuid,
  m53_document_id text,
  m54_finance_linked boolean DEFAULT false,
  m80_ip_linked boolean DEFAULT false,
  m90_trade_linked boolean DEFAULT false,
  m103_quarry_linked boolean DEFAULT false,
  m10_case_opened boolean DEFAULT false,
  m109_biometric_signed boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  cost_center_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE m104_ceramics_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m104" ON m104_ceramics_files;
CREATE POLICY "anon_select_m104" ON m104_ceramics_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m104" ON m104_ceramics_files;
CREATE POLICY "anon_insert_m104" ON m104_ceramics_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m104" ON m104_ceramics_files;
CREATE POLICY "anon_update_m104" ON m104_ceramics_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m104" ON m104_ceramics_files;
CREATE POLICY "anon_delete_m104" ON m104_ceramics_files FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS m104_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  action text NOT NULL,
  actor text,
  actor_role text,
  detail text,
  hash_chain text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m104_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m104_audit" ON m104_audit_logs;
CREATE POLICY "anon_select_m104_audit" ON m104_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m104_audit" ON m104_audit_logs;
CREATE POLICY "anon_insert_m104_audit" ON m104_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m104_audit" ON m104_audit_logs;
CREATE POLICY "anon_update_m104_audit" ON m104_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m104_audit" ON m104_audit_logs;
CREATE POLICY "anon_delete_m104_audit" ON m104_audit_logs FOR DELETE TO anon, authenticated USING (true);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_m99_files_stage ON m99_mall_files(stage);
CREATE INDEX IF NOT EXISTS idx_m100_files_stage ON m100_library_files(stage);
CREATE INDEX IF NOT EXISTS idx_m101_files_stage ON m101_maintenance_files(stage);
CREATE INDEX IF NOT EXISTS idx_m102_files_stage ON m102_bridge_files(stage);
CREATE INDEX IF NOT EXISTS idx_m103_files_stage ON m103_quarry_files(stage);
CREATE INDEX IF NOT EXISTS idx_m104_files_stage ON m104_ceramics_files(stage);
CREATE INDEX IF NOT EXISTS idx_m99_audit_case ON m99_audit_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_m100_audit_case ON m100_audit_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_m101_audit_case ON m101_audit_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_m102_audit_case ON m102_audit_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_m103_audit_case ON m103_audit_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_m104_audit_case ON m104_audit_logs(case_id);

-- Register M99-M104 in the M92 engine registry
INSERT INTO m92_engine_registry (engine_code, engine_name, engine_name_ar, category, department, description, icon) VALUES
  ('M99',  'ShoppingMallEngine',     'إدارة المولات والمراكز التجارية والإيجارات', 'real-estate', 'العقارات التجارية', 'عقود الإيجار التجاري ونسبة المبيعات ورسوم CAM', 'ShoppingBag'),
  ('M100', 'LibraryArchiveEngine',   'المكتبات العامة والخاصة والأرشيف الرقمي',     'knowledge',  'المعرفة والأرشيف', 'الإيداع القانوني والترقيم الدولي وحماية حقوق المؤلف', 'Library'),
  ('M101', 'MaintenanceWarrantyEngine', 'الصيانة والتشغيل وإدارة المرافق والضمان', 'operations', 'الصيانة والتشغيل', 'عقود O&M وSLA والصيانة الوقائية ومطالبات الضمان', 'Wrench'),
  ('M102', 'IntegrationSynergyEngine',  'التكامل والتناغم المؤسسي العابر',         'orchestration', 'التكامل الإداري', 'الجسور البينية والنبضات التشغيلية بين الإدارات', 'Network'),
  ('M103', 'QuarriesMiningEngine',       'المحاجر والمناجم والمصانع التعدينية',     'sectoral',   'التعدين', 'تراخيص الاستكشاف والإتاوات والامتثال البيئي', 'Mountain'),
  ('M104', 'CeramicsPorcelainEngine',    'صناعة وتجارة السيراميك والبورسلين',        'sectoral',   'السيراميك', 'تراخيص المصانع وحماية التصاميم وتوريد الخامات', 'Grid2x2')
ON CONFLICT (engine_code) DO NOTHING;

-- Update M101 entry that was previously seeded with minimal info
UPDATE m92_engine_registry
  SET engine_name = 'MaintenanceWarrantyEngine',
      engine_name_ar = 'الصيانة والتشغيل وإدارة المرافق والضمان',
      category = 'operations',
      department = 'الصيانة والتشغيل',
      description = 'عقود O&M وSLA والصيانة الوقائية ومطالبات الضمان',
      icon = 'Wrench'
WHERE engine_code = 'M101';

-- SEED: Example M99 lease file
INSERT INTO m99_mall_files (file_number, file_title, file_type, stage, status, mall_name, unit_number, tenant_name, tenant_type, lease_type, base_rent, percentage_rent_rate, pos_linked, monthly_sales, cam_charges, currency, contract_value, m53_document_id, m54_finance_linked, m109_biometric_signed, m92_notified, cost_center_id)
VALUES ('MALL-2025-001', 'عقد إيجار متجر Zara - مول العرب', 'lease', 'executed', 'active', 'مول العرب', 'A-204', 'Zara', 'anchor', 'percentage', 15000, 8, true, 280000, 3500, 'SAR', 50000, 'DOC-M99-000001', true, true, true, 'CC-M99-001')
ON CONFLICT DO NOTHING;

INSERT INTO m99_audit_logs (case_id, action, actor, actor_role, detail, hash_chain)
SELECT id, 'lease_created', 'النظام', 'النظام', 'إنشاء عقد إيجار تجاري لمتجر Zara في مول العرب', '0x4a1b...c3d2'
FROM m99_mall_files WHERE file_number = 'MALL-2025-001' LIMIT 1
ON CONFLICT DO NOTHING;