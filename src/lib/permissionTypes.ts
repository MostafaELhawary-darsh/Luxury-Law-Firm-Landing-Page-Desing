export interface PermissionRole {
  id: string;
  role_key: string;
  display_name_ar: string;
  description: string;
  allowed_modules: string[];
  can_delete: boolean;
  can_edit_financials: boolean;
  can_view_confidential: boolean;
  can_manage_staff: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffPermission {
  id: string;
  staff_id: string;
  role_key: string;
  custom_modules: string[] | null;
  granted_by: string;
  granted_at: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PermissionAuditLog {
  id: string;
  staff_id: string | null;
  action: string;
  old_role: string | null;
  new_role: string | null;
  performed_by: string;
  notes: string | null;
  created_at: string;
}

export const MODULE_LABELS: Record<string, string> = {
  agenda: 'الأجندة القضائية',
  cases: 'نواة القضية الذكية',
  clients: 'العملاء والموكلون',
  poa: 'التوكيلات',
  tasks: 'المهام والأعمال',
  staff: 'المستشارون والموظفون',
  banking: 'الحسابات والشيكات',
  meetings: 'الاجتماعات الافتراضية',
  tracker: 'لوحة متابعة العميل',
  talent: 'هندسة العقول القانونية',
  cockpit: 'قمرة قيادة المحامي',
  laas: 'الخدمة كاشتراك',
  permissions: 'الصلاحيات',
  documents: 'المستندات والامتثال',
};

export const ALL_MODULES = Object.keys(MODULE_LABELS);

export const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  granted: { label: 'منح صلاحية', color: 'text-green-700' },
  revoked: { label: 'سحب صلاحية', color: 'text-red-600' },
  modified: { label: 'تعديل صلاحية', color: 'text-amber-700' },
  role_changed: { label: 'تغيير الدور', color: 'text-blue-700' },
};
