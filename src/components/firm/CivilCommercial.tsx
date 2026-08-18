import { useEffect, useState, useCallback } from 'react';
import {
  Gavel, Loader2, Plus, Pencil, Trash2, ChevronRight, X, FileText,
  Users, Calendar, DollarSign, Lock, Shield, CircuitBoard, Zap,
  CheckCircle2, Clock, AlertTriangle, ArrowRight, Search, Filter,
  Building2, Scale, Archive, Send, Eye, Activity, Sparkles,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M01Case, M01CaseParty, M01ProceduralDeadline, M01CaseTask, M01AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'cases' | 'deadlines' | 'tasks' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  ingestion: { label: 'الإدخال', bg: 'bg-blue-50', text: 'text-blue-700', icon: 'FileText' },
  processing: { label: 'المعالجة والتحليل', bg: 'bg-purple-50', text: 'text-purple-700', icon: 'Sparkles' },
  procedural: { label: 'الضبط الإجرائي', bg: 'bg-amber-50', text: 'text-amber-700', icon: 'Calendar' },
  execution: { label: 'التنفيذ والربط المالي', bg: 'bg-orange-50', text: 'text-orange-700', icon: 'DollarSign' },
  archiving: { label: 'الأرشفة السيادية', bg: 'bg-green-50', text: 'text-green-700', icon: 'Archive' },
};

const CASE_TYPE_LABELS: Record<string, string> = {
  civil: 'مدني',
  commercial: 'تجاري',
  mixed: 'مختلط',
};

const DISPUTE_TYPE_LABELS: Record<string, string> = {
  contract_dispute: 'منازعة تعاقدية',
  financial_claim: 'مطالبة مالية',
  tort_liability: 'مسؤولية تقصيرية',
  lease_dispute: 'منازعة إيجار',
  property_dispute: 'نزاع عقاري',
  debt_collection: 'تحصيل ديون',
  damages: 'تعويضات',
};

const PARTY_TYPE_LABELS: Record<string, string> = {
  plaintiff: 'المدعي',
  defendant: 'المدعى عليه',
  witness: 'شاهد',
  expert: 'خبير',
  third_party: 'طرف ثالث',
  appellant: 'مستأنف',
  appellee: 'مستأنف عليه',
};

const DEADLINE_TYPE_LABELS: Record<string, string> = {
  hearing: 'جلسة',
  memo_submission: 'تقديم مذكرة',
  appeal: 'طعن / استئناف',
  evidence_submission: 'تقديم مستندات',
  execution: 'تنفيذ',
  notification: 'إخطار',
};

const TASK_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'بانتظار', bg: 'bg-gray-100', text: 'text-gray-600' },
  in_progress: { label: 'قيد التنفيذ', bg: 'bg-blue-50', text: 'text-blue-600' },
  completed: { label: 'مكتمل', bg: 'bg-green-50', text: 'text-green-600' },
  cancelled: { label: 'ملغي', bg: 'bg-red-50', text: 'text-red-600' },
};

const TASK_PRIORITY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  low: { label: 'منخفضة', bg: 'bg-gray-100', text: 'text-gray-600' },
  normal: { label: 'عادية', bg: 'bg-blue-50', text: 'text-blue-600' },
  high: { label: 'عالية', bg: 'bg-orange-50', text: 'text-orange-600' },
  urgent: { label: 'عاجلة', bg: 'bg-red-50', text: 'text-red-600' },
};

const STAGES = ['ingestion', 'processing', 'procedural', 'execution', 'archiving'];

interface CaseForm {
  case_number: string;
  case_title: string;
  case_type: string;
  dispute_type: string;
  stage: string;
  court: string;
  court_circuit: string;
  filing_date: string;
  next_hearing_date: string;
  financial_value: string;
  fees_paid: string;
  bail_amount: string;
  assigned_attorney_id: string;
  description: string;
}

const emptyForm: CaseForm = {
  case_number: '', case_title: '', case_type: 'civil', dispute_type: 'contract_dispute',
  stage: 'ingestion', court: '', court_circuit: '', filing_date: '', next_hearing_date: '',
  financial_value: '0', fees_paid: '0', bail_amount: '0', assigned_attorney_id: '', description: '',
};

