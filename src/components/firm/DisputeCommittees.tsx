import { useEffect, useState, useCallback } from 'react';
import {
  ClipboardList, Loader2, Plus, Pencil, Trash2, ChevronRight, X, FileText,
  Users, Calendar, DollarSign, Lock, Shield, CircuitBoard, Zap,
  CheckCircle2, Clock, ArrowRight, Search, BookOpen, Scale,
  Building2, AlertTriangle, Activity, Sparkles, Server, Gavel,
  TrendingUp, MessageSquare,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M08Case, M08Party, M08Deadline, M08PrecedentReference, M08CommitteeRecommendation, M08AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'cases' | 'deadlines' | 'precedents' | 'recommendations' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  capture_sorting: { label: 'الالتقاط والفرز', bg: 'bg-blue-50', text: 'text-blue-700' },
  legal_review: { label: 'المراجعة القانونية', bg: 'bg-amber-50', text: 'text-amber-700' },
  recommendation_issuance: { label: 'إصدار التوصيات', bg: 'bg-green-50', text: 'text-green-700' },
};

const STAGES = ['capture_sorting', 'legal_review', 'recommendation_issuance'];

const CATEGORY_LABELS: Record<string, string> = {
  administrative_grievance: 'تظلم إداري',
  license_denial: 'رفض ترخيص',
  employment_decision: 'قرار وظيفي',
  tax_dispute: 'منازعة ضريبية',
};

const GRIEVANCE_TYPE_LABELS: Record<string, string> = {
  individual: 'تظلم فردي',
  collective: 'تظلم جماعي',
  regulatory: 'تظلم تنظيمي',
  institutional: 'تظلم مؤسسي',
};

const PARTY_TYPE_LABELS: Record<string, string> = {
  complainant: 'المتظلم',
  authority: 'الجهة المتظلم ضدها',
  committee_member: 'عضو اللجنة',
  witness: 'شاهد',
  third_party: 'طرف ثالث',
};

const AUTHORITY_TYPE_LABELS: Record<string, string> = {
  'هيئة عامة': 'هيئة عامة',
  'مرفق عام': 'مرفق عام',
  'قطاع حكومي': 'قطاع حكومي',
  'وحدة محلية': 'وحدة محلية',
  'وزارة': 'وزارة',
  'جهة رقابية': 'جهة رقابية',
};

const DEADLINE_TYPE_LABELS: Record<string, string> = {
  grievance_filing: 'تقديم التظلم',
  response_window: 'ميعاد الرد',
  hearing: 'جلسة',
  committee_meeting: 'اجتماع اللجنة',
  recommendation_issuance: 'إصدار التوصية',
  escalation: 'تصعيد',
  notification: 'إخطار',
};

const APPROVAL_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'قيد المراجعة', bg: 'bg-gray-100', text: 'text-gray-500' },
  approved: { label: 'معتمدة', bg: 'bg-green-50', text: 'text-green-600' },
  rejected: { label: 'مرفوضة', bg: 'bg-red-50', text: 'text-red-600' },
  revised: { label: 'تحتاج تعديل', bg: 'bg-amber-50', text: 'text-amber-600' },
};

interface CaseForm {
  case_number: string;
  case_title: string;
  case_category: string;
  grievance_type: string;
  stage: string;
  grievance_body: string;
  challenged_authority: string;
  challenged_decision: string;
  grievance_filing_date: string;
  response_deadline: string;
  committee_name: string;
  financial_value: string;
  cost_center_id: string;
  assigned_advisor_id: string;
  description: string;
}

const emptyForm: CaseForm = {
  case_number: '', case_title: '', case_category: 'administrative_grievance', grievance_type: 'individual',
  stage: 'capture_sorting', grievance_body: '', challenged_authority: '', challenged_decision: '',
  grievance_filing_date: '', response_deadline: '', committee_name: '', financial_value: '0',
  cost_center_id: '', assigned_advisor_id: '', description: '',
};

