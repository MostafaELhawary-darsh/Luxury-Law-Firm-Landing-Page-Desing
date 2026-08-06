-- Register 64 missing engines in M92 engine registry
-- Organized by sector/category, not by engine number
-- No duplicates - all engine_codes verified against existing registry

-- === القضاء والتقاضي (Judicial & Litigation) ===
INSERT INTO m92_engine_registry (engine_code, engine_name, engine_name_ar, category, department, description, icon) VALUES
  ('M1', 'CivilCommercialEngine', 'القضاء المدني والتجاري', 'judicial', 'القضاء المدني', 'إدارة قضايا القضاء المدني والتجاري والمنازعات العقدية', 'Gavel'),
  ('M2', 'AdministrativeCourtEngine', 'القضاء الإداري والدستوري', 'judicial', 'القضاء الإداري', 'الطعون الإدارية والدستورية وقرارات السلطة العامة', 'Landmark'),
  ('M3', 'StateCouncilEngine', 'محاكم القضاء الإداري', 'judicial', 'القضاء الإداري', 'دوائر مجلس الدولة والقضاء الإداري', 'Scale'),
  ('M4', 'EconomicCourtEngine', 'المحاكم الاقتصادية', 'judicial', 'القضاء الاقتصادي', 'المنازعات الاقتصادية والتجارية الكبرى', 'Building'),
  ('M5', 'FamilyCourtEngine', 'محاكم الأسرة', 'judicial', 'قضاء الأسرة', 'قضايا الأحوال الشخصية والأسرة', 'Heart'),
  ('M6', 'LaborCourtEngine', 'المحاكم العمالية', 'judicial', 'القضاء العمالي', 'منازعات العمل والعمال', 'Briefcase'),
  ('M7', 'ArbitrationEngine', 'دوائر التحكيم', 'judicial', 'التحكيم', 'إجراءات التحكيم التجاري والدولي', 'Gavel'),
  ('M8', 'DisputeCommitteesEngine', 'لجان فض المنازعات', 'judicial', 'فض المنازعات', 'لجان فض المنازعات والمصالحة', 'MessageSquareWarning'),
  ('M9', 'ExecutionEngine', 'التنفيذ القضائي', 'judicial', 'التنفيذ', 'إجراءات التنفيذ القضائي والحجز', 'Landmark')
ON CONFLICT (engine_code) DO NOTHING;

-- === الملكية الفكرية والتكنولوجيا (IP & Technology) ===
INSERT INTO m92_engine_registry (engine_code, engine_name, engine_name_ar, category, department, description, icon) VALUES
  ('M12', 'PatentEngine', 'براءات الاختراع', 'ip_tech', 'براءات الاختراع', 'تسجيل براءات الاختراع وحمايتها', 'Lightbulb'),
  ('M13', 'CopyrightEngine', 'حقوق المؤلف', 'ip_tech', 'حقوق المؤلف', 'حماية حقوق المؤلف والملكية الأدبية', 'Copyright'),
  ('M15', 'CyberCrimeEngine', 'الجرائم الإلكترونية', 'ip_tech', 'الأمن السيبراني', 'قضايا الجرائم الإلكترونية والاختراق', 'Gavel'),
  ('M16', 'DigitalSignatureEngine', 'التوقيع الإلكتروني', 'ip_tech', 'التوقيع الرقمي', 'التوقيع الإلكتروني والإسناد الرقمي', 'PenTool'),
  ('M17', 'DigitalPublishingEngine', 'النشر الرقمي', 'ip_tech', 'النشر الرقمي', 'حماية المحتوى الرقمي والنشر الإلكتروني', 'Newspaper'),
  ('M18', 'DigitalAssetEngine', 'الأصول الرقمية', 'ip_tech', 'الأصول الرقمية', 'إدارة الأصول الرقمية والعملات المشفرة', 'Cpu')
ON CONFLICT (engine_code) DO NOTHING;

