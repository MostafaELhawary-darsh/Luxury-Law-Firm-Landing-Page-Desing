import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  Command, Search, Sparkles, Calendar, Clock, AlertTriangle, CheckCircle2,
  FileText, Gavel, Scale, Hash, ChevronLeft, X, Loader2, Plus,
  ArrowRight, BookOpen, History, Lock, Zap, Eye, Edit3, Send,
} from 'lucide-react';
import { supabase, formatDate } from '@/lib/financeUtils';
import {
  computeDeadline, daysUntil, getAlertLevel, APPEAL_DEADLINES,
  isHolidaySimple, isWeekendSimple, isBusinessDaySimple, formatDate as fmtDeadline,
} from '@/lib/deadlineEngine';
import type { Case, CourtSession, Task } from '@/lib/firmTypes';
import type { PendingAddCommand } from '@/lib/voiceTypes';

// ===== Types =====

interface CockpitDeadline {
  id: string;
  case_id: string;
  deadline_type: string;
  trigger_event: string | null;
  trigger_date: string | null;
  deadline_date: string;
  legal_basis: string | null;
  days_allowed: number | null;
  alert_level: 'info' | 'warning' | 'urgent' | 'critical';
  is_locked: boolean;
  notes: string | null;
  case?: { case_number: string; case_title: string };
}

interface ParsedCommand {
  action: 'add_session' | 'add_deadline' | 'add_task' | 'unknown';
  caseTitle?: string;
  date?: string;
  raw: string;
}

// ===== Main Component =====

