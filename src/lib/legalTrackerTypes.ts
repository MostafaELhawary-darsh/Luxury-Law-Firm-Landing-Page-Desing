export interface TrackerMatter {
  id: string;
  title: string;
  lf_matter_id: string | null;
  client_id: string | null;
  client_name: string | null;
  triage_lane: 'green' | 'yellow' | 'red';
  current_milestone_index: number;
  matter_type: string;
  status: string;
  next_hearing_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrackerMilestone {
  id: string;
  matter_id: string;
  step_index: number;
  client_label: string;
  internal_label: string;
  is_completed: boolean;
  completed_at: string | null;
}

export interface TrackerClientAction {
  id: string;
  matter_id: string;
  description: string;
  status: 'pending' | 'completed';
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface TrackerUpdate {
  id: string;
  matter_id: string;
  client_message: string;
  internal_note: string | null;
  update_type: string;
  created_at: string;
}

export interface TrackerInternalNote {
  id: string;
  matter_id: string;
  risk_percentage: number | null;
  strategy: string | null;
  note_text: string;
  author_role: string;
  created_at: string;
}

export interface TrackerDocument {
  id: string;
  matter_id: string;
  name: string;
  doc_type: string;
  visibility: 'client' | 'internal';
  status: string;
  file_url: string | null;
  created_at: string;
}

export const TRIAGE_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  green: { label: 'مسار أخضر — روتيني', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300' },
  yellow: { label: 'مسار أصفر — استشاري', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-300' },
  red: { label: 'مسار أحمر — طوارئ', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-300' },
};
