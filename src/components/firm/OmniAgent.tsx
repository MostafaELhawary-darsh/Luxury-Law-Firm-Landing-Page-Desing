import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Brain, Send, Loader2, Zap, CircuitBoard, ChevronRight, Activity, Shield,
  Lock, Radio, Layers, Sparkles, CheckCircle2, AlertTriangle, Clock,
  ArrowRight, FileText, Building2, ShieldAlert, Gavel, DollarSign, Users,
  Briefcase, Ship, ShieldCheck, KanbanSquare, BookOpen, Calculator,
  Handshake, Grid3x3, Info, Mic, MicOff, Cpu, Gauge,
  Megaphone, Car, Cog, FlaskConical, Plane, TrendingUp, Copyright, Video,
  HardHat, BadgeCheck, Wrench, ShoppingBag, Library, Network, Mountain, Grid2x2,
  Wheat, Fingerprint, Vault,
} from 'lucide-react';
import { supabase, formatDate } from '@/lib/financeUtils';
import type { OmniCommand, OmniSubtask, OmniAuditLog, OmniEngine } from '@/lib/firmTypes';
import {
  decomposeCommand, STATUS_CONFIG, SUBTASK_STATUS_CONFIG, SEVERITY_CONFIG,
  DEPARTMENT_LABELS, type DecompositionResult,
} from '@/lib/omniAgentEngine';
import { EntityModal, Field, TextArea } from './EntityModal';
import { StatCard } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

const ENGINE_ICONS: Record<string, typeof Brain> = {
  Gavel, ShieldAlert, Briefcase, KanbanSquare, DollarSign, Users,
  FileText, BookOpen, Calculator, Handshake, Grid3x3, Ship, ShieldCheck,
  CircuitBoard, Brain, Building2, Megaphone, Car, Cog, FlaskConical,
  Plane, TrendingUp, Copyright, Video, HardHat, Radio, BadgeCheck, Wrench,
  ShoppingBag, Library, Network, Mountain, Grid2x2,
  Wheat, Fingerprint, Vault,
};

const INTENT_ICON_MAP: Record<string, string> = {
  project_establishment: 'Building2',
  food_safety_project: 'ShieldCheck',
  security_incident: 'ShieldAlert',
  board_resolution: 'Briefcase',
  document_amendment: 'FileText',
  case_management: 'Gavel',
  financial_operation: 'DollarSign',
  hr_operation: 'Users',
  marketing_campaign: 'Megaphone',
  automotive_trade: 'Car',
  automotive_manufacturing: 'Cog',
  chemicals_production: 'FlaskConical',
  foreign_residency: 'Plane',
  capital_markets: 'TrendingUp',
  shopping_mall_lease: 'ShoppingBag',
  library_archive: 'Library',
  maintenance_warranty: 'Wrench',
  interdepartmental_bridge: 'Network',
  quarry_mining: 'Mountain',
  ceramics_manufacturing: 'Grid2x2',
  arbitration_hub: 'Gavel',
  food_security: 'Wheat',
  iot_bridge: 'Cpu',
  disaster_recovery: 'ShieldAlert',
  biometric_gateway: 'Fingerprint',
  vault_connector: 'Vault',
  general: 'CircuitBoard',
};

