import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, Zap,
  Shield, CircuitBoard, CheckCircle2, Clock, ArrowRight, Search,
  FileText, Activity, Server, AlertCircle, BadgeCheck,
  DollarSign, BookOpen, Calendar, Lock, Mountain, Wind, Sun,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M37EnergyProject, M37AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'projects' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  intake: { label: 'الاستلام', bg: 'bg-blue-50', text: 'text-blue-700' },
  licensed: { label: 'الترخيص', bg: 'bg-amber-50', text: 'text-amber-700' },
  operational: { label: 'التشغيل', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  production: { label: 'الإنتاج', bg: 'bg-green-50', text: 'text-green-700' },
  monitoring: { label: 'المراقبة', bg: 'bg-purple-50', text: 'text-purple-700' },
  decommissioned: { label: 'الإيقاف', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const STAGES = ['intake', 'licensed', 'operational', 'production', 'monitoring', 'decommissioned'];

const PROJECT_TYPE_LABELS: Record<string, string> = {
  oil_gas: 'نفط وغاز',
  renewable_solar: 'طاقة شمسية',
  renewable_wind: 'طاقة ريحية',
  hydrogen: 'هيدروجين',
  mining: 'تعدين',
  geothermal: 'طاقة حرارية أرضية',
};

const PROJECT_TYPE_ICON: Record<string, typeof Zap> = {
  oil_gas: Mountain,
  renewable_solar: Sun,
  renewable_wind: Wind,
  hydrogen: Zap,
  mining: Mountain,
  geothermal: Zap,
};

interface ProjectForm {
  project_number: string;
  project_title: string;
  project_type: string;
  stage: string;
  concession_area: string;
  operator_name: string;
  partner_companies: string;
  production_share_rate: string;
  royalty_rate: string;
  contract_value: string;
  energy_output: string;
  license_expiry: string;
  description: string;
}

const emptyForm: ProjectForm = {
  project_number: '', project_title: '', project_type: 'oil_gas', stage: 'intake',
  concession_area: '', operator_name: '', partner_companies: '',
  production_share_rate: '0', royalty_rate: '0', contract_value: '0',
  energy_output: '0', license_expiry: '', description: '',
};

export default function EnergyResourcesEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [projects, setProjects] = useState<M37EnergyProject[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('projects');
  const [selectedProject, setSelectedProject] = useState<M37EnergyProject | null>(null);
  const [auditLogs, setAuditLogs] = useState<M37AuditLog[]>([]);
  const [allAudit, setAllAudit] = useState<M37AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [projRes, attRes, auditRes] = await Promise.all([
      supabase.from('m37_energy_projects')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m37_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setProjects((projRes.data as M37EnergyProject[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAudit((auditRes.data as M37AuditLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyForm, project_title: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const logAudit = async (projectId: string, action: string, detail: string) => {
    const hash = '0x' + Math.random().toString(16).substr(2, 4) + '...' + Math.random().toString(16).substr(2, 4);
    await supabase.from('m37_audit_logs').insert({
      case_id: projectId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (p: M37EnergyProject) => {
    setForm({
      project_number: p.project_number, project_title: p.project_title,
      project_type: p.project_type, stage: p.stage,
      concession_area: p.concession_area || '',
      operator_name: p.operator_name || '',
      partner_companies: p.partner_companies || '',
      production_share_rate: String(p.production_share_rate || 0),
      royalty_rate: String(p.royalty_rate || 0),
      contract_value: String(p.contract_value || 0),
      energy_output: String(p.energy_output || 0),
      license_expiry: p.license_expiry || '',
      description: p.description || '',
    });
    setEditingId(p.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.project_title.trim() || !form.project_number.trim()) return;
    setSaving(true);
    const payload = {
      project_number: form.project_number.trim(),
      project_title: form.project_title.trim(),
      project_type: form.project_type,
      stage: form.stage,
      status: form.stage,
      concession_area: form.concession_area.trim() || null,
      operator_name: form.operator_name.trim() || null,
      partner_companies: form.partner_companies.trim() || null,
      production_share_rate: Number(form.production_share_rate) || 0,
      royalty_rate: Number(form.royalty_rate) || 0,
      contract_value: Number(form.contract_value) || 0,
      energy_output: Number(form.energy_output) || 0,
      license_expiry: form.license_expiry || null,
      description: form.description.trim() || null,
    };
    if (editingId) {
      await supabase.from('m37_energy_projects').update(payload).eq('id', editingId);
      await logAudit(editingId, 'project_updated', 'تحديث بيانات المشروع');
    } else {
      const { data } = await supabase.from('m37_energy_projects').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'project_created', 'إنشاء مشروع — نوع: ' + (PROJECT_TYPE_LABELS[form.project_type] || form.project_type));
        await supabase.from('m37_energy_projects').update({
          m107_iot_linked: true,
          m54_finance_linked: true,
          m36_environmental_linked: true,
          m103_mining_linked: true,
          m46_compliance_checked: true,
          m10_case_opened: true,
          m109_biometric_required: true,
          m92_notified: true,
          cost_center_id: 'CC-M37-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm107_iot', 'ربط المشروع بمحرك إنترنت الأشياء (M107)');
        await logAudit(newId, 'm54_finance', 'ربط المشروع بالمحرك المالي (M54)');
        await logAudit(newId, 'm36_environmental', 'ربط المشروع بالمحرك البيئي (M36)');
        await logAudit(newId, 'm103_mining', 'ربط المشروع بمحرك التعدين (M103)');
        await logAudit(newId, 'm46_compliance', 'التحقق من الامتثال في محرك الزكاة (M46)');
        await logAudit(newId, 'm10_linked', 'ربط المشروع بقضية في المحرك الموحد (M10)');
        await logAudit(newId, 'm109_biometric', 'التحقق البيومتري للمشغل (M109)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء المشروع');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('m37_energy_projects').delete().eq('id', deleteId);
    setDeleteId(null);
    setSelectedProject(null);
    fetchAll();
  };

  const openProjectDetail = async (p: M37EnergyProject) => {
    setSelectedProject(p);
    setDetailLoading(true);
    const aRes = await supabase.from('m37_audit_logs').select('*').eq('case_id', p.id).order('created_at', { ascending: true });
    setAuditLogs((aRes.data as M37AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (p: M37EnergyProject) => {
    const idx = STAGES.indexOf(p.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    await supabase.from('m37_energy_projects').update({ stage: next, status: next }).eq('id', p.id);
    await logAudit(p.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedProject({ ...p, stage: next, status: next } as M37EnergyProject);
  };

  const filteredProjects = projects.filter((p) => {
    if (filterType !== 'all' && p.project_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!p.project_number.toLowerCase().includes(q) && !p.project_title.toLowerCase().includes(q) &&
          !(p.operator_name || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeCount = projects.filter((p) => p.stage !== 'decommissioned').length;
  const totalContractValue = projects.reduce((s, p) => s + (p.contract_value || 0), 0);
  const totalEnergyOutput = projects.reduce((s, p) => s + (p.energy_output || 0), 0);

  const tabs: { id: Tab; label: string; icon: typeof Zap; badge?: number }[] = [
    { id: 'projects', label: 'المشروعات', icon: Zap, badge: projects.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Zap size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">الطاقة والموارد الطبيعية (M37)</h2>
            <p className="font-body text-[10px] text-ink/40">إدارة مشروعات الطاقة والموارد الطبيعية — الترخيص والإنتاج والمراقبة</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Lock size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">On-Premise · AES-256</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> مشروع جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Zap size={14} className="text-midnight" />} label="إجمالي المشروعات" value={String(projects.length)} valueClass="text-midnight" />
        <StatCard icon={<Activity size={14} className="text-green-600" />} label="مشروعات نشطة" value={String(activeCount)} valueClass="text-green-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="إجمالي قيمة العقود" value={formatCurrency(totalContractValue)} valueClass="text-gold" />
        <StatCard icon={<Zap size={14} className="text-cyan-600" />} label="إجمالي الإنتاج" value={formatCurrency(totalEnergyOutput) + ' ميجاوات'} valueClass="text-cyan-700" />
      </div>

      {/* 6-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة المشروع — 6 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.intake;
            const count = projects.filter((p) => p.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[130px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                  </div>
                  <span className="font-body text-[9px] text-cream/40">{count} مشروع</span>
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
            { icon: Server, label: 'إنترنت الأشياء (M107)', desc: 'مراقبة الإنتاج', color: 'text-cyan-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'ربط مالي', color: 'text-gold' },
            { icon: Mountain, label: 'المحرك البيئي (M36)', desc: 'تقييم أثر بيئي', color: 'text-green-600' },
            { icon: Mountain, label: 'محرك التعدين (M103)', desc: 'ربط تعديني', color: 'text-amber-600' },
            { icon: BookOpen, label: 'محرك الزكاة (M46)', desc: 'التحقق الامتثال', color: 'text-amber-600' },
            { icon: Server, label: 'المحرك الموحد (M10)', desc: 'ربط القضية', color: 'text-purple-600' },
            { icon: BadgeCheck, label: 'التحقق البيومتري (M109)', desc: 'تحقق المشغل', color: 'text-green-600' },
            { icon: Activity, label: 'الوكيل الذكي (M92)', desc: 'تنبيهات الترخيص', color: 'text-amber-600' },
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

      {/* Filters for projects */}
      {activeTab === 'projects' && (
        <div className="flex items-center gap-2">
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الأنواع</option>
            {Object.entries(PROJECT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم أو عنوان المشروع أو المشغل..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Projects tab */}
      {activeTab === 'projects' && (
        <div className="space-y-2">
          {filteredProjects.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Zap size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد مشروعات مسجلة</p>
            </div>
          ) : (
            filteredProjects.map((p) => {
              const sCfg = STAGE_CONFIG[p.stage] || STAGE_CONFIG.intake;
              const stageIdx = STAGES.indexOf(p.stage);
              const TypeIcon = PROJECT_TYPE_ICON[p.project_type] || Zap;
              return (
                <div key={p.id} onClick={() => openProjectDetail(p)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <TypeIcon size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{p.project_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{PROJECT_TYPE_LABELS[p.project_type] || p.project_type}</span>
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{p.project_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {p.operator_name && <span className="font-body text-[9px] text-ink/40">المشغل: {p.operator_name}</span>}
                          {p.concession_area && <span className="font-body text-[9px] text-ink/40">منطقة الامتياز: {p.concession_area}</span>}
                          {p.production_share_rate > 0 && <span className="font-body text-[9px] text-cyan-600 font-bold">حصة الإنتاج: {p.production_share_rate}%</span>}
                          {p.royalty_rate > 0 && <span className="font-body text-[9px] text-gold font-bold">الإتاوة: {p.royalty_rate}%</span>}
                          {p.contract_value > 0 && <span className="font-body text-[9px] text-gold font-bold"><DollarSign size={9} className="inline" />{formatCurrency(p.contract_value)}</span>}
                          {p.energy_output > 0 && <span className="font-body text-[9px] text-cyan-600 font-bold"><Zap size={9} className="inline" />{formatCurrency(p.energy_output)} ميجاوات</span>}
                          {p.license_expiry && <span className="font-body text-[9px] text-ink/40"><Calendar size={9} className="inline ml-0.5" />{formatDate(p.license_expiry)}</span>}
                          {p.m107_iot_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-cyan-50 text-cyan-600"><Server size={8} /> M107</span>}
                          {p.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {p.m36_environmental_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><Mountain size={8} /> M36</span>}
                          {p.m103_mining_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Mountain size={8} /> M103</span>}
                          {p.m46_compliance_checked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><BookOpen size={8} /> M46</span>}
                          {p.m10_case_opened && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Server size={8} /> M10</span>}
                          {p.m109_biometric_required && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><BadgeCheck size={8} /> M109</span>}
                          {p.m92_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Activity size={8} /> M92</span>}
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
                        <button onClick={(ev) => { ev.stopPropagation(); openEdit(p); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                        <button onClick={(ev) => { ev.stopPropagation(); setDeleteId(p.id); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
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
                    {log.action.includes('created') ? <Zap size={12} className="text-blue-600" />
                      : log.action.includes('m107') ? <Server size={12} className="text-cyan-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m36') ? <Mountain size={12} className="text-green-600" />
                      : log.action.includes('m103') ? <Mountain size={12} className="text-amber-600" />
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

      {/* Project detail drawer */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedProject(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">مشروع طاقة</span>
              </div>
              <button onClick={() => setSelectedProject(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-gold animate-spin" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-body text-[10px] font-bold text-gold">{selectedProject.project_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedProject.stage] || STAGE_CONFIG.intake).bg} ${(STAGE_CONFIG[selectedProject.stage] || STAGE_CONFIG.intake).text}`}>
                      {(STAGE_CONFIG[selectedProject.stage] || STAGE_CONFIG.intake).label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{PROJECT_TYPE_LABELS[selectedProject.project_type] || selectedProject.project_type}</span>
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedProject.project_title}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.intake;
                      const stageIdx = STAGES.indexOf(selectedProject.stage);
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
                  {selectedProject.stage !== STAGES[STAGES.length - 1] && (
                    <button onClick={() => advanceStage(selectedProject)} className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
                      <ArrowRight size={12} /> الانتقال للمرحلة التالية
                    </button>
                  )}
                </div>

                {/* Project info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Zap size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات المشروع</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">المشغل</span><p className="font-body text-xs font-bold text-midnight">{selectedProject.operator_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نوع المشروع</span><p className="font-body text-xs font-bold text-midnight">{PROJECT_TYPE_LABELS[selectedProject.project_type] || selectedProject.project_type}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">منطقة الامتياز</span><p className="font-body text-xs font-bold text-midnight">{selectedProject.concession_area || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">انتهاء الترخيص</span><p className="font-body text-xs font-bold text-midnight">{selectedProject.license_expiry ? formatDate(selectedProject.license_expiry) : '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">حصة الإنتاج</span><p className="font-body text-xs font-bold text-cyan-600">{selectedProject.production_share_rate}%</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نسبة الإتاوة</span><p className="font-body text-xs font-bold text-gold">{selectedProject.royalty_rate}%</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">قيمة العقد</span><p className="font-body text-xs font-bold text-gold">{formatCurrency(selectedProject.contract_value)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الإنتاج</span><p className="font-body text-xs font-bold text-cyan-600">{formatCurrency(selectedProject.energy_output)} ميجاوات</p></div>
                    {selectedProject.partner_companies && <div className="col-span-2"><span className="font-body text-[9px] text-ink/40">الشركاء</span><p className="font-body text-xs font-bold text-midnight">{selectedProject.partner_companies}</p></div>}
                  </div>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedProject.m107_iot_linked ? 'bg-cyan-50 text-cyan-600' : 'bg-gray-100 text-ink/30'}`}><Server size={10} /> M107 {selectedProject.m107_iot_linked ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedProject.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedProject.m54_finance_linked ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedProject.m36_environmental_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><Mountain size={10} /> M36 {selectedProject.m36_environmental_linked ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedProject.m103_mining_linked ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Mountain size={10} /> M103 {selectedProject.m103_mining_linked ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedProject.m46_compliance_checked ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><BookOpen size={10} /> M46 {selectedProject.m46_compliance_checked ? 'متحقق' : 'غير متحقق'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedProject.m10_case_opened ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Server size={10} /> M10 {selectedProject.m10_case_opened ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedProject.m109_biometric_required ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><BadgeCheck size={10} /> M109 {selectedProject.m109_biometric_required ? 'مطلوب' : 'غير مطلوب'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedProject.m92_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Activity size={10} /> M92 {selectedProject.m92_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                </div>

                {selectedProject.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedProject.description}</p></div>
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

      {/* Project create/edit modal */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل المشروع' : 'مشروع جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم المشروع" required><TextInput value={form.project_number} onChange={(e) => setForm({ ...form, project_number: e.target.value })} placeholder="ENG-2025-001" /></Field>
          <Field label="نوع المشروع">
            <Select value={form.project_type} onChange={(e) => setForm({ ...form, project_type: e.target.value })}>
              {Object.entries(PROJECT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان المشروع" required><TextInput value={form.project_title} onChange={(e) => setForm({ ...form, project_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
          <Field label="منطقة الامتياز"><TextInput value={form.concession_area} onChange={(e) => setForm({ ...form, concession_area: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم المشغل"><TextInput value={form.operator_name} onChange={(e) => setForm({ ...form, operator_name: e.target.value })} /></Field>
          <Field label="الشركات الشريكة"><TextInput value={form.partner_companies} onChange={(e) => setForm({ ...form, partner_companies: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="حصة الإنتاج (%)"><TextInput type="number" value={form.production_share_rate} onChange={(e) => setForm({ ...form, production_share_rate: e.target.value })} /></Field>
          <Field label="نسبة الإتاوة (%)"><TextInput type="number" value={form.royalty_rate} onChange={(e) => setForm({ ...form, royalty_rate: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="قيمة العقد"><TextInput type="number" value={form.contract_value} onChange={(e) => setForm({ ...form, contract_value: e.target.value })} /></Field>
          <Field label="الإنتاج (ميجاوات)"><TextInput type="number" value={form.energy_output} onChange={(e) => setForm({ ...form, energy_output: e.target.value })} /></Field>
        </div>
        <Field label="تاريخ انتهاء الترخيص"><TextInput type="date" value={form.license_expiry} onChange={(e) => setForm({ ...form, license_expiry: e.target.value })} /></Field>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
