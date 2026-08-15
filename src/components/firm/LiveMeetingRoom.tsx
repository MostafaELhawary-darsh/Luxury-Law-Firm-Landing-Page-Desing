import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Video, Mic, MicOff, VideoOff, Monitor, MessageSquare, FileText, Users,
  Hand, Settings, PhoneOff, Volume2, Maximize2, Send, Paperclip,
  Eye, EyeOff, LayoutGrid, Square, Circle, ChevronLeft, ChevronRight,
  Shield, Lock, MoreVertical, Pin, Camera, Image as ImageIcon,
  Download, ExternalLink, File, FileSpreadsheet, FileImage,
  Upload, Trash2, FileVideo, FileAudio, X, Loader2, CheckCircle2,
} from 'lucide-react';
import { supabase, formatDate } from '@/lib/financeUtils';
import type { Meeting, MeetingParticipant } from '@/lib/firmTypes';

interface ChatMessage {
  id: string;
  meeting_id: string;
  sender_name: string;
  sender_role: string;
  message_text: string;
  is_system: boolean;
  created_at: string;
}

interface MeetingDocument {
  id: string;
  meeting_id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  file_size: number;
  uploaded_by: string | null;
  uploaded_at: string;
  is_agenda_item: boolean;
  display_order: number;
  display_state: string;
}

interface SharedDoc {
  name: string;
  type: string;
  url?: string;
}

interface ParticipantState {
  id: string;
  name: string;
  role: string;
  isHost: boolean;
  micOn: boolean;
  cameraOn: boolean;
  handRaised: boolean;
  hidden: boolean;
  pinned: boolean;
  speaking: boolean;
  avatarColor: string;
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
  'bg-cyan-500', 'bg-violet-500', 'bg-orange-500', 'bg-teal-500',
];

type LayoutMode = 'grid' | 'speaker';
type SidePanel = 'chat' | 'participants' | 'documents' | null;

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const inferFileType = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'doc';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'spreadsheet';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image';
  if (['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'].includes(ext)) return 'audio';
  return 'file';
};

