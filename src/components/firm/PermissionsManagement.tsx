import { useEffect, useState, useCallback } from 'react';
import {
  Shield, ShieldCheck, ShieldOff, Lock, Unlock, UserCog, Loader2,
  Plus, Pencil, Trash2, CheckCircle2, X, History, KeyRound,
  Eye, EyeOff, DollarSign, Users, Briefcase, AlertTriangle,
} from 'lucide-react';
import { supabase, formatCurrency, formatDate } from '@/lib/financeUtils';
import type { StaffMember } from '@/lib/firmTypes';
import type { PermissionRole, StaffPermission, PermissionAuditLog } from '@/lib/permissionTypes';
import { MODULE_LABELS, ALL_MODULES, ACTION_LABELS } from '@/lib/permissionTypes';
import { EntityModal, Field, TextInput, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';

type ModalType = 'assign' | 'role' | null;

interface AssignFormData {
  staff_id: string;
  role_key: string;
  custom_modules: string[];
  notes: string;
  is_active: boolean;
}

interface RoleFormData {
  role_key: string;
  display_name_ar: string;
  description: string;
  allowed_modules: string[];
  can_delete: boolean;
  can_edit_financials: boolean;
  can_view_confidential: boolean;
  can_manage_staff: boolean;
}

const emptyAssign: AssignFormData = { staff_id: '', role_key: '', custom_modules: [], notes: '', is_active: true };
const emptyRole: RoleFormData = {
  role_key: '', display_name_ar: '', description: '', allowed_modules: [],
  can_delete: false, can_edit_financials: false, can_view_confidential: false, can_manage_staff: false,
};

const moduleIcon = (mod: string) => {
  const map: Record<string, typeof Briefcase> = {
    agenda: Briefcase, cases: Briefcase, clients: Users, poa: Briefcase,
    tasks: CheckCircle2, staff: UserCog, banking: DollarSign, meetings: Users,
    tracker: Eye, talent: Users, cockpit: KeyRound, laas: DollarSign, permissions: Shield,
  };
  return map[mod] || Briefcase;
};

export default function PermissionsManagement() {
  const [roles, setRoles] = useState<PermissionRole[]>([]);
  const [permissions, setPermissions] = useState<StaffPermission[]>([]);
  const [auditLog, setAuditLog] = useState<PermissionAuditLog[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [assignForm, setAssignForm] = useState<AssignFormData>(emptyAssign);
  const [roleForm, setRoleForm] = useState<RoleFormData>(emptyRole);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'permission' | 'role'>('permission');
  const [activeTab, setActiveTab] = useState<'assignments' | 'roles' | 'audit'>('assignments');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [rolesRes, permRes, auditRes, staffRes] = await Promise.all([
      supabase.from('firm_permission_roles').select('*').order('display_name_ar'),
      supabase.from('firm_staff_permissions').select('*, staff:lf_staff(*, attorney:lf_attorneys(name))').order('granted_at', { ascending: false }),
      supabase.from('firm_permission_audit_log').select('*, staff:lf_staff(*, attorney:lf_attorneys(name))').order('created_at', { ascending: false }).limit(30),
      supabase.from('lf_staff').select('*, attorney:lf_attorneys(name, role)').order('hire_date'),
    ]);
    setRoles((rolesRes.data as PermissionRole[]) || []);
    setPermissions((permRes.data as (StaffPermission & { staff: StaffMember })[]) || []);
    setAuditLog((auditRes.data as (PermissionAuditLog & { staff: StaffMember })[]) || []);
    setStaff((staffRes.data as StaffMember[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getStaffName = (staffId: string | null) => {
    if (!staffId) return '—';
    const p = permissions.find((p) => p.staff_id === staffId) as any;
    return p?.staff?.attorney?.name || staff.find((s) => s.id === staffId)?.attorney?.name || '—';
  };

  const getRoleName = (key: string) => roles.find((r) => r.role_key === key)?.display_name_ar || key;

  const openAssignPermission = () => {
    setAssignForm({ ...emptyAssign });
    setEditingId(null);
    setModalType('assign');
  };

  const openEditPermission = (perm: StaffPermission) => {
    setAssignForm({
      staff_id: perm.staff_id,
      role_key: perm.role_key,
      custom_modules: perm.custom_modules || [],
      notes: perm.notes || '',
      is_active: perm.is_active,
    });
    setEditingId(perm.id);
    setModalType('assign');
  };

  const openAddRole = () => {
    setRoleForm({ ...emptyRole });
    setEditingId(null);
    setModalType('role');
  };

  const openEditRole = (role: PermissionRole) => {
    setRoleForm({
      role_key: role.role_key,
      display_name_ar: role.display_name_ar,
      description: role.description,
      allowed_modules: role.allowed_modules || [],
      can_delete: role.can_delete,
      can_edit_financials: role.can_edit_financials,
      can_view_confidential: role.can_view_confidential,
      can_manage_staff: role.can_manage_staff,
    });
    setEditingId(role.id);
    setModalType('role');
  };

  const handleSave = async () => {
    setSaving(true);
    if (modalType === 'assign') {
      if (!assignForm.staff_id || !assignForm.role_key) { setSaving(false); return; }
      const payload = {
        staff_id: assignForm.staff_id,
        role_key: assignForm.role_key,
        custom_modules: assignForm.custom_modules.length > 0 ? assignForm.custom_modules : null,
        notes: assignForm.notes.trim() || null,
        is_active: assignForm.is_active,
      };
      if (editingId) {
        const oldPerm = permissions.find((p) => p.id === editingId);
        await supabase.from('firm_staff_permissions').update(payload).eq('id', editingId);
        if (oldPerm && oldPerm.role_key !== assignForm.role_key) {
          await supabase.from('firm_permission_audit_log').insert({
            staff_id: assignForm.staff_id, action: 'role_changed',
            old_role: oldPerm.role_key, new_role: assignForm.role_key,
            performed_by: 'الشريك الإداري', notes: assignForm.notes || null,
          });
        } else {
          await supabase.from('firm_permission_audit_log').insert({
            staff_id: assignForm.staff_id, action: 'modified',
            old_role: assignForm.role_key, new_role: assignForm.role_key,
            performed_by: 'الشريك الإداري', notes: assignForm.notes || null,
          });
        }
      } else {
        const { data } = await supabase.from('firm_staff_permissions').insert(payload).select().single();
        if (data) {
          await supabase.from('firm_permission_audit_log').insert({
            staff_id: assignForm.staff_id, action: 'granted',
            new_role: assignForm.role_key, performed_by: 'الشريك الإداري',
            notes: assignForm.notes || null,
          });
        }
      }
    } else if (modalType === 'role') {
      if (!roleForm.role_key.trim() || !roleForm.display_name_ar.trim()) { setSaving(false); return; }
      const payload = {
        role_key: roleForm.role_key.trim(),
        display_name_ar: roleForm.display_name_ar.trim(),
        description: roleForm.description.trim(),
        allowed_modules: roleForm.allowed_modules,
        can_delete: roleForm.can_delete,
        can_edit_financials: roleForm.can_edit_financials,
        can_view_confidential: roleForm.can_view_confidential,
        can_manage_staff: roleForm.can_manage_staff,
      };
      if (editingId) {
        await supabase.from('firm_permission_roles').update(payload).eq('id', editingId);
      } else {
        await supabase.from('firm_permission_roles').insert(payload);
      }
    }
    setSaving(false); setModalType(null); fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (deleteType === 'permission') {
      const perm = permissions.find((p) => p.id === deleteId);
      await supabase.from('firm_staff_permissions').delete().eq('id', deleteId);
      if (perm) {
        await supabase.from('firm_permission_audit_log').insert({
          staff_id: perm.staff_id, action: 'revoked',
          old_role: perm.role_key, performed_by: 'الشريك الإداري',
        });
      }
    } else {
      await supabase.from('firm_permission_roles').delete().eq('id', deleteId);
    }
    setDeleteId(null); fetchAll();
  };

  const toggleModule = (modules: string[], mod: string): string[] =>
    modules.includes(mod) ? modules.filter((m) => m !== mod) : [...modules, mod];

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;

  const activePerms = permissions.filter((p) => p.is_active);
  const inactivePerms = permissions.filter((p) => !p.is_active);
  const staffWithPerms = new Set(permissions.filter((p) => p.is_active).map((p) => p.staff_id));
  const staffWithoutPerms = staff.filter((s) => s.status === 'نشط' && !staffWithPerms.has(s.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield size={20} className="text-gold" />
          <h2 className="font-heading font-bold text-midnight text-lg">صلاحيات المستشارين والموظفين</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openAddRole} className="flex items-center gap-2 px-4 py-2 bg-midnight text-cream rounded-lg font-body text-sm font-bold hover:bg-midnight/90 transition-colors">
            <Plus size={16} /> دور جديد
          </button>
          <button onClick={openAssignPermission} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> تعيين صلاحية
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<UserCog size={14} className="text-midnight" />} label="إجمالي الموظفين" value={String(staff.length)} valueClass="text-midnight" />
        <StatCard icon={<ShieldCheck size={14} className="text-green-600" />} label="بصلاحيات نشطة" value={String(activePerms.length)} valueClass="text-green-700" />
        <StatCard icon={<ShieldOff size={14} className="text-red-500" />} label="بدون صلاحيات" value={String(staffWithoutPerms.length)} valueClass="text-red-600" />
        <StatCard icon={<KeyRound size={14} className="text-gold" />} label="أدوار معرفة" value={String(roles.length)} valueClass="text-gold" />
      </div>

      {/* Alert for staff without permissions */}
      {staffWithoutPerms.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-body text-sm font-bold text-amber-800">{staffWithoutPerms.length} موظف نشط بدون صلاحيات</p>
            <p className="font-body text-xs text-amber-700 mt-1">
              {staffWithoutPerms.slice(0, 3).map((s) => s.attorney?.name).join('، ')}
              {staffWithoutPerms.length > 3 && ` و${staffWithoutPerms.length - 3} آخرين`}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { id: 'assignments' as const, label: 'تعيينات الصلاحيات', icon: ShieldCheck },
          { id: 'roles' as const, label: 'أدوار الصلاحيات', icon: KeyRound },
          { id: 'audit' as const, label: 'سجل التغييرات', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 font-body text-sm font-bold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-gold text-gold'
                  : 'border-transparent text-ink/50 hover:text-ink/70'
              }`}
            >
              <Icon size={15} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ===== Assignments Tab ===== */}
      {activeTab === 'assignments' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <ShieldCheck size={16} className="text-gold" />
            <h3 className="font-heading font-bold text-midnight text-sm">تعيينات الصلاحيات النشطة</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">الموظف</th>
                  <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">الدور</th>
                  <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">الوحدات المسموح بها</th>
                  <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">صلاحيات خاصة</th>
                  <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">منحها</th>
                  <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">التاريخ</th>
                  <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-20">الحالة</th>
                  <th className="px-4 py-3 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {permissions.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center font-body text-sm text-ink/40">لا توجد تعيينات صلاحيات بعد</td></tr>
                ) : (
                  permissions.map((perm) => {
                    const role = roles.find((r) => r.role_key === perm.role_key);
                    const staffName = (perm as any).staff?.attorney?.name || '—';
                    const modules = perm.custom_modules && perm.custom_modules.length > 0
                      ? perm.custom_modules
                      : role?.allowed_modules || [];
                    return (
                      <tr key={perm.id} className="border-b border-gray-50 hover:bg-gray-50/50 group">
                        <td className="px-4 py-3 font-body text-xs font-bold text-midnight">{staffName}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded bg-gold/10 text-gold font-body text-[10px] font-bold">
                            {role?.display_name_ar || perm.role_key}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {modules.slice(0, 4).map((m) => (
                              <span key={m} className="px-1.5 py-0.5 rounded bg-gray-100 text-ink/60 font-body text-[9px]">
                                {MODULE_LABELS[m] || m}
                              </span>
                            ))}
                            {modules.length > 4 && <span className="text-ink/40 font-body text-[9px]">+{modules.length - 4}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {role?.can_delete && <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-body text-[9px] flex items-center gap-0.5"><Trash2 size={8} /> حذف</span>}
                            {role?.can_edit_financials && <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-700 font-body text-[9px] flex items-center gap-0.5"><DollarSign size={8} /> مالية</span>}
                            {role?.can_view_confidential && <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-body text-[9px] flex items-center gap-0.5"><Eye size={8} /> سرية</span>}
                            {role?.can_manage_staff && <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-body text-[9px] flex items-center gap-0.5"><UserCog size={8} /> موظفين</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-body text-xs text-ink/60">{perm.granted_by}</td>
                        <td className="px-4 py-3 font-body text-xs text-ink/50">{formatDate(perm.granted_at)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-body ${perm.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-ink/50'}`}>
                            {perm.is_active ? 'نشط' : 'موقوف'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditPermission(perm)} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={14} /></button>
                            <button onClick={() => { setDeleteId(perm.id); setDeleteType('permission'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== Roles Tab ===== */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <div key={role.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 group hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    role.role_key === 'full_access' ? 'bg-gold/10' :
                    role.role_key === 'read_only' ? 'bg-gray-100' : 'bg-midnight/5'
                  }`}>
                    <Shield size={18} className={role.role_key === 'full_access' ? 'text-gold' : role.role_key === 'read_only' ? 'text-ink/40' : 'text-midnight'} />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-midnight text-sm">{role.display_name_ar}</h4>
                    <p className="font-mono text-[10px] text-ink/40">{role.role_key}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditRole(role)} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={13} /></button>
                  {role.role_key !== 'full_access' && (
                    <button onClick={() => { setDeleteId(role.id); setDeleteType('role'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={13} /></button>
                  )}
                </div>
              </div>
              <p className="font-body text-xs text-ink/60 mb-3 leading-relaxed">{role.description}</p>
              <div className="space-y-2">
                <p className="font-body text-[10px] font-bold text-ink/40">الوحدات المسموح بها ({role.allowed_modules.length})</p>
                <div className="flex flex-wrap gap-1">
                  {role.allowed_modules.map((m) => {
                    const Icon = moduleIcon(m);
                    return (
                      <span key={m} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-50 border border-gray-100 font-body text-[9px] text-ink/60">
                        <Icon size={9} /> {MODULE_LABELS[m] || m}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-gray-100">
                <PermissionFlag icon={Trash2} label="حذف" enabled={role.can_delete} />
                <PermissionFlag icon={DollarSign} label="تعديل مالي" enabled={role.can_edit_financials} />
                <PermissionFlag icon={Eye} label="بيانات سرية" enabled={role.can_view_confidential} />
                <PermissionFlag icon={UserCog} label="إدارة موظفين" enabled={role.can_manage_staff} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== Audit Log Tab ===== */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <History size={16} className="text-gold" />
            <h3 className="font-heading font-bold text-midnight text-sm">سجل تغييرات الصلاحيات</h3>
          </div>
          {auditLog.length === 0 ? (
            <div className="px-4 py-8 text-center font-body text-sm text-ink/40">لا توجد تغييرات مسجلة</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {auditLog.map((log) => {
                const meta = ACTION_LABELS[log.action] || { label: log.action, color: 'text-ink/60' };
                const staffName = (log as any).staff?.attorney?.name || getStaffName(log.staff_id);
                return (
                  <div key={log.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50/50 transition-colors">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      log.action === 'granted' ? 'bg-green-500' :
                      log.action === 'revoked' ? 'bg-red-500' :
                      log.action === 'role_changed' ? 'bg-blue-500' : 'bg-amber-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-body text-xs font-bold ${meta.color}`}>{meta.label}</span>
                        <span className="font-body text-xs font-bold text-midnight">{staffName}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {log.old_role && <span className="font-body text-[10px] text-ink/40">من: {getRoleName(log.old_role)}</span>}
                        {log.new_role && <span className="font-body text-[10px] text-ink/40">إلى: {getRoleName(log.new_role)}</span>}
                        {log.notes && <span className="font-body text-[10px] text-ink/40 truncate">— {log.notes}</span>}
                      </div>
                    </div>
                    <div className="text-left flex-shrink-0">
                      <p className="font-body text-[10px] text-ink/40">{log.performed_by}</p>
                      <p className="font-mono text-[9px] text-ink/30">{formatDate(log.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== Assign Permission Modal ===== */}
      <EntityModal open={modalType === 'assign'} title={editingId ? 'تعديل صلاحية' : 'تعيين صلاحية جديدة'} onClose={() => setModalType(null)} onSubmit={handleSave} loading={saving}>
        <Field label="الموظف" required>
          <Select value={assignForm.staff_id} onChange={(e) => setAssignForm({ ...assignForm, staff_id: e.target.value })}>
            <option value="">— اختر —</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.attorney?.name || '—'} ({s.staff_type})</option>)}
          </Select>
        </Field>
        <Field label="الدور الوظيفي" required>
          <Select
            value={assignForm.role_key}
            onChange={(e) => {
              const role = roles.find((r) => r.role_key === e.target.value);
              setAssignForm({
                ...assignForm,
                role_key: e.target.value,
                custom_modules: role ? [...role.allowed_modules] : [],
              });
            }}
          >
            <option value="">— اختر —</option>
            {roles.filter((r) => r.is_active).map((r) => <option key={r.id} value={r.role_key}>{r.display_name_ar}</option>)}
          </Select>
        </Field>
        <div>
          <p className="font-body text-xs font-bold text-ink/60 mb-2">الوحدات المسموح بالوصول إليها</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-lg border border-gray-100">
            {ALL_MODULES.map((mod) => {
              const Icon = moduleIcon(mod);
              const checked = assignForm.custom_modules.includes(mod);
              return (
                <button
                  key={mod}
                  type="button"
                  onClick={() => setAssignForm({
                    ...assignForm,
                    custom_modules: toggleModule(assignForm.custom_modules, mod),
                  })}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-right transition-all ${
                    checked
                      ? 'bg-gold/10 border-gold/40 text-gold'
                      : 'bg-white border-gray-200 text-ink/60 hover:border-gray-300'
                  }`}
                >
                  <Icon size={12} className="flex-shrink-0" />
                  <span className="font-body text-[10px] font-bold flex-1">{MODULE_LABELS[mod]}</span>
                  {checked ? <CheckCircle2 size={12} className="text-gold flex-shrink-0" /> : <div className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
        <Field label="ملاحظات">
          <TextInput value={assignForm.notes} onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })} placeholder="سبب منح الصلاحية..." />
        </Field>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={assignForm.is_active}
            onChange={(e) => setAssignForm({ ...assignForm, is_active: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-gold focus:ring-gold"
          />
          <span className="font-body text-sm text-ink/70">الصلاحية نشطة</span>
        </label>
      </EntityModal>

      {/* ===== Role Modal ===== */}
      <EntityModal open={modalType === 'role'} title={editingId ? 'تعديل دور' : 'إنشاء دور جديد'} onClose={() => setModalType(null)} onSubmit={handleSave} loading={saving}>
        <Field label="مفتاح الدور (إنجليزي)" required>
          <TextInput value={roleForm.role_key} onChange={(e) => setRoleForm({ ...roleForm, role_key: e.target.value })} placeholder="مثال: senior_attorney" disabled={!!editingId} />
        </Field>
        <Field label="الاسم العربي" required>
          <TextInput value={roleForm.display_name_ar} onChange={(e) => setRoleForm({ ...roleForm, display_name_ar: e.target.value })} placeholder="مثال: محامي أول" />
        </Field>
        <Field label="الوصف">
          <TextInput value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} placeholder="وصف الصلاحيات..." />
        </Field>
        <div>
          <p className="font-body text-xs font-bold text-ink/60 mb-2">الوحدات المسموح بها</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-lg border border-gray-100">
            {ALL_MODULES.map((mod) => {
              const Icon = moduleIcon(mod);
              const checked = roleForm.allowed_modules.includes(mod);
              return (
                <button
                  key={mod}
                  type="button"
                  onClick={() => setRoleForm({
                    ...roleForm,
                    allowed_modules: toggleModule(roleForm.allowed_modules, mod),
                  })}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-right transition-all ${
                    checked ? 'bg-gold/10 border-gold/40 text-gold' : 'bg-white border-gray-200 text-ink/60 hover:border-gray-300'
                  }`}
                >
                  <Icon size={12} className="flex-shrink-0" />
                  <span className="font-body text-[10px] font-bold flex-1">{MODULE_LABELS[mod]}</span>
                  {checked ? <CheckCircle2 size={12} className="text-gold flex-shrink-0" /> : <div className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <RoleToggle label="صلاحية الحذف" icon={Trash2} checked={roleForm.can_delete} onChange={(v) => setRoleForm({ ...roleForm, can_delete: v })} />
          <RoleToggle label="تعديل مالي" icon={DollarSign} checked={roleForm.can_edit_financials} onChange={(v) => setRoleForm({ ...roleForm, can_edit_financials: v })} />
          <RoleToggle label="بيانات سرية" icon={Eye} checked={roleForm.can_view_confidential} onChange={(v) => setRoleForm({ ...roleForm, can_view_confidential: v })} />
          <RoleToggle label="إدارة موظفين" icon={UserCog} checked={roleForm.can_manage_staff} onChange={(v) => setRoleForm({ ...roleForm, can_manage_staff: v })} />
        </div>
      </EntityModal>

      <DeleteConfirm
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        message={deleteType === 'permission' ? 'سيتم سحب الصلاحية من هذا الموظف.' : 'سيتم حذف هذا الدور. الموظفون المرتبطون به سيفقدون صلاحياتهم.'}
      />
    </div>
  );
}

function PermissionFlag({ icon: Icon, label, enabled }: { icon: typeof Trash2; label: string; enabled: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${enabled ? 'bg-green-50' : 'bg-gray-50'}`}>
      <Icon size={11} className={enabled ? 'text-green-600' : 'text-ink/30'} />
      <span className={`font-body text-[10px] font-bold ${enabled ? 'text-green-700' : 'text-ink/30'}`}>{label}</span>
      {enabled ? <CheckCircle2 size={11} className="text-green-600 mr-auto" /> : <X size={11} className="text-ink/30 mr-auto" />}
    </div>
  );
}

function RoleToggle({ label, icon: Icon, checked, onChange }: { label: string; icon: typeof Trash2; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all ${
        checked ? 'bg-gold/10 border-gold/40 text-gold' : 'bg-gray-50 border-gray-200 text-ink/50 hover:border-gray-300'
      }`}
    >
      <Icon size={14} />
      <span className="font-body text-xs font-bold flex-1 text-right">{label}</span>
      {checked ? <Unlock size={14} /> : <Lock size={14} />}
    </button>
  );
}
