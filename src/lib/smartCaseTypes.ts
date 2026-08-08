export interface ScmCase {
  id: string;
  case_code: string;
  title: string;
  pipeline_type: 'litigation' | 'corporate' | 'labor' | 'ip';
  triage_lane: 'green' | 'yellow' | 'red';
  confidentiality: 'standard' | 'restricted' | 'top_secret';
  conflict_of_interest: boolean;
  client_name: string | null;
  opposing_party: string | null;
  court: string | null;
  case_number: string | null;
  current_stage_index: number;
  status: string;
  judgment_date: string | null;
  judgment_outcome: string | null;
  created_at: string;
  updated_at: string;
  // M10 merged fields
  operating_mode: string | null;
  case_category: string | null;
  court_circuit: string | null;
  filing_date: string | null;
  next_hearing_date: string | null;
  next_deadline_date: string | null;
  next_deadline_label: string | null;
  success_probability: number;
  financial_value: number;
  cost_center_id: string | null;
  assigned_attorney_id: string | null;
  client_type: string | null;
  facts_summary: string | null;
  legal_basis: string | null;
  parties_summary: string | null;
  evidence_summary: string | null;
  defense_draft: string | null;
  case_tree_encrypted: boolean;
  encryption_standard: string | null;
  m10_stage: string | null;
  m54_cost_center_opened: boolean;
  m92_task_distributed: boolean;
  m52_notified: boolean;
  source_engine: string | null;
  source_case_number: string | null;
  source_case_id: string | null;
}

export interface ScmPipelineStage {
  id: string;
  case_id: string;
  step_index: number;
  client_label: string;
  internal_label: string;
  is_completed: boolean;
  completed_at: string | null;
  notes: string | null;
}

export interface ScmCaseTeam {
  id: string;
  case_id: string;
  member_name: string;
  member_role: string;
  access_level: string;
  added_at: string;
}

export interface ScmDeadline {
  id: string;
  case_id: string;
  deadline_type: string;
  trigger_event: string | null;
  trigger_date: string | null;
  deadline_date: string;
  legal_basis: string | null;
  days_allowed: number | null;
  alert_level: 'info' | 'warning' | 'urgent' | 'critical';
  is_locked: boolean;
  notes: string | null;
  created_at: string;
}

export interface ScmEvidence {
  id: string;
  case_id: string;
  name: string;
  doc_type: string;
  file_hash: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  visibility: 'team' | 'client' | 'restricted';
  version_number: number;
  parent_evidence_id: string | null;
  uploaded_at: string;
  description: string | null;
}

export interface ScmAuditLog {
  id: string;
  case_id: string;
  evidence_id: string | null;
  actor_name: string;
  action: string;
  action_detail: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface ScmJurisdiction {
  id: string;
  country_code: string;
  country_name: string;
  legal_tradition: string;
  weekend_days: number[];
  distance_allowance_days: number;
  distance_rule: string;
  clear_days_rule: string;
  short_threshold_days: number;
}

export interface ScmCourtType {
  id: string;
  jurisdiction_id: string;
  court_type: string;
  court_label: string;
}

export interface ScmDeadlineRule {
  id: string;
  jurisdiction_id: string;
  court_type: string;
  trigger_event: string;
  deadline_type: string;
  base_days: number;
  distance_allowance_applies: boolean;
  clear_days_rule: boolean;
  exclude_weekends_short: boolean;
  exclude_weekends_long: boolean;
  extend_to_next_business_day: boolean;
  legal_basis: string;
}

export interface ScmHoliday {
  id: string;
  jurisdiction_id: string;
  holiday_date: string;
  holiday_name: string;
  year: number;
}

export interface ScmProceduralMilestone {
  id: string;
  case_id: string;
  milestone_type: string;
  milestone_label: string;
  milestone_date: string;
  is_critical: boolean;
  is_completed: boolean;
  rule_id: string | null;
  jurisdiction_code: string;
  legal_basis: string;
}

export interface ScmPrecedent {
  id: string;
  case_id: string | null;
  title: string;
  argument_text: string;
  legal_area: string;
  outcome: string | null;
  anonymized: boolean;
  flagged_by: string | null;
  created_at: string;
}

export const PIPELINE_TYPES = [
  { id: 'litigation', label: 'التقاضي والنزاعات', icon: 'Gavel', stages: ['الاستلام والتحليل', 'صياغة صحيفة الدعوى', 'المرافعة أول درجة', 'الاستئناف', 'النقض/التمييز'] },
  { id: 'corporate', label: 'الشركات والصفقات', icon: 'Building2', stages: ['تقييم الصفقة والاستحقاق', 'الموافقات التنظيمية', 'صياغة اتفاقية الاستحواذ', 'إغلاق الصفقة'] },
  { id: 'labor', label: 'النزاعات العمالية', icon: 'Users', stages: ['استلام الملف وتحليل المطالبات', 'التفاوض الودي', 'لجان الفصل والتحكيم', 'المحكمة العمالية'] },
  { id: 'ip', label: 'الملكية الفكرية', icon: 'ShieldCheck', stages: ['استلام الطلب وتقديمه', 'الفحص والبحث', 'النشر والاعتراض', 'إصدار شهادة التسجيل'] },
] as const;

export const TRIAGE_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  green: { label: 'مسار أخضر', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300' },
  yellow: { label: 'مسار أصفر', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' },
  red: { label: 'مسار أحمر', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' },
};

export const CONFIDENTIALITY_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  standard: { label: 'عادي', bg: 'bg-gray-100', text: 'text-gray-600' },
  restricted: { label: 'مقيّد', bg: 'bg-amber-100', text: 'text-amber-700' },
  top_secret: { label: 'سري للغاية', bg: 'bg-red-100', text: 'text-red-700' },
};

export const ALERT_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  info: { label: 'معلومة', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' },
  warning: { label: 'تنبيه', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' },
  urgent: { label: 'عاجل', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300' },
  critical: { label: 'حرج', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' },
};
