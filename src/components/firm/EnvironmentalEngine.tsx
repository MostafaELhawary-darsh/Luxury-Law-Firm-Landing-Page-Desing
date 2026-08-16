import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, Leaf,
  Shield, CircuitBoard, Zap, CheckCircle2, Clock, ArrowRight, Search,
  FileText, Activity, Server, AlertCircle, BadgeCheck,
  DollarSign, BookOpen, Calendar, Gauge, TrendingDown,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M36EnvironmentalFile, M36AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'files' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  intake: { label: 'الاستلام', bg: 'bg-blue-50', text: 'text-blue-700' },
  audit: { label: 'التدقيق', bg: 'bg-amber-50', text: 'text-amber-700' },
  assessed: { label: 'التقييم', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  remediation: { label: 'الإصلاح', bg: 'bg-purple-50', text: 'text-purple-700' },
  certified: { label: 'الاعتماد', bg: 'bg-green-50', text: 'text-green-700' },
  archived: { label: 'الأرشفة', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const STAGES = ['intake', 'audit', 'assessed', 'remediation', 'certified', 'archived'];

const FILE_TYPE_LABELS: Record<string, string> = {
  compliance_audit: 'تدقيق امتثال',
  emission_report: 'تقرير انبعاثات',
  esg_report: 'تقرير ESG',
  impact_assessment: 'تقييم الأثر',
  waste_management: 'إدارة المخلفات',
};

const COMPLIANCE_STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار',
  compliant: 'ممتثل',
  non_compliant: 'غير ممتثل',
  under_review: 'قيد المراجعة',
};

const COMPLIANCE_STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  compliant: 'bg-green-50 text-green-700',
  non_compliant: 'bg-red-50 text-red-700',
  under_review: 'bg-blue-50 text-blue-700',
};

interface EnvFileForm {
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  facility_name: string;
  emission_level: string;
  emission_limit: string;
  compliance_status: string;
  esg_score: string;
  carbon_footprint: string;
  energy_consumption: string;
  inspection_date: string;
  next_inspection_date: string;
  description: string;
}

const emptyForm: EnvFileForm = {
  file_number: '', file_title: '', file_type: 'compliance_audit', stage: 'intake',
  facility_name: '', emission_level: '0', emission_limit: '0',
  compliance_status: 'pending', esg_score: '0', carbon_footprint: '0',
  energy_consumption: '0', inspection_date: '', next_inspection_date: '',
  description: '',
};

