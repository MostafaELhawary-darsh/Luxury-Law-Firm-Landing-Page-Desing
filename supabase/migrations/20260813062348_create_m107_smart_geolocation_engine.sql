-- M107: Smart Geolocation & Field Task Operations Engine
-- محرك الموقع الجغرافي الذكي ومهام الميدان
-- Bridges GPS data with M6 (Case Agenda), M89 (Tasks), M90 (Logistics/Weather), M92 (Omni-Agent), M97 (HR)

-- ===== Geofence Zones =====
CREATE TABLE IF NOT EXISTS m107_geofence_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text,
  zone_type text NOT NULL DEFAULT 'COURT',
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  radius_meters double precision DEFAULT 150.0,
  address text,
  active boolean DEFAULT true,
  linked_task_id text,
  linked_case_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE m107_geofence_zones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m107_zones" ON m107_geofence_zones;
CREATE POLICY "anon_select_m107_zones" ON m107_geofence_zones FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m107_zones" ON m107_geofence_zones;
CREATE POLICY "anon_insert_m107_zones" ON m107_geofence_zones FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m107_zones" ON m107_geofence_zones;
CREATE POLICY "anon_update_m107_zones" ON m107_geofence_zones FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m107_zones" ON m107_geofence_zones;
CREATE POLICY "anon_delete_m107_zones" ON m107_geofence_zones FOR DELETE TO anon, authenticated USING (true);

-- ===== Field Attendance Logs =====
CREATE TABLE IF NOT EXISTS m107_field_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  user_name text,
  zone_id uuid REFERENCES m107_geofence_zones(id) ON DELETE CASCADE,
  zone_name text,
  event_type text NOT NULL DEFAULT 'ENTRY_CHECKIN',
  latitude double precision,
  longitude double precision,
  distance_meters double precision,
  verified_via_geofence boolean DEFAULT true,
  timestamp timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE m107_field_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m107_attendance" ON m107_field_attendance;
CREATE POLICY "anon_select_m107_attendance" ON m107_field_attendance FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m107_attendance" ON m107_field_attendance;
CREATE POLICY "anon_insert_m107_attendance" ON m107_field_attendance FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m107_attendance" ON m107_field_attendance;
CREATE POLICY "anon_update_m107_attendance" ON m107_field_attendance FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m107_attendance" ON m107_field_attendance;
CREATE POLICY "anon_delete_m107_attendance" ON m107_field_attendance FOR DELETE TO anon, authenticated USING (true);

-- ===== Task Presence Records =====
CREATE TABLE IF NOT EXISTS m107_task_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id text NOT NULL,
  user_id text NOT NULL,
  user_name text,
  zone_id uuid REFERENCES m107_geofence_zones(id) ON DELETE CASCADE,
  zone_name text,
  arrival_time timestamptz,
  departure_time timestamptz,
  status text NOT NULL DEFAULT 'ON_SITE',
  distance_meters double precision,
  estimated_travel_min int,
  delay_risk_min int DEFAULT 0,
  delay_alert_sent boolean DEFAULT false,
  traffic_index int DEFAULT 0,
  weather_alert text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE m107_task_presence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m107_presence" ON m107_task_presence;
CREATE POLICY "anon_select_m107_presence" ON m107_task_presence FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m107_presence" ON m107_task_presence;
CREATE POLICY "anon_insert_m107_presence" ON m107_task_presence FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m107_presence" ON m107_task_presence;
CREATE POLICY "anon_update_m107_presence" ON m107_task_presence FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m107_presence" ON m107_task_presence;
CREATE POLICY "anon_delete_m107_presence" ON m107_task_presence FOR DELETE TO anon, authenticated USING (true);

