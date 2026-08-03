import { useEffect, useState, useRef, useCallback } from 'react';
import {
  KanbanSquare, Plus, Pencil, Trash2, Loader2, Clock, AlertTriangle, ShieldAlert,
  Gavel, Briefcase, Users, Zap, Eye, EyeOff, Lock, Activity, MessageSquare,
  ChevronRight, Bell, BellRing, Filter, X, Calendar, User as UserIcon,
  CircuitBoard, FileStack, DollarSign, Radio, CheckCircle2,
} from 'lucide-react';
import { supabase, formatDate } from '@/lib/financeUtils';
import type { InternalTask, TaskActivityEntry, TaskComment } from '@/lib/firmTypes';
import type { Client, Attorney } from '@/lib/financeTypes';
import type { Case } from '@/lib/firmTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

interface TaskFormData {
  title: string;
  description: string;
  task_type: string;
  priority: string;
  status: string;
  due_date: string;
  assigned_to: string;
  case_id: string;
  client_id: string;
  module_id: string;
  resource_id: string;
  source_engine: string;
  client_visible: boolean;
}

const emptyForm: TaskFormData = {
  title: '', description: '', task_type: 'general', priority: 'medium',
  status: 'open', due_date: '', assigned_to: '', case_id: '', client_id: '',
  module_id: '', resource_id: '', source_engine: '', client_visible: false,
};

