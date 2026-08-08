import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, AlertTriangle,
  Shield, ShieldAlert, CircuitBoard, CheckCircle2, Clock, Search,
  Activity, AlertCircle, BadgeCheck, Building2, Server, ServerCog,
  HeartPulse, Radar, RotateCcw, RefreshCw, Lock, Network, Globe,
  Siren, DoorClosed, Target, Zap, FileText, DollarSign, Scale,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M108DRFile, M108AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'files' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  monitoring: { label: 'مراقبة', bg: 'bg-blue-50', text: 'text-blue-700' },
  warning: { label: 'تحذير', bg: 'bg-amber-50', text: 'text-amber-700' },
  critical: { label: 'حرج', bg: 'bg-orange-50', text: 'text-orange-700' },
  failover: { label: 'تبديل آلي', bg: 'bg-purple-50', text: 'text-purple-700' },
  recovered: { label: 'استعادة', bg: 'bg-green-50', text: 'text-green-700' },
  terminated: { label: 'إنهاء', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const STAGES = ['monitoring', 'warning', 'critical', 'failover', 'recovered', 'terminated'];

const FILE_TYPE_LABELS: Record<string, string> = {
  failover: 'تبديل آلي',
  war_room: 'غرفة حرب',
  heartbeat: 'نبض الخادم',
  threat: 'تحليل تهديد',
  recovery: 'استعادة',
  sync: 'مزامنة جغرافية',
};

const FILE_TYPE_ICONS: Record<string, typeof ShieldAlert> = {
  failover: Zap,
  war_room: Siren,
  heartbeat: HeartPulse,
  threat: Radar,
  recovery: RotateCcw,
  sync: RefreshCw,
};

const HEALTH_STATUS_OPTIONS = ['healthy', 'degraded', 'critical', 'offline'];
const THREAT_TYPES = ['ddos', 'intrusion', 'data_breach', 'ransomware', 'insider', 'supply_chain', 'hardware_failure', 'network_outage'];
const THREAT_SEVERITIES = ['low', 'medium', 'high', 'critical', 'sovereign'];
const SERVER_ROLES = ['primary', 'shadow', 'failover_target', 'witness', 'arbiter', 'standby'];

interface DRFileForm {
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  server_name: string;
  server_role: string;
  health_status: string;
  heartbeat_latency_ms: string;
  threat_type: string;
  threat_severity: string;
  failover_triggered: boolean;
  failover_target_server: string;
  failover_latency_ms: string;
  war_room_activated: boolean;
  air_gapped: boolean;
  active_active_sync: boolean;
  geo_replication_site: string;
  red_alert_issued: boolean;
  api_ports_closed: boolean;
  recovery_point_objective: string;
  recovery_time_objective: string;
  description: string;
}

const emptyForm: DRFileForm = {
  file_number: '', file_title: '', file_type: 'failover', stage: 'monitoring',
  server_name: '', server_role: 'primary', health_status: 'healthy',
  heartbeat_latency_ms: '0', threat_type: '', threat_severity: 'low',
  failover_triggered: false, failover_target_server: '', failover_latency_ms: '0',
  war_room_activated: false, air_gapped: false, active_active_sync: false,
  geo_replication_site: '', red_alert_issued: false, api_ports_closed: false,
  recovery_point_objective: '', recovery_time_objective: '',
  description: '',
};

export default function DisasterRecoveryEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [files, setFiles] = useState<M108DRFile[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('files');
  const [selectedFile, setSelectedFile] = useState<M108DRFile | null>(null);
  const [auditLogs, setAuditLogs] = useState<M108AuditLog[]>([]);
  const [allAudit, setAllAudit] = useState<M108AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DRFileForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [fRes, attRes, auditRes] = await Promise.all([
      supabase.from('m108_dr_files')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m108_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (fRes.error) console.error('m108 fetch error', fRes.error);
    if (attRes.error) console.error('attorneys fetch error', attRes.error);
    if (auditRes.error) console.error('audit fetch error', auditRes.error);
    setFiles((fRes.data as M108DRFile[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAudit((auditRes.data as M108AuditLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyForm, file_title: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const logAudit = async (fileId: string, action: string, detail: string) => {
    const hash = '0x' + Math.random().toString(16).substr(2, 4) + '...' + Math.random().toString(16).substr(2, 4);
    const { error } = await supabase.from('m108_audit_logs').insert({
      case_id: fileId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
    if (error) console.error('audit log error', error);
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (f: M108DRFile) => {
    setForm({
      file_number: f.file_number, file_title: f.file_title,
      file_type: f.file_type, stage: f.stage,
      server_name: f.server_name || '', server_role: f.server_role || 'primary',
      health_status: f.health_status || 'healthy',
      heartbeat_latency_ms: String(f.heartbeat_latency_ms || 0),
      threat_type: f.threat_type || '', threat_severity: f.threat_severity || 'low',
      failover_triggered: !!f.failover_triggered,
      failover_target_server: f.failover_target_server || '',
      failover_latency_ms: String(f.failover_latency_ms || 0),
      war_room_activated: !!f.war_room_activated,
      air_gapped: !!f.air_gapped,
      active_active_sync: !!f.active_active_sync,
      geo_replication_site: f.geo_replication_site || '',
      red_alert_issued: !!f.red_alert_issued,
      api_ports_closed: !!f.api_ports_closed,
      recovery_point_objective: f.recovery_point_objective || '',
      recovery_time_objective: f.recovery_time_objective || '',
      description: f.description || '',
    });
    setEditingId(f.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.file_title.trim() || !form.file_number.trim()) return;
    setSaving(true);
    const hblatency = Number(form.heartbeat_latency_ms) || 0;
    const flatency = Number(form.failover_latency_ms) || 0;
    const payload = {
      file_number: form.file_number.trim(),
      file_title: form.file_title.trim(),
      file_type: form.file_type,
      stage: form.stage,
      status: form.stage === 'terminated' ? 'terminated' : 'active',
      server_name: form.server_name.trim() || null,
      server_role: form.server_role || null,
      health_status: form.health_status || null,
      heartbeat_latency_ms: hblatency,
      threat_type: form.threat_type || null,
      threat_severity: form.threat_severity || null,
      failover_triggered: form.failover_triggered,
      failover_target_server: form.failover_target_server.trim() || null,
      failover_latency_ms: flatency,
      war_room_activated: form.war_room_activated,
      air_gapped: form.air_gapped,
      active_active_sync: form.active_active_sync,
      geo_replication_site: form.geo_replication_site.trim() || null,
      red_alert_issued: form.red_alert_issued,
      api_ports_closed: form.api_ports_closed,
      recovery_point_objective: form.recovery_point_objective.trim() || null,
      recovery_time_objective: form.recovery_time_objective.trim() || null,
      description: form.description.trim() || null,
    };
    if (editingId) {
      const { error } = await supabase.from('m108_dr_files').update(payload).eq('id', editingId);
      if (error) console.error('update error', error);
      await logAudit(editingId, 'file_updated', 'تحديث بيانات ملف استمرارية الأعمال والتعافي من الكوارث السيادية');
    } else {
      const { data, error } = await supabase.from('m108_dr_files').insert(payload).select('id');
      if (error) console.error('insert error', error);
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'file_created', 'إنشاء ملف تعافي سيادي — النوع: ' + (FILE_TYPE_LABELS[form.file_type] || form.file_type));
        const needsCyber = form.file_type === 'threat' || form.file_type === 'failover';
        await supabase.from('m108_dr_files').update({
          m53_document_id: 'DOC-M108-' + Date.now().toString().slice(-6),
          m54_finance_linked: true,
          m14_cyber_linked: needsCyber,
          m10_case_opened: needsCyber,
          m109_biometric_signed: true,
          m92_notified: true,
          cost_center_id: 'CC-M108-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm53_document', 'أرشفة الملف في محرك المستندات (M53)');
        await logAudit(newId, 'm54_finance', 'ربط الملف بالمحرك المالي (M54) — تكاليف التعافي والاستمرارية');
        if (needsCyber) await logAudit(newId, 'm14_cyber', 'ربط الملف بمحرك الأمن السيبراني (M14) — تحليل التهديدات والاستجابة');
        if (needsCyber) await logAudit(newId, 'm10_case', 'فتح القضية في المحرك الموحد (M10) — حوادث سيبرانية وتعافي');
        await logAudit(newId, 'm109_biometric', 'التوقيع البيومتري لبروتوكولات التعافي السيادية (M109)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء ملف التعافي');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('m108_dr_files').delete().eq('id', deleteId);
    if (error) console.error('delete error', error);
    setDeleteId(null);
    setSelectedFile(null);
    fetchAll();
  };

  const openFileDetail = async (f: M108DRFile) => {
    setSelectedFile(f);
    setDetailLoading(true);
    const aRes = await supabase.from('m108_audit_logs').select('*').eq('case_id', f.id).order('created_at', { ascending: true });
    if (aRes.error) console.error('detail audit error', aRes.error);
    setAuditLogs((aRes.data as M108AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (f: M108DRFile) => {
    const idx = STAGES.indexOf(f.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    const { error } = await supabase.from('m108_dr_files').update({ stage: next, status: next === 'terminated' ? 'terminated' : 'active' }).eq('id', f.id);
    if (error) console.error('stage advance error', error);
    await logAudit(f.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedFile({ ...f, stage: next } as M108DRFile);
  };

  const filteredFiles = files.filter((f) => {
    if (filterType !== 'all' && f.file_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!f.file_number.toLowerCase().includes(q) && !f.file_title.toLowerCase().includes(q) && !(f.server_name || '').toLowerCase().includes(q) && !(f.failover_target_server || '').toLowerCase().includes(q) && !(f.geo_replication_site || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const warRoomsCount = files.filter((f) => f.war_room_activated).length;
  const failoversCount = files.filter((f) => f.failover_triggered).length;
  const avgFailoverLatency = failoversCount > 0
    ? Math.round(files.filter((f) => f.failover_triggered).reduce((s, f) => s + (f.failover_latency_ms || 0), 0) / failoversCount)
    : 0;

  const tabs: { id: Tab; label: string; icon: typeof ShieldAlert; badge?: number }[] = [
    { id: 'files', label: 'ملفات التعافي السيادي', icon: ShieldAlert, badge: files.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <ShieldAlert size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">استمرارية الأعمال والتعافي من الكوارث السيادية (M108)</h2>
            <p className="font-body text-[10px] text-ink/40">خوادم الظل والتبديل الآلي وبروتوكول غرفة الحرب والتشغيل المغلق</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Shield size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">Zero-Trust · ZK-Audit</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> ملف جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<ShieldAlert size={14} className="text-midnight" />} label="إجمالي الملفات" value={String(files.length)} valueClass="text-midnight" />
        <StatCard icon={<Siren size={14} className="text-red-600" />} label="غرف الحرب المفعّلة" value={String(warRoomsCount)} valueClass="text-red-700" />
        <StatCard icon={<Zap size={14} className="text-purple-600" />} label="عمليات التبديل الآلي" value={String(failoversCount)} valueClass="text-purple-700" />
        <StatCard icon={<Clock size={14} className="text-gold" />} label="متوسط زمن التبديل (ms)" value={String(avgFailoverLatency)} valueClass="text-gold" />
      </div>

      {/* 6-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">بروتوكول التعافي السيادي — 6 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.monitoring;
            const count = files.filter((f) => f.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[130px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                  </div>
                  <span className="font-body text-[9px] text-cream/40">{count} ملف</span>
                </div>
                {i < STAGES.length - 1 && <ChevronRight size={12} className="text-gold/30 flex-shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Integration matrix */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-midnight text-xs">مصفوفة التكامل (Integration Matrix)</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
          {[
            { icon: FileText, label: 'المستندات (M53)', desc: 'أرشفة بروتوكولات التعافي', color: 'text-purple-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'تكاليف التعافي والاستمرارية', color: 'text-gold' },
            { icon: Shield, label: 'الأمن السيبراني (M14)', desc: 'تحليل التهديدات والاستجابة', color: 'text-red-600' },
            { icon: Scale, label: 'نواة القضية (M10)', desc: 'حوادث سيبرانية وتعافي', color: 'text-blue-600' },
            { icon: BadgeCheck, label: 'البيومتري (M109)', desc: 'توقيع بروتوكولات التعافي', color: 'text-green-600' },
            { icon: Activity, label: 'الوكيل الذكي (M92)', desc: 'تنبيهات التبديل الآلي', color: 'text-amber-600' },
            { icon: Server, label: 'خوادم الظل', desc: 'مزامنة جغرافية', color: 'text-blue-600' },
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

      {/* Filters for files */}
      {activeTab === 'files' && (
        <div className="flex items-center gap-2">
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الأنواع</option>
            {Object.entries(FILE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم الملف أو الخادم أو الموقع..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Files tab */}
      {activeTab === 'files' && (
        <div className="space-y-2">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <ShieldAlert size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد ملفات تعافي سيادي مسجلة</p>
            </div>
          ) : (
            filteredFiles.map((f) => {
              const sCfg = STAGE_CONFIG[f.stage] || STAGE_CONFIG.monitoring;
              const stageIdx = STAGES.indexOf(f.stage);
              const TypeIcon = FILE_TYPE_ICONS[f.file_type] || ShieldAlert;
              return (
                <div key={f.id} onClick={() => openFileDetail(f)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <TypeIcon size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{f.file_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{FILE_TYPE_LABELS[f.file_type] || f.file_type}</span>
                          {f.war_room_activated && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-red-50 text-red-600">
                              <Siren size={8} /> غرفة حرب
                            </span>
                          )}
                          {f.failover_triggered && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-purple-50 text-purple-600">
                              <Zap size={8} /> تبديل آلي
                            </span>
                          )}
                          {f.air_gapped && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-gray-100 text-gray-600">
                              <Lock size={8} /> مغلق هوائياً
                            </span>
                          )}
                          {f.red_alert_issued && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-red-50 text-red-600">
                              <AlertTriangle size={8} /> إنذار أحمر
                            </span>
                          )}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{f.file_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {f.server_name && <span className="font-body text-[9px] text-ink/40">الخادم: {f.server_name}</span>}
                          {f.server_role && <span className="font-body text-[9px] text-ink/40">الدور: {f.server_role}</span>}
                          {f.health_status && <span className="font-body text-[9px] text-ink/40">الحالة: {f.health_status}</span>}
                          {f.heartbeat_latency_ms > 0 && <span className="font-body text-[9px] text-blue-600 font-bold">نبض: {f.heartbeat_latency_ms}ms</span>}
                          {f.failover_target_server && <span className="font-body text-[9px] text-purple-600 font-bold">هدف التبديل: {f.failover_target_server}</span>}
                          {f.geo_replication_site && <span className="font-body text-[9px] text-green-600 font-bold">الموقع: {f.geo_replication_site}</span>}
                          {f.m53_document_id && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><FileText size={8} /> M53</span>}
                          {f.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {f.m14_cyber_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-red-50 text-red-600"><Shield size={8} /> M14</span>}
                          {f.m10_case_opened && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Scale size={8} /> M10</span>}
                          {f.m109_biometric_signed && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><BadgeCheck size={8} /> M109</span>}
                          {f.m92_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Activity size={8} /> M92</span>}
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
                        <button onClick={(ev) => { ev.stopPropagation(); openEdit(f); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                        <button onClick={(ev) => { ev.stopPropagation(); setDeleteId(f.id); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
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
                    {log.action.includes('created') ? <ShieldAlert size={12} className="text-blue-600" />
                      : log.action.includes('m53') ? <FileText size={12} className="text-purple-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m14') ? <Shield size={12} className="text-red-600" />
                      : log.action.includes('m10') ? <Scale size={12} className="text-blue-600" />
                      : log.action.includes('m109') ? <BadgeCheck size={12} className="text-green-600" />
                      : log.action.includes('m92') ? <Activity size={12} className="text-amber-600" />
                      : log.action.includes('stage') ? <ChevronRight size={12} className="text-gold" />
                      : log.action.includes('updated') ? <Pencil size={12} className="text-amber-600" />
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

      {/* File detail drawer */}
      {selectedFile && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedFile(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <ShieldAlert size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف التعافي السيادي</span>
              </div>
              <button onClick={() => setSelectedFile(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-gold animate-spin" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-body text-[10px] font-bold text-gold">{selectedFile.file_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedFile.stage] || STAGE_CONFIG.monitoring).bg} ${(STAGE_CONFIG[selectedFile.stage] || STAGE_CONFIG.monitoring).text}`}>
                      {(STAGE_CONFIG[selectedFile.stage] || STAGE_CONFIG.monitoring).label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{FILE_TYPE_LABELS[selectedFile.file_type] || selectedFile.file_type}</span>
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedFile.file_title}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.monitoring;
                      const stageIdx = STAGES.indexOf(selectedFile.stage);
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
                  {selectedFile.stage !== STAGES[STAGES.length - 1] && (
                    <button onClick={() => advanceStage(selectedFile)} className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
                      <ChevronRight size={12} /> الانتقال للمرحلة التالية
                    </button>
                  )}
                </div>

                {/* Server info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Server size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات الخادم</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">اسم الخادم</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.server_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">دور الخادم</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.server_role || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">حالة الصحة</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.health_status || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">زمن النبض (ms)</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.heartbeat_latency_ms || 0}</p></div>
                  </div>
                </div>

                {/* Failover card */}
                <div className={`rounded-lg p-3 border ${selectedFile.failover_triggered ? 'bg-purple-50 border-purple-100' : 'bg-gray-100 border-gray-200'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Zap size={12} className={selectedFile.failover_triggered ? 'text-purple-600' : 'text-ink/40'} />
                    <span className="font-body text-[10px] font-bold text-midnight">التبديل الآلي</span>
                  </div>
                  <p className={`font-body text-xs font-bold ${selectedFile.failover_triggered ? 'text-purple-700' : 'text-ink/50'}`}>
                    {selectedFile.failover_triggered ? 'تم تفعيل التبديل الآلي' : 'لم يتم تفعيل التبديل'}
                  </p>
                  {selectedFile.failover_target_server && (
                    <p className="font-body text-[10px] text-ink/50 mt-1">الخادم المستهدف: {selectedFile.failover_target_server}</p>
                  )}
                  {selectedFile.failover_latency_ms > 0 && (
                    <p className="font-body text-[10px] text-ink/50 mt-0.5">زمن التبديل: {selectedFile.failover_latency_ms}ms</p>
                  )}
                </div>

                {/* Threat card */}
                {(selectedFile.threat_type || selectedFile.threat_severity) && (
                  <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Radar size={12} className="text-red-600" />
                      <span className="font-body text-[10px] font-bold text-midnight">تحليل التهديد</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="font-body text-[9px] text-ink/40">نوع التهديد</span><p className="font-body text-xs font-bold text-red-700">{selectedFile.threat_type || '—'}</p></div>
                      <div><span className="font-body text-[9px] text-ink/40">درجة الخطورة</span><p className="font-body text-xs font-bold text-red-700">{selectedFile.threat_severity || '—'}</p></div>
                    </div>
                  </div>
                )}

                {/* War room card */}
                <div className={`rounded-lg p-3 border ${selectedFile.war_room_activated ? 'bg-red-50 border-red-100' : 'bg-gray-100 border-gray-200'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Siren size={12} className={selectedFile.war_room_activated ? 'text-red-600' : 'text-ink/40'} />
                    <span className="font-body text-[10px] font-bold text-midnight">بروتوكول غرفة الحرب</span>
                  </div>
                  <p className={`font-body text-xs font-bold ${selectedFile.war_room_activated ? 'text-red-700' : 'text-ink/50'}`}>
                    {selectedFile.war_room_activated ? 'مفعّل — بروتوكول غرفة الحرب السيادي قيد التشغيل' : 'غير مفعّل'}
                  </p>
                </div>

                {/* RPO/RTO card */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Target size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">أهداف التعافي</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">هدف نقطة التعافي (RPO)</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.recovery_point_objective || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">هدف زمن التعافي (RTO)</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.recovery_time_objective || '—'}</p></div>
                  </div>
                </div>

                {/* Flags row */}
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedFile.air_gapped && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold bg-gray-100 text-gray-600">
                      <Lock size={10} /> مغلق هوائياً
                    </span>
                  )}
                  {selectedFile.active_active_sync && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold bg-blue-50 text-blue-600">
                      <RefreshCw size={10} /> مزامنة Active-Active
                    </span>
                  )}
                  {selectedFile.red_alert_issued && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold bg-red-50 text-red-600">
                      <AlertTriangle size={10} /> إنذار أحمر
                    </span>
                  )}
                  {selectedFile.api_ports_closed && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold bg-gray-100 text-gray-700">
                      <DoorClosed size={10} /> إغلاق منافذ API
                    </span>
                  )}
                  {selectedFile.geo_replication_site && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold bg-green-50 text-green-600">
                      <Globe size={10} /> {selectedFile.geo_replication_site}
                    </span>
                  )}
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m53_document_id ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> M53 {selectedFile.m53_document_id ? 'مؤرشف' : 'غير مؤرشف'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedFile.m54_finance_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m14_cyber_linked ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-ink/30'}`}><Shield size={10} /> M14 {selectedFile.m14_cyber_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m10_case_opened ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Scale size={10} /> M10 {selectedFile.m10_case_opened ? 'مفتوح' : 'غير مفتوح'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m109_biometric_signed ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><BadgeCheck size={10} /> M109 {selectedFile.m109_biometric_signed ? 'موقَّع' : 'غير موقَّع'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m92_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Activity size={10} /> M92 {selectedFile.m92_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                </div>

                {selectedFile.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedFile.description}</p></div>
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

      {/* File create/edit modal */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل الملف' : 'ملف تعافي سيادي جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الملف" required><TextInput value={form.file_number} onChange={(e) => setForm({ ...form, file_number: e.target.value })} placeholder="DR-2025-001" /></Field>
          <Field label="نوع الملف">
            <Select value={form.file_type} onChange={(e) => setForm({ ...form, file_type: e.target.value })}>
              {Object.entries(FILE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان الملف" required><TextInput value={form.file_title} onChange={(e) => setForm({ ...form, file_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم الخادم"><TextInput value={form.server_name} onChange={(e) => setForm({ ...form, server_name: e.target.value })} placeholder="SRV-PRIMARY-01" /></Field>
          <Field label="دور الخادم">
            <Select value={form.server_role} onChange={(e) => setForm({ ...form, server_role: e.target.value })}>
              {SERVER_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="حالة الصحة">
            <Select value={form.health_status} onChange={(e) => setForm({ ...form, health_status: e.target.value })}>
              {HEALTH_STATUS_OPTIONS.map((h) => <option key={h} value={h}>{h}</option>)}
            </Select>
          </Field>
          <Field label="زمن النبض (ms)"><TextInput type="number" value={form.heartbeat_latency_ms} onChange={(e) => setForm({ ...form, heartbeat_latency_ms: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نوع التهديد">
            <Select value={form.threat_type} onChange={(e) => setForm({ ...form, threat_type: e.target.value })}>
              <option value="">— لا يوجد —</option>
              {THREAT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="درجة الخطورة">
            <Select value={form.threat_severity} onChange={(e) => setForm({ ...form, threat_severity: e.target.value })}>
              {THREAT_SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
          <Field label="الخادم المستهدف للتبديل"><TextInput value={form.failover_target_server} onChange={(e) => setForm({ ...form, failover_target_server: e.target.value })} placeholder="SRV-SHADOW-01" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="زمن التبديل (ms)"><TextInput type="number" value={form.failover_latency_ms} onChange={(e) => setForm({ ...form, failover_latency_ms: e.target.value })} /></Field>
          <Field label="موقع المزامنة الجغرافية"><TextInput value={form.geo_replication_site} onChange={(e) => setForm({ ...form, geo_replication_site: e.target.value })} placeholder="RIYADH-DR-SITE" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="هدف نقطة التعافي (RPO)"><TextInput value={form.recovery_point_objective} onChange={(e) => setForm({ ...form, recovery_point_objective: e.target.value })} placeholder="PT5M" /></Field>
          <Field label="هدف زمن التعافي (RTO)"><TextInput value={form.recovery_time_objective} onChange={(e) => setForm({ ...form, recovery_time_objective: e.target.value })} placeholder="PT15M" /></Field>
        </div>
        <div className="flex items-center gap-6 flex-wrap">
          <Checkbox checked={form.failover_triggered} onChange={(v: boolean) => setForm({ ...form, failover_triggered: v })} label="تبديل آلي مفعّل" />
          <Checkbox checked={form.war_room_activated} onChange={(v: boolean) => setForm({ ...form, war_room_activated: v })} label="غرفة حرب مفعّلة" />
          <Checkbox checked={form.air_gapped} onChange={(v: boolean) => setForm({ ...form, air_gapped: v })} label="مغلق هوائياً" />
          <Checkbox checked={form.active_active_sync} onChange={(v: boolean) => setForm({ ...form, active_active_sync: v })} label="مزامنة Active-Active" />
          <Checkbox checked={form.red_alert_issued} onChange={(v: boolean) => setForm({ ...form, red_alert_issued: v })} label="إنذار أحمر" />
          <Checkbox checked={form.api_ports_closed} onChange={(v: boolean) => setForm({ ...form, api_ports_closed: v })} label="إغلاق منافذ API" />
        </div>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
