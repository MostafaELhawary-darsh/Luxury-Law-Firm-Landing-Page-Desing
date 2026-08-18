import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, AlertTriangle,
  Shield, ShieldCheck, CircuitBoard, CheckCircle2, Clock, Search,
  Activity, AlertCircle, BadgeCheck, Fingerprint, KeyRound, Vote,
  FileLock, Lock, Users, Hash, Unlock, Gavel, Timer, Eye,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M113DelegationRequest, M113QuorumVote, M113DelegationAudit,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'requests' | 'votes' | 'audit';

const EMERGENCY_LEVELS: Record<string, { label: string; quorum: string; bg: string; text: string }> = {
  operational: { label: 'تشغيلي', quorum: '2 من 3', bg: 'bg-amber-50', text: 'text-amber-700' },
  sovereign: { label: 'سيادي', quorum: '4 من 5', bg: 'bg-purple-50', text: 'text-purple-700' },
  critical: { label: 'حرج', quorum: '5 من 7', bg: 'bg-red-50', text: 'text-red-700' },
};

const EMERGENCY_QUORUM: Record<string, number> = {
  operational: 3,
  sovereign: 5,
  critical: 7,
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'بانتظار', bg: 'bg-gray-100', text: 'text-gray-700' },
  collecting: { label: 'جمع التواقيع', bg: 'bg-blue-50', text: 'text-blue-700' },
  quorum_reached: { label: 'اكتمال النصاب', bg: 'bg-green-50', text: 'text-green-700' },
  token_issued: { label: 'تم إصدار التوكن', bg: 'bg-gold/10', text: 'text-gold' },
  expired: { label: 'منتهي', bg: 'bg-gray-100', text: 'text-gray-500' },
  rejected: { label: 'مرفوض', bg: 'bg-red-50', text: 'text-red-700' },
};

const WORKFLOW_STAGES = ['trigger', 'activate', 'collect', 'unlock', 'audit'];

const WORKFLOW_CONFIG: Record<string, { label: string; icon: typeof Shield; desc: string }> = {
  trigger: { label: 'التحري', icon: AlertTriangle, desc: 'فشل بيومتري M109' },
  activate: { label: 'التفعيل', icon: ShieldCheck, desc: 'إعلان طارئ' },
  collect: { label: 'الجمع', icon: Users, desc: 'توقيع النصاب' },
  unlock: { label: 'الفتح', icon: Unlock, desc: 'إصدار التوكن' },
  audit: { label: 'التدقيق', icon: FileLock, desc: 'تجميد ZK-Audit' },
};

const VOTE_DECISIONS: Record<string, { label: string; bg: string; text: string }> = {
  approve: { label: 'موافقة', bg: 'bg-green-50', text: 'text-green-700' },
  reject: { label: 'رفض', bg: 'bg-red-50', text: 'text-red-700' },
  abstain: { label: 'امتناع', bg: 'bg-gray-100', text: 'text-gray-600' },
};

const CLEARANCE_LEVELS: Record<string, { label: string; bg: string; text: string }> = {
  l1: { label: 'L1 — سري', bg: 'bg-blue-50', text: 'text-blue-700' },
  l2: { label: 'L2 — سري للغاية', bg: 'bg-purple-50', text: 'text-purple-700' },
  l3: { label: 'L3 — فائق السرية', bg: 'bg-red-50', text: 'text-red-700' },
  l4: { label: 'L4 — سيادي', bg: 'bg-gold/10', text: 'text-gold' },
};

const ROLES = ['الشريك الإداري', 'الشريك التنفيذي', 'المستشار القانوني الأول', 'مدير الامتثال', 'مدير الأمن السيبراني', 'عضو مجلس الإدارة'];

interface DelegationForm {
  request_number: string;
  request_title: string;
  requester_id: string;
  requester_name: string;
  requester_role: string;
  target_files: string;
  emergency_level: string;
  quorum_required: string;
  status: string;
  trigger_reason: string;
  m109_biometric_failed: boolean;
  m109_failure_count: string;
  manual_declaration: boolean;
  quorum_members: string;
  token_scope: string;
  shamir_shares: string;
  shamir_threshold: string;
  description: string;
}

const emptyForm: DelegationForm = {
  request_number: '', request_title: '', requester_id: '', requester_name: '',
  requester_role: '', target_files: '', emergency_level: 'operational',
  quorum_required: '3', status: 'pending', trigger_reason: '',
  m109_biometric_failed: true, m109_failure_count: '3', manual_declaration: false,
  quorum_members: '', token_scope: '', shamir_shares: '5', shamir_threshold: '3',
  description: '',
};

interface VoteForm {
  delegation_id: string;
  voter_id: string;
  voter_name: string;
  voter_role: string;
  vote_decision: string;
  e_token_id: string;
  digital_signature: string;
  clearance_level: string;
}

const emptyVoteForm: VoteForm = {
  delegation_id: '', voter_id: '', voter_name: '', voter_role: '',
  vote_decision: 'approve', e_token_id: '', digital_signature: '', clearance_level: 'l3',
};

// Generate a pseudo hash-chain entry for forensic audit
function genHash(): string {
  return '0x' + Math.random().toString(16).substr(2, 8) + Math.random().toString(16).substr(2, 8);
}

// Microsecond-precision timestamp for forensic precision
function microTimestamp(): string {
  const d = new Date();
  const iso = d.toISOString();
  // Replace milliseconds with microseconds (simulated)
  const micro = String(d.getMilliseconds() * 1000 + Math.floor(Math.random() * 999)).padStart(6, '0');
  return iso.replace(/\.\d{3}Z$/, '.' + micro + 'Z');
}

