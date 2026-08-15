import { useEffect, useState, useCallback } from 'react';
import {
  Send, Loader2, Plus, Pencil, Trash2, ChevronRight, X, FileText,
  Calendar, Lock, Shield, Search, CheckCircle2, Clock, AlertTriangle,
  Activity, Server, Landmark, Inbox, RefreshCw, ArrowRight, ArrowLeft,
  AlertOctagon, Building2,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

// ── Interfaces ──────────────────────────────────────────────────────────────

interface MOJSubmission {
  id: string;
  submission_number: string;
  submission_type: string;
  target_court: string | null;
  case_reference: string | null;
  payload_summary: string | null;
  status: string;
  submitted_at: string | null;
  moj_reference: string | null;
  response_summary: string | null;
  created_at: string;
}

interface MOJResponse {
  id: string;
  submission_id: string;
  response_type: string;
  response_data: string | null;
  received_at: string | null;
  processed: boolean;
  notes: string | null;
  created_at: string;
}

interface SyncLog {
  id: string;
  sync_type: string;
  direction: string;
  endpoint: string | null;
  status: string;
  records_affected: number | null;
  error_message: string | null;
  synced_at: string | null;
  created_at: string;
}

type Tab = 'submissions' | 'responses' | 'sync_log';

// ── Config objects ───────────────────────────────────────────────────────────

const SUBMISSION_TYPE_LABELS: Record<string, string> = {
  case_filing: 'قيد قضية',
  roll_request: 'طلب كشوف',
  certificate_request: 'طلب شهادة',
  status_query: 'استعلام حالة',
};

const SUBMISSION_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'بانتظار', bg: 'bg-amber-50', text: 'text-amber-600' },
  submitted: { label: 'مُقدَّم', bg: 'bg-blue-50', text: 'text-blue-600' },
  accepted: { label: 'مقبول', bg: 'bg-green-50', text: 'text-green-600' },
  rejected: { label: 'مرفوض', bg: 'bg-red-50', text: 'text-red-600' },
  failed: { label: 'فشل', bg: 'bg-red-50', text: 'text-red-700' },
};

const RESPONSE_TYPE_LABELS: Record<string, string> = {
  acceptance: 'قبول',
  rejection: 'رفض',
  roll_data: 'بيانات الكشوف',
  certificate: 'شهادة',
  status_update: 'تحديث حالة',
};

const SYNC_TYPE_LABELS: Record<string, string> = {
  full_sync: 'مزامنة كاملة',
  incremental: 'مزامنة جزئية',
  retry: 'إعادة محاولة',
  manual: 'يدوية',
};

const DIRECTION_CONFIG: Record<string, { label: string; icon: typeof ArrowRight; bg: string; text: string }> = {
  outbound: { label: 'صادر', icon: ArrowRight, bg: 'bg-blue-50', text: 'text-blue-600' },
  inbound: { label: 'وارد', icon: ArrowLeft, bg: 'bg-green-50', text: 'text-green-600' },
};

const SYNC_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  success: { label: 'ناجح', bg: 'bg-green-50', text: 'text-green-600' },
  failed: { label: 'فشل', bg: 'bg-red-50', text: 'text-red-600' },
  pending: { label: 'قيد المعالجة', bg: 'bg-amber-50', text: 'text-amber-600' },
};

// ── Form types ──────────────────────────────────────────────────────────────

interface SubmissionForm {
  submission_number: string;
  submission_type: string;
  target_court: string;
  case_reference: string;
  payload_summary: string;
  status: string;
  submitted_at: string;
  moj_reference: string;
  response_summary: string;
}

const emptySubmissionForm: SubmissionForm = {
  submission_number: '', submission_type: 'case_filing', target_court: '',
  case_reference: '', payload_summary: '', status: 'pending',
  submitted_at: '', moj_reference: '', response_summary: '',
};

interface ResponseForm {
  submission_id: string;
  response_type: string;
  response_data: string;
  received_at: string;
  processed: boolean;
  notes: string;
}

