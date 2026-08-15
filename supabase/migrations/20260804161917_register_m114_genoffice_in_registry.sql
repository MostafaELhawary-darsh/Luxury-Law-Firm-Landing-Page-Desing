-- Register M114 GenOffice Sovereign Editor Engine in M92 registry
INSERT INTO m92_engine_registry (engine_code, engine_name, engine_name_ar, description, category, department, active)
VALUES (
  'M114',
  'GenOfficeEditorEngine',
  'محرك التحرير السيادي GenOffice',
  'دمج محرك تحرير المستندات (GenOffice/OnlyOffice) كأداة داخلية سيادية: تشغيل محلي بحت عبر Docker، اتصال آمن عبر iframe وPostMessage، جلسات JWT مشفرة، علامات مائية ديناميكية، تشفير AES-256، وسجل تدقيق غير قابل للتعديل بسلسلة هاش',
  'governance',
  'المستندات والتحرير السيادي',
  true
)
ON CONFLICT (engine_code) DO UPDATE SET
  engine_name = EXCLUDED.engine_name,
  engine_name_ar = EXCLUDED.engine_name_ar,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  department = EXCLUDED.department,
  active = true;