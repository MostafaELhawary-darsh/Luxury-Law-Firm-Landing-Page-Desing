import { Mail, Phone, MapPin, Library, Calculator, Building2 } from 'lucide-react';

interface FooterProps {
  onLibraryClick: () => void;
  onFinanceClick: () => void;
  onFirmClick: () => void;
}

export default function Footer({ onLibraryClick, onFinanceClick, onFirmClick }: FooterProps) {
  return (
    <footer className="bg-midnight-deep border-t border-gold/10 py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 border border-gold/60 flex items-center justify-center">
                <span className="font-heading font-bold text-gold text-lg">ه</span>
              </div>
              <div className="leading-tight">
                <p className="font-heading font-bold text-cream text-base">الهواري</p>
                <p className="font-body text-[10px] text-cream/50 tracking-[0.2em] uppercase">Law & Counsel</p>
              </div>
            </div>
            <p className="font-body font-light text-sm text-cream/40 leading-[1.9] max-w-xs">
              مؤسسة قانونية متخصصة في هندسة الحلول الاستراتيجية وحماية النفوذ المؤسسي بتكتم مطلق.
            </p>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-heading font-bold text-cream text-sm mb-6 tracking-wide">
              معلومات التواصل
            </h4>
            <ul className="space-y-4">
              <li className="flex items-center gap-3">
                <Mail size={16} className="text-gold/50 flex-shrink-0" />
                <span className="font-body text-sm text-cream/50" dir="ltr">counsel@al-hawari.law</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={16} className="text-gold/50 flex-shrink-0" />
                <span className="font-body text-sm text-cream/50" dir="ltr">+000 0000 0000</span>
              </li>
              <li className="flex items-center gap-3">
                <MapPin size={16} className="text-gold/50 flex-shrink-0" />
                <span className="font-body text-sm text-cream/50">المكتب الرئيسي — حسب الموعد</span>
              </li>
            </ul>
          </div>

          {/* Hours / Protocol */}
          <div>
            <h4 className="font-heading font-bold text-cream text-sm mb-6 tracking-wide">
              بروتوكول العمل
            </h4>
            <ul className="space-y-4">
              <li className="font-body text-sm text-cream/50 leading-[1.9]">
                الاجتماعات تُعقد بمواعيد مغلقة ومسبقة فقط.
              </li>
              <li className="font-body text-sm text-cream/50 leading-[1.9]">
                كافة المراسلات تخضع لبروتوكول السرية التامة.
              </li>
              <li>
                <button
                  onClick={onLibraryClick}
                  className="flex items-center gap-2 text-cream/50 hover:text-gold transition-colors font-body text-sm"
                >
                  <Library size={16} />
                  المكتبة القانونية الرقمية
                </button>
              </li>
              <li>
                <button
                  onClick={onFinanceClick}
                  className="flex items-center gap-2 text-cream/50 hover:text-gold transition-colors font-body text-sm"
                >
                  <Calculator size={16} />
                  الإدارة المالية
                </button>
              </li>
              <li>
                <button
                  onClick={onFirmClick}
                  className="flex items-center gap-2 text-cream/50 hover:text-gold transition-colors font-body text-sm"
                >
                  <Building2 size={16} />
                  إدارة المؤسسة القانونية
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="gold-line opacity-30 mb-8" />

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-body text-xs text-cream/30">
            © {new Date().getFullYear()} مؤسسة الهواري للمحاماة والاستشارات القانونية. جميع الحقوق محفوظة.
          </p>
          <p className="font-body text-xs text-cream/30 tracking-wide">
            السرية — الحكمة — النفوذ
          </p>
        </div>
      </div>
    </footer>
  );
}
