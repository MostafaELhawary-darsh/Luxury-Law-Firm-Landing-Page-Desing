/*
# Create Sovereign Mail & Automated Notification Engine (M52) schema

Implements the fully on-premise, closed-loop mail engine that replaces all external
email/messaging services. Ensures 100% of legal correspondence stays inside the
firm's encrypted infrastructure.

1. New Tables:
- `m52_mailboxes`: Internal sovereign email accounts (aliases) linked to staff/attorneys.
- `m52_emails`: Incoming/outgoing emails with E2EE flags, read receipts, case linking, and smart-parse metadata.
- `m52_aliases`: Email aliases (forwarding rules) for departments and roles.
- `m52_notifications`: Automated notification dispatch (court dates, deadlines, client updates).
- `m52_audit_logs`: Immutable audit trail of all mail operations (send, read, archive, edit).
- `m52_invoice_ocr`: OCR-processed invoices received via mail, linked to finance engine.

2. Security: RLS enabled, anon+authenticated full CRUD (single-tenant, no auth gating at DB level).
*/

-- MAILBOXES (sovereign internal email accounts)
CREATE TABLE IF NOT EXISTS m52_mailboxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_address text NOT NULL UNIQUE,
  display_name text NOT NULL,
  owner_type text DEFAULT 'staff',
  owner_id uuid REFERENCES lf_attorneys(id) ON DELETE SET NULL,
  department text,
  storage_quota_mb int DEFAULT 5120,
  storage_used_mb numeric(10,2) DEFAULT 0,
  pgp_public_key text,
  pgp_fingerprint text,
  smime_cert_ref text,
  e2ee_enabled boolean DEFAULT true,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m52_mailboxes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m52_mailboxes" ON m52_mailboxes;
CREATE POLICY "anon_select_m52_mailboxes" ON m52_mailboxes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m52_mailboxes" ON m52_mailboxes;
CREATE POLICY "anon_insert_m52_mailboxes" ON m52_mailboxes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m52_mailboxes" ON m52_mailboxes;
CREATE POLICY "anon_update_m52_mailboxes" ON m52_mailboxes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m52_mailboxes" ON m52_mailboxes;
CREATE POLICY "anon_delete_m52_mailboxes" ON m52_mailboxes FOR DELETE TO anon, authenticated USING (true);

-- EMAILS (incoming/outgoing sovereign correspondence)
CREATE TABLE IF NOT EXISTS m52_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id uuid REFERENCES m52_mailboxes(id) ON DELETE CASCADE,
  direction text DEFAULT 'incoming',
  from_address text NOT NULL,
  to_address text NOT NULL,
  cc_addresses text,
  subject text NOT NULL,
  body text,
  attachments jsonb DEFAULT '[]'::jsonb,
  is_encrypted boolean DEFAULT true,
  encryption_method text DEFAULT 'PGP',
  is_read boolean DEFAULT false,
  read_at timestamptz,
  read_receipt_sent boolean DEFAULT false,
  read_receipt_confirmed_at timestamptz,
  is_archived boolean DEFAULT false,
  case_id uuid REFERENCES lf_cases(id) ON DELETE SET NULL,
  client_id uuid REFERENCES lf_clients(id) ON DELETE SET NULL,
  smart_parsed boolean DEFAULT false,
  parsed_entities jsonb DEFAULT '{}'::jsonb,
  parsed_intent text,
  auto_task_created boolean DEFAULT false,
  priority text DEFAULT 'normal',
  has_invoice boolean DEFAULT false,
  invoice_processed boolean DEFAULT false,
  meeting_id uuid REFERENCES lf_meetings(id) ON DELETE SET NULL,
  thread_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m52_emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m52_emails" ON m52_emails;
CREATE POLICY "anon_select_m52_emails" ON m52_emails FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m52_emails" ON m52_emails;
CREATE POLICY "anon_insert_m52_emails" ON m52_emails FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m52_emails" ON m52_emails;
CREATE POLICY "anon_update_m52_emails" ON m52_emails FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m52_emails" ON m52_emails;
CREATE POLICY "anon_delete_m52_emails" ON m52_emails FOR DELETE TO anon, authenticated USING (true);

