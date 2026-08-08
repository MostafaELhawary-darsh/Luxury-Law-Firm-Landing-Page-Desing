import { useEffect, useState, useCallback } from 'react';
import {
  Video, Loader2, Clock, Users, FileText, Globe, ExternalLink, Calendar, Plus,
  Pencil, Trash2, ShieldOff, Lock, PenTool, Brain, Languages,
  CheckSquare, Send, Mail, RefreshCw, CheckCircle2, XCircle, Radio, Mic, MicOff,
  Monitor, Award, Zap, FileSignature, UserCheck, Hash,
} from 'lucide-react';
import { supabase, formatDate } from '@/lib/financeUtils';
import type {
  Meeting, MeetingParticipant, MeetingPrivilegeCert, MeetingSignature,
  MeetingAiPrompt, MeetingTranscript, MeetingMinute, MeetingTask,
  MeetingCalendarSync, MeetingEmailDispatch,
} from '@/lib/firmTypes';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { Attorney } from '@/lib/financeTypes';
import type { PendingAddCommand } from '@/lib/voiceTypes';

interface MeetingFormData {
  title: string; meeting_type: string; scheduled_date: string; scheduled_time: string;
  duration_minutes: string; platform: string; meeting_url: string; organizer_id: string;
  agenda: string; participants: string; shared_documents: string; status: string; language: string;
  is_internal: boolean; max_participants: string; privilege_mode: boolean; recording_enabled: boolean;
}

const emptyForm: MeetingFormData = {
  title: '', meeting_type: 'مرئية', scheduled_date: '', scheduled_time: '10:00',
  duration_minutes: '60', platform: 'Hawari Secure Room', meeting_url: '', organizer_id: '',
  agenda: '', participants: '', shared_documents: '', status: 'مجدولة', language: 'العربية',
  is_internal: false, max_participants: '50', privilege_mode: false, recording_enabled: true,
};

type TabId = 'rooms' | 'privilege' | 'esign' | 'ai' | 'transcript' | 'mom' | 'automation';

const TABS: { id: TabId; label: string; icon: typeof Video }[] = [
  { id: 'rooms', label: 'غرف الانعقاد', icon: Video },
  { id: 'privilege', label: 'غرفة المداولة السرية', icon: ShieldOff },
  { id: 'esign', label: 'التوقيع الرقمي الموثق', icon: PenTool },
  { id: 'ai', label: 'المساعد القانوني اللحظي', icon: Brain },
  { id: 'transcript', label: 'التفريغ والترجمة', icon: Languages },
  { id: 'mom', label: 'محضر الاجتماع الذكي', icon: FileText },
  { id: 'automation', label: 'الأتمتة اللحظية', icon: Zap },
];

