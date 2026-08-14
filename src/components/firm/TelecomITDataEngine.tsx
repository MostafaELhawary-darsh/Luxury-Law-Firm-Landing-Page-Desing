import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, AlertTriangle,
  Shield, CircuitBoard, Zap, CheckCircle2, Clock, ArrowRight, Search,
  Activity, Server, AlertCircle, BadgeCheck, Building2, DollarSign,
  FileText, Scale, Gavel, Users, Briefcase, Radio, Lock, Database,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M82TelecomFile, M82AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'files' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'مسودة', bg: 'bg-blue-50', text: 'text-blue-700' },
  reviewed: { label: 'مراجعة', bg: 'bg-amber-50', text: 'text-amber-700' },
  compliance_checked: { label: 'فحص الامتثال', bg: 'bg-orange-50', text: 'text-orange-700' },
  approved: { label: 'اعتماد', bg: 'bg-purple-50', text: 'text-purple-700' },
  executed: { label: 'تنفيذ', bg: 'bg-green-50', text: 'text-green-700' },
  terminated: { label: 'إنهاء', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const STAGES = ['draft', 'reviewed', 'compliance_checked', 'approved', 'executed', 'terminated'];

const FILE_TYPE_LABELS: Record<string, string> = {
  license: 'ترخيص NTRA',
  sla: 'اتفاقية SLA',
  saas: 'ترخيص SaaS',
  dpa: 'اتفاقية معالجة بيانات',
  data_breach: 'خرق بيانات',
  ip_protection: 'حماية ملكية فكرية',
};

const FILE_TYPE_ICONS: Record<string, typeof Building2> = {
  license: Radio,
  sla: Server,
  saas: Database,
  dpa: Lock,
  data_breach: AlertTriangle,
  ip_protection: Scale,
};

const LICENSE_TYPE_LABELS: Record<string, string> = {
  none: 'لا يوجد',
  telecom_operator: 'مشغل اتصالات',
  isp: 'مزود خدمة إنترنت',
  voip: 'خدمة VoIP',
  data_center: 'مركز بيانات',
  cloud_provider: 'مزود سحابة',
};

const CURRENCIES = ['SAR', 'USD', 'EUR', 'AED', 'KWD', 'QAR', 'BHD', 'EGP'];

interface TelecomFileForm {
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  provider_name: string;
  license_type: string;
  license_number: string;
  ntra_ref: string;
  sla_metrics: string;
  sla_breach: boolean;
  contract_value: string;
  currency: string;
  dpo_assigned: boolean;
  gdpr_compliance: boolean;
  dpa_ref: string;
  ip_protection_ref: string;
  data_breach_reported: boolean;
  description: string;
}

const emptyForm: TelecomFileForm = {
  file_number: '', file_title: '', file_type: 'license', stage: 'draft',
  provider_name: '', license_type: 'none', license_number: '', ntra_ref: '',
  sla_metrics: '', sla_breach: false, contract_value: '0', currency: 'SAR',
  dpo_assigned: false, gdpr_compliance: false, dpa_ref: '',
  ip_protection_ref: '', data_breach_reported: false,
  description: '',
};

export default function TelecomITDataEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [files, setFiles] = useState<M82TelecomFile[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('files');
  const [selectedFile, setSelectedFile] = useState<M82TelecomFile | null>(null);
  const [auditLogs, setAuditLogs] = useState<M82AuditLog[]>([]);
  const [allAudit, setAllAudit] = useState<M82AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TelecomFileForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [fRes, attRes, auditRes] = await Promise.all([
      supabase.from('m82_telecom_files')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m82_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (fRes.error) console.error('m82 fetch error', fRes.error);
    if (attRes.error) console.error('attorneys fetch error', attRes.error);
    if (auditRes.error) console.error('audit fetch error', auditRes.error);
    setFiles((fRes.data as M82TelecomFile[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAudit((auditRes.data as M82AuditLog[]) || []);
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
    const { error } = await supabase.from('m82_audit_logs').insert({
      case_id: fileId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
    if (error) console.error('audit log error', error);
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (f: M82TelecomFile) => {
    setForm({
      file_number: f.file_number, file_title: f.file_title,
      file_type: f.file_type, stage: f.stage,
      provider_name: f.provider_name || '', license_type: f.license_type || 'none',
      license_number: f.license_number || '', ntra_ref: f.ntra_ref || '',
      sla_metrics: f.sla_metrics || '', sla_breach: !!f.sla_breach,
      contract_value: String(f.contract_value || 0), currency: f.currency || 'SAR',
      dpo_assigned: !!f.dpo_assigned, gdpr_compliance: !!f.gdpr_compliance,
      dpa_ref: f.dpa_ref || '', ip_protection_ref: f.ip_protection_ref || '',
      data_breach_reported: !!f.data_breach_reported, description: f.description || '',
    });
    setEditingId(f.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.file_title.trim() || !form.file_number.trim()) return;
    setSaving(true);
    const value = Number(form.contract_value) || 0;
    const payload = {
      file_number: form.file_number.trim(),
      file_title: form.file_title.trim(),
      file_type: form.file_type,
      stage: form.stage,
      status: form.stage === 'terminated' ? 'terminated' : 'active',
      provider_name: form.provider_name.trim() || null,
      license_type: form.license_type,
      license_number: form.license_number.trim() || null,
      ntra_ref: form.ntra_ref.trim() || null,
      sla_metrics: form.sla_metrics.trim() || null,
      sla_breach: form.sla_breach,
      contract_value: value,
      currency: form.currency,
      dpo_assigned: form.dpo_assigned,
      gdpr_compliance: form.gdpr_compliance,
      dpa_ref: form.dpa_ref.trim() || null,
      ip_protection_ref: form.ip_protection_ref.trim() || null,
      data_breach_reported: form.data_breach_reported,
      description: form.description.trim() || null,
    };
    if (editingId) {
      const { error } = await supabase.from('m82_telecom_files').update(payload).eq('id', editingId);
      if (error) console.error('update error', error);
      await logAudit(editingId, 'file_updated', 'تحديث بيانات ملف الاتصالات وتكنولوجيا المعلومات');
    } else {
      const { data, error } = await supabase.from('m82_telecom_files').insert(payload).select('id');
      if (error) console.error('insert error', error);
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'file_created', 'إنشاء ملف اتصالات وتكنولوجيا معلومات — النوع: ' + (FILE_TYPE_LABELS[form.file_type] || form.file_type));
        const needsCase = form.file_type === 'data_breach' || form.file_type === 'ip_protection';
        const ts = Date.now().toString().slice(-6);
        await supabase.from('m82_telecom_files').update({
          m53_document_id: 'DOC-M82-' + ts,
          m54_finance_linked: true,
          m14_cyber_linked: true,
          m10_case_opened: needsCase,
          m109_biometric_signed: true,
          m92_notified: true,
          cost_center_id: 'CC-M82-' + ts,
        }).eq('id', newId);
        await logAudit(newId, 'm53_document', 'أرشفة الملف في محرك المستندات (M53)');
        await logAudit(newId, 'm54_finance', 'ربط الملف بالمحرك المالي (M54)');
        await logAudit(newId, 'm14_cyber', 'ربط الملف بمحرك الأمن السيبراني (M14) — إلزامي للاتصالات');
        if (needsCase) await logAudit(newId, 'm10_case', 'فتح القضية في المحرك الموحد (M10) — خرق بيانات / حماية ملكية فكرية');
        await logAudit(newId, 'm109_biometric', 'التوقيع البيومتري للمسؤولين (M109)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء الملف');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('m82_telecom_files').delete().eq('id', deleteId);
    if (error) console.error('delete error', error);
    setDeleteId(null);
    setSelectedFile(null);
    fetchAll();
  };

  const openFileDetail = async (f: M82TelecomFile) => {
    setSelectedFile(f);
    setDetailLoading(true);
    const aRes = await supabase.from('m82_audit_logs').select('*').eq('case_id', f.id).order('created_at', { ascending: true });
    if (aRes.error) console.error('detail audit error', aRes.error);
    setAuditLogs((aRes.data as M82AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (f: M82TelecomFile) => {
    const idx = STAGES.indexOf(f.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    const { error } = await supabase.from('m82_telecom_files').update({ stage: next, status: next === 'terminated' ? 'terminated' : 'active' }).eq('id', f.id);
    if (error) console.error('stage advance error', error);
    await logAudit(f.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedFile({ ...f, stage: next } as M82TelecomFile);
  };

  const filteredFiles = files.filter((f) => {
    if (filterType !== 'all' && f.file_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!f.file_number.toLowerCase().includes(q) && !f.file_title.toLowerCase().includes(q) && !(f.provider_name || '').toLowerCase().includes(q) && !(f.license_number || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const slaBreachCount = files.filter((f) => f.sla_breach).length;
  const gdprNonCompliantCount = files.filter((f) => !f.gdpr_compliance).length;
  const totalContractValue = files.reduce((s, f) => s + (f.contract_value || 0), 0);

  const tabs: { id: Tab; label: string; icon: typeof Building2; badge?: number }[] = [
    { id: 'files', label: 'ملفات الاتصالات وتكنولوجيا المعلومات', icon: Radio, badge: files.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Radio size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">شركات الاتصالات وتكنولوجيا المعلومات وحماية البيانات (M82)</h2>
            <p className="font-body text-[10px] text-ink/40">إدارة التراخيص التنظيمية واتفاقيات الخدمة وحماية الخصوصية والامتثال الرقمي</p>
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
        <StatCard icon={<Radio size={14} className="text-midnight" />} label="إجمالي الملفات" value={String(files.length)} valueClass="text-midnight" />
        <StatCard icon={<AlertTriangle size={14} className="text-red-600" />} label="اختراقات SLA" value={String(slaBreachCount)} valueClass="text-red-700" />
        <StatCard icon={<Lock size={14} className="text-orange-600" />} label="غير ملتزم بـ GDPR" value={String(gdprNonCompliantCount)} valueClass="text-orange-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="إجمالي قيمة العقود" value={formatCurrency(totalContractValue)} valueClass="text-gold" />
      </div>

      {/* 6-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة ملف الاتصالات والبيانات — 6 مراحل</span>
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
            { icon: FileText, label: 'المستندات (M53)', desc: 'أرشفة الملف', color: 'text-purple-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'ربط الأمانة', color: 'text-gold' },
            { icon: Shield, label: 'الأمن السيبراني (M14)', desc: 'ربط إلزامي للاتصالات', color: 'text-red-600' },
            { icon: Server, label: 'نواة القضية (M10)', desc: 'فتح القضية', color: 'text-blue-600' },
            { icon: BadgeCheck, label: 'البيومتري (M109)', desc: 'توقيع المسؤولين', color: 'text-green-600' },
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
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم الملف أو العنوان أو المزود..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Files tab */}
      {activeTab === 'files' && (
        <div className="space-y-2">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Radio size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد ملفات اتصالات وتكنولوجيا معلومات مسجلة</p>
            </div>
          ) : (
            filteredFiles.map((f) => {
              const sCfg = STAGE_CONFIG[f.stage] || STAGE_CONFIG.draft;
              const stageIdx = STAGES.indexOf(f.stage);
              const TypeIcon = FILE_TYPE_ICONS[f.file_type] || Radio;
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
                          {f.sla_breach && <span className="px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-red-50 text-red-700">اختراق SLA</span>}
                          {f.gdpr_compliance ? <span className="px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-green-50 text-green-700">GDPR ملتزم</span> : <span className="px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-orange-50 text-orange-700">GDPR غير ملتزم</span>}
                          {f.data_breach_reported && <span className="px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-red-50 text-red-700">خرق بيانات</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{f.file_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {f.provider_name && <span className="font-body text-[9px] text-ink/40">المزود: {f.provider_name}</span>}
                          {f.license_number && <span className="font-body text-[9px] text-ink/40">رقم الترخيص: {f.license_number}</span>}
                          {f.ntra_ref && <span className="font-body text-[9px] text-ink/40">مرجع NTRA: {f.ntra_ref}</span>}
                          {f.contract_value > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(f.contract_value)}</span>}
                          {f.dpo_assigned && <span className="font-body text-[9px] text-blue-600 font-bold">DPO معيَّن</span>}
                          {f.dpa_ref && <span className="font-body text-[9px] text-purple-600 font-bold">DPA: {f.dpa_ref}</span>}
                          {f.ip_protection_ref && <span className="font-body text-[9px] text-indigo-600 font-bold">حماية IP: {f.ip_protection_ref}</span>}
                          {f.m53_document_id && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><FileText size={8} /> M53</span>}
                          {f.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {f.m14_cyber_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-red-50 text-red-600"><Shield size={8} /> M14</span>}
                          {f.m10_case_opened && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Server size={8} /> M10</span>}
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
                    {log.action.includes('created') ? <Radio size={12} className="text-blue-600" />
                      : log.action.includes('m53') ? <FileText size={12} className="text-purple-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m14') ? <Shield size={12} className="text-red-600" />
                      : log.action.includes('m10') ? <Server size={12} className="text-blue-600" />
                      : log.action.includes('m109') ? <BadgeCheck size={12} className="text-green-600" />
                      : log.action.includes('m92') ? <Activity size={12} className="text-amber-600" />
                      : log.action.includes('stage') ? <ArrowRight size={12} className="text-gold" />
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
                <Radio size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف الاتصالات وحماية البيانات</span>
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
                      <ArrowRight size={12} /> الانتقال للمرحلة التالية
                    </button>
                  )}
                </div>

                {/* File info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Radio size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات الملف</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">المزود</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.provider_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نوع الترخيص</span><p className="font-body text-xs font-bold text-midnight">{LICENSE_TYPE_LABELS[selectedFile.license_type || 'none'] || selectedFile.license_type || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">رقم الترخيص</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.license_number || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">مرجع NTRA</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.ntra_ref || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">مقاييس SLA</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.sla_metrics || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">مرجع DPA</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.dpa_ref || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">مرجع حماية IP</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.ip_protection_ref || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المستشار</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.advisor?.name || '—'}</p></div>
                  </div>
                </div>

                {/* Contract value */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <DollarSign size={12} className="text-gold mb-1" />
                  <span className="font-body text-[9px] text-ink/40">قيمة العقد</span>
                  <p className="font-body text-sm font-bold text-gold">{formatCurrency(selectedFile.contract_value)}</p>
                </div>

                {/* Compliance flags */}
                <div className="grid grid-cols-2 gap-2">
                  <div className={`rounded-lg p-3 border ${selectedFile.sla_breach ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Server size={12} className={selectedFile.sla_breach ? 'text-red-600' : 'text-green-600'} />
                      <span className="font-body text-[10px] font-bold text-midnight">حالة SLA</span>
                    </div>
                    <p className={`font-body text-xs font-bold ${selectedFile.sla_breach ? 'text-red-700' : 'text-green-700'}`}>{selectedFile.sla_breach ? 'يوجد اختراق' : 'مستوفى'}</p>
                  </div>
                  <div className={`rounded-lg p-3 border ${selectedFile.gdpr_compliance ? 'bg-green-50 border-green-100' : 'bg-orange-50 border-orange-100'}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Lock size={12} className={selectedFile.gdpr_compliance ? 'text-green-600' : 'text-orange-600'} />
                      <span className="font-body text-[10px] font-bold text-midnight">امتثال GDPR</span>
                    </div>
                    <p className={`font-body text-xs font-bold ${selectedFile.gdpr_compliance ? 'text-green-700' : 'text-orange-700'}`}>{selectedFile.gdpr_compliance ? 'ملتزم' : 'غير ملتزم'}</p>
                  </div>
                  <div className={`rounded-lg p-3 border ${selectedFile.dpo_assigned ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <BadgeCheck size={12} className={selectedFile.dpo_assigned ? 'text-blue-600' : 'text-ink/40'} />
                      <span className="font-body text-[10px] font-bold text-midnight">مسؤول حماية البيانات (DPO)</span>
                    </div>
                    <p className={`font-body text-xs font-bold ${selectedFile.dpo_assigned ? 'text-blue-700' : 'text-ink/50'}`}>{selectedFile.dpo_assigned ? 'معيَّن' : 'غير معيَّن'}</p>
                  </div>
                  <div className={`rounded-lg p-3 border ${selectedFile.data_breach_reported ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertTriangle size={12} className={selectedFile.data_breach_reported ? 'text-red-600' : 'text-green-600'} />
                      <span className="font-body text-[10px] font-bold text-midnight">خرق البيانات</span>
                    </div>
                    <p className={`font-body text-xs font-bold ${selectedFile.data_breach_reported ? 'text-red-700' : 'text-green-700'}`}>{selectedFile.data_breach_reported ? 'تم البلاغ' : 'لا يوجد'}</p>
                  </div>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m53_document_id ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> M53 {selectedFile.m53_document_id ? 'مؤرشف' : 'غير مؤرشف'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedFile.m54_finance_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m14_cyber_linked ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-ink/30'}`}><Shield size={10} /> M14 {selectedFile.m14_cyber_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m10_case_opened ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Server size={10} /> M10 {selectedFile.m10_case_opened ? 'مفتوح' : 'غير مفتوح'}</span>
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
      <EntityModal open={modalOpen} title={editingId ? 'تعديل الملف' : 'ملف اتصالات وتكنولوجيا معلومات جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الملف" required><TextInput value={form.file_number} onChange={(e) => setForm({ ...form, file_number: e.target.value })} placeholder="TC-2025-001" /></Field>
          <Field label="نوع الملف">
            <Select value={form.file_type} onChange={(e) => setForm({ ...form, file_type: e.target.value })}>
              {Object.entries(FILE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان الملف" required><TextInput value={form.file_title} onChange={(e) => setForm({ ...form, file_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم المزود"><TextInput value={form.provider_name} onChange={(e) => setForm({ ...form, provider_name: e.target.value })} /></Field>
          <Field label="نوع الترخيص">
            <Select value={form.license_type} onChange={(e) => setForm({ ...form, license_type: e.target.value })}>
              {Object.entries(LICENSE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الترخيص"><TextInput value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} /></Field>
          <Field label="مرجع NTRA"><TextInput value={form.ntra_ref} onChange={(e) => setForm({ ...form, ntra_ref: e.target.value })} placeholder="NTRA-2025-001" /></Field>
        </div>
        <Field label="مقاييس SLA"><TextArea value={form.sla_metrics} onChange={(e) => setForm({ ...form, sla_metrics: e.target.value })} rows={2} placeholder="جهوزية 99.9% · زمن استجابة < 200ms" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="قيمة العقد"><TextInput type="number" value={form.contract_value} onChange={(e) => setForm({ ...form, contract_value: e.target.value })} /></Field>
          <Field label="العملة">
            <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="مرجع DPA"><TextInput value={form.dpa_ref} onChange={(e) => setForm({ ...form, dpa_ref: e.target.value })} placeholder="DPA-2025-001" /></Field>
          <Field label="مرجع حماية الملكية الفكرية"><TextInput value={form.ip_protection_ref} onChange={(e) => setForm({ ...form, ip_protection_ref: e.target.value })} placeholder="IP-2025-001" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
          <div className="flex flex-col justify-end gap-2 pb-1">
            <Checkbox checked={form.sla_breach} onChange={(v) => setForm({ ...form, sla_breach: v })} label="يوجد اختراق SLA" />
            <Checkbox checked={form.dpo_assigned} onChange={(v) => setForm({ ...form, dpo_assigned: v })} label="تم تعيين DPO" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Checkbox checked={form.gdpr_compliance} onChange={(v) => setForm({ ...form, gdpr_compliance: v })} label="امتثال GDPR" />
          <Checkbox checked={form.data_breach_reported} onChange={(v) => setForm({ ...form, data_breach_reported: v })} label="تم البلاغ عن خرق بيانات" />
        </div>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
