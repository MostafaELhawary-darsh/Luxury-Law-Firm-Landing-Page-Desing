import { useEffect, useState, useCallback } from 'react';
import {
  AlertOctagon, Loader2, Plus, Pencil, Trash2, ChevronRight, X, FileText,
  Calendar, Lock, Shield, Search, CheckCircle2, Clock, AlertTriangle,
  Activity, Server, Siren, Zap, ShieldAlert, Crosshair, Stethoscope,
  TrendingDown, BookOpen, ArrowRight, Radio, Gauge,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

// ── Interfaces ──────────────────────────────────────────────────────────────

interface CrisisAlert {
  id: string;
  alert_title: string;
  alert_level: string;
  source_engine: string | null;
  trigger_metric: string | null;
  threshold_value: string | null;
  current_value: string | null;
  affected_entity: string | null;
  status: string;
  triggered_at: string | null;
  resolved_at: string | null;
  response_actions: string | null;
  created_at: string;
}

interface CrisisIncident {
  id: string;
  incident_title: string;
  incident_type: string;
  severity: string;
  detected_at: string | null;
  contained_at: string | null;
  resolved_at: string | null;
  root_cause: string | null;
  impact_assessment: string | null;
  resolution_actions: string | null;
  preventive_measures: string | null;
  created_at: string;
}

interface CrisisAssessment {
  id: string;
  assessment_title: string;
  assessment_type: string;
  scope: string | null;
  findings: string | null;
  risk_score: number | null;
  mitigation_plan: string | null;
  assessed_by: string | null;
  next_review_date: string | null;
  created_at: string;
}

interface CrisisProtocol {
  id: string;
  protocol_name: string;
  crisis_type: string | null;
  trigger_conditions: string | null;
  response_steps: string[] | null;
  escalation_chain: string | null;
  required_resources: string | null;
  estimated_recovery_time: string | null;
  active: boolean;
  created_at: string;
}

type Tab = 'alerts' | 'incidents' | 'assessments' | 'protocols';

// ── Config objects ───────────────────────────────────────────────────────────

const ALERT_LEVEL_CONFIG: Record<string, { label: string; bg: string; text: string; icon: typeof AlertTriangle }> = {
  info: { label: 'معلومة', bg: 'bg-blue-50', text: 'text-blue-600', icon: Activity },
  warning: { label: 'تحذير', bg: 'bg-amber-50', text: 'text-amber-600', icon: AlertTriangle },
  critical: { label: 'حرجة', bg: 'bg-red-50', text: 'text-red-600', icon: AlertOctagon },
  emergency: { label: 'طارئة', bg: 'bg-red-100', text: 'text-red-700', icon: Siren },
};

const ALERT_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: 'نشط', bg: 'bg-red-50', text: 'text-red-600' },
  acknowledged: { label: 'مُعتمَد', bg: 'bg-amber-50', text: 'text-amber-600' },
  resolved: { label: 'محلول', bg: 'bg-green-50', text: 'text-green-600' },
};

const INCIDENT_TYPE_LABELS: Record<string, string> = {
  financial: 'مالي',
  legal: 'قانوني',
  operational: 'تشغيلي',
  reputational: 'سمعة',
  compliance: 'امتثال',
};

const SEVERITY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  low: { label: 'منخفض', bg: 'bg-green-50', text: 'text-green-600' },
  medium: { label: 'متوسط', bg: 'bg-amber-50', text: 'text-amber-600' },
  high: { label: 'عالي', bg: 'bg-orange-50', text: 'text-orange-600' },
  critical: { label: 'حرج', bg: 'bg-red-50', text: 'text-red-600' },
};

const ASSESSMENT_TYPE_LABELS: Record<string, string> = {
  risk: 'مخاطر',
  compliance: 'امتثال',
  operational: 'تشغيلي',
  financial: 'مالي',
};

// ── Form types ──────────────────────────────────────────────────────────────

interface AlertForm {
  alert_title: string;
  alert_level: string;
  source_engine: string;
  trigger_metric: string;
  threshold_value: string;
  current_value: string;
  affected_entity: string;
  status: string;
  triggered_at: string;
  response_actions: string;
}

const emptyAlertForm: AlertForm = {
  alert_title: '', alert_level: 'warning', source_engine: '', trigger_metric: '',
  threshold_value: '', current_value: '', affected_entity: '', status: 'active',
  triggered_at: '', response_actions: '',
};

interface IncidentForm {
  incident_title: string;
  incident_type: string;
  severity: string;
  detected_at: string;
  contained_at: string;
  resolved_at: string;
  root_cause: string;
  impact_assessment: string;
  resolution_actions: string;
  preventive_measures: string;
}