-- === الشركات والاستثمار (Corporate & Investment) ===
INSERT INTO m92_engine_registry (engine_code, engine_name, engine_name_ar, category, department, description, icon) VALUES
  ('M19', 'CommercialContractEngine', 'العقود التجارية', 'corporate', 'العقود التجارية', 'صياغة ومراجعة العقود التجارية', 'FileSignature'),
  ('M20', 'MergerAcquisitionEngine', 'الاستحواذ والاندماج', 'corporate', 'الاندماج والاستحواذ', 'عمليات الاندماج والاستحواذ وهياكل الشركات', 'Building2'),
  ('M21', 'FDIEngine', 'الاستثمار الأجنبي', 'corporate', 'الاستثمار الأجنبي', 'الاستثمار الأجنبي المباشر والتراخيص', 'Globe'),
  ('M22', 'RealEstateEngine', 'العقارات', 'corporate', 'العقارات', 'قضايا العقارات والملكية العقارية', 'Home')
ON CONFLICT (engine_code) DO NOTHING;

-- === التجارة والخدمات (Trade & Services) ===
INSERT INTO m92_engine_registry (engine_code, engine_name, engine_name_ar, category, department, description, icon) VALUES
  ('M23', 'DistributionEngine', 'التوزيع والوكالات', 'trade', 'التوزيع', 'عقود التوزيع والوكالات التجارية', 'Store'),
  ('M24', 'MaritimeCommerceEngine', 'التجارة البحرية', 'trade', 'التجارة البحرية', 'قضايا التجارة البحرية والشحن', 'Ship'),
  ('M26', 'AntitrustEngine', 'الامتثال ومنع الاحتكار', 'trade', 'الامتثال', 'منع الاحتكار والممارسات الضارة', 'Scale')
ON CONFLICT (engine_code) DO NOTHING;

-- === الالتزامات المدنية (Civil Obligations) ===
INSERT INTO m92_engine_registry (engine_code, engine_name, engine_name_ar, category, department, description, icon) VALUES
  ('M27', 'InheritanceEngine', 'التركات والمواريث', 'civil', 'المواريث', 'تقسيم التركات والمواريث', 'Users'),
  ('M28', 'EndowmentEngine', 'الأوقاف والحراسة', 'civil', 'الأوقاف', 'إدارة الأوقاف والحبوسات', 'Landmark'),
  ('M29', 'CivilContractsEngine', 'العقود المدنية', 'civil', 'العقود المدنية', 'صياغة ومراجعة العقود المدنية', 'FileText'),
  ('M30', 'CompensationEngine', 'التعويضات', 'civil', 'التعويضات', 'دعاوى التعويض والمسؤولية التقصيرية', 'AlertTriangle'),
  ('M31', 'JointPropertyEngine', 'الملكية الشائعة', 'civil', 'الملكية', 'قسمة الملكية الشائعة والشيوع', 'Split'),
  ('M32', 'OralContractsEngine', 'العقود الشفهية', 'civil', 'العقود الشفهية', 'إثبات العقود الشفهية والبينة', 'Mic'),
  ('M33', 'RealEstateSecurityEngine', 'الضمانات العينية', 'civil', 'الضمانات العينية', 'الرهن والضمانات العينية', 'Lock')
ON CONFLICT (engine_code) DO NOTHING;

