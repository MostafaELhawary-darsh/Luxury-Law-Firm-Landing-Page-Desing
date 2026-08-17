import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, AlertTriangle,
  Shield, CircuitBoard, CheckCircle2, Clock, Search,
  Activity, AlertCircle, BadgeCheck, Building2, DollarSign,
  FileText, Scale, Cpu, Radio, Camera, MapPin, BellRing,
  HeartPulse, Eye, Wifi, Signal, Gauge, Lock, Server,
  Receipt,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M107IoTFile, M107AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'files' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  monitoring: { label: 'مراقبة', bg: 'bg-blue-50', text: 'text-blue-700' },
  alerting: { label: 'تنبيه', bg: 'bg-amber-50', text: 'text-amber-700' },
  triggered: { label: 'تفعيل', bg: 'bg-orange-50', text: 'text-orange-700' },
  dispatched: { label: 'إرسال', bg: 'bg-purple-50', text: 'text-purple-700' },
  resolved: { label: 'حل', bg: 'bg-green-50', text: 'text-green-700' },
  terminated: { label: 'إنهاء', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const STAGES = ['monitoring', 'alerting', 'triggered', 'dispatched', 'resolved', 'terminated'];

const FILE_TYPE_LABELS: Record<string, string> = {
  sensor: 'حساس',
  camera: 'كاميرا مراقبة',
  gps: 'تتبع جغرافي',
  alert: 'تنبيه استباقي',
  heartbeat: 'نبض الخادم',
  vision: 'رؤية حاسوبية',
};

const FILE_TYPE_ICONS: Record<string, typeof Cpu> = {
  sensor: Gauge,
  camera: Camera,
  gps: MapPin,
  alert: BellRing,
  heartbeat: HeartPulse,
  vision: Eye,
};

const PROTOCOL_TYPES = ['MQTT', 'CoAP', 'HTTP', 'LoRaWAN', 'Zigbee', 'NB-IoT', 'Modbus', 'OPC-UA'];
const ALERT_SEVERITIES = ['low', 'medium', 'high', 'critical'];
const HEARTBEAT_STATUSES = ['online', 'offline', 'degraded', 'maintenance'];

interface IoTFileForm {
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  device_name: string;
  device_type: string;
  device_serial: string;
  protocol_type: string;
  gps_coordinates: string;
  sensor_metric: string;
  sensor_value: string;
  threshold_min: string;
  threshold_max: string;
  alert_triggered: boolean;
  alert_severity: string;
  alert_timestamp: string;
  vision_analysis_ref: string;
  heartbeat_status: string;
  last_ping: string;
  encryption_protocol: string;
  failover_target: string;
  description: string;
}

const emptyForm: IoTFileForm = {
  file_number: '', file_title: '', file_type: 'sensor', stage: 'monitoring',
  device_name: '', device_type: '', device_serial: '',
  protocol_type: 'MQTT', gps_coordinates: '',
  sensor_metric: '', sensor_value: '0', threshold_min: '0', threshold_max: '0',
  alert_triggered: false, alert_severity: 'low', alert_timestamp: '',
  vision_analysis_ref: '', heartbeat_status: 'online', last_ping: '',
  encryption_protocol: 'AES-256', failover_target: '',
  description: '',
};

export default function IoTBridgeEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [files, setFiles] = useState<M107IoTFile[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('files');
  const [selectedFile, setSelectedFile] = useState<M107IoTFile | null>(null);
  const [auditLogs, setAuditLogs] = useState<M107AuditLog[]>([]);
  const [allAudit, setAllAudit] = useState<M107AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<IoTFileForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [fRes, attRes, auditRes] = await Promise.all([
      supabase.from('m107_iot_files')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m107_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (fRes.error) console.error('m107 fetch error', fRes.error);
    if (attRes.error) console.error('attorneys fetch error', attRes.error);
    if (auditRes.error) console.error('audit fetch error', auditRes.error);
    setFiles((fRes.data as M107IoTFile[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAudit((auditRes.data as M107AuditLog[]) || []);
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
    const { error } = await supabase.from('m107_audit_logs').insert({
      case_id: fileId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
    if (error) console.error('audit log error', error);
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (f: M107IoTFile) => {
    setForm({
      file_number: f.file_number, file_title: f.file_title,
      file_type: f.file_type, stage: f.stage,
      device_name: f.device_name || '', device_type: f.device_type || '',
      device_serial: f.device_serial || '',
      protocol_type: f.protocol_type || 'MQTT',
      gps_coordinates: f.gps_coordinates || '',
      sensor_metric: f.sensor_metric || '',
      sensor_value: String(f.sensor_value || 0),
      threshold_min: String(f.threshold_min || 0),
      threshold_max: String(f.threshold_max || 0),
      alert_triggered: !!f.alert_triggered,
      alert_severity: f.alert_severity || 'low',
      alert_timestamp: f.alert_timestamp || '',
      vision_analysis_ref: f.vision_analysis_ref || '',
      heartbeat_status: f.heartbeat_status || 'online',
      last_ping: f.last_ping || '',
      encryption_protocol: f.encryption_protocol || 'AES-256',
      failover_target: f.failover_target || '',
      description: f.description || '',
    });
    setEditingId(f.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.file_title.trim() || !form.file_number.trim()) return;
    setSaving(true);
    const sValue = Number(form.sensor_value) || 0;
    const tMin = Number(form.threshold_min) || 0;
    const tMax = Number(form.threshold_max) || 0;
    const payload = {
      file_number: form.file_number.trim(),
      file_title: form.file_title.trim(),
      file_type: form.file_type,
      stage: form.stage,
      status: form.stage === 'terminated' ? 'terminated' : 'active',
      device_name: form.device_name.trim() || null,
      device_type: form.device_type.trim() || null,
      device_serial: form.device_serial.trim() || null,
      protocol_type: form.protocol_type,
      gps_coordinates: form.gps_coordinates.trim() || null,
      sensor_metric: form.sensor_metric.trim() || null,
      sensor_value: sValue,
      threshold_min: tMin,
      threshold_max: tMax,
      alert_triggered: form.alert_triggered,
      alert_severity: form.alert_severity,
      alert_timestamp: form.alert_timestamp.trim() || null,
      vision_analysis_ref: form.vision_analysis_ref.trim() || null,
      heartbeat_status: form.heartbeat_status,
      last_ping: form.last_ping.trim() || null,
      encryption_protocol: form.encryption_protocol,
      failover_target: form.failover_target.trim() || null,
      description: form.description.trim() || null,
    };
    if (editingId) {
      const { error } = await supabase.from('m107_iot_files').update(payload).eq('id', editingId);
      if (error) console.error('update error', error);
      await logAudit(editingId, 'file_updated', 'تحديث بيانات ملف إنترنت الأشياء والرقابة الميدانية');
    } else {
      const { data, error } = await supabase.from('m107_iot_files').insert(payload).select('id');
      if (error) console.error('insert error', error);
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'file_created', 'إنشاء ملف IoT — النوع: ' + (FILE_TYPE_LABELS[form.file_type] || form.file_type));
        const needsCase = form.alert_triggered && (form.alert_severity === 'high' || form.alert_severity === 'critical');
        await supabase.from('m107_iot_files').update({
          m53_document_id: 'DOC-M107-' + Date.now().toString().slice(-6),
          m54_finance_linked: true,
          m91_hse_linked: true,
          m10_case_opened: needsCase,
          m109_biometric_signed: true,
          m92_notified: true,
          cost_center_id: 'CC-M107-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm53_document', 'أرشفة الملف في محرك المستندات (M53)');
        await logAudit(newId, 'm54_finance', 'ربط الملف بالمحرك المالي (M54) — تكاليف الأجهزة والبنية التحتية');
        await logAudit(newId, 'm91_hse', 'ربط الملف بمحرك السلامة والصحة المهنية (M91) — تنبيهات الحساسات الميدانية');
        if (needsCase) await logAudit(newId, 'm10_case', 'فتح القضية في المحرك الموحد (M10) — حادثة حرجة ميدانية');
        await logAudit(newId, 'm109_biometric', 'التوقيع البيومتري لبيانات الحساسات (M109)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء ملف IoT');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('m107_iot_files').delete().eq('id', deleteId);
    if (error) console.error('delete error', error);
    setDeleteId(null);
    setSelectedFile(null);
    fetchAll();
  };

  const openFileDetail = async (f: M107IoTFile) => {
    setSelectedFile(f);
    setDetailLoading(true);
    const aRes = await supabase.from('m107_audit_logs').select('*').eq('case_id', f.id).order('created_at', { ascending: true });
    if (aRes.error) console.error('detail audit error', aRes.error);
    setAuditLogs((aRes.data as M107AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (f: M107IoTFile) => {
    const idx = STAGES.indexOf(f.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    const { error } = await supabase.from('m107_iot_files').update({ stage: next, status: next === 'terminated' ? 'terminated' : 'active' }).eq('id', f.id);
    if (error) console.error('stage advance error', error);
    await logAudit(f.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedFile({ ...f, stage: next } as M107IoTFile);
  };

  const filteredFiles = files.filter((f) => {
    if (filterType !== 'all' && f.file_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!f.file_number.toLowerCase().includes(q) && !f.file_title.toLowerCase().includes(q) && !(f.device_name || '').toLowerCase().includes(q) && !(f.device_serial || '').toLowerCase().includes(q) && !(f.protocol_type || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeAlertsCount = files.filter((f) => f.alert_triggered).length;
  const devicesOnlineCount = files.filter((f) => f.heartbeat_status === 'online').length;
  const avgLatencyMs = files.length > 0
    ? Math.round(files.reduce((s, f) => s + (Number(f.sensor_value) || 0), 0) / files.length)
    : 0;

  const tabs: { id: Tab; label: string; icon: typeof Cpu; badge?: number }[] = [
    { id: 'files', label: 'ملفات إنترنت الأشياء والرقابة الميدانية', icon: Cpu, badge: files.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Cpu size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">إنترنت الأشياء والرقابة الميدانية السيادية (M107)</h2>
            <p className="font-body text-[10px] text-ink/40">ربط الحساسات الميدانية والرؤية الحاسوبية والأحداث الاستباقية</p>
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
        <StatCard icon={<Cpu size={14} className="text-midnight" />} label="إجمالي الملفات" value={String(files.length)} valueClass="text-midnight" />
        <StatCard icon={<BellRing size={14} className="text-orange-600" />} label="التنبيهات النشطة" value={String(activeAlertsCount)} valueClass="text-orange-700" />
        <StatCard icon={<Wifi size={14} className="text-green-600" />} label="الأجهزة المتصلة" value={String(devicesOnlineCount)} valueClass="text-green-700" />
        <StatCard icon={<Signal size={14} className="text-gold" />} label="متوسط زمن الاستجابة (ms)" value={String(avgLatencyMs)} valueClass="text-gold" />
      </div>

      {/* 6-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة ملف IoT — 6 مراحل</span>
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
            { icon: FileText, label: 'المستندات (M53)', desc: 'أرشفة بيانات الحساسات', color: 'text-purple-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'تكاليف الأجهزة والصيانة', color: 'text-gold' },
            { icon: Shield, label: 'السلامة المهنية (M91)', desc: 'تنبيهات الحساسات الميدانية', color: 'text-green-600' },
            { icon: Scale, label: 'نواة القضية (M10)', desc: 'الحوادث الحرجة', color: 'text-blue-600' },
            { icon: BadgeCheck, label: 'البيومتري (M109)', desc: 'توقيع بيانات IoT', color: 'text-green-600' },
            { icon: Activity, label: 'الوكيل الذكي (M92)', desc: 'تنبيهات الأجهزة', color: 'text-amber-600' },
            { icon: Cpu, label: 'الرقابة السيادية (M107)', desc: 'سيادة البيانات الميدانية', color: 'text-midnight' },
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
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم الملف أو الجهاز أو البروتوكول..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Files tab */}
      {activeTab === 'files' && (
        <div className="space-y-2">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Cpu size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد ملفات إنترنت أشياء مسجلة</p>
            </div>
          ) : (
            filteredFiles.map((f) => {
              const sCfg = STAGE_CONFIG[f.stage] || STAGE_CONFIG.monitoring;
              const stageIdx = STAGES.indexOf(f.stage);
              const TypeIcon = FILE_TYPE_ICONS[f.file_type] || Cpu;
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
                          {f.alert_triggered && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-orange-50 text-orange-600">
                              <BellRing size={8} /> تنبيه مُفعَّل
                            </span>
                          )}
                          {f.heartbeat_status === 'online' && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-green-50 text-green-600">
                              <Wifi size={8} /> متصل
                            </span>
                          )}
                          {f.heartbeat_status === 'offline' && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-red-50 text-red-600">
                              <Wifi size={8} /> غير متصل
                            </span>
                          )}
                          {f.file_type === 'vision' && f.vision_analysis_ref && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-indigo-50 text-indigo-600">
                              <Eye size={8} /> رؤية حاسوبية
                            </span>
                          )}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{f.file_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {f.device_name && <span className="font-body text-[9px] text-ink/40">الجهاز: {f.device_name}</span>}
                          {f.device_type && <span className="font-body text-[9px] text-ink/40">النوع: {f.device_type}</span>}
                          {f.device_serial && <span className="font-body text-[9px] text-ink/40">التسلسلي: {f.device_serial}</span>}
                          {f.protocol_type && <span className="font-body text-[9px] text-blue-600 font-bold">البروتوكول: {f.protocol_type}</span>}
                          {f.gps_coordinates && <span className="font-body text-[9px] text-green-600 font-bold">الإحداثيات: {f.gps_coordinates}</span>}
                          {f.sensor_metric && <span className="font-body text-[9px] text-ink/40">المقياس: {f.sensor_metric}</span>}
                          {f.encryption_protocol && <span className="font-body text-[9px] text-purple-600 font-bold">التشفير: {f.encryption_protocol}</span>}
                          {f.m53_document_id && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><FileText size={8} /> M53</span>}
                          {f.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {f.m91_hse_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-emerald-50 text-emerald-600"><Shield size={8} /> M91</span>}
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
                    {log.action.includes('created') ? <Cpu size={12} className="text-blue-600" />
                      : log.action.includes('m53') ? <FileText size={12} className="text-purple-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m91') ? <Shield size={12} className="text-emerald-600" />
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
                <Cpu size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف إنترنت الأشياء والرقابة الميدانية</span>
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

                {/* Device info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Cpu size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات الجهاز</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">اسم الجهاز</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.device_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نوع الجهاز</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.device_type || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الرقم التسلسلي</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.device_serial || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">البروتوكول</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.protocol_type || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الإحداثيات الجغرافية</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.gps_coordinates || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">حالة النبض</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.heartbeat_status || '—'}</p></div>
                  </div>
                </div>

                {/* Sensor metrics card */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Gauge size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">قراءات الحساس</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">المقياس</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.sensor_metric || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">القيمة</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.sensor_value ?? '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الحد الأدنى</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.threshold_min ?? '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الحد الأعلى</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.threshold_max ?? '—'}</p></div>
                  </div>
                </div>

                {/* Alert card */}
                <div className={`rounded-lg p-3 border ${selectedFile.alert_triggered ? 'bg-orange-50 border-orange-100' : 'bg-gray-100 border-gray-200'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <BellRing size={12} className={selectedFile.alert_triggered ? 'text-orange-600' : 'text-ink/40'} />
                    <span className="font-body text-[10px] font-bold text-midnight">حالة التنبيه الاستباقي</span>
                  </div>
                  <p className={`font-body text-xs font-bold ${selectedFile.alert_triggered ? 'text-orange-700' : 'text-ink/50'}`}>
                    {selectedFile.alert_triggered ? 'مُفعَّل — يتطلب متابعة ميدانية' : 'لا يوجد تنبيه'}
                  </p>
                  {selectedFile.alert_severity && (
                    <p className="font-body text-[10px] text-ink/50 mt-1">مستوى الخطورة: {selectedFile.alert_severity}</p>
                  )}
                  {selectedFile.alert_timestamp && (
                    <p className="font-body text-[10px] text-ink/50 mt-1">وقت التنبيه: {formatDate(selectedFile.alert_timestamp)}</p>
                  )}
                </div>

                {/* Vision analysis card */}
                {selectedFile.file_type === 'vision' && selectedFile.vision_analysis_ref && (
                  <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Eye size={12} className="text-indigo-600" />
                      <span className="font-body text-[10px] font-bold text-midnight">مرجع الرؤية الحاسوبية</span>
                    </div>
                    <p className="font-body text-xs font-bold text-indigo-700">{selectedFile.vision_analysis_ref}</p>
                  </div>
                )}

                {/* Security & failover card */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Lock size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">الأمن وتجاوز الفشل</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">بروتوكول التشفير</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.encryption_protocol || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">هدف تجاوز الفشل</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.failover_target || '—'}</p></div>
                    {selectedFile.last_ping && <div><span className="font-body text-[9px] text-ink/40">آخر نبضة</span><p className="font-body text-xs font-bold text-midnight">{formatDate(selectedFile.last_ping)}</p></div>}
                  </div>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m53_document_id ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> M53 {selectedFile.m53_document_id ? 'مؤرشف' : 'غير مؤرشف'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedFile.m54_finance_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m91_hse_linked ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-ink/30'}`}><Shield size={10} /> M91 {selectedFile.m91_hse_linked ? 'مربوط' : 'غير مربوط'}</span>
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
      <EntityModal open={modalOpen} title={editingId ? 'تعديل الملف' : 'ملف IoT جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الملف" required><TextInput value={form.file_number} onChange={(e) => setForm({ ...form, file_number: e.target.value })} placeholder="IOT-2025-001" /></Field>
          <Field label="نوع الملف">
            <Select value={form.file_type} onChange={(e) => setForm({ ...form, file_type: e.target.value })}>
              {Object.entries(FILE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان الملف" required><TextInput value={form.file_title} onChange={(e) => setForm({ ...form, file_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم الجهاز"><TextInput value={form.device_name} onChange={(e) => setForm({ ...form, device_name: e.target.value })} /></Field>
          <Field label="نوع الجهاز"><TextInput value={form.device_type} onChange={(e) => setForm({ ...form, device_type: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الرقم التسلسلي للجهاز"><TextInput value={form.device_serial} onChange={(e) => setForm({ ...form, device_serial: e.target.value })} /></Field>
          <Field label="البروتوكول">
            <Select value={form.protocol_type} onChange={(e) => setForm({ ...form, protocol_type: e.target.value })}>
              {PROTOCOL_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الإحداثيات الجغرافية (GPS)"><TextInput value={form.gps_coordinates} onChange={(e) => setForm({ ...form, gps_coordinates: e.target.value })} placeholder="24.7136,46.6753" /></Field>
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="مقياس الحساس"><TextInput value={form.sensor_metric} onChange={(e) => setForm({ ...form, sensor_metric: e.target.value })} placeholder="الحرارة، الرطوبة، الضغط..." /></Field>
          <Field label="قيمة الحساس"><TextInput type="number" value={form.sensor_value} onChange={(e) => setForm({ ...form, sensor_value: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الحد الأدنى"><TextInput type="number" value={form.threshold_min} onChange={(e) => setForm({ ...form, threshold_min: e.target.value })} /></Field>
          <Field label="الحد الأعلى"><TextInput type="number" value={form.threshold_max} onChange={(e) => setForm({ ...form, threshold_max: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="مستوى الخطورة">
            <Select value={form.alert_severity} onChange={(e) => setForm({ ...form, alert_severity: e.target.value })}>
              {ALERT_SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="حالة النبض">
            <Select value={form.heartbeat_status} onChange={(e) => setForm({ ...form, heartbeat_status: e.target.value })}>
              {HEARTBEAT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="وقت التنبيه"><TextInput value={form.alert_timestamp} onChange={(e) => setForm({ ...form, alert_timestamp: e.target.value })} placeholder="2025-01-15T10:30:00Z" /></Field>
          <Field label="مرجع الرؤية الحاسوبية"><TextInput value={form.vision_analysis_ref} onChange={(e) => setForm({ ...form, vision_analysis_ref: e.target.value })} placeholder="VISION-2025-001" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="بروتوكول التشفير"><TextInput value={form.encryption_protocol} onChange={(e) => setForm({ ...form, encryption_protocol: e.target.value })} /></Field>
          <Field label="هدف تجاوز الفشل"><TextInput value={form.failover_target} onChange={(e) => setForm({ ...form, failover_target: e.target.value })} placeholder="DR-Site-02" /></Field>
        </div>
        <div className="flex items-center gap-6 flex-wrap">
          <Checkbox checked={form.alert_triggered} onChange={(v: boolean) => setForm({ ...form, alert_triggered: v })} label="تنبيه مُفعَّل" />
        </div>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
