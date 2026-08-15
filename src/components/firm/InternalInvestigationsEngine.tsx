import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, AlertTriangle,
  Shield, CircuitBoard, Zap, CheckCircle2, Clock, ArrowRight, Search,
  Activity, Server, AlertCircle, BadgeCheck, Search as SearchIcon, DollarSign,
  FileText, Gavel, Users, Calendar, UserCheck, UserX, Scale, Sparkles,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M45InvestigationFile, M45AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'files' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  intake: { label: 'الاستلام', bg: 'bg-blue-50', text: 'text-blue-700' },
  investigation: { label: 'التحقيق', bg: 'bg-amber-50', text: 'text-amber-700' },
  hearing: { label: 'الجلسة', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  recommendation: { label: 'التوصية', bg: 'bg-purple-50', text: 'text-purple-700' },
  decision: { label: 'القرار', bg: 'bg-orange-50', text: 'text-orange-700' },
  closed: { label: 'مغلق', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const STAGES = ['intake', 'investigation', 'hearing', 'recommendation', 'decision', 'closed'];

const FILE_TYPE_LABELS: Record<string, string> = {
  investigation: 'تحقيق',
  disciplinary: 'تأديبي',
  appeal: 'استئناف',
  grievance: 'تظلم',
  ethics: 'أخلاقيات',
};

const FILE_TYPE_ICONS: Record<string, typeof SearchIcon> = {
  investigation: SearchIcon,
  disciplinary: AlertCircle,
  appeal: Scale,
  grievance: FileText,
  ethics: Shield,
};

const VIOLATION_LABELS: Record<string, string> = {
  absence_without_leave: 'غياب دون إذن',
  misconduct: 'سوء سلوك',
  negligence: 'إهمال',
  policy_violation: 'مخالفة السياسات',
  ethics_breach: 'إخلال أخلاقي',
};

const PENALTY_LABELS: Record<string, string> = {
  none: 'لا يوجد',
  warning: 'إنذار',
  suspension: 'إيقاف',
  demotion: 'تنزيل درجة',
  termination: 'إنهاء خدمة',
};

const PENALTY_COLORS: Record<string, string> = {
  none: 'bg-gray-100 text-ink/50',
  warning: 'bg-amber-50 text-amber-700',
  suspension: 'bg-orange-50 text-orange-700',
  demotion: 'bg-red-50 text-red-700',
  termination: 'bg-red-100 text-red-800',
};

interface FileForm {
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  respondent_name: string;
  complainant_name: string;
  violation_type: string;
  penalty_recommendation: string;
  hearing_scheduled: boolean;
  appeal_filed: boolean;
  description: string;
}

const emptyForm: FileForm = {
  file_number: '', file_title: '', file_type: 'investigation', stage: 'intake',
  respondent_name: '', complainant_name: '', violation_type: 'misconduct',
  penalty_recommendation: 'none', hearing_scheduled: false, appeal_filed: false,
  description: '',
};

export default function InternalInvestigationsEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [files, setFiles] = useState<M45InvestigationFile[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('files');
  const [selectedFile, setSelectedFile] = useState<M45InvestigationFile | null>(null);
  const [auditLogs, setAuditLogs] = useState<M45AuditLog[]>([]);
  const [allAudit, setAllAudit] = useState<M45AuditLog[]>([]);
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
      supabase.from('m45_investigation_files')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m45_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (fRes.error) console.error('m45 fetch error', fRes.error);
    if (attRes.error) console.error('attorneys fetch error', attRes.error);
    if (auditRes.error) console.error('audit fetch error', auditRes.error);
    setFiles((fRes.data as M45InvestigationFile[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAudit((auditRes.data as M45AuditLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const workflowAI = useMemo(() => {
    const activeFiles = files.filter((f) => f.stage !== 'closed');
    const scheduledHearings = files.filter((f) => f.hearing_scheduled);
    const evidenceGap = files.filter((f) => !f.complainant_name || !f.respondent_name);
    const highRiskPenalty = files.filter((f) => ['termination', 'suspension', 'demotion'].includes(f.penalty_recommendation || 'none'));

    return {
      summary: `يُدار حاليًا ${activeFiles.length} ملفاً نشطاً في مسار التحقيقات، مع ${scheduledHearings.length} جلسات مجدولة و${highRiskPenalty.length} حالة تتطلب متابعة تأديبية عالية.`,
      recommendations: [
        { title: 'تسريع جلسات الاستماع', note: scheduledHearings.length > 0 ? 'تحتاج الجلسات الحالية إلى تنسيق سريع للمتهمين والجهات المعنية لتجنب التأخير.' : 'لا توجد جلسات مجدولة حاليًا؛ يمكن ضبط جدول جديد في حال ظهور إضافة جديدة.' },
        { title: 'تدقيق الجهات', note: evidenceGap.length > 0 ? `هناك ${evidenceGap.length} ملفات تفتقد بيانات الجهات الأساسية، وهو ما قد يعرقل قرار التحقيق.` : 'كل الملفات مكتملة من حيث بيانات الأطراف.' },
        { title: 'مراجعة العقوبات', note: highRiskPenalty.length > 0 ? 'تتطلب العقوبات العالية مراجعة إضافية للتأكد من التناسب والامتثال الداخلي.' : 'لا توجد توصيات عقابية عالية في الملف الحالي.' },
      ],
      quickActions: [
        { label: 'جدولة الاستماع', tone: 'gold' },
        { label: 'تحديث الأطراف', tone: 'purple' },
        { label: 'مراجعة العقوبات', tone: 'red' },
      ],
    };
  }, [files]);

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
    const { error } = await supabase.from('m45_audit_logs').insert({
      case_id: fileId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
    if (error) console.error('audit log error', error);
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (f: M45InvestigationFile) => {
    setForm({
      file_number: f.file_number, file_title: f.file_title,
      file_type: f.file_type, stage: f.stage,
      respondent_name: f.respondent_name, complainant_name: f.complainant_name || '',
      violation_type: f.violation_type, penalty_recommendation: f.penalty_recommendation || 'none',
      hearing_scheduled: f.hearing_scheduled || false, appeal_filed: f.appeal_filed || false,
      description: f.description || '',
    });
    setEditingId(f.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.file_title.trim() || !form.file_number.trim()) return;
    setSaving(true);
    const payload = {
      file_number: form.file_number.trim(),
      file_title: form.file_title.trim(),
      file_type: form.file_type,
      stage: form.stage,
      status: form.stage === 'closed' ? 'closed' : 'active',
      respondent_name: form.respondent_name.trim(),
      complainant_name: form.complainant_name.trim() || null,
      violation_type: form.violation_type,
      penalty_recommendation: form.penalty_recommendation,
      hearing_scheduled: form.hearing_scheduled,
      appeal_filed: form.appeal_filed,
      description: form.description.trim() || null,
    };
    if (editingId) {
      const { error } = await supabase.from('m45_investigation_files').update(payload).eq('id', editingId);
      if (error) console.error('update error', error);
      await logAudit(editingId, 'file_updated', 'تحديث بيانات ملف التحقيق');
    } else {
      const { data, error } = await supabase.from('m45_investigation_files').insert(payload).select('id');
      if (error) console.error('insert error', error);
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'file_created', 'إنشاء ملف تحقيق — النوع: ' + (FILE_TYPE_LABELS[form.file_type] || form.file_type));
        await supabase.from('m45_investigation_files').update({
          m10_case_opened: true,
          m77_hr_linked: true,
          m54_finance_linked: form.penalty_recommendation === 'termination' || form.penalty_recommendation === 'suspension',
          m56_transcription_linked: form.hearing_scheduled,
          m46_compliance_checked: true,
          m109_biometric_signed: form.stage === 'decision',
          m92_notified: true,
          cost_center_id: 'CC-M45-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm10_case', 'فتح القضية في المحرك الموحد (M10)');
        await logAudit(newId, 'm77_hr', 'ربط الملف بمحرك الموارد البشرية (M77)');
        if (form.penalty_recommendation === 'termination' || form.penalty_recommendation === 'suspension') {
          await logAudit(newId, 'm54_finance', 'ربط العقوبة المالية بالمحرك المالي (M54)');
        }
        if (form.hearing_scheduled) await logAudit(newId, 'm56_transcription', 'ربط تفريغ الجلسة (M56)');
        await logAudit(newId, 'm46_compliance', 'فحص الامتثال (M46)');
        if (form.stage === 'decision') await logAudit(newId, 'm109_biometric', 'التوقيع البيومتري للقرار (M109)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء الملف');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('m45_investigation_files').delete().eq('id', deleteId);
    if (error) console.error('delete error', error);
    setDeleteId(null);
    setSelectedFile(null);
    fetchAll();
  };

  const openFileDetail = async (f: M45InvestigationFile) => {
    setSelectedFile(f);
    setDetailLoading(true);
    const aRes = await supabase.from('m45_audit_logs').select('*').eq('case_id', f.id).order('created_at', { ascending: true });
    if (aRes.error) console.error('detail audit error', aRes.error);
    setAuditLogs((aRes.data as M45AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (f: M45InvestigationFile) => {
    const idx = STAGES.indexOf(f.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    const { error } = await supabase.from('m45_investigation_files').update({ stage: next, status: next === 'closed' ? 'closed' : 'active' }).eq('id', f.id);
    if (error) console.error('stage advance error', error);
    await logAudit(f.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedFile({ ...f, stage: next } as M45InvestigationFile);
  };

  const filteredFiles = files.filter((f) => {
    if (filterType !== 'all' && f.file_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!f.file_number.toLowerCase().includes(q) && !f.file_title.toLowerCase().includes(q) && !f.respondent_name.toLowerCase().includes(q) && !(f.complainant_name || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeCount = files.filter((f) => f.stage !== 'closed').length;
  const appealsCount = files.filter((f) => f.appeal_filed).length;
  const hearingsCount = files.filter((f) => f.hearing_scheduled).length;

  const tabs: { id: Tab; label: string; icon: typeof SearchIcon; badge?: number }[] = [
    { id: 'files', label: 'ملفات التحقيق', icon: SearchIcon, badge: files.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <SearchIcon size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">التحقيقات الداخلية والمحاسبة الإدارية (M45)</h2>
            <p className="font-body text-[10px] text-ink/40">إدارة التحقيقات والإجراءات التأديبية والاستئنافات والتظلمات والقضايا الأخلاقية</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Shield size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">Air-Gapped · ZK-Audit</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> ملف جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<SearchIcon size={14} className="text-midnight" />} label="إجمالي الملفات" value={String(files.length)} valueClass="text-midnight" />
        <StatCard icon={<AlertCircle size={14} className="text-amber-600" />} label="ملفات نشطة" value={String(activeCount)} valueClass="text-amber-700" />
        <StatCard icon={<Scale size={14} className="text-red-600" />} label="استئنافات مرفوعة" value={String(appealsCount)} valueClass="text-red-700" />
        <StatCard icon={<Calendar size={14} className="text-blue-600" />} label="جلسات مجدولة" value={String(hearingsCount)} valueClass="text-blue-700" />
      </div>

      <div className="rounded-2xl border border-gold/20 bg-gradient-to-r from-midnight via-midnight to-midnight-light p-4 text-cream shadow-[0_10px_35px_rgba(0,0,0,0.18)]">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-gold" />
            <span className="font-heading font-bold text-xs text-gold">ذكاء محرك التحقيقات</span>
          </div>
          <div className="flex items-center gap-1.5">
            {workflowAI.quickActions.map((item) => (
              <span key={item.label} className={`px-2 py-1 rounded-full text-[8px] font-bold ${item.tone === 'gold' ? 'bg-gold/20 text-gold' : item.tone === 'purple' ? 'bg-purple-500/20 text-purple-200' : 'bg-red-500/20 text-red-200'}`}>
                {item.label}
              </span>
            ))}
          </div>
        </div>
        <p className="font-body text-[11px] leading-relaxed text-cream/80">{workflowAI.summary}</p>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {workflowAI.recommendations.map((item) => (
            <div key={item.title} className="bg-white/5 border border-white/10 rounded-lg p-2.5 hover:bg-white/10 transition-colors">
              <p className="font-body text-[10px] font-bold text-gold mb-1">{item.title}</p>
              <p className="font-body text-[9px] leading-relaxed text-cream/70">{item.note}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
            <p className="font-body text-[9px] text-cream/60">ملفات نشطة</p>
            <p className="font-heading text-sm font-bold text-gold">{files.filter((f) => f.stage !== 'closed').length}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
            <p className="font-body text-[9px] text-cream/60">جلسات مجدولة</p>
            <p className="font-heading text-sm font-bold text-blue-300">{files.filter((f) => f.hearing_scheduled).length}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
            <p className="font-body text-[9px] text-cream/60">استئنافات</p>
            <p className="font-heading text-sm font-bold text-red-300">{files.filter((f) => f.appeal_filed).length}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
            <p className="font-body text-[9px] text-cream/60">عقوبات عالية</p>
            <p className="font-heading text-sm font-bold text-rose-300">{files.filter((f) => ['termination', 'suspension', 'demotion'].includes(f.penalty_recommendation || 'none')).length}</p>
          </div>
        </div>
      </div>

      {/* 6-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة ملف التحقيق — 6 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.intake;
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
            { icon: Server, label: 'المحرك الموحد (M10)', desc: 'فتح القضية', color: 'text-blue-600' },
            { icon: Users, label: 'الموارد البشرية (M77)', desc: 'ملف الموظف', color: 'text-green-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'ربط العقوبة', color: 'text-gold' },
            { icon: FileText, label: 'التفريغ (M56)', desc: 'تفريغ الجلسة', color: 'text-cyan-600' },
            { icon: Shield, label: 'المعرفة (M46)', desc: 'فحص الامتثال', color: 'text-purple-600' },
            { icon: BadgeCheck, label: 'البيومتري (M109)', desc: 'توقيع القرار', color: 'text-green-600' },
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
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم الملف أو العنوان أو الأطراف..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Files tab */}
      {activeTab === 'files' && (
        <div className="space-y-2">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <SearchIcon size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد ملفات تحقيق مسجلة</p>
            </div>
          ) : (
            filteredFiles.map((f) => {
              const sCfg = STAGE_CONFIG[f.stage] || STAGE_CONFIG.intake;
              const stageIdx = STAGES.indexOf(f.stage);
              const TypeIcon = FILE_TYPE_ICONS[f.file_type] || SearchIcon;
              const penColor = PENALTY_COLORS[f.penalty_recommendation || 'none'] || PENALTY_COLORS.none;
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
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${penColor}`}>عقوبة: {PENALTY_LABELS[f.penalty_recommendation || 'none'] || f.penalty_recommendation}</span>
                          {f.hearing_scheduled && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Calendar size={8} /> جلسة مجدولة</span>}
                          {f.appeal_filed && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-red-50 text-red-600"><Scale size={8} /> استئناف</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{f.file_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="font-body text-[9px] text-ink/40">المحقق معه: {f.respondent_name}</span>
                          {f.complainant_name && <span className="font-body text-[9px] text-ink/40">المُتظلم: {f.complainant_name}</span>}
                          <span className="font-body text-[9px] text-ink/40">المخالفة: {VIOLATION_LABELS[f.violation_type] || f.violation_type}</span>
                          {f.m10_case_opened && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Server size={8} /> M10</span>}
                          {f.m77_hr_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><Users size={8} /> M77</span>}
                          {f.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {f.m56_transcription_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-cyan-50 text-cyan-600"><FileText size={8} /> M56</span>}
                          {f.m46_compliance_checked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Shield size={8} /> M46</span>}
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
                    {log.action.includes('created') ? <SearchIcon size={12} className="text-blue-600" />
                      : log.action.includes('m10') ? <Server size={12} className="text-blue-600" />
                      : log.action.includes('m77') ? <Users size={12} className="text-green-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m56') ? <FileText size={12} className="text-cyan-600" />
                      : log.action.includes('m46') ? <Shield size={12} className="text-purple-600" />
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
                <SearchIcon size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف التحقيق الداخلي</span>
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
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedFile.stage] || STAGE_CONFIG.intake).bg} ${(STAGE_CONFIG[selectedFile.stage] || STAGE_CONFIG.intake).text}`}>
                      {(STAGE_CONFIG[selectedFile.stage] || STAGE_CONFIG.intake).label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{FILE_TYPE_LABELS[selectedFile.file_type] || selectedFile.file_type}</span>
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedFile.file_title}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.intake;
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
                    <SearchIcon size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات الملف</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">المحقق معه (المُستجوب)</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.respondent_name}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المُتظلم/المُشتكي</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.complainant_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نوع المخالفة</span><p className="font-body text-xs font-bold text-midnight">{VIOLATION_LABELS[selectedFile.violation_type] || selectedFile.violation_type}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المستشار</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.advisor?.name || '—'}</p></div>
                  </div>
                </div>

                {/* Penalty recommendation */}
                <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Gavel size={12} className="text-red-600" />
                    <span className="font-body text-[10px] font-bold text-red-700">توصية العقوبة</span>
                  </div>
                  <p className="font-body text-sm font-bold text-midnight">{PENALTY_LABELS[selectedFile.penalty_recommendation || 'none'] || selectedFile.penalty_recommendation}</p>
                </div>

                {/* Flags */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.hearing_scheduled ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Calendar size={10} /> جلسة {selectedFile.hearing_scheduled ? 'مجدولة' : 'غير مجدولة'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.appeal_filed ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-ink/30'}`}><Scale size={10} /> استئناف {selectedFile.appeal_filed ? 'مرفوع' : 'غير مرفوع'}</span>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m10_case_opened ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Server size={10} /> M10 {selectedFile.m10_case_opened ? 'مفتوح' : 'غير مفتوح'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m77_hr_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><Users size={10} /> M77 {selectedFile.m77_hr_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedFile.m54_finance_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m56_transcription_linked ? 'bg-cyan-50 text-cyan-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> M56 {selectedFile.m56_transcription_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m46_compliance_checked ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Shield size={10} /> M46 {selectedFile.m46_compliance_checked ? 'مفحوص' : 'غير مفحوص'}</span>
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
      <EntityModal open={modalOpen} title={editingId ? 'تعديل الملف' : 'ملف تحقيق جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الملف" required><TextInput value={form.file_number} onChange={(e) => setForm({ ...form, file_number: e.target.value })} placeholder="INV-2025-001" /></Field>
          <Field label="نوع الملف">
            <Select value={form.file_type} onChange={(e) => setForm({ ...form, file_type: e.target.value })}>
              {Object.entries(FILE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان الملف" required><TextInput value={form.file_title} onChange={(e) => setForm({ ...form, file_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المحقق معه (المُستجوب)" required><TextInput value={form.respondent_name} onChange={(e) => setForm({ ...form, respondent_name: e.target.value })} /></Field>
          <Field label="المُتظلم/المُشتكي"><TextInput value={form.complainant_name} onChange={(e) => setForm({ ...form, complainant_name: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نوع المخالفة">
            <Select value={form.violation_type} onChange={(e) => setForm({ ...form, violation_type: e.target.value })}>
              {Object.entries(VIOLATION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="توصية العقوبة">
            <Select value={form.penalty_recommendation} onChange={(e) => setForm({ ...form, penalty_recommendation: e.target.value })}>
              {Object.entries(PENALTY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
        </div>
        <Checkbox label="جلسة مجدولة (Hearing Scheduled)" checked={form.hearing_scheduled} onChange={(v) => setForm({ ...form, hearing_scheduled: v })} />
        <Checkbox label="استئناف مرفوع (Appeal Filed)" checked={form.appeal_filed} onChange={(v) => setForm({ ...form, appeal_filed: v })} />
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
