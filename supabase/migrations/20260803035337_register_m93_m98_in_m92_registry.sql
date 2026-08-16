-- Register M93–M98 + other referenced engines in the M92 engine registry
-- Also fixes: M53 is the sovereign document engine (was incorrectly seeded as M88)

-- Fix the mislabeled M88 entry — M88 is Internal Trade, not the document engine
UPDATE m92_engine_registry
  SET engine_name = 'InternalTrade',
      engine_name_ar = 'التجارة الداخلية والجملة والتجزئة',
      category = 'trade',
      department = 'التجارة الداخلية',
      description = 'التجارة الداخلية والجملة والتجزئة',
      icon = 'ShoppingCart'
WHERE engine_code = 'M88';

-- Ensure M53 exists as the sovereign document engine (the spec references M53)
INSERT INTO m92_engine_registry (engine_code, engine_name, engine_name_ar, category, department, description, icon) VALUES
  ('M53', 'SovereignDocumentEngine', 'محرك الوثائق السيادي', 'documents', 'الأرشيف', 'توليد العقود والمذكرات والوثائق القانونية', 'FileText')
ON CONFLICT (engine_code) DO NOTHING;

-- Register the 6 new engines (M93–M98)
INSERT INTO m92_engine_registry (engine_code, engine_name, engine_name_ar, category, department, description, icon) VALUES
  ('M93', 'MarketingAdsEngine', 'التسويق والإعلان والحملات الرقمية', 'sectoral', 'التسويق', 'تراخيص إعلانية وعقود رعاية ومؤثرين وحماية الشعارات', 'Megaphone'),
  ('M94', 'AutomotiveTradeEngine', 'تجارة السيارات وتأجيرها وإدارة الأساطيل', 'sectoral', 'السيارات', 'تراخيص المعارض وعقود البيع والتأجير ومطالبات التأمين', 'Car'),
  ('M95', 'AutomotiveManufacturingEngine', 'صناعة السيارات وتجميع المركبات', 'sectoral', 'التصنيع', 'تراخيص التجميع ونقل التكنولوجيا والمكون المحلي', 'Cog'),
  ('M96', 'FertilizersChemicalsEngine', 'الأسمدة والصناعات الكيميائية والبتروكيماويات', 'sectoral', 'الكيماويات', 'تراخيص الإنتاج وعقود اللقيم والمواد الخطرة', 'FlaskConical'),
  ('M97', 'ForeignResidencyEngine', 'شؤون الأجانب والإقامة والهجرة', 'sectoral', 'الهجرة', 'تصاريح العمل والإقامات والتوفيقات القنصلية', 'Plane'),
  ('M98', 'CapitalMarketsEngine', 'أسواق المال والبورصة وصناديق الاستثمار', 'sectoral', 'أسواق المال', 'تراخيص الصناديق والإدراج والإفصاح وAML', 'TrendingUp')
ON CONFLICT (engine_code) DO NOTHING;

-- Register additional engines referenced by the spec & integration matrix
INSERT INTO m92_engine_registry (engine_code, engine_name, engine_name_ar, category, department, description, icon) VALUES
  ('M80', 'IPEngine', 'محرك الملكية الفكرية', 'legal', 'الملكية الفكرية', 'حماية براءات الاختراع والتصميمات', 'Copyright'),
  ('M81', 'MediaProductionEngine', 'الإنتاج الإعلامي', 'media', 'الإعلام', 'حقوق المحتوى المرئي والمسموع', 'Video'),
  ('M91', 'HealthSafetyEngine', 'الصحة والسلامة المهنية', 'compliance', 'الصحة والسلامة', 'خطط الطوارئ والامتثال البيئي', 'HardHat'),
  ('M101', 'MaintenanceEngine', 'محرك الصيانة', 'operations', 'الصيانة', 'مواعيد وعقود الصيانة', 'Wrench'),
  ('M107', 'IoTEngine', 'إنترنت الأشياء', 'technology', 'التكنولوجيا', 'حساسات ومراقبة IoT', 'Radio'),
  ('M109', 'BiometricEngine', 'البيومتري والتوقيع', 'security', 'الأمن السيبراني', 'توقيع العقود والتحقق البيومتري', 'BadgeCheck')
ON CONFLICT (engine_code) DO NOTHING;