import React from 'react';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md">
      <nav className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">ا.ه</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">الهواري للمحاماة</h1>
            <p className="text-xs text-slate-600">استشارات قانونية متميزة</p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <button
            onClick={() => scrollToSection('services')}
            className="text-slate-700 hover:text-blue-600 font-medium transition-colors"
          >
            الخدمات
          </button>
          <button
            onClick={() => scrollToSection('team')}
            className="text-slate-700 hover:text-blue-600 font-medium transition-colors"
          >
            الفريق
          </button>
          <button
            onClick={() => scrollToSection('contact')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            تواصل معنا
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={toggleMenu}
          className="md:hidden text-slate-700 hover:text-blue-600 transition-colors"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden bg-slate-50 border-t border-slate-200 px-4 py-4 space-y-4">
          <button
            onClick={() => scrollToSection('services')}
            className="block w-full text-right text-slate-700 hover:text-blue-600 font-medium transition-colors py-2"
          >
            الخدمات
          </button>
          <button
            onClick={() => scrollToSection('team')}
            className="block w-full text-right text-slate-700 hover:text-blue-600 font-medium transition-colors py-2"
          >
            الفريق
          </button>
          <button
            onClick={() => scrollToSection('contact')}
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors text-center"
          >
            تواصل معنا
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;