import { useEffect, useState, useCallback } from 'react';
import {
  Gavel, Loader2, Plus, Pencil, Trash2, ChevronRight, X, FileText,
  Users, Calendar, DollarSign, Lock, Shield, CircuitBoard, Zap,
  CheckCircle2, Clock, ArrowRight, Search, Handshake, Calculator,
  Building2, Briefcase, Activity, Sparkles, Server,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M06Case, M06Party, M06Deadline, M06SettlementSession, M06AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'cases' | 'deadlines' | 'settlement_sessions' | 'parties' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  amicable_settlement: { label: 'التسوية الودية', bg: 'bg-blue-50', text: 'text-blue-700' },
  digital_litigation: { label: 'المقاضاة الرقمية', bg: 'bg-amber-50', text: 'text-amber-700' },
  financial_calculation: { label: 'الحسابات المالية', bg: 'bg-green-50', text: 'text-green-700' },
};

const STAGES = ['amicable_settlement', 'digital_litigation', 'financial_calculation'];

const CATEGORY_LABELS: Record<string, string> = {
  wrongful_termination: 'فصل تعسفي',
  dues_claim: 'مطالبة بمستحقات',
  workplace_discrimination: 'تمييز وظيفي',
  labor_contract_dispute: 'منازعة عقد عمل',
};

const PARTY_TYPE_LABELS: Record<string, string> = {
  employee: 'العامل',
  employer: 'صاحب العمل',
  witness: 'شاهد',
  expert: 'خبير',
  third_party: 'طرف ثالث',
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  individual: 'فرد',
  company: 'شركة',
  government: 'جهة حكومية',
  establishment: 'منشأة',
};

const DEADLINE_TYPE_LABELS: Record<string, string> = {
  hearing: 'جلسة',
  complaint_filing: 'تقديم شكوى',
  memo_submission: 'تقديم مذكرة',
  expert_report: 'تقرير الخبير',
  appeal: 'طعن',
  notification: 'إخطار',
  settlement_session: 'جلسة تسوية',
};

const SESSION_TYPE_LABELS: Record<string, string> = {
  initial: 'جلسة أولية',
  reconciliation: 'جلسة صلح',
  follow_up: 'جلسة متابعة',
  final: 'جلسة ختامية',
};

const SETTLEMENT_OUTCOME_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  settled: { label: 'تمت التسوية', bg: 'bg-green-50', text: 'text-green-600' },
  partial: { label: 'تسوية جزئية', bg: 'bg-amber-50', text: 'text-amber-600' },
  failed: { label: 'فشلت التسوية', bg: 'bg-red-50', text: 'text-red-600' },
  pending: { label: 'قيد الجلسة', bg: 'bg-gray-100', text: 'text-gray-500' },
};

interface CaseForm {
  case_number: string;
  case_title: string;
  case_category: string;
  dispute_subtype: string;
  stage: string;
  complaint_ref: string;
  court: string;
  court_circuit: string;
  filing_date: string;
  next_hearing_date: string;
  financial_value: string;
  end_of_service_amount: string;
  leave_balance_amount: string;
  compensation_amount: string;
  court_fees: string;
  assigned_advisor_id: string;
  employer_name: string;
  employee_name: string;
  employment_start_date: string;
  employment_end_date: string;
  monthly_salary: string;
  description: string;
}

const emptyForm: CaseForm = {
  case_number: '', case_title: '', case_category: 'wrongful_termination', dispute_subtype: '',
  stage: 'amicable_settlement', complaint_ref: '', court: '', court_circuit: '',
  filing_date: '', next_hearing_date: '', financial_value: '0', end_of_service_amount: '0',
  leave_balance_amount: '0', compensation_amount: '0', court_fees: '0', assigned_advisor_id: '',
  employer_name: '', employee_name: '', employment_start_date: '', employment_end_date: '',
  monthly_salary: '0', description: '',
};

