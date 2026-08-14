import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-300 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* About */}
          <div>
            <h3 className="text-white font-bold mb-4">عن المؤسسة</h3>
            <p className="text-sm text-slate-400">
              مؤسسة الهواري للمحاماة تقدم خدمات قانونية متخصصة بأعلى معايير المهنة والاحترافية
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-bold mb-4">روابط سريعة</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#services" className="hover:text-white transition-colors">
                  الخدمات
                </a>
              </li>
              <li>
                <a href="#team" className="hover:text-white transition-colors">
                  الفريق
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-white transition-colors">
                  تواصل معنا
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-white font-bold mb-4">تواصل معنا</h3>
            <p className="text-sm mb-2">الهاتف: +966 1 234 5678</p>
            <p className="text-sm mb-2">البريد: info@alhawari-law.com</p>
            <p className="text-sm">الرياض، المملكة العربية السعودية</p>
          </div>
        </div>

        <div className="border-t border-slate-700 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-slate-400">
            © {currentYear} مؤسسة الهواري للمحاماة. جميع الحقوق محفوظة.
          </p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <a href="#" className="text-slate-400 hover:text-white transition-colors">
              سياسة الخصوصية
            </a>
            <a href="#" className="text-slate-400 hover:text-white transition-colors">
              شروط الاستخدام
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;