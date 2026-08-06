import { useScrollReveal } from '@/hooks/useScrollReveal';
import {
  Building2,
  Scale,
  Handshake,
  FileText,
  ShieldCheck,
  Landmark,
} from 'lucide-react';

const practiceAreas = [
  {
    icon: Building2,
    title: 'حوكمة الشركات وهيكلة الأعمال',
    description:
      'نبني أساساً قانونياً متيناً وممتثلاً يضمن استمرارية أعمالك ونموها، ويحصن مجلس إدارتك.',
  },
  {
    icon: Scale,
    title: 'التقاضي التجاري المعقد',
    description:
      'ندير النزاعات عالية المخاطر باستراتيجيات محكمة، لضمان حسم المعارك القانونية لصالحك وحماية سمعتك.',
  },
  {
    icon: Handshake,
    title: 'عمليات الدمج والاستحواذ',
    description:
      'نقود مفاوضاتك ونهندس صفقاتك الكبرى بأمان تام، لضمان انتقال سلس للملكية دون ثغرات.',
  },
  {
    icon: FileText,
    title: 'العقود التجارية والاتفاقيات الاستراتيجية',
    description:
      'نصيغ التزاماتك في عقود مانعة للثغرات، لتكون درعاً واقياً يحفظ حقوقك.',
  },
  {
    icon: ShieldCheck,
    title: 'إدارة الثروات العائلية وحماية الأصول',
    description:
      'نصمم هياكل قانونية سرية تضمن انتقال ثروتك وإرثك العائلي عبر الأجيال بسلاسة.',
  },
  {
    icon: Landmark,
    title: 'الاستشارات الضريبية والامتثال المالي',
    description:
      'نوجه بوصلتك المالية للامتثال التام للتشريعات المعقدة، مما يجنبك المفاجآت المكلفة.',
  },
];

export default function PracticeAreas() {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <section id="practice" className="relative bg-midnight py-32 lg:py-40 px-6 overflow-hidden">
      {/* Subtle background texture */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold rounded-full blur-[200px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gold rounded-full blur-[200px]" />
      </div>

      <div
        ref={ref}
        className={`reveal ${isVisible ? 'is-visible' : ''} relative max-w-7xl mx-auto`}
      >
        {/* Section header */}
        <div className="text-center mb-20">
          <div className="flex items-center justify-center gap-4 mb-6">
            <span className="w-12 h-px bg-gold/50" />
            <p className="font-body text-xs text-gold tracking-[0.4em] uppercase">Practice Areas</p>
            <span className="w-12 h-px bg-gold/50" />
          </div>
          <h2 className="font-heading font-bold text-cream text-3xl md:text-4xl lg:text-5xl mb-6">
            مجالات التخصص النخبوية
          </h2>
          <p className="font-body font-light text-cream/50 text-base max-w-xl mx-auto leading-[1.9]">
            ست ركائز قانونية تشكل العمود الفقري لحصانتك المؤسسية، يُدار كل منها بمعرفة عميقة وتكتم مطلق.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-gold/10 border border-gold/10">
          {practiceAreas.map((area, i) => {
            const Icon = area.icon;
            return (
              <div
                key={i}
                className="group relative bg-midnight p-10 lg:p-12 transition-all duration-700 ease-luxury hover:bg-midnight-light cursor-default min-h-[280px] flex flex-col"
              >
                {/* Gold accent line on hover */}
                <span className="absolute top-0 right-0 w-0 h-px bg-gold group-hover:w-full transition-all duration-700 ease-luxury" />

                {/* Icon */}
                <div className="mb-8 transition-all duration-700 ease-luxury group-hover:scale-110 origin-right">
                  <Icon
                    size={40}
                    strokeWidth={1.2}
                    className="text-cream/40 group-hover:text-gold transition-colors duration-700 ease-luxury"
                  />
                </div>

                {/* Title */}
                <h3 className="font-heading font-bold text-cream text-lg lg:text-xl mb-4 leading-snug transition-colors duration-500 group-hover:text-gold">
                  {area.title}
                </h3>

                {/* Description - always visible, enhanced on hover */}
                <p className="font-body font-light text-sm text-cream/50 leading-[1.9] transition-all duration-700 ease-luxury group-hover:text-cream/80">
                  {area.description}
                </p>

                {/* Number indicator */}
                <span className="absolute bottom-6 left-6 font-serif-en text-xs text-cream/10 group-hover:text-gold/30 transition-colors duration-700">
                  0{i + 1}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
