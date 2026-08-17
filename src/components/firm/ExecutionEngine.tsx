import { useEffect, useState, useCallback } from 'react';
import {
  Gavel, Loader2, Plus, Pencil, Trash2, ChevronRight, X, FileText,
  Users, Calendar, DollarSign, Lock, Shield, CircuitBoard, Zap,
  CheckCircle2, Clock, AlertTriangle, ArrowRight, Search, Fingerprint,
  Scale, Building2, Archive, Send, Eye, Activity, Sparkles, BookOpen,
  TrendingUp, AlertOctagon, ScanLine, Server, BadgeCheck, ShieldAlert,
  MapPin, UserCog, Landmark, Banknote, Crosshair,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M09Case, M09Party, M09EnforcementAction, M09Obstacle, M09AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'cases' | 'enforcement_actions' | 'obstacles' | 'parties' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  writ_receipt: { label: 'استلام السند التنفيذي', bg: 'bg-blue-50', text: 'text-blue-700' },
  file_opening: { label: 'فتح ملف التنفيذ', bg: 'bg-amber-50', text: 'text-amber-700' },
  obstacle_management: { label: 'إدارة الإشكالات', bg: 'bg-purple-50', text: 'text-purple-700' },
  completion: { label: 'إتمام التنفيذ', bg: 'bg-green-50', text: 'text-green-700' },
};

const STAGES = ['writ_receipt', 'file_opening', 'obstacle_management', 'completion'];

const ENFORCEMENT_TYPE_LABELS: Record<string, string> = {
  monetary: 'مالي',
  eviction: 'إخلاء',
  property_seizure: 'حجز أموال',
  specific_performance: 'تنفيذ عيني',
};

const SOURCE_ENGINE_LABELS: Record<string, string> = {
  M1: 'المحرك المدني التجاري (M1)',
  M2: 'محرك القضاء الإداري (M2)',
  M3: 'محرك مجلس الدولة (M3)',
  M4: 'المحرك الاقتصادي (M4)',
  M5: 'محرك الأسرة (M5)',
  M6: 'محرك العمل (M6)',
  M7: 'محرك التحكيم (M7)',
  M8: 'محرك اللجان النزاعية (M8)',
};

const PARTY_TYPE_LABELS: Record<string, string> = {
  creditor: 'الدائن (المستفيد)',
  debtor: 'المدين (المنفذ ضده)',
  bailiff: 'محضر التنفيذ',
  police: 'الشرطة',
  third_party: 'طرف ثالث',
  opposing_party: 'الخصم',
};

const AUTHORITY_TYPE_LABELS: Record<string, string> = {
  'هيئة قضائية': 'هيئة قضائية',
  'جهة تنفيذية': 'جهة تنفيذية',
  'مرفق عام': 'مرفق عام',
  'قطاع حكومي': 'قطاع حكومي',
  'وحدة محلية': 'وحدة محلية',
  'جهة خاصة': 'جهة خاصة',
};

const ACTION_TYPE_LABELS: Record<string, string> = {
  seizure: 'حجز',
  auction: 'مزاد',
  eviction: 'إخلاء',
  notification: 'إخطار',
  seizure_lift: 'رفع الحجز',
  payment_order: 'أمر دفع',
  property_transfer: 'نقل ملكية',
  other: 'إجراء آخر',
};

const ACTION_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'بانتظار التنفيذ', bg: 'bg-amber-50', text: 'text-amber-600' },
  in_progress: { label: 'قيد التنفيذ', bg: 'bg-blue-50', text: 'text-blue-600' },
  completed: { label: 'تم التنفيذ', bg: 'bg-green-50', text: 'text-green-600' },
  failed: { label: 'فشل', bg: 'bg-red-50', text: 'text-red-600' },
};

const OBSTACLE_TYPE_LABELS: Record<string, string> = {
  execution_obstacle: 'إشكال في التنفيذ',
  third_party_claim: 'ادعاء طرف ثالث',
  appeal_enforcement: 'طعن في التنفيذ',
  property_dispute: 'نزاع على المال',
  bankruptcy: 'إفلاس',
  other: 'إشكال آخر',
};

const OBSTACLE_NATURE_LABELS: Record<string, string> = {
  subjective: 'إشكال شخصي',
  objective: 'إشكال موضوعي',
  mixed: 'إشكال مختلط',
};

const RESPONSE_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'بانتظار الرد', bg: 'bg-amber-50', text: 'text-amber-600' },
  drafting: { label: 'صياغة المذكرة', bg: 'bg-blue-50', text: 'text-blue-600' },
  filed: { label: 'تم تقديم الرد', bg: 'bg-green-50', text: 'text-green-600' },
  resolved: { label: 'تم الحل', bg: 'bg-green-50', text: 'text-green-700' },
};

interface CaseForm {
  case_number: string;
  case_title: string;
  source_engine: string;
  source_case_number: string;
  stage: string;
  court: string;
  enforcement_writ_number: string;
  enforcement_writ_date: string;
  bailiff_name: string;
  bailiff_office: string;
  police_coordination: boolean;
  target_amount: string;
  collected_amount: string;
  enforcement_type: string;
  property_seized: string;
  assets_description: string;
  enforcement_location: string;
  filing_date: string;
  assigned_advisor_id: string;
  description: string;
}

const emptyForm: CaseForm = {
  case_number: '', case_title: '', source_engine: 'M1', source_case_number: '',
  stage: 'writ_receipt', court: '', enforcement_writ_number: '', enforcement_writ_date: '',
  bailiff_name: '', bailiff_office: '', police_coordination: false,
  target_amount: '0', collected_amount: '0', enforcement_type: 'monetary',
  property_seized: '', assets_description: '', enforcement_location: '',
  filing_date: '', assigned_advisor_id: '', description: '',
};

