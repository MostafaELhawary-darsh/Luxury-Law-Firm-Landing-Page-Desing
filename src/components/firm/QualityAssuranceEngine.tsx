import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, FileText,
  Shield, CircuitBoard, Zap, CheckCircle2, Clock, ArrowRight, Search,
  Activity, Server, AlertCircle, BadgeCheck, TrendingUp, TrendingDown,
  Minus, Target, ClipboardCheck, GraduationCap, BarChart3, Calendar, Star,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

/* ─────────────────────────────── Types ─────────────────────────────── */

interface QAEvaluation {
  id: string;
  evaluation_title: string;
  evaluatee_name: string;
  evaluatee_type: string;
  evaluation_period: string | null;
  kpi_score: number | null;
  productivity_score: number | null;
  quality_score: number | null;
  timeliness_score: number | null;
  overall_rating: number | null;
  notes: string | null;
  evaluated_by: string | null;
  created_at: string;
}

interface QAMetric {
  id: string;
  metric_name: string;
  metric_category: string;
  target_value: string | null;
  actual_value: string | null;
  unit: string | null;
  measurement_period: string | null;
  status: string;
  trend: string | null;
  created_at: string;
}

interface QAReview {
  id: string;
  review_title: string;
  review_type: string;
  reviewed_entity: string;
  reviewer: string;
  review_date: string;
  findings: string | null;
  recommendations: string | null;
  action_items: string | null;
  follow_up_date: string | null;
  status: string;
  created_at: string;
}

interface QAImprovement {
  id: string;
  improvement_title: string;
  area: string | null;
  current_state: string | null;
  target_state: string | null;
  action_plan: string | null;
  responsible_person: string | null;
  priority: string;
  progress: number;
  target_date: string | null;
  status: string;
  created_at: string;
}

type Tab = 'evaluations' | 'metrics' | 'reviews' | 'improvements';

/* ─────────────────────────────── Label Maps ─────────────────────────────── */

const EVALUATEE_TYPE_LABELS: Record<string, string> = {
  lawyer: 'محامٍ',
  advisor: 'مستشار',
  department: 'إدارة',
  team: 'فريق',
};

const METRIC_CATEGORY_LABELS: Record<string, string> = {
  productivity: 'الإنتاجية',
  quality: 'الجودة',
  timeliness: 'الالتزام بالمواعيد',
  financial: 'مالي',
  client_satisfaction: 'رضا العملاء',
};

const METRIC_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  on_track: { label: 'على المسار', bg: 'bg-green-50', text: 'text-green-700' },
  below_target: { label: 'أقل من الهدف', bg: 'bg-amber-50', text: 'text-amber-700' },
  critical: { label: 'حرج', bg: 'bg-red-50', text: 'text-red-700' },
};

const TREND_CONFIG: Record<string, { label: string; icon: typeof TrendingUp; color: string }> = {
  up: { label: 'صاعد', icon: TrendingUp, color: 'text-green-600' },
  down: { label: 'هابط', icon: TrendingDown, color: 'text-red-600' },
  stable: { label: 'مستقر', icon: Minus, color: 'text-ink/40' },
};

const REVIEW_TYPE_LABELS: Record<string, string> = {
  performance: 'أداء',
  compliance: 'امتثال',
  process: 'عملية',
  peer: 'نظير',
};

const REVIEW_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'قيد الانتظار', bg: 'bg-amber-50', text: 'text-amber-700' },
  in_progress: { label: 'قيد التنفيذ', bg: 'bg-blue-50', text: 'text-blue-700' },
  completed: { label: 'مكتمل', bg: 'bg-green-50', text: 'text-green-700' },
  follow_up: { label: 'متابعة', bg: 'bg-purple-50', text: 'text-purple-700' },
};

const PRIORITY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  low: { label: 'منخفض', bg: 'bg-green-50', text: 'text-green-700' },
  medium: { label: 'متوسط', bg: 'bg-amber-50', text: 'text-amber-700' },
  high: { label: 'عالي', bg: 'bg-orange-50', text: 'text-orange-700' },
  critical: { label: 'حرج', bg: 'bg-red-50', text: 'text-red-700' },
};

