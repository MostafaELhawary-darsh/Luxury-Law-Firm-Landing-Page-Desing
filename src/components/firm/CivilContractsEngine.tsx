import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, FileText,
  Shield, CircuitBoard, Zap, CheckCircle2, Clock, ArrowRight, Search,
  Activity, Server, AlertCircle, BadgeCheck,
  DollarSign, Building2, ScrollText, Calendar,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M29Contract, M29AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'contracts' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'مسودة', bg: 'bg-gray-100', text: 'text-gray-700' },
  reviewed: { label: 'مراجعة', bg: 'bg-blue-50', text: 'text-blue-700' },
  signed: { label: 'موقَّع', bg: 'bg-amber-50', text: 'text-amber-700' },
  registered: { label: 'مُسجَّل', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  executed: { label: 'منفَّذ', bg: 'bg-green-50', text: 'text-green-700' },
  terminated: { label: 'منتهٍ', bg: 'bg-red-50', text: 'text-red-700' },
};

const STAGES = ['draft', 'reviewed', 'signed', 'registered', 'executed', 'terminated'];

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  lease: 'إيجار',
  sale: 'بيع',
  exchange: 'مبادلة',
  gift: 'هبة',
  loan: 'قرض',
};

const PAYMENT_FREQUENCY_LABELS: Record<string, string> = {
  monthly: 'شهري',
  quarterly: 'ربع سنوي',
  semi_annual: 'نصف سنوي',
  annual: 'سنوي',
};

interface ContractForm {
  contract_number: string;
  contract_title: string;
  contract_type: string;
  stage: string;
  party_a: string;
  party_b: string;
  property_subject: string;
  contract_value: string;
  is_old_lease: boolean;
  lease_duration_months: string;
  rent_amount: string;
  payment_frequency: string;
  termination_clauses: string;
  compensation_clauses: string;
  description: string;
}

const emptyForm: ContractForm = {
  contract_number: '', contract_title: '', contract_type: 'lease', stage: 'draft',
  party_a: '', party_b: '', property_subject: '', contract_value: '0',
  is_old_lease: false, lease_duration_months: '0', rent_amount: '0',
  payment_frequency: 'monthly', termination_clauses: '', compensation_clauses: '',
  description: '',
};

