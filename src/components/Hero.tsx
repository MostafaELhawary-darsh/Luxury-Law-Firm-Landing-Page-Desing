import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface HeroProps {
  onContactClick: () => void;
}

export default function Hero({ onContactClick }: HeroProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative h-screen min-h-[700px] w-full overflow-hidden grain">
      {/* Background image with cinematic dark filter and Ken Burns zoom */}
      <div className="absolute inset-0">
        <div
          className={`absolute inset-0 bg-cover bg-center transition-transform duration-[25000ms] ease-out ${
            mounted ? 'scale-110' : 'scale-100'
          }`}
          style={{
            backgroundImage:
              'url(https://images.pexels.com/photos/29200086/pexels-photo-29200086.jpeg?auto=compress&cs=tinysrgb&w=1920)',
          }}
        />
        {/* Dark monochrome overlay */}
        <div className="absolute inset-0 bg-midnight/80" />
        <div className="absolute inset-0 bg-gradient-to-b from-midnight/60 via-midnight/50 to-midnight" />
        <div className="absolute inset-0 bg-gradient-to-l from-midnight/70 via-transparent to-midnight/70" />
        {/* Subtle gold glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gold/5 rounded-full blur-[120px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 text-center">
        {/* Eyebrow */}
        <div
          className={`flex items-center gap-4 mb-10 transition-all duration-1000 ease-luxury ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <span className="w-12 h-px bg-gold/50" />
          <p className="font-body text-xs text-gold tracking-[0.4em] uppercase">Al-Hawari Law Firm</p>
          <span className="w-12 h-px bg-gold/50" />
        </div>

        {/* Main heading */}
        <h1
          className={`font-heading font-bold text-cream text-3xl md:text-5xl lg:text-6xl leading-[1.3] max-w-4xl transition-all duration-1000 delay-200 ease-luxury ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          هندسة قانونية دقيقة لحماية النفوذ
          <br />
          <span className="text-gradient-gold">وتأمين إرثك المؤسسي</span>
        </h1>

        {/* Supporting line */}
        <p
          className={`font-body font-light text-cream/70 text-base md:text-lg leading-[1.9] max-w-2xl mt-8 transition-all duration-1000 delay-500 ease-luxury ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          نحن لا نكتفي بحل النزاعات، بل نصمم استراتيجيات استباقية بتكتم مطلق،
          لنمنح أعمالك حصانة قانونية لا تُخترق وراحة بال مستدامة في أعقد التحديات.
        </p>

        {/* CTA */}
        <div
          className={`mt-14 transition-all duration-1000 delay-700 ease-luxury ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <button
            onClick={onContactClick}
            className="group relative px-10 py-4 border border-gold/50 hover:border-gold transition-all duration-700 ease-luxury overflow-hidden"
          >
            <span className="absolute inset-0 bg-gold translate-y-full group-hover:translate-y-0 transition-transform duration-700 ease-luxury" />
            <span className="relative font-body text-base text-gold group-hover:text-midnight transition-colors duration-700 ease-luxury tracking-wide">
              [ رتّب لقاءً استراتيجياً مغلقاً ]
            </span>
          </button>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
        <span className="font-body text-[10px] text-cream/40 tracking-[0.3em]">SCROLL</span>
        <ChevronDown
          size={16}
          className="text-gold/60 animate-scroll-indicator"
        />
      </div>

      {/* Bottom fade into next section */}
      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-b from-transparent to-cream pointer-events-none" />
    </section>
  );
}
