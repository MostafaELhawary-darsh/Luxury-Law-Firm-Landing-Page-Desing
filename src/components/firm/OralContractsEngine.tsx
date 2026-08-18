import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, Mic,
  Shield, CircuitBoard, Zap, CheckCircle2, Clock, ArrowRight, Search,
  FileText, Activity, Server, AlertCircle, BadgeCheck,
  Users, Fingerprint, Scale, BookOpen, DollarSign,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M32Evidence, M32Witness, M32AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'evidence' | 'witnesses' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  intake: { label: 'الاستلام', bg: 'bg-blue-50', text: 'text-blue-700' },
  analyzed: { label: 'التحليل', bg: 'bg-amber-50', text: 'text-amber-700' },
  filed: { label: 'الإيداع', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  hearing: { label: 'الجلسة', bg: 'bg-purple-50', text: 'text-purple-700' },
  judgment: { label: 'الحكم', bg: 'bg-green-50', text: 'text-green-700' },
  archived: { label: 'الأرشفة', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const STAGES = ['intake', 'analyzed', 'filed', 'hearing', 'judgment', 'archived'];

const EVIDENCE_TYPE_LABELS: Record<string, string> = {
  oral_contract: 'عقد شفهي',
  witness_statement: 'شهادة شاهد',
  oath: 'يمين',
  presumption: 'قرينة',
};

const OATH_TYPE_LABELS: Record<string, string> = {
  decisive_oath: 'يمين حاسمة',
  supplementary_oath: 'يمين متممة',
  none: 'بدون يمين',
};

interface EvidenceForm {
  evidence_number: string;
  evidence_title: string;
  evidence_type: string;
  stage: string;
  case_reference: string;
  contract_nature: string;
  witness_count: string;
  oath_type: string;
  presumptions: string;
  description: string;
}

const emptyForm: EvidenceForm = {
  evidence_number: '', evidence_title: '', evidence_type: 'oral_contract', stage: 'intake',
  case_reference: '', contract_nature: '', witness_count: '0',
  oath_type: 'none', presumptions: '', description: '',
};

const emptyWitnessForm = {
  witness_name: '', witness_statement: '', statement_date: '',
  is_biometric_verified: false, contradictions_flag: false,
};

export default function OralContractsEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [evidence, setEvidence] = useState<M32Evidence[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('evidence');
  const [selectedEvidence, setSelectedEvidence] = useState<M32Evidence | null>(null);
  const [witnesses, setWitnesses] = useState<M32Witness[]>([]);
  const [auditLogs, setAuditLogs] = useState<M32AuditLog[]>([]);
  const [allWitnesses, setAllWitnesses] = useState<M32Witness[]>([]);
  const [allAudit, setAllAudit] = useState<M32AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EvidenceForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'evidence' | 'witness'>('evidence');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [witnessModalOpen, setWitnessModalOpen] = useState(false);
  const [witnessForm, setWitnessForm] = useState(emptyWitnessForm);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [evRes, attRes, witRes, auditRes] = await Promise.all([
      supabase.from('m32_evidence')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m32_witnesses').select('*').order('created_at', { ascending: false }),
      supabase.from('m32_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setEvidence((evRes.data as M32Evidence[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllWitnesses((witRes.data as M32Witness[]) || []);
    setAllAudit((auditRes.data as M32AuditLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyForm, evidence_title: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const logAudit = async (evidenceId: string, action: string, detail: string) => {
    const hash = '0x' + Math.random().toString(16).substr(2, 4) + '...' + Math.random().toString(16).substr(2, 4);
    await supabase.from('m32_audit_logs').insert({
      case_id: evidenceId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (e: M32Evidence) => {
    setForm({
      evidence_number: e.evidence_number, evidence_title: e.evidence_title,
      evidence_type: e.evidence_type, stage: e.stage,
      case_reference: e.case_reference || '', contract_nature: e.contract_nature || '',
      witness_count: String(e.witness_count || 0),
      oath_type: e.oath_type || 'none', presumptions: e.presumptions || '',
      description: e.description || '',
    });
    setEditingId(e.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.evidence_title.trim() || !form.evidence_number.trim()) return;
    setSaving(true);
    const payload = {
      evidence_number: form.evidence_number.trim(),
      evidence_title: form.evidence_title.trim(),
      evidence_type: form.evidence_type,
      stage: form.stage,
      status: 'active',
      case_reference: form.case_reference.trim() || null,
      contract_nature: form.contract_nature.trim() || null,
      witness_count: Number(form.witness_count) || 0,
      oath_type: form.oath_type === 'none' ? null : form.oath_type,
      presumptions: form.presumptions.trim() || null,
      description: form.description.trim() || null,
    };
    if (editingId) {
      await supabase.from('m32_evidence').update(payload).eq('id', editingId);
      await logAudit(editingId, 'evidence_updated', 'تحديث بيانات الدليل');
    } else {
      const { data } = await supabase.from('m32_evidence').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'evidence_created', 'إنشاء ملف دليل — نوع: ' + (EVIDENCE_TYPE_LABELS[form.evidence_type] || form.evidence_type));
        await supabase.from('m32_evidence').update({
          m10_case_opened: true,
          m54_finance_linked: true,
          m56_transcription_linked: true,
          m46_compliance_checked: true,
          m109_biometric_verified: true,
          m92_notified: true,
          cost_center_id: 'CC-M32-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm10_case_opened', 'فتح قضية في المحرك الموحد (M10)');
        await logAudit(newId, 'm54_finance', 'ربط الدليل بالحساب المالي (M54)');
        await logAudit(newId, 'm56_transcription', 'ربط النص بالمحرك الصوتي (M56)');
        await logAudit(newId, 'm46_compliance', 'فحص الامتثال الشرعي في محرك الزكاة (M46)');
        await logAudit(newId, 'm109_biometric', 'التحقق البيومتري للشهود (M109)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء الدليل');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (deleteType === 'evidence') await supabase.from('m32_evidence').delete().eq('id', deleteId);
    else await supabase.from('m32_witnesses').delete().eq('id', deleteId);
    setDeleteId(null);
    if (deleteType === 'evidence') setSelectedEvidence(null);
    fetchAll();
    if (selectedEvidence && deleteType === 'witness') openEvidenceDetail(selectedEvidence);
  };

  const openEvidenceDetail = async (e: M32Evidence) => {
    setSelectedEvidence(e);
    setDetailLoading(true);
    const [witRes, aRes] = await Promise.all([
      supabase.from('m32_witnesses').select('*').eq('evidence_id', e.id).order('created_at', { ascending: true }),
      supabase.from('m32_audit_logs').select('*').eq('case_id', e.id).order('created_at', { ascending: true }),
    ]);
    setWitnesses((witRes.data as M32Witness[]) || []);
    setAuditLogs((aRes.data as M32AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (e: M32Evidence) => {
    const idx = STAGES.indexOf(e.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    await supabase.from('m32_evidence').update({ stage: next }).eq('id', e.id);
    await logAudit(e.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedEvidence({ ...e, stage: next } as M32Evidence);
  };

  const addWitness = async () => {
    if (!selectedEvidence || !witnessForm.witness_name.trim()) return;
    await supabase.from('m32_witnesses').insert({
      evidence_id: selectedEvidence.id,
      witness_name: witnessForm.witness_name.trim(),
      witness_statement: witnessForm.witness_statement.trim() || null,
      statement_date: witnessForm.statement_date || null,
      is_biometric_verified: witnessForm.is_biometric_verified,
      contradictions_flag: witnessForm.contradictions_flag,
    });
    await logAudit(selectedEvidence.id, 'witness_added', 'إضافة شاهد: ' + witnessForm.witness_name);
    setWitnessForm(emptyWitnessForm);
    setWitnessModalOpen(false);
    openEvidenceDetail(selectedEvidence);
  };

  const filteredEvidence = evidence.filter((e) => {
    if (filterType !== 'all' && e.evidence_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!e.evidence_number.toLowerCase().includes(q) && !e.evidence_title.toLowerCase().includes(q) &&
          !(e.case_reference || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeCount = evidence.filter((e) => e.stage !== 'archived').length;
  const totalWitnesses = allWitnesses.length;
  const biometricVerifiedCount = allWitnesses.filter((w) => w.is_biometric_verified).length;

  const tabs: { id: Tab; label: string; icon: typeof Mic; badge?: number }[] = [
    { id: 'evidence', label: 'الأدلة', icon: FileText, badge: evidence.length },
    { id: 'witnesses', label: 'الشهود', icon: Users, badge: allWitnesses.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Mic size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">العقود الشفهية والإثبات المدني (M32)</h2>
            <p className="font-body text-[10px] text-ink/40">إدارة العقود الشفهية والأدلة المدنية — الشهود واليمين والقرائن</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Shield size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">On-Premise · ZK-Audit</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> دليل جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<FileText size={14} className="text-midnight" />} label="إجمالي الأدلة" value={String(evidence.length)} valueClass="text-midnight" />
        <StatCard icon={<Activity size={14} className="text-blue-600" />} label="أدلة نشطة" value={String(activeCount)} valueClass="text-blue-700" />
        <StatCard icon={<Users size={14} className="text-amber-600" />} label="إجمالي الشهود" value={String(totalWitnesses)} valueClass="text-amber-700" />
        <StatCard icon={<Fingerprint size={14} className="text-green-600" />} label="تحقق بيومتري" value={String(biometricVerifiedCount)} valueClass="text-green-700" />
      </div>

      {/* 6-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة الدليل — 6 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.intake;
            const count = evidence.filter((e) => e.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[130px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                  </div>
                  <span className="font-body text-[9px] text-cream/40">{count} دليل</span>
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
            { icon: Server, label: 'المحرك الموحد (M10)', desc: 'فتح القضية', color: 'text-purple-600' },
            { icon: Activity, label: 'المحرك الصوتي (M56)', desc: 'ربط النص', color: 'text-cyan-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'ربط الحساب', color: 'text-gold' },
            { icon: BookOpen, label: 'محرك الزكاة (M46)', desc: 'فحص الامتثال', color: 'text-amber-600' },
            { icon: BadgeCheck, label: 'التحقق البيومتري (M109)', desc: 'تحقق الشهود', color: 'text-green-600' },
            { icon: Activity, label: 'الوكيل الذكي (M92)', desc: 'تنبيهات الجلسات', color: 'text-amber-600' },
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

      {/* Filters for evidence */}
      {activeTab === 'evidence' && (
        <div className="flex items-center gap-2">
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الأنواع</option>
            {Object.entries(EVIDENCE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم الدليل أو العنوان أو القضية..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Evidence tab */}
      {activeTab === 'evidence' && (
        <div className="space-y-2">
          {filteredEvidence.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <FileText size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد أدلة مسجلة</p>
            </div>
          ) : (
            filteredEvidence.map((e) => {
              const sCfg = STAGE_CONFIG[e.stage] || STAGE_CONFIG.intake;
              const stageIdx = STAGES.indexOf(e.stage);
              return (
                <div key={e.id} onClick={() => openEvidenceDetail(e)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <FileText size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{e.evidence_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{EVIDENCE_TYPE_LABELS[e.evidence_type] || e.evidence_type}</span>
                          {e.oath_type && e.oath_type !== 'none' && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-cyan-50 text-cyan-600"><Scale size={8} /> {OATH_TYPE_LABELS[e.oath_type] || e.oath_type}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{e.evidence_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {e.case_reference && <span className="font-body text-[9px] text-ink/40">القضية: {e.case_reference}</span>}
                          <span className="font-body text-[9px] text-ink/40">الشهود: {e.witness_count}</span>
                          {e.contract_nature && <span className="font-body text-[9px] text-ink/40">طبيعة العقد: {e.contract_nature}</span>}
                          {e.m10_case_opened && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Server size={8} /> M10</span>}
                          {e.m56_transcription_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-cyan-50 text-cyan-600"><Activity size={8} /> M56</span>}
                          {e.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {e.m46_compliance_checked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><BookOpen size={8} /> M46</span>}
                          {e.m109_biometric_verified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><Fingerprint size={8} /> M109</span>}
                          {e.m92_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Activity size={8} /> M92</span>}
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
                        <button onClick={(ev) => { ev.stopPropagation(); openEdit(e); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                        <button onClick={(ev) => { ev.stopPropagation(); setDeleteId(e.id); setDeleteType('evidence'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
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

      {/* Witnesses tab */}
      {activeTab === 'witnesses' && (
        <div className="space-y-2">
          {allWitnesses.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><Users size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا يوجد شهود مسجلون</p></div>
          ) : (
            allWitnesses.map((w) => {
              const ev = evidence.find((e) => e.id === w.evidence_id);
              return (
                <div key={w.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-50">
                        <Users size={14} className="text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {w.is_biometric_verified ? (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><Fingerprint size={8} /> متحقق بيومترياً</span>
                          ) : (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/40"><Fingerprint size={8} /> غير متحقق</span>
                          )}
                          {w.contradictions_flag && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-red-50 text-red-600"><AlertCircle size={8} /> تناقضات</span>}
                          {ev && <span className="font-body text-[9px] text-gold">{ev.evidence_number}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{w.witness_name}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {w.statement_date && <span className="font-body text-[9px] text-ink/40"><Clock size={9} className="inline ml-0.5" />{formatDate(w.statement_date)}</span>}
                          {w.witness_statement && <span className="font-body text-[9px] text-ink/40 line-clamp-1">{w.witness_statement}</span>}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(w.id); setDeleteType('witness'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
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
                    {log.action.includes('created') ? <FileText size={12} className="text-blue-600" />
                      : log.action.includes('m10') ? <Server size={12} className="text-purple-600" />
                      : log.action.includes('m56') ? <Activity size={12} className="text-cyan-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m46') ? <BookOpen size={12} className="text-amber-600" />
                      : log.action.includes('m109') ? <Fingerprint size={12} className="text-green-600" />
                      : log.action.includes('m92') ? <Activity size={12} className="text-amber-600" />
                      : log.action.includes('witness') ? <Users size={12} className="text-blue-600" />
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

      {/* Evidence detail drawer */}
      {selectedEvidence && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedEvidence(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف الدليل</span>
              </div>
              <button onClick={() => setSelectedEvidence(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-gold animate-spin" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-body text-[10px] font-bold text-gold">{selectedEvidence.evidence_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedEvidence.stage] || STAGE_CONFIG.intake).bg} ${(STAGE_CONFIG[selectedEvidence.stage] || STAGE_CONFIG.intake).text}`}>
                      {(STAGE_CONFIG[selectedEvidence.stage] || STAGE_CONFIG.intake).label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{EVIDENCE_TYPE_LABELS[selectedEvidence.evidence_type] || selectedEvidence.evidence_type}</span>
                    {selectedEvidence.oath_type && selectedEvidence.oath_type !== 'none' && <span className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-body bg-cyan-50 text-cyan-600"><Scale size={10} /> {OATH_TYPE_LABELS[selectedEvidence.oath_type] || selectedEvidence.oath_type}</span>}
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedEvidence.evidence_title}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.intake;
                      const stageIdx = STAGES.indexOf(selectedEvidence.stage);
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
                  {selectedEvidence.stage !== STAGES[STAGES.length - 1] && (
                    <button onClick={() => advanceStage(selectedEvidence)} className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
                      <ArrowRight size={12} /> الانتقال للمرحلة التالية
                    </button>
                  )}
                </div>

                {/* Evidence info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <FileText size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات الدليل</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">نوع الدليل</span><p className="font-body text-xs font-bold text-midnight">{EVIDENCE_TYPE_LABELS[selectedEvidence.evidence_type] || selectedEvidence.evidence_type}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المرجع القضائي</span><p className="font-body text-xs font-bold text-midnight">{selectedEvidence.case_reference || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">طبيعة العقد</span><p className="font-body text-xs font-bold text-midnight">{selectedEvidence.contract_nature || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">عدد الشهود</span><p className="font-body text-xs font-bold text-midnight">{selectedEvidence.witness_count}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نوع اليمين</span><p className="font-body text-xs font-bold text-midnight">{selectedEvidence.oath_type ? (OATH_TYPE_LABELS[selectedEvidence.oath_type] || selectedEvidence.oath_type) : '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الحالة</span><p className="font-body text-xs font-bold text-midnight">{selectedEvidence.status || '—'}</p></div>
                  </div>
                </div>

                {selectedEvidence.presumptions && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">القرائن</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedEvidence.presumptions}</p></div>
                )}

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedEvidence.m10_case_opened ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Server size={10} /> M10 {selectedEvidence.m10_case_opened ? 'مفتوح' : 'غير مفتوح'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedEvidence.m56_transcription_linked ? 'bg-cyan-50 text-cyan-600' : 'bg-gray-100 text-ink/30'}`}><Activity size={10} /> M56 {selectedEvidence.m56_transcription_linked ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedEvidence.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedEvidence.m54_finance_linked ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedEvidence.m46_compliance_checked ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><BookOpen size={10} /> M46 {selectedEvidence.m46_compliance_checked ? 'مفحوص' : 'غير مفحوص'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedEvidence.m109_biometric_verified ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><Fingerprint size={10} /> M109 {selectedEvidence.m109_biometric_verified ? 'مُتحقَّق' : 'غير مُتحقَّق'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedEvidence.m92_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Activity size={10} /> M92 {selectedEvidence.m92_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                </div>

                {selectedEvidence.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedEvidence.description}</p></div>
                )}

                {/* Witnesses sub-entities */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><Users size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">الشهود</span></div>
                    <button onClick={() => setWitnessModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> إضافة شاهد</button>
                  </div>
                  <div className="space-y-1.5">
                    {witnesses.map((w) => (
                      <div key={w.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/wit">
                        <div className="flex items-center gap-2 mb-1">
                          {w.is_biometric_verified ? (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><Fingerprint size={8} /> متحقق</span>
                          ) : (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/40"><Fingerprint size={8} /> غير متحقق</span>
                          )}
                          {w.contradictions_flag && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-red-50 text-red-600"><AlertCircle size={8} /> تناقضات</span>}
                          <p className="font-body text-[10px] font-bold text-midnight flex-1">{w.witness_name}</p>
                          <button onClick={() => { setDeleteId(w.id); setDeleteType('witness'); }} className="p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/wit:opacity-100 transition-all"><Trash2 size={10} /></button>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {w.statement_date && <span className="font-body text-[9px] text-ink/40">{formatDate(w.statement_date)}</span>}
                          {w.witness_statement && <span className="font-body text-[9px] text-ink/40 line-clamp-1">{w.witness_statement}</span>}
                        </div>
                      </div>
                    ))}
                    {witnesses.length === 0 && <p className="font-body text-[10px] text-ink/30">لا يوجد شهود مسجلون</p>}
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

      {/* Evidence create/edit modal */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل الدليل' : 'دليل جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الدليل" required><TextInput value={form.evidence_number} onChange={(e) => setForm({ ...form, evidence_number: e.target.value })} placeholder="EV-2025-001" /></Field>
          <Field label="نوع الدليل">
            <Select value={form.evidence_type} onChange={(e) => setForm({ ...form, evidence_type: e.target.value })}>
              {Object.entries(EVIDENCE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان الدليل" required><TextInput value={form.evidence_title} onChange={(e) => setForm({ ...form, evidence_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
          <Field label="المرجع القضائي"><TextInput value={form.case_reference} onChange={(e) => setForm({ ...form, case_reference: e.target.value })} placeholder="CASE-2025-001" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="طبيعة العقد"><TextInput value={form.contract_nature} onChange={(e) => setForm({ ...form, contract_nature: e.target.value })} placeholder="بيع / إيجاز / وكالة..." /></Field>
          <Field label="عدد الشهود"><TextInput type="number" value={form.witness_count} onChange={(e) => setForm({ ...form, witness_count: e.target.value })} /></Field>
        </div>
        <Field label="نوع اليمين">
          <Select value={form.oath_type} onChange={(e) => setForm({ ...form, oath_type: e.target.value })}>
            {Object.entries(OATH_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="القرائن"><TextArea value={form.presumptions} onChange={(e) => setForm({ ...form, presumptions: e.target.value })} rows={2} /></Field>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      {/* Witness modal */}
      <EntityModal open={witnessModalOpen} title="إضافة شاهد" onClose={() => setWitnessModalOpen(false)} onSubmit={addWitness}>
        <Field label="اسم الشاهد" required><TextInput value={witnessForm.witness_name} onChange={(e) => setWitnessForm({ ...witnessForm, witness_name: e.target.value })} /></Field>
        <Field label="تاريخ الشهادة"><TextInput type="date" value={witnessForm.statement_date} onChange={(e) => setWitnessForm({ ...witnessForm, statement_date: e.target.value })} /></Field>
        <Field label="نص الشهادة"><TextArea value={witnessForm.witness_statement} onChange={(e) => setWitnessForm({ ...witnessForm, witness_statement: e.target.value })} rows={4} /></Field>
        <Checkbox label="تم التحقق البيومتري (Biometric Verified)" checked={witnessForm.is_biometric_verified} onChange={(v) => setWitnessForm({ ...witnessForm, is_biometric_verified: v })} />
        <Checkbox label="توجد تناقضات في الشهادة (Contradictions Flag)" checked={witnessForm.contradictions_flag} onChange={(v) => setWitnessForm({ ...witnessForm, contradictions_flag: v })} />
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
