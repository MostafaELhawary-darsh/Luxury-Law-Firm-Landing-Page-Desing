import { useEffect, useState, useCallback } from 'react';
import {
  Gavel, Loader2, Plus, Pencil, Trash2, ChevronRight, X, FileText,
  Users, Calendar, Lock, Shield, Search, Fingerprint, Scale,
  CheckCircle2, Clock, AlertTriangle, Activity, Server, Eye,
  ScanLine, ShieldAlert, MapPin, UserCog, Landmark, Crosshair, Radio,
  Stethoscope, BrainCircuit,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

// ── Interfaces ──────────────────────────────────────────────────────────────

interface CriminalCase {
  id: string;
  case_number: string;
  case_title: string;
  crime_type: string;
  stage: string;
  court: string | null;
  filing_date: string | null;
  assigned_advisor_id: string | null;
  description: string | null;
  created_at: string;
  advisor?: { name: string } | null;
}

interface Investigation {
  id: string;
  case_id: string;
  investigation_type: string;
  investigator_name: string | null;
  investigation_date: string | null;
  location: string | null;
  findings: string | null;
  confidentiality_level: string;
  created_at: string;
}

interface Evidence {
  id: string;
  case_id: string;
  evidence_type: string;
  evidence_title: string;
  collected_from: string | null;
  collection_date: string | null;
  chain_of_custody: string | null;
  hash_fingerprint: string | null;
  notes: string | null;
  created_at: string;
}

interface CriminalAuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  accessed_fields: string | null;
  created_at: string;
}

interface ForensicReport {
  id: string;
  case_id: string;
  report_type: string;
  medical_examiner: string | null;
  examination_date: string | null;
  examination_location: string | null;
  findings: string | null;
  cause_of_death: string | null;
  injury_consistency: string | null;
  report_status: string;
  notes: string | null;
  created_at: string;
}

interface PsychiatricEvaluation {
  id: string;
  case_id: string;
  evaluator_name: string | null;
  evaluation_date: string | null;
  subject_name: string | null;
  mental_state: string;
  article_62_invoked: boolean;
  behavioral_notes: string | null;
  cognitive_assessment: string | null;
  volition_assessment: string | null;
  recommendation: string;
  report_status: string;
  notes: string | null;
  created_at: string;
}

interface ForgeryExamination {
  id: string;
  case_id: string;
  examiner_name: string | null;
  examination_date: string | null;
  document_type: string;
  questioned_features: string[] | null;
  ink_analysis: string | null;
  pressure_analysis: string | null;
  authenticity_score: number | null;
  finding_summary: string | null;
  recommended_action: string;
  report_status: string;
  notes: string | null;
  created_at: string;
}

type Tab = 'cases' | 'investigations' | 'evidence' | 'forensic' | 'psychiatric' | 'forgery' | 'audit';

// ── Config objects ───────────────────────────────────────────────────────────

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  investigation: { label: 'التحقيق', bg: 'bg-blue-50', text: 'text-blue-700' },
  trial: { label: 'المحاكمة', bg: 'bg-amber-50', text: 'text-amber-700' },
  appeal: { label: 'الاستئناف', bg: 'bg-purple-50', text: 'text-purple-700' },
  cassation: { label: 'النقض', bg: 'bg-indigo-50', text: 'text-indigo-700' },
  enforcement: { label: 'التنفيذ', bg: 'bg-green-50', text: 'text-green-700' },
};

const STAGES = ['investigation', 'trial', 'appeal', 'cassation', 'enforcement'];

const CRIME_TYPE_LABELS: Record<string, string> = {
  felony: 'جناية',
  misdemeanor: 'جنحة',
  contravention: 'مخالفة',
};

const INVESTIGATION_TYPE_LABELS: Record<string, string> = {
  interrogation: 'استجواب',
  confrontation: 'مواجهة',
  inspection: 'معاينة',
  wiretap: 'تنصت',
};

const CONFIDENTIALITY_LABELS: Record<string, string> = {
  confidential: 'سري',
  strictly_confidential: 'سري للغاية',
};

const EVIDENCE_TYPE_LABELS: Record<string, string> = {
  digital: 'رقمي',
  physical: 'مادي',
  testimonial: 'شهادة',
  documentary: 'مستندي',
};

const FORENSIC_TYPE_LABELS: Record<string, string> = {
  autopsy: 'تقرير تشريح', injury_analysis: 'تحليل إصابات',
  cause_of_death: 'سبب الوفاة', toxicology: 'سموم',
};
const INJURY_CONSISTENCY_LABELS: Record<string, string> = {
  consistent: 'متسق مع الأقوال', inconsistent: 'مناقض للأقوال', inconclusive: 'غير حاسم',
};
const MENTAL_STATE_LABELS: Record<string, string> = {
  sane: 'سليم الإدراك', impaired: 'إدراك مضطرب', insane: 'فاقد الإدراك',
};
const PSYCH_RECOMMENDATION_LABELS: Record<string, string> = {
  fit_for_trial: 'صالح للمحاكمة', unfit_for_trial: 'غير صالح للمحاكمة', conditional: 'مشروط',
};
const FORGERY_DOC_TYPE_LABELS: Record<string, string> = {
  contract: 'عقد', check: 'شيك', signature: 'توقيع', handwriting: 'خط يد', official_seal: 'ختم رسمي',
};
const FORGERY_ACTION_LABELS: Record<string, string> = {
  accept: 'قبول المستند', reject: 'رفض المستند', escalate: 'تصعيد للقضاء',
};

// ── Form types ──────────────────────────────────────────────────────────────

interface CaseForm {
  case_number: string;
  case_title: string;
  crime_type: string;
  stage: string;
  court: string;
  filing_date: string;
  assigned_advisor_id: string;
  description: string;
}

const emptyCaseForm: CaseForm = {
  case_number: '', case_title: '', crime_type: 'felony', stage: 'investigation',
  court: '', filing_date: '', assigned_advisor_id: '', description: '',
};

interface InvestigationForm {
  case_id: string;
  investigation_type: string;
  investigator_name: string;
  investigation_date: string;
  location: string;
  findings: string;
  confidentiality_level: string;
}

const emptyInvestigationForm: InvestigationForm = {
  case_id: '', investigation_type: 'interrogation', investigator_name: '',
  investigation_date: '', location: '', findings: '', confidentiality_level: 'confidential',
};

interface EvidenceForm {
  case_id: string;
  evidence_type: string;
  evidence_title: string;
  collected_from: string;
  collection_date: string;
  chain_of_custody: string;
  hash_fingerprint: string;
  notes: string;
}

const emptyEvidenceForm: EvidenceForm = {
  case_id: '', evidence_type: 'digital', evidence_title: '', collected_from: '',
  collection_date: '', chain_of_custody: '', hash_fingerprint: '', notes: '',
};

interface ForensicForm {
  case_id: string;
  report_type: string;
  medical_examiner: string;
  examination_date: string;
  examination_location: string;
  findings: string;
  cause_of_death: string;
  injury_consistency: string;
  report_status: string;
  notes: string;
}

const emptyForensicForm: ForensicForm = {
  case_id: '', report_type: 'autopsy', medical_examiner: '', examination_date: '',
  examination_location: '', findings: '', cause_of_death: '', injury_consistency: 'inconclusive',
  report_status: 'pending', notes: '',
};