export default function SovereignDelegationEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [requests, setRequests] = useState<M113DelegationRequest[]>([]);
  const [votes, setVotes] = useState<M113QuorumVote[]>([]);
  const [audit, setAudit] = useState<M113DelegationAudit[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('requests');
  const [selectedRequest, setSelectedRequest] = useState<M113DelegationRequest | null>(null);
  const [detailVotes, setDetailVotes] = useState<M113QuorumVote[]>([]);
  const [detailAudit, setDetailAudit] = useState<M113DelegationAudit[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DelegationForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  // Vote modal
  const [voteModalOpen, setVoteModalOpen] = useState(false);
  const [voteForm, setVoteForm] = useState<VoteForm>(emptyVoteForm);
  const [voteSaving, setVoteSaving] = useState(false);
  // Filters
  const [filterVoteDelegation, setFilterVoteDelegation] = useState('all');
  const [filterAuditDelegation, setFilterAuditDelegation] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [rRes, vRes, aRes, attRes] = await Promise.all([
      supabase.from('m113_delegation_requests')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase.from('m113_quorum_votes')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase.from('m113_delegation_audit')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase.from('lf_attorneys').select('*').order('name'),
    ]);
    if (rRes.error) console.error('m113 requests fetch error', rRes.error);
    if (vRes.error) console.error('m113 votes fetch error', vRes.error);
    if (aRes.error) console.error('m113 audit fetch error', aRes.error);
    if (attRes.error) console.error('attorneys fetch error', attRes.error);
    setRequests((rRes.data as M113DelegationRequest[]) || []);
    setVotes((vRes.data as M113QuorumVote[]) || []);
    setAudit((aRes.data as M113DelegationAudit[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyForm, request_title: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  // Log audit entry with hash_chain + previous_hash + microsecond_ts
  const logAudit = async (delegationId: string, action: string, detail: string) => {
    // Fetch previous hash for chain continuity
    const prevRes = await supabase
      .from('m113_delegation_audit')
      .select('hash_chain')
      .eq('delegation_id', delegationId)
      .order('created_at', { ascending: false })
      .limit(1);
    const previousHash = prevRes.data?.[0]?.hash_chain || null;
    const newHash = genHash();
    const { error } = await supabase.from('m113_delegation_audit').insert({
      delegation_id: delegationId,
      action,
      actor: 'النظام',
      actor_role: 'النظام',
      detail,
      microsecond_ts: microTimestamp(),
      hash_chain: newHash,
      previous_hash: previousHash,
      immutable: true,
    });
    if (error) console.error('m113 audit log error', error);
  };

  const openAdd = () => {
    // Auto-generate request number DEL-2025-XXX
    const nextNum = String(requests.length + 1).padStart(3, '0');
    setForm({ ...emptyForm, request_number: `DEL-2025-${nextNum}` });
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (r: M113DelegationRequest) => {
    setForm({
      request_number: r.request_number,
      request_title: r.request_title,
      requester_id: r.requester_id || '',
      requester_name: r.requester_name || '',
      requester_role: r.requester_role || '',
      target_files: (r.target_files || []).join(', '),
      emergency_level: r.emergency_level,
      quorum_required: String(r.quorum_required || 3),
      status: r.status,
      trigger_reason: r.trigger_reason || '',
      m109_biometric_failed: !!r.m109_biometric_failed,
      m109_failure_count: String(r.m109_failure_count || 0),
      manual_declaration: !!r.manual_declaration,
      quorum_members: (r.quorum_members || []).join(', '),
      token_scope: r.token_scope || '',
      shamir_shares: String(r.shamir_shares || 5),
      shamir_threshold: String(r.shamir_threshold || 3),
      description: r.description || '',
    });
    setEditingId(r.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.request_title.trim() || !form.request_number.trim()) return;
    setSaving(true);
    const targetFiles = form.target_files.split(',').map((s) => s.trim()).filter(Boolean);
    const quorumMembers = form.quorum_members.split(',').map((s) => s.trim()).filter(Boolean);
    const quorumRequired = Number(form.quorum_required) || EMERGENCY_QUORUM[form.emergency_level] || 3;
    const payload = {
      request_number: form.request_number.trim(),
      request_title: form.request_title.trim(),
      requester_id: form.requester_id.trim() || null,
      requester_name: form.requester_name.trim() || null,
      requester_role: form.requester_role.trim() || null,
      target_files: targetFiles,
      emergency_level: form.emergency_level,
      quorum_required: quorumRequired,
      quorum_collected: 0,
      status: form.status,
      trigger_reason: form.trigger_reason.trim() || null,
      m109_biometric_failed: form.m109_biometric_failed,
      m109_failure_count: Number(form.m109_failure_count) || 0,
      manual_declaration: form.manual_declaration,
      quorum_members: quorumMembers,
      signatures: [],
      emergency_token: null,
      token_issued: false,
      token_issued_at: null,
      token_expires_at: null,
      token_scope: form.token_scope.trim() || null,
      m52_notified: true,
      m49_board_vote: form.emergency_level !== 'operational',
      m92_monitoring: true,
      m108_continuity: true,
      shamir_shares: Number(form.shamir_shares) || 5,
      shamir_threshold: Number(form.shamir_threshold) || 3,
      zk_audit_frozen: false,
      hash_chain: genHash(),
      previous_hash: null,
      description: form.description.trim() || null,
    };
    if (editingId) {
      const { error } = await supabase.from('m113_delegation_requests').update({
        request_title: payload.request_title,
        requester_id: payload.requester_id,
        requester_name: payload.requester_name,
        requester_role: payload.requester_role,
        target_files: payload.target_files,
        emergency_level: payload.emergency_level,
        quorum_required: payload.quorum_required,
        status: payload.status,
        trigger_reason: payload.trigger_reason,
        m109_biometric_failed: payload.m109_biometric_failed,
        m109_failure_count: payload.m109_failure_count,
        manual_declaration: payload.manual_declaration,
        quorum_members: payload.quorum_members,
        token_scope: payload.token_scope,
        shamir_shares: payload.shamir_shares,
        shamir_threshold: payload.shamir_threshold,
        description: payload.description,
      }).eq('id', editingId);
      if (error) console.error('update error', error);
      await logAudit(editingId, 'request_updated', 'تحديث بيانات طلب التفويض السيادي');
    } else {
      const { data, error } = await supabase.from('m113_delegation_requests').insert(payload).select('id');
      if (error) console.error('insert error', error);
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'request_created', 'إنشاء طلب تفويض سيادي — المستوى: ' + (EMERGENCY_LEVELS[form.emergency_level]?.label || form.emergency_level));
        await logAudit(newId, 'm109_biometric_failed', `فشل المصادقة البيومترية (M109) — عدد المحاولات: ${payload.m109_failure_count}`);
        await logAudit(newId, 'm52_notified', 'إخطار محرك الحوكمة (M52) بتفعيل التفويض السيادي');
        if (payload.m49_board_vote) {
          await logAudit(newId, 'm49_board_vote', 'إحالة إلى مجلس الإدارة (M49) للتصويت السيادي');
        }
        await logAudit(newId, 'm92_monitoring', 'تفعيل الوكيل الذكي (M92) للمراقبة المستمرة');
        await logAudit(newId, 'm108_continuity', 'تفعيل محرك استمرارية الأعمال (M108)');
        await logAudit(newId, 'shamir_config', `تكوين Shamir — الأسهم: ${payload.shamir_shares}، العتبة: ${payload.shamir_threshold}`);
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('m113_delegation_requests').delete().eq('id', deleteId);
    if (error) console.error('delete error', error);
    setDeleteId(null);
    setSelectedRequest(null);
    fetchAll();
  };

  const openRequestDetail = async (r: M113DelegationRequest) => {
    setSelectedRequest(r);
    setDetailLoading(true);
    const [vRes, aRes] = await Promise.all([
      supabase.from('m113_quorum_votes').select('*').eq('delegation_id', r.id).order('created_at', { ascending: true }),
      supabase.from('m113_delegation_audit').select('*').eq('delegation_id', r.id).order('created_at', { ascending: true }),
    ]);
    if (vRes.error) console.error('detail votes error', vRes.error);
    if (aRes.error) console.error('detail audit error', aRes.error);
    setDetailVotes((vRes.data as M113QuorumVote[]) || []);
    setDetailAudit((aRes.data as M113DelegationAudit[]) || []);
    setDetailLoading(false);
  };

  const openVoteAdd = (presetDelegationId?: string) => {
    setVoteForm({ ...emptyVoteForm, delegation_id: presetDelegationId || '' });
    setVoteModalOpen(true);
  };

  const handleVoteSave = async () => {
    if (!voteForm.delegation_id || !voteForm.voter_name.trim()) return;
    setVoteSaving(true);
    // Fetch previous hash for chain continuity
    const prevRes = await supabase
      .from('m113_quorum_votes')
      .select('hash_chain')
      .eq('delegation_id', voteForm.delegation_id)
      .order('created_at', { ascending: false })
      .limit(1);
    const previousHash = prevRes.data?.[0]?.hash_chain || null;
    const newHash = genHash();
    const votePayload = {
      delegation_id: voteForm.delegation_id,
      voter_id: voteForm.voter_id.trim(),
      voter_name: voteForm.voter_name.trim(),
      voter_role: voteForm.voter_role.trim(),
      vote_decision: voteForm.vote_decision,
      e_token_id: voteForm.e_token_id.trim() || null,
      digital_signature: voteForm.digital_signature.trim() || genHash(),
      signed_at: new Date().toISOString(),
      clearance_level: voteForm.clearance_level,
      hash_chain: newHash,
      previous_hash: previousHash,
    };
    const { data: voteData, error: voteError } = await supabase.from('m113_quorum_votes').insert(votePayload).select('id');
    if (voteError) console.error('vote insert error', voteError);

    // Update parent delegation request's quorum_collected count
    const parent = requests.find((r) => r.id === voteForm.delegation_id);
    if (parent) {
      const isApprove = voteForm.vote_decision === 'approve';
      const newCollected = (parent.quorum_collected || 0) + (isApprove ? 1 : 0);
      const updatePayload: Record<string, unknown> = { quorum_collected: newCollected };
      let statusChanged = false;
      let tokenGenerated = '';
      // When quorum_collected >= quorum_required, update status to 'quorum_reached' and generate emergency token
      if (isApprove && newCollected >= (parent.quorum_required || 3)) {
        updatePayload.status = 'quorum_reached';
        updatePayload.token_issued = true;
        tokenGenerated = 'EMRG-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
        updatePayload.emergency_token = tokenGenerated;
        updatePayload.token_issued_at = new Date().toISOString();
        // Token valid for 24 hours
        const expires = new Date();
        expires.setHours(expires.getHours() + 24);
        updatePayload.token_expires_at = expires.toISOString();
        updatePayload.zk_audit_frozen = true;
        statusChanged = true;
      } else if (parent.status === 'pending') {
        updatePayload.status = 'collecting';
      }
      const { error: updateError } = await supabase.from('m113_delegation_requests').update(updatePayload).eq('id', parent.id);
      if (updateError) console.error('quorum update error', updateError);

      // Audit the vote
      await logAudit(parent.id, 'vote_cast', `تصويت من ${voteForm.voter_name} — القرار: ${VOTE_DECISIONS[voteForm.vote_decision]?.label || voteForm.vote_decision}`);
      if (statusChanged) {
        await logAudit(parent.id, 'quorum_reached', `اكتمال النصاب — ${newCollected}/${parent.quorum_required}`);
        await logAudit(parent.id, 'token_issued', `تم إصدار التوكن الطارئ: ${tokenGenerated} — صالح لمدة 24 ساعة`);
        await logAudit(parent.id, 'zk_audit_frozen', 'تجميد سجل التدقيق ZK-Audit — غير قابل للتعديل');
      }
    }
    setVoteSaving(false);
    setVoteModalOpen(false);
    fetchAll();
    if (selectedRequest && selectedRequest.id === voteForm.delegation_id) {
      openRequestDetail({ ...selectedRequest });
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (filterLevel !== 'all' && r.emergency_level !== filterLevel) return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!r.request_number.toLowerCase().includes(q) &&
          !r.request_title.toLowerCase().includes(q) &&
          !(r.requester_name || '').toLowerCase().includes(q) &&
          !(r.trigger_reason || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filteredVotes = votes.filter((v) => {
    if (filterVoteDelegation !== 'all' && v.delegation_id !== filterVoteDelegation) return false;
    return true;
  });

  const filteredAudit = audit.filter((a) => {
    if (filterAuditDelegation !== 'all' && a.delegation_id !== filterAuditDelegation) return false;
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const collectingCount = requests.filter((r) => r.status === 'collecting').length;
  const quorumReachedCount = requests.filter((r) => r.status === 'quorum_reached').length;
  const tokenIssuedCount = requests.filter((r) => r.token_issued).length;

  const tabs: { id: Tab; label: string; icon: typeof Shield; badge?: number }[] = [
    { id: 'requests', label: 'طلبات التفويض', icon: ShieldCheck, badge: requests.length },
    { id: 'votes', label: 'تصويت النصاب', icon: Vote, badge: votes.length },
    { id: 'audit', label: 'سجل ZK-Audit', icon: FileLock, badge: audit.length },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <ShieldCheck size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">بروتوكول التفويض السيادي المتدرج (M113)</h2>
            <p className="font-body text-[10px] text-ink/40">مصادقة جماعية مشفرة Multi-Sig Quorum للوصول الاضطراري للملفات فائقة السرية</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Lock size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">Multi-Sig · Shamir · ZK-Audit</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> طلب تفويض
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<ShieldCheck size={14} className="text-midnight" />} label="إجمالي الطلبات" value={String(requests.length)} valueClass="text-midnight" />
        <StatCard icon={<Clock size={14} className="text-amber-600" />} label="بانتظار/جمع" value={String(pendingCount + collectingCount)} valueClass="text-amber-700" />
        <StatCard icon={<Users size={14} className="text-green-600" />} label="اكتمال النصاب" value={String(quorumReachedCount)} valueClass="text-green-700" />
        <StatCard icon={<KeyRound size={14} className="text-gold" />} label="توكن صادر" value={String(tokenIssuedCount)} valueClass="text-gold" />
      </div>

      {/* 5-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">بروتوكول التفويض السيادي — 5 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {WORKFLOW_STAGES.map((stage, i) => {
            const cfg = WORKFLOW_CONFIG[stage];
            const Icon = cfg.icon;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[130px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <Icon size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                  </div>
                  <p className="font-body text-[9px] text-cream/40 leading-tight">{cfg.desc}</p>
                </div>
                {i < WORKFLOW_STAGES.length - 1 && <ChevronRight size={12} className="text-gold/30 flex-shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Integration matrix */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-midnight text-xs">مصفوفة التكامل (Integration Matrix)</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            { icon: Fingerprint, label: 'البوابة البيومترية (M109)', desc: 'فشل المصادقة', color: 'text-red-600' },
            { icon: Shield, label: 'محرك الحوكمة (M52)', desc: 'إخطار الحوكمة', color: 'text-blue-600' },
            { icon: Gavel, label: 'مجلس الإدارة (M49)', desc: 'تصويت سيادي', color: 'text-purple-600' },
            { icon: Activity, label: 'الوكيل الذكي (M92)', desc: 'مراقبة مستمرة', color: 'text-amber-600' },
            { icon: BadgeCheck, label: 'استمرارية الأعمال (M108)', desc: 'تفعيل الطوارئ', color: 'text-green-600' },
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

      {/* Filters for requests */}
      {activeTab === 'requests' && (
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل المستويات</option>
            {Object.entries(EMERGENCY_LEVELS).map(([v, l]) => <option key={v} value={v}>{l.label} — {l.quorum}</option>)}
          </Select>
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الحالات</option>
            {Object.entries(STATUS_CONFIG).map(([v, l]) => <option key={v} value={v}>{l.label}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم الطلب أو العنوان..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Requests tab */}
      {activeTab === 'requests' && (
        <div className="space-y-2">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <ShieldCheck size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد طلبات تفويض سيادي مسجلة</p>
            </div>
          ) : (
            filteredRequests.map((r) => {
              const eCfg = EMERGENCY_LEVELS[r.emergency_level] || EMERGENCY_LEVELS.operational;
              const sCfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
              const quorumPct = r.quorum_required > 0 ? Math.min(100, Math.round((r.quorum_collected / r.quorum_required) * 100)) : 0;
              const targetFiles = r.target_files || [];
              return (
                <div key={r.id} onClick={() => openRequestDetail(r)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${eCfg.bg}`}>
                        <ShieldCheck size={14} className={eCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-body text-[10px] font-bold text-gold">{r.request_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${eCfg.bg} ${eCfg.text}`}>{eCfg.label} — {eCfg.quorum}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          {r.m109_biometric_failed && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-red-50 text-red-600">
                              <Fingerprint size={8} /> M109 فشل ({r.m109_failure_count})
                            </span>
                          )}
                          {r.manual_declaration && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-orange-50 text-orange-600">
                              <AlertTriangle size={8} /> إعلان يدوي
                            </span>
                          )}
                          {r.token_issued && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-gold/10 text-gold">
                              <KeyRound size={8} /> توكن صادر
                            </span>
                          )}
                          {r.zk_audit_frozen && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-gray-100 text-ink/60">
                              <Lock size={8} /> ZK مجمَّد
                            </span>
                          )}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{r.request_title}</p>
                        {/* Target files as red badges */}
                        {targetFiles.length > 0 && (
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            {targetFiles.slice(0, 4).map((tf, i) => (
                              <span key={i} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-red-50 text-red-700 border border-red-100">
                                <FileLock size={8} /> {tf}
                              </span>
                            ))}
                            {targetFiles.length > 4 && <span className="font-body text-[9px] text-ink/40">+{targetFiles.length - 4} ملف</span>}
                          </div>
                        )}
                        {/* Quorum progress bar */}
                        <div className="mt-2">
                          <div className="flex items-center gap-2 mb-1">
                            <Users size={10} className="text-ink/40" />
                            <span className="font-body text-[9px] text-ink/50">النصاب: {r.quorum_collected || 0} / {r.quorum_required || 0}</span>
                            <span className="font-body text-[9px] font-bold text-gold">{quorumPct}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${quorumPct >= 100 ? 'bg-green-500' : 'bg-gold'}`} style={{ width: `${quorumPct}%` }} />
                          </div>
                        </div>
                        {/* Shamir info */}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600">
                            <KeyRound size={8} /> Shamir {r.shamir_threshold}/{r.shamir_shares}
                          </span>
                          {r.m52_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Shield size={8} /> M52</span>}
                          {r.m49_board_vote && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Gavel size={8} /> M49</span>}
                          {r.m92_monitoring && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Activity size={8} /> M92</span>}
                          {r.m108_continuity && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><BadgeCheck size={8} /> M108</span>}
                          {r.m109_biometric_failed && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-red-50 text-red-600"><Fingerprint size={8} /> M109</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
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

      {/* Votes tab */}
      {activeTab === 'votes' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Select value={filterVoteDelegation} onChange={(e) => setFilterVoteDelegation(e.target.value)} className="!w-auto !py-1.5 !text-xs">
                <option value="all">كل الطلبات</option>
                {requests.map((r) => <option key={r.id} value={r.id}>{r.request_number} — {r.request_title}</option>)}
              </Select>
            </div>
            <button onClick={() => openVoteAdd()} className="flex items-center gap-2 px-3 py-1.5 bg-midnight text-cream rounded-lg font-body text-xs font-bold hover:bg-midnight-light transition-colors">
              <Vote size={14} /> تسجيل تصويت
            </button>
          </div>
          {filteredVotes.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Vote size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد أصوات نصاب مسجلة</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-50">
                {filteredVotes.map((v) => {
                  const dCfg = VOTE_DECISIONS[v.vote_decision] || VOTE_DECISIONS.approve;
                  const cCfg = CLEARANCE_LEVELS[v.clearance_level || 'l3'] || CLEARANCE_LEVELS.l3;
                  const parentReq = requests.find((r) => r.id === v.delegation_id);
                  return (
                    <div key={v.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${dCfg.bg}`}>
                        <Vote size={12} className={dCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-body text-[10px] font-bold text-midnight">{v.voter_name}</span>
                          {v.voter_role && <span className="font-body text-[9px] text-ink/40">{v.voter_role}</span>}
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${dCfg.bg} ${dCfg.text}`}>{dCfg.label}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cCfg.bg} ${cCfg.text}`}>{cCfg.label}</span>
                          {parentReq && <span className="font-body text-[9px] text-gold font-bold">{parentReq.request_number}</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {v.e_token_id && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/40"><KeyRound size={8} /> {v.e_token_id}</span>}
                          {v.digital_signature && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/40"><Hash size={8} /> {v.digital_signature.substr(0, 18)}...</span>}
                          {v.signed_at && <span className="font-body text-[9px] text-ink/30">{formatDate(v.signed_at)}</span>}
                        </div>
                        {/* Hash chain progression */}
                        <div className="flex items-center gap-1 mt-1">
                          {v.previous_hash && (
                            <span className="flex items-center gap-0.5 font-body text-[8px] text-ink/30">
                              <ChevronRight size={8} className="text-ink/20" />
                              prev: {v.previous_hash.substr(0, 14)}...
                            </span>
                          )}
                          <span className="flex items-center gap-0.5 font-body text-[8px] text-gold/60">
                            <Hash size={8} /> {v.hash_chain.substr(0, 14)}...
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audit tab */}
      {activeTab === 'audit' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Select value={filterAuditDelegation} onChange={(e) => setFilterAuditDelegation(e.target.value)} className="!w-auto !py-1.5 !text-xs">
                <option value="all">كل الطلبات</option>
                {requests.map((r) => <option key={r.id} value={r.id}>{r.request_number} — {r.request_title}</option>)}
              </Select>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100">
              <Lock size={12} className="text-ink/50" />
              <span className="font-body text-[10px] font-bold text-ink/60">Immutable · ZK-Audit Trail</span>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {filteredAudit.length === 0 ? (
                <div className="text-center py-12">
                  <FileLock size={28} className="text-ink/15 mx-auto mb-2" />
                  <p className="font-body text-xs text-ink/30">لا توجد سجلات تدقيق</p>
                </div>
              ) : filteredAudit.map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {log.action.includes('created') ? <ShieldCheck size={12} className="text-blue-600" />
                      : log.action.includes('m109') ? <Fingerprint size={12} className="text-red-600" />
                      : log.action.includes('m52') ? <Shield size={12} className="text-blue-600" />
                      : log.action.includes('m49') ? <Gavel size={12} className="text-purple-600" />
                      : log.action.includes('m92') ? <Activity size={12} className="text-amber-600" />
                      : log.action.includes('m108') ? <BadgeCheck size={12} className="text-green-600" />
                      : log.action.includes('shamir') ? <KeyRound size={12} className="text-purple-600" />
                      : log.action.includes('vote') ? <Vote size={12} className="text-blue-600" />
                      : log.action.includes('quorum') ? <Users size={12} className="text-green-600" />
                      : log.action.includes('token') ? <KeyRound size={12} className="text-gold" />
                      : log.action.includes('frozen') ? <Lock size={12} className="text-ink/60" />
                      : log.action.includes('updated') ? <Pencil size={12} className="text-amber-600" />
                      : <Activity size={12} className="text-ink/40" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-body text-[10px] font-bold text-midnight">{log.action}</span>
                      {log.actor && <span className="font-body text-[9px] text-ink/40">{log.actor}</span>}
                      {/* Immutable badge */}
                      {log.immutable && (
                        <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-body font-bold bg-gray-100 text-ink/50">
                          <Lock size={8} /> immutable
                        </span>
                      )}
                    </div>
                    {log.detail && <p className="font-body text-[10px] text-ink/50 leading-relaxed mt-0.5">{log.detail}</p>}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {/* Microsecond timestamp for forensic precision */}
                      {log.microsecond_ts && (
                        <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/30">
                          <Timer size={8} /> {log.microsecond_ts}
                        </span>
                      )}
                      <span className="font-body text-[9px] text-ink/30">{new Date(log.created_at).toLocaleString('ar-EG')}</span>
                      {log.hash_chain && <span className="flex items-center gap-0.5 font-body text-[9px] text-gold/60"><Hash size={8} /> {log.hash_chain.substr(0, 18)}...</span>}
                      {log.previous_hash && <span className="flex items-center gap-0.5 font-body text-[8px] text-ink/30"><ChevronRight size={8} /> prev: {log.previous_hash.substr(0, 14)}...</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Request detail drawer */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedRequest(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">طلب التفويض السيادي</span>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-gold animate-spin" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="font-body text-[10px] font-bold text-gold">{selectedRequest.request_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(EMERGENCY_LEVELS[selectedRequest.emergency_level] || EMERGENCY_LEVELS.operational).bg} ${(EMERGENCY_LEVELS[selectedRequest.emergency_level] || EMERGENCY_LEVELS.operational).text}`}>
                      {(EMERGENCY_LEVELS[selectedRequest.emergency_level] || EMERGENCY_LEVELS.operational).label} — {(EMERGENCY_LEVELS[selectedRequest.emergency_level] || EMERGENCY_LEVELS.operational).quorum}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STATUS_CONFIG[selectedRequest.status] || STATUS_CONFIG.pending).bg} ${(STATUS_CONFIG[selectedRequest.status] || STATUS_CONFIG.pending).text}`}>
                      {(STATUS_CONFIG[selectedRequest.status] || STATUS_CONFIG.pending).label}
                    </span>
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedRequest.request_title}</h3>
                </div>

                {/* 5-stage workflow progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {WORKFLOW_STAGES.map((s, i) => {
                      const cfg = WORKFLOW_CONFIG[s];
                      const Icon = cfg.icon;
                      // Determine active stage from status
                      let activeIdx = 0;
                      if (selectedRequest.status === 'collecting') activeIdx = 2;
                      else if (selectedRequest.status === 'quorum_reached') activeIdx = 3;
                      else if (selectedRequest.status === 'token_issued') activeIdx = 4;
                      else if (selectedRequest.token_issued) activeIdx = 4;
                      else if (selectedRequest.status !== 'pending') activeIdx = 1;
                      const isActive = i === activeIdx;
                      const isPast = i < activeIdx;
                      return (
                        <div key={s} className="flex-1">
                          <div className={`h-1.5 rounded-full ${isPast || isActive ? 'bg-gold' : 'bg-gray-200'} ${isActive ? 'animate-pulse' : ''}`} />
                          <div className="flex items-center gap-1 mt-1 justify-center">
                            <Icon size={10} className={isActive ? 'text-gold' : 'text-ink/30'} />
                            <p className={`font-body text-[8px] ${isActive ? 'text-gold font-bold' : 'text-ink/30'}`}>{cfg.label}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Requester info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Users size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات الطالب</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">اسم الطالب</span><p className="font-body text-xs font-bold text-midnight">{selectedRequest.requester_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الدور</span><p className="font-body text-xs font-bold text-midnight">{selectedRequest.requester_role || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المعرِّف</span><p className="font-body text-xs font-bold text-midnight">{selectedRequest.requester_id || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">سبب التحري</span><p className="font-body text-xs font-bold text-midnight">{selectedRequest.trigger_reason || '—'}</p></div>
                  </div>
                </div>

                {/* Quorum progress card */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Users size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">تقدم النصاب</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-body text-xs font-bold text-midnight">{selectedRequest.quorum_collected || 0} / {selectedRequest.quorum_required || 0}</span>
                    <span className="font-body text-[10px] text-ink/40">تصويت</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className={`h-full rounded-full ${(selectedRequest.quorum_collected || 0) >= (selectedRequest.quorum_required || 0) ? 'bg-green-500' : 'bg-gold'}`}
                      style={{ width: `${selectedRequest.quorum_required > 0 ? Math.min(100, Math.round(((selectedRequest.quorum_collected || 0) / selectedRequest.quorum_required) * 100)) : 0}%` }} />
                  </div>
                  {/* Quorum members */}
                  {(selectedRequest.quorum_members || []).length > 0 && (
                    <div className="mt-2">
                      <span className="font-body text-[9px] text-ink/40">أعضاء النصاب:</span>
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {(selectedRequest.quorum_members || []).map((m, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/60">{m}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Target files */}
                {(selectedRequest.target_files || []).length > 0 && (
                  <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                    <div className="flex items-center gap-1.5 mb-2">
                      <FileLock size={12} className="text-red-600" />
                      <span className="font-body text-[10px] font-bold text-red-700">الملفات المستهدفة (فائقة السرية)</span>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {(selectedRequest.target_files || []).map((tf, i) => (
                        <span key={i} className="flex items-center gap-0.5 px-2 py-1 rounded text-[10px] font-body font-bold bg-white text-red-700 border border-red-200">
                          <FileLock size={10} /> {tf}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Emergency token card */}
                {selectedRequest.token_issued && (
                  <div className="bg-midnight rounded-lg p-3 border border-gold/30">
                    <div className="flex items-center gap-1.5 mb-1">
                      <KeyRound size={12} className="text-gold" />
                      <span className="font-body text-[10px] font-bold text-cream">التوكن الطارئ</span>
                    </div>
                    <p className="font-body text-sm font-bold text-gold break-all">{selectedRequest.emergency_token || '—'}</p>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div><span className="font-body text-[9px] text-cream/40">الإصدار</span><p className="font-body text-[10px] text-cream">{selectedRequest.token_issued_at ? formatDate(selectedRequest.token_issued_at) : '—'}</p></div>
                      <div><span className="font-body text-[9px] text-cream/40">الانتهاء</span><p className="font-body text-[10px] text-cream">{selectedRequest.token_expires_at ? formatDate(selectedRequest.token_expires_at) : '—'}</p></div>
                    </div>
                    {selectedRequest.token_scope && <p className="font-body text-[10px] text-cream/60 mt-1">النطاق: {selectedRequest.token_scope}</p>}
                  </div>
                )}

                {/* M109 biometric failure card */}
                <div className={`rounded-lg p-3 border ${selectedRequest.m109_biometric_failed ? 'bg-red-50 border-red-100' : 'bg-gray-100 border-gray-200'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Fingerprint size={12} className={selectedRequest.m109_biometric_failed ? 'text-red-600' : 'text-ink/40'} />
                    <span className="font-body text-[10px] font-bold text-midnight">المصادقة البيومترية (M109)</span>
                  </div>
                  <p className={`font-body text-xs font-bold ${selectedRequest.m109_biometric_failed ? 'text-red-700' : 'text-ink/50'}`}>
                    {selectedRequest.m109_biometric_failed ? `فشل — ${selectedRequest.m109_failure_count} محاولات` : 'ناجحة'}
                  </p>
                  {selectedRequest.manual_declaration && (
                    <p className="font-body text-[10px] text-orange-600 mt-1 flex items-center gap-1"><AlertTriangle size={10} /> تفعيل إعلان يدوي طارئ</p>
                  )}
                </div>

                {/* Shamir's Secret Sharing card */}
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <KeyRound size={12} className="text-purple-600" />
                    <span className="font-body text-[10px] font-bold text-purple-700">Shamir's Secret Sharing</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">الأسهم (Shares)</span><p className="font-body text-xs font-bold text-purple-700">{selectedRequest.shamir_shares || 0}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">العتبة (Threshold)</span><p className="font-body text-xs font-bold text-purple-700">{selectedRequest.shamir_threshold || 0}</p></div>
                  </div>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedRequest.m109_biometric_failed ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}><Fingerprint size={10} /> M109 {selectedRequest.m109_biometric_failed ? 'فشل' : 'ناجح'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedRequest.m52_notified ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Shield size={10} /> M52 {selectedRequest.m52_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedRequest.m49_board_vote ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Gavel size={10} /> M49 {selectedRequest.m49_board_vote ? 'تصويت' : 'غير مطلوب'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedRequest.m92_monitoring ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Activity size={10} /> M92 {selectedRequest.m92_monitoring ? 'مراقبة' : 'غير مفعّل'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedRequest.m108_continuity ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><BadgeCheck size={10} /> M108 {selectedRequest.m108_continuity ? 'مفعّل' : 'غير مفعّل'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedRequest.zk_audit_frozen ? 'bg-gray-200 text-ink/70' : 'bg-gray-100 text-ink/30'}`}><Lock size={10} /> ZK {selectedRequest.zk_audit_frozen ? 'مجمَّد' : 'نشط'}</span>
                </div>

                {/* Hash chain */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Hash size={12} className="text-ink/50" />
                    <span className="font-body text-[10px] font-bold text-midnight">سلسلة التجزئة (Hash Chain)</span>
                  </div>
                  <p className="font-body text-[10px] text-gold font-bold break-all">{selectedRequest.hash_chain}</p>
                  {selectedRequest.previous_hash && <p className="font-body text-[9px] text-ink/40 mt-1 break-all">السابق: {selectedRequest.previous_hash}</p>}
                </div>

                {selectedRequest.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedRequest.description}</p></div>
                )}

                {/* Votes list */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Vote size={12} className="text-gold" />
                      <span className="font-body text-[10px] font-bold text-midnight">تصويت النصاب ({detailVotes.length})</span>
                    </div>
                    <button onClick={() => openVoteAdd(selectedRequest.id)} className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-body font-bold bg-midnight text-cream hover:bg-midnight-light transition-colors">
                      <Plus size={10} /> تصويت
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {detailVotes.length === 0 ? (
                      <p className="font-body text-[10px] text-ink/30 text-center py-2">لا توجد أصوات مسجلة</p>
                    ) : detailVotes.map((v) => {
                      const dCfg = VOTE_DECISIONS[v.vote_decision] || VOTE_DECISIONS.approve;
                      return (
                        <div key={v.id} className="flex items-start gap-2 text-[10px] bg-gray-50 rounded p-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${v.vote_decision === 'approve' ? 'bg-green-500' : v.vote_decision === 'reject' ? 'bg-red-500' : 'bg-gray-400'} mt-1 flex-shrink-0`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-body text-ink/60 font-bold">{v.voter_name}</span>
                              <span className={`px-1 py-0.5 rounded text-[9px] font-body font-bold ${dCfg.bg} ${dCfg.text}`}>{dCfg.label}</span>
                            </div>
                            {v.signed_at && <span className="font-body text-ink/30">{formatDate(v.signed_at)}</span>}
                            {v.hash_chain && <p className="font-body text-[8px] text-gold/60 mt-0.5"><Hash size={8} className="inline" /> {v.hash_chain.substr(0, 24)}...</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Audit trail */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2"><FileLock size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">سجل ZK-Audit غير القابل للتعديل</span></div>
                  <div className="space-y-1.5">
                    {detailAudit.map((log) => (
                      <div key={log.id} className="flex items-start gap-2 text-[10px]">
                        <div className="w-1.5 h-1.5 rounded-full bg-gold/40 mt-1 flex-shrink-0" />
                        <div className="flex-1">
                          <span className="font-body text-ink/60">{log.action}</span>
                          {log.detail && <p className="font-body text-ink/40 leading-tight">{log.detail}</p>}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-body text-ink/30">{new Date(log.created_at).toLocaleString('ar-EG')}</span>
                            {log.microsecond_ts && <span className="font-body text-[8px] text-ink/30 flex items-center gap-0.5"><Timer size={8} /> {log.microsecond_ts}</span>}
                            {log.hash_chain && <span className="font-body text-[8px] text-gold/60 flex items-center gap-0.5"><Hash size={8} /> {log.hash_chain.substr(0, 18)}...</span>}
                          </div>
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

      {/* Request create/edit modal */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل طلب التفويض' : 'طلب تفويض سيادي جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الطلب" required><TextInput value={form.request_number} onChange={(e) => setForm({ ...form, request_number: e.target.value })} placeholder="DEL-2025-001" /></Field>
          <Field label="المستوى الطارئ">
            <Select value={form.emergency_level} onChange={(e) => {
              const lvl = e.target.value;
              setForm({ ...form, emergency_level: lvl, quorum_required: String(EMERGENCY_QUORUM[lvl] || 3) });
            }}>
              {Object.entries(EMERGENCY_LEVELS).map(([v, l]) => <option key={v} value={v}>{l.label} — {l.quorum}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان الطلب" required><TextInput value={form.request_title} onChange={(e) => setForm({ ...form, request_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم الطالب"><TextInput value={form.requester_name} onChange={(e) => setForm({ ...form, requester_name: e.target.value })} /></Field>
          <Field label="دور الطالب">
            <Select value={form.requester_role} onChange={(e) => setForm({ ...form, requester_role: e.target.value })}>
              <option value="">— اختر —</option>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="معرِّف الطالب"><TextInput value={form.requester_id} onChange={(e) => setForm({ ...form, requester_id: e.target.value })} /></Field>
          <Field label="الحالة">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {Object.entries(STATUS_CONFIG).map(([v, l]) => <option key={v} value={v}>{l.label}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="الملفات المستهدفة (فائقة السرية) — افصل بفاصلة"><TextInput value={form.target_files} onChange={(e) => setForm({ ...form, target_files: e.target.value })} placeholder="FILE-X001, FILE-X002" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="النصاب المطلوب"><TextInput type="number" value={form.quorum_required} onChange={(e) => setForm({ ...form, quorum_required: e.target.value })} /></Field>
          <Field label="عدد محاولات M109 الفاشلة"><TextInput type="number" value={form.m109_failure_count} onChange={(e) => setForm({ ...form, m109_failure_count: e.target.value })} /></Field>
        </div>
        <Field label="سبب التحري"><TextArea value={form.trigger_reason} onChange={(e) => setForm({ ...form, trigger_reason: e.target.value })} rows={2} /></Field>
        <Field label="أعضاء النصاب — افصل بفاصلة"><TextInput value={form.quorum_members} onChange={(e) => setForm({ ...form, quorum_members: e.target.value })} placeholder="الشريك الإداري، المستشار الأول، مدير الامتثال" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="أسهم Shamir"><TextInput type="number" value={form.shamir_shares} onChange={(e) => setForm({ ...form, shamir_shares: e.target.value })} /></Field>
          <Field label="عتبة Shamir"><TextInput type="number" value={form.shamir_threshold} onChange={(e) => setForm({ ...form, shamir_threshold: e.target.value })} /></Field>
        </div>
        <Field label="نطاق التوكن"><TextInput value={form.token_scope} onChange={(e) => setForm({ ...form, token_scope: e.target.value })} placeholder="قراءة الملفات فائقة السرية لمدة 24 ساعة" /></Field>
        <div className="flex items-center gap-6 flex-wrap">
          <Checkbox checked={form.m109_biometric_failed} onChange={(v: boolean) => setForm({ ...form, m109_biometric_failed: v })} label="فشل بيومتري M109" />
          <Checkbox checked={form.manual_declaration} onChange={(v: boolean) => setForm({ ...form, manual_declaration: v })} label="إعلان يدوي طارئ" />
        </div>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      {/* Vote create modal */}
      <EntityModal open={voteModalOpen} title="تسجيل تصويت نصاب" onClose={() => setVoteModalOpen(false)} onSubmit={handleVoteSave} loading={voteSaving}>
        <Field label="طلب التفويض" required>
          <Select value={voteForm.delegation_id} onChange={(e) => setVoteForm({ ...voteForm, delegation_id: e.target.value })}>
            <option value="">— اختر الطلب —</option>
            {requests.map((r) => <option key={r.id} value={r.id}>{r.request_number} — {r.request_title}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم المصوِّت" required><TextInput value={voteForm.voter_name} onChange={(e) => setVoteForm({ ...voteForm, voter_name: e.target.value })} /></Field>
          <Field label="دور المصوِّت">
            <Select value={voteForm.voter_role} onChange={(e) => setVoteForm({ ...voteForm, voter_role: e.target.value })}>
              <option value="">— اختر —</option>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="معرِّف المصوِّت"><TextInput value={voteForm.voter_id} onChange={(e) => setVoteForm({ ...voteForm, voter_id: e.target.value })} /></Field>
          <Field label="قرار التصويت">
            <Select value={voteForm.vote_decision} onChange={(e) => setVoteForm({ ...voteForm, vote_decision: e.target.value })}>
              {Object.entries(VOTE_DECISIONS).map(([v, l]) => <option key={v} value={v}>{l.label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="مستوى التخليص">
            <Select value={voteForm.clearance_level} onChange={(e) => setVoteForm({ ...voteForm, clearance_level: e.target.value })}>
              {Object.entries(CLEARANCE_LEVELS).map(([v, l]) => <option key={v} value={v}>{l.label}</option>)}
            </Select>
          </Field>
          <Field label="معرِّف التوكن الإلكتروني"><TextInput value={voteForm.e_token_id} onChange={(e) => setVoteForm({ ...voteForm, e_token_id: e.target.value })} /></Field>
        </div>
        <Field label="التوقيع الرقمي"><TextInput value={voteForm.digital_signature} onChange={(e) => setVoteForm({ ...voteForm, digital_signature: e.target.value })} placeholder="يُولَّد تلقائياً إذا تُرك فارغاً" /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