const IMPROVEMENT_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  planned: { label: 'مُخطَّط', bg: 'bg-blue-50', text: 'text-blue-700' },
  in_progress: { label: 'قيد التنفيذ', bg: 'bg-amber-50', text: 'text-amber-700' },
  completed: { label: 'مكتمل', bg: 'bg-green-50', text: 'text-green-700' },
  on_hold: { label: 'مُعلَّق', bg: 'bg-gray-100', text: 'text-gray-700' },
};

/* ─────────────────────────────── Forms ─────────────────────────────── */

interface EvaluationForm {
  evaluation_title: string;
  evaluatee_name: string;
  evaluatee_type: string;
  evaluation_period: string;
  kpi_score: string;
  productivity_score: string;
  quality_score: string;
  timeliness_score: string;
  overall_rating: string;
  notes: string;
  evaluated_by: string;
}

const emptyEvaluation: EvaluationForm = {
  evaluation_title: '', evaluatee_name: '', evaluatee_type: 'lawyer',
  evaluation_period: '', kpi_score: '0', productivity_score: '0',
  quality_score: '0', timeliness_score: '0', overall_rating: '0',
  notes: '', evaluated_by: '',
};

interface MetricForm {
  metric_name: string;
  metric_category: string;
  target_value: string;
  actual_value: string;
  unit: string;
  measurement_period: string;
  status: string;
  trend: string;
}

const emptyMetric: MetricForm = {
  metric_name: '', metric_category: 'productivity', target_value: '',
  actual_value: '', unit: '', measurement_period: '', status: 'on_track',
  trend: 'stable',
};

interface ReviewForm {
  review_title: string;
  review_type: string;
  reviewed_entity: string;
  reviewer: string;
  review_date: string;
  findings: string;
  recommendations: string;
  action_items: string;
  follow_up_date: string;
  status: string;
}

const emptyReview: ReviewForm = {
  review_title: '', review_type: 'performance', reviewed_entity: '',
  reviewer: '', review_date: '', findings: '', recommendations: '',
  action_items: '', follow_up_date: '', status: 'pending',
};

interface ImprovementForm {
  improvement_title: string;
  area: string;
  current_state: string;
  target_state: string;
  action_plan: string;
  responsible_person: string;
  priority: string;
  progress: string;
  target_date: string;
  status: string;
}

const emptyImprovement: ImprovementForm = {
  improvement_title: '', area: '', current_state: '', target_state: '',
  action_plan: '', responsible_person: '', priority: 'medium',
  progress: '0', target_date: '', status: 'planned',
};

/* ─────────────────────────────── Component ─────────────────────────────── */

