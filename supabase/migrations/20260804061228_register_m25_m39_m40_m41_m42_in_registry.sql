-- Register M25, M39, M40, M41, M42 in M92 engine registry
-- These engines already have components and tables but were missing from the registry

INSERT INTO m92_engine_registry (engine_code, engine_name, engine_name_ar, category, department, description, icon) VALUES
  ('M25', 'StrategicFinanceEngine',
   'التمويل والاستثمار الاستراتيجي',
   'finance', 'التمويل والاستثمار',
   'إدارة التدفقات المالية الضخمة وهندسة اتفاقيات التمويل المعقدة وضبط العلاقات الاستثمارية',
   'TrendingUp')
ON CONFLICT (engine_code) DO NOTHING;

INSERT INTO m92_engine_registry (engine_code, engine_name, engine_name_ar, category, department, description, icon) VALUES
  ('M39', 'SportsEngine',
   'الرياضة والاتحادات الرياضية',
   'sectoral', 'القطاع الرياضي',
   'إدارة الأبعاد القانونية والتعاقدية والتنظيمية للمؤسسات الرياضية والأندية والاتحادات',
   'Trophy')
ON CONFLICT (engine_code) DO NOTHING;

INSERT INTO m92_engine_registry (engine_code, engine_name, engine_name_ar, category, department, description, icon) VALUES
  ('M40', 'AcademicEngine',
   'القطاع الأكاديمي والتعليم العالي',
   'sectoral', 'التعليم العالي',
   'حوكمة وإدارة الجامعات والمعاهد العليا والمراكز البحثية وضبط الأطر القانونية والإدارية',
   'GraduationCap')
ON CONFLICT (engine_code) DO NOTHING;

INSERT INTO m92_engine_registry (engine_code, engine_name, engine_name_ar, category, department, description, icon) VALUES
  ('M41', 'PreUniversityEngine',
   'التعليم المدرسي والأساسي والفني',
   'sectoral', 'التعليم المدرسي',
   'حوكمة وإدارة المدارس الحكومية والخاصة والدولية ومدارس التعليم الفني وضبط التراخيص والمصروفات',
   'School')
ON CONFLICT (engine_code) DO NOTHING;

INSERT INTO m92_engine_registry (engine_code, engine_name, engine_name_ar, category, department, description, icon) VALUES
  ('M42', 'LocalAdministrationEngine',
   'الإدارة المحلية والتنظيم العمراني',
   'sectoral', 'الإدارة المحلية',
   'ضبط العلاقة بين المؤسسات ووحدات الإدارة المحلية وضمان الامتثال لقوانين البناء والتراخيص',
   'MapPin')
ON CONFLICT (engine_code) DO NOTHING;