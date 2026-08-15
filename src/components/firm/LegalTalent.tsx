import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  KanbanSquare, Award, Plus, X, Loader2, Clock, AlertTriangle,
  UserCheck, ArrowLeftRight, Users, Star, TrendingUp, Send,
  ChevronDown, ShieldAlert, Zap, UserPlus,
} from 'lucide-react';
import type {
  AttorneyProfile, BoardCard, KpiScore, PeerFeedback, ClientReview,
} from '@/lib/legalTalentTypes';
import {
  COLUMNS, URGENCY_STYLES, KPI_AXES, CLASSIFICATION_STYLES,
  classifyScore, calcTotalScore,
} from '@/lib/legalTalentTypes';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type SubView = 'board' | 'scorecards';

export default function LegalTalent() {
  const [subView, setSubView] = useState<SubView>('board');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading font-bold text-midnight text-xl">هندسة العقول القانونية — Legal Talent</h2>
          <p className="font-body text-xs text-ink/50 mt-1">إدارة الموارد البشرية القانونية: لوحات المهام التفاعلية + مصفوفة تقييم الأداء</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setSubView('board')}
            className={`px-4 py-1.5 rounded-md font-body text-xs font-bold transition-all flex items-center gap-1.5 ${
              subView === 'board' ? 'bg-white text-midnight shadow-sm' : 'text-ink/50'
            }`}
          >
            <KanbanSquare size={14} />
            لوحة المهام التفاعلية
          </button>
          <button
            onClick={() => setSubView('scorecards')}
            className={`px-4 py-1.5 rounded-md font-body text-xs font-bold transition-all flex items-center gap-1.5 ${
              subView === 'scorecards' ? 'bg-white text-midnight shadow-sm' : 'text-ink/50'
            }`}
          >
            <Award size={14} />
            مصفوفة تقييم الأداء
          </button>
        </div>
      </div>

      {subView === 'board' && <TaskBoard />}
      {subView === 'scorecards' && <Scorecards />}
    </div>
  );
}

// ============ TASK BOARD ============

