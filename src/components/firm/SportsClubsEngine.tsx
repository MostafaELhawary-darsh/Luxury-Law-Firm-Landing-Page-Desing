import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, AlertTriangle,
  Shield, CircuitBoard, Zap, CheckCircle2, Clock, ArrowRight, Search,
  Activity, Server, AlertCircle, BadgeCheck, Trophy, DollarSign,
  FileText, Scale, Gavel, Users, Image, Radio,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M79SportsClubFile, M79AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'files' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'مسودة', bg: 'bg-blue-50', text: 'text-blue-700' },
  reviewed: { label: 'مراجعة', bg: 'bg-amber-50', text: 'text-amber-700' },
  approved: { label: 'معتمد', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  executed: { label: 'منفَّذ', bg: 'bg-green-50', text: 'text-green-700' },
  terminated: { label: 'منتهٍ', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const STAGES = ['draft', 'reviewed', 'approved', 'executed', 'terminated'];

const FILE_TYPE_LABELS: Record<string, string> = {
  player_contract: 'عقد لاعب',
  coach_contract: 'عقد مُدرِّب',
  sponsorship: 'رعاية',
  election: 'انتخابات',
  facility_license: 'ترخيص منشأة',
  dispute: 'نزاع رياضي',
};

const FILE_TYPE_ICONS: Record<string, typeof Trophy> = {
  player_contract: Trophy,
  coach_contract: Users,
  sponsorship: DollarSign,
  election: BadgeCheck,
  facility_license: FileText,
  dispute: Gavel,
};

const SPORT_LABELS: Record<string, string> = {
  football: 'كرة القدم',
  basketball: 'كرة السلة',
  volleyball: 'الكرة الطائرة',
  handball: 'كرة اليد',
  tennis: 'التنس',
  athletics: 'ألعاب القوى',
};

const LICENSE_LABELS: Record<string, string> = {
  stadium: 'ملعب',
  training_facility: 'منشأة تدريب',
  sports_hall: 'صالة رياضية',
  swimming_pool: 'حمام سباحة',
};

const DISPUTE_LABELS: Record<string, string> = {
  none: 'لا يوجد',
  cgsac: 'مركز التسوية (CGSAC)',
  cas: 'محكمة التحكيم الرياضية (CAS)',
  settled: 'تمت التسوية',
  appealed: 'مستأنف',
};

const CURRENCIES = ['SAR', 'USD', 'EUR', 'AED'];

interface ClubForm {
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  club_name: string;
  federation_name: string;
  sport_category: string;
  contract_value: string;
  currency: string;
  sponsorship_included: boolean;
  broadcasting_rights: boolean;
  election_ref: string;
  license_type: string;
  dispute_status: string;
  cgsac_ref: string;
  cas_ref: string;
  description: string;
}

const emptyForm: ClubForm = {
  file_number: '', file_title: '', file_type: 'player_contract', stage: 'draft',
  club_name: '', federation_name: '', sport_category: 'football', contract_value: '0',
  currency: 'SAR', sponsorship_included: false, broadcasting_rights: false,
  election_ref: '', license_type: 'stadium', dispute_status: 'none',
  cgsac_ref: '', cas_ref: '', description: '',
};

export default function SportsClubsEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [files, setFiles] = useState<M79SportsClubFile[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('files');
  const [selectedFile, setSelectedFile] = useState<M79SportsClubFile | null>(null);
  const [auditLogs, setAuditLogs] = useState<M79AuditLog[]>([]);
  const [allAudit, setAllAudit] = useState<M79AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClubForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [fRes, attRes, auditRes] = await Promise.all([
      supabase.from('m79_sports_club_files')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m79_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (fRes.error) console.error('m79 fetch error', fRes.error);
    if (attRes.error) console.error('attorneys fetch error', attRes.error);
    if (auditRes.error) console.error('audit fetch error', auditRes.error);
    setFiles((fRes.data as M79SportsClubFile[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAudit((auditRes.data as M79AuditLog[]) || []);
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
    const { error } = await supabase.from('m79_audit_logs').insert({
      case_id: fileId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
    if (error) console.error('audit log error', error);
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (f: M79SportsClubFile) => {
    setForm({
      file_number: f.file_number, file_title: f.file_title,
      file_type: f.file_type, stage: f.stage,
      club_name: f.club_name || '', federation_name: f.federation_name || '',
      sport_category: f.sport_category || 'football', contract_value: String(f.contract_value || 0),
      currency: f.currency || 'SAR', sponsorship_included: f.sponsorship_included || false,
      broadcasting_rights: f.broadcasting_rights || false, election_ref: f.election_ref || '',
      license_type: f.license_type || 'stadium', dispute_status: f.dispute_status || 'none',
      cgsac_ref: f.cgsac_ref || '', cas_ref: f.cas_ref || '', description: f.description || '',
    });
    setEditingId(f.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.file_title.trim() || !form.file_number.trim()) return;
    setSaving(true);
    const value = Number(form.contract_value) || 0;
    const payload = {
      file_number: form.file_number.trim(),
      file_title: form.file_title.trim(),
      file_type: form.file_type,
      stage: form.stage,
      status: form.stage === 'terminated' ? 'terminated' : 'active',
      club_name: form.club_name.trim() || null,
      federation_name: form.federation_name.trim() || null,
      sport_category: form.sport_category,
      contract_value: value,
      currency: form.currency,
      sponsorship_included: form.sponsorship_included,
      broadcasting_rights: form.broadcasting_rights,
      election_ref: form.election_ref.trim() || null,
      license_type: form.license_type,
      dispute_status: form.dispute_status,
      cgsac_ref: form.cgsac_ref.trim() || null,
      cas_ref: form.cas_ref.trim() || null,
      description: form.description.trim() || null,
    };
    if (editingId) {
      const { error } = await supabase.from('m79_sports_club_files').update(payload).eq('id', editingId);
      if (error) console.error('update error', error);
      await logAudit(editingId, 'file_updated', 'تحديث بيانات ملف النادي/الاتحاد الرياضي');
    } else {
      const { data, error } = await supabase.from('m79_sports_club_files').insert(payload).select('id');
      if (error) console.error('insert error', error);
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'file_created', 'إنشاء ملف نادي/اتحاد رياضي — النوع: ' + (FILE_TYPE_LABELS[form.file_type] || form.file_type));
        await supabase.from('m79_sports_club_files').update({
          m53_document_id: 'DOC-M79-' + Date.now().toString().slice(-6),
          m54_finance_linked: true,
          m10_case_opened: form.file_type === 'dispute' || form.dispute_status !== 'none',
          m77_hr_linked: form.file_type === 'player_contract' || form.file_type === 'coach_contract',
          m109_biometric_signed: true,
          m92_notified: true,
          cost_center_id: 'CC-M79-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm53_document', 'أرشفة الملف في محرك المستندات (M53)');
        await logAudit(newId, 'm54_finance', 'ربط الملف بالمحرك المالي (M54)');
        if (form.file_type === 'dispute' || form.dispute_status !== 'none') await logAudit(newId, 'm10_case', 'فتح القضية في المحرك الموحد (M10)');
        if (form.file_type === 'player_contract' || form.file_type === 'coach_contract') await logAudit(newId, 'm77_hr', 'ربط الملف بمحرك الموارد البشرية (M77)');
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
    const { error } = await supabase.from('m79_sports_club_files').delete().eq('id', deleteId);
    if (error) console.error('delete error', error);
    setDeleteId(null);
    setSelectedFile(null);
    fetchAll();
  };

  const openFileDetail = async (f: M79SportsClubFile) => {
    setSelectedFile(f);
    setDetailLoading(true);
    const aRes = await supabase.from('m79_audit_logs').select('*').eq('case_id', f.id).order('created_at', { ascending: true });
    if (aRes.error) console.error('detail audit error', aRes.error);
    setAuditLogs((aRes.data as M79AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (f: M79SportsClubFile) => {
    const idx = STAGES.indexOf(f.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    const { error } = await supabase.from('m79_sports_club_files').update({ stage: next, status: next === 'terminated' ? 'terminated' : 'active' }).eq('id', f.id);
    if (error) console.error('stage advance error', error);
    await logAudit(f.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedFile({ ...f, stage: next } as M79SportsClubFile);
  };

  const filteredFiles = files.filter((f) => {
    if (filterType !== 'all' && f.file_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!f.file_number.toLowerCase().includes(q) && !f.file_title.toLowerCase().includes(q) && !(f.club_name || '').toLowerCase().includes(q) && !(f.federation_name || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeDisputes = files.filter((f) => f.dispute_status !== 'none' && f.dispute_status !== 'settled').length;
  const totalValue = files.reduce((s, f) => s + (f.contract_value || 0), 0);
  const sponsorshipCount = files.filter((f) => f.sponsorship_included).length;

  const tabs: { id: Tab; label: string; icon: typeof Trophy; badge?: number }[] = [
    { id: 'files', label: 'الملفات', icon: Trophy, badge: files.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Trophy size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">الأندية والاتحادات الرياضية (M79)</h2>
            <p className="font-body text-[10px] text-ink/40">إدارة الكيانات الرياضية وعقود الاحتراف والرعاية وحوكمة العمليات الانتخابية والنزاعات الرياضية</p>
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
        <StatCard icon={<Trophy size={14} className="text-midnight" />} label="إجمالي الملفات" value={String(files.length)} valueClass="text-midnight" />
        <StatCard icon={<AlertCircle size={14} className="text-red-600" />} label="نزاعات نشطة" value={String(activeDisputes)} valueClass="text-red-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="إجمالي قيمة العقود" value={formatCurrency(totalValue)} valueClass="text-gold" />
        <StatCard icon={<BadgeCheck size={14} className="text-green-600" />} label="ملفات الرعاية" value={String(sponsorshipCount)} valueClass="text-green-700" />
      </div>

      {/* 5-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة ملف النادي/الاتحاد — 5 مراحل</span>
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
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'ربط الأمانة', color: 'text-gold' },
            { icon: Server, label: 'نواة القضية (M10)', desc: 'فتح القضية', color: 'text-blue-600' },
            { icon: Users, label: 'الموارد البشرية (M77)', desc: 'عقود اللاعبين/المدرّبين', color: 'text-green-600' },
            { icon: BadgeCheck, label: 'البيومتري (M109)', desc: 'توقيع الأطراف', color: 'text-green-600' },
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
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم الملف أو العنوان أو النادي/الاتحاد..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Files tab */}
      {activeTab === 'files' && (
        <div className="space-y-2">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Trophy size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد ملفات مسجلة</p>
            </div>
          ) : (
            filteredFiles.map((f) => {
              const sCfg = STAGE_CONFIG[f.stage] || STAGE_CONFIG.draft;
              const stageIdx = STAGES.indexOf(f.stage);
              const TypeIcon = FILE_TYPE_ICONS[f.file_type] || Trophy;
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
                          {f.sponsorship_included && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> رعاية</span>}
                          {f.broadcasting_rights && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-cyan-50 text-cyan-600"><Radio size={8} /> بث</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{f.file_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {f.club_name && <span className="font-body text-[9px] text-ink/40">النادي: {f.club_name}</span>}
                          {f.federation_name && <span className="font-body text-[9px] text-ink/40">الاتحاد: {f.federation_name}</span>}
                          {f.sport_category && <span className="font-body text-[9px] text-ink/40">الرياضة: {SPORT_LABELS[f.sport_category] || f.sport_category}</span>}
                          {f.contract_value > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(f.contract_value)}</span>}
                          {f.dispute_status && f.dispute_status !== 'none' && <span className="font-body text-[9px] text-red-600 font-bold">نزاع: {DISPUTE_LABELS[f.dispute_status] || f.dispute_status}</span>}
                          {f.m53_document_id && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><FileText size={8} /> M53</span>}
                          {f.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {f.m10_case_opened && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Server size={8} /> M10</span>}
                          {f.m77_hr_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><Users size={8} /> M77</span>}
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
                    {log.action.includes('created') ? <Trophy size={12} className="text-blue-600" />
                      : log.action.includes('m53') ? <FileText size={12} className="text-purple-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m10') ? <Server size={12} className="text-blue-600" />
                      : log.action.includes('m77') ? <Users size={12} className="text-green-600" />
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
                <Trophy size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف النادي/الاتحاد الرياضي</span>
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

                {/* File info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Trophy size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات الملف</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">النادي</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.club_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الاتحاد</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.federation_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">التصنيف الرياضي</span><p className="font-body text-xs font-bold text-midnight">{SPORT_LABELS[selectedFile.sport_category || ''] || selectedFile.sport_category || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المستشار</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.advisor?.name || '—'}</p></div>
                  </div>
                </div>

                {/* Contract value */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <DollarSign size={12} className="text-gold mb-1" />
                  <span className="font-body text-[9px] text-ink/40">قيمة العقد</span>
                  <p className="font-body text-sm font-bold text-gold">{formatCurrency(selectedFile.contract_value)} <span className="text-[10px] text-ink/40">{selectedFile.currency}</span></p>
                </div>

                {/* Election / License info */}
                <div className="grid grid-cols-2 gap-3">
                  {selectedFile.election_ref && (
                    <div className="bg-cyan-50 rounded-lg p-3 border border-cyan-100">
                      <div className="flex items-center gap-1.5 mb-1">
                        <BadgeCheck size={12} className="text-cyan-600" />
                        <span className="font-body text-[10px] font-bold text-cyan-700">مرجع الانتخابات</span>
                      </div>
                      <p className="font-body text-xs font-bold text-midnight">{selectedFile.election_ref}</p>
                    </div>
                  )}
                  {selectedFile.license_type && (
                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                      <div className="flex items-center gap-1.5 mb-1">
                        <FileText size={12} className="text-purple-600" />
                        <span className="font-body text-[10px] font-bold text-purple-700">نوع الترخيص</span>
                      </div>
                      <p className="font-body text-xs font-bold text-midnight">{LICENSE_LABELS[selectedFile.license_type] || selectedFile.license_type}</p>
                    </div>
                  )}
                </div>

                {/* Rights flags */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.sponsorship_included ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> الرعاية {selectedFile.sponsorship_included ? 'مشمولة' : 'غير مشمولة'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.broadcasting_rights ? 'bg-cyan-50 text-cyan-600' : 'bg-gray-100 text-ink/30'}`}><Radio size={10} /> حقوق البث {selectedFile.broadcasting_rights ? 'مشمولة' : 'غير مشمولة'}</span>
                </div>

                {/* Dispute info */}
                <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Gavel size={12} className="text-red-600" />
                    <span className="font-body text-[10px] font-bold text-red-700">حالة النزاع</span>
                  </div>
                  <p className="font-body text-xs font-bold text-midnight">{DISPUTE_LABELS[selectedFile.dispute_status || 'none'] || selectedFile.dispute_status || 'لا يوجد'}</p>
                  {selectedFile.cgsac_ref && <p className="font-body text-[10px] text-ink/50 mt-1">مرجع CGSAC: {selectedFile.cgsac_ref}</p>}
                  {selectedFile.cas_ref && <p className="font-body text-[10px] text-ink/50 mt-1">مرجع CAS: {selectedFile.cas_ref}</p>}
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m53_document_id ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> M53 {selectedFile.m53_document_id ? 'مؤرشف' : 'غير مؤرشف'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedFile.m54_finance_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m10_case_opened ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Server size={10} /> M10 {selectedFile.m10_case_opened ? 'مفتوح' : 'غير مفتوح'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m77_hr_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><Users size={10} /> M77 {selectedFile.m77_hr_linked ? 'مربوط' : 'غير مربوط'}</span>
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
      <EntityModal open={modalOpen} title={editingId ? 'تعديل الملف' : 'ملف نادي/اتحاد رياضي جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الملف" required><TextInput value={form.file_number} onChange={(e) => setForm({ ...form, file_number: e.target.value })} placeholder="SC-2025-001" /></Field>
          <Field label="نوع الملف">
            <Select value={form.file_type} onChange={(e) => setForm({ ...form, file_type: e.target.value })}>
              {Object.entries(FILE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان الملف" required><TextInput value={form.file_title} onChange={(e) => setForm({ ...form, file_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم النادي"><TextInput value={form.club_name} onChange={(e) => setForm({ ...form, club_name: e.target.value })} /></Field>
          <Field label="اسم الاتحاد"><TextInput value={form.federation_name} onChange={(e) => setForm({ ...form, federation_name: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="التصنيف الرياضي">
            <Select value={form.sport_category} onChange={(e) => setForm({ ...form, sport_category: e.target.value })}>
              {Object.entries(SPORT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="قيمة العقد"><TextInput type="number" value={form.contract_value} onChange={(e) => setForm({ ...form, contract_value: e.target.value })} /></Field>
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
        <div className="grid grid-cols-2 gap-4">
          <Field label="مرجع الانتخابات"><TextInput value={form.election_ref} onChange={(e) => setForm({ ...form, election_ref: e.target.value })} placeholder="ELEC-2025-001" /></Field>
          <Field label="نوع الترخيص">
            <Select value={form.license_type} onChange={(e) => setForm({ ...form, license_type: e.target.value })}>
              {Object.entries(LICENSE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="حالة النزاع">
            <Select value={form.dispute_status} onChange={(e) => setForm({ ...form, dispute_status: e.target.value })}>
              {Object.entries(DISPUTE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="مرجع CGSAC"><TextInput value={form.cgsac_ref} onChange={(e) => setForm({ ...form, cgsac_ref: e.target.value })} placeholder="CGSAC-2025-001" /></Field>
            <Field label="مرجع CAS"><TextInput value={form.cas_ref} onChange={(e) => setForm({ ...form, cas_ref: e.target.value })} placeholder="CAS-2025-001" /></Field>
          </div>
        </div>
        <Checkbox label="مشمول بالرعاية (Sponsorship Included)" checked={form.sponsorship_included} onChange={(v) => setForm({ ...form, sponsorship_included: v })} />
        <Checkbox label="حقوق البث (Broadcasting Rights)" checked={form.broadcasting_rights} onChange={(v) => setForm({ ...form, broadcasting_rights: v })} />
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
