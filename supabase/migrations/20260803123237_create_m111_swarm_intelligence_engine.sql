-- M111: Decentralized AI Swarm Intelligence (الذكاء الاصطناعي العنقودي اللامركزي)
-- Replaces single-maestro bottleneck with autonomous sector sub-agents coordinated by M92

-- Sector clusters (12 clusters for 109 engines)
CREATE TABLE IF NOT EXISTS m111_swarm_clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_code text NOT NULL UNIQUE,
  cluster_name text NOT NULL,
  cluster_name_ar text NOT NULL,
  cluster_type text NOT NULL,
  sub_agent_name text,
  sub_agent_name_ar text,
  engines_linked text[] DEFAULT '{}',
  autonomous_scope text,
  decision_authority text DEFAULT 'advisory',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE m111_swarm_clusters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m111_clusters" ON m111_swarm_clusters;
CREATE POLICY "anon_select_m111_clusters" ON m111_swarm_clusters FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m111_clusters" ON m111_swarm_clusters;
CREATE POLICY "anon_insert_m111_clusters" ON m111_swarm_clusters FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m111_clusters" ON m111_swarm_clusters;
CREATE POLICY "anon_update_m111_clusters" ON m111_swarm_clusters FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m111_clusters" ON m111_swarm_clusters;
CREATE POLICY "anon_delete_m111_clusters" ON m111_swarm_clusters FOR DELETE TO anon, authenticated USING (true);

-- Swarm missions (decomposed tasks from M92)
CREATE TABLE IF NOT EXISTS m111_swarm_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_number text NOT NULL,
  mission_title text NOT NULL,
  cluster_id uuid REFERENCES m111_swarm_clusters(id),
  cluster_code text,
  commander_id text,
  parent_mission_id uuid,
  status text DEFAULT 'decomposed',
  priority text DEFAULT 'normal',
  decomposed_tasks jsonb,
  execution_plan text,
  autonomous_execution boolean DEFAULT false,
  result_fingerprint text,
  result_summary text,
  encrypted boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  m109_biometric_required boolean DEFAULT false,
  m109_biometric_signed boolean DEFAULT false,
  scope_permissions text[] DEFAULT '{}',
  knowledge_graph_refs text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE m111_swarm_missions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m111_missions" ON m111_swarm_missions;
CREATE POLICY "anon_select_m111_missions" ON m111_swarm_missions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m111_missions" ON m111_swarm_missions;
CREATE POLICY "anon_insert_m111_missions" ON m111_swarm_missions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m111_missions" ON m111_swarm_missions;
CREATE POLICY "anon_update_m111_missions" ON m111_swarm_missions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m111_missions" ON m111_swarm_missions;
CREATE POLICY "anon_delete_m111_missions" ON m111_swarm_missions FOR DELETE TO anon, authenticated USING (true);

-- Inter-agent communication bus logs
CREATE TABLE IF NOT EXISTS m111_swarm_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid,
  from_cluster text NOT NULL,
  to_cluster text,
  message_type text NOT NULL,
  message_content text,
  encrypted boolean DEFAULT true,
  hash_chain text NOT NULL,
  previous_hash text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m111_swarm_communications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m111_comms" ON m111_swarm_communications;
CREATE POLICY "anon_select_m111_comms" ON m111_swarm_communications FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m111_comms" ON m111_swarm_communications;
CREATE POLICY "anon_insert_m111_comms" ON m111_swarm_communications FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m111_comms" ON m111_swarm_communications;
CREATE POLICY "anon_update_m111_comms" ON m111_swarm_communications FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m111_comms" ON m111_swarm_communications;
CREATE POLICY "anon_delete_m111_comms" ON m111_swarm_communications FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m111_missions_cluster ON m111_swarm_missions(cluster_id);
CREATE INDEX IF NOT EXISTS idx_m111_missions_status ON m111_swarm_missions(status);
CREATE INDEX IF NOT EXISTS idx_m111_comms_mission ON m111_swarm_communications(mission_id);

-- Register M111 in M92 engine registry
INSERT INTO m92_engine_registry (engine_code, engine_name, engine_name_ar, category, department, description, icon) VALUES
  ('M111', 'SwarmIntelligenceEngine',
   'الذكاء الاصطناعي العنقودي اللامركزي',
   'ai', 'التنسيق المركزي',
   'نظام ذكاء اصطناعي عنقودي لامركزي يوزع المهام على وكلاء فرعيين قطاعيين مستقلين تحت إشراف M92',
   'Network')
ON CONFLICT (engine_code) DO NOTHING;

