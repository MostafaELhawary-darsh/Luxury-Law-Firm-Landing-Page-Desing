import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, Split,
  Shield, CircuitBoard, Zap, CheckCircle2, Clock, ArrowRight, Search,
  Activity, Server, AlertCircle, BadgeCheck,
  DollarSign, Baby, Users, Building2,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M31JointProperty, M31Partner, M31AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'cases' | 'partners' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  intake: { label: 'الاستلام', bg: 'bg-blue-50', text: 'text-blue-700' },
  inventoried: { label: 'الجرد', bg: 'bg-amber-50', text: 'text-amber-700' },
  valued: { label: 'التقييم', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  partitioned: { label: 'الفرز', bg: 'bg-purple-50', text: 'text-purple-700' },
  registered: { label: 'التسجيل', bg: 'bg-green-50', text: 'text-green-700' },
  closed: { label: 'الإغلاق', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const STAGES = ['intake', 'inventoried', 'valued', 'partitioned', 'registered', 'closed'];

const CASE_TYPE_LABELS: Record<string, string> = {
  partition: 'فرز',
  consolidation: 'تجميع',
  ending_joint_ownership: 'إنهاء شيوع',
};

const PARTITION_METHOD_LABELS: Record<string, string> = {
  physical: 'فرز مادي',
  financial: 'فرز مالي',
  sale_distribution: 'بيع وتوزيع',
};

interface CaseForm {
  case_number: string;
  case_title: string;
  case_type: string;
  stage: string;
  property_description: string;
  property_value: string;
  partners_count: string;
  partition_method: string;
  expert_assigned: string;
  consolidation_proposed: boolean;
  description: string;
}

const emptyForm: CaseForm = {
  case_number: '', case_title: '', case_type: 'partition', stage: 'intake',
  property_description: '', property_value: '0', partners_count: '0',
  partition_method: 'physical', expert_assigned: '', consolidation_proposed: false,
  description: '',
};

const emptyPartnerForm = {
  partner_name: '', share_fraction: '', share_percentage: '0',
  share_value: '0', is_minors: false, guardian_name: '',
};

export default function JointPropertyEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [cases, setCases] = useState<M31JointProperty[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('cases');
  const [selectedCase, setSelectedCase] = useState<M31JointProperty | null>(null);
  const [partners, setPartners] = useState<M31Partner[]>([]);
  const [auditLogs, setAuditLogs] = useState<M31AuditLog[]>([]);
  const [allPartners, setAllPartners] = useState<M31Partner[]>([]);
  const [allAudit, setAllAudit] = useState<M31AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CaseForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'case' | 'partner'>('case');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [partnerForm, setPartnerForm] = useState(emptyPartnerForm);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [csRes, attRes, partnerRes, auditRes] = await Promise.all([
      supabase.from('m31_joint_properties')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m31_partners').select('*').order('created_at', { ascending: false }),
      supabase.from('m31_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setCases((csRes.data as M31JointProperty[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllPartners((partnerRes.data as M31Partner[]) || []);
    setAllAudit((auditRes.data as M31AuditLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyForm, case_title: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const logAudit = async (caseId: string, action: string, detail: string) => {
    const hash = '0x' + Math.random().toString(16).substr(2, 4) + '...' + Math.random().toString(16).substr(2, 4);
    await supabase.from('m31_audit_logs').insert({
      case_id: caseId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (c: M31JointProperty) => {
    setForm({
      case_number: c.case_number, case_title: c.case_title,
      case_type: c.case_type, stage: c.stage,
      property_description: c.property_description || '',
      property_value: String(c.property_value || 0), partners_count: String(c.partners_count || 0),
      partition_method: c.partition_method || 'physical', expert_assigned: c.expert_assigned || '',
      consolidation_proposed: c.consolidation_proposed || false, description: c.description || '',
    });
    setEditingId(c.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.case_title.trim() || !form.case_number.trim()) return;
    setSaving(true);
    const payload = {
      case_number: form.case_number.trim(),
      case_title: form.case_title.trim(),
      case_type: form.case_type,
      stage: form.stage,
      property_description: form.property_description.trim() || null,
      property_value: Number(form.property_value) || 0,
      partners_count: Number(form.partners_count) || 0,
      partition_method: form.partition_method,
      expert_assigned: form.expert_assigned.trim() || null,
      consolidation_proposed: form.consolidation_proposed,
      description: form.description.trim() || null,
    };
    if (editingId) {
      await supabase.from('m31_joint_properties').update(payload).eq('id', editingId);
      await logAudit(editingId, 'case_updated', 'تحديث بيانات القضية');
    } else {
      const { data } = await supabase.from('m31_joint_properties').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'case_created', 'إنشاء قضية ملكية شائعة — النوع: ' + (CASE_TYPE_LABELS[form.case_type] || form.case_type));
        await supabase.from('m31_joint_properties').update({
          m83_property_valued: true,
          m27_estate_linked: false,
          m10_case_opened: true,
          m54_finance_linked: true,
          m109_biometric_required: true,
          m92_notified: true,
          cost_center_id: 'CC-M31-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm83_valued', 'تقييم العقار في محرك التقييم (M83)');
        await logAudit(newId, 'm10_case', 'فتح القضية في المحرك الموحد (M10)');
        await logAudit(newId, 'm54_finance', 'ربط القضية بالمحرك المالي (M54)');
        await logAudit(newId, 'm109_biometric', 'التحقق البيومتري للشركاء (M109)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء القضية');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (deleteType === 'case') await supabase.from('m31_joint_properties').delete().eq('id', deleteId);
    else await supabase.from('m31_partners').delete().eq('id', deleteId);
    setDeleteId(null);
    if (deleteType === 'case') setSelectedCase(null);
    fetchAll();
    if (selectedCase && deleteType === 'partner') openCaseDetail(selectedCase);
  };

  const openCaseDetail = async (c: M31JointProperty) => {
    setSelectedCase(c);
    setDetailLoading(true);
    const [partnerRes, aRes] = await Promise.all([
      supabase.from('m31_partners').select('*').eq('joint_property_id', c.id).order('created_at', { ascending: true }),
      supabase.from('m31_audit_logs').select('*').eq('case_id', c.id).order('created_at', { ascending: true }),
    ]);
    setPartners((partnerRes.data as M31Partner[]) || []);
    setAuditLogs((aRes.data as M31AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (c: M31JointProperty) => {
    const idx = STAGES.indexOf(c.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    await supabase.from('m31_joint_properties').update({ stage: next }).eq('id', c.id);
    await logAudit(c.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedCase({ ...c, stage: next } as M31JointProperty);
  };

  const addPartner = async () => {
    if (!selectedCase || !partnerForm.partner_name.trim()) return;
    await supabase.from('m31_partners').insert({
      joint_property_id: selectedCase.id,
      partner_name: partnerForm.partner_name.trim(),
      share_fraction: partnerForm.share_fraction.trim() || null,
      share_percentage: Number(partnerForm.share_percentage) || 0,
      share_value: Number(partnerForm.share_value) || 0,
      is_minors: partnerForm.is_minors,
      guardian_name: partnerForm.guardian_name.trim() || null,
    });
    await logAudit(selectedCase.id, 'partner_added', 'إضافة شريك: ' + partnerForm.partner_name);
    setPartnerForm(emptyPartnerForm);
    setPartnerModalOpen(false);
    openCaseDetail(selectedCase);
  };

  const filteredCases = cases.filter((c) => {
    if (filterType !== 'all' && c.case_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.case_number.toLowerCase().includes(q) && !c.case_title.toLowerCase().includes(q) && !(c.property_description || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeCount = cases.filter((c) => c.stage !== 'closed').length;
  const totalValue = cases.reduce((s, c) => s + (c.property_value || 0), 0);
  const totalPartners = cases.reduce((s, c) => s + (c.partners_count || 0), 0);

  const tabs: { id: Tab; label: string; icon: typeof Split; badge?: number }[] = [
    { id: 'cases', label: 'القضايا', icon: Split, badge: cases.length },
    { id: 'partners', label: 'الشركاء', icon: Users, badge: allPartners.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Split size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">الملكية الشائعة والفرز والتجميع (M31)</h2>
            <p className="font-body text-[10px] text-ink/40">إدارة الملكية الشائعة — الفرز والتجميع وإنهاء الشيوع بين الشركاء</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Shield size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">On-Premise · AES-256</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> قضية جديدة
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Split size={14} className="text-midnight" />} label="إجمالي القضايا" value={String(cases.length)} valueClass="text-midnight" />
        <StatCard icon={<Activity size={14} className="text-blue-600" />} label="قضايا نشطة" value={String(activeCount)} valueClass="text-blue-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="إجمالي قيمة العقارات" value={formatCurrency(totalValue)} valueClass="text-gold" />
        <StatCard icon={<Users size={14} className="text-amber-600" />} label="إجمالي الشركاء" value={String(totalPartners)} valueClass="text-amber-700" />
      </div>

      {/* 6-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة القضية — 6 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.intake;
            const count = cases.filter((c) => c.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[130px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                  </div>
                  <span className="font-body text-[9px] text-cream/40">{count} قضية</span>
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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {[
            { icon: Building2, label: 'التقييم (M83)', desc: 'تقييم العقار', color: 'text-green-600' },
            { icon: Users, label: 'التركات (M27)', desc: 'ربط التركة', color: 'text-blue-600' },
            { icon: Server, label: 'المحرك الموحد (M10)', desc: 'فتح القضية', color: 'text-purple-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'ربط الأمانة', color: 'text-gold' },
            { icon: BadgeCheck, label: 'البيومتري (M109)', desc: 'تحقق الشركاء', color: 'text-green-600' },
            { icon: Activity, label: 'الوكيل الذكي (M92)', desc: 'تنبيهات المواعيد', color: 'text-amber-600' },
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

      {/* Filters for cases */}
      {activeTab === 'cases' && (
        <div className="flex items-center gap-2">
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الأنواع</option>
            {Object.entries(CASE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم القضية أو العنوان أو العقار..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Cases tab */}
      {activeTab === 'cases' && (
        <div className="space-y-2">
          {filteredCases.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Split size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد قضايا مسجلة</p>
            </div>
          ) : (
            filteredCases.map((c) => {
              const sCfg = STAGE_CONFIG[c.stage] || STAGE_CONFIG.intake;
              const stageIdx = STAGES.indexOf(c.stage);
              return (
                <div key={c.id} onClick={() => openCaseDetail(c)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <Split size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{c.case_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{CASE_TYPE_LABELS[c.case_type] || c.case_type}</span>
                          {c.consolidation_proposed && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Building2 size={8} /> تجميع مقترح</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{c.case_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {c.property_description && <span className="font-body text-[9px] text-ink/40 line-clamp-1">{c.property_description}</span>}
                          {c.property_value > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(c.property_value)}</span>}
                          <span className="font-body text-[9px] text-ink/40">الشركاء: {c.partners_count}</span>
                          <span className="font-body text-[9px] text-ink/40">الفرز: {PARTITION_METHOD_LABELS[c.partition_method] || c.partition_method}</span>
                          {c.m83_property_valued && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><Building2 size={8} /> M83</span>}
                          {c.m10_case_opened && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Server size={8} /> M10</span>}
                          {c.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {c.m109_biometric_required && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><BadgeCheck size={8} /> M109</span>}
                          {c.m92_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Activity size={8} /> M92</span>}
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
                        <button onClick={(ev) => { ev.stopPropagation(); openEdit(c); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                        <button onClick={(ev) => { ev.stopPropagation(); setDeleteId(c.id); setDeleteType('case'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
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

      {/* Partners tab */}
      {activeTab === 'partners' && (
        <div className="space-y-2">
          {allPartners.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><Users size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا يوجد شركاء مسجلون</p></div>
          ) : (
            allPartners.map((p) => {
              const cs = cases.find((c) => c.id === p.joint_property_id);
              return (
                <div key={p.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-50">
                        <Users size={14} className="text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {p.is_minors ? (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Baby size={8} /> قاصر</span>
                          ) : (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> بالغ</span>
                          )}
                          {cs && <span className="font-body text-[9px] text-gold">{cs.case_number}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{p.partner_name} {p.guardian_name && <span className="text-ink/40 font-normal">— ولي: {p.guardian_name}</span>}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {p.share_fraction && <span className="font-body text-[9px] text-ink/40">السهم: {p.share_fraction}</span>}
                          {p.share_percentage > 0 && <span className="font-body text-[9px] text-ink/40">{p.share_percentage}%</span>}
                          {p.share_value > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(p.share_value)}</span>}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(p.id); setDeleteType('partner'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={12} />
                    </button>
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
            <span className="font-heading font-bold text-midnight text-sm">سجل ZK-Audit غير القابل للتعديل</span>
            <span className="font-body text-[10px] text-ink/30">— {allAudit.length} عملية مسجلة</span>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {allAudit.map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {log.action.includes('created') ? <Split size={12} className="text-blue-600" />
                      : log.action.includes('m83') ? <Building2 size={12} className="text-green-600" />
                      : log.action.includes('m10') ? <Server size={12} className="text-purple-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m109') ? <BadgeCheck size={12} className="text-green-600" />
                      : log.action.includes('m92') ? <Activity size={12} className="text-amber-600" />
                      : log.action.includes('partner') ? <Users size={12} className="text-blue-600" />
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
                      {log.hash_chain && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/30"><Shield size={8} /> {log.hash_chain}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Case detail drawer */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedCase(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Split size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف القضية</span>
              </div>
              <button onClick={() => setSelectedCase(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-gold animate-spin" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-body text-[10px] font-bold text-gold">{selectedCase.case_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedCase.stage] || STAGE_CONFIG.intake).bg} ${(STAGE_CONFIG[selectedCase.stage] || STAGE_CONFIG.intake).text}`}>
                      {(STAGE_CONFIG[selectedCase.stage] || STAGE_CONFIG.intake).label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{CASE_TYPE_LABELS[selectedCase.case_type] || selectedCase.case_type}</span>
                    {selectedCase.consolidation_proposed && <span className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-body bg-purple-50 text-purple-600"><Building2 size={10} /> تجميع مقترح</span>}
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedCase.case_title}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.intake;
                      const stageIdx = STAGES.indexOf(selectedCase.stage);
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
                  {selectedCase.stage !== STAGES[STAGES.length - 1] && (
                    <button onClick={() => advanceStage(selectedCase)} className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
                      <ArrowRight size={12} /> الانتقال للمرحلة التالية
                    </button>
                  )}
                </div>

                {/* Case info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Split size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات القضية</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">وصف العقار</span><p className="font-body text-xs font-bold text-midnight">{selectedCase.property_description || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">قيمة العقار</span><p className="font-body text-xs font-bold text-gold">{formatCurrency(selectedCase.property_value)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">عدد الشركاء</span><p className="font-body text-xs font-bold text-midnight">{selectedCase.partners_count}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">طريقة الفرز</span><p className="font-body text-xs font-bold text-midnight">{PARTITION_METHOD_LABELS[selectedCase.partition_method] || selectedCase.partition_method}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الخبير المعيَّن</span><p className="font-body text-xs font-bold text-midnight">{selectedCase.expert_assigned || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المستشار</span><p className="font-body text-xs font-bold text-midnight">{selectedCase.advisor?.name || '—'}</p></div>
                  </div>
                </div>

                {/* Flags */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.consolidation_proposed ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Building2 size={10} /> التجميع {selectedCase.consolidation_proposed ? 'مقترح' : 'غير مقترح'}</span>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m83_property_valued ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><Building2 size={10} /> M83 {selectedCase.m83_property_valued ? 'مُقيَّم' : 'غير مُقيَّم'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m27_estate_linked ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Users size={10} /> M27 {selectedCase.m27_estate_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m10_case_opened ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Server size={10} /> M10 {selectedCase.m10_case_opened ? 'مفتوح' : 'غير مفتوح'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedCase.m54_finance_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m109_biometric_required ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><BadgeCheck size={10} /> M109 {selectedCase.m109_biometric_required ? 'مطلوب' : 'غير مطلوب'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m92_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Activity size={10} /> M92 {selectedCase.m92_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                </div>

                {selectedCase.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedCase.description}</p></div>
                )}

                {/* Partners sub-entities */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><Users size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">الشركاء</span></div>
                    <button onClick={() => setPartnerModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> إضافة شريك</button>
                  </div>
                  <div className="space-y-1.5">
                    {partners.map((p) => (
                      <div key={p.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/partner">
                        <div className="flex items-center gap-2 mb-1">
                          {p.is_minors ? (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Baby size={8} /> قاصر</span>
                          ) : (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> بالغ</span>
                          )}
                          <p className="font-body text-[10px] font-bold text-midnight flex-1">{p.partner_name} {p.guardian_name && <span className="text-ink/40 font-normal">— ولي: {p.guardian_name}</span>}</p>
                          <button onClick={() => { setDeleteId(p.id); setDeleteType('partner'); }} className="p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/partner:opacity-100 transition-all"><Trash2 size={10} /></button>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {p.share_fraction && <span className="font-body text-[9px] text-ink/40">السهم: {p.share_fraction}</span>}
                          {p.share_percentage > 0 && <span className="font-body text-[9px] text-ink/40">{p.share_percentage}%</span>}
                          {p.share_value > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(p.share_value)}</span>}
                        </div>
                      </div>
                    ))}
                    {partners.length === 0 && <p className="font-body text-[10px] text-ink/30">لا يوجد شركاء مسجلون</p>}
                  </div>
                </div>

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

      {/* Case create/edit modal */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل القضية' : 'قضية جديدة'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم القضية" required><TextInput value={form.case_number} onChange={(e) => setForm({ ...form, case_number: e.target.value })} placeholder="JP-2025-001" /></Field>
          <Field label="نوع القضية">
            <Select value={form.case_type} onChange={(e) => setForm({ ...form, case_type: e.target.value })}>
              {Object.entries(CASE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان القضية" required><TextInput value={form.case_title} onChange={(e) => setForm({ ...form, case_title: e.target.value })} /></Field>
        <Field label="وصف العقار"><TextArea value={form.property_description} onChange={(e) => setForm({ ...form, property_description: e.target.value })} rows={2} /></Field>
        <div className="grid grid-cols-3 gap-4">
          <Field label="قيمة العقار"><TextInput type="number" value={form.property_value} onChange={(e) => setForm({ ...form, property_value: e.target.value })} /></Field>
          <Field label="عدد الشركاء"><TextInput type="number" value={form.partners_count} onChange={(e) => setForm({ ...form, partners_count: e.target.value })} /></Field>
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="طريقة الفرز">
            <Select value={form.partition_method} onChange={(e) => setForm({ ...form, partition_method: e.target.value })}>
              {Object.entries(PARTITION_METHOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="الخبير المعيَّن"><TextInput value={form.expert_assigned} onChange={(e) => setForm({ ...form, expert_assigned: e.target.value })} /></Field>
        </div>
        <Checkbox label="تجميع مقترح (Consolidation Proposed)" checked={form.consolidation_proposed} onChange={(v) => setForm({ ...form, consolidation_proposed: v })} />
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      {/* Partner modal */}
      <EntityModal open={partnerModalOpen} title="إضافة شريك" onClose={() => setPartnerModalOpen(false)} onSubmit={addPartner}>
        <Field label="اسم الشريك" required><TextInput value={partnerForm.partner_name} onChange={(e) => setPartnerForm({ ...partnerForm, partner_name: e.target.value })} /></Field>
        <div className="grid grid-cols-3 gap-4">
          <Field label="السهم (كسر)"><TextInput value={partnerForm.share_fraction} onChange={(e) => setPartnerForm({ ...partnerForm, share_fraction: e.target.value })} placeholder="1/2" /></Field>
          <Field label="النسبة (%)"><TextInput type="number" value={partnerForm.share_percentage} onChange={(e) => setPartnerForm({ ...partnerForm, share_percentage: e.target.value })} /></Field>
          <Field label="قيمة السهم"><TextInput type="number" value={partnerForm.share_value} onChange={(e) => setPartnerForm({ ...partnerForm, share_value: e.target.value })} /></Field>
        </div>
        <Checkbox label="قاصر (Is Minor)" checked={partnerForm.is_minors} onChange={(v) => setPartnerForm({ ...partnerForm, is_minors: v })} />
        {partnerForm.is_minors && (
          <Field label="اسم الولي"><TextInput value={partnerForm.guardian_name} onChange={(e) => setPartnerForm({ ...partnerForm, guardian_name: e.target.value })} /></Field>
        )}
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
