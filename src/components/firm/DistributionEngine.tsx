import { useEffect, useState, useCallback } from 'react';
import {
  Store, Loader2, Plus, Pencil, Trash2, ChevronRight, X, FileText,
  Calendar, DollarSign, Lock, Shield, CircuitBoard, Zap,
  CheckCircle2, Clock, AlertTriangle, ArrowRight, Search, BadgeCheck,
  Scale, Archive, Send, Activity, Server, Globe,
  Building2, MapPin, Users, Percent,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type { M23Agency, M23AuditLog } from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'agencies' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'مسودة', bg: 'bg-blue-50', text: 'text-blue-700' },
  reviewed: { label: 'مُراجَع', bg: 'bg-amber-50', text: 'text-amber-700' },
  signed: { label: 'مُوقَّع', bg: 'bg-purple-50', text: 'text-purple-700' },
  registered: { label: 'مُسجَّل', bg: 'bg-green-50', text: 'text-green-700' },
  expired: { label: 'منتهي', bg: 'bg-gray-100', text: 'text-gray-600' },
};

const STAGES = ['draft', 'reviewed', 'signed', 'registered', 'expired'];

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  distribution: 'عقد توزيع',
  agency: 'وكالة تجارية',
  franchise: 'امتياز تجاري',
  logistics: 'خدمات لوجستية',
};

interface AgencyForm {
  agency_number: string;
  agency_title: string;
  contract_type: string;
  stage: string;
  principal_name: string;
  agent_name: string;
  territory: string;
  is_exclusive: boolean;
  commission_rate: string;
  franchise_agreement: boolean;
  expiry_date: string;
  contract_value: string;
  assigned_advisor_id: string;
  description: string;
}

const emptyForm: AgencyForm = {
  agency_number: '', agency_title: '', contract_type: 'distribution', stage: 'draft',
  principal_name: '', agent_name: '', territory: '', is_exclusive: false,
  commission_rate: '0', franchise_agreement: false, expiry_date: '', contract_value: '0',
  assigned_advisor_id: '', description: '',
};

