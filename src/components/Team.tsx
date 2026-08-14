import React from 'react';
import { Heart, Briefcase, Shield, Users } from 'lucide-react';

interface TeamMember {
  id: number;
  name: string;
  role: string;
  specialization: string;
  image: string;
}

const teamMembers: TeamMember[] = [
  {
    id: 1,
    name: 'أ.د محمد الهواري',
    role: 'الشريك والمؤسس',
    specialization: 'القانون التجاري والاستثمار',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
  },
  {
    id: 2,
    name: 'أ.د فاطمة السعيد',
    role: 'محامية متخصصة',
    specialization: 'قانون الأحوال الشخصية والعقارات',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
  },
  {
    id: 3,
    name: 'أ. علي المحمود',
    role: 'محامي متخصص',
    specialization: 'القانون الإداري والعمل',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
  },
  {
    id: 4,
    name: 'أ. سارة الدعيج',
    role: 'محامية متخصصة',
    specialization: 'قانون الملكية الفكرية',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
  },
];

const Team: React.FC = () => {
  return (
    <section id="team" className="py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">فريقنا المتميز</h2>
          <p className="text-lg text-slate-600">نخبة من المحامين والاستشاريين ذوي الخبرة العميقة والالتزام الكامل</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {teamMembers.map(member => (
            <div
              key={member.id}
              className="group bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2"
            >
              {/* Image Container */}
              <div className="relative overflow-hidden h-64 bg-slate-200">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end justify-center pb-4">
                  <div className="flex gap-3">
                    <button className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transform transition-all duration-300 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0">
                      <Heart className="w-5 h-5" />
                    </button>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transform transition-all duration-300 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 delay-100">
                      <Briefcase className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors duration-300">
                  {member.name}
                </h3>
                <p className="text-blue-600 font-semibold mb-2">{member.role}</p>
                <p className="text-slate-600 text-sm">{member.specialization}</p>

                {/* Animated underline */}
                <div className="h-1 bg-gradient-to-r from-blue-600 to-blue-400 mt-4 rounded transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Team;