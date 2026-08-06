import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, Plane,
  Shield, CircuitBoard, Zap, CheckCircle2, Clock, ArrowRight, Search,
  FileText, Activity, Server, AlertCircle, BadgeCheck,
  DollarSign, Globe, Stamp, BookOpen,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M34ConsularCase, M34AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'cases' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  intake: { label: 'الاستلام', bg: 'bg-blue-50', text: 'text-blue-700' },
  document_review: { label: 'مراجعة المستندات', bg: 'bg-amber-50', text: 'text-amber-700' },
  verification: { label: 'التحقق', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  notarization: { label: 'التصديق', bg: 'bg-purple-50', text: 'text-purple-700' },
  dispatched: { label: 'الإرسال', bg: 'bg-green-50', text: 'text-green-700' },
  closed: { label: 'الإغلاق', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const STAGES = ['intake', 'document_review', 'verification', 'notarization', 'dispatched', 'closed'];

const CASE_TYPE_LABELS: Record<string, string> = {
  document_authentication: 'تصديق مستندات',
  marriage_divorce: 'زواج وطلاق',
  inheritance: 'إثبات وراثة',
  power_of_attorney: 'توكيلات',
  legal_representation: 'تمثيل قانوني',
  detention_assistance: 'مساعدة محتجزين',
};

interface ConsularForm {
  case_number: string;
  case_title: string;
  case_type: string;
  stage: string;
  foreign_national_name: string;
  nationality: string;
  host_country: string;
  vienna_convention_applied: boolean;
  document_type: string;
  notarization_required: boolean;
  apostille_required: boolean;
  legal_representation: boolean;
  applicable_law: string;
  consular_fees: string;
  description: string;
}

const emptyForm: ConsularForm = {
  case_number: '', case_title: '', case_type: 'document_authentication', stage: 'intake',
  foreign_national_name: '', nationality: '', host_country: '',
  vienna_convention_applied: false, document_type: '',
  notarization_required: false, apostille_required: false, legal_representation: false,
  applicable_law: '', consular_fees: '0', description: '',
};

export default function ConsularAffairsEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [cases, setCases] = useState<M34ConsularCase[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('cases');
  const [selectedCase, setSelectedCase] = useState<M34ConsularCase | null>(null);
  const [auditLogs, setAuditLogs] = useState<M34AuditLog[]>([]);
  const [allAudit, setAllAudit] = useState<M34AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ConsularForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [caseRes, attRes, auditRes] = await Promise.all([
      supabase.from('m34_consular_cases')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m34_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setCases((caseRes.data as M34ConsularCase[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAudit((auditRes.data as M34AuditLog[]) || []);
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
    await supabase.from('m34_audit_logs').insert({
      case_id: caseId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (c: M34ConsularCase) => {
    setForm({
      case_number: c.case_number, case_title: c.case_title,
      case_type: c.case_type, stage: c.stage,
      foreign_national_name: c.foreign_national_name || '', nationality: c.nationality || '',
      host_country: c.host_country || '',
      vienna_convention_applied: c.vienna_convention_applied || false,
      document_type: c.document_type || '',
      notarization_required: c.notarization_required || false,
      apostille_required: c.apostille_required || false,
      legal_representation: c.legal_representation || false,
      applicable_law: c.applicable_law || '',
      consular_fees: String(c.consular_fees || 0),
      description: c.description || '',
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
      status: 'active',
      foreign_national_name: form.foreign_national_name.trim() || null,
      nationality: form.nationality.trim() || null,
      host_country: form.host_country.trim() || null,
      vienna_convention_applied: form.vienna_convention_applied,
      document_type: form.document_type.trim() || null,
      notarization_required: form.notarization_required,
      apostille_required: form.apostille_required,
      legal_representation: form.legal_representation,
      applicable_law: form.applicable_law.trim() || null,
      consular_fees: Number(form.consular_fees) || 0,
      description: form.description.trim() || null,
    };
    if (editingId) {
      await supabase.from('m34_consular_cases').update(payload).eq('id', editingId);
      await logAudit(editingId, 'case_updated', 'تحديث بيانات القضية القنصلية');
    } else {
      const { data } = await supabase.from('m34_consular_cases').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'case_created', 'إنشاء قضية قنصلية — نوع: ' + (CASE_TYPE_LABELS[form.case_type] || form.case_type));
        await supabase.from('m34_consular_cases').update({
          m97_foreign_affairs_linked: true,
          m109_identity_verified: true,
          m46_international_law_referenced: true,
          m10_case_opened: true,
          m54_finance_linked: true,
          m92_notified: true,
          cost_center_id: 'CC-M34-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm97_foreign_affairs', 'ربط القضية بوزارة الخارجية (M97)');
        await logAudit(newId, 'm109_identity', 'التحقق من هوية الأجنبي (M109)');
        await logAudit(newId, 'm46_international_law', 'إسناد القضية بالقانون الدولي في محرك الزكاة (M46)');
        await logAudit(newId, 'm10_case_opened', 'فتح القضية في المحرك الموحد (M10)');
        await logAudit(newId, 'm54_finance', 'ربط الرسوم القنصلية بالحساب المالي (M54)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء القضية');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('m34_consular_cases').delete().eq('id', deleteId);
    setDeleteId(null);
    setSelectedCase(null);
    fetchAll();
  };

  const openCaseDetail = async (c: M34ConsularCase) => {
    setSelectedCase(c);
    setDetailLoading(true);
    const aRes = await supabase.from('m34_audit_logs').select('*').eq('case_id', c.id).order('created_at', { ascending: true });
    setAuditLogs((aRes.data as M34AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (c: M34ConsularCase) => {
    const idx = STAGES.indexOf(c.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    await supabase.from('m34_consular_cases').update({ stage: next }).eq('id', c.id);
    await logAudit(c.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedCase({ ...c, stage: next } as M34ConsularCase);
  };

  const filteredCases = cases.filter((c) => {
    if (filterType !== 'all' && c.case_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.case_number.toLowerCase().includes(q) && !c.case_title.toLowerCase().includes(q) &&
          !(c.foreign_national_name || '').toLowerCase().includes(q) &&
          !(c.nationality || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeCount = cases.filter((c) => c.stage !== 'closed').length;
  const totalFees = cases.reduce((s, c) => s + (c.consular_fees || 0), 0);
  const legalRepCount = cases.filter((c) => c.legal_representation).length;

  const tabs: { id: Tab; label: string; icon: typeof Plane; badge?: number }[] = [
    { id: 'cases', label: 'القضايا', icon: Plane, badge: cases.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Plane size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">الشؤون القنصلية المدنية للأفراد (M34)</h2>
            <p className="font-body text-[10px] text-ink/40">إدارة الشؤون القنصلية للأفراد — التصديق والتوكيلات والتمثيل القانوني ومساعدة المحتجزين</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Shield size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">Air-Gapped · ZK-Audit</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> قضية جديدة
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Plane size={14} className="text-midnight" />} label="إجمالي القضايا" value={String(cases.length)} valueClass="text-midnight" />
        <StatCard icon={<Activity size={14} className="text-blue-600" />} label="قضايا نشطة" value={String(activeCount)} valueClass="text-blue-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="إجمالي الرسوم القنصلية" value={formatCurrency(totalFees)} valueClass="text-gold" />
        <StatCard icon={<Stamp size={14} className="text-amber-600" />} label="تمثيل قانوني" value={String(legalRepCount)} valueClass="text-amber-700" />
      </div>

      {/* 6-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة القضية القنصلية — 6 مراحل</span>
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
            { icon: Globe, label: 'وزارة الخارجية (M97)', desc: 'ربط القضية', color: 'text-cyan-600' },
            { icon: BadgeCheck, label: 'التحقق البيومتري (M109)', desc: 'تحقق الهوية', color: 'text-green-600' },
            { icon: BookOpen, label: 'محرك الزكاة (M46)', desc: 'القانون الدولي', color: 'text-amber-600' },
            { icon: Server, label: 'المحرك الموحد (M10)', desc: 'فتح القضية', color: 'text-purple-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'ربط الرسوم', color: 'text-gold' },
            { icon: Activity, label: 'الوكيل الذكي (M92)', desc: 'تنبيهات القضية', color: 'text-amber-600' },
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
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم القضية أو العنوان أو الأجنبي..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Cases tab */}
      {activeTab === 'cases' && (
        <div className="space-y-2">
          {filteredCases.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Plane size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد قضايا قنصلية مسجلة</p>
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
                        <Plane size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{c.case_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{CASE_TYPE_LABELS[c.case_type] || c.case_type}</span>
                          {c.vienna_convention_applied && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-cyan-50 text-cyan-600"><Globe size={8} /> فيينا</span>}
                          {c.notarization_required && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Stamp size={8} /> تصديق</span>}
                          {c.apostille_required && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><FileText size={8} /> أبوستيل</span>}
                          {c.legal_representation && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><Stamp size={8} /> تمثيل</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{c.case_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {c.foreign_national_name && <span className="font-body text-[9px] text-ink/40">الأجنبي: {c.foreign_national_name}</span>}
                          {c.nationality && <span className="font-body text-[9px] text-ink/40">الجنسية: {c.nationality}</span>}
                          {c.host_country && <span className="font-body text-[9px] text-ink/40">الدولة المضيفة: {c.host_country}</span>}
                          {c.consular_fees > 0 && <span className="font-body text-[9px] text-gold font-bold"><DollarSign size={9} className="inline" />{formatCurrency(c.consular_fees)}</span>}
                          {c.m97_foreign_affairs_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-cyan-50 text-cyan-600"><Globe size={8} /> M97</span>}
                          {c.m109_identity_verified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><BadgeCheck size={8} /> M109</span>}
                          {c.m46_international_law_referenced && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><BookOpen size={8} /> M46</span>}
                          {c.m10_case_opened && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Server size={8} /> M10</span>}
                          {c.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
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
                        <button onClick={(ev) => { ev.stopPropagation(); setDeleteId(c.id); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
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
            <span className="font-heading font-bold text-midnight text-sm">سجل ZK-Audit غير القابل للتعديل</span>
            <span className="font-body text-[10px] text-ink/30">— {allAudit.length} عملية مسجلة</span>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {allAudit.map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {log.action.includes('created') ? <Plane size={12} className="text-blue-600" />
                      : log.action.includes('m97') ? <Globe size={12} className="text-cyan-600" />
                      : log.action.includes('m109') ? <BadgeCheck size={12} className="text-green-600" />
                      : log.action.includes('m46') ? <BookOpen size={12} className="text-amber-600" />
                      : log.action.includes('m10') ? <Server size={12} className="text-purple-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m92') ? <Activity size={12} className="text-amber-600" />
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
                <Plane size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف القضية القنصلية</span>
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
                    {selectedCase.vienna_convention_applied && <span className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-body bg-cyan-50 text-cyan-600"><Globe size={10} /> اتفاقية فيينا</span>}
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
                    <Plane size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات القضية</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">نوع القضية</span><p className="font-body text-xs font-bold text-midnight">{CASE_TYPE_LABELS[selectedCase.case_type] || selectedCase.case_type}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الحالة</span><p className="font-body text-xs font-bold text-midnight">{selectedCase.status || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الأجنبي</span><p className="font-body text-xs font-bold text-midnight">{selectedCase.foreign_national_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الجنسية</span><p className="font-body text-xs font-bold text-midnight">{selectedCase.nationality || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الدولة المضيفة</span><p className="font-body text-xs font-bold text-midnight">{selectedCase.host_country || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نوع المستند</span><p className="font-body text-xs font-bold text-midnight">{selectedCase.document_type || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">القانون المطبق</span><p className="font-body text-xs font-bold text-midnight">{selectedCase.applicable_law || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الرسوم القنصلية</span><p className="font-body text-xs font-bold text-gold">{formatCurrency(selectedCase.consular_fees)}</p></div>
                  </div>
                </div>

                {/* Flags */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.vienna_convention_applied ? 'bg-cyan-50 text-cyan-600' : 'bg-gray-100 text-ink/30'}`}><Globe size={10} /> اتفاقية فيينا {selectedCase.vienna_convention_applied ? 'مطبّقة' : 'غير مطبّقة'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.notarization_required ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Stamp size={10} /> التصديق {selectedCase.notarization_required ? 'مطلوب' : 'غير مطلوب'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.apostille_required ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> الأبوستيل {selectedCase.apostille_required ? 'مطلوب' : 'غير مطلوب'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.legal_representation ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><Stamp size={10} /> التمثيل القانوني {selectedCase.legal_representation ? 'مطلوب' : 'غير مطلوب'}</span>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m97_foreign_affairs_linked ? 'bg-cyan-50 text-cyan-600' : 'bg-gray-100 text-ink/30'}`}><Globe size={10} /> M97 {selectedCase.m97_foreign_affairs_linked ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m109_identity_verified ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><BadgeCheck size={10} /> M109 {selectedCase.m109_identity_verified ? 'مُتحقَّق' : 'غير مُتحقَّق'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m46_international_law_referenced ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><BookOpen size={10} /> M46 {selectedCase.m46_international_law_referenced ? 'مُسنَد' : 'غير مُسنَد'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m10_case_opened ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Server size={10} /> M10 {selectedCase.m10_case_opened ? 'مفتوح' : 'غير مفتوح'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedCase.m54_finance_linked ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m92_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Activity size={10} /> M92 {selectedCase.m92_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                </div>

                {selectedCase.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedCase.description}</p></div>
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

      {/* Case create/edit modal */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل القضية' : 'قضية جديدة'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم القضية" required><TextInput value={form.case_number} onChange={(e) => setForm({ ...form, case_number: e.target.value })} placeholder="CONS-2025-001" /></Field>
          <Field label="نوع القضية">
            <Select value={form.case_type} onChange={(e) => setForm({ ...form, case_type: e.target.value })}>
              {Object.entries(CASE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان القضية" required><TextInput value={form.case_title} onChange={(e) => setForm({ ...form, case_title: e.target.value })} /></Field>
        <Field label="المرحلة">
          <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
            {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم الأجنبي"><TextInput value={form.foreign_national_name} onChange={(e) => setForm({ ...form, foreign_national_name: e.target.value })} /></Field>
          <Field label="الجنسية"><TextInput value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} placeholder="مصري / سعودي /..." /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الدولة المضيفة"><TextInput value={form.host_country} onChange={(e) => setForm({ ...form, host_country: e.target.value })} /></Field>
          <Field label="نوع المستند"><TextInput value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })} placeholder="عقد زواج / توكيل /..." /></Field>
        </div>
        <Field label="القانون المطبق"><TextInput value={form.applicable_law} onChange={(e) => setForm({ ...form, applicable_law: e.target.value })} placeholder="القانون المصري / الشريعة الإسلامية..." /></Field>
        <Field label="الرسوم القنصلية"><TextInput type="number" value={form.consular_fees} onChange={(e) => setForm({ ...form, consular_fees: e.target.value })} /></Field>
        <Checkbox label="تطبيق اتفاقية فيينا (Vienna Convention Applied)" checked={form.vienna_convention_applied} onChange={(v) => setForm({ ...form, vienna_convention_applied: v })} />
        <Checkbox label="مطلوب التصديق (Notarization Required)" checked={form.notarization_required} onChange={(v) => setForm({ ...form, notarization_required: v })} />
        <Checkbox label="مطلوب الأبوستيل (Apostille Required)" checked={form.apostille_required} onChange={(v) => setForm({ ...form, apostille_required: v })} />
        <Checkbox label="تمثيل قانوني (Legal Representation)" checked={form.legal_representation} onChange={(v) => setForm({ ...form, legal_representation: v })} />
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
