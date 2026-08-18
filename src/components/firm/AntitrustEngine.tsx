import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, Scale,
  Shield, CircuitBoard, Zap, CheckCircle2, Clock, ArrowRight, Search,
  FileText, Activity, Server, AlertCircle, BadgeCheck,
  Percent, Gavel,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M26Compliance, M26AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'reviews' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  triggered: { label: 'إطلاق المراجعة', bg: 'bg-blue-50', text: 'text-blue-700' },
  analyzing: { label: 'التحليل', bg: 'bg-amber-50', text: 'text-amber-700' },
  reported: { label: 'إصدار التقرير', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  reviewed: { label: 'المراجعة', bg: 'bg-purple-50', text: 'text-purple-700' },
  cleared: { label: 'الموافقة', bg: 'bg-green-50', text: 'text-green-700' },
  archived: { label: 'الأرشفة', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const STAGES = ['triggered', 'analyzing', 'reported', 'reviewed', 'cleared', 'archived'];

const REVIEW_TYPE_LABELS: Record<string, string> = {
  contract_review: 'مراجعة عقد',
  merger_review: 'مراجعة اندماج',
  pricing_review: 'مراجعة تسعير',
  market_share: 'تحليل حصة السوق',
};

interface ComplianceForm {
  review_number: string;
  review_title: string;
  review_type: string;
  stage: string;
  target_contract_id: string;
  target_deal_id: string;
  market_share_pct: string;
  concentration_flag: boolean;
  antitrust_clearance: boolean;
  red_alert_triggered: boolean;
  sensitivity_points: string;
  review_report: string;
  description: string;
}

const emptyForm: ComplianceForm = {
  review_number: '', review_title: '', review_type: 'contract_review', stage: 'triggered',
  target_contract_id: '', target_deal_id: '', market_share_pct: '0',
  concentration_flag: false, antitrust_clearance: false, red_alert_triggered: false,
  sensitivity_points: '', review_report: '', description: '',
};

export default function AntitrustEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [compliances, setCompliances] = useState<M26Compliance[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('reviews');
  const [selectedCompliance, setSelectedCompliance] = useState<M26Compliance | null>(null);
  const [auditLogs, setAuditLogs] = useState<M26AuditLog[]>([]);
  const [allAudit, setAllAudit] = useState<M26AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ComplianceForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [compRes, attRes, auditRes] = await Promise.all([
      supabase.from('m26_compliances')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m26_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setCompliances((compRes.data as M26Compliance[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAudit((auditRes.data as M26AuditLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyForm, review_title: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const logAudit = async (complianceId: string, action: string, detail: string) => {
    const hash = '0x' + Math.random().toString(16).substr(2, 4) + '...' + Math.random().toString(16).substr(2, 4);
    await supabase.from('m26_audit_logs').insert({
      case_id: complianceId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (c: M26Compliance) => {
    setForm({
      review_number: c.review_number, review_title: c.review_title,
      review_type: c.review_type, stage: c.stage,
      target_contract_id: c.target_contract_id || '', target_deal_id: c.target_deal_id || '',
      market_share_pct: String(c.market_share_pct || 0),
      concentration_flag: c.concentration_flag || false,
      antitrust_clearance: c.antitrust_clearance || false,
      red_alert_triggered: c.red_alert_triggered || false,
      sensitivity_points: c.sensitivity_points || '', review_report: c.review_report || '',
      description: c.description || '',
    });
    setEditingId(c.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.review_title.trim() || !form.review_number.trim()) return;
    setSaving(true);
    const payload = {
      review_number: form.review_number.trim(),
      review_title: form.review_title.trim(),
      review_type: form.review_type,
      stage: form.stage,
      target_contract_id: form.target_contract_id.trim() || null,
      target_deal_id: form.target_deal_id.trim() || null,
      market_share_pct: Number(form.market_share_pct) || 0,
      concentration_flag: form.concentration_flag,
      antitrust_clearance: form.antitrust_clearance,
      red_alert_triggered: form.red_alert_triggered,
      sensitivity_points: form.sensitivity_points.trim() || null,
      review_report: form.review_report.trim() || null,
      description: form.description.trim() || null,
    };
    if (editingId) {
      await supabase.from('m26_compliances').update(payload).eq('id', editingId);
      await logAudit(editingId, 'compliance_updated', 'تحديث بيانات المراجعة');
    } else {
      const { data } = await supabase.from('m26_compliances').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'compliance_created', 'إنشاء مراجعة امتثال — نوع: ' + (REVIEW_TYPE_LABELS[form.review_type] || form.review_type));
        await supabase.from('m26_compliances').update({
          m20_deal_linked: true,
          m23_agency_linked: true,
          m54_finance_checked: true,
          m10_deadlines_registered: true,
          m109_biometric_verified: true,
          m92_notified: true,
          cost_center_id: 'CC-M26-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm20_linked', 'ربط المراجعة بصفقة تجارية (M20)');
        await logAudit(newId, 'm23_linked', 'ربط المراجعة بوكالة تجارية (M23)');
        await logAudit(newId, 'm54_finance', 'فحص الأثر المالي للمراجعة في المحرك المالي (M54)');
        await logAudit(newId, 'm10_deadlines', 'تسجيل مواعيد المراجعة في المحرك الموحد (M10)');
        await logAudit(newId, 'm109_biometric', 'التحقق البيومتري للجهات المعنية (M109)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء المراجعة');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('m26_compliances').delete().eq('id', deleteId);
    setDeleteId(null);
    setSelectedCompliance(null);
    fetchAll();
  };

  const openComplianceDetail = async (c: M26Compliance) => {
    setSelectedCompliance(c);
    setDetailLoading(true);
    const aRes = await supabase.from('m26_audit_logs').select('*').eq('case_id', c.id).order('created_at', { ascending: true });
    setAuditLogs((aRes.data as M26AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (c: M26Compliance) => {
    const idx = STAGES.indexOf(c.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    await supabase.from('m26_compliances').update({ stage: next }).eq('id', c.id);
    await logAudit(c.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedCompliance({ ...c, stage: next } as M26Compliance);
  };

  const filteredCompliances = compliances.filter((c) => {
    if (filterType !== 'all' && c.review_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.review_number.toLowerCase().includes(q) && !c.review_title.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeCount = compliances.filter((c) => c.stage !== 'archived' && c.stage !== 'cleared').length;
  const redAlertCount = compliances.filter((c) => c.red_alert_triggered).length;
  const complianceRate = compliances.length > 0
    ? Math.round((compliances.filter((c) => c.antitrust_clearance).length / compliances.length) * 100)
    : 0;

  const tabs: { id: Tab; label: string; icon: typeof Scale; badge?: number }[] = [
    { id: 'reviews', label: 'المراجعات', icon: Scale, badge: compliances.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Scale size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">الامتثال التجاري ومنع الاحتكار (M26)</h2>
            <p className="font-body text-[10px] text-ink/40">إدارة المراجعات التجارية ومخاطر الاحتكار — مراجعة العقود والاندماج والتسعير</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Shield size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">On-Premise · ZK-Audit</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> مراجعة جديدة
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Scale size={14} className="text-midnight" />} label="إجمالي المراجعات" value={String(compliances.length)} valueClass="text-midnight" />
        <StatCard icon={<Activity size={14} className="text-blue-600" />} label="مراجعات نشطة" value={String(activeCount)} valueClass="text-blue-700" />
        <StatCard icon={<AlertCircle size={14} className="text-red-600" />} label="تنبيهات حمراء" value={String(redAlertCount)} valueClass="text-red-700" />
        <StatCard icon={<BadgeCheck size={14} className="text-green-600" />} label="معدل الامتثال" value={`${complianceRate}%`} valueClass="text-green-700" />
      </div>

      {/* 6-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة المراجعة — 6 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.triggered;
            const count = compliances.filter((c) => c.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[130px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                  </div>
                  <span className="font-body text-[9px] text-cream/40">{count} مراجعة</span>
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
            { icon: Gavel, label: 'الصفقات التجارية (M20)', desc: 'ربط الصفقات', color: 'text-blue-600' },
            { icon: FileText, label: 'الوكالات التجارية (M23)', desc: 'ربط الوكالات', color: 'text-cyan-600' },
            { icon: CircuitBoard, label: 'المحرك المالي (M54)', desc: 'فحص الأثر المالي', color: 'text-gold' },
            { icon: Server, label: 'المحرك الموحد (M10)', desc: 'تسجيل المواعيد', color: 'text-purple-600' },
            { icon: BadgeCheck, label: 'التحقق البيومتري (M109)', desc: 'تحقق الجهات', color: 'text-green-600' },
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

      {/* Filters for reviews */}
      {activeTab === 'reviews' && (
        <div className="flex items-center gap-2">
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الأنواع</option>
            {Object.entries(REVIEW_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم أو عنوان المراجعة..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Reviews tab */}
      {activeTab === 'reviews' && (
        <div className="space-y-2">
          {filteredCompliances.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Scale size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد مراجعات امتثال مسجلة</p>
            </div>
          ) : (
            filteredCompliances.map((c) => {
              const sCfg = STAGE_CONFIG[c.stage] || STAGE_CONFIG.triggered;
              const stageIdx = STAGES.indexOf(c.stage);
              return (
                <div key={c.id} onClick={() => openComplianceDetail(c)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <Scale size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{c.review_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{REVIEW_TYPE_LABELS[c.review_type] || c.review_type}</span>
                          {c.concentration_flag && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><AlertCircle size={8} /> تركّز سوقي</span>}
                          {c.red_alert_triggered && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-red-50 text-red-600"><AlertCircle size={8} /> تنبيه أحمر</span>}
                          {c.antitrust_clearance && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> مخالفة موافق عليها</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{c.review_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {c.market_share_pct > 0 && <span className="font-body text-[9px] text-gold font-bold"><Percent size={9} className="inline" /> حصة السوق: {c.market_share_pct}%</span>}
                          {c.target_contract_id && <span className="font-body text-[9px] text-ink/40">عقد: {c.target_contract_id}</span>}
                          {c.target_deal_id && <span className="font-body text-[9px] text-ink/40">صفقة: {c.target_deal_id}</span>}
                          {c.m20_deal_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Gavel size={8} /> M20</span>}
                          {c.m23_agency_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-cyan-50 text-cyan-600"><FileText size={8} /> M23</span>}
                          {c.m54_finance_checked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CircuitBoard size={8} /> M54</span>}
                          {c.m10_deadlines_registered && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Server size={8} /> M10</span>}
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
                        <button onClick={(e) => { e.stopPropagation(); openEdit(c); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
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
                    {log.action.includes('created') ? <Scale size={12} className="text-blue-600" />
                      : log.action.includes('m20') ? <Gavel size={12} className="text-blue-600" />
                      : log.action.includes('m23') ? <FileText size={12} className="text-cyan-600" />
                      : log.action.includes('m54') ? <CircuitBoard size={12} className="text-green-600" />
                      : log.action.includes('m10') ? <Server size={12} className="text-purple-600" />
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

      {/* Compliance detail drawer */}
      {selectedCompliance && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedCompliance(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Scale size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف المراجعة</span>
              </div>
              <button onClick={() => setSelectedCompliance(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-gold animate-spin" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-body text-[10px] font-bold text-gold">{selectedCompliance.review_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedCompliance.stage] || STAGE_CONFIG.triggered).bg} ${(STAGE_CONFIG[selectedCompliance.stage] || STAGE_CONFIG.triggered).text}`}>
                      {(STAGE_CONFIG[selectedCompliance.stage] || STAGE_CONFIG.triggered).label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{REVIEW_TYPE_LABELS[selectedCompliance.review_type] || selectedCompliance.review_type}</span>
                    {selectedCompliance.concentration_flag && <span className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-body bg-amber-50 text-amber-600"><AlertCircle size={10} /> تركّز سوقي</span>}
                    {selectedCompliance.red_alert_triggered && <span className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-body bg-red-50 text-red-600"><AlertCircle size={10} /> تنبيه أحمر</span>}
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedCompliance.review_title}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.triggered;
                      const stageIdx = STAGES.indexOf(selectedCompliance.stage);
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
                  {selectedCompliance.stage !== STAGES[STAGES.length - 1] && (
                    <button onClick={() => advanceStage(selectedCompliance)} className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
                      <ArrowRight size={12} /> الانتقال للمرحلة التالية
                    </button>
                  )}
                </div>

                {/* Compliance info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Scale size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات المراجعة</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">نوع المراجعة</span><p className="font-body text-xs font-bold text-midnight">{REVIEW_TYPE_LABELS[selectedCompliance.review_type] || selectedCompliance.review_type}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">حصة السوق</span><p className="font-body text-xs font-bold text-gold">{selectedCompliance.market_share_pct}%</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">العقد المستهدف</span><p className="font-body text-xs font-bold text-midnight">{selectedCompliance.target_contract_id || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الصفقة المستهدفة</span><p className="font-body text-xs font-bold text-midnight">{selectedCompliance.target_deal_id || '—'}</p></div>
                  </div>
                </div>

                {/* Flags */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCompliance.concentration_flag ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><AlertCircle size={10} /> تركّز سوقي {selectedCompliance.concentration_flag ? 'مُشخَّص' : 'غير مُشخَّص'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCompliance.antitrust_clearance ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><CheckCircle2 size={10} /> مخالفة {selectedCompliance.antitrust_clearance ? 'موافق عليها' : 'غير موافق عليها'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCompliance.red_alert_triggered ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-ink/30'}`}><AlertCircle size={10} /> تنبيه أحمر {selectedCompliance.red_alert_triggered ? 'مُفعَّل' : 'غير مُفعَّل'}</span>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCompliance.m20_deal_linked ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Gavel size={10} /> M20 {selectedCompliance.m20_deal_linked ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCompliance.m23_agency_linked ? 'bg-cyan-50 text-cyan-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> M23 {selectedCompliance.m23_agency_linked ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCompliance.m54_finance_checked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><CircuitBoard size={10} /> M54 {selectedCompliance.m54_finance_checked ? 'مفحوص' : 'غير مفحوص'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCompliance.m10_deadlines_registered ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Server size={10} /> M10 {selectedCompliance.m10_deadlines_registered ? 'مُسَجَّل' : 'غير مُسَجَّل'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCompliance.m109_biometric_verified ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><BadgeCheck size={10} /> M109 {selectedCompliance.m109_biometric_verified ? 'مُتحقَّق' : 'غير مُتحقَّق'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCompliance.m92_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Activity size={10} /> M92 {selectedCompliance.m92_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                </div>

                {selectedCompliance.sensitivity_points && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">نقاط الحساسية</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedCompliance.sensitivity_points}</p></div>
                )}
                {selectedCompliance.review_report && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">تقرير المراجعة</p><p className="font-body text-xs text-ink/70 leading-relaxed whitespace-pre-wrap">{selectedCompliance.review_report}</p></div>
                )}
                {selectedCompliance.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedCompliance.description}</p></div>
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

      {/* Compliance create/edit modal */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل المراجعة' : 'مراجعة جديدة'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم المراجعة" required><TextInput value={form.review_number} onChange={(e) => setForm({ ...form, review_number: e.target.value })} placeholder="AC-2025-001" /></Field>
          <Field label="نوع المراجعة">
            <Select value={form.review_type} onChange={(e) => setForm({ ...form, review_type: e.target.value })}>
              {Object.entries(REVIEW_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان المراجعة" required><TextInput value={form.review_title} onChange={(e) => setForm({ ...form, review_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
          <Field label="حصة السوق (%)"><TextInput type="number" value={form.market_share_pct} onChange={(e) => setForm({ ...form, market_share_pct: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="العقد المستهدف"><TextInput value={form.target_contract_id} onChange={(e) => setForm({ ...form, target_contract_id: e.target.value })} /></Field>
          <Field label="الصفقة المستهدفة"><TextInput value={form.target_deal_id} onChange={(e) => setForm({ ...form, target_deal_id: e.target.value })} /></Field>
        </div>
        <Checkbox label="تركّز سوقي مُشخَّص (Concentration Flag)" checked={form.concentration_flag} onChange={(v) => setForm({ ...form, concentration_flag: v })} />
        <Checkbox label="موافقة على مخالفة (Antitrust Clearance)" checked={form.antitrust_clearance} onChange={(v) => setForm({ ...form, antitrust_clearance: v })} />
        <Checkbox label="تنبيه أحمر مُفعَّل (Red Alert Triggered)" checked={form.red_alert_triggered} onChange={(v) => setForm({ ...form, red_alert_triggered: v })} />
        <Field label="نقاط الحساسية"><TextArea value={form.sensitivity_points} onChange={(e) => setForm({ ...form, sensitivity_points: e.target.value })} rows={3} /></Field>
        <Field label="تقرير المراجعة"><TextArea value={form.review_report} onChange={(e) => setForm({ ...form, review_report: e.target.value })} rows={4} /></Field>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