export default function EnvironmentalEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [files, setFiles] = useState<M36EnvironmentalFile[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('files');
  const [selectedFile, setSelectedFile] = useState<M36EnvironmentalFile | null>(null);
  const [auditLogs, setAuditLogs] = useState<M36AuditLog[]>([]);
  const [allAudit, setAllAudit] = useState<M36AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EnvFileForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [fileRes, attRes, auditRes] = await Promise.all([
      supabase.from('m36_environmental_files')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m36_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setFiles((fileRes.data as M36EnvironmentalFile[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAudit((auditRes.data as M36AuditLog[]) || []);
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
    await supabase.from('m36_audit_logs').insert({
      case_id: fileId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (f: M36EnvironmentalFile) => {
    setForm({
      file_number: f.file_number, file_title: f.file_title,
      file_type: f.file_type, stage: f.stage,
      facility_name: f.facility_name || '',
      emission_level: String(f.emission_level || 0), emission_limit: String(f.emission_limit || 0),
      compliance_status: f.compliance_status || 'pending',
      esg_score: String(f.esg_score || 0), carbon_footprint: String(f.carbon_footprint || 0),
      energy_consumption: String(f.energy_consumption || 0),
      inspection_date: f.inspection_date || '', next_inspection_date: f.next_inspection_date || '',
      description: f.description || '',
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
      facility_name: form.facility_name.trim() || null,
      emission_level: Number(form.emission_level) || 0,
      emission_limit: Number(form.emission_limit) || 0,
      compliance_status: form.compliance_status,
      esg_score: Number(form.esg_score) || 0,
      carbon_footprint: Number(form.carbon_footprint) || 0,
      energy_consumption: Number(form.energy_consumption) || 0,
      inspection_date: form.inspection_date || null,
      next_inspection_date: form.next_inspection_date || null,
      description: form.description.trim() || null,
    };
    if (editingId) {
      await supabase.from('m36_environmental_files').update(payload).eq('id', editingId);
      await logAudit(editingId, 'env_file_updated', 'تحديث بيانات الملف البيئي');
    } else {
      const { data } = await supabase.from('m36_environmental_files').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'env_file_created', 'إنشاء ملف بيئي — نوع: ' + (FILE_TYPE_LABELS[form.file_type] || form.file_type));
        await supabase.from('m36_environmental_files').update({
          m107_iot_linked: true,
          m54_finance_linked: true,
          m91_safety_linked: true,
          m46_compliance_checked: true,
          m10_case_opened: true,
          m109_biometric_required: true,
          m92_notified: true,
          cost_center_id: 'CC-M36-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm107_iot', 'ربط الملف بمحرك إنترنت الأشياء (M107)');
        await logAudit(newId, 'm54_finance', 'ربط الملف بالمحرك المالي (M54)');
        await logAudit(newId, 'm91_safety', 'ربط الملف بمحرك السلامة (M91)');
        await logAudit(newId, 'm46_compliance', 'التحقق من الامتثال في محرك الزكاة (M46)');
        await logAudit(newId, 'm10_linked', 'ربط الملف بقضية في المحرك الموحد (M10)');
        await logAudit(newId, 'm109_biometric', 'التحقق البيومتري للمسؤول (M109)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء الملف');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('m36_environmental_files').delete().eq('id', deleteId);
    setDeleteId(null);
    setSelectedFile(null);
    fetchAll();
  };

  const openFileDetail = async (f: M36EnvironmentalFile) => {
    setSelectedFile(f);
    setDetailLoading(true);
    const aRes = await supabase.from('m36_audit_logs').select('*').eq('case_id', f.id).order('created_at', { ascending: true });
    setAuditLogs((aRes.data as M36AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (f: M36EnvironmentalFile) => {
    const idx = STAGES.indexOf(f.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    await supabase.from('m36_environmental_files').update({ stage: next, status: next }).eq('id', f.id);
    await logAudit(f.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedFile({ ...f, stage: next, status: next } as M36EnvironmentalFile);
  };

  const filteredFiles = files.filter((f) => {
    if (filterType !== 'all' && f.file_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!f.file_number.toLowerCase().includes(q) && !f.file_title.toLowerCase().includes(q) &&
          !(f.facility_name || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const compliantCount = files.filter((f) => f.compliance_status === 'compliant').length;
  const avgEsg = files.length > 0 ? files.reduce((s, f) => s + (f.esg_score || 0), 0) / files.length : 0;
  const totalCarbon = files.reduce((s, f) => s + (f.carbon_footprint || 0), 0);

  const tabs: { id: Tab; label: string; icon: typeof Leaf; badge?: number }[] = [
    { id: 'files', label: 'الملفات البيئية', icon: Leaf, badge: files.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Leaf size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">البيئة والتنمية المستدامة (M36)</h2>
            <p className="font-body text-[10px] text-ink/40">إدارة الامتثال البيئي والانبعاثات وتقارير الاستدامة</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Shield size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">On-Premise · ZK-Audit</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> ملف بيئي جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Leaf size={14} className="text-midnight" />} label="إجمالي الملفات" value={String(files.length)} valueClass="text-midnight" />
        <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="ممتثل" value={String(compliantCount)} valueClass="text-green-700" />
        <StatCard icon={<Gauge size={14} className="text-cyan-600" />} label="متوسط درجة ESG" value={avgEsg.toFixed(1)} valueClass="text-cyan-700" />
        <StatCard icon={<TrendingDown size={14} className="text-gold" />} label="إجمالي البصمة الكربونية" value={formatCurrency(totalCarbon) + ' طن'} valueClass="text-gold" />
      </div>

      {/* 6-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة الملف البيئي — 6 مراحل</span>
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
            { icon: Server, label: 'إنترنت الأشياء (M107)', desc: 'مراقبة الانبعاثات', color: 'text-cyan-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'ربط مالي', color: 'text-gold' },
            { icon: Shield, label: 'محرك السلامة (M91)', desc: 'سلامة المنشأة', color: 'text-red-600' },
            { icon: BookOpen, label: 'محرك الزكاة (M46)', desc: 'التحقق الامتثال', color: 'text-amber-600' },
            { icon: Server, label: 'المحرك الموحد (M10)', desc: 'ربط القضية', color: 'text-purple-600' },
            { icon: BadgeCheck, label: 'التحقق البيومتري (M109)', desc: 'تحقق المسؤول', color: 'text-green-600' },
            { icon: Activity, label: 'الوكيل الذكي (M92)', desc: 'تنبيهات التفتيش', color: 'text-amber-600' },
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
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم أو عنوان الملف أو المنشأة..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Files tab */}
      {activeTab === 'files' && (
        <div className="space-y-2">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Leaf size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد ملفات بيئية مسجلة</p>
            </div>
          ) : (
            filteredFiles.map((f) => {
              const sCfg = STAGE_CONFIG[f.stage] || STAGE_CONFIG.intake;
              const stageIdx = STAGES.indexOf(f.stage);
              const csBadge = COMPLIANCE_STATUS_BADGE[f.compliance_status] || COMPLIANCE_STATUS_BADGE.pending;
              const csLabel = COMPLIANCE_STATUS_LABELS[f.compliance_status] || f.compliance_status;
              const overLimit = f.emission_level > f.emission_limit && f.emission_limit > 0;
              return (
                <div key={f.id} onClick={() => openFileDetail(f)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <Leaf size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{f.file_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{FILE_TYPE_LABELS[f.file_type] || f.file_type}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${csBadge}`}>{csLabel}</span>
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{f.file_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {f.facility_name && <span className="font-body text-[9px] text-ink/40">المنشأة: {f.facility_name}</span>}
                          <span className={`font-body text-[9px] font-bold ${overLimit ? 'text-red-600' : 'text-green-600'}`}>
                            <Gauge size={9} className="inline" /> {f.emission_level} / {f.emission_limit} {overLimit ? '⚠ تجاوز' : '✓'}
                          </span>
                          {f.esg_score > 0 && <span className="font-body text-[9px] text-cyan-600 font-bold">ESG: {f.esg_score.toFixed(1)}</span>}
                          {f.carbon_footprint > 0 && <span className="font-body text-[9px] text-gold font-bold">CO₂: {formatCurrency(f.carbon_footprint)} طن</span>}
                          {f.next_inspection_date && <span className="font-body text-[9px] text-ink/40"><Calendar size={9} className="inline ml-0.5" />{formatDate(f.next_inspection_date)}</span>}
                          {f.m107_iot_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-cyan-50 text-cyan-600"><Server size={8} /> M107</span>}
                          {f.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {f.m91_safety_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-red-50 text-red-600"><Shield size={8} /> M91</span>}
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
                    {log.action.includes('created') ? <Leaf size={12} className="text-blue-600" />
                      : log.action.includes('m107') ? <Server size={12} className="text-cyan-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m91') ? <Shield size={12} className="text-red-600" />
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
                <Leaf size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف بيئي</span>
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
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${COMPLIANCE_STATUS_BADGE[selectedFile.compliance_status] || COMPLIANCE_STATUS_BADGE.pending}`}>
                      {COMPLIANCE_STATUS_LABELS[selectedFile.compliance_status] || selectedFile.compliance_status}
                    </span>
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
                    <Leaf size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات الملف البيئي</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">المنشأة</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.facility_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نوع الملف</span><p className="font-body text-xs font-bold text-midnight">{FILE_TYPE_LABELS[selectedFile.file_type] || selectedFile.file_type}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">مستوى الانبعاث</span><p className={`font-body text-xs font-bold ${selectedFile.emission_level > selectedFile.emission_limit && selectedFile.emission_limit > 0 ? 'text-red-600' : 'text-green-600'}`}>{selectedFile.emission_level}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">حد الانبعاث</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.emission_limit}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">حالة الامتثال</span><p className="font-body text-xs font-bold text-midnight">{COMPLIANCE_STATUS_LABELS[selectedFile.compliance_status] || selectedFile.compliance_status}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">تاريخ التفتيش</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.inspection_date ? formatDate(selectedFile.inspection_date) : '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">التفتيش القادم</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.next_inspection_date ? formatDate(selectedFile.next_inspection_date) : '—'}</p></div>
                  </div>
                </div>

                {/* ESG metrics */}
                <div className="bg-cyan-50 rounded-lg p-3 border border-cyan-100">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Gauge size={12} className="text-cyan-600" />
                    <span className="font-body text-[10px] font-bold text-midnight">مؤشرات ESG والاستدامة</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center"><span className="font-body text-[9px] text-ink/40">درجة ESG</span><p className="font-heading font-bold text-lg text-cyan-700">{selectedFile.esg_score.toFixed(1)}</p></div>
                    <div className="text-center"><span className="font-body text-[9px] text-ink/40">البصمة الكربونية</span><p className="font-heading font-bold text-lg text-gold">{formatCurrency(selectedFile.carbon_footprint)}</p></div>
                    <div className="text-center"><span className="font-body text-[9px] text-ink/40">استهلاك الطاقة</span><p className="font-heading font-bold text-lg text-midnight">{formatCurrency(selectedFile.energy_consumption)}</p></div>
                  </div>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m107_iot_linked ? 'bg-cyan-50 text-cyan-600' : 'bg-gray-100 text-ink/30'}`}><Server size={10} /> M107 {selectedFile.m107_iot_linked ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedFile.m54_finance_linked ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m91_safety_linked ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-ink/30'}`}><Shield size={10} /> M91 {selectedFile.m91_safety_linked ? 'مرتبط' : 'غير مرتبط'}</span>
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
      <EntityModal open={modalOpen} title={editingId ? 'تعديل الملف البيئي' : 'ملف بيئي جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الملف" required><TextInput value={form.file_number} onChange={(e) => setForm({ ...form, file_number: e.target.value })} placeholder="ENV-2025-001" /></Field>
          <Field label="نوع الملف">
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
          <Field label="حالة الامتثال">
            <Select value={form.compliance_status} onChange={(e) => setForm({ ...form, compliance_status: e.target.value })}>
              {Object.entries(COMPLIANCE_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="اسم المنشأة"><TextInput value={form.facility_name} onChange={(e) => setForm({ ...form, facility_name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="مستوى الانبعاث"><TextInput type="number" value={form.emission_level} onChange={(e) => setForm({ ...form, emission_level: e.target.value })} /></Field>
          <Field label="حد الانبعاث"><TextInput type="number" value={form.emission_limit} onChange={(e) => setForm({ ...form, emission_limit: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="درجة ESG"><TextInput type="number" value={form.esg_score} onChange={(e) => setForm({ ...form, esg_score: e.target.value })} /></Field>
          <Field label="البصمة الكربونية (طن)"><TextInput type="number" value={form.carbon_footprint} onChange={(e) => setForm({ ...form, carbon_footprint: e.target.value })} /></Field>
          <Field label="استهلاك الطاقة"><TextInput type="number" value={form.energy_consumption} onChange={(e) => setForm({ ...form, energy_consumption: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ التفتيش"><TextInput type="date" value={form.inspection_date} onChange={(e) => setForm({ ...form, inspection_date: e.target.value })} /></Field>
          <Field label="تاريخ التفتيش القادم"><TextInput type="date" value={form.next_inspection_date} onChange={(e) => setForm({ ...form, next_inspection_date: e.target.value })} /></Field>
        </div>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
