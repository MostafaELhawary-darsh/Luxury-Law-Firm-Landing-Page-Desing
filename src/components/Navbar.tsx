import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  onContactClick: () => void;
  onLibraryClick: () => void;
  onFinanceClick: () => void;
  onFirmClick: () => void;
}

export default function Navbar({ onContactClick, onLibraryClick, onFinanceClick, onFirmClick }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'الرؤية', href: '#trust' },
    { label: 'مجالات التخصص', href: '#practice' },
    { label: 'فلسفتنا', href: '#philosophy' },
    { label: 'المكتبة القانونية', action: 'library' as const },
    { label: 'الإدارة المالية', action: 'finance' as const },
    { label: 'إدارة المؤسسة', action: 'firm' as const },
    { label: 'تواصل', href: '#contact' },
  ];

  const handleNavClick = (href: string) => {
    setMenuOpen(false);
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-700 ease-luxury ${
        scrolled
          ? 'glass py-4 border-b border-gold/10'
          : 'bg-transparent py-7'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border border-gold/60 flex items-center justify-center">
            <span className="font-heading font-bold text-gold text-lg">ه</span>
          </div>
          <div className="leading-tight">
            <p className="font-heading font-bold text-cream text-base tracking-wide">الهواري</p>
            <p className="font-body text-[10px] text-cream/50 tracking-[0.2em] uppercase">Law & Counsel</p>
          </div>
        </div>

        <ul className="hidden lg:flex items-center gap-10">
          {navLinks.map((link, i) => (
            <li key={i}>
              <button
                onClick={() => {
                  if ('action' in link && link.action === 'library') {
                    onLibraryClick();
                  } else if ('action' in link && link.action === 'finance') {
                    onFinanceClick();
                  } else if ('action' in link && link.action === 'firm') {
                    onFirmClick();
                  } else if ('href' in link) {
                    handleNavClick(link.href);
                  }
                }}
                className="font-body text-sm text-cream/70 hover:text-gold transition-colors duration-500 tracking-wide"
              >
                {link.label}
              </button>
            </li>
          ))}
        </ul>

        <div className="hidden lg:block">
          <button
            onClick={onContactClick}
            className="group relative px-7 py-3 border border-gold/40 hover:border-gold transition-all duration-500 overflow-hidden"
          >
            <span className="absolute inset-0 bg-gold translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-luxury" />
            <span className="relative font-body text-sm text-gold group-hover:text-midnight transition-colors duration-500 tracking-wide">
              رتّب لقاءً
            </span>
          </button>
        </div>

        <button
          className="lg:hidden text-cream"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="القائمة"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {menuOpen && (
        <div className="lg:hidden glass border-t border-gold/10 mt-4">
          <ul className="flex flex-col items-center gap-6 py-8">
            {navLinks.map((link, i) => (
              <li key={i}>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    if ('action' in link && link.action === 'library') {
                      onLibraryClick();
                    } else if ('action' in link && link.action === 'finance') {
                      onFinanceClick();
                    } else if ('action' in link && link.action === 'firm') {
                      onFirmClick();
                    } else if ('href' in link && link.href) {
                      handleNavClick(link.href);
                    }
                  }}
                  className="font-body text-base text-cream/80 hover:text-gold transition-colors"
                >
                  {link.label}
                </button>
              </li>
            ))}
            <li>
              <button
                onClick={() => { setMenuOpen(false); onContactClick(); }}
                className="px-8 py-3 border border-gold/40 text-gold font-body text-sm hover:bg-gold hover:text-midnight transition-all duration-500"
              >
                رتّب لقاءً
              </button>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
