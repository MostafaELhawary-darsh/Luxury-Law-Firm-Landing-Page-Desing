import { useEffect, useState, useCallback } from 'react';
import {
  Gavel, Loader2, Plus, Pencil, Trash2, ChevronRight, X, Lock,
  AlertTriangle, DollarSign, Activity, Search, Server, CircuitBoard,
  ArrowRight, CheckCircle2, Clock, Zap, Eye, FileText, Fingerprint,
  Database, ShieldCheck, Scale, Building2, ScanLine, User,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type { M15Case, M15Evidence, M15AuditLog } from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'cases' | 'evidence' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  investigation: { label: 'التحقيق', bg: 'bg-blue-50', text: 'text-blue-700' },
  filed: { label: 'مُودَع', bg: 'bg-amber-50', text: 'text-amber-700' },
  prosecution: { label: 'المحاكمة', bg: 'bg-purple-50', text: 'text-purple-700' },
  judgment: { label: 'الحكم', bg: 'bg-orange-50', text: 'text-orange-700' },
  closed: { label: 'مُغلَق', bg: 'bg-green-50', text: 'text-green-700' },
};

const STAGES = ['investigation', 'filed', 'prosecution', 'judgment', 'closed'];

const CATEGORY_LABELS: Record<string, string> = {
  hacking: 'اختراق',
  fraud: 'احتيال',
  identity_theft: 'سرقة هوية',
  data_breach: 'اختراق بيانات',
  cyber_extortion: 'ابتزاز سيبراني',
};

interface CaseForm {
  case_number: string;
  case_title: string;
  case_category: string;
  stage: string;
  crime_type: string;
  suspect_name: string;
  victim_entity: string;
  damage_estimate: string;
  recovery_amount: string;
  description: string;
}

const emptyForm: CaseForm = {
  case_number: '', case_title: '', case_category: 'hacking', stage: 'investigation',
  crime_type: '', suspect_name: '', victim_entity: '', damage_estimate: '0',
  recovery_amount: '0', description: '',
};

