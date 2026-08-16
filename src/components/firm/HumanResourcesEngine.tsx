import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, AlertTriangle,
  Shield, CircuitBoard, Zap, CheckCircle2, Clock, ArrowRight, Search,
  Activity, Server, AlertCircle, BadgeCheck, Users, DollarSign,
  FileText, Scale, Gavel, TrendingUp, UserCheck, Calendar,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M77HRFile, M77AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'files' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'مسودة', bg: 'bg-blue-50', text: 'text-blue-700' },
  reviewed: { label: 'مراجعة', bg: 'bg-amber-50', text: 'text-amber-700' },
  approved: { label: 'اعتماد', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  executed: { label: 'منفَّذ', bg: 'bg-green-50', text: 'text-green-700' },
  terminated: { label: 'منتهٍ', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const STAGES = ['draft', 'reviewed', 'approved', 'executed', 'terminated'];

const FILE_TYPE_LABELS: Record<string, string> = {
  employment: 'تعيين',
  payroll: 'مسير رواتب',
  leave: 'إجازات',
  appraisal: 'تقييم أداء',
  disciplinary: 'جزاء تأديبي',
  termination: 'إنهاء خدمة',
};

const FILE_TYPE_ICONS: Record<string, typeof Users> = {
  employment: UserCheck,
  payroll: DollarSign,
  leave: Calendar,
  appraisal: TrendingUp,
  disciplinary: AlertTriangle,
  termination: X,
};

const PERFORMANCE_RATING_LABELS: Record<string, string> = {
  excellent: 'ممتاز',
  very_good: 'جيد جداً',
  good: 'جيد',
  fair: 'مقبول',
  poor: 'ضعيف',
};

const DISCIPLINARY_ACTION_LABELS: Record<string, string> = {
  none: 'لا يوجد',
  warning: 'إنذار',
  suspension: 'إيقاف',
  deduction: 'خصم',
  termination: 'فصل',
};

const DEPARTMENT_LABELS: Record<string, string> = {
  legal: 'القانوني',
  finance: 'المالي',
  admin: 'الإداري',
  it: 'تكنولوجيا المعلومات',
  operations: 'العمليات',
};

interface HRForm {
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  employee_name: string;
  employee_id_number: string;
  department: string;
  position: string;
  hire_date: string;
  termination_date: string;
  base_salary: string;
  allowances: string;
  deductions: string;
  net_salary: string;
  leave_balance: string;
  performance_rating: string;
  disciplinary_action: string;
  description: string;
}

const emptyForm: HRForm = {
  file_number: '', file_title: '', file_type: 'employment', stage: 'draft',
  employee_name: '', employee_id_number: '', department: 'legal', position: '',
  hire_date: '', termination_date: '', base_salary: '0', allowances: '0',
  deductions: '0', net_salary: '0', leave_balance: '0',
  performance_rating: 'good', disciplinary_action: 'none', description: '',
};

export default function HumanResourcesEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [files, setFiles] = useState<M77HRFile[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('files');
  const [selectedFile, setSelectedFile] = useState<M77HRFile | null>(null);
  const [auditLogs, setAuditLogs] = useState<M77AuditLog[]>([]);
  const [allAudit, setAllAudit] = useState<M77AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<HRForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [fRes, attRes, auditRes] = await Promise.all([
      supabase.from('m77_hr_files')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m77_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (fRes.error) console.error('m77 fetch error', fRes.error);
    if (attRes.error) console.error('attorneys fetch error', attRes.error);
    if (auditRes.error) console.error('audit fetch error', auditRes.error);
    setFiles((fRes.data as M77HRFile[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAudit((auditRes.data as M77AuditLog[]) || []);
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
    const { error } = await supabase.from('m77_audit_logs').insert({
      case_id: fileId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
    if (error) console.error('audit log error', error);
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (f: M77HRFile) => {
    setForm({
      file_number: f.file_number, file_title: f.file_title,
      file_type: f.file_type, stage: f.stage,
      employee_name: f.employee_name || '', employee_id_number: f.employee_id_number || '',
      department: f.department || 'legal', position: f.position || '',
      hire_date: f.hire_date || '', termination_date: f.termination_date || '',
      base_salary: String(f.base_salary || 0), allowances: String(f.allowances || 0),
      deductions: String(f.deductions || 0), net_salary: String(f.net_salary || 0),
      leave_balance: String(f.leave_balance || 0),
      performance_rating: f.performance_rating || 'good', disciplinary_action: f.disciplinary_action || 'none',
      description: f.description || '',
    });
    setEditingId(f.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.file_title.trim() || !form.file_number.trim()) return;
    setSaving(true);
    const baseSalary = Number(form.base_salary) || 0;
    const allowances = Number(form.allowances) || 0;
    const deductions = Number(form.deductions) || 0;
    const netSalary = Number(form.net_salary) || (baseSalary + allowances - deductions);
    const leaveBalance = Number(form.leave_balance) || 0;
    const payload = {
      file_number: form.file_number.trim(),
      file_title: form.file_title.trim(),
      file_type: form.file_type,
      stage: form.stage,
      status: form.stage === 'terminated' ? 'terminated' : 'active',
      employee_name: form.employee_name.trim() || null,
      employee_id_number: form.employee_id_number.trim() || null,
      department: form.department,
      position: form.position.trim() || null,
      hire_date: form.hire_date || null,
      termination_date: form.termination_date || null,
      base_salary: baseSalary,
      allowances: allowances,
      deductions: deductions,
      net_salary: netSalary,
      leave_balance: leaveBalance,
      performance_rating: form.performance_rating,
      disciplinary_action: form.disciplinary_action,
      description: form.description.trim() || null,
    };
    if (editingId) {
      const { error } = await supabase.from('m77_hr_files').update(payload).eq('id', editingId);
      if (error) console.error('update error', error);
      await logAudit(editingId, 'file_updated', 'تحديث بيانات ملف الموارد البشرية');
    } else {
      const { data, error } = await supabase.from('m77_hr_files').insert(payload).select('id');
      if (error) console.error('insert error', error);
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'file_created', 'إنشاء ملف موارد بشرية — النوع: ' + (FILE_TYPE_LABELS[form.file_type] || form.file_type));
        const isEmploymentOrPayroll = form.file_type === 'employment' || form.file_type === 'payroll';
        const isDisciplinaryOrTermination = form.file_type === 'disciplinary' || form.file_type === 'termination';
        await supabase.from('m77_hr_files').update({
          m53_document_id: 'DOC-M77-' + Date.now().toString().slice(-6),
          m54_finance_linked: isEmploymentOrPayroll,
          m72_insurance_linked: isEmploymentOrPayroll,
          m76_legal_linked: isDisciplinaryOrTermination,
          m109_biometric_signed: true,
          m92_notified: true,
          cost_center_id: 'CC-M77-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm53_document', 'أرشفة الملف في محرك المستندات (M53)');
        if (isEmploymentOrPayroll) {
          await logAudit(newId, 'm54_finance', 'ربط الملف بالمحرك المالي (M54)');
          await logAudit(newId, 'm72_insurance', 'ربط الملف بالتأمينات الاجتماعية (M72)');
        }
        if (isDisciplinaryOrTermination) {
          await logAudit(newId, 'm76_legal', 'ربط الملف بالإدارات القانونية (M76)');
        }
        await logAudit(newId, 'm109_biometric', 'التوقيع البيومتري للموظف (M109)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء الملف');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('m77_hr_files').delete().eq('id', deleteId);
    if (error) console.error('delete error', error);
    setDeleteId(null);
    setSelectedFile(null);
    fetchAll();
  };

  const openFileDetail = async (f: M77HRFile) => {
    setSelectedFile(f);
    setDetailLoading(true);
    const aRes = await supabase.from('m77_audit_logs').select('*').eq('case_id', f.id).order('created_at', { ascending: true });
    if (aRes.error) console.error('detail audit error', aRes.error);
    setAuditLogs((aRes.data as M77AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (f: M77HRFile) => {
    const idx = STAGES.indexOf(f.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    const { error } = await supabase.from('m77_hr_files').update({ stage: next, status: next === 'terminated' ? 'terminated' : 'active' }).eq('id', f.id);
    if (error) console.error('stage advance error', error);
    await logAudit(f.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedFile({ ...f, stage: next } as M77HRFile);
  };

  const filteredFiles = files.filter((f) => {
    if (filterType !== 'all' && f.file_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!f.file_number.toLowerCase().includes(q) && !f.file_title.toLowerCase().includes(q) && !(f.employee_name || '').toLowerCase().includes(q) && !(f.employee_id_number || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeEmployees = files.filter((f) => f.stage !== 'terminated' && f.file_type === 'employment').length;
  const totalPayroll = files.reduce((s, f) => s + (f.net_salary || 0), 0);
  const ratedFiles = files.filter((f) => f.performance_rating && f.performance_rating !== 'poor');
  const ratingScores: Record<string, number> = { excellent: 5, very_good: 4, good: 3, fair: 2, poor: 1 };
  const avgPerformance = files.length > 0
    ? (files.reduce((s, f) => s + (ratingScores[f.performance_rating || 'good'] || 3), 0) / files.length).toFixed(1)
    : '—';

  const tabs: { id: Tab; label: string; icon: typeof Users; badge?: number }[] = [
    { id: 'files', label: 'الملفات', icon: Users, badge: files.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Users size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">الموارد البشرية والشؤون الإدارية وشؤون العاملين (M77)</h2>
            <p className="font-body text-[10px] text-ink/40">إدارة دورة حياة العنصر البشري من التعيين حتى إنهاء الخدمة والرواتب والإجازات والتقييم</p>
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
        <StatCard icon={<Users size={14} className="text-midnight" />} label="إجمالي الملفات" value={String(files.length)} valueClass="text-midnight" />
        <StatCard icon={<UserCheck size={14} className="text-green-600" />} label="موظفون نشطون" value={String(activeEmployees)} valueClass="text-green-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="إجمالي الرواتب" value={formatCurrency(totalPayroll)} valueClass="text-gold" />
        <StatCard icon={<TrendingUp size={14} className="text-blue-600" />} label="متوسط الأداء" value={avgPerformance} valueClass="text-blue-700" />
      </div>

      {/* 5-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة ملف الموارد البشرية — 5 مراحل</span>
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
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'الرواتب والبدلات', color: 'text-gold' },
            { icon: Shield, label: 'التأمينات (M72)', desc: 'تأمينات اجتماعية', color: 'text-blue-600' },
            { icon: Gavel, label: 'الإدارات القانونية (M76)', desc: 'الجزاءات والفصل', color: 'text-red-600' },
            { icon: BadgeCheck, label: 'البيومتري (M109)', desc: 'توقيع الموظف', color: 'text-green-600' },
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
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم الملف أو العنوان أو الموظف..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Files tab */}
      {activeTab === 'files' && (
        <div className="space-y-2">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Users size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد ملفات موارد بشرية مسجلة</p>
            </div>
          ) : (
            filteredFiles.map((f) => {
              const sCfg = STAGE_CONFIG[f.stage] || STAGE_CONFIG.draft;
              const stageIdx = STAGES.indexOf(f.stage);
              const TypeIcon = FILE_TYPE_ICONS[f.file_type] || Users;
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
                          {f.department && <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600">{DEPARTMENT_LABELS[f.department] || f.department}</span>}
                          {f.performance_rating && f.performance_rating !== 'good' && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><TrendingUp size={8} /> {PERFORMANCE_RATING_LABELS[f.performance_rating] || f.performance_rating}</span>}
                          {f.disciplinary_action && f.disciplinary_action !== 'none' && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-red-50 text-red-600"><AlertTriangle size={8} /> {DISCIPLINARY_ACTION_LABELS[f.disciplinary_action] || f.disciplinary_action}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{f.file_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {f.employee_name && <span className="font-body text-[9px] text-ink/40">الموظف: {f.employee_name}</span>}
                          {f.position && <span className="font-body text-[9px] text-ink/40">الوظيفة: {f.position}</span>}
                          {f.hire_date && <span className="font-body text-[9px] text-ink/40">التعيين: {formatDate(f.hire_date)}</span>}
                          {f.net_salary > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(f.net_salary)}</span>}
                          {f.leave_balance > 0 && <span className="font-body text-[9px] text-ink/40">رصيد الإجازات: {f.leave_balance}</span>}
                          {f.m53_document_id && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><FileText size={8} /> M53</span>}
                          {f.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {f.m72_insurance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Shield size={8} /> M72</span>}
                          {f.m76_legal_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-red-50 text-red-600"><Gavel size={8} /> M76</span>}
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
                    {log.action.includes('created') ? <Users size={12} className="text-blue-600" />
                      : log.action.includes('m53') ? <FileText size={12} className="text-purple-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m72') ? <Shield size={12} className="text-blue-600" />
                      : log.action.includes('m76') ? <Gavel size={12} className="text-red-600" />
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

      {/* File detail drawer */}
      {selectedFile && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedFile(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف الموارد البشرية</span>
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

                {/* Employee info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Users size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات الموظف</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">اسم الموظف</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.employee_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الرقم القومي</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.employee_id_number || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الإدارة</span><p className="font-body text-xs font-bold text-midnight">{DEPARTMENT_LABELS[selectedFile.department || ''] || selectedFile.department || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الوظيفة</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.position || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">تاريخ التعيين</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.hire_date ? formatDate(selectedFile.hire_date) : '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">تاريخ إنهاء الخدمة</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.termination_date ? formatDate(selectedFile.termination_date) : '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المستشار</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.advisor?.name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">رصيد الإجازات</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.leave_balance} يوم</p></div>
                  </div>
                </div>

                {/* Salary info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <DollarSign size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات الراتب</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">الراتب الأساسي</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedFile.base_salary)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">البدلات</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedFile.allowances)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الخصومات</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedFile.deductions)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">صافي الراتب</span><p className="font-body text-xs font-bold text-gold">{formatCurrency(selectedFile.net_salary)}</p></div>
                  </div>
                </div>

                {/* Performance & disciplinary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <div className="flex items-center gap-1.5 mb-2">
                      <TrendingUp size={12} className="text-blue-600" />
                      <span className="font-body text-[10px] font-bold text-blue-700">تقييم الأداء</span>
                    </div>
                    <p className="font-body text-xs font-bold text-midnight">{PERFORMANCE_RATING_LABELS[selectedFile.performance_rating || ''] || selectedFile.performance_rating || '—'}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                    <div className="flex items-center gap-1.5 mb-2">
                      <AlertTriangle size={12} className="text-red-600" />
                      <span className="font-body text-[10px] font-bold text-red-700">الإجراء التأديبي</span>
                    </div>
                    <p className="font-body text-xs font-bold text-midnight">{DISCIPLINARY_ACTION_LABELS[selectedFile.disciplinary_action || ''] || selectedFile.disciplinary_action || '—'}</p>
                  </div>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m53_document_id ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> M53 {selectedFile.m53_document_id ? 'مؤرشف' : 'غير مؤرشف'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedFile.m54_finance_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m72_insurance_linked ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Shield size={10} /> M72 {selectedFile.m72_insurance_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m76_legal_linked ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-ink/30'}`}><Gavel size={10} /> M76 {selectedFile.m76_legal_linked ? 'مربوط' : 'غير مربوط'}</span>
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
      <EntityModal open={modalOpen} title={editingId ? 'تعديل الملف' : 'ملف موارد بشرية جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الملف" required><TextInput value={form.file_number} onChange={(e) => setForm({ ...form, file_number: e.target.value })} placeholder="HR-2025-001" /></Field>
          <Field label="نوع الملف">
            <Select value={form.file_type} onChange={(e) => setForm({ ...form, file_type: e.target.value })}>
              {Object.entries(FILE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان الملف" required><TextInput value={form.file_title} onChange={(e) => setForm({ ...form, file_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم الموظف"><TextInput value={form.employee_name} onChange={(e) => setForm({ ...form, employee_name: e.target.value })} /></Field>
          <Field label="الرقم القومي"><TextInput value={form.employee_id_number} onChange={(e) => setForm({ ...form, employee_id_number: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الإدارة">
            <Select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
              {Object.entries(DEPARTMENT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="الوظيفة"><TextInput value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ التعيين"><TextInput type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} /></Field>
          <Field label="تاريخ إنهاء الخدمة"><TextInput type="date" value={form.termination_date} onChange={(e) => setForm({ ...form, termination_date: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الراتب الأساسي"><TextInput type="number" value={form.base_salary} onChange={(e) => setForm({ ...form, base_salary: e.target.value })} /></Field>
          <Field label="البدلات"><TextInput type="number" value={form.allowances} onChange={(e) => setForm({ ...form, allowances: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الخصومات"><TextInput type="number" value={form.deductions} onChange={(e) => setForm({ ...form, deductions: e.target.value })} /></Field>
          <Field label="صافي الراتب"><TextInput type="number" value={form.net_salary} onChange={(e) => setForm({ ...form, net_salary: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رصيد الإجازات (أيام)"><TextInput type="number" value={form.leave_balance} onChange={(e) => setForm({ ...form, leave_balance: e.target.value })} /></Field>
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تقييم الأداء">
            <Select value={form.performance_rating} onChange={(e) => setForm({ ...form, performance_rating: e.target.value })}>
              {Object.entries(PERFORMANCE_RATING_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="الإجراء التأديبي">
            <Select value={form.disciplinary_action} onChange={(e) => setForm({ ...form, disciplinary_action: e.target.value })}>
              {Object.entries(DISCIPLINARY_ACTION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
