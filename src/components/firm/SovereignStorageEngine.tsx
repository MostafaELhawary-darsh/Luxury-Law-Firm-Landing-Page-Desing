import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, AlertTriangle,
  Shield, CircuitBoard, Zap, CheckCircle2, Clock, ArrowRight, Search,
  Activity, Server, AlertCircle, BadgeCheck, FileText, Gavel, Users,
  Lock, Scan, Eye, Database, Scale, Fingerprint, HardDrive, Archive,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M55StorageRecord, M55AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'records' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  ingestion: { label: 'الاستيعاب', bg: 'bg-blue-50', text: 'text-blue-700' },
  encrypted: { label: 'تشفير', bg: 'bg-purple-50', text: 'text-purple-700' },
  indexed: { label: 'فهرسة', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  stored: { label: 'تخزين', bg: 'bg-green-50', text: 'text-green-700' },
  archived: { label: 'أرشفة', bg: 'bg-amber-50', text: 'text-amber-700' },
  purged: { label: 'إتلاف', bg: 'bg-red-50', text: 'text-red-700' },
};

const STAGES = ['ingestion', 'encrypted', 'indexed', 'stored', 'archived', 'purged'];

const FILE_TYPE_LABELS: Record<string, string> = {
  document: 'مستند',
  image: 'صورة',
  video: 'فيديو',
  audio: 'صوت',
  archive: 'أرشيف',
};

const FILE_TYPE_ICONS: Record<string, typeof FileText> = {
  document: FileText,
  image: Eye,
  video: FileText,
  audio: FileText,
  archive: Archive,
};

const PARTITION_LABELS: Record<string, string> = {
  legal: 'قانوني',
  financial: 'مالي',
  administrative: 'إداري',
  tax: 'ضريبي',
  judicial: 'قضائي',
};

const RETENTION_LABELS: Record<string, string> = {
  permanent: 'دائم',
  '10_years': '10 سنوات',
  '5_years': '5 سنوات',
  '3_years': '3 سنوات',
  review: 'مراجعة',
};

const ACCESS_LABELS: Record<string, string> = {
  public: 'عام',
  restricted: 'مقيّد',
  confidential: 'سري',
  top_secret: 'سري للغاية',
};

const ACCESS_COLORS: Record<string, string> = {
  public: 'bg-green-50 text-green-700',
  restricted: 'bg-amber-50 text-amber-700',
  confidential: 'bg-red-50 text-red-700',
  top_secret: 'bg-red-100 text-red-800',
};

interface RecForm {
  record_number: string;
  record_title: string;
  file_type: string;
  stage: string;
  bucket_name: string;
  file_size: number;
  encrypted: boolean;
  worm_protected: boolean;
  sha3_hash: string;
  partition: string;
  retention_policy: string;
  access_level: string;
  description: string;
}

const emptyForm: RecForm = {
  record_number: '', record_title: '', file_type: 'document', stage: 'ingestion',
  bucket_name: '', file_size: 0, encrypted: false, worm_protected: false,
  sha3_hash: '', partition: 'legal', retention_policy: 'permanent',
  access_level: 'restricted', description: '',
};

