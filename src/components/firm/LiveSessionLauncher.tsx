import { useState, useCallback, useRef, useEffect } from 'react';
import { lazy, Suspense } from 'react';
import {
  PlayCircle, Loader2, Video, Users, FileText, Calendar,
  Shield, Lock, Mic, MessageSquare, Eye, Hand,
  Plus, X, Upload, Clock, Send, Copy, CheckCircle2, Mail,
  Link2, Trash2, ChevronRight,
} from 'lucide-react';
import { supabase, formatDate } from '@/lib/financeUtils';
import type { Meeting, MeetingParticipant } from '@/lib/firmTypes';

const LiveMeetingRoom = lazy(() => import('./LiveMeetingRoom'));

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface SessionContext {
  title: string;
  subtitle: string;
  contextType: 'investigation' | 'arbitration' | 'arbitration_hub' | 'dispute';
  contextId: string;
  participants: { name: string; role: string }[];
  documents: string[];
}

interface CreatedSession {
  meeting: Meeting;
  dbParticipants: MeetingParticipant[];
}

interface SessionCard {
  id: string;
  title: string;
  date: string | null;
  status: string;
  participantNames: string[];
  documents: string[];
}

/** A scheduled meeting row fetched from lf_meetings with joined counts. */
interface ScheduledMeeting {
  id: string;
  title: string;
  scheduled_date: string;
  duration_minutes: number;
  platform: string;
  meeting_url: string | null;
  agenda: string | null;
  status: string;
  participant_count: number;
  document_count: number;
  platform_label: string;
}

/** A participant being edited in the scheduling modal. */
interface EditableParticipant {
  name: string;
  role: string;
  email: string;
}

/** A file staged for upload (not yet persisted). */
interface StagedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
}

