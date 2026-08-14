import React from 'react';

const Hero: React.FC = () => {
  return (
    <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white py-20 md:py-32">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-in">
          مؤسسة الهواري للمحاماة والاستشارات القانونية
        </h1>
        <p className="text-xl md:text-2xl text-slate-200 mb-8 animate-fade-in-delay">
          هندسة قانونية دقيقة لحماية النفوذ وتأمين إرثك المؤسسي
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <button className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105">
            احجز استشارة مجانية
          </button>
          <button className="border-2 border-white hover:bg-white hover:text-slate-900 px-8 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105">
            تعرف على خدماتنا
          </button>
        </div>
      </div>
    </section>
  );
};

export default Hero;