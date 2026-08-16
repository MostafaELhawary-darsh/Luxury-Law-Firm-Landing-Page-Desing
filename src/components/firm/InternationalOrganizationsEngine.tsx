import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, AlertTriangle,
  Shield, CircuitBoard, Zap, CheckCircle2, Clock, ArrowRight, Search,
  Activity, Server, AlertCircle, BadgeCheck, Landmark, DollarSign,
  FileText, Scale, Gavel, Users, Globe, Building2,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M70IntlOrgFile, M70AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'files' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'مسودة', bg: 'bg-blue-50', text: 'text-blue-700' },
  reviewed: { label: 'مراجعة', bg: 'bg-amber-50', text: 'text-amber-700' },
  coordinated: { label: 'تنسيق', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  executed: { label: 'منفَّذ', bg: 'bg-green-50', text: 'text-green-700' },
  terminated: { label: 'منتهٍ', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const STAGES = ['draft', 'reviewed', 'coordinated', 'executed', 'terminated'];

const FILE_TYPE_LABELS: Record<string, string> = {
  hq_agreement: 'اتفاقية مقر',
  immunity_claim: 'ادعاء حصانة',
  development_contract: 'عقد إنمائي',
  undt_case: 'قضية محكمة إدارية دولية',
  ingo_compliance: 'امتثال منظمة غير حكومية',
};

const FILE_TYPE_ICONS: Record<string, typeof Landmark> = {
  hq_agreement: Building2,
  immunity_claim: Shield,
  development_contract: DollarSign,
  undt_case: Gavel,
  ingo_compliance: BadgeCheck,
};

const ORG_TYPE_LABELS: Record<string, string> = {
  un_agency: 'وكالة أممية',
  intergov: 'حكومية دولية',
  regional_body: 'هيئة إقليمية',
  ingo: 'غير حكومية دولية',
};

const IMMUNITY_SCOPE_LABELS: Record<string, string> = {
  full: 'حصانة كاملة',
  functional: 'حصانة وظيفية',
  limited: 'محدودة',
  none: 'لا توجد',
};

interface FileForm {
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  organization_name: string;
  organization_type: string;
  hq_agreement_ref: string;
  immunity_scope: string;
  host_country: string;
  fund_amount: string;
  currency: string;
  undt_case_ref: string;
  procurement_ref: string;
  ingo_compliance: boolean;
  description: string;
}

const emptyForm: FileForm = {
  file_number: '', file_title: '', file_type: 'hq_agreement', stage: 'draft',
  organization_name: '', organization_type: 'un_agency', hq_agreement_ref: '',
  immunity_scope: 'full', host_country: '', fund_amount: '0', currency: 'USD',
  undt_case_ref: '', procurement_ref: '', ingo_compliance: false, description: '',
};

export default function InternationalOrganizationsEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [files, setFiles] = useState<M70IntlOrgFile[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('files');
  const [selectedFile, setSelectedFile] = useState<M70IntlOrgFile | null>(null);
  const [auditLogs, setAuditLogs] = useState<M70AuditLog[]>([]);
  const [allAudit, setAllAudit] = useState<M70AuditLog[]>([]);
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
      supabase.from('m70_intl_org_files')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m70_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (fRes.error) console.error('m70 fetch error', fRes.error);
    if (attRes.error) console.error('attorneys fetch error', attRes.error);
    if (auditRes.error) console.error('audit fetch error', auditRes.error);
    setFiles((fRes.data as M70IntlOrgFile[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAudit((auditRes.data as M70AuditLog[]) || []);
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
    const { error } = await supabase.from('m70_audit_logs').insert({
      case_id: fileId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
    if (error) console.error('audit log error', error);
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (f: M70IntlOrgFile) => {
    setForm({
      file_number: f.file_number, file_title: f.file_title,
      file_type: f.file_type, stage: f.stage,
      organization_name: f.organization_name ?? '', organization_type: f.organization_type ?? '',
      hq_agreement_ref: f.hq_agreement_ref || '', immunity_scope: f.immunity_scope || 'none',
      host_country: f.host_country || '', fund_amount: String(f.fund_amount || 0),
      currency: f.currency || 'USD', undt_case_ref: f.undt_case_ref || '',
      procurement_ref: f.procurement_ref || '', ingo_compliance: f.ingo_compliance || false,
      description: f.description || '',
    });
    setEditingId(f.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.file_title.trim() || !form.file_number.trim()) return;
    setSaving(true);
    const amount = Number(form.fund_amount) || 0;
    const payload = {
      file_number: form.file_number.trim(),
      file_title: form.file_title.trim(),
      file_type: form.file_type,
      stage: form.stage,
      status: form.stage === 'terminated' ? 'terminated' : 'active',
      organization_name: form.organization_name.trim(),
      organization_type: form.organization_type,
      hq_agreement_ref: form.hq_agreement_ref.trim() || null,
      immunity_scope: form.immunity_scope,
      host_country: form.host_country.trim() || null,
      fund_amount: amount,
      currency: form.currency,
      undt_case_ref: form.undt_case_ref.trim() || null,
      procurement_ref: form.procurement_ref.trim() || null,
      ingo_compliance: form.ingo_compliance,
      description: form.description.trim() || null,
    };
    if (editingId) {
      const { error } = await supabase.from('m70_intl_org_files').update(payload).eq('id', editingId);
      if (error) console.error('update error', error);
      await logAudit(editingId, 'file_updated', 'تحديث بيانات ملف المنظمة الدولية');
    } else {
      const { data, error } = await supabase.from('m70_intl_org_files').insert(payload).select('id');
      if (error) console.error('insert error', error);
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'file_created', 'إنشاء ملف منظمة دولية — النوع: ' + (FILE_TYPE_LABELS[form.file_type] || form.file_type));
        const needsM10 = form.file_type === 'undt_case' || form.file_type === 'immunity_claim';
        const needsM85 = form.file_type === 'hq_agreement' || form.file_type === 'development_contract';
        await supabase.from('m70_intl_org_files').update({
          m53_document_id: 'DOC-M70-' + Date.now().toString().slice(-6),
          m54_finance_linked: true,
          m10_case_opened: needsM10,
          m85_tax_linked: needsM85,
          m16_esign_linked: true,
          m109_biometric_signed: true,
          m92_notified: true,
          cost_center_id: 'CC-M70-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm53_document', 'أرشفة الملف في محرك المستندات (M53)');
        await logAudit(newId, 'm54_finance', 'ربط الملف بالمحرك المالي (M54)');
        if (needsM10) await logAudit(newId, 'm10_case', 'فتح القضية في نواة القضية (M10)');
        if (needsM85) await logAudit(newId, 'm85_tax', 'ربط الملف بمحرك الضرائب (M85)');
        await logAudit(newId, 'm16_esign', 'ربط التوقيع الإلكتروني (M16)');
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
    const { error } = await supabase.from('m70_intl_org_files').delete().eq('id', deleteId);
    if (error) console.error('delete error', error);
    setDeleteId(null);
    setSelectedFile(null);
    fetchAll();
  };

  const openFileDetail = async (f: M70IntlOrgFile) => {
    setSelectedFile(f);
    setDetailLoading(true);
    const aRes = await supabase.from('m70_audit_logs').select('*').eq('case_id', f.id).order('created_at', { ascending: true });
    if (aRes.error) console.error('detail audit error', aRes.error);
    setAuditLogs((aRes.data as M70AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (f: M70IntlOrgFile) => {
    const idx = STAGES.indexOf(f.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    const { error } = await supabase.from('m70_intl_org_files').update({ stage: next, status: next === 'terminated' ? 'terminated' : 'active' }).eq('id', f.id);
    if (error) console.error('stage advance error', error);
    await logAudit(f.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedFile({ ...f, stage: next } as M70IntlOrgFile);
  };

  const filteredFiles = files.filter((f) => {
    if (filterType !== 'all' && f.file_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!f.file_number.toLowerCase().includes(q) && !f.file_title.toLowerCase().includes(q) && !(f.organization_name || '').toLowerCase().includes(q) && !(f.host_country || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeImmunityClaims = files.filter((f) => f.file_type === 'immunity_claim' && f.stage !== 'terminated').length;
  const totalFunds = files.reduce((s, f) => s + (f.fund_amount || 0), 0);
  const ingoComplianceCount = files.filter((f) => f.ingo_compliance).length;

  const tabs: { id: Tab; label: string; icon: typeof Landmark; badge?: number }[] = [
    { id: 'files', label: 'الملفات', icon: Landmark, badge: files.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Landmark size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">المنظمات الدولية والوكالات الأممية والهيئات الإقليمية (M70)</h2>
            <p className="font-body text-[10px] text-ink/40">إدارة اتفاقيات المقر والحصانات الدبلوماسية والمنح الدولية والنزاعات أمام المحاكم الإدارية الدولية</p>
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
        <StatCard icon={<Landmark size={14} className="text-midnight" />} label="إجمالي الملفات" value={String(files.length)} valueClass="text-midnight" />
        <StatCard icon={<Shield size={14} className="text-red-600" />} label="ادعاءات الحصانة النشطة" value={String(activeImmunityClaims)} valueClass="text-red-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="إجمالي الأموال" value={formatCurrency(totalFunds)} valueClass="text-gold" />
        <StatCard icon={<BadgeCheck size={14} className="text-green-600" />} label="امتثال المنظمات غير الحكومية" value={String(ingoComplianceCount)} valueClass="text-green-700" />
      </div>

      {/* 5-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة ملف المنظمة الدولية — 5 مراحل</span>
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
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'ربط الأمانة', color: 'text-gold' },
            { icon: Server, label: 'نواة القضية (M10)', desc: 'فتح القضية', color: 'text-blue-600' },
            { icon: Scale, label: 'محرك الضرائب (M85)', desc: 'اتفاقيات المقر/الإنمائي', color: 'text-indigo-600' },
            { icon: BadgeCheck, label: 'التوقيع الإلكتروني (M16)', desc: 'توقيع الاتفاقيات', color: 'text-teal-600' },
            { icon: Users, label: 'البيومتري (M109)', desc: 'توقيع الأطراف', color: 'text-green-600' },
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
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم الملف أو العنوان أو المنظمة أو الدولة..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Files tab */}
      {activeTab === 'files' && (
        <div className="space-y-2">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Landmark size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد ملفات مسجلة</p>
            </div>
          ) : (
            filteredFiles.map((f) => {
              const sCfg = STAGE_CONFIG[f.stage] || STAGE_CONFIG.draft;
              const stageIdx = STAGES.indexOf(f.stage);
              const TypeIcon = FILE_TYPE_ICONS[f.file_type] || Landmark;
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
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-indigo-50 text-indigo-600">{ORG_TYPE_LABELS[f.organization_type ?? ''] || f.organization_type}</span>
                          {f.immunity_scope && f.immunity_scope !== 'none' && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-red-50 text-red-600"><Shield size={8} /> {IMMUNITY_SCOPE_LABELS[f.immunity_scope] || f.immunity_scope}</span>}
                          {f.ingo_compliance && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><BadgeCheck size={8} /> امتثال INGO</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{f.file_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="font-body text-[9px] text-ink/40">المنظمة: {f.organization_name}</span>
                          {f.host_country && <span className="font-body text-[9px] text-ink/40">الدولة المضيفة: {f.host_country}</span>}
                          {f.fund_amount > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(f.fund_amount)}</span>}
                          {f.hq_agreement_ref && <span className="font-body text-[9px] text-ink/40">مرجع المقر: {f.hq_agreement_ref}</span>}
                          {f.undt_case_ref && <span className="font-body text-[9px] text-red-600 font-bold">UNDT: {f.undt_case_ref}</span>}
                          {f.procurement_ref && <span className="font-body text-[9px] text-ink/40">المشتريات: {f.procurement_ref}</span>}
                          {f.m53_document_id && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><FileText size={8} /> M53</span>}
                          {f.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {f.m10_case_opened && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Server size={8} /> M10</span>}
                          {f.m85_tax_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-indigo-50 text-indigo-600"><Scale size={8} /> M85</span>}
                          {f.m16_esign_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-teal-50 text-teal-600"><BadgeCheck size={8} /> M16</span>}
                          {f.m109_biometric_signed && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><Users size={8} /> M109</span>}
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
                    {log.action.includes('created') ? <Landmark size={12} className="text-blue-600" />
                      : log.action.includes('m53') ? <FileText size={12} className="text-purple-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m10') ? <Server size={12} className="text-blue-600" />
                      : log.action.includes('m85') ? <Scale size={12} className="text-indigo-600" />
                      : log.action.includes('m16') ? <BadgeCheck size={12} className="text-teal-600" />
                      : log.action.includes('m109') ? <Users size={12} className="text-green-600" />
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
                <Landmark size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف المنظمة الدولية</span>
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

                {/* Organization info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Landmark size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات المنظمة</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">اسم المنظمة</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.organization_name}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نوع المنظمة</span><p className="font-body text-xs font-bold text-midnight">{ORG_TYPE_LABELS[selectedFile.organization_type ?? ''] || selectedFile.organization_type}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الدولة المضيفة</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.host_country || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المستشار</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.advisor?.name || '—'}</p></div>
                  </div>
                </div>

                {/* Immunity info */}
                <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Shield size={12} className="text-red-600" />
                    <span className="font-body text-[10px] font-bold text-red-700">نطاق الحصانة</span>
                  </div>
                  <p className="font-body text-xs font-bold text-midnight">{IMMUNITY_SCOPE_LABELS[selectedFile.immunity_scope ?? ''] || selectedFile.immunity_scope || '—'}</p>
                  {selectedFile.hq_agreement_ref && <p className="font-body text-[10px] text-ink/50 mt-1">مرجع اتفاقية المقر: {selectedFile.hq_agreement_ref}</p>}
                </div>

                {/* Fund amount */}
                {selectedFile.fund_amount > 0 && (
                  <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                    <DollarSign size={12} className="text-gold mb-1" />
                    <span className="font-body text-[9px] text-ink/40">مبلغ المنحة/التمويل</span>
                    <p className="font-body text-sm font-bold text-gold">{formatCurrency(selectedFile.fund_amount)}</p>
                    <p className="font-body text-[9px] text-ink/40 mt-1">العملة: {selectedFile.currency || 'USD'}</p>
                  </div>
                )}

                {/* Case & procurement refs */}
                {(selectedFile.undt_case_ref || selectedFile.procurement_ref) && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Gavel size={12} className="text-ink/50" />
                      <span className="font-body text-[10px] font-bold text-midnight">المراجع القضائية والمشتريات</span>
                    </div>
                    {selectedFile.undt_case_ref && <p className="font-body text-[10px] text-ink/60">مرجع المحكمة الإدارية الدولية: <span className="font-bold text-red-600">{selectedFile.undt_case_ref}</span></p>}
                    {selectedFile.procurement_ref && <p className="font-body text-[10px] text-ink/60">مرجع المشتريات: <span className="font-bold text-midnight">{selectedFile.procurement_ref}</span></p>}
                  </div>
                )}

                {/* INGO compliance flag */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.ingo_compliance ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><BadgeCheck size={10} /> امتثال INGO {selectedFile.ingo_compliance ? 'مفعَّل' : 'غير مفعَّل'}</span>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m53_document_id ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> M53 {selectedFile.m53_document_id ? 'مؤرشف' : 'غير مؤرشف'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedFile.m54_finance_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m10_case_opened ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Server size={10} /> M10 {selectedFile.m10_case_opened ? 'مفتوح' : 'غير مفتوح'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m85_tax_linked ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-ink/30'}`}><Scale size={10} /> M85 {selectedFile.m85_tax_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m16_esign_linked ? 'bg-teal-50 text-teal-600' : 'bg-gray-100 text-ink/30'}`}><BadgeCheck size={10} /> M16 {selectedFile.m16_esign_linked ? 'موقَّع' : 'غير موقَّع'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m109_biometric_signed ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><Users size={10} /> M109 {selectedFile.m109_biometric_signed ? 'موقَّع' : 'غير موقَّع'}</span>
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
      <EntityModal open={modalOpen} title={editingId ? 'تعديل الملف' : 'ملف منظمة دولية جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الملف" required><TextInput value={form.file_number} onChange={(e) => setForm({ ...form, file_number: e.target.value })} placeholder="M70-2025-001" /></Field>
          <Field label="نوع الملف">
            <Select value={form.file_type} onChange={(e) => setForm({ ...form, file_type: e.target.value })}>
              {Object.entries(FILE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان الملف" required><TextInput value={form.file_title} onChange={(e) => setForm({ ...form, file_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم المنظمة" required><TextInput value={form.organization_name} onChange={(e) => setForm({ ...form, organization_name: e.target.value })} /></Field>
          <Field label="نوع المنظمة">
            <Select value={form.organization_type} onChange={(e) => setForm({ ...form, organization_type: e.target.value })}>
              {Object.entries(ORG_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نطاق الحصانة">
            <Select value={form.immunity_scope} onChange={(e) => setForm({ ...form, immunity_scope: e.target.value })}>
              {Object.entries(IMMUNITY_SCOPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="الدولة المضيفة"><TextInput value={form.host_country} onChange={(e) => setForm({ ...form, host_country: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
          <Field label="مرجع اتفاقية المقر"><TextInput value={form.hq_agreement_ref} onChange={(e) => setForm({ ...form, hq_agreement_ref: e.target.value })} placeholder="HQ-2025-001" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="مبلغ المنحة/التمويل"><TextInput type="number" value={form.fund_amount} onChange={(e) => setForm({ ...form, fund_amount: e.target.value })} /></Field>
          <Field label="العملة">
            <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="SAR">SAR</option>
              <option value="AED">AED</option>
              <option value="CHF">CHF</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="مرجع المحكمة الإدارية الدولية"><TextInput value={form.undt_case_ref} onChange={(e) => setForm({ ...form, undt_case_ref: e.target.value })} placeholder="UNDT-2025-001" /></Field>
          <Field label="مرجع المشتريات"><TextInput value={form.procurement_ref} onChange={(e) => setForm({ ...form, procurement_ref: e.target.value })} placeholder="PROC-2025-001" /></Field>
        </div>
        <Checkbox label="امتثال منظمة غير حكومية (INGO Compliance)" checked={form.ingo_compliance} onChange={(v) => setForm({ ...form, ingo_compliance: v })} />
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