const PRIORITY_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  low: { label: 'منخفضة', bg: 'bg-gray-100', text: 'text-ink/60', border: 'border-gray-200', dot: 'bg-gray-400' },
  medium: { label: 'متوسطة', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-400' },
  high: { label: 'عالية', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
  critical: { label: 'حرجة', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', dot: 'bg-red-500' },
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; accent: string }> = {
  open: { label: 'مفتوحة', bg: 'bg-gray-50', text: 'text-gray-700', accent: 'border-t-gray-400' },
  in_progress: { label: 'قيد التنفيذ', bg: 'bg-blue-50', text: 'text-blue-700', accent: 'border-t-blue-500' },
  resolved: { label: 'تم الحل', bg: 'bg-green-50', text: 'text-green-700', accent: 'border-t-green-500' },
  closed: { label: 'مغلقة', bg: 'bg-midnight/5', text: 'text-midnight/60', accent: 'border-t-midnight/40' },
};

const COLUMNS = ['open', 'in_progress', 'resolved', 'closed'] as const;

const MODULE_ICONS: Record<string, typeof Gavel> = {
  'M10': Gavel,
  'M14': ShieldAlert,
  'M49': Briefcase,
  'M54': DollarSign,
  'M77': Users,
  'M51': KanbanSquare,
};

const SOURCE_ENGINE_LABELS: Record<string, string> = {
  'M10-CaseCore': 'نواة القضية (M10)',
  'M14-SecurityEngine': 'محرك الأمن (M14)',
  'M49-BoardEngine': 'محرك مجلس الإدارة (M49)',
  'M54-FinanceEngine': 'المحرك المالي (M54)',
  'M77-HREngine': 'الموارد البشرية (M77)',
  'M51-TaskEngine': 'محرك المهام (M51)',
};

const TASK_TYPE_LABELS: Record<string, string> = {
  general: 'عامة',
  board_resolution: 'قرار مجلس الإدارة',
  security_audit: 'تدقيق أمني',
  legal_memo: 'مذكرة قانونية',
  client_followup: 'متابعة عميل',
  billing: 'أتعاب وفوترة',
  hr_task: 'مهمة موارد بشرية',
  meeting_action: 'متابعة اجتماع',
};

export default function InternalTaskEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [tasks, setTasks] = useState<InternalTask[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailTask, setDetailTask] = useState<InternalTask | null>(null);
  const [activity, setActivity] = useState<TaskActivityEntry[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [activityLoading, setActivityLoading] = useState(false);
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterModule, setFilterModule] = useState('all');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<{ id: string; taskId: string; title: string; priority: string }[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [lastTaskCount, setLastTaskCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [taskRes, attRes, clientRes, caseRes] = await Promise.all([
      supabase.from('m51_tasks')
        .select('*, assignee:lf_attorneys(name), case:lf_cases(case_number, case_title), client:lf_clients(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('lf_clients').select('*').order('name'),
      supabase.from('lf_cases').select('id, case_number, case_title').order('case_number'),
    ]);
    const taskData = (taskRes.data as InternalTask[]) || [];
    setTasks(taskData);
    setAttorneys((attRes.data as Attorney[]) || []);
    setClients((clientRes.data as Client[]) || []);
    setCases((caseRes.data as Case[]) || []);
    setLoading(false);

    if (lastTaskCount > 0 && taskData.length > lastTaskCount) {
      const newTasks = taskData.slice(0, taskData.length - lastTaskCount);
      const newNotifs = newTasks.map((t) => ({
        id: `notif-${Date.now()}-${t.id}`,
        taskId: t.id,
        title: t.title,
        priority: t.priority,
      }));
      setNotifications((prev) => [...newNotifs, ...prev].slice(0, 20));
    }
    setLastTaskCount(taskData.length);
  }, [lastTaskCount]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    pollRef.current = setInterval(() => { fetchAll(); }, 15000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyForm, title: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (t: InternalTask) => {
    setForm({
      title: t.title, description: t.description || '', task_type: t.task_type || 'general',
      priority: t.priority || 'medium', status: t.status || 'open', due_date: t.due_date || '',
      assigned_to: t.assigned_to || '', case_id: t.case_id || '', client_id: t.client_id || '',
      module_id: t.module_id || '', resource_id: t.resource_id || '', source_engine: t.source_engine || '',
      client_visible: t.client_visible || false,
    });
    setEditingId(t.id);
    setModalOpen(true);
  };

  const logActivity = async (taskId: string, action: string, oldVal: string | null, newVal: string | null) => {
    await supabase.from('m51_task_activity').insert({
      task_id: taskId, actor: 'النظام', action, old_value: oldVal, new_value: newVal,
    });
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      task_type: form.task_type,
      priority: form.priority,
      status: form.status,
      due_date: form.due_date || null,
      assigned_to: form.assigned_to || null,
      case_id: form.case_id || null,
      client_id: form.client_id || null,
      module_id: form.module_id || null,
      resource_id: form.resource_id || null,
      source_engine: form.source_engine || null,
      client_visible: form.client_visible,
    };
    if (editingId) {
      await supabase.from('m51_tasks').update(payload).eq('id', editingId);
      await logActivity(editingId, 'updated', null, null);
    } else {
      const { data } = await supabase.from('m51_tasks').insert(payload).select('id');
      if (data && data[0]) {
        await logActivity(data[0].id, 'created', null, form.title);
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('m51_tasks').delete().eq('id', deleteId);
    setDeleteId(null);
    fetchAll();
  };

  const moveTask = async (taskId: string, newStatus: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;
    const updates: Record<string, string | null> = { status: newStatus };
    if (newStatus === 'resolved') updates.resolved_at = new Date().toISOString();
    if (newStatus === 'closed') updates.closed_at = new Date().toISOString();
    await supabase.from('m51_tasks').update(updates).eq('id', taskId);
    await logActivity(taskId, 'status_changed', task.status, newStatus);
    fetchAll();
  };

  const openDetail = async (task: InternalTask) => {
    setDetailTask(task);
    setActivityLoading(true);
    const [actRes, cmtRes] = await Promise.all([
      supabase.from('m51_task_activity').select('*').eq('task_id', task.id).order('created_at', { ascending: false }),
      supabase.from('m51_task_comments').select('*').eq('task_id', task.id).order('created_at', { ascending: false }),
    ]);
    setActivity((actRes.data as TaskActivityEntry[]) || []);
    setComments((cmtRes.data as TaskComment[]) || []);
    setActivityLoading(false);
  };

  const addComment = async () => {
    if (!commentText.trim() || !detailTask) return;
    await supabase.from('m51_task_comments').insert({
      task_id: detailTask.id, author: 'النظام', body: commentText.trim(),
    });
    setCommentText('');
    const { data } = await supabase.from('m51_task_comments').select('*').eq('task_id', detailTask.id).order('created_at', { ascending: false });
    setComments((data as TaskComment[]) || []);
  };

  const dismissNotification = (notifId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
  };

  const dismissAllNotifications = () => {
    setNotifications([]);
  };

  const filteredTasks = tasks.filter((t) => {
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (filterModule !== 'all' && t.module_id !== filterModule) return false;
    return true;
  });

  const tasksByStatus = (status: string) => filteredTasks.filter((t) => t.status === status);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggingId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, col: string) => {
    e.preventDefault();
    setDragOverCol(col);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = (e: React.DragEvent, col: string) => {
    e.preventDefault();
    if (draggingId) {
      moveTask(draggingId, col);
    }
    setDraggingId(null);
    setDragOverCol(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const criticalCount = tasks.filter((t) => t.priority === 'critical' && t.status !== 'closed').length;
  const openCount = tasks.filter((t) => t.status === 'open').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const resolvedCount = tasks.filter((t) => t.status === 'resolved' || t.status === 'closed').length;
  const autoGenCount = tasks.filter((t) => t.auto_generated).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <KanbanSquare size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">محرك المهام واللوحات التعاونية (M51)</h2>
            <p className="font-body text-[10px] text-ink/40">نظام محلي سيادي لإدارة المهام — بديل داخلي كامل</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifPanel(!showNotifPanel)}
              className="relative p-2 rounded-lg border border-gray-200 bg-white hover:border-gold/30 transition-colors"
            >
              {notifications.length > 0 ? (
                <BellRing size={16} className="text-gold animate-pulse" />
              ) : (
                <Bell size={16} className="text-ink/40" />
              )}
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>
            {showNotifPanel && (
              <div className="absolute left-0 top-12 z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 max-h-96 overflow-y-auto">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="font-heading font-bold text-midnight text-sm">الإشعارات اللحظية</span>
                  {notifications.length > 0 && (
                    <button onClick={dismissAllNotifications} className="font-body text-[10px] text-ink/40 hover:text-red-500 transition-colors">
                      مسح الكل
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell size={24} className="text-ink/20 mx-auto mb-2" />
                    <p className="font-body text-xs text-ink/40">لا توجد إشعارات جديدة</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {notifications.map((n) => {
                      const pCfg = PRIORITY_CONFIG[n.priority] || PRIORITY_CONFIG.medium;
                      return (
                        <div key={n.id} className="px-4 py-3 hover:bg-gray-50 transition-colors group">
                          <div className="flex items-start gap-2">
                            <div className={`w-2 h-2 rounded-full ${pCfg.dot} mt-1.5 flex-shrink-0`} />
                            <div className="flex-1 min-w-0">
                              <p className="font-body text-xs font-bold text-midnight truncate">{n.title}</p>
                              <p className="font-body text-[10px] text-ink/40 mt-0.5">
                                مهمة جديدة — {pCfg.label}
                              </p>
                            </div>
                            <button
                              onClick={() => dismissNotification(n.id)}
                              className="opacity-0 group-hover:opacity-100 text-ink/30 hover:text-red-500 transition-all"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors"
          >
            <Plus size={16} /> بطاقة جديدة
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={<KanbanSquare size={14} className="text-midnight" />} label="إجمالي البطاقات" value={String(tasks.length)} valueClass="text-midnight" />
        <StatCard icon={<Clock size={14} className="text-blue-600" />} label="قيد التنفيذ" value={String(inProgressCount)} valueClass="text-blue-700" />
        <StatCard icon={<AlertTriangle size={14} className="text-red-600" />} label="حرجة" value={String(criticalCount)} valueClass="text-red-700" />
        <StatCard icon={<Zap size={14} className="text-gold" />} label="توليد آلي" value={String(autoGenCount)} valueClass="text-gold" />
        <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="تم الحل / مغلقة" value={String(resolvedCount)} valueClass="text-green-700" />
      </div>

      {/* Cross-engine integration bar */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">التكامل بين المحركات (Cross-Engine Integration)</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { icon: ShieldAlert, label: 'محرك الأمن (M14)', desc: 'تذاكر تحقيق أمني حرجة', color: 'text-red-400' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'ربط الساعات بالأتعاب', color: 'text-green-400' },
            { icon: Briefcase, label: 'مجلس الإدارة (M49)', desc: 'تفكيك القرارات آلياً', color: 'text-gold' },
            { icon: Eye, label: 'بوابة العملاء', desc: 'شفافية لحظية للعميل', color: 'text-blue-400' },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={12} className={item.color} />
                  <span className="font-body text-[10px] font-bold text-cream/80">{item.label}</span>
                </div>
                <p className="font-body text-[9px] text-cream/40 leading-tight">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Filter size={14} className="text-ink/40" />
          <span className="font-body text-xs text-ink/50">تصفية:</span>
        </div>
        <Select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="!w-auto !py-1.5 !text-xs"
        >
          <option value="all">كل الأولويات</option>
          <option value="critical">حرجة</option>
          <option value="high">عالية</option>
          <option value="medium">متوسطة</option>
          <option value="low">منخفضة</option>
        </Select>
        <Select
          value={filterModule}
          onChange={(e) => setFilterModule(e.target.value)}
          className="!w-auto !py-1.5 !text-xs"
        >
          <option value="all">كل المحركات</option>
          <option value="M10">نواة القضية (M10)</option>
          <option value="M14">محرك الأمن (M14)</option>
          <option value="M49">مجلس الإدارة (M49)</option>
          <option value="M54">المحرك المالي (M54)</option>
          <option value="M77">الموارد البشرية (M77)</option>
        </Select>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const colTasks = tasksByStatus(col);
          const cfg = STATUS_CONFIG[col];
          const isDragOver = dragOverCol === col;
          return (
            <div
              key={col}
              onDragOver={(e) => handleDragOver(e, col)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col)}
              className={`rounded-xl border-2 ${cfg.accent} ${isDragOver ? 'border-gold bg-gold/5' : 'border-gray-200'} bg-gray-50/50 min-h-[300px] transition-colors`}
            >
              <div className="px-3 py-2.5 flex items-center justify-between border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${cfg.bg.replace('bg-', 'bg-').replace('50', '400')}`} />
                  <span className="font-heading font-bold text-midnight text-xs">{cfg.label}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-white border border-gray-200 font-body text-[10px] font-bold text-ink/50">
                  {colTasks.length}
                </span>
              </div>
              <div className="p-2 space-y-2">
                {colTasks.map((task) => {
                  const pCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'closed' && task.status !== 'resolved';
                  const ModuleIcon = task.module_id ? MODULE_ICONS[task.module_id] : null;
                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onClick={() => openDetail(task)}
                      className={`bg-white rounded-lg border ${pCfg.border} shadow-sm p-3 cursor-pointer hover:shadow-md transition-all group ${draggingId === task.id ? 'opacity-40' : ''}`}
                    >
                      {/* Priority bar */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${pCfg.dot}`} />
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${pCfg.bg} ${pCfg.text}`}>
                            {pCfg.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); openEdit(task); }}
                            className="p-1 rounded text-ink/30 hover:text-gold hover:bg-gold/5 transition-colors"
                          >
                            <Pencil size={11} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteId(task.id); }}
                            className="p-1 rounded text-ink/30 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>

                      {/* Title */}
                      <p className="font-body text-xs font-bold text-midnight leading-snug mb-1.5 line-clamp-2">{task.title}</p>

                      {/* Description */}
                      {task.description && (
                        <p className="font-body text-[10px] text-ink/50 leading-relaxed mb-2 line-clamp-2">{task.description}</p>
                      )}

                      {/* Tags */}
                      {task.tags && task.tags.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap mb-2">
                          {task.tags.slice(0, 3).map((tag, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-gray-100 font-body text-[9px] text-ink/50">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Meta row */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                        <div className="flex items-center gap-2">
                          {ModuleIcon && (
                            <div className="flex items-center gap-1" title={task.source_engine ? SOURCE_ENGINE_LABELS[task.source_engine] || (task.module_id ?? '') : (task.module_id ?? '')}>
                              <ModuleIcon size={11} className="text-ink/40" />
                            </div>
                          )}
                          {task.auto_generated && (
                            <span className="flex items-center gap-0.5" title="مولّدة آلياً">
                              <Zap size={10} className="text-gold" />
                            </span>
                          )}
                          {task.client_visible ? (
                            <Eye size={11} className="text-blue-400" />
                          ) : (
                            <EyeOff size={11} className="text-ink/20" />
                          )}
                          {task.encrypted_attachments && task.encrypted_attachments.length > 0 && (
                            <span className="flex items-center gap-0.5" title="مرفقات مشفرة">
                              <Lock size={10} className="text-green-500" />
                              <span className="font-body text-[9px] text-ink/40">{task.encrypted_attachments.length}</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {task.assignee && (
                            <span className="font-body text-[9px] text-ink/50">{task.assignee.name}</span>
                          )}
                          {task.due_date && (
                            <div className={`flex items-center gap-0.5 ${isOverdue ? 'text-red-500' : 'text-ink/40'}`}>
                              <Calendar size={10} />
                              <span className="font-body text-[9px]">{formatDate(task.due_date)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {isOverdue && (
                        <div className="mt-1.5 flex items-center gap-1">
                          <AlertTriangle size={9} className="text-red-500" />
                          <span className="font-body text-[9px] text-red-500 font-bold">متأخرة</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                {colTasks.length === 0 && (
                  <div className="text-center py-8">
                    <p className="font-body text-[10px] text-ink/20">لا توجد بطاقات</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create/Edit Modal */}
      <EntityModal
        open={modalOpen}
        title={editingId ? 'تعديل بطاقة المهمة' : 'بطاقة مهمة جديدة'}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSave}
        loading={saving}
      >
        <Field label="عنوان المهمة" required>
          <TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: إعداد مذكرة الدفع" />
        </Field>
        <Field label="الوصف">
          <TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <div className="grid grid-cols-3 gap-4">
          <Field label="نوع المهمة">
            <Select value={form.task_type} onChange={(e) => setForm({ ...form, task_type: e.target.value })}>
              {Object.entries(TASK_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="الأولوية">
            <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="low">منخفضة</option>
              <option value="medium">متوسطة</option>
              <option value="high">عالية</option>
              <option value="critical">حرجة</option>
            </Select>
          </Field>
          <Field label="الحالة">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="open">مفتوحة</option>
              <option value="in_progress">قيد التنفيذ</option>
              <option value="resolved">تم الحل</option>
              <option value="closed">مغلقة</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ الاستحقاق">
            <TextInput type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </Field>
          <Field label="المسؤول">
            <Select value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}>
              <option value="">— اختر —</option>
              {attorneys.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="القضية المرتبطة">
            <Select value={form.case_id} onChange={(e) => setForm({ ...form, case_id: e.target.value })}>
              <option value="">— اختر —</option>
              {cases.map((c) => <option key={c.id} value={c.id}>{c.case_number} — {c.case_title}</option>)}
            </Select>
          </Field>
          <Field label="العميل المرتبط">
            <Select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
              <option value="">— اختر —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        </div>
        {/* Cross-engine linking */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 space-y-3">
          <div className="flex items-center gap-1.5">
            <CircuitBoard size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold text-midnight">الربط المؤسسي عبر المحركات</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="المحرك المصدر">
              <Select value={form.source_engine} onChange={(e) => {
                const engine = e.target.value;
                setForm({ ...form, source_engine: engine, module_id: engine.split('-')[0] || '' });
              }}>
                <option value="">— يدوي —</option>
                {Object.entries(SOURCE_ENGINE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
            <Field label="معرف المورد (Resource ID)">
              <TextInput value={form.resource_id} onChange={(e) => setForm({ ...form, resource_id: e.target.value })} placeholder="مثال: CASE-2025-134" />
            </Field>
          </div>
          <Checkbox
            label="مرئية للعميل في بوابة العملاء (شفافية لحظية)"
            checked={form.client_visible}
            onChange={(v) => setForm({ ...form, client_visible: v })}
          />
        </div>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />

      {/* Task Detail Drawer */}
      {detailTask && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setDetailTask(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            {/* Drawer header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <KanbanSquare size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">تفاصيل البطاقة</span>
              </div>
              <button onClick={() => setDetailTask(null)} className="text-ink/40 hover:text-ink transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Title + badges */}
              <div>
                <h3 className="font-heading font-bold text-midnight text-base mb-2">{detailTask.title}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {(() => {
                    const pCfg = PRIORITY_CONFIG[detailTask.priority] || PRIORITY_CONFIG.medium;
                    return <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${pCfg.bg} ${pCfg.text}`}>{pCfg.label}</span>;
                  })()}
                  {(() => {
                    const sCfg = STATUS_CONFIG[detailTask.status] || STATUS_CONFIG.open;
                    return <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>;
                  })()}
                  <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">
                    {TASK_TYPE_LABELS[detailTask.task_type] || detailTask.task_type}
                  </span>
                  {detailTask.auto_generated && (
                    <span className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-body bg-gold/10 text-gold">
                      <Zap size={9} /> توليد آلي
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              {detailTask.description && (
                <div>
                  <p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p>
                  <p className="font-body text-xs text-ink/70 leading-relaxed">{detailTask.description}</p>
                </div>
              )}

              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-3">
                {detailTask.assignee && (
                  <MetaItem icon={<UserIcon size={11} className="text-ink/30" />} label="المسؤول" value={detailTask.assignee.name} />
                )}
                {detailTask.due_date && (
                  <MetaItem icon={<Calendar size={11} className="text-ink/30" />} label="الاستحقاق" value={formatDate(detailTask.due_date)} />
                )}
                {detailTask.case && (
                  <MetaItem icon={<Gavel size={11} className="text-ink/30" />} label="القضية" value={`${detailTask.case.case_number}`} />
                )}
                {detailTask.client && (
                  <MetaItem icon={<Users size={11} className="text-ink/30" />} label="العميل" value={detailTask.client.name} />
                )}
                {detailTask.source_engine && (
                  <MetaItem icon={<Radio size={11} className="text-ink/30" />} label="المحرك المصدر" value={SOURCE_ENGINE_LABELS[detailTask.source_engine] || detailTask.source_engine} />
                )}
                {detailTask.resource_id && (
                  <MetaItem icon={<FileStack size={11} className="text-ink/30" />} label="معرف المورد" value={detailTask.resource_id} />
                )}
              </div>

              {/* Quick status changer */}
              <div>
                <p className="font-body text-[10px] font-bold text-ink/40 mb-2">تغيير سريع للحالة</p>
                <div className="flex items-center gap-2">
                  {COLUMNS.map((col) => {
                    const cfg = STATUS_CONFIG[col];
                    return (
                      <button
                        key={col}
                        onClick={() => {
                          moveTask(detailTask.id, col);
                          setDetailTask({ ...detailTask, status: col });
                        }}
                        className={`px-2.5 py-1.5 rounded-lg font-body text-[10px] font-bold border transition-all ${
                          detailTask.status === col
                            ? 'bg-gold border-gold text-midnight'
                            : 'bg-white border-gray-200 text-ink/50 hover:border-gold/30'
                        }`}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tags */}
              {detailTask.tags && detailTask.tags.length > 0 && (
                <div>
                  <p className="font-body text-[10px] font-bold text-ink/40 mb-2">الوسوم</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {detailTask.tags.map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-gray-100 font-body text-[10px] text-ink/60">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Security / visibility */}
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
                {detailTask.client_visible ? (
                  <>
                    <Eye size={14} className="text-blue-500" />
                    <span className="font-body text-[10px] text-ink/60">هذه المهمة مرئية للعميل في بوابة العملاء</span>
                  </>
                ) : (
                  <>
                    <EyeOff size={14} className="text-ink/30" />
                    <span className="font-body text-[10px] text-ink/40">هذه المهمة غير مرئية للعميل</span>
                  </>
                )}
              </div>

              {/* Activity log */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Activity size={12} className="text-gold" />
                  <span className="font-body text-[10px] font-bold text-midnight">سجل النشاط</span>
                </div>
                {activityLoading ? (
                  <div className="flex items-center gap-2 py-3">
                    <Loader2 size={12} className="text-gold animate-spin" />
                    <span className="font-body text-[10px] text-ink/40">جارٍ التحميل...</span>
                  </div>
                ) : activity.length === 0 ? (
                  <p className="font-body text-[10px] text-ink/30 py-2">لا يوجد نشاط مسجل</p>
                ) : (
                  <div className="space-y-2">
                    {activity.slice(0, 8).map((a) => (
                      <div key={a.id} className="flex items-start gap-2 text-[10px]">
                        <div className="w-1.5 h-1.5 rounded-full bg-gold/40 mt-1 flex-shrink-0" />
                        <div className="flex-1">
                          <span className="font-body text-ink/60">{formatActivityAction(a)}</span>
                          <span className="font-body text-ink/30 mr-1">— {formatDate(a.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Comments */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <MessageSquare size={12} className="text-gold" />
                  <span className="font-body text-[10px] font-bold text-midnight">التعليقات</span>
                </div>
                <div className="space-y-2 mb-3">
                  {comments.length === 0 ? (
                    <p className="font-body text-[10px] text-ink/30 py-1">لا توجد تعليقات</p>
                  ) : (
                    comments.map((c) => (
                      <div key={c.id} className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-body text-[10px] font-bold text-midnight">{c.author || 'مستخدم'}</span>
                          <span className="font-body text-[9px] text-ink/30">{formatDate(c.created_at)}</span>
                        </div>
                        <p className="font-body text-[10px] text-ink/60 leading-relaxed">{c.body}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <TextInput
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="أضف تعليقاً..."
                    className="flex-1"
                    onKeyDown={(e) => { if (e.key === 'Enter') addComment(); }}
                  />
                  <button
                    onClick={addComment}
                    className="px-3 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors"
                  >
                    إرسال
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between">
              <span className="font-body text-[9px] text-ink/30">
                أُنشئت في {formatDate(detailTask.created_at)}
              </span>
              <button
                onClick={() => { openEdit(detailTask); setDetailTask(null); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-xs font-bold bg-gold text-midnight hover:bg-gold/90 transition-colors"
              >
                <Pencil size={12} /> تعديل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetaItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
      <div className="flex items-center gap-1 mb-0.5">{icon}<span className="font-body text-[9px] text-ink/40">{label}</span></div>
      <p className="font-body text-xs font-bold text-midnight truncate">{value}</p>
    </div>
  );
}

function formatActivityAction(a: TaskActivityEntry): string {
  switch (a.action) {
    case 'created': return `تم إنشاء المهمة`;
    case 'updated': return `تم تحديث المهمة`;
    case 'status_changed': return `تغيير الحالة من "${STATUS_CONFIG[a.old_value || '']?.label || a.old_value}" إلى "${STATUS_CONFIG[a.new_value || '']?.label || a.new_value}"`;
    default: return a.action;
  }
}
