/*
# Staff Permissions Management — RBAC for Firm Consultants & Employees

## Overview
Creates a role-based access control (RBAC) system specifically for the firm's
internal staff (consultants, attorneys, accountants, administrators). Each staff
member is assigned a permission role that determines which modules they can access
and what actions they can perform. All permission changes are tracked in an audit log.

## New Tables

1. **firm_permission_roles** — Predefined role templates
   - id (uuid PK)
   - role_key (text, unique) — e.g. `full_access`, `senior_attorney`, `junior_attorney`, `accountant`, `admin_staff`
   - display_name_ar (text) — Arabic display name
   - description (text)
   - allowed_modules (text[]) — list of FirmModule IDs this role can access
   - can_delete (boolean) — whether this role can delete records
   - can_edit_financials (boolean) — whether this role can edit financial data
   - can_view_confidential (boolean) — access to confidential client data
   - can_manage_staff (boolean) — can manage other staff members
   - is_active (boolean)
   - created_at, updated_at

2. **firm_staff_permissions** — Per-staff permission assignments
   - id (uuid PK)
   - staff_id (uuid FK → lf_staff, ON DELETE CASCADE)
   - role_key (text FK → firm_permission_roles.role_key)
   - custom_modules (text[], nullable) — override modules if custom
   - granted_by (text) — who granted the permission
   - granted_at (timestamptz)
   - notes (text, nullable)
   - is_active (boolean, default true)

3. **firm_permission_audit_log** — Track all permission changes
   - id (uuid PK)
   - staff_id (uuid, nullable) — affected staff member
   - action (text) — `granted` / `revoked` / `modified` / `role_changed`
   - old_role (text, nullable)
   - new_role (text, nullable)
   - performed_by (text)
   - notes (text, nullable)
   - created_at (timestamptz)

## Security
- RLS enabled on all tables with anon+authenticated CRUD (single-tenant, no auth screen).
*/

-- ===== firm_permission_roles =====
CREATE TABLE IF NOT EXISTS firm_permission_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key text UNIQUE NOT NULL,
  display_name_ar text NOT NULL,
  description text NOT NULL DEFAULT '',
  allowed_modules text[] DEFAULT '{}',
  can_delete boolean DEFAULT false,
  can_edit_financials boolean DEFAULT false,
  can_view_confidential boolean DEFAULT false,
  can_manage_staff boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE firm_permission_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "firm_perm_roles_select" ON firm_permission_roles;
CREATE POLICY "firm_perm_roles_select" ON firm_permission_roles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "firm_perm_roles_insert" ON firm_permission_roles;
CREATE POLICY "firm_perm_roles_insert" ON firm_permission_roles FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "firm_perm_roles_update" ON firm_permission_roles;
CREATE POLICY "firm_perm_roles_update" ON firm_permission_roles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "firm_perm_roles_delete" ON firm_permission_roles;
CREATE POLICY "firm_perm_roles_delete" ON firm_permission_roles FOR DELETE TO anon, authenticated USING (true);

-- ===== firm_staff_permissions =====
CREATE TABLE IF NOT EXISTS firm_staff_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES lf_staff(id) ON DELETE CASCADE,
  role_key text REFERENCES firm_permission_roles(role_key) ON DELETE SET NULL,
  custom_modules text[] DEFAULT '{}',
  granted_by text DEFAULT 'الشريك الإداري',
  granted_at timestamptz DEFAULT now(),
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_perm_staff ON firm_staff_permissions(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_perm_role ON firm_staff_permissions(role_key);

ALTER TABLE firm_staff_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "firm_staff_perm_select" ON firm_staff_permissions;
CREATE POLICY "firm_staff_perm_select" ON firm_staff_permissions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "firm_staff_perm_insert" ON firm_staff_permissions;
CREATE POLICY "firm_staff_perm_insert" ON firm_staff_permissions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "firm_staff_perm_update" ON firm_staff_permissions;
CREATE POLICY "firm_staff_perm_update" ON firm_staff_permissions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "firm_staff_perm_delete" ON firm_staff_permissions;
CREATE POLICY "firm_staff_perm_delete" ON firm_staff_permissions FOR DELETE TO anon, authenticated USING (true);

-- ===== firm_permission_audit_log =====
CREATE TABLE IF NOT EXISTS firm_permission_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid,
  action text NOT NULL DEFAULT 'modified',
  old_role text,
  new_role text,
  performed_by text DEFAULT 'الشريك الإداري',
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_perm_audit_staff ON firm_permission_audit_log(staff_id);
CREATE INDEX IF NOT EXISTS idx_perm_audit_created ON firm_permission_audit_log(created_at DESC);

ALTER TABLE firm_permission_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "firm_perm_audit_select" ON firm_permission_audit_log;
CREATE POLICY "firm_perm_audit_select" ON firm_permission_audit_log FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "firm_perm_audit_insert" ON firm_permission_audit_log;
CREATE POLICY "firm_perm_audit_insert" ON firm_permission_audit_log FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "firm_perm_audit_update" ON firm_permission_audit_log;
CREATE POLICY "firm_perm_audit_update" ON firm_permission_audit_log FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "firm_perm_audit_delete" ON firm_permission_audit_log;
CREATE POLICY "firm_perm_audit_delete" ON firm_permission_audit_log FOR DELETE TO anon, authenticated USING (true);

-- ===== Seed default permission roles =====
INSERT INTO firm_permission_roles (role_key, display_name_ar, description, allowed_modules, can_delete, can_edit_financials, can_view_confidential, can_manage_staff)
VALUES
  ('full_access', 'صلاحية كاملة (شريك)', 'جميع الصلاحيات على جميع الوحدات', ARRAY['agenda','cases','clients','poa','tasks','staff','banking','meetings','tracker','talent','cockpit','laas','permissions'], true, true, true, true),
  ('senior_attorney', 'محامي أول', 'صلاحيات واسعة على القضايا والعملاء والمهام', ARRAY['agenda','cases','clients','poa','tasks','meetings','tracker','cockpit'], false, false, true, false),
  ('junior_attorney', 'محامي مبتدئ', 'صلاحيات محدودة على القضايا والمهام', ARRAY['agenda','cases','tasks','cockpit'], false, false, false, false),
  ('accountant', 'محاسب', 'إدارة الحسابات والشيكات والمرتبات', ARRAY['banking','staff','tracker'], false, true, false, false),
  ('admin_staff', 'إداري', 'إدارة العملاء والتوكيلات والمهام', ARRAY['clients','poa','tasks','meetings','tracker'], false, false, false, false),
  ('read_only', 'قراءة فقط', 'عرض البيانات دون تعديل', ARRAY['agenda','cases','clients','poa','tasks','tracker'], false, false, false, false)
ON CONFLICT (role_key) DO NOTHING;