/** Result returned after creating a scheduled session, for the success view. */
interface CreatedScheduledResult {
  meetingId: string;
  joinUrl: string;
  title: string;
  scheduledDate: string;
  platform: string;
  invited: { name: string; email: string }[];
  documentCount: number;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const PLATFORMS = [
  { value: 'Hawari Secure Room', label: 'غرفة حواري الآمنة' },
  { value: 'Zoom', label: 'Zoom' },
  { value: 'Teams', label: 'Microsoft Teams' },
  { value: 'Custom', label: 'مخصص' },
] as const;

const DURATIONS = [30, 60, 90, 120] as const;

const STORAGE_BUCKET = 'meeting-documents';

function platformLabel(value: string): string {
  return PLATFORMS.find((p) => p.value === value)?.label ?? value;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} ب`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ك.ب`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function fileIconForType(type: string): string {
  if (type.startsWith('image/')) return '🖼️';
  if (type.includes('pdf')) return '📄';
  if (type.includes('word') || type.includes('docx')) return '📝';
  if (type.includes('sheet') || type.includes('xlsx') || type.includes('excel')) return '📊';
  if (type.includes('presentation') || type.includes('pptx')) return '📽️';
  if (type.startsWith('video/')) return '🎬';
  if (type.startsWith('audio/')) return '🎵';
  return '📎';
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function LiveSessionLauncher({
  sessions,
  onCreateSession,
  sessionLabel,
  contextType,
}: {
  sessions: SessionCard[];
  onCreateSession: (contextId: string) => SessionContext | null;
  sessionLabel: string;
  contextType: 'investigation' | 'arbitration' | 'arbitration_hub' | 'dispute';
}) {
  const [activeSession, setActiveSession] = useState<CreatedSession | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Scheduled sessions (from DB)
  const [scheduled, setScheduled] = useState<ScheduledMeeting[]>([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);

  // Scheduling modal state
  const [scheduleModalFor, setScheduleModalFor] = useState<SessionCard | null>(null);
  const [createdResult, setCreatedResult] = useState<CreatedScheduledResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch scheduled meetings on mount
  const fetchScheduled = useCallback(async () => {
    setLoadingScheduled(true);
    try {
      const { data, error: err } = await supabase
        .from('lf_meetings')
        .select(
          'id, title, scheduled_date, duration_minutes, platform, meeting_url, agenda, status'
        )
        .eq('status', 'مجدولة')
        .eq('context_type', contextType)
        .order('scheduled_date', { ascending: true });

      if (err || !data) {
        setScheduled([]);
        setLoadingScheduled(false);
        return;
      }

      const meetings = data as Meeting[];
      const enriched: ScheduledMeeting[] = [];

      for (const m of meetings) {
        const [{ count: pCount }, { count: dCount }] = await Promise.all([
          supabase
            .from('lf_meeting_participants')
            .select('id', { count: 'exact', head: true })
            .eq('meeting_id', m.id),
          supabase
            .from('lf_meeting_documents')
            .select('id', { count: 'exact', head: true })
            .eq('meeting_id', m.id),
        ]);

        enriched.push({
          id: m.id,
          title: m.title,
          scheduled_date: m.scheduled_date,
          duration_minutes: m.duration_minutes,
          platform: m.platform,
          meeting_url: m.meeting_url,
          agenda: m.agenda,
          status: m.status,
          participant_count: pCount ?? 0,
          document_count: dCount ?? 0,
          platform_label: platformLabel(m.platform),
        });
      }

      setScheduled(enriched);
    } catch {
      setScheduled([]);
    } finally {
      setLoadingScheduled(false);
    }
  }, [sessionLabel, contextType]);

  useEffect(() => {
    fetchScheduled();
  }, [fetchScheduled]);

  /* ---------------- Instant session logic (existing) --------------- */

  const startSession = useCallback(async (sessionId: string) => {
    setCreating(true);
    setError(null);
    try {
      const ctx = onCreateSession(sessionId);
      if (!ctx) {
        setError('تعذر إنشاء الجلسة — تأكد من اكتمال البيانات');
        setCreating(false);
        return;
      }

      const meetingPayload = {
        title: ctx.title,
        meeting_type: 'مرئية',
        scheduled_date: new Date().toISOString(),
        duration_minutes: 120,
        platform: 'Hawari Secure Room',
        meeting_url: null,
        organizer_id: null,
        agenda: ctx.subtitle,
        participants: ctx.participants.map((p) => p.name),
        shared_documents: ctx.documents,
        status: 'منعقدة',
        language: 'العربية',
        is_internal: true,
        max_participants: 50,
        privilege_mode: ctx.contextType === 'arbitration',
        recording_enabled: ctx.contextType !== 'arbitration',
        context_type: ctx.contextType,
        context_id: ctx.contextId,
      };

      const { data: meetingData, error: meetingErr } = await supabase
        .from('lf_meetings')
        .insert(meetingPayload)
        .select()
        .single();

      if (meetingErr || !meetingData) {
        setError('فشل إنشاء الجلسة في قاعدة البيانات');
        setCreating(false);
        return;
      }

      const meeting = meetingData as Meeting;

      let dbParticipants: MeetingParticipant[] = [];
      if (ctx.participants.length > 0) {
        const partInserts = ctx.participants.map((p, i) => ({
          meeting_id: meeting.id,
          name: p.name,
          role: p.role,
          is_host: i === 0,
          join_status: 'joined',
          joined_at: new Date().toISOString(),
        }));
        const { data: partData } = await supabase
          .from('lf_meeting_participants')
          .insert(partInserts)
          .select('*');
        dbParticipants = (partData as MeetingParticipant[]) || [];
      }

      await supabase.from('lf_meeting_chat_messages').insert({
        meeting_id: meeting.id,
        sender_name: 'النظام',
        sender_role: 'النظام',
        message_text: `بدأت الجلسة: ${ctx.title}`,
        is_system: true,
      });

      setActiveSession({ meeting, dbParticipants });
      setCreating(false);
    } catch {
      setError('حدث خطأ غير متوقع');
      setCreating(false);
    }
  }, [onCreateSession]);

  /* ---------- Start a scheduled meeting instantly (Join/Start) ------ */

  const startScheduledNow = useCallback(async (m: ScheduledMeeting) => {
    setCreating(true);
    setError(null);
    try {
      // Flip status to active
      const { error: updErr } = await supabase
        .from('lf_meetings')
        .update({ status: 'منعقدة' })
        .eq('id', m.id);
      if (updErr) {
        setError('تعذر بدء الجلسة المجدولة');
        setCreating(false);
        return;
      }

      const { data: meetingData } = await supabase
        .from('lf_meetings')
        .select('*')
        .eq('id', m.id)
        .single();
      const meeting = meetingData as Meeting;

      const { data: partData } = await supabase
        .from('lf_meeting_participants')
        .select('*')
        .eq('meeting_id', m.id);
      const dbParticipants = (partData as MeetingParticipant[]) || [];

      await supabase.from('lf_meeting_chat_messages').insert({
        meeting_id: m.id,
        sender_name: 'النظام',
        sender_role: 'النظام',
        message_text: `بدأت الجلسة المجدولة: ${m.title}`,
        is_system: true,
      });

      setActiveSession({ meeting, dbParticipants });
      setCreating(false);
      // Refresh the scheduled list
      fetchScheduled();
    } catch {
      setError('حدث خطأ غير متوقع أثناء بدء الجلسة المجدولة');
      setCreating(false);
    }
  }, [fetchScheduled]);

  /* ------------------ Active meeting room (existing) --------------- */

  if (activeSession) {
    return (
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="text-gold animate-spin" />
          </div>
        }
      >
        <LiveMeetingRoom
          meeting={activeSession.meeting}
          participants={activeSession.dbParticipants}
          onLeave={() => {
            supabase
              .from('lf_meetings')
              .update({ status: 'منتهية' })
              .eq('id', activeSession.meeting.id);
            setActiveSession(null);
            fetchScheduled();
          }}
        />
      </Suspense>
    );
  }

  /* ----------------------- Success view (post-schedule) ------------- */

  if (createdResult) {
    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-l from-midnight to-midnight-light rounded-xl p-6 text-cream">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center">
              <CheckCircle2 size={26} className="text-gold" />
            </div>
            <div>
              <p className="font-heading font-bold text-gold text-base">تم إنشاء الجلسة المجدولة</p>
              <p className="font-body text-xs text-cream/70">
                {createdResult.title} — {formatDate(createdResult.scheduledDate)} {formatTime(createdResult.scheduledDate)}
              </p>
            </div>
          </div>

          {/* Join link */}
          <div className="bg-white/5 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Link2 size={14} className="text-gold" />
              <p className="font-body text-xs text-cream/70">رابط الانضمام</p>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-body text-xs text-cream bg-black/30 rounded px-3 py-2 truncate" dir="ltr">
                {createdResult.joinUrl}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(createdResult.joinUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-gold text-midnight rounded-lg font-body text-xs font-bold hover:bg-gold/90 transition-colors"
              >
                {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                {copied ? 'تم النسخ' : 'نسخ الرابط'}
              </button>
            </div>
          </div>

          {/* Invited list */}
          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Mail size={14} className="text-gold" />
              <p className="font-body text-xs text-cream/70">
                المدعوون ({createdResult.invited.length})
              </p>
            </div>
            {createdResult.invited.length === 0 ? (
              <p className="font-body text-xs text-cream/50">لم يتم إرسال دعوات بريدية</p>
            ) : (
              <ul className="space-y-2">
                {createdResult.invited.map((p, i) => (
                  <li key={i} className="flex items-center justify-between bg-black/20 rounded px-3 py-2">
                    <span className="font-body text-xs text-cream">{p.name}</span>
                    <span className="font-body text-[10px] text-cream/60" dir="ltr">{p.email}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex items-center gap-2 text-cream/50">
              <FileText size={12} />
              <span className="font-body text-[10px]">{createdResult.documentCount} مستند مرفق كبنود جدول</span>
            </div>
          </div>

          <div className="flex gap-2 mt-5">
            <button
              onClick={() => {
                setCreatedResult(null);
                setScheduleModalFor(null);
                fetchScheduled();
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors"
            >
              <CheckCircle2 size={16} />
              تم
            </button>
            <button
              onClick={() => setCreatedResult(null)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 text-cream rounded-lg font-body text-sm font-bold hover:bg-white/20 transition-colors"
            >
              جدولة جلسة أخرى
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ----------------------- Scheduling modal ------------------------ */

  if (scheduleModalFor) {
    return (
      <ScheduleModal
        card={scheduleModalFor}
        sessionLabel={sessionLabel}
        contextType={contextType}
        onCreateSession={onCreateSession}
        onClose={() => setScheduleModalFor(null)}
        onSuccess={(r) => setCreatedResult(r)}
      />
    );
  }

  /* ------------------------- Main render ---------------------------- */

  return (
    <div className="space-y-6">
      {/* Feature banner */}
      <div className="bg-gradient-to-l from-midnight to-midnight-light rounded-xl p-5 text-cream">
        <div className="flex items-center gap-2 mb-2">
          <PlayCircle size={18} className="text-gold" />
          <p className="font-heading font-bold text-gold text-sm">{sessionLabel} — Live Session</p>
        </div>
        <p className="font-body text-[11px] text-cream/70 leading-relaxed mb-3">
          غرفة تفاعلية متكاملة لجلسات الاستماع والمداولة: رؤية جميع الأطراف، تحكم كامل بالميكروفون والكاميرا، عرض المستندات بكافة الصيغ، دردشة كتابية لحظية، رفع اليد، إخفاء الوجه، وتثبيت المتحدث الرئيسي. يمكنك بدء جلسة فورية أو جدولة جلسة مستقبلية مع إرسال الدعوات.
        </p>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {[
            { icon: Video, label: 'فيديو مباشر' },
            { icon: Mic, label: 'تحكم بالمايك' },
            { icon: FileText, label: 'عرض المستندات' },
            { icon: MessageSquare, label: 'دردشة لحظية' },
            { icon: Hand, label: 'رفع اليد' },
            { icon: Eye, label: 'إخفاء/إظهار' },
          ].map((f, i) => (
            <div key={i} className="flex flex-col items-center gap-1 bg-white/5 rounded-lg px-2 py-2">
              <f.icon size={16} className="text-gold/80" />
              <span className="font-body text-[9px] text-cream/60 text-center">{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <p className="font-body text-xs text-red-700">{error}</p>
        </div>
      )}

      {/* Scheduled sessions section */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={16} className="text-gold" />
          <h3 className="font-heading font-bold text-midnight text-sm">الجلسات المجدولة</h3>
          <button
            onClick={fetchScheduled}
            disabled={loadingScheduled}
            className="mr-auto font-body text-[10px] text-ink/50 hover:text-gold transition-colors"
          >
            {loadingScheduled ? '...تحديث' : 'تحديث'}
          </button>
        </div>

        {loadingScheduled ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="text-gold animate-spin" />
          </div>
        ) : scheduled.length === 0 ? (
          <div className="bg-cream/40 rounded-xl border border-dashed border-gold/30 p-6 text-center">
            <Calendar size={28} className="text-gold/40 mx-auto mb-2" />
            <p className="font-body text-xs text-ink/50">لا توجد جلسات مجدولة بعد — استخدم زر «جدولة جلسة» أدناه</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scheduled.map((m) => (
              <div
                key={m.id}
                className="bg-white rounded-xl border border-gold/30 shadow-sm p-5 transition-all hover:border-gold hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-gold/10 flex items-center justify-center">
                      <Calendar size={20} className="text-gold" />
                    </div>
                    <div>
                      <p className="font-body text-sm font-bold text-midnight truncate max-w-[160px]">{m.title}</p>
                      <p className="font-body text-[10px] text-ink/40">{m.platform_label}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-gold/10 text-gold font-body text-[9px] font-bold">
                    مجدولة
                  </span>
                </div>

                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={12} className="text-ink/30" />
                    <span className="font-body text-[10px] text-ink/60">{formatDate(m.scheduled_date)}</span>
                    <Clock size={12} className="text-ink/30 mr-1" />
                    <span className="font-body text-[10px] text-ink/60">{formatTime(m.scheduled_date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={12} className="text-ink/30" />
                    <span className="font-body text-[10px] text-ink/60">{m.participant_count} طرف</span>
                    {m.document_count > 0 && (
                      <>
                        <FileText size={12} className="text-ink/30" />
                        <span className="font-body text-[10px] text-ink/60">{m.document_count} مستند</span>
                      </>
                    )}
                    <Clock size={12} className="text-ink/30 mr-1" />
                    <span className="font-body text-[10px] text-ink/60">{m.duration_minutes} د</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <a
                    href={m.meeting_url || `https://app.hawari.legal/session/${m.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-gold/40 text-gold rounded-lg font-body text-xs font-bold hover:bg-gold/10 transition-colors"
                  >
                    <Link2 size={14} />
                    انضمام
                  </a>
                  <button
                    onClick={() => startScheduledNow(m)}
                    disabled={creating}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-midnight text-cream rounded-lg font-body text-xs font-bold hover:bg-gold hover:text-midnight transition-colors disabled:opacity-50"
                  >
                    {creating ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={14} />}
                    ابدأ الآن
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Instant sessions section */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Video size={16} className="text-midnight" />
          <h3 className="font-heading font-bold text-midnight text-sm">بدء جلسة فورية</h3>
        </div>

        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Video size={40} className="text-gray-300 mb-3" />
            <p className="font-body text-sm text-ink/40">لا توجد {sessionLabel} متاحة — أنشئ ملفاً أولاً من التبويبات الأخرى</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 transition-all hover:border-gold/40 hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Video size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-body text-sm font-bold text-midnight truncate max-w-[160px]">{s.title}</p>
                      <p className="font-body text-[10px] text-ink/40">{s.status}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5 mb-3">
                  {s.date && (
                    <div className="flex items-center gap-2">
                      <Calendar size={12} className="text-ink/30" />
                      <span className="font-body text-[10px] text-ink/60">{formatDate(s.date)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Users size={12} className="text-ink/30" />
                    <span className="font-body text-[10px] text-ink/60">{s.participantNames.length} طرف</span>
                    {s.documents.length > 0 && (
                      <>
                        <FileText size={12} className="text-ink/30" />
                        <span className="font-body text-[10px] text-ink/60">{s.documents.length} مستند</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Two actions: schedule + instant */}
                <div className="space-y-2">
                  <button
                    onClick={() => startSession(s.id)}
                    disabled={creating}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-midnight text-cream rounded-lg font-body text-sm font-bold hover:bg-gold hover:text-midnight transition-colors disabled:opacity-50"
                  >
                    {creating ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
                    بدء الجلسة المباشرة
                  </button>
                  <button
                    onClick={() => setScheduleModalFor(s)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gold/40 text-gold rounded-lg font-body text-xs font-bold hover:bg-gold/10 transition-colors"
                  >
                    <Calendar size={14} />
                    جدولة جلسة
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Schedule Modal                                                      */
/* ------------------------------------------------------------------ */

function ScheduleModal({
  card,
  sessionLabel,
  contextType,
  onCreateSession,
  onClose,
  onSuccess,
}: {
  card: SessionCard;
  sessionLabel: string;
  contextType: 'investigation' | 'arbitration' | 'arbitration_hub' | 'dispute';
  onCreateSession: (contextId: string) => SessionContext | null;
  onClose: () => void;
  onSuccess: (r: CreatedScheduledResult) => void;
}) {
  const [title, setTitle] = useState(card.title);
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [duration, setDuration] = useState<number>(60);
  const [platform, setPlatform] = useState<string>('Hawari Secure Room');
  const [participants, setParticipants] = useState<EditableParticipant[]>([]);
  const [files, setFiles] = useState<StagedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-populate participants from the case context
  useEffect(() => {
    const ctx = onCreateSession(card.id);
    const seeded: EditableParticipant[] = ctx
      ? ctx.participants.map((p) => ({
          name: p.name,
          role: p.role,
          email: '',
        }))
      : [];
    setParticipants(seeded);
  }, [card.id, onCreateSession]);

  /* ---- participants ---- */
  const addParticipant = () =>
    setParticipants((p) => [...p, { name: '', role: 'مشارك', email: '' }]);

  const removeParticipant = (idx: number) =>
    setParticipants((p) => p.filter((_, i) => i !== idx));

  const updateParticipant = (idx: number, field: keyof EditableParticipant, value: string) =>
    setParticipants((p) => p.map((x, i) => (i === idx ? { ...x, [field]: value } : x)));

  /* ---- files ---- */
  const addFiles = (fileList: FileList | File[]) => {
    const arr = Array.from(fileList);
    const staged: StagedFile[] = arr.map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      file: f,
      name: f.name,
      size: f.size,
      type: f.type || 'application/octet-stream',
    }));
    setFiles((prev) => [...prev, ...staged]);
  };

  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  /* ---- submit ---- */
  const handleSubmit = async () => {
    setSubmitting(true);
    setModalError(null);

    try {
      if (!title.trim()) {
        setModalError('يرجى إدخال عنوان الجلسة');
        setSubmitting(false);
        return;
      }
      if (!scheduledDate) {
        setModalError('يرجى اختيار تاريخ ووقت الجلسة');
        setSubmitting(false);
        return;
      }

      const ctx = onCreateSession(card.id);
      const agendaText = ctx?.subtitle || `${card.title} — ${sessionLabel || ''}`;

      // 1. Insert meeting
      const meetingPayload = {
        title: title.trim(),
        meeting_type: 'مرئية',
        scheduled_date: new Date(scheduledDate).toISOString(),
        duration_minutes: duration,
        platform,
        meeting_url: null,
        organizer_id: null,
        agenda: agendaText,
        participants: participants.map((p) => p.name).filter(Boolean),
        shared_documents: files.map((f) => f.name),
        status: 'مجدولة',
        language: 'العربية',
        is_internal: true,
        max_participants: 50,
        privilege_mode: ctx?.contextType === 'arbitration',
        recording_enabled: ctx?.contextType !== 'arbitration',
        context_type: ctx?.contextType || contextType,
        context_id: ctx?.contextId || card.id,
      };

      const { data: meetingData, error: meetingErr } = await supabase
        .from('lf_meetings')
        .insert(meetingPayload)
        .select()
        .single();

      if (meetingErr || !meetingData) {
        setModalError('فشل إنشاء الجلسة في قاعدة البيانات');
        setSubmitting(false);
        return;
      }

      const meeting = meetingData as Meeting;
      const joinUrl = `https://app.hawari.legal/session/${meeting.id}`;

      // 2. Update meeting_url with the join link
      await supabase
        .from('lf_meetings')
        .update({ meeting_url: joinUrl })
        .eq('id', meeting.id);

      // 3. Insert participants
      const validParticipants = participants.filter((p) => p.name.trim());
      if (validParticipants.length > 0) {
        const partInserts = validParticipants.map((p, i) => ({
          meeting_id: meeting.id,
          name: p.name.trim(),
          role: p.role || 'مشارك',
          email: p.email.trim() || null,
          is_host: i === 0,
          join_status: 'invited',
          joined_at: null,
        }));
        await supabase.from('lf_meeting_participants').insert(partInserts);
      }

      // 4. Upload documents + insert lf_meeting_documents
      let uploadedDocCount = 0;
      for (let i = 0; i < files.length; i++) {
        const sf = files[i];
        try {
          const filePath = `${meeting.id}/${Date.now()}-${sf.name.replace(/[^\w\u0600-\u06FF.-]/g, '_')}`;
          const { error: upErr } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(filePath, sf.file);

          if (upErr) {
            console.error('upload error', upErr);
            continue;
          }

          const { data: pub } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(filePath);

          await supabase.from('lf_meeting_documents').insert({
            meeting_id: meeting.id,
            file_name: sf.name,
            file_type: sf.type,
            file_url: pub?.publicUrl || '',
            file_size: sf.size,
            uploaded_by: null,
            uploaded_at: new Date().toISOString(),
            is_agenda_item: true,
            display_order: i,
            display_state: 'pending',
          });
          uploadedDocCount++;
        } catch (e) {
          console.error('doc upload failed', e);
        }
      }

      // 5. Email dispatches for participants with email
      const emailParticipants = validParticipants.filter((p) => p.email.trim());
      if (emailParticipants.length > 0) {
        const dispatches = emailParticipants.map((p) => ({
          meeting_id: meeting.id,
          recipient: p.email.trim(),
          subject: `دعوة لجلسة: ${title.trim()}`,
          sent_at: new Date().toISOString(),
          status: 'queued',
          contains_video: true,
        }));
        await supabase.from('lf_meeting_email_dispatches').insert(dispatches);
      }

      // 6. Success
      onSuccess({
        meetingId: meeting.id,
        joinUrl,
        title: title.trim(),
        scheduledDate: new Date(scheduledDate).toISOString(),
        platform,
        invited: emailParticipants.map((p) => ({ name: p.name, email: p.email.trim() })),
        documentCount: uploadedDocCount,
      });
      setSubmitting(false);
    } catch (e) {
      console.error(e);
      setModalError('حدث خطأ غير متوقع أثناء إنشاء الجلسة المجدولة');
      setSubmitting(false);
    }
  };

  /* ---- modal UI ---- */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-midnight/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-cream rounded-2xl shadow-2xl w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-midnight text-cream px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-gold" />
            <h2 className="font-heading font-bold text-base">جدولة جلسة جديدة</h2>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-cream/70 hover:text-cream transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {modalError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <p className="font-body text-xs text-red-700">{modalError}</p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="font-body text-xs font-bold text-midnight mb-1.5 block">عنوان الجلسة</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg font-body text-sm text-midnight focus:border-gold focus:outline-none"
              placeholder="عنوان الجلسة"
            />
          </div>

          {/* Date / Duration / Platform */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="font-body text-xs font-bold text-midnight mb-1.5 block">التاريخ والوقت</label>
              <input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg font-body text-sm text-midnight focus:border-gold focus:outline-none"
              />
            </div>
            <div>
              <label className="font-body text-xs font-bold text-midnight mb-1.5 block">المدة</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg font-body text-sm text-midnight focus:border-gold focus:outline-none"
              >
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>{d} دقيقة</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-body text-xs font-bold text-midnight mb-1.5 block">المنصة</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg font-body text-sm text-midnight focus:border-gold focus:outline-none"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Participants */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-body text-xs font-bold text-midnight flex items-center gap-1.5">
                <Users size={14} className="text-gold" />
                المشاركون
              </label>
              <button
                onClick={addParticipant}
                type="button"
                className="flex items-center gap-1 px-2.5 py-1 bg-gold/10 text-gold rounded-lg font-body text-[11px] font-bold hover:bg-gold/20 transition-colors"
              >
                <Plus size={12} />
                إضافة
              </button>
            </div>

            {participants.length === 0 ? (
              <p className="font-body text-xs text-ink/40 py-3 text-center bg-white/50 rounded-lg border border-dashed border-gray-200">
                لا يوجد مشاركون — أضف مشاركاً
              </p>
            ) : (
              <div className="space-y-2">
                {participants.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-2">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) => updateParticipant(idx, 'name', e.target.value)}
                        placeholder="الاسم"
                        className="px-2.5 py-1.5 bg-cream/40 border border-gray-200 rounded font-body text-xs text-midnight focus:border-gold focus:outline-none"
                      />
                      <input
                        type="text"
                        value={p.role}
                        onChange={(e) => updateParticipant(idx, 'role', e.target.value)}
                        placeholder="الدور"
                        className="px-2.5 py-1.5 bg-cream/40 border border-gray-200 rounded font-body text-xs text-midnight focus:border-gold focus:outline-none"
                      />
                      <input
                        type="email"
                        value={p.email}
                        onChange={(e) => updateParticipant(idx, 'email', e.target.value)}
                        placeholder="البريد (اختياري)"
                        dir="ltr"
                        className="px-2.5 py-1.5 bg-cream/40 border border-gray-200 rounded font-body text-xs text-midnight focus:border-gold focus:outline-none text-left"
                      />
                    </div>
                    <button
                      onClick={() => removeParticipant(idx)}
                      type="button"
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="font-body text-[10px] text-ink/40 mt-1.5">
              سيتم إرسال رابط الدعوة للمشاركين الذين يحوون بريداً إلكترونياً
            </p>
          </div>

          {/* Documents */}
          <div>
            <label className="font-body text-xs font-bold text-midnight mb-2 flex items-center gap-1.5">
              <FileText size={14} className="text-gold" />
              المستندات (بنود جدول الأعمال)
            </label>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragOver ? 'border-gold bg-gold/5' : 'border-gray-300 bg-white/50 hover:border-gold/50'
              }`}
            >
              <Upload size={24} className="text-gold/60 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/60">
                اسحب الملفات هنا أو اضغط للاختيار
              </p>
              <p className="font-body text-[10px] text-ink/40 mt-1">
                جميع الصيغ مدعومة (PDF, DOCX, XLSX, صور, ...)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
                className="hidden"
              />
            </div>

            {files.length > 0 && (
              <div className="space-y-2 mt-3">
                {files.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 p-2.5">
                    <span className="text-xl">{fileIconForType(f.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-xs font-bold text-midnight truncate">{f.name}</p>
                      <p className="font-body text-[10px] text-ink/40">{formatBytes(f.size)} — {f.type || 'غير معروف'}</p>
                    </div>
                    <button
                      onClick={() => removeFile(f.id)}
                      type="button"
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Security note */}
          <div className="flex items-start gap-2 bg-midnight/5 rounded-lg p-3">
            <Shield size={14} className="text-gold mt-0.5 shrink-0" />
            <p className="font-body text-[10px] text-ink/60 leading-relaxed">
              تُرفع المستندات إلى تخزين آمن وتُسجَّل كبنود جدول أعمال للجلسة. تُرسل الدعوات عبر قناة مشفّرة وتحتوي على رابط الانضمام وملف تعريف الجلسة.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-ink/70 rounded-lg font-body text-sm font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-[2] flex items-center justify-center gap-2 px-4 py-2.5 bg-midnight text-cream rounded-lg font-body text-sm font-bold hover:bg-gold hover:text-midnight transition-colors disabled:opacity-50"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            إنشاء وإرسال الدعوات
          </button>
        </div>
      </div>
    </div>
  );
}
