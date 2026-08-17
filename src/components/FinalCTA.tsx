import { useScrollReveal } from '@/hooks/useScrollReveal';

interface FinalCTAProps {
  onContactClick: () => void;
}

export default function FinalCTA({ onContactClick }: FinalCTAProps) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <section
      id="contact"
      className="relative bg-midnight-deep py-32 lg:py-48 px-6 overflow-hidden grain"
    >
      {/* Background architectural image with heavy filter */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url(https://images.pexels.com/photos/30664665/pexels-photo-30664665.jpeg?auto=compress&cs=tinysrgb&w=1920)',
          }}
        />
      </div>

      {/* Gold radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold/5 rounded-full blur-[150px]" />

      <div
        ref={ref}
        className={`reveal ${isVisible ? 'is-visible' : ''} relative max-w-3xl mx-auto text-center`}
      >
        {/* Eyebrow */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <span className="w-12 h-px bg-gold/50" />
          <p className="font-body text-xs text-gold tracking-[0.4em] uppercase">Strategic Counsel</p>
          <span className="w-12 h-px bg-gold/50" />
        </div>

        {/* Heading */}
        <h2 className="font-heading font-bold text-cream text-2xl md:text-4xl lg:text-[2.75rem] leading-[1.5] mb-8">
          في القضايا والصفقات المصيرية،
          <br />
          <span className="text-gradient-gold">التوقيت المبكر هو أقوى حصانة قانونية</span>
        </h2>

        {/* Supporting text */}
        <p className="font-body font-light text-cream/60 text-base md:text-lg leading-[2] max-w-2xl mx-auto mb-12">
          تواصلك معنا اليوم يمنحنا المساحة لتصميم استراتيجية هجومية تحصّن موقفك،
          بدلاً من الاضطرار للتعامل مع تداعيات كان يمكن تفاديها.
        </p>

        {/* CTA button */}
        <button
          onClick={onContactClick}
          className="group relative px-12 py-5 border border-gold/50 hover:border-gold transition-all duration-700 ease-luxury overflow-hidden"
        >
          <span className="absolute inset-0 bg-gold translate-y-full group-hover:translate-y-0 transition-transform duration-700 ease-luxury" />
          <span className="relative font-body text-base text-gold group-hover:text-midnight transition-colors duration-700 ease-luxury tracking-wide">
            [ طلب اجتماع استراتيجي مغلق ]
          </span>
        </button>

        {/* Trust note */}
        <p className="font-body text-xs text-cream/30 mt-8 max-w-md mx-auto leading-[1.9]">
          * تخضع كافة المراسلات لبروتوكول «السرية التامة» الخاص بالمؤسسة
          من اللحظة الأولى للتواصل.
        </p>
      </div>
    </section>
  );
}
