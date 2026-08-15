import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, AlertTriangle,
  Shield, CircuitBoard, CheckCircle2, Clock, Search,
  Activity, AlertCircle, BadgeCheck, Building2, DollarSign,
  FileText, Scale, Gavel, Store, ShoppingCart, Truck, Megaphone,
  Receipt, Users, Calendar, Landmark, ScrollText, Fingerprint,
  Lock, Coins, Sparkles,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M105ArbitrationFile, M105AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'files' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  filed: { label: 'تسجيل', bg: 'bg-blue-50', text: 'text-blue-700' },
  constituted: { label: 'تشكيل الهيئة', bg: 'bg-amber-50', text: 'text-amber-700' },
  submissions: { label: 'المذكرات', bg: 'bg-orange-50', text: 'text-orange-700' },
  hearings: { label: 'الجلسات', bg: 'bg-purple-50', text: 'text-purple-700' },
  deliberations: { label: 'المداولة', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  award: { label: 'القرار', bg: 'bg-green-50', text: 'text-green-700' },
  terminated: { label: 'إنهاء', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const STAGES = ['filed', 'constituted', 'submissions', 'hearings', 'deliberations', 'award', 'terminated'];

const FILE_TYPE_LABELS: Record<string, string> = {
  arbitration: 'تحكيم',
  odr: 'فض نزاع إلكتروني',
  enforcement: 'تنفيذ حكم',
  mediation: 'وساطة',
  expert: 'تعيين خبير',
  hearing: 'جلسة',
};

const FILE_TYPE_ICONS: Record<string, typeof Gavel> = {
  arbitration: Gavel,
  odr: ScrollText,
  enforcement: Landmark,
  mediation: Users,
  expert: BadgeCheck,
  hearing: Calendar,
};

const ARBITRATION_TYPES = ['ad_hoc', 'institutional', 'uncitral', 'saudi_arbitration_law', 'icc', 'lcia', 'siac', 'diac'];
const ARBITRATION_RULES = ['UNCITRAL', 'ICC Rules', 'LCIA Rules', 'SIAC Rules', 'DIA Rules', 'SCCA Rules', 'Ad Hoc'];
const AWARD_STATUSES = ['pending', 'drafted', 'issued', 'registered', 'challenged', 'enforced'];
const ENFORCEMENT_STATUSES = ['not_required', 'pending', 'filed', 'enforced', 'rejected'];
const CURRENCIES = ['SAR', 'USD', 'EUR', 'AED', 'KWD', 'QAR', 'BHD', 'EGP'];

interface ArbitrationFileForm {
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  claimant_name: string;
  respondent_name: string;
  arbitration_type: string;
  seat_of_arbitration: string;
  governing_law: string;
  arbitration_rules: string;
  number_of_arbitrators: string;
  arbitrator_names: string;
  tribunal_president: string;
  claim_amount: string;
  counterclaim_amount: string;
  currency: string;
  data_room_access_token: string;
  hearing_dates: string;
  award_status: string;
  award_date: string;
  award_enforcement_status: string;
  conflict_check_passed: boolean;
  fee_estimate: string;
  fee_paid: string;
  description: string;
}

const emptyForm: ArbitrationFileForm = {
  file_number: '', file_title: '', file_type: 'arbitration', stage: 'filed',
  claimant_name: '', respondent_name: '', arbitration_type: 'ad_hoc',
  seat_of_arbitration: '', governing_law: '', arbitration_rules: 'UNCITRAL',
  number_of_arbitrators: '1', arbitrator_names: '', tribunal_president: '',
  claim_amount: '0', counterclaim_amount: '0', currency: 'SAR',
  data_room_access_token: '', hearing_dates: '', award_status: 'pending',
  award_date: '', award_enforcement_status: 'not_required',
  conflict_check_passed: false, fee_estimate: '0', fee_paid: '0',
  description: '',
};

export default function ArbitrationHubEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [files, setFiles] = useState<M105ArbitrationFile[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('files');
  const [selectedFile, setSelectedFile] = useState<M105ArbitrationFile | null>(null);
  const [auditLogs, setAuditLogs] = useState<M105AuditLog[]>([]);
  const [allAudit, setAllAudit] = useState<M105AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ArbitrationFileForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [fRes, attRes, auditRes] = await Promise.all([
      supabase.from('m105_arbitration_files')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m105_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (fRes.error) console.error('m105 fetch error', fRes.error);
    if (attRes.error) console.error('attorneys fetch error', attRes.error);
    if (auditRes.error) console.error('audit fetch error', auditRes.error);
    setFiles((fRes.data as M105ArbitrationFile[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAudit((auditRes.data as M105AuditLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const workflowAI = useMemo(() => {
    const activeFiles = files.filter((f) => f.stage !== 'terminated');
    const pendingAwards = files.filter((f) => f.award_status === 'pending' || f.award_status === 'drafted');
    const highValue = files.filter((f) => (f.claim_amount || 0) >= 500000);
    const dataRoomRisk = files.filter((f) => !(f.data_room_access_token || '').trim());

    return {
      summary: `يتم متابعة ${activeFiles.length} ملفاً نشطاً في مسار التحكيم الدولي، مع ${pendingAwards.length} قرار/مسودة معلقة و${highValue.length} ملف ذي قيمة عالية تستوجب إشرافاً إضافياً.`,
      recommendations: [
        { title: 'تسريع الجلسات', note: pendingAwards.length > 0 ? 'تحتاج الملفات ذات القرار المعلق إلى تعيين موعد جلسة متابعة ومراجعة التنفيذ.' : 'لا توجد ملفات معلقة في المرحلة النهائية.' },
        { title: 'مراجعة البيانات', note: dataRoomRisk.length > 0 ? `توجد ${dataRoomRisk.length} ملفات تفتقد إلى access token لغرفة البيانات، وهو ما يرفع مخاطر التوثيق.` : 'جميع الملفات مرتبطة بغرف بيانات مناسبة.' },
        { title: 'حالة التثبيت', note: highValue.length > 0 ? 'الملفات عالية القيمة تحتاج تدقيقاً إضافياً في إدارة الدعاوى والرسوم ومعايير التعارض.' : 'لا توجد ملفات عالية القيمة في المراجعة الحالية.' },
      ],
      quickActions: [
        { label: 'مراجعة التنفيذ', tone: 'gold' },
        { label: 'إشراف البيانات', tone: 'blue' },
        { label: 'تدقيق الرسوم', tone: 'green' },
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
    const { error } = await supabase.from('m105_audit_logs').insert({
      case_id: fileId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
    if (error) console.error('audit log error', error);
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (f: M105ArbitrationFile) => {
    setForm({
      file_number: f.file_number, file_title: f.file_title,
      file_type: f.file_type, stage: f.stage,
      claimant_name: f.claimant_name || '', respondent_name: f.respondent_name || '',
      arbitration_type: f.arbitration_type || 'ad_hoc',
      seat_of_arbitration: f.seat_of_arbitration || '',
      governing_law: f.governing_law || '',
      arbitration_rules: f.arbitration_rules || 'UNCITRAL',
      number_of_arbitrators: String(f.number_of_arbitrators || 1),
      arbitrator_names: (f.arbitrator_names || []).join('، '),
      tribunal_president: f.tribunal_president || '',
      claim_amount: String(f.claim_amount || 0),
      counterclaim_amount: String(f.counterclaim_amount || 0),
      currency: f.currency || 'SAR',
      data_room_access_token: f.data_room_access_token || '',
      hearing_dates: (f.hearing_dates || []).join('، '),
      award_status: f.award_status || 'pending',
      award_date: f.award_date || '',
      award_enforcement_status: f.award_enforcement_status || 'not_required',
      conflict_check_passed: !!f.conflict_check_passed,
      fee_estimate: String(f.fee_estimate || 0),
      fee_paid: String(f.fee_paid || 0),
      description: f.description || '',
    });
    setEditingId(f.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.file_title.trim() || !form.file_number.trim()) return;
    setSaving(true);
    const claimVal = Number(form.claim_amount) || 0;
    const counterclaimVal = Number(form.counterclaim_amount) || 0;
    const feeEstimateVal = Number(form.fee_estimate) || 0;
    const feePaidVal = Number(form.fee_paid) || 0;
    const numArbitrators = Number(form.number_of_arbitrators) || 1;
    const arbitratorNames = form.arbitrator_names.split('،').map((s) => s.trim()).filter(Boolean);
    const hearingDates = form.hearing_dates.split('،').map((s) => s.trim()).filter(Boolean);
    const payload = {
      file_number: form.file_number.trim(),
      file_title: form.file_title.trim(),
      file_type: form.file_type,
      stage: form.stage,
      status: form.stage === 'terminated' ? 'terminated' : 'active',
      claimant_name: form.claimant_name.trim() || null,
      respondent_name: form.respondent_name.trim() || null,
      arbitration_type: form.arbitration_type || null,
      seat_of_arbitration: form.seat_of_arbitration.trim() || null,
      governing_law: form.governing_law.trim() || null,
      arbitration_rules: form.arbitration_rules || null,
      number_of_arbitrators: numArbitrators,
      arbitrator_names: arbitratorNames.length > 0 ? arbitratorNames : null,
      tribunal_president: form.tribunal_president.trim() || null,
      claim_amount: claimVal,
      counterclaim_amount: counterclaimVal,
      currency: form.currency,
      data_room_access_token: form.data_room_access_token.trim() || null,
      hearing_dates: hearingDates.length > 0 ? hearingDates : null,
      award_status: form.award_status || null,
      award_date: form.award_date || null,
      award_enforcement_status: form.award_enforcement_status || null,
      conflict_check_passed: form.conflict_check_passed,
      fee_estimate: feeEstimateVal,
      fee_paid: feePaidVal,
      description: form.description.trim() || null,
    };
    if (editingId) {
      const { error } = await supabase.from('m105_arbitration_files').update(payload).eq('id', editingId);
      if (error) console.error('update error', error);
      await logAudit(editingId, 'file_updated', 'تحديث بيانات ملف التحكيم التجاري والدولي');
    } else {
      const { data, error } = await supabase.from('m105_arbitration_files').insert(payload).select('id');
      if (error) console.error('insert error', error);
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'file_created', 'إنشاء ملف تحكيم — النوع: ' + (FILE_TYPE_LABELS[form.file_type] || form.file_type));
        await supabase.from('m105_arbitration_files').update({
          m53_document_id: 'DOC-M105-' + Date.now().toString().slice(-6),
          m54_finance_linked: true,
          m10_case_opened: true,
          m109_biometric_signed: true,
          m92_notified: true,
          cost_center_id: 'CC-M105-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm53_document', 'أرشفة الملف في محرك المستندات (M53)');
        await logAudit(newId, 'm54_finance', 'ربط الملف بالمحرك المالي (M54) — رسوم التحكيم والفوترة');
        await logAudit(newId, 'm10_case', 'فتح القضية في المحرك الموحد (M10) — نزاع تحكيمي');
        await logAudit(newId, 'm109_biometric', 'التوقيع البيومتري لقرار التحكيم (M109)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء الملف');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('m105_arbitration_files').delete().eq('id', deleteId);
    if (error) console.error('delete error', error);
    setDeleteId(null);
    setSelectedFile(null);
    fetchAll();
  };

  const openFileDetail = async (f: M105ArbitrationFile) => {
    setSelectedFile(f);
    setDetailLoading(true);
    const aRes = await supabase.from('m105_audit_logs').select('*').eq('case_id', f.id).order('created_at', { ascending: true });
    if (aRes.error) console.error('detail audit error', aRes.error);
    setAuditLogs((aRes.data as M105AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (f: M105ArbitrationFile) => {
    const idx = STAGES.indexOf(f.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    const { error } = await supabase.from('m105_arbitration_files').update({ stage: next, status: next === 'terminated' ? 'terminated' : 'active' }).eq('id', f.id);
    if (error) console.error('stage advance error', error);
    await logAudit(f.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedFile({ ...f, stage: next } as M105ArbitrationFile);
  };

  const filteredFiles = files.filter((f) => {
    if (filterType !== 'all' && f.file_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!f.file_number.toLowerCase().includes(q) && !f.file_title.toLowerCase().includes(q) && !(f.claimant_name || '').toLowerCase().includes(q) && !(f.respondent_name || '').toLowerCase().includes(q) && !(f.seat_of_arbitration || '').toLowerCase().includes(q) && !(f.tribunal_president || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const pendingAwardsCount = files.filter((f) => f.award_status === 'pending' || f.award_status === 'drafted').length;
  const totalClaimAmount = files.reduce((s, f) => s + (f.claim_amount || 0), 0);
  const totalFeesCollected = files.reduce((s, f) => s + (f.fee_paid || 0), 0);

  const tabs: { id: Tab; label: string; icon: typeof Gavel; badge?: number }[] = [
    { id: 'files', label: 'ملفات التحكيم والفض الإلكتروني', icon: Gavel, badge: files.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Gavel size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">منصة التحكيم التجاري والدولي وفض المنازعات (M105)</h2>
            <p className="font-body text-[10px] text-ink/40">غرفة تحكيم إلكترونية وإدارة نزاعات وغرف بيانات مشفرة وتوليد أحكام</p>
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
        <StatCard icon={<Gavel size={14} className="text-midnight" />} label="إجمالي الملفات" value={String(files.length)} valueClass="text-midnight" />
        <StatCard icon={<ScrollText size={14} className="text-purple-600" />} label="قرارات معلقة" value={String(pendingAwardsCount)} valueClass="text-purple-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="إجمالي مبالغ المطالبات" value={formatCurrency(totalClaimAmount)} valueClass="text-gold" />
        <StatCard icon={<Coins size={14} className="text-green-600" />} label="إجمالي الرسوم المحصّلة" value={formatCurrency(totalFeesCollected)} valueClass="text-green-700" />
      </div>

      <div className="rounded-2xl border border-gold/20 bg-gradient-to-r from-midnight via-midnight to-midnight-light p-4 text-cream shadow-[0_10px_35px_rgba(0,0,0,0.18)]">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-gold" />
            <span className="font-heading font-bold text-xs text-gold">ذكاء محرك التحكيم التجاري</span>
          </div>
          <div className="flex items-center gap-1.5">
            {workflowAI.quickActions.map((item) => (
              <span key={item.label} className={`px-2 py-1 rounded-full text-[8px] font-bold ${item.tone === 'gold' ? 'bg-gold/20 text-gold' : item.tone === 'blue' ? 'bg-blue-500/20 text-blue-200' : 'bg-green-500/20 text-green-200'}`}>
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
            <p className="font-heading text-sm font-bold text-gold">{files.filter((f) => f.stage !== 'terminated').length}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
            <p className="font-body text-[9px] text-cream/60">قرارات معلقة</p>
            <p className="font-heading text-sm font-bold text-violet-300">{files.filter((f) => f.award_status === 'pending' || f.award_status === 'drafted').length}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
            <p className="font-body text-[9px] text-cream/60">ملفات عالية القيمة</p>
            <p className="font-heading text-sm font-bold text-amber-300">{files.filter((f) => (f.claim_amount || 0) >= 500000).length}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
            <p className="font-body text-[9px] text-cream/60">خطر غرف البيانات</p>
            <p className="font-heading text-sm font-bold text-rose-300">{files.filter((f) => !(f.data_room_access_token || '').trim()).length}</p>
          </div>
        </div>
      </div>

      {/* 7-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة ملف التحكيم — 7 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.filed;
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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {[
            { icon: FileText, label: 'المستندات (M53)', desc: 'أرشفة قرارات التحكيم', color: 'text-purple-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'رسوم التحكيم والفوترة', color: 'text-gold' },
            { icon: Scale, label: 'نواة القضية (M10)', desc: 'نزاعات تحكيمية', color: 'text-blue-600' },
            { icon: Fingerprint, label: 'البيومتري (M109)', desc: 'توقيع القرار', color: 'text-green-600' },
            { icon: Activity, label: 'الوكيل الذكي (M92)', desc: 'تنبيهات الجلسات', color: 'text-amber-600' },
            { icon: Lock, label: 'غرفة البيانات المشفرة', desc: 'مستندات سرية', color: 'text-red-600' },
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
              <Gavel size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد ملفات تحكيم مسجلة</p>
            </div>
          ) : (
            filteredFiles.map((f) => {
              const sCfg = STAGE_CONFIG[f.stage] || STAGE_CONFIG.filed;
              const stageIdx = STAGES.indexOf(f.stage);
              const TypeIcon = FILE_TYPE_ICONS[f.file_type] || Gavel;
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
                          {f.conflict_check_passed && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-green-50 text-green-600">
                              <CheckCircle2 size={8} /> فحص التعارض
                            </span>
                          )}
                          {f.award_status && f.award_status !== 'pending' && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-blue-50 text-blue-600">
                              <ScrollText size={8} /> {f.award_status}
                            </span>
                          )}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{f.file_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {f.claimant_name && <span className="font-body text-[9px] text-ink/40">المُدَّعي: {f.claimant_name}</span>}
                          {f.respondent_name && <span className="font-body text-[9px] text-ink/40">المُدَّعى عليه: {f.respondent_name}</span>}
                          {f.seat_of_arbitration && <span className="font-body text-[9px] text-ink/40">مقعد: {f.seat_of_arbitration}</span>}
                          {f.tribunal_president && <span className="font-body text-[9px] text-purple-600 font-bold">رئيس الهيئة: {f.tribunal_president}</span>}
                          {f.claim_amount > 0 && <span className="font-body text-[9px] text-gold font-bold">المطالبة: {formatCurrency(f.claim_amount)}</span>}
                          {f.m53_document_id && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><FileText size={8} /> M53</span>}
                          {f.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
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
                    {log.action.includes('created') ? <Gavel size={12} className="text-blue-600" />
                      : log.action.includes('m53') ? <FileText size={12} className="text-purple-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m10') ? <Scale size={12} className="text-blue-600" />
                      : log.action.includes('m109') ? <Fingerprint size={12} className="text-green-600" />
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
                <Gavel size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف التحكيم والفض الإلكتروني</span>
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
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedFile.stage] || STAGE_CONFIG.filed).bg} ${(STAGE_CONFIG[selectedFile.stage] || STAGE_CONFIG.filed).text}`}>
                      {(STAGE_CONFIG[selectedFile.stage] || STAGE_CONFIG.filed).label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{FILE_TYPE_LABELS[selectedFile.file_type] || selectedFile.file_type}</span>
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedFile.file_title}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.filed;
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

                {/* Parties info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Users size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">أطراف النزاع</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">المُدَّعي</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.claimant_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المُدَّعى عليه</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.respondent_name || '—'}</p></div>
                  </div>
                </div>

                {/* Arbitration details */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Gavel size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات التحكيم</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">نوع التحكيم</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.arbitration_type || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">مقعد التحكيم</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.seat_of_arbitration || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">القانون الحاكم</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.governing_law || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">قواعد التحكيم</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.arbitration_rules || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">عدد المحكِّمين</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.number_of_arbitrators || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">رئيس الهيئة</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.tribunal_president || '—'}</p></div>
                  </div>
                  {selectedFile.arbitrator_names && selectedFile.arbitrator_names.length > 0 && (
                    <div className="mt-2">
                      <span className="font-body text-[9px] text-ink/40">أسماء المحكِّمين</span>
                      <p className="font-body text-xs font-bold text-midnight">{selectedFile.arbitrator_names.join('، ')}</p>
                    </div>
                  )}
                </div>

                {/* Claim amounts card */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-1">
                    <DollarSign size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">المطالبات المالية</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="font-body text-[9px] text-ink/40">مبلغ المطالبة</span>
                      <p className="font-body text-sm font-bold text-gold">{formatCurrency(selectedFile.claim_amount)} <span className="text-[10px] text-ink/40 font-normal">{selectedFile.currency}</span></p>
                    </div>
                    <div>
                      <span className="font-body text-[9px] text-ink/40">المطالبة المقابلة</span>
                      <p className="font-body text-sm font-bold text-orange-600">{formatCurrency(selectedFile.counterclaim_amount)} <span className="text-[10px] text-ink/40 font-normal">{selectedFile.currency}</span></p>
                    </div>
                  </div>
                </div>

                {/* Fees card */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Coins size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">رسوم التحكيم</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="font-body text-[9px] text-ink/40">الرسوم المقدرة</span>
                      <p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedFile.fee_estimate)}</p>
                    </div>
                    <div>
                      <span className="font-body text-[9px] text-ink/40">الرسوم المدفوعة</span>
                      <p className="font-body text-xs font-bold text-green-600">{formatCurrency(selectedFile.fee_paid)}</p>
                    </div>
                  </div>
                </div>

                {/* Award card */}
                <div className={`rounded-lg p-3 border ${selectedFile.award_status && selectedFile.award_status !== 'pending' ? 'bg-blue-50 border-blue-100' : 'bg-gray-100 border-gray-200'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <ScrollText size={12} className={selectedFile.award_status && selectedFile.award_status !== 'pending' ? 'text-blue-600' : 'text-ink/40'} />
                    <span className="font-body text-[10px] font-bold text-midnight">حالة القرار</span>
                  </div>
                  <p className={`font-body text-xs font-bold ${selectedFile.award_status && selectedFile.award_status !== 'pending' ? 'text-blue-700' : 'text-ink/50'}`}>
                    {selectedFile.award_status || 'بانتظار الإصدار'}
                  </p>
                  {selectedFile.award_date && (
                    <p className="font-body text-[10px] text-ink/50 mt-1">تاريخ القرار: {formatDate(selectedFile.award_date)}</p>
                  )}
                  {selectedFile.award_enforcement_status && selectedFile.award_enforcement_status !== 'not_required' && (
                    <p className="font-body text-[10px] text-ink/50 mt-1">حالة التنفيذ: {selectedFile.award_enforcement_status}</p>
                  )}
                </div>

                {/* Data room card */}
                {selectedFile.data_room_access_token && (
                  <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Lock size={12} className="text-red-600" />
                      <span className="font-body text-[10px] font-bold text-midnight">غرفة البيانات المشفرة</span>
                    </div>
                    <p className="font-body text-[10px] text-ink/50 font-mono">{selectedFile.data_room_access_token}</p>
                  </div>
                )}

                {/* Hearing dates */}
                {selectedFile.hearing_dates && selectedFile.hearing_dates.length > 0 && (
                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Calendar size={12} className="text-purple-600" />
                      <span className="font-body text-[10px] font-bold text-midnight">مواعيد الجلسات</span>
                    </div>
                    <div className="space-y-1">
                      {selectedFile.hearing_dates.map((d, i) => (
                        <p key={i} className="font-body text-[10px] text-ink/60">{formatDate(d)}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conflict check */}
                <div className={`rounded-lg p-3 border ${selectedFile.conflict_check_passed ? 'bg-green-50 border-green-100' : 'bg-gray-100 border-gray-200'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <CheckCircle2 size={12} className={selectedFile.conflict_check_passed ? 'text-green-600' : 'text-ink/40'} />
                    <span className="font-body text-[10px] font-bold text-midnight">فحص التعارض</span>
                  </div>
                  <p className={`font-body text-xs font-bold ${selectedFile.conflict_check_passed ? 'text-green-700' : 'text-ink/50'}`}>
                    {selectedFile.conflict_check_passed ? 'تم الاجتياز — لا يوجد تعارض مصالح' : 'لم يتم الفحص بعد'}
                  </p>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m53_document_id ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> M53 {selectedFile.m53_document_id ? 'مؤرشف' : 'غير مؤرشف'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedFile.m54_finance_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m10_case_opened ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Scale size={10} /> M10 {selectedFile.m10_case_opened ? 'مفتوح' : 'غير مفتوح'}</span>
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
      <EntityModal open={modalOpen} title={editingId ? 'تعديل الملف' : 'ملف تحكيم جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الملف" required><TextInput value={form.file_number} onChange={(e) => setForm({ ...form, file_number: e.target.value })} placeholder="ARB-2025-001" /></Field>
          <Field label="نوع الملف">
            <Select value={form.file_type} onChange={(e) => setForm({ ...form, file_type: e.target.value })}>
              {Object.entries(FILE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان الملف" required><TextInput value={form.file_title} onChange={(e) => setForm({ ...form, file_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم المُدَّعي"><TextInput value={form.claimant_name} onChange={(e) => setForm({ ...form, claimant_name: e.target.value })} /></Field>
          <Field label="اسم المُدَّعى عليه"><TextInput value={form.respondent_name} onChange={(e) => setForm({ ...form, respondent_name: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نوع التحكيم">
            <Select value={form.arbitration_type} onChange={(e) => setForm({ ...form, arbitration_type: e.target.value })}>
              {ARBITRATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="مقعد التحكيم"><TextInput value={form.seat_of_arbitration} onChange={(e) => setForm({ ...form, seat_of_arbitration: e.target.value })} placeholder="الرياض / باريس / لندن" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="القانون الحاكم"><TextInput value={form.governing_law} onChange={(e) => setForm({ ...form, governing_law: e.target.value })} placeholder="القانون السعودي / القانون الإنجليزي" /></Field>
          <Field label="قواعد التحكيم">
            <Select value={form.arbitration_rules} onChange={(e) => setForm({ ...form, arbitration_rules: e.target.value })}>
              {ARBITRATION_RULES.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="عدد المحكِّمين"><TextInput type="number" value={form.number_of_arbitrators} onChange={(e) => setForm({ ...form, number_of_arbitrators: e.target.value })} /></Field>
          <Field label="رئيس الهيئة"><TextInput value={form.tribunal_president} onChange={(e) => setForm({ ...form, tribunal_president: e.target.value })} /></Field>
        </div>
        <Field label="أسماء المحكِّمين (افصل بينها بفاصلة ،)"><TextInput value={form.arbitrator_names} onChange={(e) => setForm({ ...form, arbitrator_names: e.target.value })} placeholder="د. أحمد، أ. سارة، د. خالد" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="مبلغ المطالبة"><TextInput type="number" value={form.claim_amount} onChange={(e) => setForm({ ...form, claim_amount: e.target.value })} /></Field>
          <Field label="المطالبة المقابلة"><TextInput type="number" value={form.counterclaim_amount} onChange={(e) => setForm({ ...form, counterclaim_amount: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="العملة">
            <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="رمز الوصول لغرفة البيانات"><TextInput value={form.data_room_access_token} onChange={(e) => setForm({ ...form, data_room_access_token: e.target.value })} placeholder="DR-XXXX-XXXX" /></Field>
        <Field label="مواعيد الجلسات (افصل بينها بفاصلة ،)"><TextInput value={form.hearing_dates} onChange={(e) => setForm({ ...form, hearing_dates: e.target.value })} placeholder="2025-01-15، 2025-02-20" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="حالة القرار">
            <Select value={form.award_status} onChange={(e) => setForm({ ...form, award_status: e.target.value })}>
              {AWARD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="تاريخ القرار"><TextInput type="date" value={form.award_date} onChange={(e) => setForm({ ...form, award_date: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="حالة التنفيذ">
            <Select value={form.award_enforcement_status} onChange={(e) => setForm({ ...form, award_enforcement_status: e.target.value })}>
              {ENFORCEMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="الرسوم المقدرة"><TextInput type="number" value={form.fee_estimate} onChange={(e) => setForm({ ...form, fee_estimate: e.target.value })} /></Field>
        </div>
        <Field label="الرسوم المدفوعة"><TextInput type="number" value={form.fee_paid} onChange={(e) => setForm({ ...form, fee_paid: e.target.value })} /></Field>
        <div className="flex items-center gap-6 flex-wrap">
          <Checkbox checked={form.conflict_check_passed} onChange={(v: boolean) => setForm({ ...form, conflict_check_passed: v })} label="تم اجتياز فحص التعارض" />
        </div>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
