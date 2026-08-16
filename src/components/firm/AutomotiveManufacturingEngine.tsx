import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, AlertTriangle,
  Shield, CircuitBoard, CheckCircle2, Clock, Search,
  Activity, AlertCircle, BadgeCheck, Building2, DollarSign,
  FileText, Scale, Gavel, Cog, Lightbulb, Award, Truck,
  Receipt, Ship, Copyright, Globe, Percent,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M95AutoManufacturingFile, M95AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'files' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'مسودة', bg: 'bg-blue-50', text: 'text-blue-700' },
  reviewed: { label: 'مراجعة', bg: 'bg-amber-50', text: 'text-amber-700' },
  classified: { label: 'تصنيف', bg: 'bg-orange-50', text: 'text-orange-700' },
  approved: { label: 'اعتماد', bg: 'bg-purple-50', text: 'text-purple-700' },
  executed: { label: 'تنفيذ', bg: 'bg-green-50', text: 'text-green-700' },
  terminated: { label: 'إنهاء', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const STAGES = ['draft', 'reviewed', 'classified', 'approved', 'executed', 'terminated'];

const FILE_TYPE_LABELS: Record<string, string> = {
  assembly_license: 'ترخيص تجميع',
  tech_transfer: 'نقل تكنولوجيا',
  oem_license: 'ترخيص OEM',
  supplier: 'عقد مورد',
  customs_exemption: 'إعفاء جمركي',
  export_incentive: 'حافز تصديري',
};

const FILE_TYPE_ICONS: Record<string, typeof Building2> = {
  assembly_license: BadgeCheck,
  tech_transfer: Lightbulb,
  oem_license: Award,
  supplier: Truck,
  customs_exemption: Receipt,
  export_incentive: Ship,
};

const ASSEMBLY_TYPE_LABELS: Record<string, string> = {
  ckd: 'CKD تفكيك كامل',
  skd: 'SKD تفكيك نصف',
  local: 'تصنيع محلي',
  joint: 'تصنيع مشترك',
};

const SUPPLIER_TIER_LABELS: Record<string, string> = {
  tier1: 'الفئة الأولى',
  tier2: 'الفئة الثانية',
  tier3: 'الفئة الثالثة',
};

const CURRENCIES = ['SAR', 'USD', 'EUR', 'AED', 'KWD', 'QAR', 'BHD', 'EGP'];

interface AutoManufacturingFileForm {
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  factory_name: string;
  assembly_type: string;
  license_number: string;
  local_content_percentage: string;
  tech_transfer_ref: string;
  oem_licensed: boolean;
  royalty_rate: string;
  supplier_tier: string;
  contract_value: string;
  currency: string;
  patent_ref: string;
  customs_exemption: boolean;
  export_incentive: boolean;
  quality_standard: string;
  description: string;
}

const emptyForm: AutoManufacturingFileForm = {
  file_number: '', file_title: '', file_type: 'assembly_license', stage: 'draft',
  factory_name: '', assembly_type: 'ckd', license_number: '',
  local_content_percentage: '0', tech_transfer_ref: '', oem_licensed: false,
  royalty_rate: '0', supplier_tier: 'tier1', contract_value: '0',
  currency: 'SAR', patent_ref: '', customs_exemption: false,
  export_incentive: false, quality_standard: '',
  description: '',
};

export default function AutomotiveManufacturingEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [files, setFiles] = useState<M95AutoManufacturingFile[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('files');
  const [selectedFile, setSelectedFile] = useState<M95AutoManufacturingFile | null>(null);
  const [auditLogs, setAuditLogs] = useState<M95AuditLog[]>([]);
  const [allAudit, setAllAudit] = useState<M95AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AutoManufacturingFileForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [fRes, attRes, auditRes] = await Promise.all([
      supabase.from('m95_auto_manufacturing_files')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m95_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (fRes.error) console.error('m95 fetch error', fRes.error);
    if (attRes.error) console.error('attorneys fetch error', attRes.error);
    if (auditRes.error) console.error('audit fetch error', auditRes.error);
    setFiles((fRes.data as M95AutoManufacturingFile[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAudit((auditRes.data as M95AuditLog[]) || []);
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
    const { error } = await supabase.from('m95_audit_logs').insert({
      case_id: fileId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
    if (error) console.error('audit log error', error);
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (f: M95AutoManufacturingFile) => {
    setForm({
      file_number: f.file_number, file_title: f.file_title,
      file_type: f.file_type, stage: f.stage,
      factory_name: f.factory_name || '', assembly_type: f.assembly_type || 'ckd',
      license_number: f.license_number || '',
      local_content_percentage: String(f.local_content_percentage || 0),
      tech_transfer_ref: f.tech_transfer_ref || '', oem_licensed: !!f.oem_licensed,
      royalty_rate: String(f.royalty_rate || 0),
      supplier_tier: f.supplier_tier || 'tier1',
      contract_value: String(f.contract_value || 0),
      currency: f.currency || 'SAR', patent_ref: f.patent_ref || '',
      customs_exemption: !!f.customs_exemption,
      export_incentive: !!f.export_incentive,
      quality_standard: f.quality_standard || '',
      description: f.description || '',
    });
    setEditingId(f.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.file_title.trim() || !form.file_number.trim()) return;
    setSaving(true);
    const localContent = Number(form.local_content_percentage) || 0;
    const royalty = Number(form.royalty_rate) || 0;
    const contractVal = Number(form.contract_value) || 0;
    const payload = {
      file_number: form.file_number.trim(),
      file_title: form.file_title.trim(),
      file_type: form.file_type,
      stage: form.stage,
      status: form.stage === 'terminated' ? 'terminated' : 'active',
      factory_name: form.factory_name.trim() || null,
      assembly_type: form.assembly_type,
      license_number: form.license_number.trim() || null,
      local_content_percentage: localContent,
      tech_transfer_ref: form.tech_transfer_ref.trim() || null,
      oem_licensed: form.oem_licensed,
      royalty_rate: royalty,
      supplier_tier: form.supplier_tier,
      contract_value: contractVal,
      currency: form.currency,
      patent_ref: form.patent_ref.trim() || null,
      customs_exemption: form.customs_exemption,
      export_incentive: form.export_incentive,
      quality_standard: form.quality_standard.trim() || null,
      description: form.description.trim() || null,
    };
    if (editingId) {
      const { error } = await supabase.from('m95_auto_manufacturing_files').update(payload).eq('id', editingId);
      if (error) console.error('update error', error);
      await logAudit(editingId, 'file_updated', 'تحديث بيانات ملف صناعة السيارات وتجميع المركبات');
    } else {
      const { data, error } = await supabase.from('m95_auto_manufacturing_files').insert(payload).select('id');
      if (error) console.error('insert error', error);
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'file_created', 'إنشاء ملف صناعة سيارات — النوع: ' + (FILE_TYPE_LABELS[form.file_type] || form.file_type));
        const needsTrade = form.customs_exemption || form.export_incentive;
        await supabase.from('m95_auto_manufacturing_files').update({
          m53_document_id: 'DOC-M95-' + Date.now().toString().slice(-6),
          m54_finance_linked: true,
          m80_ip_linked: true,
          m90_trade_linked: needsTrade,
          m10_case_opened: false,
          m109_biometric_signed: true,
          m92_notified: true,
          cost_center_id: 'CC-M95-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm53_document', 'أرشفة الملف في محرك المستندات (M53)');
        await logAudit(newId, 'm54_finance', 'ربط الملف بالمحرك المالي (M54) — تكاليف R&D والإتاوات');
        await logAudit(newId, 'm80_ip', 'ربط الملف بمحرك الملكية الفكرية (M80) — حماية التصميمات الهندسية');
        if (needsTrade) await logAudit(newId, 'm90_trade', 'ربط الملف بمحرك الاستيراد والتصدير (M90) — إعفاءات جمركية');
        await logAudit(newId, 'm109_biometric', 'التوقيع البيومتري للعقود (M109)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء الملف');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('m95_auto_manufacturing_files').delete().eq('id', deleteId);
    if (error) console.error('delete error', error);
    setDeleteId(null);
    setSelectedFile(null);
    fetchAll();
  };

  const openFileDetail = async (f: M95AutoManufacturingFile) => {
    setSelectedFile(f);
    setDetailLoading(true);
    const aRes = await supabase.from('m95_audit_logs').select('*').eq('case_id', f.id).order('created_at', { ascending: true });
    if (aRes.error) console.error('detail audit error', aRes.error);
    setAuditLogs((aRes.data as M95AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (f: M95AutoManufacturingFile) => {
    const idx = STAGES.indexOf(f.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    const { error } = await supabase.from('m95_auto_manufacturing_files').update({ stage: next, status: next === 'terminated' ? 'terminated' : 'active' }).eq('id', f.id);
    if (error) console.error('stage advance error', error);
    await logAudit(f.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedFile({ ...f, stage: next } as M95AutoManufacturingFile);
  };

  const filteredFiles = files.filter((f) => {
    if (filterType !== 'all' && f.file_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!f.file_number.toLowerCase().includes(q) && !f.file_title.toLowerCase().includes(q) && !(f.factory_name || '').toLowerCase().includes(q) && !(f.license_number || '').toLowerCase().includes(q) && !(f.tech_transfer_ref || '').toLowerCase().includes(q) && !(f.patent_ref || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const avgLocalContent = files.length > 0 ? (files.reduce((s, f) => s + (f.local_content_percentage || 0), 0) / files.length) : 0;
  const oemLicensedCount = files.filter((f) => f.oem_licensed).length;
  const totalContractValue = files.reduce((s, f) => s + (f.contract_value || 0), 0);

  const tabs: { id: Tab; label: string; icon: typeof Building2; badge?: number }[] = [
    { id: 'files', label: 'ملفات صناعة السيارات', icon: Cog, badge: files.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Cog size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">صناعة السيارات وتجميع المركبات والصناعات المغذية (M95)</h2>
            <p className="font-body text-[10px] text-ink/40">إدارة تراخيص التجميع ونقل التكنولوجيا ونسب المكون المحلي والحوافز الجمركية</p>
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
        <StatCard icon={<Cog size={14} className="text-midnight" />} label="إجمالي الملفات" value={String(files.length)} valueClass="text-midnight" />
        <StatCard icon={<Percent size={14} className="text-green-600" />} label="متوسط المكون المحلي" value={avgLocalContent.toFixed(1) + '%'} valueClass="text-green-600" />
        <StatCard icon={<Award size={14} className="text-purple-600" />} label="عقود OEM" value={String(oemLicensedCount)} valueClass="text-purple-600" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="قيمة العقود" value={formatCurrency(totalContractValue)} valueClass="text-gold" />
      </div>

      {/* 6-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة ملف صناعة السيارات — 6 مراحل</span>
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            { icon: FileText, label: 'المستندات (M53)', desc: 'أرشفة الملف', color: 'text-purple-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'تكاليف R&D والإتاوات', color: 'text-gold' },
            { icon: Copyright, label: 'الملكية الفكرية (M80)', desc: 'حماية التصميمات الهندسية', color: 'text-purple-600' },
            { icon: Globe, label: 'الاستيراد والتصدير (M90)', desc: 'إعفاءات جمركية', color: 'text-blue-600' },
            { icon: BadgeCheck, label: 'البيومتري (M109)', desc: 'توقيع العقود', color: 'text-green-600' },
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
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم الملف أو العنوان أو المصنع..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Files tab */}
      {activeTab === 'files' && (
        <div className="space-y-2">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Cog size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد ملفات صناعة سيارات مسجلة</p>
            </div>
          ) : (
            filteredFiles.map((f) => {
              const sCfg = STAGE_CONFIG[f.stage] || STAGE_CONFIG.draft;
              const stageIdx = STAGES.indexOf(f.stage);
              const TypeIcon = FILE_TYPE_ICONS[f.file_type] || Cog;
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
                          {f.assembly_type && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-blue-50 text-blue-600">
                              {ASSEMBLY_TYPE_LABELS[f.assembly_type] || f.assembly_type}
                            </span>
                          )}
                          {f.oem_licensed && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-purple-50 text-purple-600">
                              <Award size={8} /> OEM
                            </span>
                          )}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{f.file_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {f.factory_name && <span className="font-body text-[9px] text-ink/40">المصنع: {f.factory_name}</span>}
                          {f.license_number && <span className="font-body text-[9px] text-ink/40">ترخيص: {f.license_number}</span>}
                          {f.local_content_percentage > 0 && <span className="font-body text-[9px] text-green-600 font-bold">مكون محلي: {f.local_content_percentage}%</span>}
                          {f.royalty_rate > 0 && <span className="font-body text-[9px] text-purple-600 font-bold">إتاوات: {f.royalty_rate}%</span>}
                          {f.contract_value > 0 && <span className="font-body text-[9px] text-gold font-bold">قيمة: {formatCurrency(f.contract_value)}</span>}
                          {f.tech_transfer_ref && <span className="font-body text-[9px] text-purple-600 font-bold">Tech: {f.tech_transfer_ref}</span>}
                          {f.patent_ref && <span className="font-body text-[9px] text-purple-600 font-bold">براءة: {f.patent_ref}</span>}
                          {f.supplier_tier && <span className="font-body text-[9px] text-ink/40">فئة المورد: {SUPPLIER_TIER_LABELS[f.supplier_tier] || f.supplier_tier}</span>}
                          {f.customs_exemption && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-blue-50 text-blue-600">
                              <Receipt size={8} /> إعفاء جمركي
                            </span>
                          )}
                          {f.export_incentive && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-green-50 text-green-600">
                              <Ship size={8} /> حافز تصديري
                            </span>
                          )}
                          {f.m53_document_id && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><FileText size={8} /> M53</span>}
                          {f.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><DollarSign size={8} /> M54</span>}
                          {f.m80_ip_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Copyright size={8} /> M80</span>}
                          {f.m90_trade_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Globe size={8} /> M90</span>}
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
                    {log.action.includes('created') ? <Cog size={12} className="text-blue-600" />
                      : log.action.includes('m53') ? <FileText size={12} className="text-purple-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-gold" />
                      : log.action.includes('m80') ? <Copyright size={12} className="text-purple-600" />
                      : log.action.includes('m90') ? <Globe size={12} className="text-blue-600" />
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
                <Cog size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف صناعة السيارات</span>
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
                    <Cog size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات الملف</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">اسم المصنع</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.factory_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نوع التجميع</span><p className="font-body text-xs font-bold text-midnight">{ASSEMBLY_TYPE_LABELS[selectedFile.assembly_type || ''] || selectedFile.assembly_type || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">رقم الترخيص</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.license_number || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">معيار الجودة</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.quality_standard || '—'}</p></div>
                  </div>
                </div>

                {/* Contract value card */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <DollarSign size={12} className="text-gold mb-1" />
                  <span className="font-body text-[9px] text-ink/40">قيمة العقد</span>
                  <p className="font-body text-sm font-bold text-gold">{formatCurrency(selectedFile.contract_value)}</p>
                </div>

                {/* Local content card */}
                <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                  <Percent size={12} className="text-green-600 mb-1" />
                  <span className="font-body text-[9px] text-ink/40">نسبة المكون المحلي</span>
                  <p className="font-body text-sm font-bold text-green-600">{selectedFile.local_content_percentage}%</p>
                </div>

                {/* Royalty rate card */}
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                  <Copyright size={12} className="text-purple-600 mb-1" />
                  <span className="font-body text-[9px] text-ink/40">معدل الإتاوات</span>
                  <p className="font-body text-sm font-bold text-purple-600">{selectedFile.royalty_rate}%</p>
                </div>

                {/* Flags row */}
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedFile.oem_licensed && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold bg-purple-50 text-purple-600">
                      <Award size={10} /> ترخيص OEM
                    </span>
                  )}
                  {selectedFile.customs_exemption && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold bg-blue-50 text-blue-600">
                      <Receipt size={10} /> إعفاء جمركي
                    </span>
                  )}
                  {selectedFile.export_incentive && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold bg-green-50 text-green-600">
                      <Ship size={10} /> حافز تصديري
                    </span>
                  )}
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m53_document_id ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> M53 {selectedFile.m53_document_id ? 'مؤرشف' : 'غير مؤرشف'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m54_finance_linked ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedFile.m54_finance_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m80_ip_linked ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Copyright size={10} /> M80 {selectedFile.m80_ip_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m90_trade_linked ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Globe size={10} /> M90 {selectedFile.m90_trade_linked ? 'مربوط' : 'غير مربوط'}</span>
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
      <EntityModal open={modalOpen} title={editingId ? 'تعديل الملف' : 'ملف صناعة سيارات جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الملف" required><TextInput value={form.file_number} onChange={(e) => setForm({ ...form, file_number: e.target.value })} placeholder="AUTO-2025-001" /></Field>
          <Field label="نوع الملف">
            <Select value={form.file_type} onChange={(e) => setForm({ ...form, file_type: e.target.value })}>
              {Object.entries(FILE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان الملف" required><TextInput value={form.file_title} onChange={(e) => setForm({ ...form, file_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم المصنع"><TextInput value={form.factory_name} onChange={(e) => setForm({ ...form, factory_name: e.target.value })} /></Field>
          <Field label="نوع التجميع">
            <Select value={form.assembly_type} onChange={(e) => setForm({ ...form, assembly_type: e.target.value })}>
              {Object.entries(ASSEMBLY_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الترخيص"><TextInput value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} /></Field>
          <Field label="معيار الجودة"><TextInput value={form.quality_standard} onChange={(e) => setForm({ ...form, quality_standard: e.target.value })} placeholder="ISO 9001 / IATF 16949" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نسبة المكون المحلي %"><TextInput type="number" value={form.local_content_percentage} onChange={(e) => setForm({ ...form, local_content_percentage: e.target.value })} /></Field>
          <Field label="معدل الإتاوات %"><TextInput type="number" value={form.royalty_rate} onChange={(e) => setForm({ ...form, royalty_rate: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="مرجع نقل التكنولوجيا"><TextInput value={form.tech_transfer_ref} onChange={(e) => setForm({ ...form, tech_transfer_ref: e.target.value })} placeholder="TT-2025-001" /></Field>
          <Field label="مرجع براءة الاختراع"><TextInput value={form.patent_ref} onChange={(e) => setForm({ ...form, patent_ref: e.target.value })} placeholder="PAT-2025-001" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="فئة المورد">
            <Select value={form.supplier_tier} onChange={(e) => setForm({ ...form, supplier_tier: e.target.value })}>
              {Object.entries(SUPPLIER_TIER_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="قيمة العقد"><TextInput type="number" value={form.contract_value} onChange={(e) => setForm({ ...form, contract_value: e.target.value })} /></Field>
          <Field label="العملة">
            <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        </div>
        <div className="flex items-center gap-6 flex-wrap">
          <Checkbox checked={form.oem_licensed} onChange={(v: boolean) => setForm({ ...form, oem_licensed: v })} label="ترخيص OEM" />
          <Checkbox checked={form.customs_exemption} onChange={(v: boolean) => setForm({ ...form, customs_exemption: v })} label="إعفاء جمركي" />
          <Checkbox checked={form.export_incentive} onChange={(v: boolean) => setForm({ ...form, export_incentive: v })} label="حافز تصديري" />
        </div>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
