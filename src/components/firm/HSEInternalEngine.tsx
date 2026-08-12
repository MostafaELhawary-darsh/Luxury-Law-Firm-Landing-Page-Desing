import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, FileText,
  Shield, CircuitBoard, Zap, CheckCircle2, Clock, ArrowRight, Search,
  Activity, Server, AlertCircle, BadgeCheck, AlertTriangle, Users,
  HardHat, ClipboardCheck, GraduationCap, BarChart3, Calendar,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

/* ─────────────────────────────── Types ─────────────────────────────── */

interface HSEIncident {
  id: string;
  incident_number: string;
  incident_type: string;
  incident_date: string;
  location: string | null;
  severity: string;
  description: string | null;
  injured_person: string | null;
  first_aid_given: boolean | null;
  medical_report: string | null;
  insurance_claim_filed: boolean | null;
  status: string;
  created_at: string;
}

interface HSEInspection {
  id: string;
  inspection_number: string;
  inspection_type: string;
  inspector_name: string;
  inspection_date: string;
  area_inspected: string | null;
  findings: string | null;
  violations_found: boolean | null;
  corrective_actions: string | null;
  status: string;
  created_at: string;
}

interface HSETraining {
  id: string;
  training_title: string;
  training_type: string;
  trainer: string;
  trainee_count: number;
  training_date: string;
  duration_hours: number;
  certification_issued: boolean | null;
  expiry_date: string | null;
  created_at: string;
}

interface HSEReport {
  id: string;
  report_title: string;
  report_type: string;
  period_start: string;
  period_end: string;
  summary: string | null;
  recommendations: string | null;
  submitted_to: string | null;
  submitted_at: string | null;
  created_at: string;
}

type Tab = 'incidents' | 'inspections' | 'training' | 'reports';

/* ─────────────────────────────── Label Maps ─────────────────────────────── */

const INCIDENT_TYPE_LABELS: Record<string, string> = {
  accident: 'حادث',
  injury: 'إصابة',
  near_miss: 'حادث وشيك',
  property_damage: 'تلف ممتلكات',
};

const SEVERITY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  minor: { label: 'طفيف', bg: 'bg-green-50', text: 'text-green-700' },
  moderate: { label: 'متوسط', bg: 'bg-amber-50', text: 'text-amber-700' },
  severe: { label: 'شديد', bg: 'bg-orange-50', text: 'text-orange-700' },
  fatal: { label: 'قاتل', bg: 'bg-red-50', text: 'text-red-700' },
};

const INCIDENT_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  reported: { label: 'مُبلَّغ', bg: 'bg-blue-50', text: 'text-blue-700' },
  investigating: { label: 'قيد التحقيق', bg: 'bg-amber-50', text: 'text-amber-700' },
  closed: { label: 'مُغلَق', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const INSPECTION_TYPE_LABELS: Record<string, string> = {
  routine: 'دوري',
  complaint: 'شكوى',
  follow_up: 'متابعة',
};

const INSPECTION_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  scheduled: { label: 'مُجدوَل', bg: 'bg-blue-50', text: 'text-blue-700' },
  completed: { label: 'مكتمل', bg: 'bg-green-50', text: 'text-green-700' },
  pending: { label: 'قيد الانتظار', bg: 'bg-amber-50', text: 'text-amber-700' },
};

const TRAINING_TYPE_LABELS: Record<string, string> = {
  safety: 'سلامة',
  first_aid: 'إسعافات أولية',
  fire: 'إطفاء',
  emergency: 'طوارئ',
};

const REPORT_TYPE_LABELS: Record<string, string> = {
  monthly: 'شهري',
  quarterly: 'ربع سنوي',
  annual: 'سنوي',
  incident: 'حادث',
};

/* ─────────────────────────────── Forms ─────────────────────────────── */

interface IncidentForm {
  incident_number: string;
  incident_type: string;
  incident_date: string;
  location: string;
  severity: string;
  description: string;
  injured_person: string;
  first_aid_given: boolean;
  medical_report: string;
  insurance_claim_filed: boolean;
  status: string;
}

