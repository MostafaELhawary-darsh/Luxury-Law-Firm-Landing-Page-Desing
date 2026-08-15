import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/financeUtils';
import { isIntegrationEnabled } from '@/lib/integrationConfig';
import type {
  LaaSSubscriber, LaaSExternalLawyer, LaaSExternalTask,
  LaaSRbacRole, LaaSDashboardId,
  LaaSClientSuccessAction, LaaSClientSuccessActionType,
  LaaSTrelloSync, LaaSFinancialOpsLog, LaaSFinancialOpsType,
  LaaSSecurityEvent, LaaSSecurityEventType,
  LaaSDeepLinkToken, LaaSDocumentAccessLog, LaaSDeepLinkAccessType,
  LaaSBannedIp, LaaSF2bEvent, LaaSDlpAuditLog, LaaSUnmaskingMap,
  LaaSBanReason, LaaSDlpEntityType,
  LaaSVaultKeyVersion, LaaSKeyRotationAudit,
} from '@/lib/laasTypes';
import {
  DASHBOARD_LABELS, CS_ACTION_LABELS, FINOPS_TYPE_LABELS, SECURITY_EVENT_LABELS,
  SEVERITY_STYLES, DEEPLINK_ACCESS_LABELS,
  BAN_REASON_LABELS, DLP_ENTITY_LABELS, KEY_OP_LABELS,
} from '@/lib/laasTypes';
import {
  Scale, Network, Heart, Wallet, Shield, Lock, Fingerprint, Power,
  AlertTriangle, AlertOctagon, Bot, Trello, Gift, Calculator, DollarSign,
  Snowflake, Split, Download, ShieldAlert, Trash2, CheckCircle2, X,
  Loader2, Clock, TrendingUp, TrendingDown, Eye, EyeOff, Send, RefreshCw,
  Zap, Star, Activity, FileText, ShieldCheck, Radar, ChevronLeft,
  Plus, Coins, Percent, Timer, Building2, User, Gavel, Cpu, Database,
  Link2, KeyRound, Copy, ExternalLink,
  Ban, Globe, FileLock2, Eraser, ShieldOff,
  History, ServerCog,
} from 'lucide-react';

// ===== Helper: formatDate =====
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

// ===== Helper: Hold-to-Confirm Button =====
function HoldButton({ label, color, onExecute, holdToConfirm = false }: {
  label: string;
  color: 'critical' | 'warning' | 'success';
  onExecute: () => void;
  holdToConfirm?: boolean;
}) {
  const [isDone, setIsDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const colorClasses = {
    critical: 'bg-locc-critical-dim text-locc-critical border-locc-critical/40 hover:bg-locc-critical hover:text-white hover:shadow-glow-critical',
    warning: 'bg-locc-warning-dim text-locc-warning border-locc-warning/40 hover:bg-locc-warning hover:text-midnight',
    success: 'bg-locc-success-dim text-locc-success border-locc-success/40 hover:bg-locc-success hover:text-midnight',
  };

  const handleClick = () => {
    if (holdToConfirm) return;
    setIsDone(true); onExecute();
    setTimeout(() => setIsDone(false), 3000);
  };

  const startHold = () => {
    if (!holdToConfirm) return;
    let p = 0;
    timer.current = setInterval(() => {
      p += 3;
      setProgress(p);
      if (p >= 100) {
        clearTimer();
        setIsDone(true); onExecute();
        setTimeout(() => { setIsDone(false); setProgress(0); }, 3000);
      }
    }, 30);
  };

  const clearTimer = () => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    setProgress(0);
  };

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  return (
    <button
      onClick={handleClick}
      onMouseDown={startHold}
      onMouseUp={clearTimer}
      onMouseLeave={clearTimer}
      onTouchStart={startHold}
      onTouchEnd={clearTimer}
      className={`relative overflow-hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold border transition-all duration-200 flex-1 ${
        isDone ? 'bg-locc-success-dim text-locc-success border-locc-success shadow-glow-success' : colorClasses[color]
      }`}
    >
      {holdToConfirm && !isDone && progress > 0 && (
        <div className="absolute inset-0 bg-locc-critical/20" style={{ width: `${progress}%` }} />
      )}
      {isDone ? <><CheckCircle2 size={12} /> تم التنفيذ</> : <><Zap size={12} /> {holdToConfirm && !isDone ? `${label} (ضغط مطول)` : label}</>}
    </button>
  );
}