-- ===== Route Alerts =====
CREATE TABLE IF NOT EXISTS m107_route_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  user_name text,
  task_id text,
  zone_id uuid REFERENCES m107_geofence_zones(id) ON DELETE CASCADE,
  zone_name text,
  alert_type text NOT NULL DEFAULT 'TRAFFIC_DELAY',
  severity text NOT NULL DEFAULT 'warning',
  message text NOT NULL,
  estimated_delay_min int DEFAULT 0,
  traffic_index int DEFAULT 0,
  weather_condition text,
  departure_needed_at timestamptz,
  session_time timestamptz,
  acknowledged boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m107_route_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m107_alerts" ON m107_route_alerts;
CREATE POLICY "anon_select_m107_alerts" ON m107_route_alerts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m107_alerts" ON m107_route_alerts;
CREATE POLICY "anon_insert_m107_alerts" ON m107_route_alerts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m107_alerts" ON m107_route_alerts;
CREATE POLICY "anon_update_m107_alerts" ON m107_route_alerts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m107_alerts" ON m107_route_alerts;
CREATE POLICY "anon_delete_m107_alerts" ON m107_route_alerts FOR DELETE TO anon, authenticated USING (true);

-- ===== Indexes =====
CREATE INDEX IF NOT EXISTS idx_m107_zones_type ON m107_geofence_zones(zone_type);
CREATE INDEX IF NOT EXISTS idx_m107_zones_active ON m107_geofence_zones(active);
CREATE INDEX IF NOT EXISTS idx_m107_attendance_user ON m107_field_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_m107_attendance_zone ON m107_field_attendance(zone_id);
CREATE INDEX IF NOT EXISTS idx_m107_attendance_ts ON m107_field_attendance(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_m107_presence_task ON m107_task_presence(task_id);
CREATE INDEX IF NOT EXISTS idx_m107_presence_user ON m107_task_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_m107_presence_status ON m107_task_presence(status);
CREATE INDEX IF NOT EXISTS idx_m107_alerts_user ON m107_route_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_m107_alerts_ack ON m107_route_alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_m107_alerts_created ON m107_route_alerts(created_at DESC);

-- ===== Register M107 in M92 engine registry =====
INSERT INTO m92_engine_registry (engine_code, engine_name, engine_name_ar, category, department, description, icon) VALUES
  ('M107', 'SmartGeoLocationEngine',
   'محرك الموقع الجغرافي الذكي ومهام الميدان',
   'operations', 'العمليات الميدانية',
   'ربط بيانات GPS والمواقع الجغرافية مع مهام الميدان والحضور والانصراف وتنبيهات الطريق والطقس',
   'MapPin')
ON CONFLICT (engine_code) DO NOTHING;

-- ===== Seed geofence zones =====
INSERT INTO m107_geofence_zones (name, name_en, zone_type, latitude, longitude, radius_meters, address, active) VALUES
  ('محكمة النقض', 'Court of Cassation', 'COURT', 30.0626, 31.2497, 200.0, 'القاهرة، مصر', true),
  ('محكمة استئناف القاهرة', 'Cairo Appeal Court', 'COURT', 30.0511, 31.2461, 200.0, 'القاهرة، مصر', true),
  ('محكمة جنوب القاهرة', 'South Cairo Court', 'COURT', 30.0330, 31.2339, 150.0, 'القاهرة، مصر', true),
  ('مقر المؤسسة الرئيسي', 'Firm Headquarters', 'FIRM_HQ', 30.0478, 31.2403, 100.0, 'القاهرة، مصر', true),
  ('مكتب الخبير هاني فؤاد', 'Expert Office - Hani Fouad', 'EXPERT_OFFICE', 30.0806, 31.2969, 150.0, 'القاهرة، مصر', true),
  ('محكمة استئناف الإسكندرية', 'Alexandria Appeal Court', 'COURT', 31.2156, 29.9554, 200.0, 'الإسكندرية، مصر', true),
  ('محكمة شمال القاهرة', 'North Cairo Court', 'COURT', 30.0782, 31.2969, 150.0, 'القاهرة، مصر', true),
  ('مكتب عميل - شركة الأطلس', 'Client Office - Atlas Corp', 'CLIENT_OFFICE', 30.0131, 31.2089, 150.0, 'الجيزة، مصر', true)
ON CONFLICT DO NOTHING;

-- ===== Seed sample attendance =====
INSERT INTO m107_field_attendance (user_id, user_name, zone_id, zone_name, event_type, latitude, longitude, distance_meters, verified_via_geofence, timestamp) VALUES
  ('usr-001', 'أحمد الشناوي', (SELECT id FROM m107_geofence_zones WHERE name_en = 'Firm Headquarters' LIMIT 1), 'مقر المؤسسة الرئيسي', 'ENTRY_CHECKIN', 30.0478, 31.2403, 45.0, true, now() - interval '3 hours'),
  ('usr-002', 'منى عبد الرحمن', (SELECT id FROM m107_geofence_zones WHERE name_en = 'Cairo Appeal Court' LIMIT 1), 'محكمة استئناف القاهرة', 'ENTRY_CHECKIN', 30.0511, 31.2461, 120.0, true, now() - interval '1 hour'),
  ('usr-001', 'أحمد الشناوي', (SELECT id FROM m107_geofence_zones WHERE name_en = 'Firm Headquarters' LIMIT 1), 'مقر المؤسسة الرئيسي', 'EXIT_CHECKOUT', 30.0480, 31.2405, 180.0, true, now() - interval '2 hours')
ON CONFLICT DO NOTHING;

-- ===== Seed sample task presence =====
INSERT INTO m107_task_presence (task_id, user_id, user_name, zone_id, zone_name, arrival_time, status, distance_meters, estimated_travel_min, delay_risk_min, traffic_index) VALUES
  ('task-1024', 'usr-002', 'منى عبد الرحمن', (SELECT id FROM m107_geofence_zones WHERE name_en = 'Cairo Appeal Court' LIMIT 1), 'محكمة استئناف القاهرة', now() - interval '1 hour', 'ON_SITE', 120.0, 35, 0, 2),
  ('task-1025', 'usr-003', 'خالد منصور', (SELECT id FROM m107_geofence_zones WHERE name_en = 'Court of Cassation' LIMIT 1), 'محكمة النقض', NULL, 'DELAYED_BY_TRAFFIC', 8500.0, 55, 20, 8),
  ('task-1026', 'usr-001', 'أحمد الشناوي', (SELECT id FROM m107_geofence_zones WHERE name_en = 'Expert Office - Hani Fouad' LIMIT 1), 'مكتب الخبير هاني فؤاد', now() - interval '30 minutes', 'ON_SITE', 80.0, 20, 0, 1)
ON CONFLICT DO NOTHING;

-- ===== Seed sample route alert =====
INSERT INTO m107_route_alerts (user_id, user_name, task_id, zone_id, zone_name, alert_type, severity, message, estimated_delay_min, traffic_index, weather_condition, departure_needed_at, session_time, acknowledged) VALUES
  ('usr-003', 'خالد منصور', 'task-1025', (SELECT id FROM m107_geofence_zones WHERE name_en = 'Court of Cassation' LIMIT 1), 'محكمة النقض', 'TRAFFIC_DELAY', 'critical', 'ازدحام مروري كثيف على طريق محكمة النقض. اغادر فوراً للوصول لجلسة الساعة 10:00 صباحاً.', 20, 8, 'مشمس', now() - interval '40 minutes', now() + interval '20 minutes', false),
  ('usr-002', 'منى عبد الرحمن', 'task-1024', (SELECT id FROM m107_geofence_zones WHERE name_en = 'Cairo Appeal Court' LIMIT 1), 'محكمة استئناف القاهرة', 'WEATHER_ALERT', 'warning', 'تنبيه طقس: رياح شديدة في منطقة محكمة استئناف القاهرة. يرجى الحذر عند الانتقال.', 0, 3, 'رياح شديدة', now() - interval '2 hours', now() - interval '1 hour', true)
ON CONFLICT DO NOTHING;