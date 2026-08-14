import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, AlertTriangle,
  Shield, CircuitBoard, CheckCircle2, Clock, Search,
  Activity, AlertCircle, BadgeCheck, Building2, DollarSign,
  FileText, Scale, Gavel, Car, Truck, Award, Handshake,
  Radio, Wrench,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M94AutomotiveFile, M94AuditLog,
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
  dealer_license: 'ترخيص معرض',
  sale: 'عقد بيع',
  lease: 'عقد تأجير',
  fleet: 'عقد أسطول',
  insurance_claim: 'مطالبة تأمين',
  warranty: 'ضمان فني',
};

const FILE_TYPE_ICONS: Record<string, typeof Building2> = {
  dealer_license: BadgeCheck,
  sale: FileText,
  lease: Handshake,
  fleet: Truck,
  insurance_claim: Shield,
  warranty: Award,
};

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  dealership: 'معرض سيارات',
  rental: 'تأجير',
  leasing: 'تأجير تمويلي',
  fleet: 'أسطول',
  used_cars: 'سيارات مستعملة',
};

const LEASE_TYPE_LABELS: Record<string, string> = {
  financial: 'تمويلي',
  operational: 'تشغيلي',
  short_term: 'قصير الأجل',
  long_term: 'طويل الأجل',
};

const CURRENCIES = ['SAR', 'USD', 'EUR', 'AED', 'KWD', 'QAR', 'BHD', 'EGP'];

interface AutomotiveFileForm {
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  dealership_name: string;
  business_type: string;
  license_number: string;
  vehicle_count: string;
  lease_type: string;
  monthly_installment: string;
  contract_value: string;
  currency: string;
  insurance_policy_ref: string;
  insurance_coverage: string;
  accident_claim: string;
  warranty_claim: string;
  maintenance_ref: string;
  gps_tracking: boolean;
  description: string;
}

const emptyForm: AutomotiveFileForm = {
  file_number: '', file_title: '', file_type: 'dealer_license', stage: 'draft',
  dealership_name: '', business_type: 'dealership', license_number: '',
  vehicle_count: '0', lease_type: 'financial', monthly_installment: '0',
  contract_value: '0', currency: 'SAR', insurance_policy_ref: '',
  insurance_coverage: '0', accident_claim: '0', warranty_claim: '',
  maintenance_ref: '', gps_tracking: false,
  description: '',
};

