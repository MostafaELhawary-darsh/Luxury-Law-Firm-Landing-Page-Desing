import { useEffect, useState, useCallback } from 'react';
import {
  Brain, Loader2, Plus, Pencil, Trash2, ChevronRight, ChevronLeft, X, FileText,
  Users, Calendar, DollarSign, Lock, Shield, CircuitBoard, Zap,
  CheckCircle2, Clock, AlertTriangle, ArrowRight, Search, Network,
  Scale, Building2, Send, Eye, Activity, Sparkles, BookOpen,
  TrendingUp, Server, Gavel, Target, GitBranch, Mail, Landmark,
  Star, Filter, ShieldAlert, BookMarked, Hash, UserCheck,
  Fingerprint, Droplet, ShieldOff, ShieldCheck, Download, Upload, History,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';
import type {
  ScmCase, ScmPipelineStage, ScmCaseTeam, ScmDeadline,
  ScmEvidence, ScmAuditLog, ScmPrecedent,
} from '@/lib/smartCaseTypes';
import {
  PIPELINE_TYPES, TRIAGE_STYLES, CONFIDENTIALITY_STYLES, ALERT_STYLES,
} from '@/lib/smartCaseTypes';
import type { M10TreeNode, M10Deadline, M10DefenseDraft, M10AuditLog } from '@/lib/firmTypes';
import {
  computeDeadline, daysUntil, getAlertLevel, getWaterfallAlert,
  APPEAL_DEADLINES,
  generateDocumentHash, verifyDocumentIntegrity, generateWatermark,
  generateFakeIP, generateFakeMAC,
} from '@/lib/deadlineEngine';
import ProceduralEngine from './ProceduralEngine';
import { useLibrarySearch } from '@/hooks/useLibrarySearch';

// ═══════════════════════════════════════════════════════════
// M10 CONSTANTS
// ═══════════════════════════════════════════════════════════

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  tree_construction: { label: 'بناء شجرة القضية', bg: 'bg-blue-50', text: 'text-blue-700' },
  deadline_calibration: { label: 'الضبط الزمني التلقائي', bg: 'bg-amber-50', text: 'text-amber-700' },
  defense_generation: { label: 'التوليد الآلي للدفوع', bg: 'bg-purple-50', text: 'text-purple-700' },
  trial_readiness: { label: 'جاهزية المحاكمة', bg: 'bg-green-50', text: 'text-green-700' },
};

const STAGES = ['tree_construction', 'deadline_calibration', 'defense_generation', 'trial_readiness'];

const OPERATING_MODE_CONFIG: Record<string, { label: string; bg: string; text: string; icon: typeof Building2 }> = {
  law_firms: { label: 'مكاتب المحاماة', bg: 'bg-blue-50', text: 'text-blue-700', icon: Building2 },
  legal_departments: { label: 'الإدارات القانونية', bg: 'bg-purple-50', text: 'text-purple-700', icon: Scale },
  government_entities: { label: 'الجهات الحكومية', bg: 'bg-green-50', text: 'text-green-700', icon: Landmark },
};

const CATEGORY_LABELS: Record<string, string> = {
  commercial: 'تجاري',
  civil: 'مدني',
  administrative: 'إداري',
  criminal: 'جنائي',
  labor: 'عمالي',
};

const SOURCE_ENGINE_LABELS: Record<string, string> = {
  M1: 'المحرك المدني (M1)',
  M2: 'القضاء الإداري (M2)',
  M3: 'مجلس الدولة (M3)',
  M4: 'المحكمة الاقتصادية (M4)',
  M5: 'محكمة الأسرة (M5)',
  M6: 'محكمة الجنح (M6)',
  M7: 'محكمة الجنايات (M7)',
  M8: 'محكمة النقض (M8)',
};

const NODE_TYPE_LABELS: Record<string, string> = {
  facts: 'الوقائع',
  parties: 'الأطراف',
  evidence: 'الأدلة',
  legal_basis: 'الأساس القانوني',
  defense: 'الدفوع',
  procedure: 'الإجراءات',
};

const NODE_TYPE_CONFIG: Record<string, { bg: string; text: string; icon: typeof FileText }> = {
  facts: { bg: 'bg-blue-50', text: 'text-blue-600', icon: FileText },
  parties: { bg: 'bg-purple-50', text: 'text-purple-600', icon: Users },
  evidence: { bg: 'bg-amber-50', text: 'text-amber-600', icon: Shield },
  legal_basis: { bg: 'bg-green-50', text: 'text-green-600', icon: Scale },
  defense: { bg: 'bg-red-50', text: 'text-red-600', icon: Gavel },
  procedure: { bg: 'bg-gray-100', text: 'text-gray-600', icon: CircuitBoard },
};

const DEADLINE_TYPE_LABELS: Record<string, string> = {
  hearing: 'جلسة',
  memo_submission: 'تقديم مذكرة',
  appeal: 'طعن',
  notification: 'إخطار',
  expert_report: 'تقرير الخبير',
  document_filing: 'إيداع مستند',
};

const DRAFT_TYPE_LABELS: Record<string, string> = {
  defense_memo: 'مذكرة دفاع',
  appeal_memo: 'مذكرة طعن',
  statement_of_claim: 'صحيفة دعوى',
  closing_argument: 'مرافعة ختامية',
  expert_report: 'تقرير خبير',
};

const REVIEW_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'مسودة', bg: 'bg-gray-100', text: 'text-gray-600' },
  under_review: { label: 'قيد المراجعة', bg: 'bg-amber-50', text: 'text-amber-600' },
  approved: { label: 'معتمد', bg: 'bg-green-50', text: 'text-green-600' },
  rejected: { label: 'مرفوض', bg: 'bg-red-50', text: 'text-red-600' },
};

// SCM CONSTANTS

const PIPELINE_ICONS: Record<string, typeof Gavel> = {
  Gavel, Building2, Users, ShieldCheck,
};

// ═══════════════════════════════════════════════════════════
// TYPES & FORM
// ═══════════════════════════════════════════════════════════

type Tab = 'cases' | 'pipeline' | 'case_tree' | 'deadlines' | 'defense_drafts' | 'evidence' | 'precedents' | 'team' | 'audit';

interface CaseForm {
  case_number: string;
  case_title: string;
  source_engine: string;
  source_case_number: string;
  m10_stage: string;
  operating_mode: string;
  case_category: string;
  court: string;
  court_circuit: string;
  filing_date: string;
  next_hearing_date: string;
  next_deadline_date: string;
  next_deadline_label: string;
  success_probability: string;
  financial_value: string;
  assigned_attorney_id: string;
  client_name: string;
  client_type: string;
  facts_summary: string;
  legal_basis: string;
  parties_summary: string;
  evidence_summary: string;
  description: string;
  pipeline_type: string;
  triage_lane: string;
  confidentiality: string;
  opposing_party: string;
}