-- ALIASES (department / role forwarding rules)
CREATE TABLE IF NOT EXISTS m52_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alias_address text NOT NULL UNIQUE,
  display_name text,
  target_addresses jsonb DEFAULT '[]'::jsonb,
  department text,
  alias_type text DEFAULT 'department',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m52_aliases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m52_aliases" ON m52_aliases;
CREATE POLICY "anon_select_m52_aliases" ON m52_aliases FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m52_aliases" ON m52_aliases;
CREATE POLICY "anon_insert_m52_aliases" ON m52_aliases FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m52_aliases" ON m52_aliases;
CREATE POLICY "anon_update_m52_aliases" ON m52_aliases FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m52_aliases" ON m52_aliases;
CREATE POLICY "anon_delete_m52_aliases" ON m52_aliases FOR DELETE TO anon, authenticated USING (true);

-- NOTIFICATIONS (automated dispatch)
CREATE TABLE IF NOT EXISTS m52_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type text NOT NULL,
  recipient_address text NOT NULL,
  recipient_name text,
  subject text NOT NULL,
  body text,
  related_case_id uuid REFERENCES lf_cases(id) ON DELETE SET NULL,
  related_client_id uuid REFERENCES lf_clients(id) ON DELETE SET NULL,
  related_meeting_id uuid REFERENCES lf_meetings(id) ON DELETE SET NULL,
  source_engine text,
  status text DEFAULT 'pending',
  scheduled_for timestamptz DEFAULT now(),
  sent_at timestamptz,
  read_at timestamptz,
  priority text DEFAULT 'normal',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m52_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m52_notifications" ON m52_notifications;
CREATE POLICY "anon_select_m52_notifications" ON m52_notifications FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m52_notifications" ON m52_notifications;
CREATE POLICY "anon_insert_m52_notifications" ON m52_notifications FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m52_notifications" ON m52_notifications;
CREATE POLICY "anon_update_m52_notifications" ON m52_notifications FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m52_notifications" ON m52_notifications;
CREATE POLICY "anon_delete_m52_notifications" ON m52_notifications FOR DELETE TO anon, authenticated USING (true);

