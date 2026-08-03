import { useState, useEffect, useCallback, useRef } from 'react';
import { Home, Building2, Calendar, Users, FileText, CheckSquare, Briefcase, UserCog, Banknote, Video, Radar, Brain, Command, Wallet, Shield, FileStack, KanbanSquare, Mail, ShieldCheck, Gavel, Landmark, Building, Heart, Scale, HardHat, MessageSquareWarning, Award, Lightbulb, Copyright, PenTool, Newspaper, Cpu, FileSignature, Globe, Store, Ship, TrendingUp, AlertTriangle, Split, Lock, Plane, Receipt, Leaf, Zap, ShoppingCart, Trophy, GraduationCap, School, MapPin, Truck, Network, Search, BookOpen, ScanText, FolderArchive, Users as UsersIcon, Database, AudioWaveform, HeartPulse, Mic, Stethoscope, Radio, Train, Calculator, Hotel, Factory, Megaphone, Car, Cog, FlaskConical, ShoppingBag, Library, Wrench, Mountain, Grid2x2, Wheat, ShieldAlert, Fingerprint } from 'lucide-react';
import type { FirmModule } from '@/lib/firmTypes';
import { useVoice } from '@/lib/voiceContext';
import type { FirmModuleId, PendingAddCommand } from '@/lib/voiceTypes';
import JudicialAgenda from './JudicialAgenda';
import ClientManagement from './ClientManagement';
import PowerOfAttorney from './PowerOfAttorney';
import TaskManagement from './TaskManagement';
import SmartCaseCore from './SmartCaseCore';
import StaffManagement from './StaffManagement';
import BankingManagement from './BankingManagement';
import MeetingManagement from './MeetingManagement';
import LegalTracker from './LegalTracker';
import LegalTalent from './LegalTalent';
import LawyersCockpit from './LawyersCockpit';
import LaaSPlatform from './LaaSPlatform';
import PermissionsManagement from './PermissionsManagement';
import DocumentManagement from './DocumentManagement';
import InternalTaskEngine from './InternalTaskEngine';
import OmniAgent from './OmniAgent';
import SovereignMail from './SovereignMail';
import PredictiveRiskEngine from './PredictiveRiskEngine';
import CivilCommercial from './CivilCommercial';
import AdministrativeCourt from './AdministrativeCourt';
import StateCouncil from './StateCouncil';
import EconomicCourt from './EconomicCourt';
import FamilyCourt from './FamilyCourt';
import LaborCourt from './LaborCourt';
import Arbitration from './Arbitration';
import DisputeCommittees from './DisputeCommittees';
import ExecutionEngine from './ExecutionEngine';
import TrademarkEngine from './TrademarkEngine';
import PatentEngine from './PatentEngine';
import CopyrightEngine from './CopyrightEngine';
import CyberSecurityEngine from './CyberSecurityEngine';
import CyberCrimeEngine from './CyberCrimeEngine';
import DigitalSignatureEngine from './DigitalSignatureEngine';
import DigitalPublishingEngine from './DigitalPublishingEngine';
import DigitalAssetEngine from './DigitalAssetEngine';
import CommercialContractEngine from './CommercialContractEngine';
import MergerAcquisitionEngine from './MergerAcquisitionEngine';
import FDIEngine from './FDIEngine';
import RealEstateEngine from './RealEstateEngine';
import DistributionEngine from './DistributionEngine';
import MaritimeCommerceEngine from './MaritimeCommerceEngine';
import StrategicFinanceEngine from './StrategicFinanceEngine';
import AntitrustEngine from './AntitrustEngine';
import InheritanceEngine from './InheritanceEngine';
import EndowmentEngine from './EndowmentEngine';
import CivilContractsEngine from './CivilContractsEngine';
import CompensationEngine from './CompensationEngine';
import JointPropertyEngine from './JointPropertyEngine';
import OralContractsEngine from './OralContractsEngine';
import RealEstateSecurityEngine from './RealEstateSecurityEngine';
import ConsularAffairsEngine from './ConsularAffairsEngine';
import CustomsTaxEngine from './CustomsTaxEngine';
import EnvironmentalEngine from './EnvironmentalEngine';
import EnergyResourcesEngine from './EnergyResourcesEngine';
import ConsumerProtectionEngine from './ConsumerProtectionEngine';
import SportsEngine from './SportsEngine';
import AcademicEngine from './AcademicEngine';
import PreUniversityEngine from './PreUniversityEngine';
import LocalAdministrationEngine from './LocalAdministrationEngine';
import TransportLogisticsEngine from './TransportLogisticsEngine';
import AdministrativeGovernanceEngine from './AdministrativeGovernanceEngine';
import InternalInvestigationsEngine from './InternalInvestigationsEngine';
import KnowledgeManagementEngine from './KnowledgeManagementEngine';
import DocumentRecognitionEngine from './DocumentRecognitionEngine';
import BulkArchiverEngine from './BulkArchiverEngine';
import BoardroomGovernanceEngine from './BoardroomGovernanceEngine';
import DocumentStudioEngine from './DocumentStudioEngine';
import SovereignStorageEngine from './SovereignStorageEngine';
import AudioTranscriptionEngine from './AudioTranscriptionEngine';
import WellnessEngine from './WellnessEngine';
import SyndicatesEngine from './SyndicatesEngine';
import MedicalInstitutionsEngine from './MedicalInstitutionsEngine';
import EngineeringConsultingEngine from './EngineeringConsultingEngine';
import EconomicInvestmentEngine from './EconomicInvestmentEngine';
import EmbassiesConsularEngine from './EmbassiesConsularEngine';
import CrossBorderContractsEngine from './CrossBorderContractsEngine';
import InternationalOrganizationsEngine from './InternationalOrganizationsEngine';
import NGOsCivilSocietyEngine from './NGOsCivilSocietyEngine';
import SocialInsuranceEngine from './SocialInsuranceEngine';
import LaborRelationsEngine from './LaborRelationsEngine';
import PressMediaEngine from './PressMediaEngine';
import BankingFinanceEngine from './BankingFinanceEngine';
import InHouseLegalEngine from './InHouseLegalEngine';
import HumanResourcesEngine from './HumanResourcesEngine';
import CompoundHOAEngine from './CompoundHOAEngine';
import SportsClubsEngine from './SportsClubsEngine';
import FamilyWelfareEngine from './FamilyWelfareEngine';
import MediaProductionEngine from './MediaProductionEngine';
import TelecomITDataEngine from './TelecomITDataEngine';
import RealEstateAssetEngine from './RealEstateAssetEngine';
import RailwaysMetroEngine from './RailwaysMetroEngine';
import LegalAccountingEngine from './LegalAccountingEngine';
import TourismHotelsEngine from './TourismHotelsEngine';
import IndustrialSectorEngine from './IndustrialSectorEngine';
import WholesaleRetailEngine from './WholesaleRetailEngine';
import PrivateSecurityEngine from './PrivateSecurityEngine';
import ImportExportEngine from './ImportExportEngine';
import HealthSafetyEngine from './HealthSafetyEngine';
import MarketingAdsEngine from './MarketingAdsEngine';
import AutomotiveTradeEngine from './AutomotiveTradeEngine';
import AutomotiveManufacturingEngine from './AutomotiveManufacturingEngine';
import FertilizersChemicalsEngine from './FertilizersChemicalsEngine';
import ForeignResidencyEngine from './ForeignResidencyEngine';
import CapitalMarketsEngine from './CapitalMarketsEngine';
import ShoppingMallEngine from './ShoppingMallEngine';
import LibraryArchiveEngine from './LibraryArchiveEngine';
import MaintenanceWarrantyEngine from './MaintenanceWarrantyEngine';
import IntegrationSynergyEngine from './IntegrationSynergyEngine';
import QuarriesMiningEngine from './QuarriesMiningEngine';
import CeramicsPorcelainEngine from './CeramicsPorcelainEngine';
import ArbitrationHubEngine from './ArbitrationHubEngine';
import FoodSecurityEngine from './FoodSecurityEngine';
import IoTBridgeEngine from './IoTBridgeEngine';
import DisasterRecoveryEngine from './DisasterRecoveryEngine';
import BiometricGatewayEngine from './BiometricGatewayEngine';

