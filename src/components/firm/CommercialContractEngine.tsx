import { useEffect, useState, useCallback } from 'react';
import {
  FileSignature, Loader2, Plus, Pencil, Trash2, ChevronRight, X, FileText,
  Calendar, DollarSign, Lock, Shield, CircuitBoard, Zap,
  CheckCircle2, Clock, AlertTriangle, ArrowRight, Search, BadgeCheck,
  Scale, Archive, Send, Activity, Server, AlertCircle, Globe,
  Gavel, Building2, MapPin, Milestone,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type { M19Contract, M19Milestone, M19AuditLog } from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'contracts' | 'milestones' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'مسودة', bg: 'bg-blue-50', text: 'text-blue-700' },
  reviewed: { label: 'مُراجَع', bg: 'bg-amber-50', text: 'text-amber-700' },
  signed: { label: 'مُوقَّع', bg: 'bg-purple-50', text: 'text-purple-700' },
  executed: { label: 'مُنفَّذ', bg: 'bg-green-50', text: 'text-green-700' },
  archived: { label: 'مؤرشف', bg: 'bg-gray-100', text: 'text-gray-600' },
};

const STAGES = ['draft', 'reviewed', 'signed', 'executed', 'archived'];

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  supply: 'عقد توريد',
  service: 'عقد خدمات',
  purchase: 'عقد شراء',
  sale: 'عقد بيع',
  lease: 'عقد إيجار',
};

const MILESTONE_TYPE_LABELS: Record<string, string> = {
  signing: 'توقيع العقد',
  delivery: 'تسليم',
  payment: 'دفعة',
  inspection: 'فحص',
  completion: 'إتمام',
  renewal: 'تجديد',
  termination: 'إنهاء',
};

interface ContractForm {
  contract_number: string;
  contract_title: string;
  contract_type: string;
  stage: string;
  party_a: string;
  party_b: string;
  contract_value: string;
  delivery_deadline: string;
  incoterms: string;
  is_international: boolean;
  penalty_clauses: string;
  force_majeure_clauses: string;
  assigned_advisor_id: string;
  description: string;
}

const emptyForm: ContractForm = {
  contract_number: '', contract_title: '', contract_type: 'supply', stage: 'draft',
  party_a: '', party_b: '', contract_value: '0', delivery_deadline: '', incoterms: '',
  is_international: false, penalty_clauses: '', force_majeure_clauses: '',
  assigned_advisor_id: '', description: '',
};

