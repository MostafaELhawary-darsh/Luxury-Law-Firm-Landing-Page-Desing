import { useState } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { Plus, Minus } from 'lucide-react';

const philosophyItems = [
  {
    title: 'السرية التامة',
    content:
      'السرية ليست بنداً في عقودنا، بل حجر الأساس. نتعامل مع بياناتك كثروة قومية ببروتوكولات حماية صارمة تضمن أن لا شيء يتسرب خارج جدران المؤسسة.',
  },
  {
    title: 'الفهم التجاري',
    content:
      'مهمتنا ليست عرقلة مساعيك التجارية بالنصوص، بل هندسة طريق قانوني آمن يضمن أهدافك التوسعية. نفهم لغة الأعمال قبل أن نتحدث بلغة القانون.',
  },
  {
    title: 'قيادة الخبراء',
    content:
      'كل ملف يكون تحت الإشراف المباشر لأحد الشركاء المؤسسين. استراتيجيتك دائماً في يد الخبرات العليا، لا تُترك للمبتدئين أو تُفوّض للمستوى الأدنى.',
  },
  {
    title: 'القوة والنفوذ',
    content:
      'سجلنا الحافل يتضمن مواجهات حاسمة ضد أكبر الكيانات؛ نمتلك المعرفة والموارد لضمان تفوق موقفك في أصعب المعارك القانونية وأكثرها تعقيداً.',
  },
  {
    title: 'شفافية الاستثمار',
    content:
      'قبل البدء، نصمم هيكلاً لأتعابنا يتناسب مع طبيعة القضية لتتخذ قراراتك وأنت على دراية تامة بالتكلفة، دون مفاجآت أو رسوم خفية في أي مرحلة.',
  },
];

export default function Philosophy() {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="philosophy" className="relative bg-cream py-32 lg:py-40 px-6">
      <div
        ref={ref}
        className={`reveal ${isVisible ? 'is-visible' : ''} max-w-5xl mx-auto`}
      >
        {/* Header */}
        <div className="text-center mb-20">
          <div className="flex items-center justify-center gap-4 mb-6">
            <span className="w-12 h-px bg-gold/50" />
            <p className="font-body text-xs text-gold tracking-[0.4em] uppercase">Our Philosophy</p>
            <span className="w-12 h-px bg-gold/50" />
          </div>
          <h2 className="font-heading font-bold text-midnight text-3xl md:text-4xl lg:text-5xl mb-6">
            فلسفة المؤسسة
          </h2>
          <p className="font-body font-light text-ink/60 text-base max-w-xl mx-auto leading-[1.9]">
            خمسة مبادئ لا نتزحزح عنها — تشكل العقد الذي نقطعه مع كل عميل نختار أن نعمل معه.
          </p>
        </div>

        {/* Accordion */}
        <div className="space-y-0">
          {philosophyItems.map((item, i) => (
            <div
              key={i}
              className="border-b border-ink/10 transition-all duration-500"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between gap-6 py-7 text-right group"
              >
                <div className="flex items-center gap-6">
                  <span className="font-serif-en text-sm text-gold/40">
                    0{i + 1}
                  </span>
                  <h3
                    className={`font-heading font-bold text-lg lg:text-xl transition-colors duration-500 ${
                      openIndex === i ? 'text-gold' : 'text-midnight group-hover:text-gold/70'
                    }`}
                  >
                    {item.title}
                  </h3>
                </div>
                <span
                  className={`flex-shrink-0 w-10 h-10 border flex items-center justify-center transition-all duration-500 ease-luxury ${
                    openIndex === i
                      ? 'border-gold bg-gold text-midnight'
                      : 'border-ink/20 text-ink/40'
                  }`}
                >
                  {openIndex === i ? <Minus size={16} /> : <Plus size={16} />}
                </span>
              </button>

              <div
                className={`overflow-hidden transition-all duration-700 ease-luxury ${
                  openIndex === i ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <p className="font-body font-light text-ink/70 text-base leading-[2] pb-8 pr-16 max-w-3xl">
                  {item.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