interface FirmPageProps {
  onBackToSite: () => void;
  pendingAdd: PendingAddCommand | null;
  consumePendingAdd: () => PendingAddCommand | null;
}

const moduleConfig: { id: FirmModule; label: string; icon: typeof Building2 }[] = [
  { id: 'agenda', label: 'الأجندة القضائية', icon: Calendar },
  { id: 'smart-case', label: 'نواة القضية الذكية (M10 + SCM)', icon: Brain },
  { id: 'clients', label: 'العملاء والموكلون', icon: Users },
  { id: 'poa', label: 'التوكيلات', icon: FileText },
  { id: 'tasks', label: 'المهام والأعمال', icon: CheckSquare },
  { id: 'staff', label: 'المستشارون والموظفون', icon: UserCog },
  { id: 'banking', label: 'الحسابات والشيكات', icon: Banknote },
  { id: 'meetings', label: 'الاجتماعات الافتراضية', icon: Video },
  { id: 'tracker', label: 'لوحة متابعة العميل', icon: Radar },
  { id: 'talent', label: 'هندسة العقول القانونية', icon: Brain },
  { id: 'cockpit', label: 'قمرة قيادة المحامي', icon: Command },
  { id: 'laas', label: 'الخدمة كاشتراك', icon: Wallet },
  { id: 'permissions', label: 'الصلاحيات', icon: Shield },
  { id: 'documents', label: 'المستندات والامتثال', icon: FileStack },
  { id: 'internal-tasks', label: 'محرك المهام (M51)', icon: KanbanSquare },
  { id: 'omni-agent', label: 'الوكيل الذكي (M92)', icon: Brain },
  { id: 'sovereign-mail', label: 'البريد السيادي (M52)', icon: Mail },
  { id: 'risk-engine', label: 'التحليل التنبؤي (M50)', icon: ShieldCheck },
  { id: 'civil-commercial', label: 'القضاء المدني والتجاري (M1)', icon: Gavel },
  { id: 'admin-court', label: 'القضاء الإداري والدستوري (M2)', icon: Landmark },
  { id: 'state-council', label: 'محاكم القضاء الإداري (M3)', icon: Scale },
  { id: 'economic-court', label: 'المحاكم الاقتصادية (M4)', icon: Building },
  { id: 'family-court', label: 'محاكم الأسرة (M5)', icon: Heart },
  { id: 'labor-court', label: 'المحاكم العمالية (M6)', icon: Briefcase },
  { id: 'arbitration', label: 'دوائر التحكيم (M7)', icon: Gavel },
  { id: 'dispute-committees', label: 'لجان فض المنازعات (M8)', icon: MessageSquareWarning },
  { id: 'execution', label: 'التنفيذ القضائي (M9)', icon: Landmark },
  { id: 'trademarks', label: 'العلامات التجارية (M11)', icon: Award },
  { id: 'patents', label: 'براءات الاختراع (M12)', icon: Lightbulb },
  { id: 'copyrights', label: 'حقوق المؤلف (M13)', icon: Copyright },
  { id: 'cyber-security', label: 'الأمن السيبراني (M14)', icon: ShieldCheck },
  { id: 'cyber-crime', label: 'الجرائم الإلكترونية (M15)', icon: Gavel },
  { id: 'digital-signature', label: 'التوقيع الإلكتروني (M16)', icon: PenTool },
  { id: 'digital-publishing', label: 'النشر الرقمي (M17)', icon: Newspaper },
  { id: 'digital-assets', label: 'الأصول الرقمية (M18)', icon: Cpu },
  { id: 'commercial-contracts', label: 'العقود التجارية (M19)', icon: FileSignature },
  { id: 'merger-acquisition', label: 'الاستحواذ والاندماج (M20)', icon: Building2 },
  { id: 'fdi', label: 'الاستثمار الأجنبي (M21)', icon: Globe },
  { id: 'real-estate', label: 'العقارات (M22)', icon: Home },
  { id: 'distribution', label: 'التوزيع والوكالات (M23)', icon: Store },
  { id: 'maritime-commerce', label: 'التجارة البحرية (M24)', icon: Ship },
  { id: 'strategic-finance', label: 'الشركات والعقود التجارية (M60)', icon: TrendingUp },
  { id: 'antitrust', label: 'الامتثال ومنع الاحتكار (M26)', icon: Scale },
  { id: 'inheritance', label: 'التركات والمواريث (M27)', icon: Users },
  { id: 'endowment', label: 'الأوقاف والحراسة (M28)', icon: Landmark },
  { id: 'civil-contracts', label: 'العقود المدنية (M29)', icon: FileText },
  { id: 'compensation', label: 'التعويضات (M30)', icon: AlertTriangle },
  { id: 'joint-property', label: 'الملكية الشائعة (M31)', icon: Split },
  { id: 'oral-contracts', label: 'العقود الشفهية (M32)', icon: Mic },
  { id: 'real-estate-security', label: 'الضمانات العينية (M33)', icon: Lock },
  { id: 'consular-affairs', label: 'الشؤون القنصلية (M34)', icon: Plane },
  { id: 'customs-tax', label: 'الجمارك والضرائب (M35)', icon: Receipt },
  { id: 'environmental', label: 'البيئة والاستدامة (M36)', icon: Leaf },
  { id: 'energy-resources', label: 'الطاقة والموارد (M37)', icon: Zap },
  { id: 'consumer-protection', label: 'حماية المستهلك (M38)', icon: ShoppingCart },
  { id: 'sports', label: 'الرياضة والاتحادات (M58)', icon: Trophy },
  { id: 'academic', label: 'التعليم العالي (M61)', icon: GraduationCap },
  { id: 'pre-university', label: 'التعليم قبل الجامعي (M63)', icon: School },
  { id: 'local-administration', label: 'الإدارة المحلية (M62)', icon: MapPin },
  { id: 'transport-logistics', label: 'النقل واللوجستيات (M43)', icon: Truck },
  { id: 'administrative-governance', label: 'العقود الإدارية والمشتريات (M59)', icon: Network },
  { id: 'internal-investigations', label: 'التحقيقات الداخلية (M45)', icon: Search },
  { id: 'knowledge-management', label: 'إدارة المعرفة (M46)', icon: BookOpen },
  { id: 'document-recognition', label: 'التعرف الذكي (M47)', icon: ScanText },
  { id: 'bulk-archiver', label: 'الأرشفة الجماعية (M48)', icon: FolderArchive },
  { id: 'boardroom-governance', label: 'مجلس الإدارة (M49)', icon: UsersIcon },
  { id: 'document-studio', label: 'محرر المستندات (M53)', icon: FileText },
  { id: 'sovereign-storage', label: 'التخزين السيادي (M55)', icon: Database },
  { id: 'audio-transcription', label: 'التفريغ الصوتي (M56)', icon: AudioWaveform },
  { id: 'wellness', label: 'الرفاهية المؤسسية (M57)', icon: HeartPulse },
  { id: 'syndicates', label: 'النقابات المهنية (M64)', icon: Users },
  { id: 'medical-institutions', label: 'المؤسسات الطبية (M65)', icon: Stethoscope },
  { id: 'engineering-consulting', label: 'القطاع الهندسي (M66)', icon: HardHat },
  { id: 'economic-investment', label: 'المؤسسات الاقتصادية (M67)', icon: Building2 },
  { id: 'embassies-consular', label: 'السفارات والقنصلية (M68)', icon: Globe },
  { id: 'cross-border-contracts', label: 'العقود الدولية (M69)', icon: Plane },
  { id: 'intl-organizations', label: 'المنظمات الدولية (M70)', icon: Landmark },
  { id: 'ngos-civil-society', label: 'الجمعيات الأهلية (M71)', icon: Heart },
  { id: 'social-insurance', label: 'التأمينات الاجتماعية (M72)', icon: ShieldCheck },
  { id: 'labor-relations', label: 'علاقات العمل (M73)', icon: Briefcase },
  { id: 'press-media', label: 'المؤسسات الإعلامية (M74)', icon: Newspaper },
  { id: 'banking-finance', label: 'البنوك والمصارف (M75)', icon: Banknote },
  { id: 'inhouse-legal', label: 'الإدارات القانونية (M76)', icon: Building2 },
  { id: 'human-resources', label: 'الموارد البشرية (M77)', icon: Users },
  { id: 'compound-hoa', label: 'التجمعات السكنية (M78)', icon: Home },
  { id: 'sports-clubs', label: 'الأندية الرياضية (M79)', icon: Trophy },
  { id: 'family-welfare', label: 'الأمومة والطفولة (M80)', icon: HeartPulse },
  { id: 'media-production', label: 'الإنتاج الإعلامي (M81)', icon: Video },
  { id: 'telecom-it-data', label: 'الاتصالات وتكنولوجيا المعلومات (M82)', icon: Radio },
  { id: 'real-estate-asset', label: 'إدارة الأصول العقارية (M83)', icon: Building },
  { id: 'railways-metro', label: 'السكك الحديدية والمترو (M84)', icon: Train },
  { id: 'legal-accounting', label: 'المحاسبة القانونية والضرائب (M85)', icon: Calculator },
  { id: 'tourism-hotels', label: 'السياحة والفنادق (M86)', icon: Hotel },
  { id: 'industrial-sector', label: 'القطاع الصناعي (M87)', icon: Factory },
  { id: 'wholesale-retail', label: 'التجارة الداخلية (M88)', icon: Store },
  { id: 'private-security', label: 'الأمن الخاص (M89)', icon: ShieldCheck },
  { id: 'import-export', label: 'الاستيراد والتصدير (M90)', icon: Globe },
  { id: 'health-safety', label: 'الصحة والسلامة (M91)', icon: HardHat },
  { id: 'marketing-ads', label: 'التسويق والإعلان (M93)', icon: Megaphone },
  { id: 'automotive-trade', label: 'تجارة السيارات (M94)', icon: Car },
  { id: 'automotive-manufacturing', label: 'تصنيع السيارات (M95)', icon: Cog },
  { id: 'fertilizers-chemicals', label: 'الأسمدة والكيماويات (M96)', icon: FlaskConical },
  { id: 'foreign-residency', label: 'شؤون الأجانب (M97)', icon: Plane },
  { id: 'capital-markets', label: 'أسواق المال (M98)', icon: TrendingUp },
  { id: 'shopping-mall', label: 'المولات والإيجارات (M99)', icon: ShoppingBag },
  { id: 'library-archive', label: 'المكتبات والأرشيف (M100)', icon: Library },
  { id: 'maintenance-warranty', label: 'الصيانة والضمان (M101)', icon: Wrench },
  { id: 'integration-synergy', label: 'التكامل المؤسسي (M102)', icon: Network },
  { id: 'quarries-mining', label: 'المحاجر والتعدين (M103)', icon: Mountain },
  { id: 'ceramics-porcelain', label: 'السيراميك والخزف (M104)', icon: Grid2x2 },
  { id: 'arbitration-hub', label: 'منصة التحكيم التجاري (M105)', icon: Gavel },
  { id: 'food-security', label: 'الأمن الغذائي وسلاسل الإمداد (M106)', icon: Wheat },
  { id: 'iot-bridge', label: 'إنترنت الأشياء والرقابة (M107)', icon: Cpu },
  { id: 'disaster-recovery', label: 'استمرارية الأعمال والتعافي (M108)', icon: ShieldAlert },
  { id: 'biometric-gateway', label: 'بوابة الهوية البيومترية (M109)', icon: Fingerprint },
];

