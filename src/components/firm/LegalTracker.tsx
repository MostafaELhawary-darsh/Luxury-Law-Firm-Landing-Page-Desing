import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Eye, ShieldAlert, FileText, CheckCircle2, Clock, AlertTriangle,
  ChevronLeft, Loader2, Plus, FileCheck, FileWarning, Lock,
  TrendingUp, Activity, MessageSquare, X, Send,
} from 'lucide-react';
import type {
  TrackerMatter, TrackerMilestone, TrackerClientAction,
  TrackerUpdate, TrackerInternalNote, TrackerDocument,
} from '@/lib/legalTrackerTypes';
import { TRIAGE_LABELS } from '@/lib/legalTrackerTypes';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type ViewMode = 'client' | 'internal';

export default function LegalTracker({ voiceAdd }: { voiceAdd?: () => unknown }) {
  const [matters, setMatters] = useState<TrackerMatter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatterId, setSelectedMatterId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('client');

  useEffect(() => { fetchMatters(); }, []);

  const fetchMatters = async () => {
    setLoading(true);
    const { data } = await supabase.from('lt_matters').select('*').order('created_at', { ascending: false });
    setMatters((data as TrackerMatter[]) || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-gold" size={28} />
      </div>
    );
  }

  if (selectedMatterId) {
    return (
      <MatterDetail
        matterId={selectedMatterId}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onBack={() => setSelectedMatterId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading font-bold text-midnight text-xl">لوحة متابعة العميل — Legal Tracker</h2>
          <p className="font-body text-xs text-ink/50 mt-1">نموذج الرعاية القانونية الشاملة 360 (Agile Legal Care)</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('client')}
            className={`px-4 py-1.5 rounded-md font-body text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'client' ? 'bg-white text-midnight shadow-sm' : 'text-ink/50'
            }`}
          >
            <Eye size={14} />
            واجهة العميل
          </button>
          <button
            onClick={() => setViewMode('internal')}
            className={`px-4 py-1.5 rounded-md font-body text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'internal' ? 'bg-white text-midnight shadow-sm' : 'text-ink/50'
            }`}
          >
            <ShieldAlert size={14} />
            واجهة المؤسسة
          </button>
        </div>
      </div>

      {/* View mode banner */}
      {viewMode === 'client' ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
          <Eye size={14} className="text-emerald-600" />
          <p className="font-body text-xs text-emerald-700">
            أنت تستعرض واجهة العميل — تُعرض المراحل العامة والإجراءات المطلوبة فقط. المخاطر والاستراتيجية محجوبة.
          </p>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
          <Lock size={14} className="text-red-600" />
          <p className="font-body text-xs text-red-700">
            واجهة المؤسسة الداخلية — تُعرض المخاطر والاستراتيجية والمسودات. هذه البيانات سرية ولا تُشارك مع العميل.
          </p>
        </div>
      )}

      {/* Matters grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {matters.map((m) => {
          const triage = TRIAGE_LABELS[m.triage_lane];
          return (
            <button
              key={m.id}
              onClick={() => setSelectedMatterId(m.id)}
              className="bg-white rounded-xl border border-gray-200 p-5 text-right hover:border-gold/40 hover:shadow-lg transition-all duration-300 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-heading font-bold text-midnight text-sm group-hover:text-gold transition-colors">
                    {m.title}
                  </h3>
                  <p className="font-body text-xs text-ink/40 mt-0.5">{m.client_name}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${triage.bg} ${triage.color} ${triage.border} flex-shrink-0`}>
                  {triage.label}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-ink/50 font-body">
                <span className="flex items-center gap-1">
                  <FileText size={12} />
                  {m.matter_type}
                </span>
                {m.next_hearing_date && (
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    الجلسة القادمة: {m.next_hearing_date}
                  </span>
                )}
                <span className="flex items-center gap-1 mr-auto">
                  <ChevronLeft size={14} className="group-hover:text-gold transition-colors" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============ MATTER DETAIL ============

interface MatterDetailProps {
  matterId: string;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  onBack: () => void;
}

function MatterDetail({ matterId, viewMode, setViewMode, onBack }: MatterDetailProps) {
  const [matter, setMatter] = useState<TrackerMatter | null>(null);
  const [milestones, setMilestones] = useState<TrackerMilestone[]>([]);
  const [actions, setActions] = useState<TrackerClientAction[]>([]);
  const [updates, setUpdates] = useState<TrackerUpdate[]>([]);
  const [notes, setNotes] = useState<TrackerInternalNote[]>([]);
  const [documents, setDocuments] = useState<TrackerDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddAction, setShowAddAction] = useState(false);
  const [showAddUpdate, setShowAddUpdate] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [m, ms, ac, up, nt, dc] = await Promise.all([
      supabase.from('lt_matters').select('*').eq('id', matterId).maybeSingle(),
      supabase.from('lt_milestones').select('*').eq('matter_id', matterId).order('step_index', { ascending: true }),
      supabase.from('lt_client_actions').select('*').eq('matter_id', matterId).order('created_at', { ascending: false }),
      supabase.from('lt_updates').select('*').eq('matter_id', matterId).order('created_at', { ascending: false }),
      supabase.from('lt_internal_notes').select('*').eq('matter_id', matterId).order('created_at', { ascending: false }),
      supabase.from('lt_documents').select('*').eq('matter_id', matterId).order('created_at', { ascending: false }),
    ]);
    setMatter(m.data as TrackerMatter);
    setMilestones((ms.data as TrackerMilestone[]) || []);
    setActions((ac.data as TrackerClientAction[]) || []);
    setUpdates((up.data as TrackerUpdate[]) || []);
    setNotes((nt.data as TrackerInternalNote[]) || []);
    setDocuments((dc.data as TrackerDocument[]) || []);
    setLoading(false);
  }, [matterId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading || !matter) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-gold" size={28} />
      </div>
    );
  }

  const triage = TRIAGE_LABELS[matter.triage_lane];
  const pendingActions = actions.filter((a) => a.status === 'pending');
  const clientDocs = documents.filter((d) => d.visibility === 'client');
  const internalDocs = documents.filter((d) => d.visibility === 'internal');
  const visibleDocs = viewMode === 'client' ? clientDocs : documents;
  const progressPct = milestones.length > 0
    ? Math.round((milestones.filter((m) => m.is_completed).length / milestones.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Back + view toggle */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-ink/60 hover:text-gold transition-colors font-body text-sm">
          <ChevronLeft size={16} />
          العودة لقائمة المتابعات
        </button>
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('client')}
            className={`px-3 py-1 rounded-md font-body text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'client' ? 'bg-white text-midnight shadow-sm' : 'text-ink/50'
            }`}
          >
            <Eye size={13} />
            واجهة العميل
          </button>
          <button
            onClick={() => setViewMode('internal')}
            className={`px-3 py-1 rounded-md font-body text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'internal' ? 'bg-white text-midnight shadow-sm' : 'text-ink/50'
            }`}
          >
            <ShieldAlert size={13} />
            واجهة المؤسسة
          </button>
        </div>
      </div>

      {/* Matter header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">{matter.title}</h2>
            <p className="font-body text-xs text-ink/50 mt-1">{matter.client_name} • {matter.matter_type}</p>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${triage.bg} ${triage.color} ${triage.border}`}>
            {triage.label}
          </span>
        </div>

        {/* Milestone progress bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <p className="font-body text-xs font-bold text-ink/60">
              {viewMode === 'client' ? 'مراحل سير العمل' : 'المراحل الداخلية'}
            </p>
            <p className="font-body text-xs text-ink/40">{progressPct}%</p>
          </div>
          <div className="flex items-center gap-1">
            {milestones.map((m, i) => {
              const isCurrent = i === matter.current_milestone_index;
              const isDone = m.is_completed;
              return (
                <div key={m.id} className="flex-1 flex items-center">
                  <div className="flex-1">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        isDone ? 'bg-emerald-500' : isCurrent ? 'bg-gold' : 'bg-gray-200'
                      }`}
                    />
                    <p className={`font-body text-[10px] mt-1.5 leading-tight ${isDone ? 'text-emerald-700 font-bold' : isCurrent ? 'text-gold font-bold' : 'text-ink/30'}`}>
                      {viewMode === 'client' ? m.client_label : m.internal_label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* LEFT: Action Center */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-midnight text-sm flex items-center gap-2">
                <Activity size={16} className="text-gold" />
                مركز مهام العميل
              </h3>
              {viewMode === 'internal' && (
                <button onClick={() => setShowAddAction(true)} className="text-gold hover:bg-gold/10 rounded-lg p-1 transition-colors">
                  <Plus size={16} />
                </button>
              )}
            </div>

            {pendingActions.length === 0 ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-4 flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
                <p className="font-body text-xs text-emerald-700">لا يوجد إجراء مطلوب منك حالياً، فريقنا يعمل.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingActions.map((a) => (
                  <div key={a.id} className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-body text-xs text-amber-900 font-bold">{a.description}</p>
                      {a.due_date && (
                        <p className="font-body text-[10px] text-amber-600 mt-0.5">موعد الإجراء: {a.due_date}</p>
                      )}
                    </div>
                    {viewMode === 'internal' && (
                      <button
                        onClick={async () => {
                          await supabase.from('lt_client_actions').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', a.id);
                          fetchAll();
                        }}
                        className="text-emerald-600 hover:bg-emerald-50 rounded p-1 transition-colors"
                        title="إنهاء الإجراء"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {viewMode === 'internal' && actions.filter((a) => a.status === 'completed').length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="font-body text-[10px] text-ink/40 mb-2">إجراءات منتهية:</p>
                {actions.filter((a) => a.status === 'completed').map((a) => (
                  <div key={a.id} className="flex items-center gap-2 py-1">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    <p className="font-body text-xs text-ink/40 line-through">{a.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Documents */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-heading font-bold text-midnight text-sm flex items-center gap-2 mb-4">
              <FileText size={16} className="text-gold" />
              {viewMode === 'client' ? 'المستندات' : 'سجل المستندات (داخلي + عميل)'}
            </h3>
            {visibleDocs.length === 0 ? (
              <p className="font-body text-xs text-ink/30 text-center py-4">لا توجد مستندات متاحة</p>
            ) : (
              <div className="space-y-2">
                {visibleDocs.map((d) => {
                  const isInternal = d.visibility === 'internal';
                  return (
                    <div key={d.id} className={`rounded-lg px-3 py-2.5 border flex items-center gap-3 ${
                      isInternal && viewMode === 'internal' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                    }`}>
                      {isInternal ? <FileWarning size={15} className="text-red-500" /> : <FileCheck size={15} className="text-emerald-600" />}
                      <div className="flex-1">
                        <p className="font-body text-xs text-midnight font-bold">{d.name}</p>
                        <p className="font-body text-[10px] text-ink/40">{d.doc_type} • {d.status}</p>
                      </div>
                      {viewMode === 'internal' && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                          isInternal ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                        }`}>
                          {isInternal ? 'داخلي' : 'عميل'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {viewMode === 'client' && internalDocs.length > 0 && (
              <p className="font-body text-[10px] text-ink/30 mt-3 text-center">
                توجد {internalDocs.length} مستندات قيد الإعداد الداخلي — ستُتاح عند اكتمالها
              </p>
            )}
          </div>
        </div>

        {/* RIGHT: Timeline + Internal */}
        <div className="space-y-4">
          {/* Sanitized update log */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-midnight text-sm flex items-center gap-2">
                <MessageSquare size={16} className="text-gold" />
                سجل التحديثات
              </h3>
              {viewMode === 'internal' && (
                <button onClick={() => setShowAddUpdate(true)} className="text-gold hover:bg-gold/10 rounded-lg p-1 transition-colors">
                  <Plus size={16} />
                </button>
              )}
            </div>
            {updates.length === 0 ? (
              <p className="font-body text-xs text-ink/30 text-center py-4">لا توجد تحديثات بعد</p>
            ) : (
              <div className="space-y-3">
                {updates.map((u) => (
                  <div key={u.id} className="relative pr-5">
                    <div className="absolute right-0 top-1.5 w-2.5 h-2.5 rounded-full bg-gold border-2 border-white" />
                    <div className="border-r-2 border-gray-100 pr-4 pb-3">
                      <p className="font-body text-xs text-midnight leading-relaxed">{u.client_message}</p>
                      <p className="font-body text-[10px] text-ink/30 mt-1">
                        {new Date(u.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                      {viewMode === 'internal' && u.internal_note && (
                        <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                          <p className="font-body text-[10px] text-red-600 font-bold mb-1 flex items-center gap-1">
                            <Lock size={10} />
                            ملاحظة داخلية (لا تُعرض للعميل):
                          </p>
                          <p className="font-body text-xs text-red-800 leading-relaxed">{u.internal_note}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Internal notes — Black Box (internal view only) */}
          {viewMode === 'internal' && (
            <div className="bg-midnight rounded-xl border border-red-300/30 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-bold text-cream text-sm flex items-center gap-2">
                  <ShieldAlert size={16} className="text-red-400" />
                  الصندوق الأسود — الملاحظات الداخلية
                </h3>
                <button onClick={() => setShowAddNote(true)} className="text-gold hover:bg-gold/10 rounded-lg p-1 transition-colors">
                  <Plus size={16} />
                </button>
              </div>

              {/* Risk gauge */}
              {notes.length > 0 && notes[0].risk_percentage !== null && (
                <div className="bg-midnight-light rounded-lg p-3 mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="font-body text-[10px] text-cream/60 flex items-center gap-1">
                      <TrendingUp size={11} />
                      تقييم المخاطر الحالي
                    </p>
                    <p className="font-heading font-bold text-lg text-red-400">{notes[0].risk_percentage}%</p>
                  </div>
                  <div className="h-2 bg-midnight-lighter rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${notes[0].risk_percentage}%`,
                        background: notes[0].risk_percentage > 60 ? '#ef4444' : notes[0].risk_percentage > 30 ? '#f59e0b' : '#10b981',
                      }}
                    />
                  </div>
                </div>
              )}

              {notes.map((n) => (
                <div key={n.id} className="bg-midnight-light rounded-lg p-3 mb-2 border border-cream/10">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 font-bold">{n.author_role}</span>
                    {n.risk_percentage !== null && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                        مخاطر {n.risk_percentage}%
                      </span>
                    )}
                  </div>
                  {n.strategy && (
                    <p className="font-body text-[10px] text-gold/80 mb-1">الاستراتيجية: {n.strategy}</p>
                  )}
                  <p className="font-body text-xs text-cream/70 leading-relaxed">{n.note_text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddAction && <AddActionModal matterId={matterId} onClose={() => setShowAddAction(false)} onSaved={fetchAll} />}
      {showAddUpdate && <AddUpdateModal matterId={matterId} onClose={() => setShowAddUpdate(false)} onSaved={fetchAll} />}
      {showAddNote && <AddNoteModal matterId={matterId} onClose={() => setShowAddNote(false)} onSaved={fetchAll} />}
    </div>
  );
}

// ============ MODALS ============

function AddActionModal({ matterId, onClose, onSaved }: { matterId: string; onClose: () => void; onSaved: () => void }) {
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!description.trim()) return;
    setSaving(true);
    await supabase.from('lt_client_actions').insert({
      matter_id: matterId,
      description: description.trim(),
      due_date: dueDate || null,
      status: 'pending',
    });
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <ModalShell title="إضافة إجراء مطلوب من العميل" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="font-body text-xs font-bold text-ink/60 mb-1.5 block">وصف الإجراء</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            autoFocus
            className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:border-gold focus:outline-none resize-none"
          />
        </div>
        <div>
          <label className="font-body text-xs font-bold text-ink/60 mb-1.5 block">تاريخ الاستحقاق</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:border-gold focus:outline-none"
          />
        </div>
      </div>
      <SaveBar onCancel={onClose} onSave={handleSave} saving={saving} disabled={!description.trim()} />
    </ModalShell>
  );
}

function AddUpdateModal({ matterId, onClose, onSaved }: { matterId: string; onClose: () => void; onSaved: () => void }) {
  const [clientMessage, setClientMessage] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [updateType, setUpdateType] = useState('progress');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!clientMessage.trim()) return;
    setSaving(true);
    await supabase.from('lt_updates').insert({
      matter_id: matterId,
      client_message: clientMessage.trim(),
      internal_note: internalNote.trim() || null,
      update_type: updateType,
    });
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <ModalShell title="إضافة تحديث للسجل" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="font-body text-xs font-bold text-emerald-700 mb-1.5 block flex items-center gap-1">
            <Eye size={12} />
            رسالة العميل (تُعرض للعميل)
          </label>
          <textarea
            value={clientMessage}
            onChange={(e) => setClientMessage(e.target.value)}
            rows={3}
            autoFocus
            className="w-full px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50/30 font-body text-sm text-midnight focus:border-gold focus:outline-none resize-none"
          />
        </div>
        <div>
          <label className="font-body text-xs font-bold text-red-700 mb-1.5 block flex items-center gap-1">
            <Lock size={12} />
            ملاحظة داخلية (لا تُعرض للعميل — اختياري)
          </label>
          <textarea
            value={internalNote}
            onChange={(e) => setInternalNote(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-red-200 bg-red-50/30 font-body text-sm text-midnight focus:border-gold focus:outline-none resize-none"
          />
        </div>
        <div>
          <label className="font-body text-xs font-bold text-ink/60 mb-1.5 block">نوع التحديث</label>
          <select
            value={updateType}
            onChange={(e) => setUpdateType(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:border-gold focus:outline-none bg-white"
          >
            <option value="progress">تقدم العمل</option>
            <option value="hearing">جلسة قضائية</option>
            <option value="document">مستند</option>
            <option value="critical">تنبيه حرج</option>
          </select>
        </div>
      </div>
      <SaveBar onCancel={onClose} onSave={handleSave} saving={saving} disabled={!clientMessage.trim()} />
    </ModalShell>
  );
}

function AddNoteModal({ matterId, onClose, onSaved }: { matterId: string; onClose: () => void; onSaved: () => void }) {
  const [risk, setRisk] = useState('');
  const [strategy, setStrategy] = useState('');
  const [noteText, setNoteText] = useState('');
  const [authorRole, setAuthorRole] = useState('مُشخّص قانوني');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    await supabase.from('lt_internal_notes').insert({
      matter_id: matterId,
      risk_percentage: risk ? parseFloat(risk) : null,
      strategy: strategy.trim() || null,
      note_text: noteText.trim(),
      author_role: authorRole,
    });
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <ModalShell title="إضافة ملاحظة داخلية (الصندوق الأسود)" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-body text-xs font-bold text-ink/60 mb-1.5 block">نسبة المخاطر (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={risk}
              onChange={(e) => setRisk(e.target.value)}
              placeholder="مثال: 65"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:border-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="font-body text-xs font-bold text-ink/60 mb-1.5 block">الدور</label>
            <select
              value={authorRole}
              onChange={(e) => setAuthorRole(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:border-gold focus:outline-none bg-white"
            >
              <option value="مُشخّص قانوني">مُشخّص قانوني</option>
              <option value="مدير نجاح العميل">مدير نجاح العميل</option>
              <option value="محامٍ شريك">محامٍ شريك</option>
            </select>
          </div>
        </div>
        <div>
          <label className="font-body text-xs font-bold text-ink/60 mb-1.5 block">الاستراتيجية</label>
          <input
            type="text"
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            placeholder="مثال: طلب أجل + طعن بالتزوير"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="font-body text-xs font-bold text-ink/60 mb-1.5 block">الملاحظة</label>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={3}
            autoFocus
            className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:border-gold focus:outline-none resize-none"
          />
        </div>
      </div>
      <SaveBar onCancel={onClose} onSave={handleSave} saving={saving} disabled={!noteText.trim()} />
    </ModalShell>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h3 className="font-heading font-bold text-midnight text-base">{title}</h3>
          <button onClick={onClose} className="text-ink/40 hover:text-ink/70 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

function SaveBar({ onCancel, onSave, saving, disabled }: { onCancel: () => void; onSave: () => void; saving: boolean; disabled: boolean }) {
  return (
    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 mt-4">
      <button onClick={onCancel} className="px-4 py-2 rounded-lg font-body text-sm text-ink/60 hover:bg-gray-100 transition-colors">
        إلغاء
      </button>
      <button
        onClick={onSave}
        disabled={saving || disabled}
        className="px-5 py-2 rounded-lg font-body text-sm font-bold bg-gold text-midnight hover:bg-gold/90 transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        حفظ
      </button>
    </div>
  );
}