const emptyForm: CaseForm = {
  case_number: '', case_title: '', source_engine: '', source_case_number: '',
  m10_stage: 'tree_construction', operating_mode: 'law_firms', case_category: 'civil',
  court: '', court_circuit: '', filing_date: '', next_hearing_date: '',
  next_deadline_date: '', next_deadline_label: '', success_probability: '50',
  financial_value: '0', assigned_attorney_id: '', client_name: '', client_type: 'individual',
  facts_summary: '', legal_basis: '', parties_summary: '', evidence_summary: '', description: '',
  pipeline_type: 'litigation', triage_lane: 'green', confidentiality: 'standard', opposing_party: '',
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function SmartCaseCore({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const { openLibrary } = useLibrarySearch();
  const [cases, setCases] = useState<ScmCase[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('cases');
  const [selectedCase, setSelectedCase] = useState<ScmCase | null>(null);
  // M10 detail state
  const [treeNodes, setTreeNodes] = useState<M10TreeNode[]>([]);
  const [deadlines, setDeadlines] = useState<M10Deadline[]>([]);
  const [defenseDrafts, setDefenseDrafts] = useState<M10DefenseDraft[]>([]);
  const [auditLogs, setAuditLogs] = useState<M10AuditLog[]>([]);
  // SCM detail state
  const [stages, setStages] = useState<ScmPipelineStage[]>([]);
  const [team, setTeam] = useState<ScmCaseTeam[]>([]);
  const [scmDeadlines, setScmDeadlines] = useState<ScmDeadline[]>([]);
  const [evidence, setEvidence] = useState<ScmEvidence[]>([]);
  const [scmAudit, setScmAudit] = useState<ScmAuditLog[]>([]);
  const [precedents, setPrecedents] = useState<ScmPrecedent[]>([]);
  // All-tab state
  const [allTreeNodes, setAllTreeNodes] = useState<M10TreeNode[]>([]);
  const [allM10Deadlines, setAllM10Deadlines] = useState<M10Deadline[]>([]);
  const [allDrafts, setAllDrafts] = useState<M10DefenseDraft[]>([]);
  const [allM10Audit, setAllM10Audit] = useState<M10AuditLog[]>([]);
  const [allScmDeadlines, setAllScmDeadlines] = useState<ScmDeadline[]>([]);
  const [allScmAudit, setAllScmAudit] = useState<ScmAuditLog[]>([]);
  const [allEvidence, setAllEvidence] = useState<ScmEvidence[]>([]);
  const [allPrecedents, setAllPrecedents] = useState<ScmPrecedent[]>([]);
  const [allStages, setAllStages] = useState<ScmPipelineStage[]>([]);
  const [allTeam, setAllTeam] = useState<ScmCaseTeam[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CaseForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'case' | 'tree_node' | 'deadline' | 'draft' | 'evidence' | 'precedent' | 'team'>('case');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterMode, setFilterMode] = useState('all');
  const [filterPipeline, setFilterPipeline] = useState('all');
  const [globalOperatingMode, setGlobalOperatingMode] = useState('law_firms');
  // Sub-modals
  const [nodeModalOpen, setNodeModalOpen] = useState(false);
  const [nodeForm, setNodeForm] = useState({ node_type: 'facts', node_title: '', node_content: '', parent_node_id: '' });
  const [deadlineModalOpen, setDeadlineModalOpen] = useState(false);
  const [deadlineForm, setDeadlineForm] = useState({ deadline_type: 'hearing', deadline_label: '', deadline_date: '', statutory_basis: '', days_from_filing: '' });
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [draftForm, setDraftForm] = useState({ draft_title: '', draft_type: 'defense_memo', draft_content: '', legal_gaps_identified: '' });
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [evidenceForm, setEvidenceForm] = useState({ name: '', doc_type: 'مستند', visibility: 'team', uploaded_by: '', description: '' });
  const [precedentModalOpen, setPrecedentModalOpen] = useState(false);
  const [precedentForm, setPrecedentForm] = useState({ title: '', argument_text: '', legal_area: 'تجاري', outcome: '', flagged_by: '' });
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [teamForm, setTeamForm] = useState({ member_name: '', member_role: 'محامي', access_level: 'full' });
  const [proceduralEngineOpen, setProceduralEngineOpen] = useState(false);

  // ── Fetch all ──
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [caseRes, attRes, nodeRes, dlRes, draftRes, auditRes, scmDlRes, scmAuditRes, evRes, precRes, stgRes, teamRes] = await Promise.all([
      supabase.from('scm_cases').select('*, attorney:lf_attorneys(name)').order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m10_case_tree_nodes').select('*').order('created_at', { ascending: true }),
      supabase.from('m10_deadlines').select('*').order('deadline_date', { ascending: true }),
      supabase.from('m10_defense_drafts').select('*').order('created_at', { ascending: false }),
      supabase.from('m10_smart_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('scm_deadlines').select('*').order('deadline_date', { ascending: true }),
      supabase.from('scm_audit_log').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('scm_evidence').select('*').order('uploaded_at', { ascending: false }),
      supabase.from('scm_precedents').select('*').order('created_at', { ascending: false }),
      supabase.from('scm_pipeline_stages').select('*').order('step_index', { ascending: true }),
      supabase.from('scm_case_team').select('*').order('added_at', { ascending: true }),
    ]);
    setCases((caseRes.data as ScmCase[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllTreeNodes((nodeRes.data as M10TreeNode[]) || []);
    setAllM10Deadlines((dlRes.data as M10Deadline[]) || []);
    setAllDrafts((draftRes.data as M10DefenseDraft[]) || []);
    setAllM10Audit((auditRes.data as M10AuditLog[]) || []);
    setAllScmDeadlines((scmDlRes.data as ScmDeadline[]) || []);
    setAllScmAudit((scmAuditRes.data as ScmAuditLog[]) || []);
    setAllEvidence((evRes.data as ScmEvidence[]) || []);
    setAllPrecedents((precRes.data as ScmPrecedent[]) || []);
    setAllStages((stgRes.data as ScmPipelineStage[]) || []);
    setAllTeam((teamRes.data as ScmCaseTeam[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Voice add ──
  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyForm, case_title: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  // ── Audit logging (both systems) ──
  const logAudit = async (caseId: string, action: string, detail: string) => {
    const hash = '0x' + Math.random().toString(16).substr(2, 4) + '...' + Math.random().toString(16).substr(2, 4);
    await supabase.from('m10_smart_audit_logs').insert({
      case_id: null, scm_case_id: caseId, action, actor: 'النظام', actor_role: 'النظام',
      detail, hash_chain: hash, immutable: true,
    });
    await supabase.from('scm_audit_log').insert({
      case_id: caseId, actor_name: 'النظام', action, action_detail: detail,
      ip_address: generateFakeIP(),
    });
  };

  // ── Open add / edit ──
  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (c: ScmCase) => {
    setForm({
      case_number: c.case_number || '', case_title: c.title, source_engine: c.source_engine || '',
      source_case_number: c.source_case_number || '', m10_stage: c.m10_stage || 'tree_construction',
      operating_mode: c.operating_mode || 'law_firms', case_category: c.case_category || 'civil',
      court: c.court || '', court_circuit: c.court_circuit || '', filing_date: c.filing_date || '',
      next_hearing_date: c.next_hearing_date || '', next_deadline_date: c.next_deadline_date || '',
      next_deadline_label: c.next_deadline_label || '', success_probability: String(c.success_probability || 50),
      financial_value: String(c.financial_value || 0), assigned_attorney_id: c.assigned_attorney_id || '',
      client_name: c.client_name || '', client_type: c.client_type || 'individual',
      facts_summary: c.facts_summary || '', legal_basis: c.legal_basis || '',
      parties_summary: c.parties_summary || '', evidence_summary: c.evidence_summary || '',
      description: (c as unknown as { description?: string }).description || '', pipeline_type: c.pipeline_type, triage_lane: c.triage_lane,
      confidentiality: c.confidentiality, opposing_party: c.opposing_party || '',
    });
    setEditingId(c.id);
    setModalOpen(true);
  };

  // ── Save ──
  const handleSave = async () => {
    if (!form.case_title.trim()) return;
    setSaving(true);
    const caseCode = editingId ? undefined : `SCM-${Date.now().toString().slice(-6)}`;
    const payload: Record<string, unknown> = {
      title: form.case_title.trim(),
      pipeline_type: form.pipeline_type,
      triage_lane: form.triage_lane,
      confidentiality: form.confidentiality,
      client_name: form.client_name.trim() || null,
      opposing_party: form.opposing_party.trim() || null,
      court: form.court.trim() || null,
      case_number: form.case_number.trim() || null,
      operating_mode: form.operating_mode,
      case_category: form.case_category,
      court_circuit: form.court_circuit.trim() || null,
      filing_date: form.filing_date || null,
      next_hearing_date: form.next_hearing_date || null,
      next_deadline_date: form.next_deadline_date || null,
      next_deadline_label: form.next_deadline_label.trim() || null,
      success_probability: Number(form.success_probability) || 50,
      financial_value: Number(form.financial_value) || 0,
      assigned_attorney_id: form.assigned_attorney_id || null,
      client_type: form.client_type,
      facts_summary: form.facts_summary.trim() || null,
      legal_basis: form.legal_basis.trim() || null,
      parties_summary: form.parties_summary.trim() || null,
      evidence_summary: form.evidence_summary.trim() || null,
      description: form.description.trim() || null,
      m10_stage: form.m10_stage,
      case_tree_encrypted: true,
      encryption_standard: 'AES-256',
      source_engine: form.source_engine || null,
      source_case_number: form.source_case_number.trim() || null,
    };
    if (!editingId) payload.case_code = caseCode;

    if (editingId) {
      await supabase.from('scm_cases').update(payload).eq('id', editingId);
      await logAudit(editingId, 'case_updated', 'تحديث بيانات نواة القضية الذكية الموحدة');
    } else {
      const { data } = await supabase.from('scm_cases').insert(payload).select('id').single();
      const newId = data?.id;
      if (newId) {
        await logAudit(newId, 'case_created', 'إنشاء قضية ذكية موحدة — الفئة: ' + (CATEGORY_LABELS[form.case_category] || form.case_category));
        await logAudit(newId, 'encryption_sealed', 'تشفير شجرة القضية بمعيار AES-256 — الحماية الكاملة');
        await supabase.from('scm_cases').update({
          m54_cost_center_opened: true, m92_task_distributed: true, m52_notified: true,
          cost_center_id: 'CC-M10-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm54_cost_center', 'فتح مركز تكلفة مالي في المحرك المالي (M54)');
        await logAudit(newId, 'm92_distributed', 'توزيع التكليفات عبر الوكيل الذكي (M92)');
        await logAudit(newId, 'm52_notified', 'إخطار الأطراف عبر البريد السيادي (M52)');
        // Auto-create SCM pipeline stages
        const pipeline = PIPELINE_TYPES.find((p) => p.id === form.pipeline_type);
        if (pipeline) {
          const stageInserts = pipeline.stages.map((stageLabel, i) => ({
            case_id: newId, step_index: i, client_label: stageLabel,
            internal_label: stageLabel, is_completed: false,
          }));
          await supabase.from('scm_pipeline_stages').insert(stageInserts);
        }
        // Auto-create M10 root tree nodes
        const rootNodes = [
          { node_type: 'facts', node_title: 'الوقائع', node_content: form.facts_summary || '', node_order: 0 },
          { node_type: 'parties', node_title: 'الأطراف', node_content: form.parties_summary || '', node_order: 1 },
          { node_type: 'evidence', node_title: 'الأدلة', node_content: form.evidence_summary || '', node_order: 2 },
          { node_type: 'legal_basis', node_title: 'الأساس القانوني', node_content: form.legal_basis || '', node_order: 3 },
        ];
        for (const node of rootNodes) {
          await supabase.from('m10_case_tree_nodes').insert({
            case_id: null, scm_case_id: newId, node_type: node.node_type,
            node_title: node.node_title, node_content: node.node_content || null,
            parent_node_id: null, node_order: node.node_order, encrypted: true,
          });
        }
        await logAudit(newId, 'tree_constructed', 'بناء شجرة القضية الأولية — 4 عقد رئيسية (وقائع، أطراف، أدلة، أساس قانوني)');
        // Auto-calculate deadline from filing date
        if (form.filing_date) {
          const hearingDate = new Date(form.filing_date);
          hearingDate.setDate(hearingDate.getDate() + 30);
          await supabase.from('m10_deadlines').insert({
            case_id: null, scm_case_id: newId, deadline_type: 'hearing',
            deadline_label: 'أول جلسة (30 يوم من تاريخ القيد)',
            deadline_date: hearingDate.toISOString().split('T')[0],
            statutory_basis: 'قانون المرافعات المدنية',
            days_from_filing: 30, status: 'upcoming', auto_calculated: true,
          });
          await logAudit(newId, 'deadlines_calibrated', 'الضبط الزمني التلقائي — 30 يوم لأول جلسة من تاريخ القيد');
        }
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  // ── Delete ──
  const handleDelete = async () => {
    if (!deleteId) return;
    if (deleteType === 'case') await supabase.from('scm_cases').delete().eq('id', deleteId);
    else if (deleteType === 'tree_node') await supabase.from('m10_case_tree_nodes').delete().eq('id', deleteId);
    else if (deleteType === 'deadline') { await supabase.from('m10_deadlines').delete().eq('id', deleteId); await supabase.from('scm_deadlines').delete().eq('id', deleteId); }
    else if (deleteType === 'draft') await supabase.from('m10_defense_drafts').delete().eq('id', deleteId);
    else if (deleteType === 'evidence') await supabase.from('scm_evidence').delete().eq('id', deleteId);
    else if (deleteType === 'precedent') await supabase.from('scm_precedents').delete().eq('id', deleteId);
    else if (deleteType === 'team') await supabase.from('scm_case_team').delete().eq('id', deleteId);
    setDeleteId(null);
    if (deleteType === 'case') setSelectedCase(null);
    fetchAll();
    if (selectedCase && deleteType !== 'case') openCaseDetail(selectedCase);
  };

  // ── Open case detail ──
  const openCaseDetail = async (c: ScmCase) => {
    setSelectedCase(c);
    setDetailLoading(true);
    const [nRes, dlRes, dRes, aRes, sRes, tRes, scmDlRes, evRes, scmAuditRes, pRes] = await Promise.all([
      supabase.from('m10_case_tree_nodes').select('*').eq('scm_case_id', c.id).order('node_order', { ascending: true }),
      supabase.from('m10_deadlines').select('*').eq('scm_case_id', c.id).order('deadline_date', { ascending: true }),
      supabase.from('m10_defense_drafts').select('*').eq('scm_case_id', c.id).order('created_at', { ascending: false }),
      supabase.from('m10_smart_audit_logs').select('*').eq('scm_case_id', c.id).order('created_at', { ascending: true }),
      supabase.from('scm_pipeline_stages').select('*').eq('case_id', c.id).order('step_index', { ascending: true }),
      supabase.from('scm_case_team').select('*').eq('case_id', c.id).order('added_at', { ascending: true }),
      supabase.from('scm_deadlines').select('*').eq('case_id', c.id).order('deadline_date', { ascending: true }),
      supabase.from('scm_evidence').select('*').eq('case_id', c.id).order('uploaded_at', { ascending: false }),
      supabase.from('scm_audit_log').select('*').eq('case_id', c.id).order('created_at', { ascending: false }),
      supabase.from('scm_precedents').select('*').eq('case_id', c.id).order('created_at', { ascending: false }),
    ]);
    setTreeNodes((nRes.data as M10TreeNode[]) || []);
    setDeadlines((dlRes.data as M10Deadline[]) || []);
    setDefenseDrafts((dRes.data as M10DefenseDraft[]) || []);
    setAuditLogs((aRes.data as M10AuditLog[]) || []);
    setStages((sRes.data as ScmPipelineStage[]) || []);
    setTeam((tRes.data as ScmCaseTeam[]) || []);
    setScmDeadlines((scmDlRes.data as ScmDeadline[]) || []);
    setEvidence((evRes.data as ScmEvidence[]) || []);
    setScmAudit((scmAuditRes.data as ScmAuditLog[]) || []);
    setPrecedents((pRes.data as ScmPrecedent[]) || []);
    setDetailLoading(false);
  };

  // ── Advance M10 stage ──
  const advanceStage = async (c: ScmCase) => {
    const idx = STAGES.indexOf(c.m10_stage || 'tree_construction');
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    await supabase.from('scm_cases').update({ m10_stage: next }).eq('id', c.id);
    await logAudit(c.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedCase({ ...c, m10_stage: next });
  };

  // ── Advance SCM pipeline stage ──
  const advancePipelineStage = async () => {
    if (!selectedCase) return;
    if (selectedCase.current_stage_index < stages.length - 1) {
      await supabase.from('scm_cases').update({
        current_stage_index: selectedCase.current_stage_index + 1,
        updated_at: new Date().toISOString(),
      }).eq('id', selectedCase.id);
      openCaseDetail({ ...selectedCase, current_stage_index: selectedCase.current_stage_index + 1 });
    }
  };

  // ── Toggle pipeline stage ──
  const togglePipelineStage = async (stageId: string, current: boolean) => {
    await supabase.from('scm_pipeline_stages').update({
      is_completed: !current, completed_at: !current ? new Date().toISOString() : null,
    }).eq('id', stageId);
    if (selectedCase) openCaseDetail(selectedCase);
  };

  // ── Add tree node ──
  const addTreeNode = async () => {
    if (!selectedCase || !nodeForm.node_title.trim()) return;
    const maxOrder = treeNodes.reduce((max, n) => Math.max(max, n.node_order || 0), -1);
    await supabase.from('m10_case_tree_nodes').insert({
      case_id: null, scm_case_id: selectedCase.id, node_type: nodeForm.node_type,
      node_title: nodeForm.node_title.trim(), node_content: nodeForm.node_content.trim() || null,
      parent_node_id: nodeForm.parent_node_id || null, node_order: maxOrder + 1, encrypted: true,
    });
    await logAudit(selectedCase.id, 'tree_node_added', 'إضافة عقدة شجرة: ' + nodeForm.node_title + ' (' + (NODE_TYPE_LABELS[nodeForm.node_type] || nodeForm.node_type) + ')');
    setNodeForm({ node_type: 'facts', node_title: '', node_content: '', parent_node_id: '' });
    setNodeModalOpen(false);
    openCaseDetail(selectedCase);
  };

  // ── Add M10 deadline ──
  const addDeadline = async () => {
    if (!selectedCase || !deadlineForm.deadline_label.trim() || !deadlineForm.deadline_date) return;
    await supabase.from('m10_deadlines').insert({
      case_id: null, scm_case_id: selectedCase.id, deadline_type: deadlineForm.deadline_type,
      deadline_label: deadlineForm.deadline_label.trim(), deadline_date: deadlineForm.deadline_date,
      statutory_basis: deadlineForm.statutory_basis.trim() || null,
      days_from_filing: Number(deadlineForm.days_from_filing) || null,
      status: 'upcoming', auto_calculated: false,
    });
    await logAudit(selectedCase.id, 'deadline_added', 'إضافة موعد إجرائي: ' + deadlineForm.deadline_label);
    setDeadlineForm({ deadline_type: 'hearing', deadline_label: '', deadline_date: '', statutory_basis: '', days_from_filing: '' });
    setDeadlineModalOpen(false);
    openCaseDetail(selectedCase);
  };

  // ── Add defense draft ──
  const addDraft = async () => {
    if (!selectedCase || !draftForm.draft_title.trim()) return;
    await supabase.from('m10_defense_drafts').insert({
      case_id: null, scm_case_id: selectedCase.id, draft_title: draftForm.draft_title.trim(),
      draft_type: draftForm.draft_type, draft_content: draftForm.draft_content.trim() || null,
      legal_gaps_identified: draftForm.legal_gaps_identified.trim() || null,
      generated_by: 'النظام الذكي', review_status: 'draft', version: 1,
    });
    await logAudit(selectedCase.id, 'defense_generated', 'توليد مسودة دفاع آلياً: ' + draftForm.draft_title);
    setDraftForm({ draft_title: '', draft_type: 'defense_memo', draft_content: '', legal_gaps_identified: '' });
    setDraftModalOpen(false);
    openCaseDetail(selectedCase);
  };

  // ── Review draft ──
  const reviewDraft = async (d: M10DefenseDraft, status: string) => {
    await supabase.from('m10_defense_drafts').update({
      review_status: status, reviewed_by: 'النظام', reviewed_at: new Date().toISOString(),
    }).eq('id', d.id);
    if (selectedCase) await logAudit(selectedCase.id, 'draft_reviewed', 'مراجعة المسودة: ' + d.draft_title + ' — الحالة: ' + (REVIEW_STATUS_CONFIG[status]?.label || status));
    if (selectedCase) openCaseDetail(selectedCase);
  };

  // ── Complete deadline ──
  const completeDeadline = async (d: M10Deadline) => {
    await supabase.from('m10_deadlines').update({
      status: 'completed', completed_at: new Date().toISOString(),
    }).eq('id', d.id);
    if (selectedCase) await logAudit(selectedCase.id, 'deadline_completed', 'إتمام الموعد الإجرائي: ' + d.deadline_label);
    if (selectedCase) openCaseDetail(selectedCase);
  };

  // ── Add evidence ──
  const addEvidence = async () => {
    if (!selectedCase || !evidenceForm.name.trim()) return;
    const fakeHash = generateDocumentHash();
    const ip = generateFakeIP();
    const { data } = await supabase.from('scm_evidence').insert({
      case_id: selectedCase.id, name: evidenceForm.name.trim(), doc_type: evidenceForm.doc_type,
      file_hash: fakeHash, uploaded_by: evidenceForm.uploaded_by.trim() || 'المستخدم الحالي',
      visibility: evidenceForm.visibility, version_number: 1,
      description: evidenceForm.description.trim() || null,
    }).select('id').single();
    if (data) {
      await supabase.from('scm_audit_log').insert({
        case_id: selectedCase.id, evidence_id: data.id,
        actor_name: evidenceForm.uploaded_by.trim() || 'المستخدم الحالي',
        action: 'upload', action_detail: `رفع مستند: ${evidenceForm.name.trim()}`,
        ip_address: ip,
      });
    }
    setEvidenceForm({ name: '', doc_type: 'مستند', visibility: 'team', uploaded_by: '', description: '' });
    setEvidenceModalOpen(false);
    openCaseDetail(selectedCase);
  };

  // ── Add precedent ──
  const addPrecedent = async () => {
    if (!selectedCase || !precedentForm.title.trim() || !precedentForm.argument_text.trim()) return;
    await supabase.from('scm_precedents').insert({
      case_id: selectedCase.id, title: precedentForm.title.trim(),
      argument_text: precedentForm.argument_text.trim(), legal_area: precedentForm.legal_area,
      outcome: precedentForm.outcome.trim() || null, anonymized: true,
      flagged_by: precedentForm.flagged_by.trim() || null,
    });
    setPrecedentForm({ title: '', argument_text: '', legal_area: 'تجاري', outcome: '', flagged_by: '' });
    setPrecedentModalOpen(false);
    openCaseDetail(selectedCase);
  };

  // ── Add team member ──
  const addTeamMember = async () => {
    if (!selectedCase || !teamForm.member_name.trim()) return;
    await supabase.from('scm_case_team').insert({
      case_id: selectedCase.id, member_name: teamForm.member_name.trim(),
      member_role: teamForm.member_role, access_level: teamForm.access_level,
    });
    setTeamForm({ member_name: '', member_role: 'محامي', access_level: 'full' });
    setTeamModalOpen(false);
    openCaseDetail(selectedCase);
  };

  // ── Filters ──
  const filteredCases = cases.filter((c) => {
    if (filterCategory !== 'all' && c.case_category !== filterCategory) return false;
    if (filterMode !== 'all' && c.operating_mode !== filterMode) return false;
    if (filterPipeline !== 'all' && c.pipeline_type !== filterPipeline) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!(c.case_number || '').toLowerCase().includes(q) && !c.title.toLowerCase().includes(q) && !(c.client_name || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // ── Loading ──
  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  // ── Stats ──
  const activeCases = cases.filter((c) => c.status === 'active').length;
  const totalValue = cases.reduce((s, c) => s + (c.financial_value || 0), 0);
  const encryptedCases = cases.filter((c) => c.case_tree_encrypted).length;
  const upcomingDl = allM10Deadlines.filter((d) => d.status === 'upcoming').length + allScmDeadlines.filter((d) => daysUntil(new Date(d.deadline_date)) >= 0).length;
  const avgSuccess = cases.length > 0 ? cases.reduce((s, c) => s + (c.success_probability || 0), 0) / cases.length : 0;

  // ── Tabs ──
  const tabs: { id: Tab; label: string; icon: typeof Brain; badge?: number }[] = [
    { id: 'cases', label: 'القضايا الذكية', icon: Brain, badge: cases.length },
    { id: 'pipeline', label: 'المسار التخصصي', icon: Gavel, badge: allStages.length },
    { id: 'case_tree', label: 'شجرة القضية', icon: GitBranch, badge: allTreeNodes.length },
    { id: 'deadlines', label: 'المواعيد الإجرائية', icon: Calendar, badge: upcomingDl },
    { id: 'defense_drafts', label: 'مسودات الدفوع', icon: FileText, badge: allDrafts.length },
    { id: 'evidence', label: 'سلسلة الأدلة', icon: Shield, badge: allEvidence.length },
    { id: 'precedents', label: 'السوابق القانونية', icon: BookMarked, badge: allPrecedents.length },
    { id: 'team', label: 'فريق القضية', icon: UserCheck, badge: allTeam.length },
    { id: 'audit', label: 'سجل التدقيق', icon: History },
  ];

  const modeCfg = OPERATING_MODE_CONFIG[globalOperatingMode] || OPERATING_MODE_CONFIG.law_firms;

  // Merged audit for audit tab
  const mergedAudit: Array<{ id: string; action: string; detail: string | null; actor: string | null; created_at: string; source: 'm10' | 'scm'; ip?: string | null; hash?: string | null; immutable?: boolean }> = [
    ...allM10Audit.map((a) => ({ id: a.id, action: a.action, detail: a.detail, actor: a.actor, created_at: a.created_at, source: 'm10' as const, hash: a.hash_chain, immutable: a.immutable })),
    ...allScmAudit.map((a) => ({ id: a.id, action: a.action, detail: a.action_detail, actor: a.actor_name, created_at: a.created_at, source: 'scm' as const, ip: a.ip_address })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Brain size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">نواة القضية الذكية الموحدة (M10 + SCM)</h2>
            <p className="font-body text-[10px] text-ink/40">المحرك المركزي الموحد — تكامل M10 و SCM مع المسارات التخصصية والمحرك المالي والذكي</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Lock size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">AES-256 · Encrypted</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> قضية ذكية
          </button>
        </div>
      </div>

      {/* Operating Mode Selector */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <Network size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">وضع التشغيل (Multi-Tenant Operating Mode)</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(OPERATING_MODE_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const isActive = globalOperatingMode === key;
            return (
              <button key={key} onClick={() => setGlobalOperatingMode(key)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-colors ${isActive ? 'bg-gold/20 border-gold/50' : 'bg-midnight-light/30 border-gold/10 hover:border-gold/30'}`}>
                <Icon size={14} className={isActive ? 'text-gold' : 'text-cream/50'} />
                <span className={`font-body text-[10px] font-bold ${isActive ? 'text-gold' : 'text-cream/60'}`}>{cfg.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatCard icon={<Brain size={14} className="text-midnight" />} label="إجمالي القضايا" value={String(cases.length)} valueClass="text-midnight" />
        <StatCard icon={<Activity size={14} className="text-blue-600" />} label="قضايا نشطة" value={String(activeCases)} valueClass="text-blue-700" />
        <StatCard icon={<TrendingUp size={14} className="text-green-600" />} label="متوسط الاحتمالية" value={avgSuccess.toFixed(1) + '%'} valueClass="text-green-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="القيمة الإجمالية" value={formatCurrency(totalValue)} valueClass="text-gold" />
        <StatCard icon={<Lock size={14} className="text-purple-600" />} label="قضايا مشفرة" value={String(encryptedCases)} valueClass="text-purple-700" />
        <StatCard icon={<Calendar size={14} className="text-amber-600" />} label="مواعيد قادمة" value={String(upcomingDl)} valueClass="text-amber-700" />
      </div>

      {/* 4-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة القضية الذكية — 4 مراحل (M10)</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.tree_construction;
            const count = cases.filter((c) => (c.m10_stage || 'tree_construction') === stage).length;
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
          <span className="font-heading font-bold text-midnight text-xs">مصفوفة التكامل — M10 + SCM هو المحور المركزي (Hub)</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <div className="bg-midnight rounded-lg p-3 border border-gold/30 col-span-2 md:col-span-1 flex flex-col items-center justify-center">
            <Brain size={20} className="text-gold mb-1" />
            <span className="font-body text-[10px] font-bold text-cream">M10+SCM — النواة</span>
            <span className="font-body text-[8px] text-cream/40">العصب المركزي الموحد</span>
          </div>
          {[
            { icon: FileText, label: 'M1-M8 المحركات القضائية', desc: 'المصدر — استيراد القضايا', color: 'text-blue-600' },
            { icon: DollarSign, label: 'M54 المحرك المالي', desc: 'مراكز التكلفة', color: 'text-green-600' },
            { icon: Send, label: 'M92 الوكيل الذكي', desc: 'توزيع التكليفات', color: 'text-amber-600' },
            { icon: Mail, label: 'M52 البريد السيادي', desc: 'الإخطارات الرسمية', color: 'text-purple-600' },
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
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterPipeline} onChange={(e) => setFilterPipeline(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل المسارات</option>
            {PIPELINE_TYPES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </Select>
          <Select value={filterMode} onChange={(e) => setFilterMode(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الأوضاع</option>
            {Object.entries(OPERATING_MODE_CONFIG).map(([v, l]) => <option key={v} value={v}>{l.label}</option>)}
          </Select>
          <Select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الفئات</option>
            {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم أو عنوان أو موكل..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* ═══ CASES TAB ═══ */}
      {activeTab === 'cases' && (
        <div className="space-y-2">
          {filteredCases.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Brain size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد قضايا ذكية</p>
            </div>
          ) : (
            filteredCases.map((c) => {
              const sCfg = STAGE_CONFIG[c.m10_stage || 'tree_construction'] || STAGE_CONFIG.tree_construction;
              const stageIdx = STAGES.indexOf(c.m10_stage || 'tree_construction');
              const omCfg = OPERATING_MODE_CONFIG[c.operating_mode || 'law_firms'] || OPERATING_MODE_CONFIG.law_firms;
              const OmIcon = omCfg.icon;
              const triage = TRIAGE_STYLES[c.triage_lane];
              const conf = CONFIDENTIALITY_STYLES[c.confidentiality];
              const pipeline = PIPELINE_TYPES.find((p) => p.id === c.pipeline_type);
              const PICon = pipeline ? PIPELINE_ICONS[pipeline.icon] || Gavel : Gavel;
              return (
                <div key={c.id} onClick={() => openCaseDetail(c)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gold/10">
                        <PICon size={14} className="text-gold" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-body text-[10px] font-bold text-gold">{c.case_code}</span>
                          {pipeline && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50"><PICon size={8} /> {pipeline.label}</span>}
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold border ${triage.bg} ${triage.text} ${triage.border}`}>{triage.label}</span>
                          {c.confidentiality !== 'standard' && <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${conf.bg} ${conf.text}`}>{conf.label}</span>}
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${omCfg.bg} ${omCfg.text}`}><OmIcon size={8} /> {omCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{CATEGORY_LABELS[c.case_category || ''] || c.case_category}</span>
                          {c.source_engine && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><FileText size={8} /> {c.source_engine}</span>}
                          {c.case_tree_encrypted && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Lock size={8} /> AES-256</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{c.title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {c.client_name && <span className="font-body text-[9px] text-ink/40"><Users size={9} className="inline ml-0.5" />{c.client_name}</span>}
                          {c.opposing_party && <span className="font-body text-[9px] text-ink/40">الخصم: {c.opposing_party}</span>}
                          {c.court && <span className="font-body text-[9px] text-ink/40"><Building2 size={9} className="inline ml-0.5" />{c.court}</span>}
                          {c.financial_value > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(c.financial_value)}</span>}
                          {c.next_hearing_date && <span className="flex items-center gap-0.5 font-body text-[9px] text-amber-600"><Calendar size={9} /> {formatDate(c.next_hearing_date)}</span>}
                          {c.success_probability > 0 && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><TrendingUp size={8} /> {c.success_probability.toFixed(0)}%</span>}
                          {c.m54_cost_center_opened && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {c.m92_task_distributed && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Send size={8} /> M92</span>}
                          {c.m52_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Mail size={8} /> M52</span>}
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
                      <ChevronLeft size={14} className="text-ink/20 group-hover:text-gold transition-colors" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ═══ PIPELINE TAB ═══ */}
      {activeTab === 'pipeline' && (
        <div className="space-y-2">
          {allStages.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><Gavel size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد مراحل مسار</p></div>
          ) : (
            allStages.map((s) => {
              const c = cases.find((c) => c.id === s.case_id);
              const isCurrent = c && s.step_index === c.current_stage_index;
              return (
                <div key={s.id} className={`bg-white rounded-xl border p-4 ${isCurrent ? 'border-gold/40 ring-1 ring-gold/20' : 'border-gray-200'}`}>
                  <div className="flex items-start gap-3">
                    <button onClick={() => togglePipelineStage(s.id, s.is_completed)}
                      className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${s.is_completed ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 hover:border-gold'}`}>
                      {s.is_completed && <CheckCircle2 size={12} className="text-white" />}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-body text-xs font-bold text-midnight">{s.client_label}</p>
                        {isCurrent && <span className="text-[9px] bg-gold text-midnight px-1.5 py-0.5 rounded-full font-bold">المرحلة الحالية</span>}
                        {c && <span className="font-body text-[9px] text-gold">{c.case_code}</span>}
                      </div>
                      <p className="font-body text-[10px] text-ink/40 mt-0.5">{s.internal_label}</p>
                      {s.completed_at && <p className="font-body text-[10px] text-emerald-600 mt-1">اكتملت في: {formatDate(s.completed_at)}</p>}
                      {s.notes && <p className="font-body text-xs text-ink/50 mt-2 bg-gray-50 rounded-lg p-2">{s.notes}</p>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ═══ CASE TREE TAB ═══ */}
      {activeTab === 'case_tree' && (
        <div className="space-y-2">
          {allTreeNodes.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><GitBranch size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد عقد شجرة قضية</p></div>
          ) : (
            allTreeNodes.map((n) => {
              const nCfg = NODE_TYPE_CONFIG[n.node_type] || { bg: 'bg-gray-100', text: 'text-gray-600', icon: FileText };
              const NIcon = nCfg.icon;
              const c = cases.find((c) => c.id === n.scm_case_id);
              return (
                <div key={n.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${nCfg.bg}`}>
                        <NIcon size={14} className={nCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${nCfg.bg} ${nCfg.text}`}>{NODE_TYPE_LABELS[n.node_type] || n.node_type}</span>
                          {n.encrypted && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Lock size={8} /> مشفر</span>}
                          {c && <span className="font-body text-[9px] text-gold">{c.case_code}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{n.node_title}</p>
                        {n.node_content && <p className="font-body text-[10px] text-ink/50 mt-1 leading-relaxed line-clamp-2">{n.node_content}</p>}
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(n.id); setDeleteType('tree_node'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ═══ DEADLINES TAB (merged M10 + SCM) ═══ */}
      {activeTab === 'deadlines' && (
        <div className="space-y-2">
          {(() => {
            const m10Dls = allM10Deadlines.map((d) => ({ id: d.id, label: d.deadline_label, date: d.deadline_date, type: d.deadline_type, source: 'M10' as const, case_id: d.scm_case_id, statutory: d.statutory_basis, auto: d.auto_calculated, status: d.status }));
            const scmDls = allScmDeadlines.map((d) => ({ id: d.id, label: d.deadline_type, date: d.deadline_date, type: d.deadline_type, source: 'SCM' as const, case_id: d.case_id, statutory: d.legal_basis, auto: false, status: daysUntil(new Date(d.deadline_date)) < 0 ? 'past' : 'upcoming' }));
            const merged = [...m10Dls, ...scmDls].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            if (merged.length === 0) return (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><Calendar size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد مواعيد إجرائية</p></div>
            );
            return merged.map((d) => {
              const daysLeft = Math.ceil((new Date(d.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              const isUrgent = daysLeft <= 7 && daysLeft >= 0;
              const isNear = daysLeft <= 30 && daysLeft > 7;
              const c = cases.find((c) => c.id === d.case_id);
              const waterfall = getWaterfallAlert(daysLeft);
              return (
                <div key={d.id + d.source} className={`bg-white rounded-xl border shadow-sm p-4 hover:border-gold/30 transition-colors ${d.status === 'completed' || d.status === 'past' ? 'border-red-200' : isUrgent ? 'border-red-200' : isNear ? 'border-amber-200' : 'border-gray-200'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${d.status === 'completed' ? 'bg-green-50' : isUrgent ? 'bg-red-50' : isNear ? 'bg-amber-50' : 'bg-blue-50'}`}>
                      <Calendar size={14} className={d.status === 'completed' ? 'text-green-600' : isUrgent ? 'text-red-600' : isNear ? 'text-amber-600' : 'text-blue-600'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-body text-xs font-bold text-midnight">{d.label}</p>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{DEADLINE_TYPE_LABELS[d.type] || d.type}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${d.source === 'M10' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>{d.source}</span>
                        {c && <span className="font-body text-[9px] text-gold">{c.case_code}</span>}
                        {d.status !== 'completed' && d.status !== 'past' && (
                          <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${isUrgent ? 'bg-red-50 text-red-600' : isNear ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                            <Clock size={9} /> {daysLeft > 0 ? daysLeft + ' يوم' : 'متأخر'}
                          </span>
                        )}
                        {d.statutory && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Scale size={8} /> {d.statutory}</span>}
                        {d.auto && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/40"><Zap size={8} /> آلي</span>}
                      </div>
                      {/* Waterfall alert */}
                      {d.status !== 'completed' && d.status !== 'past' && (
                        <div className={`mt-2 rounded-lg p-2 flex items-start gap-2 ${waterfall.level === 'critical' ? 'bg-red-50' : waterfall.level === 'urgent' ? 'bg-orange-50' : waterfall.level === 'warning' ? 'bg-amber-50' : 'bg-blue-50'}`}>
                          <AlertTriangle size={11} className={`mt-0.5 ${waterfall.level === 'critical' ? 'text-red-500' : waterfall.level === 'urgent' ? 'text-orange-500' : 'text-amber-500'}`} />
                          <p className="font-body text-[9px] text-ink/60">{waterfall.message}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* ═══ DEFENSE DRAFTS TAB ═══ */}
      {activeTab === 'defense_drafts' && (
        <div className="space-y-2">
          {allDrafts.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><Gavel size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد مسودات دفوع</p></div>
          ) : (
            allDrafts.map((d) => {
              const cfg = REVIEW_STATUS_CONFIG[d.review_status] || REVIEW_STATUS_CONFIG.draft;
              const c = cases.find((c) => c.id === d.scm_case_id);
              return (
                <div key={d.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                        <Gavel size={14} className="text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{DRAFT_TYPE_LABELS[d.draft_type] || d.draft_type}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                          <span className="font-body text-[9px] text-ink/40">v{d.version}</span>
                          {c && <span className="font-body text-[9px] text-gold">{c.case_code}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{d.draft_title}</p>
                        {d.draft_content && <p className="font-body text-[10px] text-ink/50 mt-1 leading-relaxed line-clamp-2">{d.draft_content}</p>}
                        {d.legal_gaps_identified && (
                          <div className="flex items-center gap-1 mt-2">
                            <AlertTriangle size={10} className="text-amber-500" />
                            <span className="font-body text-[9px] text-amber-600 line-clamp-1">{d.legal_gaps_identified}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(d.id); setDeleteType('draft'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ═══ EVIDENCE TAB ═══ */}
      {activeTab === 'evidence' && (
        <div className="space-y-2">
          {allEvidence.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><Shield size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد مستندات في سلسلة الأدلة</p></div>
          ) : (
            allEvidence.map((e) => {
              const c = cases.find((c) => c.id === e.case_id);
              return (
                <div key={e.id} className="bg-white rounded-xl border border-gray-200 p-4 group">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <FileText size={16} className="text-ink/50" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-xs font-bold text-midnight">{e.name}</p>
                        <p className="font-body text-[10px] text-ink/40 mt-0.5">{e.doc_type} • نسخة {e.version_number} {c && `• ${c.case_code}`}</p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${e.visibility === 'restricted' ? 'bg-red-100 text-red-600' : e.visibility === 'client' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600'}`}>
                      {e.visibility === 'restricted' ? 'مقيّد' : e.visibility === 'client' ? 'عميل' : 'فريق'}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                    <Fingerprint size={11} className="text-ink/40 flex-shrink-0" />
                    <p className="font-body text-[10px] text-ink/50 font-mono truncate">{e.file_hash || '—'}</p>
                  </div>
                  {e.uploaded_by && <p className="font-body text-[10px] text-ink/40 mt-1.5">رُفع بواسطة: {e.uploaded_by} • {formatDate(e.uploaded_at)}</p>}
                  {e.description && <p className="font-body text-xs text-ink/50 mt-1.5">{e.description}</p>}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button onClick={() => { setDeleteId(e.id); setDeleteType('evidence'); }} className="flex items-center gap-1 px-2.5 py-1 rounded-md text-red-500 font-body text-[10px] font-bold hover:bg-red-50 transition-colors">
                      <Trash2 size={11} /> حذف
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ═══ PRECEDENTS TAB ═══ */}
      {activeTab === 'precedents' && (
        <div className="space-y-2">
          {allPrecedents.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><BookMarked size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد سوابق قانونية مسجلة</p></div>
          ) : (
            allPrecedents.map((p) => {
              const c = cases.find((c) => c.id === p.case_id);
              return (
                <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4 group">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
                      <Star size={16} className="text-gold" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-heading font-bold text-midnight text-sm">{p.title}</h4>
                        {c && <span className="font-body text-[9px] text-gold">{c.case_code}</span>}
                      </div>
                      <p className="font-body text-xs text-ink/60 mt-1.5 leading-relaxed">{p.argument_text}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 font-bold">{p.legal_area}</span>
                        {p.outcome && <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 font-bold">{p.outcome}</span>}
                        {p.anonymized && <span className="text-[9px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-bold flex items-center gap-1"><ShieldCheck size={9} />إزالة البيانات</span>}
                      </div>
                      {p.flagged_by && <p className="font-body text-[10px] text-ink/40 mt-1.5">عُلّم بواسطة: {p.flagged_by}</p>}
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

      {/* ═══ TEAM TAB ═══ */}
      {activeTab === 'team' && (
        <div className="space-y-3">
          <div className="bg-midnight rounded-lg px-4 py-3 flex items-center gap-2">
            <ShieldAlert size={14} className="text-gold" />
            <p className="font-body text-xs text-cream">الجدار الصيني الرقمي — فقط الأعضاء المُدرجون يستطيعون رؤية تفاصيل القضية</p>
          </div>
          {allTeam.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><UserCheck size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا يوجد أعضاء</p></div>
          ) : (
            allTeam.map((m) => {
              const c = cases.find((c) => c.id === m.case_id);
              return (
                <div key={m.id} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3 group">
                  <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                    <UserCheck size={16} className="text-gold" />
                  </div>
                  <div className="flex-1">
                    <p className="font-body text-xs text-midnight font-bold">{m.member_name}</p>
                    <p className="font-body text-[10px] text-ink/40">{m.member_role} {c && `• ${c.case_code}`}</p>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 font-bold">{m.access_level}</span>
                  <button onClick={() => { setDeleteId(m.id); setDeleteType('team'); }} className="text-red-400 hover:bg-red-50 rounded p-1 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ═══ AUDIT TAB (merged M10 + SCM) ═══ */}
      {activeTab === 'audit' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={14} className="text-gold" />
            <span className="font-heading font-bold text-midnight text-sm">سجل التدقيق الموحد (M10 ZK-Audit + SCM Audit)</span>
            <span className="font-body text-[10px] text-ink/30">— {mergedAudit.length} عملية مسجلة</span>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 flex items-center gap-2 mb-3">
            <Lock size={14} className="text-red-600" />
            <p className="font-body text-xs text-red-700">سجل تدقيق غير قابل للتعديل (Append-Only Ledger) — كل عملية مسجلة بالوقت والاسم وعنوان IP و MAC</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {mergedAudit.map((log) => (
                <div key={log.id + log.source} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {log.action.includes('created') ? <FileText size={12} className="text-blue-600" />
                      : log.action.includes('encryption') ? <Lock size={12} className="text-purple-600" />
                      : log.action.includes('tree') ? <GitBranch size={12} className="text-blue-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m92') ? <Send size={12} className="text-amber-600" />
                      : log.action.includes('m52') ? <Mail size={12} className="text-purple-600" />
                      : log.action.includes('deadline') ? <Calendar size={12} className="text-amber-600" />
                      : log.action.includes('defense') || log.action.includes('draft') ? <Gavel size={12} className="text-purple-600" />
                      : log.action.includes('stage') ? <ArrowRight size={12} className="text-green-600" />
                      : log.action === 'view' ? <Eye size={12} className="text-ink/40" />
                      : log.action === 'download' ? <Download size={12} className="text-ink/40" />
                      : log.action === 'upload' ? <Upload size={12} className="text-ink/40" />
                      : <Activity size={12} className="text-ink/40" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-body text-[10px] font-bold text-midnight">{log.action}</span>
                      <span className={`px-1 py-0.5 rounded text-[8px] font-body font-bold ${log.source === 'm10' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>{log.source === 'm10' ? 'M10' : 'SCM'}</span>
                      {log.actor && <span className="font-body text-[9px] text-ink/40">{log.actor}</span>}
                      {log.immutable && <span className="flex items-center gap-0.5 font-body text-[9px] text-green-600"><Lock size={8} /> ثابت</span>}
                    </div>
                    {log.detail && <p className="font-body text-[10px] text-ink/50 leading-relaxed mt-0.5">{log.detail}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-body text-[9px] text-ink/30">{new Date(log.created_at).toLocaleString('ar-EG')}</span>
                      {log.ip && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/30"><Fingerprint size={8} /> {log.ip}</span>}
                      {log.hash && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/30"><Lock size={8} /> {log.hash}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ CASE DETAIL DRAWER ═══ */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedCase(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Brain size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">نواة القضية الذكية الموحدة</span>
              </div>
              <button onClick={() => setSelectedCase(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-gold animate-spin" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {/* Header badges */}
                <div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="font-body text-[10px] font-bold text-gold">{selectedCase.case_code}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedCase.m10_stage || 'tree_construction'] || STAGE_CONFIG.tree_construction).bg} ${(STAGE_CONFIG[selectedCase.m10_stage || 'tree_construction'] || STAGE_CONFIG.tree_construction).text}`}>
                      {(STAGE_CONFIG[selectedCase.m10_stage || 'tree_construction'] || STAGE_CONFIG.tree_construction).label}
                    </span>
                    {(() => {
                      const omCfg = OPERATING_MODE_CONFIG[selectedCase.operating_mode || 'law_firms'] || OPERATING_MODE_CONFIG.law_firms;
                      const OmIcon = omCfg.icon;
                      return <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-body font-bold ${omCfg.bg} ${omCfg.text}`}><OmIcon size={10} /> {omCfg.label}</span>;
                    })()}
                    {(() => {
                      const triage = TRIAGE_STYLES[selectedCase.triage_lane];
                      return <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold border ${triage.bg} ${triage.text} ${triage.border}`}>{triage.label}</span>;
                    })()}
                    {selectedCase.confidentiality !== 'standard' && (() => {
                      const conf = CONFIDENTIALITY_STYLES[selectedCase.confidentiality];
                      return <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${conf.bg} ${conf.text}`}>{conf.label}</span>;
                    })()}
                    {selectedCase.source_engine && <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-body bg-blue-50 text-blue-600"><FileText size={10} /> {SOURCE_ENGINE_LABELS[selectedCase.source_engine] || selectedCase.source_engine}</span>}
                    {selectedCase.case_tree_encrypted && <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-body bg-purple-50 text-purple-600"><Lock size={10} /> AES-256</span>}
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedCase.title}</h3>
                </div>

                {/* M10 Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.tree_construction;
                      const stageIdx = STAGES.indexOf(selectedCase.m10_stage || 'tree_construction');
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
                  {selectedCase.m10_stage !== STAGES[STAGES.length - 1] && (
                    <button onClick={() => advanceStage(selectedCase)} className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
                      <ArrowRight size={12} /> الانتقال للمرحلة التالية
                    </button>
                  )}
                </div>

                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-body text-[10px] font-bold text-midnight">ربط بالقضايا القانونية</p>
                      <p className="font-body text-[9px] text-ink/50">فتح المكتبة مع سياق تلقائي من هذه القضية</p>
                    </div>
                    <button
                      onClick={() => {
                        openLibrary({
                          caseContext: {
                            caseId: selectedCase.id,
                            caseNumber: selectedCase.case_number || undefined,
                            title: selectedCase.title,
                            legalBasis: selectedCase.legal_basis || undefined,
                            court: selectedCase.court || undefined,
                            courtCircuit: selectedCase.court_circuit || undefined,
                            caseCategory: selectedCase.case_category || undefined,
                            factsSummary: selectedCase.facts_summary || undefined,
                            partiesSummary: selectedCase.parties_summary || undefined,
                          },
                        });
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-midnight text-cream font-body text-[10px] font-bold hover:bg-midnight-light transition-colors"
                    >
                      <BookOpen size={11} /> افتح المكتبة
                    </button>
                  </div>
                </div>

                {/* SCM Pipeline progress */}
                {stages.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-body text-[10px] font-bold text-midnight">المسار التخصصي (SCM)</p>
                      {selectedCase.current_stage_index < stages.length - 1 && (
                        <button onClick={advancePipelineStage} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors">
                          <Zap size={10} /> التالي
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {stages.map((s, i) => {
                        const isCurrent = i === selectedCase.current_stage_index;
                        const isDone = s.is_completed;
                        return (
                          <div key={s.id} className="flex-1">
                            <div className={`h-2 rounded-full transition-all ${isDone ? 'bg-emerald-500' : isCurrent ? 'bg-gold' : 'bg-gray-200'}`} />
                            <p className={`font-body text-[10px] mt-1.5 leading-tight ${isDone ? 'text-emerald-700 font-bold' : isCurrent ? 'text-gold font-bold' : 'text-ink/30'}`}>{s.client_label}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Success probability gauge */}
                {selectedCase.success_probability > 0 && (
                  <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="relative w-14 h-14 flex-shrink-0">
                      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15" fill="none" stroke={selectedCase.success_probability > 70 ? '#22c55e' : selectedCase.success_probability > 40 ? '#f59e0b' : '#ef4444'} strokeWidth="3" strokeDasharray={`${(selectedCase.success_probability / 100) * 94.2} 94.2`} strokeLinecap="round" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center font-heading font-bold text-midnight text-sm">{selectedCase.success_probability.toFixed(0)}%</span>
                    </div>
                    <div>
                      <p className="font-body text-[10px] font-bold text-midnight">احتمالية نجاح القضية</p>
                      <p className="font-body text-[9px] text-ink/40">بناءً على تحليل السوابق والأساس القانوني</p>
                    </div>
                  </div>
                )}

                {/* Case info grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <span className="font-body text-[9px] text-ink/40">الفئة</span>
                    <p className="font-body text-xs font-bold text-midnight">{CATEGORY_LABELS[selectedCase.case_category || ''] || selectedCase.case_category || '—'}</p>
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
                    <span className="font-body text-[9px] text-ink/40">الموكل</span>
                    <p className="font-body text-xs font-bold text-midnight">{selectedCase.client_name || '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <span className="font-body text-[9px] text-ink/40">الخصم</span>
                    <p className="font-body text-xs font-bold text-midnight">{selectedCase.opposing_party || '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <span className="font-body text-[9px] text-ink/40">رقم القضية</span>
                    <p className="font-body text-xs font-bold text-midnight">{selectedCase.case_number || '—'}</p>
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
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">القيمة المالية</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedCase.financial_value)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المحرك المالي</span><p className="font-body text-xs font-bold text-midnight">{selectedCase.m54_cost_center_opened ? 'مفتوح (M54)' : 'غير مفتوح'}</p></div>
                  </div>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m54_cost_center_opened ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedCase.m54_cost_center_opened ? 'مفتوح' : 'غير مفتوح'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m92_task_distributed ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Send size={10} /> M92 {selectedCase.m92_task_distributed ? 'موزع' : 'غير موزع'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m52_notified ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Mail size={10} /> M52 {selectedCase.m52_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                </div>

                {/* M10 info: facts, legal basis, parties, evidence */}
                {(selectedCase.facts_summary || selectedCase.legal_basis || selectedCase.parties_summary || selectedCase.evidence_summary) && (
                  <div className="space-y-2">
                    {selectedCase.facts_summary && (
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                        <div className="flex items-center gap-1.5 mb-1"><FileText size={12} className="text-blue-600" /><span className="font-body text-[10px] font-bold text-blue-700">الوقائع</span></div>
                        <p className="font-body text-[10px] text-blue-600 leading-relaxed">{selectedCase.facts_summary}</p>
                      </div>
                    )}
                    {selectedCase.legal_basis && (
                      <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                        <div className="flex items-center gap-1.5 mb-1"><Scale size={12} className="text-green-600" /><span className="font-body text-[10px] font-bold text-green-700">الأساس القانوني</span></div>
                        <p className="font-body text-[10px] text-green-600 leading-relaxed">{selectedCase.legal_basis}</p>
                      </div>
                    )}
                    {selectedCase.parties_summary && (
                      <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                        <div className="flex items-center gap-1.5 mb-1"><Users size={12} className="text-purple-600" /><span className="font-body text-[10px] font-bold text-purple-700">الأطراف</span></div>
                        <p className="font-body text-[10px] text-purple-600 leading-relaxed">{selectedCase.parties_summary}</p>
                      </div>
                    )}
                    {selectedCase.evidence_summary && (
                      <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                        <div className="flex items-center gap-1.5 mb-1"><Shield size={12} className="text-amber-600" /><span className="font-body text-[10px] font-bold text-amber-700">الأدلة</span></div>
                        <p className="font-body text-[10px] text-amber-600 leading-relaxed">{selectedCase.evidence_summary}</p>
                      </div>
                    )}
                  </div>
                )}

                {(selectedCase as unknown as { description?: string }).description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{(selectedCase as unknown as { description?: string }).description}</p></div>
                )}

                {/* Case tree nodes (M10) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><GitBranch size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">شجرة القضية (M10)</span></div>
                    <button onClick={() => setNodeModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> إضافة عقدة</button>
                  </div>
                  <div className="space-y-1.5">
                    {treeNodes.map((n) => {
                      const nCfg = NODE_TYPE_CONFIG[n.node_type] || { bg: 'bg-gray-100', text: 'text-gray-600', icon: FileText };
                      const NIcon = nCfg.icon;
                      const children = treeNodes.filter((c) => c.parent_node_id === n.id);
                      return (
                        <div key={n.id}>
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/node">
                            <NIcon size={12} className={nCfg.text} />
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${nCfg.bg} ${nCfg.text}`}>{NODE_TYPE_LABELS[n.node_type] || n.node_type}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-body text-[10px] font-bold text-midnight">{n.node_title}</p>
                              {n.node_content && <p className="font-body text-[9px] text-ink/50 line-clamp-1">{n.node_content}</p>}
                            </div>
                            {n.encrypted && <Lock size={9} className="text-purple-400" />}
                            <button onClick={() => { setDeleteId(n.id); setDeleteType('tree_node'); }} className="p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/node:opacity-100 transition-all"><Trash2 size={10} /></button>
                          </div>
                          {children.length > 0 && (
                            <div className="mr-4 mt-1 space-y-1 border-r border-gray-100 pr-2">
                              {children.map((child) => {
                                const cCfg = NODE_TYPE_CONFIG[child.node_type] || { bg: 'bg-gray-100', text: 'text-gray-600', icon: FileText };
                                const CIcon = cCfg.icon;
                                return (
                                  <div key={child.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-50/50 border border-gray-50 group/cnode">
                                    <CIcon size={10} className={cCfg.text} />
                                    <span className={`px-1 py-0.5 rounded text-[8px] font-body ${cCfg.bg} ${cCfg.text}`}>{NODE_TYPE_LABELS[child.node_type] || child.node_type}</span>
                                    <p className="font-body text-[9px] font-bold text-midnight flex-1">{child.node_title}</p>
                                    {child.encrypted && <Lock size={8} className="text-purple-400" />}
                                    <button onClick={() => { setDeleteId(child.id); setDeleteType('tree_node'); }} className="p-0.5 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/cnode:opacity-100 transition-all"><Trash2 size={9} /></button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {treeNodes.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد عقد شجرة</p>}
                  </div>
                </div>

                {/* Deadlines (M10) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><Calendar size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">المواعيد الإجرائية (M10)</span></div>
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

                {/* SCM Deadlines with waterfall */}
                {scmDeadlines.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2"><Clock size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">مواعيد SCM (محرك المهل)</span></div>
                    <div className="space-y-1.5">
                      {scmDeadlines.map((d) => {
                        const daysLeft = daysUntil(new Date(d.deadline_date));
                        const waterfall = getWaterfallAlert(daysLeft);
                        const alert = ALERT_STYLES[d.alert_level] || ALERT_STYLES.info;
                        return (
                          <div key={d.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-body text-[10px] font-bold text-midnight">{d.deadline_type}</p>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${alert.bg} ${alert.text} ${alert.border}`}>{daysLeft < 0 ? 'فات' : alert.label}</span>
                            </div>
                            <p className="font-body text-[9px] text-ink/40">{formatDate(d.deadline_date)} — {daysLeft < 0 ? `فات بـ ${Math.abs(daysLeft)} يوم` : `${daysLeft} يوم متبقي`}</p>
                            <div className={`mt-1 rounded p-1.5 flex items-start gap-1 ${waterfall.level === 'critical' ? 'bg-red-50' : waterfall.level === 'urgent' ? 'bg-orange-50' : waterfall.level === 'warning' ? 'bg-amber-50' : 'bg-blue-50'}`}>
                              <AlertTriangle size={10} className={`mt-0.5 ${waterfall.level === 'critical' ? 'text-red-500' : waterfall.level === 'urgent' ? 'text-orange-500' : 'text-amber-500'}`} />
                              <p className="font-body text-[9px] text-ink/60">{waterfall.message}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Defense drafts (M10) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><Gavel size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">مسودات الدفوع (M10)</span></div>
                    <button onClick={() => setDraftModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> توليد مسودة</button>
                  </div>
                  <div className="space-y-1.5">
                    {defenseDrafts.map((d) => {
                      const cfg = REVIEW_STATUS_CONFIG[d.review_status] || REVIEW_STATUS_CONFIG.draft;
                      return (
                        <div key={d.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/draft">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-200 text-ink/50">{DRAFT_TYPE_LABELS[d.draft_type] || d.draft_type}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                            <span className="font-body text-[9px] text-ink/30">v{d.version}</span>
                            <div className="flex-1" />
                            {d.review_status === 'draft' && <button onClick={() => reviewDraft(d, 'under_review')} className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 font-body text-[9px] font-bold hover:bg-amber-100 transition-colors">مراجعة</button>}
                            {d.review_status === 'under_review' && <button onClick={() => reviewDraft(d, 'approved')} className="px-1.5 py-0.5 rounded bg-green-50 text-green-600 font-body text-[9px] font-bold hover:bg-green-100 transition-colors">اعتماد</button>}
                            <button onClick={() => { setDeleteId(d.id); setDeleteType('draft'); }} className="p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/draft:opacity-100 transition-all"><Trash2 size={10} /></button>
                          </div>
                          <p className="font-body text-[10px] font-bold text-midnight">{d.draft_title}</p>
                          {d.draft_content && <p className="font-body text-[9px] text-ink/50 mt-0.5 leading-tight line-clamp-2">{d.draft_content}</p>}
                          {d.legal_gaps_identified && <p className="font-body text-[9px] text-amber-600 mt-1 flex items-center gap-1"><AlertTriangle size={8} /> {d.legal_gaps_identified}</p>}
                        </div>
                      );
                    })}
                    {defenseDrafts.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد مسودات دفوع</p>}
                  </div>
                </div>

                {/* Evidence (SCM) */}
                {evidence.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5"><Shield size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">سلسلة الأدلة (SCM)</span></div>
                      <button onClick={() => setEvidenceModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> رفع مستند</button>
                    </div>
                    <div className="space-y-1.5">
                      {evidence.map((e) => (
                        <div key={e.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText size={10} className="text-ink/40" />
                            <p className="font-body text-[10px] font-bold text-midnight flex-1">{e.name}</p>
                            <span className={`text-[8px] px-1 py-0.5 rounded-full ${e.visibility === 'restricted' ? 'bg-red-100 text-red-600' : e.visibility === 'client' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600'}`}>{e.visibility === 'restricted' ? 'مقيّد' : e.visibility === 'client' ? 'عميل' : 'فريق'}</span>
                          </div>
                          <div className="flex items-center gap-1 bg-gray-100 rounded p-1">
                            <Fingerprint size={9} className="text-ink/40" />
                            <p className="font-body text-[8px] text-ink/50 font-mono truncate">{e.file_hash || '—'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Precedents (SCM) */}
                {precedents.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2"><BookMarked size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">السوابق القانونية (SCM)</span></div>
                    <div className="space-y-1.5">
                      {precedents.map((p) => (
                        <div key={p.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
                          <p className="font-body text-[10px] font-bold text-midnight">{p.title}</p>
                          <p className="font-body text-[9px] text-ink/50 mt-0.5 line-clamp-2">{p.argument_text}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[8px] px-1 py-0.5 rounded bg-blue-100 text-blue-600">{p.legal_area}</span>
                            {p.outcome && <span className="text-[8px] px-1 py-0.5 rounded bg-emerald-100 text-emerald-600">{p.outcome}</span>}
                            {p.anonymized && <span className="text-[8px] flex items-center gap-0.5"><ShieldCheck size={8} className="text-gray-400" /> إزالة</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Team (SCM Chinese Wall) */}
                {team.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2"><UserCheck size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">فريق القضية — الجدار الصيني (SCM)</span></div>
                    <div className="space-y-1.5">
                      {team.map((m) => (
                        <div key={m.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/tm">
                          <UserCheck size={10} className="text-gold" />
                          <div className="flex-1">
                            <p className="font-body text-[10px] font-bold text-midnight">{m.member_name}</p>
                            <p className="font-body text-[9px] text-ink/40">{m.member_role}</p>
                          </div>
                          <span className="text-[8px] px-1 py-0.5 rounded bg-emerald-100 text-emerald-600">{m.access_level}</span>
                          <button onClick={() => { setDeleteId(m.id); setDeleteType('team'); }} className="p-0.5 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/tm:opacity-100 transition-all"><X size={10} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audit trail (merged) */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2"><History size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">سجل التدقيق الموحد</span></div>
                  <div className="space-y-1.5">
                    {[...auditLogs.map((a) => ({ id: a.id, action: a.action, detail: a.detail, actor: a.actor, created_at: a.created_at, source: 'M10' as const })),
                      ...scmAudit.map((a) => ({ id: a.id, action: a.action, detail: a.action_detail, actor: a.actor_name, created_at: a.created_at, source: 'SCM' as const }))]
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .slice(0, 20)
                      .map((log) => (
                      <div key={log.id + log.source} className="flex items-start gap-2 text-[10px]">
                        <div className="w-1.5 h-1.5 rounded-full bg-gold/40 mt-1 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center gap-1">
                            <span className="font-body text-ink/60">{log.action}</span>
                            <span className={`px-1 py-0.5 rounded text-[7px] font-body font-bold ${log.source === 'M10' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>{log.source}</span>
                          </div>
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

      {/* ═══ CASE CREATE/EDIT MODAL ═══ */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل القضية الذكية' : 'قضية ذكية جديدة'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم القضية"><TextInput value={form.case_number} onChange={(e) => setForm({ ...form, case_number: e.target.value })} placeholder="2025-001" /></Field>
          <Field label="الفئة">
            <Select value={form.case_category} onChange={(e) => setForm({ ...form, case_category: e.target.value })}>
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان القضية" required><TextInput value={form.case_title} onChange={(e) => setForm({ ...form, case_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المسار التخصصي (SCM)">
            <Select value={form.pipeline_type} onChange={(e) => setForm({ ...form, pipeline_type: e.target.value })}>
              {PIPELINE_TYPES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </Select>
          </Field>
          <Field label="المسار اللوني">
            <Select value={form.triage_lane} onChange={(e) => setForm({ ...form, triage_lane: e.target.value })}>
              <option value="green">أخضر — روتيني</option>
              <option value="yellow">أصفر — استشاري</option>
              <option value="red">أحمر — طوارئ</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="مستوى السرية">
            <Select value={form.confidentiality} onChange={(e) => setForm({ ...form, confidentiality: e.target.value })}>
              <option value="standard">عادي</option>
              <option value="restricted">مقيّد</option>
              <option value="top_secret">سري للغاية</option>
            </Select>
          </Field>
          <Field label="وضع التشغيل (M10)">
            <Select value={form.operating_mode} onChange={(e) => setForm({ ...form, operating_mode: e.target.value })}>
              {Object.entries(OPERATING_MODE_CONFIG).map(([v, l]) => <option key={v} value={v}>{l.label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المرحلة (M10)">
            <Select value={form.m10_stage} onChange={(e) => setForm({ ...form, m10_stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
          <Field label="المحرك المصدر">
            <Select value={form.source_engine} onChange={(e) => setForm({ ...form, source_engine: e.target.value })}>
              <option value="">— يدوي —</option>
              {Object.entries(SOURCE_ENGINE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المحكمة"><TextInput value={form.court} onChange={(e) => setForm({ ...form, court: e.target.value })} /></Field>
          <Field label="الدائرة"><TextInput value={form.court_circuit} onChange={(e) => setForm({ ...form, court_circuit: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم الموكل"><TextInput value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} /></Field>
          <Field label="الخصم"><TextInput value={form.opposing_party} onChange={(e) => setForm({ ...form, opposing_party: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نوع الموكل">
            <Select value={form.client_type} onChange={(e) => setForm({ ...form, client_type: e.target.value })}>
              <option value="individual">فرد</option>
              <option value="company">شركة</option>
              <option value="government">جهة حكومية</option>
            </Select>
          </Field>
          <Field label="المحامي المسؤول">
            <Select value={form.assigned_attorney_id} onChange={(e) => setForm({ ...form, assigned_attorney_id: e.target.value })}>
              <option value="">— اختر —</option>
              {attorneys.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ القيد"><TextInput type="date" value={form.filing_date} onChange={(e) => setForm({ ...form, filing_date: e.target.value })} /></Field>
          <Field label="تاريخ الجلسة القادمة"><TextInput type="date" value={form.next_hearing_date} onChange={(e) => setForm({ ...form, next_hearing_date: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="احتمالية النجاح %"><TextInput type="number" value={form.success_probability} onChange={(e) => setForm({ ...form, success_probability: e.target.value })} /></Field>
          <Field label="القيمة المالية"><TextInput type="number" value={form.financial_value} onChange={(e) => setForm({ ...form, financial_value: e.target.value })} /></Field>
        </div>
        <Field label="الوقائع"><TextArea value={form.facts_summary} onChange={(e) => setForm({ ...form, facts_summary: e.target.value })} rows={3} /></Field>
        <Field label="الأساس القانوني"><TextArea value={form.legal_basis} onChange={(e) => setForm({ ...form, legal_basis: e.target.value })} rows={3} /></Field>
        <Field label="الأطراف"><TextArea value={form.parties_summary} onChange={(e) => setForm({ ...form, parties_summary: e.target.value })} rows={2} /></Field>
        <Field label="الأدلة"><TextArea value={form.evidence_summary} onChange={(e) => setForm({ ...form, evidence_summary: e.target.value })} rows={2} /></Field>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></Field>
      </EntityModal>

      {/* Tree node modal */}
      <EntityModal open={nodeModalOpen} title="إضافة عقدة شجرة" onClose={() => setNodeModalOpen(false)} onSubmit={addTreeNode}>
        <Field label="نوع العقدة" required>
          <Select value={nodeForm.node_type} onChange={(e) => setNodeForm({ ...nodeForm, node_type: e.target.value })}>
            {Object.entries(NODE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="عنوان العقدة" required><TextInput value={nodeForm.node_title} onChange={(e) => setNodeForm({ ...nodeForm, node_title: e.target.value })} /></Field>
        <Field label="العقدة الأم">
          <Select value={nodeForm.parent_node_id} onChange={(e) => setNodeForm({ ...nodeForm, parent_node_id: e.target.value })}>
            <option value="">— جذر —</option>
            {treeNodes.filter((n) => !n.parent_node_id).map((n) => <option key={n.id} value={n.id}>{n.node_title}</option>)}
          </Select>
        </Field>
        <Field label="المحتوى"><TextArea value={nodeForm.node_content} onChange={(e) => setNodeForm({ ...nodeForm, node_content: e.target.value })} rows={4} /></Field>
      </EntityModal>

      {/* Deadline modal */}
      <EntityModal open={deadlineModalOpen} title="إضافة موعد إجرائي" onClose={() => setDeadlineModalOpen(false)} onSubmit={addDeadline}>
        <Field label="نوع الموعد" required>
          <Select value={deadlineForm.deadline_type} onChange={(e) => setDeadlineForm({ ...deadlineForm, deadline_type: e.target.value })}>
            {Object.entries(DEADLINE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="الوصف" required><TextInput value={deadlineForm.deadline_label} onChange={(e) => setDeadlineForm({ ...deadlineForm, deadline_label: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="التاريخ" required><TextInput type="date" value={deadlineForm.deadline_date} onChange={(e) => setDeadlineForm({ ...deadlineForm, deadline_date: e.target.value })} /></Field>
          <Field label="أيام من القيد"><TextInput type="number" value={deadlineForm.days_from_filing} onChange={(e) => setDeadlineForm({ ...deadlineForm, days_from_filing: e.target.value })} /></Field>
        </div>
        <Field label="الأساس القانوني"><TextInput value={deadlineForm.statutory_basis} onChange={(e) => setDeadlineForm({ ...deadlineForm, statutory_basis: e.target.value })} /></Field>
      </EntityModal>

      {/* Defense draft modal */}
      <EntityModal open={draftModalOpen} title="توليد مسودة دفاع" onClose={() => setDraftModalOpen(false)} onSubmit={addDraft}>
        <Field label="عنوان المسودة" required><TextInput value={draftForm.draft_title} onChange={(e) => setDraftForm({ ...draftForm, draft_title: e.target.value })} /></Field>
        <Field label="نوع المسودة">
          <Select value={draftForm.draft_type} onChange={(e) => setDraftForm({ ...draftForm, draft_type: e.target.value })}>
            {Object.entries(DRAFT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="المحتوى"><TextArea value={draftForm.draft_content} onChange={(e) => setDraftForm({ ...draftForm, draft_content: e.target.value })} rows={5} /></Field>
        <Field label="الفجوات القانونية المكتشفة"><TextArea value={draftForm.legal_gaps_identified} onChange={(e) => setDraftForm({ ...draftForm, legal_gaps_identified: e.target.value })} rows={3} /></Field>
      </EntityModal>

      {/* Evidence modal */}
      <EntityModal open={evidenceModalOpen} title="رفع مستند لسلسلة الأدلة" onClose={() => setEvidenceModalOpen(false)} onSubmit={addEvidence}>
        <Field label="اسم المستند" required><TextInput value={evidenceForm.name} onChange={(e) => setEvidenceForm({ ...evidenceForm, name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نوع المستند">
            <Select value={evidenceForm.doc_type} onChange={(e) => setEvidenceForm({ ...evidenceForm, doc_type: e.target.value })}>
              {['مستند', 'صحيفة', 'حكم', 'عقد', 'مذكرة', 'مستند مالي', 'صورة', 'فيديو', 'تسجيل صوتي'].map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="مستوى الرؤية">
            <Select value={evidenceForm.visibility} onChange={(e) => setEvidenceForm({ ...evidenceForm, visibility: e.target.value })}>
              <option value="team">فريق القضية فقط</option>
              <option value="client">فريق + عميل</option>
              <option value="restricted">مقيّد (محامٍ شريك فقط)</option>
            </Select>
          </Field>
        </div>
        <Field label="رُفع بواسطة"><TextInput value={evidenceForm.uploaded_by} onChange={(e) => setEvidenceForm({ ...evidenceForm, uploaded_by: e.target.value })} placeholder="اسم المحامي" /></Field>
        <Field label="الوصف"><TextArea value={evidenceForm.description} onChange={(e) => setEvidenceForm({ ...evidenceForm, description: e.target.value })} rows={2} /></Field>
      </EntityModal>

      {/* Precedent modal */}
      <EntityModal open={precedentModalOpen} title="تعليم دفع كمرجع قانوني" onClose={() => setPrecedentModalOpen(false)} onSubmit={addPrecedent}>
        <Field label="عنوان الدفع" required><TextInput value={precedentForm.title} onChange={(e) => setPrecedentForm({ ...precedentForm, title: e.target.value })} /></Field>
        <Field label="نص الدفع القانوني" required><TextArea value={precedentForm.argument_text} onChange={(e) => setPrecedentForm({ ...precedentForm, argument_text: e.target.value })} rows={4} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المجال القانوني">
            <Select value={precedentForm.legal_area} onChange={(e) => setPrecedentForm({ ...precedentForm, legal_area: e.target.value })}>
              {['تجاري', 'عمالي', 'شركات', 'مدني', 'جنائي', 'عقاري', 'إداري', 'دستوري'].map((a) => <option key={a} value={a}>{a}</option>)}
            </Select>
          </Field>
          <Field label="النتيجة"><TextInput value={precedentForm.outcome} onChange={(e) => setPrecedentForm({ ...precedentForm, outcome: e.target.value })} placeholder="مثال: قبول الدفع" /></Field>
        </div>
        <Field label="عُلّم بواسطة"><TextInput value={precedentForm.flagged_by} onChange={(e) => setPrecedentForm({ ...precedentForm, flagged_by: e.target.value })} placeholder="اسم المحامي" /></Field>
      </EntityModal>

      {/* Team modal */}
      <EntityModal open={teamModalOpen} title="إضافة عضو لفريق القضية" onClose={() => setTeamModalOpen(false)} onSubmit={addTeamMember}>
        <Field label="اسم العضو" required><TextInput value={teamForm.member_name} onChange={(e) => setTeamForm({ ...teamForm, member_name: e.target.value })} /></Field>
        <Field label="الدور">
          <Select value={teamForm.member_role} onChange={(e) => setTeamForm({ ...teamForm, member_role: e.target.value })}>
            {['محامي', 'محامية مسؤولة', 'محامي مرافعة', 'محامٍ شريك مشرف', 'محامي صفقات', 'باحث قانوني', 'مدير نجاح العميل'].map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </Field>
        <Field label="مستوى الوصول">
          <Select value={teamForm.access_level} onChange={(e) => setTeamForm({ ...teamForm, access_level: e.target.value })}>
            <option value="full">كامل (رؤية + تعديل)</option>
            <option value="view">عرض فقط</option>
            <option value="restricted">مقيّد</option>
          </Select>
        </Field>
      </EntityModal>

      {/* Procedural Engine */}
      {proceduralEngineOpen && selectedCase && (
        <ProceduralEngine caseId={selectedCase.id} onClose={() => setProceduralEngineOpen(false)} onSaved={() => openCaseDetail(selectedCase)} />
      )}

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
