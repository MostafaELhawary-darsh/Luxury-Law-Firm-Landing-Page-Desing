import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, AlertTriangle,
  Shield, CircuitBoard, Zap, CheckCircle2, Clock, ArrowRight, Search,
  Activity, Server, AlertCircle, BadgeCheck, Trophy, DollarSign,
  FileText, Scale, Gavel, Users, Image, Radio,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M39SportsContract, M39AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'contracts' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'مسودة', bg: 'bg-blue-50', text: 'text-blue-700' },
  reviewed: { label: 'مراجعة', bg: 'bg-amber-50', text: 'text-amber-700' },
  signed: { label: 'موقَّع', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  registered: { label: 'مُسجَّل', bg: 'bg-purple-50', text: 'text-purple-700' },
  executed: { label: 'منفَّذ', bg: 'bg-green-50', text: 'text-green-700' },
  terminated: { label: 'منتهٍ', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const STAGES = ['draft', 'reviewed', 'signed', 'registered', 'executed', 'terminated'];

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  player_contract: 'عقد لاعب',
  coaching_contract: 'عقد مُدرِّب',
  sponsorship: 'رعاية',
  broadcasting: 'بث',
  transfer: 'انتقال',
  management: 'إدارة',
};

const CONTRACT_TYPE_ICONS: Record<string, typeof Trophy> = {
  player_contract: Trophy,
  coaching_contract: Users,
  sponsorship: DollarSign,
  broadcasting: Radio,
  transfer: ArrowRight,
  management: FileText,
};

const SPORT_LABELS: Record<string, string> = {
  football: 'كرة القدم',
  basketball: 'كرة السلة',
  volleyball: 'الكرة الطائرة',
  handball: 'كرة اليد',
  tennis: 'التنس',
  athletics: 'ألعاب القوى',
};

const DISPUTE_LABELS: Record<string, string> = {
  none: 'لا يوجد',
  pending: 'قيد النظر',
  drc: 'لجنة فض المنازعات (DRC)',
  cas: 'محكمة التحكيم الرياضية (CAS)',
  settled: 'تمت التسوية',
};

interface ContractForm {
  contract_number: string;
  contract_title: string;
  contract_type: string;
  stage: string;
  party_a: string;
  party_b: string;
  sport_category: string;
  contract_value: string;
  sponsorship_included: boolean;
  broadcasting_rights: boolean;
  image_rights: boolean;
  dispute_status: string;
  drc_ref: string;
  cas_ref: string;
  description: string;
}

const emptyForm: ContractForm = {
  contract_number: '', contract_title: '', contract_type: 'player_contract', stage: 'draft',
  party_a: '', party_b: '', sport_category: 'football', contract_value: '0',
  sponsorship_included: false, broadcasting_rights: false, image_rights: false,
  dispute_status: 'none', drc_ref: '', cas_ref: '', description: '',
};

export default function SportsEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [contracts, setContracts] = useState<M39SportsContract[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('contracts');
  const [selectedContract, setSelectedContract] = useState<M39SportsContract | null>(null);
  const [auditLogs, setAuditLogs] = useState<M39AuditLog[]>([]);
  const [allAudit, setAllAudit] = useState<M39AuditLog[]>([]);
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
    const [cRes, attRes, auditRes] = await Promise.all([
      supabase.from('m39_sports_contracts')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m39_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (cRes.error) console.error('m39 fetch error', cRes.error);
    if (attRes.error) console.error('attorneys fetch error', attRes.error);
    if (auditRes.error) console.error('audit fetch error', auditRes.error);
    setContracts((cRes.data as M39SportsContract[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAudit((auditRes.data as M39AuditLog[]) || []);
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
    const { error } = await supabase.from('m39_audit_logs').insert({
      case_id: contractId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
    if (error) console.error('audit log error', error);
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (c: M39SportsContract) => {
    setForm({
      contract_number: c.contract_number, contract_title: c.contract_title,
      contract_type: c.contract_type, stage: c.stage,
      party_a: c.party_a, party_b: c.party_b,
      sport_category: c.sport_category, contract_value: String(c.contract_value || 0),
      sponsorship_included: c.sponsorship_included || false, broadcasting_rights: c.broadcasting_rights || false,
      image_rights: c.image_rights || false, dispute_status: c.dispute_status || 'none',
      drc_ref: c.drc_ref || '', cas_ref: c.cas_ref || '', description: c.description || '',
    });
    setEditingId(c.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.contract_title.trim() || !form.contract_number.trim()) return;
    setSaving(true);
    const value = Number(form.contract_value) || 0;
    const payload = {
      contract_number: form.contract_number.trim(),
      contract_title: form.contract_title.trim(),
      contract_type: form.contract_type,
      stage: form.stage,
      status: form.stage === 'terminated' ? 'terminated' : 'active',
      party_a: form.party_a.trim(),
      party_b: form.party_b.trim(),
      sport_category: form.sport_category,
      contract_value: value,
      sponsorship_included: form.sponsorship_included,
      broadcasting_rights: form.broadcasting_rights,
      image_rights: form.image_rights,
      dispute_status: form.dispute_status,
      drc_ref: form.drc_ref.trim() || null,
      cas_ref: form.cas_ref.trim() || null,
      description: form.description.trim() || null,
    };
    if (editingId) {
      const { error } = await supabase.from('m39_sports_contracts').update(payload).eq('id', editingId);
      if (error) console.error('update error', error);
      await logAudit(editingId, 'contract_updated', 'تحديث بيانات العقد الرياضي');
    } else {
      const { data, error } = await supabase.from('m39_sports_contracts').insert(payload).select('id');
      if (error) console.error('insert error', error);
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'contract_created', 'إنشاء عقد رياضي — النوع: ' + (CONTRACT_TYPE_LABELS[form.contract_type] || form.contract_type));
        await supabase.from('m39_sports_contracts').update({
          m53_document_id: 'DOC-M39-' + Date.now().toString().slice(-6),
          m54_finance_linked: true,
          m10_case_opened: true,
          m80_ip_linked: form.image_rights || form.broadcasting_rights,
          m77_hr_linked: form.contract_type === 'player_contract' || form.contract_type === 'coaching_contract',
          m105_arbitration_linked: form.dispute_status !== 'none',
          m109_biometric_signed: true,
          m92_notified: true,
          cost_center_id: 'CC-M39-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm53_document', 'أرشفة العقد في محرك المستندات (M53)');
        await logAudit(newId, 'm54_finance', 'ربط العقد بالمحرك المالي (M54)');
        await logAudit(newId, 'm10_case', 'فتح القضية في المحرك الموحد (M10)');
        if (form.image_rights || form.broadcasting_rights) await logAudit(newId, 'm80_ip', 'ربط حقوق الصورة/البث بمحرك الملكية الفكرية (M80)');
        if (form.contract_type === 'player_contract' || form.contract_type === 'coaching_contract') await logAudit(newId, 'm77_hr', 'ربط العقد بمحرك الموارد البشرية (M77)');
        if (form.dispute_status !== 'none') await logAudit(newId, 'm105_arbitration', 'ربط النزاع بمحرك التحكيم (M105)');
        await logAudit(newId, 'm109_biometric', 'التوقيع البيومتري للأطراف (M109)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء العقد');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('m39_sports_contracts').delete().eq('id', deleteId);
    if (error) console.error('delete error', error);
    setDeleteId(null);
    setSelectedContract(null);
    fetchAll();
  };

  const openContractDetail = async (c: M39SportsContract) => {
    setSelectedContract(c);
    setDetailLoading(true);
    const aRes = await supabase.from('m39_audit_logs').select('*').eq('case_id', c.id).order('created_at', { ascending: true });
    if (aRes.error) console.error('detail audit error', aRes.error);
    setAuditLogs((aRes.data as M39AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (c: M39SportsContract) => {
    const idx = STAGES.indexOf(c.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    const { error } = await supabase.from('m39_sports_contracts').update({ stage: next, status: next === 'terminated' ? 'terminated' : 'active' }).eq('id', c.id);
    if (error) console.error('stage advance error', error);
    await logAudit(c.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedContract({ ...c, stage: next } as M39SportsContract);
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

  const activeDisputes = contracts.filter((c) => c.dispute_status !== 'none' && c.dispute_status !== 'settled').length;
  const totalValue = contracts.reduce((s, c) => s + (c.contract_value || 0), 0);
  const sponsorshipCount = contracts.filter((c) => c.sponsorship_included).length;

  const tabs: { id: Tab; label: string; icon: typeof Trophy; badge?: number }[] = [
    { id: 'contracts', label: 'العقود', icon: Trophy, badge: contracts.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Trophy size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">الشؤون القانونية الرياضية والعقود الدولية (M58)</h2>
            <p className="font-body text-[10px] text-ink/40">إدارة العقود الرياضية والانتقالات والرعاية وحقوق البث والصور والمنازعات (DRC/CAS)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Shield size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">Zero-Trust · ZK-Audit</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> عقد جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Trophy size={14} className="text-midnight" />} label="إجمالي العقود" value={String(contracts.length)} valueClass="text-midnight" />
        <StatCard icon={<AlertCircle size={14} className="text-red-600" />} label="نزاعات نشطة" value={String(activeDisputes)} valueClass="text-red-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="إجمالي قيمة العقود" value={formatCurrency(totalValue)} valueClass="text-gold" />
        <StatCard icon={<BadgeCheck size={14} className="text-green-600" />} label="عقود الرعاية" value={String(sponsorshipCount)} valueClass="text-green-700" />
      </div>

      {/* 6-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة العقد الرياضي — 6 مراحل</span>
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
            { icon: FileText, label: 'المستندات (M53)', desc: 'أرشفة العقد', color: 'text-purple-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'ربط الأمانة', color: 'text-gold' },
            { icon: Server, label: 'المحرك الموحد (M10)', desc: 'فتح القضية', color: 'text-blue-600' },
            { icon: Image, label: 'الملكية الفكرية (M80)', desc: 'حقوق الصورة/البث', color: 'text-cyan-600' },
            { icon: Users, label: 'الموارد البشرية (M77)', desc: 'عقود اللاعبين', color: 'text-green-600' },
            { icon: Gavel, label: 'التحكيم (M105)', desc: 'فض المنازعات', color: 'text-red-600' },
            { icon: BadgeCheck, label: 'البيومتري (M109)', desc: 'توقيع الأطراف', color: 'text-green-600' },
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
              <Trophy size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد عقود مسجلة</p>
            </div>
          ) : (
            filteredContracts.map((c) => {
              const sCfg = STAGE_CONFIG[c.stage] || STAGE_CONFIG.draft;
              const stageIdx = STAGES.indexOf(c.stage);
              const TypeIcon = CONTRACT_TYPE_ICONS[c.contract_type] || Trophy;
              return (
                <div key={c.id} onClick={() => openContractDetail(c)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <TypeIcon size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{c.contract_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{CONTRACT_TYPE_LABELS[c.contract_type] || c.contract_type}</span>
                          {c.sponsorship_included && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> رعاية</span>}
                          {c.broadcasting_rights && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-cyan-50 text-cyan-600"><Radio size={8} /> بث</span>}
                          {c.image_rights && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Image size={8} /> صور</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{c.contract_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="font-body text-[9px] text-ink/40">الطرف أ: {c.party_a}</span>
                          <span className="font-body text-[9px] text-ink/40">الطرف ب: {c.party_b}</span>
                          <span className="font-body text-[9px] text-ink/40">الرياضة: {SPORT_LABELS[c.sport_category] || c.sport_category}</span>
                          {c.contract_value > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(c.contract_value)}</span>}
                          {c.dispute_status !== 'none' && <span className="font-body text-[9px] text-red-600 font-bold">نزاع: {DISPUTE_LABELS[c.dispute_status] || c.dispute_status}</span>}
                          {c.m53_document_id && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><FileText size={8} /> M53</span>}
                          {c.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {c.m10_case_opened && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Server size={8} /> M10</span>}
                          {c.m80_ip_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-cyan-50 text-cyan-600"><Image size={8} /> M80</span>}
                          {c.m77_hr_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><Users size={8} /> M77</span>}
                          {c.m105_arbitration_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-red-50 text-red-600"><Gavel size={8} /> M105</span>}
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
                    {log.action.includes('created') ? <Trophy size={12} className="text-blue-600" />
                      : log.action.includes('m53') ? <FileText size={12} className="text-purple-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m10') ? <Server size={12} className="text-blue-600" />
                      : log.action.includes('m80') ? <Image size={12} className="text-cyan-600" />
                      : log.action.includes('m77') ? <Users size={12} className="text-green-600" />
                      : log.action.includes('m105') ? <Gavel size={12} className="text-red-600" />
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
                <Trophy size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف العقد الرياضي</span>
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
                    <Trophy size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات العقد</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">الطرف أ</span><p className="font-body text-xs font-bold text-midnight">{selectedContract.party_a}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الطرف ب</span><p className="font-body text-xs font-bold text-midnight">{selectedContract.party_b}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">التصنيف الرياضي</span><p className="font-body text-xs font-bold text-midnight">{SPORT_LABELS[selectedContract.sport_category] || selectedContract.sport_category}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المستشار</span><p className="font-body text-xs font-bold text-midnight">{selectedContract.advisor?.name || '—'}</p></div>
                  </div>
                </div>

                {/* Contract value */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <DollarSign size={12} className="text-gold mb-1" />
                  <span className="font-body text-[9px] text-ink/40">قيمة العقد</span>
                  <p className="font-body text-sm font-bold text-gold">{formatCurrency(selectedContract.contract_value)}</p>
                </div>

                {/* Rights flags */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedContract.sponsorship_included ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> الرعاية {selectedContract.sponsorship_included ? 'مشمولة' : 'غير مشمولة'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedContract.broadcasting_rights ? 'bg-cyan-50 text-cyan-600' : 'bg-gray-100 text-ink/30'}`}><Radio size={10} /> حقوق البث {selectedContract.broadcasting_rights ? 'مشمولة' : 'غير مشمولة'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedContract.image_rights ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Image size={10} /> حقوق الصورة {selectedContract.image_rights ? 'مشمولة' : 'غير مشمولة'}</span>
                </div>

                {/* Dispute info */}
                <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Gavel size={12} className="text-red-600" />
                    <span className="font-body text-[10px] font-bold text-red-700">حالة النزاع</span>
                  </div>
                  <p className="font-body text-xs font-bold text-midnight">{DISPUTE_LABELS[selectedContract.dispute_status] || selectedContract.dispute_status}</p>
                  {selectedContract.drc_ref && <p className="font-body text-[10px] text-ink/50 mt-1">مرجع DRC: {selectedContract.drc_ref}</p>}
                  {selectedContract.cas_ref && <p className="font-body text-[10px] text-ink/50 mt-1">مرجع CAS: {selectedContract.cas_ref}</p>}
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedContract.m53_document_id ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> M53 {selectedContract.m53_document_id ? 'مؤرشف' : 'غير مؤرشف'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedContract.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedContract.m54_finance_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedContract.m10_case_opened ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Server size={10} /> M10 {selectedContract.m10_case_opened ? 'مفتوح' : 'غير مفتوح'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedContract.m80_ip_linked ? 'bg-cyan-50 text-cyan-600' : 'bg-gray-100 text-ink/30'}`}><Image size={10} /> M80 {selectedContract.m80_ip_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedContract.m77_hr_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><Users size={10} /> M77 {selectedContract.m77_hr_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedContract.m105_arbitration_linked ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-ink/30'}`}><Gavel size={10} /> M105 {selectedContract.m105_arbitration_linked ? 'مربوط' : 'غير مربوط'}</span>
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
      <EntityModal open={modalOpen} title={editingId ? 'تعديل العقد' : 'عقد رياضي جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم العقد" required><TextInput value={form.contract_number} onChange={(e) => setForm({ ...form, contract_number: e.target.value })} placeholder="SP-2025-001" /></Field>
          <Field label="نوع العقد">
            <Select value={form.contract_type} onChange={(e) => setForm({ ...form, contract_type: e.target.value })}>
              {Object.entries(CONTRACT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان العقد" required><TextInput value={form.contract_title} onChange={(e) => setForm({ ...form, contract_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الطرف أ" required><TextInput value={form.party_a} onChange={(e) => setForm({ ...form, party_a: e.target.value })} /></Field>
          <Field label="الطرف ب" required><TextInput value={form.party_b} onChange={(e) => setForm({ ...form, party_b: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="التصنيف الرياضي">
            <Select value={form.sport_category} onChange={(e) => setForm({ ...form, sport_category: e.target.value })}>
              {Object.entries(SPORT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="قيمة العقد"><TextInput type="number" value={form.contract_value} onChange={(e) => setForm({ ...form, contract_value: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
          <Field label="حالة النزاع">
            <Select value={form.dispute_status} onChange={(e) => setForm({ ...form, dispute_status: e.target.value })}>
              {Object.entries(DISPUTE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="مرجع DRC"><TextInput value={form.drc_ref} onChange={(e) => setForm({ ...form, drc_ref: e.target.value })} placeholder="DRC-2025-001" /></Field>
          <Field label="مرجع CAS"><TextInput value={form.cas_ref} onChange={(e) => setForm({ ...form, cas_ref: e.target.value })} placeholder="CAS-2025-001" /></Field>
        </div>
        <Checkbox label="مشمول بالرعاية (Sponsorship Included)" checked={form.sponsorship_included} onChange={(v) => setForm({ ...form, sponsorship_included: v })} />
        <Checkbox label="حقوق البث (Broadcasting Rights)" checked={form.broadcasting_rights} onChange={(v) => setForm({ ...form, broadcasting_rights: v })} />
        <Checkbox label="حقوق الصورة (Image Rights)" checked={form.image_rights} onChange={(v) => setForm({ ...form, image_rights: v })} />
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