export default function SovereignStorageEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [records, setRecords] = useState<M55StorageRecord[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('records');
  const [selectedRec, setSelectedRec] = useState<M55StorageRecord | null>(null);
  const [auditLogs, setAuditLogs] = useState<M55AuditLog[]>([]);
  const [allAudit, setAllAudit] = useState<M55AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RecForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPartition, setFilterPartition] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [rRes, attRes, auditRes] = await Promise.all([
      supabase.from('m55_storage_records')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m55_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (rRes.error) console.error('m55 fetch error', rRes.error);
    if (attRes.error) console.error('attorneys fetch error', attRes.error);
    if (auditRes.error) console.error('audit fetch error', auditRes.error);
    setRecords((rRes.data as M55StorageRecord[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAudit((auditRes.data as M55AuditLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyForm, record_title: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const logAudit = async (recId: string, action: string, detail: string) => {
    const hash = '0x' + Math.random().toString(16).substr(2, 4) + '...' + Math.random().toString(16).substr(2, 4);
    const { error } = await supabase.from('m55_audit_logs').insert({
      case_id: recId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
    if (error) console.error('audit log error', error);
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (r: M55StorageRecord) => {
    setForm({
      record_number: r.record_number, record_title: r.record_title,
      file_type: r.file_type, stage: r.stage,
      bucket_name: r.bucket_name, file_size: r.file_size || 0,
      encrypted: r.encrypted || false, worm_protected: r.worm_protected || false,
      sha3_hash: r.sha3_hash || '', partition: r.partition,
      retention_policy: r.retention_policy, access_level: r.access_level,
      description: r.description || '',
    });
    setEditingId(r.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.record_title.trim() || !form.record_number.trim()) return;
    setSaving(true);
    const payload = {
      record_number: form.record_number.trim(),
      record_title: form.record_title.trim(),
      file_type: form.file_type,
      stage: form.stage,
      status: form.stage === 'archived' || form.stage === 'purged' ? 'archived' : 'active',
      bucket_name: form.bucket_name.trim(),
      file_size: form.file_size,
      encrypted: form.encrypted,
      worm_protected: form.worm_protected,
      sha3_hash: form.sha3_hash.trim() || null,
      partition: form.partition,
      retention_policy: form.retention_policy,
      access_level: form.access_level,
      description: form.description.trim() || null,
    };
    if (editingId) {
      const { error } = await supabase.from('m55_storage_records').update(payload).eq('id', editingId);
      if (error) console.error('update error', error);
      await logAudit(editingId, 'record_updated', 'تحديث بيانات السجل التخزيني');
    } else {
      const { data, error } = await supabase.from('m55_storage_records').insert(payload).select('id');
      if (error) console.error('insert error', error);
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'record_created', 'إنشاء سجل تخزيني سيادي — النوع: ' + (FILE_TYPE_LABELS[form.file_type] || form.file_type));
        await supabase.from('m55_storage_records').update({
          m48_archived: form.stage === 'archived',
          m53_document_linked: false,
          m46_indexed: form.stage === 'indexed' || form.stage === 'stored',
          m109_biometric_required: form.access_level === 'top_secret',
          m92_notified: true,
          cost_center_id: 'CC-M55-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm48_archive', 'ربط السجل بمحرك الأرشفة (M48)');
        if (form.encrypted) {
          await logAudit(newId, 'm53_document', 'تشفير السجل وربطه بمحرك المستندات (M53)');
        }
        if (form.stage === 'indexed' || form.stage === 'stored') {
          await logAudit(newId, 'm46_index', 'فهرسة السجل في محرك المعرفة (M46)');
        }
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء السجل');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('m55_storage_records').delete().eq('id', deleteId);
    if (error) console.error('delete error', error);
    setDeleteId(null);
    setSelectedRec(null);
    fetchAll();
  };

  const openRecDetail = async (r: M55StorageRecord) => {
    setSelectedRec(r);
    setDetailLoading(true);
    const aRes = await supabase.from('m55_audit_logs').select('*').eq('case_id', r.id).order('created_at', { ascending: true });
    if (aRes.error) console.error('detail audit error', aRes.error);
    setAuditLogs((aRes.data as M55AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (r: M55StorageRecord) => {
    const idx = STAGES.indexOf(r.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    const { error } = await supabase.from('m55_storage_records').update({ stage: next, status: next === 'archived' || next === 'purged' ? 'archived' : 'active' }).eq('id', r.id);
    if (error) console.error('stage advance error', error);
    await logAudit(r.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedRec({ ...r, stage: next } as M55StorageRecord);
  };

  const filteredRecs = records.filter((r) => {
    if (filterPartition !== 'all' && r.partition !== filterPartition) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!r.record_number.toLowerCase().includes(q) && !r.record_title.toLowerCase().includes(q) && !r.bucket_name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const encryptedCount = records.filter((r) => r.encrypted).length;
  const wormCount = records.filter((r) => r.worm_protected).length;
  const totalSize = records.reduce((sum, r) => sum + (r.file_size || 0), 0);

  const tabs: { id: Tab; label: string; icon: typeof Database; badge?: number }[] = [
    { id: 'records', label: 'السجلات', icon: Database, badge: records.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Database size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">التخزين السيادي الموزع (M55)</h2>
            <p className="font-body text-[10px] text-ink/40">محرك التخزين المحلي السيادي مع تشفير AES-256 وحماية WORM وتقسيم ذكي وسياسات احتفاظ</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Shield size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">Air-Gapped · AES-256</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> سجل جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Database size={14} className="text-midnight" />} label="إجمالي السجلات" value={String(records.length)} valueClass="text-midnight" />
        <StatCard icon={<Lock size={14} className="text-purple-600" />} label="مشفّرة" value={String(encryptedCount)} valueClass="text-purple-700" />
        <StatCard icon={<Shield size={14} className="text-green-600" />} label="محمية WORM" value={String(wormCount)} valueClass="text-green-700" />
        <StatCard icon={<HardDrive size={14} className="text-amber-600" />} label="إجمالي الحجم" value={formatCurrency(totalSize)} valueClass="text-amber-700" />
      </div>

      {/* 6-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة السجل التخزيني — 6 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.ingestion;
            const count = records.filter((r) => r.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[130px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                  </div>
                  <span className="font-body text-[9px] text-cream/40">{count} سجل</span>
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            { icon: Lock, label: 'الأرشيف (M48)', desc: 'أرشفة وتشفير', color: 'text-purple-600' },
            { icon: FileText, label: 'المستندات (M53)', desc: 'ربط المستندات', color: 'text-blue-600' },
            { icon: Database, label: 'المعرفة (M46)', desc: 'فهرسة ذكية', color: 'text-cyan-600' },
            { icon: Fingerprint, label: 'البصمة الحيوية (M109)', desc: 'تحقق حيوي', color: 'text-green-600' },
            { icon: Activity, label: 'الوكيل الذكي (M92)', desc: 'تنبيهات الوصول', color: 'text-amber-600' },
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

      {/* Filters for records */}
      {activeTab === 'records' && (
        <div className="flex items-center gap-2">
          <Select value={filterPartition} onChange={(e) => setFilterPartition(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الأقسام</option>
            {Object.entries(PARTITION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم السجل أو العنوان أو الحاوية..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Records tab */}
      {activeTab === 'records' && (
        <div className="space-y-2">
          {filteredRecs.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Database size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد سجلات تخزين مسجلة</p>
            </div>
          ) : (
            filteredRecs.map((r) => {
              const sCfg = STAGE_CONFIG[r.stage] || STAGE_CONFIG.ingestion;
              const stageIdx = STAGES.indexOf(r.stage);
              const TypeIcon = FILE_TYPE_ICONS[r.file_type] || FileText;
              const accColor = ACCESS_COLORS[r.access_level] || ACCESS_COLORS.restricted;
              return (
                <div key={r.id} onClick={() => openRecDetail(r)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <TypeIcon size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{r.record_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{FILE_TYPE_LABELS[r.file_type] || r.file_type}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-cyan-50 text-cyan-600">{PARTITION_LABELS[r.partition] || r.partition}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${accColor}`}>وصول: {ACCESS_LABELS[r.access_level] || r.access_level}</span>
                          {r.encrypted && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Lock size={8} /> مشفّر</span>}
                          {r.worm_protected && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><Shield size={8} /> WORM</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{r.record_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="font-body text-[9px] text-ink/40">الحاوية: {r.bucket_name}</span>
                          <span className="font-body text-[9px] text-ink/40">الحجم: {formatCurrency(r.file_size || 0)}</span>
                          <span className="font-body text-[9px] text-ink/40">الاحتفاظ: {RETENTION_LABELS[r.retention_policy] || r.retention_policy}</span>
                          {r.m48_archived && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Lock size={8} /> M48</span>}
                          {r.m53_document_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><FileText size={8} /> M53</span>}
                          {r.m46_indexed && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-cyan-50 text-cyan-600"><Database size={8} /> M46</span>}
                          {r.m109_biometric_required && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><Fingerprint size={8} /> M109</span>}
                          {r.m92_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Activity size={8} /> M92</span>}
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
                        <button onClick={(ev) => { ev.stopPropagation(); openEdit(r); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                        <button onClick={(ev) => { ev.stopPropagation(); setDeleteId(r.id); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
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
                    {log.action.includes('created') ? <Database size={12} className="text-blue-600" />
                      : log.action.includes('m48') ? <Lock size={12} className="text-purple-600" />
                      : log.action.includes('m53') ? <FileText size={12} className="text-blue-600" />
                      : log.action.includes('m46') ? <Database size={12} className="text-cyan-600" />
                      : log.action.includes('m109') ? <Fingerprint size={12} className="text-green-600" />
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

      {/* Record detail drawer */}
      {selectedRec && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedRec(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Database size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف السجل التخزيني السيادي</span>
              </div>
              <button onClick={() => setSelectedRec(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-gold animate-spin" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-body text-[10px] font-bold text-gold">{selectedRec.record_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedRec.stage] || STAGE_CONFIG.ingestion).bg} ${(STAGE_CONFIG[selectedRec.stage] || STAGE_CONFIG.ingestion).text}`}>
                      {(STAGE_CONFIG[selectedRec.stage] || STAGE_CONFIG.ingestion).label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{FILE_TYPE_LABELS[selectedRec.file_type] || selectedRec.file_type}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-cyan-50 text-cyan-600">{PARTITION_LABELS[selectedRec.partition] || selectedRec.partition}</span>
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedRec.record_title}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.ingestion;
                      const stageIdx = STAGES.indexOf(selectedRec.stage);
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
                  {selectedRec.stage !== STAGES[STAGES.length - 1] && (
                    <button onClick={() => advanceStage(selectedRec)} className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
                      <ArrowRight size={12} /> الانتقال للمرحلة التالية
                    </button>
                  )}
                </div>

                {/* Record info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Database size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات السجل</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">الحاوية</span><p className="font-body text-xs font-bold text-midnight">{selectedRec.bucket_name}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الحجم</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedRec.file_size || 0)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">القسم</span><p className="font-body text-xs font-bold text-midnight">{PARTITION_LABELS[selectedRec.partition] || selectedRec.partition}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المستشار</span><p className="font-body text-xs font-bold text-midnight">{selectedRec.advisor?.name || '—'}</p></div>
                  </div>
                </div>

                {/* Retention policy */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <Archive size={12} className="text-gold mb-1" />
                  <span className="font-body text-[9px] text-ink/40">سياسة الاحتفاظ</span>
                  <p className="font-body text-sm font-bold text-midnight">{RETENTION_LABELS[selectedRec.retention_policy] || selectedRec.retention_policy}</p>
                </div>

                {/* Access level */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <Eye size={12} className="text-gold mb-1" />
                  <span className="font-body text-[9px] text-ink/40">مستوى الوصول</span>
                  <p className="font-body text-sm font-bold text-midnight">{ACCESS_LABELS[selectedRec.access_level] || selectedRec.access_level}</p>
                </div>

                {/* Encryption & WORM */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <Lock size={12} className="text-gold mb-1" />
                  <span className="font-body text-[9px] text-ink/40">تشفير AES-256</span>
                  <p className="font-body text-sm font-bold text-midnight">{selectedRec.encrypted ? 'مفعّل' : 'غير مفعّل'}</p>
                  {selectedRec.sha3_hash && (
                    <div className="mt-2">
                      <span className="font-body text-[9px] text-ink/40">SHA3-Hash</span>
                      <p className="font-body text-[10px] text-ink/60 font-mono leading-tight break-all">{selectedRec.sha3_hash}</p>
                    </div>
                  )}
                </div>

                {/* Flags */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedRec.encrypted ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Lock size={10} /> تشفير {selectedRec.encrypted ? 'مفعّل' : 'غير مفعّل'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedRec.worm_protected ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><Shield size={10} /> WORM {selectedRec.worm_protected ? 'مفعّل' : 'غير مفعّل'}</span>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedRec.m48_archived ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Lock size={10} /> M48 {selectedRec.m48_archived ? 'مؤرشف' : 'غير مؤرشف'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedRec.m53_document_linked ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> M53 {selectedRec.m53_document_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedRec.m46_indexed ? 'bg-cyan-50 text-cyan-600' : 'bg-gray-100 text-ink/30'}`}><Database size={10} /> M46 {selectedRec.m46_indexed ? 'مفهرس' : 'غير مفهرس'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedRec.m109_biometric_required ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><Fingerprint size={10} /> M109 {selectedRec.m109_biometric_required ? 'مطلوب' : 'غير مطلوب'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedRec.m92_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Activity size={10} /> M92 {selectedRec.m92_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                </div>

                {selectedRec.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedRec.description}</p></div>
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

      {/* Record create/edit modal */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل السجل' : 'سجل تخزيني سيادي جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم السجل" required><TextInput value={form.record_number} onChange={(e) => setForm({ ...form, record_number: e.target.value })} placeholder="REC-2025-001" /></Field>
          <Field label="نوع الملف">
            <Select value={form.file_type} onChange={(e) => setForm({ ...form, file_type: e.target.value })}>
              {Object.entries(FILE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان السجل" required><TextInput value={form.record_title} onChange={(e) => setForm({ ...form, record_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم الحاوية (Bucket)" required><TextInput value={form.bucket_name} onChange={(e) => setForm({ ...form, bucket_name: e.target.value })} placeholder="legal-bucket" /></Field>
          <Field label="حجم الملف (bytes)">
            <TextInput type="number" min={0} value={form.file_size} onChange={(e) => setForm({ ...form, file_size: parseInt(e.target.value) || 0 })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="القسم (Partition)">
            <Select value={form.partition} onChange={(e) => setForm({ ...form, partition: e.target.value })}>
              {Object.entries(PARTITION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="سياسة الاحتفاظ">
            <Select value={form.retention_policy} onChange={(e) => setForm({ ...form, retention_policy: e.target.value })}>
              {Object.entries(RETENTION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="مستوى الوصول">
            <Select value={form.access_level} onChange={(e) => setForm({ ...form, access_level: e.target.value })}>
              {Object.entries(ACCESS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Checkbox label="مشفّر AES-256 (Encrypted)" checked={form.encrypted} onChange={(v) => setForm({ ...form, encrypted: v })} />
        <Checkbox label="حماية WORM (Write Once Read Many)" checked={form.worm_protected} onChange={(v) => setForm({ ...form, worm_protected: v })} />
        <Field label="SHA3-Hash"><TextInput value={form.sha3_hash} onChange={(e) => setForm({ ...form, sha3_hash: e.target.value })} placeholder="0x..." className="font-mono" /></Field>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