export default function QualityAssuranceEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [evaluations, setEvaluations] = useState<QAEvaluation[]>([]);
  const [metrics, setMetrics] = useState<QAMetric[]>([]);
  const [reviews, setReviews] = useState<QAReview[]>([]);
  const [improvements, setImprovements] = useState<QAImprovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('evaluations');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const [evalForm, setEvalForm] = useState<EvaluationForm>(emptyEvaluation);
  const [metricForm, setMetricForm] = useState<MetricForm>(emptyMetric);
  const [reviewForm, setReviewForm] = useState<ReviewForm>(emptyReview);
  const [improvementForm, setImprovementForm] = useState<ImprovementForm>(emptyImprovement);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [evRes, metRes, revRes, impRes] = await Promise.all([
      supabase.from('m50_qa_evaluations').select('*').order('created_at', { ascending: false }),
      supabase.from('m50_qa_metrics').select('*').order('created_at', { ascending: false }),
      supabase.from('m50_qa_reviews').select('*').order('created_at', { ascending: false }),
      supabase.from('m50_qa_improvements').select('*').order('created_at', { ascending: false }),
    ]);
    setEvaluations((evRes.data as QAEvaluation[]) || []);
    setMetrics((metRes.data as QAMetric[]) || []);
    setReviews((revRes.data as QAReview[]) || []);
    setImprovements((impRes.data as QAImprovement[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      if (activeTab === 'evaluations') setEvalForm({ ...emptyEvaluation, evaluation_title: cmd.fields.title || '' });
      if (activeTab === 'metrics') setMetricForm({ ...emptyMetric, metric_name: cmd.fields.title || '' });
      if (activeTab === 'reviews') setReviewForm({ ...emptyReview, review_title: cmd.fields.title || '' });
      if (activeTab === 'improvements') setImprovementForm({ ...emptyImprovement, improvement_title: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const openAdd = () => {
    if (activeTab === 'evaluations') setEvalForm(emptyEvaluation);
    if (activeTab === 'metrics') setMetricForm(emptyMetric);
    if (activeTab === 'reviews') setReviewForm(emptyReview);
    if (activeTab === 'improvements') setImprovementForm(emptyImprovement);
    setEditingId(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    if (activeTab === 'evaluations') {
      if (!evalForm.evaluation_title.trim()) { setSaving(false); return; }
      const payload = {
        evaluation_title: evalForm.evaluation_title.trim(),
        evaluatee_name: evalForm.evaluatee_name.trim(),
        evaluatee_type: evalForm.evaluatee_type,
        evaluation_period: evalForm.evaluation_period.trim() || null,
        kpi_score: Number(evalForm.kpi_score) || 0,
        productivity_score: Number(evalForm.productivity_score) || 0,
        quality_score: Number(evalForm.quality_score) || 0,
        timeliness_score: Number(evalForm.timeliness_score) || 0,
        overall_rating: Number(evalForm.overall_rating) || 0,
        notes: evalForm.notes.trim() || null,
        evaluated_by: evalForm.evaluated_by.trim() || null,
      };
      if (editingId) await supabase.from('m50_qa_evaluations').update(payload).eq('id', editingId);
      else await supabase.from('m50_qa_evaluations').insert(payload);
    } else if (activeTab === 'metrics') {
      if (!metricForm.metric_name.trim()) { setSaving(false); return; }
      const payload = {
        metric_name: metricForm.metric_name.trim(),
        metric_category: metricForm.metric_category,
        target_value: metricForm.target_value.trim() || null,
        actual_value: metricForm.actual_value.trim() || null,
        unit: metricForm.unit.trim() || null,
        measurement_period: metricForm.measurement_period.trim() || null,
        status: metricForm.status,
        trend: metricForm.trend,
      };
      if (editingId) await supabase.from('m50_qa_metrics').update(payload).eq('id', editingId);
      else await supabase.from('m50_qa_metrics').insert(payload);
    } else if (activeTab === 'reviews') {
      if (!reviewForm.review_title.trim()) { setSaving(false); return; }
      const payload = {
        review_title: reviewForm.review_title.trim(),
        review_type: reviewForm.review_type,
        reviewed_entity: reviewForm.reviewed_entity.trim(),
        reviewer: reviewForm.reviewer.trim(),
        review_date: reviewForm.review_date || null,
        findings: reviewForm.findings.trim() || null,
        recommendations: reviewForm.recommendations.trim() || null,
        action_items: reviewForm.action_items.trim() || null,
        follow_up_date: reviewForm.follow_up_date || null,
        status: reviewForm.status,
      };
      if (editingId) await supabase.from('m50_qa_reviews').update(payload).eq('id', editingId);
      else await supabase.from('m50_qa_reviews').insert(payload);
    } else if (activeTab === 'improvements') {
      if (!improvementForm.improvement_title.trim()) { setSaving(false); return; }
      const payload = {
        improvement_title: improvementForm.improvement_title.trim(),
        area: improvementForm.area.trim() || null,
        current_state: improvementForm.current_state.trim() || null,
        target_state: improvementForm.target_state.trim() || null,
        action_plan: improvementForm.action_plan.trim() || null,
        responsible_person: improvementForm.responsible_person.trim() || null,
        priority: improvementForm.priority,
        progress: Number(improvementForm.progress) || 0,
        target_date: improvementForm.target_date || null,
        status: improvementForm.status,
      };
      if (editingId) await supabase.from('m50_qa_improvements').update(payload).eq('id', editingId);
      else await supabase.from('m50_qa_improvements').insert(payload);
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (activeTab === 'evaluations') await supabase.from('m50_qa_evaluations').delete().eq('id', deleteId);
    if (activeTab === 'metrics') await supabase.from('m50_qa_metrics').delete().eq('id', deleteId);
    if (activeTab === 'reviews') await supabase.from('m50_qa_reviews').delete().eq('id', deleteId);
    if (activeTab === 'improvements') await supabase.from('m50_qa_improvements').delete().eq('id', deleteId);
    setDeleteId(null);
    fetchAll();
  };

  /* ── Filters ── */

  const filteredEvaluations = evaluations.filter((e) => {
    if (filterType !== 'all' && e.evaluatee_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!e.evaluation_title.toLowerCase().includes(q) && !e.evaluatee_name.toLowerCase().includes(q) && !(e.evaluated_by || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filteredMetrics = metrics.filter((m) => {
    if (filterType !== 'all' && m.metric_category !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!m.metric_name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filteredReviews = reviews.filter((r) => {
    if (filterType !== 'all' && r.review_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!r.review_title.toLowerCase().includes(q) && !r.reviewed_entity.toLowerCase().includes(q) && !r.reviewer.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filteredImprovements = improvements.filter((i) => {
    if (filterType !== 'all' && i.priority !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!i.improvement_title.toLowerCase().includes(q) && (i.area || '').toLowerCase().includes(q) && (i.responsible_person || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const avgRating = evaluations.length > 0 ? (evaluations.reduce((s, e) => s + (e.overall_rating || 0), 0) / evaluations.length).toFixed(1) : '0';
  const onTrackMetrics = metrics.filter((m) => m.status === 'on_track').length;
  const criticalMetrics = metrics.filter((m) => m.status === 'critical').length;
  const completedReviews = reviews.filter((r) => r.status === 'completed').length;
  const completedImprovements = improvements.filter((i) => i.status === 'completed').length;
  const highPriorityImprovements = improvements.filter((i) => i.priority === 'high' || i.priority === 'critical').length;

  const tabs: { id: Tab; label: string; icon: typeof Star; badge?: number }[] = [
    { id: 'evaluations', label: 'التقييمات', icon: Star, badge: evaluations.length },
    { id: 'metrics', label: 'المؤشرات', icon: Target, badge: metrics.length },
    { id: 'reviews', label: 'المراجعات', icon: ClipboardCheck, badge: reviews.length },
    { id: 'improvements', label: 'التحسينات', icon: TrendingUp, badge: improvements.length },
  ];

  const currentFilterLabels =
    activeTab === 'evaluations' ? EVALUATEE_TYPE_LABELS :
    activeTab === 'metrics' ? METRIC_CATEGORY_LABELS :
    activeTab === 'reviews' ? REVIEW_TYPE_LABELS :
    PRIORITY_CONFIG;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <BadgeCheck size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">التقييم المؤسسي والجودة (M50)</h2>
            <p className="font-body text-[10px] text-ink/40">إدارة التقييمات والمؤشرات والمراجعات والتحسينات المؤسسية</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Shield size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">Air-Gapped · QA</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> إضافة جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {activeTab === 'evaluations' && (
          <>
            <StatCard icon={<Star size={14} className="text-midnight" />} label="إجمالي التقييمات" value={String(evaluations.length)} valueClass="text-midnight" />
            <StatCard icon={<Activity size={14} className="text-blue-600" />} label="متوسط التقييم" value={avgRating} valueClass="text-blue-700" />
            <StatCard icon={<GraduationCap size={14} className="text-amber-600" />} label="تقييم المحامين" value={String(evaluations.filter((e) => e.evaluatee_type === 'lawyer').length)} valueClass="text-amber-700" />
            <StatCard icon={<Server size={14} className="text-purple-600" />} label="تقييم الإدارات" value={String(evaluations.filter((e) => e.evaluatee_type === 'department').length)} valueClass="text-purple-700" />
          </>
        )}
        {activeTab === 'metrics' && (
          <>
            <StatCard icon={<Target size={14} className="text-midnight" />} label="إجمالي المؤشرات" value={String(metrics.length)} valueClass="text-midnight" />
            <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="على المسار" value={String(onTrackMetrics)} valueClass="text-green-700" />
            <StatCard icon={<AlertCircle size={14} className="text-red-600" />} label="حرج" value={String(criticalMetrics)} valueClass="text-red-700" />
            <StatCard icon={<Clock size={14} className="text-amber-600" />} label="أقل من الهدف" value={String(metrics.filter((m) => m.status === 'below_target').length)} valueClass="text-amber-700" />
          </>
        )}
        {activeTab === 'reviews' && (
          <>
            <StatCard icon={<ClipboardCheck size={14} className="text-midnight" />} label="إجمالي المراجعات" value={String(reviews.length)} valueClass="text-midnight" />
            <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="مكتملة" value={String(completedReviews)} valueClass="text-green-700" />
            <StatCard icon={<Clock size={14} className="text-amber-600" />} label="قيد الانتظار" value={String(reviews.filter((r) => r.status === 'pending').length)} valueClass="text-amber-700" />
            <StatCard icon={<Activity size={14} className="text-blue-600" />} label="قيد التنفيذ" value={String(reviews.filter((r) => r.status === 'in_progress').length)} valueClass="text-blue-700" />
          </>
        )}
        {activeTab === 'improvements' && (
          <>
            <StatCard icon={<TrendingUp size={14} className="text-midnight" />} label="إجمالي التحسينات" value={String(improvements.length)} valueClass="text-midnight" />
            <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="مكتملة" value={String(completedImprovements)} valueClass="text-green-700" />
            <StatCard icon={<AlertCircle size={14} className="text-red-600" />} label="أولوية عالية/حرجة" value={String(highPriorityImprovements)} valueClass="text-red-700" />
            <StatCard icon={<Clock size={14} className="text-amber-600" />} label="قيد التنفيذ" value={String(improvements.filter((i) => i.status === 'in_progress').length)} valueClass="text-amber-700" />
          </>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setFilterType('all'); setSearchQuery(''); }}
              className={`flex items-center gap-1.5 px-4 py-2.5 font-body text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'text-gold border-gold' : 'text-ink/40 border-transparent hover:text-ink/60'}`}>
              <Icon size={14} /> {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${activeTab === tab.id ? 'bg-gold text-midnight' : 'bg-gray-200 text-ink/50'}`}>{tab.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="!w-auto !py-1.5 !text-xs">
          <option value="all">كل الأنواع</option>
          {Object.entries(currentFilterLabels).map(([v, l]) => <option key={v} value={v}>{typeof l === 'string' ? l : l.label}</option>)}
        </Select>
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
          <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث..." className="!py-1.5 !text-xs pr-9" />
        </div>
      </div>

      {/* ── Evaluations tab ── */}
      {activeTab === 'evaluations' && (
        <div className="space-y-2">
          {filteredEvaluations.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Star size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد تقييمات مسجلة</p>
            </div>
          ) : filteredEvaluations.map((e) => (
            <div key={e.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-50">
                    <Star size={14} className="text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{EVALUATEE_TYPE_LABELS[e.evaluatee_type] || e.evaluatee_type}</span>
                      {e.overall_rating !== null && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-gold/10 text-gold font-bold"><Star size={8} /> {e.overall_rating}</span>}
                    </div>
                    <p className="font-body text-xs font-bold text-midnight mt-1">{e.evaluation_title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="font-body text-[9px] text-ink/40">المُقيَّم: {e.evaluatee_name}</span>
                      {e.evaluated_by && <span className="font-body text-[9px] text-ink/40">بواسطة: {e.evaluated_by}</span>}
                      {e.evaluation_period && <span className="font-body text-[9px] text-ink/40">{e.evaluation_period}</span>}
                    </div>
                    {e.notes && <p className="font-body text-xs text-ink/60 mt-1 leading-snug line-clamp-2">{e.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEvalForm({ evaluation_title: e.evaluation_title, evaluatee_name: e.evaluatee_name, evaluatee_type: e.evaluatee_type, evaluation_period: e.evaluation_period || '', kpi_score: String(e.kpi_score || 0), productivity_score: String(e.productivity_score || 0), quality_score: String(e.quality_score || 0), timeliness_score: String(e.timeliness_score || 0), overall_rating: String(e.overall_rating || 0), notes: e.notes || '', evaluated_by: e.evaluated_by || '' }); setEditingId(e.id); setModalOpen(true); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                  <button onClick={() => setDeleteId(e.id)} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Metrics tab ── */}
      {activeTab === 'metrics' && (
        <div className="space-y-2">
          {filteredMetrics.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Target size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد مؤشرات مسجلة</p>
            </div>
          ) : filteredMetrics.map((m) => {
            const stCfg = METRIC_STATUS_CONFIG[m.status] || METRIC_STATUS_CONFIG.on_track;
            const tCfg = m.trend ? TREND_CONFIG[m.trend] : null;
            const TrendIcon = tCfg?.icon;
            return (
              <div key={m.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-50">
                      <Target size={14} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${stCfg.bg} ${stCfg.text}`}>{stCfg.label}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{METRIC_CATEGORY_LABELS[m.metric_category] || m.metric_category}</span>
                        {tCfg && TrendIcon && <span className={`flex items-center gap-0.5 text-[9px] font-body font-bold ${tCfg.color}`}><TrendIcon size={10} /> {tCfg.label}</span>}
                      </div>
                      <p className="font-body text-xs font-bold text-midnight mt-1">{m.metric_name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {m.target_value && <span className="font-body text-[9px] text-ink/40">الهدف: {m.target_value}{m.unit ? ` ${m.unit}` : ''}</span>}
                        {m.actual_value && <span className="font-body text-[9px] text-gold font-bold">الفعلي: {m.actual_value}{m.unit ? ` ${m.unit}` : ''}</span>}
                        {m.measurement_period && <span className="font-body text-[9px] text-ink/40">{m.measurement_period}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setMetricForm({ metric_name: m.metric_name, metric_category: m.metric_category, target_value: m.target_value || '', actual_value: m.actual_value || '', unit: m.unit || '', measurement_period: m.measurement_period || '', status: m.status, trend: m.trend || 'stable' }); setEditingId(m.id); setModalOpen(true); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                    <button onClick={() => setDeleteId(m.id)} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Reviews tab ── */}
      {activeTab === 'reviews' && (
        <div className="space-y-2">
          {filteredReviews.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <ClipboardCheck size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد مراجعات مسجلة</p>
            </div>
          ) : filteredReviews.map((r) => {
            const stCfg = REVIEW_STATUS_CONFIG[r.status] || REVIEW_STATUS_CONFIG.pending;
            return (
              <div key={r.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-purple-50">
                      <ClipboardCheck size={14} className="text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${stCfg.bg} ${stCfg.text}`}>{stCfg.label}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{REVIEW_TYPE_LABELS[r.review_type] || r.review_type}</span>
                      </div>
                      <p className="font-body text-xs font-bold text-midnight mt-1">{r.review_title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="font-body text-[9px] text-ink/40">الجهة: {r.reviewed_entity}</span>
                        <span className="font-body text-[9px] text-ink/40">المراجع: {r.reviewer}</span>
                        {r.review_date && <span className="font-body text-[9px] text-ink/40">{formatDate(r.review_date)}</span>}
                        {r.follow_up_date && <span className="font-body text-[9px] text-amber-600">متابعة: {formatDate(r.follow_up_date)}</span>}
                      </div>
                      {r.findings && <p className="font-body text-xs text-ink/60 mt-1 leading-snug line-clamp-2">{r.findings}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setReviewForm({ review_title: r.review_title, review_type: r.review_type, reviewed_entity: r.reviewed_entity, reviewer: r.reviewer, review_date: r.review_date || '', findings: r.findings || '', recommendations: r.recommendations || '', action_items: r.action_items || '', follow_up_date: r.follow_up_date || '', status: r.status }); setEditingId(r.id); setModalOpen(true); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                    <button onClick={() => setDeleteId(r.id)} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Improvements tab ── */}
      {activeTab === 'improvements' && (
        <div className="space-y-2">
          {filteredImprovements.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <TrendingUp size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد تحسينات مسجلة</p>
            </div>
          ) : filteredImprovements.map((i) => {
            const pCfg = PRIORITY_CONFIG[i.priority] || PRIORITY_CONFIG.medium;
            const stCfg = IMPROVEMENT_STATUS_CONFIG[i.status] || IMPROVEMENT_STATUS_CONFIG.planned;
            return (
              <div key={i.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-green-50">
                      <TrendingUp size={14} className="text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${pCfg.bg} ${pCfg.text}`}>{pCfg.label}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${stCfg.bg} ${stCfg.text}`}>{stCfg.label}</span>
                      </div>
                      <p className="font-body text-xs font-bold text-midnight mt-1">{i.improvement_title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {i.area && <span className="font-body text-[9px] text-ink/40">المجال: {i.area}</span>}
                        {i.responsible_person && <span className="font-body text-[9px] text-ink/40">المسؤول: {i.responsible_person}</span>}
                        {i.target_date && <span className="font-body text-[9px] text-amber-600">الهدف: {formatDate(i.target_date)}</span>}
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${i.progress || 0}%` }} />
                        </div>
                        <span className="font-body text-[9px] font-bold text-gold">{i.progress || 0}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setImprovementForm({ improvement_title: i.improvement_title, area: i.area || '', current_state: i.current_state || '', target_state: i.target_state || '', action_plan: i.action_plan || '', responsible_person: i.responsible_person || '', priority: i.priority, progress: String(i.progress), target_date: i.target_date || '', status: i.status }); setEditingId(i.id); setModalOpen(true); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                    <button onClick={() => setDeleteId(i.id)} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal ── */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل' : 'إضافة جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        {activeTab === 'evaluations' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="عنوان التقييم" required><TextInput value={evalForm.evaluation_title} onChange={(e) => setEvalForm({ ...evalForm, evaluation_title: e.target.value })} /></Field>
              <Field label="نوع المُقيَّم">
                <Select value={evalForm.evaluatee_type} onChange={(e) => setEvalForm({ ...evalForm, evaluatee_type: e.target.value })}>
                  {Object.entries(EVALUATEE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="اسم المُقيَّم" required><TextInput value={evalForm.evaluatee_name} onChange={(e) => setEvalForm({ ...evalForm, evaluatee_name: e.target.value })} /></Field>
              <Field label="فترة التقييم"><TextInput value={evalForm.evaluation_period} onChange={(e) => setEvalForm({ ...evalForm, evaluation_period: e.target.value })} placeholder="Q1 2025" /></Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="مؤشر الأداء (KPI)"><TextInput type="number" value={evalForm.kpi_score} onChange={(e) => setEvalForm({ ...evalForm, kpi_score: e.target.value })} /></Field>
              <Field label="الإنتاجية"><TextInput type="number" value={evalForm.productivity_score} onChange={(e) => setEvalForm({ ...evalForm, productivity_score: e.target.value })} /></Field>
              <Field label="الجودة"><TextInput type="number" value={evalForm.quality_score} onChange={(e) => setEvalForm({ ...evalForm, quality_score: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="الالتزام بالمواعيد"><TextInput type="number" value={evalForm.timeliness_score} onChange={(e) => setEvalForm({ ...evalForm, timeliness_score: e.target.value })} /></Field>
              <Field label="التقييم الإجمالي"><TextInput type="number" value={evalForm.overall_rating} onChange={(e) => setEvalForm({ ...evalForm, overall_rating: e.target.value })} /></Field>
            </div>
            <Field label="قام بالتقييم"><TextInput value={evalForm.evaluated_by} onChange={(e) => setEvalForm({ ...evalForm, evaluated_by: e.target.value })} /></Field>
            <Field label="ملاحظات"><TextArea value={evalForm.notes} onChange={(e) => setEvalForm({ ...evalForm, notes: e.target.value })} rows={4} /></Field>
          </>
        )}
        {activeTab === 'metrics' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="اسم المؤشر" required><TextInput value={metricForm.metric_name} onChange={(e) => setMetricForm({ ...metricForm, metric_name: e.target.value })} /></Field>
              <Field label="فئة المؤشر">
                <Select value={metricForm.metric_category} onChange={(e) => setMetricForm({ ...metricForm, metric_category: e.target.value })}>
                  {Object.entries(METRIC_CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="القيمة المستهدفة"><TextInput value={metricForm.target_value} onChange={(e) => setMetricForm({ ...metricForm, target_value: e.target.value })} /></Field>
              <Field label="القيمة الفعلية"><TextInput value={metricForm.actual_value} onChange={(e) => setMetricForm({ ...metricForm, actual_value: e.target.value })} /></Field>
              <Field label="الوحدة"><TextInput value={metricForm.unit} onChange={(e) => setMetricForm({ ...metricForm, unit: e.target.value })} placeholder="%" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="فترة القياس"><TextInput value={metricForm.measurement_period} onChange={(e) => setMetricForm({ ...metricForm, measurement_period: e.target.value })} /></Field>
              <Field label="الحالة">
                <Select value={metricForm.status} onChange={(e) => setMetricForm({ ...metricForm, status: e.target.value })}>
                  {Object.entries(METRIC_STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="الاتجاه">
              <Select value={metricForm.trend} onChange={(e) => setMetricForm({ ...metricForm, trend: e.target.value })}>
                {Object.entries(TREND_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
              </Select>
            </Field>
          </>
        )}
        {activeTab === 'reviews' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="عنوان المراجعة" required><TextInput value={reviewForm.review_title} onChange={(e) => setReviewForm({ ...reviewForm, review_title: e.target.value })} /></Field>
              <Field label="نوع المراجعة">
                <Select value={reviewForm.review_type} onChange={(e) => setReviewForm({ ...reviewForm, review_type: e.target.value })}>
                  {Object.entries(REVIEW_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="الجهة المُراجَعة"><TextInput value={reviewForm.reviewed_entity} onChange={(e) => setReviewForm({ ...reviewForm, reviewed_entity: e.target.value })} /></Field>
              <Field label="المراجع"><TextInput value={reviewForm.reviewer} onChange={(e) => setReviewForm({ ...reviewForm, reviewer: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="تاريخ المراجعة"><TextInput type="date" value={reviewForm.review_date} onChange={(e) => setReviewForm({ ...reviewForm, review_date: e.target.value })} /></Field>
              <Field label="تاريخ المتابعة"><TextInput type="date" value={reviewForm.follow_up_date} onChange={(e) => setReviewForm({ ...reviewForm, follow_up_date: e.target.value })} /></Field>
            </div>
            <Field label="الحالة">
              <Select value={reviewForm.status} onChange={(e) => setReviewForm({ ...reviewForm, status: e.target.value })}>
                {Object.entries(REVIEW_STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
              </Select>
            </Field>
            <Field label="النتائج"><TextArea value={reviewForm.findings} onChange={(e) => setReviewForm({ ...reviewForm, findings: e.target.value })} rows={3} /></Field>
            <Field label="التوصيات"><TextArea value={reviewForm.recommendations} onChange={(e) => setReviewForm({ ...reviewForm, recommendations: e.target.value })} rows={3} /></Field>
            <Field label="بنود الإجراء"><TextArea value={reviewForm.action_items} onChange={(e) => setReviewForm({ ...reviewForm, action_items: e.target.value })} rows={3} /></Field>
          </>
        )}
        {activeTab === 'improvements' && (
          <>
            <Field label="عنوان التحسين" required><TextInput value={improvementForm.improvement_title} onChange={(e) => setImprovementForm({ ...improvementForm, improvement_title: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="المجال"><TextInput value={improvementForm.area} onChange={(e) => setImprovementForm({ ...improvementForm, area: e.target.value })} /></Field>
              <Field label="الشخص المسؤول"><TextInput value={improvementForm.responsible_person} onChange={(e) => setImprovementForm({ ...improvementForm, responsible_person: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="الأولوية">
                <Select value={improvementForm.priority} onChange={(e) => setImprovementForm({ ...improvementForm, priority: e.target.value })}>
                  {Object.entries(PRIORITY_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                </Select>
              </Field>
              <Field label="التقدم (%)"><TextInput type="number" value={improvementForm.progress} onChange={(e) => setImprovementForm({ ...improvementForm, progress: e.target.value })} /></Field>
              <Field label="تاريخ الهدف"><TextInput type="date" value={improvementForm.target_date} onChange={(e) => setImprovementForm({ ...improvementForm, target_date: e.target.value })} /></Field>
            </div>
            <Field label="الحالة">
              <Select value={improvementForm.status} onChange={(e) => setImprovementForm({ ...improvementForm, status: e.target.value })}>
                {Object.entries(IMPROVEMENT_STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
              </Select>
            </Field>
            <Field label="الحالة الحالية"><TextArea value={improvementForm.current_state} onChange={(e) => setImprovementForm({ ...improvementForm, current_state: e.target.value })} rows={2} /></Field>
            <Field label="الحالة المستهدفة"><TextArea value={improvementForm.target_state} onChange={(e) => setImprovementForm({ ...improvementForm, target_state: e.target.value })} rows={2} /></Field>
            <Field label="خطة العمل"><TextArea value={improvementForm.action_plan} onChange={(e) => setImprovementForm({ ...improvementForm, action_plan: e.target.value })} rows={3} /></Field>
          </>
        )}
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