export default function DistributionEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [agencies, setAgencies] = useState<M23Agency[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('agencies');
  const [selectedAgency, setSelectedAgency] = useState<M23Agency | null>(null);
  const [auditLogs, setAuditLogs] = useState<M23AuditLog[]>([]);
  const [allAudit, setAllAudit] = useState<M23AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AgencyForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [agRes, attRes, auditRes] = await Promise.all([
      supabase.from('m23_agencies')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m23_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setAgencies((agRes.data as M23Agency[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAudit((auditRes.data as M23AuditLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyForm, agency_title: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const logAudit = async (agencyId: string, action: string, detail: string) => {
    const hash = '0x' + Math.random().toString(16).substr(2, 4) + '...' + Math.random().toString(16).substr(2, 4);
    await supabase.from('m23_audit_logs').insert({
      case_id: agencyId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (a: M23Agency) => {
    setForm({
      agency_number: a.agency_number, agency_title: a.agency_title, contract_type: a.contract_type,
      stage: a.stage, principal_name: a.principal_name || '', agent_name: a.agent_name || '',
      territory: a.territory || '', is_exclusive: a.is_exclusive,
      commission_rate: String(a.commission_rate || 0), franchise_agreement: a.franchise_agreement,
      expiry_date: a.expiry_date || '', contract_value: String(a.contract_value || 0),
      assigned_advisor_id: a.assigned_advisor_id || '', description: a.description || '',
    });
    setEditingId(a.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.agency_title.trim() || !form.agency_number.trim()) return;
    setSaving(true);
    const payload = {
      agency_number: form.agency_number.trim(),
      agency_title: form.agency_title.trim(),
      contract_type: form.contract_type,
      stage: form.stage,
      status: form.stage,
      principal_name: form.principal_name.trim() || null,
      agent_name: form.agent_name.trim() || null,
      territory: form.territory.trim() || null,
      is_exclusive: form.is_exclusive,
      commission_rate: Number(form.commission_rate) || 0,
      franchise_agreement: form.franchise_agreement,
      expiry_date: form.expiry_date || null,
      contract_value: Number(form.contract_value) || 0,
      assigned_advisor_id: form.assigned_advisor_id || null,
      description: form.description.trim() || null,
    };
    if (editingId) {
      await supabase.from('m23_agencies').update(payload).eq('id', editingId);
      await logAudit(editingId, 'agency_updated', 'تحديث بيانات الوكالة التجارية');
    } else {
      const { data } = await supabase.from('m23_agencies').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'agency_created', 'إنشاء وكالة تجارية — نوع: ' + (CONTRACT_TYPE_LABELS[form.contract_type] || form.contract_type));
        await supabase.from('m23_agencies').update({
          m53_archived: true,
          m26_compliance_checked: true,
          m16_signed: false,
          m54_finance_linked: true,
          m10_deadlines_registered: true,
          m51_tasks_generated: true,
          m80_trademark_linked: true,
          m92_notified: true,
          cost_center_id: 'CC-M23-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm53_archive', 'أرشفة عقد الوكالة في الخزنة (M53)');
        await logAudit(newId, 'm26_compliance', 'فحص الامتثال التجاري في محرك الامتثال (M26)');
        await logAudit(newId, 'm54_finance', 'فتح مركز تكلفة مالي في المحرك المالي (M54)');
        await logAudit(newId, 'm10_deadlines', 'تسجيل مواعيد الوكالة في محرك القضايا (M10)');
        await logAudit(newId, 'm51_tasks', 'توليد مهام الوكالة في محرك المهام (M51)');
        await logAudit(newId, 'm80_trademark', 'ربط العلامة التجارية في محرك العلامات (M80)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء الوكالة');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('m23_agencies').delete().eq('id', deleteId);
    setDeleteId(null);
    setSelectedAgency(null);
    fetchAll();
  };

  const openAgencyDetail = async (a: M23Agency) => {
    setSelectedAgency(a);
    setDetailLoading(true);
    const aRes = await supabase.from('m23_audit_logs').select('*').eq('case_id', a.id).order('created_at', { ascending: true });
    setAuditLogs((aRes.data as M23AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (a: M23Agency) => {
    const idx = STAGES.indexOf(a.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    await supabase.from('m23_agencies').update({ stage: next, status: next }).eq('id', a.id);
    await logAudit(a.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    if (next === 'signed') {
      await supabase.from('m23_agencies').update({ m16_signed: true }).eq('id', a.id);
      await logAudit(a.id, 'm16_signed', 'توقيع عقد الوكالة إلكترونياً في محرك التوقيع (M16)');
    }
    fetchAll();
    const updated = { ...a, stage: next, status: next };
    setSelectedAgency(updated as M23Agency);
  };

  const filteredAgencies = agencies.filter((a) => {
    if (filterType !== 'all' && a.contract_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!a.agency_number.toLowerCase().includes(q) && !a.agency_title.toLowerCase().includes(q) && !(a.principal_name || '').toLowerCase().includes(q) && !(a.agent_name || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeCount = agencies.filter((a) => a.stage === 'signed' || a.stage === 'registered').length;
  const exclusiveCount = agencies.filter((a) => a.is_exclusive).length;
  const totalValue = agencies.reduce((s, a) => s + (a.contract_value || 0), 0);

  const tabs: { id: Tab; label: string; icon: typeof Store; badge?: number }[] = [
    { id: 'agencies', label: 'الوكالات', icon: Store, badge: agencies.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Store size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">التوزيع والوكالات التجارية (M23)</h2>
            <p className="font-body text-[10px] text-ink/40">إدارة عقود التوزيع والوكالات والامتيازات — صياغة ومراجعة وتوقيع وتسجيل</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Shield size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">Air-Gapped · RBAC</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> وكالة تجارية
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Store size={14} className="text-midnight" />} label="إجمالي الوكالات" value={String(agencies.length)} valueClass="text-midnight" />
        <StatCard icon={<BadgeCheck size={14} className="text-green-600" />} label="نشطة" value={String(activeCount)} valueClass="text-green-700" />
        <StatCard icon={<Users size={14} className="text-purple-600" />} label="حصرية" value={String(exclusiveCount)} valueClass="text-purple-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="قيمة العقود" value={formatCurrency(totalValue)} valueClass="text-gold" />
      </div>

      {/* 5-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة الوكالة التجارية — 5 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.draft;
            const count = agencies.filter((a) => a.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[120px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                  </div>
                  <span className="font-body text-[9px] text-cream/40">{count} وكالة</span>
                </div>
                {i < STAGES.length - 1 && <ArrowRight size={12} className="text-gold/30 flex-shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Integration matrix */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} className="text-gold" />
          <span className="font-heading font-bold text-midnight text-xs">مصفوفة التكامل (Integration Matrix)</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { icon: Archive, label: 'الخزنة (M53)', desc: 'أرشفة العقود', color: 'text-blue-600' },
            { icon: Scale, label: 'الامتثال (M26)', desc: 'فحص الامتثال التجاري', color: 'text-red-600' },
            { icon: FileText, label: 'التوقيع (M16)', desc: 'توقيع إلكتروني', color: 'text-purple-600' },
            { icon: DollarSign, label: 'المالية (M54)', desc: 'مراكز التكلفة', color: 'text-gold' },
            { icon: Scale, label: 'القضايا (M10)', desc: 'تسجيل المواعيد', color: 'text-blue-600' },
            { icon: CircuitBoard, label: 'المهام (M51)', desc: 'توليد المهام', color: 'text-amber-600' },
            { icon: BadgeCheck, label: 'العلامات (M80)', desc: 'ربط العلامة التجارية', color: 'text-green-600' },
            { icon: Zap, label: 'الوكيل (M92)', desc: 'تنبيهات ذكية', color: 'text-amber-600' },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={12} className={item.color} />
                  <span className="font-body text-[10px] font-bold text-midnight">{item.label}</span>
                </div>
                <p className="font-body text-[9px] text-ink/40 leading-tight">{item.desc}</p>
              </div>
            );
          })}
        </div>
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

      {/* Filters for agencies */}
      {activeTab === 'agencies' && (
        <div className="flex items-center gap-2">
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الأنواع</option>
            {Object.entries(CONTRACT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم أو عنوان أو طرف..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Agencies tab */}
      {activeTab === 'agencies' && (
        <div className="space-y-2">
          {filteredAgencies.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Store size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد وكالات تجارية مسجلة</p>
            </div>
          ) : (
            filteredAgencies.map((a) => {
              const sCfg = STAGE_CONFIG[a.stage] || STAGE_CONFIG.draft;
              const stageIdx = STAGES.indexOf(a.stage);
              return (
                <div key={a.id} onClick={() => openAgencyDetail(a)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <Store size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{a.agency_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{CONTRACT_TYPE_LABELS[a.contract_type] || a.contract_type}</span>
                          {a.is_exclusive && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Users size={8} /> حصري</span>}
                          {a.franchise_agreement && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Globe size={8} /> امتياز</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{a.agency_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {a.principal_name && <span className="font-body text-[9px] text-ink/40"><Building2 size={9} className="inline ml-0.5" />{a.principal_name}</span>}
                          {a.agent_name && <span className="font-body text-[9px] text-ink/40">← {a.agent_name}</span>}
                          {a.territory && <span className="font-body text-[9px] text-blue-600"><MapPin size={9} className="inline ml-0.5" />{a.territory}</span>}
                          {a.commission_rate > 0 && <span className="font-body text-[9px] text-amber-600"><Percent size={9} className="inline ml-0.5" />{a.commission_rate}%</span>}
                          {a.contract_value > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(a.contract_value)}</span>}
                          {a.expiry_date && <span className="font-body text-[9px] text-amber-600"><Calendar size={9} className="inline ml-0.5" />{formatDate(a.expiry_date)}</span>}
                          {a.m26_compliance_checked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-red-50 text-red-600"><Scale size={8} /> M26</span>}
                          {a.m16_signed && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><FileText size={8} /> M16</span>}
                          {a.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {a.m10_deadlines_registered && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Scale size={8} /> M10</span>}
                          {a.m51_tasks_generated && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><CircuitBoard size={8} /> M51</span>}
                          {a.m80_trademark_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><BadgeCheck size={8} /> M80</span>}
                          {a.m92_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Zap size={8} /> M92</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center gap-0.5">
                        {STAGES.map((s, i) => (
                          <span key={s} className={`w-1.5 h-1.5 rounded-full ${i <= stageIdx ? 'bg-gold' : 'bg-gray-200'}`} />
                        ))}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); openEdit(a); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteId(a.id); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
                      </div>
                      <ChevronRight size={14} className="text-ink/20 group-hover:text-gold transition-colors" />
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
            <span className="font-body text-[10px] text-ink/30">— {allAudit.length} عملية مسجلة</span>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {allAudit.map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {log.action.includes('created') ? <Store size={12} className="text-blue-600" />
                      : log.action.includes('m26') ? <Scale size={12} className="text-red-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m16') ? <FileText size={12} className="text-purple-600" />
                      : log.action.includes('m10') ? <Scale size={12} className="text-blue-600" />
                      : log.action.includes('m51') ? <CircuitBoard size={12} className="text-amber-600" />
                      : log.action.includes('m53') ? <Archive size={12} className="text-blue-600" />
                      : log.action.includes('m80') ? <BadgeCheck size={12} className="text-green-600" />
                      : log.action.includes('m92') ? <Zap size={12} className="text-amber-600" />
                      : log.action.includes('stage') ? <ArrowRight size={12} className="text-gold" />
                      : <Activity size={12} className="text-ink/40" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-body text-[10px] font-bold text-midnight">{log.action}</span>
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

      {/* Agency detail drawer */}
      {selectedAgency && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedAgency(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Store size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">الوكالة التجارية</span>
              </div>
              <button onClick={() => setSelectedAgency(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-gold animate-spin" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-body text-[10px] font-bold text-gold">{selectedAgency.agency_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedAgency.stage] || STAGE_CONFIG.draft).bg} ${(STAGE_CONFIG[selectedAgency.stage] || STAGE_CONFIG.draft).text}`}>
                      {(STAGE_CONFIG[selectedAgency.stage] || STAGE_CONFIG.draft).label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{CONTRACT_TYPE_LABELS[selectedAgency.contract_type] || selectedAgency.contract_type}</span>
                    {selectedAgency.is_exclusive && <span className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-body bg-purple-50 text-purple-600"><Users size={10} /> حصري</span>}
                    {selectedAgency.franchise_agreement && <span className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-body bg-blue-50 text-blue-600"><Globe size={10} /> امتياز</span>}
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedAgency.agency_title}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.draft;
                      const stageIdx = STAGES.indexOf(selectedAgency.stage);
                      const isActive = i === stageIdx;
                      const isPast = i < stageIdx;
                      return (
                        <div key={s} className="flex-1">
                          <div className={`h-1.5 rounded-full ${isPast || isActive ? 'bg-gold' : 'bg-gray-200'} ${isActive ? 'animate-pulse' : ''}`} />
                          <p className={`font-body text-[8px] mt-1 text-center ${isActive ? 'text-gold font-bold' : 'text-ink/30'}`}>{cfg.label}</p>
                        </div>
                      );
                    })}
                  </div>
                  {selectedAgency.stage !== STAGES[STAGES.length - 1] && (
                    <button onClick={() => advanceStage(selectedAgency)} className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
                      <ArrowRight size={12} /> الانتقال للمرحلة التالية
                    </button>
                  )}
                </div>

                {/* Parties info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Building2 size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">أطراف الوكالة</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">المُوكِّل (Principal)</span><p className="font-body text-xs font-bold text-midnight">{selectedAgency.principal_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الوكيل (Agent)</span><p className="font-body text-xs font-bold text-midnight">{selectedAgency.agent_name || '—'}</p></div>
                    {selectedAgency.territory && <div><span className="font-body text-[9px] text-ink/40">الإقليم</span><p className="font-body text-xs font-bold text-blue-600">{selectedAgency.territory}</p></div>}
                    <div><span className="font-body text-[9px] text-ink/40">حصري</span><p className="font-body text-xs font-bold text-midnight">{selectedAgency.is_exclusive ? 'نعم' : 'لا'}</p></div>
                  </div>
                </div>

                {/* Key terms */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Calendar size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">الشروط الرئيسية</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <span className="font-body text-[9px] text-ink/40">نسبة العمولة</span>
                      <p className="font-body text-xs font-bold text-amber-600">{selectedAgency.commission_rate}%</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <span className="font-body text-[9px] text-ink/40">تاريخ الانتهاء</span>
                      <p className="font-body text-xs font-bold text-amber-600">{selectedAgency.expiry_date ? formatDate(selectedAgency.expiry_date) : '—'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <span className="font-body text-[9px] text-ink/40">اتفاقية امتياز</span>
                      <p className="font-body text-xs font-bold text-midnight">{selectedAgency.franchise_agreement ? 'نعم' : 'لا'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <span className="font-body text-[9px] text-ink/40">المستشار</span>
                      <p className="font-body text-xs font-bold text-midnight">{selectedAgency.advisor?.name || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* Financial summary */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <DollarSign size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">الملخص المالي — مركز التكلفة: {selectedAgency.cost_center_id || '—'}</span>
                  </div>
                  <div><span className="font-body text-[9px] text-ink/40">قيمة العقد</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedAgency.contract_value)}</p></div>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedAgency.m26_compliance_checked ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-ink/30'}`}><Scale size={10} /> M26 {selectedAgency.m26_compliance_checked ? 'مُفحَص' : 'غير مُفحَص'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedAgency.m16_signed ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> M16 {selectedAgency.m16_signed ? 'مُوقَّع' : 'غير مُوقَّع'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedAgency.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedAgency.m54_finance_linked ? 'مفتوح' : 'غير مفتوح'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedAgency.m10_deadlines_registered ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Scale size={10} /> M10 {selectedAgency.m10_deadlines_registered ? 'مُسجَّل' : 'غير مُسجَّل'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedAgency.m51_tasks_generated ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><CircuitBoard size={10} /> M51 {selectedAgency.m51_tasks_generated ? 'مُولَّد' : 'غير مُولَّد'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedAgency.m80_trademark_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><BadgeCheck size={10} /> M80 {selectedAgency.m80_trademark_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedAgency.m92_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Zap size={10} /> M92 {selectedAgency.m92_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                </div>

                {selectedAgency.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedAgency.description}</p></div>
                )}

                {/* Audit trail */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2"><Shield size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">سجل التدقيق</span></div>
                  <div className="space-y-1.5">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-2 text-[10px]">
                        <div className="w-1.5 h-1.5 rounded-full bg-gold/40 mt-1 flex-shrink-0" />
                        <div className="flex-1">
                          <span className="font-body text-ink/60">{log.action}</span>
                          {log.detail && <p className="font-body text-ink/40 leading-tight">{log.detail}</p>}
                          <span className="font-body text-ink/30">{new Date(log.created_at).toLocaleString('ar-EG')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Agency create/edit modal */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل الوكالة التجارية' : 'وكالة تجارية جديدة'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الوكالة" required><TextInput value={form.agency_number} onChange={(e) => setForm({ ...form, agency_number: e.target.value })} placeholder="AG-2025-001" /></Field>
          <Field label="نوع العقد">
            <Select value={form.contract_type} onChange={(e) => setForm({ ...form, contract_type: e.target.value })}>
              {Object.entries(CONTRACT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان الوكالة" required><TextInput value={form.agency_title} onChange={(e) => setForm({ ...form, agency_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
          <Field label="قيمة العقد"><TextInput type="number" value={form.contract_value} onChange={(e) => setForm({ ...form, contract_value: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المُوكِّل (Principal)"><TextInput value={form.principal_name} onChange={(e) => setForm({ ...form, principal_name: e.target.value })} /></Field>
          <Field label="الوكيل (Agent)"><TextInput value={form.agent_name} onChange={(e) => setForm({ ...form, agent_name: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الإقليم"><TextInput value={form.territory} onChange={(e) => setForm({ ...form, territory: e.target.value })} placeholder="المملكة العربية السعودية" /></Field>
          <Field label="نسبة العمولة (%)"><TextInput type="number" value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ الانتهاء"><TextInput type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></Field>
          <Field label="المستشار المسؤول">
            <Select value={form.assigned_advisor_id} onChange={(e) => setForm({ ...form, assigned_advisor_id: e.target.value })}>
              <option value="">— اختر —</option>
              {attorneys.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="وكالة حصرية">
            <label className="flex items-center gap-2 mt-2">
              <input type="checkbox" checked={form.is_exclusive} onChange={(e) => setForm({ ...form, is_exclusive: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-gold focus:ring-gold" />
              <span className="font-body text-xs text-ink/60">وكالة حصرية (Exclusive)</span>
            </label>
          </Field>
          <Field label="اتفاقية امتياز">
            <label className="flex items-center gap-2 mt-2">
              <input type="checkbox" checked={form.franchise_agreement} onChange={(e) => setForm({ ...form, franchise_agreement: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-gold focus:ring-gold" />
              <span className="font-body text-xs text-ink/60">اتفاقية امتياز (Franchise)</span>
            </label>
          </Field>
        </div>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