interface PsychiatricForm {
  case_id: string;
  evaluator_name: string;
  evaluation_date: string;
  subject_name: string;
  mental_state: string;
  article_62_invoked: boolean;
  behavioral_notes: string;
  cognitive_assessment: string;
  volition_assessment: string;
  recommendation: string;
  report_status: string;
  notes: string;
}

const emptyPsychiatricForm: PsychiatricForm = {
  case_id: '', evaluator_name: '', evaluation_date: '', subject_name: '',
  mental_state: 'sane', article_62_invoked: false, behavioral_notes: '',
  cognitive_assessment: '', volition_assessment: '', recommendation: 'fit_for_trial',
  report_status: 'pending', notes: '',
};

interface ForgeryForm {
  case_id: string;
  examiner_name: string;
  examination_date: string;
  document_type: string;
  questioned_features: string;
  ink_analysis: string;
  pressure_analysis: string;
  authenticity_score: string;
  finding_summary: string;
  recommended_action: string;
  report_status: string;
  notes: string;
}

const emptyForgeryForm: ForgeryForm = {
  case_id: '', examiner_name: '', examination_date: '', document_type: 'signature',
  questioned_features: '', ink_analysis: 'inconclusive', pressure_analysis: 'inconclusive',
  authenticity_score: '', finding_summary: '', recommended_action: 'accept',
  report_status: 'pending', notes: '',
};

// ── Component ───────────────────────────────────────────────────────────────