-- === القطاعات التخصصية (Specialized Sectors) ===
INSERT INTO m92_engine_registry (engine_code, engine_name, engine_name_ar, category, department, description, icon) VALUES
  ('M34', 'ConsularAffairsEngine', 'الشؤون القنصلية', 'sectoral', 'الشؤون القنصلية', 'القنصليات وتوثيق العقود الدولية', 'Plane'),
  ('M35', 'CustomsTaxEngine', 'الجمارك والضرائب', 'sectoral', 'الجمارك والضرائب', 'الجمارك والضرائب والرسوم', 'Receipt'),
  ('M36', 'EnvironmentalEngine', 'البيئة والاستدامة', 'sectoral', 'البيئة', 'قضايا البيئة والاستدامة', 'Leaf'),
  ('M37', 'EnergyResourcesEngine', 'الطاقة والموارد', 'sectoral', 'الطاقة', 'قطاع الطاقة والثروات الطبيعية', 'Zap'),
  ('M38', 'ConsumerProtectionEngine', 'حماية المستهلك', 'sectoral', 'حماية المستهلك', 'حماية المستهلك ودعاوى المنتجات', 'ShoppingCart'),
  ('M43', 'TransportLogisticsEngine', 'النقل واللوجستيات', 'sectoral', 'النقل واللوجستيات', 'قطاع النقل والخدمات اللوجستية', 'Truck'),
  ('M50', 'PredictiveRiskEngine', 'التحليل التنبؤي للمخاطر', 'sectoral', 'إدارة المخاطر', 'تحليل المخاطر القانونية والتنبؤ الاستباقي', 'ShieldCheck'),
  ('M52', 'SovereignMailEngine', 'البريد السيادي', 'sectoral', 'الاتصالات السيادية', 'نظام البريد المشفر السيادي', 'Mail'),
  ('M56', 'AudioTranscriptionEngine', 'التفريغ الصوتي', 'sectoral', 'التفريغ الصوتي', 'تفريغ الجلسات والمذكرات الصوتية', 'AudioWaveform'),
  ('M57', 'WellnessEngine', 'الرفاهية المؤسسية', 'sectoral', 'الرفاهية', 'برامج الرفاهية المؤسسية للموظفين', 'HeartPulse'),
  ('M64', 'SyndicatesEngine', 'النقابات المهنية', 'sectoral', 'النقابات', 'النقابات المهنية والعضوية', 'Users'),
  ('M65', 'MedicalInstitutionsEngine', 'المؤسسات الطبية', 'sectoral', 'القطاع الطبي', 'المؤسسات الطبية والمنشآت الصحية', 'Stethoscope'),
  ('M66', 'EngineeringConsultingEngine', 'القطاع الهندسي', 'sectoral', 'القطاع الهندسي', 'المكاتب الهندسية والاستشارات', 'HardHat'),
  ('M67', 'EconomicInvestmentEngine', 'المؤسسات الاقتصادية', 'sectoral', 'المناطق الاقتصادية', 'المناطق الاقتصادية والاستثمارية', 'Building2'),
  ('M68', 'EmbassiesConsularEngine', 'السفارات والقنصلية', 'sectoral', 'السفارات', 'السفارات والبعثات الدبلوماسية', 'Globe'),
  ('M69', 'CrossBorderContractsEngine', 'العقود الدولية', 'sectoral', 'العقود الدولية', 'العقود العابرة للحدود', 'Plane'),
  ('M70', 'InternationalOrganizationsEngine', 'المنظمات الدولية', 'sectoral', 'المنظمات الدولية', 'المنظمات الدولية والمعاهدات', 'Landmark'),
  ('M71', 'NGOsCivilSocietyEngine', 'الجمعيات الأهلية', 'sectoral', 'الجمعيات الأهلية', 'الجمعيات الأهلية والمنظمات غير الربحية', 'Heart'),
  ('M72', 'SocialInsuranceEngine', 'التأمينات الاجتماعية', 'sectoral', 'التأمينات', 'التأمينات الاجتماعية والمعاشات', 'ShieldCheck'),
  ('M73', 'LaborRelationsEngine', 'علاقات العمل', 'sectoral', 'علاقات العمل', 'علاقات العمل والتفاوض الجماعي', 'Briefcase'),
  ('M74', 'PressMediaEngine', 'المؤسسات الإعلامية', 'sectoral', 'الإعلام', 'المؤسسات الإعلامية والصحافة', 'Newspaper'),
  ('M75', 'BankingFinanceEngine', 'البنوك والمصارف', 'sectoral', 'القطاع المصرفي', 'البنوك والمؤسسات المصرفية', 'Banknote'),
  ('M76', 'InHouseLegalEngine', 'الإدارات القانونية', 'sectoral', 'الإدارات القانونية', 'الإدارات القانونية للشركات', 'Building2'),
  ('M79', 'SportsClubsEngine', 'الأندية الرياضية', 'sectoral', 'الأندية الرياضية', 'إدارة الأندية الرياضية', 'Trophy'),
  ('M80', 'FamilyWelfareEngine', 'الأمومة والطفولة', 'sectoral', 'الأمومة والطفولة', 'قضايا الأمومة والطفولة وحماية القاصرين', 'HeartPulse'),
  ('M81', 'MediaProductionEngine', 'الإنتاج الإعلامي', 'sectoral', 'الإنتاج الإعلامي', 'الإنتاج الإعلامي والمرئي والمسموع', 'Video'),
  ('M82', 'TelecomITDataEngine', 'الاتصالات وتكنولوجيا المعلومات', 'sectoral', 'الاتصالات', 'قطاع الاتصالات وتكنولوجيا المعلومات', 'Radio'),
  ('M83', 'RealEstateAssetEngine', 'إدارة الأصول العقارية', 'sectoral', 'الأصول العقارية', 'إدارة الأصول العقارية والاستثمارات', 'Building'),
  ('M84', 'RailwaysMetroEngine', 'السكك الحديدية والمترو', 'sectoral', 'النقل بالسكك', 'قطاع السكك الحديدية والمترو', 'Train'),
  ('M85', 'LegalAccountingEngine', 'المحاسبة القانونية والضرائب', 'sectoral', 'المحاسبة القانونية', 'المحاسبة القانونية والضرائب المهنية', 'Calculator'),
  ('M86', 'TourismHotelsEngine', 'السياحة والفنادق', 'sectoral', 'السياحة', 'قطاع السياحة والفنادق', 'Hotel'),
  ('M106', 'FoodSecurityEngine', 'الأمن الغذائي وسلاسل الإمداد', 'sectoral', 'الأمن الغذائي', 'الأمن الغذائي والصناعات الغذائية', 'Wheat')