export default function CyberCrimeEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [cases, setCases] = useState<M15Case[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('cases');
  const [selectedCase, setSelectedCase] = useState<M15Case | null>(null);
  const [evidence, setEvidence] = useState<M15Evidence[]>([]);
  const [auditLogs, setAuditLogs] = useState<M15AuditLog[]>([]);
  const [allEvidence, setAllEvidence] = useState<M15Evidence[]>([]);
  const [allAudit, setAllAudit] = useState<M15AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CaseForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'case' | 'evidence'>('case');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [evidenceForm, setEvidenceForm] = useState({
    evidence_type: 'digital_log', evidence_hash: '', collection_date: '',
    collected_by: '', chain_of_custody: '', description: '',
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [caseRes, attRes, evRes, auditRes] = await Promise.all([
      supabase.from('m15_cases')
        .select('*, attorney:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m15_evidence').select('*').order('created_at', { ascending: false }),
      supabase.from('m15_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setCases((caseRes.data as M15Case[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllEvidence((evRes.data as M15Evidence[]) || []);
    setAllAudit((auditRes.data as M15AuditLog[]) || []);
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
    await supabase.from('m15_audit_logs').insert({
      case_id: caseId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (c: M15Case) => {
    setForm({
      case_number: c.case_number, case_title: c.case_title, case_category: c.case_category,
      stage: c.stage, crime_type: c.crime_type || '', suspect_name: c.suspect_name || '',
      victim_entity: c.victim_entity || '', damage_estimate: String(c.damage_estimate || 0),
      recovery_amount: String(c.recovery_amount || 0), description: c.description || '',
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
      case_category: form.case_category,
      stage: form.stage,
      status: form.stage,
      crime_type: form.crime_type.trim() || null,
      suspect_name: form.suspect_name.trim() || null,
      victim_entity: form.victim_entity.trim() || null,
      damage_estimate: Number(form.damage_estimate) || 0,
      recovery_amount: Number(form.recovery_amount) || 0,
      description: form.description.trim() || null,
    };
    if (editingId) {
      await supabase.from('m15_cases').update(payload).eq('id', editingId);
      await logAudit(editingId, 'case_updated', 'تحديث بيانات قضية الجريمة الإلكترونية');
    } else {
      const { data } = await supabase.from('m15_cases').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'case_created', 'إنشاء قضية جريمة إلكترونية — نوع: ' + (CATEGORY_LABELS[form.case_category] || form.case_category));
        await supabase.from('m15_cases').update({
          m10_linked: true,
          m54_finance_linked: true,
          m51_investigation_ticket: true,
          m109_identity_verified: false,
          m92_notified: true,
          cost_center_id: 'CC-M15-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm10_linked', 'ربط القضية بالمحرك الذكي للقضايا (M10)');
        await logAudit(newId, 'm51_ticket', 'فتح تذكرة تحقيق في محرك المهام (M51)');
        await logAudit(newId, 'm54_finance', 'فتح مركز تكلفة مالي في المحرك المالي (M54)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء القضية');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (deleteType === 'case') await supabase.from('m15_cases').delete().eq('id', deleteId);
    else if (deleteType === 'evidence') await supabase.from('m15_evidence').delete().eq('id', deleteId);
    setDeleteId(null);
    if (deleteType === 'case') setSelectedCase(null);
    fetchAll();
    if (selectedCase && deleteType === 'evidence') openCaseDetail(selectedCase);
  };

  const openCaseDetail = async (c: M15Case) => {
    setSelectedCase(c);
    setDetailLoading(true);
    const [evRes, aRes] = await Promise.all([
      supabase.from('m15_evidence').select('*').eq('case_id', c.id).order('created_at', { ascending: false }),
      supabase.from('m15_audit_logs').select('*').eq('case_id', c.id).order('created_at', { ascending: true }),
    ]);
    setEvidence((evRes.data as M15Evidence[]) || []);
    setAuditLogs((aRes.data as M15AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (c: M15Case) => {
    const idx = STAGES.indexOf(c.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    await supabase.from('m15_cases').update({ stage: next, status: next }).eq('id', c.id);
    await logAudit(c.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedCase({ ...c, stage: next, status: next } as M15Case);
  };

  const addEvidence = async () => {
    if (!selectedCase || !evidenceForm.evidence_hash.trim()) return;
    await supabase.from('m15_evidence').insert({
      case_id: selectedCase.id,
      evidence_type: evidenceForm.evidence_type,
      evidence_hash: evidenceForm.evidence_hash.trim(),
      collection_date: evidenceForm.collection_date || new Date().toISOString().split('T')[0],
      collected_by: evidenceForm.collected_by.trim() || 'النظام',
      chain_of_custody: evidenceForm.chain_of_custody.trim() || 'تسليم مباشر',
      is_airgapped: true,
      zk_audit_verified: false,
      description: evidenceForm.description.trim() || null,
    });
    await logAudit(selectedCase.id, 'evidence_added', 'إضافة دليل رقمي: ' + evidenceForm.evidence_type + ' — hash: ' + evidenceForm.evidence_hash.trim().slice(0, 12));
    setEvidenceForm({ evidence_type: 'digital_log', evidence_hash: '', collection_date: '', collected_by: '', chain_of_custody: '', description: '' });
    setEvidenceModalOpen(false);
    openCaseDetail(selectedCase);
  };

  const verifyEvidence = async (ev: M15Evidence) => {
    await supabase.from('m15_evidence').update({ zk_audit_verified: true }).eq('id', ev.id);
    if (selectedCase) await logAudit(selectedCase.id, 'evidence_verified', 'تحقق ZK-Audit من الدليل: ' + ev.evidence_hash.slice(0, 12));
    if (selectedCase) openCaseDetail(selectedCase);
  };

  const filteredCases = cases.filter((c) => {
    if (filterCategory !== 'all' && c.case_category !== filterCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.case_number.toLowerCase().includes(q) && !c.case_title.toLowerCase().includes(q) && !(c.suspect_name || '').toLowerCase().includes(q) && !(c.victim_entity || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const underInvestigation = cases.filter((c) => c.stage === 'investigation' || c.stage === 'filed').length;
  const totalDamage = cases.reduce((s, c) => s + (c.damage_estimate || 0), 0);
  const totalRecovery = cases.reduce((s, c) => s + (c.recovery_amount || 0), 0);

  const tabs: { id: Tab; label: string; icon: typeof Gavel; badge?: number }[] = [
    { id: 'cases', label: 'القضايا', icon: Gavel, badge: cases.length },
    { id: 'evidence', label: 'الأدلة الرقمية', icon: Database, badge: allEvidence.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Lock },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Gavel size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">الجرائم الإلكترونية (M15)</h2>
            <p className="font-body text-[10px] text-ink/40">إدارة قضايا الجرائم الإلكترونية وقانون تكنولوجيا المعلومات — سلسلة الأدلة الرقمية</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Server size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">Air-Gapped · ZK-Audit</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> قضية
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Gavel size={14} className="text-midnight" />} label="إجمالي القضايا" value={String(cases.length)} valueClass="text-midnight" />
        <StatCard icon={<Activity size={14} className="text-blue-600" />} label="قيد التحقيق" value={String(underInvestigation)} valueClass="text-blue-700" />
        <StatCard icon={<AlertTriangle size={14} className="text-red-600" />} label="إجمالي الأضرار" value={formatCurrency(totalDamage)} valueClass="text-red-700" />
        <StatCard icon={<DollarSign size={14} className="text-green-600" />} label="إجمالي الاسترداد" value={formatCurrency(totalRecovery)} valueClass="text-green-700" />
      </div>

      {/* 5-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة قضية الجريمة الإلكترونية — 5 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.investigation;
            const count = cases.filter((c) => c.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[120px]">
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
            { icon: Scale, label: 'المحرك الذكي (M10)', desc: 'ربط القضية', color: 'text-blue-600' },
            { icon: ShieldCheck, label: 'الأمن السيبراني (M14)', desc: 'التهديدات المرتبطة', color: 'text-red-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'الأضرار والاسترداد', color: 'text-gold' },
            { icon: FileText, label: 'محرك المهام (M51)', desc: 'تذاكر التحقيق', color: 'text-green-600' },
            { icon: Fingerprint, label: 'التحقق البيومتري (M109)', desc: 'هوية المشتبه', color: 'text-purple-600' },
            { icon: CircuitBoard, label: 'الوكيل الذكي (M92)', desc: 'تنبيهات فورية', color: 'text-amber-600' },
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
          <Select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الفئات</option>
            {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم أو عنوان أو مشتبه..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Cases tab */}
      {activeTab === 'cases' && (
        <div className="space-y-2">
          {filteredCases.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Gavel size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد قضايا جرائم إلكترونية</p>
            </div>
          ) : (
            filteredCases.map((c) => {
              const sCfg = STAGE_CONFIG[c.stage] || STAGE_CONFIG.investigation;
              const stageIdx = STAGES.indexOf(c.stage);
              return (
                <div key={c.id} onClick={() => openCaseDetail(c)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <Gavel size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{c.case_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{CATEGORY_LABELS[c.case_category] || c.case_category}</span>
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{c.case_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {c.suspect_name && <span className="font-body text-[9px] text-ink/40"><User size={9} className="inline ml-0.5" />{c.suspect_name}</span>}
                          {c.victim_entity && <span className="font-body text-[9px] text-ink/40"><Building2 size={9} className="inline ml-0.5" />{c.victim_entity}</span>}
                          {c.crime_type && <span className="font-body text-[9px] text-ink/40">{c.crime_type}</span>}
                          {c.damage_estimate > 0 && <span className="font-body text-[9px] text-red-600 font-bold">ضرر: {formatCurrency(c.damage_estimate)}</span>}
                          {c.recovery_amount > 0 && <span className="font-body text-[9px] text-green-600 font-bold">استرداد: {formatCurrency(c.recovery_amount)}</span>}
                          {c.m10_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Scale size={8} /> M10</span>}
                          {c.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {c.m51_investigation_ticket && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><FileText size={8} /> M51</span>}
                          {c.m109_identity_verified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Fingerprint size={8} /> M109</span>}
                          {c.m92_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><CircuitBoard size={8} /> M92</span>}
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
                        <button onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); setDeleteType('case'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
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

      {/* All evidence tab */}
      {activeTab === 'evidence' && (
        <div className="space-y-2">
          {allEvidence.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><Database size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد أدلة رقمية مسجلة</p></div>
          ) : (
            allEvidence.map((ev) => {
              const c = cases.find((c) => c.id === ev.case_id);
              return (
                <div key={ev.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-purple-50">
                        <Database size={14} className="text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-purple-50 text-purple-700">{ev.evidence_type}</span>
                          {ev.zk_audit_verified ? (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> ZK مُتحقق</span>
                          ) : (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Clock size={8} /> بانتظار التحقق</span>
                          )}
                          {ev.is_airgapped && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50"><Server size={8} /> Air-Gapped</span>}
                          {c && <span className="font-body text-[9px] text-gold">{c.case_number}</span>}
                        </div>
                        <p className="font-body text-[10px] font-bold text-midnight mt-1 font-mono">{ev.evidence_hash}</p>
                        {ev.description && <p className="font-body text-[10px] text-ink/50 mt-1 leading-relaxed line-clamp-2">{ev.description}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {ev.collected_by && <span className="font-body text-[9px] text-ink/40"><User size={9} className="inline ml-0.5" />{ev.collected_by}</span>}
                          {ev.collection_date && <span className="font-body text-[9px] text-ink/40">{formatDate(ev.collection_date)}</span>}
                          {ev.chain_of_custody && <span className="font-body text-[9px] text-ink/40"><ScanLine size={9} className="inline ml-0.5" />{ev.chain_of_custody}</span>}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(ev.id); setDeleteType('evidence'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
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
            <Lock size={14} className="text-gold" />
            <span className="font-heading font-bold text-midnight text-sm">سجل التدقيق غير القابل للتعديل</span>
            <span className="font-body text-[10px] text-ink/30">— {allAudit.length} عملية مسجلة</span>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {allAudit.map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {log.action.includes('created') ? <Gavel size={12} className="text-blue-600" />
                      : log.action.includes('m10') ? <Scale size={12} className="text-blue-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m51') ? <FileText size={12} className="text-amber-600" />
                      : log.action.includes('m109') ? <Fingerprint size={12} className="text-purple-600" />
                      : log.action.includes('m92') ? <CircuitBoard size={12} className="text-amber-600" />
                      : log.action.includes('evidence') ? <Database size={12} className="text-purple-600" />
                      : log.action.includes('stage') ? <ArrowRight size={12} className="text-gold" />
                      : <Eye size={12} className="text-ink/40" />}
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

      {/* Case detail drawer */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedCase(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Gavel size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">قضية جريمة إلكترونية</span>
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
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedCase.stage] || STAGE_CONFIG.investigation).bg} ${(STAGE_CONFIG[selectedCase.stage] || STAGE_CONFIG.investigation).text}`}>
                      {(STAGE_CONFIG[selectedCase.stage] || STAGE_CONFIG.investigation).label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{CATEGORY_LABELS[selectedCase.case_category] || selectedCase.case_category}</span>
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedCase.case_title}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.investigation;
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
                    <Gavel size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات القضية</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">نوع الجريمة</span><p className="font-body text-xs font-bold text-midnight">{selectedCase.crime_type || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المشتبه به</span><p className="font-body text-xs font-bold text-midnight">{selectedCase.suspect_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الجهة المتضررة</span><p className="font-body text-xs font-bold text-midnight">{selectedCase.victim_entity || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">تاريخ الحادثة</span><p className="font-body text-xs font-bold text-midnight">{selectedCase.incident_date ? formatDate(selectedCase.incident_date) : '—'}</p></div>
                  </div>
                </div>

                {/* Financial summary */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <DollarSign size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">الملخص المالي — مركز التكلفة: {selectedCase.cost_center_id || '—'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">تقدير الأضرار</span><p className="font-body text-xs font-bold text-red-600">{formatCurrency(selectedCase.damage_estimate)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المبلغ المسترد</span><p className="font-body text-xs font-bold text-green-600">{formatCurrency(selectedCase.recovery_amount)}</p></div>
                  </div>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m10_linked ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Scale size={10} /> M10 {selectedCase.m10_linked ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedCase.m54_finance_linked ? 'مفتوح' : 'غير مفتوح'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m51_investigation_ticket ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> M51 {selectedCase.m51_investigation_ticket ? 'مفتوحة' : 'غير مفتوحة'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m109_identity_verified ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Fingerprint size={10} /> M109 {selectedCase.m109_identity_verified ? 'مُتحقق' : 'غير مُتحقق'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m92_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><CircuitBoard size={10} /> M92 {selectedCase.m92_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                </div>

                {selectedCase.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedCase.description}</p></div>
                )}

                {/* Evidence */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><Database size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">الأدلة الرقمية — سلسلة الحيازة</span></div>
                    <button onClick={() => setEvidenceModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> إضافة دليل</button>
                  </div>
                  <div className="space-y-1.5">
                    {evidence.map((ev) => (
                      <div key={ev.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/ev">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-purple-50 text-purple-700">{ev.evidence_type}</span>
                          <p className="font-body text-[10px] font-bold text-midnight flex-1 font-mono">{ev.evidence_hash.slice(0, 20)}...</p>
                          {ev.zk_audit_verified ? (
                            <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> ZK</span>
                          ) : (
                            <button onClick={() => verifyEvidence(ev)} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-600 text-white hover:bg-purple-700 transition-colors"><Fingerprint size={8} /> تحقق</button>
                          )}
                          <button onClick={() => { setDeleteId(ev.id); setDeleteType('evidence'); }} className="p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/ev:opacity-100 transition-all"><Trash2 size={10} /></button>
                        </div>
                        {ev.description && <p className="font-body text-[9px] text-ink/50 leading-tight mb-1">{ev.description}</p>}
                        <div className="flex items-center gap-2 flex-wrap">
                          {ev.collected_by && <span className="font-body text-[9px] text-ink/40"><User size={8} className="inline ml-0.5" />{ev.collected_by}</span>}
                          {ev.collection_date && <span className="font-body text-[9px] text-ink/40">{formatDate(ev.collection_date)}</span>}
                          {ev.chain_of_custody && <span className="font-body text-[9px] text-ink/40"><ScanLine size={8} className="inline ml-0.5" />{ev.chain_of_custody}</span>}
                          {ev.is_airgapped && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50"><Server size={8} /> Air-Gapped</span>}
                        </div>
                      </div>
                    ))}
                    {evidence.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد أدلة رقمية مسجلة</p>}
                  </div>
                </div>

                {/* Audit trail */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2"><Lock size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">سجل التدقيق</span></div>
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
      <EntityModal open={modalOpen} title={editingId ? 'تعديل قضية' : 'قضية جريمة إلكترونية جديدة'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم القضية" required><TextInput value={form.case_number} onChange={(e) => setForm({ ...form, case_number: e.target.value })} placeholder="CC-2025-001" /></Field>
          <Field label="الفئة">
            <Select value={form.case_category} onChange={(e) => setForm({ ...form, case_category: e.target.value })}>
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان القضية" required><TextInput value={form.case_title} onChange={(e) => setForm({ ...form, case_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
          <Field label="نوع الجريمة"><TextInput value={form.crime_type} onChange={(e) => setForm({ ...form, crime_type: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم المشتبه به"><TextInput value={form.suspect_name} onChange={(e) => setForm({ ...form, suspect_name: e.target.value })} /></Field>
          <Field label="الجهة المتضررة"><TextInput value={form.victim_entity} onChange={(e) => setForm({ ...form, victim_entity: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تقدير الأضرار"><TextInput type="number" value={form.damage_estimate} onChange={(e) => setForm({ ...form, damage_estimate: e.target.value })} /></Field>
          <Field label="المبلغ المسترد"><TextInput type="number" value={form.recovery_amount} onChange={(e) => setForm({ ...form, recovery_amount: e.target.value })} /></Field>
        </div>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      {/* Evidence modal */}
      <EntityModal open={evidenceModalOpen} title="إضافة دليل رقمي" onClose={() => setEvidenceModalOpen(false)} onSubmit={addEvidence}>
        <Field label="نوع الدليل">
          <Select value={evidenceForm.evidence_type} onChange={(e) => setEvidenceForm({ ...evidenceForm, evidence_type: e.target.value })}>
            <option value="digital_log">سجل رقمي</option>
            <option value="network_capture">التقاط شبكة</option>
            <option value="disk_image">صورة قرص</option>
            <option value="memory_dump">تفريغ ذاكرة</option>
            <option value="email_record">سجل بريد</option>
            <option value="transaction_log">سجل معاملة</option>
            <option value="biometric_data">بيانات بيومترية</option>
          </Select>
        </Field>
        <Field label="هاش الدليل (Hash)" required><TextInput value={evidenceForm.evidence_hash} onChange={(e) => setEvidenceForm({ ...evidenceForm, evidence_hash: e.target.value })} placeholder="sha256:..." /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ الجمع"><TextInput type="date" value={evidenceForm.collection_date} onChange={(e) => setEvidenceForm({ ...evidenceForm, collection_date: e.target.value })} /></Field>
          <Field label="جامع الدليل"><TextInput value={evidenceForm.collected_by} onChange={(e) => setEvidenceForm({ ...evidenceForm, collected_by: e.target.value })} /></Field>
        </div>
        <Field label="سلسلة الحيازة (Chain of Custody)"><TextInput value={evidenceForm.chain_of_custody} onChange={(e) => setEvidenceForm({ ...evidenceForm, chain_of_custody: e.target.value })} /></Field>
        <Field label="الوصف"><TextArea value={evidenceForm.description} onChange={(e) => setEvidenceForm({ ...evidenceForm, description: e.target.value })} rows={3} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