export default function MeetingManagement({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('rooms');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MeetingFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);

  // Sub-data per selected meeting
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [privilegeCerts, setPrivilegeCerts] = useState<MeetingPrivilegeCert[]>([]);
  const [signatures, setSignatures] = useState<MeetingSignature[]>([]);
  const [aiPrompts, setAiPrompts] = useState<MeetingAiPrompt[]>([]);
  const [transcripts, setTranscripts] = useState<MeetingTranscript[]>([]);
  const [minutes, setMinutes] = useState<MeetingMinute[]>([]);
  const [meetingTasks, setMeetingTasks] = useState<MeetingTask[]>([]);
  const [calendarSyncs, setCalendarSyncs] = useState<MeetingCalendarSync[]>([]);
  const [emailDispatches, setEmailDispatches] = useState<MeetingEmailDispatch[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [meetRes, attRes] = await Promise.all([
      supabase.from('lf_meetings').select('*, organizer:lf_attorneys(name)').order('scheduled_date', { ascending: true }),
      supabase.from('lf_attorneys').select('*').order('name'),
    ]);
    setMeetings((meetRes.data as Meeting[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      const now = new Date();
      setForm({ ...emptyForm, title: cmd.fields.title || '', scheduled_date: now.toISOString().slice(0, 10), scheduled_time: '10:00' });
      setEditingId(null); setModalOpen(true);
    }
  }, [voiceAdd]);

  const fetchMeetingDetails = useCallback(async (meetingId: string) => {
    setSelectedMeetingId(meetingId);
    const [pRes, cRes, sRes, aRes, tRes, mRes, tkRes, csRes, edRes] = await Promise.all([
      supabase.from('lf_meeting_participants').select('*').eq('meeting_id', meetingId).order('created_at'),
      supabase.from('lf_meeting_privilege_certs').select('*').eq('meeting_id', meetingId).order('activated_at', { ascending: false }),
      supabase.from('lf_meeting_signatures').select('*').eq('meeting_id', meetingId).order('signed_at', { ascending: false }),
      supabase.from('lf_meeting_ai_prompts').select('*').eq('meeting_id', meetingId).order('shown_at', { ascending: false }),
      supabase.from('lf_meeting_transcripts').select('*').eq('meeting_id', meetingId).order('timestamp_sec', { ascending: true }),
      supabase.from('lf_meeting_minutes').select('*').eq('meeting_id', meetingId).order('created_at', { ascending: false }),
      supabase.from('lf_meeting_tasks').select('*').eq('meeting_id', meetingId).order('created_at', { ascending: false }),
      supabase.from('lf_meeting_calendar_sync').select('*').eq('meeting_id', meetingId).order('event_date'),
      supabase.from('lf_meeting_email_dispatch').select('*').eq('meeting_id', meetingId).order('sent_at', { ascending: false }),
    ]);
    setParticipants((pRes.data as MeetingParticipant[]) || []);
    setPrivilegeCerts((cRes.data as MeetingPrivilegeCert[]) || []);
    setSignatures((sRes.data as MeetingSignature[]) || []);
    setAiPrompts((aRes.data as MeetingAiPrompt[]) || []);
    setTranscripts((tRes.data as MeetingTranscript[]) || []);
    setMinutes((mRes.data as MeetingMinute[]) || []);
    setMeetingTasks((tkRes.data as MeetingTask[]) || []);
    setCalendarSyncs((csRes.data as MeetingCalendarSync[]) || []);
    setEmailDispatches((edRes.data as MeetingEmailDispatch[]) || []);
  }, []);

  const openAdd = () => {
    const now = new Date();
    setForm({ ...emptyForm, scheduled_date: now.toISOString().slice(0, 10), scheduled_time: '10:00' });
    setEditingId(null); setModalOpen(true);
  };

  const openEdit = (m: Meeting) => {
    const dt = new Date(m.scheduled_date);
    setForm({
      title: m.title, meeting_type: m.meeting_type, scheduled_date: dt.toISOString().slice(0, 10),
      scheduled_time: dt.toTimeString().slice(0, 5), duration_minutes: String(m.duration_minutes || 60),
      platform: m.platform || 'Hawari Secure Room', meeting_url: m.meeting_url || '', organizer_id: m.organizer_id || '',
      agenda: m.agenda || '', participants: (m.participants || []).join('، '),
      shared_documents: (m.shared_documents || []).join('، '), status: m.status || 'مجدولة', language: m.language || 'العربية',
      is_internal: m.is_internal || false, max_participants: String(m.max_participants || 50),
      privilege_mode: m.privilege_mode || false, recording_enabled: m.recording_enabled !== false,
    });
    setEditingId(m.id); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.scheduled_date) return;
    setSaving(true);
    const scheduledDateTime = new Date(`${form.scheduled_date}T${form.scheduled_time}:00`).toISOString();
    const payload = {
      title: form.title.trim(),
      meeting_type: form.meeting_type,
      scheduled_date: scheduledDateTime,
      duration_minutes: Number(form.duration_minutes) || 60,
      platform: form.platform,
      meeting_url: form.meeting_url.trim() || null,
      organizer_id: form.organizer_id || null,
      agenda: form.agenda.trim() || null,
      participants: form.participants ? form.participants.split('،').map((s) => s.trim()).filter(Boolean) : [],
      shared_documents: form.shared_documents ? form.shared_documents.split('،').map((s) => s.trim()).filter(Boolean) : [],
      status: form.status,
      language: form.language,
      is_internal: form.is_internal,
      max_participants: Number(form.max_participants) || 50,
      privilege_mode: form.privilege_mode,
      recording_enabled: form.recording_enabled,
    };
    if (editingId) {
      await supabase.from('lf_meetings').update(payload).eq('id', editingId);
    } else {
      const { data } = await supabase.from('lf_meetings').insert(payload).select().single();
      if (data) {
        // Seed participants from the participants field
        const parts = form.participants ? form.participants.split('،').map((s) => s.trim()).filter(Boolean) : [];
        if (parts.length > 0) {
          await supabase.from('lf_meeting_participants').insert(
            parts.map((name, i) => ({ meeting_id: data.id, name, role: i === 0 ? 'مضيف' : 'مشارك', is_host: i === 0, join_status: 'pending' }))
          );
        }
      }
    }
    setSaving(false); setModalOpen(false); fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('lf_meetings').delete().eq('id', deleteId);
    setDeleteId(null); fetchAll();
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Video size={20} className="text-gold" />
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">غرفة العمليات القانونية الذكية</h2>
            <p className="font-body text-[10px] text-ink/40 mt-0.5">مساحة عمل قانونية مشفرة ومتكاملة • خصوصية مطلقة • أتمتة لحظية للمخرجات</p>
          </div>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
          <Plus size={16} /> غرفة جديدة
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Video size={14} className="text-midnight" />} label="إجمالي الغرف" value={String(meetings.length)} valueClass="text-midnight" />
        <StatCard icon={<ShieldOff size={14} className="text-red-600" />} label="غرف مداولة سرية" value={String(meetings.filter((m) => m.privilege_mode).length)} valueClass="text-red-700" />
        <StatCard icon={<Users size={14} className="text-blue-600" />} label="اجتماعات داخلية" value={String(meetings.filter((m) => m.is_internal).length)} valueClass="text-blue-700" />
        <StatCard icon={<Calendar size={14} className="text-amber-600" />} label="مجدولة" value={String(meetings.filter((m) => m.status === 'مجدولة').length)} valueClass="text-amber-700" />
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-2 flex-wrap border-b border-gray-200 pb-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-body text-sm font-bold transition-all border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'text-gold border-gold bg-gold/5'
                  : 'text-ink/50 border-transparent hover:text-ink/70 hover:bg-gray-50'
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ===== TABS ===== */}
      {activeTab === 'rooms' && <RoomsTab meetings={meetings} onEdit={openEdit} onDelete={(id) => setDeleteId(id)} onSelect={fetchMeetingDetails} selectedId={selectedMeetingId} participants={participants} />}
      {activeTab === 'privilege' && <PrivilegeTab meetings={meetings} selectedId={selectedMeetingId} certs={privilegeCerts} onActivate={async (id) => {
        const hash = `PRV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        await supabase.from('lf_meeting_privilege_certs').insert({ meeting_id: id, certificate_hash: hash, issued_by: 'مضيف الجلسة' });
        await supabase.from('lf_meetings').update({ privilege_mode: true, recording_enabled: false }).eq('id', id);
        fetchMeetingDetails(id); fetchAll();
      }} onDeactivate={async (id, certId) => {
        await supabase.from('lf_meeting_privilege_certs').update({ deactivated_at: new Date().toISOString() }).eq('id', certId);
        await supabase.from('lf_meetings').update({ privilege_mode: false }).eq('id', id);
        fetchMeetingDetails(id); fetchAll();
      }} onSelect={fetchMeetingDetails} />}
      {activeTab === 'esign' && <ESignTab meetings={meetings} selectedId={selectedMeetingId} signatures={signatures} onSelect={fetchMeetingDetails} onSign={async (id, doc, signer) => {
        const videoHash = `VID-${Math.random().toString(36).slice(2, 16).toUpperCase()}`;
        const pdfHash = `PDF-${Math.random().toString(36).slice(2, 16).toUpperCase()}`;
        await supabase.from('lf_meeting_signatures').insert({ meeting_id: id, document_title: doc, signer_name: signer, video_hash: videoHash, pdf_hash: pdfHash, ip_address: '10.0.0.1' });
        fetchMeetingDetails(id);
      }} />}
      {activeTab === 'ai' && <AiPromptTab meetings={meetings} selectedId={selectedMeetingId} prompts={aiPrompts} onSelect={fetchMeetingDetails} onAdd={async (id, term, ref, text) => {
        await supabase.from('lf_meeting_ai_prompts').insert({ meeting_id: id, trigger_term: term, legal_reference: ref, suggestion_text: text });
        fetchMeetingDetails(id);
      }} onDismiss={async (promptId) => {
        await supabase.from('lf_meeting_ai_prompts').update({ dismissed: true }).eq('id', promptId);
        if (selectedMeetingId) fetchMeetingDetails(selectedMeetingId);
      }} />}
      {activeTab === 'transcript' && <TranscriptTab meetings={meetings} selectedId={selectedMeetingId} transcripts={transcripts} onSelect={fetchMeetingDetails} onAdd={async (id, speaker, text, lang) => {
        const ts = transcripts.length > 0 ? transcripts[transcripts.length - 1].timestamp_sec + 5 : 0;
        const translated = lang !== 'العربية' ? text : null;
        await supabase.from('lf_meeting_transcripts').insert({ meeting_id: id, speaker, text_ar: text, text_translated: translated, language: lang, timestamp_sec: ts });
        fetchMeetingDetails(id);
      }} />}
      {activeTab === 'mom' && <MomTab meetings={meetings} selectedId={selectedMeetingId} minutes={minutes} onSelect={fetchMeetingDetails} onGenerate={async (id, content) => {
        await supabase.from('lf_meeting_minutes').insert({ meeting_id: id, content, status: 'draft' });
        await supabase.from('lf_meetings').update({ mom_status: 'draft' }).eq('id', id);
        fetchMeetingDetails(id); fetchAll();
      }} onApprove={async (minuteId, meetingId, approver) => {
        await supabase.from('lf_meeting_minutes').update({ status: 'approved', approved_by: approver, approved_at: new Date().toISOString() }).eq('id', minuteId);
        await supabase.from('lf_meetings').update({ mom_status: 'approved' }).eq('id', meetingId);
        fetchMeetingDetails(meetingId); fetchAll();
      }} />}
      {activeTab === 'automation' && <AutomationTab meetings={meetings} selectedId={selectedMeetingId} tasks={meetingTasks} calendarSyncs={calendarSyncs} emailDispatches={emailDispatches} onSelect={fetchMeetingDetails} onAddTask={async (id, title, assignee, deadline) => {
        await supabase.from('lf_meeting_tasks').insert({ meeting_id: id, title, assignee, deadline, status: 'pending' });
        fetchMeetingDetails(id);
      }} onSyncTask={async (taskId) => {
        // Trello sync disabled platform-wide — no external card creation
        void taskId;
      }} onAddCalendarSync={async (id, title, date, target) => {
        // Calendar sync disabled platform-wide — no external calendar API calls
        void id; void title; void date; void target;
      }} onAddEmailDispatch={async (id, recipient, subject, withVideo) => {
        // Email dispatch disabled platform-wide — no SMTP/external email sending
        void id; void recipient; void subject; void withVideo;
      }} />}

      {/* Meeting form modal */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل غرفة' : 'إنشاء غرفة عمليات جديدة'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <Field label="عنوان الجلسة" required><TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: مداولة سرية — قضية تحكيم" /></Field>
        <div className="grid grid-cols-3 gap-4">
          <Field label="نوع الجلسة">
            <Select value={form.meeting_type} onChange={(e) => setForm({ ...form, meeting_type: e.target.value })}>
              <option value="مرئية">مرئية</option><option value="مسموعة">مسموعة</option><option value="كتابية">كتابية</option>
            </Select>
          </Field>
          <Field label="المنصة">
            <Select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
              <option value="Hawari Secure Room">Hawari Secure Room</option>
              <option value="Zoom">Zoom</option><option value="Microsoft Teams">Microsoft Teams</option><option value="Google Meet">Google Meet</option>
            </Select>
          </Field>
          <Field label="المدة (دقيقة)"><TextInput type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="التاريخ" required><TextInput type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} /></Field>
          <Field label="الوقت"><TextInput type="time" value={form.scheduled_time} onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })} /></Field>
        </div>
        <Field label="رابط الجلسة"><TextInput value={form.meeting_url} onChange={(e) => setForm({ ...form, meeting_url: e.target.value })} placeholder="https://..." /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المنظم">
            <Select value={form.organizer_id} onChange={(e) => setForm({ ...form, organizer_id: e.target.value })}>
              <option value="">— اختر —</option>
              {attorneys.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
          <Field label="اللغة">
            <Select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
              <option value="العربية">العربية</option><option value="الإنجليزية">الإنجليزية</option><option value="الفرنسية">الفرنسية</option>
            </Select>
          </Field>
        </div>
        <Field label="جدول الأعمال"><TextArea value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} /></Field>
        <Field label="المشاركون (افصل بين الأسماء بفاصلة)"><TextInput value={form.participants} onChange={(e) => setForm({ ...form, participants: e.target.value })} placeholder="مثال: أ. أحمد، م. محمد" /></Field>
        <Field label="المستندات المشتركة (افصل بينها بفاصلة)"><TextInput value={form.shared_documents} onChange={(e) => setForm({ ...form, shared_documents: e.target.value })} placeholder="مثال: عقد البيع، مذكرة الدفاع" /></Field>
        <div className="grid grid-cols-3 gap-4">
          <Field label="السعة القصوى"><TextInput type="number" value={form.max_participants} onChange={(e) => setForm({ ...form, max_participants: e.target.value })} /></Field>
          <Field label="الحالة">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="مجدولة">مجدولة</option><option value="منعقدة">منعقدة</option><option value="ملغاة">ملغاة</option>
            </Select>
          </Field>
          <div className="flex flex-col justify-end gap-2 pt-5">
            <label className="flex items-center gap-2 font-body text-xs text-ink/60 cursor-pointer">
              <input type="checkbox" checked={form.is_internal} onChange={(e) => setForm({ ...form, is_internal: e.target.checked })} className="rounded" />
              اجتماع داخلي
            </label>
            <label className="flex items-center gap-2 font-body text-xs text-ink/60 cursor-pointer">
              <input type="checkbox" checked={form.privilege_mode} onChange={(e) => setForm({ ...form, privilege_mode: e.target.checked })} className="rounded" />
              <ShieldOff size={12} className="text-red-500" /> مداولة سرية
            </label>
            <label className="flex items-center gap-2 font-body text-xs text-ink/60 cursor-pointer">
              <input type="checkbox" checked={form.recording_enabled} onChange={(e) => setForm({ ...form, recording_enabled: e.target.checked })} className="rounded" />
              <Radio size={12} className="text-blue-500" /> تسجيل مفعّل
            </label>
          </div>
        </div>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}

// ===== Meeting selector dropdown (shared) =====
function MeetingSelector({ meetings, selectedId, onSelect }: { meetings: Meeting[]; selectedId: string | null; onSelect: (id: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Monitor size={14} className="text-ink/40" />
      <Select value={selectedId || ''} onChange={(e) => onSelect(e.target.value)} className="!w-auto">
        <option value="">— اختر غرفة —</option>
        {meetings.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
      </Select>
    </div>
  );
}

// ===== ROOMS TAB =====
function RoomsTab({ meetings, onEdit, onDelete, onSelect, selectedId, participants }: {
  meetings: Meeting[]; onEdit: (m: Meeting) => void; onDelete: (id: string) => void;
  onSelect: (id: string) => void; selectedId: string | null; participants: MeetingParticipant[];
}) {
  const meetingTypeIcons: Record<string, typeof Video> = { 'مرئية': Video, 'مسموعة': Users, 'كتابية': FileText };
  const meetingTypeColors: Record<string, string> = { 'مرئية': 'bg-blue-50 text-blue-700', 'مسموعة': 'bg-amber-50 text-amber-700', 'كتابية': 'bg-gray-100 text-gray-700' };

  return (
    <div className="space-y-4">
      {meetings.length === 0 && <p className="font-body text-sm text-ink/40 text-center py-8">لا توجد غرف عمليات بعد — أنشئ غرفة جديدة</p>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {meetings.map((m) => {
          const Icon = meetingTypeIcons[m.meeting_type] || Video;
          const typeColor = meetingTypeColors[m.meeting_type] || 'bg-gray-100 text-gray-700';
          const meetingDate = new Date(m.scheduled_date);
          const isPast = meetingDate < new Date();
          const isActive = selectedId === m.id;
          return (
            <div key={m.id} className={`bg-white rounded-xl border shadow-sm p-5 transition-all group ${isActive ? 'border-gold ring-2 ring-gold/20' : isPast ? 'border-gray-200 opacity-75' : 'border-gold/20 hover:border-gold/40'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeColor}`}><Icon size={18} /></div>
                  <div>
                    <p className="font-body text-xs font-bold text-midnight">{m.title}</p>
                    <p className="font-body text-[10px] text-ink/40">{m.platform}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => onSelect(m.id)} className="p-1.5 rounded text-ink/40 hover:text-blue-500 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100"><Monitor size={14} /></button>
                  <button onClick={() => onEdit(m)} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors opacity-0 group-hover:opacity-100"><Pencil size={14} /></button>
                  <button onClick={() => onDelete(m.id)} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mb-3">
                {m.privilege_mode && <span className="flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 rounded text-[9px] font-body font-bold"><ShieldOff size={10} /> مداولة سرية</span>}
                {m.is_internal && <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[9px] font-body font-bold"><Users size={10} /> داخلي</span>}
                {!m.recording_enabled && <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[9px] font-body font-bold"><MicOff size={10} /> بلا تسجيل</span>}
                <span className="px-2 py-0.5 bg-gray-50 text-ink/50 rounded text-[9px] font-body">{m.max_participants || 50} مشارك</span>
              </div>
              <div className="space-y-2 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <Calendar size={12} className="text-ink/30" /><p className="font-body text-[10px] text-ink/60">{formatDate(m.scheduled_date)}</p>
                  <span className="text-ink/20">|</span><Clock size={12} className="text-ink/30" />
                  <p className="font-body text-[10px] text-ink/60">{meetingDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })} — {m.duration_minutes} دقيقة</p>
                </div>
                {m.agenda && <div className="bg-gray-50 rounded-lg p-2"><p className="font-body text-[9px] text-ink/40 mb-0.5">جدول الأعمال</p><p className="font-body text-[10px] text-ink/70">{m.agenda}</p></div>}
                {m.participants && m.participants.length > 0 && (
                  <div><p className="font-body text-[9px] text-ink/40 mb-1">المشاركون</p>
                    <div className="flex flex-wrap gap-1">{m.participants.map((p, i) => <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[9px] font-body">{p}</span>)}</div>
                  </div>
                )}
                {isActive && participants.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-2 mt-2">
                    <p className="font-body text-[9px] text-blue-600 mb-1 font-bold">المشاركون المسجلون</p>
                    {participants.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 py-0.5">
                        <UserCheck size={10} className={p.join_status === 'joined' ? 'text-emerald-600' : 'text-gray-400'} />
                        <span className="font-body text-[10px] text-ink/70">{p.name}</span>
                        <span className="font-body text-[9px] text-ink/40">{p.role}</span>
                        <span className={`font-body text-[9px] ${p.join_status === 'joined' ? 'text-emerald-600' : 'text-amber-600'}`}>{p.join_status === 'joined' ? 'متصل' : 'بانتظار'}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                  <div className="flex items-center gap-2">
                    <Globe size={12} className="text-ink/30" /><span className="font-body text-[10px] text-ink/50">{m.language}</span>
                    {m.organizer && <span className="font-body text-[10px] text-ink/50">المنظم: {m.organizer.name}</span>}
                  </div>
                  {m.meeting_url && !isPast && (
                    <a href={m.meeting_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 bg-midnight text-cream rounded-lg font-body text-[10px] hover:bg-gold hover:text-midnight transition-colors">
                      <ExternalLink size={12} /> انضم
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== PRIVILEGE TAB =====
function PrivilegeTab({ meetings, selectedId, certs, onActivate, onDeactivate, onSelect }: {
  meetings: Meeting[]; selectedId: string | null; certs: MeetingPrivilegeCert[];
  onActivate: (id: string) => void; onDeactivate: (id: string, certId: string) => void; onSelect: (id: string) => void;
}) {
  const selected = meetings.find((m) => m.id === selectedId);
  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <ShieldOff size={16} className="text-red-600" />
          <p className="font-heading font-bold text-red-700 text-sm">غرفة المداولة السرية — Privilege Mode</p>
        </div>
        <p className="font-body text-[11px] text-red-600/80 leading-relaxed">
          زر الأمان يوقف التسجيل فوراً ويحول الاتصال إلى تشفير طرفيات (P2P) مباشر لمناقشة أسرار الموكل دون المرور بخوادم التسجيل، مع إصدار "شهادة عدم تسجيل" رقمية كدليل قاطع.
        </p>
      </div>
      <div className="flex items-center justify-between">
        <MeetingSelector meetings={meetings} selectedId={selectedId} onSelect={onSelect} />
        {selected && (
          <button onClick={() => onActivate(selected.id)} disabled={selected.privilege_mode}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-body text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50">
            <ShieldOff size={14} /> تفعيل المداولة السرية
          </button>
        )}
      </div>
      {selected && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lock size={14} className={selected.privilege_mode ? 'text-red-600' : 'text-gray-400'} />
            <p className="font-body text-xs font-bold text-midnight">{selected.title}</p>
            <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${selected.privilege_mode ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
              {selected.privilege_mode ? 'سرية مفعّلة' : 'غير مفعّلة'}
            </span>
          </div>
          {certs.length === 0 ? (
            <p className="font-body text-[11px] text-ink/40 text-center py-4">لا توجد شهادات عدم تسجيل — فعّل المداولة السرية لإصدار شهادة</p>
          ) : (
            <div className="space-y-2">
              {certs.map((c) => (
                <div key={c.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                  <Award size={16} className="text-red-600" />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[10px] font-bold text-midnight" dir="ltr">{c.certificate_hash}</p>
                    <p className="font-body text-[9px] text-ink/40">أُصدرت: {formatDate(c.activated_at)} — بواسطة: {c.issued_by}</p>
                  </div>
                  {c.deactivated_at ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[9px] font-body font-bold"><CheckCircle2 size={10} /> منتهية</span>
                  ) : (
                    <button onClick={() => onDeactivate(selected.id, c.id)} className="flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-700 rounded text-[9px] font-body font-bold hover:bg-gray-300 transition-colors">
                      <XCircle size={10} /> إنهاء
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===== E-SIGN TAB =====
function ESignTab({ meetings, selectedId, signatures, onSelect, onSign }: {
  meetings: Meeting[]; selectedId: string | null; signatures: MeetingSignature[];
  onSelect: (id: string) => void; onSign: (id: string, doc: string, signer: string) => void;
}) {
  const [docTitle, setDocTitle] = useState('');
  const [signerName, setSignerName] = useState('');
  const selected = meetings.find((m) => m.id === selectedId);

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <FileSignature size={16} className="text-amber-600" />
          <p className="font-heading font-bold text-amber-700 text-sm">التوقيع الرقمي الموثق بالفيديو — Video-Authenticated E-Sign</p>
        </div>
        <p className="font-body text-[11px] text-amber-600/80 leading-relaxed">
          عرض العقود المشفرة أثناء الجلسة وتوثيق لحظة توقيع الأطراف بالصوت والصورة، ودمج المقطع كبصمة أمنية داخل ملف PDF كدليل قاطع يمنع الطعن بالتزوير.
        </p>
      </div>
      <div className="flex items-center justify-between">
        <MeetingSelector meetings={meetings} selectedId={selectedId} onSelect={onSelect} />
      </div>
      {selected && (
        <>
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <p className="font-body text-xs font-bold text-midnight">توثيق توقيع جديد</p>
            <div className="grid grid-cols-2 gap-3">
              <TextInput value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="عنوان المستند (مثال: عقد بيع تجاري)" />
              <TextInput value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="اسم الموقّع" />
            </div>
            <button onClick={() => { if (docTitle.trim() && signerName.trim()) { onSign(selected.id, docTitle.trim(), signerName.trim()); setDocTitle(''); setSignerName(''); } }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg font-body text-sm font-bold hover:bg-amber-700 transition-colors">
              <PenTool size={14} /> توثيق التوقيع بالفيديو
            </button>
          </div>
          {signatures.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="font-body text-xs font-bold text-midnight mb-3">سجل التوقيعات الموثقة</p>
              <div className="space-y-2">
                {signatures.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                    <FileSignature size={16} className="text-amber-600" />
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-[11px] font-bold text-midnight">{s.document_title}</p>
                      <p className="font-body text-[9px] text-ink/40">الموقّع: {s.signer_name} — {formatDate(s.signed_at)}</p>
                    </div>
                    <div className="text-left space-y-0.5">
                      {s.video_hash && <p className="font-mono text-[8px] text-amber-600" dir="ltr">VID: {s.video_hash.slice(0, 20)}...</p>}
                      {s.pdf_hash && <p className="font-mono text-[8px] text-blue-600" dir="ltr">PDF: {s.pdf_hash.slice(0, 20)}...</p>}
                    </div>
                    <CheckCircle2 size={14} className="text-emerald-600" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ===== AI PROMPTER TAB =====
function AiPromptTab({ meetings, selectedId, prompts, onSelect, onAdd, onDismiss }: {
  meetings: Meeting[]; selectedId: string | null; prompts: MeetingAiPrompt[];
  onSelect: (id: string) => void; onAdd: (id: string, term: string, ref: string, text: string) => void; onDismiss: (id: string) => void;
}) {
  const [term, setTerm] = useState('');
  const [ref, setRef] = useState('');
  const [text, setText] = useState('');
  const selected = meetings.find((m) => m.id === selectedId);
  const activePrompts = prompts.filter((p) => !p.dismissed);

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Brain size={16} className="text-emerald-600" />
          <p className="font-heading font-bold text-emerald-700 text-sm">المساعد القانوني اللحظي — AI Legal Prompter</p>
        </div>
        <p className="font-body text-[11px] text-emerald-600/80 leading-relaxed">
          ذكاء اصطناعي يحلل النقاش اللحظي ويعرض للمحامي بطاقات تلميحية صامتة تحتوي على نصوص قانونية وسوابق قضائية بمجرد ذكر مصطلحات معينة.
        </p>
      </div>
      <div className="flex items-center justify-between">
        <MeetingSelector meetings={meetings} selectedId={selectedId} onSelect={onSelect} />
      </div>
      {selected && (
        <>
          {activePrompts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activePrompts.map((p) => (
                <div key={p.id} className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 relative">
                  <button onClick={() => onDismiss(p.id)} className="absolute top-2 left-2 p-1 rounded text-emerald-600 hover:bg-emerald-100"><XCircle size={12} /></button>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Hash size={11} className="text-emerald-600" />
                    <span className="font-mono text-[10px] font-bold text-emerald-700">{p.trigger_term}</span>
                  </div>
                  {p.legal_reference && <p className="font-body text-[10px] text-emerald-700 font-bold mb-1">{p.legal_reference}</p>}
                  {p.suggestion_text && <p className="font-body text-[10px] text-ink/70 leading-relaxed">{p.suggestion_text}</p>}
                </div>
              ))}
            </div>
          )}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <p className="font-body text-xs font-bold text-midnight">إضافة تلميح قانوني</p>
            <div className="grid grid-cols-2 gap-3">
              <TextInput value={term} onChange={(e) => setTerm(e.target.value)} placeholder="المصطلح المُحفّز (مثال: مسؤولية تضامنية)" />
              <TextInput value={ref} onChange={(e) => setRef(e.target.value)} placeholder="المرجع القانوني (مثال: المادة 164 مدني)" />
            </div>
            <TextArea value={text} onChange={(e) => setText(e.target.value)} placeholder="نص التلميح القانوني..." />
            <button onClick={() => { if (term.trim()) { onAdd(selected.id, term.trim(), ref.trim(), text.trim()); setTerm(''); setRef(''); setText(''); } }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-body text-sm font-bold hover:bg-emerald-700 transition-colors">
              <Brain size={14} /> عرض التلميح
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ===== TRANSCRIPT TAB =====
function TranscriptTab({ meetings, selectedId, transcripts, onSelect, onAdd }: {
  meetings: Meeting[]; selectedId: string | null; transcripts: MeetingTranscript[];
  onSelect: (id: string) => void; onAdd: (id: string, speaker: string, text: string, lang: string) => void;
}) {
  const [speaker, setSpeaker] = useState('');
  const [text, setText] = useState('');
  const [lang, setLang] = useState('العربية');
  const selected = meetings.find((m) => m.id === selectedId);

  return (
    <div className="space-y-4">
      <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Languages size={16} className="text-cyan-600" />
          <p className="font-heading font-bold text-cyan-700 text-sm">الترجمة الفورية والتفريغ الصوتي — Speech-to-Text</p>
        </div>
        <p className="font-body text-[11px] text-cyan-600/80 leading-relaxed">
          تحويل الحديث إلى نص مكتوب بدقة عالية مع ترجمة لحظية على الشاشة عند وجود أطراف أجنبية.
        </p>
      </div>
      <div className="flex items-center justify-between">
        <MeetingSelector meetings={meetings} selectedId={selectedId} onSelect={onSelect} />
      </div>
      {selected && (
        <>
          {transcripts.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 max-h-64 overflow-y-auto">
              <div className="space-y-2">
                {transcripts.map((t) => (
                  <div key={t.id} className="flex items-start gap-2">
                    <span className="font-mono text-[9px] text-cyan-600 flex-shrink-0 mt-0.5">{String(Math.floor(t.timestamp_sec / 60)).padStart(2, '0')}:{String(t.timestamp_sec % 60).padStart(2, '0')}</span>
                    <div className="flex-1">
                      <span className="font-body text-[10px] font-bold text-midnight">{t.speaker || 'متحدث'}: </span>
                      <span className="font-body text-[10px] text-ink/70">{t.text_ar}</span>
                      {t.text_translated && <p className="font-body text-[9px] text-cyan-600 italic mt-0.5">{t.text_translated}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <p className="font-body text-xs font-bold text-midnight">إضافة تفريغ صوتي</p>
            <div className="grid grid-cols-2 gap-3">
              <TextInput value={speaker} onChange={(e) => setSpeaker(e.target.value)} placeholder="اسم المتحدث" />
              <Select value={lang} onChange={(e) => setLang(e.target.value)}>
                <option value="العربية">العربية</option><option value="الإنجليزية">الإنجليزية</option><option value="الفرنسية">الفرنسية</option>
              </Select>
            </div>
            <TextArea value={text} onChange={(e) => setText(e.target.value)} placeholder="نص الحديث..." />
            <button onClick={() => { if (text.trim()) { onAdd(selected.id, speaker.trim(), text.trim(), lang); setSpeaker(''); setText(''); } }}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg font-body text-sm font-bold hover:bg-cyan-700 transition-colors">
              <Mic size={14} /> إضافة للتفريغ
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ===== MOM TAB =====
function MomTab({ meetings, selectedId, minutes, onSelect, onGenerate, onApprove }: {
  meetings: Meeting[]; selectedId: string | null; minutes: MeetingMinute[];
  onSelect: (id: string) => void; onGenerate: (id: string, content: string) => void; onApprove: (minuteId: string, meetingId: string, approver: string) => void;
}) {
  const [content, setContent] = useState('');
  const [approver, setApprover] = useState('');
  const selected = meetings.find((m) => m.id === selectedId);

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText size={16} className="text-amber-600" />
          <p className="font-heading font-bold text-amber-700 text-sm">محضر الاجتماع الذكي — Smart Minutes of Meeting</p>
        </div>
        <p className="font-body text-[11px] text-amber-600/80 leading-relaxed">
          ينشئ النظام محضراً ذكياً، وبمجرد اعتماد المحامي للمحضر، تتم المزامنة اللحظية مع برامج إدارة المشاريع والتقويم والبريد الإلكتروني.
        </p>
      </div>
      <div className="flex items-center justify-between">
        <MeetingSelector meetings={meetings} selectedId={selectedId} onSelect={onSelect} />
      </div>
      {selected && (
        <>
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <p className="font-body text-xs font-bold text-midnight">توليد محضر اجتماع</p>
            <TextArea value={content} onChange={(e) => setContent(e.target.value)} placeholder="اكتب محتوى المحضر (القرارات، التوصيات، المتابعة)..." />
            <button onClick={() => { if (content.trim()) { onGenerate(selected.id, content.trim()); setContent(''); } }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg font-body text-sm font-bold hover:bg-amber-700 transition-colors">
              <FileText size={14} /> توليد المحضر
            </button>
          </div>
          {minutes.length > 0 && (
            <div className="space-y-3">
              {minutes.map((m) => (
                <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${
                      m.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      m.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {m.status === 'approved' ? 'معتمد' : m.status === 'rejected' ? 'مرفوض' : 'مسودة'}
                    </span>
                    <p className="font-body text-[9px] text-ink/40">{formatDate(m.created_at)}</p>
                  </div>
                  <p className="font-body text-[11px] text-ink/70 whitespace-pre-wrap">{m.content}</p>
                  {m.status === 'approved' && m.approved_by && (
                    <p className="font-body text-[9px] text-emerald-600 mt-2">اعتمد بواسطة: {m.approved_by} — {m.approved_at && formatDate(m.approved_at)}</p>
                  )}
                  {m.status === 'draft' && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                      <TextInput value={approver} onChange={(e) => setApprover(e.target.value)} placeholder="اسم المعتمد" />
                      <button onClick={() => { if (approver.trim()) { onApprove(m.id, selected.id, approver.trim()); setApprover(''); } }}
                        className="flex items-center gap-1 px-3 py-2 bg-emerald-600 text-white rounded-lg font-body text-xs font-bold hover:bg-emerald-700 transition-colors flex-shrink-0">
                        <CheckCircle2 size={12} /> اعتماد
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ===== AUTOMATION TAB =====
function AutomationTab({ meetings, selectedId, tasks, calendarSyncs, emailDispatches, onSelect, onAddTask, onSyncTask, onAddCalendarSync, onAddEmailDispatch }: {
  meetings: Meeting[]; selectedId: string | null; tasks: MeetingTask[]; calendarSyncs: MeetingCalendarSync[]; emailDispatches: MeetingEmailDispatch[];
  onSelect: (id: string) => void; onAddTask: (id: string, title: string, assignee: string, deadline: string | null) => void;
  onSyncTask: (taskId: string) => void; onAddCalendarSync: (id: string, title: string, date: string, target: string) => void;
  onAddEmailDispatch: (id: string, recipient: string, subject: string, withVideo: boolean) => void;
}) {
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [calTitle, setCalTitle] = useState('');
  const [calDate, setCalDate] = useState('');
  const [calTarget, setCalTarget] = useState('google');
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailWithVideo, setEmailWithVideo] = useState(false);
  const selected = meetings.find((m) => m.id === selectedId);

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={16} className="text-blue-600" />
          <p className="font-heading font-bold text-blue-700 text-sm">منظومة التكامل والأتمتة اللحظية — Post-Meeting Automation</p>
        </div>
        <p className="font-body text-[11px] text-blue-600/80 leading-relaxed">
          بمجرد اعتماد المحضر، يستخلص النظام القرارات ويحولها إلى مهام تُرسل لبرامج إدارة المشاريع (Trello)، ويُحدّث الجداول والتقاويم، ويُرسل نسخ المحضر عبر البريد الإلكتروني.
        </p>
      </div>
      <div className="flex items-center justify-between">
        <MeetingSelector meetings={meetings} selectedId={selectedId} onSelect={onSelect} />
      </div>
      {selected && (
        <>
          {/* Tasks */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckSquare size={14} className="text-blue-600" />
              <p className="font-body text-xs font-bold text-midnight">مزامنة المهام — Trello Sync</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <TextInput value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="عنوان المهمة" />
              <TextInput value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)} placeholder="المسؤول" />
              <TextInput type="date" value={taskDeadline} onChange={(e) => setTaskDeadline(e.target.value)} />
            </div>
            <button onClick={() => { if (taskTitle.trim()) { onAddTask(selected.id, taskTitle.trim(), taskAssignee.trim(), taskDeadline || null); setTaskTitle(''); setTaskAssignee(''); setTaskDeadline(''); } }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-body text-sm font-bold hover:bg-blue-700 transition-colors">
              <Plus size={14} /> إنشاء مهمة
            </button>
            {tasks.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-gray-100">
                {tasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                    <CheckSquare size={12} className="text-blue-600" />
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-[10px] font-bold text-midnight">{t.title}</p>
                      <p className="font-body text-[9px] text-ink/40">{t.assignee || 'غير محدد'} — {t.deadline ? formatDate(t.deadline) : 'بلا موعد'}</p>
                    </div>
                    {t.synced_to_trello ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-body font-bold"><CheckCircle2 size={10} /> {t.trello_card_id?.slice(0, 12)}</span>
                    ) : (
                      <button onClick={() => onSyncTask(t.id)} className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded text-[9px] font-body font-bold hover:bg-blue-100 transition-colors">
                        <RefreshCw size={10} /> مزامنة
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Calendar Sync */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-blue-600" />
              <p className="font-body text-xs font-bold text-midnight">تحديث الجداول — Calendar Sync</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <TextInput value={calTitle} onChange={(e) => setCalTitle(e.target.value)} placeholder="عنوان الحدث" />
              <TextInput type="date" value={calDate} onChange={(e) => setCalDate(e.target.value)} />
              <Select value={calTarget} onChange={(e) => setCalTarget(e.target.value)}>
                <option value="google">Google Calendar</option>
                <option value="outlook">Outlook</option>
              </Select>
            </div>
            <button onClick={() => { if (calTitle.trim() && calDate) { onAddCalendarSync(selected.id, calTitle.trim(), calDate, calTarget); setCalTitle(''); setCalDate(''); } }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-body text-sm font-bold hover:bg-blue-700 transition-colors">
              <Calendar size={14} /> مزامنة مع التقويم
            </button>
            {calendarSyncs.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-gray-100">
                {calendarSyncs.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                    <Calendar size={12} className="text-blue-600" />
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-[10px] font-bold text-midnight">{c.event_title}</p>
                      <p className="font-body text-[9px] text-ink/40">{formatDate(c.event_date)}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-body font-bold">{c.synced_to === 'google' ? 'Google' : 'Outlook'}</span>
                    <CheckCircle2 size={12} className="text-emerald-600" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Email Dispatch */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-rose-600" />
              <p className="font-body text-xs font-bold text-midnight">الأرشفة الذكية وإرسال النسخ — Email Dispatch</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextInput value={emailRecipient} onChange={(e) => setEmailRecipient(e.target.value)} placeholder="بريد المستلم" />
              <TextInput value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="موضوع الرسالة" />
            </div>
            <label className="flex items-center gap-2 font-body text-xs text-ink/60 cursor-pointer">
              <input type="checkbox" checked={emailWithVideo} onChange={(e) => setEmailWithVideo(e.target.checked)} className="rounded" />
              إرفاق تسجيل الفيديو المشفّر
            </label>
            <button onClick={() => { if (emailRecipient.trim() && emailSubject.trim()) { onAddEmailDispatch(selected.id, emailRecipient.trim(), emailSubject.trim(), emailWithVideo); setEmailRecipient(''); setEmailSubject(''); setEmailWithVideo(false); } }}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg font-body text-sm font-bold hover:bg-rose-700 transition-colors">
              <Send size={14} /> إرسال النسخة
            </button>
            {emailDispatches.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-gray-100">
                {emailDispatches.map((e) => (
                  <div key={e.id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                    <Mail size={12} className="text-rose-600" />
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-[10px] font-bold text-midnight">{e.subject}</p>
                      <p className="font-body text-[9px] text-ink/40">{e.recipient} — {formatDate(e.sent_at)}</p>
                    </div>
                    {e.contains_video && <Video size={10} className="text-amber-600" />}
                    <CheckCircle2 size={12} className="text-emerald-600" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