const emptyIncident: IncidentForm = {
  incident_number: '', incident_type: 'accident', incident_date: '',
  location: '', severity: 'minor', description: '', injured_person: '',
  first_aid_given: false, medical_report: '', insurance_claim_filed: false,
  status: 'reported',
};

interface InspectionForm {
  inspection_number: string;
  inspection_type: string;
  inspector_name: string;
  inspection_date: string;
  area_inspected: string;
  findings: string;
  violations_found: boolean;
  corrective_actions: string;
  status: string;
}

const emptyInspection: InspectionForm = {
  inspection_number: '', inspection_type: 'routine', inspector_name: '',
  inspection_date: '', area_inspected: '', findings: '', violations_found: false,
  corrective_actions: '', status: 'scheduled',
};

interface TrainingForm {
  training_title: string;
  training_type: string;
  trainer: string;
  trainee_count: string;
  training_date: string;
  duration_hours: string;
  certification_issued: boolean;
  expiry_date: string;
}

const emptyTraining: TrainingForm = {
  training_title: '', training_type: 'safety', trainer: '', trainee_count: '0',
  training_date: '', duration_hours: '0', certification_issued: false, expiry_date: '',
};

interface ReportForm {
  report_title: string;
  report_type: string;
  period_start: string;
  period_end: string;
  summary: string;
  recommendations: string;
  submitted_to: string;
  submitted_at: string;
}

const emptyReport: ReportForm = {
  report_title: '', report_type: 'monthly', period_start: '', period_end: '',
  summary: '', recommendations: '', submitted_to: '', submitted_at: '',
};

/* ─────────────────────────────── Component ─────────────────────────────── */