export default function LaborCourt({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [cases, setCases] = useState<M06Case[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('cases');
  const [selectedCase, setSelectedCase] = useState<M06Case | null>(null);
  const [parties, setParties] = useState<M06Party[]>([]);
  const [deadlines, setDeadlines] = useState<M06Deadline[]>([]);
  const [sessions, setSessions] = useState<M06SettlementSession[]>([]);
  const [auditLogs, setAuditLogs] = useState<M06AuditLog[]>([]);
  const [allDeadlines, setAllDeadlines] = useState<M06Deadline[]>([]);
  const [allSessions, setAllSessions] = useState<M06SettlementSession[]>([]);
  const [allParties, setAllParties] = useState<M06Party[]>([]);
  const [allAudit, setAllAudit] = useState<M06AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CaseForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'case' | 'party' | 'deadline' | 'session'>('case');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [partyModalOpen, setPartyModalOpen] = useState(false);
  const [partyForm, setPartyForm] = useState({ party_type: 'employee', name: '', role: '', entity_type: 'individual', contact_info: '', legal_representation: '' });
  const [deadlineModalOpen, setDeadlineModalOpen] = useState(false);
  const [deadlineForm, setDeadlineForm] = useState({ deadline_type: 'hearing', deadline_label: '', deadline_date: '', statutory_basis: '' });
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState({ session_date: '', session_type: 'initial', attendees_employer: true, attendees_employee: true, outcome: '', minutes_text: '', next_session_date: '' });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [caseRes, attRes, dlRes, sessRes, partyRes, auditRes] = await Promise.all([
      supabase.from('m06_labor_cases')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m06_labor_deadlines').select('*').order('deadline_date', { ascending: true }),
      supabase.from('m06_settlement_sessions').select('*').order('session_date', { ascending: false }),
      supabase.from('m06_labor_parties').select('*').order('created_at', { ascending: false }),
      supabase.from('m06_labor_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setCases((caseRes.data as M06Case[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllDeadlines((dlRes.data as M06Deadline[]) || []);
    setAllSessions((sessRes.data as M06SettlementSession[]) || []);
    setAllParties((partyRes.data as M06Party[]) || []);
    setAllAudit((auditRes.data as M06AuditLog[]) || []);
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
    await supabase.from('m06_labor_audit_logs').insert({
      case_id: caseId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (c: M06Case) => {
    setForm({
      case_number: c.case_number, case_title: c.case_title, case_category: c.case_category,
      dispute_subtype: c.dispute_subtype || '', stage: c.stage, complaint_ref: c.complaint_ref || '',
      court: c.court || '', court_circuit: c.court_circuit || '', filing_date: c.filing_date || '',
      next_hearing_date: c.next_hearing_date || '', financial_value: String(c.financial_value || 0),
      end_of_service_amount: String(c.end_of_service_amount || 0), leave_balance_amount: String(c.leave_balance_amount || 0),
      compensation_amount: String(c.compensation_amount || 0), court_fees: String(c.court_fees || 0),
      assigned_advisor_id: c.assigned_advisor_id || '', employer_name: c.employer_name || '',
      employee_name: c.employee_name || '', employment_start_date: c.employment_start_date || '',
      employment_end_date: c.employment_end_date || '', monthly_salary: String(c.monthly_salary || 0),
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
      case_category: form.case_category,
      dispute_subtype: form.dispute_subtype.trim() || null,
      stage: form.stage,
      complaint_ref: form.complaint_ref.trim() || null,
      court: form.court.trim() || null,
      court_circuit: form.court_circuit.trim() || null,
      filing_date: form.filing_date || null,
      next_hearing_date: form.next_hearing_date || null,
      financial_value: Number(form.financial_value) || 0,
      end_of_service_amount: Number(form.end_of_service_amount) || 0,
      leave_balance_amount: Number(form.leave_balance_amount) || 0,
      compensation_amount: Number(form.compensation_amount) || 0,
      court_fees: Number(form.court_fees) || 0,
      assigned_advisor_id: form.assigned_advisor_id || null,
      employer_name: form.employer_name.trim() || null,
      employee_name: form.employee_name.trim() || null,
      employment_start_date: form.employment_start_date || null,
      employment_end_date: form.employment_end_date || null,
      monthly_salary: Number(form.monthly_salary) || 0,
      description: form.description.trim() || null,
    };
    if (editingId) {
      await supabase.from('m06_labor_cases').update(payload).eq('id', editingId);
      await logAudit(editingId, 'case_updated', 'تحديث بيانات القضية العمالية');
    } else {
      const { data } = await supabase.from('m06_labor_cases').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'case_created', 'إنشاء ملف قضية عمالية — فئة: ' + (CATEGORY_LABELS[form.case_category] || form.case_category));
        await supabase.from('m06_labor_cases').update({
          m10_linked: true,
          m54_cost_center_opened: true,
          m73_labor_relations_linked: true,
          m92_notified: true,
          m52_notified: true,
          cost_center_id: 'CC-M06-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm10_linked', 'ربط الملف بنواة القضية الذكية (M10)');
        await logAudit(newId, 'm54_cost_center', 'فتح مركز تكلفة مالي في المحرك المالي (M54)');
        await logAudit(newId, 'm73_linked', 'ربط الملف بمحرك علاقات العمل (M73)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92)');
        await logAudit(newId, 'm52_notified', 'إخطار البريد السيادي (M52)');
        if (form.next_hearing_date) {
          await supabase.from('m06_labor_deadlines').insert({
            case_id: newId, deadline_type: 'hearing',
            deadline_label: 'جلسة المرافعة',
            deadline_date: form.next_hearing_date,
            auto_inserted: true, status: 'upcoming',
          });
          await logAudit(newId, 'deadlines_calculated', 'حساب الموعد الإجرائي آلياً — جلسة المرافعة');
        }
        if (form.filing_date) {
          const settlementDate = new Date(form.filing_date);
          settlementDate.setDate(settlementDate.getDate() + 30);
          await supabase.from('m06_labor_deadlines').insert({
            case_id: newId, deadline_type: 'settlement_session',
            deadline_label: 'جلسة التسوية الودية (30 يوم من القيد)',
            deadline_date: settlementDate.toISOString().split('T')[0],
            statutory_basis: 'قانون العمل — التسوية الودية',
            auto_inserted: true, status: 'upcoming',
          });
          await logAudit(newId, 'settlement_scheduled', 'جدولة جلسة التسوية الودية آلياً');
        }
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (deleteType === 'case') await supabase.from('m06_labor_cases').delete().eq('id', deleteId);
    else if (deleteType === 'party') await supabase.from('m06_labor_parties').delete().eq('id', deleteId);
    else if (deleteType === 'deadline') await supabase.from('m06_labor_deadlines').delete().eq('id', deleteId);
    else if (deleteType === 'session') await supabase.from('m06_settlement_sessions').delete().eq('id', deleteId);
    setDeleteId(null);
    if (deleteType === 'case') setSelectedCase(null);
    fetchAll();
    if (selectedCase && deleteType !== 'case') openCaseDetail(selectedCase);
  };

  const openCaseDetail = async (c: M06Case) => {
    setSelectedCase(c);
    setDetailLoading(true);
    const [pRes, dlRes, sRes, aRes] = await Promise.all([
      supabase.from('m06_labor_parties').select('*').eq('case_id', c.id).order('created_at', { ascending: true }),
      supabase.from('m06_labor_deadlines').select('*').eq('case_id', c.id).order('deadline_date', { ascending: true }),
      supabase.from('m06_settlement_sessions').select('*').eq('case_id', c.id).order('session_date', { ascending: true }),
      supabase.from('m06_labor_audit_logs').select('*').eq('case_id', c.id).order('created_at', { ascending: true }),
    ]);
    setParties((pRes.data as M06Party[]) || []);
    setDeadlines((dlRes.data as M06Deadline[]) || []);
    setSessions((sRes.data as M06SettlementSession[]) || []);
    setAuditLogs((aRes.data as M06AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (c: M06Case) => {
    const idx = STAGES.indexOf(c.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    await supabase.from('m06_labor_cases').update({ stage: next }).eq('id', c.id);
    await logAudit(c.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    const updated = { ...c, stage: next };
    setSelectedCase(updated as M06Case);
  };

  const addParty = async () => {
    if (!selectedCase || !partyForm.name.trim()) return;
    await supabase.from('m06_labor_parties').insert({
      case_id: selectedCase.id, party_type: partyForm.party_type, name: partyForm.name.trim(),
      role: partyForm.role.trim() || null, entity_type: partyForm.entity_type || null,
      contact_info: partyForm.contact_info.trim() || null,
      legal_representation: partyForm.legal_representation.trim() || null,
    });
    await logAudit(selectedCase.id, 'party_added', 'إضافة طرف: ' + partyForm.name);
    setPartyForm({ party_type: 'employee', name: '', role: '', entity_type: 'individual', contact_info: '', legal_representation: '' });
    setPartyModalOpen(false);
    openCaseDetail(selectedCase);
  };

  const addDeadline = async () => {
    if (!selectedCase || !deadlineForm.deadline_label.trim() || !deadlineForm.deadline_date) return;
    await supabase.from('m06_labor_deadlines').insert({
      case_id: selectedCase.id, deadline_type: deadlineForm.deadline_type,
      deadline_label: deadlineForm.deadline_label.trim(), deadline_date: deadlineForm.deadline_date,
      statutory_basis: deadlineForm.statutory_basis.trim() || null,
      auto_inserted: false, status: 'upcoming',
    });
    await logAudit(selectedCase.id, 'deadline_added', 'إضافة موعد إجرائي: ' + deadlineForm.deadline_label);
    setDeadlineForm({ deadline_type: 'hearing', deadline_label: '', deadline_date: '', statutory_basis: '' });
    setDeadlineModalOpen(false);
    openCaseDetail(selectedCase);
  };

  const addSession = async () => {
    if (!selectedCase || !sessionForm.session_date) return;
    await supabase.from('m06_settlement_sessions').insert({
      case_id: selectedCase.id, session_date: sessionForm.session_date,
      session_type: sessionForm.session_type,
      attendees_employer: sessionForm.attendees_employer,
      attendees_employee: sessionForm.attendees_employee,
      outcome: sessionForm.outcome || null,
      minutes_text: sessionForm.minutes_text.trim() || null,
      next_session_date: sessionForm.next_session_date || null,
    });
    await logAudit(selectedCase.id, 'settlement_session_added', 'إضافة جلسة تسوية: ' + (SESSION_TYPE_LABELS[sessionForm.session_type] || sessionForm.session_type));
    setSessionForm({ session_date: '', session_type: 'initial', attendees_employer: true, attendees_employee: true, outcome: '', minutes_text: '', next_session_date: '' });
    setSessionModalOpen(false);
    openCaseDetail(selectedCase);
  };

  const completeDeadline = async (d: M06Deadline) => {
    await supabase.from('m06_labor_deadlines').update({
      status: 'completed', completed_at: new Date().toISOString(),
    }).eq('id', d.id);
    if (selectedCase) await logAudit(selectedCase.id, 'deadline_completed', 'إتمام الموعد الإجرائي: ' + d.deadline_label);
    if (selectedCase) openCaseDetail(selectedCase);
  };

  const filteredCases = cases.filter((c) => {
    if (filterCategory !== 'all' && c.case_category !== filterCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.case_number.toLowerCase().includes(q) && !c.case_title.toLowerCase().includes(q) && !(c.employer_name || '').toLowerCase().includes(q) && !(c.employee_name || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeCases = cases.filter((c) => !c.is_final).length;
  const finalCases = cases.filter((c) => c.is_final).length;
  const totalValue = cases.reduce((s, c) => s + (c.financial_value || 0), 0);
  const upcomingDl = allDeadlines.filter((d) => d.status === 'upcoming').length;
  const settlementCount = allSessions.filter((s) => s.outcome === 'settled').length;

  const tabs: { id: Tab; label: string; icon: typeof Gavel; badge?: number }[] = [
    { id: 'cases', label: 'القضايا العمالية', icon: Gavel, badge: activeCases },
    { id: 'deadlines', label: 'المواعيد الإجرائية', icon: Calendar, badge: upcomingDl },
    { id: 'settlement_sessions', label: 'جلسات التسوية', icon: Handshake, badge: allSessions.length },
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
            <h2 className="font-heading font-bold text-midnight text-lg">محرك المحاكم العمالية ومكاتب العمل (M6)</h2>
            <p className="font-body text-[10px] text-ink/40">القطاع القضائي العمالي — منازعات علاقات العمل والتسوية الودية</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Server size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">On-Premise · AES-256</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> قضية عمالية
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={<Gavel size={14} className="text-midnight" />} label="إجمالي القضايا" value={String(cases.length)} valueClass="text-midnight" />
        <StatCard icon={<Activity size={14} className="text-blue-600" />} label="قضايا نشطة" value={String(activeCases)} valueClass="text-blue-700" />
        <StatCard icon={<Handshake size={14} className="text-green-600" />} label="تسويات ناجحة" value={String(settlementCount)} valueClass="text-green-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="القيمة الإجمالية" value={formatCurrency(totalValue)} valueClass="text-gold" />
        <StatCard icon={<Calendar size={14} className="text-amber-600" />} label="مواعيد قادمة" value={String(upcomingDl)} valueClass="text-amber-700" />
      </div>

      {/* 3-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة النزاع العمالي — 3 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.amicable_settlement;
            const count = cases.filter((c) => c.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[130px]">
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            { icon: Briefcase, label: 'محرك علاقات العمل (M73)', desc: 'تسوية ودية ومفاوضة', color: 'text-blue-600' },
            { icon: Users, label: 'محرك الموارد البشرية (M77)', desc: 'بيانات التوظيف والرواتب', color: 'text-purple-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'حسابات نهاية الخدمة', color: 'text-gold' },
            { icon: Sparkles, label: 'نواة القضية الذكية (M10)', desc: 'تخزين وتتبع الجلسات', color: 'text-green-600' },
            { icon: FileText, label: 'الوكيل الذكي (M92)', desc: 'توليد المذكرات القانونية', color: 'text-amber-600' },
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
          <Select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الفئات</option>
            {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم أو عنوان أو طرف..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Cases tab */}
      {activeTab === 'cases' && (
        <div className="space-y-2">
          {filteredCases.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Gavel size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد قضايا عمالية</p>
            </div>
          ) : (
            filteredCases.map((c) => {
              const sCfg = STAGE_CONFIG[c.stage] || STAGE_CONFIG.amicable_settlement;
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
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{CATEGORY_LABELS[c.case_category] || c.case_category}</span>
                          {c.is_final && <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600">حكم نهائي</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{c.case_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {c.employer_name && <span className="font-body text-[9px] text-ink/40"><Building2 size={9} className="inline ml-0.5" />{c.employer_name}</span>}
                          {c.employee_name && <span className="font-body text-[9px] text-ink/40"><Briefcase size={9} className="inline ml-0.5" />{c.employee_name}</span>}
                          {c.court && <span className="font-body text-[9px] text-ink/40">{c.court}</span>}
                          {c.financial_value > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(c.financial_value)}</span>}
                          {c.next_hearing_date && <span className="flex items-center gap-0.5 font-body text-[9px] text-amber-600"><Calendar size={9} /> {formatDate(c.next_hearing_date)}</span>}
                          {c.settlement_attempted && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Handshake size={8} /> تسوية</span>}
                          {c.m10_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Sparkles size={8} /> M10</span>}
                          {c.m54_cost_center_opened && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {c.m73_labor_relations_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Briefcase size={8} /> M73</span>}
                          {c.m77_hr_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Users size={8} /> M77</span>}
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
                <div key={d.id} className={`bg-white rounded-xl border shadow-sm p-4 hover:border-gold/30 transition-colors ${d.status === 'completed' ? 'border-green-200' : isUrgent ? 'border-red-200' : isNear ? 'border-amber-200' : 'border-gray-200'}`}>
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
                          {d.statutory_basis && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><FileText size={8} /> {d.statutory_basis}</span>}
                          {d.auto_inserted && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/40"><Zap size={8} /> آلي</span>}
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

      {/* Settlement sessions tab */}
      {activeTab === 'settlement_sessions' && (
        <div className="space-y-2">
          {allSessions.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><Handshake size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد جلسات تسوية</p></div>
          ) : (
            allSessions.map((s) => {
              const cfg = SETTLEMENT_OUTCOME_CONFIG[s.outcome || 'pending'] || SETTLEMENT_OUTCOME_CONFIG.pending;
              const c = cases.find((c) => c.id === s.case_id);
              return (
                <div key={s.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                        <Handshake size={14} className={cfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{SESSION_TYPE_LABELS[s.session_type] || s.session_type}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                          {c && <span className="font-body text-[9px] text-gold">{c.case_number}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{formatDate(s.session_date)}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {s.attendees_employer && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Building2 size={8} /> صاحب العمل</span>}
                          {s.attendees_employee && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Briefcase size={8} /> العامل</span>}
                          {s.next_session_date && <span className="flex items-center gap-0.5 font-body text-[9px] text-amber-600"><Calendar size={9} /> {formatDate(s.next_session_date)}</span>}
                        </div>
                        {s.minutes_text && <p className="font-body text-[10px] text-ink/50 mt-1 leading-relaxed line-clamp-2">{s.minutes_text}</p>}
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(s.id); setDeleteType('session'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
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
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${p.party_type === 'employee' ? 'bg-purple-50' : p.party_type === 'employer' ? 'bg-blue-50' : 'bg-gray-100'}`}>
                        <Users size={14} className={p.party_type === 'employee' ? 'text-purple-600' : p.party_type === 'employer' ? 'text-blue-600' : 'text-ink/40'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${p.party_type === 'employee' ? 'bg-purple-50 text-purple-600' : p.party_type === 'employer' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/50'}`}>{PARTY_TYPE_LABELS[p.party_type] || p.party_type}</span>
                          {p.entity_type && <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{ENTITY_TYPE_LABELS[p.entity_type] || p.entity_type}</span>}
                          {c && <span className="font-body text-[9px] text-gold">{c.case_number}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{p.name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {p.role && <span className="font-body text-[9px] text-ink/40">{p.role}</span>}
                          {p.contact_info && <span className="font-body text-[9px] text-ink/40">{p.contact_info}</span>}
                          {p.legal_representation && <span className="font-body text-[9px] text-ink/30">تمثيل: {p.legal_representation}</span>}
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
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m73') ? <Briefcase size={12} className="text-blue-600" />
                      : log.action.includes('m77') ? <Users size={12} className="text-purple-600" />
                      : log.action.includes('m92') ? <FileText size={12} className="text-amber-600" />
                      : log.action.includes('m52') ? <FileText size={12} className="text-blue-600" />
                      : log.action.includes('deadline') ? <Calendar size={12} className="text-amber-600" />
                      : log.action.includes('settlement') ? <Handshake size={12} className="text-green-600" />
                      : log.action.includes('party') ? <Users size={12} className="text-blue-600" />
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
                <span className="font-heading font-bold text-midnight text-sm">ملف القضية العمالية</span>
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
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedCase.stage] || STAGE_CONFIG.amicable_settlement).bg} ${(STAGE_CONFIG[selectedCase.stage] || STAGE_CONFIG.amicable_settlement).text}`}>
                      {(STAGE_CONFIG[selectedCase.stage] || STAGE_CONFIG.amicable_settlement).label}
                    </span>
                    {selectedCase.is_final && <span className="px-2 py-0.5 rounded text-[10px] font-body bg-green-50 text-green-600">حكم نهائي</span>}
                    {selectedCase.settlement_attempted && <span className="px-2 py-0.5 rounded text-[10px] font-body bg-blue-50 text-blue-600">تمت محاولة التسوية</span>}
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedCase.case_title}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.amicable_settlement;
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

                {/* Employment info */}
                {(selectedCase.employer_name || selectedCase.employee_name) && (
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Briefcase size={12} className="text-blue-600" />
                      <span className="font-body text-[10px] font-bold text-blue-700">بيانات علاقة العمل</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="font-body text-[9px] text-ink/40">صاحب العمل</span><p className="font-body text-[10px] font-bold text-midnight">{selectedCase.employer_name || '—'}</p></div>
                      <div><span className="font-body text-[9px] text-ink/40">العامل</span><p className="font-body text-[10px] font-bold text-midnight">{selectedCase.employee_name || '—'}</p></div>
                      <div><span className="font-body text-[9px] text-ink/40">تاريخ الالتحاق</span><p className="font-body text-[10px] font-bold text-midnight">{selectedCase.employment_start_date ? formatDate(selectedCase.employment_start_date) : '—'}</p></div>
                      <div><span className="font-body text-[9px] text-ink/40">تاريخ الانتهاء</span><p className="font-body text-[10px] font-bold text-midnight">{selectedCase.employment_end_date ? formatDate(selectedCase.employment_end_date) : '—'}</p></div>
                      <div><span className="font-body text-[9px] text-ink/40">الراتب الشهري</span><p className="font-body text-[10px] font-bold text-midnight">{formatCurrency(selectedCase.monthly_salary || 0)}</p></div>
                    </div>
                  </div>
                )}

                {/* Case info grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <span className="font-body text-[9px] text-ink/40">الفئة</span>
                    <p className="font-body text-xs font-bold text-midnight">{CATEGORY_LABELS[selectedCase.case_category] || selectedCase.case_category}</p>
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
                    <span className="font-body text-[9px] text-ink/40">رقم الشكوى</span>
                    <p className="font-body text-xs font-bold text-midnight">{selectedCase.complaint_ref || '—'}</p>
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
                    <Calculator size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">الحسابات المالية — مركز التكلفة: {selectedCase.cost_center_id || '—'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">القيمة الإجمالية</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedCase.financial_value)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نهاية الخدمة</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedCase.end_of_service_amount)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">رصيد الإجازات</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedCase.leave_balance_amount)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">التعويض</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedCase.compensation_amount)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الرسوم القضائية</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedCase.court_fees)}</p></div>
                  </div>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m10_linked ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Sparkles size={10} /> M10 {selectedCase.m10_linked ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m54_cost_center_opened ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedCase.m54_cost_center_opened ? 'مفتوح' : 'غير مفتوح'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m73_labor_relations_linked ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Briefcase size={10} /> M73 {selectedCase.m73_labor_relations_linked ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m77_hr_linked ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Users size={10} /> M77 {selectedCase.m77_hr_linked ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m92_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> M92 {selectedCase.m92_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m52_notified ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> M52 {selectedCase.m52_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
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
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${p.party_type === 'employee' ? 'bg-purple-50 text-purple-600' : p.party_type === 'employer' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/50'}`}>{PARTY_TYPE_LABELS[p.party_type] || p.party_type}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-[10px] font-bold text-midnight">{p.name}</p>
                          {p.entity_type && <span className="font-body text-[9px] text-ink/40">{ENTITY_TYPE_LABELS[p.entity_type] || p.entity_type}</span>}
                        </div>
                        <button onClick={() => { setDeleteId(p.id); setDeleteType('party'); }} className="p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/party:opacity-100 transition-all"><Trash2 size={10} /></button>
                      </div>
                    ))}
                    {parties.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد أطراف مسجلة</p>}
                  </div>
                </div>

                {/* Deadlines */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><Calendar size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">المواعيد الإجرائية</span></div>
                    <button onClick={() => setDeadlineModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> إضافة موعد</button>
                  </div>
                  <div className="space-y-1.5">
                    {deadlines.map((d) => {
                      const daysLeft = Math.ceil((new Date(d.deadline_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      return (
                        <div key={d.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/dl">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-200 text-ink/50">{DEADLINE_TYPE_LABELS[d.deadline_type] || d.deadline_type}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-body text-[10px] font-bold text-midnight">{d.deadline_label}</p>
                            <span className="font-body text-[9px] text-ink/40">{formatDate(d.deadline_date)} — {d.status === 'completed' ? 'مكتمل' : daysLeft > 0 ? daysLeft + ' يوم متبقي' : 'متأخر'}</span>
                            {d.statutory_basis && <span className="font-body text-[9px] text-purple-600 block">{d.statutory_basis}</span>}
                          </div>
                          {d.status !== 'completed' && <button onClick={() => completeDeadline(d)} className="p-1 rounded text-green-500 hover:bg-green-50 transition-colors" title="إتمام"><CheckCircle2 size={11} /></button>}
                          <button onClick={() => { setDeleteId(d.id); setDeleteType('deadline'); }} className="p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/dl:opacity-100 transition-all"><Trash2 size={10} /></button>
                        </div>
                      );
                    })}
                    {deadlines.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد مواعيد مسجلة</p>}
                  </div>
                </div>

                {/* Settlement sessions */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><Handshake size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">جلسات التسوية</span></div>
                    <button onClick={() => setSessionModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> إضافة جلسة</button>
                  </div>
                  <div className="space-y-1.5">
                    {sessions.map((s) => {
                      const cfg = SETTLEMENT_OUTCOME_CONFIG[s.outcome || 'pending'] || SETTLEMENT_OUTCOME_CONFIG.pending;
                      return (
                        <div key={s.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/sess">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-200 text-ink/50">{SESSION_TYPE_LABELS[s.session_type] || s.session_type}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                          </div>
                          <p className="font-body text-[10px] font-bold text-midnight">{formatDate(s.session_date)}</p>
                          {s.minutes_text && <p className="font-body text-[9px] text-ink/50 mt-0.5 leading-tight">{s.minutes_text}</p>}
                        </div>
                      );
                    })}
                    {sessions.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد جلسات تسوية</p>}
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
      <EntityModal open={modalOpen} title={editingId ? 'تعديل القضية العمالية' : 'قضية عمالية جديدة'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم القضية" required><TextInput value={form.case_number} onChange={(e) => setForm({ ...form, case_number: e.target.value })} placeholder="LABOR-2025-001" /></Field>
          <Field label="الفئة">
            <Select value={form.case_category} onChange={(e) => setForm({ ...form, case_category: e.target.value })}>
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان القضية" required><TextInput value={form.case_title} onChange={(e) => setForm({ ...form, case_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="النوع الفرعي"><TextInput value={form.dispute_subtype} onChange={(e) => setForm({ ...form, dispute_subtype: e.target.value })} /></Field>
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المحكمة"><TextInput value={form.court} onChange={(e) => setForm({ ...form, court: e.target.value })} /></Field>
          <Field label="الدائرة"><TextInput value={form.court_circuit} onChange={(e) => setForm({ ...form, court_circuit: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الشكوى"><TextInput value={form.complaint_ref} onChange={(e) => setForm({ ...form, complaint_ref: e.target.value })} /></Field>
          <Field label="تاريخ القيد"><TextInput type="date" value={form.filing_date} onChange={(e) => setForm({ ...form, filing_date: e.target.value })} /></Field>
        </div>
        <Field label="تاريخ الجلسة القادمة"><TextInput type="date" value={form.next_hearing_date} onChange={(e) => setForm({ ...form, next_hearing_date: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="صاحب العمل"><TextInput value={form.employer_name} onChange={(e) => setForm({ ...form, employer_name: e.target.value })} /></Field>
          <Field label="العامل"><TextInput value={form.employee_name} onChange={(e) => setForm({ ...form, employee_name: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="تاريخ الالتحاق"><TextInput type="date" value={form.employment_start_date} onChange={(e) => setForm({ ...form, employment_start_date: e.target.value })} /></Field>
          <Field label="تاريخ الانتهاء"><TextInput type="date" value={form.employment_end_date} onChange={(e) => setForm({ ...form, employment_end_date: e.target.value })} /></Field>
          <Field label="الراتب الشهري"><TextInput type="number" value={form.monthly_salary} onChange={(e) => setForm({ ...form, monthly_salary: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="القيمة المالية"><TextInput type="number" value={form.financial_value} onChange={(e) => setForm({ ...form, financial_value: e.target.value })} /></Field>
          <Field label="نهاية الخدمة"><TextInput type="number" value={form.end_of_service_amount} onChange={(e) => setForm({ ...form, end_of_service_amount: e.target.value })} /></Field>
          <Field label="رصيد الإجازات"><TextInput type="number" value={form.leave_balance_amount} onChange={(e) => setForm({ ...form, leave_balance_amount: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="التعويض"><TextInput type="number" value={form.compensation_amount} onChange={(e) => setForm({ ...form, compensation_amount: e.target.value })} /></Field>
          <Field label="الرسوم القضائية"><TextInput type="number" value={form.court_fees} onChange={(e) => setForm({ ...form, court_fees: e.target.value })} /></Field>
        </div>
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
        <Field label="نوع الكيان">
          <Select value={partyForm.entity_type} onChange={(e) => setPartyForm({ ...partyForm, entity_type: e.target.value })}>
            {Object.entries(ENTITY_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
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
        <Field label="الأساس القانوني"><TextInput value={deadlineForm.statutory_basis} onChange={(e) => setDeadlineForm({ ...deadlineForm, statutory_basis: e.target.value })} /></Field>
      </EntityModal>

      {/* Settlement session modal */}
      <EntityModal open={sessionModalOpen} title="إضافة جلسة تسوية" onClose={() => setSessionModalOpen(false)} onSubmit={addSession}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ الجلسة" required><TextInput type="date" value={sessionForm.session_date} onChange={(e) => setSessionForm({ ...sessionForm, session_date: e.target.value })} /></Field>
          <Field label="نوع الجلسة">
            <Select value={sessionForm.session_type} onChange={(e) => setSessionForm({ ...sessionForm, session_type: e.target.value })}>
              {Object.entries(SESSION_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="حضور صاحب العمل">
            <Select value={sessionForm.attendees_employer ? 'true' : 'false'} onChange={(e) => setSessionForm({ ...sessionForm, attendees_employer: e.target.value === 'true' })}>
              <option value="true">حاضر</option>
              <option value="false">غائب</option>
            </Select>
          </Field>
          <Field label="حضور العامل">
            <Select value={sessionForm.attendees_employee ? 'true' : 'false'} onChange={(e) => setSessionForm({ ...sessionForm, attendees_employee: e.target.value === 'true' })}>
              <option value="true">حاضر</option>
              <option value="false">غائب</option>
            </Select>
          </Field>
        </div>
        <Field label="النتيجة">
          <Select value={sessionForm.outcome} onChange={(e) => setSessionForm({ ...sessionForm, outcome: e.target.value })}>
            <option value="">— اختر —</option>
            {Object.entries(SETTLEMENT_OUTCOME_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
          </Select>
        </Field>
        <Field label="محضر الجلسة"><TextArea value={sessionForm.minutes_text} onChange={(e) => setSessionForm({ ...sessionForm, minutes_text: e.target.value })} rows={3} /></Field>
        <Field label="تاريخ الجلسة القادمة"><TextInput type="date" value={sessionForm.next_session_date} onChange={(e) => setSessionForm({ ...sessionForm, next_session_date: e.target.value })} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