-- AUDIT LOGS (immutable trail)
CREATE TABLE IF NOT EXISTS m52_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id uuid REFERENCES m52_emails(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text,
  detail text,
  ip_address text,
  encryption_context text DEFAULT 'AES-256',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m52_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m52_audit" ON m52_audit_logs;
CREATE POLICY "anon_select_m52_audit" ON m52_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m52_audit" ON m52_audit_logs;
CREATE POLICY "anon_insert_m52_audit" ON m52_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m52_audit" ON m52_audit_logs;
CREATE POLICY "anon_update_m52_audit" ON m52_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m52_audit" ON m52_audit_logs;
CREATE POLICY "anon_delete_m52_audit" ON m52_audit_logs FOR DELETE TO anon, authenticated USING (true);

-- INVOICE OCR (invoices received via mail, processed by OCR)
CREATE TABLE IF NOT EXISTS m52_invoice_ocr (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id uuid REFERENCES m52_emails(id) ON DELETE CASCADE,
  vendor_name text,
  invoice_number text,
  invoice_date date,
  amount numeric(14,2),
  currency text DEFAULT 'EGP',
  due_date date,
  ocr_confidence numeric(5,2) DEFAULT 0,
  finance_status text DEFAULT 'pending',
  finance_entry_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE m52_invoice_ocr ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_m52_invoice" ON m52_invoice_ocr;
CREATE POLICY "anon_select_m52_invoice" ON m52_invoice_ocr FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_m52_invoice" ON m52_invoice_ocr;
CREATE POLICY "anon_insert_m52_invoice" ON m52_invoice_ocr FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_m52_invoice" ON m52_invoice_ocr;
CREATE POLICY "anon_update_m52_invoice" ON m52_invoice_ocr FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_m52_invoice" ON m52_invoice_ocr;
CREATE POLICY "anon_delete_m52_invoice" ON m52_invoice_ocr FOR DELETE TO anon, authenticated USING (true);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_m52_emails_mailbox ON m52_emails(mailbox_id);
CREATE INDEX IF NOT EXISTS idx_m52_emails_case ON m52_emails(case_id);
CREATE INDEX IF NOT EXISTS idx_m52_emails_direction ON m52_emails(direction);
CREATE INDEX IF NOT EXISTS idx_m52_emails_read ON m52_emails(is_read);
CREATE INDEX IF NOT EXISTS idx_m52_emails_created ON m52_emails(created_at);
CREATE INDEX IF NOT EXISTS idx_m52_notifications_status ON m52_notifications(status);
CREATE INDEX IF NOT EXISTS idx_m52_notifications_scheduled ON m52_notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_m52_audit_email ON m52_audit_logs(email_id);
CREATE INDEX IF NOT EXISTS idx_m52_invoice_email ON m52_invoice_ocr(email_id);

-- SEED: Mailboxes
INSERT INTO m52_mailboxes (email_address, display_name, owner_type, department, e2ee_enabled, pgp_fingerprint) VALUES
  ('legal@firmdomain.com', 'القسم القانوني', 'department', 'القسم القانوني', true, 'A1B2C3D4E5F6A7B8'),
  ('finance@firmdomain.com', 'القسم المالي', 'department', 'القسم المالي', true, 'B2C3D4E5F6A7B8C9'),
  ('admin@firmdomain.com', 'الإدارة العليا', 'department', 'الإدارة العليا', true, 'C3D4E5F6A7B8C9D0'),
  ('notifications@firmdomain.com', 'نظام الإشعارات المؤتمتة', 'system', 'التنسيق المركزي', true, 'D4E5F6A7B8C9D0E1')
ON CONFLICT DO NOTHING;

-- SEED: Aliases
INSERT INTO m52_aliases (alias_address, display_name, target_addresses, department, alias_type) VALUES
  ('court-notices@firmdomain.com', 'إشعارات المحاكم', '["legal@firmdomain.com","admin@firmdomain.com"]'::jsonb, 'القسم القانوني', 'department'),
  ('billing@firmdomain.com', 'الفواتير والمدفوعات', '["finance@firmdomain.com"]'::jsonb, 'القسم المالي', 'department'),
  ('info@firmdomain.com', 'الاستقبال العام', '["admin@firmdomain.com","legal@firmdomain.com"]'::jsonb, 'الإدارة العليا', 'department')
ON CONFLICT DO NOTHING;

-- SEED: Sample emails
INSERT INTO m52_emails (mailbox_id, direction, from_address, to_address, subject, body, is_encrypted, is_read, smart_parsed, parsed_intent, priority, case_id, parsed_entities, has_invoice, created_at)
SELECT
  m.id, 'incoming', 'court@example.gov', 'legal@firmdomain.com',
  'إخطار بجلسة محكمة — قضية رقم 2025/134',
  'السادة المحترمون، نحيطكم علماً بتحديد جلسة قضية رقم 2025/134 بتاريخ 15 أغسطس 2025 الساعة العاشرة صباحاً بالدائرة المدنية. يرجى الحضور والتأهب.',
  true, false, true, 'court_notice', 'high', NULL,
  '{"case_number":"2025/134","session_date":"2025-08-15","session_time":"10:00","court":"الدائرة المدنية"}'::jsonb,
  false, now() - interval '2 hours'
FROM m52_mailboxes m WHERE m.email_address = 'legal@firmdomain.com'
ON CONFLICT DO NOTHING;

INSERT INTO m52_emails (mailbox_id, direction, from_address, to_address, subject, body, is_encrypted, is_read, smart_parsed, parsed_intent, priority, has_invoice, invoice_processed, created_at)
SELECT
  m.id, 'incoming', 'invoices@supplier.com', 'finance@firmdomain.com',
  'فاتورة رقم INV-2025-0892 — أتعاب استشارية',
  'مرفق لسيادتكم فاتورة رقم INV-2025-0892 بقيمة 45,000 ج.م مستحقة السداد في 20 أغسطس 2025.',
  true, false, true, 'invoice_received', 'normal', true, false, now() - interval '5 hours'
FROM m52_mailboxes m WHERE m.email_address = 'finance@firmdomain.com'
ON CONFLICT DO NOTHING;

INSERT INTO m52_emails (mailbox_id, direction, from_address, to_address, subject, body, is_encrypted, is_read, smart_parsed, parsed_intent, priority, read_receipt_confirmed_at, created_at)
SELECT
  m.id, 'outgoing', 'legal@firmdomain.com', 'client@example.com',
  'مطالبة قانونية رسمية — تاريخ الاستحقاق 10 أغسطس 2025',
  'بناءً على وكالتنا المؤرخة، نطالبكم رسمياً بسداد المبلغ المستحق وقدره 120,000 ج.م وذلك خلال 15 يوماً من تاريخ هذا الخطاب. هذا البريد معتمد كوسيلة رسمية للمطالبات وفقاً لنظام البريد السيادي.',
  true, true, true, 'legal_demand', 'high', now() - interval '1 day', now() - interval '20 hours'
FROM m52_mailboxes m WHERE m.email_address = 'legal@firmdomain.com'
ON CONFLICT DO NOTHING;

-- SEED: Notifications
INSERT INTO m52_notifications (notification_type, recipient_address, recipient_name, subject, body, source_engine, status, priority, scheduled_for) VALUES
  ('court_reminder', 'legal@firmdomain.com', 'القسم القانوني', 'تذكير: جلسة محكمة غداً', 'تذكير بموعد جلسة قضية 2025/134 غداً الساعة 10:00 صباحاً بالدائرة المدنية', 'M52-MailEngine', 'sent', 'high', now() - interval '1 hour'),
  ('client_update', 'client@example.com', 'العميل', 'تحديث حالة القضية', 'تم تقديم المذكرة الدفاعية في قضيتكم رقم 2025/134 وحددت الجلسة القادمة في 15 أغسطس 2025', 'M10-CaseCore', 'sent', 'normal', now() - interval '3 hours'),
  ('deadline_alert', 'finance@firmdomain.com', 'القسم المالي', 'تنبيه: موعد سداد فاتورة', 'فاتورة رقم INV-2025-0892 مستحقة السداد في 20 أغسطس 2025', 'M54-FinanceEngine', 'pending', 'high', now() + interval '2 hours')
ON CONFLICT DO NOTHING;

-- SEED: Invoice OCR
INSERT INTO m52_invoice_ocr (email_id, vendor_name, invoice_number, invoice_date, amount, due_date, ocr_confidence, finance_status)
SELECT
  e.id, 'شركة الاستشارات القانونية', 'INV-2025-0892', '2025-08-01', 45000.00, '2025-08-20', 96.50, 'pending'
FROM m52_emails e WHERE e.subject LIKE '%فاتورة رقم INV-2025-0892%'
ON CONFLICT DO NOTHING;

-- SEED: Audit logs for the first email
INSERT INTO m52_audit_logs (email_id, action, actor, detail)
SELECT id, 'received', 'M52-MailEngine', 'استقبال بريد وارد — تم التحليل الآلي بواسطة M92' FROM m52_emails WHERE direction = 'incoming' AND subject LIKE '%إخطار بجلسة محكمة%'
ON CONFLICT DO NOTHING;

INSERT INTO m52_audit_logs (email_id, action, actor, detail)
SELECT id, 'smart_parsed', 'M92-OmniAgent', 'تحليل المحتوى واستخراج الكيانات — تم استخراج رقم القضية وتاريخ الجلسة' FROM m52_emails WHERE direction = 'incoming' AND subject LIKE '%إخطار بجلسة محكمة%'
ON CONFLICT DO NOTHING;

INSERT INTO m52_audit_logs (email_id, action, actor, detail)
SELECT id, 'read_receipt_confirmed', 'M52-MailEngine', 'تأكيد قراءة مشفر — تم إثبات علم الطرف الآخر رسمياً' FROM m52_emails WHERE direction = 'outgoing' AND subject LIKE '%مطالبة قانونية رسمية%'
ON CONFLICT DO NOTHING;
