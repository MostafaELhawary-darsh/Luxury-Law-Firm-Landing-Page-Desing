import { useState, useEffect, useCallback } from 'react';
import { Home, Building2, BookCopy, Calculator, ShieldCheck } from 'lucide-react';
import type { FinanceModule } from '@/lib/financeTypes';
import { useVoice } from '@/lib/voiceContext';
import type { FinanceModuleId, PendingAddCommand } from '@/lib/voiceTypes';
import FinanceDashboard from './FinanceDashboard';
import TrustAccounting from './TrustAccounting';
import TimeBilling from './TimeBilling';
import Disbursements from './Disbursements';
import PartnerCompensation from './PartnerCompensation';
import ARCreditControl from './ARCreditControl';
import AccountingCycle from './AccountingCycle';
import CapitalReserve from './CapitalReserve';

interface FinancePageProps {
  onBackToSite: () => void;
  pendingAdd: PendingAddCommand | null;
  consumePendingAdd: () => PendingAddCommand | null;
}

const moduleConfig: { id: FinanceModule; label: string; icon: typeof Building2 }[] = [
  { id: 'dashboard', label: 'لوحة القيادة', icon: Building2 },
  { id: 'trust', label: 'حسابات الأمانات', icon: Building2 },
  { id: 'billing', label: 'تتبع الساعات والفوترة', icon: Building2 },
  { id: 'disbursements', label: 'مصاريف القضايا', icon: Building2 },
  { id: 'partners', label: 'أنظمة توزيع الأرباح', icon: Calculator } as { id: FinanceModule; label: string; icon: typeof Building2 },
  { id: 'ar', label: 'التحصيل والائتمان', icon: Building2 },
  { id: 'cycle', label: 'دورة القيود المحاسبية', icon: BookCopy } as { id: FinanceModule; label: string; icon: typeof Building2 },
  { id: 'reserve', label: 'الاحتياطي الرأسمالي', icon: ShieldCheck } as { id: FinanceModule; label: string; icon: typeof Building2 },
];

export default function FinancePage({ onBackToSite, pendingAdd, consumePendingAdd }: FinancePageProps) {
  const [activeModule, setActiveModule] = useState<FinanceModule>('dashboard');
  const { registerFinanceModuleNav } = useVoice();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeModule]);

  const handleFinanceModuleNav = useCallback((m: FinanceModuleId) => {
    setActiveModule(m as FinanceModule);
  }, []);

  useEffect(() => {
    registerFinanceModuleNav(handleFinanceModuleNav);
  }, [registerFinanceModuleNav, handleFinanceModuleNav]);

  useEffect(() => {
    if (pendingAdd) {
      consumePendingAdd();
    }
  }, [pendingAdd, consumePendingAdd]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToSite}
            className="flex items-center gap-2 text-ink/60 hover:text-gold transition-colors font-body text-sm"
          >
            <Home size={16} />
            العودة للموقع
          </button>
          <span className="text-ink/20">|</span>
          <span className="font-heading font-bold text-midnight text-sm">
            الإدارة المالية — مؤسسة الهواري
          </span>
        </div>
        <div className="hidden md:flex items-center gap-2 text-ink/40 font-body text-xs">
          <Building2 size={14} />
          CFO / Finance Department
        </div>
      </div>

      {/* Org chart navigation */}
      <div className="bg-midnight py-6 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Top node */}
          <div className="flex justify-center mb-4">
            <div className="bg-gold/20 border border-gold/40 rounded-lg px-6 py-2.5 text-center">
              <p className="font-heading font-bold text-gold text-sm">الإدارة المالية (CFO / Finance)</p>
            </div>
          </div>

          {/* Connecting line */}
          <div className="flex justify-center mb-2">
            <div className="w-px h-6 bg-gold/30" />
          </div>

          {/* Module cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-8 gap-3">
            {moduleConfig.filter((m) => m.id !== 'dashboard').map((mod) => (
              <button
                key={mod.id}
                onClick={() => setActiveModule(mod.id)}
                className={`rounded-lg px-4 py-3 text-center transition-all duration-300 border ${
                  activeModule === mod.id
                    ? 'bg-gold border-gold text-midnight'
                    : 'bg-midnight-light border-gold/20 text-cream/70 hover:border-gold/40 hover:text-cream'
                }`}
              >
                <p className="font-body text-xs font-bold">{mod.label}</p>
              </button>
            ))}
          </div>

          {/* Dashboard button */}
          <div className="flex justify-center mt-3">
            <button
              onClick={() => setActiveModule('dashboard')}
              className={`rounded-lg px-6 py-2 text-center transition-all duration-300 border ${
                activeModule === 'dashboard'
                  ? 'bg-gold border-gold text-midnight'
                  : 'bg-midnight-light border-gold/20 text-cream/70 hover:border-gold/40 hover:text-cream'
              }`}
            >
              <p className="font-body text-xs font-bold">لوحة القيادة المالية</p>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        {activeModule === 'dashboard' && <FinanceDashboard onNavigate={(m) => setActiveModule(m as FinanceModule)} />}
        {activeModule === 'trust' && <TrustAccounting />}
        {activeModule === 'billing' && <TimeBilling />}
        {activeModule === 'disbursements' && <Disbursements />}
        {activeModule === 'partners' && <PartnerCompensation />}
        {activeModule === 'ar' && <ARCreditControl />}
        {activeModule === 'cycle' && <AccountingCycle />}
        {activeModule === 'reserve' && <CapitalReserve />}
      </div>
    </div>
  );
}