const emptyIncidentForm: IncidentForm = {
  incident_title: '', incident_type: 'operational', severity: 'medium',
  detected_at: '', contained_at: '', resolved_at: '', root_cause: '',
  impact_assessment: '', resolution_actions: '', preventive_measures: '',
};

interface AssessmentForm {
  assessment_title: string;
  assessment_type: string;
  scope: string;
  findings: string;
  risk_score: string;
  mitigation_plan: string;
  assessed_by: string;
  next_review_date: string;
}

const emptyAssessmentForm: AssessmentForm = {
  assessment_title: '', assessment_type: 'risk', scope: '', findings: '',
  risk_score: '0', mitigation_plan: '', assessed_by: '', next_review_date: '',
};

interface ProtocolForm {
  protocol_name: string;
  crisis_type: string;
  trigger_conditions: string;
  response_steps: string;
  escalation_chain: string;
  required_resources: string;
  estimated_recovery_time: string;
  active: boolean;
}

const emptyProtocolForm: ProtocolForm = {
  protocol_name: '', crisis_type: '', trigger_conditions: '', response_steps: '',
  escalation_chain: '', required_resources: '', estimated_recovery_time: '', active: true,
};

// ── Component ───────────────────────────────────────────────────────────────

export default function CrisisManagementEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [alerts, setAlerts] = useState<CrisisAlert[]>([]);
  const [incidents, setIncidents] = useState<CrisisIncident[]>([]);
  const [assessments, setAssessments] = useState<CrisisAssessment[]>([]);
  const [protocols, setProtocols] = useState<CrisisProtocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('alerts');

  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);
  const [alertForm, setAlertForm] = useState<AlertForm>(emptyAlertForm);
  const [saving, setSaving] = useState(false);

  const [incidentModalOpen, setIncidentModalOpen] = useState(false);
  const [editingIncidentId, setEditingIncidentId] = useState<string | null>(null);
  const [incidentForm, setIncidentForm] = useState<IncidentForm>(emptyIncidentForm);

  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false);
  const [editingAssessmentId, setEditingAssessmentId] = useState<string | null>(null);
  const [assessmentForm, setAssessmentForm] = useState<AssessmentForm>(emptyAssessmentForm);

  const [protocolModalOpen, setProtocolModalOpen] = useState(false);
  const [editingProtocolId, setEditingProtocolId] = useState<string | null>(null);
  const [protocolForm, setProtocolForm] = useState<ProtocolForm>(emptyProtocolForm);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'alert' | 'incident' | 'assessment' | 'protocol'>('alert');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [alertRes, incRes, assessRes, protoRes] = await Promise.all([
      supabase.from('m45_crisis_alerts').select('*').order('created_at', { ascending: false }),
      supabase.from('m45_crisis_incidents').select('*').order('created_at', { ascending: false }),
      supabase.from('m45_crisis_assessments').select('*').order('created_at', { ascending: false }),
      supabase.from('m45_crisis_protocols').select('*').order('created_at', { ascending: false }),
    ]);
    setAlerts((alertRes.data as CrisisAlert[]) || []);
    setIncidents((incRes.data as CrisisIncident[]) || []);
    setAssessments((assessRes.data as CrisisAssessment[]) || []);
    setProtocols((protoRes.data as CrisisProtocol[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setAlertForm({ ...emptyAlertForm, alert_title: cmd.fields.title || '' });
      setEditingAlertId(null);
      setAlertModalOpen(true);
    }
  }, [voiceAdd]);

  // ── Alert handlers ──────────────────────────────────────────────────────────

  const openAddAlert = () => { setAlertForm(emptyAlertForm); setEditingAlertId(null); setAlertModalOpen(true); };

  const openEditAlert = (a: CrisisAlert) => {
    setAlertForm({
      alert_title: a.alert_title, alert_level: a.alert_level, source_engine: a.source_engine || '',
      trigger_metric: a.trigger_metric || '', threshold_value: a.threshold_value || '',
      current_value: a.current_value || '', affected_entity: a.affected_entity || '',
      status: a.status, triggered_at: a.triggered_at || '', response_actions: a.response_actions || '',
    });
    setEditingAlertId(a.id);
    setAlertModalOpen(true);
  };

  const handleSaveAlert = async () => {
    if (!alertForm.alert_title.trim()) return;
    setSaving(true);
    const payload = {
      alert_title: alertForm.alert_title.trim(),
      alert_level: alertForm.alert_level,
      source_engine: alertForm.source_engine.trim() || null,
      trigger_metric: alertForm.trigger_metric.trim() || null,
      threshold_value: alertForm.threshold_value.trim() || null,
      current_value: alertForm.current_value.trim() || null,
      affected_entity: alertForm.affected_entity.trim() || null,
      status: alertForm.status,
      triggered_at: alertForm.triggered_at || null,
      resolved_at: alertForm.status === 'resolved' ? new Date().toISOString() : null,
      response_actions: alertForm.response_actions.trim() || null,
    };
    if (editingAlertId) {
      await supabase.from('m45_crisis_alerts').update(payload).eq('id', editingAlertId);
    } else {
      await supabase.from('m45_crisis_alerts').insert(payload);
    }
    setSaving(false);
    setAlertModalOpen(false);
    fetchAll();
  };

  const acknowledgeAlert = async (a: CrisisAlert) => {
    await supabase.from('m45_crisis_alerts').update({ status: 'acknowledged' }).eq('id', a.id);
    fetchAll();
  };

  const resolveAlert = async (a: CrisisAlert) => {
    await supabase.from('m45_crisis_alerts').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', a.id);
    fetchAll();
  };

  // ── Incident handlers ───────────────────────────────────────────────────────

  const openAddIncident = () => { setIncidentForm(emptyIncidentForm); setEditingIncidentId(null); setIncidentModalOpen(true); };

  const openEditIncident = (inc: CrisisIncident) => {
    setIncidentForm({
      incident_title: inc.incident_title, incident_type: inc.incident_type, severity: inc.severity,
      detected_at: inc.detected_at || '', contained_at: inc.contained_at || '', resolved_at: inc.resolved_at || '',
      root_cause: inc.root_cause || '', impact_assessment: inc.impact_assessment || '',
      resolution_actions: inc.resolution_actions || '', preventive_measures: inc.preventive_measures || '',
    });
    setEditingIncidentId(inc.id);
    setIncidentModalOpen(true);
  };

  const handleSaveIncident = async () => {
    if (!incidentForm.incident_title.trim()) return;
    setSaving(true);
    const payload = {
      incident_title: incidentForm.incident_title.trim(),
      incident_type: incidentForm.incident_type,
      severity: incidentForm.severity,
      detected_at: incidentForm.detected_at || null,
      contained_at: incidentForm.contained_at || null,
      resolved_at: incidentForm.resolved_at || null,
      root_cause: incidentForm.root_cause.trim() || null,
      impact_assessment: incidentForm.impact_assessment.trim() || null,
      resolution_actions: incidentForm.resolution_actions.trim() || null,
      preventive_measures: incidentForm.preventive_measures.trim() || null,
    };
    if (editingIncidentId) {
      await supabase.from('m45_crisis_incidents').update(payload).eq('id', editingIncidentId);
    } else {
      await supabase.from('m45_crisis_incidents').insert(payload);
    }
    setSaving(false);
    setIncidentModalOpen(false);
    fetchAll();
  };

  // ── Assessment handlers ─────────────────────────────────────────────────────

  const openAddAssessment = () => { setAssessmentForm(emptyAssessmentForm); setEditingAssessmentId(null); setAssessmentModalOpen(true); };

  const openEditAssessment = (a: CrisisAssessment) => {
    setAssessmentForm({
      assessment_title: a.assessment_title, assessment_type: a.assessment_type,
      scope: a.scope || '', findings: a.findings || '', risk_score: String(a.risk_score || 0),
      mitigation_plan: a.mitigation_plan || '', assessed_by: a.assessed_by || '',
      next_review_date: a.next_review_date || '',
    });
    setEditingAssessmentId(a.id);
    setAssessmentModalOpen(true);
  };

  const handleSaveAssessment = async () => {
    if (!assessmentForm.assessment_title.trim()) return;
    setSaving(true);
    const payload = {
      assessment_title: assessmentForm.assessment_title.trim(),
      assessment_type: assessmentForm.assessment_type,
      scope: assessmentForm.scope.trim() || null,
      findings: assessmentForm.findings.trim() || null,
      risk_score: Number(assessmentForm.risk_score) || 0,
      mitigation_plan: assessmentForm.mitigation_plan.trim() || null,
      assessed_by: assessmentForm.assessed_by.trim() || null,
      next_review_date: assessmentForm.next_review_date || null,
    };
    if (editingAssessmentId) {
      await supabase.from('m45_crisis_assessments').update(payload).eq('id', editingAssessmentId);
    } else {
      await supabase.from('m45_crisis_assessments').insert(payload);
    }
    setSaving(false);
    setAssessmentModalOpen(false);
    fetchAll();
  };

  // ── Protocol handlers ──────────────────────────────────────────────────────

  const openAddProtocol = () => { setProtocolForm(emptyProtocolForm); setEditingProtocolId(null); setProtocolModalOpen(true); };

  const openEditProtocol = (p: CrisisProtocol) => {
    setProtocolForm({
      protocol_name: p.protocol_name, crisis_type: p.crisis_type || '',
      trigger_conditions: p.trigger_conditions || '',
      response_steps: (p.response_steps || []).join(', '),
      escalation_chain: p.escalation_chain || '', required_resources: p.required_resources || '',
      estimated_recovery_time: p.estimated_recovery_time || '', active: p.active,
    });
    setEditingProtocolId(p.id);
    setProtocolModalOpen(true);
  };

  const handleSaveProtocol = async () => {
    if (!protocolForm.protocol_name.trim()) return;
    setSaving(true);
    const steps = protocolForm.response_steps.split(',').map((s) => s.trim()).filter(Boolean);
    const payload = {
      protocol_name: protocolForm.protocol_name.trim(),
      crisis_type: protocolForm.crisis_type.trim() || null,
      trigger_conditions: protocolForm.trigger_conditions.trim() || null,
      response_steps: steps.length > 0 ? steps : null,
      escalation_chain: protocolForm.escalation_chain.trim() || null,
      required_resources: protocolForm.required_resources.trim() || null,
      estimated_recovery_time: protocolForm.estimated_recovery_time.trim() || null,
      active: protocolForm.active,
    };
    if (editingProtocolId) {
      await supabase.from('m45_crisis_protocols').update(payload).eq('id', editingProtocolId);
    } else {
      await supabase.from('m45_crisis_protocols').insert(payload);
    }
    setSaving(false);
    setProtocolModalOpen(false);
    fetchAll();
  };

  const toggleProtocolActive = async (p: CrisisProtocol) => {
    await supabase.from('m45_crisis_protocols').update({ active: !p.active }).eq('id', p.id);
    fetchAll();
  };

  // ── Delete handler ──────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteId) return;
    if (deleteType === 'alert') await supabase.from('m45_crisis_alerts').delete().eq('id', deleteId);
    else if (deleteType === 'incident') await supabase.from('m45_crisis_incidents').delete().eq('id', deleteId);
    else if (deleteType === 'assessment') await supabase.from('m45_crisis_assessments').delete().eq('id', deleteId);
    else if (deleteType === 'protocol') await supabase.from('m45_crisis_protocols').delete().eq('id', deleteId);
    setDeleteId(null);
    fetchAll();
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filterType !== 'all' && a.alert_level !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!a.alert_title.toLowerCase().includes(q) && !(a.source_engine || '').toLowerCase().includes(q) && !(a.affected_entity || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeAlerts = alerts.filter((a) => a.status === 'active').length;
  const criticalIncidents = incidents.filter((i) => i.severity === 'critical' || i.severity === 'high').length;
  const unresolvedIncidents = incidents.filter((i) => !i.resolved_at).length;
  const activeProtocols = protocols.filter((p) => p.active).length;
  const avgRiskScore = assessments.length > 0 ? assessments.reduce((s, a) => s + (a.risk_score || 0), 0) / assessments.length : 0;

  const tabs: { id: Tab; label: string; icon: typeof AlertOctagon; badge?: number }[] = [
    { id: 'alerts', label: 'التنبيهات', icon: AlertOctagon, badge: activeAlerts },
    { id: 'incidents', label: 'الحوادث', icon: Siren, badge: unresolvedIncidents },
    { id: 'assessments', label: 'التقييمات', icon: Stethoscope },
    { id: 'protocols', label: 'بروتوكولات الاستجابة', icon: ShieldAlert, badge: activeProtocols },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Siren size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">إدارة الأزمات والمخاطر التشغيلية (M45)</h2>
            <p className="font-body text-[10px] text-ink/40">قطاع إدارة الأزمات — تنبيهات وحوادث وتقييمات وبروتوكولات الاستجابة</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Server size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">Real-Time · AES-256</span>
          </div>
          <button onClick={openAddAlert} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> تنبيه جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={<AlertOctagon size={14} className="text-red-600" />} label="تنبيهات نشطة" value={String(activeAlerts)} valueClass="text-red-700" />
        <StatCard icon={<Siren size={14} className="text-amber-600" />} label="حوادث غير محلولة" value={String(unresolvedIncidents)} valueClass="text-amber-700" />
        <StatCard icon={<Crosshair size={14} className="text-red-600" />} label="حوادث حرجة/عالية" value={String(criticalIncidents)} valueClass="text-red-700" />
        <StatCard icon={<Gauge size={14} className="text-gold" />} label="متوسط درجة المخاطر" value={avgRiskScore.toFixed(1)} valueClass="text-gold" />
        <StatCard icon={<ShieldAlert size={14} className="text-green-600" />} label="بروتوكولات نشطة" value={String(activeProtocols)} valueClass="text-green-700" />
      </div>

      {/* Crisis dashboard */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">لوحة الأزمات — مستوى التأهب</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { level: 'info', label: 'معلومة', count: alerts.filter((a) => a.alert_level === 'info' && a.status === 'active').length, color: 'text-blue-400', bg: 'border-blue-500/20' },
            { level: 'warning', label: 'تحذير', count: alerts.filter((a) => a.alert_level === 'warning' && a.status === 'active').length, color: 'text-amber-400', bg: 'border-amber-500/20' },
            { level: 'critical', label: 'حرجة', count: alerts.filter((a) => a.alert_level === 'critical' && a.status === 'active').length, color: 'text-red-400', bg: 'border-red-500/20' },
            { level: 'emergency', label: 'طارئة', count: alerts.filter((a) => a.alert_level === 'emergency' && a.status === 'active').length, color: 'text-red-500', bg: 'border-red-500/30' },
          ].map((item) => (
            <div key={item.level} className={`bg-midnight-light/50 rounded-lg p-2.5 border ${item.bg}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`font-body text-[10px] font-bold ${item.color}`}>{item.label}</span>
              </div>
              <span className="font-body text-lg font-bold text-cream">{item.count}</span>
            </div>
          ))}
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

      {/* Filters for alerts */}
      {activeTab === 'alerts' && (
        <div className="flex items-center gap-2">
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل المستويات</option>
            {Object.entries(ALERT_LEVEL_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث بعنوان أو مصدر أو كيان..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Alerts tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-2">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <AlertOctagon size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد تنبيهات</p>
            </div>
          ) : (
            filteredAlerts.map((a) => {
              const levelCfg = ALERT_LEVEL_CONFIG[a.alert_level] || ALERT_LEVEL_CONFIG.warning;
              const statusCfg = ALERT_STATUS_CONFIG[a.status] || ALERT_STATUS_CONFIG.active;
              const LevelIcon = levelCfg.icon;
              return (
                <div key={a.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${levelCfg.bg}`}>
                        <LevelIcon size={14} className={levelCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${levelCfg.bg} ${levelCfg.text}`}>{levelCfg.label}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${statusCfg.bg} ${statusCfg.text}`}>{statusCfg.label}</span>
                          {a.source_engine && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Radio size={8} /> {a.source_engine}</span>}
                          {a.affected_entity && <span className="font-body text-[9px] text-ink/40">الكيان: {a.affected_entity}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{a.alert_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {a.trigger_metric && <span className="font-body text-[9px] text-ink/40">المؤشر: {a.trigger_metric}</span>}
                          {a.threshold_value && a.current_value && (
                            <span className="flex items-center gap-1 font-body text-[9px] text-red-600 font-bold">
                              <TrendingDown size={9} /> {a.current_value} / {a.threshold_value}
                            </span>
                          )}
                          {a.triggered_at && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/40"><Calendar size={9} /> {formatDate(a.triggered_at)}</span>}
                          {a.resolved_at && <span className="flex items-center gap-0.5 font-body text-[9px] text-green-600"><CheckCircle2 size={9} /> {formatDate(a.resolved_at)}</span>}
                        </div>
                        {a.response_actions && <p className="font-body text-[10px] text-ink/50 mt-1 leading-relaxed line-clamp-2">الإجراءات: {a.response_actions}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {a.status === 'active' && <button onClick={() => acknowledgeAlert(a)} className="px-2 py-1 rounded bg-amber-50 text-amber-600 font-body text-[9px] font-bold hover:bg-amber-100 transition-colors">اعتماد</button>}
                      {a.status !== 'resolved' && <button onClick={() => resolveAlert(a)} className="px-2 py-1 rounded bg-green-50 text-green-600 font-body text-[9px] font-bold hover:bg-green-100 transition-colors">حل</button>}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditAlert(a)} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                        <button onClick={() => { setDeleteId(a.id); setDeleteType('alert'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Incidents tab */}
      {activeTab === 'incidents' && (
        <div className="space-y-2">
          <div className="flex items-center justify-end">
            <button onClick={openAddIncident} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold/10 text-gold font-body text-xs font-bold hover:bg-gold/20 transition-colors">
              <Plus size={12} /> حادث جديد
            </button>
          </div>
          {incidents.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><Siren size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد حوادث مسجلة</p></div>
          ) : (
            incidents.map((inc) => {
              const sevCfg = SEVERITY_CONFIG[inc.severity] || SEVERITY_CONFIG.medium;
              return (
                <div key={inc.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sevCfg.bg}`}>
                        <Siren size={14} className={sevCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{INCIDENT_TYPE_LABELS[inc.incident_type] || inc.incident_type}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sevCfg.bg} ${sevCfg.text}`}>{sevCfg.label}</span>
                          {inc.resolved_at && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> محلول</span>}
                          {!inc.resolved_at && inc.contained_at && <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600">مُحاوَط</span>}
                          {!inc.resolved_at && !inc.contained_at && <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-red-50 text-red-600">نشط</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{inc.incident_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {inc.detected_at && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/40"><Calendar size={9} /> اكتشاف: {formatDate(inc.detected_at)}</span>}
                          {inc.contained_at && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/40"><Shield size={9} /> احتواء: {formatDate(inc.contained_at)}</span>}
                          {inc.resolved_at && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/40"><CheckCircle2 size={9} /> حل: {formatDate(inc.resolved_at)}</span>}
                        </div>
                        {inc.root_cause && <p className="font-body text-[10px] text-ink/50 mt-1 leading-relaxed line-clamp-2">السبب الجذري: {inc.root_cause}</p>}
                        {inc.impact_assessment && <p className="font-body text-[10px] text-red-600 mt-1 leading-relaxed line-clamp-2">الأثر: {inc.impact_assessment}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditIncident(inc)} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                      <button onClick={() => { setDeleteId(inc.id); setDeleteType('incident'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Assessments tab */}
      {activeTab === 'assessments' && (
        <div className="space-y-2">
          <div className="flex items-center justify-end">
            <button onClick={openAddAssessment} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold/10 text-gold font-body text-xs font-bold hover:bg-gold/20 transition-colors">
              <Plus size={12} /> تقييم جديد
            </button>
          </div>
          {assessments.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><Stethoscope size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد تقييمات مسجلة</p></div>
          ) : (
            assessments.map((a) => {
              const riskLevel = (a.risk_score || 0) >= 75 ? 'critical' : (a.risk_score || 0) >= 50 ? 'high' : (a.risk_score || 0) >= 25 ? 'medium' : 'low';
              const riskCfg = SEVERITY_CONFIG[riskLevel] || SEVERITY_CONFIG.low;
              return (
                <div key={a.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${riskCfg.bg}`}>
                        <Stethoscope size={14} className={riskCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{ASSESSMENT_TYPE_LABELS[a.assessment_type] || a.assessment_type}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${riskCfg.bg} ${riskCfg.text}`}>درجة المخاطر: {a.risk_score || 0}</span>
                          {a.assessed_by && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/40"><Shield size={9} /> {a.assessed_by}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{a.assessment_title}</p>
                        {a.scope && <p className="font-body text-[10px] text-ink/40 mt-0.5">النطاق: {a.scope}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {a.next_review_date && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/40"><Calendar size={9} /> المراجعة التالية: {formatDate(a.next_review_date)}</span>}
                        </div>
                        {a.findings && <p className="font-body text-[10px] text-ink/50 mt-1 leading-relaxed line-clamp-2">{a.findings}</p>}
                        {a.mitigation_plan && <p className="font-body text-[10px] text-green-600 mt-1 leading-relaxed line-clamp-2">خطة التخفيف: {a.mitigation_plan}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditAssessment(a)} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                      <button onClick={() => { setDeleteId(a.id); setDeleteType('assessment'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Protocols tab */}
      {activeTab === 'protocols' && (
        <div className="space-y-2">
          <div className="flex items-center justify-end">
            <button onClick={openAddProtocol} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold/10 text-gold font-body text-xs font-bold hover:bg-gold/20 transition-colors">
              <Plus size={12} /> بروتوكول جديد
            </button>
          </div>
          {protocols.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><ShieldAlert size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد بروتوكولات استجابة</p></div>
          ) : (
            protocols.map((p) => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${p.active ? 'bg-green-50' : 'bg-gray-100'}`}>
                      <ShieldAlert size={14} className={p.active ? 'text-green-600' : 'text-ink/40'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {p.crisis_type && <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{p.crisis_type}</span>}
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${p.active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/40'}`}>{p.active ? 'نشط' : 'غير نشط'}</span>
                        {p.estimated_recovery_time && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/40"><Clock size={9} /> {p.estimated_recovery_time}</span>}
                      </div>
                      <p className="font-body text-xs font-bold text-midnight mt-1">{p.protocol_name}</p>
                      {p.trigger_conditions && <p className="font-body text-[10px] text-amber-600 mt-1 leading-relaxed line-clamp-2">شروط التفعيل: {p.trigger_conditions}</p>}
                      {p.response_steps && p.response_steps.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap mt-2">
                          <span className="font-body text-[9px] text-ink/40">خطوات:</span>
                          {p.response_steps.map((step, i) => <span key={i} className="px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600">{i + 1}. {step}</span>)}
                        </div>
                      )}
                      {p.escalation_chain && <p className="font-body text-[10px] text-ink/50 mt-1 leading-relaxed line-clamp-2">سلسلة التصعيد: {p.escalation_chain}</p>}
                      {p.required_resources && <p className="font-body text-[10px] text-ink/50 mt-1 leading-relaxed line-clamp-2">الموارد المطلوبة: {p.required_resources}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => toggleProtocolActive(p)} className={`px-2 py-1 rounded font-body text-[9px] font-bold transition-colors ${p.active ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                      {p.active ? 'إيقاف' : 'تفعيل'}
                    </button>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditProtocol(p)} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                      <button onClick={() => { setDeleteId(p.id); setDeleteType('protocol'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Alert modal */}
      <EntityModal open={alertModalOpen} title={editingAlertId ? 'تعديل التنبيه' : 'تنبيه جديد'} onClose={() => setAlertModalOpen(false)} onSubmit={handleSaveAlert} loading={saving}>
        <Field label="عنوان التنبيه" required><TextInput value={alertForm.alert_title} onChange={(e) => setAlertForm({ ...alertForm, alert_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="مستوى التنبيه">
            <Select value={alertForm.alert_level} onChange={(e) => setAlertForm({ ...alertForm, alert_level: e.target.value })}>
              {Object.entries(ALERT_LEVEL_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
            </Select>
          </Field>
          <Field label="الحالة">
            <Select value={alertForm.status} onChange={(e) => setAlertForm({ ...alertForm, status: e.target.value })}>
              {Object.entries(ALERT_STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المحرك المصدر"><TextInput value={alertForm.source_engine} onChange={(e) => setAlertForm({ ...alertForm, source_engine: e.target.value })} placeholder="M1, M9, M44..." /></Field>
          <Field label="الكيان المتأثر"><TextInput value={alertForm.affected_entity} onChange={(e) => setAlertForm({ ...alertForm, affected_entity: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="المؤشر المُحفِّز"><TextInput value={alertForm.trigger_metric} onChange={(e) => setAlertForm({ ...alertForm, trigger_metric: e.target.value })} /></Field>
          <Field label="القيمة الحدية"><TextInput value={alertForm.threshold_value} onChange={(e) => setAlertForm({ ...alertForm, threshold_value: e.target.value })} /></Field>
          <Field label="القيمة الحالية"><TextInput value={alertForm.current_value} onChange={(e) => setAlertForm({ ...alertForm, current_value: e.target.value })} /></Field>
        </div>
        <Field label="تاريخ التفعيل"><TextInput type="date" value={alertForm.triggered_at} onChange={(e) => setAlertForm({ ...alertForm, triggered_at: e.target.value })} /></Field>
        <Field label="إجراءات الاستجابة"><TextArea value={alertForm.response_actions} onChange={(e) => setAlertForm({ ...alertForm, response_actions: e.target.value })} rows={3} /></Field>
      </EntityModal>

      {/* Incident modal */}
      <EntityModal open={incidentModalOpen} title={editingIncidentId ? 'تعديل الحادث' : 'حادث جديد'} onClose={() => setIncidentModalOpen(false)} onSubmit={handleSaveIncident} loading={saving}>
        <Field label="عنوان الحادث" required><TextInput value={incidentForm.incident_title} onChange={(e) => setIncidentForm({ ...incidentForm, incident_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نوع الحادث">
            <Select value={incidentForm.incident_type} onChange={(e) => setIncidentForm({ ...incidentForm, incident_type: e.target.value })}>
              {Object.entries(INCIDENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="الخطورة">
            <Select value={incidentForm.severity} onChange={(e) => setIncidentForm({ ...incidentForm, severity: e.target.value })}>
              {Object.entries(SEVERITY_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="تاريخ الاكتشاف"><TextInput type="date" value={incidentForm.detected_at} onChange={(e) => setIncidentForm({ ...incidentForm, detected_at: e.target.value })} /></Field>
          <Field label="تاريخ الاحتواء"><TextInput type="date" value={incidentForm.contained_at} onChange={(e) => setIncidentForm({ ...incidentForm, contained_at: e.target.value })} /></Field>
          <Field label="تاريخ الحل"><TextInput type="date" value={incidentForm.resolved_at} onChange={(e) => setIncidentForm({ ...incidentForm, resolved_at: e.target.value })} /></Field>
        </div>
        <Field label="السبب الجذري"><TextArea value={incidentForm.root_cause} onChange={(e) => setIncidentForm({ ...incidentForm, root_cause: e.target.value })} rows={2} /></Field>
        <Field label="تقييم الأثر"><TextArea value={incidentForm.impact_assessment} onChange={(e) => setIncidentForm({ ...incidentForm, impact_assessment: e.target.value })} rows={2} /></Field>
        <Field label="إجراءات الحل"><TextArea value={incidentForm.resolution_actions} onChange={(e) => setIncidentForm({ ...incidentForm, resolution_actions: e.target.value })} rows={2} /></Field>
        <Field label="التدابير الوقائية"><TextArea value={incidentForm.preventive_measures} onChange={(e) => setIncidentForm({ ...incidentForm, preventive_measures: e.target.value })} rows={2} /></Field>
      </EntityModal>

      {/* Assessment modal */}
      <EntityModal open={assessmentModalOpen} title={editingAssessmentId ? 'تعديل التقييم' : 'تقييم جديد'} onClose={() => setAssessmentModalOpen(false)} onSubmit={handleSaveAssessment} loading={saving}>
        <Field label="عنوان التقييم" required><TextInput value={assessmentForm.assessment_title} onChange={(e) => setAssessmentForm({ ...assessmentForm, assessment_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نوع التقييم">
            <Select value={assessmentForm.assessment_type} onChange={(e) => setAssessmentForm({ ...assessmentForm, assessment_type: e.target.value })}>
              {Object.entries(ASSESSMENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="درجة المخاطر (0-100)"><TextInput type="number" value={assessmentForm.risk_score} onChange={(e) => setAssessmentForm({ ...assessmentForm, risk_score: e.target.value })} /></Field>
        </div>
        <Field label="النطاق"><TextInput value={assessmentForm.scope} onChange={(e) => setAssessmentForm({ ...assessmentForm, scope: e.target.value })} /></Field>
        <Field label="النتائج"><TextArea value={assessmentForm.findings} onChange={(e) => setAssessmentForm({ ...assessmentForm, findings: e.target.value })} rows={3} /></Field>
        <Field label="خطة التخفيف"><TextArea value={assessmentForm.mitigation_plan} onChange={(e) => setAssessmentForm({ ...assessmentForm, mitigation_plan: e.target.value })} rows={3} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تم التقييم بواسطة"><TextInput value={assessmentForm.assessed_by} onChange={(e) => setAssessmentForm({ ...assessmentForm, assessed_by: e.target.value })} /></Field>
          <Field label="تاريخ المراجعة التالية"><TextInput type="date" value={assessmentForm.next_review_date} onChange={(e) => setAssessmentForm({ ...assessmentForm, next_review_date: e.target.value })} /></Field>
        </div>
      </EntityModal>

      {/* Protocol modal */}
      <EntityModal open={protocolModalOpen} title={editingProtocolId ? 'تعديل البروتوكول' : 'بروتوكول جديد'} onClose={() => setProtocolModalOpen(false)} onSubmit={handleSaveProtocol} loading={saving}>
        <Field label="اسم البروتوكول" required><TextInput value={protocolForm.protocol_name} onChange={(e) => setProtocolForm({ ...protocolForm, protocol_name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نوع الأزمة"><TextInput value={protocolForm.crisis_type} onChange={(e) => setProtocolForm({ ...protocolForm, crisis_type: e.target.value })} /></Field>
          <Field label="الوقت المقدر للاستعادة"><TextInput value={protocolForm.estimated_recovery_time} onChange={(e) => setProtocolForm({ ...protocolForm, estimated_recovery_time: e.target.value })} /></Field>
        </div>
        <Field label="شروط التفعيل"><TextArea value={protocolForm.trigger_conditions} onChange={(e) => setProtocolForm({ ...protocolForm, trigger_conditions: e.target.value })} rows={2} /></Field>
        <Field label="خطوات الاستجابة (مفصولة بفواصل)"><TextArea value={protocolForm.response_steps} onChange={(e) => setProtocolForm({ ...protocolForm, response_steps: e.target.value })} rows={3} placeholder="خطوة 1, خطوة 2, خطوة 3" /></Field>
        <Field label="سلسلة التصعيد"><TextArea value={protocolForm.escalation_chain} onChange={(e) => setProtocolForm({ ...protocolForm, escalation_chain: e.target.value })} rows={2} /></Field>
        <Field label="الموارد المطلوبة"><TextArea value={protocolForm.required_resources} onChange={(e) => setProtocolForm({ ...protocolForm, required_resources: e.target.value })} rows={2} /></Field>
        <Field label="الحالة">
          <Select value={String(protocolForm.active)} onChange={(e) => setProtocolForm({ ...protocolForm, active: e.target.value === 'true' })}>
            <option value="true">نشط</option>
            <option value="false">غير نشط</option>
          </Select>
        </Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