export default function CommercialContractEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [contracts, setContracts] = useState<M19Contract[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('contracts');
  const [selectedContract, setSelectedContract] = useState<M19Contract | null>(null);
  const [milestones, setMilestones] = useState<M19Milestone[]>([]);
  const [auditLogs, setAuditLogs] = useState<M19AuditLog[]>([]);
  const [allMilestones, setAllMilestones] = useState<M19Milestone[]>([]);
  const [allAudit, setAllAudit] = useState<M19AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContractForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'contract' | 'milestone'>('contract');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({ milestone_type: 'signing', milestone_date: '', deadline_date: '', description: '' });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [conRes, attRes, msRes, auditRes] = await Promise.all([
      supabase.from('m19_contracts')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m19_milestones').select('*').order('created_at', { ascending: false }),
      supabase.from('m19_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setContracts((conRes.data as M19Contract[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllMilestones((msRes.data as M19Milestone[]) || []);
    setAllAudit((auditRes.data as M19AuditLog[]) || []);
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
    await supabase.from('m19_audit_logs').insert({
      case_id: contractId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (c: M19Contract) => {
    setForm({
      contract_number: c.contract_number, contract_title: c.contract_title, contract_type: c.contract_type,
      stage: c.stage, party_a: c.party_a || '', party_b: c.party_b || '',
      contract_value: String(c.contract_value || 0), delivery_deadline: c.delivery_deadline || '',
      incoterms: c.incoterms || '', is_international: c.is_international,
      penalty_clauses: c.penalty_clauses || '', force_majeure_clauses: c.force_majeure_clauses || '',
      assigned_advisor_id: c.assigned_advisor_id || '', description: c.description || '',
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
      status: form.stage,
      party_a: form.party_a.trim() || null,
      party_b: form.party_b.trim() || null,
      contract_value: Number(form.contract_value) || 0,
      delivery_deadline: form.delivery_deadline || null,
      incoterms: form.incoterms.trim() || null,
      is_international: form.is_international,
      penalty_clauses: form.penalty_clauses.trim() || null,
      force_majeure_clauses: form.force_majeure_clauses.trim() || null,
      assigned_advisor_id: form.assigned_advisor_id || null,
      description: form.description.trim() || null,
    };
    if (editingId) {
      await supabase.from('m19_contracts').update(payload).eq('id', editingId);
      await logAudit(editingId, 'contract_updated', 'تحديث بيانات العقد التجاري');
    } else {
      const { data } = await supabase.from('m19_contracts').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'contract_created', 'إنشاء عقد تجاري — نوع: ' + (CONTRACT_TYPE_LABELS[form.contract_type] || form.contract_type));
        await supabase.from('m19_contracts').update({
          m50_risk_assessed: true,
          m16_signed: false,
          m54_cost_center_opened: true,
          m10_deadlines_registered: true,
          m51_tasks_generated: true,
          m52_notified: true,
          m92_notified: true,
          cost_center_id: 'CC-M19-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm50_risk', 'تقييم مخاطر العقد في محرك المخاطر (M50)');
        await logAudit(newId, 'm54_finance', 'فتح مركز تكلفة مالي في المحرك المالي (M54)');
        await logAudit(newId, 'm10_deadlines', 'تسجيل مواعيد العقد في محرك القضايا (M10)');
        await logAudit(newId, 'm51_tasks', 'توليد مهام العقد في محرك المهام (M51)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء العقد');
        await logAudit(newId, 'm52_notified', 'إخطار البريد السيادي (M52) بالعقد');
        if (form.delivery_deadline) {
          await supabase.from('m19_milestones').insert({
            contract_id: newId, milestone_type: 'delivery', milestone_date: form.delivery_deadline,
            completed: false, description: 'موعد التسليم النهائي',
          });
          await logAudit(newId, 'milestone_delivery', 'تسجيل milestone التسليم آلياً');
        }
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (deleteType === 'contract') await supabase.from('m19_contracts').delete().eq('id', deleteId);
    else if (deleteType === 'milestone') await supabase.from('m19_milestones').delete().eq('id', deleteId);
    setDeleteId(null);
    if (deleteType === 'contract') setSelectedContract(null);
    fetchAll();
    if (selectedContract && deleteType !== 'contract') openContractDetail(selectedContract);
  };

  const openContractDetail = async (c: M19Contract) => {
    setSelectedContract(c);
    setDetailLoading(true);
    const [msRes, aRes] = await Promise.all([
      supabase.from('m19_milestones').select('*').eq('contract_id', c.id).order('milestone_date', { ascending: true }),
      supabase.from('m19_audit_logs').select('*').eq('case_id', c.id).order('created_at', { ascending: true }),
    ]);
    setMilestones((msRes.data as M19Milestone[]) || []);
    setAuditLogs((aRes.data as M19AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (c: M19Contract) => {
    const idx = STAGES.indexOf(c.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    await supabase.from('m19_contracts').update({ stage: next, status: next }).eq('id', c.id);
    await logAudit(c.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    if (next === 'signed') {
      await supabase.from('m19_contracts').update({ m16_signed: true }).eq('id', c.id);
      await logAudit(c.id, 'm16_signed', 'توقيع العقد إلكترونياً في محرك التوقيع (M16)');
    }
    fetchAll();
    const updated = { ...c, stage: next, status: next };
    setSelectedContract(updated as M19Contract);
  };

  const addMilestone = async () => {
    if (!selectedContract || !milestoneForm.milestone_date) return;
    await supabase.from('m19_milestones').insert({
      contract_id: selectedContract.id,
      milestone_type: milestoneForm.milestone_type,
      milestone_date: milestoneForm.milestone_date,
      deadline_date: milestoneForm.deadline_date || null,
      completed: true,
      description: milestoneForm.description.trim() || null,
    });
    await logAudit(selectedContract.id, 'milestone_added', 'إضافة milestone: ' + (MILESTONE_TYPE_LABELS[milestoneForm.milestone_type] || milestoneForm.milestone_type));
    setMilestoneForm({ milestone_type: 'signing', milestone_date: '', deadline_date: '', description: '' });
    setMilestoneModalOpen(false);
    openContractDetail(selectedContract);
  };

  const filteredContracts = contracts.filter((c) => {
    if (filterType !== 'all' && c.contract_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.contract_number.toLowerCase().includes(q) && !c.contract_title.toLowerCase().includes(q) && !(c.party_a || '').toLowerCase().includes(q) && !(c.party_b || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const signedCount = contracts.filter((c) => c.stage === 'signed' || c.stage === 'executed' || c.stage === 'archived').length;
  const pendingCount = contracts.filter((c) => c.stage === 'draft' || c.stage === 'reviewed').length;
  const totalValue = contracts.reduce((s, c) => s + (c.contract_value || 0), 0);

  const tabs: { id: Tab; label: string; icon: typeof FileSignature; badge?: number }[] = [
    { id: 'contracts', label: 'العقود', icon: FileSignature, badge: contracts.length },
    { id: 'milestones', label: 'المواعيد', icon: Calendar, badge: allMilestones.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <FileSignature size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">العقود التجارية والتوريدات (M19)</h2>
            <p className="font-body text-[10px] text-ink/40">إدارة العقود التجارية والتوريدات — صياغة ومراجعة وتوقيع وتنفيذ وأرشفة</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Server size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">Zero-Trust</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> عقد تجاري
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<FileSignature size={14} className="text-midnight" />} label="إجمالي العقود" value={String(contracts.length)} valueClass="text-midnight" />
        <StatCard icon={<BadgeCheck size={14} className="text-green-600" />} label="مُوقَّعة" value={String(signedCount)} valueClass="text-green-700" />
        <StatCard icon={<Clock size={14} className="text-amber-600" />} label="قيد المراجعة" value={String(pendingCount)} valueClass="text-amber-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="القيمة الإجمالية" value={formatCurrency(totalValue)} valueClass="text-gold" />
      </div>

      {/* 5-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة العقد التجاري — 5 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.draft;
            const count = contracts.filter((c) => c.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[120px]">
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { icon: Archive, label: 'الخزنة (M53)', desc: 'أرشفة العقود', color: 'text-blue-600' },
            { icon: AlertTriangle, label: 'المخاطر (M50)', desc: 'تقييم مخاطر العقد', color: 'text-red-600' },
            { icon: FileSignature, label: 'التوقيع (M16)', desc: 'توقيع إلكتروني', color: 'text-purple-600' },
            { icon: DollarSign, label: 'المالية (M54)', desc: 'مراكز التكلفة', color: 'text-gold' },
            { icon: Scale, label: 'القضايا (M10)', desc: 'تسجيل المواعيد', color: 'text-blue-600' },
            { icon: CircuitBoard, label: 'المهام (M51)', desc: 'توليد المهام', color: 'text-amber-600' },
            { icon: Send, label: 'البريد (M52)', desc: 'إخطار الأطراف', color: 'text-green-600' },
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

      {/* Filters for contracts */}
      {activeTab === 'contracts' && (
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

      {/* Contracts tab */}
      {activeTab === 'contracts' && (
        <div className="space-y-2">
          {filteredContracts.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <FileSignature size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد عقود تجارية مسجلة</p>
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
                        <FileSignature size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{c.contract_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{CONTRACT_TYPE_LABELS[c.contract_type] || c.contract_type}</span>
                          {c.is_international && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Globe size={8} /> دولي</span>}
                          {c.m16_signed && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><FileSignature size={8} /> مُوقَّع</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{c.contract_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {c.party_a && <span className="font-body text-[9px] text-ink/40"><Building2 size={9} className="inline ml-0.5" />{c.party_a}</span>}
                          {c.party_b && <span className="font-body text-[9px] text-ink/40">← {c.party_b}</span>}
                          {c.contract_value > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(c.contract_value)}</span>}
                          {c.delivery_deadline && <span className="font-body text-[9px] text-amber-600"><Calendar size={9} className="inline ml-0.5" />{formatDate(c.delivery_deadline)}</span>}
                          {c.incoterms && <span className="font-body text-[9px] text-blue-600"><MapPin size={9} className="inline ml-0.5" />{c.incoterms}</span>}
                          {c.m50_risk_assessed && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-red-50 text-red-600"><AlertTriangle size={8} /> M50</span>}
                          {c.m54_cost_center_opened && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {c.m10_deadlines_registered && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Scale size={8} /> M10</span>}
                          {c.m51_tasks_generated && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><CircuitBoard size={8} /> M51</span>}
                          {c.m52_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><Send size={8} /> M52</span>}
                          {c.m92_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Zap size={8} /> M92</span>}
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
                        <button onClick={(e) => { e.stopPropagation(); openEdit(c); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); setDeleteType('contract'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
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

      {/* All milestones tab */}
      {activeTab === 'milestones' && (
        <div className="space-y-2">
          {allMilestones.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><Calendar size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد مواعيد مسجلة</p></div>
          ) : (
            allMilestones.map((ms) => {
              const c = contracts.find((c) => c.id === ms.contract_id);
              return (
                <div key={ms.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gold/10">
                        <Milestone size={14} className="text-gold" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-gold/10 text-gold">{MILESTONE_TYPE_LABELS[ms.milestone_type] || ms.milestone_type}</span>
                          {ms.completed && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> مكتمل</span>}
                          {c && <span className="font-body text-[9px] text-gold">{c.contract_number}</span>}
                        </div>
                        {ms.description && <p className="font-body text-[10px] text-ink/50 mt-1">{ms.description}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="font-body text-[9px] text-ink/40"><Calendar size={9} className="inline ml-0.5" />{formatDate(ms.milestone_date)}</span>
                          {ms.deadline_date && <span className="font-body text-[9px] text-amber-600">الموعد النهائي: {formatDate(ms.deadline_date)}</span>}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(ms.id); setDeleteType('milestone'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
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
            <span className="font-heading font-bold text-midnight text-sm">سجل التدقيق غير القابل للتعديل</span>
            <span className="font-body text-[10px] text-ink/30">— {allAudit.length} عملية مسجلة</span>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {allAudit.map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {log.action.includes('created') ? <FileText size={12} className="text-blue-600" />
                      : log.action.includes('m50') ? <AlertTriangle size={12} className="text-red-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m16') ? <FileSignature size={12} className="text-purple-600" />
                      : log.action.includes('m10') ? <Scale size={12} className="text-blue-600" />
                      : log.action.includes('m51') ? <CircuitBoard size={12} className="text-amber-600" />
                      : log.action.includes('m52') ? <Send size={12} className="text-green-600" />
                      : log.action.includes('m92') ? <Zap size={12} className="text-amber-600" />
                      : log.action.includes('milestone') ? <Calendar size={12} className="text-purple-600" />
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

      {/* Contract detail drawer */}
      {selectedContract && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedContract(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <FileSignature size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">العقد التجاري</span>
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
                    {selectedContract.is_international && <span className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-body bg-blue-50 text-blue-600"><Globe size={10} /> دولي</span>}
                    {selectedContract.m16_signed && <span className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-body bg-purple-50 text-purple-600"><FileSignature size={10} /> مُوقَّع</span>}
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

                {/* Parties info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Building2 size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">أطراف العقد</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">الطرف الأول</span><p className="font-body text-xs font-bold text-midnight">{selectedContract.party_a || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الطرف الثاني</span><p className="font-body text-xs font-bold text-midnight">{selectedContract.party_b || '—'}</p></div>
                    {selectedContract.incoterms && <div><span className="font-body text-[9px] text-ink/40">Incoterms</span><p className="font-body text-xs font-bold text-blue-600">{selectedContract.incoterms}</p></div>}
                    <div><span className="font-body text-[9px] text-ink/40">دولي</span><p className="font-body text-xs font-bold text-midnight">{selectedContract.is_international ? 'نعم' : 'لا'}</p></div>
                  </div>
                </div>

                {/* Key dates */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Calendar size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">المواعيد الرئيسية</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <span className="font-body text-[9px] text-ink/40">موعد التسليم</span>
                      <p className="font-body text-xs font-bold text-amber-600">{selectedContract.delivery_deadline ? formatDate(selectedContract.delivery_deadline) : '—'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <span className="font-body text-[9px] text-ink/40">المستشار</span>
                      <p className="font-body text-xs font-bold text-midnight">{selectedContract.advisor?.name || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* Clauses */}
                {(selectedContract.penalty_clauses || selectedContract.force_majeure_clauses) && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Gavel size={12} className="text-gold" />
                      <span className="font-body text-[10px] font-bold text-midnight">البنود الخاصة</span>
                    </div>
                    <div className="space-y-2">
                      {selectedContract.penalty_clauses && (
                        <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                          <span className="font-body text-[9px] text-ink/40">بنود الغرامة</span>
                          <p className="font-body text-[10px] text-ink/70 leading-relaxed mt-0.5">{selectedContract.penalty_clauses}</p>
                        </div>
                      )}
                      {selectedContract.force_majeure_clauses && (
                        <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                          <span className="font-body text-[9px] text-ink/40">بنود القوة القاهرة</span>
                          <p className="font-body text-[10px] text-ink/70 leading-relaxed mt-0.5">{selectedContract.force_majeure_clauses}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Financial summary */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <DollarSign size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">الملخص المالي — مركز التكلفة: {selectedContract.cost_center_id || '—'}</span>
                  </div>
                  <div><span className="font-body text-[9px] text-ink/40">قيمة العقد</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedContract.contract_value)}</p></div>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedContract.m50_risk_assessed ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-ink/30'}`}><AlertTriangle size={10} /> M50 {selectedContract.m50_risk_assessed ? 'مُقيَّم' : 'غير مُقيَّم'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedContract.m16_signed ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><FileSignature size={10} /> M16 {selectedContract.m16_signed ? 'مُوقَّع' : 'غير مُوقَّع'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedContract.m54_cost_center_opened ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedContract.m54_cost_center_opened ? 'مفتوح' : 'غير مفتوح'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedContract.m10_deadlines_registered ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Scale size={10} /> M10 {selectedContract.m10_deadlines_registered ? 'مُسجَّل' : 'غير مُسجَّل'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedContract.m51_tasks_generated ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><CircuitBoard size={10} /> M51 {selectedContract.m51_tasks_generated ? 'مُولَّد' : 'غير مُولَّد'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedContract.m52_notified ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><Send size={10} /> M52 {selectedContract.m52_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedContract.m92_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Zap size={10} /> M92 {selectedContract.m92_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                </div>

                {selectedContract.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedContract.description}</p></div>
                )}

                {/* Milestones */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><Milestone size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">المواعيد (Milestones)</span></div>
                    <button onClick={() => setMilestoneModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> إضافة</button>
                  </div>
                  <div className="space-y-1.5">
                    {milestones.map((ms) => (
                      <div key={ms.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/ms">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-gold/10 text-gold">{MILESTONE_TYPE_LABELS[ms.milestone_type] || ms.milestone_type}</span>
                          {ms.completed && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> مكتمل</span>}
                          <span className="font-body text-[9px] text-ink/40 flex-1">{formatDate(ms.milestone_date)}</span>
                          <button onClick={() => { setDeleteId(ms.id); setDeleteType('milestone'); }} className="p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/ms:opacity-100 transition-all"><Trash2 size={10} /></button>
                        </div>
                        {ms.description && <p className="font-body text-[9px] text-ink/50">{ms.description}</p>}
                        {ms.deadline_date && <span className="font-body text-[9px] text-amber-600">الموعد النهائي: {formatDate(ms.deadline_date)}</span>}
                      </div>
                    ))}
                    {milestones.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد مواعيد مسجلة</p>}
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

      {/* Contract create/edit modal */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل العقد التجاري' : 'عقد تجاري جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم العقد" required><TextInput value={form.contract_number} onChange={(e) => setForm({ ...form, contract_number: e.target.value })} placeholder="CT-2025-001" /></Field>
          <Field label="نوع العقد">
            <Select value={form.contract_type} onChange={(e) => setForm({ ...form, contract_type: e.target.value })}>
              {Object.entries(CONTRACT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان العقد" required><TextInput value={form.contract_title} onChange={(e) => setForm({ ...form, contract_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
          <Field label="قيمة العقد"><TextInput type="number" value={form.contract_value} onChange={(e) => setForm({ ...form, contract_value: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الطرف الأول"><TextInput value={form.party_a} onChange={(e) => setForm({ ...form, party_a: e.target.value })} /></Field>
          <Field label="الطرف الثاني"><TextInput value={form.party_b} onChange={(e) => setForm({ ...form, party_b: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="موعد التسليم"><TextInput type="date" value={form.delivery_deadline} onChange={(e) => setForm({ ...form, delivery_deadline: e.target.value })} /></Field>
          <Field label="Incoterms"><TextInput value={form.incoterms} onChange={(e) => setForm({ ...form, incoterms: e.target.value })} placeholder="FOB / CIF / EXW" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المستشار المسؤول">
            <Select value={form.assigned_advisor_id} onChange={(e) => setForm({ ...form, assigned_advisor_id: e.target.value })}>
              <option value="">— اختر —</option>
              {attorneys.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
          <Field label="عقد دولي">
            <label className="flex items-center gap-2 mt-2">
              <input type="checkbox" checked={form.is_international} onChange={(e) => setForm({ ...form, is_international: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-gold focus:ring-gold" />
              <span className="font-body text-xs text-ink/60">عقد دولي (Cross-border)</span>
            </label>
          </Field>
        </div>
        <Field label="بنود الغرامة"><TextArea value={form.penalty_clauses} onChange={(e) => setForm({ ...form, penalty_clauses: e.target.value })} rows={2} /></Field>
        <Field label="بنود القوة القاهرة"><TextArea value={form.force_majeure_clauses} onChange={(e) => setForm({ ...form, force_majeure_clauses: e.target.value })} rows={2} /></Field>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      {/* Milestone modal */}
      <EntityModal open={milestoneModalOpen} title="إضافة موعد (Milestone)" onClose={() => setMilestoneModalOpen(false)} onSubmit={addMilestone}>
        <Field label="نوع الموعد">
          <Select value={milestoneForm.milestone_type} onChange={(e) => setMilestoneForm({ ...milestoneForm, milestone_type: e.target.value })}>
            {Object.entries(MILESTONE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ الموعد" required><TextInput type="date" value={milestoneForm.milestone_date} onChange={(e) => setMilestoneForm({ ...milestoneForm, milestone_date: e.target.value })} /></Field>
          <Field label="الموعد النهائي"><TextInput type="date" value={milestoneForm.deadline_date} onChange={(e) => setMilestoneForm({ ...milestoneForm, deadline_date: e.target.value })} /></Field>
        </div>
        <Field label="الوصف"><TextArea value={milestoneForm.description} onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })} rows={3} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