export default function CivilCommercial({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [cases, setCases] = useState<M01Case[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('cases');
  const [selectedCase, setSelectedCase] = useState<M01Case | null>(null);
  const [parties, setParties] = useState<M01CaseParty[]>([]);
  const [deadlines, setDeadlines] = useState<M01ProceduralDeadline[]>([]);
  const [tasks, setTasks] = useState<M01CaseTask[]>([]);
  const [auditLogs, setAuditLogs] = useState<M01AuditLog[]>([]);
  const [allDeadlines, setAllDeadlines] = useState<M01ProceduralDeadline[]>([]);
  const [allTasks, setAllTasks] = useState<M01CaseTask[]>([]);
  const [allAudit, setAllAudit] = useState<M01AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CaseForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'case' | 'party' | 'deadline' | 'task'>('case');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState('all');
  const [partyModalOpen, setPartyModalOpen] = useState(false);
  const [partyForm, setPartyForm] = useState({ party_type: 'plaintiff', name: '', role: '', contact_info: '', legal_representation: '' });
  const [deadlineModalOpen, setDeadlineModalOpen] = useState(false);
  const [deadlineForm, setDeadlineForm] = useState({ deadline_type: 'hearing', deadline_label: '', deadline_date: '', trigger_event: '' });
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({ task_title: '', task_description: '', assigned_to: '', priority: 'normal' });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [caseRes, attRes, dlRes, taskRes, auditRes] = await Promise.all([
      supabase.from('m01_cases')
        .select('*, attorney:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m01_procedural_deadlines').select('*').order('deadline_date', { ascending: true }),
      supabase.from('m01_case_tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('m01_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setCases((caseRes.data as M01Case[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllDeadlines((dlRes.data as M01ProceduralDeadline[]) || []);
    setAllTasks((taskRes.data as M01CaseTask[]) || []);
    setAllAudit((auditRes.data as M01AuditLog[]) || []);
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
    await supabase.from('m01_audit_logs').insert({
      case_id: caseId, action, actor: 'النظام', actor_role: 'النظام', detail,
    });
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (c: M01Case) => {
    setForm({
      case_number: c.case_number, case_title: c.case_title, case_type: c.case_type,
      dispute_type: c.dispute_type || 'contract_dispute', stage: c.stage, court: c.court || '',
      court_circuit: c.court_circuit || '', filing_date: c.filing_date || '',
      next_hearing_date: c.next_hearing_date || '', financial_value: String(c.financial_value || 0),
      fees_paid: String(c.fees_paid || 0), bail_amount: String(c.bail_amount || 0),
      assigned_attorney_id: c.assigned_attorney_id || '', description: c.description || '',
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
      case_type: form.case_type,
      dispute_type: form.dispute_type,
      stage: form.stage,
      court: form.court.trim() || null,
      court_circuit: form.court_circuit.trim() || null,
      filing_date: form.filing_date || null,
      next_hearing_date: form.next_hearing_date || null,
      financial_value: Number(form.financial_value) || 0,
      fees_paid: Number(form.fees_paid) || 0,
      bail_amount: Number(form.bail_amount) || 0,
      assigned_attorney_id: form.assigned_attorney_id || null,
      description: form.description.trim() || null,
    };
    if (editingId) {
      await supabase.from('m01_cases').update(payload).eq('id', editingId);
      await logAudit(editingId, 'case_updated', 'تحديث بيانات القضية');
    } else {
      const { data } = await supabase.from('m01_cases').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'case_created', 'إنشاء ملف قضية جديد — توليد UUID');
        await supabase.from('m01_cases').update({
          m10_linked: true,
          m54_cost_center_opened: true,
          cost_center_id: `CC-M01-${Date.now().toString().slice(-6)}`,
        }).eq('id', newId);
        await logAudit(newId, 'm10_linked', 'ربط الملف بنواة القضية الذكية (M10)');
        await logAudit(newId, 'm54_cost_center', 'فتح مركز تكلفة مالي في المحرك المالي (M54) — نموذج Hale & Dorr');
        if (form.next_hearing_date) {
          await supabase.from('m01_procedural_deadlines').insert({
            case_id: newId, deadline_type: 'hearing', deadline_label: 'جلسة المرافعة الأولى',
            deadline_date: form.next_hearing_date, auto_inserted: true, status: 'upcoming',
          });
          await logAudit(newId, 'deadlines_calculated', 'حساب الموعد الإجرائي آلياً — جلسة المرافعة الأولى');
        }
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (deleteType === 'case') await supabase.from('m01_cases').delete().eq('id', deleteId);
    else if (deleteType === 'party') await supabase.from('m01_case_parties').delete().eq('id', deleteId);
    else if (deleteType === 'deadline') await supabase.from('m01_procedural_deadlines').delete().eq('id', deleteId);
    else if (deleteType === 'task') await supabase.from('m01_case_tasks').delete().eq('id', deleteId);
    setDeleteId(null);
    if (deleteType === 'case') setSelectedCase(null);
    fetchAll();
    if (selectedCase && deleteType !== 'case') openCaseDetail(selectedCase);
  };

  const openCaseDetail = async (c: M01Case) => {
    setSelectedCase(c);
    setDetailLoading(true);
    const [pRes, dlRes, tRes, aRes] = await Promise.all([
      supabase.from('m01_case_parties').select('*').eq('case_id', c.id).order('created_at', { ascending: true }),
      supabase.from('m01_procedural_deadlines').select('*').eq('case_id', c.id).order('deadline_date', { ascending: true }),
      supabase.from('m01_case_tasks').select('*').eq('case_id', c.id).order('created_at', { ascending: false }),
      supabase.from('m01_audit_logs').select('*').eq('case_id', c.id).order('created_at', { ascending: true }),
    ]);
    setParties((pRes.data as M01CaseParty[]) || []);
    setDeadlines((dlRes.data as M01ProceduralDeadline[]) || []);
    setTasks((tRes.data as M01CaseTask[]) || []);
    setAuditLogs((aRes.data as M01AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (c: M01Case) => {
    const currentIdx = STAGES.indexOf(c.stage);
    if (currentIdx < 0 || currentIdx >= STAGES.length - 1) return;
    const nextStage = STAGES[currentIdx + 1];
    const updates: Record<string, unknown> = { stage: nextStage };
    if (nextStage === 'archiving') {
      updates.m53_archived = true;
      await logAudit(c.id, 'm53_archived', 'أرشفة المستندات بتشفير AES-256 في محرك الأرشيف (M53)');
    }
    await supabase.from('m01_cases').update(updates).eq('id', c.id);
    await logAudit(c.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[nextStage]?.label || nextStage));
    fetchAll();
    const updated = { ...c, stage: nextStage, ...(nextStage === 'archiving' ? { m53_archived: true } : {}) };
    setSelectedCase(updated as M01Case);
  };

  const addParty = async () => {
    if (!selectedCase || !partyForm.name.trim()) return;
    await supabase.from('m01_case_parties').insert({
      case_id: selectedCase.id,
      party_type: partyForm.party_type,
      name: partyForm.name.trim(),
      role: partyForm.role.trim() || null,
      contact_info: partyForm.contact_info.trim() || null,
      legal_representation: partyForm.legal_representation.trim() || null,
    });
    await logAudit(selectedCase.id, 'party_added', 'إضافة طرف: ' + partyForm.name);
    setPartyForm({ party_type: 'plaintiff', name: '', role: '', contact_info: '', legal_representation: '' });
    setPartyModalOpen(false);
    openCaseDetail(selectedCase);
  };

  const addDeadline = async () => {
    if (!selectedCase || !deadlineForm.deadline_label.trim() || !deadlineForm.deadline_date) return;
    await supabase.from('m01_procedural_deadlines').insert({
      case_id: selectedCase.id,
      deadline_type: deadlineForm.deadline_type,
      deadline_label: deadlineForm.deadline_label.trim(),
      deadline_date: deadlineForm.deadline_date,
      trigger_event: deadlineForm.trigger_event.trim() || null,
      auto_inserted: false,
      status: 'upcoming',
    });
    await logAudit(selectedCase.id, 'deadline_added', 'إضافة موعد إجرائي: ' + deadlineForm.deadline_label);
    setDeadlineForm({ deadline_type: 'hearing', deadline_label: '', deadline_date: '', trigger_event: '' });
    setDeadlineModalOpen(false);
    openCaseDetail(selectedCase);
  };

  const addTask = async () => {
    if (!selectedCase || !taskForm.task_title.trim()) return;
    await supabase.from('m01_case_tasks').insert({
      case_id: selectedCase.id,
      task_title: taskForm.task_title.trim(),
      task_description: taskForm.task_description.trim() || null,
      assigned_to: taskForm.assigned_to.trim() || null,
      priority: taskForm.priority,
      status: 'pending',
      m51_synced: false,
    });
    await logAudit(selectedCase.id, 'task_created', 'إنشاء مهمة: ' + taskForm.task_title);
    setTaskForm({ task_title: '', task_description: '', assigned_to: '', priority: 'normal' });
    setTaskModalOpen(false);
    openCaseDetail(selectedCase);
  };

  const syncTaskToM51 = async (t: M01CaseTask) => {
    await supabase.from('m01_case_tasks').update({ m51_synced: true }).eq('id', t.id);
    if (selectedCase) await logAudit(selectedCase.id, 'task_m51_synced', 'مزامنة المهمة مع محرك المهام (M51) — إشعارات WebSockets');
    if (selectedCase) openCaseDetail(selectedCase);
  };

  const completeDeadline = async (d: M01ProceduralDeadline) => {
    await supabase.from('m01_procedural_deadlines').update({
      status: 'completed', completed_at: new Date().toISOString(),
    }).eq('id', d.id);
    if (selectedCase) await logAudit(selectedCase.id, 'deadline_completed', 'إتمام الموعد الإجرائي: ' + d.deadline_label);
    if (selectedCase) openCaseDetail(selectedCase);
  };

  const filteredCases = cases.filter((c) => {
    if (filterStage !== 'all' && c.stage !== filterStage) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.case_number.toLowerCase().includes(q) && !c.case_title.toLowerCase().includes(q) && !(c.court || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeCases = cases.filter((c) => !c.is_final).length;
  const finalCases = cases.filter((c) => c.is_final).length;
  const totalValue = cases.reduce((s, c) => s + (c.financial_value || 0), 0);
  const upcomingDlCount = allDeadlines.filter((d) => d.status === 'upcoming').length;
  const pendingTasks = allTasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length;

  const tabs: { id: Tab; label: string; icon: typeof Gavel; badge?: number }[] = [
    { id: 'cases', label: 'القضايا', icon: Gavel, badge: activeCases },
    { id: 'deadlines', label: 'المواعيد الإجرائية', icon: Calendar, badge: upcomingDlCount },
    { id: 'tasks', label: 'مهام القضايا', icon: CheckCircle2, badge: pendingTasks },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
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
            <h2 className="font-heading font-bold text-midnight text-lg">محرك القضاء المدني والتجاري (M1)</h2>
            <p className="font-body text-[10px] text-ink/40">القطاع القضائي والإجرائي — الخط الدفاعي الأول للمؤسسة</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Lock size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">RBAC · Audit Log</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> قضية جديدة
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={<Gavel size={14} className="text-midnight" />} label="إجمالي القضايا" value={String(cases.length)} valueClass="text-midnight" />
        <StatCard icon={<Activity size={14} className="text-blue-600" />} label="قضايا نشطة" value={String(activeCases)} valueClass="text-blue-700" />
        <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="أحكام نهائية" value={String(finalCases)} valueClass="text-green-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="القيمة الإجمالية" value={formatCurrency(totalValue)} valueClass="text-gold" />
        <StatCard icon={<Calendar size={14} className="text-amber-600" />} label="مواعيد قادمة" value={String(upcomingDlCount)} valueClass="text-amber-700" />
      </div>

      {/* 5-stage workflow visualization */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة النزاع — 5 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.ingestion;
            const count = cases.filter((c) => c.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[120px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                  </div>
                  <span className="font-body text-[9px] text-cream/40">{count} قضية</span>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { icon: FileText, label: 'محرر المستندات السيادي', desc: 'توليد صحف الدعاوى والمذكرات', color: 'text-blue-600' },
            { icon: CheckCircle2, label: 'محرك المهام (M51)', desc: 'بطاقات مهام + إشعارات WebSockets', color: 'text-green-600' },
            { icon: Send, label: 'البريد السيادي (M52)', desc: 'إنذارات رسمية + تأكيد قراءة', color: 'text-amber-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'مركز تكلفة + نموذج Hale & Dorr', color: 'text-gold' },
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
          <Select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل المراحل</option>
            {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم أو عنوان القضية..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Cases tab */}
      {activeTab === 'cases' && (
        <div className="space-y-2">
          {filteredCases.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Gavel size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد قضايا</p>
            </div>
          ) : (
            filteredCases.map((c) => {
              const sCfg = STAGE_CONFIG[c.stage] || STAGE_CONFIG.ingestion;
              const stageIdx = STAGES.indexOf(c.stage);
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
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{CASE_TYPE_LABELS[c.case_type] || c.case_type}</span>
                          {c.is_final && <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600">حكم نهائي</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{c.case_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {c.court && <span className="font-body text-[9px] text-ink/40"><Building2 size={9} className="inline ml-0.5" />{c.court}</span>}
                          {c.dispute_type && <span className="font-body text-[9px] text-ink/40">{DISPUTE_TYPE_LABELS[c.dispute_type] || c.dispute_type}</span>}
                          {c.financial_value > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(c.financial_value)}</span>}
                          {c.next_hearing_date && <span className="flex items-center gap-0.5 font-body text-[9px] text-amber-600"><Calendar size={9} /> {formatDate(c.next_hearing_date)}</span>}
                          {c.m10_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Sparkles size={8} /> M10</span>}
                          {c.m54_cost_center_opened && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {c.m53_archived && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/40"><Archive size={8} /> M53</span>}
                          {c.attorney && <span className="font-body text-[9px] text-ink/40">المحامي: {c.attorney.name}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Stage progress dots */}
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

      {/* All deadlines tab */}
      {activeTab === 'deadlines' && (
        <div className="space-y-2">
          {allDeadlines.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><Calendar size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد مواعيد إجرائية</p></div>
          ) : (
            allDeadlines.map((d) => {
              const daysLeft = Math.ceil((new Date(d.deadline_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              const isUrgent = daysLeft <= 7 && daysLeft >= 0;
              const isNear = daysLeft <= 30 && daysLeft > 7;
              const c = cases.find((c) => c.id === d.case_id);
              return (
                <div key={d.id} className={`bg-white rounded-xl border shadow-sm p-4 hover:border-gold/30 transition-colors ${isUrgent ? 'border-red-200' : isNear ? 'border-amber-200' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${d.status === 'completed' ? 'bg-green-50' : isUrgent ? 'bg-red-50' : isNear ? 'bg-amber-50' : 'bg-blue-50'}`}>
                        <Calendar size={14} className={d.status === 'completed' ? 'text-green-600' : isUrgent ? 'text-red-600' : isNear ? 'text-amber-600' : 'text-blue-600'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-xs font-bold text-midnight">{d.deadline_label}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{DEADLINE_TYPE_LABELS[d.deadline_type] || d.deadline_type}</span>
                          {c && <span className="font-body text-[9px] text-gold">{c.case_number}</span>}
                          {d.status === 'completed' ? (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> مكتمل</span>
                          ) : (
                            <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${isUrgent ? 'bg-red-50 text-red-600' : isNear ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                              <Clock size={9} /> {daysLeft > 0 ? daysLeft + ' يوم' : 'متأخر'}
                            </span>
                          )}
                          {d.auto_inserted && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Zap size={8} /> آلي</span>}
                          {d.trigger_event && <span className="font-body text-[9px] text-ink/40">{d.trigger_event}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* All tasks tab */}
      {activeTab === 'tasks' && (
        <div className="space-y-2">
          {allTasks.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><CheckCircle2 size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد مهام</p></div>
          ) : (
            allTasks.map((t) => {
              const sCfg = TASK_STATUS_CONFIG[t.status] || TASK_STATUS_CONFIG.pending;
              const pCfg = TASK_PRIORITY_CONFIG[t.priority] || TASK_PRIORITY_CONFIG.normal;
              const c = cases.find((c) => c.id === t.case_id);
              return (
                <div key={t.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <CheckCircle2 size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-xs font-bold text-midnight">{t.task_title}</p>
                        {t.task_description && <p className="font-body text-[10px] text-ink/50 mt-0.5 line-clamp-2">{t.task_description}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body ${pCfg.bg} ${pCfg.text}`}>{pCfg.label}</span>
                          {c && <span className="font-body text-[9px] text-gold">{c.case_number}</span>}
                          {t.assigned_to && <span className="font-body text-[9px] text-ink/40">المسؤول: {t.assigned_to}</span>}
                          {t.m51_synced ? <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> M51</span>
                            : <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600">غير مزامن</span>}
                        </div>
                      </div>
                    </div>
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
            <span className="font-heading font-bold text-midnight text-sm">سجل التدقيق غير القابل للتعديل</span>
            <span className="font-body text-[10px] text-ink/30">— {allAudit.length} عملية مسجلة</span>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {allAudit.map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {log.action.includes('created') ? <FileText size={12} className="text-blue-600" />
                      : log.action.includes('m10') ? <Sparkles size={12} className="text-purple-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m53') ? <Archive size={12} className="text-gray-500" />
                      : log.action.includes('deadline') ? <Calendar size={12} className="text-amber-600" />
                      : log.action.includes('party') ? <Users size={12} className="text-blue-600" />
                      : log.action.includes('task') ? <CheckCircle2 size={12} className="text-green-600" />
                      : <Activity size={12} className="text-ink/40" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-body text-[10px] font-bold text-midnight">{log.action}</span>
                      {log.actor && <span className="font-body text-[9px] text-ink/40">{log.actor}</span>}
                    </div>
                    {log.detail && <p className="font-body text-[10px] text-ink/50 leading-relaxed mt-0.5">{log.detail}</p>}
                    <span className="font-body text-[9px] text-ink/30">{new Date(log.created_at).toLocaleString('ar-EG')}</span>
                  </div>
                  <Lock size={10} className="text-green-500 flex-shrink-0 mt-1" />
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
                <span className="font-heading font-bold text-midnight text-sm">ملف القضية</span>
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
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedCase.stage] || STAGE_CONFIG.ingestion).bg} ${(STAGE_CONFIG[selectedCase.stage] || STAGE_CONFIG.ingestion).text}`}>
                      {(STAGE_CONFIG[selectedCase.stage] || STAGE_CONFIG.ingestion).label}
                    </span>
                    {selectedCase.is_final && <span className="px-2 py-0.5 rounded text-[10px] font-body bg-green-50 text-green-600">حكم نهائي</span>}
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedCase.case_title}</h3>
                </div>

                {/* Stage progress bar */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.ingestion;
                      const stageIdx = STAGES.indexOf(selectedCase.stage);
                      const isActive = i === stageIdx;
                      const isPast = i < stageIdx;
                      return (
                        <div key={s} className="flex-1">
                          <div className={`h-1.5 rounded-full ${isPast ? 'bg-gold' : isActive ? 'bg-gold' : 'bg-gray-200'} ${isActive ? 'animate-pulse' : ''}`} />
                          <p className={`font-body text-[8px] mt-1 text-center ${isActive ? 'text-gold font-bold' : 'text-ink/30'}`}>{cfg.label}</p>
                        </div>
                      );
                    })}
                  </div>
                  {selectedCase.stage !== 'archiving' && (
                    <button onClick={() => advanceStage(selectedCase)} className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
                      <ArrowRight size={12} /> الانتقال للمرحلة التالية
                    </button>
                  )}
                </div>

                {/* Case info grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <span className="font-body text-[9px] text-ink/40">النوع</span>
                    <p className="font-body text-xs font-bold text-midnight">{CASE_TYPE_LABELS[selectedCase.case_type] || selectedCase.case_type}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <span className="font-body text-[9px] text-ink/40">نوع النزاع</span>
                    <p className="font-body text-xs font-bold text-midnight">{DISPUTE_TYPE_LABELS[selectedCase.dispute_type || ''] || selectedCase.dispute_type}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <span className="font-body text-[9px] text-ink/40">المحكمة</span>
                    <p className="font-body text-xs font-bold text-midnight">{selectedCase.court || '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <span className="font-body text-[9px] text-ink/40">الدائرة</span>
                    <p className="font-body text-xs font-bold text-midnight">{selectedCase.court_circuit || '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <span className="font-body text-[9px] text-ink/40">تاريخ القيد</span>
                    <p className="font-body text-xs font-bold text-midnight">{selectedCase.filing_date ? formatDate(selectedCase.filing_date) : '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <span className="font-body text-[9px] text-ink/40">الجلسة القادمة</span>
                    <p className="font-body text-xs font-bold text-amber-600">{selectedCase.next_hearing_date ? formatDate(selectedCase.next_hearing_date) : '—'}</p>
                  </div>
                </div>

                {/* Financial summary */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <DollarSign size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">الملخص المالي — مركز التكلفة: {selectedCase.cost_center_id || '—'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">القيمة</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedCase.financial_value)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الرسوم</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedCase.fees_paid)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الكفالة</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedCase.bail_amount)}</p></div>
                  </div>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m10_linked ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}>
                    <Sparkles size={10} /> M10 {selectedCase.m10_linked ? 'مرتبط' : 'غير مرتبط'}
                  </span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m54_cost_center_opened ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}>
                    <DollarSign size={10} /> M54 {selectedCase.m54_cost_center_opened ? 'مفتوح' : 'غير مفتوح'}
                  </span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m53_archived ? 'bg-gray-100 text-ink/50' : 'bg-gray-100 text-ink/30'}`}>
                    <Archive size={10} /> M53 {selectedCase.m53_archived ? 'مؤرشف' : 'غير مؤرشف'}
                  </span>
                </div>

                {selectedCase.description && (
                  <div>
                    <p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p>
                    <p className="font-body text-xs text-ink/70 leading-relaxed">{selectedCase.description}</p>
                  </div>
                )}

                {/* Parties */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Users size={12} className="text-gold" />
                      <span className="font-body text-[10px] font-bold text-midnight">الأطراف</span>
                    </div>
                    <button onClick={() => setPartyModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors">
                      <Plus size={10} /> إضافة طرف
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {parties.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/party">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${p.party_type === 'plaintiff' || p.party_type === 'appellant' ? 'bg-blue-50 text-blue-600' : p.party_type === 'defendant' || p.party_type === 'appellee' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-ink/50'}`}>
                          {PARTY_TYPE_LABELS[p.party_type] || p.party_type}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-[10px] font-bold text-midnight">{p.name}</p>
                          {p.role && <p className="font-body text-[9px] text-ink/40">{p.role}</p>}
                        </div>
                        <button onClick={() => { setDeleteId(p.id); setDeleteType('party'); }} className="p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/party:opacity-100 transition-all"><Trash2 size={10} /></button>
                      </div>
                    ))}
                    {parties.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد أطراف مسجلة</p>}
                  </div>
                </div>

                {/* Procedural deadlines */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-gold" />
                      <span className="font-body text-[10px] font-bold text-midnight">المواعيد الإجرائية</span>
                    </div>
                    <button onClick={() => setDeadlineModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors">
                      <Plus size={10} /> إضافة موعد
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {deadlines.map((d) => {
                      const daysLeft = Math.ceil((new Date(d.deadline_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      return (
                        <div key={d.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/dl">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-200 text-ink/50">{DEADLINE_TYPE_LABELS[d.deadline_type] || d.deadline_type}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-body text-[10px] font-bold text-midnight">{d.deadline_label}</p>
                            <span className="font-body text-[9px] text-ink/40">{formatDate(d.deadline_date)} — {daysLeft > 0 ? daysLeft + ' يوم متبقي' : 'متأخر'}</span>
                          </div>
                          {d.status !== 'completed' && (
                            <button onClick={() => completeDeadline(d)} className="p-1 rounded text-green-500 hover:bg-green-50 transition-colors" title="إتمام"><CheckCircle2 size={11} /></button>
                          )}
                          <button onClick={() => { setDeleteId(d.id); setDeleteType('deadline'); }} className="p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/dl:opacity-100 transition-all"><Trash2 size={10} /></button>
                        </div>
                      );
                    })}
                    {deadlines.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد مواعيد مسجلة</p>}
                  </div>
                </div>

                {/* Tasks */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={12} className="text-gold" />
                      <span className="font-body text-[10px] font-bold text-midnight">مهام القضية</span>
                    </div>
                    <button onClick={() => setTaskModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors">
                      <Plus size={10} /> إضافة مهمة
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {tasks.map((t) => {
                      const sCfg = TASK_STATUS_CONFIG[t.status] || TASK_STATUS_CONFIG.pending;
                      return (
                        <div key={t.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/task">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-body text-[10px] font-bold text-midnight">{t.task_title}</p>
                            {t.assigned_to && <span className="font-body text-[9px] text-ink/40">{t.assigned_to}</span>}
                          </div>
                          {!t.m51_synced && t.status !== 'completed' && (
                            <button onClick={() => syncTaskToM51(t)} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-green-50 text-green-600 font-body text-[9px] font-bold hover:bg-green-100 transition-colors" title="مزامنة مع M51">
                              <Zap size={9} /> M51
                            </button>
                          )}
                          <button onClick={() => { setDeleteId(t.id); setDeleteType('task'); }} className="p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/task:opacity-100 transition-all"><Trash2 size={10} /></button>
                        </div>
                      );
                    })}
                    {tasks.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد مهام مسجلة</p>}
                  </div>
                </div>

                {/* Audit trail for this case */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Shield size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">سجل التدقيق</span>
                  </div>
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
      <EntityModal open={modalOpen} title={editingId ? 'تعديل القضية' : 'قضية جديدة'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم القضية" required><TextInput value={form.case_number} onChange={(e) => setForm({ ...form, case_number: e.target.value })} placeholder="CIV-2025-001" /></Field>
          <Field label="نوع القضية">
            <Select value={form.case_type} onChange={(e) => setForm({ ...form, case_type: e.target.value })}>
              <option value="civil">مدني</option><option value="commercial">تجاري</option><option value="mixed">مختلط</option>
            </Select>
          </Field>
        </div>
        <Field label="عنوان القضية" required><TextInput value={form.case_title} onChange={(e) => setForm({ ...form, case_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نوع النزاع">
            <Select value={form.dispute_type} onChange={(e) => setForm({ ...form, dispute_type: e.target.value })}>
              {Object.entries(DISPUTE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="المحكمة"><TextInput value={form.court} onChange={(e) => setForm({ ...form, court: e.target.value })} /></Field>
        <Field label="الدائرة"><TextInput value={form.court_circuit} onChange={(e) => setForm({ ...form, court_circuit: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ القيد"><TextInput type="date" value={form.filing_date} onChange={(e) => setForm({ ...form, filing_date: e.target.value })} /></Field>
          <Field label="تاريخ الجلسة القادمة"><TextInput type="date" value={form.next_hearing_date} onChange={(e) => setForm({ ...form, next_hearing_date: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="القيمة المالية"><TextInput type="number" value={form.financial_value} onChange={(e) => setForm({ ...form, financial_value: e.target.value })} /></Field>
          <Field label="الرسوم المدفوعة"><TextInput type="number" value={form.fees_paid} onChange={(e) => setForm({ ...form, fees_paid: e.target.value })} /></Field>
          <Field label="الكفالة"><TextInput type="number" value={form.bail_amount} onChange={(e) => setForm({ ...form, bail_amount: e.target.value })} /></Field>
        </div>
        <Field label="المحامي المسؤول">
          <Select value={form.assigned_attorney_id} onChange={(e) => setForm({ ...form, assigned_attorney_id: e.target.value })}>
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
        <Field label="معلومات الاتصال"><TextInput value={partyForm.contact_info} onChange={(e) => setPartyForm({ ...partyForm, contact_info: e.target.value })} /></Field>
        <Field label="التمثيل القانوني"><TextInput value={partyForm.legal_representation} onChange={(e) => setPartyForm({ ...partyForm, legal_representation: e.target.value })} /></Field>
      </EntityModal>

      {/* Deadline modal */}
      <EntityModal open={deadlineModalOpen} title="إضافة موعد إجرائي" onClose={() => setDeadlineModalOpen(false)} onSubmit={addDeadline}>
        <Field label="نوع الموعد" required>
          <Select value={deadlineForm.deadline_type} onChange={(e) => setDeadlineForm({ ...deadlineForm, deadline_type: e.target.value })}>
            {Object.entries(DEADLINE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="الوصف" required><TextInput value={deadlineForm.deadline_label} onChange={(e) => setDeadlineForm({ ...deadlineForm, deadline_label: e.target.value })} /></Field>
        <Field label="التاريخ" required><TextInput type="date" value={deadlineForm.deadline_date} onChange={(e) => setDeadlineForm({ ...deadlineForm, deadline_date: e.target.value })} /></Field>
        <Field label="الحدث المُطلق"><TextInput value={deadlineForm.trigger_event} onChange={(e) => setDeadlineForm({ ...deadlineForm, trigger_event: e.target.value })} /></Field>
      </EntityModal>

      {/* Task modal */}
      <EntityModal open={taskModalOpen} title="إضافة مهمة" onClose={() => setTaskModalOpen(false)} onSubmit={addTask}>
        <Field label="عنوان المهمة" required><TextInput value={taskForm.task_title} onChange={(e) => setTaskForm({ ...taskForm, task_title: e.target.value })} /></Field>
        <Field label="الوصف"><TextArea value={taskForm.task_description} onChange={(e) => setTaskForm({ ...taskForm, task_description: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المسؤول"><TextInput value={taskForm.assigned_to} onChange={(e) => setTaskForm({ ...taskForm, assigned_to: e.target.value })} /></Field>
          <Field label="الأولوية">
            <Select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
              <option value="low">منخفضة</option><option value="normal">عادية</option>
              <option value="high">عالية</option><option value="urgent">عاجلة</option>
            </Select>
          </Field>
        </div>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