-- Seed 12 sector clusters
INSERT INTO m111_swarm_clusters (cluster_code, cluster_name, cluster_name_ar, cluster_type, sub_agent_name, sub_agent_name_ar, engines_linked, autonomous_scope, decision_authority, active) VALUES
  ('JUD', 'Judicial Cluster', 'العنقود القضائي', 'judicial', 'Judicial Sub-Agent', 'الوكيل القضائي الفرعي', ARRAY['M01','M02','M03','M04','M05','M09','M10'], 'التراخيص القضائية وإجراءات التقاضي', 'autonomous', true),
  ('FIN', 'Financial Cluster', 'العنقود المالي', 'financial', 'Financial Sub-Agent', 'الوكيل المالي الفرعي', ARRAY['M54','M85','M86','M87','M88'], 'الحسابات والاعتمادات المستندية', 'autonomous', true),
  ('IP', 'IP & Technology Cluster', 'عنقود الملكية الفكرية', 'ip_tech', 'IP Sub-Agent', 'الوكيل الفرعي للملكية الفكرية', ARRAY['M11','M12','M13','M14','M15','M16','M17'], 'براءات الاختراع والعلامات التجارية', 'autonomous', true),
  ('CORP', 'Corporate Cluster', 'العنقود المؤسسي', 'corporate', 'Corporate Sub-Agent', 'الوكيل المؤسسي الفرعي', ARRAY['M18','M19','M20','M21','M22'], 'التأسيس والاندماج والاستحواذ', 'autonomous', true),
  ('TRADE', 'Trade & Logistics Cluster', 'عنقود التجارة والخدمات', 'trade', 'Trade Sub-Agent', 'الوكيل التجاري الفرعي', ARRAY['M23','M24','M25','M26','M27','M28'], 'الاستيراد والتصدير والخدمات اللوجستية', 'autonomous', true),
  ('CIVIL', 'Civil & Obligations Cluster', 'عنقود الالتزامات', 'civil', 'Civil Sub-Agent', 'الوكيل المدني الفرعي', ARRAY['M29','M30','M31','M32','M33','M34'], 'العقود المدنية والالتزامات', 'autonomous', true),
  ('SECTOR', 'Sectoral Cluster', 'العنقود القطاعي', 'sectoral', 'Sectoral Sub-Agent', 'الوكيل القطاعي الفرعي', ARRAY['M35','M36','M37','M38','M39','M40'], 'القطاعات الصناعية والخدمية', 'autonomous', true),
  ('GOV', 'Governance Cluster', 'عنقود الحوكمة', 'governance', 'Governance Sub-Agent', 'الوكيل الفرعي للحوكمة', ARRAY['M41','M42','M43','M44','M45','M46'], 'الحوكمة المؤسسية والمجالس', 'advisory', true),
  ('INFRA', 'Infrastructure Cluster', 'عنقود البنية التحتية', 'infrastructure', 'Infra Sub-Agent', 'الوكيل الفرعي للبنية التحتية', ARRAY['M47','M48','M49','M50','M51','M52','M53','M105','M106','M107','M108','M109','M110'], 'البنية التحتية والأرشيف والبوابات', 'autonomous', true),
  ('OPS', 'Operations Cluster', 'عنقود العمليات', 'operations', 'Operations Sub-Agent', 'الوكيل الفرعي للعمليات', ARRAY['M54','M55','M56','M57','M58','M59','M60'], 'العمليات الداخلية وإدارة المهام', 'autonomous', true),
  ('LEGAL_OPS', 'Legal Operations Cluster', 'عنقود العمليات القانونية', 'legal_ops', 'Legal Ops Sub-Agent', 'الوكيل الفرعي للعمليات القانونية', ARRAY['M61','M62','M63','M64','M65','M66','M67','M68','M69','M70','M71','M72','M73','M74','M75'], 'العمليات القانونية المتخصصة', 'autonomous', true),
  ('GOV_OPS', 'Government Operations Cluster', 'عنقود العمليات الحكومية', 'gov_ops', 'Gov Ops Sub-Agent', 'الوكيل الفرعي للعمليات الحكومية', ARRAY['M76','M77','M78','M79','M80','M81','M82','M83','M84','M89','M90','M91','M92','M93','M94','M95','M96','M97','M98','M99','M100','M101','M102','M103','M104'], 'العمليات الحكومية والسيادية', 'autonomous', true)
ON CONFLICT (cluster_code) DO NOTHING;

-- Seed example mission
INSERT INTO m111_swarm_missions (mission_number, mission_title, cluster_id, cluster_code, commander_id, status, priority, decomposed_tasks, execution_plan, autonomous_execution, encrypted, m92_notified, scope_permissions, knowledge_graph_refs)
SELECT 'MSN-2025-001', 'تأسيس مصنع أدوية وتأمين شحنة مواد خام', c.id, 'CORP', 'M92', 'executing', 'critical',
  '[{"cluster":"CORP","task":"التراخيص الصناعية","engine":"M18"},{"cluster":"FIN","task":"الاعتمادات المستندية","engine":"M54"},{"cluster":"TRADE","task":"الاستيراد الجمركي","engine":"M90"},{"cluster":"INFRA","task":"مراقبة الإنتاج IoT","engine":"M107"}]'::jsonb,
  'تفكيك الأمر إلى 4 مهام قطاعية موازية', true, true, true, ARRAY['corporate_founding','trade_import','finance_lc','iot_monitor'], '{}'
FROM m111_swarm_clusters c WHERE c.cluster_code = 'CORP' LIMIT 1
ON CONFLICT DO NOTHING;

-- Seed example communications
INSERT INTO m111_swarm_communications (mission_id, from_cluster, to_cluster, message_type, message_content, encrypted, hash_chain, previous_hash)
SELECT m.id, 'M92', 'CORP', 'decompose', 'تفكيك الأمر إلى مهام قطاعية', true, 'sha3-512:1a2b...3c4d', '0x0000...0000'
FROM m111_swarm_missions m WHERE m.mission_number = 'MSN-2025-001' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO m111_swarm_communications (mission_id, from_cluster, to_cluster, message_type, message_content, encrypted, hash_chain, previous_hash)
SELECT m.id, 'CORP', 'FIN', 'delegate', 'تفويض مهمة الاعتمادات المستندية', true, 'sha3-512:2b3c...4d5e', 'sha3-512:1a2b...3c4d'
FROM m111_swarm_missions m WHERE m.mission_number = 'MSN-2025-001' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO m111_swarm_communications (mission_id, from_cluster, to_cluster, message_type, message_content, encrypted, hash_chain, previous_hash)
SELECT m.id, 'FIN', 'M92', 'result', 'اكتمال الاعتماد المستندي بنجاح', true, 'sha3-512:3c4d...5e6f', 'sha3-512:2b3c...4d5e'
FROM m111_swarm_missions m WHERE m.mission_number = 'MSN-2025-001' LIMIT 1
ON CONFLICT DO NOTHING;