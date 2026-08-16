-- Update M47 and M53 registry entries to reflect the merge
-- M47 becomes "Integrated Document & Compliance Engine" (merged with M53)
-- M53 is marked as merged into M47

UPDATE m92_engine_registry
SET engine_name = 'IntegratedDocumentEngine',
    engine_name_ar = 'محرك المستندات والامتثال المدمج',
    description = 'دمج التعرف الذكي (M47) والتحرير السيادي (M53) وبوابة الامتثال في نواة واحدة: التقطاط وOCR، توجيه ذكي، تحرير بالأوامر الصوتية، فحص امتثال، تشفير AES-256',
    category = 'governance',
    department = 'المستندات والامتثال'
WHERE engine_code = 'M47';

-- Mark M53 as merged into M47 (keep the record for reference but update description)
UPDATE m92_engine_registry
SET description = 'مدمج مع M47 - محرك المستندات والامتثال المدمج. يوفر التحرير التعاوني والإملاء الصوتي وتتبع التغييرات',
    engine_name_ar = engine_name_ar || ' (مدمج مع M47)'
WHERE engine_code = 'M53';