export default function CriminalLawEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [cases, setCases] = useState<CriminalCase[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [forensicReports, setForensicReports] = useState<ForensicReport[]>([]);
  const [psychiatricEvals, setPsychiatricEvals] = useState<PsychiatricEvaluation[]>([]);
  const [forgeryExams, setForgeryExams] = useState<ForgeryExamination[]>([]);
  const [auditLogs, setAuditLogs] = useState<CriminalAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('cases');
  const [selectedCase, setSelectedCase] = useState<CriminalCase | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailInvestigations, setDetailInvestigations] = useState<Investigation[]>([]);
  const [detailEvidence, setDetailEvidence] = useState<Evidence[]>([]);
  const [detailForensic, setDetailForensic] = useState<ForensicReport[]>([]);
  const [detailPsychiatric, setDetailPsychiatric] = useState<PsychiatricEvaluation[]>([]);
  const [detailForgery, setDetailForgery] = useState<ForgeryExamination[]>([]);
  const [detailAudit, setDetailAudit] = useState<CriminalAuditLog[]>([]);

  const [caseModalOpen, setCaseModalOpen] = useState(false);
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [caseForm, setCaseForm] = useState<CaseForm>(emptyCaseForm);
  const [saving, setSaving] = useState(false);

  const [investigationModalOpen, setInvestigationModalOpen] = useState(false);
  const [investigationForm, setInvestigationForm] = useState<InvestigationForm>(emptyInvestigationForm);

  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [evidenceForm, setEvidenceForm] = useState<EvidenceForm>(emptyEvidenceForm);

  const [forensicModalOpen, setForensicModalOpen] = useState(false);
  const [forensicForm, setForensicForm] = useState<ForensicForm>(emptyForensicForm);

  const [psychiatricModalOpen, setPsychiatricModalOpen] = useState(false);
  const [psychiatricForm, setPsychiatricForm] = useState<PsychiatricForm>(emptyPsychiatricForm);

  const [forgeryModalOpen, setForgeryModalOpen] = useState(false);
  const [forgeryForm, setForgeryForm] = useState<ForgeryForm>(emptyForgeryForm);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'case' | 'investigation' | 'evidence' | 'forensic' | 'psychiatric' | 'forgery'>('case');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [caseRes, attRes, invRes, evRes, forensicRes, psychRes, forgeryRes, auditRes] = await Promise.all([
      supabase.from('m03_criminal_cases')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m03_investigations').select('*').order('created_at', { ascending: false }),
      supabase.from('m03_evidence_chain').select('*').order('created_at', { ascending: false }),
      supabase.from('m03_forensic_reports').select('*').order('created_at', { ascending: false }),
      supabase.from('m03_psychiatric_evaluations').select('*').order('created_at', { ascending: false }),
      supabase.from('m03_forgery_examinations').select('*').order('created_at', { ascending: false }),
      supabase.from('m03_criminal_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setCases((caseRes.data as CriminalCase[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setInvestigations((invRes.data as Investigation[]) || []);
    setEvidence((evRes.data as Evidence[]) || []);
    setForensicReports((forensicRes.data as ForensicReport[]) || []);
    setPsychiatricEvals((psychRes.data as PsychiatricEvaluation[]) || []);
    setForgeryExams((forgeryRes.data as ForgeryExamination[]) || []);
    setAuditLogs((auditRes.data as CriminalAuditLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setCaseForm({ ...emptyCaseForm, case_title: cmd.fields.title || '' });
      setEditingCaseId(null);
      setCaseModalOpen(true);
    }
  }, [voiceAdd]);

  const logAudit = async (caseId: string, action: string, detail: string) => {
    const hash = '0x' + Math.random().toString(16).substr(2, 4) + '...' + Math.random().toString(16).substr(2, 4);
    await supabase.from('m03_criminal_audit_logs').insert({
      case_id: caseId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
  };

  const openCaseDetail = async (c: CriminalCase) => {
    setSelectedCase(c);
    setDetailLoading(true);
    const [invRes, evRes, forensicRes, psychRes, forgeryRes, auditRes] = await Promise.all([
      supabase.from('m03_investigations').select('*').eq('case_id', c.id).order('created_at', { ascending: true }),
      supabase.from('m03_evidence_chain').select('*').eq('case_id', c.id).order('created_at', { ascending: true }),
      supabase.from('m03_forensic_reports').select('*').eq('case_id', c.id).order('created_at', { ascending: true }),
      supabase.from('m03_psychiatric_evaluations').select('*').eq('case_id', c.id).order('created_at', { ascending: true }),
      supabase.from('m03_forgery_examinations').select('*').eq('case_id', c.id).order('created_at', { ascending: true }),
      supabase.from('m03_criminal_audit_logs').select('*').eq('case_id', c.id).order('created_at', { ascending: true }),
    ]);
    setDetailInvestigations((invRes.data as Investigation[]) || []);
    setDetailEvidence((evRes.data as Evidence[]) || []);
    setDetailForensic((forensicRes.data as ForensicReport[]) || []);
    setDetailPsychiatric((psychRes.data as PsychiatricEvaluation[]) || []);
    setDetailForgery((forgeryRes.data as ForgeryExamination[]) || []);
    setDetailAudit((auditRes.data as CriminalAuditLog[]) || []);
    setDetailLoading(false);
  };

  const openAddCase = () => { setCaseForm(emptyCaseForm); setEditingCaseId(null); setCaseModalOpen(true); };

  const openEditCase = (c: CriminalCase) => {
    setCaseForm({
      case_number: c.case_number, case_title: c.case_title, crime_type: c.crime_type,
      stage: c.stage, court: c.court || '', filing_date: c.filing_date || '',
      assigned_advisor_id: c.assigned_advisor_id || '', description: c.description || '',
    });
    setEditingCaseId(c.id);
    setCaseModalOpen(true);
  };

  const handleSaveCase = async () => {
    if (!caseForm.case_title.trim() || !caseForm.case_number.trim()) return;
    setSaving(true);
    const payload = {
      case_number: caseForm.case_number.trim(),
      case_title: caseForm.case_title.trim(),
      crime_type: caseForm.crime_type,
      stage: caseForm.stage,
      court: caseForm.court.trim() || null,
      filing_date: caseForm.filing_date || null,
      assigned_advisor_id: caseForm.assigned_advisor_id || null,
      description: caseForm.description.trim() || null,
    };
    if (editingCaseId) {
      await supabase.from('m03_criminal_cases').update(payload).eq('id', editingCaseId);
      await logAudit(editingCaseId, 'case_updated', 'تحديث بيانات القضية الجنائية');
    } else {
      const { data } = await supabase.from('m03_criminal_cases').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'case_created', 'إنشاء قضية جنائية — نوع: ' + (CRIME_TYPE_LABELS[caseForm.crime_type] || caseForm.crime_type));
      }
    }
    setSaving(false);
    setCaseModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (deleteType === 'case') await supabase.from('m03_criminal_cases').delete().eq('id', deleteId);
    else if (deleteType === 'investigation') await supabase.from('m03_investigations').delete().eq('id', deleteId);
    else if (deleteType === 'evidence') await supabase.from('m03_evidence_chain').delete().eq('id', deleteId);
    else if (deleteType === 'forensic') await supabase.from('m03_forensic_reports').delete().eq('id', deleteId);
    else if (deleteType === 'psychiatric') await supabase.from('m03_psychiatric_evaluations').delete().eq('id', deleteId);
    else if (deleteType === 'forgery') await supabase.from('m03_forgery_examinations').delete().eq('id', deleteId);
    setDeleteId(null);
    if (deleteType === 'case') setSelectedCase(null);
    fetchAll();
    if (selectedCase && deleteType !== 'case') openCaseDetail(selectedCase);
  };

  const addInvestigation = async () => {
    if (!selectedCase || !investigationForm.investigator_name.trim()) return;
    await supabase.from('m03_investigations').insert({
      case_id: selectedCase.id, investigation_type: investigationForm.investigation_type,
      investigator_name: investigationForm.investigator_name.trim(),
      investigation_date: investigationForm.investigation_date || null,
      location: investigationForm.location.trim() || null,
      findings: investigationForm.findings.trim() || null,
      confidentiality_level: investigationForm.confidentiality_level,
    });
    await logAudit(selectedCase.id, 'investigation_added', 'إضافة تحقيق: ' + investigationForm.investigator_name);
    setInvestigationForm(emptyInvestigationForm);
    setInvestigationModalOpen(false);
    openCaseDetail(selectedCase);
  };

  const addEvidence = async () => {
    if (!selectedCase || !evidenceForm.evidence_title.trim()) return;
    const hash = evidenceForm.hash_fingerprint.trim() || '0x' + Math.random().toString(16).substr(2, 8);
    await supabase.from('m03_evidence_chain').insert({
      case_id: selectedCase.id, evidence_type: evidenceForm.evidence_type,
      evidence_title: evidenceForm.evidence_title.trim(),
      collected_from: evidenceForm.collected_from.trim() || null,
      collection_date: evidenceForm.collection_date || null,
      chain_of_custody: evidenceForm.chain_of_custody.trim() || null,
      hash_fingerprint: hash,
      notes: evidenceForm.notes.trim() || null,
    });
    await logAudit(selectedCase.id, 'evidence_added', 'إضافة دليل: ' + evidenceForm.evidence_title + ' (بصمة: ' + hash + ')');
    setEvidenceForm(emptyEvidenceForm);
    setEvidenceModalOpen(false);
    openCaseDetail(selectedCase);
  };

  const addForensic = async () => {
    if (!selectedCase || !forensicForm.medical_examiner.trim()) return;
    await supabase.from('m03_forensic_reports').insert({
      case_id: selectedCase.id, report_type: forensicForm.report_type,
      medical_examiner: forensicForm.medical_examiner.trim(),
      examination_date: forensicForm.examination_date || null,
      examination_location: forensicForm.examination_location.trim() || null,
      findings: forensicForm.findings.trim() || null,
      cause_of_death: forensicForm.cause_of_death.trim() || null,
      injury_consistency: forensicForm.injury_consistency,
      report_status: forensicForm.report_status,
      notes: forensicForm.notes.trim() || null,
    });
    await logAudit(selectedCase.id, 'forensic_added', 'إضافة تقرير طب شرعي: ' + (FORENSIC_TYPE_LABELS[forensicForm.report_type] || forensicForm.report_type));
    setForensicForm(emptyForensicForm);
    setForensicModalOpen(false);
    openCaseDetail(selectedCase);
  };

  const addPsychiatric = async () => {
    if (!selectedCase || !psychiatricForm.evaluator_name.trim()) return;
    await supabase.from('m03_psychiatric_evaluations').insert({
      case_id: selectedCase.id, evaluator_name: psychiatricForm.evaluator_name.trim(),
      evaluation_date: psychiatricForm.evaluation_date || null,
      subject_name: psychiatricForm.subject_name.trim() || null,
      mental_state: psychiatricForm.mental_state,
      article_62_invoked: psychiatricForm.article_62_invoked,
      behavioral_notes: psychiatricForm.behavioral_notes.trim() || null,
      cognitive_assessment: psychiatricForm.cognitive_assessment.trim() || null,
      volition_assessment: psychiatricForm.volition_assessment.trim() || null,
      recommendation: psychiatricForm.recommendation,
      report_status: psychiatricForm.report_status,
      notes: psychiatricForm.notes.trim() || null,
    });
    await logAudit(selectedCase.id, 'psychiatric_added', 'إضافة تقييم نفسي: ' + psychiatricForm.evaluator_name);
    setPsychiatricForm(emptyPsychiatricForm);
    setPsychiatricModalOpen(false);
    openCaseDetail(selectedCase);
  };

  const addForgery = async () => {
    if (!selectedCase || !forgeryForm.examiner_name.trim()) return;
    const features = forgeryForm.questioned_features.split(',').map((s) => s.trim()).filter(Boolean);
    const score = forgeryForm.authenticity_score ? parseFloat(forgeryForm.authenticity_score) : null;
    await supabase.from('m03_forgery_examinations').insert({
      case_id: selectedCase.id, examiner_name: forgeryForm.examiner_name.trim(),
      examination_date: forgeryForm.examination_date || null,
      document_type: forgeryForm.document_type,
      questioned_features: features.length > 0 ? features : null,
      ink_analysis: forgeryForm.ink_analysis,
      pressure_analysis: forgeryForm.pressure_analysis,
      authenticity_score: (score !== null && !isNaN(score)) ? Math.max(0, Math.min(1, score)) : null,
      finding_summary: forgeryForm.finding_summary.trim() || null,
      recommended_action: forgeryForm.recommended_action,
      report_status: forgeryForm.report_status,
      notes: forgeryForm.notes.trim() || null,
    });
    await logAudit(selectedCase.id, 'forgery_added', 'إضافة فحص تزوير: ' + (FORGERY_DOC_TYPE_LABELS[forgeryForm.document_type] || forgeryForm.document_type));
    setForgeryForm(emptyForgeryForm);
    setForgeryModalOpen(false);
    openCaseDetail(selectedCase);
  };

  const advanceStage = async (c: CriminalCase) => {
    const idx = STAGES.indexOf(c.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    await supabase.from('m03_criminal_cases').update({ stage: next }).eq('id', c.id);
    await logAudit(c.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedCase({ ...c, stage: next });
  };

  const filteredCases = cases.filter((c) => {
    if (filterType !== 'all' && c.crime_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.case_number.toLowerCase().includes(q) && !c.case_title.toLowerCase().includes(q) && !(c.court || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeCases = cases.filter((c) => c.stage !== 'enforcement').length;
  const completedCases = cases.filter((c) => c.stage === 'enforcement').length;
  const pendingInvestigations = investigations.filter((i) => !i.findings).length;
  const evidenceCount = evidence.length;
  const forensicCompleted = forensicReports.filter((f) => f.report_status === 'completed').length;
  const forensicDisputed = forensicReports.filter((f) => f.report_status === 'disputed').length;
  const forensicConsistencyRate = forensicReports.length > 0
    ? Math.round(forensicReports.filter((f) => f.injury_consistency === 'consistent').length / forensicReports.length * 100)
    : 0;
  const psychArticle62 = psychiatricEvals.filter((p) => p.article_62_invoked).length;
  const psychUnfit = psychiatricEvals.filter((p) => p.recommendation === 'unfit_for_trial').length;
  const psychDisputed = psychiatricEvals.filter((p) => p.report_status === 'disputed').length;
  const forgeryDetected = forgeryExams.filter((f) => f.authenticity_score !== null && f.authenticity_score < 0.5).length;
  const forgeryAuthentic = forgeryExams.filter((f) => f.authenticity_score !== null && f.authenticity_score >= 0.5).length;
  const forgeryDisputed = forgeryExams.filter((f) => f.report_status === 'disputed').length;

  const tabs: { id: Tab; label: string; icon: typeof Gavel; badge?: number }[] = [
    { id: 'cases', label: 'القضايا', icon: Gavel, badge: activeCases },
    { id: 'investigations', label: 'التحقيقات', icon: ScanLine, badge: pendingInvestigations },
    { id: 'evidence', label: 'الأدلة', icon: Fingerprint, badge: evidenceCount },
    { id: 'forensic', label: 'الطب الشرعي', icon: Stethoscope, badge: forensicReports.length },
    { id: 'psychiatric', label: 'التقييم النفسي', icon: BrainCircuit, badge: psychiatricEvals.length },
    { id: 'forgery', label: 'فحص التزوير', icon: ScanLine, badge: forgeryExams.length },
    { id: 'audit', label: 'سجل الوصول', icon: Shield },
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
            <h2 className="font-heading font-bold text-midnight text-lg">القضاء الجنائي والجنح (M3)</h2>
            <p className="font-body text-[10px] text-ink/40">القطاع الجنائي — إدارة القضايا والتحقيقات وسلسلة الأدلة</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Server size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">On-Premise · AES-256</span>
          </div>
          <button onClick={openAddCase} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> قضية جنائية
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Gavel size={14} className="text-midnight" />} label="إجمالي القضايا" value={String(cases.length)} valueClass="text-midnight" />
        <StatCard icon={<Activity size={14} className="text-blue-600" />} label="قضايا نشطة" value={String(activeCases)} valueClass="text-blue-700" />
        <StatCard icon={<ScanLine size={14} className="text-amber-600" />} label="تحقيقات معلقة" value={String(pendingInvestigations)} valueClass="text-amber-700" />
        <StatCard icon={<Fingerprint size={14} className="text-gold" />} label="قطع أدلة" value={String(evidenceCount)} valueClass="text-gold" />
      </div>

      {/* Stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <Crosshair size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة القضية الجنائية — 5 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.investigation;
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
                {i < STAGES.length - 1 && <ChevronRight size={12} className="text-gold/30 flex-shrink-0" />}
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
            {Object.entries(CRIME_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم أو عنوان أو محكمة..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Cases tab */}
      {activeTab === 'cases' && (
        <div className="space-y-2">
          {filteredCases.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Gavel size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد قضايا جنائية</p>
            </div>
          ) : (
            filteredCases.map((c) => {
              const sCfg = STAGE_CONFIG[c.stage] || STAGE_CONFIG.investigation;
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
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{CRIME_TYPE_LABELS[c.crime_type] || c.crime_type}</span>
                          {c.court && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Landmark size={8} /> {c.court}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{c.case_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {c.filing_date && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/40"><Calendar size={9} /> {formatDate(c.filing_date)}</span>}
                          {c.advisor && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/40"><UserCog size={9} /> {c.advisor.name}</span>}
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
                        <button onClick={(e) => { e.stopPropagation(); openEditCase(c); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
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

      {/* Investigations tab */}
      {activeTab === 'investigations' && (
        <div className="space-y-2">
          {investigations.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><ScanLine size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد تحقيقات</p></div>
          ) : (
            investigations.map((inv) => {
              const c = cases.find((c) => c.id === inv.case_id);
              return (
                <div key={inv.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <ScanLine size={14} className="text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{INVESTIGATION_TYPE_LABELS[inv.investigation_type] || inv.investigation_type}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${inv.confidentiality_level === 'strictly_confidential' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>{CONFIDENTIALITY_LABELS[inv.confidentiality_level] || inv.confidentiality_level}</span>
                          {c && <span className="font-body text-[9px] text-gold">{c.case_number}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{inv.investigator_name || '—'}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {inv.investigation_date && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/40"><Calendar size={9} /> {formatDate(inv.investigation_date)}</span>}
                          {inv.location && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/40"><MapPin size={9} /> {inv.location}</span>}
                        </div>
                        {inv.findings && <p className="font-body text-[10px] text-ink/50 mt-1 leading-relaxed line-clamp-2">{inv.findings}</p>}
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(inv.id); setDeleteType('investigation'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Evidence tab */}
      {activeTab === 'evidence' && (
        <div className="space-y-2">
          {evidence.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><Fingerprint size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد أدلة مسجلة</p></div>
          ) : (
            evidence.map((ev) => {
              const c = cases.find((c) => c.id === ev.case_id);
              return (
                <div key={ev.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
                        <Fingerprint size={14} className="text-gold" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{EVIDENCE_TYPE_LABELS[ev.evidence_type] || ev.evidence_type}</span>
                          {c && <span className="font-body text-[9px] text-gold">{c.case_number}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{ev.evidence_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {ev.collection_date && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/40"><Calendar size={9} /> {formatDate(ev.collection_date)}</span>}
                          {ev.collected_from && <span className="font-body text-[9px] text-ink/40">المصدر: {ev.collected_from}</span>}
                          {ev.hash_fingerprint && <span className="flex items-center gap-0.5 font-body text-[9px] text-gold font-bold"><Lock size={8} /> {ev.hash_fingerprint}</span>}
                        </div>
                        {ev.chain_of_custody && <p className="font-body text-[10px] text-ink/50 mt-1 leading-relaxed line-clamp-2">سلسلة العهدة: {ev.chain_of_custody}</p>}
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(ev.id); setDeleteType('evidence'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Forensic tab */}
      {activeTab === 'forensic' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={<Stethoscope size={14} className="text-midnight" />} label="إجمالي التقارير" value={String(forensicReports.length)} valueClass="text-midnight" />
            <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="مكتملة" value={String(forensicCompleted)} valueClass="text-green-700" />
            <StatCard icon={<AlertTriangle size={14} className="text-red-600" />} label="متنازع عليها" value={String(forensicDisputed)} valueClass="text-red-700" />
            <StatCard icon={<Activity size={14} className="text-blue-600" />} label="معدل الاتساق" value={forensicConsistencyRate + '%'} valueClass="text-blue-700" />
          </div>
          <div className="space-y-2">
            {forensicReports.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><Stethoscope size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد تقارير طب شرعي</p></div>
            ) : forensicReports.map((fr) => {
              const c = cases.find((c) => c.id === fr.case_id);
              return (
                <div key={fr.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0"><Stethoscope size={14} className="text-rose-600" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{FORENSIC_TYPE_LABELS[fr.report_type] || fr.report_type}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${fr.report_status === 'completed' ? 'bg-green-50 text-green-700' : fr.report_status === 'disputed' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>{fr.report_status === 'completed' ? 'مكتمل' : fr.report_status === 'disputed' ? 'متنازع' : 'معلق'}</span>
                          {fr.injury_consistency && <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{INJURY_CONSISTENCY_LABELS[fr.injury_consistency] || fr.injury_consistency}</span>}
                          {c && <span className="font-body text-[9px] text-gold">{c.case_number}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{fr.medical_examiner || '—'}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {fr.examination_date && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/40"><Calendar size={9} /> {formatDate(fr.examination_date)}</span>}
                          {fr.examination_location && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/40"><MapPin size={9} /> {fr.examination_location}</span>}
                        </div>
                        {fr.cause_of_death && <p className="font-body text-[10px] text-red-600 mt-1">سبب الوفاة: {fr.cause_of_death}</p>}
                        {fr.findings && <p className="font-body text-[10px] text-ink/50 mt-1 leading-relaxed line-clamp-2">{fr.findings}</p>}
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(fr.id); setDeleteType('forensic'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Psychiatric tab */}
      {activeTab === 'psychiatric' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={<BrainCircuit size={14} className="text-midnight" />} label="إجمالي التقييمات" value={String(psychiatricEvals.length)} valueClass="text-midnight" />
            <StatCard icon={<Scale size={14} className="text-purple-600" />} label="المادة 62" value={String(psychArticle62)} valueClass="text-purple-700" />
            <StatCard icon={<AlertTriangle size={14} className="text-red-600" />} label="غير صالح" value={String(psychUnfit)} valueClass="text-red-700" />
            <StatCard icon={<ShieldAlert size={14} className="text-amber-600" />} label="متنازع" value={String(psychDisputed)} valueClass="text-amber-700" />
          </div>
          <div className="space-y-2">
            {psychiatricEvals.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><BrainCircuit size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد تقييمات نفسية</p></div>
            ) : psychiatricEvals.map((pe) => {
              const c = cases.find((c) => c.id === pe.case_id);
              return (
                <div key={pe.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0"><BrainCircuit size={14} className="text-purple-600" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{MENTAL_STATE_LABELS[pe.mental_state] || pe.mental_state}</span>
                          {pe.article_62_invoked && <span className="px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-purple-100 text-purple-700">المادة 62</span>}
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${pe.recommendation === 'fit_for_trial' ? 'bg-green-50 text-green-700' : pe.recommendation === 'unfit_for_trial' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>{PSYCH_RECOMMENDATION_LABELS[pe.recommendation] || pe.recommendation}</span>
                          {c && <span className="font-body text-[9px] text-gold">{c.case_number}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{pe.subject_name || '—'}</p>
                        <p className="font-body text-[10px] text-ink/40">المقيّم: {pe.evaluator_name || '—'}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {pe.evaluation_date && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/40"><Calendar size={9} /> {formatDate(pe.evaluation_date)}</span>}
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body ${pe.report_status === 'completed' ? 'bg-green-50 text-green-700' : pe.report_status === 'disputed' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>{pe.report_status === 'completed' ? 'مكتمل' : pe.report_status === 'disputed' ? 'متنازع' : 'معلق'}</span>
                        </div>
                        {pe.behavioral_notes && <p className="font-body text-[10px] text-ink/50 mt-1 leading-relaxed line-clamp-2">{pe.behavioral_notes}</p>}
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(pe.id); setDeleteType('psychiatric'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Forgery tab */}
      {activeTab === 'forgery' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={<ScanLine size={14} className="text-midnight" />} label="إجمالي الفحوصات" value={String(forgeryExams.length)} valueClass="text-midnight" />
            <StatCard icon={<AlertTriangle size={14} className="text-red-600" />} label="تزوير مكتشف" value={String(forgeryDetected)} valueClass="text-red-700" />
            <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="أصلي" value={String(forgeryAuthentic)} valueClass="text-green-700" />
            <StatCard icon={<ShieldAlert size={14} className="text-amber-600" />} label="متنازع" value={String(forgeryDisputed)} valueClass="text-amber-700" />
          </div>
          <div className="space-y-2">
            {forgeryExams.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><ScanLine size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد فحوصات تزوير</p></div>
            ) : forgeryExams.map((fe) => {
              const c = cases.find((c) => c.id === fe.case_id);
              const score = fe.authenticity_score;
              return (
                <div key={fe.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0"><ScanLine size={14} className="text-indigo-600" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{FORGERY_DOC_TYPE_LABELS[fe.document_type] || fe.document_type}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${fe.recommended_action === 'accept' ? 'bg-green-50 text-green-700' : fe.recommended_action === 'reject' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>{FORGERY_ACTION_LABELS[fe.recommended_action] || fe.recommended_action}</span>
                          {score !== null && <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${score < 0.5 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>الدرجة: {(score * 100).toFixed(0)}%</span>}
                          {c && <span className="font-body text-[9px] text-gold">{c.case_number}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{fe.examiner_name || '—'}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {fe.examination_date && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/40"><Calendar size={9} /> {formatDate(fe.examination_date)}</span>}
                          {fe.ink_analysis && <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">حبر: {fe.ink_analysis}</span>}
                          {fe.pressure_analysis && <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">ضغط: {fe.pressure_analysis}</span>}
                        </div>
                        {fe.questioned_features && fe.questioned_features.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {fe.questioned_features.map((qf, i) => <span key={i} className="px-1.5 py-0.5 rounded text-[9px] font-body bg-indigo-50 text-indigo-600">{qf}</span>)}
                          </div>
                        )}
                        {fe.finding_summary && <p className="font-body text-[10px] text-ink/50 mt-1 leading-relaxed line-clamp-2">{fe.finding_summary}</p>}
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(fe.id); setDeleteType('forgery'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Audit tab */}
      {activeTab === 'audit' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={14} className="text-gold" />
            <span className="font-heading font-bold text-midnight text-sm">سجل الوصول غير القابل للتعديل</span>
            <span className="font-body text-[10px] text-ink/30">— {auditLogs.length} عملية مسجلة</span>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {log.action.includes('created') ? <FileText size={12} className="text-blue-600" />
                      : log.action.includes('investigation') ? <ScanLine size={12} className="text-blue-600" />
                      : log.action.includes('evidence') ? <Fingerprint size={12} className="text-gold" />
                      : log.action.includes('stage') ? <ChevronRight size={12} className="text-gold" />
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
                      {log.accessed_fields && <span className="font-body text-[9px] text-ink/30">الحقول: {log.accessed_fields}</span>}
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
                <span className="font-heading font-bold text-midnight text-sm">القضية الجنائية</span>
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
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedCase.stage] || STAGE_CONFIG.investigation).bg} ${(STAGE_CONFIG[selectedCase.stage] || STAGE_CONFIG.investigation).text}`}>
                      {(STAGE_CONFIG[selectedCase.stage] || STAGE_CONFIG.investigation).label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{CRIME_TYPE_LABELS[selectedCase.crime_type] || selectedCase.crime_type}</span>
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedCase.case_title}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.investigation;
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
                      <ChevronRight size={12} /> الانتقال للمرحلة التالية
                    </button>
                  )}
                </div>

                {/* Case info grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <span className="font-body text-[9px] text-ink/40">المحكمة</span>
                    <p className="font-body text-xs font-bold text-midnight">{selectedCase.court || '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <span className="font-body text-[9px] text-ink/40">تاريخ القيد</span>
                    <p className="font-body text-xs font-bold text-midnight">{selectedCase.filing_date ? formatDate(selectedCase.filing_date) : '—'}</p>
                  </div>
                  {selectedCase.advisor && (
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <span className="font-body text-[9px] text-ink/40">المستشار المسؤول</span>
                      <p className="font-body text-xs font-bold text-midnight">{selectedCase.advisor.name}</p>
                    </div>
                  )}
                </div>

                {selectedCase.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedCase.description}</p></div>
                )}

                {/* Investigations */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><ScanLine size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">التحقيقات</span></div>
                    <button onClick={() => setInvestigationModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> تحقيق جديد</button>
                  </div>
                  <div className="space-y-1.5">
                    {detailInvestigations.map((inv) => (
                      <div key={inv.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/inv">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-200 text-ink/50">{INVESTIGATION_TYPE_LABELS[inv.investigation_type] || inv.investigation_type}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body ${inv.confidentiality_level === 'strictly_confidential' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>{CONFIDENTIALITY_LABELS[inv.confidentiality_level] || inv.confidentiality_level}</span>
                        </div>
                        <p className="font-body text-[10px] font-bold text-midnight">{inv.investigator_name || '—'}</p>
                        {inv.findings && <p className="font-body text-[9px] text-ink/50 mt-0.5 leading-tight">{inv.findings}</p>}
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <button onClick={() => { setDeleteId(inv.id); setDeleteType('investigation'); }} className="p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/inv:opacity-100 transition-all"><Trash2 size={10} /></button>
                        </div>
                      </div>
                    ))}
                    {detailInvestigations.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد تحقيقات</p>}
                  </div>
                </div>

                {/* Evidence */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><Fingerprint size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">سلسلة الأدلة</span></div>
                    <button onClick={() => setEvidenceModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> دليل جديد</button>
                  </div>
                  <div className="space-y-1.5">
                    {detailEvidence.map((ev) => (
                      <div key={ev.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/ev">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-200 text-ink/50">{EVIDENCE_TYPE_LABELS[ev.evidence_type] || ev.evidence_type}</span>
                          {ev.hash_fingerprint && <span className="flex items-center gap-0.5 font-body text-[9px] text-gold font-bold"><Lock size={8} /> {ev.hash_fingerprint}</span>}
                        </div>
                        <p className="font-body text-[10px] font-bold text-midnight">{ev.evidence_title}</p>
                        {ev.chain_of_custody && <p className="font-body text-[9px] text-ink/50 mt-0.5 leading-tight">سلسلة العهدة: {ev.chain_of_custody}</p>}
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <button onClick={() => { setDeleteId(ev.id); setDeleteType('evidence'); }} className="p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/ev:opacity-100 transition-all"><Trash2 size={10} /></button>
                        </div>
                      </div>
                    ))}
                    {detailEvidence.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد أدلة</p>}
                  </div>
                </div>

                {/* Forensic reports */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><Stethoscope size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">الطب الشرعي</span></div>
                    <button onClick={() => setForensicModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> تقرير جديد</button>
                  </div>
                  <div className="space-y-1.5">
                    {detailForensic.map((fr) => (
                      <div key={fr.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/fr">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-200 text-ink/50">{FORENSIC_TYPE_LABELS[fr.report_type] || fr.report_type}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body ${fr.report_status === 'completed' ? 'bg-green-50 text-green-700' : fr.report_status === 'disputed' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>{fr.report_status === 'completed' ? 'مكتمل' : fr.report_status === 'disputed' ? 'متنازع' : 'معلق'}</span>
                          {fr.injury_consistency && <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{INJURY_CONSISTENCY_LABELS[fr.injury_consistency] || fr.injury_consistency}</span>}
                        </div>
                        <p className="font-body text-[10px] font-bold text-midnight">{fr.medical_examiner || '—'}</p>
                        {fr.cause_of_death && <p className="font-body text-[9px] text-red-600 mt-0.5">سبب الوفاة: {fr.cause_of_death}</p>}
                        {fr.findings && <p className="font-body text-[9px] text-ink/50 mt-0.5 leading-tight">{fr.findings}</p>}
                        <button onClick={() => { setDeleteId(fr.id); setDeleteType('forensic'); }} className="block ml-auto p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/fr:opacity-100 transition-all"><Trash2 size={10} /></button>
                      </div>
                    ))}
                    {detailForensic.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد تقارير طب شرعي</p>}
                  </div>
                </div>

                {/* Psychiatric evaluations */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><BrainCircuit size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">التقييم النفسي</span></div>
                    <button onClick={() => setPsychiatricModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> تقييم جديد</button>
                  </div>
                  <div className="space-y-1.5">
                    {detailPsychiatric.map((pe) => (
                      <div key={pe.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/pe">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-200 text-ink/50">{MENTAL_STATE_LABELS[pe.mental_state] || pe.mental_state}</span>
                          {pe.article_62_invoked && <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-100 text-purple-700">المادة 62</span>}
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body ${pe.recommendation === 'fit_for_trial' ? 'bg-green-50 text-green-700' : pe.recommendation === 'unfit_for_trial' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>{PSYCH_RECOMMENDATION_LABELS[pe.recommendation] || pe.recommendation}</span>
                        </div>
                        <p className="font-body text-[10px] font-bold text-midnight">{pe.subject_name || '—'}</p>
                        <p className="font-body text-[9px] text-ink/40">المقيّم: {pe.evaluator_name || '—'}</p>
                        {pe.behavioral_notes && <p className="font-body text-[9px] text-ink/50 mt-0.5 leading-tight">{pe.behavioral_notes}</p>}
                        <button onClick={() => { setDeleteId(pe.id); setDeleteType('psychiatric'); }} className="block ml-auto p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/pe:opacity-100 transition-all"><Trash2 size={10} /></button>
                      </div>
                    ))}
                    {detailPsychiatric.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد تقييمات نفسية</p>}
                  </div>
                </div>

                {/* Forgery examinations */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><ScanLine size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">فحص التزوير</span></div>
                    <button onClick={() => setForgeryModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> فحص جديد</button>
                  </div>
                  <div className="space-y-1.5">
                    {detailForgery.map((fe) => {
                      const score = fe.authenticity_score;
                      return (
                        <div key={fe.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/fe">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-200 text-ink/50">{FORGERY_DOC_TYPE_LABELS[fe.document_type] || fe.document_type}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-body ${fe.recommended_action === 'accept' ? 'bg-green-50 text-green-700' : fe.recommended_action === 'reject' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>{FORGERY_ACTION_LABELS[fe.recommended_action] || fe.recommended_action}</span>
                            {score !== null && <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${score < 0.5 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>{(score * 100).toFixed(0)}%</span>}
                          </div>
                          <p className="font-body text-[10px] font-bold text-midnight">{fe.examiner_name || '—'}</p>
                          {fe.finding_summary && <p className="font-body text-[9px] text-ink/50 mt-0.5 leading-tight">{fe.finding_summary}</p>}
                          <button onClick={() => { setDeleteId(fe.id); setDeleteType('forgery'); }} className="block ml-auto p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/fe:opacity-100 transition-all"><Trash2 size={10} /></button>
                        </div>
                      );
                    })}
                    {detailForgery.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد فحوصات تزوير</p>}
                  </div>
                </div>

                {/* Audit trail */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2"><Shield size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">سجل التدقيق</span></div>
                  <div className="space-y-1.5">
                    {detailAudit.map((log) => (
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

      {/* Case modal */}
      <EntityModal open={caseModalOpen} title={editingCaseId ? 'تعديل القضية' : 'قضية جنائية جديدة'} onClose={() => setCaseModalOpen(false)} onSubmit={handleSaveCase} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم القضية" required><TextInput value={caseForm.case_number} onChange={(e) => setCaseForm({ ...caseForm, case_number: e.target.value })} placeholder="CR-2025-001" /></Field>
          <Field label="نوع الجريمة"><Select value={caseForm.crime_type} onChange={(e) => setCaseForm({ ...caseForm, crime_type: e.target.value })}>{Object.entries(CRIME_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
        </div>
        <Field label="عنوان القضية" required><TextInput value={caseForm.case_title} onChange={(e) => setCaseForm({ ...caseForm, case_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المرحلة"><Select value={caseForm.stage} onChange={(e) => setCaseForm({ ...caseForm, stage: e.target.value })}>{STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}</Select></Field>
          <Field label="المحكمة"><TextInput value={caseForm.court} onChange={(e) => setCaseForm({ ...caseForm, court: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ القيد"><TextInput type="date" value={caseForm.filing_date} onChange={(e) => setCaseForm({ ...caseForm, filing_date: e.target.value })} /></Field>
          <Field label="المستشار المسؤول"><Select value={caseForm.assigned_advisor_id} onChange={(e) => setCaseForm({ ...caseForm, assigned_advisor_id: e.target.value })}><option value="">— اختر —</option>{attorneys.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
        </div>
        <Field label="الوصف"><TextArea value={caseForm.description} onChange={(e) => setCaseForm({ ...caseForm, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      {/* Investigation modal */}
      <EntityModal open={investigationModalOpen} title="تحقيق جديد" onClose={() => setInvestigationModalOpen(false)} onSubmit={addInvestigation}>
        <Field label="نوع التحقيق" required><Select value={investigationForm.investigation_type} onChange={(e) => setInvestigationForm({ ...investigationForm, investigation_type: e.target.value })}>{Object.entries(INVESTIGATION_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
        <Field label="اسم المحقق" required><TextInput value={investigationForm.investigator_name} onChange={(e) => setInvestigationForm({ ...investigationForm, investigator_name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ التحقيق"><TextInput type="date" value={investigationForm.investigation_date} onChange={(e) => setInvestigationForm({ ...investigationForm, investigation_date: e.target.value })} /></Field>
          <Field label="الموقع"><TextInput value={investigationForm.location} onChange={(e) => setInvestigationForm({ ...investigationForm, location: e.target.value })} /></Field>
        </div>
        <Field label="مستوى السرية"><Select value={investigationForm.confidentiality_level} onChange={(e) => setInvestigationForm({ ...investigationForm, confidentiality_level: e.target.value })}>{Object.entries(CONFIDENTIALITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
        <Field label="النتائج"><TextArea value={investigationForm.findings} onChange={(e) => setInvestigationForm({ ...investigationForm, findings: e.target.value })} rows={3} /></Field>
      </EntityModal>

      {/* Evidence modal */}
      <EntityModal open={evidenceModalOpen} title="دليل جديد" onClose={() => setEvidenceModalOpen(false)} onSubmit={addEvidence}>
        <Field label="نوع الدليل" required><Select value={evidenceForm.evidence_type} onChange={(e) => setEvidenceForm({ ...evidenceForm, evidence_type: e.target.value })}>{Object.entries(EVIDENCE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
        <Field label="عنوان الدليل" required><TextInput value={evidenceForm.evidence_title} onChange={(e) => setEvidenceForm({ ...evidenceForm, evidence_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="مصدر الجمع"><TextInput value={evidenceForm.collected_from} onChange={(e) => setEvidenceForm({ ...evidenceForm, collected_from: e.target.value })} /></Field>
          <Field label="تاريخ الجمع"><TextInput type="date" value={evidenceForm.collection_date} onChange={(e) => setEvidenceForm({ ...evidenceForm, collection_date: e.target.value })} /></Field>
        </div>
        <Field label="سلسلة العهدة"><TextArea value={evidenceForm.chain_of_custody} onChange={(e) => setEvidenceForm({ ...evidenceForm, chain_of_custody: e.target.value })} rows={2} /></Field>
        <Field label="بصمة التجزئة (Hash)"><TextInput value={evidenceForm.hash_fingerprint} onChange={(e) => setEvidenceForm({ ...evidenceForm, hash_fingerprint: e.target.value })} placeholder="تُولّد تلقائياً إذا تُركت فارغة" /></Field>
        <Field label="ملاحظات"><TextArea value={evidenceForm.notes} onChange={(e) => setEvidenceForm({ ...evidenceForm, notes: e.target.value })} rows={2} /></Field>
      </EntityModal>

      {/* Forensic modal */}
      <EntityModal open={forensicModalOpen} title="تقرير طب شرعي جديد" onClose={() => setForensicModalOpen(false)} onSubmit={addForensic}>
        <Field label="نوع التقرير" required><Select value={forensicForm.report_type} onChange={(e) => setForensicForm({ ...forensicForm, report_type: e.target.value })}>{Object.entries(FORENSIC_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
        <Field label="الطبيب الشرعي" required><TextInput value={forensicForm.medical_examiner} onChange={(e) => setForensicForm({ ...forensicForm, medical_examiner: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ الفحص"><TextInput type="date" value={forensicForm.examination_date} onChange={(e) => setForensicForm({ ...forensicForm, examination_date: e.target.value })} /></Field>
          <Field label="مكان الفحص"><TextInput value={forensicForm.examination_location} onChange={(e) => setForensicForm({ ...forensicForm, examination_location: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اتساق الإصابات"><Select value={forensicForm.injury_consistency} onChange={(e) => setForensicForm({ ...forensicForm, injury_consistency: e.target.value })}>{Object.entries(INJURY_CONSISTENCY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
          <Field label="حالة التقرير"><Select value={forensicForm.report_status} onChange={(e) => setForensicForm({ ...forensicForm, report_status: e.target.value })}><option value="pending">معلق</option><option value="completed">مكتمل</option><option value="disputed">متنازع</option></Select></Field>
        </div>
        <Field label="سبب الوفاة"><TextInput value={forensicForm.cause_of_death} onChange={(e) => setForensicForm({ ...forensicForm, cause_of_death: e.target.value })} /></Field>
        <Field label="النتائج"><TextArea value={forensicForm.findings} onChange={(e) => setForensicForm({ ...forensicForm, findings: e.target.value })} rows={3} /></Field>
        <Field label="ملاحظات"><TextArea value={forensicForm.notes} onChange={(e) => setForensicForm({ ...forensicForm, notes: e.target.value })} rows={2} /></Field>
      </EntityModal>

      {/* Psychiatric modal */}
      <EntityModal open={psychiatricModalOpen} title="تقييم نفسي جديد" onClose={() => setPsychiatricModalOpen(false)} onSubmit={addPsychiatric}>
        <Field label="المقيّم" required><TextInput value={psychiatricForm.evaluator_name} onChange={(e) => setPsychiatricForm({ ...psychiatricForm, evaluator_name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ التقييم"><TextInput type="date" value={psychiatricForm.evaluation_date} onChange={(e) => setPsychiatricForm({ ...psychiatricForm, evaluation_date: e.target.value })} /></Field>
          <Field label="اسم المُقيَّم"><TextInput value={psychiatricForm.subject_name} onChange={(e) => setPsychiatricForm({ ...psychiatricForm, subject_name: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الحالة النفسية"><Select value={psychiatricForm.mental_state} onChange={(e) => setPsychiatricForm({ ...psychiatricForm, mental_state: e.target.value })}>{Object.entries(MENTAL_STATE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
          <Field label="التوصية"><Select value={psychiatricForm.recommendation} onChange={(e) => setPsychiatricForm({ ...psychiatricForm, recommendation: e.target.value })}>{Object.entries(PSYCH_RECOMMENDATION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المادة 62"><Select value={String(psychiatricForm.article_62_invoked)} onChange={(e) => setPsychiatricForm({ ...psychiatricForm, article_62_invoked: e.target.value === 'true' })}><option value="false">لا</option><option value="true">نعم</option></Select></Field>
          <Field label="حالة التقرير"><Select value={psychiatricForm.report_status} onChange={(e) => setPsychiatricForm({ ...psychiatricForm, report_status: e.target.value })}><option value="pending">معلق</option><option value="completed">مكتمل</option><option value="disputed">متنازع</option></Select></Field>
        </div>
        <Field label="الملاحظات السلوكية"><TextArea value={psychiatricForm.behavioral_notes} onChange={(e) => setPsychiatricForm({ ...psychiatricForm, behavioral_notes: e.target.value })} rows={2} /></Field>
        <Field label="تقييم الإدراك"><TextArea value={psychiatricForm.cognitive_assessment} onChange={(e) => setPsychiatricForm({ ...psychiatricForm, cognitive_assessment: e.target.value })} rows={2} /></Field>
        <Field label="تقييم الإرادة"><TextArea value={psychiatricForm.volition_assessment} onChange={(e) => setPsychiatricForm({ ...psychiatricForm, volition_assessment: e.target.value })} rows={2} /></Field>
        <Field label="ملاحظات"><TextArea value={psychiatricForm.notes} onChange={(e) => setPsychiatricForm({ ...psychiatricForm, notes: e.target.value })} rows={2} /></Field>
      </EntityModal>

      {/* Forgery modal */}
      <EntityModal open={forgeryModalOpen} title="فحص تزوير جديد" onClose={() => setForgeryModalOpen(false)} onSubmit={addForgery}>
        <Field label="الفاحص" required><TextInput value={forgeryForm.examiner_name} onChange={(e) => setForgeryForm({ ...forgeryForm, examiner_name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ الفحص"><TextInput type="date" value={forgeryForm.examination_date} onChange={(e) => setForgeryForm({ ...forgeryForm, examination_date: e.target.value })} /></Field>
          <Field label="نوع المستند"><Select value={forgeryForm.document_type} onChange={(e) => setForgeryForm({ ...forgeryForm, document_type: e.target.value })}>{Object.entries(FORGERY_DOC_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
        </div>
        <Field label="السمات المشكوك فيها (افصل بفاصلة)"><TextInput value={forgeryForm.questioned_features} onChange={(e) => setForgeryForm({ ...forgeryForm, questioned_features: e.target.value })} placeholder="توقيع مختلف، حبر متباين..." /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تحليل الحبر"><Select value={forgeryForm.ink_analysis} onChange={(e) => setForgeryForm({ ...forgeryForm, ink_analysis: e.target.value })}><option value="consistent">متسق</option><option value="inconsistent">غير متسق</option><option value="mixed">مختلط</option><option value="inconclusive">غير حاسم</option></Select></Field>
          <Field label="تحليل الضغط"><Select value={forgeryForm.pressure_analysis} onChange={(e) => setForgeryForm({ ...forgeryForm, pressure_analysis: e.target.value })}><option value="consistent">متسق</option><option value="inconsistent">غير متسق</option><option value="mixed">مختلط</option><option value="inconclusive">غير حاسم</option></Select></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="درجة الأصالة (0-1)"><TextInput type="number" step="0.01" min="0" max="1" value={forgeryForm.authenticity_score} onChange={(e) => setForgeryForm({ ...forgeryForm, authenticity_score: e.target.value })} placeholder="0.85" /></Field>
          <Field label="الإجراء الموصى به"><Select value={forgeryForm.recommended_action} onChange={(e) => setForgeryForm({ ...forgeryForm, recommended_action: e.target.value })}>{Object.entries(FORGERY_ACTION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
        </div>
        <Field label="حالة التقرير"><Select value={forgeryForm.report_status} onChange={(e) => setForgeryForm({ ...forgeryForm, report_status: e.target.value })}><option value="pending">معلق</option><option value="completed">مكتمل</option><option value="disputed">متنازع</option></Select></Field>
        <Field label="ملخص النتائج"><TextArea value={forgeryForm.finding_summary} onChange={(e) => setForgeryForm({ ...forgeryForm, finding_summary: e.target.value })} rows={3} /></Field>
        <Field label="ملاحظات"><TextArea value={forgeryForm.notes} onChange={(e) => setForgeryForm({ ...forgeryForm, notes: e.target.value })} rows={2} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