export default function LawyersCockpit({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [cases, setCases] = useState<Case[]>([]);
  const [deadlines, setDeadlines] = useState<CockpitDeadline[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<CourtSession[]>([]);
  const [loading, setLoading] = useState(true);

  const [omniboxValue, setOmniboxValue] = useState('');
  const [parsedPreview, setParsedPreview] = useState<ParsedCommand | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [focusCaseId, setFocusCaseId] = useState<string | null>(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [caseRes, dlRes, taskRes, sessRes] = await Promise.all([
      supabase.from('lf_cases').select('id, case_number, case_title, case_type, court_name, status, client_id').order('case_number'),
      supabase.from('scm_deadlines').select('*, case:lf_cases(case_number, case_title)').order('deadline_date', { ascending: true }),
      supabase.from('lf_tasks').select('*, assignee:lf_attorneys(name), case:lf_cases(case_number, case_title)').order('due_date', { ascending: true }),
      supabase.from('lf_court_sessions').select('*, case:lf_cases(case_number, case_title)').order('session_date', { ascending: true }),
    ]);
    setCases((caseRes.data as Case[]) || []);
    setDeadlines((dlRes.data as CockpitDeadline[]) || []);
    setTasks((taskRes.data as Task[]) || []);
    setSessions((sessRes.data as CourtSession[]) || []);
    setLoading(false);
  };

  // ===== Omnibox parsing =====
  const parseOmnibox = useCallback((text: string): ParsedCommand => {
    const lower = text.trim();
    if (!lower) return { action: 'unknown', raw: text };

    // detect action
    if (lower.includes('جلسة') || lower.includes('نطق') || lower.includes('جلسة بالحكم')) {
      const action: ParsedCommand['action'] = 'add_session';
      // try to find a matching case by title keyword
      const caseMatch = cases.find((c) =>
        lower.includes(c.case_title) || (c.case_number && lower.includes(c.case_number)),
      );
      // extract date — look for "يوم X" or month names
      const date = extractDateFromText(lower);
      return {
        action,
        caseTitle: caseMatch?.case_title,
        date,
        raw: text,
      };
    }
    if (lower.includes('ميعاد') || lower.includes('مهلة') || lower.includes('استئناف') || lower.includes('نقض')) {
      return { action: 'add_deadline', raw: text };
    }
    if (lower.includes('مهمة') || lower.includes('تذكير')) {
      return { action: 'add_task', raw: text };
    }
    return { action: 'unknown', raw: text };
  }, [cases]);

  useEffect(() => {
    if (omniboxValue.trim().length > 3) {
      setParsedPreview(parseOmnibox(omniboxValue));
    } else {
      setParsedPreview(null);
    }
  }, [omniboxValue, parseOmnibox]);

  // Voice add support
  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      if (cmd.commandType === 'add_session') {
        const date = cmd.fields.date ? new Date(cmd.fields.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
        setOmniboxValue(`إضافة جلسة يوم ${date}`);
      }
    }
  }, [voiceAdd]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  if (focusMode && focusCaseId) {
    const focusCase = cases.find((c) => c.id === focusCaseId);
    if (focusCase) {
      return (
        <FocusDraftingMode
          caseData={focusCase}
          deadlines={deadlines.filter((d) => d.case_id === focusCaseId)}
          sessions={sessions.filter((s) => s.case_id === focusCaseId)}
          onExit={() => { setFocusMode(false); setFocusCaseId(null); }}
        />
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Command size={20} className="text-gold" />
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">قمرة قيادة المحامي — Lawyer's Cockpit</h2>
            <p className="font-body text-[10px] text-ink/40 mt-0.5">شريط أوامر ذكي • حاسبة مهل مرئية • وضع تركيز للصياغة • فرز إشارات المرور</p>
          </div>
        </div>
      </div>

      {/* Legal Omnibox */}
      <LegalOmnibox
        value={omniboxValue}
        onChange={setOmniboxValue}
        parsed={parsedPreview}
        cases={cases}
        onConfirm={(p) => handleOmniboxConfirm(p, cases, setOmniboxValue)}
      />

      {/* Traffic Light Triage */}
      <TrafficLightTriage
        deadlines={deadlines}
        tasks={tasks}
        onEnterFocus={(caseId) => { setFocusCaseId(caseId); setFocusMode(true); }}
      />

      {/* Visual Deadline Engine */}
      <VisualDeadlineEngine deadlines={deadlines} cases={cases} onRefresh={fetchAll} />

      {/* Focus mode launcher */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-3">
          <Edit3 size={18} className="text-gold" />
          <h3 className="font-heading font-bold text-midnight text-sm">وضع التركيز للصياغة — Focus Drafting Mode</h3>
        </div>
        <p className="font-body text-xs text-ink/50 mb-4">اختر قضية للدخول في وضع صياغة بلا تشتيت: مستند العمل على يمين الشاشة، واللوحة المساعدة (المواد القانونية، المستندات، الجلسات السابقة) على يسارها.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {cases.slice(0, 6).map((c) => (
            <button
              key={c.id}
              onClick={() => { setFocusCaseId(c.id); setFocusMode(true); }}
              className="text-right p-3 rounded-lg border border-gray-200 hover:border-gold/40 hover:bg-gold/5 transition-all group"
            >
              <p className="font-body text-xs font-bold text-midnight group-hover:text-gold transition-colors truncate">{c.case_title}</p>
              <p className="font-body text-[10px] text-ink/40 mt-0.5">{c.case_number} • {c.court_name || '—'}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== Legal Omnibox =====

function LegalOmnibox({
  value, onChange, parsed, cases, onConfirm,
}: {
  value: string;
  onChange: (v: string) => void;
  parsed: ParsedCommand | null;
  cases: Case[];
  onConfirm: (p: ParsedCommand) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const actionLabel = parsed?.action === 'add_session' ? 'إضافة جلسة'
    : parsed?.action === 'add_deadline' ? 'حساب موعد'
    : parsed?.action === 'add_task' ? 'إنشاء مهمة'
    : null;

  const matchedCase = parsed?.caseTitle
    ? cases.find((c) => c.case_title === parsed.caseTitle)
    : null;

  return (
    <div className="bg-gradient-to-br from-midnight to-midnight-light rounded-2xl p-5 shadow-lg">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={14} className="text-gold" />
        <span className="font-heading font-bold text-cream text-sm">شريط الأوامر الذكي — Legal Omnibox</span>
        <span className="mr-auto font-body text-[10px] text-cream/40 hidden sm:flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-cream/10 border border-cream/20">Ctrl</kbd>
          +
          <kbd className="px-1.5 py-0.5 rounded bg-cream/10 border border-cream/20">K</kbd>
        </span>
      </div>
      <div className="relative">
        <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/40" />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && parsed && parsed.action !== 'unknown') onConfirm(parsed); }}
          placeholder="اكتب أمراً بالعربية... مثال: «إضافة جلسة نطق بالحكم في قضية شركة الأفق يوم 15 مايو»"
          className="w-full pr-11 pl-4 py-3 rounded-xl bg-cream/5 border border-cream/15 text-cream placeholder:text-cream/30 font-body text-sm focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition-all"
        />
      </div>

      {/* Live parsed preview */}
      {parsed && parsed.action !== 'unknown' && (
        <div className="mt-3 bg-cream/5 border border-gold/20 rounded-xl p-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold text-gold">معالجة لغوية طبيعية — تم التفسير:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <p className="font-body text-[9px] text-cream/40 mb-0.5">الإجراء المُكتشف</p>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gold/15 text-gold font-body text-[11px] font-bold">
                {actionLabel}
              </span>
            </div>
            {matchedCase && (
              <div>
                <p className="font-body text-[9px] text-cream/40 mb-0.5">القضية المُطابَقة</p>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-cream/10 text-cream font-body text-[11px]">
                  <Hash size={10} /> {matchedCase.case_number}
                </span>
              </div>
            )}
            {parsed.date && (
              <div>
                <p className="font-body text-[9px] text-cream/40 mb-0.5">التاريخ المُستخرَج</p>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-cream/10 text-cream font-body text-[11px]">
                  <Calendar size={10} /> {parsed.date}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => onConfirm(parsed)}
            className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-gold text-midnight font-body text-xs font-bold hover:bg-gold/90 transition-colors"
          >
            <CheckCircle2 size={14} /> تأكيد وتعبئة
          </button>
        </div>
      )}

      {value.trim().length > 3 && parsed?.action === 'unknown' && (
        <p className="mt-2 font-body text-[10px] text-cream/40">لم أتعرف على الإجراء. جرّب: «إضافة جلسة»، «حساب موعد استئناف»، أو «إنشاء مهمة».</p>
      )}
    </div>
  );
}

// ===== Traffic Light Triage =====

function TrafficLightTriage({
  deadlines, tasks, onEnterFocus,
}: {
  deadlines: CockpitDeadline[];
  tasks: Task[];
  onEnterFocus: (caseId: string) => void;
}) {
  // Build triage cards from deadlines + tasks with due dates
  interface TriageCard {
    id: string;
    title: string;
    subtitle: string;
    dueDate: string;
    daysLeft: number;
    level: 'red' | 'yellow' | 'green';
    caseId?: string;
    kind: 'deadline' | 'task';
  }

  const cards: TriageCard[] = useMemo(() => {
    const list: TriageCard[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    deadlines.forEach((d) => {
      if (d.is_locked) return;
      const days = daysUntil(new Date(d.deadline_date));
      let level: TriageCard['level'] = 'green';
      if (days <= 2) level = 'red';
      else if (days <= 7) level = 'yellow';
      list.push({
        id: d.id,
        title: d.deadline_type,
        subtitle: d.case ? `${d.case.case_number} — ${d.case.case_title}` : '',
        dueDate: d.deadline_date,
        daysLeft: days,
        level,
        caseId: d.case_id,
        kind: 'deadline',
      });
    });

    tasks.filter((t) => t.due_date && t.status !== 'مكتملة').forEach((t) => {
      const days = daysUntil(new Date(t.due_date!));
      let level: TriageCard['level'] = 'green';
      if (days <= 2) level = 'red';
      else if (days <= 7) level = 'yellow';
      list.push({
        id: t.id,
        title: t.title,
        subtitle: t.case ? `${t.case.case_number} — ${t.case.case_title}` : (t.description || ''),
        dueDate: t.due_date!,
        daysLeft: days,
        level,
        caseId: t.case_id || undefined,
        kind: 'task',
      });
    });

    return list.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [deadlines, tasks]);

  const red = cards.filter((c) => c.level === 'red');
  const yellow = cards.filter((c) => c.level === 'yellow');
  const green = cards.filter((c) => c.level === 'green');

  const levelStyles = {
    red: { card: 'bg-red-50 border-red-300', dot: 'bg-red-500 animate-pulse', label: 'حرج — 48 ساعة', labelBg: 'bg-red-100 text-red-700', icon: AlertTriangle },
    yellow: { card: 'bg-amber-50 border-amber-300', dot: 'bg-amber-500', label: 'هذا الأسبوع', labelBg: 'bg-amber-100 text-amber-700', icon: Clock },
    green: { card: 'bg-gray-50 border-gray-200', dot: 'bg-emerald-500', label: 'غير مستعجل', labelBg: 'bg-emerald-100 text-emerald-700', icon: BookOpen },
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
        </div>
        <h3 className="font-heading font-bold text-midnight text-sm">فرز إشارات المرور — Traffic Light Triage</h3>
      </div>

      {cards.length === 0 ? (
        <p className="font-body text-xs text-ink/40 py-8 text-center">لا توجد مهام أو مواعيد معلّقة</p>
      ) : (
        <div className="space-y-5">
          {red.length > 0 && (
            <TriageSection title="بطاقات حمراء — نبض سريع" cards={red} styles={levelStyles.red} onEnterFocus={onEnterFocus} />
          )}
          {yellow.length > 0 && (
            <TriageSection title="بطاقات صفراء — هذا الأسبوع" cards={yellow} styles={levelStyles.yellow} onEnterFocus={onEnterFocus} />
          )}
          {green.length > 0 && (
            <TriageSection title="بطاقات رمادية/خضراء — غير مستعجل" cards={green} styles={levelStyles.green} onEnterFocus={onEnterFocus} />
          )}
        </div>
      )}
    </div>
  );
}

function TriageSection({
  title, cards, styles, onEnterFocus,
}: {
  title: string;
  cards: { id: string; title: string; subtitle: string; dueDate: string; daysLeft: number; caseId?: string; kind: string }[];
  styles: { card: string; dot: string; label: string; labelBg: string; icon: typeof AlertTriangle };
  onEnterFocus: (caseId: string) => void;
}) {
  const Icon = styles.icon;
  return (
    <div>
      <p className="font-body text-[10px] font-bold text-ink/50 mb-2">{title} ({cards.length})</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((c) => (
          <div
            key={c.id}
            className={`rounded-xl border p-3.5 transition-all ${styles.card} ${c.kind === 'deadline' ? 'shadow-sm' : ''}`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${styles.dot}`} />
                <p className="font-body text-xs font-bold text-midnight truncate">{c.title}</p>
              </div>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${styles.labelBg}`}>
                {c.daysLeft < 0 ? `متأخر ${Math.abs(c.daysLeft)} يوم` : `${c.daysLeft} يوم`}
              </span>
            </div>
            <p className="font-body text-[10px] text-ink/50 truncate mb-2">{c.subtitle}</p>
            <div className="flex items-center justify-between pt-2 border-t border-black/5">
              <span className="font-body text-[10px] text-ink/40 flex items-center gap-1">
                <Calendar size={10} /> {formatDate(c.dueDate)}
              </span>
              {c.caseId && (
                <button
                  onClick={() => onEnterFocus(c.caseId ?? '')}
                  className="font-body text-[10px] text-gold hover:text-gold-dark flex items-center gap-1 transition-colors"
                >
                  وضع التركيز <ArrowRight size={10} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== Visual Deadline Engine =====

function VisualDeadlineEngine({
  deadlines, cases, onRefresh,
}: {
  deadlines: CockpitDeadline[];
  cases: Case[];
  onRefresh: () => void;
}) {
  const [selectedDeadlineId, setSelectedDeadlineId] = useState<string | null>(null);
  const [showCompute, setShowCompute] = useState(false);

  const selected = deadlines.find((d) => d.id === selectedDeadlineId);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Clock size={18} className="text-gold" />
          <h3 className="font-heading font-bold text-midnight text-sm">حاسبة المهل المرئية — Visual Deadline Engine</h3>
        </div>
        <button
          onClick={() => setShowCompute(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors"
        >
          <Plus size={12} /> حساب موعد جديد
        </button>
      </div>

      {deadlines.length === 0 ? (
        <p className="font-body text-xs text-ink/40 py-8 text-center">لا توجد مواعيد قانونية مسجّلة</p>
      ) : (
        <div className="space-y-2">
          {deadlines.slice(0, 8).map((d) => {
            const alert = ALERT_STYLE_MAP[d.alert_level];
            const days = daysUntil(new Date(d.deadline_date));
            return (
              <button
                key={d.id}
                onClick={() => setSelectedDeadlineId(d.id === selectedDeadlineId ? null : d.id)}
                className={`w-full text-right rounded-lg border p-3 transition-all ${selectedDeadlineId === d.id ? 'border-gold bg-gold/5' : 'border-gray-200 hover:border-gold/30'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${alert.dot}`} />
                    <p className="font-body text-xs font-bold text-midnight truncate">{d.deadline_type}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {d.is_locked && <Lock size={11} className="text-ink/40" />}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${alert.badge}`}>{alert.label}</span>
                    <span className="font-body text-[10px] text-ink/40">{days < 0 ? `متأخر ${Math.abs(days)} يوم` : `${days} يوم`}</span>
                  </div>
                </div>
                {d.case && <p className="font-body text-[10px] text-ink/40 mt-1 truncate">{d.case.case_number} — {d.case.case_title}</p>}
              </button>
            );
          })}
        </div>
      )}

      {/* Visual timeline breakdown */}
      {selected && (
        <div className="mt-4 bg-gray-50 rounded-xl border border-gray-200 p-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <Scale size={14} className="text-gold" />
            <p className="font-heading font-bold text-midnight text-sm">تفكيك حساب الموعد</p>
          </div>
          <DeadlineTimeline deadline={selected} />
        </div>
      )}

      {showCompute && (
        <ComputeDeadlineModal
          cases={cases}
          onClose={() => setShowCompute(false)}
          onSaved={() => { setShowCompute(false); onRefresh(); }}
        />
      )}
    </div>
  );
}

function DeadlineTimeline({ deadline }: { deadline: CockpitDeadline }) {
  const trigger = deadline.trigger_date ? new Date(deadline.trigger_date) : null;
  const final = new Date(deadline.deadline_date);
  const days = deadline.days_allowed || 0;

  // Walk through the computation to find holidays/weekends hit
  const steps: { label: string; date: Date; type: 'trigger' | 'business' | 'skip' | 'final' }[] = [];
  if (trigger) {
    steps.push({ label: 'الحدث المُحرك', date: trigger, type: 'trigger' });
    const current = new Date(trigger);
    let added = 0;
    while (added < days && current < final) {
      current.setDate(current.getDate() + 1);
      const isWeekend = isWeekendSimple(current);
      const isHoliday = isHolidaySimple(current);
      if (isWeekend || isHoliday) {
        steps.push({
          label: isHoliday ? 'عطلة رسمية — ترحيل' : 'عطلة نهاية الأسبوع — استبعاد',
          date: new Date(current),
          type: 'skip',
        });
      } else {
        added++;
        if (added < days) {
          steps.push({ label: `يوم عمل ${added}`, date: new Date(current), type: 'business' });
        }
      }
    }
    // check if final was extended
    if (!isBusinessDaySimple(final)) {
      steps.push({ label: 'الموعد يصادف عطلة — ترحيل لأول يوم عمل', date: new Date(final), type: 'skip' });
    }
  }
  steps.push({ label: 'الموعد النهائي المُعتمد', date: final, type: 'final' });

  return (
    <div className="space-y-2">
      {deadline.legal_basis && (
        <div className="bg-gold/5 border border-gold/20 rounded-lg p-2.5 mb-2">
          <p className="font-body text-[10px] text-gold/70 mb-0.5">القاعدة المُطبَّقة</p>
          <p className="font-body text-xs text-midnight">{deadline.legal_basis}</p>
        </div>
      )}
      <div className="font-mono text-xs space-y-1.5" dir="rtl">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-ink/30 select-none">
              {i === 0 ? '├' : i === steps.length - 1 ? '└──' : '├──'}
            </span>
            <span className={`flex-1 ${s.type === 'skip' ? 'text-amber-600' : s.type === 'trigger' ? 'text-blue-600 font-bold' : s.type === 'final' ? 'text-red-600 font-bold' : 'text-ink/60'}`}>
              {s.label} — {fmtDeadline(s.date)}
            </span>
          </div>
        ))}
      </div>
      {deadline.is_locked && (
        <div className="flex items-center gap-1.5 mt-2 text-ink/40">
          <Lock size={11} />
          <span className="font-body text-[10px]">موعد مقفل — لا يمكن تعديله بعد الاعتماد</span>
        </div>
      )}
    </div>
  );
}

function ComputeDeadlineModal({
  cases, onClose, onSaved,
}: {
  cases: Case[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [caseId, setCaseId] = useState('');
  const [deadlineType, setDeadlineType] = useState('استئناف حكم أول درجة');
  const [triggerDate, setTriggerDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [computed, setComputed] = useState<{ date: Date; basis: string; days: number } | null>(null);

  const compute = () => {
    const rule = APPEAL_DEADLINES[deadlineType];
    if (!rule) return;
    const result = computeDeadline(new Date(triggerDate), rule.days, true);
    setComputed({ date: result, basis: rule.basis, days: rule.days });
  };

  const handleSave = async () => {
    if (!caseId || !computed) return;
    setSaving(true);
    const alert = getAlertLevel(computed.date);
    await supabase.from('scm_deadlines').insert({
      case_id: caseId,
      deadline_type: deadlineType,
      trigger_event: deadlineType,
      trigger_date: triggerDate,
      deadline_date: computed.date.toISOString().slice(0, 10),
      legal_basis: computed.basis,
      days_allowed: computed.days,
      alert_level: alert,
      is_locked: false,
    });
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-heading font-bold text-midnight text-base">حساب موعد قانوني جديد</h3>
          <button onClick={onClose} className="text-ink/40 hover:text-ink transition-colors"><X size={20} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block font-body text-xs font-medium text-ink/60 mb-1.5">القضية المرتبطة <span className="text-red-500">*</span></label>
            <select value={caseId} onChange={(e) => setCaseId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:outline-none focus:border-gold">
              <option value="">— اختر القضية —</option>
              {cases.map((c) => <option key={c.id} value={c.id}>{c.case_number} — {c.case_title}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-body text-xs font-medium text-ink/60 mb-1.5">نوع الموعد</label>
              <select value={deadlineType} onChange={(e) => setDeadlineType(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:outline-none focus:border-gold">
                {Object.keys(APPEAL_DEADLINES).map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-body text-xs font-medium text-ink/60 mb-1.5">تاريخ الحدث المُحرك</label>
              <input type="date" value={triggerDate} onChange={(e) => setTriggerDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:outline-none focus:border-gold" />
            </div>
          </div>
          <button onClick={compute} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-midnight text-cream font-body text-sm font-bold hover:bg-midnight-light transition-colors">
            <Zap size={14} /> احسب الموعد
          </button>

          {computed && (
            <div className="bg-gold/5 border border-gold/20 rounded-xl p-4 animate-fade-in">
              <p className="font-body text-[10px] text-gold/70 mb-1">القاعدة المُطبَّقة</p>
              <p className="font-body text-xs text-midnight mb-2">{computed.basis}</p>
              <p className="font-body text-[10px] text-ink/40 mb-0.5">الموعد النهائي المُحتسب</p>
              <p className="font-heading font-bold text-midnight text-lg">{fmtDeadline(computed.date)}</p>
              <button onClick={handleSave} disabled={saving || !caseId} className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-gold text-midnight font-body text-sm font-bold hover:bg-gold/90 transition-colors disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} اعتماد وإضافة لجدول الأعمال
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Focus Drafting Mode =====

function FocusDraftingMode({
  caseData, deadlines, sessions, onExit,
}: {
  caseData: Case;
  deadlines: CockpitDeadline[];
  sessions: CourtSession[];
  onExit: () => void;
}) {
  const [draft, setDraft] = useState(`مذكرة في القضية: ${caseData.case_title}\n\nالموضوع: ...\n\nالوقائع:\n\n\nالطلبات:\n\n\nالدفوع:\n`);

  return (
    <div className="fixed inset-0 z-50 bg-midnight flex flex-col">
      {/* Minimal top bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-midnight-deep border-b border-cream/10">
        <button onClick={onExit} className="flex items-center gap-2 text-cream/60 hover:text-gold transition-colors font-body text-xs">
          <ChevronLeft size={16} /> الخروج من وضع التركيز
        </button>
        <div className="flex items-center gap-2">
          <Hash size={12} className="text-gold" />
          <span className="font-heading font-bold text-cream text-sm">{caseData.case_title}</span>
          <span className="font-body text-[10px] text-cream/40">{caseData.case_number}</span>
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gold text-midnight font-body text-xs font-bold hover:bg-gold/90 transition-colors">
          <Send size={12} /> حفظ المسودة
        </button>
      </div>

      {/* Two-pane layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Context panel (left in RTL = right visually) */}
        <aside className="w-80 lg:w-96 bg-midnight-light border-l border-cream/10 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen size={14} className="text-gold" />
            <h4 className="font-heading font-bold text-cream text-sm">اللوحة المساعدة — Context Panel</h4>
          </div>

          {/* Governing legal basis */}
          <ContextSection title="المادة القانونية الحاكمة" icon={<Scale size={12} className="text-gold" />}>
            {deadlines.length > 0 ? (
              deadlines.slice(0, 3).map((d) => (
                <div key={d.id} className="bg-cream/5 rounded-lg p-2.5">
                  <p className="font-body text-[11px] font-bold text-gold mb-1">{d.deadline_type}</p>
                  <p className="font-body text-[10px] text-cream/60 leading-relaxed">{d.legal_basis || '—'}</p>
                </div>
              ))
            ) : <p className="font-body text-[10px] text-cream/40">لا توجد مواد مسجّلة</p>}
          </ContextSection>

          {/* Case documents */}
          <ContextSection title="المستندات المرفقة" icon={<FileText size={12} className="text-gold" />}>
            <p className="font-body text-[10px] text-cream/40">المستندات مرتبطة عبر نواة القضية الذكية</p>
          </ContextSection>

          {/* Previous sessions */}
          <ContextSection title="الجلسات السابقة" icon={<History size={12} className="text-gold" />}>
            {sessions.length > 0 ? (
              sessions.slice(-4).map((s) => (
                <div key={s.id} className="bg-cream/5 rounded-lg p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-body text-[10px] font-bold text-cream">{s.session_type}</span>
                    <span className="font-body text-[9px] text-cream/40">{formatDate(s.session_date)}</span>
                  </div>
                  {s.court_decision && <p className="font-body text-[10px] text-cream/60 leading-relaxed">{s.court_decision}</p>}
                </div>
              ))
            ) : <p className="font-body text-[10px] text-cream/40">لا توجد جلسات سابقة</p>}
          </ContextSection>

          {/* Confidentiality */}
          <div className="flex items-center gap-2 pt-2 border-t border-cream/10">
            <Lock size={11} className="text-gold" />
            <span className="font-body text-[10px] text-cream/40">مسودة سرية — محمية بعلامة مائية رقمية</span>
          </div>
        </aside>

        {/* Draft editor */}
        <main className="flex-1 bg-cream overflow-y-auto">
          <div className="max-w-3xl mx-auto p-8">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full min-h-[70vh] bg-transparent font-serif text-midnight text-base leading-[1.8] focus:outline-none resize-none"
              placeholder="ابدأ الصياغة..."
              dir="rtl"
            />
          </div>
        </main>
      </div>
    </div>
  );
}

function ContextSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <p className="font-body text-[11px] font-bold text-cream/70">{title}</p>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// ===== Helpers =====

const ALERT_STYLE_MAP: Record<string, { label: string; badge: string; dot: string }> = {
  info: { label: 'معلومة', badge: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  warning: { label: 'تنبيه', badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  urgent: { label: 'عاجل', badge: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
  critical: { label: 'حرج', badge: 'bg-red-50 text-red-700', dot: 'bg-red-500 animate-pulse' },
};

const MONTH_NAMES = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

function extractDateFromText(text: string): string | undefined {
  // Match "يوم 15 مايو" style
  const dayMatch = text.match(/يوم\s+(\d{1,2})\s+(\S+)/);
  if (dayMatch) {
    const day = parseInt(dayMatch[1], 10);
    const monthName = dayMatch[2];
    const monthIdx = MONTH_NAMES.findIndex((m) => monthName.includes(m) || m.includes(monthName));
    if (monthIdx >= 0) {
      const year = new Date().getFullYear();
      const date = new Date(year, monthIdx, day);
      return date.toISOString().slice(0, 10);
    }
  }
  return undefined;
}

function handleOmniboxConfirm(
  parsed: ParsedCommand,
  cases: Case[],
  setOmniboxValue: (v: string) => void,
) {
  // For now, surface a confirmation; full routing to JudicialAgenda etc. handled via voice layer
  if (parsed.action === 'add_session' && parsed.caseTitle) {
    const matched = cases.find((c) => c.case_title === parsed.caseTitle);
    if (matched) {
      // In a full wiring this would open the session modal pre-filled
      window.alert(`سيتم فتح نافذة إضافة جلسة للقضية: ${matched.case_number} — ${matched.case_title}${parsed.date ? ` بتاريخ ${parsed.date}` : ''}`);
    }
  } else if (parsed.action === 'add_deadline') {
    window.alert('سيتم فتح حاسبة المهل المرئية لحساب الموعد.');
  } else if (parsed.action === 'add_task') {
    window.alert('سيتم فتح نافذة إنشاء مهمة جديدة.');
  }
  setOmniboxValue('');
}
