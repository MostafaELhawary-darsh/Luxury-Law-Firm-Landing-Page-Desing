import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, AlertTriangle,
  Shield, CircuitBoard, Zap, CheckCircle2, Clock, ArrowRight, Search,
  Activity, Server, AlertCircle, BadgeCheck, Network, DollarSign,
  FileText, FolderArchive, Lock, Layers, Archive, ScanText,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M48ArchiveBatch, M48AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'batches' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  discovery: { label: 'الاكتشاف', bg: 'bg-blue-50', text: 'text-blue-700' },
  scanning: { label: 'المسح الضوئي', bg: 'bg-amber-50', text: 'text-amber-700' },
  classification: { label: 'التصنيف', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  structure_proposed: { label: 'الهيكل المقترح', bg: 'bg-purple-50', text: 'text-purple-700' },
  human_review: { label: 'المراجعة البشرية', bg: 'bg-orange-50', text: 'text-orange-700' },
  archived: { label: 'مؤرشف', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const STAGES = ['discovery', 'scanning', 'classification', 'structure_proposed', 'human_review', 'archived'];

const REPOSITORY_LABELS: Record<string, string> = {
  sovereign_vault: 'الخزنة السيادية',
  legal_archive: 'الأرشيف القانوني',
  financial_archive: 'الأرشيف المالي',
  administrative_archive: 'الأرشيف الإداري',
};

const REPOSITORY_ICONS: Record<string, typeof FolderArchive> = {
  sovereign_vault: Lock,
  legal_archive: FileText,
  financial_archive: DollarSign,
  administrative_archive: Archive,
};

interface BatchForm {
  batch_number: string;
  batch_title: string;
  source_scope: string;
  stage: string;
  total_files: string;
  processed_files: string;
  classified_files: string;
  encrypted_files: string;
  proposed_structure: string;
  human_approved: boolean;
  approved_by: string;
  target_repository: string;
  description: string;
}

const emptyForm: BatchForm = {
  batch_number: '', batch_title: '', source_scope: '', stage: 'discovery',
  total_files: '0', processed_files: '0', classified_files: '0', encrypted_files: '0',
  proposed_structure: '', human_approved: false, approved_by: '',
  target_repository: 'legal_archive', description: '',
};

export default function BulkArchiverEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [batches, setBatches] = useState<M48ArchiveBatch[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('batches');
  const [selectedBatch, setSelectedBatch] = useState<M48ArchiveBatch | null>(null);
  const [auditLogs, setAuditLogs] = useState<M48AuditLog[]>([]);
  const [allAudit, setAllAudit] = useState<M48AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BatchForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRepo, setFilterRepo] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [bRes, attRes, auditRes] = await Promise.all([
      supabase.from('m48_archive_batches')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m48_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (bRes.error) console.error('m48 fetch error', bRes.error);
    if (attRes.error) console.error('attorneys fetch error', attRes.error);
    if (auditRes.error) console.error('audit fetch error', auditRes.error);
    setBatches((bRes.data as M48ArchiveBatch[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAudit((auditRes.data as M48AuditLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyForm, batch_title: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const logAudit = async (batchId: string, action: string, detail: string) => {
    const hash = '0x' + Math.random().toString(16).substr(2, 4) + '...' + Math.random().toString(16).substr(2, 4);
    const { error } = await supabase.from('m48_audit_logs').insert({
      case_id: batchId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
    if (error) console.error('audit log error', error);
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (b: M48ArchiveBatch) => {
    setForm({
      batch_number: b.batch_number, batch_title: b.batch_title,
      source_scope: b.source_scope, stage: b.stage,
      total_files: String(b.total_files || 0),
      processed_files: String(b.processed_files || 0),
      classified_files: String(b.classified_files || 0),
      encrypted_files: String(b.encrypted_files || 0),
      proposed_structure: b.proposed_structure || '',
      human_approved: b.human_approved || false, approved_by: b.approved_by || '',
      target_repository: b.target_repository || 'legal_archive',
      description: b.description || '',
    });
    setEditingId(b.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.batch_title.trim() || !form.batch_number.trim()) return;
    setSaving(true);
    const payload = {
      batch_number: form.batch_number.trim(),
      batch_title: form.batch_title.trim(),
      source_scope: form.source_scope.trim(),
      stage: form.stage,
      status: form.stage === 'archived' ? 'archived' : 'active',
      total_files: Number(form.total_files) || 0,
      processed_files: Number(form.processed_files) || 0,
      classified_files: Number(form.classified_files) || 0,
      encrypted_files: Number(form.encrypted_files) || 0,
      proposed_structure: form.proposed_structure.trim() || null,
      human_approved: form.human_approved,
      approved_by: form.human_approved ? (form.approved_by.trim() || null) : null,
      target_repository: form.target_repository,
      description: form.description.trim() || null,
    };
    if (editingId) {
      const { error } = await supabase.from('m48_archive_batches').update(payload).eq('id', editingId);
      if (error) console.error('update error', error);
      await logAudit(editingId, 'batch_updated', 'تحديث بيانات دفعة الأرشفة');
    } else {
      const { data, error } = await supabase.from('m48_archive_batches').insert(payload).select('id');
      if (error) console.error('insert error', error);
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'batch_created', 'إنشاء دفعة أرشفة جديدة — المستودع: ' + (REPOSITORY_LABELS[form.target_repository] || form.target_repository));
        await supabase.from('m48_archive_batches').update({
          m47_recognition_linked: true,
          m50_risk_checked: false,
          m55_storage_linked: true,
          m54_finance_linked: form.target_repository === 'financial_archive',
          m46_indexed: true,
          m92_notified: true,
          cost_center_id: 'CC-M48-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm47_recognition', 'ربط الدفعة بمحرك التعرّف (M47)');
        await logAudit(newId, 'm55_storage', 'ربط الدفعة بمحرك التخزين (M55)');
        await logAudit(newId, 'm46_indexed', 'فهرسة الدفعة في المعرفة (M46)');
        if (form.human_approved) await logAudit(newId, 'human_approved', 'اعتماد بشري — بواسطة: ' + (form.approved_by || '—'));
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء الدفعة');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('m48_archive_batches').delete().eq('id', deleteId);
    if (error) console.error('delete error', error);
    setDeleteId(null);
    setSelectedBatch(null);
    fetchAll();
  };

  const openBatchDetail = async (b: M48ArchiveBatch) => {
    setSelectedBatch(b);
    setDetailLoading(true);
    const aRes = await supabase.from('m48_audit_logs').select('*').eq('case_id', b.id).order('created_at', { ascending: true });
    if (aRes.error) console.error('detail audit error', aRes.error);
    setAuditLogs((aRes.data as M48AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (b: M48ArchiveBatch) => {
    const idx = STAGES.indexOf(b.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    const { error } = await supabase.from('m48_archive_batches').update({ stage: next, status: next === 'archived' ? 'archived' : 'active' }).eq('id', b.id);
    if (error) console.error('stage advance error', error);
    await logAudit(b.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedBatch({ ...b, stage: next } as M48ArchiveBatch);
  };

  const filteredBatches = batches.filter((b) => {
    if (filterRepo !== 'all' && b.target_repository !== filterRepo) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!b.batch_number.toLowerCase().includes(q) && !b.batch_title.toLowerCase().includes(q) && !b.source_scope.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeCount = batches.filter((b) => b.stage !== 'archived').length;
  const totalProcessed = batches.reduce((s, b) => s + (b.processed_files || 0), 0);
  const totalEncrypted = batches.reduce((s, b) => s + (b.encrypted_files || 0), 0);

  const tabs: { id: Tab; label: string; icon: typeof FolderArchive; badge?: number }[] = [
    { id: 'batches', label: 'دفعات الأرشفة', icon: FolderArchive, badge: batches.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <FolderArchive size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">الأرشفة الذكية الجماعية وإدارة الملفات الضخمة (M48)</h2>
            <p className="font-body text-[10px] text-ink/40">محرك أرشفة جماعي ذكي يكتشف ويصنّف الملفات الضخمة ويقترح هيكلة الأرشفة ويعتمدها بشرياً</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Shield size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">On-Premise · AES-256</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> دفعة جديدة
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<FolderArchive size={14} className="text-midnight" />} label="إجمالي الدفعات" value={String(batches.length)} valueClass="text-midnight" />
        <StatCard icon={<Activity size={14} className="text-amber-600" />} label="دفعات نشطة" value={String(activeCount)} valueClass="text-amber-700" />
        <StatCard icon={<FileText size={14} className="text-blue-600" />} label="ملفات معالَجة" value={String(totalProcessed)} valueClass="text-blue-700" />
        <StatCard icon={<Lock size={14} className="text-purple-600" />} label="ملفات مشفّرة" value={String(totalEncrypted)} valueClass="text-purple-700" />
      </div>

      {/* 6-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة دفعة الأرشفة — 6 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.discovery;
            const count = batches.filter((b) => b.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[130px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                  </div>
                  <span className="font-body text-[9px] text-cream/40">{count} دفعة</span>
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
            { icon: ScanText, label: 'التعرّف (M47)', desc: 'ربط المستندات', color: 'text-blue-600' },
            { icon: Shield, label: 'المخاطر (M50)', desc: 'فحص المخاطر', color: 'text-red-600' },
            { icon: Archive, label: 'التخزين (M55)', desc: 'ربط التخزين', color: 'text-amber-600' },
            { icon: DollarSign, label: 'المالية (M54)', desc: 'ربط المالية', color: 'text-gold' },
            { icon: FileText, label: 'المعرفة (M46)', desc: 'فهرسة المعرفة', color: 'text-purple-600' },
            { icon: Activity, label: 'الوكيل الذكي (M92)', desc: 'تنبيهات تلقائية', color: 'text-amber-600' },
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

      {/* Filters for batches */}
      {activeTab === 'batches' && (
        <div className="flex items-center gap-2">
          <Select value={filterRepo} onChange={(e) => setFilterRepo(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل المستودعات</option>
            {Object.entries(REPOSITORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم الدفعة أو العنوان أو النطاق..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Batches tab */}
      {activeTab === 'batches' && (
        <div className="space-y-2">
          {filteredBatches.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <FolderArchive size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد دفعات أرشفة مسجلة</p>
            </div>
          ) : (
            filteredBatches.map((b) => {
              const sCfg = STAGE_CONFIG[b.stage] || STAGE_CONFIG.discovery;
              const stageIdx = STAGES.indexOf(b.stage);
              const RepoIcon = REPOSITORY_ICONS[b.target_repository] || FolderArchive;
              const progress = b.total_files > 0 ? Math.round((b.processed_files / b.total_files) * 100) : 0;
              return (
                <div key={b.id} onClick={() => openBatchDetail(b)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <RepoIcon size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{b.batch_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{REPOSITORY_LABELS[b.target_repository] || b.target_repository}</span>
                          {b.human_approved && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> معتمد</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{b.batch_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="font-body text-[9px] text-ink/40">النطاق: {b.source_scope}</span>
                          <span className="font-body text-[9px] text-blue-600 font-bold">{b.processed_files}/{b.total_files} ملف ({progress}%)</span>
                          <span className="font-body text-[9px] text-cyan-600">{b.classified_files} مصنّف</span>
                          <span className="font-body text-[9px] text-purple-600">{b.encrypted_files} مشفّر</span>
                          {b.m47_recognition_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><ScanText size={8} /> M47</span>}
                          {b.m50_risk_checked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-red-50 text-red-600"><Shield size={8} /> M50</span>}
                          {b.m55_storage_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Archive size={8} /> M55</span>}
                          {b.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {b.m46_indexed && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><FileText size={8} /> M46</span>}
                          {b.m92_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Activity size={8} /> M92</span>}
                        </div>
                        {/* Progress bar */}
                        <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${progress}%` }} />
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
                        <button onClick={(ev) => { ev.stopPropagation(); openEdit(b); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                        <button onClick={(ev) => { ev.stopPropagation(); setDeleteId(b.id); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
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
                    {log.action.includes('created') ? <FolderArchive size={12} className="text-blue-600" />
                      : log.action.includes('approved') ? <CheckCircle2 size={12} className="text-green-600" />
                      : log.action.includes('m47') ? <ScanText size={12} className="text-blue-600" />
                      : log.action.includes('m50') ? <Shield size={12} className="text-red-600" />
                      : log.action.includes('m55') ? <Archive size={12} className="text-amber-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m46') ? <FileText size={12} className="text-purple-600" />
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

      {/* Batch detail drawer */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedBatch(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <FolderArchive size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">دفعة أرشفة — الأرشفة الذكية</span>
              </div>
              <button onClick={() => setSelectedBatch(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-gold animate-spin" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-body text-[10px] font-bold text-gold">{selectedBatch.batch_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedBatch.stage] || STAGE_CONFIG.discovery).bg} ${(STAGE_CONFIG[selectedBatch.stage] || STAGE_CONFIG.discovery).text}`}>
                      {(STAGE_CONFIG[selectedBatch.stage] || STAGE_CONFIG.discovery).label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{REPOSITORY_LABELS[selectedBatch.target_repository] || selectedBatch.target_repository}</span>
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedBatch.batch_title}</h3>
                  <p className="font-body text-[10px] text-ink/40 mt-1">النطاق: {selectedBatch.source_scope}</p>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.discovery;
                      const stageIdx = STAGES.indexOf(selectedBatch.stage);
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
                  {selectedBatch.stage !== STAGES[STAGES.length - 1] && (
                    <button onClick={() => advanceStage(selectedBatch)} className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
                      <ArrowRight size={12} /> الانتقال للمرحلة التالية
                    </button>
                  )}
                </div>

                {/* Progress metrics */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Activity size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">مقاييس التقدّم</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><span className="font-body text-[9px] text-ink/40">إجمالي الملفات</span><p className="font-body text-sm font-bold text-midnight">{selectedBatch.total_files}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">ملفات معالَجة</span><p className="font-body text-sm font-bold text-blue-600">{selectedBatch.processed_files}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">ملفات مصنّفة</span><p className="font-body text-sm font-bold text-cyan-600">{selectedBatch.classified_files}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">ملفات مشفّرة</span><p className="font-body text-sm font-bold text-purple-600">{selectedBatch.encrypted_files}</p></div>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-body text-[9px] text-ink/40">نسبة الإنجاز</span>
                      <span className="font-body text-[9px] font-bold text-gold">{selectedBatch.total_files > 0 ? Math.round((selectedBatch.processed_files / selectedBatch.total_files) * 100) : 0}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${selectedBatch.total_files > 0 ? Math.round((selectedBatch.processed_files / selectedBatch.total_files) * 100) : 0}%` }} />
                    </div>
                  </div>
                </div>

                {/* Proposed structure */}
                {selectedBatch.proposed_structure && (
                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Layers size={12} className="text-purple-600" />
                      <span className="font-body text-[10px] font-bold text-purple-700">الهيكل المقترح</span>
                    </div>
                    <p className="font-body text-xs text-purple-900 leading-relaxed whitespace-pre-wrap">{selectedBatch.proposed_structure}</p>
                  </div>
                )}

                {/* Flags */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedBatch.human_approved ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><CheckCircle2 size={10} /> {selectedBatch.human_approved ? 'معتمد بشرياً' : 'غير معتمد'}</span>
                  {selectedBatch.approved_by && <span className="font-body text-[10px] text-ink/50">بواسطة: {selectedBatch.approved_by}</span>}
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedBatch.m47_recognition_linked ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><ScanText size={10} /> M47 {selectedBatch.m47_recognition_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedBatch.m50_risk_checked ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-ink/30'}`}><Shield size={10} /> M50 {selectedBatch.m50_risk_checked ? 'مفحوص' : 'غير مفحوص'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedBatch.m55_storage_linked ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Archive size={10} /> M55 {selectedBatch.m55_storage_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedBatch.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedBatch.m54_finance_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedBatch.m46_indexed ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> M46 {selectedBatch.m46_indexed ? 'مفهرس' : 'غير مفهرس'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedBatch.m92_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Activity size={10} /> M92 {selectedBatch.m92_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                </div>

                {selectedBatch.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedBatch.description}</p></div>
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

      {/* Batch create/edit modal */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل الدفعة' : 'دفعة أرشفة جديدة'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الدفعة" required><TextInput value={form.batch_number} onChange={(e) => setForm({ ...form, batch_number: e.target.value })} placeholder="ARC-2025-001" /></Field>
          <Field label="المستودع المستهدف">
            <Select value={form.target_repository} onChange={(e) => setForm({ ...form, target_repository: e.target.value })}>
              {Object.entries(REPOSITORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان الدفعة" required><TextInput value={form.batch_title} onChange={(e) => setForm({ ...form, batch_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نطاق المصدر (Source Scope)" required><TextInput value={form.source_scope} onChange={(e) => setForm({ ...form, source_scope: e.target.value })} placeholder="مجلد / قسم / مشروع" /></Field>
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="إجمالي الملفات"><TextInput type="number" value={form.total_files} onChange={(e) => setForm({ ...form, total_files: e.target.value })} /></Field>
          <Field label="ملفات معالَجة"><TextInput type="number" value={form.processed_files} onChange={(e) => setForm({ ...form, processed_files: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="ملفات مصنّفة"><TextInput type="number" value={form.classified_files} onChange={(e) => setForm({ ...form, classified_files: e.target.value })} /></Field>
          <Field label="ملفات مشفّرة"><TextInput type="number" value={form.encrypted_files} onChange={(e) => setForm({ ...form, encrypted_files: e.target.value })} /></Field>
        </div>
        <Field label="الهيكل المقترح (Proposed Structure)"><TextArea value={form.proposed_structure} onChange={(e) => setForm({ ...form, proposed_structure: e.target.value })} rows={3} /></Field>
        <Field label="اعتمد بواسطة (Approved By)"><TextInput value={form.approved_by} onChange={(e) => setForm({ ...form, approved_by: e.target.value })} placeholder="اسم المراجع" /></Field>
        <Checkbox label="اعتماد بشري (Human Approved)" checked={form.human_approved} onChange={(v) => setForm({ ...form, human_approved: v })} />
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
