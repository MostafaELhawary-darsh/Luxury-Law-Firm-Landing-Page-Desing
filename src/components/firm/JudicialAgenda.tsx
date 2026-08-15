import { useEffect, useState } from 'react';
import { Calendar, Clock, Gavel, CheckCircle2, XCircle, FileText, Loader2, ChevronDown, ChevronUp, Plus, Pencil, Trash2, AlertTriangle, Cloud } from 'lucide-react';
import { supabase, formatDate } from '@/lib/financeUtils';
import type { CourtSession, Case } from '@/lib/firmTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

interface RouteAlert {
  id: string;
  alert_type: string;
  severity: string;
  message: string;
  estimated_delay_min: number;
  traffic_index: number;
  weather_condition: string | null;
  departure_needed_at: string | null;
  session_time: string | null;
  acknowledged: boolean;
}

interface SessionFormData {
  case_id: string; session_date: string; session_time: string; court_name: string;
  circuit: string; session_type: string; attendees_plaintiff: boolean; attendees_defendant: boolean;
  documents_submitted: string; requests_submitted: string; defenses_submitted: string;
  memos_submitted: string; court_decision: string; status: string;
}

const emptyForm: SessionFormData = {
  case_id: '', session_date: '', session_time: '10:00', court_name: '', circuit: '',
  session_type: 'جلسة نظر', attendees_plaintiff: false, attendees_defendant: false,
  documents_submitted: '', requests_submitted: '', defenses_submitted: '',
  memos_submitted: '', court_decision: '', status: 'مجدولة',
};