export default function LiveMeetingRoom({
  meeting,
  participants,
  onLeave,
}: {
  meeting: Meeting;
  participants: MeetingParticipant[];
  onLeave: () => void;
}) {
  const [layout, setLayout] = useState<LayoutMode>('grid');
  const [sidePanel, setSidePanel] = useState<SidePanel>('chat');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recording, setRecording] = useState(meeting.recording_enabled !== false);
  const [privilegeMode, setPrivilegeMode] = useState(meeting.privilege_mode || false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ===== Documents state =====
  const [meetingDocs, setMeetingDocs] = useState<MeetingDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; kind: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Seed agenda documents from meeting.shared_documents (these are pre-meeting agenda items)
  const agendaSeedRef = useRef<boolean>(false);

  // Build participant state from DB participants
  const [pStates, setPStates] = useState<ParticipantState[]>([]);
  useEffect(() => {
    const colors = [...AVATAR_COLORS];
    const states: ParticipantState[] = (participants.length > 0 ? participants : [
      { id: 'self', name: 'أنت', role: 'مضيف', is_host: true, join_status: 'joined' } as unknown as MeetingParticipant,
    ]).map((p, i) => ({
      id: p.id,
      name: p.name,
      role: p.role || 'مشارك',
      isHost: p.is_host || i === 0,
      micOn: p.is_host || false,
      cameraOn: true,
      handRaised: false,
      hidden: false,
      pinned: false,
      speaking: false,
      avatarColor: colors[i % colors.length],
    }));
    setPStates(states);
  }, [participants]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Toast helper
  const showToast = useCallback((msg: string, kind: 'success' | 'error' = 'success') => {
    setToast({ msg, kind });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // Fetch chat messages
  const fetchChat = useCallback(async () => {
    const { data } = await supabase
      .from('lf_meeting_chat_messages')
      .select('*')
      .eq('meeting_id', meeting.id)
      .order('created_at', { ascending: true });
    if (data) setChatMessages(data as ChatMessage[]);
  }, [meeting.id]);

  useEffect(() => {
    fetchChat();
    const interval = setInterval(fetchChat, 3000);
    return () => clearInterval(interval);
  }, [fetchChat]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Seed agenda documents from meeting.shared_documents into the DB once
  useEffect(() => {
    if (agendaSeedRef.current) return;
    agendaSeedRef.current = true;
    const seed = async () => {
      const shared = meeting.shared_documents || [];
      if (shared.length === 0) return;
      // Check existing agenda items to avoid duplicates
      const { data: existing } = await supabase
        .from('lf_meeting_documents')
        .select('id')
        .eq('meeting_id', meeting.id)
        .eq('is_agenda_item', true);
      if (existing && existing.length > 0) return; // already seeded
      const rows = shared.map((name, i) => ({
        meeting_id: meeting.id,
        file_name: name,
        file_type: inferFileType(name),
        file_url: '',
        file_size: 0,
        uploaded_by: 'النظام',
        is_agenda_item: true,
        display_order: i,
        display_state: 'pending',
      }));
      if (rows.length > 0) {
        await supabase.from('lf_meeting_documents').insert(rows);
      }
    };
    seed();
  }, [meeting.id, meeting.shared_documents]);

  // Fetch meeting documents (polled every 3s for real-time sync)
  const fetchDocs = useCallback(async () => {
    setDocsLoading(true);
    const { data, error } = await supabase
      .from('lf_meeting_documents')
      .select('*')
      .eq('meeting_id', meeting.id)
      .order('is_agenda_item', { ascending: false })
      .order('display_order', { ascending: true })
      .order('uploaded_at', { ascending: true });
    setDocsLoading(false);
    if (error) {
      console.error('fetchDocs error:', error);
      return;
    }
    if (data) setMeetingDocs(data as MeetingDocument[]);
  }, [meeting.id]);

  useEffect(() => {
    fetchDocs();
    const interval = setInterval(fetchDocs, 3000);
    return () => clearInterval(interval);
  }, [fetchDocs]);

  // Simulate speaking indicator
  useEffect(() => {
    const interval = setInterval(() => {
      setPStates((prev) =>
        prev.map((p) => ({
          ...p,
          speaking: p.micOn && Math.random() > 0.7,
        }))
      );
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    setChatLoading(true);
    await supabase.from('lf_meeting_chat_messages').insert({
      meeting_id: meeting.id,
      sender_name: 'أنت',
      sender_role: 'مضيف',
      message_text: chatInput.trim(),
      is_system: false,
    });
    setChatInput('');
    setChatLoading(false);
    fetchChat();
  };

  // ===== Document upload =====
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-selected
    e.target.value = '';

    setUploading(true);
    try {
      const path = `${meeting.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from('meeting-documents')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage
        .from('meeting-documents')
        .getPublicUrl(path);
      const fileUrl = pub?.publicUrl || '';

      const { error: insErr } = await supabase.from('lf_meeting_documents').insert({
        meeting_id: meeting.id,
        file_name: file.name,
        file_type: inferFileType(file.name),
        file_url: fileUrl,
        file_size: file.size,
        uploaded_by: 'أنت',
        is_agenda_item: false,
        display_state: 'pending',
      });
      if (insErr) throw insErr;

      showToast('تم رفع المستند بنجاح', 'success');
      fetchDocs();
    } catch (err) {
      console.error('Upload error:', err);
      showToast('فشل رفع المستند', 'error');
    } finally {
      setUploading(false);
    }
  };

  // Show a document on the main screen (set this one to 'showing', all others to 'pending')
  const showDocOnScreen = async (doc: MeetingDocument) => {
    try {
      // Set all docs for this meeting to 'pending' first
      await supabase
        .from('lf_meeting_documents')
        .update({ display_state: 'pending' })
        .eq('meeting_id', meeting.id);
      // Then set the selected doc to 'showing'
      await supabase
        .from('lf_meeting_documents')
        .update({ display_state: 'showing' })
        .eq('id', doc.id);
      fetchDocs();
    } catch (err) {
      console.error('showDocOnScreen error:', err);
      showToast('فشل عرض المستند', 'error');
    }
  };

  // Close the document display (return to video)
  const closeDocDisplay = async () => {
    try {
      await supabase
        .from('lf_meeting_documents')
        .update({ display_state: 'pending' })
        .eq('meeting_id', meeting.id)
        .eq('display_state', 'showing');
      fetchDocs();
    } catch (err) {
      console.error('closeDocDisplay error:', err);
    }
  };

  // Delete a document
  const deleteDoc = async (doc: MeetingDocument) => {
    try {
      await supabase.from('lf_meeting_documents').delete().eq('id', doc.id);
      // Best-effort storage cleanup
      if (doc.file_url) {
        try {
          const url = new URL(doc.file_url);
          const parts = url.pathname.split('/meeting-documents/');
          if (parts.length === 2 && parts[1]) {
            await supabase.storage.from('meeting-documents').remove([decodeURIComponent(parts[1])]);
          }
        } catch {
          /* ignore parse errors */
        }
      }
      showToast('تم حذف المستند', 'success');
      fetchDocs();
    } catch (err) {
      console.error('deleteDoc error:', err);
      showToast('فشل حذف المستند', 'error');
    }
  };

  const toggleMic = (id: string) =>
    setPStates((prev) => prev.map((p) => (p.id === id ? { ...p, micOn: !p.micOn } : p)));
  const toggleCamera = (id: string) =>
    setPStates((prev) => prev.map((p) => (p.id === id ? { ...p, cameraOn: !p.cameraOn } : p)));
  const toggleHand = (id: string) =>
    setPStates((prev) => prev.map((p) => (p.id === id ? { ...p, handRaised: !p.handRaised } : p)));
  const toggleHidden = (id: string) =>
    setPStates((prev) => prev.map((p) => (p.id === id ? { ...p, hidden: !p.hidden } : p)));
  const togglePin = (id: string) =>
    setPStates((prev) => prev.map((p) => ({ ...p, pinned: p.id === id ? !p.pinned : false })));

  const pinnedParticipant = pStates.find((p) => p.pinned);
  const speakerParticipant = pinnedParticipant || pStates.find((p) => p.speaking && p.cameraOn) || pStates[0];
  const visibleParticipants = pStates.filter((p) => !p.hidden);
  const handsRaised = pStates.filter((p) => p.handRaised).length;

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h > 0 ? String(h).padStart(2, '0') + ':' : ''}${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const docIcon = (type: string, size: number = 20) => {
    switch (type) {
      case 'pdf': return <FileText size={size} className="text-red-500" />;
      case 'doc': return <FileText size={size} className="text-blue-500" />;
      case 'spreadsheet': return <FileSpreadsheet size={size} className="text-emerald-500" />;
      case 'image': return <FileImage size={size} className="text-amber-500" />;
      case 'video': return <FileVideo size={size} className="text-purple-500" />;
      case 'audio': return <FileAudio size={size} className="text-pink-500" />;
      default: return <File size={size} className="text-gray-500" />;
    }
  };

  // Currently displayed document (display_state === 'showing')
  const showingDoc = meetingDocs.find((d) => d.display_state === 'showing') || null;
  const agendaDocs = meetingDocs.filter((d) => d.is_agenda_item);
  const sessionDocs = meetingDocs.filter((d) => !d.is_agenda_item);
  const totalDocs = meetingDocs.length;

  // ===== Main-screen document display renderer =====
  const renderDocDisplay = (doc: MeetingDocument) => {
    if (doc.file_type === 'image' && doc.file_url) {
      return (
        <img
          src={doc.file_url}
          alt={doc.file_name}
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
        />
      );
    }
    if (doc.file_type === 'pdf' && doc.file_url) {
      return (
        <iframe
          src={doc.file_url}
          title={doc.file_name}
          className="w-full h-full rounded-lg bg-white shadow-2xl"
          style={{ minHeight: '400px' }}
        />
      );
    }
    // Fallback for other file types
    return (
      <div className="flex flex-col items-center gap-4 text-cream p-8">
        <div className="w-24 h-24 rounded-2xl bg-white/10 flex items-center justify-center">
          {docIcon(doc.file_type, 48)}
        </div>
        <div className="text-center">
          <p className="font-body text-lg font-bold text-cream mb-1">{doc.file_name}</p>
          <p className="font-body text-sm text-cream/50">{formatFileSize(doc.file_size)} · {doc.file_type.toUpperCase()}</p>
        </div>
        {doc.file_url ? (
          <a
            href={doc.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors"
          >
            <Download size={16} /> تحميل الملف
          </a>
        ) : (
          <span className="font-body text-xs text-cream/40">لا يوجد رابط تحميل لهذا الملف</span>
        )}
      </div>
    );
  };

  // ===== Document card (used in both agenda and session sections) =====
  const renderDocCard = (doc: MeetingDocument) => {
    const isShowing = doc.display_state === 'showing';
    return (
      <div
        key={doc.id}
        className={`rounded-lg border transition-colors ${
          isShowing
            ? 'bg-gold/10 border-gold/40 ring-1 ring-gold/30'
            : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
        }`}
      >
        <div className="flex items-start gap-3 p-3">
          <div className="flex-shrink-0 mt-0.5">{docIcon(doc.file_type, 22)}</div>
          <div className="flex-1 min-w-0">
            <p className="font-body text-xs font-bold text-midnight truncate" title={doc.file_name}>
              {doc.file_name}
            </p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="font-body text-[10px] text-ink/40">{formatFileSize(doc.file_size)}</span>
              <span className="font-body text-[10px] text-ink/30">·</span>
              <span className="font-body text-[10px] text-ink/50">{doc.uploaded_by || 'النظام'}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {isShowing && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold/20 text-gold font-body text-[9px] font-bold">
                  <Eye size={9} /> معروض الآن
                </span>
              )}
              {doc.is_agenda_item && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-body text-[9px] font-bold">
                  <FileText size={9} /> جدول أعمال
                </span>
              )}
            </div>
          </div>
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-1 px-3 pb-2.5 border-t border-gray-100/70 pt-2">
          <button
            onClick={() => showDocOnScreen(doc)}
            disabled={isShowing}
            className={`flex items-center gap-1 px-2 py-1 rounded-md font-body text-[10px] font-bold transition-colors disabled:opacity-50 ${
              isShowing
                ? 'bg-gold/20 text-gold'
                : 'bg-midnight text-cream hover:bg-midnight/90'
            }`}
            title="عرض على الشاشة"
          >
            <Eye size={11} /> عرض
          </button>
          <a
            href={doc.file_url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1 px-2 py-1 rounded-md font-body text-[10px] font-bold transition-colors ${
              doc.file_url
                ? 'bg-gray-200 text-ink/70 hover:bg-gray-300'
                : 'bg-gray-100 text-ink/30 pointer-events-none'
            }`}
            title="تحميل"
          >
            <Download size={11} /> تحميل
          </a>
          <button
            onClick={() => deleteDoc(doc)}
            className="flex items-center gap-1 px-2 py-1 rounded-md font-body text-[10px] font-bold text-red-500 hover:bg-red-50 transition-colors mr-auto"
            title="حذف"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-midnight rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-220px)] min-h-[500px] relative">
      {/* Hidden file input for uploads */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept="*/*"
      />

      {/* Toast notification */}
      {toast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg font-body text-sm font-bold ${
              toast.kind === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {toast.kind === 'success' ? <CheckCircle2 size={16} /> : <X size={16} />}
            {toast.msg}
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-midnight-light border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {recording ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/20 rounded-md">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="font-body text-[10px] text-red-400 font-bold">REC</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-500/20 rounded-md">
                <span className="w-2 h-2 bg-gray-500 rounded-full" />
                <span className="font-body text-[10px] text-gray-400 font-bold">بلا تسجيل</span>
              </span>
            )}
            <span className="font-body text-xs text-cream/70 font-bold">{formatTime(elapsed)}</span>
          </div>
          {privilegeMode && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 rounded-md">
              <Lock size={12} className="text-amber-400" />
              <span className="font-body text-[10px] text-amber-400 font-bold">مداولة سرية</span>
            </span>
          )}
          <span className="font-body text-xs text-cream/50">|</span>
          <span className="font-body text-xs text-cream/80 font-bold truncate max-w-[200px]">{meeting.title}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLayout(layout === 'grid' ? 'speaker' : 'grid')}
            className="p-2 rounded-lg text-cream/60 hover:text-cream hover:bg-white/10 transition-colors"
            title={layout === 'grid' ? 'عرض المتحدث' : 'عرض الشبكة'}
          >
            {layout === 'grid' ? <Square size={16} /> : <LayoutGrid size={16} />}
          </button>
          <button
            onClick={() => setPrivilegeMode(!privilegeMode)}
            className={`p-2 rounded-lg transition-colors ${privilegeMode ? 'text-amber-400 bg-amber-500/20' : 'text-cream/60 hover:text-cream hover:bg-white/10'}`}
            title="المداولة السرية"
          >
            <Shield size={16} />
          </button>
          <button
            onClick={() => setRecording(!recording)}
            className={`p-2 rounded-lg transition-colors ${recording ? 'text-red-400 bg-red-500/20' : 'text-cream/60 hover:text-cream hover:bg-white/10'}`}
            title="التسجيل"
          >
            <Circle size={16} />
          </button>
          <button
            onClick={onLeave}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-body text-xs font-bold transition-colors"
          >
            <PhoneOff size={14} /> إنهاء
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video area */}
        <div className="flex-1 flex flex-col bg-black/40 p-3 overflow-hidden relative">
          {/* Document display overlay (replaces video grid when a doc is showing) */}
          {showingDoc ? (
            <div className="flex-1 flex flex-col rounded-xl overflow-hidden bg-gray-900/80">
              {/* Document header bar */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-midnight-light/90 border-b border-white/10">
                <div className="flex items-center gap-2.5 min-w-0">
                  {docIcon(showingDoc.file_type, 18)}
                  <span className="font-body text-sm font-bold text-cream truncate">{showingDoc.file_name}</span>
                  {showingDoc.uploaded_by && (
                    <span className="font-body text-[10px] text-cream/40 hidden sm:inline">· {showingDoc.uploaded_by}</span>
                  )}
                </div>
                <button
                  onClick={closeDocDisplay}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-cream rounded-lg font-body text-xs font-bold transition-colors"
                  title="إغلاق المستند والعودة للفيديو"
                >
                  <X size={14} /> إغلاق المستند
                </button>
              </div>
              {/* Document content */}
              <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
                {renderDocDisplay(showingDoc)}
              </div>
            </div>
          ) : layout === 'speaker' && speakerParticipant ? (
            <div className="flex-1 flex flex-col gap-2 overflow-hidden">
              {/* Speaker view */}
              <div className="flex-1 relative rounded-xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center min-h-[200px]">
                {speakerParticipant.cameraOn ? (
                  <div className={`w-full h-full flex items-center justify-center ${speakerParticipant.avatarColor}/30`}>
                    <div className={`w-28 h-28 rounded-full ${speakerParticipant.avatarColor} flex items-center justify-center text-white text-3xl font-bold`}>
                      {speakerParticipant.name.charAt(0)}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-cream/40">
                    <VideoOff size={32} />
                    <span className="font-body text-xs">الكاميرا مغلقة</span>
                  </div>
                )}
                {speakerParticipant.speaking && (
                  <div className="absolute inset-0 ring-4 ring-emerald-400/60 rounded-xl pointer-events-none" />
                )}
                <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-lg">
                  <span className="font-body text-xs text-cream font-bold">{speakerParticipant.name}</span>
                  {speakerParticipant.isHost && <span className="font-body text-[9px] text-gold">مضيف</span>}
                  {!speakerParticipant.micOn && <MicOff size={12} className="text-red-400" />}
                  {speakerParticipant.handRaised && <Hand size={12} className="text-amber-400" />}
                </div>
                <button
                  onClick={() => togglePin(speakerParticipant.id)}
                  className="absolute top-3 right-3 p-2 rounded-lg bg-black/40 text-cream/60 hover:text-cream hover:bg-black/60 transition-colors"
                >
                  <Pin size={14} className={speakerParticipant.pinned ? 'fill-cream text-cream' : ''} />
                </button>
              </div>
              {/* Thumbnail strip */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {visibleParticipants
                  .filter((p) => p.id !== speakerParticipant.id)
                  .map((p) => (
                    <ParticipantTile key={p.id} p={p} compact onToggleMic={toggleMic} onToggleCamera={toggleCamera} onTogglePin={togglePin} />
                  ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-3 auto-rows-fr content-start overflow-y-auto">
              {visibleParticipants.map((p) => (
                <ParticipantTile key={p.id} p={p} onToggleMic={toggleMic} onToggleCamera={toggleCamera} onTogglePin={togglePin} onToggleHand={toggleHand} onToggleHidden={toggleHidden} />
              ))}
            </div>
          )}
        </div>

        {/* Side panel */}
        {sidePanel && (
          <div className="w-80 bg-white flex flex-col border-r border-gray-200">
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="font-heading font-bold text-midnight text-sm">
                {sidePanel === 'chat' && 'الدردشة'}
                {sidePanel === 'participants' && `المشاركون (${pStates.length})`}
                {sidePanel === 'documents' && `المستندات (${totalDocs})`}
              </span>
              <button onClick={() => setSidePanel(null)} className="text-ink/30 hover:text-ink/60 transition-colors">
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Chat panel */}
            {sidePanel === 'chat' && (
              <>
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  {chatMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <MessageSquare size={32} className="text-gray-300 mb-2" />
                      <p className="font-body text-xs text-ink/40">لا توجد رسائل بعد — ابدأ المحادثة</p>
                    </div>
                  )}
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.is_system ? 'items-center' : 'items-start'}`}>
                      {msg.is_system ? (
                        <span className="font-body text-[10px] text-ink/30 bg-gray-50 px-3 py-1 rounded-full">{msg.message_text}</span>
                      ) : (
                        <div className="max-w-[85%]">
                          <span className="font-body text-[10px] font-bold text-midnight block mb-0.5">
                            {msg.sender_name}
                            <span className="font-body text-[9px] text-ink/30 font-normal mr-1">— {msg.sender_role}</span>
                          </span>
                          <div className="bg-gray-100 rounded-lg rounded-tr-sm px-3 py-2">
                            <p className="font-body text-xs text-ink/80 leading-relaxed">{msg.message_text}</p>
                          </div>
                          <span className="font-body text-[9px] text-ink/30 block mt-0.5">
                            {new Date(msg.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="border-t border-gray-100 p-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !chatLoading && sendChat()}
                      placeholder="اكتب رسالة..."
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 font-body text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
                    />
                    <button
                      onClick={sendChat}
                      disabled={chatLoading || !chatInput.trim()}
                      className="p-2 bg-gold text-midnight rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-40"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Participants panel */}
            {sidePanel === 'participants' && (
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                {handsRaised > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg mb-2">
                    <Hand size={14} className="text-amber-600" />
                    <span className="font-body text-xs text-amber-700 font-bold">{handsRaised} رفعوا اليد</span>
                  </div>
                )}
                {pStates.map((p) => (
                  <div key={p.id} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors ${p.speaking ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-gray-50 hover:bg-gray-100'}`}>
                    <div className={`w-9 h-9 rounded-full ${p.avatarColor} flex items-center justify-center text-white text-sm font-bold flex-shrink-0 relative`}>
                      {p.name.charAt(0)}
                      {p.speaking && <span className="absolute -inset-0.5 rounded-full ring-2 ring-emerald-400 animate-pulse" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-xs font-bold text-midnight truncate">{p.name} {p.isHost && <span className="text-gold text-[9px]">مضيف</span>}</p>
                      <p className="font-body text-[10px] text-ink/40">{p.role}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {p.handRaised && <Hand size={12} className="text-amber-500" />}
                      {!p.micOn && <MicOff size={12} className="text-red-400" />}
                      {!p.cameraOn && <VideoOff size={12} className="text-gray-400" />}
                      {p.hidden && <EyeOff size={12} className="text-gray-400" />}
                      <button
                        onClick={() => toggleHand(p.id)}
                        className={`p-1.5 rounded transition-colors ${p.handRaised ? 'text-amber-500 bg-amber-50' : 'text-ink/30 hover:text-amber-500 hover:bg-amber-50'}`}
                        title="رفع اليد"
                      >
                        <Hand size={12} />
                      </button>
                      <button
                        onClick={() => toggleHidden(p.id)}
                        className={`p-1.5 rounded transition-colors ${p.hidden ? 'text-gray-500 bg-gray-100' : 'text-ink/30 hover:text-gray-500 hover:bg-gray-100'}`}
                        title={p.hidden ? 'إظهار' : 'إخفاء'}
                      >
                        {p.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                      <button
                        onClick={() => toggleMic(p.id)}
                        className={`p-1.5 rounded transition-colors ${!p.micOn ? 'text-red-400 bg-red-50' : 'text-ink/30 hover:text-red-400 hover:bg-red-50'}`}
                        title="الميكروفون"
                      >
                        {p.micOn ? <Mic size={12} /> : <MicOff size={12} />}
                      </button>
                      <button
                        onClick={() => toggleCamera(p.id)}
                        className={`p-1.5 rounded transition-colors ${!p.cameraOn ? 'text-gray-400 bg-gray-100' : 'text-ink/30 hover:text-gray-400 hover:bg-gray-100'}`}
                        title="الكاميرا"
                      >
                        {p.cameraOn ? <Video size={12} /> : <VideoOff size={12} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Documents panel */}
            {sidePanel === 'documents' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Upload button */}
                <div className="px-3 py-3 border-b border-gray-100">
                  <button
                    onClick={handleUploadClick}
                    disabled={uploading}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gold text-midnight rounded-lg font-body text-xs font-bold hover:bg-gold/90 transition-colors disabled:opacity-60"
                  >
                    {uploading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        جاري الرفع...
                      </>
                    ) : (
                      <>
                        <Upload size={14} />
                        رفع مستند
                      </>
                    )}
                  </button>
                </div>

                {/* Documents list */}
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                  {docsLoading && meetingDocs.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <Loader2 size={28} className="text-gray-300 mb-2 animate-spin" />
                      <p className="font-body text-xs text-ink/40">جاري تحميل المستندات...</p>
                    </div>
                  )}
                  {!docsLoading && totalDocs === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <FileText size={32} className="text-gray-300 mb-2" />
                      <p className="font-body text-xs text-ink/40">لا توجد مستندات — ابدأ برفع ملف</p>
                    </div>
                  )}

                  {/* Agenda section */}
                  {agendaDocs.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <FileText size={13} className="text-blue-500" />
                        <span className="font-heading font-bold text-midnight text-xs">جدول الأعمال</span>
                        <span className="font-body text-[10px] text-ink/30">({agendaDocs.length})</span>
                      </div>
                      <div className="space-y-2">
                        {agendaDocs.map((doc) => renderDocCard(doc))}
                      </div>
                    </div>
                  )}

                  {/* Session uploads section */}
                  {sessionDocs.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2 mt-1">
                        <Upload size={13} className="text-emerald-500" />
                        <span className="font-heading font-bold text-midnight text-xs">مستندات الجلسة</span>
                        <span className="font-body text-[10px] text-ink/30">({sessionDocs.length})</span>
                      </div>
                      <div className="space-y-2">
                        {sessionDocs.map((doc) => renderDocCard(doc))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Control bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-midnight-light border-t border-white/10">
        {/* Left: self status */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 text-cream/40">
            <Volume2 size={14} />
            <span className="font-body text-[10px] hidden sm:inline">الصوت: طبيعي</span>
          </div>
        </div>

        {/* Center: main controls */}
        <div className="flex items-center gap-2">
          {/* Mic toggle (self) */}
          <ControlButton
            active={pStates[0]?.micOn !== false}
            activeIcon={<Mic size={18} />}
            inactiveIcon={<MicOff size={18} />}
            activeColor="bg-white/10 text-cream hover:bg-white/20"
            inactiveColor="bg-red-500/80 text-white hover:bg-red-500"
            onClick={() => pStates[0] && toggleMic(pStates[0].id)}
            label="المايك"
          />
          {/* Camera toggle (self) */}
          <ControlButton
            active={pStates[0]?.cameraOn !== false}
            activeIcon={<Video size={18} />}
            inactiveIcon={<VideoOff size={18} />}
            activeColor="bg-white/10 text-cream hover:bg-white/20"
            inactiveColor="bg-gray-600 text-cream/60 hover:bg-gray-500"
            onClick={() => pStates[0] && toggleCamera(pStates[0].id)}
            label="الكاميرا"
          />
          {/* Hand raise */}
          <ControlButton
            active={!pStates[0]?.handRaised}
            activeIcon={<Hand size={18} />}
            inactiveIcon={<Hand size={18} />}
            activeColor="bg-white/10 text-cream hover:bg-white/20"
            inactiveColor="bg-amber-500 text-white hover:bg-amber-400"
            onClick={() => pStates[0] && toggleHand(pStates[0].id)}
            label="رفع اليد"
          />
          {/* Hide self */}
          <ControlButton
            active={!pStates[0]?.hidden}
            activeIcon={<Eye size={18} />}
            inactiveIcon={<EyeOff size={18} />}
            activeColor="bg-white/10 text-cream hover:bg-white/20"
            inactiveColor="bg-gray-600 text-cream/60 hover:bg-gray-500"
            onClick={() => pStates[0] && toggleHidden(pStates[0].id)}
            label={pStates[0]?.hidden ? 'إظهار' : 'إخفاء'}
          />
          {/* Screen share */}
          <button className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-white/10 text-cream hover:bg-white/20 transition-colors">
            <Monitor size={18} />
            <span className="font-body text-[9px]">مشاركة</span>
          </button>

          <div className="w-px h-8 bg-white/10 mx-1" />

          {/* Side panels */}
          <PanelButton
            icon={<Users size={18} />}
            label="المشاركون"
            count={pStates.length}
            active={sidePanel === 'participants'}
            onClick={() => setSidePanel(sidePanel === 'participants' ? null : 'participants')}
          />
          <PanelButton
            icon={<MessageSquare size={18} />}
            label="الدردشة"
            count={chatMessages.filter((m) => !m.is_system).length}
            active={sidePanel === 'chat'}
            onClick={() => setSidePanel(sidePanel === 'chat' ? null : 'chat')}
          />
          <PanelButton
            icon={<FileText size={18} />}
            label="المستندات"
            count={totalDocs}
            active={sidePanel === 'documents'}
            onClick={() => setSidePanel(sidePanel === 'documents' ? null : 'documents')}
          />
        </div>

        {/* Right: settings */}
        <div className="flex items-center gap-2">
          <button className="p-2.5 rounded-xl bg-white/10 text-cream/60 hover:text-cream hover:bg-white/20 transition-colors" title="الإعدادات">
            <Settings size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Participant Tile =====
function ParticipantTile({
  p,
  compact,
  onToggleMic,
  onToggleCamera,
  onTogglePin,
  onToggleHand,
  onToggleHidden,
}: {
  p: ParticipantState;
  compact?: boolean;
  onToggleMic: (id: string) => void;
  onToggleCamera: (id: string) => void;
  onTogglePin: (id: string) => void;
  onToggleHand?: (id: string) => void;
  onToggleHidden?: (id: string) => void;
}) {
  return (
    <div className={`relative rounded-xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 flex flex-col items-center justify-center group ${compact ? 'w-32 h-24 flex-shrink-0' : 'min-h-[140px] aspect-video'}`}>
      {p.cameraOn ? (
        <div className={`w-full h-full flex items-center justify-center ${p.avatarColor}/20`}>
          <div className={`${compact ? 'w-12 h-12 text-lg' : 'w-20 h-20 text-2xl'} rounded-full ${p.avatarColor} flex items-center justify-center text-white font-bold transition-transform group-hover:scale-105`}>
            {p.name.charAt(0)}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1 text-cream/30">
          <VideoOff size={compact ? 16 : 24} />
          {!compact && <span className="font-body text-[10px]">الكاميرا مغلقة</span>}
        </div>
      )}

      {p.speaking && (
        <div className="absolute inset-0 ring-2 ring-emerald-400/70 rounded-xl pointer-events-none" />
      )}

      {/* Name bar */}
      <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded-md">
        {!p.micOn && <MicOff size={10} className="text-red-400" />}
        <span className={`font-body ${compact ? 'text-[9px]' : 'text-[10px]'} text-cream font-bold truncate max-w-[80px]`}>{p.name}</span>
        {p.isHost && <span className="font-body text-[7px] text-gold">مضيف</span>}
      </div>

      {p.handRaised && (
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-amber-500/80 px-1.5 py-0.5 rounded-md">
          <Hand size={10} className="text-white" />
        </div>
      )}

      {/* Hover controls */}
      {!compact && (
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onTogglePin(p.id)}
            className="p-1.5 rounded-md bg-black/40 text-cream/60 hover:text-cream hover:bg-black/60 transition-colors"
            title="تثبيت"
          >
            <Pin size={12} className={p.pinned ? 'fill-cream text-cream' : ''} />
          </button>
          {onToggleHand && (
            <button
              onClick={() => onToggleHand(p.id)}
              className={`p-1.5 rounded-md transition-colors ${p.handRaised ? 'text-amber-400 bg-amber-500/20' : 'text-cream/60 hover:text-amber-400 hover:bg-black/60'}`}
              title="رفع اليد"
            >
              <Hand size={12} />
            </button>
          )}
          {onToggleHidden && (
            <button
              onClick={() => onToggleHidden(p.id)}
              className={`p-1.5 rounded-md transition-colors ${p.hidden ? 'text-gray-400 bg-gray-600/40' : 'text-cream/60 hover:text-cream hover:bg-black/60'}`}
              title={p.hidden ? 'إظهار' : 'إخفاء'}
            >
              {p.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ===== Control Button =====
function ControlButton({
  active,
  activeIcon,
  inactiveIcon,
  activeColor,
  inactiveColor,
  onClick,
  label,
}: {
  active: boolean;
  activeIcon: React.ReactNode;
  inactiveIcon: React.ReactNode;
  activeColor: string;
  inactiveColor: string;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${active ? activeColor : inactiveColor}`}
    >
      {active ? activeIcon : inactiveIcon}
      <span className="font-body text-[9px]">{label}</span>
    </button>
  );
}

// ===== Panel Button =====
function PanelButton({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${active ? 'bg-gold/20 text-gold' : 'bg-white/10 text-cream/60 hover:text-cream hover:bg-white/20'}`}
    >
      {icon}
      <span className="font-body text-[9px]">{label}</span>
      {count > 0 && (
        <span className={`absolute -top-1 -left-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center ${active ? 'bg-gold text-midnight' : 'bg-red-500 text-white'}`}>
          {count}
        </span>
      )}
    </button>
  );
}