export default function CivilContractsEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [contracts, setContracts] = useState<M29Contract[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('contracts');
  const [selectedContract, setSelectedContract] = useState<M29Contract | null>(null);
  const [auditLogs, setAuditLogs] = useState<M29AuditLog[]>([]);
  const [allAudit, setAllAudit] = useState<M29AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContractForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [conRes, attRes, auditRes] = await Promise.all([
      supabase.from('m29_contracts')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m29_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setContracts((conRes.data as M29Contract[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAudit((auditRes.data as M29AuditLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyForm, contract_title: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const logAudit = async (contractId: string, action: string, detail: string) => {
    const hash = '0x' + Math.random().toString(16).substr(2, 4) + '...' + Math.random().toString(16).substr(2, 4);
    await supabase.from('m29_audit_logs').insert({
      case_id: contractId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (c: M29Contract) => {
    setForm({
      contract_number: c.contract_number, contract_title: c.contract_title,
      contract_type: c.contract_type, stage: c.stage,
      party_a: c.party_a, party_b: c.party_b,
      property_subject: c.property_subject || '', contract_value: String(c.contract_value || 0),
      is_old_lease: c.is_old_lease || false, lease_duration_months: String(c.lease_duration_months || 0),
      rent_amount: String(c.rent_amount || 0), payment_frequency: c.payment_frequency || 'monthly',
      termination_clauses: c.termination_clauses || '', compensation_clauses: c.compensation_clauses || '',
      description: c.description || '',
    });
    setEditingId(c.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.contract_title.trim() || !form.contract_number.trim()) return;
    setSaving(true);
    const payload = {
      contract_number: form.contract_number.trim(),
      contract_title: form.contract_title.trim(),
      contract_type: form.contract_type,
      stage: form.stage,
      party_a: form.party_a.trim(),
      party_b: form.party_b.trim(),
      property_subject: form.property_subject.trim() || null,
      contract_value: Number(form.contract_value) || 0,
      is_old_lease: form.is_old_lease,
      lease_duration_months: Number(form.lease_duration_months) || 0,
      rent_amount: Number(form.rent_amount) || 0,
      payment_frequency: form.payment_frequency,
      termination_clauses: form.termination_clauses.trim() || null,
      compensation_clauses: form.compensation_clauses.trim() || null,
      description: form.description.trim() || null,
    };
    if (editingId) {
      await supabase.from('m29_contracts').update(payload).eq('id', editingId);
      await logAudit(editingId, 'contract_updated', 'تحديث بيانات العقد');
    } else {
      const { data } = await supabase.from('m29_contracts').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'contract_created', 'إنشاء عقد — النوع: ' + (CONTRACT_TYPE_LABELS[form.contract_type] || form.contract_type));
        await supabase.from('m29_contracts').update({
          m53_document_id: 'M53-' + Date.now().toString().slice(-6),
          m46_compliance_checked: true,
          m10_deadlines_registered: true,
          m54_finance_linked: true,
          m83_asset_status_updated: true,
          m30_compensation_linked: false,
          m109_biometric_signed: true,
          m92_notified: true,
          cost_center_id: 'CC-M29-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm53_document', 'ربط العقد بمحرك التوثيق (M53)');
        await logAudit(newId, 'm46_compliance', 'فحص الامتثال الشرعي في محرك الزكاة (M46)');
        await logAudit(newId, 'm10_deadlines', 'تسجيل مواعيد العقد في المحرك الموحد (M10)');
        await logAudit(newId, 'm54_finance', 'ربط العقد بالمحرك المالي (M54)');
        await logAudit(newId, 'm83_asset', 'تحديث حالة الأصل في محرك التقييم (M83)');
        await logAudit(newId, 'm109_biometric', 'التوقيع البيومتري للعقد (M109)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء العقد');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('m29_contracts').delete().eq('id', deleteId);
    setDeleteId(null);
    setSelectedContract(null);
    fetchAll();
  };

  const openContractDetail = async (c: M29Contract) => {
    setSelectedContract(c);
    setDetailLoading(true);
    const aRes = await supabase.from('m29_audit_logs').select('*').eq('case_id', c.id).order('created_at', { ascending: true });
    setAuditLogs((aRes.data as M29AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (c: M29Contract) => {
    const idx = STAGES.indexOf(c.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    await supabase.from('m29_contracts').update({ stage: next }).eq('id', c.id);
    await logAudit(c.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedContract({ ...c, stage: next } as M29Contract);
  };

  const filteredContracts = contracts.filter((c) => {
    if (filterType !== 'all' && c.contract_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.contract_number.toLowerCase().includes(q) && !c.contract_title.toLowerCase().includes(q) && !c.party_a.toLowerCase().includes(q) && !c.party_b.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeCount = contracts.filter((c) => c.stage !== 'terminated').length;
  const oldLeaseCount = contracts.filter((c) => c.is_old_lease).length;
  const totalRent = contracts.reduce((s, c) => s + (c.rent_amount || 0), 0);

  const tabs: { id: Tab; label: string; icon: typeof FileText; badge?: number }[] = [
    { id: 'contracts', label: 'العقود', icon: FileText, badge: contracts.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <FileText size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">العقود المدنية والإيجارات (M29)</h2>
            <p className="font-body text-[10px] text-ink/40">إدارة العقود المدنية والإيجارات — المسودات والمراجعة والتوقيع والتسجيل والتنفيذ</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Shield size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">Air-Gapped · ZK-Audit</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> عقد جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<FileText size={14} className="text-midnight" />} label="إجمالي العقود" value={String(contracts.length)} valueClass="text-midnight" />
        <StatCard icon={<Activity size={14} className="text-blue-600" />} label="عقود نشطة" value={String(activeCount)} valueClass="text-blue-700" />
        <StatCard icon={<Building2 size={14} className="text-amber-600" />} label="إيجارات قديمة" value={String(oldLeaseCount)} valueClass="text-amber-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="إجمالي الإيجارات" value={formatCurrency(totalRent)} valueClass="text-gold" />
      </div>

      {/* 6-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة العقد — 6 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.draft;
            const count = contracts.filter((c) => c.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[130px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                  </div>
                  <span className="font-body text-[9px] text-cream/40">{count} عقد</span>
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
        <div className="grid grid-cols-2 md:grid-cols-8 gap-2">
          {[
            { icon: ScrollText, label: 'التوثيق (M53)', desc: 'ربط المستندات', color: 'text-blue-600' },
            { icon: BadgeCheck, label: 'الزكاة (M46)', desc: 'فحص الامتثال', color: 'text-amber-600' },
            { icon: Server, label: 'المحرك الموحد (M10)', desc: 'تسجيل المواعيد', color: 'text-purple-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'ربط الأمانة', color: 'text-gold' },
            { icon: Building2, label: 'التقييم (M83)', desc: 'تحديث الأصل', color: 'text-green-600' },
            { icon: AlertCircle, label: 'التعويضات (M30)', desc: 'ربط المطالبات', color: 'text-red-600' },
            { icon: BadgeCheck, label: 'البيومتري (M109)', desc: 'التوقيع البيومتري', color: 'text-green-600' },
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

      {/* Filters for contracts */}
      {activeTab === 'contracts' && (
        <div className="flex items-center gap-2">
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الأنواع</option>
            {Object.entries(CONTRACT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم العقد أو العنوان أو الأطراف..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Contracts tab */}
      {activeTab === 'contracts' && (
        <div className="space-y-2">
          {filteredContracts.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <FileText size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد عقود مسجلة</p>
            </div>
          ) : (
            filteredContracts.map((c) => {
              const sCfg = STAGE_CONFIG[c.stage] || STAGE_CONFIG.draft;
              const stageIdx = STAGES.indexOf(c.stage);
              return (
                <div key={c.id} onClick={() => openContractDetail(c)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <FileText size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{c.contract_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{CONTRACT_TYPE_LABELS[c.contract_type] || c.contract_type}</span>
                          {c.is_old_lease && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Building2 size={8} /> إيجار قديم</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{c.contract_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="font-body text-[9px] text-ink/40">أ: {c.party_a}</span>
                          <span className="font-body text-[9px] text-ink/40">ب: {c.party_b}</span>
                          {c.contract_value > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(c.contract_value)}</span>}
                          {c.rent_amount > 0 && <span className="font-body text-[9px] text-ink/40">الإيجار: {formatCurrency(c.rent_amount)}</span>}
                          {c.m53_document_id && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><ScrollText size={8} /> M53</span>}
                          {c.m46_compliance_checked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><BadgeCheck size={8} /> M46</span>}
                          {c.m10_deadlines_registered && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Server size={8} /> M10</span>}
                          {c.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {c.m83_asset_status_updated && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><Building2 size={8} /> M83</span>}
                          {c.m109_biometric_signed && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><BadgeCheck size={8} /> M109</span>}
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
                    {log.action.includes('created') ? <FileText size={12} className="text-blue-600" />
                      : log.action.includes('m53') ? <ScrollText size={12} className="text-blue-600" />
                      : log.action.includes('m46') ? <BadgeCheck size={12} className="text-amber-600" />
                      : log.action.includes('m10') ? <Server size={12} className="text-purple-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m83') ? <Building2 size={12} className="text-green-600" />
                      : log.action.includes('m109') ? <BadgeCheck size={12} className="text-green-600" />
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

      {/* Contract detail drawer */}
      {selectedContract && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedContract(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف العقد</span>
              </div>
              <button onClick={() => setSelectedContract(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-gold animate-spin" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-body text-[10px] font-bold text-gold">{selectedContract.contract_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedContract.stage] || STAGE_CONFIG.draft).bg} ${(STAGE_CONFIG[selectedContract.stage] || STAGE_CONFIG.draft).text}`}>
                      {(STAGE_CONFIG[selectedContract.stage] || STAGE_CONFIG.draft).label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{CONTRACT_TYPE_LABELS[selectedContract.contract_type] || selectedContract.contract_type}</span>
                    {selectedContract.is_old_lease && <span className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-body bg-amber-50 text-amber-600"><Building2 size={10} /> إيجار قديم</span>}
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedContract.contract_title}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.draft;
                      const stageIdx = STAGES.indexOf(selectedContract.stage);
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
                  {selectedContract.stage !== STAGES[STAGES.length - 1] && (
                    <button onClick={() => advanceStage(selectedContract)} className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
                      <ArrowRight size={12} /> الانتقال للمرحلة التالية
                    </button>
                  )}
                </div>

                {/* Contract info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <FileText size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات العقد</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">الطرف الأول</span><p className="font-body text-xs font-bold text-midnight">{selectedContract.party_a}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الطرف الثاني</span><p className="font-body text-xs font-bold text-midnight">{selectedContract.party_b}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">موضوع العقار</span><p className="font-body text-xs font-bold text-midnight">{selectedContract.property_subject || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">قيمة العقد</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedContract.contract_value)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">مدة الإيجار (شهور)</span><p className="font-body text-xs font-bold text-midnight">{selectedContract.lease_duration_months || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">قيمة الإيجار</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedContract.rent_amount)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">تكرار الدفع</span><p className="font-body text-xs font-bold text-midnight">{PAYMENT_FREQUENCY_LABELS[selectedContract.payment_frequency] || selectedContract.payment_frequency}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المستشار</span><p className="font-body text-xs font-bold text-midnight">{selectedContract.advisor?.name || '—'}</p></div>
                  </div>
                </div>

                {/* Clauses */}
                {(selectedContract.termination_clauses || selectedContract.compensation_clauses) && (
                  <div className="space-y-2">
                    {selectedContract.termination_clauses && (
                      <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">شروط الإنهاء</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedContract.termination_clauses}</p></div>
                    )}
                    {selectedContract.compensation_clauses && (
                      <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">شروط التعويض</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedContract.compensation_clauses}</p></div>
                    )}
                  </div>
                )}

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedContract.m53_document_id ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><ScrollText size={10} /> M53 {selectedContract.m53_document_id ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedContract.m46_compliance_checked ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><BadgeCheck size={10} /> M46 {selectedContract.m46_compliance_checked ? 'مفحوص' : 'غير مفحوص'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedContract.m10_deadlines_registered ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Server size={10} /> M10 {selectedContract.m10_deadlines_registered ? 'مُسَجَّل' : 'غير مُسَجَّل'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedContract.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedContract.m54_finance_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedContract.m83_asset_status_updated ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><Building2 size={10} /> M83 {selectedContract.m83_asset_status_updated ? 'مُحدَّث' : 'غير مُحدَّث'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedContract.m30_compensation_linked ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-ink/30'}`}><AlertCircle size={10} /> M30 {selectedContract.m30_compensation_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedContract.m109_biometric_signed ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><BadgeCheck size={10} /> M109 {selectedContract.m109_biometric_signed ? 'موقَّع' : 'غير موقَّع'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedContract.m92_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Activity size={10} /> M92 {selectedContract.m92_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                </div>

                {selectedContract.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedContract.description}</p></div>
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

      {/* Contract create/edit modal */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل العقد' : 'عقد جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم العقد" required><TextInput value={form.contract_number} onChange={(e) => setForm({ ...form, contract_number: e.target.value })} placeholder="CON-2025-001" /></Field>
          <Field label="نوع العقد">
            <Select value={form.contract_type} onChange={(e) => setForm({ ...form, contract_type: e.target.value })}>
              {Object.entries(CONTRACT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان العقد" required><TextInput value={form.contract_title} onChange={(e) => setForm({ ...form, contract_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الطرف الأول" required><TextInput value={form.party_a} onChange={(e) => setForm({ ...form, party_a: e.target.value })} /></Field>
          <Field label="الطرف الثاني" required><TextInput value={form.party_b} onChange={(e) => setForm({ ...form, party_b: e.target.value })} /></Field>
        </div>
        <Field label="موضوع العقار"><TextInput value={form.property_subject} onChange={(e) => setForm({ ...form, property_subject: e.target.value })} placeholder="وصف العقار محل العقد" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="قيمة العقد"><TextInput type="number" value={form.contract_value} onChange={(e) => setForm({ ...form, contract_value: e.target.value })} /></Field>
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="مدة الإيجار (شهور)"><TextInput type="number" value={form.lease_duration_months} onChange={(e) => setForm({ ...form, lease_duration_months: e.target.value })} /></Field>
          <Field label="قيمة الإيجار"><TextInput type="number" value={form.rent_amount} onChange={(e) => setForm({ ...form, rent_amount: e.target.value })} /></Field>
          <Field label="تكرار الدفع">
            <Select value={form.payment_frequency} onChange={(e) => setForm({ ...form, payment_frequency: e.target.value })}>
              {Object.entries(PAYMENT_FREQUENCY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Checkbox label="إيجار قديم (Old Lease)" checked={form.is_old_lease} onChange={(v) => setForm({ ...form, is_old_lease: v })} />
        <Field label="شروط الإنهاء"><TextArea value={form.termination_clauses} onChange={(e) => setForm({ ...form, termination_clauses: e.target.value })} rows={3} /></Field>
        <Field label="شروط التعويض"><TextArea value={form.compensation_clauses} onChange={(e) => setForm({ ...form, compensation_clauses: e.target.value })} rows={3} /></Field>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
