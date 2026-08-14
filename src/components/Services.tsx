import React from 'react';
import { Shield, Briefcase, FileText, Users, TrendingUp, Lock } from 'lucide-react';

interface Service {
  id: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const services: Service[] = [
  {
    id: 1,
    icon: <Shield className="w-8 h-8" />,
    title: 'الاستشارات القانونية',
    description: 'استشارات قانونية متخصصة في جميع المجالات التجارية والمدنية والإدارية',
  },
  {
    id: 2,
    icon: <Briefcase className="w-8 h-8" />,
    title: 'الدعاوى القضائية',
    description: 'متابعة قضائية احترافية أمام جميع درجات المحاكم بكفاءة عالية',
  },
  {
    id: 3,
    icon: <FileText className="w-8 h-8" />,
    title: 'صياغة العقود',
    description: 'صياغة وتحرير العقود والاتفاقيات بشروط قانونية محكمة وحماية كاملة',
  },
  {
    id: 4,
    icon: <Users className="w-8 h-8" />,
    title: 'قانون الأحوال الشخصية',
    description: 'خدمات متخصصة في قضايا الأحوال الشخصية والأسرة والميراث',
  },
  {
    id: 5,
    icon: <TrendingUp className="w-8 h-8" />,
    title: 'قانون الاستثمار',
    description: 'استشارات في الاستثمارات والمشاريع التجارية والتمويل',
  },
  {
    id: 6,
    icon: <Lock className="w-8 h-8" />,
    title: 'الملكية الفكرية',
    description: 'حماية الملكية الفكرية والعلامات التجارية والبراءات',
  },
];

const Services: React.FC = () => {
  return (
    <section id="services" className="py-16 bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">خدماتنا المتميزة</h2>
          <p className="text-lg text-slate-600">مجموعة شاملة من الخدمات القانونية المتخصصة</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map(service => (
            <div
              key={service.id}
              className="group bg-white p-8 rounded-lg shadow-md hover:shadow-xl hover:border-blue-200 border-2 border-transparent transition-all duration-300 cursor-pointer transform hover:scale-105"
            >
              <div className="text-blue-600 mb-4 group-hover:scale-110 transform transition-transform duration-300">
                {service.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">
                {service.title}
              </h3>
              <p className="text-slate-600 group-hover:text-slate-700 transition-colors">
                {service.description}
              </p>
              <div className="mt-4 h-1 bg-gradient-to-r from-blue-600 to-blue-400 rounded transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;