const emptyResponseForm: ResponseForm = {
  submission_id: '', response_type: 'acceptance', response_data: '',
  received_at: '', processed: false, notes: '',
};

// ── Component ───────────────────────────────────────────────────────────────

export default function MOJIntegrationEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [submissions, setSubmissions] = useState<MOJSubmission[]>([]);
  const [responses, setResponses] = useState<MOJResponse[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('submissions');

  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);
  const [editingSubmissionId, setEditingSubmissionId] = useState<string | null>(null);
  const [submissionForm, setSubmissionForm] = useState<SubmissionForm>(emptySubmissionForm);
  const [saving, setSaving] = useState(false);

  const [responseModalOpen, setResponseModalOpen] = useState(false);
  const [responseForm, setResponseForm] = useState<ResponseForm>(emptyResponseForm);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'submission' | 'response' | 'sync'>('submission');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [subRes, respRes, syncRes] = await Promise.all([
      supabase.from('m09_moj_submissions').select('*').order('created_at', { ascending: false }),
      supabase.from('m09_moj_responses').select('*').order('created_at', { ascending: false }),
      supabase.from('m09_moj_sync_log').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setSubmissions((subRes.data as MOJSubmission[]) || []);
    setResponses((respRes.data as MOJResponse[]) || []);
    setSyncLogs((syncRes.data as SyncLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setSubmissionForm({ ...emptySubmissionForm, submission_number: cmd.fields.title || '' });
      setEditingSubmissionId(null);
      setSubmissionModalOpen(true);
    }
  }, [voiceAdd]);

  const openAddSubmission = () => { setSubmissionForm(emptySubmissionForm); setEditingSubmissionId(null); setSubmissionModalOpen(true); };

  const openEditSubmission = (s: MOJSubmission) => {
    setSubmissionForm({
      submission_number: s.submission_number, submission_type: s.submission_type,
      target_court: s.target_court || '', case_reference: s.case_reference || '',
      payload_summary: s.payload_summary || '', status: s.status,
      submitted_at: s.submitted_at || '', moj_reference: s.moj_reference || '',
      response_summary: s.response_summary || '',
    });
    setEditingSubmissionId(s.id);
    setSubmissionModalOpen(true);
  };

  const handleSaveSubmission = async () => {
    if (!submissionForm.submission_number.trim()) return;
    setSaving(true);
    const payload = {
      submission_number: submissionForm.submission_number.trim(),
      submission_type: submissionForm.submission_type,
      target_court: submissionForm.target_court.trim() || null,
      case_reference: submissionForm.case_reference.trim() || null,
      payload_summary: submissionForm.payload_summary.trim() || null,
      status: submissionForm.status,
      submitted_at: submissionForm.submitted_at || null,
      moj_reference: submissionForm.moj_reference.trim() || null,
      response_summary: submissionForm.response_summary.trim() || null,
    };
    if (editingSubmissionId) {
      await supabase.from('m09_moj_submissions').update(payload).eq('id', editingSubmissionId);
    } else {
      const { data } = await supabase.from('m09_moj_submissions').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await supabase.from('m09_moj_sync_log').insert({
          sync_type: 'manual', direction: 'outbound', endpoint: '/api/moj/submissions',
          status: 'success', records_affected: 1, synced_at: new Date().toISOString(),
        });
      }
    }
    setSaving(false);
    setSubmissionModalOpen(false);
    fetchAll();
  };

  const addResponse = async () => {
    if (!responseForm.submission_id) return;
    await supabase.from('m09_moj_responses').insert({
      submission_id: responseForm.submission_id,
      response_type: responseForm.response_type,
      response_data: responseForm.response_data.trim() || null,
      received_at: responseForm.received_at || new Date().toISOString(),
      processed: responseForm.processed,
      notes: responseForm.notes.trim() || null,
    });
    await supabase.from('m09_moj_sync_log').insert({
      sync_type: 'manual', direction: 'inbound', endpoint: '/api/moj/responses',
      status: 'success', records_affected: 1, synced_at: new Date().toISOString(),
    });
    setResponseForm(emptyResponseForm);
    setResponseModalOpen(false);
    fetchAll();
  };

  const markProcessed = async (r: MOJResponse) => {
    await supabase.from('m09_moj_responses').update({ processed: true }).eq('id', r.id);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (deleteType === 'submission') await supabase.from('m09_moj_submissions').delete().eq('id', deleteId);
    else if (deleteType === 'response') await supabase.from('m09_moj_responses').delete().eq('id', deleteId);
    else if (deleteType === 'sync') await supabase.from('m09_moj_sync_log').delete().eq('id', deleteId);
    setDeleteId(null);
    fetchAll();
  };

  const filteredSubmissions = submissions.filter((s) => {
    if (filterType !== 'all' && s.status !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!s.submission_number.toLowerCase().includes(q) && !(s.case_reference || '').toLowerCase().includes(q) && !(s.target_court || '').toLowerCase().includes(q) && !(s.moj_reference || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const pendingSubmissions = submissions.filter((s) => s.status === 'pending').length;
  const acceptedSubmissions = submissions.filter((s) => s.status === 'accepted').length;
  const unprocessedResponses = responses.filter((r) => !r.processed).length;
  const failedSyncs = syncLogs.filter((l) => l.status === 'failed').length;

  const tabs: { id: Tab; label: string; icon: typeof Send; badge?: number }[] = [
    { id: 'submissions', label: 'الطلبات المقدمة', icon: Send, badge: pendingSubmissions },
    { id: 'responses', label: 'الاستجابات', icon: Inbox, badge: unprocessedResponses },
    { id: 'sync_log', label: 'سجل المزامنة', icon: RefreshCw, badge: failedSyncs },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Landmark size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">الربط السيادي مع وزارة العدل (M9-MOJ)</h2>
            <p className="font-body text-[10px] text-ink/40">بوابة التكامل — تقديم الطلبات واستقبال الاستجابات والمزامنة</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Server size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">MOJ API · TLS 1.3</span>
          </div>
          <button onClick={openAddSubmission} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> طلب جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Send size={14} className="text-midnight" />} label="إجمالي الطلبات" value={String(submissions.length)} valueClass="text-midnight" />
        <StatCard icon={<Clock size={14} className="text-amber-600" />} label="طلبات معلقة" value={String(pendingSubmissions)} valueClass="text-amber-700" />
        <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="طلبات مقبولة" value={String(acceptedSubmissions)} valueClass="text-green-700" />
        <StatCard icon={<AlertTriangle size={14} className="text-red-600" />} label="مزامنات فاشلة" value={String(failedSyncs)} valueClass="text-red-700" />
      </div>

      {/* Integration matrix */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <RefreshCw size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">حالة الربط السيادي — وزارة العدل</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: 'نقطة النهاية', value: '/api/moj/v2', color: 'text-gold' },
            { label: 'البروتوكول', value: 'REST + SOAP', color: 'text-cream' },
            { label: 'التشفير', value: 'TLS 1.3 / AES-256', color: 'text-green-400' },
            { label: 'آخر مزامنة', value: syncLogs[0]?.synced_at ? formatDate(syncLogs[0].synced_at) : '—', color: 'text-blue-400' },
          ].map((item, i) => (
            <div key={i} className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10">
              <span className="font-body text-[9px] text-cream/40">{item.label}</span>
              <p className={`font-body text-[10px] font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
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

      {/* Filters for submissions */}
      {activeTab === 'submissions' && (
        <div className="flex items-center gap-2">
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الحالات</option>
            {Object.entries(SUBMISSION_STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم أو مرجع أو محكمة..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Submissions tab */}
      {activeTab === 'submissions' && (
        <div className="space-y-2">
          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Send size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد طلبات مقدمة</p>
            </div>
          ) : (
            filteredSubmissions.map((s) => {
              const cfg = SUBMISSION_STATUS_CONFIG[s.status] || SUBMISSION_STATUS_CONFIG.pending;
              return (
                <div key={s.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                        <Send size={14} className={cfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{s.submission_number}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{SUBMISSION_TYPE_LABELS[s.submission_type] || s.submission_type}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                          {s.target_court && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Building2 size={8} /> {s.target_court}</span>}
                        </div>
                        {s.case_reference && <p className="font-body text-xs font-bold text-midnight mt-1">المرجع: {s.case_reference}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {s.submitted_at && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/40"><Calendar size={9} /> {formatDate(s.submitted_at)}</span>}
                          {s.moj_reference && <span className="flex items-center gap-0.5 font-body text-[9px] text-gold font-bold"><FileText size={9} /> مرجع الوزارة: {s.moj_reference}</span>}
                        </div>
                        {s.payload_summary && <p className="font-body text-[10px] text-ink/50 mt-1 leading-relaxed line-clamp-2">{s.payload_summary}</p>}
                        {s.response_summary && <p className="font-body text-[10px] text-green-600 mt-1 leading-relaxed line-clamp-2">الرد: {s.response_summary}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditSubmission(s)} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                      <button onClick={() => { setDeleteId(s.id); setDeleteType('submission'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Responses tab */}
      {activeTab === 'responses' && (
        <div className="space-y-2">
          <div className="flex items-center justify-end">
            <button onClick={() => setResponseModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold/10 text-gold font-body text-xs font-bold hover:bg-gold/20 transition-colors">
              <Plus size={12} /> استجابة جديدة
            </button>
          </div>
          {responses.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><Inbox size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد استجابات</p></div>
          ) : (
            responses.map((r) => {
              const sub = submissions.find((s) => s.id === r.submission_id);
              return (
                <div key={r.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${r.response_type === 'rejection' ? 'bg-red-50' : 'bg-green-50'}`}>
                        {r.response_type === 'rejection' ? <AlertOctagon size={14} className="text-red-600" /> : <CheckCircle2 size={14} className="text-green-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{RESPONSE_TYPE_LABELS[r.response_type] || r.response_type}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${r.processed ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>{r.processed ? 'معالج' : 'غير معالج'}</span>
                          {sub && <span className="font-body text-[9px] text-gold">{sub.submission_number}</span>}
                        </div>
                        {r.response_data && <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{r.response_data}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {r.received_at && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/40"><Calendar size={9} /> {formatDate(r.received_at)}</span>}
                          {r.notes && <span className="font-body text-[9px] text-ink/40">{r.notes}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!r.processed && <button onClick={() => markProcessed(r)} className="p-1.5 rounded text-green-500 hover:bg-green-50 transition-colors" title="تعليم كمعالج"><CheckCircle2 size={12} /></button>}
                      <button onClick={() => { setDeleteId(r.id); setDeleteType('response'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Sync log tab */}
      {activeTab === 'sync_log' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={14} className="text-gold" />
            <span className="font-heading font-bold text-midnight text-sm">سجل المزامنة السيادي</span>
            <span className="font-body text-[10px] text-ink/30">— {syncLogs.length} عملية</span>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {syncLogs.map((log) => {
                const dirCfg = DIRECTION_CONFIG[log.direction] || DIRECTION_CONFIG.outbound;
                const statusCfg = SYNC_STATUS_CONFIG[log.status] || SYNC_STATUS_CONFIG.pending;
                const DirIcon = dirCfg.icon;
                return (
                  <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${dirCfg.bg}`}>
                      <DirIcon size={12} className={dirCfg.text} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-body text-[10px] font-bold text-midnight">{SYNC_TYPE_LABELS[log.sync_type] || log.sync_type}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-body ${dirCfg.bg} ${dirCfg.text}`}>{dirCfg.label}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${statusCfg.bg} ${statusCfg.text}`}>{statusCfg.label}</span>
                        {log.records_affected !== null && <span className="font-body text-[9px] text-ink/40">{log.records_affected} سجل</span>}
                      </div>
                      {log.endpoint && <p className="font-body text-[10px] text-ink/50 mt-0.5">{log.endpoint}</p>}
                      {log.error_message && <p className="font-body text-[10px] text-red-600 mt-0.5 leading-relaxed">{log.error_message}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        {log.synced_at && <span className="font-body text-[9px] text-ink/30">{new Date(log.synced_at).toLocaleString('ar-EG')}</span>}
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(log.id); setDeleteType('sync'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Submission modal */}
      <EntityModal open={submissionModalOpen} title={editingSubmissionId ? 'تعديل الطلب' : 'طلب جديد'} onClose={() => setSubmissionModalOpen(false)} onSubmit={handleSaveSubmission} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الطلب" required><TextInput value={submissionForm.submission_number} onChange={(e) => setSubmissionForm({ ...submissionForm, submission_number: e.target.value })} placeholder="MOJ-2025-001" /></Field>
          <Field label="نوع الطلب">
            <Select value={submissionForm.submission_type} onChange={(e) => setSubmissionForm({ ...submissionForm, submission_type: e.target.value })}>
              {Object.entries(SUBMISSION_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المحكمة المستهدفة"><TextInput value={submissionForm.target_court} onChange={(e) => setSubmissionForm({ ...submissionForm, target_court: e.target.value })} /></Field>
          <Field label="مرجع القضية"><TextInput value={submissionForm.case_reference} onChange={(e) => setSubmissionForm({ ...submissionForm, case_reference: e.target.value })} /></Field>
        </div>
        <Field label="ملخص الحمولة"><TextArea value={submissionForm.payload_summary} onChange={(e) => setSubmissionForm({ ...submissionForm, payload_summary: e.target.value })} rows={2} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الحالة">
            <Select value={submissionForm.status} onChange={(e) => setSubmissionForm({ ...submissionForm, status: e.target.value })}>
              {Object.entries(SUBMISSION_STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
            </Select>
          </Field>
          <Field label="تاريخ التقديم"><TextInput type="date" value={submissionForm.submitted_at} onChange={(e) => setSubmissionForm({ ...submissionForm, submitted_at: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="مرجع الوزارة"><TextInput value={submissionForm.moj_reference} onChange={(e) => setSubmissionForm({ ...submissionForm, moj_reference: e.target.value })} /></Field>
        </div>
        <Field label="ملخص الاستجابة"><TextArea value={submissionForm.response_summary} onChange={(e) => setSubmissionForm({ ...submissionForm, response_summary: e.target.value })} rows={2} /></Field>
      </EntityModal>

      {/* Response modal */}
      <EntityModal open={responseModalOpen} title="استجابة جديدة" onClose={() => setResponseModalOpen(false)} onSubmit={addResponse}>
        <Field label="الطلب المرتبط" required>
          <Select value={responseForm.submission_id} onChange={(e) => setResponseForm({ ...responseForm, submission_id: e.target.value })}>
            <option value="">— اختر —</option>
            {submissions.map((s) => <option key={s.id} value={s.id}>{s.submission_number}</option>)}
          </Select>
        </Field>
        <Field label="نوع الاستجابة" required>
          <Select value={responseForm.response_type} onChange={(e) => setResponseForm({ ...responseForm, response_type: e.target.value })}>
            {Object.entries(RESPONSE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="تاريخ الاستلام"><TextInput type="date" value={responseForm.received_at} onChange={(e) => setResponseForm({ ...responseForm, received_at: e.target.value })} /></Field>
        <Field label="بيانات الاستجابة"><TextArea value={responseForm.response_data} onChange={(e) => setResponseForm({ ...responseForm, response_data: e.target.value })} rows={3} /></Field>
        <Field label="ملاحظات"><TextArea value={responseForm.notes} onChange={(e) => setResponseForm({ ...responseForm, notes: e.target.value })} rows={2} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