export default function FirmManagement({ onBackToSite, pendingAdd, consumePendingAdd }: FirmPageProps) {
  const [activeModule, setActiveModule] = useState<FirmModule>('agenda');
  const { registerFirmModuleNav } = useVoice();
  const pendingRef = useRef<PendingAddCommand | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeModule]);

  const handleFirmModuleNav = useCallback((m: FirmModuleId) => {
    setActiveModule(m);
  }, []);

  useEffect(() => {
    registerFirmModuleNav(handleFirmModuleNav);
  }, [registerFirmModuleNav, handleFirmModuleNav]);

  useEffect(() => {
    if (pendingAdd) {
      setActiveModule(pendingAdd.module);
      pendingRef.current = pendingAdd;
      consumePendingAdd();
    }
  }, [pendingAdd, consumePendingAdd]);

  const takePending = () => {
    const p = pendingRef.current;
    pendingRef.current = null;
    return p;
  };

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
            إدارة المؤسسة القانونية — مؤسسة الهواري
          </span>
        </div>
        <div className="hidden md:flex items-center gap-2 text-ink/40 font-body text-xs">
          <Building2 size={14} />
          Firm Management Platform
        </div>
      </div>

      {/* Org chart navigation */}
      <div className="bg-midnight py-6 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center mb-4">
            <div className="bg-gold/20 border border-gold/40 rounded-lg px-6 py-2.5 text-center">
              <p className="font-heading font-bold text-gold text-sm">إدارة المؤسسة القانونية (Firm Management)</p>
            </div>
          </div>

          <div className="flex justify-center mb-2">
            <div className="w-px h-6 bg-gold/30" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {moduleConfig.map((mod) => {
              const Icon = mod.icon;
              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveModule(mod.id)}
                  className={`rounded-lg px-3 py-3 text-center transition-all duration-300 border flex flex-col items-center gap-1.5 ${
                    activeModule === mod.id
                      ? 'bg-gold border-gold text-midnight'
                      : 'bg-midnight-light border-gold/20 text-cream/70 hover:border-gold/40 hover:text-cream'
                  }`}
                >
                  <Icon size={16} />
                  <p className="font-body text-[11px] font-bold leading-tight">{mod.label}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        {activeModule === 'agenda' && <JudicialAgenda voiceAdd={takePending} />}
        {activeModule === 'smart-case' && <SmartCaseCore voiceAdd={takePending} />}
        {activeModule === 'clients' && <ClientManagement voiceAdd={takePending} />}
        {activeModule === 'poa' && <PowerOfAttorney voiceAdd={takePending} />}
        {activeModule === 'tasks' && <TaskManagement voiceAdd={takePending} />}
        {activeModule === 'staff' && <StaffManagement voiceAdd={takePending} />}
        {activeModule === 'banking' && <BankingManagement voiceAdd={takePending} />}
        {activeModule === 'meetings' && <MeetingManagement voiceAdd={takePending} />}
        {activeModule === 'tracker' && <LegalTracker voiceAdd={takePending} />}
        {activeModule === 'talent' && <LegalTalent />}
        {activeModule === 'cockpit' && <LawyersCockpit voiceAdd={takePending} />}
        {activeModule === 'laas' && <LaaSPlatform />}
        {activeModule === 'permissions' && <PermissionsManagement />}
        {activeModule === 'documents' && <DocumentManagement voiceAdd={takePending} />}
        {activeModule === 'internal-tasks' && <InternalTaskEngine voiceAdd={takePending} />}
        {activeModule === 'omni-agent' && <OmniAgent voiceAdd={takePending} />}
        {activeModule === 'sovereign-mail' && <SovereignMail voiceAdd={takePending} />}
        {activeModule === 'risk-engine' && <PredictiveRiskEngine voiceAdd={takePending} />}
        {activeModule === 'civil-commercial' && <CivilCommercial voiceAdd={takePending} />}
        {activeModule === 'admin-court' && <AdministrativeCourt voiceAdd={takePending} />}
        {activeModule === 'state-council' && <StateCouncil voiceAdd={takePending} />}
        {activeModule === 'economic-court' && <EconomicCourt voiceAdd={takePending} />}
        {activeModule === 'family-court' && <FamilyCourt voiceAdd={takePending} />}
        {activeModule === 'labor-court' && <LaborCourt voiceAdd={takePending} />}
        {activeModule === 'arbitration' && <Arbitration voiceAdd={takePending} />}
        {activeModule === 'dispute-committees' && <DisputeCommittees voiceAdd={takePending} />}
        {activeModule === 'execution' && <ExecutionEngine voiceAdd={takePending} />}
        {activeModule === 'trademarks' && <TrademarkEngine voiceAdd={takePending} />}
        {activeModule === 'patents' && <PatentEngine voiceAdd={takePending} />}
        {activeModule === 'copyrights' && <CopyrightEngine voiceAdd={takePending} />}
        {activeModule === 'cyber-security' && <CyberSecurityEngine voiceAdd={takePending} />}
        {activeModule === 'cyber-crime' && <CyberCrimeEngine voiceAdd={takePending} />}
        {activeModule === 'digital-signature' && <DigitalSignatureEngine voiceAdd={takePending} />}
        {activeModule === 'digital-publishing' && <DigitalPublishingEngine voiceAdd={takePending} />}
        {activeModule === 'digital-assets' && <DigitalAssetEngine voiceAdd={takePending} />}
        {activeModule === 'commercial-contracts' && <CommercialContractEngine voiceAdd={takePending} />}
        {activeModule === 'merger-acquisition' && <MergerAcquisitionEngine voiceAdd={takePending} />}
        {activeModule === 'fdi' && <FDIEngine voiceAdd={takePending} />}
        {activeModule === 'real-estate' && <RealEstateEngine voiceAdd={takePending} />}
        {activeModule === 'distribution' && <DistributionEngine voiceAdd={takePending} />}
        {activeModule === 'maritime-commerce' && <MaritimeCommerceEngine voiceAdd={takePending} />}
        {activeModule === 'strategic-finance' && <StrategicFinanceEngine voiceAdd={takePending} />}
        {activeModule === 'antitrust' && <AntitrustEngine voiceAdd={takePending} />}
        {activeModule === 'inheritance' && <InheritanceEngine voiceAdd={takePending} />}
        {activeModule === 'endowment' && <EndowmentEngine voiceAdd={takePending} />}
        {activeModule === 'civil-contracts' && <CivilContractsEngine voiceAdd={takePending} />}
        {activeModule === 'compensation' && <CompensationEngine voiceAdd={takePending} />}
        {activeModule === 'joint-property' && <JointPropertyEngine voiceAdd={takePending} />}
        {activeModule === 'oral-contracts' && <OralContractsEngine voiceAdd={takePending} />}
        {activeModule === 'real-estate-security' && <RealEstateSecurityEngine voiceAdd={takePending} />}
        {activeModule === 'consular-affairs' && <ConsularAffairsEngine voiceAdd={takePending} />}
        {activeModule === 'customs-tax' && <CustomsTaxEngine voiceAdd={takePending} />}
        {activeModule === 'environmental' && <EnvironmentalEngine voiceAdd={takePending} />}
        {activeModule === 'energy-resources' && <EnergyResourcesEngine voiceAdd={takePending} />}
        {activeModule === 'consumer-protection' && <ConsumerProtectionEngine voiceAdd={takePending} />}
        {activeModule === 'sports' && <SportsEngine voiceAdd={takePending} />}
        {activeModule === 'academic' && <AcademicEngine voiceAdd={takePending} />}
        {activeModule === 'pre-university' && <PreUniversityEngine voiceAdd={takePending} />}
        {activeModule === 'local-administration' && <LocalAdministrationEngine voiceAdd={takePending} />}
        {activeModule === 'transport-logistics' && <TransportLogisticsEngine voiceAdd={takePending} />}
        {activeModule === 'administrative-governance' && <AdministrativeGovernanceEngine voiceAdd={takePending} />}
        {activeModule === 'internal-investigations' && <InternalInvestigationsEngine voiceAdd={takePending} />}
        {activeModule === 'knowledge-management' && <KnowledgeManagementEngine voiceAdd={takePending} />}
        {activeModule === 'document-recognition' && <DocumentRecognitionEngine voiceAdd={takePending} />}
        {activeModule === 'bulk-archiver' && <BulkArchiverEngine voiceAdd={takePending} />}
        {activeModule === 'boardroom-governance' && <BoardroomGovernanceEngine voiceAdd={takePending} />}
        {activeModule === 'document-studio' && <DocumentStudioEngine voiceAdd={takePending} />}
        {activeModule === 'sovereign-storage' && <SovereignStorageEngine voiceAdd={takePending} />}
        {activeModule === 'audio-transcription' && <AudioTranscriptionEngine voiceAdd={takePending} />}
        {activeModule === 'wellness' && <WellnessEngine voiceAdd={takePending} />}
        {activeModule === 'syndicates' && <SyndicatesEngine voiceAdd={takePending} />}
        {activeModule === 'medical-institutions' && <MedicalInstitutionsEngine voiceAdd={takePending} />}
        {activeModule === 'engineering-consulting' && <EngineeringConsultingEngine voiceAdd={takePending} />}
        {activeModule === 'economic-investment' && <EconomicInvestmentEngine voiceAdd={takePending} />}
        {activeModule === 'embassies-consular' && <EmbassiesConsularEngine voiceAdd={takePending} />}
        {activeModule === 'cross-border-contracts' && <CrossBorderContractsEngine voiceAdd={takePending} />}
        {activeModule === 'intl-organizations' && <InternationalOrganizationsEngine voiceAdd={takePending} />}
        {activeModule === 'ngos-civil-society' && <NGOsCivilSocietyEngine voiceAdd={takePending} />}
        {activeModule === 'social-insurance' && <SocialInsuranceEngine voiceAdd={takePending} />}
        {activeModule === 'labor-relations' && <LaborRelationsEngine voiceAdd={takePending} />}
        {activeModule === 'press-media' && <PressMediaEngine voiceAdd={takePending} />}
        {activeModule === 'banking-finance' && <BankingFinanceEngine voiceAdd={takePending} />}
        {activeModule === 'inhouse-legal' && <InHouseLegalEngine voiceAdd={takePending} />}
        {activeModule === 'human-resources' && <HumanResourcesEngine voiceAdd={takePending} />}
        {activeModule === 'compound-hoa' && <CompoundHOAEngine voiceAdd={takePending} />}
        {activeModule === 'sports-clubs' && <SportsClubsEngine voiceAdd={takePending} />}
        {activeModule === 'family-welfare' && <FamilyWelfareEngine voiceAdd={takePending} />}
        {activeModule === 'media-production' && <MediaProductionEngine voiceAdd={takePending} />}
        {activeModule === 'telecom-it-data' && <TelecomITDataEngine voiceAdd={takePending} />}
        {activeModule === 'real-estate-asset' && <RealEstateAssetEngine voiceAdd={takePending} />}
        {activeModule === 'railways-metro' && <RailwaysMetroEngine voiceAdd={takePending} />}
        {activeModule === 'legal-accounting' && <LegalAccountingEngine voiceAdd={takePending} />}
        {activeModule === 'tourism-hotels' && <TourismHotelsEngine voiceAdd={takePending} />}
        {activeModule === 'industrial-sector' && <IndustrialSectorEngine voiceAdd={takePending} />}
        {activeModule === 'wholesale-retail' && <WholesaleRetailEngine voiceAdd={takePending} />}
        {activeModule === 'private-security' && <PrivateSecurityEngine voiceAdd={takePending} />}
        {activeModule === 'import-export' && <ImportExportEngine voiceAdd={takePending} />}
        {activeModule === 'health-safety' && <HealthSafetyEngine voiceAdd={takePending} />}
        {activeModule === 'marketing-ads' && <MarketingAdsEngine voiceAdd={takePending} />}
        {activeModule === 'automotive-trade' && <AutomotiveTradeEngine voiceAdd={takePending} />}
        {activeModule === 'automotive-manufacturing' && <AutomotiveManufacturingEngine voiceAdd={takePending} />}
        {activeModule === 'fertilizers-chemicals' && <FertilizersChemicalsEngine voiceAdd={takePending} />}
        {activeModule === 'foreign-residency' && <ForeignResidencyEngine voiceAdd={takePending} />}
        {activeModule === 'capital-markets' && <CapitalMarketsEngine voiceAdd={takePending} />}
        {activeModule === 'shopping-mall' && <ShoppingMallEngine voiceAdd={takePending} />}
        {activeModule === 'library-archive' && <LibraryArchiveEngine voiceAdd={takePending} />}
        {activeModule === 'maintenance-warranty' && <MaintenanceWarrantyEngine voiceAdd={takePending} />}
        {activeModule === 'integration-synergy' && <IntegrationSynergyEngine voiceAdd={takePending} />}
        {activeModule === 'quarries-mining' && <QuarriesMiningEngine voiceAdd={takePending} />}
        {activeModule === 'ceramics-porcelain' && <CeramicsPorcelainEngine voiceAdd={takePending} />}
        {activeModule === 'arbitration-hub' && <ArbitrationHubEngine voiceAdd={takePending} />}
        {activeModule === 'food-security' && <FoodSecurityEngine voiceAdd={takePending} />}
        {activeModule === 'iot-bridge' && <IoTBridgeEngine voiceAdd={takePending} />}
        {activeModule === 'disaster-recovery' && <DisasterRecoveryEngine voiceAdd={takePending} />}
        {activeModule === 'biometric-gateway' && <BiometricGatewayEngine voiceAdd={takePending} />}
      </div>
    </div>
  );
}
