import { useEffect, useState, useCallback } from 'react';
import {
  Building2, Loader2, Plus, Pencil, Trash2, ChevronRight, X, FileText,
  Users, Calendar, Lock, Shield, Search, Scale, CheckCircle2, Clock,
  Activity, Server, Network, GitBranch, ShieldCheck, BookOpen,
  UserCog, Layers, BadgeCheck,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

// ── Interfaces ──────────────────────────────────────────────────────────────

interface GovernanceStructure {
  id: string;
  structure_name: string;
  entity_type: string;
  parent_structure_id: string | null;
  approval_required: boolean;
  description: string | null;
  created_at: string;
  parent?: { structure_name: string } | null;
}

interface GovernanceRole {
  id: string;
  structure_id: string;
  role_name: string;
  role_level: string;
  permissions: string[] | null;
  can_approve: boolean;
  can_delegate: boolean;
  reports_to: string | null;
  created_at: string;
  structure?: { structure_name: string } | null;
}

interface GovernancePolicy {
  id: string;
  policy_name: string;
  policy_type: string;
  effective_date: string | null;
  expiry_date: string | null;
  version: string | null;
  content: string | null;
  approved_by: string | null;
  status: string;
  created_at: string;
}

interface GovernanceAudit {
  id: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

type Tab = 'structures' | 'roles' | 'policies' | 'audit';

// ── Config objects ───────────────────────────────────────────────────────────

const ENTITY_TYPE_LABELS: Record<string, string> = {
  company: 'شركة',
  partnership: 'شراكة',
  institution: 'مؤسسة',
  foundation: 'وقف/أهلية',
};

const ROLE_LEVEL_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  board: { label: 'مجلس الإدارة', bg: 'bg-purple-50', text: 'text-purple-700' },
  executive: { label: 'تنفيذي', bg: 'bg-blue-50', text: 'text-blue-700' },
  manager: { label: 'مدير', bg: 'bg-amber-50', text: 'text-amber-700' },
  staff: { label: 'موظف', bg: 'bg-gray-100', text: 'text-ink/60' },
};

const POLICY_TYPE_LABELS: Record<string, string> = {
  financial: 'مالية',
  administrative: 'إدارية',
  legal: 'قانونية',
  compliance: 'امتثال',
};

const POLICY_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: 'ساري', bg: 'bg-green-50', text: 'text-green-600' },
  draft: { label: 'مسودة', bg: 'bg-amber-50', text: 'text-amber-600' },
  expired: { label: 'منتهي', bg: 'bg-red-50', text: 'text-red-600' },
  superseded: { label: 'ملغى', bg: 'bg-gray-100', text: 'text-ink/50' },
};

// ── Form types ──────────────────────────────────────────────────────────────

interface StructureForm {
  structure_name: string;
  entity_type: string;
  parent_structure_id: string;
  approval_required: boolean;
  description: string;
}

const emptyStructureForm: StructureForm = {
  structure_name: '', entity_type: 'company', parent_structure_id: '',
  approval_required: false, description: '',
};

interface RoleForm {
  structure_id: string;
  role_name: string;
  role_level: string;
  permissions: string;
  can_approve: boolean;
  can_delegate: boolean;
  reports_to: string;
}

const emptyRoleForm: RoleForm = {
  structure_id: '', role_name: '', role_level: 'staff', permissions: '',
  can_approve: false, can_delegate: false, reports_to: '',
};

interface PolicyForm {
  policy_name: string;
  policy_type: string;
  effective_date: string;
  expiry_date: string;
  version: string;
  content: string;
  approved_by: string;
  status: string;
}

const emptyPolicyForm: PolicyForm = {
  policy_name: '', policy_type: 'financial', effective_date: '', expiry_date: '',
  version: '1.0', content: '', approved_by: '', status: 'draft',
};

// ── Component ───────────────────────────────────────────────────────────────

