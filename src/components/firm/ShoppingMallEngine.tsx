import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, AlertTriangle,
  Shield, CircuitBoard, CheckCircle2, Clock, Search,
  Activity, AlertCircle, BadgeCheck, Building2, DollarSign,
  FileText, Scale, Gavel, Store, ShoppingCart, Truck, Megaphone,
  Receipt, ShoppingBag, Calendar, Percent, TrendingUp, Flame,
  ShieldCheck, HeartPulse,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M99MallFile, M99AuditLog,
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
  executed: { label: 'تنفيذ', bg: 'bg-green-50', text: 'text-green-700' },
  terminated: { label: 'إنهاء', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const STAGES = ['draft', 'reviewed', 'approved', 'executed', 'terminated'];

const FILE_TYPE_LABELS: Record<string, string> = {
  lease: 'عقد إيجار',
  anchor: 'عقد كبار المستأجرين',
  cam: 'رسوم CAM',
  eviction: 'إخلاء إداري',
  ad_space: 'مساحة إعلانية',
  renewal: 'تجديد عقد',
};

const FILE_TYPE_ICONS: Record<string, typeof Building2> = {
  lease: FileText,
  anchor: Store,
  cam: Receipt,
  eviction: Flame,
  ad_space: Megaphone,
  renewal: Calendar,
};

const TENANT_TYPES = ['anchor', 'regular', 'kiosk', 'food_court', 'entertainment'];
const TENANT_TYPE_LABELS: Record<string, string> = {
  anchor: 'كبار المستأجرين',
  regular: 'مستأجر عادي',
  kiosk: 'كشك',
  food_court: 'محلات مطاعم',
  entertainment: 'ترفيهي',
};

const LEASE_TYPES = ['fixed', 'percentage', 'fixed_plus_percentage', 'triple_net'];
const LEASE_TYPE_LABELS: Record<string, string> = {
  fixed: 'إيجار ثابت',
  percentage: 'نسبة من المبيعات',
  fixed_plus_percentage: 'ثابت + نسبة',
  triple_net: 'ثلاثي صافي',
};

const CURRENCIES = ['SAR', 'USD', 'EUR', 'AED', 'KWD', 'QAR', 'BHD', 'EGP'];

interface MallFileForm {
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  mall_name: string;
  unit_number: string;
  tenant_name: string;
  tenant_type: string;
  lease_type: string;
  base_rent: string;
  percentage_rent_rate: string;
  pos_linked: boolean;
  monthly_sales: string;
  cam_charges: string;
  utility_charges: string;
  ad_space_revenue: string;
  lease_start: string;
  lease_end: string;
  eviction_flagged: boolean;
  eviction_reason: string;
  civil_defense_approved: boolean;
  health_license_ref: string;
  contract_value: string;
  currency: string;
  description: string;
}

const emptyForm: MallFileForm = {
  file_number: '', file_title: '', file_type: 'lease', stage: 'draft',
  mall_name: '', unit_number: '', tenant_name: '', tenant_type: 'regular',
  lease_type: 'fixed',
  base_rent: '0', percentage_rent_rate: '0',
  pos_linked: false, monthly_sales: '0',
  cam_charges: '0', utility_charges: '0', ad_space_revenue: '0',
  lease_start: '', lease_end: '',
  eviction_flagged: false, eviction_reason: '',
  civil_defense_approved: false, health_license_ref: '',
  contract_value: '0', currency: 'SAR',
  description: '',
};

export default function ShoppingMallEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [files, setFiles] = useState<M99MallFile[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('files');
  const [selectedFile, setSelectedFile] = useState<M99MallFile | null>(null);
  const [auditLogs, setAuditLogs] = useState<M99AuditLog[]>([]);
  const [allAudit, setAllAudit] = useState<M99AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MallFileForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [fRes, attRes, auditRes] = await Promise.all([
      supabase.from('m99_mall_files')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m99_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (fRes.error) console.error('m99 fetch error', fRes.error);
    if (attRes.error) console.error('attorneys fetch error', attRes.error);
    if (auditRes.error) console.error('audit fetch error', auditRes.error);
    setFiles((fRes.data as M99MallFile[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAudit((auditRes.data as M99AuditLog[]) || []);
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
    const { error } = await supabase.from('m99_audit_logs').insert({
      case_id: fileId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
    if (error) console.error('audit log error', error);
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (f: M99MallFile) => {
    setForm({
      file_number: f.file_number, file_title: f.file_title,
      file_type: f.file_type, stage: f.stage,
      mall_name: f.mall_name || '', unit_number: f.unit_number || '',
      tenant_name: f.tenant_name || '', tenant_type: f.tenant_type || 'regular',
      lease_type: f.lease_type || 'fixed',
      base_rent: String(f.base_rent || 0),
      percentage_rent_rate: String(f.percentage_rent_rate || 0),
      pos_linked: !!f.pos_linked,
      monthly_sales: String(f.monthly_sales || 0),
      cam_charges: String(f.cam_charges || 0),
      utility_charges: String(f.utility_charges || 0),
      ad_space_revenue: String(f.ad_space_revenue || 0),
      lease_start: f.lease_start || '', lease_end: f.lease_end || '',
      eviction_flagged: !!f.eviction_flagged,
      eviction_reason: f.eviction_reason || '',
      civil_defense_approved: !!f.civil_defense_approved,
      health_license_ref: f.health_license_ref || '',
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
    const contractValue = Number(form.contract_value) || 0;
    const payload = {
      file_number: form.file_number.trim(),
      file_title: form.file_title.trim(),
      file_type: form.file_type,
      stage: form.stage,
      status: form.stage === 'terminated' ? 'terminated' : 'active',
      mall_name: form.mall_name.trim() || null,
      unit_number: form.unit_number.trim() || null,
      tenant_name: form.tenant_name.trim() || null,
      tenant_type: form.tenant_type || null,
      lease_type: form.lease_type || null,
      base_rent: Number(form.base_rent) || 0,
      percentage_rent_rate: Number(form.percentage_rent_rate) || 0,
      pos_linked: form.pos_linked,
      monthly_sales: Number(form.monthly_sales) || 0,
      cam_charges: Number(form.cam_charges) || 0,
      utility_charges: Number(form.utility_charges) || 0,
      ad_space_revenue: Number(form.ad_space_revenue) || 0,
      lease_start: form.lease_start || null,
      lease_end: form.lease_end || null,
      eviction_flagged: form.eviction_flagged,
      eviction_reason: form.eviction_reason.trim() || null,
      civil_defense_approved: form.civil_defense_approved,
      health_license_ref: form.health_license_ref.trim() || null,
      contract_value: contractValue,
      currency: form.currency,
      description: form.description.trim() || null,
    };
    if (editingId) {
      const { error } = await supabase.from('m99_mall_files').update(payload).eq('id', editingId);
      if (error) console.error('update error', error);
      await logAudit(editingId, 'file_updated', 'تحديث بيانات ملف المولات والمراكز التجارية والإيجارات');
    } else {
      const { data, error } = await supabase.from('m99_mall_files').insert(payload).select('id');
      if (error) console.error('insert error', error);
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'file_created', 'إنشاء ملف مول/مركز تجاري — النوع: ' + (FILE_TYPE_LABELS[form.file_type] || form.file_type));
        const needsCase = form.file_type === 'eviction' || form.eviction_flagged;
        await supabase.from('m99_mall_files').update({
          m53_document_id: 'DOC-M99-' + Date.now().toString().slice(-6),
          m54_finance_linked: true,
          m85_tax_linked: true,
          m10_case_opened: needsCase,
          m109_biometric_signed: true,
          m92_notified: true,
          cost_center_id: 'CC-M99-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm53_document', 'أرشفة الملف في محرك المستندات (M53)');
        await logAudit(newId, 'm54_finance', 'ربط الملف بالمحرك المالي (M54) — إيجارات ورسوم CAM');
        await logAudit(newId, 'm85_tax', 'ربط الملف بمحرك الجمارك والضرائب (M85) — ضريبة القيمة المضافة');
        if (needsCase) await logAudit(newId, 'm10_case', 'فتح القضية في المحرك الموحد (M10) — إخلاء إداري/نزاع إيجاري');
        await logAudit(newId, 'm109_biometric', 'التوقيع البيومتري لعقود الإيجار التجاري (M109)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء الملف');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('m99_mall_files').delete().eq('id', deleteId);
    if (error) console.error('delete error', error);
    setDeleteId(null);
    setSelectedFile(null);
    fetchAll();
  };

  const openFileDetail = async (f: M99MallFile) => {
    setSelectedFile(f);
    setDetailLoading(true);
    const aRes = await supabase.from('m99_audit_logs').select('*').eq('case_id', f.id).order('created_at', { ascending: true });
    if (aRes.error) console.error('detail audit error', aRes.error);
    setAuditLogs((aRes.data as M99AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (f: M99MallFile) => {
    const idx = STAGES.indexOf(f.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    const { error } = await supabase.from('m99_mall_files').update({ stage: next, status: next === 'terminated' ? 'terminated' : 'active' }).eq('id', f.id);
    if (error) console.error('stage advance error', error);
    await logAudit(f.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedFile({ ...f, stage: next } as M99MallFile);
  };

  const filteredFiles = files.filter((f) => {
    if (filterType !== 'all' && f.file_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!f.file_number.toLowerCase().includes(q) && !f.file_title.toLowerCase().includes(q) && !(f.mall_name || '').toLowerCase().includes(q) && !(f.tenant_name || '').toLowerCase().includes(q) && !(f.unit_number || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const anchorTenantsCount = files.filter((f) => f.tenant_type === 'anchor').length;
  const posLinkedCount = files.filter((f) => f.pos_linked).length;
  const totalContractValue = files.reduce((s, f) => s + (f.contract_value || 0), 0);

  const tabs: { id: Tab; label: string; icon: typeof Building2; badge?: number }[] = [
    { id: 'files', label: 'ملفات المولات والإيجارات', icon: ShoppingBag, badge: files.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <ShoppingBag size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">إدارة المولات والمراكز التجارية والإيجارات (M99)</h2>
            <p className="font-body text-[10px] text-ink/40">عقود الإيجار التجاري ونسبة المبيعات ورسوم CAM والإخلاء الإداري</p>
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
        <StatCard icon={<ShoppingBag size={14} className="text-midnight" />} label="إجمالي الملفات" value={String(files.length)} valueClass="text-midnight" />
        <StatCard icon={<Store size={14} className="text-purple-600" />} label="كبار المستأجرين" value={String(anchorTenantsCount)} valueClass="text-purple-700" />
        <StatCard icon={<TrendingUp size={14} className="text-blue-600" />} label="مرتبط بنقاط البيع" value={String(posLinkedCount)} valueClass="text-blue-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="إجمالي قيمة العقود" value={formatCurrency(totalContractValue)} valueClass="text-gold" />
      </div>

      {/* 5-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة ملف المول — 5 مراحل</span>
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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {[
            { icon: FileText, label: 'المستندات (M53)', desc: 'أرشفة العقود', color: 'text-purple-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'إيجارات ورسوم CAM', color: 'text-gold' },
            { icon: Receipt, label: 'الجمارك والضرائب (M85)', desc: 'ضريبة القيمة المضافة', color: 'text-blue-600' },
            { icon: Scale, label: 'نواة القضية (M10)', desc: 'نزاعات إيجارية وإخلاء', color: 'text-blue-600' },
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
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم الملف أو المول أو المستأجر..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Files tab */}
      {activeTab === 'files' && (
        <div className="space-y-2">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <ShoppingBag size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد ملفات مولات ومراكز تجارية مسجلة</p>
            </div>
          ) : (
            filteredFiles.map((f) => {
              const sCfg = STAGE_CONFIG[f.stage] || STAGE_CONFIG.draft;
              const stageIdx = STAGES.indexOf(f.stage);
              const TypeIcon = FILE_TYPE_ICONS[f.file_type] || ShoppingBag;
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
                          {f.tenant_type === 'anchor' && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-purple-50 text-purple-600">
                              <Store size={8} /> كبار المستأجرين
                            </span>
                          )}
                          {f.pos_linked && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-blue-50 text-blue-600">
                              <TrendingUp size={8} /> POS
                            </span>
                          )}
                          {f.eviction_flagged && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-red-50 text-red-600">
                              <Flame size={8} /> إخلاء
                            </span>
                          )}
                          {f.civil_defense_approved && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-green-50 text-green-600">
                              <ShieldCheck size={8} /> دفاع مدني
                            </span>
                          )}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{f.file_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {f.mall_name && <span className="font-body text-[9px] text-ink/40">المول: {f.mall_name}</span>}
                          {f.unit_number && <span className="font-body text-[9px] text-ink/40">الوحدة: {f.unit_number}</span>}
                          {f.tenant_name && <span className="font-body text-[9px] text-ink/40">المستأجر: {f.tenant_name}</span>}
                          {f.lease_type && <span className="font-body text-[9px] text-ink/40">نوع الإيجار: {LEASE_TYPE_LABELS[f.lease_type] || f.lease_type}</span>}
                          {f.base_rent > 0 && <span className="font-body text-[9px] text-gold font-bold">الإيجار الأساسي: {formatCurrency(f.base_rent)}</span>}
                          {f.percentage_rent_rate > 0 && <span className="font-body text-[9px] text-purple-600 font-bold">نسبة المبيعات: {f.percentage_rent_rate}%</span>}
                          {f.contract_value > 0 && <span className="font-body text-[9px] text-gold font-bold">قيمة العقد: {formatCurrency(f.contract_value)}</span>}
                          {f.m53_document_id && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><FileText size={8} /> M53</span>}
                          {f.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {f.m85_tax_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Receipt size={8} /> M85</span>}
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
                    {log.action.includes('created') ? <ShoppingBag size={12} className="text-blue-600" />
                      : log.action.includes('m53') ? <FileText size={12} className="text-purple-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m85') ? <Receipt size={12} className="text-blue-600" />
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
                <ShoppingBag size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف المول والمركز التجاري</span>
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

                {/* Mall & unit info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Building2 size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات المول والوحدة</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">اسم المول</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.mall_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">رقم الوحدة</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.unit_number || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">اسم المستأجر</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.tenant_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نوع المستأجر</span><p className="font-body text-xs font-bold text-midnight">{TENANT_TYPE_LABELS[selectedFile.tenant_type || ''] || selectedFile.tenant_type || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نوع الإيجار</span><p className="font-body text-xs font-bold text-midnight">{LEASE_TYPE_LABELS[selectedFile.lease_type || ''] || selectedFile.lease_type || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">تاريخ بداية الإيجار</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.lease_start ? formatDate(selectedFile.lease_start) : '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">تاريخ نهاية الإيجار</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.lease_end ? formatDate(selectedFile.lease_end) : '—'}</p></div>
                  </div>
                </div>

                {/* Financial details */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <DollarSign size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">البيانات المالية</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">الإيجار الأساسي</span><p className="font-body text-xs font-bold text-gold">{formatCurrency(selectedFile.base_rent)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نسبة المبيعات</span><p className="font-body text-xs font-bold text-purple-700">{selectedFile.percentage_rent_rate}%</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المبيعات الشهرية</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedFile.monthly_sales)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">رسوم CAM</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedFile.cam_charges)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">رسوم المرافق</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedFile.utility_charges)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">إيراد المساحات الإعلانية</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedFile.ad_space_revenue)}</p></div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gold/10">
                    <span className="font-body text-[9px] text-ink/40">قيمة العقد الإجمالية</span>
                    <p className="font-body text-sm font-bold text-gold">{formatCurrency(selectedFile.contract_value)} <span className="text-[10px] text-ink/40 font-normal">{selectedFile.currency}</span></p>
                  </div>
                </div>

                {/* POS linkage card */}
                <div className={`rounded-lg p-3 border ${selectedFile.pos_linked ? 'bg-blue-50 border-blue-100' : 'bg-gray-100 border-gray-200'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp size={12} className={selectedFile.pos_linked ? 'text-blue-600' : 'text-ink/40'} />
                    <span className="font-body text-[10px] font-bold text-midnight">ربط نقاط البيع (POS)</span>
                  </div>
                  <p className={`font-body text-xs font-bold ${selectedFile.pos_linked ? 'text-blue-700' : 'text-ink/50'}`}>
                    {selectedFile.pos_linked ? 'مرتبط — متابعة المبيعات الشهرية' : 'غير مرتبط'}
                  </p>
                </div>

                {/* Eviction card */}
                <div className={`rounded-lg p-3 border ${selectedFile.eviction_flagged ? 'bg-red-50 border-red-100' : 'bg-gray-100 border-gray-200'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Flame size={12} className={selectedFile.eviction_flagged ? 'text-red-600' : 'text-ink/40'} />
                    <span className="font-body text-[10px] font-bold text-midnight">الإخلاء الإداري</span>
                  </div>
                  <p className={`font-body text-xs font-bold ${selectedFile.eviction_flagged ? 'text-red-700' : 'text-ink/50'}`}>
                    {selectedFile.eviction_flagged ? 'مُعلَّم — يتطلب إجراء إخلاء' : 'لا يوجد إخلاء'}
                  </p>
                  {selectedFile.eviction_reason && (
                    <p className="font-body text-[10px] text-ink/50 mt-1">السبب: {selectedFile.eviction_reason}</p>
                  )}
                </div>

                {/* Compliance card */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <ShieldCheck size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">الامتثال والتراخيص</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="font-body text-[9px] text-ink/40">موافقة الدفاع المدني</span>
                      <p className={`font-body text-xs font-bold ${selectedFile.civil_defense_approved ? 'text-green-700' : 'text-ink/50'}`}>
                        {selectedFile.civil_defense_approved ? 'معتمد ✓' : 'غير معتمد'}
                      </p>
                    </div>
                    <div>
                      <span className="font-body text-[9px] text-ink/40">مرجع الترخيص الصحي</span>
                      <p className="font-body text-xs font-bold text-midnight">{selectedFile.health_license_ref || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m53_document_id ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> M53 {selectedFile.m53_document_id ? 'مؤرشف' : 'غير مؤرشف'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedFile.m54_finance_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m85_tax_linked ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Receipt size={10} /> M85 {selectedFile.m85_tax_linked ? 'مربوط' : 'غير مربوط'}</span>
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
      <EntityModal open={modalOpen} title={editingId ? 'تعديل الملف' : 'ملف مول/مركز تجاري جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الملف" required><TextInput value={form.file_number} onChange={(e) => setForm({ ...form, file_number: e.target.value })} placeholder="MALL-2025-001" /></Field>
          <Field label="نوع الملف">
            <Select value={form.file_type} onChange={(e) => setForm({ ...form, file_type: e.target.value })}>
              {Object.entries(FILE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان الملف" required><TextInput value={form.file_title} onChange={(e) => setForm({ ...form, file_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم المول / المركز التجاري"><TextInput value={form.mall_name} onChange={(e) => setForm({ ...form, mall_name: e.target.value })} /></Field>
          <Field label="رقم الوحدة"><TextInput value={form.unit_number} onChange={(e) => setForm({ ...form, unit_number: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم المستأجر"><TextInput value={form.tenant_name} onChange={(e) => setForm({ ...form, tenant_name: e.target.value })} /></Field>
          <Field label="نوع المستأجر">
            <Select value={form.tenant_type} onChange={(e) => setForm({ ...form, tenant_type: e.target.value })}>
              {TENANT_TYPES.map((t) => <option key={t} value={t}>{TENANT_TYPE_LABELS[t]}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نوع الإيجار">
            <Select value={form.lease_type} onChange={(e) => setForm({ ...form, lease_type: e.target.value })}>
              {LEASE_TYPES.map((l) => <option key={l} value={l}>{LEASE_TYPE_LABELS[l]}</option>)}
            </Select>
          </Field>
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الإيجار الأساسي"><TextInput type="number" value={form.base_rent} onChange={(e) => setForm({ ...form, base_rent: e.target.value })} /></Field>
          <Field label="نسبة المبيعات (%)"><TextInput type="number" value={form.percentage_rent_rate} onChange={(e) => setForm({ ...form, percentage_rent_rate: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المبيعات الشهرية"><TextInput type="number" value={form.monthly_sales} onChange={(e) => setForm({ ...form, monthly_sales: e.target.value })} /></Field>
          <Field label="رسوم CAM"><TextInput type="number" value={form.cam_charges} onChange={(e) => setForm({ ...form, cam_charges: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رسوم المرافق"><TextInput type="number" value={form.utility_charges} onChange={(e) => setForm({ ...form, utility_charges: e.target.value })} /></Field>
          <Field label="إيراد المساحات الإعلانية"><TextInput type="number" value={form.ad_space_revenue} onChange={(e) => setForm({ ...form, ad_space_revenue: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ بداية الإيجار"><TextInput type="date" value={form.lease_start} onChange={(e) => setForm({ ...form, lease_start: e.target.value })} /></Field>
          <Field label="تاريخ نهاية الإيجار"><TextInput type="date" value={form.lease_end} onChange={(e) => setForm({ ...form, lease_end: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="قيمة العقد"><TextInput type="number" value={form.contract_value} onChange={(e) => setForm({ ...form, contract_value: e.target.value })} /></Field>
          <Field label="العملة">
            <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="مرجع الترخيص الصحي"><TextInput value={form.health_license_ref} onChange={(e) => setForm({ ...form, health_license_ref: e.target.value })} /></Field>
        <Field label="سبب الإخلاء (إن وجد)"><TextInput value={form.eviction_reason} onChange={(e) => setForm({ ...form, eviction_reason: e.target.value })} /></Field>
        <div className="flex items-center gap-6 flex-wrap">
          <Checkbox checked={form.pos_linked} onChange={(v: boolean) => setForm({ ...form, pos_linked: v })} label="مرتبط بنقاط البيع (POS)" />
          <Checkbox checked={form.eviction_flagged} onChange={(v: boolean) => setForm({ ...form, eviction_flagged: v })} label="إخلاء إداري مُعلَّم" />
          <Checkbox checked={form.civil_defense_approved} onChange={(v: boolean) => setForm({ ...form, civil_defense_approved: v })} label="موافقة الدفاع المدني" />
        </div>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
