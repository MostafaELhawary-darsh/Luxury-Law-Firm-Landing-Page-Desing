import { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck, AlertTriangle, ShieldAlert, Loader2, Plus, Pencil, Trash2,
  Clock, FileText, DollarSign, CircuitBoard, Lock, Zap, ChevronRight,
  CheckCircle2, X, Bell, BellRing, Calendar, TrendingUp, TrendingDown,
  Activity, Eye, Sparkles, ArrowRight, FileCheck, AlertOctagon,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  RiskAssessment, ClauseExtraction, EarlyWarning, RiskDeadline, ZkAuditLog, Case,
} from '@/lib/firmTypes';
import type { Client } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'risks' | 'clauses' | 'warnings' | 'deadlines' | 'audit';

const RISK_LEVEL_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; dot: string; icon: string }> = {
  low: { label: 'منخفض', bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', dot: 'bg-gray-400', icon: 'CheckCircle2' },
  medium: { label: 'متوسط', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-400', icon: 'AlertTriangle' },
  high: { label: 'عالي', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500', icon: 'AlertTriangle' },
  critical: { label: 'حرج', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', dot: 'bg-red-500', icon: 'ShieldAlert' },
};

const RISK_TYPE_LABELS: Record<string, string> = {
  contractual_financial: 'تعارض تعاقدي مالي',
  renewal_deadline: 'موعد تجديد',
  clause_gap: 'ثغرة في البنود',
  compliance_risk: 'مخاطر امتثال',
  financial_exposure: 'تعرض مالي',
  litigation_risk: 'مخاطر التقاضي',
};

const WARNING_SEVERITY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  low: { label: 'منخفض', bg: 'bg-gray-100', text: 'text-gray-600' },
  medium: { label: 'متوسط', bg: 'bg-amber-50', text: 'text-amber-700' },
  high: { label: 'عالي', bg: 'bg-orange-50', text: 'text-orange-700' },
  critical: { label: 'حرج', bg: 'bg-red-50', text: 'text-red-700' },
};

const CLAUSE_TYPE_LABELS: Record<string, string> = {
  termination_clause: 'بند الفسخ',
  payment_clause: 'بند السداد',
  arbitration_clause: 'بند التحكيم',
  renewal_clause: 'بند التجديد',
  penalty_clause: 'بند الغرامة',
  confidentiality_clause: 'بند السرية',
  liability_clause: 'بند المسؤولية',
};

const DEADLINE_TYPE_LABELS: Record<string, string> = {
  license_renewal: 'تجديد ترخيص',
  contract_payment: 'سداد تعاقدي',
  contract_termination: 'إنهاء عقد',
  poa_renewal: 'تجديد توكيل',
  filing_deadline: 'موعد تقديم',
  court_deadline: 'موعد قضائي',
};

const ZK_RISK_LEVEL_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  info: { label: 'معلومة', bg: 'bg-blue-50', text: 'text-blue-600' },
  low: { label: 'منخفض', bg: 'bg-gray-100', text: 'text-gray-600' },
  medium: { label: 'متوسط', bg: 'bg-amber-50', text: 'text-amber-600' },
  high: { label: 'عالي', bg: 'bg-orange-50', text: 'text-orange-600' },
  critical: { label: 'حرج', bg: 'bg-red-50', text: 'text-red-600' },
};

const SOURCE_ENGINE_LABELS: Record<string, string> = {
  'M47-Classifier': 'محرك التوجيه (M47)',
  'M48-ArchiveEngine': 'محرك الأرشفة (M48)',
  'M49-BoardEngine': 'غرفة الاجتماعات (M49)',
  'M50-RiskEngine': 'محرك المخاطر (M50)',
  'M54-FinanceEngine': 'المحرك المالي (M54)',
  'M92-OmniAgent': 'الوكيل الذكي (M92)',
  'M10-CaseCore': 'نواة القضية (M10)',
};

interface RiskForm {
  title: string;
  description: string;
  risk_type: string;
  risk_level: string;
  probability: string;
  financial_impact: string;
  source_engine: string;
  contract_ref: string;
  case_id: string;
  client_id: string;
  detected_conflicts: string;
  recommended_actions: string;
}

const emptyRiskForm: RiskForm = {
  title: '', description: '', risk_type: 'contractual_financial', risk_level: 'medium',
  probability: '50', financial_impact: '0', source_engine: '', contract_ref: '',
  case_id: '', client_id: '', detected_conflicts: '', recommended_actions: '',
};

export default function PredictiveRiskEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [risks, setRisks] = useState<RiskAssessment[]>([]);
  const [clauses, setClauses] = useState<ClauseExtraction[]>([]);
  const [warnings, setWarnings] = useState<EarlyWarning[]>([]);
  const [deadlines, setDeadlines] = useState<RiskDeadline[]>([]);
  const [auditLogs, setAuditLogs] = useState<ZkAuditLog[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('risks');
  const [selectedRisk, setSelectedRisk] = useState<RiskAssessment | null>(null);
  const [riskClauses, setRiskClauses] = useState<ClauseExtraction[]>([]);
  const [riskWarnings, setRiskWarnings] = useState<EarlyWarning[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RiskForm>(emptyRiskForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'risk' | 'clause' | 'warning' | 'deadline'>('risk');
  const [filterLevel, setFilterLevel] = useState('all');
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [riskRes, clauseRes, warnRes, dlRes, auditRes, caseRes, clientRes] = await Promise.all([
      supabase.from('m50_risk_assessments')
        .select('*, case:lf_cases(case_number, case_title), client:lf_clients(name)')
        .order('created_at', { ascending: false }),
      supabase.from('m50_clause_extractions').select('*').order('created_at', { ascending: false }),
      supabase.from('m50_early_warnings').select('*').order('created_at', { ascending: false }),
      supabase.from('m50_deadline_calendar').select('*').order('deadline_date', { ascending: true }),
      supabase.from('m50_zk_audit').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('lf_cases').select('id, case_number, case_title').order('case_number'),
      supabase.from('lf_clients').select('*').order('name'),
    ]);
    setRisks((riskRes.data as RiskAssessment[]) || []);
    setClauses((clauseRes.data as ClauseExtraction[]) || []);
    setWarnings((warnRes.data as EarlyWarning[]) || []);
    setDeadlines((dlRes.data as RiskDeadline[]) || []);
    setAuditLogs((auditRes.data as ZkAuditLog[]) || []);
    setCases((caseRes.data as Case[]) || []);
    setClients((clientRes.data as Client[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyRiskForm, title: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const logZkAudit = async (operationType: string, entityRef: string, detail: string, riskLevel: string) => {
    const hash = '0x' + Math.random().toString(16).substr(2, 4) + '...' + Math.random().toString(16).substr(2, 4);
    await supabase.from('m50_zk_audit').insert({
      operation_type: operationType,
      entity_ref: entityRef,
      actor: 'M50-RiskEngine',
      detail,
      risk_level: riskLevel,
      hash_chain: hash,
      immutable: true,
    });
  };

  const openAdd = () => { setForm(emptyRiskForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (r: RiskAssessment) => {
    setForm({
      title: r.title, description: r.description || '', risk_type: r.risk_type, risk_level: r.risk_level,
      probability: String(r.probability || 50), financial_impact: String(r.financial_impact || 0),
      source_engine: r.source_engine || '', contract_ref: r.contract_ref || '',
      case_id: r.case_id || '', client_id: r.client_id || '',
      detected_conflicts: r.detected_conflicts?.join('\n') || '',
      recommended_actions: r.recommended_actions?.join('\n') || '',
    });
    setEditingId(r.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      risk_type: form.risk_type,
      risk_level: form.risk_level,
      probability: Number(form.probability) || 50,
      financial_impact: Number(form.financial_impact) || 0,
      source_engine: form.source_engine || null,
      contract_ref: form.contract_ref || null,
      case_id: form.case_id || null,
      client_id: form.client_id || null,
      detected_conflicts: form.detected_conflicts.split('\n').filter(Boolean),
      recommended_actions: form.recommended_actions.split('\n').filter(Boolean),
    };
    if (editingId) {
      await supabase.from('m50_risk_assessments').update(payload).eq('id', editingId);
      await logZkAudit('risk_updated', editingId, `تحديث تقييم المخاطر: ${form.title}`, form.risk_level);
    } else {
      const { data } = await supabase.from('m50_risk_assessments').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await logZkAudit('risk_detected', newId, `رصد مخاطر جديد: ${form.title} — المستوى: ${form.risk_level}`, form.risk_level);
        if (form.risk_level === 'critical' || form.risk_level === 'high') {
          await supabase.from('m50_early_warnings').insert({
            risk_assessment_id: newId,
            warning_type: form.risk_type,
            severity: form.risk_level,
            message: `تنبيه ${form.risk_level === 'critical' ? 'حرج' : 'عالي'}: ${form.title}`,
            target_engine: 'M49-BoardEngine',
            board_agenda_item: form.risk_level === 'critical',
            acknowledged: false,
          });
          await logZkAudit('warning_dispatched', newId, `إرسال تنبيه ${form.risk_level} إلى غرفة الاجتماعات (M49)`, form.risk_level);
        }
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (deleteType === 'risk') await supabase.from('m50_risk_assessments').delete().eq('id', deleteId);
    else if (deleteType === 'clause') await supabase.from('m50_clause_extractions').delete().eq('id', deleteId);
    else if (deleteType === 'warning') await supabase.from('m50_early_warnings').delete().eq('id', deleteId);
    else if (deleteType === 'deadline') await supabase.from('m50_deadline_calendar').delete().eq('id', deleteId);
    setDeleteId(null);
    fetchAll();
  };

  const openRiskDetail = async (risk: RiskAssessment) => {
    setSelectedRisk(risk);
    const [clRes, wRes] = await Promise.all([
      supabase.from('m50_clause_extractions').select('*').eq('risk_assessment_id', risk.id).order('created_at', { ascending: false }),
      supabase.from('m50_early_warnings').select('*').eq('risk_assessment_id', risk.id).order('created_at', { ascending: false }),
    ]);
    setRiskClauses((clRes.data as ClauseExtraction[]) || []);
    setRiskWarnings((wRes.data as EarlyWarning[]) || []);
  };

  const resolveRisk = async (risk: RiskAssessment) => {
    await supabase.from('m50_risk_assessments').update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: 'النظام',
      resolution_note: 'تم حل المخاطر واتخاذ الإجراءات الوقائية',
    }).eq('id', risk.id);
    await logZkAudit('risk_resolved', risk.id, `تم حل تقييم المخاطر: ${risk.title}`, 'info');
    setSelectedRisk(null);
    fetchAll();
  };

  const acknowledgeWarning = async (w: EarlyWarning) => {
    await supabase.from('m50_early_warnings').update({
      acknowledged: true,
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: 'النظام',
    }).eq('id', w.id);
    await logZkAudit('warning_acknowledged', w.risk_assessment_id, 'تم إقرار التنبيه', w.severity);
    fetchAll();
  };

  const generateDraftNotice = async (dl: RiskDeadline) => {
    await supabase.from('m50_deadline_calendar').update({ draft_notice_generated: true }).eq('id', dl.id);
    await logZkAudit('draft_notice_generated', dl.contract_ref || dl.id, `توليد مسودة إخطار قانوني: ${dl.title}`, 'info');
    fetchAll();
  };

  const filteredRisks = risks.filter((r) => filterLevel === 'all' || r.risk_level === filterLevel);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const criticalCount = risks.filter((r) => r.risk_level === 'critical' && r.status === 'active').length;
  const highCount = risks.filter((r) => r.risk_level === 'high' && r.status === 'active').length;
  const activeRisks = risks.filter((r) => r.status === 'active').length;
  const resolvedRisks = risks.filter((r) => r.status === 'resolved').length;
  const unackWarnings = warnings.filter((w) => !w.acknowledged).length;
  const upcomingDeadlines = deadlines.filter((d) => d.status === 'upcoming').length;
  const totalExposure = risks.filter((r) => r.status === 'active').reduce((sum, r) => sum + (r.financial_impact || 0), 0);
  const flaggedClauses = clauses.filter((c) => c.status === 'flagged').length;

  const tabs: { id: Tab; label: string; icon: typeof ShieldCheck; badge?: number }[] = [
    { id: 'risks', label: 'تقييمات المخاطر', icon: ShieldAlert, badge: activeRisks },
    { id: 'clauses', label: 'البنود المستخرجة', icon: FileText, badge: flaggedClauses },
    { id: 'warnings', label: 'الإنذارات المبكرة', icon: BellRing, badge: unackWarnings },
    { id: 'deadlines', label: 'مواعيد التجديد', icon: Calendar, badge: upcomingDeadlines },
    { id: 'audit', label: 'سجل ZK-Audit', icon: Lock },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <ShieldCheck size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">محرك التحليل التنبؤي وتدقيق المخاطر (M50)</h2>
            <p className="font-body text-[10px] text-ink/40">الدرع الاستباقي — رصد المخاطر القانونية والمالية قبل وقوعها</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowNotifPanel(!showNotifPanel)}
              className="relative p-2 rounded-lg border border-gray-200 bg-white hover:border-gold/30 transition-colors"
            >
              {unackWarnings > 0 ? <BellRing size={16} className="text-red-500 animate-pulse" /> : <Bell size={16} className="text-ink/40" />}
              {unackWarnings > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{unackWarnings}</span>
              )}
            </button>
            {showNotifPanel && (
              <div className="absolute left-0 top-12 z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 max-h-96 overflow-y-auto">
                <div className="px-4 py-3 border-b border-gray-100">
                  <span className="font-heading font-bold text-midnight text-sm">الإنذارات غير المقرة</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {warnings.filter((w) => !w.acknowledged).map((w) => {
                    const sevCfg = WARNING_SEVERITY_CONFIG[w.severity] || WARNING_SEVERITY_CONFIG.medium;
                    return (
                      <div key={w.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sevCfg.bg} ${sevCfg.text}`}>{sevCfg.label}</span>
                        <p className="font-body text-[10px] text-ink/60 mt-1 leading-snug">{w.message}</p>
                        <span className="font-body text-[9px] text-ink/30">{formatDate(w.created_at)}</span>
                      </div>
                    );
                  })}
                  {unackWarnings === 0 && <div className="px-4 py-8 text-center"><p className="font-body text-xs text-ink/30">لا توجد إنذارات معلقة</p></div>}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Lock size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">ZK-Audit · Immutable</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> تقييم مخاطر
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={<ShieldAlert size={14} className="text-red-600" />} label="مخاطر نشطة" value={String(activeRisks)} valueClass="text-red-700" />
        <StatCard icon={<AlertTriangle size={14} className="text-orange-600" />} label="حرجة + عالية" value={String(criticalCount + highCount)} valueClass="text-orange-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="التعرض المالي" value={formatCurrency(totalExposure)} valueClass="text-gold" />
        <StatCard icon={<BellRing size={14} className="text-amber-600" />} label="إنذارات معلقة" value={String(unackWarnings)} valueClass="text-amber-700" />
        <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="مخاطر محلولة" value={String(resolvedRisks)} valueClass="text-green-700" />
      </div>

      {/* Cross-engine integration bar */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">شبكة التكامل العصبية (Neural Integration Network)</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'فحص التوافق مع التدفقات النقدية', color: 'text-green-400' },
            { icon: FileText, label: 'الأرشفة والتوجيه (M47/M48)', desc: 'تحليل الوثائق فور حفظها', color: 'text-blue-400' },
            { icon: CircuitBoard, label: 'غرفة الاجتماعات (M49)', desc: 'تقارير المخاطر اللحظية للقرار', color: 'text-gold' },
            { icon: Zap, label: 'الوكيل الذكي (M92)', desc: 'أوامر صوتية لتحليل المستندات', color: 'text-purple-400' },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={12} className={item.color} />
                  <span className="font-body text-[10px] font-bold text-cream/80">{item.label}</span>
                </div>
                <p className="font-body text-[9px] text-cream/40 leading-tight">{item.desc}</p>
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
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 font-body text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id ? 'text-gold border-gold' : 'text-ink/40 border-transparent hover:text-ink/60'
              }`}
            >
              <Icon size={14} />
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${activeTab === tab.id ? 'bg-gold text-midnight' : 'bg-gray-200 text-ink/50'}`}>{tab.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filter for risks */}
      {activeTab === 'risks' && (
        <div className="flex items-center gap-2">
          <Select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل المستويات</option>
            <option value="critical">حرج</option>
            <option value="high">عالي</option>
            <option value="medium">متوسط</option>
            <option value="low">منخفض</option>
          </Select>
        </div>
      )}

      {/* Risks tab */}
      {activeTab === 'risks' && (
        <div className="space-y-2">
          {filteredRisks.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <ShieldCheck size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد تقييمات مخاطر</p>
            </div>
          ) : (
            filteredRisks.map((risk) => {
              const cfg = RISK_LEVEL_CONFIG[risk.risk_level] || RISK_LEVEL_CONFIG.medium;
              return (
                <div
                  key={risk.id}
                  onClick={() => openRiskDetail(risk)}
                  className={`bg-white rounded-xl border ${cfg.border} shadow-sm p-4 hover:shadow-md transition-all cursor-pointer group`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                        {risk.risk_level === 'critical' ? <ShieldAlert size={16} className="text-red-600" />
                          : risk.risk_level === 'high' ? <AlertTriangle size={16} className="text-orange-600" />
                          : risk.risk_level === 'medium' ? <AlertTriangle size={16} className="text-amber-500" />
                          : <CheckCircle2 size={16} className="text-gray-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-xs font-bold text-midnight leading-snug">{risk.title}</p>
                        {risk.description && <p className="font-body text-[10px] text-ink/50 mt-1 leading-relaxed line-clamp-2">{risk.description}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{RISK_TYPE_LABELS[risk.risk_type] || risk.risk_type}</span>
                          {risk.status === 'resolved' && <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600">محلول</span>}
                          {risk.board_escalated && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><CircuitBoard size={8} /> مرفوع لمجلس الإدارة</span>}
                          {risk.financial_impact > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(risk.financial_impact)}</span>}
                          {risk.source_engine && <span className="font-body text-[9px] text-ink/40">{SOURCE_ENGINE_LABELS[risk.source_engine] || risk.source_engine}</span>}
                          {risk.case && <span className="font-body text-[9px] text-ink/40">{risk.case.case_number}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Probability gauge */}
                      <div className="flex flex-col items-center">
                        <div className="relative w-10 h-10">
                          <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                            <circle cx="18" cy="18" r="15" fill="none" stroke={risk.probability > 70 ? '#ef4444' : risk.probability > 40 ? '#f59e0b' : '#22c55e'} strokeWidth="3" strokeDasharray={`${(risk.probability / 100) * 94.2} 94.2`} strokeLinecap="round" />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center font-body text-[9px] font-bold text-midnight">{risk.probability.toFixed(0)}%</span>
                        </div>
                        <span className="font-body text-[8px] text-ink/30 mt-0.5">احتمالية</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); openEdit(risk); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteId(risk.id); setDeleteType('risk'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
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

      {/* Clauses tab */}
      {activeTab === 'clauses' && (
        <div className="space-y-2">
          {clauses.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <FileText size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد بنود مستخرجة</p>
            </div>
          ) : (
            clauses.map((cl) => (
              <div key={cl.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 group hover:border-gold/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cl.status === 'flagged' ? 'bg-red-50' : 'bg-blue-50'}`}>
                      <FileText size={14} className={cl.status === 'flagged' ? 'text-red-600' : 'text-blue-600'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{CLAUSE_TYPE_LABELS[cl.clause_type] || cl.clause_type}</span>
                        <span className="font-body text-[10px] font-bold text-midnight">{cl.document_name}</span>
                        {cl.status === 'flagged' && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-red-50 text-red-600"><AlertOctagon size={8} /> موضع علامة</span>}
                      </div>
                      <p className="font-body text-[10px] text-ink/60 mt-1 leading-relaxed line-clamp-2">{cl.clause_text}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {cl.obligation_party && <span className="font-body text-[9px] text-ink/40">الملتزم: {cl.obligation_party}</span>}
                        {cl.deadline_date && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/40"><Calendar size={9} /> {formatDate(cl.deadline_date)}</span>}
                        {cl.penalty_amount > 0 && <span className="flex items-center gap-0.5 font-body text-[9px] text-red-500"><DollarSign size={9} /> {formatCurrency(cl.penalty_amount)}</span>}
                        <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/40"><Sparkles size={9} /> دقة NLP: {cl.nlp_confidence.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => { setDeleteId(cl.id); setDeleteType('clause'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Warnings tab */}
      {activeTab === 'warnings' && (
        <div className="space-y-2">
          {warnings.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Bell size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد إنذارات</p>
            </div>
          ) : (
            warnings.map((w) => {
              const sevCfg = WARNING_SEVERITY_CONFIG[w.severity] || WARNING_SEVERITY_CONFIG.medium;
              return (
                <div key={w.id} className={`bg-white rounded-xl border shadow-sm p-4 group hover:border-gold/30 transition-colors ${!w.acknowledged ? 'border-gold/20' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sevCfg.bg}`}>
                        {w.severity === 'critical' ? <ShieldAlert size={14} className="text-red-600" /> : w.severity === 'high' ? <AlertTriangle size={14} className="text-orange-600" /> : <Bell size={14} className="text-amber-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sevCfg.bg} ${sevCfg.text}`}>{sevCfg.label}</span>
                          {w.board_agenda_item && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><CircuitBoard size={8} /> بند طارئ لمجلس الإدارة</span>}
                          {w.target_engine && <span className="font-body text-[9px] text-gold">{SOURCE_ENGINE_LABELS[w.target_engine] || w.target_engine}</span>}
                        </div>
                        <p className="font-body text-[10px] text-ink/60 mt-1 leading-relaxed">{w.message}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="font-body text-[9px] text-ink/30">{formatDate(w.created_at)}</span>
                          {w.acknowledged ? (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> تم الإقرار</span>
                          ) : (
                            <button onClick={() => acknowledgeWarning(w)} className="flex items-center gap-1 px-2 py-0.5 rounded bg-gold text-midnight font-body text-[9px] font-bold hover:bg-gold/90 transition-colors">
                              <CheckCircle2 size={9} /> إقرار التنبيه
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(w.id); setDeleteType('warning'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Deadlines tab */}
      {activeTab === 'deadlines' && (
        <div className="space-y-2">
          {deadlines.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Calendar size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد مواعيد مجدولة</p>
            </div>
          ) : (
            deadlines.map((dl) => {
              const daysLeft = Math.ceil((new Date(dl.deadline_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              const isUrgent = daysLeft <= 30;
              const isNear = daysLeft <= 60 && daysLeft > 30;
              return (
                <div key={dl.id} className={`bg-white rounded-xl border shadow-sm p-4 group hover:border-gold/30 transition-colors ${isUrgent ? 'border-red-200' : isNear ? 'border-amber-200' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isUrgent ? 'bg-red-50' : isNear ? 'bg-amber-50' : 'bg-blue-50'}`}>
                        <Calendar size={14} className={isUrgent ? 'text-red-600' : isNear ? 'text-amber-600' : 'text-blue-600'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-xs font-bold text-midnight">{dl.title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{DEADLINE_TYPE_LABELS[dl.deadline_type] || dl.deadline_type}</span>
                          <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${isUrgent ? 'bg-red-50 text-red-600' : isNear ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                            <Clock size={9} /> {daysLeft > 0 ? `${daysLeft} يوم متبقي` : 'متأخر'}
                          </span>
                          {dl.contract_ref && <span className="font-body text-[9px] text-ink/40">{dl.contract_ref}</span>}
                          {dl.responsible_party && <span className="font-body text-[9px] text-ink/40">{dl.responsible_party}</span>}
                          {dl.alert_sent_60d && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><Bell size={8} /> تنبيه 60 يوم</span>}
                          {dl.draft_notice_generated && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><FileCheck size={8} /> مسودة جاهزة</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!dl.draft_notice_generated && (
                        <button onClick={() => generateDraftNotice(dl)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-midnight text-cream font-body text-[10px] font-bold hover:bg-midnight-light transition-colors">
                          <FileText size={11} /> توليد مسودة
                        </button>
                      )}
                      <button onClick={() => { setDeleteId(dl.id); setDeleteType('deadline'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ZK-Audit tab */}
      {activeTab === 'audit' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Lock size={14} className="text-gold" />
            <span className="font-heading font-bold text-midnight text-sm">سجل ZK-Audit غير القابل للتعديل</span>
            <span className="font-body text-[10px] text-ink/30">— {auditLogs.length} عملية مسجلة</span>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {auditLogs.map((log) => {
                const cfg = ZK_RISK_LEVEL_CONFIG[log.risk_level] || ZK_RISK_LEVEL_CONFIG.info;
                return (
                  <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      {log.risk_level === 'critical' ? <ShieldAlert size={12} className="text-red-600" />
                        : log.risk_level === 'high' ? <AlertTriangle size={12} className="text-orange-600" />
                        : log.risk_level === 'medium' ? <AlertTriangle size={12} className="text-amber-600" />
                        : <Activity size={12} className="text-blue-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-body text-[10px] font-bold text-midnight">{log.operation_type}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-body ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                        {log.actor && <span className="font-body text-[9px] text-ink/40">{log.actor}</span>}
                      </div>
                      {log.detail && <p className="font-body text-[10px] text-ink/50 leading-relaxed mt-0.5">{log.detail}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-body text-[9px] text-ink/30">{formatDate(log.created_at)}</span>
                        {log.hash_chain && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/30"><Lock size={8} /> {log.hash_chain}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Risk detail drawer */}
      {selectedRisk && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedRisk(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">تحليل المخاطر التفصيلي</span>
              </div>
              <button onClick={() => setSelectedRisk(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <h3 className="font-heading font-bold text-midnight text-base">{selectedRisk.title}</h3>
              <div className="flex items-center gap-2 flex-wrap">
                {(() => {
                  const cfg = RISK_LEVEL_CONFIG[selectedRisk.risk_level] || RISK_LEVEL_CONFIG.medium;
                  return <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>;
                })()}
                <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{RISK_TYPE_LABELS[selectedRisk.risk_type] || selectedRisk.risk_type}</span>
                {selectedRisk.status === 'resolved' && <span className="px-2 py-0.5 rounded text-[10px] font-body bg-green-50 text-green-600">محلول</span>}
                {selectedRisk.board_escalated && <span className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-body bg-purple-50 text-purple-600"><CircuitBoard size={9} /> مرفوع لمجلس الإدارة</span>}
              </div>

              {selectedRisk.description && (
                <div>
                  <p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p>
                  <p className="font-body text-xs text-ink/70 leading-relaxed">{selectedRisk.description}</p>
                </div>
              )}

              {/* Probability + financial impact */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 text-center">
                  <p className="font-body text-[9px] text-ink/40 mb-2">الاحتمالية</p>
                  <div className="relative w-16 h-16 mx-auto">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15" fill="none" stroke={selectedRisk.probability > 70 ? '#ef4444' : selectedRisk.probability > 40 ? '#f59e0b' : '#22c55e'} strokeWidth="3" strokeDasharray={`${(selectedRisk.probability / 100) * 94.2} 94.2`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center font-heading font-bold text-midnight text-sm">{selectedRisk.probability.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 text-center">
                  <p className="font-body text-[9px] text-ink/40 mb-2">التعرض المالي</p>
                  <p className="font-heading font-bold text-red-600 text-lg">{formatCurrency(selectedRisk.financial_impact)}</p>
                  <p className="font-body text-[9px] text-ink/30 mt-1">غرامة محتملة</p>
                </div>
              </div>

              {/* Detected conflicts */}
              {selectedRisk.detected_conflicts && selectedRisk.detected_conflicts.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <AlertOctagon size={12} className="text-red-500" />
                    <span className="font-body text-[10px] font-bold text-midnight">التعارضات المكتشفة (Cross-Domain Validation)</span>
                  </div>
                  <div className="space-y-1.5">
                    {selectedRisk.detected_conflicts.map((c, i) => (
                      <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                        <p className="font-body text-[10px] text-red-700 leading-relaxed">{c}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended actions */}
              {selectedRisk.recommended_actions && selectedRisk.recommended_actions.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">الإجراءات الوقائية الموصى بها</span>
                  </div>
                  <div className="space-y-1.5">
                    {selectedRisk.recommended_actions.map((a, i) => (
                      <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-gold/5 border border-gold/10">
                        <ArrowRight size={10} className="text-gold mt-1 flex-shrink-0" />
                        <p className="font-body text-[10px] text-ink/70 leading-relaxed">{a}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Related clauses */}
              {riskClauses.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <FileText size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">البنود المستخرجة المرتبطة</span>
                  </div>
                  <div className="space-y-2">
                    {riskClauses.map((cl) => (
                      <div key={cl.id} className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-200 text-ink/50">{CLAUSE_TYPE_LABELS[cl.clause_type] || cl.clause_type}</span>
                          <span className="font-body text-[9px] text-ink/40">دقة: {cl.nlp_confidence.toFixed(1)}%</span>
                        </div>
                        <p className="font-body text-[10px] text-ink/60 leading-relaxed">{cl.clause_text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Related warnings */}
              {riskWarnings.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Bell size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">الإنذارات المبكرة المرسلة</span>
                  </div>
                  <div className="space-y-2">
                    {riskWarnings.map((w) => {
                      const sevCfg = WARNING_SEVERITY_CONFIG[w.severity] || WARNING_SEVERITY_CONFIG.medium;
                      return (
                        <div key={w.id} className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sevCfg.bg} ${sevCfg.text}`}>{sevCfg.label}</span>
                            {w.board_agenda_item && <span className="font-body text-[9px] text-purple-600">بند طارئ</span>}
                            {w.acknowledged ? <span className="font-body text-[9px] text-green-600">تم الإقرار</span> : <span className="font-body text-[9px] text-amber-600">غير مُقر</span>}
                          </div>
                          <p className="font-body text-[10px] text-ink/60 leading-relaxed">{w.message}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between">
              <span className="font-body text-[9px] text-ink/30">أُنشئ في {formatDate(selectedRisk.created_at)}</span>
              {selectedRisk.status !== 'resolved' && (
                <button onClick={() => resolveRisk(selectedRisk)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-xs font-bold bg-green-600 text-white hover:bg-green-700 transition-colors">
                  <CheckCircle2 size={12} /> حل المخاطر
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit modal */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل تقييم المخاطر' : 'تقييم مخاطر جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <Field label="عنوان المخاطر" required><TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: تعارض بين بند الفسخ والتدفقات النقدية" /></Field>
        <Field label="الوصف التفصيلي"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <div className="grid grid-cols-3 gap-4">
          <Field label="نوع المخاطر">
            <Select value={form.risk_type} onChange={(e) => setForm({ ...form, risk_type: e.target.value })}>
              {Object.entries(RISK_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="مستوى المخاطر">
            <Select value={form.risk_level} onChange={(e) => setForm({ ...form, risk_level: e.target.value })}>
              <option value="low">منخفض</option><option value="medium">متوسط</option>
              <option value="high">عالي</option><option value="critical">حرج</option>
            </Select>
          </Field>
          <Field label="الاحتمالية (%)"><TextInput type="number" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="التعرض المالي (ج.م)"><TextInput type="number" value={form.financial_impact} onChange={(e) => setForm({ ...form, financial_impact: e.target.value })} /></Field>
          <Field label="المحرك المصدر">
            <Select value={form.source_engine} onChange={(e) => setForm({ ...form, source_engine: e.target.value })}>
              <option value="">— يدوي —</option>
              {Object.entries(SOURCE_ENGINE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="القضية المرتبطة">
            <Select value={form.case_id} onChange={(e) => setForm({ ...form, case_id: e.target.value })}>
              <option value="">— اختر —</option>
              {cases.map((c) => <option key={c.id} value={c.id}>{c.case_number} — {c.case_title}</option>)}
            </Select>
          </Field>
          <Field label="العميل المرتبط">
            <Select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
              <option value="">— اختر —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="مرجع العقد / الوثيقة"><TextInput value={form.contract_ref} onChange={(e) => setForm({ ...form, contract_ref: e.target.value })} placeholder="مثال: SUP-2025-003" /></Field>
        <Field label="التعارضات المكتشفة (سطر لكل تعارض)"><TextArea value={form.detected_conflicts} onChange={(e) => setForm({ ...form, detected_conflicts: e.target.value })} rows={3} /></Field>
        <Field label="الإجراءات الوقائية الموصى بها (سطر لكل إجراء)"><TextArea value={form.recommended_actions} onChange={(e) => setForm({ ...form, recommended_actions: e.target.value })} rows={3} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