export default function DisputeCommittees({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [cases, setCases] = useState<M08Case[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('cases');
  const [selectedCase, setSelectedCase] = useState<M08Case | null>(null);
  const [parties, setParties] = useState<M08Party[]>([]);
  const [deadlines, setDeadlines] = useState<M08Deadline[]>([]);
  const [precedents, setPrecedents] = useState<M08PrecedentReference[]>([]);
  const [recommendations, setRecommendations] = useState<M08CommitteeRecommendation[]>([]);
  const [auditLogs, setAuditLogs] = useState<M08AuditLog[]>([]);
  const [allDeadlines, setAllDeadlines] = useState<M08Deadline[]>([]);
  const [allPrecedents, setAllPrecedents] = useState<M08PrecedentReference[]>([]);
  const [allRecommendations, setAllRecommendations] = useState<M08CommitteeRecommendation[]>([]);
  const [allAudit, setAllAudit] = useState<M08AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CaseForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'case' | 'party' | 'deadline' | 'precedent' | 'recommendation'>('case');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [partyModalOpen, setPartyModalOpen] = useState(false);
  const [partyForm, setPartyForm] = useState({ party_type: 'complainant', name: '', role: '', authority_type: '', contact_info: '', legal_representation: '' });
  const [deadlineModalOpen, setDeadlineModalOpen] = useState(false);
  const [deadlineForm, setDeadlineForm] = useState({ deadline_type: 'hearing', deadline_label: '', deadline_date: '', statutory_basis: '' });
  const [precedentModalOpen, setPrecedentModalOpen] = useState(false);
  const [precedentForm, setPrecedentForm] = useState({ precedent_title: '', precedent_ref: '', precedent_date: '', ruling_summary: '', relevance_score: '80' });
  const [recommendationModalOpen, setRecommendationModalOpen] = useState(false);
  const [recommendationForm, setRecommendationForm] = useState({ recommendation_title: '', recommendation_body: '', legal_opinion: '', issued_by: '' });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [caseRes, attRes, dlRes, precRes, recRes, auditRes] = await Promise.all([
      supabase.from('m08_grievance_cases')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m08_deadlines').select('*').order('deadline_date', { ascending: true }),
      supabase.from('m08_precedent_references').select('*').order('created_at', { ascending: false }),
      supabase.from('m08_committee_recommendations').select('*').order('created_at', { ascending: false }),
      supabase.from('m08_grievance_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setCases((caseRes.data as M08Case[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllDeadlines((dlRes.data as M08Deadline[]) || []);
    setAllPrecedents((precRes.data as M08PrecedentReference[]) || []);
    setAllRecommendations((recRes.data as M08CommitteeRecommendation[]) || []);
    setAllAudit((auditRes.data as M08AuditLog[]) || []);
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
    await supabase.from('m08_grievance_audit_logs').insert({
      case_id: caseId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (c: M08Case) => {
    setForm({
      case_number: c.case_number, case_title: c.case_title, case_category: c.case_category,
      grievance_type: c.grievance_type || 'individual', stage: c.stage, grievance_body: c.grievance_body || '',
      challenged_authority: c.challenged_authority || '', challenged_decision: c.challenged_decision || '',
      grievance_filing_date: c.grievance_filing_date || '', response_deadline: c.response_deadline || '',
      committee_name: c.committee_name || '', financial_value: String(c.financial_value || 0),
      cost_center_id: c.cost_center_id || '', assigned_advisor_id: c.assigned_advisor_id || '',
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
      grievance_type: form.grievance_type || null,
      stage: form.stage,
      grievance_body: form.grievance_body.trim() || null,
      challenged_authority: form.challenged_authority.trim() || null,
      challenged_decision: form.challenged_decision.trim() || null,
      grievance_filing_date: form.grievance_filing_date || null,
      response_deadline: form.response_deadline || null,
      committee_name: form.committee_name.trim() || null,
      financial_value: Number(form.financial_value) || 0,
      assigned_advisor_id: form.assigned_advisor_id || null,
      description: form.description.trim() || null,
    };
    if (editingId) {
      await supabase.from('m08_grievance_cases').update(payload).eq('id', editingId);
      await logAudit(editingId, 'case_updated', 'تحديث بيانات قضية التظلم');
    } else {
      const { data } = await supabase.from('m08_grievance_cases').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'case_created', 'إنشاء ملف تظلم — فئة: ' + (CATEGORY_LABELS[form.case_category] || form.case_category));
        await supabase.from('m08_grievance_cases').update({
          m10_linked: true,
          m46_precedents_retrieved: true,
          m76_representation_linked: true,
          m92_notified: true,
          m52_notified: true,
          cost_center_id: form.cost_center_id.trim() || 'CC-M08-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm10_linked', 'ربط الملف بنواة القضية الذكية (M10)');
        await logAudit(newId, 'm46_precedents', 'استرجاع السوابق من المكتبة المعرفية (M46)');
        await logAudit(newId, 'm76_linked', 'ربط الإدارات القانونية (M76)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92)');
        await logAudit(newId, 'm52_notified', 'إخطار البريد السيادي (M52)');
        if (form.grievance_filing_date) {
          const responseDate = new Date(form.grievance_filing_date);
          responseDate.setDate(responseDate.getDate() + 30);
          await supabase.from('m08_deadlines').insert({
            case_id: newId, deadline_type: 'response_window',
            deadline_label: 'ميعاد رد الجهة المتظلم ضدها (30 يوم)',
            deadline_date: responseDate.toISOString().split('T')[0],
            statutory_basis: 'قانون التظلمات الإدارية',
            auto_inserted: true, status: 'upcoming',
          });
          await logAudit(newId, 'deadlines_calculated', 'حساب ميعاد الرد آلياً — 30 يوم');
        }
        if (form.response_deadline) {
          await supabase.from('m08_deadlines').insert({
            case_id: newId, deadline_type: 'committee_meeting',
            deadline_label: 'اجتماع اللجنة لمراجعة التظلم',
            deadline_date: form.response_deadline,
            auto_inserted: true, status: 'upcoming',
          });
        }
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (deleteType === 'case') await supabase.from('m08_grievance_cases').delete().eq('id', deleteId);
    else if (deleteType === 'party') await supabase.from('m08_grievance_parties').delete().eq('id', deleteId);
    else if (deleteType === 'deadline') await supabase.from('m08_deadlines').delete().eq('id', deleteId);
    else if (deleteType === 'precedent') await supabase.from('m08_precedent_references').delete().eq('id', deleteId);
    else if (deleteType === 'recommendation') await supabase.from('m08_committee_recommendations').delete().eq('id', deleteId);
    setDeleteId(null);
    if (deleteType === 'case') setSelectedCase(null);
    fetchAll();
    if (selectedCase && deleteType !== 'case') openCaseDetail(selectedCase);
  };

  const openCaseDetail = async (c: M08Case) => {
    setSelectedCase(c);
    setDetailLoading(true);
    const [pRes, dlRes, precRes, recRes, aRes] = await Promise.all([
      supabase.from('m08_grievance_parties').select('*').eq('case_id', c.id).order('created_at', { ascending: true }),
      supabase.from('m08_deadlines').select('*').eq('case_id', c.id).order('deadline_date', { ascending: true }),
      supabase.from('m08_precedent_references').select('*').eq('case_id', c.id).order('relevance_score', { ascending: false }),
      supabase.from('m08_committee_recommendations').select('*').eq('case_id', c.id).order('created_at', { ascending: false }),
      supabase.from('m08_grievance_audit_logs').select('*').eq('case_id', c.id).order('created_at', { ascending: true }),
    ]);
    setParties((pRes.data as M08Party[]) || []);
    setDeadlines((dlRes.data as M08Deadline[]) || []);
    setPrecedents((precRes.data as M08PrecedentReference[]) || []);
    setRecommendations((recRes.data as M08CommitteeRecommendation[]) || []);
    setAuditLogs((aRes.data as M08AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (c: M08Case) => {
    const idx = STAGES.indexOf(c.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    await supabase.from('m08_grievance_cases').update({ stage: next }).eq('id', c.id);
    await logAudit(c.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    const updated = { ...c, stage: next };
    setSelectedCase(updated as M08Case);
  };

  const escalateToM3 = async (c: M08Case) => {
    await supabase.from('m08_grievance_cases').update({
      escalated_to_m3: true, m3_escalation_ready: true,
      escalation_reason: 'عدم التوصل لتوصية حاسمة في اللجنة',
    }).eq('id', c.id);
    await logAudit(c.id, 'm3_escalation', 'تصديد القضية إلى محرك القضاء الإداري (M3)');
    fetchAll();
    const updated = { ...c, escalated_to_m3: true, m3_escalation_ready: true };
    setSelectedCase(updated as M08Case);
  };

  const addParty = async () => {
    if (!selectedCase || !partyForm.name.trim()) return;
    await supabase.from('m08_grievance_parties').insert({
      case_id: selectedCase.id, party_type: partyForm.party_type, name: partyForm.name.trim(),
      role: partyForm.role.trim() || null, authority_type: partyForm.authority_type || null,
      contact_info: partyForm.contact_info.trim() || null,
      legal_representation: partyForm.legal_representation.trim() || null,
    });
    await logAudit(selectedCase.id, 'party_added', 'إضافة طرف: ' + partyForm.name);
    setPartyForm({ party_type: 'complainant', name: '', role: '', authority_type: '', contact_info: '', legal_representation: '' });
    setPartyModalOpen(false);
    openCaseDetail(selectedCase);
  };

  const addDeadline = async () => {
    if (!selectedCase || !deadlineForm.deadline_label.trim() || !deadlineForm.deadline_date) return;
    await supabase.from('m08_deadlines').insert({
      case_id: selectedCase.id, deadline_type: deadlineForm.deadline_type,
      deadline_label: deadlineForm.deadline_label.trim(), deadline_date: deadlineForm.deadline_date,
      statutory_basis: deadlineForm.statutory_basis.trim() || null,
      auto_inserted: false, status: 'upcoming',
    });
    await logAudit(selectedCase.id, 'deadline_added', 'إضافة موعد: ' + deadlineForm.deadline_label);
    setDeadlineForm({ deadline_type: 'hearing', deadline_label: '', deadline_date: '', statutory_basis: '' });
    setDeadlineModalOpen(false);
    openCaseDetail(selectedCase);
  };

  const addPrecedent = async () => {
    if (!selectedCase || !precedentForm.precedent_title.trim()) return;
    await supabase.from('m08_precedent_references').insert({
      case_id: selectedCase.id, precedent_title: precedentForm.precedent_title.trim(),
      precedent_ref: precedentForm.precedent_ref.trim() || null,
      precedent_date: precedentForm.precedent_date || null,
      ruling_summary: precedentForm.ruling_summary.trim() || null,
      relevance_score: Number(precedentForm.relevance_score) || 0,
      m46_source: true,
    });
    await logAudit(selectedCase.id, 'precedent_added', 'إضافة سابقة: ' + precedentForm.precedent_title + ' — من المكتبة المعرفية (M46)');
    setPrecedentForm({ precedent_title: '', precedent_ref: '', precedent_date: '', ruling_summary: '', relevance_score: '80' });
    setPrecedentModalOpen(false);
    openCaseDetail(selectedCase);
  };

  const addRecommendation = async () => {
    if (!selectedCase || !recommendationForm.recommendation_title.trim()) return;
    await supabase.from('m08_committee_recommendations').insert({
      case_id: selectedCase.id, recommendation_title: recommendationForm.recommendation_title.trim(),
      recommendation_body: recommendationForm.recommendation_body.trim() || null,
      legal_opinion: recommendationForm.legal_opinion.trim() || null,
      issued_by: recommendationForm.issued_by.trim() || null,
      issued_at: new Date().toISOString(),
      approval_status: 'pending', final_decision: false,
    });
    await logAudit(selectedCase.id, 'recommendation_issued', 'إصدار توصية: ' + recommendationForm.recommendation_title);
    setRecommendationForm({ recommendation_title: '', recommendation_body: '', legal_opinion: '', issued_by: '' });
    setRecommendationModalOpen(false);
    openCaseDetail(selectedCase);
  };

  const approveRecommendation = async (r: M08CommitteeRecommendation) => {
    await supabase.from('m08_committee_recommendations').update({
      approval_status: 'approved', final_decision: true,
    }).eq('id', r.id);
    await supabase.from('m08_grievance_cases').update({
      is_resolved: true, recommendation: r.recommendation_title,
    }).eq('id', selectedCase!.id);
    if (selectedCase) await logAudit(selectedCase.id, 'recommendation_approved', 'اعتماد التوصية النهائية: ' + r.recommendation_title);
    if (selectedCase) openCaseDetail(selectedCase);
  };

  const completeDeadline = async (d: M08Deadline) => {
    await supabase.from('m08_deadlines').update({
      status: 'completed', completed_at: new Date().toISOString(),
    }).eq('id', d.id);
    if (selectedCase) await logAudit(selectedCase.id, 'deadline_completed', 'إتمام الموعد: ' + d.deadline_label);
    if (selectedCase) openCaseDetail(selectedCase);
  };

  const filteredCases = cases.filter((c) => {
    if (filterCategory !== 'all' && c.case_category !== filterCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.case_number.toLowerCase().includes(q) && !c.case_title.toLowerCase().includes(q) && !(c.challenged_authority || '').toLowerCase().includes(q) && !(c.committee_name || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeCases = cases.filter((c) => !c.is_resolved).length;
  const resolvedCases = cases.filter((c) => c.is_resolved).length;
  const escalatedCases = cases.filter((c) => c.escalated_to_m3).length;
  const totalValue = cases.reduce((s, c) => s + (c.financial_value || 0), 0);
  const upcomingDl = allDeadlines.filter((d) => d.status === 'upcoming').length;

  const tabs: { id: Tab; label: string; icon: typeof ClipboardList; badge?: number }[] = [
    { id: 'cases', label: 'قضايا التظلم', icon: ClipboardList, badge: activeCases },
    { id: 'deadlines', label: 'المواعيد', icon: Calendar, badge: upcomingDl },
    { id: 'precedents', label: 'السوابق القضائية', icon: BookOpen, badge: allPrecedents.length },
    { id: 'recommendations', label: 'توصيات اللجان', icon: MessageSquare, badge: allRecommendations.length },
    { id: 'audit', label: 'سجل ZK-Audit', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <ClipboardList size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">محرك لجان فض المنازعات والتظلمات الإدارية (M8)</h2>
            <p className="font-body text-[10px] text-ink/40">القطاع التظلمي — لجان فض المنازعات والتظلمات الإدارية</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Server size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">On-Premise · AES-256</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> قضية تظلم
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={<ClipboardList size={14} className="text-midnight" />} label="إجمالي القضايا" value={String(cases.length)} valueClass="text-midnight" />
        <StatCard icon={<Activity size={14} className="text-blue-600" />} label="قضايا نشطة" value={String(activeCases)} valueClass="text-blue-700" />
        <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="تظلمات محلولة" value={String(resolvedCases)} valueClass="text-green-700" />
        <StatCard icon={<AlertTriangle size={14} className="text-red-600" />} label="مُصدّدة لـ M3" value={String(escalatedCases)} valueClass="text-red-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="القيمة الإجمالية" value={formatCurrency(totalValue)} valueClass="text-gold" />
      </div>

      {/* 3-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة التظلم الإداري — 3 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.capture_sorting;
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
            { icon: Sparkles, label: 'نواة القضية الذكية (M10)', desc: 'تخزين وتتبع القضية', color: 'text-purple-600' },
            { icon: BookOpen, label: 'المكتبة المعرفية (M46)', desc: 'استرجاع السوابق القضائية', color: 'text-blue-600' },
            { icon: Building2, label: 'الإدارات القانونية (M76)', desc: 'تمثيل قانوني متكامل', color: 'text-green-600' },
            { icon: Scale, label: 'القضاء الإداري (M3)', desc: 'تصديد القضايا المعقدة', color: 'text-red-600' },
            { icon: FileText, label: 'الوكيل الذكي (M92)', desc: 'توليد المذكرات والتوصيات', color: 'text-amber-600' },
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
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم أو عنوان أو جهة..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Cases tab */}
      {activeTab === 'cases' && (
        <div className="space-y-2">
          {filteredCases.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <ClipboardList size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد قضايا تظلم</p>
            </div>
          ) : (
            filteredCases.map((c) => {
              const sCfg = STAGE_CONFIG[c.stage] || STAGE_CONFIG.capture_sorting;
              const stageIdx = STAGES.indexOf(c.stage);
              return (
                <div key={c.id} onClick={() => openCaseDetail(c)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <ClipboardList size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{c.case_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{CATEGORY_LABELS[c.case_category] || c.case_category}</span>
                          {c.is_resolved && <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600">محلول</span>}
                          {c.escalated_to_m3 && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-red-50 text-red-600"><AlertTriangle size={8} /> مُصدّد لـ M3</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{c.case_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {c.challenged_authority && <span className="font-body text-[9px] text-ink/40"><Building2 size={9} className="inline ml-0.5" />{c.challenged_authority}</span>}
                          {c.committee_name && <span className="font-body text-[9px] text-ink/40"><Users size={9} className="inline ml-0.5" />{c.committee_name}</span>}
                          {c.grievance_body && <span className="font-body text-[9px] text-ink/40">{c.grievance_body}</span>}
                          {c.financial_value > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(c.financial_value)}</span>}
                          {c.grievance_filing_date && <span className="flex items-center gap-0.5 font-body text-[9px] text-amber-600"><Calendar size={9} /> {formatDate(c.grievance_filing_date)}</span>}
                          {c.m10_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Sparkles size={8} /> M10</span>}
                          {c.m46_precedents_retrieved && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><BookOpen size={8} /> M46</span>}
                          {c.m76_representation_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><Building2 size={8} /> M76</span>}
                          {c.m3_escalation_ready && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-red-50 text-red-600"><Scale size={8} /> M3</span>}
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
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><Calendar size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد مواعيد</p></div>
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
                          {d.statutory_basis && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Scale size={8} /> {d.statutory_basis}</span>}
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

      {/* Precedents tab */}
      {activeTab === 'precedents' && (
        <div className="space-y-2">
          {allPrecedents.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><BookOpen size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد سوابق قضائية</p></div>
          ) : (
            allPrecedents.map((p) => {
              const c = cases.find((c) => c.id === p.case_id);
              return (
                <div key={p.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <BookOpen size={14} className="text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {p.m46_source && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><BookOpen size={8} /> M46</span>}
                          {p.relevance_score > 0 && (
                            <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${p.relevance_score >= 80 ? 'bg-green-50 text-green-600' : p.relevance_score >= 50 ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/50'}`}>
                              <TrendingUp size={8} /> {p.relevance_score}% تطابق
                            </span>
                          )}
                          {c && <span className="font-body text-[9px] text-gold">{c.case_number}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{p.precedent_title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {p.precedent_ref && <span className="font-body text-[9px] text-ink/40">{p.precedent_ref}</span>}
                          {p.precedent_date && <span className="font-body text-[9px] text-ink/30">{formatDate(p.precedent_date)}</span>}
                        </div>
                        {p.ruling_summary && <p className="font-body text-[10px] text-ink/50 mt-1 leading-relaxed line-clamp-2">{p.ruling_summary}</p>}
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(p.id); setDeleteType('precedent'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Recommendations tab */}
      {activeTab === 'recommendations' && (
        <div className="space-y-2">
          {allRecommendations.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><MessageSquare size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد توصيات لجان</p></div>
          ) : (
            allRecommendations.map((r) => {
              const cfg = APPROVAL_STATUS_CONFIG[r.approval_status] || APPROVAL_STATUS_CONFIG.pending;
              const c = cases.find((c) => c.id === r.case_id);
              return (
                <div key={r.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                        <MessageSquare size={14} className={cfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                          {r.final_decision && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> قرار نهائي</span>}
                          {c && <span className="font-body text-[9px] text-gold">{c.case_number}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{r.recommendation_title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {r.issued_by && <span className="font-body text-[9px] text-ink/40">أصدرها: {r.issued_by}</span>}
                          {r.issued_at && <span className="font-body text-[9px] text-ink/30">{formatDate(r.issued_at)}</span>}
                        </div>
                        {r.legal_opinion && <p className="font-body text-[10px] text-purple-600 mt-1 leading-relaxed line-clamp-2">{r.legal_opinion}</p>}
                        {r.recommendation_body && <p className="font-body text-[10px] text-ink/50 mt-1 leading-relaxed line-clamp-2">{r.recommendation_body}</p>}
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(r.id); setDeleteType('recommendation'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
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
                      : log.action.includes('m46') || log.action.includes('precedent') ? <BookOpen size={12} className="text-blue-600" />
                      : log.action.includes('m76') ? <Building2 size={12} className="text-green-600" />
                      : log.action.includes('m3') || log.action.includes('escalat') ? <Scale size={12} className="text-red-600" />
                      : log.action.includes('m92') ? <FileText size={12} className="text-amber-600" />
                      : log.action.includes('m52') ? <FileText size={12} className="text-blue-600" />
                      : log.action.includes('deadline') ? <Calendar size={12} className="text-amber-600" />
                      : log.action.includes('recommendation') ? <MessageSquare size={12} className="text-green-600" />
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
                <ClipboardList size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف قضية التظلم</span>
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
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedCase.stage] || STAGE_CONFIG.capture_sorting).bg} ${(STAGE_CONFIG[selectedCase.stage] || STAGE_CONFIG.capture_sorting).text}`}>
                      {(STAGE_CONFIG[selectedCase.stage] || STAGE_CONFIG.capture_sorting).label}
                    </span>
                    {selectedCase.is_resolved && <span className="px-2 py-0.5 rounded text-[10px] font-body bg-green-50 text-green-600">محلول</span>}
                    {selectedCase.escalated_to_m3 && <span className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-body bg-red-50 text-red-600"><AlertTriangle size={10} /> مُصدّد لـ M3</span>}
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedCase.case_title}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.capture_sorting;
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

                {/* Challenged decision */}
                {selectedCase.challenged_decision && (
                  <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertTriangle size={12} className="text-red-600" />
                      <span className="font-body text-[10px] font-bold text-red-700">القرار المتظلم ضده</span>
                    </div>
                    <p className="font-body text-[10px] text-red-600 leading-relaxed">{selectedCase.challenged_decision}</p>
                    {selectedCase.challenged_authority && <p className="font-body text-[9px] text-red-500 mt-1">الجهة: {selectedCase.challenged_authority}</p>}
                  </div>
                )}

                {/* Case info grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <span className="font-body text-[9px] text-ink/40">الفئة</span>
                    <p className="font-body text-xs font-bold text-midnight">{CATEGORY_LABELS[selectedCase.case_category] || selectedCase.case_category}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <span className="font-body text-[9px] text-ink/40">نوع التظلم</span>
                    <p className="font-body text-xs font-bold text-midnight">{GRIEVANCE_TYPE_LABELS[selectedCase.grievance_type || ''] || selectedCase.grievance_type || '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <span className="font-body text-[9px] text-ink/40">جهة التظلم</span>
                    <p className="font-body text-xs font-bold text-midnight">{selectedCase.grievance_body || '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <span className="font-body text-[9px] text-ink/40">اللجنة</span>
                    <p className="font-body text-xs font-bold text-midnight">{selectedCase.committee_name || '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <span className="font-body text-[9px] text-ink/40">تاريخ التقديم</span>
                    <p className="font-body text-xs font-bold text-midnight">{selectedCase.grievance_filing_date ? formatDate(selectedCase.grievance_filing_date) : '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <span className="font-body text-[9px] text-ink/40">ميعاد الرد</span>
                    <p className="font-body text-xs font-bold text-amber-600">{selectedCase.response_deadline ? formatDate(selectedCase.response_deadline) : '—'}</p>
                  </div>
                </div>

                {/* Financial summary */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <DollarSign size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">الملخص المالي — مركز التكلفة: {selectedCase.cost_center_id || '—'}</span>
                  </div>
                  <div><span className="font-body text-[9px] text-ink/40">القيمة</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedCase.financial_value)}</p></div>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m10_linked ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Sparkles size={10} /> M10 {selectedCase.m10_linked ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m46_precedents_retrieved ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><BookOpen size={10} /> M46 {selectedCase.m46_precedents_retrieved ? 'تم الاسترجاع' : 'غير مسترجع'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m76_representation_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><Building2 size={10} /> M76 {selectedCase.m76_representation_linked ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m3_escalation_ready ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-ink/30'}`}><Scale size={10} /> M3 {selectedCase.m3_escalation_ready ? 'جاهز للتصعيد' : 'غير جاهز'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m92_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> M92 {selectedCase.m92_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m52_notified ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> M52 {selectedCase.m52_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                </div>

                {/* Escalation button */}
                {!selectedCase.escalated_to_m3 && !selectedCase.is_resolved && (
                  <button onClick={() => escalateToM3(selectedCase)} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 border border-red-200 font-body text-xs font-bold hover:bg-red-100 transition-colors">
                    <Scale size={12} /> تصديد القضية إلى محرك القضاء الإداري (M3)
                  </button>
                )}

                {selectedCase.escalation_reason && (
                  <div className="bg-red-50 rounded-lg p-2.5 border border-red-100">
                    <span className="font-body text-[9px] font-bold text-red-700">سبب التصعيد:</span>
                    <p className="font-body text-[10px] text-red-600 mt-0.5">{selectedCase.escalation_reason}</p>
                  </div>
                )}

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
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${p.party_type === 'complainant' ? 'bg-blue-50 text-blue-600' : p.party_type === 'authority' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-ink/50'}`}>{PARTY_TYPE_LABELS[p.party_type] || p.party_type}</span>
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

                {/* Deadlines */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><Calendar size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">المواعيد</span></div>
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

                {/* Precedents */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><BookOpen size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">السوابق القضائية (M46)</span></div>
                    <button onClick={() => setPrecedentModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> إضافة سابقة</button>
                  </div>
                  <div className="space-y-1.5">
                    {precedents.map((p) => (
                      <div key={p.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/prec">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-1 py-0.5 rounded text-[9px] font-body font-bold ${p.relevance_score >= 80 ? 'bg-green-50 text-green-600' : p.relevance_score >= 50 ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/50'}`}>{p.relevance_score}% تطابق</span>
                          {p.m46_source && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><BookOpen size={8} /> M46</span>}
                        </div>
                        <p className="font-body text-[10px] font-bold text-midnight">{p.precedent_title}</p>
                        {p.precedent_ref && <span className="font-body text-[9px] text-ink/40">{p.precedent_ref}</span>}
                        {p.ruling_summary && <p className="font-body text-[9px] text-ink/50 mt-0.5 leading-tight">{p.ruling_summary}</p>}
                      </div>
                    ))}
                    {precedents.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد سوابق قضائية</p>}
                  </div>
                </div>

                {/* Recommendations */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><MessageSquare size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">توصيات اللجنة</span></div>
                    <button onClick={() => setRecommendationModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> إصدار توصية</button>
                  </div>
                  <div className="space-y-1.5">
                    {recommendations.map((r) => {
                      const cfg = APPROVAL_STATUS_CONFIG[r.approval_status] || APPROVAL_STATUS_CONFIG.pending;
                      return (
                        <div key={r.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/rec">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                            {r.final_decision && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> نهائي</span>}
                          </div>
                          <p className="font-body text-[10px] font-bold text-midnight">{r.recommendation_title}</p>
                          {r.legal_opinion && <p className="font-body text-[9px] text-purple-600 mt-0.5">{r.legal_opinion}</p>}
                          {r.recommendation_body && <p className="font-body text-[9px] text-ink/50 mt-0.5 leading-tight">{r.recommendation_body}</p>}
                          {r.issued_by && <span className="font-body text-[9px] text-ink/40 block mt-0.5">أصدرها: {r.issued_by}</span>}
                          {r.approval_status !== 'approved' && (
                            <button onClick={() => approveRecommendation(r)} className="mt-1 flex items-center gap-1 px-2 py-1 rounded bg-green-600 text-white font-body text-[9px] font-bold hover:bg-green-700 transition-colors">
                              <CheckCircle2 size={9} /> اعتماد كقرار نهائي
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {recommendations.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد توصيات</p>}
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
      <EntityModal open={modalOpen} title={editingId ? 'تعديل قضية التظلم' : 'قضية تظلم جديدة'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم القضية" required><TextInput value={form.case_number} onChange={(e) => setForm({ ...form, case_number: e.target.value })} placeholder="GRIEV-2025-001" /></Field>
          <Field label="الفئة">
            <Select value={form.case_category} onChange={(e) => setForm({ ...form, case_category: e.target.value })}>
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان القضية" required><TextInput value={form.case_title} onChange={(e) => setForm({ ...form, case_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نوع التظلم">
            <Select value={form.grievance_type} onChange={(e) => setForm({ ...form, grievance_type: e.target.value })}>
              {Object.entries(GRIEVANCE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="جهة التظلم"><TextInput value={form.grievance_body} onChange={(e) => setForm({ ...form, grievance_body: e.target.value })} /></Field>
          <Field label="اسم اللجنة"><TextInput value={form.committee_name} onChange={(e) => setForm({ ...form, committee_name: e.target.value })} /></Field>
        </div>
        <Field label="القرار المتظلم ضده"><TextArea value={form.challenged_decision} onChange={(e) => setForm({ ...form, challenged_decision: e.target.value })} rows={2} /></Field>
        <Field label="الجهة المتظلم ضدها"><TextInput value={form.challenged_authority} onChange={(e) => setForm({ ...form, challenged_authority: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ التقديم"><TextInput type="date" value={form.grievance_filing_date} onChange={(e) => setForm({ ...form, grievance_filing_date: e.target.value })} /></Field>
          <Field label="ميعاد الرد"><TextInput type="date" value={form.response_deadline} onChange={(e) => setForm({ ...form, response_deadline: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="القيمة المالية"><TextInput type="number" value={form.financial_value} onChange={(e) => setForm({ ...form, financial_value: e.target.value })} /></Field>
          <Field label="مركز التكلفة"><TextInput value={form.cost_center_id} onChange={(e) => setForm({ ...form, cost_center_id: e.target.value })} placeholder="CC-M08-XXXXXX" /></Field>
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
        <Field label="نوع الجهة">
          <Select value={partyForm.authority_type} onChange={(e) => setPartyForm({ ...partyForm, authority_type: e.target.value })}>
            <option value="">— اختر —</option>
            {Object.entries(AUTHORITY_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="معلومات الاتصال"><TextInput value={partyForm.contact_info} onChange={(e) => setPartyForm({ ...partyForm, contact_info: e.target.value })} /></Field>
        <Field label="التمثيل القانوني"><TextInput value={partyForm.legal_representation} onChange={(e) => setPartyForm({ ...partyForm, legal_representation: e.target.value })} /></Field>
      </EntityModal>

      {/* Deadline modal */}
      <EntityModal open={deadlineModalOpen} title="إضافة موعد" onClose={() => setDeadlineModalOpen(false)} onSubmit={addDeadline}>
        <Field label="نوع الموعد" required>
          <Select value={deadlineForm.deadline_type} onChange={(e) => setDeadlineForm({ ...deadlineForm, deadline_type: e.target.value })}>
            {Object.entries(DEADLINE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="الوصف" required><TextInput value={deadlineForm.deadline_label} onChange={(e) => setDeadlineForm({ ...deadlineForm, deadline_label: e.target.value })} /></Field>
        <Field label="التاريخ" required><TextInput type="date" value={deadlineForm.deadline_date} onChange={(e) => setDeadlineForm({ ...deadlineForm, deadline_date: e.target.value })} /></Field>
        <Field label="الأساس القانوني"><TextInput value={deadlineForm.statutory_basis} onChange={(e) => setDeadlineForm({ ...deadlineForm, statutory_basis: e.target.value })} /></Field>
      </EntityModal>

      {/* Precedent modal */}
      <EntityModal open={precedentModalOpen} title="إضافة سابقة قضائية" onClose={() => setPrecedentModalOpen(false)} onSubmit={addPrecedent}>
        <Field label="عنوان السابقة" required><TextInput value={precedentForm.precedent_title} onChange={(e) => setPrecedentForm({ ...precedentForm, precedent_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المرجع"><TextInput value={precedentForm.precedent_ref} onChange={(e) => setPrecedentForm({ ...precedentForm, precedent_ref: e.target.value })} /></Field>
          <Field label="تاريخ السابقة"><TextInput type="date" value={precedentForm.precedent_date} onChange={(e) => setPrecedentForm({ ...precedentForm, precedent_date: e.target.value })} /></Field>
        </div>
        <Field label="ملخص الحكم"><TextArea value={precedentForm.ruling_summary} onChange={(e) => setPrecedentForm({ ...precedentForm, ruling_summary: e.target.value })} rows={3} /></Field>
        <Field label="نسبة التطابق %"><TextInput type="number" value={precedentForm.relevance_score} onChange={(e) => setPrecedentForm({ ...precedentForm, relevance_score: e.target.value })} /></Field>
      </EntityModal>

      {/* Recommendation modal */}
      <EntityModal open={recommendationModalOpen} title="إصدار توصية لجنة" onClose={() => setRecommendationModalOpen(false)} onSubmit={addRecommendation}>
        <Field label="عنوان التوصية" required><TextInput value={recommendationForm.recommendation_title} onChange={(e) => setRecommendationForm({ ...recommendationForm, recommendation_title: e.target.value })} /></Field>
        <Field label="أصدرها"><TextInput value={recommendationForm.issued_by} onChange={(e) => setRecommendationForm({ ...recommendationForm, issued_by: e.target.value })} placeholder="اسم اللجنة أو المستشار" /></Field>
        <Field label="الرأي القانوني"><TextArea value={recommendationForm.legal_opinion} onChange={(e) => setRecommendationForm({ ...recommendationForm, legal_opinion: e.target.value })} rows={3} /></Field>
        <Field label="نص التوصية"><TextArea value={recommendationForm.recommendation_body} onChange={(e) => setRecommendationForm({ ...recommendationForm, recommendation_body: e.target.value })} rows={4} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