export default function JudicialAgenda({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [sessions, setSessions] = useState<CourtSession[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SessionFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [routeAlerts, setRouteAlerts] = useState<RouteAlert[]>([]);

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      const resolvedDate = cmd.fields.date ? new Date(cmd.fields.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
      setForm({ ...emptyForm, session_date: resolvedDate });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const fetchAll = async () => {
    setLoading(true);
    const [sessRes, caseRes, alertRes] = await Promise.all([
      supabase.from('lf_court_sessions').select('*, case:lf_cases(*)').order('session_date', { ascending: true }),
      supabase.from('lf_cases').select('id, case_number, case_title').order('case_number'),
      supabase.from('m107_route_alerts').select('*').eq('acknowledged', false).order('created_at', { ascending: false }),
    ]);
    setSessions((sessRes.data as CourtSession[]) || []);
    setCases((caseRes.data as Case[]) || []);
    setRouteAlerts((alertRes.data as RouteAlert[]) || []);
    setLoading(false);
  };

  const openAdd = () => { setForm({ ...emptyForm, session_date: new Date().toISOString().slice(0, 10) }); setEditingId(null); setModalOpen(true); };
  const openEdit = (s: CourtSession) => {
    setForm({
      case_id: s.case_id || '', session_date: s.session_date || '', session_time: s.session_time || '10:00',
      court_name: s.court_name || '', circuit: s.circuit || '', session_type: s.session_type || 'جلسة نظر',
      attendees_plaintiff: s.attendees_plaintiff, attendees_defendant: s.attendees_defendant,
      documents_submitted: s.documents_submitted || '', requests_submitted: s.requests_submitted || '',
      defenses_submitted: s.defenses_submitted || '', memos_submitted: s.memos_submitted || '',
      court_decision: s.court_decision || '', status: s.status || 'مجدولة',
    });
    setEditingId(s.id); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.session_date || !form.case_id) return;
    setSaving(true);
    const payload = {
      case_id: form.case_id,
      session_date: form.session_date,
      session_time: form.session_time,
      court_name: form.court_name.trim() || null,
      circuit: form.circuit.trim() || null,
      session_type: form.session_type,
      attendees_plaintiff: form.attendees_plaintiff,
      attendees_defendant: form.attendees_defendant,
      documents_submitted: form.documents_submitted.trim() || null,
      requests_submitted: form.requests_submitted.trim() || null,
      defenses_submitted: form.defenses_submitted.trim() || null,
      memos_submitted: form.memos_submitted.trim() || null,
      court_decision: form.court_decision.trim() || null,
      status: form.status,
    };
    if (editingId) {
      await supabase.from('lf_court_sessions').update(payload).eq('id', editingId);
    } else {
      await supabase.from('lf_court_sessions').insert(payload);
    }
    setSaving(false); setModalOpen(false); fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('lf_court_sessions').delete().eq('id', deleteId);
    setDeleteId(null); fetchAll();
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;

  const upcoming = sessions.filter((s) => s.status === 'مجدولة');
  const completed = sessions.filter((s) => s.status === 'تمت');
  const affectedUpcomingCount = upcoming.filter((session) => {
    const sessionDate = session.session_date ? new Date(`${session.session_date}T${session.session_time || '10:00'}`) : null;
    if (!sessionDate) return false;
    return routeAlerts.some((alert) => {
      const alertSessionAt = alert.session_time ? new Date(alert.session_time).getTime() : null;
      const departureAt = alert.departure_needed_at ? new Date(alert.departure_needed_at).getTime() : null;
      if (!alertSessionAt && !departureAt) return false;
      const windowStart = alertSessionAt ? alertSessionAt - 120 * 60000 : departureAt!;
      const windowEnd = alertSessionAt ? alertSessionAt + 120 * 60000 : departureAt! + 120 * 60000;
      return sessionDate.getTime() >= windowStart && sessionDate.getTime() <= windowEnd;
    });
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar size={20} className="text-gold" />
          <h2 className="font-heading font-bold text-midnight text-lg">الأجندة القضائية</h2>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
          <Plus size={16} /> إضافة جلسة
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={<Calendar size={14} className="text-blue-600" />} label="إجمالي الجلسات" value={String(sessions.length)} valueClass="text-midnight" />
        <StatCard icon={<Clock size={14} className="text-amber-600" />} label="جلسات قادمة" value={String(upcoming.length)} valueClass="text-amber-700" />
        <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="جلسات تمت" value={String(completed.length)} valueClass="text-green-700" />
        <StatCard icon={<AlertTriangle size={14} className={routeAlerts.length > 0 ? "text-red-600" : "text-ink/20"} />} label="تنبيهات طريق" value={String(routeAlerts.length)} valueClass={routeAlerts.length > 0 ? "text-red-700" : "text-ink/40"} />
        <StatCard icon={<AlertTriangle size={14} className={affectedUpcomingCount > 0 ? "text-red-600" : "text-ink/20"} />} label="جلسات متأثرة" value={String(affectedUpcomingCount)} valueClass={affectedUpcomingCount > 0 ? "text-red-700" : "text-ink/40"} />
      </div>

      {routeAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-heading font-bold text-red-900 text-sm mb-1">تنبيهات مروية نشطة قد تؤثر على الجلسات</p>
              <p className="font-body text-xs text-red-700 leading-relaxed">{routeAlerts[0]?.message}</p>
              {routeAlerts[0]?.estimated_delay_min > 0 && (
                <div className="flex items-center gap-2 mt-2 text-xs font-body text-red-600">
                  <Clock size={12} />
                  <span>تأخير متوقع: {routeAlerts[0].estimated_delay_min} دقيقة</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div>
        <h3 className="font-heading font-bold text-midnight text-sm mb-3">الجلسات القادمة</h3>
        <div className="space-y-3">
          {upcoming.length === 0 ? <p className="font-body text-xs text-ink/40 py-8 text-center bg-white rounded-xl border border-gray-200">لا توجد جلسات مجدولة</p> :
            upcoming.map((session) => {
              const affectedAlert = routeAlerts.find((alert) => {
                const sessionDateTime = new Date(`${session.session_date}T${session.session_time || '10:00'}`);
                const sessionTime = sessionDateTime.getTime();
                const alertSessionTime = alert.session_time ? new Date(alert.session_time).getTime() : null;
                const departureTime = alert.departure_needed_at ? new Date(alert.departure_needed_at).getTime() : null;
                const windowStart = alertSessionTime ? alertSessionTime - 120 * 60000 : departureTime ?? sessionTime;
                const windowEnd = alertSessionTime ? alertSessionTime + 120 * 60000 : (departureTime ?? sessionTime) + 120 * 60000;
                return sessionTime >= windowStart && sessionTime <= windowEnd;
              });
              return <SessionCard key={session.id} session={session} affectedAlert={affectedAlert} expanded={expandedId === session.id} onToggle={() => setExpandedId(expandedId === session.id ? null : session.id)} onEdit={() => openEdit(session)} onDelete={() => setDeleteId(session.id)} />;
            })}
        </div>
      </div>

      <div>
        <h3 className="font-heading font-bold text-midnight text-sm mb-3">الجلسات السابقة</h3>
        <div className="space-y-3">
          {completed.map((session) => <SessionCard key={session.id} session={session} expanded={expandedId === session.id} onToggle={() => setExpandedId(expandedId === session.id ? null : session.id)} onEdit={() => openEdit(session)} onDelete={() => setDeleteId(session.id)} />)}
        </div>
      </div>

      <EntityModal open={modalOpen} title={editingId ? 'تعديل جلسة' : 'إضافة جلسة جديدة'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <Field label="القضية المرتبطة" required>
          <Select value={form.case_id} onChange={(e) => setForm({ ...form, case_id: e.target.value })}>
            <option value="">— اختر القضية —</option>
            {cases.map((c) => <option key={c.id} value={c.id}>{c.case_number} — {c.case_title}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-3 gap-4">
          <Field label="تاريخ الجلسة" required><TextInput type="date" value={form.session_date} onChange={(e) => setForm({ ...form, session_date: e.target.value })} /></Field>
          <Field label="الوقت"><TextInput type="time" value={form.session_time} onChange={(e) => setForm({ ...form, session_time: e.target.value })} /></Field>
          <Field label="نوع الجلسة">
            <Select value={form.session_type} onChange={(e) => setForm({ ...form, session_type: e.target.value })}>
              <option value="جلسة نظر">جلسة نظر</option><option value="جلسة حكم">جلسة حكم</option>
              <option value="جلسة إعلان">جلسة إعلان</option><option value="جلسة مرافعة">جلسة مرافعة</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم المحكمة"><TextInput value={form.court_name} onChange={(e) => setForm({ ...form, court_name: e.target.value })} /></Field>
          <Field label="الدائرة"><TextInput value={form.circuit} onChange={(e) => setForm({ ...form, circuit: e.target.value })} placeholder="مثال: الدائرة 15" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Checkbox label="حضور المدعي" checked={form.attendees_plaintiff} onChange={(v) => setForm({ ...form, attendees_plaintiff: v })} />
          <Checkbox label="حضور المدعى عليه" checked={form.attendees_defendant} onChange={(v) => setForm({ ...form, attendees_defendant: v })} />
        </div>
        <Field label="المستندات المقدمة"><TextArea value={form.documents_submitted} onChange={(e) => setForm({ ...form, documents_submitted: e.target.value })} /></Field>
        <Field label="الطلبات المقدمة"><TextArea value={form.requests_submitted} onChange={(e) => setForm({ ...form, requests_submitted: e.target.value })} /></Field>
        <Field label="الدفوع"><TextArea value={form.defenses_submitted} onChange={(e) => setForm({ ...form, defenses_submitted: e.target.value })} /></Field>
        <Field label="المذكرات"><TextArea value={form.memos_submitted} onChange={(e) => setForm({ ...form, memos_submitted: e.target.value })} /></Field>
        <Field label="قرار المحكمة"><TextArea value={form.court_decision} onChange={(e) => setForm({ ...form, court_decision: e.target.value })} /></Field>
        <Field label="الحالة">
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="مجدولة">مجدولة</option><option value="تمت">تمت</option><option value="مؤجلة">مؤجلة</option>
          </Select>
        </Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} message="سيتم حذف هذه الجلسة نهائياً." />
    </div>
  );
}

function SessionCard({ session, affectedAlert, expanded, onToggle, onEdit, onDelete }: { session: CourtSession; affectedAlert?: RouteAlert; expanded: boolean; onToggle: () => void; onEdit: () => void; onDelete: () => void; }) {
  const isUpcoming = session.status === 'مجدولة';
  const isCritical = affectedAlert && affectedAlert.severity === 'critical';
  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all group ${
      affectedAlert
        ? isCritical ? 'border-red-300 bg-red-50/50' : 'border-amber-300 bg-amber-50/50'
        : isUpcoming ? 'border-amber-200' : 'border-gray-200'
    }`}>
      <button onClick={onToggle} className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center flex-shrink-0 ${
            affectedAlert
              ? isCritical ? 'bg-red-100' : 'bg-amber-100'
              : isUpcoming ? 'bg-amber-50' : 'bg-green-50'
          }`}>
            {affectedAlert ? (
              <AlertTriangle size={16} className={isCritical ? 'text-red-600' : 'text-amber-600'} />
            ) : (
              <>
                <span className={`font-heading font-bold text-sm ${isUpcoming ? 'text-amber-700' : 'text-green-700'}`}>{new Date(session.session_date).getDate()}</span>
                <span className={`font-body text-[8px] ${isUpcoming ? 'text-amber-600' : 'text-green-600'}`}>{['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'][new Date(session.session_date).getMonth()]}</span>
              </>
            )}
          </div>
          <div className="flex-1 min-w-0 text-right">
            <div className="flex items-center gap-2 justify-end">
              <p className="font-body text-xs font-bold text-midnight truncate">{session.case?.case_title || '—'}</p>
              {affectedAlert && <span className={`text-[10px] font-body font-bold ${isCritical ? 'text-red-600' : 'text-amber-600'}`}>⚠ متأثرة</span>}
            </div>
            <p className="font-body text-[10px] text-ink/50 truncate">{session.court_name} — {session.circuit}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={`px-2 py-0.5 rounded text-[10px] font-body ${
            affectedAlert
              ? isCritical ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
              : isUpcoming ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
          }`}>{session.session_type}</span>
          <span className="font-body text-[10px] text-ink/40">{session.session_time}</span>
          {expanded ? <ChevronUp size={16} className="text-ink/40" /> : <ChevronDown size={16} className="text-ink/40" />}
        </div>
      </button>
      {expanded && (
        <div className={`px-5 py-4 border-t space-y-3 ${
          affectedAlert ? (affectedAlert.severity === 'critical' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50') : 'border-gray-100'
        }`}>
          {affectedAlert && (
            <div className={`rounded-lg p-3 border ${
              affectedAlert.severity === 'critical'
                ? 'bg-red-100 border-red-300 text-red-900'
                : 'bg-amber-100 border-amber-300 text-amber-900'
            }`}>
              <div className="flex items-start gap-2">
                {affectedAlert.alert_type === 'TRAFFIC_DELAY' ? <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" /> : <Cloud size={14} className="flex-shrink-0 mt-0.5" />}
                <div className="text-xs font-body">
                  <p className="font-bold">{affectedAlert.alert_type === 'TRAFFIC_DELAY' ? 'تنبيه ازدحام مروري' : 'تنبيه حالة طقس'}</p>
                  <p className="mt-1 text-[11px]">{affectedAlert.message}</p>
                  {affectedAlert.estimated_delay_min > 0 && <p className="mt-1 text-[10px] font-bold">التأخير المتوقع: {affectedAlert.estimated_delay_min} دقيقة</p>}
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center justify-end gap-1 pb-2 border-b border-gray-50">
            <button onClick={onEdit} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={14} /></button>
            <button onClick={onDelete} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-body text-[10px] text-ink/40 mb-1">حضور المدعي</p>
              <div className="flex items-center gap-1">{session.attendees_plaintiff ? <><CheckCircle2 size={12} className="text-green-600" /><span className="font-body text-xs text-green-700">حاضر</span></> : <><XCircle size={12} className="text-red-500" /><span className="font-body text-xs text-red-500">غائب</span></>}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-body text-[10px] text-ink/40 mb-1">حضور المدعى عليه</p>
              <div className="flex items-center gap-1">{session.attendees_defendant ? <><CheckCircle2 size={12} className="text-green-600" /><span className="font-body text-xs text-green-700">حاضر</span></> : <><XCircle size={12} className="text-red-500" /><span className="font-body text-xs text-red-500">غائب</span></>}</div>
            </div>
          </div>
          {session.documents_submitted && <DetailRow icon={<FileText size={12} className="text-blue-500" />} label="المستندات المقدمة" value={session.documents_submitted} />}
          {session.requests_submitted && <DetailRow icon={<Gavel size={12} className="text-amber-500" />} label="الطلبات" value={session.requests_submitted} />}
          {session.defenses_submitted && <DetailRow icon={<FileText size={12} className="text-red-500" />} label="الدفوع" value={session.defenses_submitted} />}
          {session.memos_submitted && <DetailRow icon={<FileText size={12} className="text-midnight" />} label="المذكرات" value={session.memos_submitted} />}
          {session.court_decision && <div className="bg-gold/5 border border-gold/20 rounded-lg p-3"><p className="font-body text-[10px] text-gold/70 mb-1">قرار المحكمة</p><p className="font-body text-xs text-midnight">{session.court_decision}</p></div>}
        </div>
      )}
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex items-start gap-2"><div className="flex-shrink-0 mt-0.5">{icon}</div><div><p className="font-body text-[10px] text-ink/40">{label}</p><p className="font-body text-xs text-ink/70">{value}</p></div></div>;
}
