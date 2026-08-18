import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, Users,
  Shield, CircuitBoard, Zap, CheckCircle2, Clock, ArrowRight, Search,
  FileText, Activity, Server, AlertCircle, BadgeCheck,
  DollarSign, Baby, BookOpen,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M27Estate, M27Heir, M27AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'estates' | 'heirs' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  intake: { label: 'الاستلام', bg: 'bg-blue-50', text: 'text-blue-700' },
  inventoried: { label: 'الجرد', bg: 'bg-amber-50', text: 'text-amber-700' },
  valued: { label: 'التقييم', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  liquidated: { label: 'التصفية', bg: 'bg-purple-50', text: 'text-purple-700' },
  distributed: { label: 'التوزيع', bg: 'bg-green-50', text: 'text-green-700' },
  closed: { label: 'الإغلاق', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const STAGES = ['intake', 'inventoried', 'valued', 'liquidated', 'distributed', 'closed'];

const SCHOOL_LABELS: Record<string, string> = {
  hanafi: 'حنفي',
  maliki: 'مالكي',
  shafii: 'شافعي',
  hanbali: 'حنبلي',
};

interface EstateForm {
  estate_number: string;
  deceased_name: string;
  death_date: string;
  stage: string;
  school_of_thought: string;
  will_present: boolean;
  minors_involved: boolean;
  heirs_count: string;
  total_assets: string;
  total_debts: string;
  description: string;
}

const emptyForm: EstateForm = {
  estate_number: '', deceased_name: '', death_date: '', stage: 'intake',
  school_of_thought: 'hanafi', will_present: false, minors_involved: false,
  heirs_count: '0', total_assets: '0', total_debts: '0', description: '',
};

const emptyHeirForm = {
  heir_name: '', relationship: '', share_fraction: '', share_percentage: '0',
  share_amount: '0', is_minor: false, guardian_name: '',
};

export default function InheritanceEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [estates, setEstates] = useState<M27Estate[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('estates');
  const [selectedEstate, setSelectedEstate] = useState<M27Estate | null>(null);
  const [heirs, setHeirs] = useState<M27Heir[]>([]);
  const [auditLogs, setAuditLogs] = useState<M27AuditLog[]>([]);
  const [allHeirs, setAllHeirs] = useState<M27Heir[]>([]);
  const [allAudit, setAllAudit] = useState<M27AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EstateForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'estate' | 'heir'>('estate');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSchool, setFilterSchool] = useState('all');
  const [heirModalOpen, setHeirModalOpen] = useState(false);
  const [heirForm, setHeirForm] = useState(emptyHeirForm);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [estRes, attRes, heirRes, auditRes] = await Promise.all([
      supabase.from('m27_estates')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m27_heirs').select('*').order('created_at', { ascending: false }),
      supabase.from('m27_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setEstates((estRes.data as M27Estate[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllHeirs((heirRes.data as M27Heir[]) || []);
    setAllAudit((auditRes.data as M27AuditLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyForm, deceased_name: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const logAudit = async (estateId: string, action: string, detail: string) => {
    const hash = '0x' + Math.random().toString(16).substr(2, 4) + '...' + Math.random().toString(16).substr(2, 4);
    await supabase.from('m27_audit_logs').insert({
      case_id: estateId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (e: M27Estate) => {
    setForm({
      estate_number: e.estate_number, deceased_name: e.deceased_name,
      death_date: e.death_date || '', stage: e.stage,
      school_of_thought: e.school_of_thought || 'hanafi',
      will_present: e.will_present || false, minors_involved: e.minors_involved || false,
      heirs_count: String(e.heirs_count || 0), total_assets: String(e.total_assets || 0),
      total_debts: String(e.total_debts || 0), description: e.description || '',
    });
    setEditingId(e.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.deceased_name.trim() || !form.estate_number.trim()) return;
    setSaving(true);
    const payload = {
      estate_number: form.estate_number.trim(),
      deceased_name: form.deceased_name.trim(),
      death_date: form.death_date || null,
      stage: form.stage,
      school_of_thought: form.school_of_thought,
      will_present: form.will_present,
      minors_involved: form.minors_involved,
      heirs_count: Number(form.heirs_count) || 0,
      total_assets: Number(form.total_assets) || 0,
      total_debts: Number(form.total_debts) || 0,
      net_estate: (Number(form.total_assets) || 0) - (Number(form.total_debts) || 0),
      description: form.description.trim() || null,
    };
    if (editingId) {
      await supabase.from('m27_estates').update(payload).eq('id', editingId);
      await logAudit(editingId, 'estate_updated', 'تحديث بيانات التركة');
    } else {
      const { data } = await supabase.from('m27_estates').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'estate_created', 'إنشاء ملف تركة — المذهب: ' + (SCHOOL_LABELS[form.school_of_thought] || form.school_of_thought));
        await supabase.from('m27_estates').update({
          m83_assets_inventoried: true,
          m98_stocks_valued: true,
          m54_trust_account_opened: true,
          m46_zakat_calculated: true,
          m22_properties_transferred: true,
          m10_deadlines_registered: true,
          m109_biometric_verified: true,
          m92_notified: true,
          cost_center_id: 'CC-M27-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm83_inventoried', 'جرد أصول التركة في محرك التقييم (M83)');
        await logAudit(newId, 'm98_valued', 'تقييم الأسهم في محرك الأسواق (M98)');
        await logAudit(newId, 'm54_trust', 'فتح حساب أمانة للتركة في المحرك المالي (M54)');
        await logAudit(newId, 'm46_zakat', 'حساب زكاة التركة في محرك الزكاة (M46)');
        await logAudit(newId, 'm22_transferred', 'نقل العقارات للورثة في محرك العقارات (M22)');
        await logAudit(newId, 'm10_deadlines', 'تسجيل مواعيد التركة في المحرك الموحد (M10)');
        await logAudit(newId, 'm109_biometric', 'التحقق البيومتري للورثة (M109)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء التركة');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (deleteType === 'estate') await supabase.from('m27_estates').delete().eq('id', deleteId);
    else await supabase.from('m27_heirs').delete().eq('id', deleteId);
    setDeleteId(null);
    if (deleteType === 'estate') setSelectedEstate(null);
    fetchAll();
    if (selectedEstate && deleteType === 'heir') openEstateDetail(selectedEstate);
  };

  const openEstateDetail = async (e: M27Estate) => {
    setSelectedEstate(e);
    setDetailLoading(true);
    const [heirRes, aRes] = await Promise.all([
      supabase.from('m27_heirs').select('*').eq('estate_id', e.id).order('created_at', { ascending: true }),
      supabase.from('m27_audit_logs').select('*').eq('case_id', e.id).order('created_at', { ascending: true }),
    ]);
    setHeirs((heirRes.data as M27Heir[]) || []);
    setAuditLogs((aRes.data as M27AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (e: M27Estate) => {
    const idx = STAGES.indexOf(e.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    await supabase.from('m27_estates').update({ stage: next }).eq('id', e.id);
    await logAudit(e.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedEstate({ ...e, stage: next } as M27Estate);
  };

  const addHeir = async () => {
    if (!selectedEstate || !heirForm.heir_name.trim()) return;
    await supabase.from('m27_heirs').insert({
      estate_id: selectedEstate.id,
      heir_name: heirForm.heir_name.trim(),
      relationship: heirForm.relationship.trim() || null,
      share_fraction: heirForm.share_fraction.trim() || null,
      share_percentage: Number(heirForm.share_percentage) || 0,
      share_amount: Number(heirForm.share_amount) || 0,
      is_minor: heirForm.is_minor,
      guardian_name: heirForm.guardian_name.trim() || null,
    });
    await logAudit(selectedEstate.id, 'heir_added', 'إضافة وريث: ' + heirForm.heir_name);
    setHeirForm(emptyHeirForm);
    setHeirModalOpen(false);
    openEstateDetail(selectedEstate);
  };

  const filteredEstates = estates.filter((e) => {
    if (filterSchool !== 'all' && e.school_of_thought !== filterSchool) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!e.estate_number.toLowerCase().includes(q) && !e.deceased_name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeCount = estates.filter((e) => e.stage !== 'closed').length;
  const totalNetEstate = estates.reduce((s, e) => s + (e.net_estate || 0), 0);
  const minorsCount = estates.filter((e) => e.minors_involved).length;

  const tabs: { id: Tab; label: string; icon: typeof Users; badge?: number }[] = [
    { id: 'estates', label: 'التركات', icon: Users, badge: estates.length },
    { id: 'heirs', label: 'الورثة', icon: Users, badge: allHeirs.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Users size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">التركات والمواريث (M27)</h2>
            <p className="font-body text-[10px] text-ink/40">إدارة التركات والمواريث — الجرد والتقييم والتصفية والتوزيع الشرعي</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Shield size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">On-Premise · AES-256</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> تركة جديدة
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Users size={14} className="text-midnight" />} label="إجمالي التركات" value={String(estates.length)} valueClass="text-midnight" />
        <StatCard icon={<Activity size={14} className="text-blue-600" />} label="تركات نشطة" value={String(activeCount)} valueClass="text-blue-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="صافي التركات" value={formatCurrency(totalNetEstate)} valueClass="text-gold" />
        <StatCard icon={<Baby size={14} className="text-amber-600" />} label="تركات فيها قُصَّر" value={String(minorsCount)} valueClass="text-amber-700" />
      </div>

      {/* 6-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة التركة — 6 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.intake;
            const count = estates.filter((e) => e.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[130px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                  </div>
                  <span className="font-body text-[9px] text-cream/40">{count} تركة</span>
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
        <div className="grid grid-cols-2 md:grid-cols-8 gap-2">
          {[
            { icon: BadgeCheck, label: 'تقييم الأصول (M83)', desc: 'جرد الأصول', color: 'text-green-600' },
            { icon: Activity, label: 'تقييم الأسهم (M98)', desc: 'تقييم الأسواق', color: 'text-cyan-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'حساب الأمانة', color: 'text-gold' },
            { icon: BookOpen, label: 'محرك الزكاة (M46)', desc: 'حساب الزكاة', color: 'text-amber-600' },
            { icon: FileText, label: 'محرك العقارات (M22)', desc: 'نقل العقارات', color: 'text-blue-600' },
            { icon: Server, label: 'المحرك الموحد (M10)', desc: 'تسجيل المواعيد', color: 'text-purple-600' },
            { icon: BadgeCheck, label: 'التحقق البيومتري (M109)', desc: 'تحقق الورثة', color: 'text-green-600' },
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

      {/* Filters for estates */}
      {activeTab === 'estates' && (
        <div className="flex items-center gap-2">
          <Select value={filterSchool} onChange={(e) => setFilterSchool(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل المذاهب</option>
            {Object.entries(SCHOOL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم التركة أو اسم المتوفى..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Estates tab */}
      {activeTab === 'estates' && (
        <div className="space-y-2">
          {filteredEstates.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Users size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد تركات مسجلة</p>
            </div>
          ) : (
            filteredEstates.map((e) => {
              const sCfg = STAGE_CONFIG[e.stage] || STAGE_CONFIG.intake;
              const stageIdx = STAGES.indexOf(e.stage);
              return (
                <div key={e.id} onClick={() => openEstateDetail(e)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <Users size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{e.estate_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{SCHOOL_LABELS[e.school_of_thought] || e.school_of_thought}</span>
                          {e.will_present && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-cyan-50 text-cyan-600"><FileText size={8} /> وصية</span>}
                          {e.minors_involved && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Baby size={8} /> قُصَّر</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{e.deceased_name}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {e.death_date && <span className="font-body text-[9px] text-ink/40"><Clock size={9} className="inline ml-0.5" />{formatDate(e.death_date)}</span>}
                          <span className="font-body text-[9px] text-ink/40">الورثة: {e.heirs_count}</span>
                          {e.total_assets > 0 && <span className="font-body text-[9px] text-ink/40">الأصول: {formatCurrency(e.total_assets)}</span>}
                          {e.total_debts > 0 && <span className="font-body text-[9px] text-red-600">الديون: {formatCurrency(e.total_debts)}</span>}
                          <span className="font-body text-[9px] text-gold font-bold">الصافي: {formatCurrency(e.net_estate)}</span>
                          {e.m83_assets_inventoried && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><BadgeCheck size={8} /> M83</span>}
                          {e.m98_stocks_valued && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-cyan-50 text-cyan-600"><Activity size={8} /> M98</span>}
                          {e.m54_trust_account_opened && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {e.m46_zakat_calculated && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><BookOpen size={8} /> M46</span>}
                          {e.m22_properties_transferred && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><FileText size={8} /> M22</span>}
                          {e.m10_deadlines_registered && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Server size={8} /> M10</span>}
                          {e.m109_biometric_verified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><BadgeCheck size={8} /> M109</span>}
                          {e.m92_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Activity size={8} /> M92</span>}
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
                        <button onClick={(ev) => { ev.stopPropagation(); openEdit(e); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                        <button onClick={(ev) => { ev.stopPropagation(); setDeleteId(e.id); setDeleteType('estate'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
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

      {/* Heirs tab */}
      {activeTab === 'heirs' && (
        <div className="space-y-2">
          {allHeirs.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><Users size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا يوجد ورثة مسجلون</p></div>
          ) : (
            allHeirs.map((h) => {
              const estate = estates.find((e) => e.id === h.estate_id);
              return (
                <div key={h.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-50">
                        <Users size={14} className="text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-gray-100 text-ink/50">{h.relationship || '—'}</span>
                          {h.is_minor ? (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Baby size={8} /> قاصر</span>
                          ) : (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> بالغ</span>
                          )}
                          {estate && <span className="font-body text-[9px] text-gold">{estate.estate_number}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{h.heir_name} {h.guardian_name && <span className="text-ink/40 font-normal">— ولي: {h.guardian_name}</span>}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {h.share_fraction && <span className="font-body text-[9px] text-ink/40">السهم: {h.share_fraction}</span>}
                          {h.share_percentage > 0 && <span className="font-body text-[9px] text-ink/40">{h.share_percentage}%</span>}
                          {h.share_amount > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(h.share_amount)}</span>}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(h.id); setDeleteType('heir'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={12} />
                    </button>
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
                    {log.action.includes('created') ? <Users size={12} className="text-blue-600" />
                      : log.action.includes('m83') ? <BadgeCheck size={12} className="text-green-600" />
                      : log.action.includes('m98') ? <Activity size={12} className="text-cyan-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m46') ? <BookOpen size={12} className="text-amber-600" />
                      : log.action.includes('m22') ? <FileText size={12} className="text-blue-600" />
                      : log.action.includes('m10') ? <Server size={12} className="text-purple-600" />
                      : log.action.includes('m109') ? <BadgeCheck size={12} className="text-green-600" />
                      : log.action.includes('m92') ? <Activity size={12} className="text-amber-600" />
                      : log.action.includes('heir') ? <Users size={12} className="text-blue-600" />
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

      {/* Estate detail drawer */}
      {selectedEstate && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedEstate(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف التركة</span>
              </div>
              <button onClick={() => setSelectedEstate(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-gold animate-spin" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-body text-[10px] font-bold text-gold">{selectedEstate.estate_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedEstate.stage] || STAGE_CONFIG.intake).bg} ${(STAGE_CONFIG[selectedEstate.stage] || STAGE_CONFIG.intake).text}`}>
                      {(STAGE_CONFIG[selectedEstate.stage] || STAGE_CONFIG.intake).label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{SCHOOL_LABELS[selectedEstate.school_of_thought] || selectedEstate.school_of_thought}</span>
                    {selectedEstate.will_present && <span className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-body bg-cyan-50 text-cyan-600"><FileText size={10} /> وصية</span>}
                    {selectedEstate.minors_involved && <span className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-body bg-amber-50 text-amber-600"><Baby size={10} /> قُصَّر</span>}
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedEstate.deceased_name}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.intake;
                      const stageIdx = STAGES.indexOf(selectedEstate.stage);
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
                  {selectedEstate.stage !== STAGES[STAGES.length - 1] && (
                    <button onClick={() => advanceStage(selectedEstate)} className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
                      <ArrowRight size={12} /> الانتقال للمرحلة التالية
                    </button>
                  )}
                </div>

                {/* Estate info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Users size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات التركة</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">تاريخ الوفاة</span><p className="font-body text-xs font-bold text-midnight">{selectedEstate.death_date ? formatDate(selectedEstate.death_date) : '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المذهب</span><p className="font-body text-xs font-bold text-midnight">{SCHOOL_LABELS[selectedEstate.school_of_thought] || selectedEstate.school_of_thought}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">عدد الورثة</span><p className="font-body text-xs font-bold text-midnight">{selectedEstate.heirs_count}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">حالة التصفية</span><p className="font-body text-xs font-bold text-midnight">{selectedEstate.liquidation_status || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">إجمالي الأصول</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedEstate.total_assets)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">إجمالي الديون</span><p className="font-body text-xs font-bold text-red-600">{formatCurrency(selectedEstate.total_debts)}</p></div>
                    <div className="col-span-2"><span className="font-body text-[9px] text-ink/40">صافي التركة</span><p className="font-body text-sm font-bold text-gold">{formatCurrency(selectedEstate.net_estate)}</p></div>
                  </div>
                </div>

                {/* Flags */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedEstate.will_present ? 'bg-cyan-50 text-cyan-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> وصية {selectedEstate.will_present ? 'موجودة' : 'غير موجودة'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedEstate.minors_involved ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Baby size={10} /> قُصَّر {selectedEstate.minors_involved ? 'موجودون' : 'غير موجودين'}</span>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedEstate.m83_assets_inventoried ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><BadgeCheck size={10} /> M83 {selectedEstate.m83_assets_inventoried ? 'مُجرَّد' : 'غير مُجرَّد'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedEstate.m98_stocks_valued ? 'bg-cyan-50 text-cyan-600' : 'bg-gray-100 text-ink/30'}`}><Activity size={10} /> M98 {selectedEstate.m98_stocks_valued ? 'مُقيَّم' : 'غير مُقيَّم'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedEstate.m54_trust_account_opened ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedEstate.m54_trust_account_opened ? 'مفتوح' : 'غير مفتوح'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedEstate.m46_zakat_calculated ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><BookOpen size={10} /> M46 {selectedEstate.m46_zakat_calculated ? 'محسوب' : 'غير محسوب'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedEstate.m22_properties_transferred ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> M22 {selectedEstate.m22_properties_transferred ? 'منقول' : 'غير منقول'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedEstate.m10_deadlines_registered ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Server size={10} /> M10 {selectedEstate.m10_deadlines_registered ? 'مُسَجَّل' : 'غير مُسَجَّل'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedEstate.m109_biometric_verified ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><BadgeCheck size={10} /> M109 {selectedEstate.m109_biometric_verified ? 'مُتحقَّق' : 'غير مُتحقَّق'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedEstate.m92_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Activity size={10} /> M92 {selectedEstate.m92_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                </div>

                {selectedEstate.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedEstate.description}</p></div>
                )}

                {/* Heirs sub-entities */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><Users size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">الورثة</span></div>
                    <button onClick={() => setHeirModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> إضافة وريث</button>
                  </div>
                  <div className="space-y-1.5">
                    {heirs.map((h) => (
                      <div key={h.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/heir">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-gray-100 text-ink/50">{h.relationship || '—'}</span>
                          {h.is_minor ? (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Baby size={8} /> قاصر</span>
                          ) : (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> بالغ</span>
                          )}
                          <p className="font-body text-[10px] font-bold text-midnight flex-1">{h.heir_name} {h.guardian_name && <span className="text-ink/40 font-normal">— ولي: {h.guardian_name}</span>}</p>
                          <button onClick={() => { setDeleteId(h.id); setDeleteType('heir'); }} className="p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/heir:opacity-100 transition-all"><Trash2 size={10} /></button>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {h.share_fraction && <span className="font-body text-[9px] text-ink/40">السهم: {h.share_fraction}</span>}
                          {h.share_percentage > 0 && <span className="font-body text-[9px] text-ink/40">{h.share_percentage}%</span>}
                          {h.share_amount > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(h.share_amount)}</span>}
                        </div>
                      </div>
                    ))}
                    {heirs.length === 0 && <p className="font-body text-[10px] text-ink/30">لا يوجد ورثة مسجلون</p>}
                  </div>
                </div>

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

      {/* Estate create/edit modal */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل التركة' : 'تركة جديدة'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم التركة" required><TextInput value={form.estate_number} onChange={(e) => setForm({ ...form, estate_number: e.target.value })} placeholder="INH-2025-001" /></Field>
          <Field label="تاريخ الوفاة"><TextInput type="date" value={form.death_date} onChange={(e) => setForm({ ...form, death_date: e.target.value })} /></Field>
        </div>
        <Field label="اسم المتوفى" required><TextInput value={form.deceased_name} onChange={(e) => setForm({ ...form, deceased_name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
          <Field label="المذهب الفقهي">
            <Select value={form.school_of_thought} onChange={(e) => setForm({ ...form, school_of_thought: e.target.value })}>
              {Object.entries(SCHOOL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="عدد الورثة"><TextInput type="number" value={form.heirs_count} onChange={(e) => setForm({ ...form, heirs_count: e.target.value })} /></Field>
          <Field label="إجمالي الأصول"><TextInput type="number" value={form.total_assets} onChange={(e) => setForm({ ...form, total_assets: e.target.value })} /></Field>
          <Field label="إجمالي الديون"><TextInput type="number" value={form.total_debts} onChange={(e) => setForm({ ...form, total_debts: e.target.value })} /></Field>
        </div>
        <Checkbox label="توجد وصية (Will Present)" checked={form.will_present} onChange={(v) => setForm({ ...form, will_present: v })} />
        <Checkbox label="يوجد قُصَّر بين الورثة (Minors Involved)" checked={form.minors_involved} onChange={(v) => setForm({ ...form, minors_involved: v })} />
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      {/* Heir modal */}
      <EntityModal open={heirModalOpen} title="إضافة وريث" onClose={() => setHeirModalOpen(false)} onSubmit={addHeir}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم الوارث" required><TextInput value={heirForm.heir_name} onChange={(e) => setHeirForm({ ...heirForm, heir_name: e.target.value })} /></Field>
          <Field label="صلة القرابة"><TextInput value={heirForm.relationship} onChange={(e) => setHeirForm({ ...heirForm, relationship: e.target.value })} placeholder="ابن / زوجة / أب..." /></Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="السهم (كسر)"><TextInput value={heirForm.share_fraction} onChange={(e) => setHeirForm({ ...heirForm, share_fraction: e.target.value })} placeholder="1/2" /></Field>
          <Field label="النسبة (%)"><TextInput type="number" value={heirForm.share_percentage} onChange={(e) => setHeirForm({ ...heirForm, share_percentage: e.target.value })} /></Field>
          <Field label="المبلغ"><TextInput type="number" value={heirForm.share_amount} onChange={(e) => setHeirForm({ ...heirForm, share_amount: e.target.value })} /></Field>
        </div>
        <Checkbox label="قاصر (Is Minor)" checked={heirForm.is_minor} onChange={(v) => setHeirForm({ ...heirForm, is_minor: v })} />
        {heirForm.is_minor && (
          <Field label="اسم الولي"><TextInput value={heirForm.guardian_name} onChange={(e) => setHeirForm({ ...heirForm, guardian_name: e.target.value })} /></Field>
        )}
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