export default function HSEInternalEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [incidents, setIncidents] = useState<HSEIncident[]>([]);
  const [inspections, setInspections] = useState<HSEInspection[]>([]);
  const [training, setTraining] = useState<HSETraining[]>([]);
  const [reports, setReports] = useState<HSEReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('incidents');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  // forms
  const [incidentForm, setIncidentForm] = useState<IncidentForm>(emptyIncident);
  const [inspectionForm, setInspectionForm] = useState<InspectionForm>(emptyInspection);
  const [trainingForm, setTrainingForm] = useState<TrainingForm>(emptyTraining);
  const [reportForm, setReportForm] = useState<ReportForm>(emptyReport);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [incRes, insRes, trRes, repRes] = await Promise.all([
      supabase.from('m47_hse_incidents').select('*').order('created_at', { ascending: false }),
      supabase.from('m47_hse_inspections').select('*').order('created_at', { ascending: false }),
      supabase.from('m47_hse_training').select('*').order('created_at', { ascending: false }),
      supabase.from('m47_hse_reports').select('*').order('created_at', { ascending: false }),
    ]);
    setIncidents((incRes.data as HSEIncident[]) || []);
    setInspections((insRes.data as HSEInspection[]) || []);
    setTraining((trRes.data as HSETraining[]) || []);
    setReports((repRes.data as HSEReport[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      if (activeTab === 'incidents') setIncidentForm({ ...emptyIncident, incident_number: cmd.fields.title || '' });
      if (activeTab === 'inspections') setInspectionForm({ ...emptyInspection, inspection_number: cmd.fields.title || '' });
      if (activeTab === 'training') setTrainingForm({ ...emptyTraining, training_title: cmd.fields.title || '' });
      if (activeTab === 'reports') setReportForm({ ...emptyReport, report_title: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  /* ── CRUD helpers ── */

  const openAdd = () => {
    if (activeTab === 'incidents') setIncidentForm(emptyIncident);
    if (activeTab === 'inspections') setInspectionForm(emptyInspection);
    if (activeTab === 'training') setTrainingForm(emptyTraining);
    if (activeTab === 'reports') setReportForm(emptyReport);
    setEditingId(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    if (activeTab === 'incidents') {
      if (!incidentForm.incident_number.trim()) { setSaving(false); return; }
      const payload = {
        incident_number: incidentForm.incident_number.trim(),
        incident_type: incidentForm.incident_type,
        incident_date: incidentForm.incident_date || null,
        location: incidentForm.location.trim() || null,
        severity: incidentForm.severity,
        description: incidentForm.description.trim() || null,
        injured_person: incidentForm.injured_person.trim() || null,
        first_aid_given: incidentForm.first_aid_given,
        medical_report: incidentForm.medical_report.trim() || null,
        insurance_claim_filed: incidentForm.insurance_claim_filed,
        status: incidentForm.status,
      };
      if (editingId) {
        await supabase.from('m47_hse_incidents').update(payload).eq('id', editingId);
      } else {
        await supabase.from('m47_hse_incidents').insert(payload);
      }
    } else if (activeTab === 'inspections') {
      if (!inspectionForm.inspection_number.trim()) { setSaving(false); return; }
      const payload = {
        inspection_number: inspectionForm.inspection_number.trim(),
        inspection_type: inspectionForm.inspection_type,
        inspector_name: inspectionForm.inspector_name.trim(),
        inspection_date: inspectionForm.inspection_date || null,
        area_inspected: inspectionForm.area_inspected.trim() || null,
        findings: inspectionForm.findings.trim() || null,
        violations_found: inspectionForm.violations_found,
        corrective_actions: inspectionForm.corrective_actions.trim() || null,
        status: inspectionForm.status,
      };
      if (editingId) {
        await supabase.from('m47_hse_inspections').update(payload).eq('id', editingId);
      } else {
        await supabase.from('m47_hse_inspections').insert(payload);
      }
    } else if (activeTab === 'training') {
      if (!trainingForm.training_title.trim()) { setSaving(false); return; }
      const payload = {
        training_title: trainingForm.training_title.trim(),
        training_type: trainingForm.training_type,
        trainer: trainingForm.trainer.trim(),
        trainee_count: Number(trainingForm.trainee_count) || 0,
        training_date: trainingForm.training_date || null,
        duration_hours: Number(trainingForm.duration_hours) || 0,
        certification_issued: trainingForm.certification_issued,
        expiry_date: trainingForm.expiry_date || null,
      };
      if (editingId) {
        await supabase.from('m47_hse_training').update(payload).eq('id', editingId);
      } else {
        await supabase.from('m47_hse_training').insert(payload);
      }
    } else if (activeTab === 'reports') {
      if (!reportForm.report_title.trim()) { setSaving(false); return; }
      const payload = {
        report_title: reportForm.report_title.trim(),
        report_type: reportForm.report_type,
        period_start: reportForm.period_start || null,
        period_end: reportForm.period_end || null,
        summary: reportForm.summary.trim() || null,
        recommendations: reportForm.recommendations.trim() || null,
        submitted_to: reportForm.submitted_to.trim() || null,
        submitted_at: reportForm.submitted_at || null,
      };
      if (editingId) {
        await supabase.from('m47_hse_reports').update(payload).eq('id', editingId);
      } else {
        await supabase.from('m47_hse_reports').insert(payload);
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (activeTab === 'incidents') await supabase.from('m47_hse_incidents').delete().eq('id', deleteId);
    if (activeTab === 'inspections') await supabase.from('m47_hse_inspections').delete().eq('id', deleteId);
    if (activeTab === 'training') await supabase.from('m47_hse_training').delete().eq('id', deleteId);
    if (activeTab === 'reports') await supabase.from('m47_hse_reports').delete().eq('id', deleteId);
    setDeleteId(null);
    fetchAll();
  };

  /* ── Filters ── */

  const filteredIncidents = incidents.filter((i) => {
    if (filterType !== 'all' && i.incident_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!i.incident_number.toLowerCase().includes(q) && !(i.location || '').toLowerCase().includes(q) && !(i.injured_person || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filteredInspections = inspections.filter((i) => {
    if (filterType !== 'all' && i.inspection_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!i.inspection_number.toLowerCase().includes(q) && !i.inspector_name.toLowerCase().includes(q) && !(i.area_inspected || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filteredTraining = training.filter((t) => {
    if (filterType !== 'all' && t.training_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!t.training_title.toLowerCase().includes(q) && !t.trainer.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filteredReports = reports.filter((r) => {
    if (filterType !== 'all' && r.report_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!r.report_title.toLowerCase().includes(q) && !(r.submitted_to || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  /* ── Stats ── */

  const openIncidents = incidents.filter((i) => i.status !== 'closed').length;
  const severeIncidents = incidents.filter((i) => i.severity === 'severe' || i.severity === 'fatal').length;
  const completedInspections = inspections.filter((i) => i.status === 'completed').length;
  const violationsCount = inspections.filter((i) => i.violations_found).length;
  const totalTrainees = training.reduce((s, t) => s + (t.trainee_count || 0), 0);
  const certificationsIssued = training.filter((t) => t.certification_issued).length;

  const tabs: { id: Tab; label: string; icon: typeof HardHat; badge?: number }[] = [
    { id: 'incidents', label: 'حوادث العمل', icon: AlertTriangle, badge: incidents.length },
    { id: 'inspections', label: 'التفتيشات', icon: ClipboardCheck, badge: inspections.length },
    { id: 'training', label: 'التدريب', icon: GraduationCap, badge: training.length },
    { id: 'reports', label: 'التقارير', icon: BarChart3, badge: reports.length },
  ];

  const currentFilterLabels =
    activeTab === 'incidents' ? INCIDENT_TYPE_LABELS :
    activeTab === 'inspections' ? INSPECTION_TYPE_LABELS :
    activeTab === 'training' ? TRAINING_TYPE_LABELS :
    REPORT_TYPE_LABELS;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <HardHat size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">السلامة والصحة المهنية الداخلية (M47)</h2>
            <p className="font-body text-[10px] text-ink/40">إدارة الحوادث والتفتيشات والتدريب والتقارير — السلامة المهنية الداخلية</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Shield size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">Air-Gapped · HSE</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> إضافة جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {activeTab === 'incidents' && (
          <>
            <StatCard icon={<AlertTriangle size={14} className="text-midnight" />} label="إجمالي الحوادث" value={String(incidents.length)} valueClass="text-midnight" />
            <StatCard icon={<Activity size={14} className="text-blue-600" />} label="حوادث مفتوحة" value={String(openIncidents)} valueClass="text-blue-700" />
            <StatCard icon={<AlertCircle size={14} className="text-red-600" />} label="حوادث شديدة/قاتلة" value={String(severeIncidents)} valueClass="text-red-700" />
            <StatCard icon={<Shield size={14} className="text-gold" />} label="مطالبات تأمين" value={String(incidents.filter((i) => i.insurance_claim_filed).length)} valueClass="text-gold" />
          </>
        )}
        {activeTab === 'inspections' && (
          <>
            <StatCard icon={<ClipboardCheck size={14} className="text-midnight" />} label="إجمالي التفتيشات" value={String(inspections.length)} valueClass="text-midnight" />
            <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="تفتيشات مكتملة" value={String(completedInspections)} valueClass="text-green-700" />
            <StatCard icon={<AlertCircle size={14} className="text-red-600" />} label="مخالفات" value={String(violationsCount)} valueClass="text-red-700" />
            <StatCard icon={<Clock size={14} className="text-amber-600" />} label="قيد الانتظار" value={String(inspections.filter((i) => i.status === 'pending').length)} valueClass="text-amber-700" />
          </>
        )}
        {activeTab === 'training' && (
          <>
            <StatCard icon={<GraduationCap size={14} className="text-midnight" />} label="دورات تدريبية" value={String(training.length)} valueClass="text-midnight" />
            <StatCard icon={<Users size={14} className="text-blue-600" />} label="إجمالي المتدربين" value={String(totalTrainees)} valueClass="text-blue-700" />
            <StatCard icon={<BadgeCheck size={14} className="text-green-600" />} label="شهادات صادرة" value={String(certificationsIssued)} valueClass="text-green-700" />
            <StatCard icon={<Clock size={14} className="text-amber-600" />} label="ساعات التدريب" value={String(training.reduce((s, t) => s + (t.duration_hours || 0), 0))} valueClass="text-amber-700" />
          </>
        )}
        {activeTab === 'reports' && (
          <>
            <StatCard icon={<BarChart3 size={14} className="text-midnight" />} label="إجمالي التقارير" value={String(reports.length)} valueClass="text-midnight" />
            <StatCard icon={<FileText size={14} className="text-blue-600" />} label="تقارير شهرية" value={String(reports.filter((r) => r.report_type === 'monthly').length)} valueClass="text-blue-700" />
            <StatCard icon={<Calendar size={14} className="text-amber-600" />} label="تقارير ربع سنوية" value={String(reports.filter((r) => r.report_type === 'quarterly').length)} valueClass="text-amber-700" />
            <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="مُقدَّمة" value={String(reports.filter((r) => r.submitted_at).length)} valueClass="text-green-700" />
          </>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setFilterType('all'); setSearchQuery(''); }}
              className={`flex items-center gap-1.5 px-4 py-2.5 font-body text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'text-gold border-gold' : 'text-ink/40 border-transparent hover:text-ink/60'}`}>
              <Icon size={14} /> {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${activeTab === tab.id ? 'bg-gold text-midnight' : 'bg-gray-200 text-ink/50'}`}>{tab.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="!w-auto !py-1.5 !text-xs">
          <option value="all">كل الأنواع</option>
          {Object.entries(currentFilterLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
          <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث..." className="!py-1.5 !text-xs pr-9" />
        </div>
      </div>

      {/* ── Incidents tab ── */}
      {activeTab === 'incidents' && (
        <div className="space-y-2">
          {filteredIncidents.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <AlertTriangle size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد حوادث مسجلة</p>
            </div>
          ) : filteredIncidents.map((i) => {
            const sevCfg = SEVERITY_CONFIG[i.severity] || SEVERITY_CONFIG.minor;
            const stCfg = INCIDENT_STATUS_CONFIG[i.status] || INCIDENT_STATUS_CONFIG.reported;
            return (
              <div key={i.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sevCfg.bg}`}>
                      <AlertTriangle size={14} className={sevCfg.text} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-body text-[10px] font-bold text-gold">{i.incident_number}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sevCfg.bg} ${sevCfg.text}`}>{sevCfg.label}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${stCfg.bg} ${stCfg.text}`}>{stCfg.label}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{INCIDENT_TYPE_LABELS[i.incident_type] || i.incident_type}</span>
                      </div>
                      {i.incident_date && <span className="font-body text-[9px] text-ink/40 block mt-1">{formatDate(i.incident_date)}</span>}
                      {i.location && <span className="font-body text-[9px] text-ink/40 block">الموقع: {i.location}</span>}
                      {i.injured_person && <span className="font-body text-[9px] text-ink/40 block">المصاب: {i.injured_person}</span>}
                      {i.description && <p className="font-body text-xs text-ink/60 mt-1 leading-snug line-clamp-2">{i.description}</p>}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {i.first_aid_given && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> إسعافات أولية</span>}
                        {i.insurance_claim_filed && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Shield size={8} /> مطالبة تأمين</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setIncidentForm({ incident_number: i.incident_number, incident_type: i.incident_type, incident_date: i.incident_date || '', location: i.location || '', severity: i.severity, description: i.description || '', injured_person: i.injured_person || '', first_aid_given: i.first_aid_given || false, medical_report: i.medical_report || '', insurance_claim_filed: i.insurance_claim_filed || false, status: i.status }); setEditingId(i.id); setModalOpen(true); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                    <button onClick={() => setDeleteId(i.id)} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Inspections tab ── */}
      {activeTab === 'inspections' && (
        <div className="space-y-2">
          {filteredInspections.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <ClipboardCheck size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد تفتيشات مسجلة</p>
            </div>
          ) : filteredInspections.map((i) => {
            const stCfg = INSPECTION_STATUS_CONFIG[i.status] || INSPECTION_STATUS_CONFIG.scheduled;
            return (
              <div key={i.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-100">
                      <ClipboardCheck size={14} className="text-ink/50" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-body text-[10px] font-bold text-gold">{i.inspection_number}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${stCfg.bg} ${stCfg.text}`}>{stCfg.label}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{INSPECTION_TYPE_LABELS[i.inspection_type] || i.inspection_type}</span>
                        {i.violations_found && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-red-50 text-red-600"><AlertCircle size={8} /> مخالفات</span>}
                      </div>
                      <p className="font-body text-xs font-bold text-midnight mt-1">{i.inspector_name}</p>
                      {i.inspection_date && <span className="font-body text-[9px] text-ink/40 block mt-1">{formatDate(i.inspection_date)}</span>}
                      {i.area_inspected && <span className="font-body text-[9px] text-ink/40 block">المنطقة: {i.area_inspected}</span>}
                      {i.findings && <p className="font-body text-xs text-ink/60 mt-1 leading-snug line-clamp-2">{i.findings}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setInspectionForm({ inspection_number: i.inspection_number, inspection_type: i.inspection_type, inspector_name: i.inspector_name, inspection_date: i.inspection_date || '', area_inspected: i.area_inspected || '', findings: i.findings || '', violations_found: i.violations_found || false, corrective_actions: i.corrective_actions || '', status: i.status }); setEditingId(i.id); setModalOpen(true); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                    <button onClick={() => setDeleteId(i.id)} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Training tab ── */}
      {activeTab === 'training' && (
        <div className="space-y-2">
          {filteredTraining.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <GraduationCap size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد دورات تدريبية</p>
            </div>
          ) : filteredTraining.map((t) => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-50">
                    <GraduationCap size={14} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{TRAINING_TYPE_LABELS[t.training_type] || t.training_type}</span>
                      {t.certification_issued && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><BadgeCheck size={8} /> شهادة</span>}
                    </div>
                    <p className="font-body text-xs font-bold text-midnight mt-1">{t.training_title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="font-body text-[9px] text-ink/40">المدرب: {t.trainer}</span>
                      <span className="font-body text-[9px] text-ink/40">المتدربون: {t.trainee_count}</span>
                      <span className="font-body text-[9px] text-ink/40">المدة: {t.duration_hours} ساعة</span>
                      {t.training_date && <span className="font-body text-[9px] text-ink/40">{formatDate(t.training_date)}</span>}
                      {t.expiry_date && <span className="font-body text-[9px] text-amber-600">تنتهي: {formatDate(t.expiry_date)}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setTrainingForm({ training_title: t.training_title, training_type: t.training_type, trainer: t.trainer, trainee_count: String(t.trainee_count), training_date: t.training_date || '', duration_hours: String(t.duration_hours), certification_issued: t.certification_issued || false, expiry_date: t.expiry_date || '' }); setEditingId(t.id); setModalOpen(true); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                  <button onClick={() => setDeleteId(t.id)} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Reports tab ── */}
      {activeTab === 'reports' && (
        <div className="space-y-2">
          {filteredReports.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <BarChart3 size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد تقارير</p>
            </div>
          ) : filteredReports.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-purple-50">
                    <BarChart3 size={14} className="text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{REPORT_TYPE_LABELS[r.report_type] || r.report_type}</span>
                      {r.submitted_at && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> مُقدَّم</span>}
                    </div>
                    <p className="font-body text-xs font-bold text-midnight mt-1">{r.report_title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {r.period_start && <span className="font-body text-[9px] text-ink/40">من: {formatDate(r.period_start)}</span>}
                      {r.period_end && <span className="font-body text-[9px] text-ink/40">إلى: {formatDate(r.period_end)}</span>}
                      {r.submitted_to && <span className="font-body text-[9px] text-ink/40">إلى: {r.submitted_to}</span>}
                    </div>
                    {r.summary && <p className="font-body text-xs text-ink/60 mt-1 leading-snug line-clamp-2">{r.summary}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setReportForm({ report_title: r.report_title, report_type: r.report_type, period_start: r.period_start || '', period_end: r.period_end || '', summary: r.summary || '', recommendations: r.recommendations || '', submitted_to: r.submitted_to || '', submitted_at: r.submitted_at || '' }); setEditingId(r.id); setModalOpen(true); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                  <button onClick={() => setDeleteId(r.id)} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل' : 'إضافة جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        {activeTab === 'incidents' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="رقم الحادث" required><TextInput value={incidentForm.incident_number} onChange={(e) => setIncidentForm({ ...incidentForm, incident_number: e.target.value })} placeholder="INC-2025-001" /></Field>
              <Field label="نوع الحادث">
                <Select value={incidentForm.incident_type} onChange={(e) => setIncidentForm({ ...incidentForm, incident_type: e.target.value })}>
                  {Object.entries(INCIDENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="تاريخ الحادث"><TextInput type="date" value={incidentForm.incident_date} onChange={(e) => setIncidentForm({ ...incidentForm, incident_date: e.target.value })} /></Field>
              <Field label="الخطورة">
                <Select value={incidentForm.severity} onChange={(e) => setIncidentForm({ ...incidentForm, severity: e.target.value })}>
                  {Object.entries(SEVERITY_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="الموقع"><TextInput value={incidentForm.location} onChange={(e) => setIncidentForm({ ...incidentForm, location: e.target.value })} /></Field>
            <Field label="المصاب"><TextInput value={incidentForm.injured_person} onChange={(e) => setIncidentForm({ ...incidentForm, injured_person: e.target.value })} /></Field>
            <Field label="الوصف"><TextArea value={incidentForm.description} onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })} rows={3} /></Field>
            <Field label="التقرير الطبي"><TextArea value={incidentForm.medical_report} onChange={(e) => setIncidentForm({ ...incidentForm, medical_report: e.target.value })} rows={3} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="الحالة">
                <Select value={incidentForm.status} onChange={(e) => setIncidentForm({ ...incidentForm, status: e.target.value })}>
                  {Object.entries(INCIDENT_STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                </Select>
              </Field>
            </div>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={incidentForm.first_aid_given} onChange={(e) => setIncidentForm({ ...incidentForm, first_aid_given: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-gold focus:ring-gold/30" /><span className="font-body text-sm text-ink/70">تم تقديم إسعافات أولية</span></label>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={incidentForm.insurance_claim_filed} onChange={(e) => setIncidentForm({ ...incidentForm, insurance_claim_filed: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-gold focus:ring-gold/30" /><span className="font-body text-sm text-ink/70">تم تقديم مطالبة تأمين</span></label>
          </>
        )}
        {activeTab === 'inspections' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="رقم التفتيش" required><TextInput value={inspectionForm.inspection_number} onChange={(e) => setInspectionForm({ ...inspectionForm, inspection_number: e.target.value })} placeholder="INS-2025-001" /></Field>
              <Field label="نوع التفتيش">
                <Select value={inspectionForm.inspection_type} onChange={(e) => setInspectionForm({ ...inspectionForm, inspection_type: e.target.value })}>
                  {Object.entries(INSPECTION_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="اسم المفتش"><TextInput value={inspectionForm.inspector_name} onChange={(e) => setInspectionForm({ ...inspectionForm, inspector_name: e.target.value })} /></Field>
              <Field label="تاريخ التفتيش"><TextInput type="date" value={inspectionForm.inspection_date} onChange={(e) => setInspectionForm({ ...inspectionForm, inspection_date: e.target.value })} /></Field>
            </div>
            <Field label="المنطقة المُفتَّشة"><TextInput value={inspectionForm.area_inspected} onChange={(e) => setInspectionForm({ ...inspectionForm, area_inspected: e.target.value })} /></Field>
            <Field label="النتائج"><TextArea value={inspectionForm.findings} onChange={(e) => setInspectionForm({ ...inspectionForm, findings: e.target.value })} rows={3} /></Field>
            <Field label="الإجراءات التصحيحية"><TextArea value={inspectionForm.corrective_actions} onChange={(e) => setInspectionForm({ ...inspectionForm, corrective_actions: e.target.value })} rows={3} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="الحالة">
                <Select value={inspectionForm.status} onChange={(e) => setInspectionForm({ ...inspectionForm, status: e.target.value })}>
                  {Object.entries(INSPECTION_STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                </Select>
              </Field>
            </div>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={inspectionForm.violations_found} onChange={(e) => setInspectionForm({ ...inspectionForm, violations_found: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-gold focus:ring-gold/30" /><span className="font-body text-sm text-ink/70">تم العثور على مخالفات</span></label>
          </>
        )}
        {activeTab === 'training' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="عنوان التدريب" required><TextInput value={trainingForm.training_title} onChange={(e) => setTrainingForm({ ...trainingForm, training_title: e.target.value })} /></Field>
              <Field label="نوع التدريب">
                <Select value={trainingForm.training_type} onChange={(e) => setTrainingForm({ ...trainingForm, training_type: e.target.value })}>
                  {Object.entries(TRAINING_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="المدرب"><TextInput value={trainingForm.trainer} onChange={(e) => setTrainingForm({ ...trainingForm, trainer: e.target.value })} /></Field>
              <Field label="تاريخ التدريب"><TextInput type="date" value={trainingForm.training_date} onChange={(e) => setTrainingForm({ ...trainingForm, training_date: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="عدد المتدربين"><TextInput type="number" value={trainingForm.trainee_count} onChange={(e) => setTrainingForm({ ...trainingForm, trainee_count: e.target.value })} /></Field>
              <Field label="المدة (ساعات)"><TextInput type="number" value={trainingForm.duration_hours} onChange={(e) => setTrainingForm({ ...trainingForm, duration_hours: e.target.value })} /></Field>
              <Field label="تاريخ الانتهاء"><TextInput type="date" value={trainingForm.expiry_date} onChange={(e) => setTrainingForm({ ...trainingForm, expiry_date: e.target.value })} /></Field>
            </div>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={trainingForm.certification_issued} onChange={(e) => setTrainingForm({ ...trainingForm, certification_issued: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-gold focus:ring-gold/30" /><span className="font-body text-sm text-ink/70">تم إصدار شهادة</span></label>
          </>
        )}
        {activeTab === 'reports' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="عنوان التقرير" required><TextInput value={reportForm.report_title} onChange={(e) => setReportForm({ ...reportForm, report_title: e.target.value })} /></Field>
              <Field label="نوع التقرير">
                <Select value={reportForm.report_type} onChange={(e) => setReportForm({ ...reportForm, report_type: e.target.value })}>
                  {Object.entries(REPORT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="بداية الفترة"><TextInput type="date" value={reportForm.period_start} onChange={(e) => setReportForm({ ...reportForm, period_start: e.target.value })} /></Field>
              <Field label="نهاية الفترة"><TextInput type="date" value={reportForm.period_end} onChange={(e) => setReportForm({ ...reportForm, period_end: e.target.value })} /></Field>
            </div>
            <Field label="الملخص"><TextArea value={reportForm.summary} onChange={(e) => setReportForm({ ...reportForm, summary: e.target.value })} rows={3} /></Field>
            <Field label="التوصيات"><TextArea value={reportForm.recommendations} onChange={(e) => setReportForm({ ...reportForm, recommendations: e.target.value })} rows={3} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="مُقدَّم إلى"><TextInput value={reportForm.submitted_to} onChange={(e) => setReportForm({ ...reportForm, submitted_to: e.target.value })} /></Field>
              <Field label="تاريخ التقديم"><TextInput type="date" value={reportForm.submitted_at} onChange={(e) => setReportForm({ ...reportForm, submitted_at: e.target.value })} /></Field>
            </div>
          </>
        )}
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
