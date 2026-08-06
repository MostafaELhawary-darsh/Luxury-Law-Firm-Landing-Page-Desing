-- Register 8 new engines from the engineering document in M92 registry
-- No duplicates - all verified against existing registry

INSERT INTO m92_engine_registry (engine_code, engine_name, engine_name_ar, category, department, description, icon) VALUES
  ('M03', 'CriminalLawEngine', 'القضاء الجنائي والجنح', 'judicial', 'القضاء الجنائي',
   'إدارة قضايا القضاء الجنائي والجنح والتحقيقات والأدلة الرقمية وسجل الوصول السري',
   'Gavel')
ON CONFLICT (engine_code) DO NOTHING;

INSERT INTO m92_engine_registry (engine_code, engine_name, engine_name_ar, category, department, description, icon) VALUES
  ('M09', 'MOJIntegrationEngine', 'الربط السيادي مع وزارة العدل', 'judicial', 'ربط وزارة العدل',
   'بوابة آمنة للتواصل مع بوابات التقاضي الإلكتروني الحكومية لرفع الدعاوى وسحب الرولات',
   'Landmark')
ON CONFLICT (engine_code) DO NOTHING;

INSERT INTO m92_engine_registry (engine_code, engine_name, engine_name_ar, category, department, description, icon) VALUES
  ('M44', 'CorporateGovernanceEngine', 'الحوكمة الإدارية والهياكل التنظيمية', 'governance', 'الحوكمة',
   'بناء شجرة الصلاحيات والهياكل التنظيمية والسياسات المؤسسية وتدقيق القرارات',
   'Network')
ON CONFLICT (engine_code) DO NOTHING;

INSERT INTO m92_engine_registry (engine_code, engine_name, engine_name_ar, category, department, description, icon) VALUES
  ('M45', 'CrisisManagementEngine', 'إدارة الأزمات والمخاطر التشغيلية', 'governance', 'إدارة الأزمات',
   'تحليل البيانات المالية والإنتاجية لإطلاق تنبيهات استباقية وإدارة الحوادث والبروتوكولات',
   'ShieldAlert')
ON CONFLICT (engine_code) DO NOTHING;

INSERT INTO m92_engine_registry (engine_code, engine_name, engine_name_ar, category, department, description, icon) VALUES
  ('M47', 'HSEInternalEngine', 'السلامة والصحة المهنية الداخلية', 'operations', 'السلامة المهنية',
   'توثيق حوادث العمل الداخلية والتفتيشات والتدريب وتقارير التأمينات الاجتماعية',
   'HardHat')
ON CONFLICT (engine_code) DO NOTHING;

INSERT INTO m92_engine_registry (engine_code, engine_name, engine_name_ar, category, department, description, icon) VALUES
  ('M50', 'QualityAssuranceEngine', 'التقييم المؤسسي والجودة', 'governance', 'الجودة',
   'قياس أداء المحامين والمستشارين وتقييم المؤشرات والمراجعات والتحسينات المؤسسية',
   'Award')
ON CONFLICT (engine_code) DO NOTHING;

INSERT INTO m92_engine_registry (engine_code, engine_name, engine_name_ar, category, department, description, icon) VALUES
  ('M58', 'FreeProfessionsEngine', 'شؤون المهن الحرة والتراخيص', 'sectoral', 'المهن الحرة',
   'إدارة الملفات الضريبية والتراخيص للمهن الحرة المتعاملة مع المؤسسة',
   'Briefcase')
ON CONFLICT (engine_code) DO NOTHING;

INSERT INTO m92_engine_registry (engine_code, engine_name, engine_name_ar, category, department, description, icon) VALUES
  ('M60', 'CorporateCommercialEngine', 'الشركات والعقود التجارية والأسواق', 'corporate', 'الشركات التجارية',
   'أتمتة محاضر الجمعيات العمومية وعقود التحالفات وتوزيع الحصص والعقود التجارية',
   'Building2')
ON CONFLICT (engine_code) DO NOTHING;