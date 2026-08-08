import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, Receipt,
  Shield, CircuitBoard, Zap, CheckCircle2, Clock, ArrowRight, Search,
  FileText, Activity, Server, AlertCircle, BadgeCheck,
  DollarSign, BookOpen, Calendar, Scale,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M35TaxFile, M35AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'files' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  intake: { label: 'الاستلام', bg: 'bg-blue-50', text: 'text-blue-700' },
  review: { label: 'المراجعة', bg: 'bg-amber-50', text: 'text-amber-700' },
  assessment: { label: 'التقييم', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  appeal: { label: 'الطعن', bg: 'bg-purple-50', text: 'text-purple-700' },
  settlement: { label: 'التسوية', bg: 'bg-green-50', text: 'text-green-700' },
  closed: { label: 'الإغلاق', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const STAGES = ['intake', 'review', 'assessment', 'appeal', 'settlement', 'closed'];

const FILE_TYPE_LABELS: Record<string, string> = {
  income_tax: 'ضريبة الدخل',
  vat: 'ضريبة القيمة المضافة',
  real_estate_tax: 'الضريبة العقارية',
  customs_duty: 'الرسوم الجمركية',
  commercial_tax: 'الضريبة التجارية',
};

interface TaxFileForm {
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  taxpayer_name: string;
  tax_category: string;
  tax_period: string;
  declared_amount: string;
  assessed_amount: string;
  dispute_amount: string;
  exemptions_applied: string;
  deadline_date: string;
  description: string;
}

const emptyForm: TaxFileForm = {
  file_number: '', file_title: '', file_type: 'income_tax', stage: 'intake',
  taxpayer_name: '', tax_category: '', tax_period: '',
  declared_amount: '0', assessed_amount: '0', dispute_amount: '0',
  exemptions_applied: '', deadline_date: '', description: '',
};

export default function CustomsTaxEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [files, setFiles] = useState<M35TaxFile[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('files');
  const [selectedFile, setSelectedFile] = useState<M35TaxFile | null>(null);
  const [auditLogs, setAuditLogs] = useState<M35AuditLog[]>([]);
  const [allAudit, setAllAudit] = useState<M35AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TaxFileForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [fileRes, attRes, auditRes] = await Promise.all([
      supabase.from('m35_tax_files')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m35_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setFiles((fileRes.data as M35TaxFile[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAudit((auditRes.data as M35AuditLog[]) || []);
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
    await supabase.from('m35_audit_logs').insert({
      case_id: fileId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (f: M35TaxFile) => {
    setForm({
      file_number: f.file_number, file_title: f.file_title,
      file_type: f.file_type, stage: f.stage,
      taxpayer_name: f.taxpayer_name || '', tax_category: f.tax_category || '',
      tax_period: f.tax_period || '',
      declared_amount: String(f.declared_amount || 0), assessed_amount: String(f.assessed_amount || 0),
      dispute_amount: String(f.dispute_amount || 0),
      exemptions_applied: f.exemptions_applied || '',
      deadline_date: f.deadline_date || '', description: f.description || '',
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
      status: form.stage,
      taxpayer_name: form.taxpayer_name.trim() || null,
      tax_category: form.tax_category.trim() || null,
      tax_period: form.tax_period.trim() || null,
      declared_amount: Number(form.declared_amount) || 0,
      assessed_amount: Number(form.assessed_amount) || 0,
      dispute_amount: Number(form.dispute_amount) || 0,
      exemptions_applied: form.exemptions_applied.trim() || null,
      deadline_date: form.deadline_date || null,
      description: form.description.trim() || null,
    };
    if (editingId) {
      await supabase.from('m35_tax_files').update(payload).eq('id', editingId);
      await logAudit(editingId, 'tax_file_updated', 'تحديث بيانات الملف الضريبي');
    } else {
      const { data } = await supabase.from('m35_tax_files').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'tax_file_created', 'إنشاء ملف ضريبي — نوع: ' + (FILE_TYPE_LABELS[form.file_type] || form.file_type));
        await supabase.from('m35_tax_files').update({
          m54_finance_linked: true,
          m90_import_export_linked: true,
          m83_property_linked: true,
          m46_compliance_checked: true,
          m10_case_opened: true,
          m109_biometric_required: true,
          m92_notified: true,
          cost_center_id: 'CC-M35-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm54_finance', 'ربط الملف بالمحرك المالي (M54)');
        await logAudit(newId, 'm90_import_export', 'ربط الملف بمحرك الاستيراد/التصدير (M90)');
        await logAudit(newId, 'm83_property', 'تقييم العقارات في محرك التقييم (M83)');
        await logAudit(newId, 'm46_compliance', 'التحقق من الامتثال في محرك الزكاة (M46)');
        await logAudit(newId, 'm10_linked', 'ربط الملف بقضية في المحرك الموحد (M10)');
        await logAudit(newId, 'm109_biometric', 'التحقق البيومتري للممول (M109)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء الملف');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('m35_tax_files').delete().eq('id', deleteId);
    setDeleteId(null);
    setSelectedFile(null);
    fetchAll();
  };

  const openFileDetail = async (f: M35TaxFile) => {
    setSelectedFile(f);
    setDetailLoading(true);
    const aRes = await supabase.from('m35_audit_logs').select('*').eq('case_id', f.id).order('created_at', { ascending: true });
    setAuditLogs((aRes.data as M35AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (f: M35TaxFile) => {
    const idx = STAGES.indexOf(f.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    await supabase.from('m35_tax_files').update({ stage: next, status: next }).eq('id', f.id);
    await logAudit(f.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedFile({ ...f, stage: next, status: next } as M35TaxFile);
  };

  const filteredFiles = files.filter((f) => {
    if (filterType !== 'all' && f.file_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!f.file_number.toLowerCase().includes(q) && !f.file_title.toLowerCase().includes(q) &&
          !(f.taxpayer_name || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeDisputes = files.filter((f) => f.stage === 'appeal' || f.dispute_amount > 0).length;
  const totalAssessed = files.reduce((s, f) => s + (f.assessed_amount || 0), 0);
  const totalDispute = files.reduce((s, f) => s + (f.dispute_amount || 0), 0);

  const tabs: { id: Tab; label: string; icon: typeof Receipt; badge?: number }[] = [
    { id: 'files', label: 'الملفات الضريبية', icon: Receipt, badge: files.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Receipt size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">الجمارك والضرائب والضرائب العقارية (M35)</h2>
            <p className="font-body text-[10px] text-ink/40">إدارة الملفات الضريبية والجمركية — التقييم والطعن والتسوية</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Shield size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">On-Premise · ZK-Audit</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> ملف ضريبي جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Receipt size={14} className="text-midnight" />} label="إجمالي الملفات" value={String(files.length)} valueClass="text-midnight" />
        <StatCard icon={<Scale size={14} className="text-purple-600" />} label="نزاعات نشطة" value={String(activeDisputes)} valueClass="text-purple-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="إجمالي المبالغ المُقيَّمة" value={formatCurrency(totalAssessed)} valueClass="text-gold" />
        <StatCard icon={<AlertCircle size={14} className="text-red-600" />} label="إجمالي مبالغ النزاعات" value={formatCurrency(totalDispute)} valueClass="text-red-700" />
      </div>

      {/* 6-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة الملف الضريبي — 6 مراحل</span>
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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {[
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'ربط مالي', color: 'text-gold' },
            { icon: Server, label: 'الاستيراد/التصدير (M90)', desc: 'ربط جمركي', color: 'text-cyan-600' },
            { icon: BadgeCheck, label: 'تقييم العقارات (M83)', desc: 'تقييم عقاري', color: 'text-green-600' },
            { icon: BookOpen, label: 'محرك الزكاة (M46)', desc: 'التحقق الامتثال', color: 'text-amber-600' },
            { icon: Server, label: 'المحرك الموحد (M10)', desc: 'ربط القضية', color: 'text-purple-600' },
            { icon: BadgeCheck, label: 'التحقق البيومتري (M109)', desc: 'تحقق الممول', color: 'text-green-600' },
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
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم أو عنوان الملف أو الممول..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Files tab */}
      {activeTab === 'files' && (
        <div className="space-y-2">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Receipt size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد ملفات ضريبية مسجلة</p>
            </div>
          ) : (
            filteredFiles.map((f) => {
              const sCfg = STAGE_CONFIG[f.stage] || STAGE_CONFIG.intake;
              const stageIdx = STAGES.indexOf(f.stage);
              return (
                <div key={f.id} onClick={() => openFileDetail(f)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <Receipt size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{f.file_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{FILE_TYPE_LABELS[f.file_type] || f.file_type}</span>
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{f.file_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {f.taxpayer_name && <span className="font-body text-[9px] text-ink/40">الممول: {f.taxpayer_name}</span>}
                          {f.tax_category && <span className="font-body text-[9px] text-ink/40">الفئة: {f.tax_category}</span>}
                          {f.assessed_amount > 0 && <span className="font-body text-[9px] text-gold font-bold"><DollarSign size={9} className="inline" />{formatCurrency(f.assessed_amount)}</span>}
                          {f.dispute_amount > 0 && <span className="font-body text-[9px] text-red-600 font-bold">نزاع: {formatCurrency(f.dispute_amount)}</span>}
                          {f.deadline_date && <span className="font-body text-[9px] text-ink/40"><Calendar size={9} className="inline ml-0.5" />{formatDate(f.deadline_date)}</span>}
                          {f.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {f.m90_import_export_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-cyan-50 text-cyan-600"><Server size={8} /> M90</span>}
                          {f.m83_property_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><BadgeCheck size={8} /> M83</span>}
                          {f.m46_compliance_checked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><BookOpen size={8} /> M46</span>}
                          {f.m10_case_opened && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Server size={8} /> M10</span>}
                          {f.m109_biometric_required && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><BadgeCheck size={8} /> M109</span>}
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
                    {log.action.includes('created') ? <Receipt size={12} className="text-blue-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m90') ? <Server size={12} className="text-cyan-600" />
                      : log.action.includes('m83') ? <BadgeCheck size={12} className="text-green-600" />
                      : log.action.includes('m46') ? <BookOpen size={12} className="text-amber-600" />
                      : log.action.includes('m10') ? <Server size={12} className="text-purple-600" />
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
                <Receipt size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف ضريبي</span>
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
                    <Receipt size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات الملف الضريبي</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">الممول</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.taxpayer_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الفئة الضريبية</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.tax_category || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نوع الضريبة</span><p className="font-body text-xs font-bold text-midnight">{FILE_TYPE_LABELS[selectedFile.file_type] || selectedFile.file_type}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الفترة الضريبية</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.tax_period || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المبلغ المُقَرّر</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedFile.declared_amount)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المبلغ المُقيَّم</span><p className="font-body text-xs font-bold text-gold">{formatCurrency(selectedFile.assessed_amount)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">مبلغ النزاع</span><p className="font-body text-xs font-bold text-red-600">{formatCurrency(selectedFile.dispute_amount)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">تاريخ الموعد النهائي</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.deadline_date ? formatDate(selectedFile.deadline_date) : '—'}</p></div>
                    {selectedFile.exemptions_applied && <div className="col-span-2"><span className="font-body text-[9px] text-ink/40">الإعفاءات المطبقة</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.exemptions_applied}</p></div>}
                  </div>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedFile.m54_finance_linked ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m90_import_export_linked ? 'bg-cyan-50 text-cyan-600' : 'bg-gray-100 text-ink/30'}`}><Server size={10} /> M90 {selectedFile.m90_import_export_linked ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m83_property_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><BadgeCheck size={10} /> M83 {selectedFile.m83_property_linked ? 'مُقيَّم' : 'غير مُقيَّم'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m46_compliance_checked ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><BookOpen size={10} /> M46 {selectedFile.m46_compliance_checked ? 'متحقق' : 'غير متحقق'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m10_case_opened ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Server size={10} /> M10 {selectedFile.m10_case_opened ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m109_biometric_required ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><BadgeCheck size={10} /> M109 {selectedFile.m109_biometric_required ? 'مطلوب' : 'غير مطلوب'}</span>
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
      <EntityModal open={modalOpen} title={editingId ? 'تعديل الملف الضريبي' : 'ملف ضريبي جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الملف" required><TextInput value={form.file_number} onChange={(e) => setForm({ ...form, file_number: e.target.value })} placeholder="TAX-2025-001" /></Field>
          <Field label="نوع الضريبة">
            <Select value={form.file_type} onChange={(e) => setForm({ ...form, file_type: e.target.value })}>
              {Object.entries(FILE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان الملف" required><TextInput value={form.file_title} onChange={(e) => setForm({ ...form, file_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
          <Field label="الفترة الضريبية"><TextInput value={form.tax_period} onChange={(e) => setForm({ ...form, tax_period: e.target.value })} placeholder="2025-Q1" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم الممول"><TextInput value={form.taxpayer_name} onChange={(e) => setForm({ ...form, taxpayer_name: e.target.value })} /></Field>
          <Field label="الفئة الضريبية"><TextInput value={form.tax_category} onChange={(e) => setForm({ ...form, tax_category: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="المبلغ المُقَرّر"><TextInput type="number" value={form.declared_amount} onChange={(e) => setForm({ ...form, declared_amount: e.target.value })} /></Field>
          <Field label="المبلغ المُقيَّم"><TextInput type="number" value={form.assessed_amount} onChange={(e) => setForm({ ...form, assessed_amount: e.target.value })} /></Field>
          <Field label="مبلغ النزاع"><TextInput type="number" value={form.dispute_amount} onChange={(e) => setForm({ ...form, dispute_amount: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ الموعد النهائي"><TextInput type="date" value={form.deadline_date} onChange={(e) => setForm({ ...form, deadline_date: e.target.value })} /></Field>
          <Field label="الإعفاءات المطبقة"><TextInput value={form.exemptions_applied} onChange={(e) => setForm({ ...form, exemptions_applied: e.target.value })} /></Field>
        </div>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