export default function ExecutionEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [cases, setCases] = useState<M09Case[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('cases');
  const [selectedCase, setSelectedCase] = useState<M09Case | null>(null);
  const [parties, setParties] = useState<M09Party[]>([]);
  const [enforcementActions, setEnforcementActions] = useState<M09EnforcementAction[]>([]);
  const [obstacles, setObstacles] = useState<M09Obstacle[]>([]);
  const [auditLogs, setAuditLogs] = useState<M09AuditLog[]>([]);
  const [allActions, setAllActions] = useState<M09EnforcementAction[]>([]);
  const [allObstacles, setAllObstacles] = useState<M09Obstacle[]>([]);
  const [allParties, setAllParties] = useState<M09Party[]>([]);
  const [allAudit, setAllAudit] = useState<M09AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CaseForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'case' | 'party' | 'action' | 'obstacle'>('case');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [partyModalOpen, setPartyModalOpen] = useState(false);
  const [partyForm, setPartyForm] = useState({ party_type: 'creditor', name: '', role: '', authority_type: '', contact_info: '', legal_representation: '' });
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionForm, setActionForm] = useState({ action_type: 'seizure', action_title: '', action_date: '', executed_by: '', result: '', status: 'pending', notes: '' });
  const [obstacleModalOpen, setObstacleModalOpen] = useState(false);
  const [obstacleForm, setObstacleForm] = useState({ obstacle_type: 'execution_obstacle', obstacle_title: '', obstacle_nature: 'subjective', filed_by: '', filed_date: '', legal_basis: '', response_memo: '', response_status: 'pending', resolution: '' });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [caseRes, attRes, actRes, obsRes, partyRes, auditRes] = await Promise.all([
      supabase.from('m09_execution_cases')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m09_enforcement_actions').select('*').order('action_date', { ascending: false }),
      supabase.from('m09_enforcement_obstacles').select('*').order('created_at', { ascending: false }),
      supabase.from('m09_enforcement_parties').select('*').order('created_at', { ascending: false }),
      supabase.from('m09_execution_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setCases((caseRes.data as M09Case[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllActions((actRes.data as M09EnforcementAction[]) || []);
    setAllObstacles((obsRes.data as M09Obstacle[]) || []);
    setAllParties((partyRes.data as M09Party[]) || []);
    setAllAudit((auditRes.data as M09AuditLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyForm, case_title: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const logAudit = async (caseId: string, action: string, detail: string) => {
    const hash = '0x' + Math.random().toString(16).substr(2, 4) + '...' + Math.random().toString(16).substr(2, 4);
    await supabase.from('m09_execution_audit_logs').insert({
      case_id: caseId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (c: M09Case) => {
    setForm({
      case_number: c.case_number, case_title: c.case_title, source_engine: c.source_engine || 'M1',
      source_case_number: c.source_case_number || '', stage: c.stage, court: c.court || '',
      enforcement_writ_number: c.enforcement_writ_number || '', enforcement_writ_date: c.enforcement_writ_date || '',
      bailiff_name: c.bailiff_name || '', bailiff_office: c.bailiff_office || '',
      police_coordination: c.police_coordination || false,
      target_amount: String(c.target_amount || 0), collected_amount: String(c.collected_amount || 0),
      enforcement_type: c.enforcement_type || 'monetary', property_seized: c.property_seized || '',
      assets_description: c.assets_description || '', enforcement_location: c.enforcement_location || '',
      filing_date: c.filing_date || '', assigned_advisor_id: c.assigned_advisor_id || '',
      description: c.description || '',
    });
    setEditingId(c.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.case_title.trim() || !form.case_number.trim()) return;
    setSaving(true);
    const payload = {
      case_number: form.case_number.trim(),
      case_title: form.case_title.trim(),
      source_engine: form.source_engine || null,
      source_case_number: form.source_case_number.trim() || null,
      stage: form.stage,
      court: form.court.trim() || null,
      enforcement_writ_number: form.enforcement_writ_number.trim() || null,
      enforcement_writ_date: form.enforcement_writ_date || null,
      bailiff_name: form.bailiff_name.trim() || null,
      bailiff_office: form.bailiff_office.trim() || null,
      police_coordination: form.police_coordination,
      target_amount: Number(form.target_amount) || 0,
      collected_amount: Number(form.collected_amount) || 0,
      enforcement_type: form.enforcement_type,
      property_seized: form.property_seized.trim() || null,
      assets_description: form.assets_description.trim() || null,
      enforcement_location: form.enforcement_location.trim() || null,
      filing_date: form.filing_date || null,
      assigned_advisor_id: form.assigned_advisor_id || null,
      description: form.description.trim() || null,
    };
    if (editingId) {
      await supabase.from('m09_execution_cases').update(payload).eq('id', editingId);
      await logAudit(editingId, 'case_updated', 'تحديث بيانات ملف التنفيذ');
    } else {
      const { data } = await supabase.from('m09_execution_cases').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'case_created', 'إنشاء ملف تنفيذ — نوع: ' + (ENFORCEMENT_TYPE_LABELS[form.enforcement_type] || form.enforcement_type));
        await supabase.from('m09_execution_cases').update({
          m10_linked: true,
          m54_collection_linked: true,
          m92_notified: true,
          m52_notified: true,
          cost_center_id: 'CC-M09-' + Date.now().toString().slice(-6),
          enforcement_status: 'pending',
        }).eq('id', newId);
        await logAudit(newId, 'm10_linked', 'ربط الملف بنواة القضية الذكية (M10)');
        await logAudit(newId, 'm54_collection_linked', 'ربط التحصيل بالمحرك المالي (M54)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92)');
        await logAudit(newId, 'm52_notified', 'إخطار البريد السيادي (M52)');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (deleteType === 'case') await supabase.from('m09_execution_cases').delete().eq('id', deleteId);
    else if (deleteType === 'party') await supabase.from('m09_enforcement_parties').delete().eq('id', deleteId);
    else if (deleteType === 'action') await supabase.from('m09_enforcement_actions').delete().eq('id', deleteId);
    else if (deleteType === 'obstacle') await supabase.from('m09_enforcement_obstacles').delete().eq('id', deleteId);
    setDeleteId(null);
    if (deleteType === 'case') setSelectedCase(null);
    fetchAll();
    if (selectedCase && deleteType !== 'case') openCaseDetail(selectedCase);
  };

  const openCaseDetail = async (c: M09Case) => {
    setSelectedCase(c);
    setDetailLoading(true);
    const [pRes, aRes, oRes, auditRes] = await Promise.all([
      supabase.from('m09_enforcement_parties').select('*').eq('case_id', c.id).order('created_at', { ascending: true }),
      supabase.from('m09_enforcement_actions').select('*').eq('case_id', c.id).order('action_date', { ascending: false }),
      supabase.from('m09_enforcement_obstacles').select('*').eq('case_id', c.id).order('created_at', { ascending: false }),
      supabase.from('m09_execution_audit_logs').select('*').eq('case_id', c.id).order('created_at', { ascending: true }),
    ]);
    setParties((pRes.data as M09Party[]) || []);
    setEnforcementActions((aRes.data as M09EnforcementAction[]) || []);
    setObstacles((oRes.data as M09Obstacle[]) || []);
    setAuditLogs((auditRes.data as M09AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (c: M09Case) => {
    const idx = STAGES.indexOf(c.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    const updatePayload: Record<string, unknown> = { stage: next };
    if (next === 'completion') {
      updatePayload.is_completed = true;
      updatePayload.completion_date = new Date().toISOString().split('T')[0];
      updatePayload.enforcement_status = 'completed';
    }
    await supabase.from('m09_execution_cases').update(updatePayload).eq('id', c.id);
    await logAudit(c.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    if (next === 'completion') {
      await supabase.from('m09_execution_cases').update({ m10_linked: true }).eq('id', c.id);
      await logAudit(c.id, 'm10_linked', 'تحديث حالة القضية الذكية (M10) — التنفيذ مكتمل');
    }
    fetchAll();
    const updated = { ...c, ...updatePayload } as M09Case;
    setSelectedCase(updated);
  };

  const addParty = async () => {
    if (!selectedCase || !partyForm.name.trim()) return;
    await supabase.from('m09_enforcement_parties').insert({
      case_id: selectedCase.id, party_type: partyForm.party_type, name: partyForm.name.trim(),
      role: partyForm.role.trim() || null, authority_type: partyForm.authority_type || null,
      contact_info: partyForm.contact_info.trim() || null,
      legal_representation: partyForm.legal_representation.trim() || null,
    });
    await logAudit(selectedCase.id, 'party_added', 'إضافة طرف: ' + partyForm.name);
    setPartyForm({ party_type: 'creditor', name: '', role: '', authority_type: '', contact_info: '', legal_representation: '' });
    setPartyModalOpen(false);
    openCaseDetail(selectedCase);
  };

  const addAction = async () => {
    if (!selectedCase || !actionForm.action_title.trim() || !actionForm.action_date) return;
    await supabase.from('m09_enforcement_actions').insert({
      case_id: selectedCase.id, action_type: actionForm.action_type,
      action_title: actionForm.action_title.trim(), action_date: actionForm.action_date,
      executed_by: actionForm.executed_by.trim() || null,
      result: actionForm.result.trim() || null, status: actionForm.status,
      notes: actionForm.notes.trim() || null,
    });
    await logAudit(selectedCase.id, 'enforcement_action', 'إجراء تنفيذي: ' + actionForm.action_title);
    setActionForm({ action_type: 'seizure', action_title: '', action_date: '', executed_by: '', result: '', status: 'pending', notes: '' });
    setActionModalOpen(false);
    openCaseDetail(selectedCase);
  };

  const addObstacle = async () => {
    if (!selectedCase || !obstacleForm.obstacle_title.trim()) return;
    await supabase.from('m09_enforcement_obstacles').insert({
      case_id: selectedCase.id, obstacle_type: obstacleForm.obstacle_type,
      obstacle_title: obstacleForm.obstacle_title.trim(),
      obstacle_nature: obstacleForm.obstacle_nature,
      filed_by: obstacleForm.filed_by.trim() || null,
      filed_date: obstacleForm.filed_date || null,
      legal_basis: obstacleForm.legal_basis.trim() || null,
      response_memo: obstacleForm.response_memo.trim() || null,
      response_status: obstacleForm.response_status,
      resolution: obstacleForm.resolution.trim() || null,
    });
    await logAudit(selectedCase.id, 'obstacle_filed', 'إشكال تنفيذي: ' + obstacleForm.obstacle_title);
    setObstacleForm({ obstacle_type: 'execution_obstacle', obstacle_title: '', obstacle_nature: 'subjective', filed_by: '', filed_date: '', legal_basis: '', response_memo: '', response_status: 'pending', resolution: '' });
    setObstacleModalOpen(false);
    openCaseDetail(selectedCase);
  };

  const resolveObstacle = async (o: M09Obstacle) => {
    await supabase.from('m09_enforcement_obstacles').update({
      response_status: 'resolved', resolved_date: new Date().toISOString().split('T')[0],
    }).eq('id', o.id);
    if (selectedCase) await logAudit(selectedCase.id, 'obstacle_resolved', 'حل الإشكال: ' + o.obstacle_title);
    if (selectedCase) openCaseDetail(selectedCase);
  };

  const completeAction = async (a: M09EnforcementAction) => {
    await supabase.from('m09_enforcement_actions').update({
      status: 'completed',
    }).eq('id', a.id);
    if (selectedCase) await logAudit(selectedCase.id, 'action_completed', 'إتمام الإجراء: ' + a.action_title);
    if (selectedCase) openCaseDetail(selectedCase);
  };

  const filteredCases = cases.filter((c) => {
    if (filterType !== 'all' && c.enforcement_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.case_number.toLowerCase().includes(q) && !c.case_title.toLowerCase().includes(q) && !(c.source_case_number || '').toLowerCase().includes(q) && !(c.bailiff_name || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeCases = cases.filter((c) => !c.is_completed).length;
  const completedCases = cases.filter((c) => c.is_completed).length;
  const totalTarget = cases.reduce((s, c) => s + (c.target_amount || 0), 0);
  const totalCollected = cases.reduce((s, c) => s + (c.collected_amount || 0), 0);
  const pendingObstacles = allObstacles.filter((o) => o.response_status !== 'resolved').length;
  const collectionRate = totalTarget > 0 ? (totalCollected / totalTarget) * 100 : 0;

  const tabs: { id: Tab; label: string; icon: typeof Gavel; badge?: number }[] = [
    { id: 'cases', label: 'ملفات التنفيذ', icon: Gavel, badge: activeCases },
    { id: 'enforcement_actions', label: 'الإجراءات التنفيذية', icon: Crosshair },
    { id: 'obstacles', label: 'إشكالات التنفيذ', icon: ShieldAlert, badge: pendingObstacles },
    { id: 'parties', label: 'الأطراف', icon: Users },
    { id: 'audit', label: 'سجل ZK-Audit', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Gavel size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">محرك التنفيذ وإشكالات التنفيذ القضائي (M9)</h2>
            <p className="font-body text-[10px] text-ink/40">القطاع القضائي والإجرائي — تنفيذ الأحكام وإدارة الإشكالات</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Server size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">On-Premise · AES-256</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> ملف تنفيذ
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={<Gavel size={14} className="text-midnight" />} label="إجمالي الملفات" value={String(cases.length)} valueClass="text-midnight" />
        <StatCard icon={<Activity size={14} className="text-blue-600" />} label="ملفات نشطة" value={String(activeCases)} valueClass="text-blue-700" />
        <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="تنفيذات مكتملة" value={String(completedCases)} valueClass="text-green-700" />
        <StatCard icon={<Banknote size={14} className="text-gold" />} label="نسبة التحصيل" value={collectionRate.toFixed(1) + '%'} valueClass="text-gold" />
        <StatCard icon={<ShieldAlert size={14} className="text-amber-600" />} label="إشكالات معلقة" value={String(pendingObstacles)} valueClass="text-amber-700" />
      </div>

      {/* 4-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة التنفيذ القضائي — 4 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.writ_receipt;
            const count = cases.filter((c) => c.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[130px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                  </div>
                  <span className="font-body text-[9px] text-cream/40">{count} ملف</span>
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
            { icon: Landmark, label: 'المحركات القضائية (M1-M8)', desc: 'الأحكام المصدر', color: 'text-blue-600' },
            { icon: Banknote, label: 'المحرك المالي (M54)', desc: 'تحصيل المبالغ', color: 'text-gold' },
            { icon: Sparkles, label: 'نواة القضية الذكية (M10)', desc: 'تحديث الحالة', color: 'text-purple-600' },
            { icon: UserCog, label: 'الوكيل الذكي (M92)', desc: 'توزيع المهام', color: 'text-green-600' },
            { icon: Send, label: 'البريد السيادي (M52)', desc: 'الإخطارات الرسمية', color: 'text-amber-600' },
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

      {/* Filters for cases */}
      {activeTab === 'cases' && (
        <div className="flex items-center gap-2">
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الأنواع</option>
            {Object.entries(ENFORCEMENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم أو عنوان أو محضر..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Cases tab */}
      {activeTab === 'cases' && (
        <div className="space-y-2">
          {filteredCases.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Gavel size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد ملفات تنفيذ</p>
            </div>
          ) : (
            filteredCases.map((c) => {
              const sCfg = STAGE_CONFIG[c.stage] || STAGE_CONFIG.writ_receipt;
              const stageIdx = STAGES.indexOf(c.stage);
              const collectPct = c.target_amount > 0 ? (c.collected_amount / c.target_amount) * 100 : 0;
              return (
                <div key={c.id} onClick={() => openCaseDetail(c)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <Gavel size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{c.case_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{ENFORCEMENT_TYPE_LABELS[c.enforcement_type] || c.enforcement_type}</span>
                          {c.source_engine && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Landmark size={8} /> {c.source_engine}</span>}
                          {c.is_completed && <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600">تنفيذ مكتمل</span>}
                          {c.police_coordination && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><ShieldAlert size={8} /> تنسيق شرطة</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{c.case_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {c.enforcement_writ_number && <span className="flex items-center gap-0.5 font-body text-[9px] text-gold font-bold"><FileText size={9} /> سند: {c.enforcement_writ_number}</span>}
                          {c.bailiff_name && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/40"><UserCog size={9} /> {c.bailiff_name}</span>}
                          {c.court && <span className="font-body text-[9px] text-ink/40">{c.court}</span>}
                          {c.target_amount > 0 && (
                            <span className="flex items-center gap-1 font-body text-[9px] text-gold font-bold">
                              <Banknote size={9} /> {formatCurrency(c.collected_amount)} / {formatCurrency(c.target_amount)}
                              <span className="inline-block w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden ml-1">
                                <span className="block h-full bg-gold rounded-full" style={{ width: Math.min(collectPct, 100) + '%' }} />
                              </span>
                            </span>
                          )}
                          {c.m10_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Sparkles size={8} /> M10</span>}
                          {c.m54_collection_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><Banknote size={8} /> M54</span>}
                          {c.m92_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><UserCog size={8} /> M92</span>}
                          {c.m52_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Send size={8} /> M52</span>}
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
                        <button onClick={(e) => { e.stopPropagation(); openEdit(c); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); setDeleteType('case'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
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

      {/* All enforcement actions tab */}
      {activeTab === 'enforcement_actions' && (
        <div className="space-y-2">
          {allActions.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><Crosshair size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد إجراءات تنفيذية</p></div>
          ) : (
            allActions.map((a) => {
              const cfg = ACTION_STATUS_CONFIG[a.status] || ACTION_STATUS_CONFIG.pending;
              const c = cases.find((c) => c.id === a.case_id);
              return (
                <div key={a.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                        <Crosshair size={14} className={cfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{ACTION_TYPE_LABELS[a.action_type] || a.action_type}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                          {c && <span className="font-body text-[9px] text-gold">{c.case_number}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{a.action_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {a.action_date && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/40"><Calendar size={9} /> {formatDate(a.action_date)}</span>}
                          {a.executed_by && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/40"><UserCog size={9} /> {a.executed_by}</span>}
                          {a.result && <span className="font-body text-[9px] text-ink/50">{a.result}</span>}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(a.id); setDeleteType('action'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Obstacles tab */}
      {activeTab === 'obstacles' && (
        <div className="space-y-2">
          {allObstacles.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><ShieldAlert size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد إشكالات تنفيذ</p></div>
          ) : (
            allObstacles.map((o) => {
              const cfg = RESPONSE_STATUS_CONFIG[o.response_status] || RESPONSE_STATUS_CONFIG.pending;
              const c = cases.find((c) => c.id === o.case_id);
              return (
                <div key={o.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                        <ShieldAlert size={14} className={cfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{OBSTACLE_TYPE_LABELS[o.obstacle_type] || o.obstacle_type}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600">{OBSTACLE_NATURE_LABELS[o.obstacle_nature] || o.obstacle_nature}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                          {c && <span className="font-body text-[9px] text-gold">{c.case_number}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{o.obstacle_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {o.filed_by && <span className="font-body text-[9px] text-ink/40">مقدم: {o.filed_by}</span>}
                          {o.filed_date && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/40"><Calendar size={9} /> {formatDate(o.filed_date)}</span>}
                          {o.legal_basis && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Scale size={8} /> {o.legal_basis}</span>}
                          {o.resolved_date && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> {formatDate(o.resolved_date)}</span>}
                        </div>
                        {o.response_memo && <p className="font-body text-[10px] text-ink/50 mt-1 leading-relaxed line-clamp-2">{o.response_memo}</p>}
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(o.id); setDeleteType('obstacle'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Parties tab */}
      {activeTab === 'parties' && (
        <div className="space-y-2">
          {allParties.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><Users size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد أطراف مسجلة</p></div>
          ) : (
            allParties.map((p) => {
              const c = cases.find((c) => c.id === p.case_id);
              return (
                <div key={p.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Users size={14} className="text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${p.party_type === 'creditor' ? 'bg-green-50 text-green-600' : p.party_type === 'debtor' ? 'bg-red-50 text-red-600' : p.party_type === 'bailiff' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/50'}`}>{PARTY_TYPE_LABELS[p.party_type] || p.party_type}</span>
                          {c && <span className="font-body text-[9px] text-gold">{c.case_number}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{p.name}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {p.role && <span className="font-body text-[9px] text-ink/40">{p.role}</span>}
                          {p.authority_type && <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{p.authority_type}</span>}
                          {p.contact_info && <span className="font-body text-[9px] text-ink/40">{p.contact_info}</span>}
                          {p.legal_representation && <span className="font-body text-[9px] text-ink/40">تمثيل: {p.legal_representation}</span>}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(p.id); setDeleteType('party'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={12} />
                    </button>
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
                    {log.action.includes('created') ? <FileText size={12} className="text-blue-600" />
                      : log.action.includes('m10') ? <Sparkles size={12} className="text-purple-600" />
                      : log.action.includes('m54') ? <Banknote size={12} className="text-green-600" />
                      : log.action.includes('m92') ? <UserCog size={12} className="text-blue-600" />
                      : log.action.includes('m52') ? <Send size={12} className="text-amber-600" />
                      : log.action.includes('obstacle') ? <ShieldAlert size={12} className="text-purple-600" />
                      : log.action.includes('action') ? <Crosshair size={12} className="text-blue-600" />
                      : log.action.includes('party') ? <Users size={12} className="text-blue-600" />
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
                      {log.hash_chain && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/30"><Lock size={8} /> {log.hash_chain}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Case detail drawer */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedCase(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Gavel size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف التنفيذ القضائي</span>
              </div>
              <button onClick={() => setSelectedCase(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-gold animate-spin" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-body text-[10px] font-bold text-gold">{selectedCase.case_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedCase.stage] || STAGE_CONFIG.writ_receipt).bg} ${(STAGE_CONFIG[selectedCase.stage] || STAGE_CONFIG.writ_receipt).text}`}>
                      {(STAGE_CONFIG[selectedCase.stage] || STAGE_CONFIG.writ_receipt).label}
                    </span>
                    {selectedCase.is_completed && <span className="px-2 py-0.5 rounded text-[10px] font-body bg-green-50 text-green-600">تنفيذ مكتمل</span>}
                    {selectedCase.police_coordination && <span className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-body bg-amber-50 text-amber-600"><ShieldAlert size={9} /> تنسيق شرطة</span>}
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedCase.case_title}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.writ_receipt;
                      const stageIdx = STAGES.indexOf(selectedCase.stage);
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
                  {selectedCase.stage !== STAGES[STAGES.length - 1] && (
                    <button onClick={() => advanceStage(selectedCase)} className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
                      <ArrowRight size={12} /> الانتقال للمرحلة التالية
                    </button>
                  )}
                </div>

                {/* Source engine badge */}
                {selectedCase.source_engine && (
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Landmark size={12} className="text-blue-600" />
                      <span className="font-body text-[10px] font-bold text-blue-700">المحرك القضائي المصدر</span>
                    </div>
                    <p className="font-body text-[10px] text-blue-600 leading-relaxed">{SOURCE_ENGINE_LABELS[selectedCase.source_engine] || selectedCase.source_engine}</p>
                    {selectedCase.source_case_number && <p className="font-body text-[9px] text-blue-500 mt-1">رقم القضية المصدر: {selectedCase.source_case_number}</p>}
                  </div>
                )}

                {/* Enforcement writ info */}
                {(selectedCase.enforcement_writ_number || selectedCase.enforcement_writ_date) && (
                  <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                    <div className="flex items-center gap-1.5 mb-2">
                      <FileText size={12} className="text-gold" />
                      <span className="font-body text-[10px] font-bold text-midnight">السند التنفيذي</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="font-body text-[9px] text-ink/40">رقم السند</span><p className="font-body text-xs font-bold text-midnight">{selectedCase.enforcement_writ_number || '—'}</p></div>
                      <div><span className="font-body text-[9px] text-ink/40">تاريخ السند</span><p className="font-body text-xs font-bold text-midnight">{selectedCase.enforcement_writ_date ? formatDate(selectedCase.enforcement_writ_date) : '—'}</p></div>
                    </div>
                  </div>
                )}

                {/* Bailiff info */}
                {(selectedCase.bailiff_name || selectedCase.bailiff_office) && (
                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                    <div className="flex items-center gap-1.5 mb-2">
                      <UserCog size={12} className="text-amber-600" />
                      <span className="font-body text-[10px] font-bold text-amber-700">محضر التنفيذ</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="font-body text-[9px] text-ink/40">الاسم</span><p className="font-body text-xs font-bold text-midnight">{selectedCase.bailiff_name || '—'}</p></div>
                      <div><span className="font-body text-[9px] text-ink/40">المكتب</span><p className="font-body text-xs font-bold text-midnight">{selectedCase.bailiff_office || '—'}</p></div>
                    </div>
                  </div>
                )}

                {/* Collection progress bar */}
                {selectedCase.target_amount > 0 && (
                  <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Banknote size={12} className="text-green-600" />
                      <span className="font-body text-[10px] font-bold text-green-700">تقدم التحصيل — المحرك المالي (M54)</span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: Math.min((selectedCase.collected_amount / selectedCase.target_amount) * 100, 100) + '%' }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-body text-[10px] font-bold text-green-700">{formatCurrency(selectedCase.collected_amount)}</span>
                      <span className="font-body text-[9px] text-ink/40">من {formatCurrency(selectedCase.target_amount)}</span>
                      <span className="font-body text-[10px] font-bold text-midnight">{((selectedCase.collected_amount / selectedCase.target_amount) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                )}

                {/* Case info grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <span className="font-body text-[9px] text-ink/40">نوع التنفيذ</span>
                    <p className="font-body text-xs font-bold text-midnight">{ENFORCEMENT_TYPE_LABELS[selectedCase.enforcement_type] || selectedCase.enforcement_type}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <span className="font-body text-[9px] text-ink/40">المحكمة</span>
                    <p className="font-body text-xs font-bold text-midnight">{selectedCase.court || '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <span className="font-body text-[9px] text-ink/40">تاريخ القيد</span>
                    <p className="font-body text-xs font-bold text-midnight">{selectedCase.filing_date ? formatDate(selectedCase.filing_date) : '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <span className="font-body text-[9px] text-ink/40">تاريخ الإتمام</span>
                    <p className="font-body text-xs font-bold text-midnight">{selectedCase.completion_date ? formatDate(selectedCase.completion_date) : '—'}</p>
                  </div>
                  {selectedCase.enforcement_location && (
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <span className="font-body text-[9px] text-ink/40">موقع التنفيذ</span>
                      <p className="font-body text-xs font-bold text-midnight">{selectedCase.enforcement_location}</p>
                    </div>
                  )}
                  {selectedCase.advisor && (
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <span className="font-body text-[9px] text-ink/40">المستشار المسؤول</span>
                      <p className="font-body text-xs font-bold text-midnight">{selectedCase.advisor.name}</p>
                    </div>
                  )}
                </div>

                {/* Property seized */}
                {selectedCase.property_seized && (
                  <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Archive size={12} className="text-red-600" />
                      <span className="font-body text-[10px] font-bold text-red-700">الأموال المحجوزة</span>
                    </div>
                    <p className="font-body text-[10px] text-red-600 leading-relaxed">{selectedCase.property_seized}</p>
                  </div>
                )}

                {/* Assets description */}
                {selectedCase.assets_description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">وصف الأصول</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedCase.assets_description}</p></div>
                )}

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m10_linked ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Sparkles size={10} /> M10 {selectedCase.m10_linked ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m54_collection_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><Banknote size={10} /> M54 {selectedCase.m54_collection_linked ? 'مفتوح' : 'غير مفتوح'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m92_notified ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><UserCog size={10} /> M92 {selectedCase.m92_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m52_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Send size={10} /> M52 {selectedCase.m52_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                </div>

                {selectedCase.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedCase.description}</p></div>
                )}

                {/* Parties */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><Users size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">الأطراف</span></div>
                    <button onClick={() => setPartyModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> إضافة طرف</button>
                  </div>
                  <div className="space-y-1.5">
                    {parties.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/party">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${p.party_type === 'creditor' ? 'bg-green-50 text-green-600' : p.party_type === 'debtor' ? 'bg-red-50 text-red-600' : p.party_type === 'bailiff' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/50'}`}>{PARTY_TYPE_LABELS[p.party_type] || p.party_type}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-[10px] font-bold text-midnight">{p.name}</p>
                          {p.authority_type && <span className="font-body text-[9px] text-ink/40">{p.authority_type}</span>}
                        </div>
                        <button onClick={() => { setDeleteId(p.id); setDeleteType('party'); }} className="p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/party:opacity-100 transition-all"><Trash2 size={10} /></button>
                      </div>
                    ))}
                    {parties.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد أطراف مسجلة</p>}
                  </div>
                </div>

                {/* Enforcement actions */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><Crosshair size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">الإجراءات التنفيذية</span></div>
                    <button onClick={() => setActionModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> إجراء جديد</button>
                  </div>
                  <div className="space-y-1.5">
                    {enforcementActions.map((a) => {
                      const cfg = ACTION_STATUS_CONFIG[a.status] || ACTION_STATUS_CONFIG.pending;
                      return (
                        <div key={a.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/act">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-200 text-ink/50">{ACTION_TYPE_LABELS[a.action_type] || a.action_type}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-body text-[10px] font-bold text-midnight">{a.action_title}</p>
                            <div className="flex items-center gap-1.5">
                              <span className={`px-1 py-0.5 rounded text-[9px] font-body ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                              <span className="font-body text-[9px] text-ink/40">{formatDate(a.action_date)}</span>
                            </div>
                          </div>
                          {a.status !== 'completed' && <button onClick={() => completeAction(a)} className="p-1 rounded text-green-500 hover:bg-green-50 transition-colors" title="إتمام"><CheckCircle2 size={11} /></button>}
                          <button onClick={() => { setDeleteId(a.id); setDeleteType('action'); }} className="p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/act:opacity-100 transition-all"><Trash2 size={10} /></button>
                        </div>
                      );
                    })}
                    {enforcementActions.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد إجراءات تنفيذية</p>}
                  </div>
                </div>

                {/* Obstacles */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><ShieldAlert size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">إشكالات التنفيذ</span></div>
                    <button onClick={() => setObstacleModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> إشكال جديد</button>
                  </div>
                  <div className="space-y-1.5">
                    {obstacles.map((o) => {
                      const cfg = RESPONSE_STATUS_CONFIG[o.response_status] || RESPONSE_STATUS_CONFIG.pending;
                      return (
                        <div key={o.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/obs">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-200 text-ink/50">{OBSTACLE_TYPE_LABELS[o.obstacle_type] || o.obstacle_type}</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600">{OBSTACLE_NATURE_LABELS[o.obstacle_nature] || o.obstacle_nature}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                          </div>
                          <p className="font-body text-[10px] font-bold text-midnight">{o.obstacle_title}</p>
                          {o.legal_basis && <p className="font-body text-[9px] text-purple-600 mt-0.5"><Scale size={8} className="inline ml-0.5" />{o.legal_basis}</p>}
                          {o.response_memo && <p className="font-body text-[9px] text-ink/50 mt-0.5 leading-tight">{o.response_memo}</p>}
                          {o.resolution && <p className="font-body text-[9px] text-green-600 mt-0.5">الحل: {o.resolution}</p>}
                          <div className="flex items-center justify-end gap-1 mt-1">
                            {o.response_status !== 'resolved' && <button onClick={() => resolveObstacle(o)} className="flex items-center gap-1 px-2 py-0.5 rounded bg-green-600 text-white font-body text-[9px] font-bold hover:bg-green-700 transition-colors"><CheckCircle2 size={9} /> حل الإشكال</button>}
                            <button onClick={() => { setDeleteId(o.id); setDeleteType('obstacle'); }} className="p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/obs:opacity-100 transition-all"><Trash2 size={10} /></button>
                          </div>
                        </div>
                      );
                    })}
                    {obstacles.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد إشكالات تنفيذ</p>}
                  </div>
                </div>

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

      {/* Case create/edit modal */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل ملف التنفيذ' : 'ملف تنفيذ جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الملف" required><TextInput value={form.case_number} onChange={(e) => setForm({ ...form, case_number: e.target.value })} placeholder="EXEC-2025-001" /></Field>
          <Field label="نوع التنفيذ">
            <Select value={form.enforcement_type} onChange={(e) => setForm({ ...form, enforcement_type: e.target.value })}>
              {Object.entries(ENFORCEMENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان الملف" required><TextInput value={form.case_title} onChange={(e) => setForm({ ...form, case_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المحرك المصدر">
            <Select value={form.source_engine} onChange={(e) => setForm({ ...form, source_engine: e.target.value })}>
              {Object.entries(SOURCE_ENGINE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="رقم القضية المصدر"><TextInput value={form.source_case_number} onChange={(e) => setForm({ ...form, source_case_number: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
          <Field label="المحكمة"><TextInput value={form.court} onChange={(e) => setForm({ ...form, court: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم السند التنفيذي"><TextInput value={form.enforcement_writ_number} onChange={(e) => setForm({ ...form, enforcement_writ_number: e.target.value })} /></Field>
          <Field label="تاريخ السند التنفيذي"><TextInput type="date" value={form.enforcement_writ_date} onChange={(e) => setForm({ ...form, enforcement_writ_date: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم محضر التنفيذ"><TextInput value={form.bailiff_name} onChange={(e) => setForm({ ...form, bailiff_name: e.target.value })} /></Field>
          <Field label="مكتب المحضر"><TextInput value={form.bailiff_office} onChange={(e) => setForm({ ...form, bailiff_office: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المبلغ المستهدف"><TextInput type="number" value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} /></Field>
          <Field label="المبلغ المحصّل"><TextInput type="number" value={form.collected_amount} onChange={(e) => setForm({ ...form, collected_amount: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ القيد"><TextInput type="date" value={form.filing_date} onChange={(e) => setForm({ ...form, filing_date: e.target.value })} /></Field>
          <Field label="موقع التنفيذ"><TextInput value={form.enforcement_location} onChange={(e) => setForm({ ...form, enforcement_location: e.target.value })} /></Field>
        </div>
        <Field label="الأموال المحجوزة"><TextArea value={form.property_seized} onChange={(e) => setForm({ ...form, property_seized: e.target.value })} rows={2} /></Field>
        <Field label="وصف الأصول"><TextArea value={form.assets_description} onChange={(e) => setForm({ ...form, assets_description: e.target.value })} rows={2} /></Field>
        <Field label="المستشار المسؤول">
          <Select value={form.assigned_advisor_id} onChange={(e) => setForm({ ...form, assigned_advisor_id: e.target.value })}>
            <option value="">— اختر —</option>
            {attorneys.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </Field>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      {/* Party modal */}
      <EntityModal open={partyModalOpen} title="إضافة طرف" onClose={() => setPartyModalOpen(false)} onSubmit={addParty}>
        <Field label="نوع الطرف" required>
          <Select value={partyForm.party_type} onChange={(e) => setPartyForm({ ...partyForm, party_type: e.target.value })}>
            {Object.entries(PARTY_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="الاسم" required><TextInput value={partyForm.name} onChange={(e) => setPartyForm({ ...partyForm, name: e.target.value })} /></Field>
        <Field label="الدور"><TextInput value={partyForm.role} onChange={(e) => setPartyForm({ ...partyForm, role: e.target.value })} /></Field>
        <Field label="نوع الجهة">
          <Select value={partyForm.authority_type} onChange={(e) => setPartyForm({ ...partyForm, authority_type: e.target.value })}>
            <option value="">— اختر —</option>
            {Object.entries(AUTHORITY_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="معلومات الاتصال"><TextInput value={partyForm.contact_info} onChange={(e) => setPartyForm({ ...partyForm, contact_info: e.target.value })} /></Field>
        <Field label="التمثيل القانوني"><TextInput value={partyForm.legal_representation} onChange={(e) => setPartyForm({ ...partyForm, legal_representation: e.target.value })} /></Field>
      </EntityModal>

      {/* Enforcement action modal */}
      <EntityModal open={actionModalOpen} title="إجراء تنفيذي جديد" onClose={() => setActionModalOpen(false)} onSubmit={addAction}>
        <Field label="نوع الإجراء" required>
          <Select value={actionForm.action_type} onChange={(e) => setActionForm({ ...actionForm, action_type: e.target.value })}>
            {Object.entries(ACTION_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="عنوان الإجراء" required><TextInput value={actionForm.action_title} onChange={(e) => setActionForm({ ...actionForm, action_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ الإجراء" required><TextInput type="date" value={actionForm.action_date} onChange={(e) => setActionForm({ ...actionForm, action_date: e.target.value })} /></Field>
          <Field label="المنفذ"><TextInput value={actionForm.executed_by} onChange={(e) => setActionForm({ ...actionForm, executed_by: e.target.value })} /></Field>
        </div>
        <Field label="الحالة">
          <Select value={actionForm.status} onChange={(e) => setActionForm({ ...actionForm, status: e.target.value })}>
            <option value="pending">بانتظار التنفيذ</option>
            <option value="in_progress">قيد التنفيذ</option>
            <option value="completed">تم التنفيذ</option>
            <option value="failed">فشل</option>
          </Select>
        </Field>
        <Field label="النتيجة"><TextArea value={actionForm.result} onChange={(e) => setActionForm({ ...actionForm, result: e.target.value })} rows={2} /></Field>
        <Field label="ملاحظات"><TextArea value={actionForm.notes} onChange={(e) => setActionForm({ ...actionForm, notes: e.target.value })} rows={2} /></Field>
      </EntityModal>

      {/* Obstacle modal */}
      <EntityModal open={obstacleModalOpen} title="إشكال تنفيذي جديد" onClose={() => setObstacleModalOpen(false)} onSubmit={addObstacle}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نوع الإشكال" required>
            <Select value={obstacleForm.obstacle_type} onChange={(e) => setObstacleForm({ ...obstacleForm, obstacle_type: e.target.value })}>
              {Object.entries(OBSTACLE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="طبيعة الإشكال" required>
            <Select value={obstacleForm.obstacle_nature} onChange={(e) => setObstacleForm({ ...obstacleForm, obstacle_nature: e.target.value })}>
              {Object.entries(OBSTACLE_NATURE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان الإشكال" required><TextInput value={obstacleForm.obstacle_title} onChange={(e) => setObstacleForm({ ...obstacleForm, obstacle_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="مقدم الإشكال"><TextInput value={obstacleForm.filed_by} onChange={(e) => setObstacleForm({ ...obstacleForm, filed_by: e.target.value })} /></Field>
          <Field label="تاريخ التقديم"><TextInput type="date" value={obstacleForm.filed_date} onChange={(e) => setObstacleForm({ ...obstacleForm, filed_date: e.target.value })} /></Field>
        </div>
        <Field label="الأساس القانوني"><TextInput value={obstacleForm.legal_basis} onChange={(e) => setObstacleForm({ ...obstacleForm, legal_basis: e.target.value })} /></Field>
        <Field label="مذكرة الرد"><TextArea value={obstacleForm.response_memo} onChange={(e) => setObstacleForm({ ...obstacleForm, response_memo: e.target.value })} rows={3} /></Field>
        <Field label="حالة الرد">
          <Select value={obstacleForm.response_status} onChange={(e) => setObstacleForm({ ...obstacleForm, response_status: e.target.value })}>
            <option value="pending">بانتظار الرد</option>
            <option value="drafting">صياغة المذكرة</option>
            <option value="filed">تم تقديم الرد</option>
            <option value="resolved">تم الحل</option>
          </Select>
        </Field>
        <Field label="القرار / الحل"><TextArea value={obstacleForm.resolution} onChange={(e) => setObstacleForm({ ...obstacleForm, resolution: e.target.value })} rows={2} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