function TaskBoard() {
  const [cards, setCards] = useState<BoardCard[]>([]);
  const [attorneys, setAttorneys] = useState<AttorneyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewCard, setShowNewCard] = useState(false);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [c, a] = await Promise.all([
      supabase.from('lt_board_cards').select('*').order('created_at', { ascending: false }),
      supabase.from('lt_attorney_profiles').select('*'),
    ]);
    setCards((c.data as BoardCard[]) || []);
    setAttorneys((a.data as AttorneyProfile[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Escalation check: flag overdue cards
  useEffect(() => {
    if (cards.length === 0) return;
    const now = Date.now();
    const updates: Promise<unknown>[] = [];
    for (const card of cards) {
      if (!card.deadline || card.column_status === 'completed' || card.is_overdue) continue;
      const deadlineMs = new Date(card.deadline).getTime();
      const createdMs = new Date(card.created_at).getTime();
      const totalDuration = deadlineMs - createdMs;
      const elapsed = now - createdMs;
      if (card.column_status !== 'in_progress' && elapsed > totalDuration * 0.25) {
        updates.push(
          Promise.resolve(supabase.from('lt_board_cards').update({ is_overdue: true, escalation_sent: true }).eq('id', card.id)),
        );
      }
    }
    if (updates.length > 0) {
      Promise.all(updates).then(() => fetchAll());
    }
  }, [cards, fetchAll]);

  const moveCard = async (cardId: string, newColumn: string) => {
    const updates: Record<string, unknown> = { column_status: newColumn, updated_at: new Date().toISOString() };
    if (newColumn === 'completed') updates.completed_at = new Date().toISOString();
    await supabase.from('lt_board_cards').update(updates).eq('id', cardId);
    fetchAll();
  };

  const autoAssign = (card: BoardCard): AttorneyProfile | null => {
    const matching = attorneys.filter((a) => a.specialties.includes(card.specialty) && !a.disconnect_active);
    if (matching.length === 0) return null;
    return matching.reduce((min, a) => (a.active_cards_count < min.active_cards_count ? a : min), matching[0]);
  };

  const handleAssign = async (cardId: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    const best = autoAssign(card);
    if (!best) {
      alert('لا يوجد محامٍ متاح في هذا التخصص حالياً');
      return;
    }
    await supabase.from('lt_board_cards').update({
      assigned_attorney_id: best.lf_attorney_id,
      assigned_attorney_name: best.name,
      column_status: 'in_progress',
      updated_at: new Date().toISOString(),
    }).eq('id', cardId);
    await supabase.from('lt_attorney_profiles').update({
      active_cards_count: best.active_cards_count + 1,
    }).eq('id', best.id);
    fetchAll();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-gold" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <p className="font-body text-xs text-ink/50">
          {cards.length} بطاقة نشطة • {attorneys.length} محامٍ متاح
        </p>
        <button
          onClick={() => setShowNewCard(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold text-midnight font-body text-xs font-bold hover:bg-gold/90 transition-colors"
        >
          <Plus size={14} />
          طلب داخلي جديد
        </button>
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-5 gap-3 min-h-[500px]">
        {COLUMNS.map((col) => {
          const colCards = cards.filter((c) => c.column_status === col.id);
          const isDragOver = dragOverColumn === col.id;
          return (
            <div
              key={col.id}
              className={`rounded-xl bg-gray-50 border border-gray-200 flex flex-col transition-all ${isDragOver ? 'ring-2 ring-gold/40' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOverColumn(col.id); }}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverColumn(null);
                if (draggedCardId) moveCard(draggedCardId, col.id);
                setDraggedCardId(null);
              }}
            >
              <div className={`px-3 py-2.5 border-t-4 ${col.color} rounded-t-xl`}>
                <p className="font-heading font-bold text-midnight text-xs">{col.label}</p>
                <p className="font-body text-[10px] text-ink/40 mt-0.5">{colCards.length} بطاقة</p>
              </div>
              <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[600px]">
                {colCards.map((card) => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={() => setDraggedCardId(card.id)}
                    onDragEnd={() => { setDraggedCardId(null); setDragOverColumn(null); }}
                    className={`bg-white rounded-lg border p-3 cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${
                      card.is_overdue ? 'border-red-300 bg-red-50/30' : 'border-gray-200'
                    }`}
                  >
                    {card.is_overdue && (
                      <div className="flex items-center gap-1 mb-1.5">
                        <AlertTriangle size={11} className="text-red-500" />
                        <span className="font-body text-[9px] text-red-600 font-bold">Overdue Risk — تصعيد آلي</span>
                      </div>
                    )}
                    <p className="font-body text-xs text-midnight font-bold leading-snug">{card.title}</p>
                    {card.description && (
                      <p className="font-body text-[10px] text-ink/50 mt-1 leading-relaxed line-clamp-2">{card.description}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${URGENCY_STYLES[card.urgency].bg} ${URGENCY_STYLES[card.urgency].text}`}>
                        {URGENCY_STYLES[card.urgency].label}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold">{card.specialty}</span>
                    </div>
                    {card.deadline && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <Clock size={10} className="text-ink/40" />
                        <p className="font-body text-[9px] text-ink/40">
                          {new Date(card.deadline).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    )}
                    {card.assigned_attorney_name && (
                      <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-gray-100">
                        <UserCheck size={10} className="text-gold" />
                        <p className="font-body text-[9px] text-ink/60">{card.assigned_attorney_name}</p>
                      </div>
                    )}
                    {!card.assigned_attorney_name && card.column_status === 'incoming' && (
                      <button
                        onClick={() => handleAssign(card.id)}
                        className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"
                      >
                        <Zap size={11} />
                        توزيع ذكي آلي
                      </button>
                    )}
                  </div>
                ))}
                {colCards.length === 0 && (
                  <p className="font-body text-[10px] text-ink/20 text-center py-6">لا توجد بطاقات</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Load balancing panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-heading font-bold text-midnight text-sm flex items-center gap-2 mb-3">
          <Users size={15} className="text-gold" />
          موازنة الأحمال — المحامون المتاحون
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {attorneys.map((a) => (
            <div key={a.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex items-center justify-between mb-1">
                <p className="font-body text-xs text-midnight font-bold">{a.name}</p>
                {a.disconnect_active && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-bold">إجازة</span>
                )}
              </div>
              <p className="font-body text-[10px] text-ink/40">{a.current_department}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${a.active_cards_count > 3 ? 'bg-red-500' : a.active_cards_count > 1 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(a.active_cards_count * 25, 100)}%` }}
                  />
                </div>
                <p className="font-body text-[10px] text-ink/50 font-bold">{a.active_cards_count}</p>
              </div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {a.specialties.map((s) => (
                  <span key={s} className="text-[8px] px-1 py-0.5 rounded bg-gray-100 text-gray-500">{s}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showNewCard && <NewCardModal onClose={() => setShowNewCard(false)} onSaved={fetchAll} attorneys={attorneys} />}
    </div>
  );
}

function NewCardModal({ onClose, onSaved, attorneys }: { onClose: () => void; onSaved: () => void; attorneys: AttorneyProfile[] }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [specialty, setSpecialty] = useState('شركات');
  const [urgency, setUrgency] = useState<'normal' | 'urgent' | 'critical'>('normal');
  const [deadline, setDeadline] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await supabase.from('lt_board_cards').insert({
      title: title.trim(),
      description: description.trim() || null,
      column_status: 'incoming',
      specialty,
      urgency,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      requested_by: requestedBy.trim() || null,
    });
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <ModalShell title="طلب داخلي جديد" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="font-body text-xs font-bold text-ink/60 mb-1.5 block">عنوان الطلب</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="font-body text-xs font-bold text-ink/60 mb-1.5 block">الوصف</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:border-gold focus:outline-none resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-body text-xs font-bold text-ink/60 mb-1.5 block">التخصص</label>
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:border-gold focus:outline-none bg-white"
            >
              {['شركات', 'عمالي', 'تجاري', 'جنائي', 'عقود', 'تحكيم', 'تأسيس'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-body text-xs font-bold text-ink/60 mb-1.5 block">الاستعجال</label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value as 'normal' | 'urgent' | 'critical')}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:border-gold focus:outline-none bg-white"
            >
              <option value="normal">عادي</option>
              <option value="urgent">عاجل</option>
              <option value="critical">طوارئ</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-body text-xs font-bold text-ink/60 mb-1.5 block">الموعد النهائي (SLA)</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:border-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="font-body text-xs font-bold text-ink/60 mb-1.5 block">طلب بواسطة</label>
            <input
              value={requestedBy}
              onChange={(e) => setRequestedBy(e.target.value)}
              placeholder="اسم المحامي"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:border-gold focus:outline-none"
            />
          </div>
        </div>
      </div>
      <SaveBar onCancel={onClose} onSave={handleSave} saving={saving} disabled={!title.trim()} />
    </ModalShell>
  );
}

// ============ SCORECARDS ============

function Scorecards() {
  const [scores, setScores] = useState<KpiScore[]>([]);
  const [attorneys, setAttorneys] = useState<AttorneyProfile[]>([]);
  const [peerFeedback, setPeerFeedback] = useState<PeerFeedback[]>([]);
  const [clientReviews, setClientReviews] = useState<ClientReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewScore, setShowNewScore] = useState(false);
  const [showPeerFeedback, setShowPeerFeedback] = useState(false);
  const [showClientReview, setShowClientReview] = useState(false);
  const [expandedAttorney, setExpandedAttorney] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [s, a, p, cr] = await Promise.all([
      supabase.from('lt_kpi_scores').select('*').order('total_score', { ascending: false }),
      supabase.from('lt_attorney_profiles').select('*'),
      supabase.from('lt_peer_feedback').select('*').order('created_at', { ascending: false }),
      supabase.from('lt_client_reviews').select('*').order('created_at', { ascending: false }),
    ]);
    setScores((s.data as KpiScore[]) || []);
    setAttorneys((a.data as AttorneyProfile[]) || []);
    setPeerFeedback((p.data as PeerFeedback[]) || []);
    setClientReviews((cr.data as ClientReview[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-gold" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setShowNewScore(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold text-midnight font-body text-xs font-bold hover:bg-gold/90 transition-colors"
        >
          <Plus size={14} />
          تقييم ربع سنوي جديد
        </button>
        <button
          onClick={() => setShowPeerFeedback(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-midnight font-body text-xs font-bold hover:border-gold/40 transition-colors"
        >
          <Users size={14} />
          تقييم تبادلي 360°
        </button>
        <button
          onClick={() => setShowClientReview(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-midnight font-body text-xs font-bold hover:border-gold/40 transition-colors"
        >
          <Star size={14} />
          تقييم عميل
        </button>
      </div>

      {/* Scorecards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {scores.map((score) => {
          const cls = CLASSIFICATION_STYLES[score.classification];
          const isExpanded = expandedAttorney === score.attorney_name;
          const peerFor = peerFeedback.filter((p) => p.reviewee_name === score.attorney_name);
          const reviewsFor = clientReviews.filter((r) => r.attorney_name === score.attorney_name);
          return (
            <div key={score.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-heading font-bold text-midnight text-sm">{score.attorney_name}</h3>
                    <p className="font-body text-[10px] text-ink/40 mt-0.5">{score.quarter}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${cls.bg} ${cls.text} ${cls.border}`}>
                    {cls.label}
                  </span>
                </div>
                {/* Total score gauge */}
                <div className="mt-3 flex items-center gap-3">
                  <div className="relative w-14 h-14 flex-shrink-0">
                    <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                      <circle cx="28" cy="28" r="24" fill="none" stroke="#e5e7eb" strokeWidth="5" />
                      <circle
                        cx="28" cy="28" r="24" fill="none" strokeWidth="5" strokeLinecap="round"
                        stroke={score.total_score >= 90 ? '#10b981' : score.total_score >= 75 ? '#3b82f6' : '#ef4444'}
                        strokeDasharray={`${(score.total_score / 100) * 150.8} 150.8`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-heading font-bold text-midnight text-sm">{score.total_score}</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {KPI_AXES.map((axis) => {
                      const val = score[axis.key];
                      return (
                        <div key={axis.key}>
                          <div className="flex items-center justify-between">
                            <p className="font-body text-[9px] text-ink/50">{axis.label} ({axis.weight}%)</p>
                            <p className="font-body text-[9px] text-midnight font-bold">{val}</p>
                          </div>
                          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${axis.color}`} style={{ width: `${val}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Expand toggle */}
              <button
                onClick={() => setExpandedAttorney(isExpanded ? null : score.attorney_name)}
                className="w-full flex items-center justify-center gap-1 py-2 text-ink/50 hover:text-gold hover:bg-gold/5 transition-colors font-body text-[10px] font-bold"
              >
                <ChevronDown size={12} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                {isExpanded ? 'إخفاء التفاصيل' : 'عرض التقييمات التفصيلية'}
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-3">
                  {/* Peer feedback */}
                  <div>
                    <p className="font-body text-[10px] font-bold text-ink/60 mb-1.5 flex items-center gap-1">
                      <Users size={11} />
                      التقييم التبادلي (360°)
                    </p>
                    {peerFor.length === 0 ? (
                      <p className="font-body text-[10px] text-ink/30">لا يوجد تقييم تبادلي</p>
                    ) : (
                      <div className="space-y-1.5">
                        {peerFor.map((p) => (
                          <div key={p.id} className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                            <div className="flex items-center justify-between mb-0.5">
                              <p className="font-body text-[10px] text-midnight font-bold">{p.reviewer_name}</p>
                              <div className="flex gap-2">
                                <span className="text-[9px] text-ink/50">تعاون: {p.collaboration_score}</span>
                                <span className="text-[9px] text-ink/50">معرفة: {p.knowledge_sharing_score}</span>
                              </div>
                            </div>
                            {p.comment && <p className="font-body text-[10px] text-ink/50 leading-relaxed">{p.comment}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Client reviews */}
                  <div>
                    <p className="font-body text-[10px] font-bold text-ink/60 mb-1.5 flex items-center gap-1">
                      <Star size={11} />
                      تقييمات العملاء
                    </p>
                    {reviewsFor.length === 0 ? (
                      <p className="font-body text-[10px] text-ink/30">لا توجد تقييمات عملاء</p>
                    ) : (
                      <div className="space-y-1.5">
                        {reviewsFor.map((r) => (
                          <div key={r.id} className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                            <div className="flex items-center justify-between mb-0.5">
                              <p className="font-body text-[10px] text-midnight font-bold">{r.client_name}</p>
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} size={9} className={i < Math.round(r.nps_score / 2) ? 'text-gold fill-gold' : 'text-gray-200'} />
                                ))}
                              </div>
                            </div>
                            <div className="flex gap-2 mb-0.5">
                              <span className="text-[9px] text-ink/50">وضوح: {r.clarity_score}</span>
                              <span className="text-[9px] text-ink/50">تجاوب: {r.responsiveness_score}</span>
                              <span className="text-[9px] text-ink/50">احترافية: {r.professionalism_score}</span>
                            </div>
                            {r.comment && <p className="font-body text-[10px] text-ink/50 leading-relaxed">{r.comment}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {score.notes && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                      <p className="font-body text-[10px] text-blue-700 leading-relaxed">{score.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Rewards matrix */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-heading font-bold text-midnight text-sm flex items-center gap-2 mb-3">
          <TrendingUp size={15} className="text-gold" />
          نظام احتساب المكافآت والترقيات
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2 px-3 font-body text-[10px] font-bold text-ink/50">مجموع الدرجات</th>
                <th className="py-2 px-3 font-body text-[10px] font-bold text-ink/50">التصنيف</th>
                <th className="py-2 px-3 font-body text-[10px] font-bold text-ink/50">الأثر الإداري والمالي</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2.5 px-3 font-body text-xs text-midnight font-bold">90% - 100%</td>
                <td className="py-2.5 px-3"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">متميز</span></td>
                <td className="py-2.5 px-3 font-body text-xs text-ink/60">مكافأة تميز، أولولية في إسناد القضايا الكبرى، ترشيح للترقية</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2.5 px-3 font-body text-xs text-midnight font-bold">75% - 89%</td>
                <td className="py-2.5 px-3"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">مستوفٍ للمعايير</span></td>
                <td className="py-2.5 px-3 font-body text-xs text-ink/60">استحقاق المكافأة الدورية الطبيعية</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-body text-xs text-midnight font-bold">أقل من 75%</td>
                <td className="py-2.5 px-3"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">يحتاج تطوير</span></td>
                <td className="py-2.5 px-3 font-body text-xs text-ink/60">برنامج توجيه مكثف + إعادة توزيع الأعباء</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {showNewScore && <NewScoreModal onClose={() => setShowNewScore(false)} onSaved={fetchAll} attorneys={attorneys} />}
      {showPeerFeedback && <PeerFeedbackModal onClose={() => setShowPeerFeedback(false)} onSaved={fetchAll} attorneys={attorneys} />}
      {showClientReview && <ClientReviewModal onClose={() => setShowClientReview(false)} onSaved={fetchAll} attorneys={attorneys} />}
    </div>
  );
}

function NewScoreModal({ onClose, onSaved, attorneys }: { onClose: () => void; onSaved: () => void; attorneys: AttorneyProfile[] }) {
  const [attorneyName, setAttorneyName] = useState(attorneys[0]?.name || '');
  const [quarter, setQuarter] = useState('Q3-2026');
  const [quality, setQuality] = useState(80);
  const [efficiency, setEfficiency] = useState(75);
  const [clientExp, setClientExp] = useState(80);
  const [institutional, setInstitutional] = useState(70);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const total = calcTotalScore(quality, efficiency, clientExp, institutional);
  const cls = CLASSIFICATION_STYLES[classifyScore(total)];

  const handleSave = async () => {
    setSaving(true);
    const att = attorneys.find((a) => a.name === attorneyName);
    await supabase.from('lt_kpi_scores').insert({
      attorney_id: att?.lf_attorney_id || null,
      attorney_name: attorneyName,
      quarter,
      quality_score: quality,
      efficiency_score: efficiency,
      client_experience_score: clientExp,
      institutional_score: institutional,
      total_score: total,
      classification: classifyScore(total),
      notes: notes.trim() || null,
    });
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <ModalShell title="تقييم ربع سنوي جديد" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-body text-xs font-bold text-ink/60 mb-1.5 block">المحامي</label>
            <select
              value={attorneyName}
              onChange={(e) => setAttorneyName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:border-gold focus:outline-none bg-white"
            >
              {attorneys.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="font-body text-xs font-bold text-ink/60 mb-1.5 block">الربع</label>
            <input
              value={quarter}
              onChange={(e) => setQuarter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:border-gold focus:outline-none"
            />
          </div>
        </div>

        {/* Sliders */}
        {KPI_AXES.map((axis) => {
          const val = axis.key === 'quality_score' ? quality
            : axis.key === 'efficiency_score' ? efficiency
            : axis.key === 'client_experience_score' ? clientExp
            : institutional;
          const setVal = axis.key === 'quality_score' ? setQuality
            : axis.key === 'efficiency_score' ? setEfficiency
            : axis.key === 'client_experience_score' ? setClientExp
            : setInstitutional;
          return (
            <div key={axis.key}>
              <div className="flex items-center justify-between mb-1">
                <label className="font-body text-xs font-bold text-ink/60">{axis.label} ({axis.weight}%)</label>
                <span className="font-body text-xs font-bold text-midnight">{val}</span>
              </div>
              <input
                type="range" min="0" max="100" value={val}
                onChange={(e) => setVal(Number(e.target.value))}
                className="w-full accent-gold"
              />
              <p className="font-body text-[9px] text-ink/30 mt-0.5">{axis.description}</p>
            </div>
          );
        })}

        {/* Live preview */}
        <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
          <div>
            <p className="font-body text-[10px] text-ink/50">المجموع المرجح</p>
            <p className="font-heading font-bold text-2xl text-midnight">{total}</p>
          </div>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${cls.bg} ${cls.text} ${cls.border}`}>{cls.label}</span>
        </div>

        <div>
          <label className="font-body text-xs font-bold text-ink/60 mb-1.5 block">ملاحظات (اختياري)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:border-gold focus:outline-none resize-none"
          />
        </div>
      </div>
      <SaveBar onCancel={onClose} onSave={handleSave} saving={saving} disabled={!attorneyName} />
    </ModalShell>
  );
}

function PeerFeedbackModal({ onClose, onSaved, attorneys }: { onClose: () => void; onSaved: () => void; attorneys: AttorneyProfile[] }) {
  const [reviewerName, setReviewerName] = useState(attorneys[0]?.name || '');
  const [revieweeName, setRevieweeName] = useState(attorneys[1]?.name || '');
  const [collaboration, setCollaboration] = useState(80);
  const [knowledge, setKnowledge] = useState(80);
  const [comment, setComment] = useState('');
  const [quarter, setQuarter] = useState('Q3-2026');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (reviewerName === revieweeName) return;
    setSaving(true);
    const reviewer = attorneys.find((a) => a.name === reviewerName);
    const reviewee = attorneys.find((a) => a.name === revieweeName);
    await supabase.from('lt_peer_feedback').insert({
      reviewer_id: reviewer?.lf_attorney_id || null,
      reviewer_name: reviewerName,
      reviewee_id: reviewee?.lf_attorney_id || null,
      reviewee_name: revieweeName,
      collaboration_score: collaboration,
      knowledge_sharing_score: knowledge,
      comment: comment.trim() || null,
      quarter,
    });
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <ModalShell title="تقييم تبادلي 360°" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-body text-xs font-bold text-ink/60 mb-1.5 block">المُقيّم</label>
            <select value={reviewerName} onChange={(e) => setReviewerName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:border-gold focus:outline-none bg-white">
              {attorneys.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="font-body text-xs font-bold text-ink/60 mb-1.5 block">المُقيَّم</label>
            <select value={revieweeName} onChange={(e) => setRevieweeName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:border-gold focus:outline-none bg-white">
              {attorneys.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
            </select>
          </div>
        </div>
        {reviewerName === revieweeName && (
          <p className="font-body text-xs text-red-600">لا يمكن تقييم النفس</p>
        )}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-body text-xs font-bold text-ink/60">التعاون</label>
            <span className="font-body text-xs font-bold text-midnight">{collaboration}</span>
          </div>
          <input type="range" min="0" max="100" value={collaboration} onChange={(e) => setCollaboration(Number(e.target.value))} className="w-full accent-gold" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-body text-xs font-bold text-ink/60">نقل المعرفة</label>
            <span className="font-body text-xs font-bold text-midnight">{knowledge}</span>
          </div>
          <input type="range" min="0" max="100" value={knowledge} onChange={(e) => setKnowledge(Number(e.target.value))} className="w-full accent-gold" />
        </div>
        <div>
          <label className="font-body text-xs font-bold text-ink/60 mb-1.5 block">تعليق</label>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:border-gold focus:outline-none resize-none" />
        </div>
      </div>
      <SaveBar onCancel={onClose} onSave={handleSave} saving={saving} disabled={reviewerName === revieweeName} />
    </ModalShell>
  );
}

function ClientReviewModal({ onClose, onSaved, attorneys }: { onClose: () => void; onSaved: () => void; attorneys: AttorneyProfile[] }) {
  const [attorneyName, setAttorneyName] = useState(attorneys[0]?.name || '');
  const [clientName, setClientName] = useState('');
  const [clarity, setClarity] = useState(85);
  const [responsiveness, setResponsiveness] = useState(80);
  const [professionalism, setProfessionalism] = useState(85);
  const [nps, setNps] = useState(8);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const att = attorneys.find((a) => a.name === attorneyName);
    await supabase.from('lt_client_reviews').insert({
      attorney_id: att?.lf_attorney_id || null,
      attorney_name: attorneyName,
      client_name: clientName.trim() || null,
      clarity_score: clarity,
      responsiveness_score: responsiveness,
      professionalism_score: professionalism,
      nps_score: nps,
      comment: comment.trim() || null,
    });
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <ModalShell title="تقييم عميل لمحامٍ" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-body text-xs font-bold text-ink/60 mb-1.5 block">المحامي</label>
            <select value={attorneyName} onChange={(e) => setAttorneyName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:border-gold focus:outline-none bg-white">
              {attorneys.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="font-body text-xs font-bold text-ink/60 mb-1.5 block">اسم العميل</label>
            <input value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:border-gold focus:outline-none" />
          </div>
        </div>
        {[
          { label: 'وضوح الشرح', val: clarity, set: setClarity },
          { label: 'سرعة التجاوب', val: responsiveness, set: setResponsiveness },
          { label: 'الاحترافية', val: professionalism, set: setProfessionalism },
        ].map((s) => (
          <div key={s.label}>
            <div className="flex items-center justify-between mb-1">
              <label className="font-body text-xs font-bold text-ink/60">{s.label}</label>
              <span className="font-body text-xs font-bold text-midnight">{s.val}</span>
            </div>
            <input type="range" min="0" max="100" value={s.val} onChange={(e) => s.set(Number(e.target.value))} className="w-full accent-gold" />
          </div>
        ))}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-body text-xs font-bold text-ink/60">درجة NPS (0-10)</label>
            <span className="font-body text-xs font-bold text-midnight">{nps}</span>
          </div>
          <input type="range" min="0" max="10" value={nps} onChange={(e) => setNps(Number(e.target.value))} className="w-full accent-gold" />
        </div>
        <div>
          <label className="font-body text-xs font-bold text-ink/60 mb-1.5 block">تعليق</label>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:border-gold focus:outline-none resize-none" />
        </div>
      </div>
      <SaveBar onCancel={onClose} onSave={handleSave} saving={saving} disabled={!attorneyName} />
    </ModalShell>
  );
}

// ============ SHARED ============

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
