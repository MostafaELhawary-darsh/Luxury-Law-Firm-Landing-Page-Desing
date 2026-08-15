-- M112: Self-Evolving Neural Memory / Knowledge Graph (الذاكرة العصبية المتطورة)
-- Replaces traditional RAG with a self-evolving knowledge graph linking entities across all 109 engines

-- Knowledge graph entities (nodes)
CREATE TABLE IF NOT EXISTS m112_neural_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id text NOT NULL,
  entity_type text NOT NULL,
  entity_name text NOT NULL,
  entity_name_ar text,
  source_engine text,
  source_table text,
  source_record_id text,
  embedding_vector float[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  encrypted boolean DEFAULT true,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE m112_neural_entities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m112_entities" ON m112_neural_entities;
CREATE POLICY "anon_select_m112_entities" ON m112_neural_entities FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m112_entities" ON m112_neural_entities;
CREATE POLICY "anon_insert_m112_entities" ON m112_neural_entities FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m112_entities" ON m112_neural_entities;
CREATE POLICY "anon_update_m112_entities" ON m112_neural_entities FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m112_entities" ON m112_neural_entities;
CREATE POLICY "anon_delete_m112_entities" ON m112_neural_entities FOR DELETE TO anon, authenticated USING (true);

-- Knowledge graph relations (edges)
CREATE TABLE IF NOT EXISTS m112_neural_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_entity_id uuid REFERENCES m112_neural_entities(id),
  target_entity_id uuid REFERENCES m112_neural_entities(id),
  relation_type text NOT NULL,
  relation_strength real DEFAULT 1.0,
  context text,
  evidence_engine text,
  evidence_record_id text,
  auto_generated boolean DEFAULT true,
  human_verified boolean DEFAULT false,
  encrypted boolean DEFAULT true,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE m112_neural_relations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m112_relations" ON m112_neural_relations;
CREATE POLICY "anon_select_m112_relations" ON m112_neural_relations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m112_relations" ON m112_neural_relations;
CREATE POLICY "anon_insert_m112_relations" ON m112_neural_relations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m112_relations" ON m112_neural_relations;
CREATE POLICY "anon_update_m112_relations" ON m112_neural_relations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m112_relations" ON m112_neural_relations;
CREATE POLICY "anon_delete_m112_relations" ON m112_neural_relations FOR DELETE TO anon, authenticated USING (true);

-- Evolution events (self-evolution log)
CREATE TABLE IF NOT EXISTS m112_neural_evolution (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evolution_type text NOT NULL,
  trigger_engine text,
  trigger_event text,
  entity_id_affected uuid,
  relation_id_affected uuid,
  proactive_action text,
  proactive_target_engine text,
  proactive_target_id text,
  executed boolean DEFAULT false,
  m102_integration boolean DEFAULT false,
  m92_notified boolean DEFAULT false,
  context_summary text,
  hash_chain text NOT NULL,
  previous_hash text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m112_neural_evolution ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m112_evolution" ON m112_neural_evolution;
CREATE POLICY "anon_select_m112_evolution" ON m112_neural_evolution FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m112_evolution" ON m112_neural_evolution;
CREATE POLICY "anon_insert_m112_evolution" ON m112_neural_evolution FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m112_evolution" ON m112_neural_evolution;
CREATE POLICY "anon_update_m112_evolution" ON m112_neural_evolution FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m112_evolution" ON m112_neural_evolution;
CREATE POLICY "anon_delete_m112_evolution" ON m112_neural_evolution FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_m112_entities_type ON m112_neural_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_m112_entities_source ON m112_neural_entities(source_engine);
CREATE INDEX IF NOT EXISTS idx_m112_relations_source ON m112_neural_relations(source_entity_id);
CREATE INDEX IF NOT EXISTS idx_m112_relations_target ON m112_neural_relations(target_entity_id);
CREATE INDEX IF NOT EXISTS idx_m112_relations_type ON m112_neural_relations(relation_type);
CREATE INDEX IF NOT EXISTS idx_m112_evolution_entity ON m112_neural_evolution(entity_id_affected);

-- Register M112 in M92 engine registry
INSERT INTO m92_engine_registry (engine_code, engine_name, engine_name_ar, category, department, description, icon) VALUES
  ('M112', 'NeuralMemoryEngine',
   'الذاكرة العصبية المتطورة والرسم البياني المعرفي',
   'ai', 'الذاكرة العصبية',
   'رسم بياني معرفي ذاتي التطور يربط الكيانات والعلاقات عبر المحركات الـ 109 مع تضمين متجهي واسترجاع دلالي',
   'BrainCircuit')
ON CONFLICT (engine_code) DO NOTHING;

-- Seed example entities
INSERT INTO m112_neural_entities (entity_id, entity_type, entity_name, entity_name_ar, source_engine, source_table, source_record_id, metadata, encrypted, active) VALUES
  ('CR-12345', 'company', 'Atlas Trading Co.', 'شركة الأطلس التجارية', 'M10', 'm10_cases', 'case-001', '{"vat_number":"300123456700003","sector":"trading"}'::jsonb, true, true),
  ('JUDG-2025-001', 'judgment', 'Commercial Dispute Ruling', 'حكم تجاري', 'M10', 'm10_cases', 'case-001', '{"court":"commercial","date":"2025-01-15"}'::jsonb, true, true),
  ('CONTRACT-001', 'contract', 'Supply Agreement', 'عقد توريد', 'M53', 'm53_documents', 'doc-001', '{"value":450000,"currency":"SAR"}'::jsonb, true, true),
  ('TAX-Q4-2024', 'tax_record', 'Q4 VAT Filing', 'إقرار ضريبي ربع سنوي', 'M85', 'm85_tax_records', 'tax-001', '{"period":"Q4-2024","amount":45000}'::jsonb, true, true),
  ('IOT-SENSOR-01', 'iot_sensor', 'Temperature Sensor', 'حساس حرارة', 'M107', 'm107_iot_devices', 'dev-001', '{"type":"temperature","location":"warehouse-A"}'::jsonb, true, true)
ON CONFLICT DO NOTHING;

-- Seed example relations
INSERT INTO m112_neural_relations (source_entity_id, target_entity_id, relation_type, relation_strength, context, evidence_engine, auto_generated, human_verified, encrypted, active)
SELECT e1.id, e2.id, 'subject_of', 0.95, 'الشركة طرف في الحكم التجاري', 'M10', true, false, true, true
FROM m112_neural_entities e1, m112_neural_entities e2
WHERE e1.entity_id = 'CR-12345' AND e2.entity_id = 'JUDG-2025-001'
ON CONFLICT DO NOTHING;

INSERT INTO m112_neural_relations (source_entity_id, target_entity_id, relation_type, relation_strength, context, evidence_engine, auto_generated, human_verified, encrypted, active)
SELECT e1.id, e2.id, 'governed_by', 0.90, 'العقد يخضع للحكم القضائي', 'M53', true, false, true, true
FROM m112_neural_entities e1, m112_neural_entities e2
WHERE e1.entity_id = 'CONTRACT-001' AND e2.entity_id = 'JUDG-2025-001'
ON CONFLICT DO NOTHING;

INSERT INTO m112_neural_relations (source_entity_id, target_entity_id, relation_type, relation_strength, context, evidence_engine, auto_generated, human_verified, encrypted, active)
SELECT e1.id, e2.id, 'tax_obligation', 0.85, 'الشركة ملزمة بالإقرار الضريبي', 'M85', true, false, true, true
FROM m112_neural_entities e1, m112_neural_entities e2
WHERE e1.entity_id = 'CR-12345' AND e2.entity_id = 'TAX-Q4-2024'
ON CONFLICT DO NOTHING;

INSERT INTO m112_neural_relations (source_entity_id, target_entity_id, relation_type, relation_strength, context, evidence_engine, auto_generated, human_verified, encrypted, active)
SELECT e1.id, e2.id, 'monitors', 0.80, 'الحساس يراقب مستودع الشركة', 'M107', true, false, true, true
FROM m112_neural_entities e1, m112_neural_entities e2
WHERE e1.entity_id = 'IOT-SENSOR-01' AND e2.entity_id = 'CR-12345'
ON CONFLICT DO NOTHING;

-- Seed example evolution event
INSERT INTO m112_neural_evolution (evolution_type, trigger_engine, trigger_event, entity_id_affected, proactive_action, proactive_target_engine, executed, m102_integration, m92_notified, context_summary, hash_chain, previous_hash)
SELECT 'relation_update', 'M10', 'new_judgment_added', e.id, 'notify_finance_tax_adjustment', 'M54', false, true, true, 'حكم قضائي جديد قد يؤثر على الالتزامات المالية للشركة', 'sha3-512:1a2b...3c4d', '0x0000...0000'
FROM m112_neural_entities e WHERE e.entity_id = 'JUDG-2025-001' LIMIT 1
ON CONFLICT DO NOTHING;