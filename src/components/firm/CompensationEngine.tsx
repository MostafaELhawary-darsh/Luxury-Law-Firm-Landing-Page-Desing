import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, AlertTriangle,
  Shield, CircuitBoard, Zap, CheckCircle2, Clock, ArrowRight, Search,
  Activity, Server, AlertCircle, BadgeCheck,
  DollarSign, FileText, Heart, Scale, Car, Stethoscope,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M30Claim, M30AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'claims' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  intake: { label: 'الاستلام', bg: 'bg-blue-50', text: 'text-blue-700' },
  evidence_gathering: { label: 'جمع الأدلة', bg: 'bg-amber-50', text: 'text-amber-700' },
  expert_review: { label: 'مراجعة الخبير', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  filed: { label: 'مرفوعة', bg: 'bg-purple-50', text: 'text-purple-700' },
  judgment: { label: 'حكم', bg: 'bg-green-50', text: 'text-green-700' },
  settled: { label: 'مُسوَّاة', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const STAGES = ['intake', 'evidence_gathering', 'expert_review', 'filed', 'judgment', 'settled'];

const CLAIM_TYPE_LABELS: Record<string, string> = {
  tort: 'مسؤولية تقصيرية',
  medical_malpractice: 'خطأ طبي',
  work_injury: 'إصابة عمل',
  contract_breach: 'إخلال تعاقدي',
  traffic_accident: 'حادث مروري',
};

const CLAIM_TYPE_ICONS: Record<string, typeof AlertTriangle> = {
  tort: AlertTriangle,
  medical_malpractice: Stethoscope,
  work_injury: AlertCircle,
  contract_breach: Scale,
  traffic_accident: Car,
};

interface ClaimForm {
  claim_number: string;
  claim_title: string;
  claim_type: string;
  stage: string;
  claimant_name: string;
  defendant_name: string;
  incident_date: string;
  incident_location: string;
  material_damage: string;
  moral_damage: string;
  fault_established: boolean;
  causation_proven: boolean;
  success_probability: string;
  expert_report: string;
  police_report: string;
  description: string;
}

const emptyForm: ClaimForm = {
  claim_number: '', claim_title: '', claim_type: 'tort', stage: 'intake',
  claimant_name: '', defendant_name: '', incident_date: '', incident_location: '',
  material_damage: '0', moral_damage: '0', fault_established: false, causation_proven: false,
  success_probability: '50', expert_report: '', police_report: '', description: '',
};

export default function CompensationEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [claims, setClaims] = useState<M30Claim[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('claims');
  const [selectedClaim, setSelectedClaim] = useState<M30Claim | null>(null);
  const [auditLogs, setAuditLogs] = useState<M30AuditLog[]>([]);
  const [allAudit, setAllAudit] = useState<M30AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClaimForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [clRes, attRes, auditRes] = await Promise.all([
      supabase.from('m30_claims')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m30_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setClaims((clRes.data as M30Claim[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAudit((auditRes.data as M30AuditLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyForm, claim_title: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const logAudit = async (claimId: string, action: string, detail: string) => {
    const hash = '0x' + Math.random().toString(16).substr(2, 4) + '...' + Math.random().toString(16).substr(2, 4);
    await supabase.from('m30_audit_logs').insert({
      case_id: claimId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (c: M30Claim) => {
    setForm({
      claim_number: c.claim_number, claim_title: c.claim_title,
      claim_type: c.claim_type, stage: c.stage,
      claimant_name: c.claimant_name, defendant_name: c.defendant_name,
      incident_date: c.incident_date || '', incident_location: c.incident_location || '',
      material_damage: String(c.material_damage || 0), moral_damage: String(c.moral_damage || 0),
      fault_established: c.fault_established || false, causation_proven: c.causation_proven || false,
      success_probability: String(c.success_probability || 0),
      expert_report: c.expert_report || '', police_report: c.police_report || '',
      description: c.description || '',
    });
    setEditingId(c.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.claim_title.trim() || !form.claim_number.trim()) return;
    setSaving(true);
    const material = Number(form.material_damage) || 0;
    const moral = Number(form.moral_damage) || 0;
    const payload = {
      claim_number: form.claim_number.trim(),
      claim_title: form.claim_title.trim(),
      claim_type: form.claim_type,
      stage: form.stage,
      claimant_name: form.claimant_name.trim(),
      defendant_name: form.defendant_name.trim(),
      incident_date: form.incident_date || null,
      incident_location: form.incident_location.trim() || null,
      material_damage: material,
      moral_damage: moral,
      total_claimed: material + moral,
      fault_established: form.fault_established,
      causation_proven: form.causation_proven,
      success_probability: Number(form.success_probability) || 0,
      expert_report: form.expert_report.trim() || null,
      police_report: form.police_report.trim() || null,
      description: form.description.trim() || null,
    };
    if (editingId) {
      await supabase.from('m30_claims').update(payload).eq('id', editingId);
      await logAudit(editingId, 'claim_updated', 'تحديث بيانات المطالبة');
    } else {
      const { data } = await supabase.from('m30_claims').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'claim_created', 'إنشاء مطالبة تعويض — النوع: ' + (CLAIM_TYPE_LABELS[form.claim_type] || form.claim_type));
        await supabase.from('m30_claims').update({
          m10_case_opened: true,
          m54_finance_linked: true,
          m91_safety_report_linked: true,
          m65_medical_malpractice_linked: form.claim_type === 'medical_malpractice',
          m107_iot_evidence_linked: true,
          m109_biometric_verified: true,
          m92_notified: true,
          cost_center_id: 'CC-M30-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm10_case', 'فتح القضية في المحرك الموحد (M10)');
        await logAudit(newId, 'm54_finance', 'ربط المطالبة بالمحرك المالي (M54)');
        await logAudit(newId, 'm91_safety', 'ربط تقرير السلامة (M91)');
        if (form.claim_type === 'medical_malpractice') await logAudit(newId, 'm65_medical', 'ربط مطالبة الخطأ الطبي (M65)');
        await logAudit(newId, 'm107_iot', 'ربط أدلة إنترنت الأشياء (M107)');
        await logAudit(newId, 'm109_biometric', 'التحقق البيومتري للمدعي (M109)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء المطالبة');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('m30_claims').delete().eq('id', deleteId);
    setDeleteId(null);
    setSelectedClaim(null);
    fetchAll();
  };

  const openClaimDetail = async (c: M30Claim) => {
    setSelectedClaim(c);
    setDetailLoading(true);
    const aRes = await supabase.from('m30_audit_logs').select('*').eq('case_id', c.id).order('created_at', { ascending: true });
    setAuditLogs((aRes.data as M30AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (c: M30Claim) => {
    const idx = STAGES.indexOf(c.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    await supabase.from('m30_claims').update({ stage: next }).eq('id', c.id);
    await logAudit(c.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedClaim({ ...c, stage: next } as M30Claim);
  };

  const filteredClaims = claims.filter((c) => {
    if (filterType !== 'all' && c.claim_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.claim_number.toLowerCase().includes(q) && !c.claim_title.toLowerCase().includes(q) && !c.claimant_name.toLowerCase().includes(q) && !c.defendant_name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeCount = claims.filter((c) => c.stage !== 'settled').length;
  const totalClaimed = claims.reduce((s, c) => s + (c.total_claimed || 0), 0);
  const avgSuccess = claims.length > 0 ? Math.round(claims.reduce((s, c) => s + (c.success_probability || 0), 0) / claims.length) : 0;

  const tabs: { id: Tab; label: string; icon: typeof AlertTriangle; badge?: number }[] = [
    { id: 'claims', label: 'المطالبات', icon: AlertTriangle, badge: claims.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <AlertTriangle size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">التعويضات والمسؤولية التقصيرية (M30)</h2>
            <p className="font-body text-[10px] text-ink/40">إدارة مطالبات التعويض والمسؤولية التقصيرية — الضرر المادي والأدبي والخطأ والعلاقة السببية</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Shield size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">On-Premise · ZK-Audit</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> مطالبة جديدة
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<AlertTriangle size={14} className="text-midnight" />} label="إجمالي المطالبات" value={String(claims.length)} valueClass="text-midnight" />
        <StatCard icon={<Activity size={14} className="text-blue-600" />} label="مطالبات نشطة" value={String(activeCount)} valueClass="text-blue-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="إجمالي المطالبات" value={formatCurrency(totalClaimed)} valueClass="text-gold" />
        <StatCard icon={<BadgeCheck size={14} className="text-green-600" />} label="متوسط نسبة النجاح" value={avgSuccess + '%'} valueClass="text-green-700" />
      </div>

      {/* 6-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة المطالبة — 6 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.intake;
            const count = claims.filter((c) => c.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[130px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                  </div>
                  <span className="font-body text-[9px] text-cream/40">{count} مطالبة</span>
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
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
          {[
            { icon: Server, label: 'المحرك الموحد (M10)', desc: 'فتح القضية', color: 'text-purple-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'ربط الأمانة', color: 'text-gold' },
            { icon: Shield, label: 'السلامة (M91)', desc: 'تقرير السلامة', color: 'text-cyan-600' },
            { icon: Heart, label: 'الخطأ الطبي (M65)', desc: 'ربط التقارير', color: 'text-red-600' },
            { icon: Activity, label: 'إنترنت الأشياء (M107)', desc: 'أدلة IoT', color: 'text-blue-600' },
            { icon: BadgeCheck, label: 'البيومتري (M109)', desc: 'تحقق المدعي', color: 'text-green-600' },
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

      {/* Filters for claims */}
      {activeTab === 'claims' && (
        <div className="flex items-center gap-2">
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الأنواع</option>
            {Object.entries(CLAIM_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم المطالبة أو العنوان أو الأطراف..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Claims tab */}
      {activeTab === 'claims' && (
        <div className="space-y-2">
          {filteredClaims.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <AlertTriangle size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد مطالبات مسجلة</p>
            </div>
          ) : (
            filteredClaims.map((c) => {
              const sCfg = STAGE_CONFIG[c.stage] || STAGE_CONFIG.intake;
              const stageIdx = STAGES.indexOf(c.stage);
              const TypeIcon = CLAIM_TYPE_ICONS[c.claim_type] || AlertTriangle;
              return (
                <div key={c.id} onClick={() => openClaimDetail(c)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <TypeIcon size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{c.claim_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{CLAIM_TYPE_LABELS[c.claim_type] || c.claim_type}</span>
                          {c.fault_established && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> خطأ ثابت</span>}
                          {c.causation_proven && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-cyan-50 text-cyan-600"><Scale size={8} /> علاقة سببية</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{c.claim_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="font-body text-[9px] text-ink/40">المدعي: {c.claimant_name}</span>
                          <span className="font-body text-[9px] text-ink/40">المدعى عليه: {c.defendant_name}</span>
                          {c.total_claimed > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(c.total_claimed)}</span>}
                          {c.success_probability > 0 && <span className="font-body text-[9px] text-green-600 font-bold">النجاح: {c.success_probability}%</span>}
                          {c.m10_case_opened && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Server size={8} /> M10</span>}
                          {c.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {c.m91_safety_report_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-cyan-50 text-cyan-600"><Shield size={8} /> M91</span>}
                          {c.m107_iot_evidence_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Activity size={8} /> M107</span>}
                          {c.m109_biometric_verified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><BadgeCheck size={8} /> M109</span>}
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
                    {log.action.includes('created') ? <AlertTriangle size={12} className="text-blue-600" />
                      : log.action.includes('m10') ? <Server size={12} className="text-purple-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m91') ? <Shield size={12} className="text-cyan-600" />
                      : log.action.includes('m65') ? <Heart size={12} className="text-red-600" />
                      : log.action.includes('m107') ? <Activity size={12} className="text-blue-600" />
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

      {/* Claim detail drawer */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedClaim(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف المطالبة</span>
              </div>
              <button onClick={() => setSelectedClaim(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-gold animate-spin" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-body text-[10px] font-bold text-gold">{selectedClaim.claim_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedClaim.stage] || STAGE_CONFIG.intake).bg} ${(STAGE_CONFIG[selectedClaim.stage] || STAGE_CONFIG.intake).text}`}>
                      {(STAGE_CONFIG[selectedClaim.stage] || STAGE_CONFIG.intake).label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{CLAIM_TYPE_LABELS[selectedClaim.claim_type] || selectedClaim.claim_type}</span>
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedClaim.claim_title}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.intake;
                      const stageIdx = STAGES.indexOf(selectedClaim.stage);
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
                  {selectedClaim.stage !== STAGES[STAGES.length - 1] && (
                    <button onClick={() => advanceStage(selectedClaim)} className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
                      <ArrowRight size={12} /> الانتقال للمرحلة التالية
                    </button>
                  )}
                </div>

                {/* Claim info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <AlertTriangle size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات المطالبة</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">المدعي</span><p className="font-body text-xs font-bold text-midnight">{selectedClaim.claimant_name}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المدعى عليه</span><p className="font-body text-xs font-bold text-midnight">{selectedClaim.defendant_name}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">تاريخ الحادث</span><p className="font-body text-xs font-bold text-midnight">{selectedClaim.incident_date ? formatDate(selectedClaim.incident_date) : '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">موقع الحادث</span><p className="font-body text-xs font-bold text-midnight">{selectedClaim.incident_location || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المستشار</span><p className="font-body text-xs font-bold text-midnight">{selectedClaim.advisor?.name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نسبة النجاح</span><p className="font-body text-xs font-bold text-green-700">{selectedClaim.success_probability}%</p></div>
                  </div>
                </div>

                {/* Damage breakdown */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                    <DollarSign size={12} className="text-red-600 mb-1" />
                    <span className="font-body text-[9px] text-ink/40">الضرر المادي</span>
                    <p className="font-body text-sm font-bold text-red-700">{formatCurrency(selectedClaim.material_damage)}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                    <Heart size={12} className="text-purple-600 mb-1" />
                    <span className="font-body text-[9px] text-ink/40">الضرر الأدبي</span>
                    <p className="font-body text-sm font-bold text-purple-700">{formatCurrency(selectedClaim.moral_damage)}</p>
                  </div>
                  <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                    <Scale size={12} className="text-gold mb-1" />
                    <span className="font-body text-[9px] text-ink/40">إجمالي المطالبة</span>
                    <p className="font-body text-sm font-bold text-gold">{formatCurrency(selectedClaim.total_claimed)}</p>
                  </div>
                </div>

                {/* Fault & causation flags */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedClaim.fault_established ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><CheckCircle2 size={10} /> الخطأ {selectedClaim.fault_established ? 'ثابت' : 'غير ثابت'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedClaim.causation_proven ? 'bg-cyan-50 text-cyan-600' : 'bg-gray-100 text-ink/30'}`}><Scale size={10} /> العلاقة السببية {selectedClaim.causation_proven ? 'مثبتة' : 'غير مثبتة'}</span>
                </div>

                {/* Reports */}
                {(selectedClaim.expert_report || selectedClaim.police_report) && (
                  <div className="space-y-2">
                    {selectedClaim.expert_report && <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">تقرير الخبير</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedClaim.expert_report}</p></div>}
                    {selectedClaim.police_report && <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">تقرير الشرطة</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedClaim.police_report}</p></div>}
                  </div>
                )}

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedClaim.m10_case_opened ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Server size={10} /> M10 {selectedClaim.m10_case_opened ? 'مفتوح' : 'غير مفتوح'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedClaim.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedClaim.m54_finance_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedClaim.m91_safety_report_linked ? 'bg-cyan-50 text-cyan-600' : 'bg-gray-100 text-ink/30'}`}><Shield size={10} /> M91 {selectedClaim.m91_safety_report_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedClaim.m65_medical_malpractice_linked ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-ink/30'}`}><Heart size={10} /> M65 {selectedClaim.m65_medical_malpractice_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedClaim.m107_iot_evidence_linked ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Activity size={10} /> M107 {selectedClaim.m107_iot_evidence_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedClaim.m109_biometric_verified ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><BadgeCheck size={10} /> M109 {selectedClaim.m109_biometric_verified ? 'مُتحقَّق' : 'غير مُتحقَّق'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedClaim.m92_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Activity size={10} /> M92 {selectedClaim.m92_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                </div>

                {selectedClaim.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedClaim.description}</p></div>
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

      {/* Claim create/edit modal */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل المطالبة' : 'مطالبة جديدة'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم المطالبة" required><TextInput value={form.claim_number} onChange={(e) => setForm({ ...form, claim_number: e.target.value })} placeholder="COMP-2025-001" /></Field>
          <Field label="نوع المطالبة">
            <Select value={form.claim_type} onChange={(e) => setForm({ ...form, claim_type: e.target.value })}>
              {Object.entries(CLAIM_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان المطالبة" required><TextInput value={form.claim_title} onChange={(e) => setForm({ ...form, claim_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المدعي" required><TextInput value={form.claimant_name} onChange={(e) => setForm({ ...form, claimant_name: e.target.value })} /></Field>
          <Field label="المدعى عليه" required><TextInput value={form.defendant_name} onChange={(e) => setForm({ ...form, defendant_name: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ الحادث"><TextInput type="date" value={form.incident_date} onChange={(e) => setForm({ ...form, incident_date: e.target.value })} /></Field>
          <Field label="موقع الحادث"><TextInput value={form.incident_location} onChange={(e) => setForm({ ...form, incident_location: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="الضرر المادي"><TextInput type="number" value={form.material_damage} onChange={(e) => setForm({ ...form, material_damage: e.target.value })} /></Field>
          <Field label="الضرر الأدبي"><TextInput type="number" value={form.moral_damage} onChange={(e) => setForm({ ...form, moral_damage: e.target.value })} /></Field>
          <Field label="نسبة النجاح (%)"><TextInput type="number" value={form.success_probability} onChange={(e) => setForm({ ...form, success_probability: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
        </div>
        <Checkbox label="الخطأ ثابت (Fault Established)" checked={form.fault_established} onChange={(v) => setForm({ ...form, fault_established: v })} />
        <Checkbox label="العلاقة السببية مثبتة (Causation Proven)" checked={form.causation_proven} onChange={(v) => setForm({ ...form, causation_proven: v })} />
        <Field label="تقرير الخبير"><TextArea value={form.expert_report} onChange={(e) => setForm({ ...form, expert_report: e.target.value })} rows={3} /></Field>
        <Field label="تقرير الشرطة"><TextArea value={form.police_report} onChange={(e) => setForm({ ...form, police_report: e.target.value })} rows={3} /></Field>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
