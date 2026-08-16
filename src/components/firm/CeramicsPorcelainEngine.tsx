import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, AlertTriangle,
  Shield, CircuitBoard, CheckCircle2, Clock, Search,
  Activity, AlertCircle, BadgeCheck, Building2, DollarSign,
  FileText, Scale, Grid2x2, Flame, Factory, Package, Truck,
  Lightbulb, Globe, Palette,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M104CeramicsFile, M104AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'files' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'مسودة', bg: 'bg-blue-50', text: 'text-blue-700' },
  reviewed: { label: 'مراجعة', bg: 'bg-amber-50', text: 'text-amber-700' },
  approved: { label: 'اعتماد', bg: 'bg-purple-50', text: 'text-purple-700' },
  operational: { label: 'تشغيل', bg: 'bg-green-50', text: 'text-green-700' },
  terminated: { label: 'إنهاء', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const STAGES = ['draft', 'reviewed', 'approved', 'operational', 'terminated'];

const FILE_TYPE_LABELS: Record<string, string> = {
  production: 'إنتاج',
  license: 'ترخيص مصنع',
  supply: 'عقد توريد خامات',
  energy: 'عقد طاقة',
  export: 'تصدير',
  design: 'حماية تصميم',
};

const FILE_TYPE_ICONS: Record<string, typeof Building2> = {
  production: Factory,
  license: Building2,
  supply: Package,
  energy: Flame,
  export: Globe,
  design: Palette,
};

const CURRENCIES = ['SAR', 'USD', 'EUR', 'AED', 'KWD', 'QAR', 'BHD', 'EGP'];

const ENERGY_TYPES = ['gas', 'electric', 'solar', 'hybrid', 'oil'];

interface CeramicsFileForm {
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  factory_name: string;
  production_line: string;
  license_number: string;
  license_type: string;
  product_type: string;
  design_patent_ref: string;
  raw_material_source: string;
  clay_supplier: string;
  feldspar_supplier: string;
  energy_type: string;
  gas_contract_ref: string;
  energy_consumption: string;
  production_capacity: string;
  local_content_percentage: string;
  export_certificate: string;
  origin_certificate: string;
  distribution_partner: string;
  contract_value: string;
  currency: string;
  description: string;
}

const emptyForm: CeramicsFileForm = {
  file_number: '', file_title: '', file_type: 'production', stage: 'draft',
  factory_name: '', production_line: '', license_number: '', license_type: '',
  product_type: '', design_patent_ref: '', raw_material_source: '',
  clay_supplier: '', feldspar_supplier: '', energy_type: 'gas',
  gas_contract_ref: '', energy_consumption: '0', production_capacity: '0',
  local_content_percentage: '0', export_certificate: '', origin_certificate: '',
  distribution_partner: '', contract_value: '0', currency: 'SAR',
  description: '',
};

export default function CeramicsPorcelainEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [files, setFiles] = useState<M104CeramicsFile[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('files');
  const [selectedFile, setSelectedFile] = useState<M104CeramicsFile | null>(null);
  const [auditLogs, setAuditLogs] = useState<M104AuditLog[]>([]);
  const [allAudit, setAllAudit] = useState<M104AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CeramicsFileForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [fRes, attRes, auditRes] = await Promise.all([
      supabase.from('m104_ceramics_files')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m104_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (fRes.error) console.error('m104 fetch error', fRes.error);
    if (attRes.error) console.error('attorneys fetch error', attRes.error);
    if (auditRes.error) console.error('audit fetch error', auditRes.error);
    setFiles((fRes.data as M104CeramicsFile[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAudit((auditRes.data as M104AuditLog[]) || []);
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
    const { error } = await supabase.from('m104_audit_logs').insert({
      case_id: fileId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
    if (error) console.error('audit log error', error);
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (f: M104CeramicsFile) => {
    setForm({
      file_number: f.file_number, file_title: f.file_title,
      file_type: f.file_type, stage: f.stage,
      factory_name: f.factory_name || '', production_line: f.production_line || '',
      license_number: f.license_number || '', license_type: f.license_type || '',
      product_type: f.product_type || '', design_patent_ref: f.design_patent_ref || '',
      raw_material_source: f.raw_material_source || '',
      clay_supplier: f.clay_supplier || '', feldspar_supplier: f.feldspar_supplier || '',
      energy_type: f.energy_type || 'gas',
      gas_contract_ref: f.gas_contract_ref || '',
      energy_consumption: String(f.energy_consumption || 0),
      production_capacity: String(f.production_capacity || 0),
      local_content_percentage: String(f.local_content_percentage || 0),
      export_certificate: f.export_certificate || '',
      origin_certificate: f.origin_certificate || '',
      distribution_partner: f.distribution_partner || '',
      contract_value: String(f.contract_value || 0),
      currency: f.currency || 'SAR',
      description: f.description || '',
    });
    setEditingId(f.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.file_title.trim() || !form.file_number.trim()) return;
    setSaving(true);
    const value = Number(form.contract_value) || 0;
    const energyVal = Number(form.energy_consumption) || 0;
    const capacityVal = Number(form.production_capacity) || 0;
    const localContentVal = Number(form.local_content_percentage) || 0;
    const payload = {
      file_number: form.file_number.trim(),
      file_title: form.file_title.trim(),
      file_type: form.file_type,
      stage: form.stage,
      status: form.stage === 'terminated' ? 'terminated' : 'active',
      factory_name: form.factory_name.trim() || null,
      production_line: form.production_line.trim() || null,
      license_number: form.license_number.trim() || null,
      license_type: form.license_type.trim() || null,
      product_type: form.product_type.trim() || null,
      design_patent_ref: form.design_patent_ref.trim() || null,
      raw_material_source: form.raw_material_source.trim() || null,
      clay_supplier: form.clay_supplier.trim() || null,
      feldspar_supplier: form.feldspar_supplier.trim() || null,
      energy_type: form.energy_type,
      gas_contract_ref: form.gas_contract_ref.trim() || null,
      energy_consumption: energyVal,
      production_capacity: capacityVal,
      local_content_percentage: localContentVal,
      export_certificate: form.export_certificate.trim() || null,
      origin_certificate: form.origin_certificate.trim() || null,
      distribution_partner: form.distribution_partner.trim() || null,
      contract_value: value,
      currency: form.currency,
      description: form.description.trim() || null,
    };
    if (editingId) {
      const { error } = await supabase.from('m104_ceramics_files').update(payload).eq('id', editingId);
      if (error) console.error('update error', error);
      await logAudit(editingId, 'file_updated', 'تحديث بيانات ملف صناعة السيراميك والبورسلين والمنتجات الخزفية');
    } else {
      const { data, error } = await supabase.from('m104_ceramics_files').insert(payload).select('id');
      if (error) console.error('insert error', error);
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'file_created', 'إنشاء ملف صناعة سيراميك — النوع: ' + (FILE_TYPE_LABELS[form.file_type] || form.file_type));
        const needsCase = form.file_type === 'license' || form.file_type === 'design';
        await supabase.from('m104_ceramics_files').update({
          m53_document_id: 'DOC-M104-' + Date.now().toString().slice(-6),
          m54_finance_linked: true,
          m80_ip_linked: form.file_type === 'design',
          m90_trade_linked: form.file_type === 'export' || form.file_type === 'supply',
          m103_quarry_linked: form.file_type === 'supply',
          m10_case_opened: needsCase,
          m109_biometric_signed: true,
          m92_notified: true,
          cost_center_id: 'CC-M104-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm53_document', 'أرشفة الملف في محرك المستندات (M53)');
        await logAudit(newId, 'm54_finance', 'ربط الملف بالمحرك المالي (M54) — فوترة وإيرادات');
        if (form.file_type === 'design') await logAudit(newId, 'm80_ip', 'ربط الملف بمحرك الملكية الفكرية (M80) — حماية التصاميم');
        if (form.file_type === 'export' || form.file_type === 'supply') await logAudit(newId, 'm90_trade', 'ربط الملف بمحرك التجارة الدولية (M90) — تصدير وتوريد');
        if (form.file_type === 'supply') await logAudit(newId, 'm103_quarry', 'ربط الملف بمحرك المحاجر والتعدين (M103) — خامات الطين والفلدسبار');
        if (needsCase) await logAudit(newId, 'm10_case', 'فتح القضية في المحرك الموحد (M10) — نزاعات تراخيص وملكية');
        await logAudit(newId, 'm109_biometric', 'التوقيع البيومتري لعقود التصنيع والتصدير (M109)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء الملف');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('m104_ceramics_files').delete().eq('id', deleteId);
    if (error) console.error('delete error', error);
    setDeleteId(null);
    setSelectedFile(null);
    fetchAll();
  };

  const openFileDetail = async (f: M104CeramicsFile) => {
    setSelectedFile(f);
    setDetailLoading(true);
    const aRes = await supabase.from('m104_audit_logs').select('*').eq('case_id', f.id).order('created_at', { ascending: true });
    if (aRes.error) console.error('detail audit error', aRes.error);
    setAuditLogs((aRes.data as M104AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (f: M104CeramicsFile) => {
    const idx = STAGES.indexOf(f.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    const { error } = await supabase.from('m104_ceramics_files').update({ stage: next, status: next === 'terminated' ? 'terminated' : 'active' }).eq('id', f.id);
    if (error) console.error('stage advance error', error);
    await logAudit(f.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedFile({ ...f, stage: next } as M104CeramicsFile);
  };

  const filteredFiles = files.filter((f) => {
    if (filterType !== 'all' && f.file_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!f.file_number.toLowerCase().includes(q) && !f.file_title.toLowerCase().includes(q) && !(f.factory_name || '').toLowerCase().includes(q) && !(f.license_number || '').toLowerCase().includes(q) && !(f.product_type || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const designPatentCount = files.filter((f) => f.design_patent_ref && f.design_patent_ref.trim() !== '').length;
  const exportCertCount = files.filter((f) => f.export_certificate && f.export_certificate.trim() !== '').length;
  const totalContractValue = files.reduce((s, f) => s + (f.contract_value || 0), 0);

  const tabs: { id: Tab; label: string; icon: typeof Building2; badge?: number }[] = [
    { id: 'files', label: 'ملفات السيراميك والبورسلين', icon: Grid2x2, badge: files.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Grid2x2 size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">صناعة وتجارة السيراميك والبورسلين والمنتجات الخزفية (M104)</h2>
            <p className="font-body text-[10px] text-ink/40">تراخيص المصانع وحماية التصاميم وتوريد الخامات والتصدير</p>
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
        <StatCard icon={<Grid2x2 size={14} className="text-midnight" />} label="إجمالي الملفات" value={String(files.length)} valueClass="text-midnight" />
        <StatCard icon={<Palette size={14} className="text-purple-600" />} label="تصاميم محمية" value={String(designPatentCount)} valueClass="text-purple-700" />
        <StatCard icon={<Globe size={14} className="text-green-600" />} label="شهادات التصدير" value={String(exportCertCount)} valueClass="text-green-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="إجمالي قيمة العقود" value={formatCurrency(totalContractValue)} valueClass="text-gold" />
      </div>

      {/* 5-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة ملف السيراميك — 5 مراحل</span>
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
        <div className="grid grid-cols-2 md:grid-cols-8 gap-2">
          {[
            { icon: FileText, label: 'المستندات (M53)', desc: 'أرشفة الملف', color: 'text-purple-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'فوترة وإيرادات', color: 'text-gold' },
            { icon: Palette, label: 'الملكية الفكرية (M80)', desc: 'حماية التصاميم', color: 'text-pink-600' },
            { icon: Globe, label: 'التجارة الدولية (M90)', desc: 'تصدير وتوريد', color: 'text-blue-600' },
            { icon: Package, label: 'المحاجر والتعدين (M103)', desc: 'خامات الطين', color: 'text-amber-600' },
            { icon: Scale, label: 'نواة القضية (M10)', desc: 'نزاعات تراخيص', color: 'text-blue-600' },
            { icon: BadgeCheck, label: 'البيومتري (M109)', desc: 'توقيع العقود', color: 'text-green-600' },
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
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم الملف أو العنوان أو المصنع..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Files tab */}
      {activeTab === 'files' && (
        <div className="space-y-2">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Grid2x2 size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد ملفات سيراميك وبورسلين مسجلة</p>
            </div>
          ) : (
            filteredFiles.map((f) => {
              const sCfg = STAGE_CONFIG[f.stage] || STAGE_CONFIG.draft;
              const stageIdx = STAGES.indexOf(f.stage);
              const TypeIcon = FILE_TYPE_ICONS[f.file_type] || Grid2x2;
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
                          {f.design_patent_ref && f.design_patent_ref.trim() !== '' && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-purple-50 text-purple-600">
                              <Palette size={8} /> تصميم محمي
                            </span>
                          )}
                          {f.export_certificate && f.export_certificate.trim() !== '' && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-green-50 text-green-600">
                              <Globe size={8} /> تصدير
                            </span>
                          )}
                          {f.license_number && f.license_number.trim() !== '' && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-blue-50 text-blue-600">
                              <Building2 size={8} /> ترخيص
                            </span>
                          )}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{f.file_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {f.factory_name && <span className="font-body text-[9px] text-ink/40">المصنع: {f.factory_name}</span>}
                          {f.product_type && <span className="font-body text-[9px] text-ink/40">المنتج: {f.product_type}</span>}
                          {f.license_number && <span className="font-body text-[9px] text-ink/40">ترخيص: {f.license_number}</span>}
                          {f.production_capacity > 0 && <span className="font-body text-[9px] text-blue-600 font-bold">الطاقة: {f.production_capacity.toLocaleString('ar-EG')}</span>}
                          {f.local_content_percentage > 0 && <span className="font-body text-[9px] text-green-600 font-bold">المحتوى المحلي: {f.local_content_percentage}%</span>}
                          {f.contract_value > 0 && <span className="font-body text-[9px] text-gold font-bold">قيمة العقد: {formatCurrency(f.contract_value)}</span>}
                          {f.m53_document_id && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><FileText size={8} /> M53</span>}
                          {f.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {f.m80_ip_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-pink-50 text-pink-600"><Palette size={8} /> M80</span>}
                          {f.m90_trade_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Globe size={8} /> M90</span>}
                          {f.m103_quarry_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Package size={8} /> M103</span>}
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
                    {log.action.includes('created') ? <Grid2x2 size={12} className="text-blue-600" />
                      : log.action.includes('m53') ? <FileText size={12} className="text-purple-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m80') ? <Palette size={12} className="text-pink-600" />
                      : log.action.includes('m90') ? <Globe size={12} className="text-blue-600" />
                      : log.action.includes('m103') ? <Package size={12} className="text-amber-600" />
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
                <Grid2x2 size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف السيراميك والبورسلين</span>
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

                {/* Factory info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Factory size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات المصنع والإنتاج</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">اسم المصنع</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.factory_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">خط الإنتاج</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.production_line || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">رقم الترخيص</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.license_number || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نوع الترخيص</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.license_type || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نوع المنتج</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.product_type || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">مرجع براءة التصميم</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.design_patent_ref || '—'}</p></div>
                  </div>
                </div>

                {/* Raw materials card */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Package size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">الخامات والموردين</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">مصدر الخامات</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.raw_material_source || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">مورد الطين</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.clay_supplier || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">مورد الفلدسبار</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.feldspar_supplier || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">شريك التوزيع</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.distribution_partner || '—'}</p></div>
                  </div>
                </div>

                {/* Energy card */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Flame size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">الطاقة والإنتاج</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">نوع الطاقة</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.energy_type || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">مرجع عقد الغاز</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.gas_contract_ref || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">استهلاك الطاقة</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.energy_consumption?.toLocaleString('ar-EG') || '0'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">طاقة الإنتاج</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.production_capacity?.toLocaleString('ar-EG') || '0'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المحتوى المحلي</span><p className="font-body text-xs font-bold text-green-600">{selectedFile.local_content_percentage || 0}%</p></div>
                  </div>
                </div>

                {/* Export & contract value card */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Globe size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">التصدير والعقود</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">شهادة التصدير</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.export_certificate || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">شهادة المنشأ</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.origin_certificate || '—'}</p></div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <DollarSign size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">قيمة العقد</span>
                  </div>
                  <p className="font-body text-sm font-bold text-gold">{formatCurrency(selectedFile.contract_value)} <span className="text-[10px] text-ink/40 font-normal">{selectedFile.currency}</span></p>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m53_document_id ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> M53 {selectedFile.m53_document_id ? 'مؤرشف' : 'غير مؤرشف'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedFile.m54_finance_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m80_ip_linked ? 'bg-pink-50 text-pink-600' : 'bg-gray-100 text-ink/30'}`}><Palette size={10} /> M80 {selectedFile.m80_ip_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m90_trade_linked ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Globe size={10} /> M90 {selectedFile.m90_trade_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m103_quarry_linked ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Package size={10} /> M103 {selectedFile.m103_quarry_linked ? 'مربوط' : 'غير مربوط'}</span>
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
      <EntityModal open={modalOpen} title={editingId ? 'تعديل الملف' : 'ملف سيراميك وبورسلين جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الملف" required><TextInput value={form.file_number} onChange={(e) => setForm({ ...form, file_number: e.target.value })} placeholder="CER-2025-001" /></Field>
          <Field label="نوع الملف">
            <Select value={form.file_type} onChange={(e) => setForm({ ...form, file_type: e.target.value })}>
              {Object.entries(FILE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان الملف" required><TextInput value={form.file_title} onChange={(e) => setForm({ ...form, file_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم المصنع"><TextInput value={form.factory_name} onChange={(e) => setForm({ ...form, factory_name: e.target.value })} /></Field>
          <Field label="خط الإنتاج"><TextInput value={form.production_line} onChange={(e) => setForm({ ...form, production_line: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الترخيص"><TextInput value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} /></Field>
          <Field label="نوع الترخيص"><TextInput value={form.license_type} onChange={(e) => setForm({ ...form, license_type: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نوع المنتج"><TextInput value={form.product_type} onChange={(e) => setForm({ ...form, product_type: e.target.value })} placeholder="بلاط، أدوات صحية، بورسلين..." /></Field>
          <Field label="مرجع براءة التصميم"><TextInput value={form.design_patent_ref} onChange={(e) => setForm({ ...form, design_patent_ref: e.target.value })} placeholder="PAT-2025-001" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="مصدر الخامات"><TextInput value={form.raw_material_source} onChange={(e) => setForm({ ...form, raw_material_source: e.target.value })} /></Field>
          <Field label="مورد الطين"><TextInput value={form.clay_supplier} onChange={(e) => setForm({ ...form, clay_supplier: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="مورد الفلدسبار"><TextInput value={form.feldspar_supplier} onChange={(e) => setForm({ ...form, feldspar_supplier: e.target.value })} /></Field>
          <Field label="شريك التوزيع"><TextInput value={form.distribution_partner} onChange={(e) => setForm({ ...form, distribution_partner: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نوع الطاقة">
            <Select value={form.energy_type} onChange={(e) => setForm({ ...form, energy_type: e.target.value })}>
              {ENERGY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="مرجع عقد الغاز"><TextInput value={form.gas_contract_ref} onChange={(e) => setForm({ ...form, gas_contract_ref: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="استهلاك الطاقة"><TextInput type="number" value={form.energy_consumption} onChange={(e) => setForm({ ...form, energy_consumption: e.target.value })} /></Field>
          <Field label="طاقة الإنتاج"><TextInput type="number" value={form.production_capacity} onChange={(e) => setForm({ ...form, production_capacity: e.target.value })} /></Field>
          <Field label="المحتوى المحلي %"><TextInput type="number" value={form.local_content_percentage} onChange={(e) => setForm({ ...form, local_content_percentage: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="شهادة التصدير"><TextInput value={form.export_certificate} onChange={(e) => setForm({ ...form, export_certificate: e.target.value })} placeholder="EXP-2025-001" /></Field>
          <Field label="شهادة المنشأ"><TextInput value={form.origin_certificate} onChange={(e) => setForm({ ...form, origin_certificate: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="قيمة العقد"><TextInput type="number" value={form.contract_value} onChange={(e) => setForm({ ...form, contract_value: e.target.value })} /></Field>
          <Field label="العملة">
            <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="المرحلة">
          <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
            {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
          </Select>
        </Field>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