export default function AutomotiveTradeEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [files, setFiles] = useState<M94AutomotiveFile[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('files');
  const [selectedFile, setSelectedFile] = useState<M94AutomotiveFile | null>(null);
  const [auditLogs, setAuditLogs] = useState<M94AuditLog[]>([]);
  const [allAudit, setAllAudit] = useState<M94AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AutomotiveFileForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [fRes, attRes, auditRes] = await Promise.all([
      supabase.from('m94_automotive_files')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m94_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (fRes.error) console.error('m94 fetch error', fRes.error);
    if (attRes.error) console.error('attorneys fetch error', attRes.error);
    if (auditRes.error) console.error('audit fetch error', auditRes.error);
    setFiles((fRes.data as M94AutomotiveFile[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAudit((auditRes.data as M94AuditLog[]) || []);
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
    const { error } = await supabase.from('m94_audit_logs').insert({
      case_id: fileId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
    if (error) console.error('audit log error', error);
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (f: M94AutomotiveFile) => {
    setForm({
      file_number: f.file_number, file_title: f.file_title,
      file_type: f.file_type, stage: f.stage,
      dealership_name: f.dealership_name || '', business_type: f.business_type || 'dealership',
      license_number: f.license_number || '',
      vehicle_count: String(f.vehicle_count || 0),
      lease_type: f.lease_type || 'financial',
      monthly_installment: String(f.monthly_installment || 0),
      contract_value: String(f.contract_value || 0),
      currency: f.currency || 'SAR',
      insurance_policy_ref: f.insurance_policy_ref || '',
      insurance_coverage: String(f.insurance_coverage || 0),
      accident_claim: String(f.accident_claim || 0),
      warranty_claim: f.warranty_claim || '',
      maintenance_ref: f.maintenance_ref || '',
      gps_tracking: !!f.gps_tracking,
      description: f.description || '',
    });
    setEditingId(f.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.file_title.trim() || !form.file_number.trim()) return;
    setSaving(true);
    const vehicleCount = Number(form.vehicle_count) || 0;
    const monthlyInstallment = Number(form.monthly_installment) || 0;
    const contractValue = Number(form.contract_value) || 0;
    const insuranceCoverage = Number(form.insurance_coverage) || 0;
    const accidentClaim = Number(form.accident_claim) || 0;
    const payload = {
      file_number: form.file_number.trim(),
      file_title: form.file_title.trim(),
      file_type: form.file_type,
      stage: form.stage,
      status: form.stage === 'terminated' ? 'terminated' : 'active',
      dealership_name: form.dealership_name.trim() || null,
      business_type: form.business_type,
      license_number: form.license_number.trim() || null,
      vehicle_count: vehicleCount,
      lease_type: form.lease_type,
      monthly_installment: monthlyInstallment,
      contract_value: contractValue,
      currency: form.currency,
      insurance_policy_ref: form.insurance_policy_ref.trim() || null,
      insurance_coverage: insuranceCoverage,
      accident_claim: accidentClaim,
      warranty_claim: form.warranty_claim.trim() || null,
      maintenance_ref: form.maintenance_ref.trim() || null,
      gps_tracking: form.gps_tracking,
      description: form.description.trim() || null,
    };
    if (editingId) {
      const { error } = await supabase.from('m94_automotive_files').update(payload).eq('id', editingId);
      if (error) console.error('update error', error);
      await logAudit(editingId, 'file_updated', 'تحديث بيانات ملف تجارة السيارات وإدارة الأساطيل');
    } else {
      const { data, error } = await supabase.from('m94_automotive_files').insert(payload).select('id');
      if (error) console.error('insert error', error);
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'file_created', 'إنشاء ملف سيارات — النوع: ' + (FILE_TYPE_LABELS[form.file_type] || form.file_type));
        const needsIot = form.gps_tracking;
        const needsCase = form.file_type === 'insurance_claim' || form.file_type === 'warranty';
        await supabase.from('m94_automotive_files').update({
          m53_document_id: 'DOC-M94-' + Date.now().toString().slice(-6),
          m54_finance_linked: true,
          m101_maintenance_linked: true,
          m107_iot_linked: needsIot,
          m10_case_opened: needsCase,
          m109_biometric_signed: true,
          m92_notified: true,
          cost_center_id: 'CC-M94-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm53_document', 'أرشفة الملف في محرك المستندات (M53)');
        await logAudit(newId, 'm54_finance', 'ربط الملف بالمحرك المالي (M54) — أقساط وفوترة');
        await logAudit(newId, 'm101_maintenance', 'ربط مواعيد الصيانة بمحرك الصيانة (M101)');
        if (needsIot) await logAudit(newId, 'm107_iot', 'ربط تتبع GPS بمحرك إنترنت الأشياء (M107)');
        if (needsCase) await logAudit(newId, 'm10_case', 'فتح القضية في المحرك الموحد (M10) — نزاعات بيع وتأمين');
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
    const { error } = await supabase.from('m94_automotive_files').delete().eq('id', deleteId);
    if (error) console.error('delete error', error);
    setDeleteId(null);
    setSelectedFile(null);
    fetchAll();
  };

  const openFileDetail = async (f: M94AutomotiveFile) => {
    setSelectedFile(f);
    setDetailLoading(true);
    const aRes = await supabase.from('m94_audit_logs').select('*').eq('case_id', f.id).order('created_at', { ascending: true });
    if (aRes.error) console.error('detail audit error', aRes.error);
    setAuditLogs((aRes.data as M94AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (f: M94AutomotiveFile) => {
    const idx = STAGES.indexOf(f.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    const { error } = await supabase.from('m94_automotive_files').update({ stage: next, status: next === 'terminated' ? 'terminated' : 'active' }).eq('id', f.id);
    if (error) console.error('stage advance error', error);
    await logAudit(f.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedFile({ ...f, stage: next } as M94AutomotiveFile);
  };

  const filteredFiles = files.filter((f) => {
    if (filterType !== 'all' && f.file_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!f.file_number.toLowerCase().includes(q) && !f.file_title.toLowerCase().includes(q) && !(f.dealership_name || '').toLowerCase().includes(q) && !(f.license_number || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const totalVehicles = files.reduce((s, f) => s + (f.vehicle_count || 0), 0);
  const totalAccidentClaims = files.reduce((s, f) => s + (f.accident_claim || 0), 0);
  const totalContractValue = files.reduce((s, f) => s + (f.contract_value || 0), 0);

  const tabs: { id: Tab; label: string; icon: typeof Building2; badge?: number }[] = [
    { id: 'files', label: 'ملفات السيارات والأساطيل', icon: Car, badge: files.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Car size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">تجارة السيارات وتأجيرها وإدارة الأساطيل (M94)</h2>
            <p className="font-body text-[10px] text-ink/40">إدارة التراخيص والبيع والتأجير التمويلي والتشغيلي ومطالبات التأمين</p>
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
        <StatCard icon={<Car size={14} className="text-midnight" />} label="إجمالي الملفات" value={String(files.length)} valueClass="text-midnight" />
        <StatCard icon={<Truck size={14} className="text-blue-600" />} label="إجمالي المركبات" value={String(totalVehicles)} valueClass="text-blue-700" />
        <StatCard icon={<Shield size={14} className="text-red-600" />} label="مطالبات التأمين" value={formatCurrency(totalAccidentClaims)} valueClass="text-red-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="قيمة العقود" value={formatCurrency(totalContractValue)} valueClass="text-gold" />
      </div>

      {/* 6-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة ملف السيارات — 6 مراحل</span>
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
            { icon: FileText, label: 'المستندات (M53)', desc: 'أرشفة الملف', color: 'text-purple-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'أقساط وفوترة', color: 'text-gold' },
            { icon: Wrench, label: 'الصيانة (M101)', desc: 'مواعيد الصيانة', color: 'text-amber-600' },
            { icon: Radio, label: 'إنترنت الأشياء (M107)', desc: 'تتبع GPS', color: 'text-blue-600' },
            { icon: Scale, label: 'نواة القضية (M10)', desc: 'نزاعات بيع وتأمين', color: 'text-blue-600' },
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
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم الملف أو العنوان أو المعرض..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Files tab */}
      {activeTab === 'files' && (
        <div className="space-y-2">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Car size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد ملفات سيارات وأساطيل مسجلة</p>
            </div>
          ) : (
            filteredFiles.map((f) => {
              const sCfg = STAGE_CONFIG[f.stage] || STAGE_CONFIG.draft;
              const stageIdx = STAGES.indexOf(f.stage);
              const TypeIcon = FILE_TYPE_ICONS[f.file_type] || Car;
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
                          {f.gps_tracking && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-blue-50 text-blue-600">
                              <Radio size={8} /> GPS
                            </span>
                          )}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{f.file_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {f.dealership_name && <span className="font-body text-[9px] text-ink/40">المعرض: {f.dealership_name}</span>}
                          {f.business_type && <span className="font-body text-[9px] text-ink/40">النشاط: {BUSINESS_TYPE_LABELS[f.business_type] || f.business_type}</span>}
                          {f.license_number && <span className="font-body text-[9px] text-ink/40">ترخيص: {f.license_number}</span>}
                          {f.vehicle_count > 0 && <span className="font-body text-[9px] text-blue-600 font-bold">مركبات: {f.vehicle_count}</span>}
                          {f.contract_value > 0 && <span className="font-body text-[9px] text-gold font-bold">عقد: {formatCurrency(f.contract_value)}</span>}
                          {f.accident_claim > 0 && <span className="font-body text-[9px] text-red-600 font-bold">حادث: {formatCurrency(f.accident_claim)}</span>}
                          {f.m53_document_id && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><FileText size={8} /> M53</span>}
                          {f.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {f.m101_maintenance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Wrench size={8} /> M101</span>}
                          {f.m107_iot_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Radio size={8} /> M107</span>}
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
                    {log.action.includes('created') ? <Car size={12} className="text-blue-600" />
                      : log.action.includes('m53') ? <FileText size={12} className="text-purple-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m101') ? <Wrench size={12} className="text-amber-600" />
                      : log.action.includes('m107') ? <Radio size={12} className="text-blue-600" />
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
                <Car size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف السيارات والأساطيل</span>
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
                    <Car size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات الملف</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">اسم المعرض/الشركة</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.dealership_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نوع النشاط</span><p className="font-body text-xs font-bold text-midnight">{BUSINESS_TYPE_LABELS[selectedFile.business_type || ''] || selectedFile.business_type || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">رقم الترخيص</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.license_number || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نوع التأجير</span><p className="font-body text-xs font-bold text-midnight">{LEASE_TYPE_LABELS[selectedFile.lease_type || ''] || selectedFile.lease_type || '—'}</p></div>
                  </div>
                </div>

                {/* Contract value card */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-1">
                    <DollarSign size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">قيمة العقد</span>
                  </div>
                  <p className="font-body text-sm font-bold text-gold">{formatCurrency(selectedFile.contract_value)}</p>
                  {selectedFile.monthly_installment > 0 && (
                    <p className="font-body text-[10px] text-ink/50 mt-1">القسط الشهري: {formatCurrency(selectedFile.monthly_installment)}</p>
                  )}
                </div>

                {/* Vehicle count & installment card */}
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Truck size={12} className="text-blue-600" />
                    <span className="font-body text-[10px] font-bold text-midnight">عدد المركبات والأقساط</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-body text-[9px] text-ink/40">المركبات</span>
                      <p className="font-body text-sm font-bold text-blue-700">{selectedFile.vehicle_count}</p>
                    </div>
                    <div className="text-left">
                      <span className="font-body text-[9px] text-ink/40">القسط الشهري</span>
                      <p className="font-body text-sm font-bold text-blue-700">{formatCurrency(selectedFile.monthly_installment)}</p>
                    </div>
                  </div>
                </div>

                {/* Insurance card */}
                <div className={`rounded-lg p-3 border ${selectedFile.accident_claim > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-100 border-gray-200'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Shield size={12} className={selectedFile.accident_claim > 0 ? 'text-red-600' : 'text-ink/40'} />
                    <span className="font-body text-[10px] font-bold text-midnight">مطالبات التأمين</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">مرجع البوليصة</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.insurance_policy_ref || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">التغطية التأمينية</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedFile.insurance_coverage)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">مطالبة الحادث</span><p className={`font-body text-xs font-bold ${selectedFile.accident_claim > 0 ? 'text-red-700' : 'text-ink/50'}`}>{formatCurrency(selectedFile.accident_claim)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">مطالبة الضمان</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.warranty_claim || '—'}</p></div>
                  </div>
                </div>

                {/* Flags row */}
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedFile.gps_tracking && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold bg-blue-50 text-blue-600">
                      <Radio size={10} /> تتبع GPS
                    </span>
                  )}
                  {selectedFile.maintenance_ref && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold bg-amber-50 text-amber-600">
                      <Wrench size={10} /> صيانة: {selectedFile.maintenance_ref}
                    </span>
                  )}
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m53_document_id ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> M53 {selectedFile.m53_document_id ? 'مؤرشف' : 'غير مؤرشف'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedFile.m54_finance_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m101_maintenance_linked ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Wrench size={10} /> M101 {selectedFile.m101_maintenance_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m107_iot_linked ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Radio size={10} /> M107 {selectedFile.m107_iot_linked ? 'مربوط' : 'غير مربوط'}</span>
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
      <EntityModal open={modalOpen} title={editingId ? 'تعديل الملف' : 'ملف سيارات جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
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
          <Field label="اسم المعرض/الشركة"><TextInput value={form.dealership_name} onChange={(e) => setForm({ ...form, dealership_name: e.target.value })} /></Field>
          <Field label="نوع النشاط">
            <Select value={form.business_type} onChange={(e) => setForm({ ...form, business_type: e.target.value })}>
              {Object.entries(BUSINESS_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الترخيص"><TextInput value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} /></Field>
          <Field label="عدد المركبات"><TextInput type="number" value={form.vehicle_count} onChange={(e) => setForm({ ...form, vehicle_count: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نوع التأجير">
            <Select value={form.lease_type} onChange={(e) => setForm({ ...form, lease_type: e.target.value })}>
              {Object.entries(LEASE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="القسط الشهري"><TextInput type="number" value={form.monthly_installment} onChange={(e) => setForm({ ...form, monthly_installment: e.target.value })} /></Field>
          <Field label="قيمة العقد"><TextInput type="number" value={form.contract_value} onChange={(e) => setForm({ ...form, contract_value: e.target.value })} /></Field>
        </div>
        <Field label="العملة">
          <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="مرجع بوليصة التأمين"><TextInput value={form.insurance_policy_ref} onChange={(e) => setForm({ ...form, insurance_policy_ref: e.target.value })} /></Field>
          <Field label="التغطية التأمينية"><TextInput type="number" value={form.insurance_coverage} onChange={(e) => setForm({ ...form, insurance_coverage: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="مطالبة الحادث"><TextInput type="number" value={form.accident_claim} onChange={(e) => setForm({ ...form, accident_claim: e.target.value })} /></Field>
          <Field label="مطالبة الضمان"><TextInput value={form.warranty_claim} onChange={(e) => setForm({ ...form, warranty_claim: e.target.value })} /></Field>
        </div>
        <Field label="مرجع الصيانة"><TextInput value={form.maintenance_ref} onChange={(e) => setForm({ ...form, maintenance_ref: e.target.value })} /></Field>
        <Checkbox checked={form.gps_tracking} onChange={(v: boolean) => setForm({ ...form, gps_tracking: v })} label="تتبع GPS" />
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
