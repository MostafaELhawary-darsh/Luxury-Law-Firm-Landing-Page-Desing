import { useScrollReveal } from '@/hooks/useScrollReveal';

export default function Trust() {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  const stats = [
    {
      number: '+٢٥',
      label: 'عاماً من الرؤية الاستراتيجية',
      description:
        'مسيرة ممتدة في هندسة الحلول القانونية الاستباقية وحماية مصالح الكيانات الكبرى عبر تقلبات السوق.',
    },
    {
      number: '٢ مليار',
      label: 'قيمة النزاعات والصفقات المُدارة',
      description:
        'سجل حافل بالانتصارات القانونية المعقدة وعمليات الاستحواذ والاندماج عالية المخاطر.',
    },
    {
      number: 'النخبة',
      label: 'المستشار المؤتمن لكبرى الكيانات',
      description:
        'نمثل نخبة من قادة القطاعات الحيوية الذين يضعون ثقتهم الكاملة في حصانتنا القانونية.',
    },
  ];

  return (
    <section id="trust" className="relative bg-cream py-32 lg:py-40 px-6">
      <div
        ref={ref}
        className={`reveal ${isVisible ? 'is-visible' : ''} max-w-6xl mx-auto`}
      >
        {/* Stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 lg:gap-20 mb-28">
          {stats.map((stat, i) => (
            <div key={i} className="text-center md:text-right">
              <p className="font-heading font-bold text-4xl lg:text-5xl text-midnight mb-4">
                {stat.number}
              </p>
              <div className="w-12 h-px bg-gold mb-5 mx-auto md:mx-0" />
              <h3 className="font-heading font-bold text-lg text-ink mb-4 leading-snug">
                {stat.label}
              </h3>
              <p className="font-body font-light text-sm text-ink/60 leading-[1.9]">
                {stat.description}
              </p>
            </div>
          ))}
        </div>

        {/* Central conviction statement */}
        <div className="max-w-4xl mx-auto text-center py-16 border-y border-ink/10">
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className="w-16 h-px bg-gold/40" />
            <span className="text-gold text-2xl font-serif-en">"</span>
            <span className="w-16 h-px bg-gold/40" />
          </div>
          <p className="font-heading font-medium text-xl md:text-2xl lg:text-[1.65rem] text-midnight leading-[1.9]">
            ندرك تماماً أن قضاياك الأكثر حساسية تتطلب ما هو أبعد من المعرفة القانونية؛
            إنها تتطلب حكمة تجارية ثاقبة، وتكتماً مطلقاً، وفهماً عميقاً للعبة الكبرى..
            <span className="text-gold"> وهذا هو المعيار الذي لا نساوم عليه أبداً.</span>
          </p>
        </div>

        {/* Testimonial */}
        <div className="max-w-3xl mx-auto text-center mt-20">
          <div className="inline-block mb-8">
            <span className="font-serif-en text-6xl text-gold/30 leading-none">"</span>
          </div>
          <blockquote className="font-body font-light text-lg md:text-xl text-ink/80 leading-[2.1] italic">
            لم نكن نبحث عن مجرد استشارة تقليدية، بل عن شريك استراتيجي يحمي إرثنا بتكتم.
            مؤسسة الهواري منحتنا الثقة لاتخاذ قرارات جريئة، ونحن على يقين بأن ظهرنا محميّ
            بصلابة لا تُخترق.
          </blockquote>
          <div className="flex items-center justify-center gap-4 mt-10">
            <span className="w-8 h-px bg-gold/50" />
            <p className="font-body text-sm text-ink/50 tracking-wide">
              الرئيس التنفيذي لإحدى أبرز المجموعات الاستثمارية
            </p>
            <span className="w-8 h-px bg-gold/50" />
          </div>
        </div>
      </div>
    </section>
  );
}
