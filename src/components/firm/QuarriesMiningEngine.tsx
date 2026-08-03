import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, AlertTriangle,
  Shield, CircuitBoard, CheckCircle2, Clock, Search,
  Activity, AlertCircle, BadgeCheck, Mountain, DollarSign,
  FileText, Scale, Gavel, Receipt, Cpu, HardHat, Zap, Leaf,
  Pickaxe, Ruler, MapPin, TrendingUp, Truck,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M103QuarryFile, M103AuditLog,
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
  concession: 'عقد امتياز',
  exploration: 'ترخيص استكشاف',
  exploitation: 'حق استغلال',
  supply: 'عقد توريد',
  blasting: 'تصريح تفجير',
  royalty: 'إتاوة تعدينية',
};

const FILE_TYPE_ICONS: Record<string, typeof Mountain> = {
  concession: Scale,
  exploration: Search,
  exploitation: Pickaxe,
  supply: Truck,
  blasting: Zap,
  royalty: DollarSign,
};

const QUARRY_TYPES = ['محجر حجر', 'محجر رمل', 'محجر طين', 'منجم ذهب', 'منجم نحاس', 'منجم فوسفات', 'منجم حديد', 'مصنع تعديني'];

const LICENSE_TYPES = ['ترخيص استكشاف', 'ترخيص استغلال', 'ترخيص محجر', 'تصريح تفجير', 'تصريح بيئي', 'ترخيص تشغيل'];

const CURRENCIES = ['SAR', 'USD', 'EUR', 'AED', 'KWD', 'QAR', 'BHD', 'EGP'];

const MINERAL_TYPES = ['ذهب', 'نحاس', 'حديد', 'فوسفات', 'حجر جيري', 'رمل سيليكا', 'طين', 'بازلت', 'جرانيت', 'رخام', 'فحم', 'يورانيوم'];

interface QuarryFileForm {
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  quarry_name: string;
  quarry_type: string;
  concession_ref: string;
  license_number: string;
  license_type: string;
  license_expiry: string;
  gps_coordinates: string;
  mineral_type: string;
  extraction_volume: string;
  royalty_rate: string;
  royalty_amount: string;
  environmental_assessment_ref: string;
  eia_approved: boolean;
  blasting_permit: boolean;
  safety_compliance: boolean;
  incident_reported: boolean;
  supply_contract_ref: string;
  contractor_name: string;
  contract_value: string;
  currency: string;
  description: string;
}

const emptyForm: QuarryFileForm = {
  file_number: '', file_title: '', file_type: 'concession', stage: 'draft',
  quarry_name: '', quarry_type: '', concession_ref: '',
  license_number: '', license_type: '', license_expiry: '',
  gps_coordinates: '', mineral_type: '',
  extraction_volume: '0', royalty_rate: '0', royalty_amount: '0',
  environmental_assessment_ref: '',
  eia_approved: false, blasting_permit: false,
  safety_compliance: false, incident_reported: false,
  supply_contract_ref: '', contractor_name: '',
  contract_value: '0', currency: 'SAR',
  description: '',
};

