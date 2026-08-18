export interface AttorneyProfile {
  id: string;
  lf_attorney_id: string | null;
  name: string;
  specialties: string[];
  mentor_role: string;
  onboarding_status: string;
  onboarding_day: number;
  current_department: string;
  disconnect_active: boolean;
  active_cards_count: number;
  hire_date: string;
}

export interface BoardCard {
  id: string;
  title: string;
  description: string | null;
  column_status: 'incoming' | 'triage' | 'in_progress' | 'review' | 'completed';
  specialty: string;
  urgency: 'normal' | 'urgent' | 'critical';
  deadline: string | null;
  assigned_attorney_id: string | null;
  assigned_attorney_name: string | null;
  requested_by: string | null;
  created_at: string;
  completed_at: string | null;
  is_overdue: boolean;
  escalation_sent: boolean;
}

export interface KpiScore {
  id: string;
  attorney_id: string | null;
  attorney_name: string;
  quarter: string;
  quality_score: number;
  efficiency_score: number;
  client_experience_score: number;
  institutional_score: number;
  total_score: number;
  classification: 'exceptional' | 'proficient' | 'needs_development';
  notes: string | null;
}

export interface PeerFeedback {
  id: string;
  reviewer_name: string | null;
  reviewee_name: string;
  collaboration_score: number;
  knowledge_sharing_score: number;
  comment: string | null;
  quarter: string | null;
  created_at: string;
}

export interface ClientReview {
  id: string;
  attorney_name: string;
  client_name: string | null;
  clarity_score: number;
  responsiveness_score: number;
  professionalism_score: number;
  nps_score: number;
  comment: string | null;
  created_at: string;
}

export interface RotationLog {
  id: string;
  attorney_name: string;
  from_department: string | null;
  to_department: string;
  start_date: string;
  end_date: string | null;
  notes: string | null;
}

export const COLUMNS = [
  { id: 'incoming', label: 'صندوق الوارد الآلي', color: 'border-t-gray-400' },
  { id: 'triage', label: 'التشخيص والفرز', color: 'border-t-blue-400' },
  { id: 'in_progress', label: 'قيد التنفيذ', color: 'border-t-amber-400' },
  { id: 'review', label: 'المراجعة والتدقيق', color: 'border-t-purple-400' },
  { id: 'completed', label: 'منجز ومؤرشف', color: 'border-t-emerald-400' },
] as const;

export const URGENCY_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  normal: { label: 'عادي', bg: 'bg-gray-100', text: 'text-gray-600' },
  urgent: { label: 'عاجل', bg: 'bg-amber-100', text: 'text-amber-700' },
  critical: { label: 'طوارئ', bg: 'bg-red-100', text: 'text-red-700' },
};

export const KPI_AXES = [
  { key: 'quality_score', label: 'الجودة الفنية', weight: 35, color: 'bg-blue-500', description: 'دقة الأبحاث، قوة المذكرات، اعتماد من المرة الأولى' },
  { key: 'efficiency_score', label: 'الكفاءة والابتكار', weight: 25, color: 'bg-amber-500', description: 'الالتزام بالموعد، إثراء المكتبة الرقمية، دقة التحديث' },
  { key: 'client_experience_score', label: 'رضا العملاء', weight: 25, color: 'bg-emerald-500', description: 'وضوح الشرح، سرعة التجاوب، الاحترافية' },
  { key: 'institutional_score', label: 'التطوير المؤسسي', weight: 15, color: 'bg-purple-500', description: 'نقل المعرفة، التقييم التبادلي، التوجيه' },
] as const;

export const CLASSIFICATION_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  exceptional: { label: 'متميز', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300' },
  proficient: { label: 'مستوفٍ للمعايير', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' },
  needs_development: { label: 'يحتاج تطوير', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' },
};

export function classifyScore(total: number): 'exceptional' | 'proficient' | 'needs_development' {
  if (total >= 90) return 'exceptional';
  if (total >= 75) return 'proficient';
  return 'needs_development';
}

export function calcTotalScore(quality: number, efficiency: number, client: number, institutional: number): number {
  return Math.round(
    (quality * 0.35 + efficiency * 0.25 + client * 0.25 + institutional * 0.15) * 100,
  ) / 100;
}
