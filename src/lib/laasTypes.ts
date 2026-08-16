// ===== LaaS Subscription Platform Types =====

export type LaaSSegment = 'b2b' | 'b2c' | 'b2l';
export type LaaSSubscriberStatus = 'active' | 'past_due' | 'frozen' | 'emergency' | 'cancelled';
export type LaaSBillingCycle = 'monthly' | 'annual';
export type LaaSTransactionType = 'grant' | 'consume' | 'rollover' | 'donate' | 'adjust';
export type LaaSTriageStatus = 'pending' | 'completed';
export type LaaSChurnTrigger = 'nonpayment' | 'inactive' | 'cancel_request';
export type LaaSSmartAction = 'emergency_mode' | 'proactive_consumption' | 'frozen_subscription';
export type LaaSChurnStatus = 'triggered' | 'resolved' | 'active';
export type LaaSPanicStatus = 'active' | 'resolved';
export type LaaSRolloverType = 'rollover' | 'training' | 'probono';
export type LaaSProactiveActionType = 'auto_audit' | 'contract_review' | 'precedent_summary' | 'compliance_check' | 'custom';

export interface LaaSProactiveRule {
  id: string;
  subscriber_id: string | null;
  segment: LaaSSegment;
  trigger_days_inactive: number;
  points_to_consume: number;
  service_description: string;
  action_type: LaaSProactiveActionType;
  is_active: boolean;
  last_triggered_at: string | null;
  profile_type: string | null;
  service_cost: number;
  trello_card_title: string | null;
  created_at: string;
}

export type LaaSProfileType =
  | 'CORPORATE_FINANCE'
  | 'CORPORATE_LABOR'
  | 'LAW_FIRM'
  | 'FAMILY_INDIVIDUAL';