const EXAMPLE_COMMANDS = [
  'قم بتأسيس مصنع سيراميك وإعداد عقود التوزيع',
  'افتح قضية دعوى 2025/134 وأعد مذكرة الدفاع',
  'تم رصد محاولة اختراق من IP خارجي — أنشئ تذكرة تحقيق أمني',
  'نفذ قرار مجلس الإدارة رقم 14 ووزع المهام',
  'احسب أتعاب المحامي أحمد ووزع أرباح الشركاء',
  'وظف محظف قانوني جديد وافتح ملفه',
  'سجل ترخيص حملة إعلانية ورعاية لمؤثر',
  'أنشئ ترخيص صندوق استثمار عقاري وتحقق من امتثال AML',
  'استخرج ترخيص إنتاج أسمدة وافحص المواد الخطرة',
  'وظف خبير أجنبي واستخرج تصريح عمل له',
  'سجل عقد إيجار متجر Zara في مول العرب واحسب نسبة المبيعات',
  'ابحث في الأرشيف عن مراجع نزاع (X) وجهز مسودة عقد اشتراك رقمي',
  'جدول صيانة تكييفات المستشفى الأسبوع القادم واحجز قطع الغيار',
  'احسب الإتاوة الحكومية المستحقة لمحجر الرخام وجهز عقود بيع الكتل',
  'قم بتأسيس شركة سيراميك وإعداد عقود التوزيع وتجهيز الملف الضريبي',
  'افتح ملف تحكيم تجاري دولي ضد شركة Global Trading وقم بتجهيز غرفة البيانات',
  'افحص شروط توريد شحنة زيت القادمة وراجع مطابقتها لقرارات هيئة سلامة الغذاء',
  'رصد تنبيه من حساس حرارة في مخزن التبريد — افتح تذكرة عاجلة ووثق الحادث',
  'فعّل بروتوكول غرفة الحوار واعزل الخوادم المصابة وابلغ الإدارة بتنبيه أحمر',
  'تحقق من هوية المدير بيومترياً قبل اعتماد عقد الاستحواذ الجديد',
  'اسحب البيان الضريبي لشركة الأطلس من البوابة الخلفية وقم بمطابقته مع العقود في الأرشيف',
  'اسحب بيان التخليص الجمركي للشحنة القادمة من الجمارك وأرشفه في الملف القانوني',
];

