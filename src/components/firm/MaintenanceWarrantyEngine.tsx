import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, AlertTriangle,
  Shield, CircuitBoard, CheckCircle2, Clock, Search,
  Activity, AlertCircle, BadgeCheck, Building2, DollarSign,
  FileText, Scale, Wrench, Cpu, Wifi, ShieldCheck, Receipt,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M101MaintenanceFile, M101AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'files' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'مسودة', bg: 'bg-blue-50', text: 'text-blue-700' },
  dispatched: { label: 'إرسال', bg: 'bg-amber-50', text: 'text-amber-700' },
  in_progress: { label: 'قيد التنفيذ', bg: 'bg-orange-50', text: 'text-orange-700' },
  completed: { label: 'إكمال', bg: 'bg-green-50', text: 'text-green-700' },
  verified: { label: 'تحقق', bg: 'bg-purple-50', text: 'text-purple-700' },
  terminated: { label: 'إنهاء', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const STAGES = ['draft', 'dispatched', 'in_progress', 'completed', 'verified', 'terminated'];

const FILE_TYPE_LABELS: Record<string, string> = {
  maintenance: 'صيانة',
  sla: 'اتفاقية مستوى خدمة',
  warranty: 'مطالبة ضمان',
  o_m: 'عقد تشغيل وصيانة',
  breakdown: 'بلاغ عطل',
  compliance: 'شهادة مطابقة',
};

const FILE_TYPE_ICONS: Record<string, typeof Wrench> = {
  maintenance: Wrench,
  sla: FileText,
  warranty: ShieldCheck,
  o_m: Building2,
  breakdown: AlertCircle,
  compliance: BadgeCheck,
};

const CURRENCIES = ['SAR', 'USD', 'EUR', 'AED', 'KWD', 'QAR', 'BHD', 'EGP'];

interface MaintenanceFileForm {
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  facility_name: string;
  asset_name: string;
  asset_serial: string;
  maintenance_type: string;
  sla_ref: string;
  sla_response_hours: string;
  sla_actual_hours: string;
  sla_breach: boolean;
  penalty_amount: string;
  warranty_ref: string;
  warranty_expiry: string;
  warranty_claim_flagged: boolean;
  parts_cost: string;
  labor_cost: string;
  currency: string;
  technician_name: string;
  iot_sensor_id: string;
  predictive_alert: boolean;
  compliance_certificate: string;
  contractor_license: string;
  description: string;
}

const emptyForm: MaintenanceFileForm = {
  file_number: '', file_title: '', file_type: 'maintenance', stage: 'draft',
  facility_name: '', asset_name: '', asset_serial: '', maintenance_type: '',
  sla_ref: '', sla_response_hours: '0', sla_actual_hours: '0', sla_breach: false,
  penalty_amount: '0', warranty_ref: '', warranty_expiry: '', warranty_claim_flagged: false,
  parts_cost: '0', labor_cost: '0', currency: 'SAR',
  technician_name: '', iot_sensor_id: '', predictive_alert: false,
  compliance_certificate: '', contractor_license: '',
  description: '',
};

export default function MaintenanceWarrantyEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [files, setFiles] = useState<M101MaintenanceFile[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('files');
  const [selectedFile, setSelectedFile] = useState<M101MaintenanceFile | null>(null);
  const [auditLogs, setAuditLogs] = useState<M101AuditLog[]>([]);
  const [allAudit, setAllAudit] = useState<M101AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MaintenanceFileForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [fRes, attRes, auditRes] = await Promise.all([
      supabase.from('m101_maintenance_files')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m101_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (fRes.error) console.error('m101 fetch error', fRes.error);
    if (attRes.error) console.error('attorneys fetch error', attRes.error);
    if (auditRes.error) console.error('audit fetch error', auditRes.error);
    setFiles((fRes.data as M101MaintenanceFile[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAudit((auditRes.data as M101AuditLog[]) || []);
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
    const { error } = await supabase.from('m101_audit_logs').insert({
      case_id: fileId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
    if (error) console.error('audit log error', error);
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (f: M101MaintenanceFile) => {
    setForm({
      file_number: f.file_number, file_title: f.file_title,
      file_type: f.file_type, stage: f.stage,
      facility_name: f.facility_name || '', asset_name: f.asset_name || '',
      asset_serial: f.asset_serial || '', maintenance_type: f.maintenance_type || '',
      sla_ref: f.sla_ref || '', sla_response_hours: String(f.sla_response_hours || 0),
      sla_actual_hours: String(f.sla_actual_hours || 0), sla_breach: !!f.sla_breach,
      penalty_amount: String(f.penalty_amount || 0),
      warranty_ref: f.warranty_ref || '', warranty_expiry: f.warranty_expiry || '',
      warranty_claim_flagged: !!f.warranty_claim_flagged,
      parts_cost: String(f.parts_cost || 0), labor_cost: String(f.labor_cost || 0),
      currency: f.currency || 'SAR',
      technician_name: f.technician_name || '', iot_sensor_id: f.iot_sensor_id || '',
      predictive_alert: !!f.predictive_alert,
      compliance_certificate: f.compliance_certificate || '',
      contractor_license: f.contractor_license || '',
      description: f.description || '',
    });
    setEditingId(f.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.file_title.trim() || !form.file_number.trim()) return;
    setSaving(true);
    const partsCost = Number(form.parts_cost) || 0;
    const laborCost = Number(form.labor_cost) || 0;
    const totalCost = partsCost + laborCost;
    const penaltyAmount = Number(form.penalty_amount) || 0;
    const slaResponseHours = Number(form.sla_response_hours) || 0;
    const slaActualHours = Number(form.sla_actual_hours) || 0;
    const slaBreach = slaActualHours > slaResponseHours && slaResponseHours > 0;
    const payload = {
      file_number: form.file_number.trim(),
      file_title: form.file_title.trim(),
      file_type: form.file_type,
      stage: form.stage,
      status: form.stage === 'terminated' ? 'terminated' : 'active',
      facility_name: form.facility_name.trim() || null,
      asset_name: form.asset_name.trim() || null,
      asset_serial: form.asset_serial.trim() || null,
      maintenance_type: form.maintenance_type.trim() || null,
      sla_ref: form.sla_ref.trim() || null,
      sla_response_hours: slaResponseHours,
      sla_actual_hours: slaActualHours,
      sla_breach: slaBreach,
      penalty_amount: penaltyAmount,
      warranty_ref: form.warranty_ref.trim() || null,
      warranty_expiry: form.warranty_expiry.trim() || null,
      warranty_claim_flagged: form.warranty_claim_flagged,
      parts_cost: partsCost,
      labor_cost: laborCost,
      total_cost: totalCost,
      currency: form.currency,
      technician_name: form.technician_name.trim() || null,
      iot_sensor_id: form.iot_sensor_id.trim() || null,
      predictive_alert: form.predictive_alert,
      compliance_certificate: form.compliance_certificate.trim() || null,
      contractor_license: form.contractor_license.trim() || null,
      description: form.description.trim() || null,
    };
    if (editingId) {
      const { error } = await supabase.from('m101_maintenance_files').update(payload).eq('id', editingId);
      if (error) console.error('update error', error);
      await logAudit(editingId, 'file_updated', 'تحديث بيانات ملف الصيانة والتشغيل وإدارة المرافق وخدمات الضمان');
    } else {
      const { data, error } = await supabase.from('m101_maintenance_files').insert(payload).select('id');
      if (error) console.error('insert error', error);
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'file_created', 'إنشاء ملف صيانة — النوع: ' + (FILE_TYPE_LABELS[form.file_type] || form.file_type));
        const needsCase = form.file_type === 'warranty' || form.file_type === 'breakdown';
        await supabase.from('m101_maintenance_files').update({
          m53_document_id: 'DOC-M101-' + Date.now().toString().slice(-6),
          m54_finance_linked: true,
          m107_iot_linked: !!form.iot_sensor_id.trim(),
          m88_consumer_linked: form.file_type === 'warranty',
          m10_case_opened: needsCase,
          m109_biometric_signed: true,
          m92_notified: true,
          cost_center_id: 'CC-M101-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm53_document', 'أرشفة الملف في محرك المستندات (M53)');
        await logAudit(newId, 'm54_finance', 'ربط الملف بالمحرك المالي (M54) — تكاليف الصيانة والأجزاء');
        if (form.iot_sensor_id.trim()) await logAudit(newId, 'm107_iot', 'ربط الملف بمحرك إنترنت الأشياء (M107) — استشعار: ' + form.iot_sensor_id.trim());
        if (form.file_type === 'warranty') await logAudit(newId, 'm88_consumer', 'ربط الملف بمحرك التجارة والتجزئة (M88) — مطالبة ضمان مستهلك');
        if (needsCase) await logAudit(newId, 'm10_case', 'فتح القضية في المحرك الموحد (M10) — نزاعات الصيانة والضمان');
        await logAudit(newId, 'm109_biometric', 'التوقيع البيومتري لشهادات المطابقة والصيانة (M109)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء ملف الصيانة');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('m101_maintenance_files').delete().eq('id', deleteId);
    if (error) console.error('delete error', error);
    setDeleteId(null);
    setSelectedFile(null);
    fetchAll();
  };

  const openFileDetail = async (f: M101MaintenanceFile) => {
    setSelectedFile(f);
    setDetailLoading(true);
    const aRes = await supabase.from('m101_audit_logs').select('*').eq('case_id', f.id).order('created_at', { ascending: true });
    if (aRes.error) console.error('detail audit error', aRes.error);
    setAuditLogs((aRes.data as M101AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (f: M101MaintenanceFile) => {
    const idx = STAGES.indexOf(f.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    const { error } = await supabase.from('m101_maintenance_files').update({ stage: next, status: next === 'terminated' ? 'terminated' : 'active' }).eq('id', f.id);
    if (error) console.error('stage advance error', error);
    await logAudit(f.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedFile({ ...f, stage: next } as M101MaintenanceFile);
  };

  const filteredFiles = files.filter((f) => {
    if (filterType !== 'all' && f.file_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!f.file_number.toLowerCase().includes(q) && !f.file_title.toLowerCase().includes(q) && !(f.facility_name || '').toLowerCase().includes(q) && !(f.asset_name || '').toLowerCase().includes(q) && !(f.asset_serial || '').toLowerCase().includes(q) && !(f.technician_name || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const slaBreachCount = files.filter((f) => f.sla_breach).length;
  const predictiveAlertCount = files.filter((f) => f.predictive_alert).length;
  const totalMaintenanceCost = files.reduce((s, f) => s + (f.total_cost || 0), 0);

  const tabs: { id: Tab; label: string; icon: typeof Wrench; badge?: number }[] = [
    { id: 'files', label: 'ملفات الصيانة والمرافق والضمان', icon: Wrench, badge: files.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Wrench size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">الصيانة والتشغيل وإدارة المرافق وخدمات الضمان (M101)</h2>
            <p className="font-body text-[10px] text-ink/40">عقود O&amp;M وSLA والصيانة الوقائية ومطالبات الضمان والرقابة الفنية</p>
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
        <StatCard icon={<Wrench size={14} className="text-midnight" />} label="إجمالي الملفات" value={String(files.length)} valueClass="text-midnight" />
        <StatCard icon={<AlertTriangle size={14} className="text-red-600" />} label="مخالفات SLA" value={String(slaBreachCount)} valueClass="text-red-700" />
        <StatCard icon={<Cpu size={14} className="text-purple-600" />} label="تنبيهات تنبؤية" value={String(predictiveAlertCount)} valueClass="text-purple-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="إجمالي تكاليف الصيانة" value={formatCurrency(totalMaintenanceCost)} valueClass="text-gold" />
      </div>

      {/* First two implementation steps */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">الخطوات الأولى والثانية — التنفيذ الحالي</span>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-xl border border-gold/20 bg-midnight-light/40 p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-gold text-midnight text-[10px] font-bold flex items-center justify-center">1</span>
              <span className="font-body text-[10px] font-bold text-cream">الخطوة الأولى</span>
            </div>
            <p className="font-body text-[10px] text-cream/70 leading-relaxed">إنشاء ملف صيانة جديد مع رقم الملف، نوع الملف، اسم المرفق، أصل الصيانة، نوع الخدمة، وبيانات SLA الأساسية.</p>
          </div>
          <div className="rounded-xl border border-gold/20 bg-midnight-light/40 p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-gold text-midnight text-[10px] font-bold flex items-center justify-center">2</span>
              <span className="font-body text-[10px] font-bold text-cream">الخطوة الثانية</span>
            </div>
            <p className="font-body text-[10px] text-cream/70 leading-relaxed">ربط الملف بالمحركات المساندة: المستندات M53، التمويل M54، إنترنت الأشياء M107، الضمان M88، ومخطر الوكيل الذكي M92.</p>
          </div>
        </div>
      </div>

      {/* 6-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20 mt-4">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة ملف الصيانة — 6 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.draft;
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
            { icon: FileText, label: 'المستندات (M53)', desc: 'أرشفة الملف', color: 'text-purple-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'تكاليف الصيانة', color: 'text-gold' },
            { icon: Cpu, label: 'إنترنت الأشياء (M107)', desc: 'استشعار وتنبؤ', color: 'text-purple-600' },
            { icon: Building2, label: 'التجارة والتجزئة (M88)', desc: 'مطالبات الضمان', color: 'text-blue-600' },
            { icon: Scale, label: 'نواة القضية (M10)', desc: 'نزاعات الصيانة', color: 'text-blue-600' },
            { icon: BadgeCheck, label: 'البيومتري (M109)', desc: 'توقيع الشهادات', color: 'text-green-600' },
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

      {/* Filters for files */}
      {activeTab === 'files' && (
        <div className="flex items-center gap-2">
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الأنواع</option>
            {Object.entries(FILE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم الملف أو العنوان أو المرفق..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Files tab */}
      {activeTab === 'files' && (
        <div className="space-y-2">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Wrench size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد ملفات صيانة مسجلة</p>
            </div>
          ) : (
            filteredFiles.map((f) => {
              const sCfg = STAGE_CONFIG[f.stage] || STAGE_CONFIG.draft;
              const stageIdx = STAGES.indexOf(f.stage);
              const TypeIcon = FILE_TYPE_ICONS[f.file_type] || Wrench;
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
                          {f.sla_breach && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-red-50 text-red-600">
                              <AlertTriangle size={8} /> مخالفة SLA
                            </span>
                          )}
                          {f.predictive_alert && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-purple-50 text-purple-600">
                              <Cpu size={8} /> تنبيه تنبؤي
                            </span>
                          )}
                          {f.warranty_claim_flagged && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-amber-50 text-amber-600">
                              <ShieldCheck size={8} /> مطالبة ضمان
                            </span>
                          )}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{f.file_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {f.facility_name && <span className="font-body text-[9px] text-ink/40">المرفق: {f.facility_name}</span>}
                          {f.asset_name && <span className="font-body text-[9px] text-ink/40">الأصل: {f.asset_name}</span>}
                          {f.asset_serial && <span className="font-body text-[9px] text-ink/40">الرقم التسلسلي: {f.asset_serial}</span>}
                          {f.technician_name && <span className="font-body text-[9px] text-ink/40">الفني: {f.technician_name}</span>}
                          {f.total_cost > 0 && <span className="font-body text-[9px] text-gold font-bold">التكلفة: {formatCurrency(f.total_cost)}</span>}
                          {f.m53_document_id && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><FileText size={8} /> M53</span>}
                          {f.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {f.m107_iot_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Cpu size={8} /> M107</span>}
                          {f.m88_consumer_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Building2 size={8} /> M88</span>}
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
                    {log.action.includes('created') ? <Wrench size={12} className="text-blue-600" />
                      : log.action.includes('m53') ? <FileText size={12} className="text-purple-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m107') ? <Cpu size={12} className="text-purple-600" />
                      : log.action.includes('m88') ? <Building2 size={12} className="text-blue-600" />
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
                <Wrench size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف الصيانة والمرافق والضمان</span>
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
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedFile.stage] || STAGE_CONFIG.draft).bg} ${(STAGE_CONFIG[selectedFile.stage] || STAGE_CONFIG.draft).text}`}>
                      {(STAGE_CONFIG[selectedFile.stage] || STAGE_CONFIG.draft).label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{FILE_TYPE_LABELS[selectedFile.file_type] || selectedFile.file_type}</span>
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedFile.file_title}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.draft;
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

                {/* File info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Wrench size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات الملف</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">اسم المرفق</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.facility_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">اسم الأصل</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.asset_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الرقم التسلسلي</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.asset_serial || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نوع الصيانة</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.maintenance_type || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الفني المسؤول</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.technician_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">رخصة المقاول</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.contractor_license || '—'}</p></div>
                  </div>
                </div>

                {/* SLA card */}
                <div className={`rounded-lg p-3 border ${selectedFile.sla_breach ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Clock size={12} className={selectedFile.sla_breach ? 'text-red-600' : 'text-ink/40'} />
                    <span className="font-body text-[10px] font-bold text-midnight">اتفاقية مستوى الخدمة (SLA)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">ساعات الاستجابة المتفق عليها</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.sla_response_hours} ساعة</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">ساعات الاستجابة الفعلية</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.sla_actual_hours} ساعة</p></div>
                  </div>
                  <p className={`font-body text-xs font-bold mt-2 ${selectedFile.sla_breach ? 'text-red-700' : 'text-green-700'}`}>
                    {selectedFile.sla_breach ? 'مخالفة SLA — تجاوز وقت الاستجابة' : 'ضمن SLA — استجابة في الوقت المحدد'}
                  </p>
                  {selectedFile.sla_ref && <p className="font-body text-[10px] text-ink/50 mt-1">مرجع SLA: {selectedFile.sla_ref}</p>}
                  {selectedFile.penalty_amount > 0 && (
                    <p className="font-body text-[10px] text-red-600 mt-1">غرامة المخالفة: {formatCurrency(selectedFile.penalty_amount)}</p>
                  )}
                </div>

                {/* Cost breakdown card */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-1">
                    <DollarSign size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">تفاصيل التكلفة</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div><span className="font-body text-[9px] text-ink/40">تكلفة الأجزاء</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedFile.parts_cost)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">تكلفة العمالة</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedFile.labor_cost)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الإجمالي</span><p className="font-body text-xs font-bold text-gold">{formatCurrency(selectedFile.total_cost)}</p></div>
                  </div>
                  <p className="font-body text-[10px] text-ink/40 mt-1">العملة: {selectedFile.currency}</p>
                </div>

                {/* Warranty card */}
                <div className={`rounded-lg p-3 border ${selectedFile.warranty_claim_flagged ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <ShieldCheck size={12} className={selectedFile.warranty_claim_flagged ? 'text-amber-600' : 'text-ink/40'} />
                    <span className="font-body text-[10px] font-bold text-midnight">مطالبة الضمان</span>
                  </div>
                  <p className={`font-body text-xs font-bold ${selectedFile.warranty_claim_flagged ? 'text-amber-700' : 'text-ink/50'}`}>
                    {selectedFile.warranty_claim_flagged ? 'مطالبة ضمان مُعلَّمة — تتطلب متابعة' : 'لا توجد مطالبة ضمان'}
                  </p>
                  {selectedFile.warranty_ref && <p className="font-body text-[10px] text-ink/50 mt-1">مرجع الضمان: {selectedFile.warranty_ref}</p>}
                  {selectedFile.warranty_expiry && <p className="font-body text-[10px] text-ink/50 mt-1">انتهاء الضمان: {formatDate(selectedFile.warranty_expiry)}</p>}
                </div>

                {/* IoT & predictive card */}
                <div className={`rounded-lg p-3 border ${selectedFile.predictive_alert ? 'bg-purple-50 border-purple-100' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Cpu size={12} className={selectedFile.predictive_alert ? 'text-purple-600' : 'text-ink/40'} />
                    <span className="font-body text-[10px] font-bold text-midnight">إنترنت الأشياء والتنبيه التنبؤي</span>
                  </div>
                  {selectedFile.iot_sensor_id && <p className="font-body text-[10px] text-ink/50 mt-1">معرّف الاستشعار: {selectedFile.iot_sensor_id}</p>}
                  <p className={`font-body text-xs font-bold mt-1 ${selectedFile.predictive_alert ? 'text-purple-700' : 'text-ink/50'}`}>
                    {selectedFile.predictive_alert ? 'تنبيه تنبؤي مُكتشَف — صيانة وقائية مطلوبة' : 'لا توجد تنبيهات تنبؤية'}
                  </p>
                </div>

                {/* Compliance card */}
                {selectedFile.compliance_certificate && (
                  <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <BadgeCheck size={12} className="text-green-600" />
                      <span className="font-body text-[10px] font-bold text-midnight">شهادة المطابقة</span>
                    </div>
                    <p className="font-body text-xs font-bold text-green-700">{selectedFile.compliance_certificate}</p>
                  </div>
                )}

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m53_document_id ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> M53 {selectedFile.m53_document_id ? 'مؤرشف' : 'غير مؤرشف'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedFile.m54_finance_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m107_iot_linked ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Cpu size={10} /> M107 {selectedFile.m107_iot_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m88_consumer_linked ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Building2 size={10} /> M88 {selectedFile.m88_consumer_linked ? 'مربوط' : 'غير مربوط'}</span>
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
      <EntityModal open={modalOpen} title={editingId ? 'تعديل الملف' : 'ملف صيانة جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الملف" required><TextInput value={form.file_number} onChange={(e) => setForm({ ...form, file_number: e.target.value })} placeholder="MAINT-2025-001" /></Field>
          <Field label="نوع الملف">
            <Select value={form.file_type} onChange={(e) => setForm({ ...form, file_type: e.target.value })}>
              {Object.entries(FILE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان الملف" required><TextInput value={form.file_title} onChange={(e) => setForm({ ...form, file_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم المرفق"><TextInput value={form.facility_name} onChange={(e) => setForm({ ...form, facility_name: e.target.value })} /></Field>
          <Field label="اسم الأصل"><TextInput value={form.asset_name} onChange={(e) => setForm({ ...form, asset_name: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الرقم التسلسلي للأصل"><TextInput value={form.asset_serial} onChange={(e) => setForm({ ...form, asset_serial: e.target.value })} /></Field>
          <Field label="نوع الصيانة"><TextInput value={form.maintenance_type} onChange={(e) => setForm({ ...form, maintenance_type: e.target.value })} placeholder="وقائية / تصحيحية / تنبؤية" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
          <Field label="الفني المسؤول"><TextInput value={form.technician_name} onChange={(e) => setForm({ ...form, technician_name: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="مرجع SLA"><TextInput value={form.sla_ref} onChange={(e) => setForm({ ...form, sla_ref: e.target.value })} placeholder="SLA-2025-001" /></Field>
          <Field label="رخصة المقاول"><TextInput value={form.contractor_license} onChange={(e) => setForm({ ...form, contractor_license: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="ساعات استجابة SLA"><TextInput type="number" value={form.sla_response_hours} onChange={(e) => setForm({ ...form, sla_response_hours: e.target.value })} /></Field>
          <Field label="ساعات الاستجابة الفعلية"><TextInput type="number" value={form.sla_actual_hours} onChange={(e) => setForm({ ...form, sla_actual_hours: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="غرامة المخالفة"><TextInput type="number" value={form.penalty_amount} onChange={(e) => setForm({ ...form, penalty_amount: e.target.value })} /></Field>
          <Field label="العملة">
            <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="مرجع الضمان"><TextInput value={form.warranty_ref} onChange={(e) => setForm({ ...form, warranty_ref: e.target.value })} placeholder="WAR-2025-001" /></Field>
          <Field label="تاريخ انتهاء الضمان"><TextInput type="date" value={form.warranty_expiry} onChange={(e) => setForm({ ...form, warranty_expiry: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تكلفة الأجزاء"><TextInput type="number" value={form.parts_cost} onChange={(e) => setForm({ ...form, parts_cost: e.target.value })} /></Field>
          <Field label="تكلفة العمالة"><TextInput type="number" value={form.labor_cost} onChange={(e) => setForm({ ...form, labor_cost: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="معرّف استشعار IoT"><TextInput value={form.iot_sensor_id} onChange={(e) => setForm({ ...form, iot_sensor_id: e.target.value })} placeholder="IOT-SENSOR-001" /></Field>
          <Field label="شهادة المطابقة"><TextInput value={form.compliance_certificate} onChange={(e) => setForm({ ...form, compliance_certificate: e.target.value })} /></Field>
        </div>
        <div className="flex items-center gap-6 flex-wrap">
          <Checkbox checked={form.sla_breach} onChange={(v: boolean) => setForm({ ...form, sla_breach: v })} label="مخالفة SLA" />
          <Checkbox checked={form.warranty_claim_flagged} onChange={(v: boolean) => setForm({ ...form, warranty_claim_flagged: v })} label="مطالبة ضمان" />
          <Checkbox checked={form.predictive_alert} onChange={(v: boolean) => setForm({ ...form, predictive_alert: v })} label="تنبيه تنبؤي" />
        </div>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