// ===== Main Component =====
export function RBACBoards({ subscribers, onRefresh }: {
  subscribers: LaaSSubscriber[];
  onRefresh: () => void;
}) {
  const [roles, setRoles] = useState<LaaSRbacRole[]>([]);
  const [activeRole, setActiveRole] = useState<string>('ROLE_PARTNER');
  const [activeDashboard, setActiveDashboard] = useState<LaaSDashboardId | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [lawyers, setLawyers] = useState<LaaSExternalLawyer[]>([]);
  const [externalTasks, setExternalTasks] = useState<LaaSExternalTask[]>([]);

  useEffect(() => {
    supabase.from('laas_rbac_roles').select('*').order('created_at').then(({ data }) => {
      setRoles((data as LaaSRbacRole[]) || []);
      setLoading(false);
    });
    supabase.from('laas_external_lawyers').select('*').order('quality_score', { ascending: false }).then(({ data }) => {
      setLawyers((data as LaaSExternalLawyer[]) || []);
    });
    supabase.from('laas_external_tasks').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setExternalTasks((data as LaaSExternalTask[]) || []);
    });
  }, []);

  const currentRole = roles.find((r) => r.role_id === activeRole);
  const isPartner = activeRole === 'ROLE_PARTNER';

  // Determine accessible dashboards
  const accessibleDashboards: (LaaSDashboardId | 'all')[] = isPartner
    ? ['all', 'dashboard_legal_qc', 'dashboard_network_whitelabel', 'dashboard_client_success', 'dashboard_financial_ops', 'dashboard_security_privacy']
    : currentRole?.allowed_dashboards.includes('*')
      ? ['all', 'dashboard_legal_qc', 'dashboard_network_whitelabel', 'dashboard_client_success', 'dashboard_financial_ops', 'dashboard_security_privacy']
      : (currentRole?.allowed_dashboards.filter((d): d is LaaSDashboardId => d !== '*' && d.startsWith('dashboard_')) as LaaSDashboardId[]) || [];

  // If non-partner, auto-select their only dashboard
  useEffect(() => {
    if (!isPartner && accessibleDashboards.length === 1 && accessibleDashboards[0] !== 'all') {
      setActiveDashboard(accessibleDashboards[0]);
    } else if (isPartner && activeDashboard === 'all') {
      // keep 'all' for partner
    }
  }, [activeRole]);

  const ALL_DASHBOARDS: LaaSDashboardId[] = [
    'dashboard_legal_qc', 'dashboard_network_whitelabel',
    'dashboard_client_success', 'dashboard_financial_ops', 'dashboard_security_privacy',
  ];

  return (
    <div className="space-y-4">
      {/* ===== Role Switcher ===== */}
      <div className="locc-card p-4">
        <div className="flex items-center gap-3 mb-3">
          <Shield size={16} className="text-locc-gold" />
          <div>
            <h3 className="font-heading font-bold text-slate-100 text-sm">نظام الصلاحيات القائمة على الأدوار — RBAC</h3>
            <p className="font-body text-[10px] text-slate-500">تبديل الدور الوظيفي لعرض اللوحات المتاحة لكل إدارة — الشريك الإداري يرى الكل</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {roles.map((role) => {
            const isActive = activeRole === role.role_id;
            return (
              <button
                key={role.id}
                onClick={() => {
                  setActiveRole(role.role_id);
                  if (role.role_id === 'ROLE_PARTNER') setActiveDashboard('all');
                  else if (role.allowed_dashboards.length === 1 && role.allowed_dashboards[0] !== '*') {
                    setActiveDashboard(role.allowed_dashboards[0] as LaaSDashboardId);
                  }
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-body text-[11px] font-bold border transition-all ${
                  isActive
                    ? 'bg-locc-gold text-midnight border-locc-gold shadow-glow-gold'
                    : 'bg-locc-bg text-slate-400 border-locc-border hover:border-locc-border/60'
                }`}
              >
                {role.hardware_key_required && <Lock size={11} />}
                {role.mfa_required && !role.hardware_key_required && <ShieldCheck size={11} />}
                {role.display_name_ar}
              </button>
            );
          })}
        </div>
        {/* MFA + Hardware Key notice */}
        {currentRole && (
          <div className="mt-3 flex items-center gap-3 text-[10px] font-body">
            {currentRole.mfa_required && (
              <span className="flex items-center gap-1 text-locc-cyan"><ShieldCheck size={11} /> يتطلب توثيق MFA</span>
            )}
            {currentRole.hardware_key_required && (
              <span className="flex items-center gap-1 text-locc-critical"><Lock size={11} /> يتطلب مفتاح أمان (Hardware Key)</span>
            )}
            <span className="text-slate-500 mr-auto">الصلاحيات: {currentRole.permissions.length} إجراء مصرح</span>
          </div>
        )}
      </div>

      {/* ===== Dashboard Selector (Partner only) ===== */}
      {isPartner && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveDashboard('all')}
            className={`px-3 py-1.5 rounded-lg font-body text-[11px] font-bold border transition-all ${
              activeDashboard === 'all' ? 'bg-locc-gold text-midnight border-locc-gold' : 'bg-locc-bg text-slate-400 border-locc-border hover:border-locc-border/60'
            }`}
          >
            عرض الكل
          </button>
          {ALL_DASHBOARDS.map((dash) => {
            const meta = DASHBOARD_LABELS[dash];
            return (
              <button
                key={dash}
                onClick={() => setActiveDashboard(dash)}
                className={`px-3 py-1.5 rounded-lg font-body text-[11px] font-bold border transition-all ${
                  activeDashboard === dash ? 'bg-locc-gold text-midnight border-locc-gold' : 'bg-locc-bg text-slate-400 border-locc-border hover:border-locc-border/60'
                }`}
              >
                {meta.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ===== Boards ===== */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 size={24} className="text-locc-gold animate-spin" /></div>
      ) : (
        <>
          {(activeDashboard === 'all' || activeDashboard === 'dashboard_legal_qc') && (
            <LegalQcBoard subscribers={subscribers} externalTasks={externalTasks} onRefresh={onRefresh} />
          )}
          {(activeDashboard === 'all' || activeDashboard === 'dashboard_network_whitelabel') && (
            <NetworkBoard lawyers={lawyers} externalTasks={externalTasks} onRefresh={onRefresh} />
          )}
          {(activeDashboard === 'all' || activeDashboard === 'dashboard_client_success') && (
            <ClientSuccessBoard subscribers={subscribers} onRefresh={onRefresh} />
          )}
          {(activeDashboard === 'all' || activeDashboard === 'dashboard_financial_ops') && (
            <FinancialOpsBoard subscribers={subscribers} onRefresh={onRefresh} />
          )}
          {(activeDashboard === 'all' || activeDashboard === 'dashboard_security_privacy') && (
            <SecurityBoard onRefresh={onRefresh} />
          )}
        </>
      )}
    </div>
  );
}

// ===== Board Wrapper =====
function BoardWrapper({ icon: Icon, title, subtitle, accent, children }: {
  icon: typeof Scale;
  title: string;
  subtitle: string;
  accent: 'critical' | 'cyan' | 'success' | 'gold';
  children: React.ReactNode;
}) {
  const accentColor = accent === 'critical' ? 'text-locc-critical' : accent === 'cyan' ? 'text-locc-cyan' : accent === 'gold' ? 'text-locc-gold' : 'text-locc-success';
  const borderColor = accent === 'critical' ? 'border-locc-critical/20' : accent === 'cyan' ? 'border-locc-cyan/20' : accent === 'gold' ? 'border-locc-gold/20' : 'border-locc-success/20';
  return (
    <div className={`locc-card p-5 border-r-4 ${borderColor}`}>
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} className={accentColor} />
        <div>
          <h3 className="font-heading font-bold text-slate-100 text-sm">{title}</h3>
          <p className="font-body text-[9px] text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

// ===== KPI Card =====
function KpiCard({ icon: Icon, label, value, color, sub }: {
  icon: typeof Scale;
  label: string;
  value: string | number;
  color: 'critical' | 'warning' | 'success' | 'gold' | 'cyan';
  sub?: string;
}) {
  const colorMap = {
    critical: 'text-locc-critical',
    warning: 'text-locc-warning',
    success: 'text-locc-success',
    gold: 'text-locc-gold',
    cyan: 'text-locc-cyan',
  };
  return (
    <div className="bg-locc-bg rounded-lg p-3 border border-locc-border">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={12} className={colorMap[color]} />
        <p className="font-body text-[10px] text-slate-400">{label}</p>
      </div>
      <p className={`font-heading font-bold text-lg ${colorMap[color]}`}>{value}</p>
      {sub && <p className="font-body text-[9px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ===== 1. Legal & QC Board =====
function LegalQcBoard({ subscribers, externalTasks, onRefresh }: {
  subscribers: LaaSSubscriber[];
  externalTasks: LaaSExternalTask[];
  onRefresh: () => void;
}) {
  const submittedTasks = externalTasks.filter((t) => t.status === 'submitted' || t.status === 'in_review');
  const firstPassRate = 72;
  const criticalDeadlines = externalTasks.filter((t) => t.deadline_hours <= 24).length;

  const handleApprove = async (taskId: string) => {
    await supabase.from('laas_external_tasks').update({
      status: 'approved', approved_at: new Date().toISOString(), escrow_released_pct: 70,
    }).eq('id', taskId);
    onRefresh();
  };

  const handleReject = async (taskId: string) => {
    await supabase.from('laas_external_tasks').update({
      status: 'rejected', rejection_reason: 'إعادة للمحامي للتعديل',
    }).eq('id', taskId);
    onRefresh();
  };

  return (
    <BoardWrapper icon={Scale} title="لوحة الشؤون القانونية وضمان الجودة" subtitle="Legal & QC Board — مراجعة المخرجات الفنية قبل وصولها للعميل" accent="critical">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <KpiCard icon={CheckCircle2} label="معدل الاعتماد من المرة الأولى" value={`${firstPassRate}%`} color="success" sub="First-Pass Approval Rate" />
        <KpiCard icon={Clock} label="مهل حرجة (<48س)" value={criticalDeadlines} color="critical" sub="الطعون والإنذارات" />
        <KpiCard icon={AlertTriangle} label="تعديلات جوهرية" value={submittedTasks.length} color="warning" sub="على صياغات المحامين الخارجيين" />
      </div>

      {/* Workflow */}
      <div className="bg-locc-bg rounded-lg p-3 border border-locc-border mb-4">
        <p className="font-body text-[10px] font-bold text-slate-400 mb-2">سير العمل: مسودة مرفوعة ➔ فحص التجهيل ➔ مراجعة الشريك ➔ فك التجهيل ➔ إرسال للعميل</p>
        <div className="flex items-center gap-1 flex-wrap">
          {['مسودة مرفوعة', 'فحص التجهيل', 'مراجعة الشريك', 'فك التجهيل', 'إرسال للعميل'].map((step, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="px-2 py-1 rounded bg-locc-surface font-body text-[9px] text-slate-300 border border-locc-border">{step}</span>
              {i < 4 && <ChevronLeft size={10} className="text-slate-600" />}
            </div>
          ))}
        </div>
      </div>

      {/* Tasks awaiting QC */}
      <p className="font-body text-[11px] font-bold text-slate-300 mb-2">مسودات بانتظار المراجعة والاعتماد</p>
      {submittedTasks.length > 0 ? (
        <div className="space-y-2">
          {submittedTasks.map((task) => {
            const subscriber = subscribers.find((s) => s.id === task.subscriber_id);
            return (
              <div key={task.id} className="bg-locc-bg rounded-lg p-3 border border-locc-border">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-body text-xs font-bold text-slate-100">{task.anonymized_content.slice(0, 60)}...</p>
                    <p className="font-body text-[10px] text-slate-500 mt-0.5">العميل: {subscriber?.name || '—'} • المهلة: {task.deadline_hours}س</p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-locc-warning-dim text-locc-warning font-body text-[9px] font-bold">قيد المراجعة</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <HoldButton label="فك التجهيل واعتمد" color="success" onExecute={() => handleApprove(task.id)} />
                  <HoldButton label="إعادة للمحامي" color="warning" onExecute={() => handleReject(task.id)} />
                  <HoldButton label="سحب لغرفة الطوارئ" color="critical" onExecute={() => handleApprove(task.id)} holdToConfirm />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="font-body text-[10px] text-slate-500 text-center py-4">لا توجد مسودات بانتظار المراجعة</p>
      )}
    </BoardWrapper>
  );
}

// ===== 2. Network Board =====
function NetworkBoard({ lawyers, externalTasks, onRefresh }: {
  lawyers: LaaSExternalLawyer[];
  externalTasks: LaaSExternalTask[];
  onRefresh: () => void;
}) {
  const activeLawyers = lawyers.filter((l) => l.is_active && l.is_available).length;
  const avgLqs = lawyers.length > 0 ? Math.round(lawyers.reduce((sum, l) => sum + l.quality_score, 0) / lawyers.length) : 0;
  const pendingEscrow = externalTasks.filter((t) => t.status === 'approved' || t.status === 'completed').reduce((sum, t) => sum + t.lawyer_payout_points, 0);
  const biddingSpeed = 42;

  const handleFreeze = async (lawyerId: string) => {
    await supabase.from('laas_external_lawyers').update({ is_available: false, is_active: false }).eq('id', lawyerId);
    onRefresh();
  };

  const handleReleaseEscrow = async (lawyerId: string) => {
    const lawyer = lawyers.find((l) => l.id === lawyerId);
    if (!lawyer) return;
    await supabase.from('laas_external_lawyers').update({
      total_earnings_points: lawyer.total_earnings_points + pendingEscrow,
      total_tasks_completed: lawyer.total_tasks_completed + 1,
    }).eq('id', lawyerId);
    onRefresh();
  };

  return (
    <BoardWrapper icon={Network} title="لوحة شبكة المحامين والشركاء بالباطن" subtitle="White-Label Network Board — إدارة العلاقة وتوزيع المهام وSLA" accent="cyan">
      <div className="grid grid-cols-3 gap-3 mb-4">
        <KpiCard icon={Zap} label="سرعة الاستجابة للعروض" value={`${biddingSpeed}س`} color="cyan" sub="Task Bidding Speed" />
        <KpiCard icon={Star} label="متوسط LQS" value={avgLqs} color="gold" sub="Lawyer Quality Score" />
        <KpiCard icon={Coins} label="أتعاب معلقة في الضمان" value={pendingEscrow} color="warning" sub="Escrow Balance" />
      </div>

      <div className="bg-locc-bg rounded-lg p-3 border border-locc-border mb-4">
        <p className="font-body text-[10px] font-bold text-slate-400 mb-2">سير العمل: طلب خدمة ➔ تجهيل آلي ➔ ترشيح الخوارزمية ➔ قبول المحامي ➔ متابعة في البيئة المعزولة</p>
      </div>

      <p className="font-body text-[11px] font-bold text-slate-300 mb-2">المحامون الخارجيون — أداء وسيطرة</p>
      <div className="space-y-2">
        {lawyers.slice(0, 4).map((lawyer) => (
          <div key={lawyer.id} className="bg-locc-bg rounded-lg p-3 border border-locc-border">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded bg-locc-surface">
                  <Gavel size={14} className="text-locc-cyan" />
                </div>
                <div>
                  <p className="font-body text-xs font-bold text-slate-100">{lawyer.display_name}</p>
                  <p className="font-body text-[10px] text-slate-500">{lawyer.jurisdiction} • LQS: {lawyer.quality_score}</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded font-body text-[9px] font-bold ${lawyer.is_available ? 'bg-locc-success-dim text-locc-success' : 'bg-locc-critical-dim text-locc-critical'}`}>
                {lawyer.is_available ? 'متاح' : 'محظور'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <HoldButton label="إفراج عن الأتعاب" color="success" onExecute={() => handleReleaseEscrow(lawyer.id)} />
              <HoldButton label="تجاوز التوزيع الآلي" color="warning" onExecute={() => {}} />
              <HoldButton label="تجميد الحساب" color="critical" onExecute={() => handleFreeze(lawyer.id)} holdToConfirm />
            </div>
          </div>
        ))}
      </div>
    </BoardWrapper>
  );
}

// ===== 3. Client Success Board =====
function ClientSuccessBoard({ subscribers, onRefresh }: {
  subscribers: LaaSSubscriber[];
  onRefresh: () => void;
}) {
  const [actions, setActions] = useState<LaaSClientSuccessAction[]>([]);
  const [trelloSyncs, setTrelloSyncs] = useState<LaaSTrelloSync[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [actRes, syncRes] = await Promise.all([
      supabase.from('laas_client_success_actions').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('laas_trello_syncs').select('*').order('created_at', { ascending: false }).limit(10),
    ]);
    setActions((actRes.data as LaaSClientSuccessAction[]) || []);
    setTrelloSyncs((syncRes.data as LaaSTrelloSync[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Compute stagnation from subscribers
  const stagnantAccounts = subscribers.filter((s) => (s.wallet?.balance || 0) > 100);
  const totalAccounts = subscribers.length;
  const retentionRate = 91;
  const trelloConnected = 38;

  const handleAutopilot = async (subscriberId: string, points: number) => {
    const subscriber = subscribers.find((s) => s.id === subscriberId);
    if (!subscriber) return;
    const companyType = subscriber.segment === 'b2b' ? 'commercial' : subscriber.segment === 'b2l' ? 'legal_firm' : 'financial';
    const serviceMap: Record<string, { title: string; summary: string; cost: number }> = {
      financial: { title: 'تدقيق الالتزام بتعميمات الرقابة المالية', summary: 'مراجعة مدى الالتزام بتعديلات السيولة وحوكمة المحافظ', cost: 100 },
      commercial: { title: 'مراجعة ثغرات عقود العمل النموذجية', summary: 'فحص العقود وفق أحكام المحاكم العمالية الأخيرة', cost: 75 },
      legal_firm: { title: 'ملخص السوابق القضائية في الدوائر الاقتصادية', summary: 'بحث بآخر الدفوع القانونية في الاستئنافية', cost: 50 },
    };
    const svc = serviceMap[companyType] || serviceMap.commercial;

    const { data: actData } = await supabase.from('laas_client_success_actions').insert({
      subscriber_id: subscriberId,
      action_type: 'autopilot_protection',
      company_type: companyType,
      stagnation_days: 20,
      points_balance: subscriber.wallet?.balance || 0,
      points_spent: svc.cost,
      service_title: svc.title,
      service_summary: svc.summary,
      status: 'executed',
      executed_by: 'مدير نجاح العملاء',
    }).select().single();

    if (actData) {
      await supabase.from('laas_trello_syncs').insert({
        subscriber_id: subscriberId,
        action_id: actData.id,
        board_name: `لوحة ${subscriber.name}`,
        list_name: '🛡️ الحماية الاستباقية',
        card_name: `⚡ تحديث استباقي: ${svc.title}`,
        sync_status: 'synced',
        webhook_health: 'connected',
      });
    }

    fetchData(); onRefresh();
  };

  const handleRenewal = async (subscriberId: string) => {
    const subscriber = subscribers.find((s) => s.id === subscriberId);
    await supabase.from('laas_client_success_actions').insert({
      subscriber_id: subscriberId,
      action_type: 'renewal_offer',
      company_type: 'commercial',
      stagnation_days: 0,
      points_balance: subscriber?.wallet?.balance || 0,
      service_title: 'عرض تجديد المحفظة — خصم 15%',
      service_summary: 'عرض مخصص لشراء باقة نقاط جديدة عند اقتراب الرصيد من 15%',
      status: 'executed',
      executed_by: 'مدير نجاح العملاء',
    });
    fetchData();
  };

  return (
    <BoardWrapper icon={Heart} title="لوحة نمو وتطوير حسابات الشركات" subtitle="Client Success Board — مراقبة صحة المحفظة وتفعيل الاستهلاك الاستباقي" accent="success">
      <div className="grid grid-cols-3 gap-3 mb-4">
        <KpiCard icon={AlertTriangle} label="حسابات معرضة للركود" value={stagnantAccounts.length} color="warning" sub={`من إجمالي ${totalAccounts} شركة`} />
        <KpiCard icon={TrendingUp} label="معدل التجديد" value={`${retentionRate}%`} color="success" sub="Retention Rate" />
        <KpiCard icon={Trello} label="متصل بـ Trello" value={trelloConnected} color="cyan" sub="Webhook متصل" />
      </div>

      {/* Account Health Matrix */}
      <p className="font-body text-[11px] font-bold text-slate-300 mb-2">مصفوفة صحة الحسابات — Account Retention Matrix</p>
      <div className="space-y-2 mb-4">
        {subscribers.slice(0, 5).map((s, i) => {
          const balance = s.wallet?.balance || 0;
          const isStagnant = balance > 100;
          const isChurn = balance > 200 && i === 0;
          const healthColor = isChurn ? 'critical' : isStagnant ? 'warning' : 'success';
          const healthLabel = isChurn ? '🔴 معرض للإلغاء' : isStagnant ? '🟡 خامل مهدد' : '🟢 نشط جداً';
          return (
            <div key={s.id} className="bg-locc-bg rounded-lg p-3 border border-locc-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-locc-cyan" />
                  <div>
                    <p className="font-body text-xs font-bold text-slate-100">{s.name}</p>
                    <p className="font-body text-[10px] text-slate-500">الرصيد: {balance} نقطة</p>
                  </div>
                </div>
                <span className="font-body text-[10px] font-bold text-slate-300">{healthLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <HoldButton label="إطلاق الحماية التلقائية" color={healthColor === 'critical' ? 'critical' : 'warning'} onExecute={() => handleAutopilot(s.id, balance)} />
                <HoldButton label="مزامنة Trello" color="success" onExecute={() => handleAutopilot(s.id, balance)} />
                <HoldButton label="تلميح تجديد" color="success" onExecute={() => handleRenewal(s.id)} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Trello Sync Status */}
      <div className="bg-locc-bg rounded-lg p-3 border border-locc-border mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="font-body text-[11px] font-bold text-slate-300 flex items-center gap-1">
            <Trello size={12} className="text-locc-cyan" /> وحدة المزامنة مع Trello
          </p>
          <span className="flex items-center gap-1 font-body text-[10px] text-locc-success">
            <span className="w-2 h-2 rounded-full bg-locc-success animate-pulse-fast" /> Trello API Connected
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {['🛡️ الحماية الاستباقية', '📋 إجراءات مطلوبة', '✅ تمت المراجعة'].map((list, i) => (
            <div key={i} className="bg-locc-surface rounded p-2 border border-locc-border">
              <p className="font-body text-[9px] text-slate-400">{list}</p>
              <p className="font-mono text-xs text-locc-cyan mt-1">{i === 0 ? trelloSyncs.length : i === 1 ? 3 : 12}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Deep Link Verification Service */}
      <DeepLinkVerificationPanel subscribers={subscribers} />

      {/* Action Log */}
      <p className="font-body text-[11px] font-bold text-slate-300 mb-2">سجل الإجراءات الاستباقية</p>
      {loading ? (
        <div className="flex items-center justify-center py-4"><Loader2 size={16} className="text-locc-gold animate-spin" /></div>
      ) : actions.length > 0 ? (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {actions.map((act) => {
            const meta = CS_ACTION_LABELS[act.action_type];
            const subscriber = subscribers.find((s) => s.id === act.subscriber_id);
            return (
              <div key={act.id} className="flex items-center gap-3 text-[10px] font-body py-1.5 border-b border-locc-border/50">
                <span className={`w-1.5 h-1.5 rounded-full ${act.status === 'executed' ? 'bg-locc-success' : 'bg-locc-warning'}`} />
                <span className="font-mono text-slate-500">{formatDate(act.created_at)}</span>
                <span className="text-slate-300 flex-1">{meta.label} → {subscriber?.name || '—'}</span>
                {act.points_spent && <span className="text-locc-gold font-bold">{act.points_spent} نقطة</span>}
                <span className={`px-1.5 py-0.5 rounded text-[9px] ${act.status === 'executed' ? 'bg-locc-success-dim text-locc-success' : 'bg-locc-warning-dim text-locc-warning'}`}>{act.status}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="font-body text-[10px] text-slate-500 text-center py-3">لا توجد إجراءات استباقية مسجلة</p>
      )}
    </BoardWrapper>
  );
}

// ===== Deep Link Verification Panel =====
function DeepLinkVerificationPanel({ subscribers }: { subscribers: LaaSSubscriber[] }) {
  const [tokens, setTokens] = useState<LaaSDeepLinkToken[]>([]);
  const [accessLogs, setAccessLogs] = useState<LaaSDocumentAccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedSubscriber, setSelectedSubscriber] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<string | null>(null);
  const [mfaStep, setMfaStep] = useState<{ sessionToken: string } | null>(null);
  const [otpInput, setOtpInput] = useState('');

  const fetchData = useCallback(async () => {
    const [tokRes, logRes] = await Promise.all([
      supabase.from('laas_deep_link_tokens').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('laas_document_access_logs').select('*').order('created_at', { ascending: false }).limit(30),
    ]);
    setTokens((tokRes.data as LaaSDeepLinkToken[]) || []);
    setAccessLogs((logRes.data as LaaSDocumentAccessLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const edgeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deep-link-verify`;
  const deepLinkEnabled = isIntegrationEnabled('deepLink');

  const handleGenerate = async () => {
    if (!selectedSubscriber || !docTitle.trim()) return;
    if (!deepLinkEnabled) { setSimResult('disabled: تكامل الروابط العميقة معطل'); return; }
    setGenerating(true);
    setGeneratedLink(null);
    setSimResult(null);

    const docId = `DOC-${Date.now().toString(36).toUpperCase()}`;
    const res = await fetch(`${edgeUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscriber_id: selectedSubscriber,
        doc_id: docId,
        doc_title: docTitle.trim(),
      }),
    });
    const data = await res.json();
    if (data.success) {
      setGeneratedLink(data.deep_link);
      fetchData();
    }
    setGenerating(false);
  };

  const handleCopy = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async (tokenId: string) => {
    if (!deepLinkEnabled) return;
    await fetch(`${edgeUrl}/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token_id: tokenId }),
    });
    fetchData();
  };

  // Simulate a client clicking the deep link from outside
  const handleSimulateClick = async (token: string) => {
    if (!deepLinkEnabled) { setSimResult('disabled: تكامل الروابط العميقة معطل'); return; }
    setSimulating(true);
    setSimResult(null);
    setMfaStep(null);
    setOtpInput('');

    const res = await fetch(`${edgeUrl}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        ip_address: '203.0.113.42',
        user_agent: 'Mozilla/5.0 (iPhone; Client External Browser)',
      }),
    });
    const data = await res.json();

    if (data.verified && data.mfa_required) {
      setMfaStep({ sessionToken: data.session_token });
      setSimResult('mfa_required');
    } else if (data.verified && !data.mfa_required) {
      setSimResult('streamed');
    } else {
      setSimResult(`denied: ${data.error || 'غير صالح'}`);
    }
    setSimulating(false);
    fetchData();
  };

  const handleMfaVerify = async () => {
    if (!mfaStep || !otpInput.trim()) return;
    if (!deepLinkEnabled) { setSimResult('disabled: تكامل الروابط العميقة معطل'); return; }
    setSimulating(true);
    const res = await fetch(`${edgeUrl}/mfa-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_token: mfaStep.sessionToken,
        otp_code: otpInput.trim(),
        ip_address: '203.0.113.42',
      }),
    });
    const data = await res.json();
    if (data.success) {
      setSimResult('mfa_success');
    } else {
      setSimResult(`mfa_failed: ${data.error || 'رمز خاطئ'}`);
    }
    setSimulating(false);
    setMfaStep(null);
    setOtpInput('');
    fetchData();
  };

  const activeTokens = tokens.filter((t) => !t.is_revoked && !t.used_at);
  const usedTokens = tokens.filter((t) => t.used_at || t.is_revoked);

  return (
    <div className="bg-locc-bg rounded-lg p-4 border border-locc-border mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Link2 size={14} className="text-locc-cyan" />
        <div>
          <p className="font-body text-[11px] font-bold text-slate-200">خدمة التحقق من الروابط العميقة — Deep Link Verification</p>
          <p className="font-body text-[9px] text-slate-500">DMZ Gateway + HMAC-SHA256 + MFA + In-Memory Streaming</p>
        </div>
      </div>

      {/* Security Constraints Banner */}
      <div className="bg-locc-cyan-dim border border-locc-cyan/20 rounded-lg p-2 mb-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { icon: KeyRound, label: 'HMAC-SHA256', desc: 'توقيع رقمي' },
            { icon: Clock, label: '30 دقيقة', desc: 'صلاحية قصيرة' },
            { icon: ShieldCheck, label: 'MFA إلزامي', desc: 'توثيق مزدوج' },
            { icon: EyeOff, label: 'One-Time', desc: 'لمرة واحدة' },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex items-center gap-1.5">
                <Icon size={11} className="text-locc-cyan" />
                <div>
                  <p className="font-mono text-[9px] font-bold text-slate-200">{item.label}</p>
                  <p className="font-body text-[8px] text-slate-500">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Verification Flow */}
      <div className="bg-locc-surface rounded-lg p-2 mb-3 border border-locc-border">
        <div className="flex items-center gap-1 flex-wrap">
          {['نقر من Trello', 'بوابة DMZ', 'فحص HMAC', 'تحدي MFA', 'بث المستند'].map((step, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded bg-locc-bg font-body text-[8px] text-slate-400 border border-locc-border">{step}</span>
              {i < 4 && <ChevronLeft size={8} className="text-slate-600" />}
            </div>
          ))}
        </div>
      </div>

      {/* Generate Link Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
        <select
          value={selectedSubscriber}
          onChange={(e) => setSelectedSubscriber(e.target.value)}
          className="px-2 py-1.5 bg-locc-surface border border-locc-border rounded-lg font-body text-[10px] text-slate-200 focus:outline-none focus:border-locc-cyan/40"
        >
          <option value="">— اختر العميل —</option>
          {subscribers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input
          type="text"
          value={docTitle}
          onChange={(e) => setDocTitle(e.target.value)}
          placeholder="عنوان المستند..."
          className="px-2 py-1.5 bg-locc-surface border border-locc-border rounded-lg font-body text-[10px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-locc-cyan/40"
        />
        <button
          onClick={handleGenerate}
          disabled={generating || !selectedSubscriber || !docTitle.trim()}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-locc-cyan-dim text-locc-cyan border border-locc-cyan/40 font-body text-[10px] font-bold hover:bg-locc-cyan hover:text-midnight transition-colors disabled:opacity-50"
        >
          {generating ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
          توليد رابط مشفر
        </button>
      </div>

      {/* Generated Link Display */}
      {generatedLink && (
        <div className="bg-locc-surface rounded-lg p-2.5 mb-3 border border-locc-success/30">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={12} className="text-locc-success flex-shrink-0" />
            <p className="font-mono text-[9px] text-locc-cyan flex-1 truncate" dir="ltr">{generatedLink}</p>
            <button onClick={handleCopy} className="flex items-center gap-1 px-2 py-1 rounded bg-locc-bg text-slate-400 font-body text-[9px] font-bold hover:text-slate-200 transition-colors flex-shrink-0">
              {copied ? <CheckCircle2 size={10} className="text-locc-success" /> : <Copy size={10} />}
              {copied ? 'تم النسخ' : 'نسخ'}
            </button>
          </div>
          <p className="font-body text-[9px] text-slate-500 mt-1">صلاحية الرابط: 30 دقيقة فقط • لمرة واحدة • يتطلب توثيق MFA</p>
        </div>
      )}

      {/* MFA Challenge Simulation */}
      {mfaStep && (
        <div className="bg-locc-warning-dim rounded-lg p-3 mb-3 border border-locc-warning/30">
          <p className="font-body text-[10px] font-bold text-locc-warning mb-2 flex items-center gap-1">
            <ShieldCheck size={12} /> تحدي التوثيق المزدوج MFA — أدخل رمز OTP
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value)}
              placeholder="6 أرقام"
              maxLength={6}
              className="px-2 py-1.5 bg-locc-bg border border-locc-border rounded-lg font-mono text-sm text-slate-200 text-center tracking-widest focus:outline-none focus:border-locc-warning/40 w-32"
            />
            <button
              onClick={handleMfaVerify}
              disabled={simulating || otpInput.length !== 6}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-locc-warning text-midnight font-body text-[10px] font-bold hover:bg-locc-warning/80 transition-colors disabled:opacity-50"
            >
              {simulating ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              تأكيد OTP
            </button>
          </div>
          <p className="font-body text-[9px] text-slate-500 mt-1">تلميح: الرمز محدد في سجل MFA بالأسفل</p>
        </div>
      )}

      {/* Simulation Result */}
      {simResult && (
        <div className={`rounded-lg p-2.5 mb-3 border text-[10px] font-body ${
          simResult === 'streamed' || simResult === 'mfa_success'
            ? 'bg-locc-success-dim text-locc-success border-locc-success/30'
            : simResult === 'mfa_required'
              ? 'bg-locc-warning-dim text-locc-warning border-locc-warning/30'
              : 'bg-locc-critical-dim text-locc-critical border-locc-critical/30'
        }`}>
          {simResult === 'streamed' && '✓ تم التحقق وبث المستند بنجاح — العارض الآمن (Read-Only, No Download)'}
          {simResult === 'mfa_required' && '⚠ مطلوب توثيق MFA — أدخل رمز OTP أعلاه'}
          {simResult === 'mfa_success' && '✓ تم تأكيد MFA — جاري بث المستند من الخادم المحلي'}
          {simResult.startsWith('denied') && `✗ ${simResult}`}
          {simResult.startsWith('mfa_failed') && `✗ ${simResult}`}
        </div>
      )}

      {/* Active Tokens */}
      {loading ? (
        <div className="flex items-center justify-center py-3"><Loader2 size={14} className="text-locc-cyan animate-spin" /></div>
      ) : (
        <>
          {activeTokens.length > 0 && (
            <>
              <p className="font-body text-[10px] font-bold text-slate-400 mb-1.5">روابط نشطة — {activeTokens.length}</p>
              <div className="space-y-1.5 mb-3">
                {activeTokens.map((tok) => {
                  const subscriber = subscribers.find((s) => s.id === tok.subscriber_id);
                  const timeLeft = Math.max(0, Math.round((new Date(tok.expires_at).getTime() - Date.now()) / 60000));
                  return (
                    <div key={tok.id} className="bg-locc-surface rounded-lg p-2.5 border border-locc-border">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Link2 size={11} className="text-locc-cyan" />
                          <span className="font-body text-[10px] font-bold text-slate-200">{tok.doc_title}</span>
                          <span className="font-body text-[9px] text-slate-500">{subscriber?.name || '—'}</span>
                        </div>
                        <span className={`font-mono text-[9px] font-bold ${timeLeft < 10 ? 'text-locc-critical' : 'text-locc-warning'}`}>
                          {timeLeft > 0 ? `${timeLeft}د` : 'منتهي'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={() => handleSimulateClick(tok.token)}
                          disabled={simulating}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-locc-cyan-dim text-locc-cyan font-body text-[9px] font-bold hover:bg-locc-cyan hover:text-midnight transition-colors disabled:opacity-50"
                        >
                          {simulating ? <Loader2 size={10} className="animate-spin" /> : <ExternalLink size={10} />}
                          محاكاة نقر العميل
                        </button>
                        <button
                          onClick={() => handleRevoke(tok.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-locc-critical-dim text-locc-critical font-body text-[9px] font-bold hover:bg-locc-critical hover:text-white transition-colors"
                        >
                          <X size={10} /> إلغاء الرابط
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Access Logs */}
          <p className="font-body text-[10px] font-bold text-slate-400 mb-1.5">سجل الوصول للمستندات — Audit Trail</p>
          {accessLogs.length > 0 ? (
            <div className="space-y-0.5 max-h-32 overflow-y-auto">
              {accessLogs.map((log) => {
                const meta = DEEPLINK_ACCESS_LABELS[log.access_type] || { label: log.access_type, color: 'text-slate-400' };
                const subscriber = subscribers.find((s) => s.id === log.subscriber_id);
                return (
                  <div key={log.id} className="flex items-center gap-2 text-[9px] font-body py-1 border-b border-locc-border/30">
                    <span className={`w-1 h-1 rounded-full ${log.result === 'success' ? 'bg-locc-success' : 'bg-locc-critical'}`} />
                    <span className="font-mono text-slate-600 flex-shrink-0">{formatDate(log.created_at)}</span>
                    <span className={`font-bold ${meta.color} flex-shrink-0`}>{meta.label}</span>
                    <span className="text-slate-400 flex-1 truncate">{subscriber?.name || log.doc_id}</span>
                    {log.ip_address && <span className="font-mono text-locc-cyan flex-shrink-0">{log.ip_address}</span>}
                    <span className={`flex-shrink-0 ${log.result === 'success' ? 'text-locc-success' : 'text-locc-critical'}`}>{log.result}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="font-body text-[9px] text-slate-500 text-center py-2">لا توجد سجلات وصول — ولّد رابطاً ومحاكاة النقر</p>
          )}
        </>
      )}
    </div>
  );
}

// ===== 4. Financial Operations Board =====
function FinancialOpsBoard({ subscribers, onRefresh }: {
  subscribers: LaaSSubscriber[];
  onRefresh: () => void;
}) {
  const [opsLog, setOpsLog] = useState<LaaSFinancialOpsLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLog = useCallback(async () => {
    const { data } = await supabase.from('laas_financial_ops_log').select('*').order('created_at', { ascending: false }).limit(20);
    setOpsLog((data as LaaSFinancialOpsLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLog(); }, [fetchLog]);

  const totalActivePoints = subscribers.reduce((sum, s) => sum + (s.wallet?.balance || 0), 0);
  const totalConsumed = subscribers.reduce((sum, s) => sum + (s.wallet?.total_consumed || 0), 0);
  const dailyBurn = Math.round(totalConsumed / 30);
  const platformMargin = Math.round(totalConsumed * 0.4);

  const handlePricingAdjust = async () => {
    await supabase.from('laas_financial_ops_log').insert({
      action_type: 'pricing_adjustment',
      target_entity: 'تخصص: قانون العمل',
      points_before: 75,
      points_after: 90,
      specialty: 'labor',
      status: 'executed',
      executed_by: 'المدير المالي',
      notes: 'رفع النقاط المطلوبة للخدمات العمالية بنسبة 15% بناءً على ارتفاع تكلفة المحامين بالباطن',
    });
    fetchLog();
  };

  const handlePayout = async () => {
    await supabase.from('laas_financial_ops_log').insert({
      action_type: 'partner_payout',
      target_entity: 'شبكة المحامين بالباطن',
      cash_value: 45000,
      status: 'executed',
      executed_by: 'المدير المالي',
      notes: 'تسوية أتعاب المحامين الخارجيين — 60% من إجمالي الضمان',
    });
    fetchLog();
  };

  const handleFreeze = async (subscriberId: string) => {
    const subscriber = subscribers.find((s) => s.id === subscriberId);
    await supabase.from('laas_financial_ops_log').insert({
      action_type: 'wallet_freeze',
      target_entity: subscriber?.name || '—',
      points_before: subscriber?.wallet?.balance || 0,
      points_after: 0,
      status: 'executed',
      executed_by: 'المدير المالي',
      notes: 'تجميد نقاط الشركة بسبب نزاع قانوني حول العقد',
    });
    fetchLog();
  };

  return (
    <BoardWrapper icon={Wallet} title="لوحة المحفظة النقطية والعمليات المالية" subtitle="Financial Operations Board — اقتصاديات النقاط، هامش الربحية، والتسويات" accent="gold">
      <div className="grid grid-cols-3 gap-3 mb-4">
        <KpiCard icon={Coins} label="القيمة النقدية للنقاط المتداولة" value={totalActivePoints} color="gold" sub="Active Points Cash Equivalent" />
        <KpiCard icon={Percent} label="هامش ربح المنصة" value={`${platformMargin}`} color="success" sub="Platform Margin per Specialty" />
        <KpiCard icon={Activity} label="معدل الحرق اليومي" value={dailyBurn} color="cyan" sub="Daily Burn Rate" />
      </div>

      <div className="bg-locc-bg rounded-lg p-3 border border-locc-border mb-4">
        <p className="font-body text-[10px] font-bold text-slate-400 mb-2">سير العمل: شراء باقة ➔ تخصيص في المحفظة ➔ تجميد في الضمان ➔ تسوية أتعاب / ربح المنصة</p>
      </div>

      {/* Control Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
        <div className="bg-locc-bg rounded-lg p-3 border border-locc-border">
          <p className="font-body text-[10px] font-bold text-slate-300 mb-2">تعديل تسعير النقاط</p>
          <HoldButton label="رفع نقاط العمالية 15%" color="warning" onExecute={handlePricingAdjust} />
        </div>
        <div className="bg-locc-bg rounded-lg p-3 border border-locc-border">
          <p className="font-body text-[10px] font-bold text-slate-300 mb-2">تسوية حسابات الشركاء</p>
          <HoldButton label="صرف أتعاب المحامين" color="success" onExecute={handlePayout} />
        </div>
        <div className="bg-locc-bg rounded-lg p-3 border border-locc-border">
          <p className="font-body text-[10px] font-bold text-slate-300 mb-2">إيقاف محفظة متنازع عليها</p>
          <HoldButton label="تجميد محفظة" color="critical" onExecute={() => subscribers[0] && handleFreeze(subscribers[0].id)} holdToConfirm />
        </div>
      </div>

      {/* Ops Log */}
      <p className="font-body text-[11px] font-bold text-slate-300 mb-2">سجل العمليات المالية</p>
      {loading ? (
        <div className="flex items-center justify-center py-4"><Loader2 size={16} className="text-locc-gold animate-spin" /></div>
      ) : opsLog.length > 0 ? (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {opsLog.map((log) => {
            const meta = FINOPS_TYPE_LABELS[log.action_type];
            return (
              <div key={log.id} className="flex items-center gap-3 text-[10px] font-body py-1.5 border-b border-locc-border/50">
                <span className={`w-1.5 h-1.5 rounded-full ${log.status === 'executed' ? 'bg-locc-success' : 'bg-locc-warning'}`} />
                <span className="font-mono text-slate-500">{formatDate(log.created_at)}</span>
                <span className="text-slate-300 flex-1">{meta.label} → {log.target_entity || '—'}</span>
                {log.cash_value && <span className="text-locc-gold font-bold">{log.cash_value} ج.م</span>}
                {log.points_after != null && <span className="text-locc-cyan font-bold">{log.points_after} نقطة</span>}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="font-body text-[10px] text-slate-500 text-center py-3">لا توجد عمليات مالية مسجلة</p>
      )}
    </BoardWrapper>
  );
}

// ===== 5. Security & Privacy Board =====
function SecurityBoard({ onRefresh }: { onRefresh: () => void }) {
  const [events, setEvents] = useState<LaaSSecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    const { data } = await supabase.from('laas_security_events').select('*').order('created_at', { ascending: false }).limit(20);
    setEvents((data as LaaSSecurityEvent[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const criticalEvents = events.filter((e) => e.severity === 'critical' && e.status === 'active').length;
  const anonymizationRate = 100;

  const handleIsolate = async (eventId: string) => {
    await supabase.from('laas_security_events').update({
      status: 'isolated', action_taken: 'تم العزل الأمني الشامل — قطع الجلسات وإغلاق قنوات التشفير',
      resolved_at: new Date().toISOString(),
    }).eq('id', eventId);
    fetchEvents(); onRefresh();
  };

  const handlePurge = async () => {
    await supabase.from('laas_security_events').insert({
      event_type: 'sandbox_purge',
      severity: 'info',
      source_entity: 'البيئة المعزولة — جميع المحامين',
      description: 'تم مسح جميع الملفات المؤقتة من لوحات المحامين الخارجيين فور تسليم العمل',
      action_taken: 'تم المسح بنجاح',
      status: 'resolved',
      resolved_at: new Date().toISOString(),
    });
    fetchEvents();
  };

  const handleSovereigntyReport = async () => {
    await supabase.from('laas_security_events').insert({
      event_type: 'anonymization_check',
      severity: 'info',
      source_entity: 'نظام السيادة الرقمية',
      description: 'تم توليد تقرير السيادة الرقمية — يثبت عدم خروج أي بيانات خارج الخوادم المحلية',
      action_taken: 'تم التصدير',
      status: 'resolved',
      resolved_at: new Date().toISOString(),
    });
    fetchEvents();
  };

  return (
    <BoardWrapper icon={Shield} title="لوحة الأمن السيبراني والسيادة الرقمية" subtitle="Privacy & Security Board — مراقبة الخوادم المحلية، التجهيل، وسجلات الوصول" accent="critical">
      <div className="grid grid-cols-3 gap-3 mb-4">
        <KpiCard icon={Fingerprint} label="دقة محرك التجهيل" value={`${anonymizationRate}%`} color="success" sub="Anonymization Integrity" />
        <KpiCard icon={Download} label="كشف تحميل غير طبيعي" value={criticalEvents} color="critical" sub="Mass Download Detection" />
        <KpiCard icon={Database} label="سجلات الوصول" value={1247} color="cyan" sub="Audit Logs (اليوم)" />
      </div>

      <div className="bg-locc-bg rounded-lg p-3 border border-locc-border mb-4">
        <p className="font-body text-[10px] font-bold text-slate-400 mb-2">سير العمل: مراقبة التشفير ➔ فحص ثغرات التجهيل ➔ عزل البيئات المعزولة ➔ توثيق البصمات</p>
      </div>

      {/* Control Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
        <div className="bg-locc-critical-dim rounded-lg p-3 border border-locc-critical/30">
          <p className="font-body text-[10px] font-bold text-locc-critical mb-2 flex items-center gap-1"><Power size={11} /> العزل الأمني الشامل</p>
          <HoldButton label="Zero-Trust Isolate" color="critical" onExecute={() => events[0] && handleIsolate(events[0].id)} holdToConfirm />
        </div>
        <div className="bg-locc-bg rounded-lg p-3 border border-locc-border">
          <p className="font-body text-[10px] font-bold text-slate-300 mb-2 flex items-center gap-1"><Trash2 size={11} className="text-locc-warning" /> مسح البيئة المعزولة</p>
          <HoldButton label="Purge Sandbox" color="warning" onExecute={handlePurge} />
        </div>
        <div className="bg-locc-bg rounded-lg p-3 border border-locc-border">
          <p className="font-body text-[10px] font-bold text-slate-300 mb-2 flex items-center gap-1"><FileText size={11} className="text-locc-cyan" /> تقرير السيادة الرقمية</p>
          <HoldButton label="Export Report" color="success" onExecute={handleSovereigntyReport} />
        </div>
      </div>

      {/* Security Events */}
      <p className="font-body text-[11px] font-bold text-slate-300 mb-2">سجل الأحداث الأمنية</p>
      {loading ? (
        <div className="flex items-center justify-center py-4"><Loader2 size={16} className="text-locc-gold animate-spin" /></div>
      ) : events.length > 0 ? (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {events.map((evt) => {
            const meta = SECURITY_EVENT_LABELS[evt.event_type];
            const sev = SEVERITY_STYLES[evt.severity as 'critical' | 'warning'] || { label: 'معلومة', dot: 'bg-locc-cyan', text: 'text-locc-cyan', bg: 'bg-locc-cyan-dim', border: 'border-locc-cyan/40' };
            return (
              <div key={evt.id} className={`rounded-lg p-3 border ${evt.status === 'active' ? 'border-locc-critical/30 bg-locc-critical-dim' : 'border-locc-border bg-locc-bg'}`}>
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${sev.dot} ${evt.status === 'active' ? 'animate-pulse-fast' : ''}`} />
                    <span className="font-body text-[11px] font-bold text-slate-100">{meta.label}</span>
                    {evt.source_ip && <span className="font-mono text-[9px] text-locc-cyan">{evt.source_ip}</span>}
                  </div>
                  <span className={`px-1.5 py-0.5 rounded font-body text-[9px] font-bold ${evt.status === 'active' ? 'bg-locc-critical-dim text-locc-critical' : 'bg-locc-success-dim text-locc-success'}`}>{evt.status}</span>
                </div>
                <p className="font-body text-[10px] text-slate-400">{evt.description}</p>
                {evt.source_entity && <p className="font-body text-[9px] text-slate-500 mt-1">المصدر: {evt.source_entity}</p>}
                {evt.action_taken && <p className="font-body text-[9px] text-locc-success mt-1">الإجراء: {evt.action_taken}</p>}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="font-body text-[10px] text-slate-500 text-center py-3">لا توجد أحداث أمنية</p>
      )}

      {/* Security Infrastructure Panel */}
      <SecurityInfrastructurePanel />
    </BoardWrapper>
  );
}

// ===== Security Infrastructure Panel (Fail2ban + DLP + Unmasking Maps) =====
function SecurityInfrastructurePanel() {
  const [bannedIps, setBannedIps] = useState<LaaSBannedIp[]>([]);
  const [f2bEvents, setF2bEvents] = useState<LaaSF2bEvent[]>([]);
  const [dlpLogs, setDlpLogs] = useState<LaaSDlpAuditLog[]>([]);
  const [unmaskingMaps, setUnmaskingMaps] = useState<LaaSUnmaskingMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubPanel, setActiveSubPanel] = useState<'fail2ban' | 'dlp' | 'maps' | 'vault'>('fail2ban');

  // DLP input state
  const [dlpInput, setDlpInput] = useState('');
  const [dlpDocId, setDlpDocId] = useState('');
  const [dlpResult, setDlpResult] = useState<string | null>(null);
  const [dlpEntities, setDlpEntities] = useState<{ type: string; placeholder: string; method: string }[]>([]);
  const [dlpProcessing, setDlpProcessing] = useState(false);

  // Unban input
  const [unbanIp, setUnbanIp] = useState('');
  const [whitelistIp, setWhitelistIp] = useState('');

  // Vault key rotation state
  const [keyVersions, setKeyVersions] = useState<LaaSVaultKeyVersion[]>([]);
  const [rotationAudit, setRotationAudit] = useState<LaaSKeyRotationAudit[]>([]);
  const [rewrapDocId, setRewrapDocId] = useState('');
  const [vaultProcessing, setVaultProcessing] = useState(false);
  const [vaultMessage, setVaultMessage] = useState<string | null>(null);

  const edgeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/arabic-legal-dlp`;

  const fetchData = useCallback(async () => {
    const [banRes, f2bRes, dlpRes, mapRes, kvRes, auditRes] = await Promise.all([
      supabase.from('laas_banned_ips').select('*').order('created_at', { ascending: false }),
      supabase.from('laas_fail2ban_events').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('laas_dlp_audit_logs').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('laas_unmasking_maps').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('laas_vault_key_versions').select('*').order('version', { ascending: true }),
      supabase.from('laas_key_rotation_audit').select('*').order('created_at', { ascending: false }).limit(20),
    ]);
    setBannedIps((banRes.data as LaaSBannedIp[]) || []);
    setF2bEvents((f2bRes.data as LaaSF2bEvent[]) || []);
    setDlpLogs((dlpRes.data as LaaSDlpAuditLog[]) || []);
    setUnmaskingMaps((mapRes.data as LaaSUnmaskingMap[]) || []);
    setKeyVersions((kvRes.data as LaaSVaultKeyVersion[]) || []);
    setRotationAudit((auditRes.data as LaaSKeyRotationAudit[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAnonymize = async () => {
    if (!dlpInput.trim() || !dlpDocId.trim()) return;
    if (!isIntegrationEnabled('dlp')) { setDlpResult('تكامل محرك التجهيل (DLP) معطّل على مستوى المنصة'); return; }
    setDlpProcessing(true);
    setDlpResult(null);
    setDlpEntities([]);

    const res = await fetch(`${edgeUrl}/anonymize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: dlpInput, doc_id: dlpDocId }),
    });
    const data = await res.json();
    if (data.success) {
      setDlpResult(data.masked_text);
      setDlpEntities(data.entities || []);
      fetchData();
    }
    setDlpProcessing(false);
  };

  const handleUnban = async () => {
    if (!unbanIp.trim()) return;
    if (!isIntegrationEnabled('dlp')) return;
    await fetch(`${edgeUrl}/unban`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip_address: unbanIp.trim() }),
    });
    setUnbanIp('');
    fetchData();
  };

  const handleWhitelist = async () => {
    if (!whitelistIp.trim()) return;
    if (!isIntegrationEnabled('dlp')) return;
    await fetch(`${edgeUrl}/whitelist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip_address: whitelistIp.trim() }),
    });
    setWhitelistIp('');
    fetchData();
  };

  const handlePurge = async () => {
    if (!isIntegrationEnabled('dlp')) return;
    await fetch(`${edgeUrl}/purge`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    fetchData();
  };

  const handleRotateKey = async () => {
    if (!isIntegrationEnabled('dlp')) { setVaultMessage('تكامل Vault معطّل على مستوى المنصة'); return; }
    setVaultProcessing(true);
    setVaultMessage(null);
    const res = await fetch(`${edgeUrl}/rotate-key`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    const data = await res.json();
    if (data.success) {
      setVaultMessage(`تم تدوير المفتاح من v${data.previous_version} إلى v${data.new_version}`);
      fetchData();
    }
    setVaultProcessing(false);
  };

  const handleRewrap = async () => {
    if (!rewrapDocId.trim()) return;
    if (!isIntegrationEnabled('dlp')) { setVaultMessage('تكامل Vault معطّل على مستوى المنصة'); return; }
    setVaultProcessing(true);
    setVaultMessage(null);
    const res = await fetch(`${edgeUrl}/rewrap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc_id: rewrapDocId.trim() }),
    });
    const data = await res.json();
    if (data.success) {
      setVaultMessage(data.message);
      setRewrapDocId('');
      fetchData();
    } else {
      setVaultMessage(data.error || 'فشل إعادة التشفير');
    }
    setVaultProcessing(false);
  };

  const activeBans = bannedIps.filter((b) => b.status === 'active');
  const whitelisted = bannedIps.filter((b) => b.is_whitelisted);
  const activeMaps = unmaskingMaps.filter((m) => m.status === 'ACTIVE');

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <ShieldOff size={14} className="text-locc-critical" />
        <p className="font-body text-[11px] font-bold text-slate-200">البنية الأمنية المتقدمة — Fail2ban + DLP + Encrypted Maps</p>
      </div>

      {/* Sub-panel tabs */}
      <div className="flex gap-1">
        {[
          { id: 'fail2ban' as const, label: 'Fail2ban + iptables', icon: Ban },
          { id: 'dlp' as const, label: 'تجهيل النصوص القانونية', icon: FileLock2 },
          { id: 'maps' as const, label: 'خرائط فك التجهيل', icon: Eraser },
          { id: 'vault' as const, label: 'Vault + تدوير المفاتيح', icon: ServerCog },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubPanel(tab.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-body text-[10px] font-bold border transition-all ${
                activeSubPanel === tab.id
                  ? 'bg-locc-critical-dim text-locc-critical border-locc-critical/40'
                  : 'bg-locc-bg text-slate-400 border-locc-border hover:border-locc-border/60'
              }`}
            >
              <Icon size={11} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ===== Fail2ban Panel ===== */}
      {activeSubPanel === 'fail2ban' && (
        <div className="bg-locc-bg rounded-lg p-3 border border-locc-border space-y-3">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-2">
            <KpiCard icon={Ban} label="IPs محظورة نشطة" value={activeBans.length} color="critical" sub="iptables REJECT" />
            <KpiCard icon={ShieldCheck} label="قائمة بيضاء" value={whitelisted.length} color="success" sub="ignoreip" />
            <KpiCard icon={Activity} label="محاولات (10د)" value={f2bEvents.length} color="warning" sub="فشل تسجيل دخول" />
          </div>

          {/* iptables preview */}
          <div className="bg-midnight rounded-lg p-2 border border-locc-border">
            <p className="font-mono text-[9px] text-locc-cyan mb-1">$ sudo iptables -L f2b-nginx-deeplink -v -n</p>
            <div className="font-mono text-[8px] text-slate-400">
              <p>Chain f2b-nginx-deeplink ({activeBans.length} references)</p>
              <p className="text-slate-600"> pkts bytes target     prot opt in out source destination</p>
              {activeBans.slice(0, 4).map((ban) => (
                <p key={ban.id} className="text-locc-critical">
                  {`  ${ban.failed_attempts * 4}  ${ban.failed_attempts * 240} REJECT     tcp  --  * *  ${ban.ip_address.padEnd(18)} 0.0.0.0/0           tcp dpts:80,443 reject-with icmp-port-unreachable`}
                </p>
              ))}
            </div>
          </div>

          {/* Unban / Whitelist controls */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={unbanIp}
                onChange={(e) => setUnbanIp(e.target.value)}
                placeholder="IP لإلغاء الحظر"
                className="flex-1 px-2 py-1.5 bg-locc-surface border border-locc-border rounded-lg font-mono text-[10px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-locc-success/40"
              />
              <button onClick={handleUnban} disabled={!unbanIp.trim()} className="px-2 py-1.5 rounded-lg bg-locc-success-dim text-locc-success border border-locc-success/40 font-body text-[9px] font-bold hover:bg-locc-success hover:text-midnight transition-colors disabled:opacity-50 flex-shrink-0">
                unbanip
              </button>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={whitelistIp}
                onChange={(e) => setWhitelistIp(e.target.value)}
                placeholder="IP للقائمة البيضاء"
                className="flex-1 px-2 py-1.5 bg-locc-surface border border-locc-border rounded-lg font-mono text-[10px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-locc-cyan/40"
              />
              <button onClick={handleWhitelist} disabled={!whitelistIp.trim()} className="px-2 py-1.5 rounded-lg bg-locc-cyan-dim text-locc-cyan border border-locc-cyan/40 font-body text-[9px] font-bold hover:bg-locc-cyan hover:text-midnight transition-colors disabled:opacity-50 flex-shrink-0">
                ignoreip
              </button>
            </div>
          </div>

          {/* Recent failed attempts */}
          <div>
            <p className="font-body text-[10px] font-bold text-slate-400 mb-1">سجل المحاولات الفاشلة — Nginx Access Log</p>
            {f2bEvents.length > 0 ? (
              <div className="space-y-0.5 max-h-32 overflow-y-auto">
                {f2bEvents.map((evt) => (
                  <div key={evt.id} className="flex items-center gap-2 text-[9px] font-body py-1 border-b border-locc-border/30">
                    <span className={`font-mono font-bold ${evt.http_status === 403 ? 'text-locc-critical' : evt.http_status === 401 ? 'text-locc-warning' : 'text-locc-cyan'}`}>{evt.http_status}</span>
                    <span className="font-mono text-slate-400">{evt.ip_address}</span>
                    <span className="font-mono text-slate-600 truncate flex-1" dir="ltr">{evt.token_snippet || '—'}</span>
                    <span className="font-mono text-slate-500">{formatDate(evt.created_at)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-body text-[9px] text-slate-500 text-center py-2">لا توجد محاولات فاشلة مسجلة</p>
            )}
          </div>
        </div>
      )}

      {/* ===== DLP Panel ===== */}
      {activeSubPanel === 'dlp' && (
        <div className="bg-locc-bg rounded-lg p-3 border border-locc-border space-y-3">
          <div className="bg-locc-cyan-dim border border-locc-cyan/20 rounded-lg p-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { icon: Fingerprint, label: 'محددات سياقية', desc: 'Contextual Anchors' },
                { icon: Lock, label: 'Regex عربي', desc: 'Structured Patterns' },
                { icon: FileLock2, label: 'NER Model', desc: 'AraBERT/CamelBERT' },
                { icon: KeyRound, label: 'AES-256-GCM', desc: 'Envelope Encryption' },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex items-center gap-1.5">
                    <Icon size={11} className="text-locc-cyan" />
                    <div>
                      <p className="font-mono text-[9px] font-bold text-slate-200">{item.label}</p>
                      <p className="font-body text-[8px] text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pipeline */}
          <div className="bg-locc-surface rounded-lg p-2 border border-locc-border">
            <div className="flex items-center gap-1 flex-wrap">
              {['تفكيك صرفي', 'كشف نمطي', 'محددات سياقية', 'نموذج NER', 'استبدال + تشفير'].map((step, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded bg-locc-bg font-body text-[8px] text-slate-400 border border-locc-border">{step}</span>
                  {i < 4 && <ChevronLeft size={8} className="text-slate-600" />}
                </div>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="space-y-2">
            <input
              type="text"
              value={dlpDocId}
              onChange={(e) => setDlpDocId(e.target.value)}
              placeholder="معرف المستند (doc_id)..."
              className="w-full px-2 py-1.5 bg-locc-surface border border-locc-border rounded-lg font-mono text-[10px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-locc-cyan/40"
            />
            <textarea
              value={dlpInput}
              onChange={(e) => setDlpInput(e.target.value)}
              placeholder="الصق النص القانوني هنا... (مثل: بناءً على طلب السيد / أحمد محمود المقيم في مدينة نصر، والمدعي في الدعوى رقم 4582 لسنة 2022 تجاري والمقيدة ضد / شركة الأمل للتوريدات السجل التجاري رقم 99821، نطالب بدفع مبلغ 150000 جنيه)"
              rows={4}
              className="w-full px-2 py-1.5 bg-locc-surface border border-locc-border rounded-lg font-body text-[11px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-locc-cyan/40 resize-none"
            />
            <button
              onClick={handleAnonymize}
              disabled={dlpProcessing || !dlpInput.trim() || !dlpDocId.trim()}
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg bg-locc-cyan-dim text-locc-cyan border border-locc-cyan/40 font-body text-[11px] font-bold hover:bg-locc-cyan hover:text-midnight transition-colors disabled:opacity-50"
            >
              {dlpProcessing ? <Loader2 size={12} className="animate-spin" /> : <FileLock2 size={12} />}
              تجهيل + تشفير غلافي
            </button>
          </div>

          {/* Result */}
          {dlpResult && (
            <div className="bg-locc-surface rounded-lg p-3 border border-locc-success/30">
              <p className="font-body text-[10px] font-bold text-locc-success mb-2 flex items-center gap-1">
                <CheckCircle2 size={12} /> النص المجهل — {dlpEntities.length} كيان تم استبداله
              </p>
              <p className="font-body text-[11px] text-slate-300 leading-relaxed bg-midnight p-2 rounded border border-locc-border mb-2">{dlpResult}</p>
              {dlpEntities.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {dlpEntities.map((e, i) => {
                    const meta = DLP_ENTITY_LABELS[e.type as LaaSDlpEntityType] || { label: e.type, placeholder: e.placeholder };
                    return (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-locc-bg border border-locc-border font-mono text-[9px] text-locc-cyan">
                        {meta.label}: {e.placeholder}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* DLP Audit Log */}
          {dlpLogs.length > 0 && (
            <div>
              <p className="font-body text-[10px] font-bold text-slate-400 mb-1">سجل عمليات التجهيل</p>
              <div className="space-y-0.5 max-h-24 overflow-y-auto">
                {dlpLogs.map((log) => {
                  const meta = DLP_ENTITY_LABELS[log.entity_type as LaaSDlpEntityType] || { label: log.entity_type, placeholder: '' };
                  return (
                    <div key={log.id} className="flex items-center gap-2 text-[9px] font-body py-1 border-b border-locc-border/30">
                      <span className="font-mono text-slate-600">{formatDate(log.created_at)}</span>
                      <span className="text-locc-cyan font-bold">{meta.label}</span>
                      <span className="text-slate-400">×{log.entity_count}</span>
                      <span className="text-slate-500 flex-1 truncate">{log.doc_id}</span>
                      <span className="font-mono text-slate-600">{log.anonymization_method}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== Unmasking Maps Panel ===== */}
      {activeSubPanel === 'maps' && (
        <div className="bg-locc-bg rounded-lg p-3 border border-locc-border space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <KpiCard icon={KeyRound} label="خرائط نشطة" value={activeMaps.length} color="success" sub="AES-256-GCM" />
            <KpiCard icon={Lock} label="مشفرة غلافياً" value={unmaskingMaps.length} color="cyan" sub="Envelope Encryption" />
            <KpiCard icon={Eraser} label="مُتلفة" value={unmaskingMaps.filter(m => m.status === 'PURGED').length} color="critical" sub="Cryptographic Shredding" />
          </div>

          {/* Security matrix */}
          <div className="bg-locc-cyan-dim border border-locc-cyan/20 rounded-lg p-2">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'AEAD', desc: 'AES-256-GCM', icon: Lock },
                { label: 'Key Isolation', desc: 'KEK in Vault', icon: KeyRound },
                { label: 'Blind Index', desc: 'HMAC-SHA256', icon: Fingerprint },
                { label: 'Auto-Purge', desc: 'pg_cron TTL', icon: Eraser },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex items-center gap-1.5">
                    <Icon size={11} className="text-locc-cyan" />
                    <div>
                      <p className="font-mono text-[9px] font-bold text-slate-200">{item.label}</p>
                      <p className="font-body text-[8px] text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Purge button */}
          <button
            onClick={handlePurge}
            className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg bg-locc-critical-dim text-locc-critical border border-locc-critical/40 font-body text-[11px] font-bold hover:bg-locc-critical hover:text-white transition-colors"
          >
            <Eraser size={12} /> تنفيذ الإتلاف الآمن — Secure Purge (Overwrite + Delete)
          </button>

          {/* Maps list */}
          {loading ? (
            <div className="flex items-center justify-center py-3"><Loader2 size={14} className="text-locc-cyan animate-spin" /></div>
          ) : unmaskingMaps.length > 0 ? (
            <div className="space-y-1.5">
              {unmaskingMaps.map((map) => {
                const timeLeft = map.expires_at ? Math.max(0, Math.round((new Date(map.expires_at).getTime() - Date.now()) / 3600000)) : 0;
                const statusColor = map.status === 'ACTIVE' ? 'text-locc-success' : map.status === 'PURGED' ? 'text-locc-critical' : 'text-locc-warning';
                return (
                  <div key={map.id} className="bg-locc-surface rounded-lg p-2.5 border border-locc-border">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <KeyRound size={11} className="text-locc-cyan" />
                        <span className="font-mono text-[9px] text-slate-300" dir="ltr">{map.doc_blind_index.slice(0, 24)}...</span>
                      </div>
                      <span className={`font-body text-[9px] font-bold ${statusColor}`}>{map.status}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[9px] font-body text-slate-500">
                      <span className="flex items-center gap-1"><Lock size={9} /> DEK: {Array.isArray(map.encrypted_dek) ? `${map.encrypted_dek.length}B` : '—'}</span>
                      <span className="flex items-center gap-1"><FileLock2 size={9} /> Payload: {Array.isArray(map.encrypted_map_payload) ? `${map.encrypted_map_payload.length}B` : '—'}</span>
                      {map.status === 'ACTIVE' && <span className={`font-bold ${timeLeft < 24 ? 'text-locc-warning' : 'text-locc-success'}`}>TTL: {timeLeft}س</span>}
                      {map.purged_at && <span className="text-locc-critical">مُتلفة: {formatDate(map.purged_at)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="font-body text-[10px] text-slate-500 text-center py-3">لا توجد خرائط تخزين — جههل نصاً من تبويب DLP</p>
          )}
        </div>
      )}

      {/* ===== Vault & Key Rotation Panel ===== */}
      {activeSubPanel === 'vault' && (
        <div className="bg-locc-bg rounded-lg p-3 border border-locc-border space-y-3">
          {/* Vault architecture banner */}
          <div className="bg-locc-cyan-dim border border-locc-cyan/20 rounded-lg p-2.5">
            <div className="flex items-center gap-2 mb-2">
              <ServerCog size={13} className="text-locc-cyan" />
              <p className="font-mono text-[10px] font-bold text-slate-200">HashiCorp Vault — Transit Secrets Engine (Encryption as a Service)</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { icon: KeyRound, label: 'AppRole Auth', desc: 'role_id + secret_id' },
                { icon: Lock, label: 'KEK in Vault', desc: 'لا يغادر الخزانة' },
                { icon: RefreshCw, label: 'Key Rotation', desc: 'v1 → v2 → v3...' },
                { icon: History, label: 'Decrypt Archive', desc: 'إصدارات قديمة محتفظة' },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex items-center gap-1.5">
                    <Icon size={11} className="text-locc-cyan" />
                    <div>
                      <p className="font-mono text-[9px] font-bold text-slate-200">{item.label}</p>
                      <p className="font-body text-[8px] text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Key version KPIs */}
          <div className="grid grid-cols-3 gap-2">
            <KpiCard icon={ServerCog} label="إصدارات المفاتيح" value={keyVersions.length} color="cyan" sub="KEK versions" />
            <KpiCard icon={RefreshCw} label="الإصدار النشط" value={keyVersions.find(v => v.is_encryption_active)?.version || 1} color="success" sub="encryption active" />
            <KpiCard icon={History} label="محتفظة لفك التشفير" value={keyVersions.filter(v => v.can_decrypt).length} color="warning" sub="can decrypt" />
          </div>

          {/* Rotate key button */}
          <button
            onClick={handleRotateKey}
            disabled={vaultProcessing}
            className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg bg-locc-warning-dim text-locc-warning border border-locc-warning/40 font-body text-[11px] font-bold hover:bg-locc-warning hover:text-midnight transition-colors disabled:opacity-50"
          >
            {vaultProcessing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            تدوير المفتاح الرئيسي — rotate_key()
          </button>

          {/* Rewrap control */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={rewrapDocId}
                onChange={(e) => setRewrapDocId(e.target.value)}
                placeholder="معرف المستند لإعادة التشفير (doc_id)..."
                className="flex-1 px-2 py-1.5 bg-locc-surface border border-locc-border rounded-lg font-mono text-[10px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-locc-cyan/40"
              />
              <button onClick={handleRewrap} disabled={vaultProcessing || !rewrapDocId.trim()} className="px-2.5 py-1.5 rounded-lg bg-locc-cyan-dim text-locc-cyan border border-locc-cyan/40 font-body text-[9px] font-bold hover:bg-locc-cyan hover:text-midnight transition-colors disabled:opacity-50 flex-shrink-0 flex items-center gap-1">
                <RefreshCw size={10} /> rewrap
              </button>
            </div>
          </div>

          {/* Vault message */}
          {vaultMessage && (
            <div className="bg-locc-surface rounded-lg p-2.5 border border-locc-cyan/30">
              <p className="font-body text-[10px] text-locc-cyan flex items-center gap-1.5">
                <CheckCircle2 size={12} /> {vaultMessage}
              </p>
            </div>
          )}

          {/* Key version timeline */}
          {keyVersions.length > 0 && (
            <div>
              <p className="font-body text-[10px] font-bold text-slate-400 mb-1.5">سجل إصدارات المفتاح — Key Version History</p>
              <div className="space-y-1">
                {keyVersions.map((kv) => (
                  <div key={kv.id} className="flex items-center gap-2 bg-locc-surface rounded-lg p-2 border border-locc-border">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-[11px] font-bold ${kv.is_encryption_active ? 'bg-locc-success-dim text-locc-success' : 'bg-locc-bg text-slate-500'}`}>
                      v{kv.version}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {kv.is_encryption_active && <span className="px-1.5 py-0.5 rounded bg-locc-success-dim text-locc-success font-body text-[8px] font-bold">تشفير نشط</span>}
                        {kv.can_decrypt && <span className="px-1.5 py-0.5 rounded bg-locc-warning-dim text-locc-warning font-body text-[8px] font-bold">فك تشفير</span>}
                      </div>
                      <p className="font-mono text-[8px] text-slate-500 mt-0.5">{formatDate(kv.rotated_at)} — {kv.rotated_by}</p>
                    </div>
                    {kv.is_encryption_active ? <KeyRound size={12} className="text-locc-success" /> : <History size={12} className="text-slate-600" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rotation audit log */}
          {rotationAudit.length > 0 && (
            <div>
              <p className="font-body text-[10px] font-bold text-slate-400 mb-1">سجل عمليات المفاتيح — Key Operations Audit</p>
              <div className="space-y-0.5 max-h-32 overflow-y-auto">
                {rotationAudit.map((audit) => {
                  const meta = KEY_OP_LABELS[audit.operation] || { label: audit.operation, color: 'text-slate-400' };
                  return (
                    <div key={audit.id} className="flex items-center gap-2 text-[9px] font-body py-1 border-b border-locc-border/30">
                      <span className={`font-bold ${meta.color}`}>{meta.label}</span>
                      <span className="font-mono text-slate-500">v{audit.version || '—'}</span>
                      {audit.ciphertext_preview && <span className="font-mono text-slate-600 truncate flex-1" dir="ltr">{audit.ciphertext_preview}...</span>}
                      <span className="font-mono text-slate-600">{formatDate(audit.created_at)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* RLS isolation notice */}
          <div className="bg-locc-critical-dim border border-locc-critical/20 rounded-lg p-2">
            <div className="flex items-center gap-1.5 mb-1">
              <ShieldOff size={11} className="text-locc-critical" />
              <p className="font-mono text-[9px] font-bold text-locc-critical">Row-Level Security — FORCE RLS</p>
            </div>
            <p className="font-body text-[9px] text-slate-400 leading-relaxed">
              سياسات RLS مُفعلة بقوة على جدول خرائط فك التجهيل. المحللون والمستخدمون غير المصرح لهم يرون الجدول فارغاً تماماً (0 صفوف). الوصول حصري لمستخدم الخدمة <span className="font-mono text-locc-cyan">unmasking_app_user</span>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