export default function CorporateGovernanceEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [structures, setStructures] = useState<GovernanceStructure[]>([]);
  const [roles, setRoles] = useState<GovernanceRole[]>([]);
  const [policies, setPolicies] = useState<GovernancePolicy[]>([]);
  const [auditLogs, setAuditLogs] = useState<GovernanceAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('structures');

  const [structureModalOpen, setStructureModalOpen] = useState(false);
  const [editingStructureId, setEditingStructureId] = useState<string | null>(null);
  const [structureForm, setStructureForm] = useState<StructureForm>(emptyStructureForm);
  const [saving, setSaving] = useState(false);

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleForm, setRoleForm] = useState<RoleForm>(emptyRoleForm);

  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [policyForm, setPolicyForm] = useState<PolicyForm>(emptyPolicyForm);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'structure' | 'role' | 'policy'>('structure');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [strRes, roleRes, polRes, auditRes] = await Promise.all([
      supabase.from('m44_governance_structures')
        .select('*, parent:m44_governance_structures(structure_name)')
        .order('created_at', { ascending: false }),
      supabase.from('m44_governance_roles')
        .select('*, structure:m44_governance_structures(structure_name)')
        .order('created_at', { ascending: false }),
      supabase.from('m44_governance_policies').select('*').order('created_at', { ascending: false }),
      supabase.from('m44_governance_audit').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setStructures((strRes.data as GovernanceStructure[]) || []);
    setRoles((roleRes.data as GovernanceRole[]) || []);
    setPolicies((polRes.data as GovernancePolicy[]) || []);
    setAuditLogs((auditRes.data as GovernanceAudit[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setStructureForm({ ...emptyStructureForm, structure_name: cmd.fields.title || '' });
      setEditingStructureId(null);
      setStructureModalOpen(true);
    }
  }, [voiceAdd]);

  const logAudit = async (entityType: string, entityId: string, action: string, detail: string) => {
    const hash = '0x' + Math.random().toString(16).substr(2, 4) + '...' + Math.random().toString(16).substr(2, 4);
    await supabase.from('m44_governance_audit').insert({
      entity_type: entityType, entity_id: entityId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
  };

  const openAddStructure = () => { setStructureForm(emptyStructureForm); setEditingStructureId(null); setStructureModalOpen(true); };

  const openEditStructure = (s: GovernanceStructure) => {
    setStructureForm({
      structure_name: s.structure_name, entity_type: s.entity_type,
      parent_structure_id: s.parent_structure_id || '', approval_required: s.approval_required,
      description: s.description || '',
    });
    setEditingStructureId(s.id);
    setStructureModalOpen(true);
  };

  const handleSaveStructure = async () => {
    if (!structureForm.structure_name.trim()) return;
    setSaving(true);
    const payload = {
      structure_name: structureForm.structure_name.trim(),
      entity_type: structureForm.entity_type,
      parent_structure_id: structureForm.parent_structure_id || null,
      approval_required: structureForm.approval_required,
      description: structureForm.description.trim() || null,
    };
    if (editingStructureId) {
      await supabase.from('m44_governance_structures').update(payload).eq('id', editingStructureId);
      await logAudit('structure', editingStructureId, 'structure_updated', 'تحديث هيكل: ' + structureForm.structure_name);
    } else {
      const { data } = await supabase.from('m44_governance_structures').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) await logAudit('structure', newId, 'structure_created', 'إنشاء هيكل: ' + structureForm.structure_name);
    }
    setSaving(false);
    setStructureModalOpen(false);
    fetchAll();
  };

  const addRole = async () => {
    if (!roleForm.structure_id || !roleForm.role_name.trim()) return;
    const perms = roleForm.permissions.split(',').map((p) => p.trim()).filter(Boolean);
    await supabase.from('m44_governance_roles').insert({
      structure_id: roleForm.structure_id,
      role_name: roleForm.role_name.trim(),
      role_level: roleForm.role_level,
      permissions: perms.length > 0 ? perms : null,
      can_approve: roleForm.can_approve,
      can_delegate: roleForm.can_delegate,
      reports_to: roleForm.reports_to.trim() || null,
    });
    await logAudit('role', roleForm.structure_id, 'role_created', 'إنشاء صلاحية: ' + roleForm.role_name);
    setRoleForm(emptyRoleForm);
    setRoleModalOpen(false);
    fetchAll();
  };

  const openAddPolicy = () => { setPolicyForm(emptyPolicyForm); setEditingPolicyId(null); setPolicyModalOpen(true); };

  const openEditPolicy = (p: GovernancePolicy) => {
    setPolicyForm({
      policy_name: p.policy_name, policy_type: p.policy_type,
      effective_date: p.effective_date || '', expiry_date: p.expiry_date || '',
      version: p.version || '1.0', content: p.content || '',
      approved_by: p.approved_by || '', status: p.status,
    });
    setEditingPolicyId(p.id);
    setPolicyModalOpen(true);
  };

  const handleSavePolicy = async () => {
    if (!policyForm.policy_name.trim()) return;
    setSaving(true);
    const payload = {
      policy_name: policyForm.policy_name.trim(),
      policy_type: policyForm.policy_type,
      effective_date: policyForm.effective_date || null,
      expiry_date: policyForm.expiry_date || null,
      version: policyForm.version.trim() || null,
      content: policyForm.content.trim() || null,
      approved_by: policyForm.approved_by.trim() || null,
      status: policyForm.status,
    };
    if (editingPolicyId) {
      await supabase.from('m44_governance_policies').update(payload).eq('id', editingPolicyId);
      await logAudit('policy', editingPolicyId, 'policy_updated', 'تحديث سياسة: ' + policyForm.policy_name);
    } else {
      const { data } = await supabase.from('m44_governance_policies').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) await logAudit('policy', newId, 'policy_created', 'إنشاء سياسة: ' + policyForm.policy_name);
    }
    setSaving(false);
    setPolicyModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (deleteType === 'structure') await supabase.from('m44_governance_structures').delete().eq('id', deleteId);
    else if (deleteType === 'role') await supabase.from('m44_governance_roles').delete().eq('id', deleteId);
    else if (deleteType === 'policy') await supabase.from('m44_governance_policies').delete().eq('id', deleteId);
    setDeleteId(null);
    fetchAll();
  };

  const filteredStructures = structures.filter((s) => {
    if (filterType !== 'all' && s.entity_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!s.structure_name.toLowerCase().includes(q) && !(s.description || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activePolicies = policies.filter((p) => p.status === 'active').length;
  const boardRoles = roles.filter((r) => r.role_level === 'board').length;
  const approvalRoles = roles.filter((r) => r.can_approve).length;

  const tabs: { id: Tab; label: string; icon: typeof Building2; badge?: number }[] = [
    { id: 'structures', label: 'الهياكل', icon: Building2, badge: structures.length },
    { id: 'roles', label: 'الصلاحيات', icon: ShieldCheck, badge: roles.length },
    { id: 'policies', label: 'السياسات', icon: BookOpen, badge: activePolicies },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Network size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">الحوكمة الإدارية والهياكل التنظيمية (M44)</h2>
            <p className="font-body text-[10px] text-ink/40">قطاع الحوكمة — الهياكل والصلاحيات والسياسات والتدقيق</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Server size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">On-Premise · AES-256</span>
          </div>
          <button onClick={openAddStructure} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> هيكل جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Building2 size={14} className="text-midnight" />} label="إجمالي الهياكل" value={String(structures.length)} valueClass="text-midnight" />
        <StatCard icon={<ShieldCheck size={14} className="text-purple-600" />} label="صلاحيات مجلس الإدارة" value={String(boardRoles)} valueClass="text-purple-700" />
        <StatCard icon={<BadgeCheck size={14} className="text-gold" />} label="صلاحيات اعتماد" value={String(approvalRoles)} valueClass="text-gold" />
        <StatCard icon={<BookOpen size={14} className="text-green-600" />} label="سياسات سارية" value={String(activePolicies)} valueClass="text-green-700" />
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 font-body text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'text-gold border-gold' : 'text-ink/40 border-transparent hover:text-ink/60'}`}>
              <Icon size={14} /> {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${activeTab === tab.id ? 'bg-gold text-midnight' : 'bg-gray-200 text-ink/50'}`}>{tab.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filters for structures */}
      {activeTab === 'structures' && (
        <div className="flex items-center gap-2">
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الأنواع</option>
            {Object.entries(ENTITY_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث باسم الهيكل..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Structures tab */}
      {activeTab === 'structures' && (
        <div className="space-y-2">
          {filteredStructures.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Building2 size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد هياكل مسجلة</p>
            </div>
          ) : (
            filteredStructures.map((s) => (
              <div key={s.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Building2 size={14} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{ENTITY_TYPE_LABELS[s.entity_type] || s.entity_type}</span>
                        {s.approval_required && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><BadgeCheck size={8} /> يتطلب اعتماد</span>}
                        {s.parent && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><GitBranch size={8} /> {s.parent.structure_name}</span>}
                      </div>
                      <p className="font-body text-xs font-bold text-midnight mt-1">{s.structure_name}</p>
                      {s.description && <p className="font-body text-[10px] text-ink/50 mt-1 leading-relaxed line-clamp-2">{s.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditStructure(s)} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                    <button onClick={() => { setDeleteId(s.id); setDeleteType('structure'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Roles tab */}
      {activeTab === 'roles' && (
        <div className="space-y-2">
          <div className="flex items-center justify-end">
            <button onClick={() => setRoleModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold/10 text-gold font-body text-xs font-bold hover:bg-gold/20 transition-colors">
              <Plus size={12} /> صلاحية جديدة
            </button>
          </div>
          {roles.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><ShieldCheck size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد صلاحيات مسجلة</p></div>
          ) : (
            roles.map((r) => {
              const cfg = ROLE_LEVEL_CONFIG[r.role_level] || ROLE_LEVEL_CONFIG.staff;
              return (
                <div key={r.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                        <ShieldCheck size={14} className={cfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                          {r.can_approve && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><BadgeCheck size={8} /> يعتمد</span>}
                          {r.can_delegate && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><GitBranch size={8} /> يفوّض</span>}
                          {r.structure && <span className="font-body text-[9px] text-gold">{r.structure.structure_name}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{r.role_name}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {r.reports_to && <span className="font-body text-[9px] text-ink/40">يرفع لتقارير: {r.reports_to}</span>}
                          {r.permissions && r.permissions.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              {r.permissions.map((perm, i) => <span key={i} className="px-1 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{perm}</span>)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(r.id); setDeleteType('role'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Policies tab */}
      {activeTab === 'policies' && (
        <div className="space-y-2">
          <div className="flex items-center justify-end">
            <button onClick={openAddPolicy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold/10 text-gold font-body text-xs font-bold hover:bg-gold/20 transition-colors">
              <Plus size={12} /> سياسة جديدة
            </button>
          </div>
          {policies.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><BookOpen size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد سياسات مسجلة</p></div>
          ) : (
            policies.map((p) => {
              const cfg = POLICY_STATUS_CONFIG[p.status] || POLICY_STATUS_CONFIG.draft;
              return (
                <div key={p.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                        <BookOpen size={14} className={cfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{POLICY_TYPE_LABELS[p.policy_type] || p.policy_type}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                          {p.version && <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600">v{p.version}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{p.policy_name}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {p.effective_date && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/40"><Calendar size={9} /> سريان: {formatDate(p.effective_date)}</span>}
                          {p.expiry_date && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/40"><Clock size={9} /> انتهاء: {formatDate(p.expiry_date)}</span>}
                          {p.approved_by && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/40"><UserCog size={9} /> {p.approved_by}</span>}
                        </div>
                        {p.content && <p className="font-body text-[10px] text-ink/50 mt-1 leading-relaxed line-clamp-2">{p.content}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditPolicy(p)} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                      <button onClick={() => { setDeleteId(p.id); setDeleteType('policy'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Audit tab */}
      {activeTab === 'audit' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={14} className="text-gold" />
            <span className="font-heading font-bold text-midnight text-sm">سجل التدقيق غير القابل للتعديل</span>
            <span className="font-body text-[10px] text-ink/30">— {auditLogs.length} عملية مسجلة</span>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {log.action.includes('created') ? <FileText size={12} className="text-blue-600" />
                      : log.action.includes('policy') ? <BookOpen size={12} className="text-green-600" />
                      : log.action.includes('role') ? <ShieldCheck size={12} className="text-purple-600" />
                      : log.action.includes('structure') ? <Building2 size={12} className="text-blue-600" />
                      : <Activity size={12} className="text-ink/40" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-body text-[10px] font-bold text-midnight">{log.action}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{log.entity_type}</span>
                      {log.actor && <span className="font-body text-[9px] text-ink/40">{log.actor}</span>}
                    </div>
                    {log.detail && <p className="font-body text-[10px] text-ink/50 leading-relaxed mt-0.5">{log.detail}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-body text-[9px] text-ink/30">{new Date(log.created_at).toLocaleString('ar-EG')}</span>
                      {log.hash_chain && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/30"><Lock size={8} /> {log.hash_chain}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Structure modal */}
      <EntityModal open={structureModalOpen} title={editingStructureId ? 'تعديل الهيكل' : 'هيكل جديد'} onClose={() => setStructureModalOpen(false)} onSubmit={handleSaveStructure} loading={saving}>
        <Field label="اسم الهيكل" required><TextInput value={structureForm.structure_name} onChange={(e) => setStructureForm({ ...structureForm, structure_name: e.target.value })} /></Field>
        <Field label="نوع الكيان">
          <Select value={structureForm.entity_type} onChange={(e) => setStructureForm({ ...structureForm, entity_type: e.target.value })}>
            {Object.entries(ENTITY_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="الهيكل الأصل">
          <Select value={structureForm.parent_structure_id} onChange={(e) => setStructureForm({ ...structureForm, parent_structure_id: e.target.value })}>
            <option value="">— لا يوجد —</option>
            {structures.filter((s) => s.id !== editingStructureId).map((s) => <option key={s.id} value={s.id}>{s.structure_name}</option>)}
          </Select>
        </Field>
        <Field label="الوصف"><TextArea value={structureForm.description} onChange={(e) => setStructureForm({ ...structureForm, description: e.target.value })} rows={3} /></Field>
      </EntityModal>

      {/* Role modal */}
      <EntityModal open={roleModalOpen} title="صلاحية جديدة" onClose={() => setRoleModalOpen(false)} onSubmit={addRole}>
        <Field label="الهيكل المرتبط" required>
          <Select value={roleForm.structure_id} onChange={(e) => setRoleForm({ ...roleForm, structure_id: e.target.value })}>
            <option value="">— اختر —</option>
            {structures.map((s) => <option key={s.id} value={s.id}>{s.structure_name}</option>)}
          </Select>
        </Field>
        <Field label="اسم الصلاحية" required><TextInput value={roleForm.role_name} onChange={(e) => setRoleForm({ ...roleForm, role_name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المستوى">
            <Select value={roleForm.role_level} onChange={(e) => setRoleForm({ ...roleForm, role_level: e.target.value })}>
              {Object.entries(ROLE_LEVEL_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
            </Select>
          </Field>
          <Field label="يرفع لتقارير إلى"><TextInput value={roleForm.reports_to} onChange={(e) => setRoleForm({ ...roleForm, reports_to: e.target.value })} /></Field>
        </div>
        <Field label="الصلاحيات (مفصولة بفواصل)"><TextInput value={roleForm.permissions} onChange={(e) => setRoleForm({ ...roleForm, permissions: e.target.value })} placeholder="approve, review, delegate" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="يعتمد">
            <Select value={String(roleForm.can_approve)} onChange={(e) => setRoleForm({ ...roleForm, can_approve: e.target.value === 'true' })}>
              <option value="false">لا</option>
              <option value="true">نعم</option>
            </Select>
          </Field>
          <Field label="يفوّض">
            <Select value={String(roleForm.can_delegate)} onChange={(e) => setRoleForm({ ...roleForm, can_delegate: e.target.value === 'true' })}>
              <option value="false">لا</option>
              <option value="true">نعم</option>
            </Select>
          </Field>
        </div>
      </EntityModal>

      {/* Policy modal */}
      <EntityModal open={policyModalOpen} title={editingPolicyId ? 'تعديل السياسة' : 'سياسة جديدة'} onClose={() => setPolicyModalOpen(false)} onSubmit={handleSavePolicy} loading={saving}>
        <Field label="اسم السياسة" required><TextInput value={policyForm.policy_name} onChange={(e) => setPolicyForm({ ...policyForm, policy_name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نوع السياسة">
            <Select value={policyForm.policy_type} onChange={(e) => setPolicyForm({ ...policyForm, policy_type: e.target.value })}>
              {Object.entries(POLICY_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="الحالة">
            <Select value={policyForm.status} onChange={(e) => setPolicyForm({ ...policyForm, status: e.target.value })}>
              {Object.entries(POLICY_STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="تاريخ السريان"><TextInput type="date" value={policyForm.effective_date} onChange={(e) => setPolicyForm({ ...policyForm, effective_date: e.target.value })} /></Field>
          <Field label="تاريخ الانتهاء"><TextInput type="date" value={policyForm.expiry_date} onChange={(e) => setPolicyForm({ ...policyForm, expiry_date: e.target.value })} /></Field>
          <Field label="الإصدار"><TextInput value={policyForm.version} onChange={(e) => setPolicyForm({ ...policyForm, version: e.target.value })} /></Field>
        </div>
        <Field label="اعتماد بواسطة"><TextInput value={policyForm.approved_by} onChange={(e) => setPolicyForm({ ...policyForm, approved_by: e.target.value })} /></Field>
        <Field label="المحتوى"><TextArea value={policyForm.content} onChange={(e) => setPolicyForm({ ...policyForm, content: e.target.value })} rows={4} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
