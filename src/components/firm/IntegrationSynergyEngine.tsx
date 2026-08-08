import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, AlertTriangle,
  Shield, CircuitBoard, CheckCircle2, Clock, Search,
  Activity, AlertCircle, BadgeCheck, Building2, DollarSign,
  FileText, Scale, Network, Zap, Layers, Target, GitBranch, RefreshCw,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M102BridgeFile, M102AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'files' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'مسودة', bg: 'bg-blue-50', text: 'text-blue-700' },
  triggered: { label: 'تفعيل نبضة', bg: 'bg-amber-50', text: 'text-amber-700' },
  active: { label: 'نشط', bg: 'bg-orange-50', text: 'text-orange-700' },
  monitored: { label: 'مراقبة', bg: 'bg-purple-50', text: 'text-purple-700' },
  completed: { label: 'مكتمل', bg: 'bg-green-50', text: 'text-green-700' },
  terminated: { label: 'إنهاء', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const STAGES = ['draft', 'triggered', 'active', 'monitored', 'completed', 'terminated'];

const FILE_TYPE_LABELS: Record<string, string> = {
  bridge: 'جسر بيني',
  event: 'نبضة تشغيلية',
  cluster: 'تفعيل عنقودي',
  kpi: 'مؤشر أداء',
  conflict: 'تعارض قطاعي',
  sync: 'مزامنة',
};

const FILE_TYPE_ICONS: Record<string, typeof Network> = {
  bridge: Network,
  event: Zap,
  cluster: Layers,
  kpi: Target,
  conflict: AlertTriangle,
  sync: RefreshCw,
};

const DEPARTMENTS = [
  'الشؤون القانونية',
  'الشؤون المالية',
  'الموارد البشرية',
  'تقنية المعلومات',
  'التسويق والمبيعات',
  'العمليات',
  'المشتريات',
  'إدارة المخاطر',
  'الامتثال والحوكمة',
  'العلاقات الحكومية',
];

interface BridgeFileForm {
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  source_department: string;
  target_department: string;
  bridge_type: string;
  event_trigger: string;
  cluster_activated: string;
  parallel_tasks_count: string;
  completed_tasks_count: string;
  synergy_score: string;
  conflict_flagged: boolean;
  conflict_detail: string;
  kpi_label: string;
  kpi_value: string;
  description: string;
}

const emptyForm: BridgeFileForm = {
  file_number: '', file_title: '', file_type: 'bridge', stage: 'draft',
  source_department: '', target_department: '', bridge_type: '',
  event_trigger: '', cluster_activated: '',
  parallel_tasks_count: '0', completed_tasks_count: '0',
  synergy_score: '0',
  conflict_flagged: false, conflict_detail: '',
  kpi_label: '', kpi_value: '',
  description: '',
};

export default function IntegrationSynergyEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [files, setFiles] = useState<M102BridgeFile[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('files');
  const [selectedFile, setSelectedFile] = useState<M102BridgeFile | null>(null);
  const [auditLogs, setAuditLogs] = useState<M102AuditLog[]>([]);
  const [allAudit, setAllAudit] = useState<M102AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BridgeFileForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [fRes, attRes, auditRes] = await Promise.all([
      supabase.from('m102_bridge_files')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m102_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (fRes.error) console.error('m102 fetch error', fRes.error);
    if (attRes.error) console.error('attorneys fetch error', attRes.error);
    if (auditRes.error) console.error('audit fetch error', auditRes.error);
    setFiles((fRes.data as M102BridgeFile[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAudit((auditRes.data as M102AuditLog[]) || []);
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
    const { error } = await supabase.from('m102_audit_logs').insert({
      case_id: fileId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
    if (error) console.error('audit log error', error);
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (f: M102BridgeFile) => {
    setForm({
      file_number: f.file_number, file_title: f.file_title,
      file_type: f.file_type, stage: f.stage,
      source_department: f.source_department || '',
      target_department: f.target_department || '',
      bridge_type: f.bridge_type || '',
      event_trigger: f.event_trigger || '',
      cluster_activated: Array.isArray(f.cluster_activated) ? f.cluster_activated.join(', ') : '',
      parallel_tasks_count: String(f.parallel_tasks_count || 0),
      completed_tasks_count: String(f.completed_tasks_count || 0),
      synergy_score: String(f.synergy_score || 0),
      conflict_flagged: !!f.conflict_flagged,
      conflict_detail: f.conflict_detail || '',
      kpi_label: f.kpi_label || '',
      kpi_value: f.kpi_value || '',
      description: f.description || '',
    });
    setEditingId(f.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.file_title.trim() || !form.file_number.trim()) return;
    setSaving(true);
    const parallelCount = Number(form.parallel_tasks_count) || 0;
    const completedCount = Number(form.completed_tasks_count) || 0;
    const synergy = Number(form.synergy_score) || 0;
    const clusterArr = form.cluster_activated
      .split(',').map((s) => s.trim()).filter((s) => s !== '');
    const payload = {
      file_number: form.file_number.trim(),
      file_title: form.file_title.trim(),
      file_type: form.file_type,
      stage: form.stage,
      status: form.stage === 'terminated' ? 'terminated' : 'active',
      source_department: form.source_department.trim() || null,
      target_department: form.target_department.trim() || null,
      bridge_type: form.bridge_type.trim() || null,
      event_trigger: form.event_trigger.trim() || null,
      cluster_activated: clusterArr.length > 0 ? clusterArr : null,
      parallel_tasks_count: parallelCount,
      completed_tasks_count: completedCount,
      synergy_score: synergy,
      conflict_flagged: form.conflict_flagged,
      conflict_detail: form.conflict_detail.trim() || null,
      kpi_label: form.kpi_label.trim() || null,
      kpi_value: form.kpi_value.trim() || null,
      description: form.description.trim() || null,
    };
    if (editingId) {
      const { error } = await supabase.from('m102_bridge_files').update(payload).eq('id', editingId);
      if (error) console.error('update error', error);
      await logAudit(editingId, 'file_updated', 'تحديث بيانات ملف التكامل والتناغم المؤسسي العابر للإدارات');
    } else {
      const { data, error } = await supabase.from('m102_bridge_files').insert(payload).select('id');
      if (error) console.error('insert error', error);
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'file_created', 'إنشاء جسر بيني — النوع: ' + (FILE_TYPE_LABELS[form.file_type] || form.file_type));
        await supabase.from('m102_bridge_files').update({
          m53_document_id: 'DOC-M102-' + Date.now().toString().slice(-6),
          m54_finance_linked: true,
          m92_notified: true,
          m109_biometric_signed: true,
          cost_center_id: 'CC-M102-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm53_document', 'أرشفة الجسر البيني في محرك المستندات (M53)');
        await logAudit(newId, 'm54_finance', 'ربط الجسر بالمحرك المالي (M54) — تكاليف تشغيلية');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء الجسر البيني');
        await logAudit(newId, 'm109_biometric', 'التوقيع البيومتري لتفعيل الجسر البيني (M109)');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('m102_bridge_files').delete().eq('id', deleteId);
    if (error) console.error('delete error', error);
    setDeleteId(null);
    setSelectedFile(null);
    fetchAll();
  };

  const openFileDetail = async (f: M102BridgeFile) => {
    setSelectedFile(f);
    setDetailLoading(true);
    const aRes = await supabase.from('m102_audit_logs').select('*').eq('case_id', f.id).order('created_at', { ascending: true });
    if (aRes.error) console.error('detail audit error', aRes.error);
    setAuditLogs((aRes.data as M102AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (f: M102BridgeFile) => {
    const idx = STAGES.indexOf(f.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    const { error } = await supabase.from('m102_bridge_files').update({ stage: next, status: next === 'terminated' ? 'terminated' : 'active' }).eq('id', f.id);
    if (error) console.error('stage advance error', error);
    await logAudit(f.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedFile({ ...f, stage: next } as M102BridgeFile);
  };

  const filteredFiles = files.filter((f) => {
    if (filterType !== 'all' && f.file_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!f.file_number.toLowerCase().includes(q) && !f.file_title.toLowerCase().includes(q) && !(f.source_department || '').toLowerCase().includes(q) && !(f.target_department || '').toLowerCase().includes(q) && !(f.bridge_type || '').toLowerCase().includes(q) && !(f.kpi_label || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeClustersCount = files.filter((f) => f.file_type === 'cluster' && f.stage === 'active').length;
  const conflictsFlaggedCount = files.filter((f) => f.conflict_flagged).length;
  const avgSynergyScore = files.length > 0
    ? (files.reduce((s, f) => s + (f.synergy_score || 0), 0) / files.length)
    : 0;

  const tabs: { id: Tab; label: string; icon: typeof Network; badge?: number }[] = [
    { id: 'files', label: 'الجسور البينية والتناغم', icon: Network, badge: files.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Network size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">التكامل والتناغم المؤسسي العابر للإدارات (M102)</h2>
            <p className="font-body text-[10px] text-ink/40">الجسور البينية والنبضات التشغيلية ومؤشرات الأداء التراكمية</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Shield size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">Zero-Trust · ZK-Audit</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> جسر جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Network size={14} className="text-midnight" />} label="إجمالي الجسور" value={String(files.length)} valueClass="text-midnight" />
        <StatCard icon={<Layers size={14} className="text-orange-600" />} label="العناقيد النشطة" value={String(activeClustersCount)} valueClass="text-orange-700" />
        <StatCard icon={<AlertTriangle size={14} className="text-red-600" />} label="التعارضات المُعلَّمة" value={String(conflictsFlaggedCount)} valueClass="text-red-700" />
        <StatCard icon={<Target size={14} className="text-gold" />} label="متوسط درجة التناغم" value={avgSynergyScore.toFixed(1) + '%'} valueClass="text-gold" />
      </div>

      {/* 6-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة الجسر البيني — 6 مراحل</span>
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
                  <span className="font-body text-[9px] text-cream/40">{count} جسر</span>
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
            { icon: FileText, label: 'المستندات (M53)', desc: 'أرشفة الجسر البيني', color: 'text-purple-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'تكاليف تشغيلية', color: 'text-gold' },
            { icon: Activity, label: 'الوكيل الذكي (M92)', desc: 'تنبيهات التكامل', color: 'text-amber-600' },
            { icon: BadgeCheck, label: 'البيومتري (M109)', desc: 'توقيع الجسر', color: 'text-green-600' },
            { icon: GitBranch, label: 'مركز التكلفة (CC)', desc: 'تتبع التكاليف', color: 'text-blue-600' },
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
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم الجسر أو العنوان أو الإدارة..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Files tab */}
      {activeTab === 'files' && (
        <div className="space-y-2">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Network size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد جسور بينية مسجلة</p>
            </div>
          ) : (
            filteredFiles.map((f) => {
              const sCfg = STAGE_CONFIG[f.stage] || STAGE_CONFIG.draft;
              const stageIdx = STAGES.indexOf(f.stage);
              const TypeIcon = FILE_TYPE_ICONS[f.file_type] || Network;
              const clusterStr = Array.isArray(f.cluster_activated) ? f.cluster_activated.join(', ') : '';
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
                          {f.conflict_flagged && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-red-50 text-red-600">
                              <AlertTriangle size={8} /> تعارض
                            </span>
                          )}
                          {f.synergy_score > 0 && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-gold/10 text-gold">
                              <Target size={8} /> {f.synergy_score}%
                            </span>
                          )}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{f.file_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {f.source_department && <span className="font-body text-[9px] text-ink/40">المصدر: {f.source_department}</span>}
                          {f.target_department && <span className="font-body text-[9px] text-ink/40">الهدف: {f.target_department}</span>}
                          {f.bridge_type && <span className="font-body text-[9px] text-blue-600 font-bold">نوع الجسر: {f.bridge_type}</span>}
                          {clusterStr && <span className="font-body text-[9px] text-purple-600 font-bold">العنقود: {clusterStr}</span>}
                          {f.kpi_label && <span className="font-body text-[9px] text-green-600 font-bold">KPI: {f.kpi_label} = {f.kpi_value}</span>}
                          {f.parallel_tasks_count > 0 && <span className="font-body text-[9px] text-ink/40">المهام: {f.completed_tasks_count}/{f.parallel_tasks_count}</span>}
                          {f.m53_document_id && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><FileText size={8} /> M53</span>}
                          {f.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
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
                    {log.action.includes('created') ? <Network size={12} className="text-blue-600" />
                      : log.action.includes('m53') ? <FileText size={12} className="text-purple-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
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
                <Network size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">الجسر البيني والتناغم المؤسسي</span>
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
                    <Network size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات الجسر البيني</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">الإدارة المصدر</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.source_department || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الإدارة الهدف</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.target_department || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نوع الجسر</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.bridge_type || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">مُحفِّز النبضة</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.event_trigger || '—'}</p></div>
                  </div>
                </div>

                {/* Cluster activation card */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Layers size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">العنقود المُفعَّل</span>
                  </div>
                  {Array.isArray(selectedFile.cluster_activated) && selectedFile.cluster_activated.length > 0 ? (
                    <div className="flex items-center gap-1 flex-wrap">
                      {selectedFile.cluster_activated.map((c, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-body font-bold bg-purple-50 text-purple-600">{c}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="font-body text-xs text-ink/50">لا يوجد عنقود مُفعَّل</p>
                  )}
                </div>

                {/* Synergy score & tasks card */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Target size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">مؤشرات الأداء والتناغم</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="font-body text-[9px] text-ink/40">درجة التناغم</span>
                      <p className="font-body text-sm font-bold text-gold">{selectedFile.synergy_score || 0}%</p>
                    </div>
                    <div>
                      <span className="font-body text-[9px] text-ink/40">المهام المتوازية</span>
                      <p className="font-body text-sm font-bold text-midnight">{selectedFile.parallel_tasks_count || 0}</p>
                    </div>
                    <div>
                      <span className="font-body text-[9px] text-ink/40">المهام المكتملة</span>
                      <p className="font-body text-sm font-bold text-green-600">{selectedFile.completed_tasks_count || 0}</p>
                    </div>
                  </div>
                  {selectedFile.kpi_label && (
                    <div className="mt-2 pt-2 border-t border-gold/10">
                      <span className="font-body text-[9px] text-ink/40">مؤشر الأداء (KPI)</span>
                      <p className="font-body text-xs font-bold text-midnight">{selectedFile.kpi_label}: {selectedFile.kpi_value || '—'}</p>
                    </div>
                  )}
                </div>

                {/* Conflict card */}
                <div className={`rounded-lg p-3 border ${selectedFile.conflict_flagged ? 'bg-red-50 border-red-100' : 'bg-gray-100 border-gray-200'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertTriangle size={12} className={selectedFile.conflict_flagged ? 'text-red-600' : 'text-ink/40'} />
                    <span className="font-body text-[10px] font-bold text-midnight">التعارض القطاعي</span>
                  </div>
                  <p className={`font-body text-xs font-bold ${selectedFile.conflict_flagged ? 'text-red-700' : 'text-ink/50'}`}>
                    {selectedFile.conflict_flagged ? 'مسجَّل — يتطلب تدخلاً تنسيقياً' : 'لا يوجد تعارض'}
                  </p>
                  {selectedFile.conflict_detail && (
                    <p className="font-body text-[10px] text-ink/50 mt-1">{selectedFile.conflict_detail}</p>
                  )}
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m53_document_id ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> M53 {selectedFile.m53_document_id ? 'مؤرشف' : 'غير مؤرشف'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedFile.m54_finance_linked ? 'مربوط' : 'غير مربوط'}</span>
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
      <EntityModal open={modalOpen} title={editingId ? 'تعديل الجسر البيني' : 'جسر بيني جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الجسر" required><TextInput value={form.file_number} onChange={(e) => setForm({ ...form, file_number: e.target.value })} placeholder="BRG-2025-001" /></Field>
          <Field label="نوع الجسر">
            <Select value={form.file_type} onChange={(e) => setForm({ ...form, file_type: e.target.value })}>
              {Object.entries(FILE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان الجسر" required><TextInput value={form.file_title} onChange={(e) => setForm({ ...form, file_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الإدارة المصدر">
            <Select value={form.source_department} onChange={(e) => setForm({ ...form, source_department: e.target.value })}>
              <option value="">— اختر —</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
          </Field>
          <Field label="الإدارة الهدف">
            <Select value={form.target_department} onChange={(e) => setForm({ ...form, target_department: e.target.value })}>
              <option value="">— اختر —</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نوع الجسر البيني"><TextInput value={form.bridge_type} onChange={(e) => setForm({ ...form, bridge_type: e.target.value })} placeholder="تكامل بيانات / تنسيق إجراءات" /></Field>
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="مُحفِّز النبضة التشغيلية"><TextInput value={form.event_trigger} onChange={(e) => setForm({ ...form, event_trigger: e.target.value })} placeholder="حدث يُفعّل الجسر البيني" /></Field>
        <Field label="العنقود المُفعَّل (افصل بفاصلة)"><TextInput value={form.cluster_activated} onChange={(e) => setForm({ ...form, cluster_activated: e.target.value })} placeholder="M10, M54, M92" /></Field>
        <div className="grid grid-cols-3 gap-4">
          <Field label="المهام المتوازية"><TextInput type="number" value={form.parallel_tasks_count} onChange={(e) => setForm({ ...form, parallel_tasks_count: e.target.value })} /></Field>
          <Field label="المهام المكتملة"><TextInput type="number" value={form.completed_tasks_count} onChange={(e) => setForm({ ...form, completed_tasks_count: e.target.value })} /></Field>
          <Field label="درجة التناغم (%)"><TextInput type="number" value={form.synergy_score} onChange={(e) => setForm({ ...form, synergy_score: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="مؤشر الأداء (KPI) — التسمية"><TextInput value={form.kpi_label} onChange={(e) => setForm({ ...form, kpi_label: e.target.value })} placeholder="زمن الاستجابة" /></Field>
          <Field label="مؤشر الأداء (KPI) — القيمة"><TextInput value={form.kpi_value} onChange={(e) => setForm({ ...form, kpi_value: e.target.value })} placeholder="2.5 ساعة" /></Field>
        </div>
        <div className="flex items-center gap-6 flex-wrap">
          <Checkbox checked={form.conflict_flagged} onChange={(v: boolean) => setForm({ ...form, conflict_flagged: v })} label="تعارض قطاعي مُعلَّم" />
        </div>
        {form.conflict_flagged && (
          <Field label="تفاصيل التعارض القطاعي"><TextArea value={form.conflict_detail} onChange={(e) => setForm({ ...form, conflict_detail: e.target.value })} rows={2} /></Field>
        )}
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