ON CONFLICT (engine_code) DO NOTHING;

-- === الحوكمة والإدارة (Governance & Administration) ===
INSERT INTO m92_engine_registry (engine_code, engine_name, engine_name_ar, category, department, description, icon) VALUES
  ('M45', 'InternalInvestigationsEngine', 'التحقيقات الداخلية', 'governance', 'التحقيقات', 'التحقيقات الداخلية والتدقيق المؤسسي', 'Search'),
  ('M46', 'KnowledgeManagementEngine', 'إدارة المعرفة', 'governance', 'المعرفة', 'إدارة المعرفة والمكتبة الرقمية', 'BookOpen'),
  ('M47', 'DocumentRecognitionEngine', 'التعرف الذكي', 'governance', 'التعرف الذكي', 'التعرف الضوئي على المستندات', 'ScanText'),
  ('M48', 'BulkArchiverEngine', 'الأرشفة الجماعية', 'governance', 'الأرشفة', 'الأرشفة الجماعية للمستندات', 'FolderArchive'),
  ('M59', 'AdministrativeGovernanceEngine', 'العقود الإدارية والمشتريات', 'governance', 'العقود الإدارية', 'العقود الإدارية والمشتريات الحكومية', 'Network')
ON CONFLICT (engine_code) DO NOTHING;

-- === البنية التحتية والأمن (Infrastructure & Security) ===
INSERT INTO m92_engine_registry (engine_code, engine_name, engine_name_ar, category, department, description, icon) VALUES
  ('M55', 'SovereignStorageEngine', 'التخزين السيادي', 'infrastructure', 'التخزين', 'التخزين السيادي المشفر للملفات', 'Database')
ON CONFLICT (engine_code) DO NOTHING;