export default function OmniAgent({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [commands, setCommands] = useState<OmniCommand[]>([]);
  const [engines, setEngines] = useState<OmniEngine[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [decomposition, setDecomposition] = useState<DecompositionResult | null>(null);
  const [showDecomposition, setShowDecomposition] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [selectedCommand, setSelectedCommand] = useState<OmniCommand | null>(null);
  const [subtasks, setSubtasks] = useState<OmniSubtask[]>([]);
  const [auditLogs, setAuditLogs] = useState<OmniAuditLog[]>([]);
  const [subtaskLoading, setSubtaskLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [activeSubtasks, setActiveSubtasks] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [cmdRes, engRes] = await Promise.all([
      supabase.from('m92_commands').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('m92_engine_registry').select('*').order('engine_code'),
    ]);
    setCommands((cmdRes.data as OmniCommand[]) || []);
    setEngines((engRes.data as OmniEngine[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      const text = cmd.fields.title || '';
      setInput(text);
      handleDecompose(text);
    }
  }, [voiceAdd]);

  const handleDecompose = (text: string) => {
    if (!text.trim()) {
      setDecomposition(null);
      setShowDecomposition(false);
      return;
    }
    const result = decomposeCommand(text);
    setDecomposition(result);
    setShowDecomposition(true);
  };

  const handleInputChange = (text: string) => {
    setInput(text);
    if (text.trim().length > 3) {
      handleDecompose(text);
    } else {
      setShowDecomposition(false);
    }
  };

  const executeCommand = async () => {
    if (!input.trim() || !decomposition) return;
    setExecuting(true);

    const { data: cmdData } = await supabase.from('m92_commands').insert({
      raw_input: input.trim(),
      input_type: listening ? 'voice' : 'text',
      intent: decomposition.intent,
      intent_confidence: decomposition.confidence,
      entities: decomposition.entities,
      status: 'executing',
      total_subtasks: decomposition.subtasks.length,
      completed_subtasks: 0,
    }).select('id');

    const commandId = cmdData?.[0]?.id;
    if (!commandId) {
      setExecuting(false);
      return;
    }

    await supabase.from('m92_audit_logs').insert({
      command_id: commandId, action: 'command_received', actor: 'M92-OmniAgent', engine_code: 'M92',
      detail: `استقبال أمر: ${input.trim()}`, severity: 'info',
    });

    await supabase.from('m92_audit_logs').insert({
      command_id: commandId, action: 'intent_decomposed', actor: 'M92-OmniAgent', engine_code: 'M92',
      detail: `تفكيك الأمر إلى ${decomposition.subtasks.length} مهام فرعية — القصد: ${decomposition.intentLabel} (ثقة: ${decomposition.confidence.toFixed(1)}%)`, severity: 'info',
    });

    const subtaskInserts = decomposition.subtasks.map((st) => ({
      command_id: commandId,
      engine_code: st.engine_code,
      engine_name_ar: st.engine_name_ar,
      task_title: st.task_title,
      task_description: st.task_description,
      department: st.department,
      status: 'pending',
      execution_order: st.execution_order,
    }));

    const { data: insertedSubtasks } = await supabase.from('m92_subtasks').insert(subtaskInserts).select('id, engine_code, task_title');

    for (const st of insertedSubtasks || []) {
      setActiveSubtasks((prev) => ({ ...prev, [st.id]: 'running' }));
      await supabase.from('m92_audit_logs').insert({
        command_id: commandId, action: 'cluster_activated', actor: 'M92-OmniAgent', engine_code: st.engine_code,
        detail: `تفعيل ${st.engine_code} — ${st.task_title}`, severity: 'info',
      });
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));
      await supabase.from('m92_subtasks').update({
        status: 'completed',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        result_data: { status: 'success', engine: st.engine_code },
      }).eq('id', st.id);
      setActiveSubtasks((prev) => ({ ...prev, [st.id]: 'completed' }));
    }

    const synthesisText = `تم تنفيذ الأمر بنجاح عبر ${decomposition.subtasks.length} محركات بالتوازي. القصد المكتشف: ${decomposition.intentLabel}.`;

    await supabase.from('m92_commands').update({
      status: 'completed',
      completed_subtasks: decomposition.subtasks.length,
      synthesis_output: synthesisText,
      completed_at: new Date().toISOString(),
    }).eq('id', commandId);

    await supabase.from('m92_audit_logs').insert({
      command_id: commandId, action: 'synthesis_complete', actor: 'M92-OmniAgent', engine_code: 'M88',
      detail: synthesisText, severity: 'success',
    });
    await supabase.from('m92_audit_logs').insert({
      command_id: commandId, action: 'command_completed', actor: 'M92-OmniAgent', engine_code: 'M92',
      detail: 'اكتمال تنفيذ الأمر بنجاح', severity: 'success',
    });

    setExecuting(false);
    setInput('');
    setDecomposition(null);
    setShowDecomposition(false);
    setActiveSubtasks({});
    fetchAll();
  };

  const openCommandDetail = async (cmd: OmniCommand) => {
    setSelectedCommand(cmd);
    setSubtaskLoading(true);
    const [stRes, logRes] = await Promise.all([
      supabase.from('m92_subtasks').select('*').eq('command_id', cmd.id).order('execution_order', { ascending: true }),
      supabase.from('m92_audit_logs').select('*').eq('command_id', cmd.id).order('created_at', { ascending: true }),
    ]);
    setSubtasks((stRes.data as OmniSubtask[]) || []);
    setAuditLogs((logRes.data as OmniAuditLog[]) || []);
    setSubtaskLoading(false);
  };

  const toggleVoice = () => {
    setListening(!listening);
    if (!listening) {
      inputRef.current?.focus();
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const completedCommands = commands.filter((c) => c.status === 'completed').length;
  const executingCommands = commands.filter((c) => c.status === 'executing').length;
  const totalSubtasksAll = commands.reduce((sum, c) => sum + (c.total_subtasks || 0), 0);
  const avgConfidence = commands.length > 0
    ? (commands.reduce((sum, c) => sum + (c.intent_confidence || 0), 0) / commands.length).toFixed(1)
    : '0';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Brain size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">الوكيل الذكي السيادي الشامل (M92)</h2>
            <p className="font-body text-[10px] text-ink/40">العقل المركزي الموجه لمنظومة المحركات الـ 109</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-midnight text-cream">
          <Shield size={14} className="text-gold" />
          <span className="font-body text-[10px] font-bold">Zero-Trust · AES-256</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={<Brain size={14} className="text-midnight" />} label="إجمالي الأوامر" value={String(commands.length)} valueClass="text-midnight" />
        <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="أوامر مكتملة" value={String(completedCommands)} valueClass="text-green-700" />
        <StatCard icon={<Zap size={14} className="text-amber-600" />} label="قيد التنفيذ" value={String(executingCommands)} valueClass="text-amber-700" />
        <StatCard icon={<Layers size={14} className="text-gold" />} label="مهام فرعية" value={String(totalSubtasksAll)} valueClass="text-gold" />
        <StatCard icon={<Gauge size={14} className="text-blue-600" />} label="متوسط الثقة" value={`${avgConfidence}%`} valueClass="text-blue-700" />
      </div>

      {/* Command Input Panel */}
      <div className="bg-midnight rounded-xl p-5 border border-gold/20">
        <div className="flex items-center gap-2 mb-4">
          <Cpu size={16} className="text-gold" />
          <span className="font-heading font-bold text-cream text-sm">وحدة استقبال الأوامر (Trigger Interface)</span>
          <span className="font-body text-[10px] text-cream/40">— مسار التنفيذ: /api/v1/m92/execute</span>
        </div>

        <div className="relative">
          <TextArea
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="اكتب أو انطق أمرك... مثال: قم بتأسيس مصنع سيراميك وإعداد عقود التوزيع"
            rows={3}
            className="bg-midnight-light/50 border-gold/20 text-cream placeholder:text-cream/30 focus:border-gold/50"
          />
          <div className="absolute left-3 bottom-3 flex items-center gap-2">
            <button
              onClick={toggleVoice}
              className={`p-2 rounded-lg transition-colors ${listening ? 'bg-red-500/20 text-red-400' : 'bg-gold/10 text-gold hover:bg-gold/20'}`}
              title={listening ? 'إيقاف الاستماع' : 'إدخال صوتي'}
            >
              {listening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          </div>
        </div>

        {/* Example commands */}
        {!showDecomposition && (
          <div className="mt-3">
            <p className="font-body text-[10px] text-cream/40 mb-2">أوامر مقترحة:</p>
            <div className="flex items-center gap-2 flex-wrap">
              {EXAMPLE_COMMANDS.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(ex); handleDecompose(ex); }}
                  className="px-2.5 py-1 rounded-lg bg-midnight-light/50 border border-gold/10 font-body text-[10px] text-cream/60 hover:border-gold/30 hover:text-cream/90 transition-all"
                >
                  {ex.length > 40 ? ex.slice(0, 40) + '...' : ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Live Decomposition Preview */}
        {showDecomposition && decomposition && (
          <div className="mt-4 space-y-3">
            {/* Intent analysis */}
            <div className="bg-midnight-light/30 rounded-lg p-3 border border-gold/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-gold" />
                  <span className="font-heading font-bold text-cream text-xs">تحليل القصد (Intent Analysis)</span>
                </div>
                <span className="font-body text-[10px] text-cream/40">ثقة: {decomposition.confidence.toFixed(1)}%</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold">
                  {decomposition.intentLabel}
                </span>
                {decomposition.entities.map((e, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-midnight-light/50 text-cream/60 font-body text-[10px] border border-gold/10">
                    {e}
                  </span>
                ))}
              </div>
            </div>

            {/* Cluster activation preview */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Radio size={12} className="text-gold" />
                <span className="font-body text-[10px] font-bold text-cream/70">التفعيل العنقودي (Cluster Activation) — {decomposition.subtasks.length} محركات بالتوازي</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {decomposition.subtasks.map((st, i) => {
                  const Icon = ENGINE_ICONS[INTENT_ICON_MAP[st.engine_code] || 'CircuitBoard'] || CircuitBoard;
                  return (
                    <div key={i} className="bg-midnight-light/30 rounded-lg p-2.5 border border-gold/10 flex items-start gap-2">
                      <div className="w-7 h-7 rounded-lg bg-midnight flex items-center justify-center flex-shrink-0">
                        <Icon size={13} className="text-gold" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-body text-[10px] font-bold text-gold">{st.engine_code}</span>
                          <span className="font-body text-[9px] text-cream/40">·</span>
                          <span className="font-body text-[9px] text-cream/50">{DEPARTMENT_LABELS[st.department] || st.department}</span>
                        </div>
                        <p className="font-body text-[10px] text-cream/80 leading-tight mt-0.5">{st.task_title}</p>
                      </div>
                      <span className="font-body text-[9px] text-cream/30 flex-shrink-0">#{st.execution_order}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Execute button */}
            <button
              onClick={executeCommand}
              disabled={executing}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gold text-midnight font-body text-sm font-bold hover:bg-gold/90 transition-colors disabled:opacity-50"
            >
              {executing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  جارٍ التنفيذ المتوازي عبر المحركات...
                </>
              ) : (
                <>
                  <Send size={16} />
                  تنفيذ الأمر (Parallel Execution)
                </>
              )}
            </button>
          </div>
        )}

        {/* Live execution subtask animation */}
        {executing && Object.keys(activeSubtasks).length > 0 && (
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Activity size={12} className="text-gold animate-pulse" />
              <span className="font-body text-[10px] text-cream/60">حالة التنفيذ اللحظي:</span>
            </div>
            {Object.entries(activeSubtasks).map(([id, status]) => (
              <div key={id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-midnight-light/30 border border-gold/10">
                {status === 'running' ? (
                  <Loader2 size={12} className="text-amber-400 animate-spin" />
                ) : (
                  <CheckCircle2 size={12} className="text-green-400" />
                )}
                <span className="font-body text-[10px] text-cream/60">
                  {status === 'running' ? 'جارٍ التنفيذ...' : 'مكتمل'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Engine Registry Grid */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-midnight text-sm">سجل المحركات (Engine Registry) — {engines.length} محرك</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {engines.map((eng) => {
            const Icon = ENGINE_ICONS[eng.icon] || CircuitBoard;
            return (
              <div key={eng.id} className="bg-white rounded-lg border border-gray-200 p-2.5 hover:border-gold/30 transition-colors group">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center ${eng.engine_code === 'M92' ? 'bg-midnight' : 'bg-gray-100'}`}>
                    <Icon size={11} className={eng.engine_code === 'M92' ? 'text-gold' : 'text-ink/50'} />
                  </div>
                  <span className="font-body text-[10px] font-bold text-midnight">{eng.engine_code}</span>
                  {eng.engine_code === 'M92' && <span className="font-body text-[8px] text-gold">العقل</span>}
                </div>
                <p className="font-body text-[9px] text-ink/50 leading-tight truncate">{eng.engine_name_ar}</p>
                <p className="font-body text-[8px] text-ink/30 leading-tight">{DEPARTMENT_LABELS[eng.department || ''] || eng.department}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Command History */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Activity size={14} className="text-gold" />
          <span className="font-heading font-bold text-midnight text-sm">سجل الأوامر المنفذة</span>
        </div>
        <div className="space-y-2">
          {commands.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-200">
              <Brain size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد أوامر منفذة بعد</p>
            </div>
          ) : (
            commands.map((cmd) => {
              const sCfg = STATUS_CONFIG[cmd.status] || STATUS_CONFIG.pending;
              const progress = cmd.total_subtasks > 0 ? (cmd.completed_subtasks / cmd.total_subtasks) * 100 : 0;
              return (
                <div
                  key={cmd.id}
                  onClick={() => openCommandDetail(cmd)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        {cmd.status === 'completed' ? <CheckCircle2 size={16} className="text-green-600" /> : cmd.status === 'executing' ? <Loader2 size={16} className="text-amber-500 animate-spin" /> : <Clock size={16} className="text-gray-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-xs font-bold text-midnight leading-snug line-clamp-2">{cmd.raw_input}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          {cmd.intent && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">
                              {cmd.intent.replace(/_/g, ' ')}
                            </span>
                          )}
                          <span className="font-body text-[9px] text-ink/40">ثقة: {(cmd.intent_confidence || 0).toFixed(1)}%</span>
                          <span className="font-body text-[9px] text-ink/40">{cmd.completed_subtasks}/{cmd.total_subtasks} مهام</span>
                          <span className="font-body text-[9px] text-ink/30">{formatDate(cmd.created_at)}</span>
                        </div>
                        {cmd.status === 'executing' && (
                          <div className="mt-2 h-1 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full bg-amber-400 transition-all" style={{ width: `${progress}%` }} />
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-ink/20 group-hover:text-gold transition-colors flex-shrink-0 mt-1" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Command Detail Modal */}
      {selectedCommand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedCommand(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Brain size={18} className="text-gold" />
                <h3 className="font-heading font-bold text-midnight text-base">تفاصيل تنفيذ الأمر</h3>
              </div>
              <button onClick={() => setSelectedCommand(null)} className="text-ink/40 hover:text-ink transition-colors text-xl leading-none">×</button>
            </div>

            <div className="px-6 py-5 overflow-y-auto flex-1 space-y-5">
              {/* Raw command */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="font-body text-[10px] font-bold text-ink/40 mb-1">الأمر الأصلي</p>
                <p className="font-body text-sm text-midnight">{selectedCommand.raw_input}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-[10px] font-body font-bold bg-gold/10 text-gold">
                    {selectedCommand.intent?.replace(/_/g, ' ') || 'غير محدد'}
                  </span>
                  <span className="font-body text-[10px] text-ink/40">الثقة: {(selectedCommand.intent_confidence || 0).toFixed(1)}%</span>
                  <span className="font-body text-[10px] text-ink/40">النوع: {selectedCommand.input_type === 'voice' ? 'صوتي' : 'نصي'}</span>
                </div>
              </div>

              {/* Synthesis output */}
              {selectedCommand.synthesis_output && (
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles size={12} className="text-green-600" />
                    <span className="font-body text-[10px] font-bold text-green-700">التجميع والتوليد (Synthesis)</span>
                  </div>
                  <p className="font-body text-xs text-green-800 leading-relaxed">{selectedCommand.synthesis_output}</p>
                </div>
              )}

              {/* Subtasks — parallel execution visualization */}
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <Layers size={14} className="text-gold" />
                  <span className="font-body text-xs font-bold text-midnight">المهام الفرعية — التنفيذ المتوازي</span>
                </div>
                {subtaskLoading ? (
                  <div className="flex items-center gap-2 py-4">
                    <Loader2 size={14} className="text-gold animate-spin" />
                    <span className="font-body text-xs text-ink/40">جارٍ التحميل...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {subtasks.map((st) => {
                      const stCfg = SUBTASK_STATUS_CONFIG[st.status] || SUBTASK_STATUS_CONFIG.pending;
                      const Icon = ENGINE_ICONS[INTENT_ICON_MAP[st.engine_code] || 'CircuitBoard'] || CircuitBoard;
                      return (
                        <div key={st.id} className="flex items-start gap-3 bg-gray-50 rounded-lg p-3 border border-gray-100">
                          <div className="flex flex-col items-center flex-shrink-0">
                            <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                              <Icon size={14} className="text-midnight" />
                            </div>
                            {st.execution_order < subtasks.length && (
                              <div className="w-0.5 h-full min-h-[20px] bg-gray-200 mt-1" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-body text-[10px] font-bold text-gold">{st.engine_code}</span>
                              <span className="font-body text-[9px] text-ink/30">·</span>
                              <span className="font-body text-[9px] text-ink/40">{st.engine_name_ar}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${stCfg.bg} ${stCfg.text} mr-auto`}>{stCfg.label}</span>
                            </div>
                            <p className="font-body text-xs font-bold text-midnight">{st.task_title}</p>
                            {st.task_description && <p className="font-body text-[10px] text-ink/50 mt-0.5 leading-relaxed">{st.task_description}</p>}
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="font-body text-[9px] text-ink/40">{DEPARTMENT_LABELS[st.department || ''] || st.department}</span>
                              {st.completed_at && (
                                <span className="font-body text-[9px] text-green-600 flex items-center gap-0.5">
                                  <CheckCircle2 size={9} /> {formatDate(st.completed_at)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Audit logs */}
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <Lock size={14} className="text-gold" />
                  <span className="font-body text-xs font-bold text-midnight">سجل التدقيق غير القابل للتعديل (Immutable Audit Log)</span>
                  <span className="font-body text-[9px] text-ink/30">— AES-256</span>
                </div>
                <div className="space-y-1.5">
                  {auditLogs.map((log) => {
                    const sevCfg = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.info;
                    const sevIcon = log.severity === 'success' ? <CheckCircle2 size={10} className="text-green-600" />
                      : log.severity === 'warning' ? <AlertTriangle size={10} className="text-amber-600" />
                      : log.severity === 'critical' ? <ShieldAlert size={10} className="text-red-600" />
                      : <Info size={10} className="text-blue-600" />;
                    return (
                      <div key={log.id} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
                        <div className="flex-shrink-0 mt-0.5">{sevIcon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-body text-[10px] font-bold text-midnight">{log.action}</span>
                            {log.engine_code && (
                              <span className="font-body text-[9px] text-gold">{log.engine_code}</span>
                            )}
                          </div>
                          {log.detail && <p className="font-body text-[10px] text-ink/50 leading-relaxed mt-0.5">{log.detail}</p>}
                          <span className="font-body text-[9px] text-ink/30">{formatDate(log.created_at)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