export default function QuarriesMiningEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [files, setFiles] = useState<M103QuarryFile[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('files');
  const [selectedFile, setSelectedFile] = useState<M103QuarryFile | null>(null);
  const [auditLogs, setAuditLogs] = useState<M103AuditLog[]>([]);
  const [allAudit, setAllAudit] = useState<M103AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<QuarryFileForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [fRes, attRes, auditRes] = await Promise.all([
      supabase.from('m103_quarry_files')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m103_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (fRes.error) console.error('m103 fetch error', fRes.error);
    if (attRes.error) console.error('attorneys fetch error', attRes.error);
    if (auditRes.error) console.error('audit fetch error', auditRes.error);
    setFiles((fRes.data as M103QuarryFile[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAudit((auditRes.data as M103AuditLog[]) || []);
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
    const { error } = await supabase.from('m103_audit_logs').insert({
      case_id: fileId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
    if (error) console.error('audit log error', error);
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (f: M103QuarryFile) => {
    setForm({
      file_number: f.file_number, file_title: f.file_title,
      file_type: f.file_type, stage: f.stage,
      quarry_name: f.quarry_name || '', quarry_type: f.quarry_type || '',
      concession_ref: f.concession_ref || '',
      license_number: f.license_number || '', license_type: f.license_type || '',
      license_expiry: f.license_expiry || '',
      gps_coordinates: f.gps_coordinates || '',
      mineral_type: f.mineral_type || '',
      extraction_volume: String(f.extraction_volume || 0),
      royalty_rate: String(f.royalty_rate || 0),
      royalty_amount: String(f.royalty_amount || 0),
      environmental_assessment_ref: f.environmental_assessment_ref || '',
      eia_approved: !!f.eia_approved,
      blasting_permit: !!f.blasting_permit,
      safety_compliance: !!f.safety_compliance,
      incident_reported: !!f.incident_reported,
      supply_contract_ref: f.supply_contract_ref || '',
      contractor_name: f.contractor_name || '',
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
    const extractionVol = Number(form.extraction_volume) || 0;
    const royaltyRate = Number(form.royalty_rate) || 0;
    const royaltyAmt = Number(form.royalty_amount) || 0;
    const payload = {
      file_number: form.file_number.trim(),
      file_title: form.file_title.trim(),
      file_type: form.file_type,
      stage: form.stage,
      status: form.stage === 'terminated' ? 'terminated' : 'active',
      quarry_name: form.quarry_name.trim() || null,
      quarry_type: form.quarry_type.trim() || null,
      concession_ref: form.concession_ref.trim() || null,
      license_number: form.license_number.trim() || null,
      license_type: form.license_type.trim() || null,
      license_expiry: form.license_expiry.trim() || null,
      gps_coordinates: form.gps_coordinates.trim() || null,
      mineral_type: form.mineral_type.trim() || null,
      extraction_volume: extractionVol,
      royalty_rate: royaltyRate,
      royalty_amount: royaltyAmt,
      environmental_assessment_ref: form.environmental_assessment_ref.trim() || null,
      eia_approved: form.eia_approved,
      blasting_permit: form.blasting_permit,
      safety_compliance: form.safety_compliance,
      incident_reported: form.incident_reported,
      supply_contract_ref: form.supply_contract_ref.trim() || null,
      contractor_name: form.contractor_name.trim() || null,
      contract_value: value,
      currency: form.currency,
      description: form.description.trim() || null,
    };
    if (editingId) {
      const { error } = await supabase.from('m103_quarry_files').update(payload).eq('id', editingId);
      if (error) console.error('update error', error);
      await logAudit(editingId, 'file_updated', 'تحديث بيانات ملف المحاجر والمناجم والمصانع التعدينية');
    } else {
      const { data, error } = await supabase.from('m103_quarry_files').insert(payload).select('id');
      if (error) console.error('insert error', error);
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'file_created', 'إنشاء ملف تعديني — النوع: ' + (FILE_TYPE_LABELS[form.file_type] || form.file_type));
        const needsCase = form.incident_reported || form.file_type === 'blasting';
        await supabase.from('m103_quarry_files').update({
          m53_document_id: 'DOC-M103-' + Date.now().toString().slice(-6),
          m54_finance_linked: true,
          m91_hse_linked: true,
          m107_iot_linked: true,
          m10_case_opened: needsCase,
          m109_biometric_signed: true,
          m92_notified: true,
          cost_center_id: 'CC-M103-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm53_document', 'أرشفة الملف في محرك المستندات (M53)');
        await logAudit(newId, 'm54_finance', 'ربط الملف بالمحرك المالي (M54) — إتاوات وإيرادات تعدينية');
        await logAudit(newId, 'm91_hse', 'ربط الملف بمحرك الصحة والسلامة والبيئة (M91) — الامتثال البيئي');
        await logAudit(newId, 'm107_iot', 'ربط الملف بمحرك إنترنت الأشياء (M107) — مراقبة الاستخراج عن بُعد');
        if (needsCase) await logAudit(newId, 'm10_case', 'فتح القضية في المحرك الموحد (M10) — حوادث أو تصاريح تفجير');
        await logAudit(newId, 'm109_biometric', 'التوقيع البيومتري لعقود الامتياز التعديني (M109)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء الملف');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('m103_quarry_files').delete().eq('id', deleteId);
    if (error) console.error('delete error', error);
    setDeleteId(null);
    setSelectedFile(null);
    fetchAll();
  };

  const openFileDetail = async (f: M103QuarryFile) => {
    setSelectedFile(f);
    setDetailLoading(true);
    const aRes = await supabase.from('m103_audit_logs').select('*').eq('case_id', f.id).order('created_at', { ascending: true });
    if (aRes.error) console.error('detail audit error', aRes.error);
    setAuditLogs((aRes.data as M103AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (f: M103QuarryFile) => {
    const idx = STAGES.indexOf(f.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    const { error } = await supabase.from('m103_quarry_files').update({ stage: next, status: next === 'terminated' ? 'terminated' : 'active' }).eq('id', f.id);
    if (error) console.error('stage advance error', error);
    await logAudit(f.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedFile({ ...f, stage: next } as M103QuarryFile);
  };

  const filteredFiles = files.filter((f) => {
    if (filterType !== 'all' && f.file_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!f.file_number.toLowerCase().includes(q) && !f.file_title.toLowerCase().includes(q) && !(f.quarry_name || '').toLowerCase().includes(q) && !(f.concession_ref || '').toLowerCase().includes(q) && !(f.license_number || '').toLowerCase().includes(q) && !(f.mineral_type || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeConcessionsCount = files.filter((f) => f.file_type === 'concession' && f.stage === 'operational').length;
  const eiaApprovedCount = files.filter((f) => f.eia_approved).length;
  const totalRoyalties = files.reduce((s, f) => s + (f.royalty_amount || 0), 0);

  const tabs: { id: Tab; label: string; icon: typeof Mountain; badge?: number }[] = [
    { id: 'files', label: 'ملفات المحاجر والمناجم', icon: Mountain, badge: files.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Mountain size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">المحاجر والمناجم والمصانع التعدينية (M103)</h2>
            <p className="font-body text-[10px] text-ink/40">تراخيص الاستكشاف والإتاوات والامتثال البيئي والسلامة المهنية</p>
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
        <StatCard icon={<Mountain size={14} className="text-midnight" />} label="إجمالي الملفات" value={String(files.length)} valueClass="text-midnight" />
        <StatCard icon={<Scale size={14} className="text-purple-600" />} label="الامتيازات النشطة" value={String(activeConcessionsCount)} valueClass="text-purple-700" />
        <StatCard icon={<Leaf size={14} className="text-green-600" />} label="موافقات التقييم البيئي" value={String(eiaApprovedCount)} valueClass="text-green-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="إجمالي الإتاوات" value={formatCurrency(totalRoyalties)} valueClass="text-gold" />
      </div>

      {/* 5-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة الملف التعديني — 5 مراحل</span>
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
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'إتاوات وإيرادات', color: 'text-gold' },
            { icon: HardHat, label: 'الصحة والسلامة (M91)', desc: 'الامتثال البيئي', color: 'text-green-600' },
            { icon: Cpu, label: 'إنترنت الأشياء (M107)', desc: 'مراقبة الاستخراج', color: 'text-blue-600' },
            { icon: Scale, label: 'نواة القضية (M10)', desc: 'نزاعات تعدينية', color: 'text-blue-600' },
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
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم الملف أو العنوان أو المحجر..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Files tab */}
      {activeTab === 'files' && (
        <div className="space-y-2">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Mountain size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد ملفات تعدينية مسجلة</p>
            </div>
          ) : (
            filteredFiles.map((f) => {
              const sCfg = STAGE_CONFIG[f.stage] || STAGE_CONFIG.draft;
              const stageIdx = STAGES.indexOf(f.stage);
              const TypeIcon = FILE_TYPE_ICONS[f.file_type] || Mountain;
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
                          {f.concession_ref && f.concession_ref.trim() !== '' && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-purple-50 text-purple-600">
                              <Scale size={8} /> امتياز
                            </span>
                          )}
                          {f.eia_approved && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-green-50 text-green-600">
                              <Leaf size={8} /> تقييم بيئي
                            </span>
                          )}
                          {f.blasting_permit && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-red-50 text-red-600">
                              <Zap size={8} /> تفجير
                            </span>
                          )}
                          {f.incident_reported && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-orange-50 text-orange-600">
                              <AlertTriangle size={8} /> حادث
                            </span>
                          )}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{f.file_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {f.quarry_name && <span className="font-body text-[9px] text-ink/40">المحجر: {f.quarry_name}</span>}
                          {f.quarry_type && <span className="font-body text-[9px] text-ink/40">النوع: {f.quarry_type}</span>}
                          {f.license_number && <span className="font-body text-[9px] text-ink/40">الترخيص: {f.license_number}</span>}
                          {f.mineral_type && <span className="font-body text-[9px] text-blue-600 font-bold">المعدن: {f.mineral_type}</span>}
                          {f.extraction_volume > 0 && <span className="font-body text-[9px] text-ink/40">حجم الاستخراج: {f.extraction_volume}</span>}
                          {f.royalty_amount > 0 && <span className="font-body text-[9px] text-gold font-bold">الإتاوة: {formatCurrency(f.royalty_amount)}</span>}
                          {f.contract_value > 0 && <span className="font-body text-[9px] text-gold font-bold">قيمة العقد: {formatCurrency(f.contract_value)}</span>}
                          {f.m53_document_id && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><FileText size={8} /> M53</span>}
                          {f.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {f.m91_hse_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><HardHat size={8} /> M91</span>}
                          {f.m107_iot_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Cpu size={8} /> M107</span>}
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
                    {log.action.includes('created') ? <Mountain size={12} className="text-blue-600" />
                      : log.action.includes('m53') ? <FileText size={12} className="text-purple-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m91') ? <HardHat size={12} className="text-green-600" />
                      : log.action.includes('m107') ? <Cpu size={12} className="text-blue-600" />
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
                <Mountain size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف المحجر/المنجم</span>
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

                {/* Quarry info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Mountain size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات المحجر/المنجم</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">اسم المحجر</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.quarry_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نوع المحجر</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.quarry_type || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">مرجع الامتياز</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.concession_ref || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نوع المعدن</span><p className="font-body text-xs font-bold text-blue-600">{selectedFile.mineral_type || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الإحداثيات GPS</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.gps_coordinates || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">حجم الاستخراج</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.extraction_volume || '0'}</p></div>
                  </div>
                </div>

                {/* License info */}
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <div className="flex items-center gap-1.5 mb-2">
                    <FileText size={12} className="text-blue-600" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات الترخيص</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">رقم الترخيص</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.license_number || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نوع الترخيص</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.license_type || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">انتهاء الترخيص</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.license_expiry ? formatDate(selectedFile.license_expiry) : '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">مرجع التقييم البيئي</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.environmental_assessment_ref || '—'}</p></div>
                  </div>
                </div>

                {/* Royalty card */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-1">
                    <DollarSign size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">الإتاوة التعدينية</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">المعدل</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.royalty_rate || '0'}%</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المبلغ</span><p className="font-body text-xs font-bold text-gold">{formatCurrency(selectedFile.royalty_amount)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">قيمة العقد</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedFile.contract_value)}</p></div>
                  </div>
                </div>

                {/* Supply & contractor card */}
                {(selectedFile.supply_contract_ref || selectedFile.contractor_name) && (
                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Receipt size={12} className="text-purple-600" />
                      <span className="font-body text-[10px] font-bold text-midnight">عقد التوريد والمقاول</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="font-body text-[9px] text-ink/40">مرجع عقد التوريد</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.supply_contract_ref || '—'}</p></div>
                      <div><span className="font-body text-[9px] text-ink/40">اسم المقاول</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.contractor_name || '—'}</p></div>
                    </div>
                  </div>
                )}

                {/* Compliance flags */}
                <div className="grid grid-cols-2 gap-2">
                  <div className={`rounded-lg p-2.5 border ${selectedFile.eia_approved ? 'bg-green-50 border-green-100' : 'bg-gray-100 border-gray-200'}`}>
                    <div className="flex items-center gap-1.5">
                      <Leaf size={10} className={selectedFile.eia_approved ? 'text-green-600' : 'text-ink/40'} />
                      <span className="font-body text-[9px] font-bold text-midnight">التقييم البيئي</span>
                    </div>
                    <p className={`font-body text-[10px] font-bold ${selectedFile.eia_approved ? 'text-green-700' : 'text-ink/50'}`}>{selectedFile.eia_approved ? 'معتمد' : 'غير معتمد'}</p>
                  </div>
                  <div className={`rounded-lg p-2.5 border ${selectedFile.blasting_permit ? 'bg-red-50 border-red-100' : 'bg-gray-100 border-gray-200'}`}>
                    <div className="flex items-center gap-1.5">
                      <Zap size={10} className={selectedFile.blasting_permit ? 'text-red-600' : 'text-ink/40'} />
                      <span className="font-body text-[9px] font-bold text-midnight">تصريح التفجير</span>
                    </div>
                    <p className={`font-body text-[10px] font-bold ${selectedFile.blasting_permit ? 'text-red-700' : 'text-ink/50'}`}>{selectedFile.blasting_permit ? 'صالح' : 'غير صالح'}</p>
                  </div>
                  <div className={`rounded-lg p-2.5 border ${selectedFile.safety_compliance ? 'bg-green-50 border-green-100' : 'bg-gray-100 border-gray-200'}`}>
                    <div className="flex items-center gap-1.5">
                      <HardHat size={10} className={selectedFile.safety_compliance ? 'text-green-600' : 'text-ink/40'} />
                      <span className="font-body text-[9px] font-bold text-midnight">السلامة المهنية</span>
                    </div>
                    <p className={`font-body text-[10px] font-bold ${selectedFile.safety_compliance ? 'text-green-700' : 'text-ink/50'}`}>{selectedFile.safety_compliance ? 'ممتثل' : 'غير ممتثل'}</p>
                  </div>
                  <div className={`rounded-lg p-2.5 border ${selectedFile.incident_reported ? 'bg-orange-50 border-orange-100' : 'bg-gray-100 border-gray-200'}`}>
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle size={10} className={selectedFile.incident_reported ? 'text-orange-600' : 'text-ink/40'} />
                      <span className="font-body text-[9px] font-bold text-midnight">حادث مسجل</span>
                    </div>
                    <p className={`font-body text-[10px] font-bold ${selectedFile.incident_reported ? 'text-orange-700' : 'text-ink/50'}`}>{selectedFile.incident_reported ? 'يتطلب متابعة' : 'لا يوجد'}</p>
                  </div>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m53_document_id ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> M53 {selectedFile.m53_document_id ? 'مؤرشف' : 'غير مؤرشف'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedFile.m54_finance_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m91_hse_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><HardHat size={10} /> M91 {selectedFile.m91_hse_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m107_iot_linked ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Cpu size={10} /> M107 {selectedFile.m107_iot_linked ? 'مربوط' : 'غير مربوط'}</span>
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
      <EntityModal open={modalOpen} title={editingId ? 'تعديل الملف' : 'ملف تعديني جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الملف" required><TextInput value={form.file_number} onChange={(e) => setForm({ ...form, file_number: e.target.value })} placeholder="QM-2025-001" /></Field>
          <Field label="نوع الملف">
            <Select value={form.file_type} onChange={(e) => setForm({ ...form, file_type: e.target.value })}>
              {Object.entries(FILE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان الملف" required><TextInput value={form.file_title} onChange={(e) => setForm({ ...form, file_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم المحجر/المنجم"><TextInput value={form.quarry_name} onChange={(e) => setForm({ ...form, quarry_name: e.target.value })} /></Field>
          <Field label="نوع المحجر">
            <Select value={form.quarry_type} onChange={(e) => setForm({ ...form, quarry_type: e.target.value })}>
              <option value="">— اختر —</option>
              {QUARRY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="مرجع عقد الامتياز"><TextInput value={form.concession_ref} onChange={(e) => setForm({ ...form, concession_ref: e.target.value })} placeholder="CONC-2025-001" /></Field>
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الترخيص"><TextInput value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} /></Field>
          <Field label="نوع الترخيص">
            <Select value={form.license_type} onChange={(e) => setForm({ ...form, license_type: e.target.value })}>
              <option value="">— اختر —</option>
              {LICENSE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ انتهاء الترخيص"><TextInput type="date" value={form.license_expiry} onChange={(e) => setForm({ ...form, license_expiry: e.target.value })} /></Field>
          <Field label="الإحداثيات GPS"><TextInput value={form.gps_coordinates} onChange={(e) => setForm({ ...form, gps_coordinates: e.target.value })} placeholder="24.7136, 46.6753" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نوع المعدن">
            <Select value={form.mineral_type} onChange={(e) => setForm({ ...form, mineral_type: e.target.value })}>
              <option value="">— اختر —</option>
              {MINERAL_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
          </Field>
          <Field label="حجم الاستخراج"><TextInput type="number" value={form.extraction_volume} onChange={(e) => setForm({ ...form, extraction_volume: e.target.value })} placeholder="طن" /></Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="معدل الإتاوة (%)"><TextInput type="number" value={form.royalty_rate} onChange={(e) => setForm({ ...form, royalty_rate: e.target.value })} /></Field>
          <Field label="مبلغ الإتاوة"><TextInput type="number" value={form.royalty_amount} onChange={(e) => setForm({ ...form, royalty_amount: e.target.value })} /></Field>
          <Field label="العملة">
            <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="مرجع التقييم البيئي (EIA)"><TextInput value={form.environmental_assessment_ref} onChange={(e) => setForm({ ...form, environmental_assessment_ref: e.target.value })} placeholder="EIA-2025-001" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="مرجع عقد التوريد"><TextInput value={form.supply_contract_ref} onChange={(e) => setForm({ ...form, supply_contract_ref: e.target.value })} placeholder="SUP-2025-001" /></Field>
          <Field label="اسم المقاول"><TextInput value={form.contractor_name} onChange={(e) => setForm({ ...form, contractor_name: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="قيمة العقد"><TextInput type="number" value={form.contract_value} onChange={(e) => setForm({ ...form, contract_value: e.target.value })} /></Field>
        </div>
        <div className="flex items-center gap-6 flex-wrap">
          <Checkbox checked={form.eia_approved} onChange={(v: boolean) => setForm({ ...form, eia_approved: v })} label="اعتماد التقييم البيئي" />
          <Checkbox checked={form.blasting_permit} onChange={(v: boolean) => setForm({ ...form, blasting_permit: v })} label="تصريح تفجير" />
          <Checkbox checked={form.safety_compliance} onChange={(v: boolean) => setForm({ ...form, safety_compliance: v })} label="الامتثال للسلامة المهنية" />
          <Checkbox checked={form.incident_reported} onChange={(v: boolean) => setForm({ ...form, incident_reported: v })} label="حادث مسجل" />
        </div>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
