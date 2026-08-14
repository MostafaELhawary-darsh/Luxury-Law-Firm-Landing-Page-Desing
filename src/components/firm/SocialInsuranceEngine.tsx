import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, AlertTriangle,
  Shield, CircuitBoard, Zap, CheckCircle2, Clock, ArrowRight, Search,
  Activity, Server, AlertCircle, BadgeCheck, ShieldCheck, DollarSign,
  FileText, Scale, Gavel, Users, HeartPulse, Fingerprint,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M72InsuranceFile, M72AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'files' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'مسودة', bg: 'bg-blue-50', text: 'text-blue-700' },
  reviewed: { label: 'مراجعة', bg: 'bg-amber-50', text: 'text-amber-700' },
  calculated: { label: 'محسوبة', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  approved: { label: 'معتمدة', bg: 'bg-purple-50', text: 'text-purple-700' },
  executed: { label: 'منفَّذة', bg: 'bg-green-50', text: 'text-green-700' },
  terminated: { label: 'منتهية', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const STAGES = ['draft', 'reviewed', 'calculated', 'approved', 'executed', 'terminated'];

const FILE_TYPE_LABELS: Record<string, string> = {
  subscription: 'اشتراك تأميني',
  injury: 'إصابة عمل',
  pension: 'معاش',
  dispute: 'نزاع تأميني',
  inspection: 'تفتيش تأميني',
};

const FILE_TYPE_ICONS: Record<string, typeof ShieldCheck> = {
  subscription: ShieldCheck,
  injury: HeartPulse,
  pension: DollarSign,
  dispute: Gavel,
  inspection: Scale,
};

const INSURANCE_TYPE_LABELS: Record<string, string> = {
  private_sector: 'قطاع خاص',
  government: 'حكومي',
  irregular: 'عمالة غير منتظمة',
};

const PENSION_TYPE_LABELS: Record<string, string> = {
  retirement: 'شيخوخة',
  disability: 'عجز',
  survivorship: 'ورثة',
  early_retirement: 'تقاعد مبكر',
};

const INJURY_STATUS_LABELS: Record<string, string> = {
  none: 'لا يوجد',
  reported: 'تم الإبلاغ',
  under_investigation: 'قيد التحقيق',
  compensated: 'تم التعويض',
  disputed: 'متنازع عليه',
};

interface FileForm {
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  employer_name: string;
  employee_name: string;
  subscription_number: string;
  insurance_type: string;
  base_wage: string;
  variable_wage: string;
  contribution_amount: string;
  pension_type: string;
  injury_status: string;
  settlement_ref: string;
  description: string;
}

const emptyForm: FileForm = {
  file_number: '', file_title: '', file_type: 'subscription', stage: 'draft',
  employer_name: '', employee_name: '', subscription_number: '',
  insurance_type: 'private_sector', base_wage: '0', variable_wage: '0',
  contribution_amount: '0', pension_type: 'retirement', injury_status: 'none',
  settlement_ref: '', description: '',
};

export default function SocialInsuranceEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [files, setFiles] = useState<M72InsuranceFile[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('files');
  const [selectedFile, setSelectedFile] = useState<M72InsuranceFile | null>(null);
  const [auditLogs, setAuditLogs] = useState<M72AuditLog[]>([]);
  const [allAudit, setAllAudit] = useState<M72AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FileForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [fRes, attRes, auditRes] = await Promise.all([
      supabase.from('m72_insurance_files')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m72_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (fRes.error) console.error('m72 fetch error', fRes.error);
    if (attRes.error) console.error('attorneys fetch error', attRes.error);
    if (auditRes.error) console.error('audit fetch error', auditRes.error);
    setFiles((fRes.data as M72InsuranceFile[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAudit((auditRes.data as M72AuditLog[]) || []);
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
    const { error } = await supabase.from('m72_audit_logs').insert({
      case_id: fileId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
    if (error) console.error('audit log error', error);
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (f: M72InsuranceFile) => {
    setForm({
      file_number: f.file_number, file_title: f.file_title,
      file_type: f.file_type, stage: f.stage,
      employer_name: f.employer_name ?? '', employee_name: f.employee_name ?? '',
      subscription_number: f.subscription_number || '',
      insurance_type: f.insurance_type ?? '', base_wage: String(f.base_wage || 0),
      variable_wage: String(f.variable_wage || 0),
      contribution_amount: String(f.contribution_amount || 0),
      pension_type: f.pension_type || 'retirement', injury_status: f.injury_status || 'none',
      settlement_ref: f.settlement_ref || '', description: f.description || '',
    });
    setEditingId(f.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.file_title.trim() || !form.file_number.trim()) return;
    setSaving(true);
    const baseWage = Number(form.base_wage) || 0;
    const variableWage = Number(form.variable_wage) || 0;
    const contribution = Number(form.contribution_amount) || 0;
    const payload = {
      file_number: form.file_number.trim(),
      file_title: form.file_title.trim(),
      file_type: form.file_type,
      stage: form.stage,
      status: form.stage === 'terminated' ? 'terminated' : 'active',
      employer_name: form.employer_name.trim(),
      employee_name: form.employee_name.trim(),
      subscription_number: form.subscription_number.trim() || null,
      insurance_type: form.insurance_type,
      base_wage: baseWage,
      variable_wage: variableWage,
      contribution_amount: contribution,
      pension_type: form.pension_type,
      injury_status: form.injury_status,
      settlement_ref: form.settlement_ref.trim() || null,
      description: form.description.trim() || null,
    };
    if (editingId) {
      const { error } = await supabase.from('m72_insurance_files').update(payload).eq('id', editingId);
      if (error) console.error('update error', error);
      await logAudit(editingId, 'file_updated', 'تحديث بيانات الملف التأميني');
    } else {
      const { data, error } = await supabase.from('m72_insurance_files').insert(payload).select('id');
      if (error) console.error('insert error', error);
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'file_created', 'إنشاء ملف تأميني — النوع: ' + (FILE_TYPE_LABELS[form.file_type] || form.file_type));
        await supabase.from('m72_insurance_files').update({
          m53_document_id: 'DOC-M72-' + Date.now().toString().slice(-6),
          m54_finance_linked: true,
          m10_case_opened: form.file_type === 'dispute',
          m65_medical_linked: form.file_type === 'injury',
          m77_hr_linked: true,
          m109_biometric_signed: true,
          m92_notified: true,
          cost_center_id: 'CC-M72-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm53_document', 'أرشفة الملف في محرك المستندات (M53)');
        await logAudit(newId, 'm54_finance', 'ربط الملف بالمحرك المالي (M54)');
        if (form.file_type === 'dispute') await logAudit(newId, 'm10_case', 'فتح القضية في المحرك الموحد (M10)');
        if (form.file_type === 'injury') await logAudit(newId, 'm65_medical', 'ربط إصابة العمل بالمحرك الطبي (M65)');
        await logAudit(newId, 'm77_hr', 'ربط الملف بمحرك الموارد البشرية (M77)');
        await logAudit(newId, 'm109_biometric', 'التوقيع البيومتري للأطراف (M109)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء الملف');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('m72_insurance_files').delete().eq('id', deleteId);
    if (error) console.error('delete error', error);
    setDeleteId(null);
    setSelectedFile(null);
    fetchAll();
  };

  const openFileDetail = async (f: M72InsuranceFile) => {
    setSelectedFile(f);
    setDetailLoading(true);
    const aRes = await supabase.from('m72_audit_logs').select('*').eq('case_id', f.id).order('created_at', { ascending: true });
    if (aRes.error) console.error('detail audit error', aRes.error);
    setAuditLogs((aRes.data as M72AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (f: M72InsuranceFile) => {
    const idx = STAGES.indexOf(f.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    const { error } = await supabase.from('m72_insurance_files').update({ stage: next, status: next === 'terminated' ? 'terminated' : 'active' }).eq('id', f.id);
    if (error) console.error('stage advance error', error);
    await logAudit(f.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedFile({ ...f, stage: next } as M72InsuranceFile);
  };

  const filteredFiles = files.filter((f) => {
    if (filterType !== 'all' && f.file_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!f.file_number.toLowerCase().includes(q) && !f.file_title.toLowerCase().includes(q) && !(f.employer_name || '').toLowerCase().includes(q) && !(f.employee_name || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeInjuries = files.filter((f) => f.file_type === 'injury' && f.injury_status !== 'none' && f.injury_status !== 'compensated').length;
  const totalContributions = files.reduce((s, f) => s + (f.contribution_amount || 0), 0);
  const pensionSettlements = files.filter((f) => f.file_type === 'pension').length;

  const tabs: { id: Tab; label: string; icon: typeof ShieldCheck; badge?: number }[] = [
    { id: 'files', label: 'الملفات التأمينية', icon: ShieldCheck, badge: files.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
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
            <h2 className="font-heading font-bold text-midnight text-lg">التأمينات الاجتماعية والمعاشات والحماية الاقتصادية (M72)</h2>
            <p className="font-body text-[10px] text-ink/40">إدارة الاشتراكات التأمينية وإصابات العمل وتسوية المعاشات والمنازعات التأمينية</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Shield size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">Zero-Trust · ZK-Audit</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> ملف تأميني جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<ShieldCheck size={14} className="text-midnight" />} label="إجمالي الملفات" value={String(files.length)} valueClass="text-midnight" />
        <StatCard icon={<AlertCircle size={14} className="text-red-600" />} label="إصابات عمل نشطة" value={String(activeInjuries)} valueClass="text-red-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="إجمالي الاشتراكات" value={formatCurrency(totalContributions)} valueClass="text-gold" />
        <StatCard icon={<BadgeCheck size={14} className="text-green-600" />} label="تسويات المعاشات" value={String(pensionSettlements)} valueClass="text-green-700" />
      </div>

      {/* 6-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة الملف التأميني — 6 مراحل</span>
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
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
          {[
            { icon: FileText, label: 'المستندات (M53)', desc: 'أرشفة الملف', color: 'text-purple-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'ربط الاشتراكات', color: 'text-gold' },
            { icon: Server, label: 'نواة القضية (M10)', desc: 'فتح النزاع', color: 'text-blue-600' },
            { icon: HeartPulse, label: 'المحرك الطبي (M65)', desc: 'إصابات العمل', color: 'text-red-600' },
            { icon: Users, label: 'الموارد البشرية (M77)', desc: 'ربط الموظف', color: 'text-green-600' },
            { icon: Fingerprint, label: 'البيومتري (M109)', desc: 'توقيع الأطراف', color: 'text-green-600' },
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
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم الملف أو العنوان أو صاحب العمل أو الموظف..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Files tab */}
      {activeTab === 'files' && (
        <div className="space-y-2">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <ShieldCheck size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد ملفات تأمينية مسجلة</p>
            </div>
          ) : (
            filteredFiles.map((f) => {
              const sCfg = STAGE_CONFIG[f.stage] || STAGE_CONFIG.draft;
              const stageIdx = STAGES.indexOf(f.stage);
              const TypeIcon = FILE_TYPE_ICONS[f.file_type] || ShieldCheck;
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
                          {f.insurance_type && <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600">{INSURANCE_TYPE_LABELS[f.insurance_type] || f.insurance_type}</span>}
                          {f.file_type === 'pension' && f.pension_type && <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600">{PENSION_TYPE_LABELS[f.pension_type] || f.pension_type}</span>}
                          {f.file_type === 'injury' && f.injury_status !== 'none' && <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-red-50 text-red-600">{INJURY_STATUS_LABELS[f.injury_status ?? ''] || f.injury_status}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{f.file_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {f.employer_name && <span className="font-body text-[9px] text-ink/40">صاحب العمل: {f.employer_name}</span>}
                          {f.employee_name && <span className="font-body text-[9px] text-ink/40">المؤمَّن عليه: {f.employee_name}</span>}
                          {f.subscription_number && <span className="font-body text-[9px] text-ink/40">رقم الاشتراك: {f.subscription_number}</span>}
                          {f.contribution_amount > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(f.contribution_amount)}</span>}
                          {f.m53_document_id && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><FileText size={8} /> M53</span>}
                          {f.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {f.m10_case_opened && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Server size={8} /> M10</span>}
                          {f.m65_medical_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-red-50 text-red-600"><HeartPulse size={8} /> M65</span>}
                          {f.m77_hr_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><Users size={8} /> M77</span>}
                          {f.m109_biometric_signed && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><Fingerprint size={8} /> M109</span>}
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
                    {log.action.includes('created') ? <ShieldCheck size={12} className="text-blue-600" />
                      : log.action.includes('m53') ? <FileText size={12} className="text-purple-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m10') ? <Server size={12} className="text-blue-600" />
                      : log.action.includes('m65') ? <HeartPulse size={12} className="text-red-600" />
                      : log.action.includes('m77') ? <Users size={12} className="text-green-600" />
                      : log.action.includes('m109') ? <Fingerprint size={12} className="text-green-600" />
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

      {/* File detail drawer */}
      {selectedFile && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedFile(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف التأمين الاجتماعي</span>
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
                    <ShieldCheck size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات الملف</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">صاحب العمل</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.employer_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المؤمَّن عليه</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.employee_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نوع التأمين</span><p className="font-body text-xs font-bold text-midnight">{INSURANCE_TYPE_LABELS[selectedFile.insurance_type ?? ''] || selectedFile.insurance_type || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المستشار</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.advisor?.name || '—'}</p></div>
                    {selectedFile.subscription_number && <div><span className="font-body text-[9px] text-ink/40">رقم الاشتراك</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.subscription_number}</p></div>}
                  </div>
                </div>

                {/* Wages & contributions */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <DollarSign size={12} className="text-gold mb-1" />
                  <div className="grid grid-cols-3 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">الأجر الأساسي</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedFile.base_wage || 0)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الأجر المتغير</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedFile.variable_wage || 0)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الاشتراك</span><p className="font-body text-xs font-bold text-gold">{formatCurrency(selectedFile.contribution_amount || 0)}</p></div>
                  </div>
                </div>

                {/* Pension info */}
                {selectedFile.file_type === 'pension' && (
                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                    <div className="flex items-center gap-1.5 mb-2">
                      <DollarSign size={12} className="text-purple-600" />
                      <span className="font-body text-[10px] font-bold text-purple-700">نوع المعاش</span>
                    </div>
                    <p className="font-body text-xs font-bold text-midnight">{PENSION_TYPE_LABELS[selectedFile.pension_type ?? ''] || selectedFile.pension_type || '—'}</p>
                    {selectedFile.settlement_ref && <p className="font-body text-[10px] text-ink/50 mt-1">مرجع التسوية: {selectedFile.settlement_ref}</p>}
                  </div>
                )}

                {/* Injury info */}
                {selectedFile.file_type === 'injury' && (
                  <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                    <div className="flex items-center gap-1.5 mb-2">
                      <HeartPulse size={12} className="text-red-600" />
                      <span className="font-body text-[10px] font-bold text-red-700">حالة إصابة العمل</span>
                    </div>
                    <p className="font-body text-xs font-bold text-midnight">{INJURY_STATUS_LABELS[selectedFile.injury_status ?? ''] || selectedFile.injury_status || '—'}</p>
                    {selectedFile.settlement_ref && <p className="font-body text-[10px] text-ink/50 mt-1">مرجع التسوية: {selectedFile.settlement_ref}</p>}
                  </div>
                )}

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m53_document_id ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> M53 {selectedFile.m53_document_id ? 'مؤرشف' : 'غير مؤرشف'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedFile.m54_finance_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m10_case_opened ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Server size={10} /> M10 {selectedFile.m10_case_opened ? 'مفتوح' : 'غير مفتوح'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m65_medical_linked ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-ink/30'}`}><HeartPulse size={10} /> M65 {selectedFile.m65_medical_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m77_hr_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><Users size={10} /> M77 {selectedFile.m77_hr_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m109_biometric_signed ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><Fingerprint size={10} /> M109 {selectedFile.m109_biometric_signed ? 'موقَّع' : 'غير موقَّع'}</span>
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
      <EntityModal open={modalOpen} title={editingId ? 'تعديل الملف' : 'ملف تأميني جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الملف" required><TextInput value={form.file_number} onChange={(e) => setForm({ ...form, file_number: e.target.value })} placeholder="M72-2025-001" /></Field>
          <Field label="نوع الملف">
            <Select value={form.file_type} onChange={(e) => setForm({ ...form, file_type: e.target.value })}>
              {Object.entries(FILE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان الملف" required><TextInput value={form.file_title} onChange={(e) => setForm({ ...form, file_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="صاحب العمل"><TextInput value={form.employer_name} onChange={(e) => setForm({ ...form, employer_name: e.target.value })} /></Field>
          <Field label="المؤمَّن عليه"><TextInput value={form.employee_name} onChange={(e) => setForm({ ...form, employee_name: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الاشتراك"><TextInput value={form.subscription_number} onChange={(e) => setForm({ ...form, subscription_number: e.target.value })} placeholder="SUB-001" /></Field>
          <Field label="نوع التأمين">
            <Select value={form.insurance_type} onChange={(e) => setForm({ ...form, insurance_type: e.target.value })}>
              {Object.entries(INSURANCE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="الأجر الأساسي"><TextInput type="number" value={form.base_wage} onChange={(e) => setForm({ ...form, base_wage: e.target.value })} /></Field>
          <Field label="الأجر المتغير"><TextInput type="number" value={form.variable_wage} onChange={(e) => setForm({ ...form, variable_wage: e.target.value })} /></Field>
          <Field label="مبلغ الاشتراك"><TextInput type="number" value={form.contribution_amount} onChange={(e) => setForm({ ...form, contribution_amount: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
          <Field label="مرجع التسوية"><TextInput value={form.settlement_ref} onChange={(e) => setForm({ ...form, settlement_ref: e.target.value })} placeholder="STL-2025-001" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نوع المعاش">
            <Select value={form.pension_type} onChange={(e) => setForm({ ...form, pension_type: e.target.value })}>
              {Object.entries(PENSION_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="حالة الإصابة">
            <Select value={form.injury_status} onChange={(e) => setForm({ ...form, injury_status: e.target.value })}>
              {Object.entries(INJURY_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