export interface LaaSAutopilotSettings {
  id: string;
  subscriber_id: string;
  is_enabled: boolean;
  inactivity_trigger_days: number;
  point_surplus_threshold: number;
  trello_board_id: string | null;
  trello_inbox_list_id: string | null;
  webhook_url: string | null;
  notification_email: string | null;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export type LaaSDeliveryStatus = 'pending' | 'delivered' | 'failed';
export type LaaSDeliveryTarget = 'notification' | 'trello' | 'webhook';

export interface LaaSProactiveExecution {
  id: string;
  subscriber_id: string;
  rule_id: string | null;
  service_description: string;
  points_consumed: number;
  action_type: LaaSProactiveActionType;
  profile_type: string | null;
  inactivity_days: number | null;
  surplus_pct: number | null;
  balance_before: number | null;
  balance_after: number | null;
  delivery_status: LaaSDeliveryStatus;
  delivery_target: LaaSDeliveryTarget;
  notification_subject: string | null;
  notification_body: string | null;
  trello_card_id: string | null;
  created_at: string;
}

export interface LaaSPlan {
  id: string;
  plan_code: string;
  segment: LaaSSegment;
  name_ar: string;
  name_en: string;
  description: string | null;
  monthly_price: number;
  annual_price: number;
  credits_included: number;
  is_active: boolean;
  internal_cost_per_point: number;
  volume_discount_pct: number;
  tier_label: string | null;
  validity_months: number;
  created_at: string;
}

export interface LaaSSubscriber {
  id: string;
  subscriber_code: string;
  segment: LaaSSegment;
  name: string;
  email: string | null;
  phone: string | null;
  entity_type: string | null;
  plan_id: string | null;
  status: LaaSSubscriberStatus;
  billing_cycle: LaaSBillingCycle;
  current_period_start: string;
  current_period_end: string;
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
  plan?: LaaSPlan | null;
  wallet?: LaaSWallet | null;
}

export interface LaaSWallet {
  id: string;
  subscriber_id: string;
  balance: number;
  total_granted: number;
  total_consumed: number;
  total_rolled_over: number;
  total_donated: number;
  topup_balance: number;
  total_topup_purchased: number;
  last_activity_at: string | null;
  updated_at: string;
}

export interface LaaSService {
  id: string;
  service_code: string;
  name_ar: string;
  name_en: string;
  description: string | null;
  credit_cost: number;
  internal_cost_points: number;
  complexity_tier: string;
  sla_hours: number | null;
  is_automated: boolean;
  category: string;
  segment: string | null;
  is_active: boolean;
  created_at: string;
}

export interface LaaSTransaction {
  id: string;
  wallet_id: string;
  subscriber_id: string;
  service_id: string | null;
  transaction_type: LaaSTransactionType;
  points: number;
  balance_after: number;
  description: string | null;
  urgency_multiplier: number;
  original_points: number | null;
  is_topup: boolean;
  topup_markup_pct: number;
  created_at: string;
  service?: LaaSService | null;
}

export interface LaaSTriageAudit {
  id: string;
  subscriber_id: string;
  segment: LaaSSegment;
  audit_data: Record<string, unknown> | null;
  audit_score: number | null;
  recommended_plan_id: string | null;
  quarterly_action_plan: Record<string, unknown> | null;
  status: LaaSTriageStatus;
  completed_at: string | null;
  created_at: string;
}

export interface LaaSProactiveConsumption {
  id: string;
  subscriber_id: string;
  service_description: string;
  points_consumed: number;
  result_summary: string | null;
  triggered_by: string;
  created_at: string;
}

export interface LaaSRollover {
  id: string;
  subscriber_id: string;
  period_end: string;
  remaining_points: number;
  rollover_points: number;
  donated_points: number;
  training_points: number;
  rollover_type: LaaSRolloverType;
  created_at: string;
}

export interface LaaSChurnAction {
  id: string;
  subscriber_id: string;
  churn_trigger: LaaSChurnTrigger;
  smart_action: LaaSSmartAction;
  action_details: string | null;
  status: LaaSChurnStatus;
  created_at: string;
  resolved_at: string | null;
  subscriber?: LaaSSubscriber | null;
}

export interface LaaSPanicIncident {
  id: string;
  subscriber_id: string;
  incident_type: string;
  description: string | null;
  points_consumed: number;
  status: LaaSPanicStatus;
  assigned_attorney: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface LaaSProtectionMeter {
  id: string;
  subscriber_id: string;
  month: string;
  compliance_score: number;
  contracts_reviewed: number;
  consultations_done: number;
  risk_alerts: number;
  created_at: string;
}

// ===== Display Constants =====

export const SEGMENT_LABELS: Record<LaaSSegment, { label: string; short: string; icon: string }> = {
  b2b: { label: 'الشركات — B2B Corporate', short: 'B2B', icon: 'Building2' },
  b2c: { label: 'الأفراد — B2C Individuals', short: 'B2C', icon: 'User' },
  b2l: { label: 'المحامون — B2L Lawyers', short: 'B2L', icon: 'Scale' },
};

export const SEGMENT_STYLES: Record<LaaSSegment, { bg: string; text: string; border: string; accent: string }> = {
  b2b: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', accent: 'bg-blue-500' },
  b2c: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300', accent: 'bg-emerald-500' },
  b2l: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', accent: 'bg-amber-500' },
};

export const SUBSCRIBER_STATUS_STYLES: Record<LaaSSubscriberStatus, { label: string; bg: string; text: string; dot: string }> = {
  active: { label: 'نشط', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  past_due: { label: 'متأخر السداد', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500 animate-pulse' },
  frozen: { label: 'مجمد', bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  emergency: { label: 'وضع الطوارئ', bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500 animate-pulse' },
  cancelled: { label: 'ملغى', bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-700' },
};

export const TRANSACTION_TYPE_STYLES: Record<LaaSTransactionType, { label: string; bg: string; text: string; sign: string }> = {
  grant: { label: 'منح', bg: 'bg-emerald-50', text: 'text-emerald-700', sign: '+' },
  consume: { label: 'استهلاك', bg: 'bg-blue-50', text: 'text-blue-700', sign: '-' },
  rollover: { label: 'ترحيل', bg: 'bg-amber-50', text: 'text-amber-700', sign: '+' },
  donate: { label: 'تبرع', bg: 'bg-purple-50', text: 'text-purple-700', sign: '-' },
  adjust: { label: 'تسوية', bg: 'bg-gray-100', text: 'text-gray-600', sign: '±' },
};

export const CHURN_TRIGGER_LABELS: Record<LaaSChurnTrigger, { label: string; traditional: string; smart: string }> = {
  nonpayment: {
    label: 'تخلف عن السداد',
    traditional: 'إيقاف الخدمة فوراً',
    smart: 'تحويل الحساب لوضع الطوارئ — استشارات حرجة فقط + تقسيط المبلغ المتبقي',
  },
  inactive: {
    label: 'عدم استخدام المنصة',
    traditional: 'إرسال إيميلات تسويقية',
    smart: 'تفعيل الاستهلاك الاستباقي — إثبات القيمة بالعمل لا بالكلام',
  },
  cancel_request: {
    label: 'طلب إلغاء الاشتراك',
    traditional: 'محاولة إقناع هاتفية',
    smart: 'تفعيل الاشتراك المجمد — أرشيف + عقود قديمة مقابل رسوم رمزية',
  },
};

export const SMART_ACTION_LABELS: Record<LaaSSmartAction, { label: string; icon: string; color: string }> = {
  emergency_mode: { label: 'وضع الطوارئ', icon: 'AlertTriangle', color: 'text-orange-600' },
  proactive_consumption: { label: 'استهلاك استباقي', icon: 'Zap', color: 'text-amber-600' },
  frozen_subscription: { label: 'اشتراك مجمد', icon: 'Snowflake', color: 'text-blue-600' },
};

export const ROLLOVER_TYPE_LABELS: Record<LaaSRolloverType, { label: string; icon: string; color: string }> = {
  rollover: { label: 'ترحيل للعام القادم', icon: 'RefreshCw', color: 'text-emerald-600' },
  training: { label: 'جلسة تدريبية', icon: 'GraduationCap', color: 'text-blue-600' },
  probono: { label: 'ساعات عمل خيري', icon: 'Heart', color: 'text-rose-600' },
};

export const SERVICE_CATEGORY_LABELS: Record<string, string> = {
  consultation: 'استشارة',
  contract: 'عقود',
  litigation: 'تقاضٍ',
  compliance: 'امتثال',
  emergency: 'طوارئ',
  research: 'أبحاث',
  template: 'قوالب',
  facility: 'مرافق',
  administrative: 'إداري',
  corporate: 'شركات',
};

export const COMPLEXITY_TIER_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  quick: { label: 'سريع — هامش مرتفع', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  corporate: { label: 'شركات — استهلاك متوسط', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  emergency: { label: 'طوارئ — استهلاك أقصى', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  standard: { label: 'قياسي', bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
};

export const PROACTIVE_ACTION_LABELS: Record<LaaSProactiveActionType, { label: string; icon: string; color: string }> = {
  auto_audit: { label: 'فحص آلي', icon: 'ScanSearch', color: 'text-blue-600' },
  contract_review: { label: 'مراجعة عقود', icon: 'FileSearch', color: 'text-emerald-600' },
  precedent_summary: { label: 'ملخص أحكام', icon: 'BookOpen', color: 'text-amber-600' },
  compliance_check: { label: 'فحص امتثال', icon: 'ShieldCheck', color: 'text-purple-600' },
  custom: { label: 'مخصص', icon: 'Sparkles', color: 'text-ink' },
};

export const PROFILE_TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  CORPORATE_FINANCE: { label: 'شركات إدارة المحافظ المالية', icon: 'Landmark', color: 'text-blue-700' },
  CORPORATE_LABOR: { label: 'شركات ذات عمالة كثيفة', icon: 'Users', color: 'text-emerald-700' },
  LAW_FIRM: { label: 'مؤسسات قانونية ومحاماة', icon: 'Scale', color: 'text-amber-700' },
  FAMILY_INDIVIDUAL: { label: 'أفراد وعائلات', icon: 'User', color: 'text-rose-700' },
};

export const DELIVERY_STATUS_STYLES: Record<LaaSDeliveryStatus, { label: string; bg: string; text: string }> = {
  pending: { label: 'قيد التسليم', bg: 'bg-amber-50', text: 'text-amber-700' },
  delivered: { label: 'تم التسليم', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  failed: { label: 'فشل', bg: 'bg-red-50', text: 'text-red-700' },
};

export const DELIVERY_TARGET_LABELS: Record<LaaSDeliveryTarget, { label: string; icon: string }> = {
  notification: { label: 'إشعار', icon: 'Mail' },
  trello: { label: 'Trello', icon: 'Trello' },
  webhook: { label: 'Webhook', icon: 'Webhook' },
};

// ===== Onboarding Flow Types =====

export type LaaSDiagnosticStatus = 'pending' | 'sent' | 'reviewed' | 'converted';
export type LaaSPilotStatus = 'offered' | 'active' | 'expired' | 'converted' | 'declined';

export interface LaaSOnboardingDiagnostic {
  id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  segment: LaaSSegment;
  has_employment_contracts: boolean;
  has_compliance_officer: boolean;
  tracks_regulatory_updates: boolean;
  has_dispute_protocol: boolean;
  data_localization_required: boolean;
  risk_score: number;
  risk_gaps: string[];
  diagnostic_status: LaaSDiagnosticStatus;
  meeting_scheduled_at: string | null;
  converted_subscriber_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LaaSPilotPack {
  id: string;
  diagnostic_id: string | null;
  subscriber_id: string | null;
  company_name: string;
  contact_email: string | null;
  points_granted: number;
  points_consumed: number;
  duration_days: number;
  status: LaaSPilotStatus;
  offered_at: string;
  activated_at: string | null;
  expires_at: string | null;
  converted_at: string | null;
  notes: string | null;
  created_at: string;
}

export const DIAGNOSTIC_STATUS_STYLES: Record<LaaSDiagnosticStatus, { label: string; bg: string; text: string }> = {
  pending: { label: 'بانتظار الإرسال', bg: 'bg-gray-100', text: 'text-gray-600' },
  sent: { label: 'تم إرسال التقرير', bg: 'bg-blue-50', text: 'text-blue-700' },
  reviewed: { label: 'تمت المراجعة', bg: 'bg-amber-50', text: 'text-amber-700' },
  converted: { label: 'تم التحويل لعميل', bg: 'bg-emerald-50', text: 'text-emerald-700' },
};

export const PILOT_STATUS_STYLES: Record<LaaSPilotStatus, { label: string; bg: string; text: string }> = {
  offered: { label: 'عرض مُقدَّم', bg: 'bg-amber-50', text: 'text-amber-700' },
  active: { label: 'تجريبية نشطة', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  expired: { label: 'منتهية', bg: 'bg-gray-100', text: 'text-gray-500' },
  converted: { label: 'تم التحويل لاشتراك', bg: 'bg-blue-50', text: 'text-blue-700' },
  declined: { label: 'مرفوض', bg: 'bg-red-50', text: 'text-red-700' },
};

// ===== White-Label Legal Network Types =====

export type LaaSTaskType = 'memo' | 'contract_review' | 'precedent_research' | 'legal_opinion';
export type LaaSTaskStatus =
  | 'pending_matching' | 'offered' | 'accepted' | 'drafting'
  | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'completed' | 'cancelled';
export type LaaSEscrowStatus = 'held' | 'partially_released' | 'fully_released' | 'refunded';

export interface LaaSExternalLawyer {
  id: string;
  display_name: string;
  real_name: string;
  email: string | null;
  phone: string | null;
  jurisdiction: string;
  specialties: string[];
  quality_score: number;
  acceptance_rate: number;
  avg_completion_hours: number;
  total_tasks_completed: number;
  total_earnings_points: number;
  is_active: boolean;
  is_available: boolean;
  rating: number | null;
  created_at: string;
  updated_at: string;
}

export interface LaaSExternalTask {
  id: string;
  subscriber_id: string;
  lawyer_id: string | null;
  task_type: LaaSTaskType;
  specialty_required: string;
  jurisdiction_required: string;
  original_content: string;
  anonymized_content: string;
  client_real_name: string | null;
  opponent_real_name: string | null;
  allocated_points: number;
  lawyer_payout_points: number;
  platform_margin_points: number;
  deadline_hours: number;
  status: LaaSTaskStatus;
  offered_at: string | null;
  accepted_at: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  escrow_released_pct: number;
  draft_content: string | null;
  in_house_reviewer: string | null;
  review_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface LaaSEscrowTransaction {
  id: string;
  task_id: string;
  subscriber_id: string;
  lawyer_id: string | null;
  points_held: number;
  lawyer_payout_points: number;
  platform_margin_points: number;
  initial_release_pct: number;
  final_release_pct: number;
  initial_released_at: string | null;
  final_released_at: string | null;
  status: LaaSEscrowStatus;
  created_at: string;
  updated_at: string;
}

export interface LaaSAnonymizationLog {
  id: string;
  task_id: string;
  original_field: string;
  original_value: string;
  masked_value: string;
  created_at: string;
}

export const TASK_TYPE_LABELS: Record<LaaSTaskType, { label: string; icon: string }> = {
  memo: { label: 'مذكرة دفاع', icon: 'FileText' },
  contract_review: { label: 'مراجعة عقد', icon: 'FileSearch' },
  precedent_research: { label: 'بحث سوابق قضائية', icon: 'BookOpen' },
  legal_opinion: { label: 'رأي قانوني', icon: 'Scale' },
};

export const TASK_STATUS_STYLES: Record<LaaSTaskStatus, { label: string; bg: string; text: string }> = {
  pending_matching: { label: 'بانتظار المطابقة', bg: 'bg-gray-100', text: 'text-gray-600' },
  offered: { label: 'عُرضت على محامٍ', bg: 'bg-blue-50', text: 'text-blue-700' },
  accepted: { label: 'قُبلت', bg: 'bg-indigo-50', text: 'text-indigo-700' },
  drafting: { label: 'قيد الصياغة', bg: 'bg-amber-50', text: 'text-amber-700' },
  submitted: { label: 'سُلِّمت المسودة', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  in_review: { label: 'قيد المراجعة الداخلية', bg: 'bg-purple-50', text: 'text-purple-700' },
  approved: { label: 'اعتُمدت', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  rejected: { label: 'رُفضت', bg: 'bg-red-50', text: 'text-red-700' },
  completed: { label: 'مكتملة', bg: 'bg-green-50', text: 'text-green-700' },
  cancelled: { label: 'ملغاة', bg: 'bg-gray-100', text: 'text-gray-500' },
};

export const ESCROW_STATUS_STYLES: Record<LaaSEscrowStatus, { label: string; bg: string; text: string }> = {
  held: { label: 'مُحجوزة في الضمان', bg: 'bg-amber-50', text: 'text-amber-700' },
  partially_released: { label: 'إفراج جزئي (70%)', bg: 'bg-blue-50', text: 'text-blue-700' },
  fully_released: { label: 'إفراج كامل (100%)', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  refunded: { label: 'مُستردة', bg: 'bg-red-50', text: 'text-red-700' },
};

export const SPECIALTY_LABELS: Record<string, string> = {
  labor: 'قانون العمل',
  commercial: 'القانون التجاري',
  corporate: 'قانون الشركات',
  civil: 'القانون المدني',
  criminal: 'القانون الجنائي',
  administrative: 'القانون الإداري',
  family: 'الأحوال الشخصية',
  intellectual: 'الملكية الفكرية',
};

// ===== LOCC (Legal Operations Command Center) Types =====

export type LaaSSignalType =
  | 'deadline_risk' | 'security_breach' | 'stagnant_credits' | 'margin_drop'
  | 'first_pass_drop' | 'anonymization_failure' | 'sla_breach' | 'upload_anomaly';
export type LaaSSignalSeverity = 'critical' | 'warning' | 'opportunity';
export type LaaSSignalStatus = 'active' | 'acknowledged' | 'executed' | 'dismissed' | 'expired';
export type LaaSActionType =
  | 'force_reassign' | 'security_isolate' | 'activate_autopilot'
  | 'adjust_pricing' | 'escalate' | 'dismiss';

export interface LaaSLOCCSignal {
  id: string;
  signal_type: LaaSSignalType;
  severity: LaaSSignalSeverity;
  title: string;
  description: string;
  source_entity: string | null;
  source_id: string | null;
  jurisdiction: string | null;
  hours_remaining: number | null;
  points_value: number | null;
  proposed_action: string | null;
  action_type: LaaSActionType;
  status: LaaSSignalStatus;
  executed_at: string | null;
  executed_by: string | null;
  execution_result: string | null;
  created_at: string;
  updated_at: string;
}

export interface LaaSLOCCAuditLog {
  id: string;
  signal_id: string | null;
  action_type: string;
  description: string;
  executed_by: string;
  severity: string | null;
  created_at: string;
}

export interface LaaSLOCCReport {
  id: string;
  report_type: 'executive_summary' | 'intellectual_asset' | 'sovereignty_audit';
  title: string;
  period_start: string | null;
  period_end: string | null;
  summary: string;
  metrics: Record<string, number | string>;
  generated_by: string;
  created_at: string;
}

export const SIGNAL_TYPE_LABELS: Record<LaaSActionType, { label: string; icon: string }> = {
  force_reassign: { label: 'إعادة تعيين قسرية', icon: 'Repeat' },
  security_isolate: { label: 'العزل الأمني', icon: 'Lock' },
  activate_autopilot: { label: 'تفعيل الحماية التلقائية', icon: 'Bot' },
  adjust_pricing: { label: 'تعديل تسعير النقاط', icon: 'Calculator' },
  escalate: { label: 'تصعيد', icon: 'ArrowUp' },
  dismiss: { label: 'تجاهل', icon: 'X' },
};

export const SEVERITY_STYLES: Record<LaaSSignalSeverity, { label: string; dot: string; text: string; bg: string; border: string; glow: string }> = {
  critical: { label: 'حرج', dot: 'bg-locc-critical', text: 'text-locc-critical', bg: 'bg-locc-critical-dim', border: 'border-locc-critical/40', glow: 'shadow-glow-critical' },
  warning: { label: 'تشغيلي', dot: 'bg-locc-warning', text: 'text-locc-warning', bg: 'bg-locc-warning-dim', border: 'border-locc-warning/40', glow: 'shadow-glow-warning' },
  opportunity: { label: 'فرصة', dot: 'bg-locc-success', text: 'text-locc-success', bg: 'bg-locc-success-dim', border: 'border-locc-success/40', glow: 'shadow-glow-success' },
};

// ===== RBAC Management Board Types =====

export type LaaSDashboardId =
  | 'dashboard_legal_qc' | 'dashboard_network_whitelabel'
  | 'dashboard_client_success' | 'dashboard_financial_ops'
  | 'dashboard_security_privacy';

export interface LaaSRbacRole {
  id: string;
  role_id: string;
  display_name_ar: string;
  description: string;
  mfa_required: boolean;
  hardware_key_required: boolean;
  allowed_dashboards: string[];
  permissions: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type LaaSClientSuccessActionType =
  | 'stagnation_alert' | 'autopilot_protection' | 'trello_sync' | 'renewal_offer';
export type LaaSClientSuccessStatus = 'pending' | 'executed' | 'synced' | 'failed';

export interface LaaSClientSuccessAction {
  id: string;
  subscriber_id: string;
  action_type: LaaSClientSuccessActionType;
  company_type: string;
  stagnation_days: number;
  points_balance: number;
  points_spent: number | null;
  service_title: string | null;
  service_summary: string | null;
  trello_card_id: string | null;
  trello_list_name: string | null;
  status: LaaSClientSuccessStatus;
  executed_by: string;
  created_at: string;
  updated_at: string;
}

export interface LaaSTrelloSync {
  id: string;
  subscriber_id: string;
  action_id: string | null;
  board_name: string;
  list_name: string;
  card_name: string;
  card_url: string | null;
  trello_card_id: string | null;
  sync_status: string;
  webhook_health: string;
  created_at: string;
}

export type LaaSFinancialOpsType =
  | 'pricing_adjustment' | 'partner_payout' | 'wallet_freeze' | 'escrow_settlement';

export interface LaaSFinancialOpsLog {
  id: string;
  action_type: LaaSFinancialOpsType;
  target_entity: string | null;
  points_before: number | null;
  points_after: number | null;
  cash_value: number | null;
  specialty: string | null;
  status: string;
  executed_by: string;
  notes: string | null;
  created_at: string;
}

export type LaaSSecurityEventType =
  | 'mass_download' | 'anonymization_check' | 'sandbox_breach'
  | 'unauthorized_access' | 'sandbox_purge';

export interface LaaSSecurityEvent {
  id: string;
  event_type: LaaSSecurityEventType;
  severity: 'critical' | 'warning' | 'info';
  source_entity: string | null;
  source_ip: string | null;
  description: string;
  action_taken: string | null;
  status: string;
  resolved_at: string | null;
  created_at: string;
}

export const DASHBOARD_LABELS: Record<LaaSDashboardId, { label: string; icon: string; color: string }> = {
  dashboard_legal_qc: { label: 'الشؤون القانونية والجودة', icon: 'Scale', color: 'text-locc-critical' },
  dashboard_network_whitelabel: { label: 'شبكة المحامين بالباطن', icon: 'Network', color: 'text-locc-cyan' },
  dashboard_client_success: { label: 'نجاح العملاء والنمو', icon: 'Heart', color: 'text-locc-success' },
  dashboard_financial_ops: { label: 'العمليات المالية', icon: 'Wallet', color: 'text-locc-gold' },
  dashboard_security_privacy: { label: 'الأمن والسيادة الرقمية', icon: 'Shield', color: 'text-locc-critical' },
};

export const CS_ACTION_LABELS: Record<LaaSClientSuccessActionType, { label: string; icon: string }> = {
  stagnation_alert: { label: 'تنبيه ركود', icon: 'AlertTriangle' },
  autopilot_protection: { label: 'حماية استباقية', icon: 'Bot' },
  trello_sync: { label: 'مزامنة Trello', icon: 'Trello' },
  renewal_offer: { label: 'عرض تجديد', icon: 'Gift' },
};

export const FINOPS_TYPE_LABELS: Record<LaaSFinancialOpsType, { label: string; icon: string }> = {
  pricing_adjustment: { label: 'تعديل تسعير النقاط', icon: 'Calculator' },
  partner_payout: { label: 'تسوية أتعاب الشركاء', icon: 'DollarSign' },
  wallet_freeze: { label: 'إيقاف محفظة متنازع عليها', icon: 'Snowflake' },
  escrow_settlement: { label: 'تسوية الضمان', icon: 'Split' },
};

export const SECURITY_EVENT_LABELS: Record<LaaSSecurityEventType, { label: string; icon: string }> = {
  mass_download: { label: 'تحميل مكثف', icon: 'Download' },
  anonymization_check: { label: 'فحص التجهيل', icon: 'Fingerprint' },
  sandbox_breach: { label: 'اختراق البيئة المعزولة', icon: 'Lock' },
  unauthorized_access: { label: 'نفاذ غير مصرح', icon: 'ShieldAlert' },
  sandbox_purge: { label: 'مسح البيئة المعزولة', icon: 'Trash2' },
};

// ===== Deep Link Verification Types =====

export type LaaSDeepLinkAccessType =
  | 'token_generated' | 'token_verified' | 'mfa_challenged' | 'mfa_verified'
  | 'document_streamed' | 'token_revoked' | 'token_expired' | 'access_denied';

export interface LaaSDeepLinkToken {
  id: string;
  token: string;
  subscriber_id: string;
  doc_id: string;
  doc_title: string;
  trello_card_id: string | null;
  issued_at: string;
  expires_at: string;
  used_at: string | null;
  is_revoked: boolean;
  is_one_time: boolean;
  created_at: string;
  updated_at: string;
}

export interface LaaSMfaSession {
  id: string;
  subscriber_id: string;
  session_token: string;
  mfa_verified: boolean;
  otp_code: string | null;
  challenge_at: string | null;
  verified_at: string | null;
  expires_at: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}

export interface LaaSDocumentAccessLog {
  id: string;
  token_id: string | null;
  subscriber_id: string;
  doc_id: string;
  access_type: LaaSDeepLinkAccessType;
  ip_address: string | null;
  user_agent: string | null;
  result: string;
  created_at: string;
}

export const DEEPLINK_ACCESS_LABELS: Record<LaaSDeepLinkAccessType, { label: string; color: string }> = {
  token_generated: { label: 'توليد الرابط', color: 'text-locc-cyan' },
  token_verified: { label: 'تحقق من الرابط', color: 'text-locc-success' },
  mfa_challenged: { label: 'طلب توثيق MFA', color: 'text-locc-warning' },
  mfa_verified: { label: 'توثيق MFA ناجح', color: 'text-locc-success' },
  document_streamed: { label: 'بث المستند', color: 'text-locc-success' },
  token_revoked: { label: 'إلغاء الرابط', color: 'text-locc-critical' },
  token_expired: { label: 'انتهاء الصلاحية', color: 'text-locc-warning' },
  access_denied: { label: 'رفض الوصول', color: 'text-locc-critical' },
};

// ===== Fail2ban + Arabic Legal DLP + Unmasking Map Types =====

export type LaaSBanReason = 'token_enumeration' | 'mass_download' | 'brute_force' | 'revoked_link_access';
export type LaaSBanStatus = 'active' | 'expired' | 'unbanned' | 'whitelisted';

export interface LaaSBannedIp {
  id: string;
  ip_address: string;
  ban_reason: LaaSBanReason;
  failed_attempts: number;
  first_attempt_at: string;
  last_attempt_at: string;
  banned_until: string | null;
  is_permanent: boolean;
  is_whitelisted: boolean;
  jail_chain: string;
  status: LaaSBanStatus;
  created_at: string;
  updated_at: string;
}

export interface LaaSF2bEvent {
  id: string;
  ip_address: string;
  http_status: number;
  token_snippet: string | null;
  endpoint: string | null;
  user_agent: string | null;
  created_at: string;
}

export type LaaSDlpEntityType =
  | 'PARTY_NAME' | 'COMPANY_NAME' | 'NATIONAL_ID' | 'CASE_NUMBER'
  | 'FINANCIAL_AMOUNT' | 'COMMERCIAL_REG' | 'LOCATION' | 'DOC_REF';

export interface LaaSDlpAuditLog {
  id: string;
  doc_id: string;
  doc_blind_index: string | null;
  entity_type: LaaSDlpEntityType;
  entity_count: number;
  anonymization_method: string;
  masked_text_preview: string | null;
  map_id: string | null;
  executed_by: string;
  created_at: string;
}

export interface LaaSUnmaskingMap {
  id: string;
  doc_blind_index: string;
  encrypted_dek: string;
  encrypted_map_payload: string;
  iv: string;
  status: 'ACTIVE' | 'REVOKED' | 'PURGED' | 'EXPIRED';
  created_at: string;
  expires_at: string;
  purged_at: string | null;
  key_version?: number | null;
  vault_ciphertext?: string | null;
}

export interface LaaSVaultKeyVersion {
  id: string;
  key_name: string;
  version: number;
  is_encryption_active: boolean;
  can_decrypt: boolean;
  rotated_at: string;
  rotated_by: string;
  created_at: string;
}

export interface LaaSKeyRotationAudit {
  id: string;
  operation: string;
  key_name: string;
  version: number | null;
  ciphertext_preview: string | null;
  performed_by: string;
  created_at: string;
}

export const BAN_REASON_LABELS: Record<LaaSBanReason, { label: string; color: string }> = {
  token_enumeration: { label: 'تخمين الروابط', color: 'text-locc-critical' },
  mass_download: { label: 'تحميل مكثف', color: 'text-locc-critical' },
  brute_force: { label: 'هجوم قوة عمياء', color: 'text-locc-warning' },
  revoked_link_access: { label: 'نفاذ رابط ملغي', color: 'text-locc-warning' },
};

export const DLP_ENTITY_LABELS: Record<LaaSDlpEntityType, { label: string; placeholder: string }> = {
  PARTY_NAME: { label: 'اسم طرف', placeholder: '[PARTY_NAME_X]' },
  COMPANY_NAME: { label: 'اسم شركة', placeholder: '[COMPANY_NAME_X]' },
  NATIONAL_ID: { label: 'رقم قومي', placeholder: '[NATIONAL_ID_X]' },
  CASE_NUMBER: { label: 'رقم قضية', placeholder: '[CASE_NUMBER_X]' },
  FINANCIAL_AMOUNT: { label: 'مبلغ مالي', placeholder: '[FINANCIAL_AMOUNT_X]' },
  COMMERCIAL_REG: { label: 'سجل تجاري', placeholder: '[COMMERCIAL_REG_X]' },
  LOCATION: { label: 'عنوان', placeholder: '[LOCATION_X]' },
  DOC_REF: { label: 'مرجع مستند', placeholder: '[DOC_REF_X]' },
};

export const KEY_OP_LABELS: Record<string, { label: string; color: string }> = {
  create: { label: 'إنشاء', color: 'text-locc-cyan' },
  rotate: { label: 'تدوير', color: 'text-locc-warning' },
  encrypt: { label: 'تشفير', color: 'text-locc-success' },
  decrypt: { label: 'فك تشفير', color: 'text-locc-cyan' },
  rewrap: { label: 'إعادة تغليف', color: 'text-locc-warning' },
};
