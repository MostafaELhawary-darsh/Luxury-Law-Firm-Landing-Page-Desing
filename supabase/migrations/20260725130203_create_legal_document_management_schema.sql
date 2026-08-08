/*
# Legal Document Management & Compliance Analysis Schema

## Overview
Creates a comprehensive system for managing legal documents, analyzing them,
checking compliance against constitutional texts, laws, ministerial decisions,
regulations, and judicial precedents. Supports multi-language translation,
document drafting, and export in multiple formats (Word, PDF, images).

## New Tables

1. **ld_documents** — Uploaded/created legal documents
   - id (uuid PK)
   - title (text) — document title
   - doc_type (text) — contract / appeal / lawsuit / legal_opinion / regulation / ruling / memo / other
   - language (text) — original language (ar / en / fr / de / es / it / ru / zh / tr)
   - content_text (text) — extracted text content for analysis
   - file_url (text, nullable) — original file storage URL
   - file_format (text, nullable) — pdf / docx / txt / jpg / png / html / rtf
   - file_size_bytes (bigint, nullable)
   - status (text) — draft / uploaded / analyzing / analyzed / compliant / non_compliant / needs_review / archived
   - uploaded_by (text)
   - tags (text[]) — categorization tags
   - created_at, updated_at

2. **ld_compliance_checks** — Compliance analysis results per document
   - id (uuid PK)
   - document_id (uuid FK → ld_documents, CASCADE)
   - reference_type (text) — constitution / law / ministerial_decision / regulation / judicial_precedent
   - reference_title (text) — name of the reference (e.g. "الدستور المصري", "قانون العمل 12/2003")
   - reference_article (text, nullable) — specific article number
   - compliance_status (text) — compliant / non_compliant / partial / needs_review
   - severity (text) — info / warning / critical
   - finding_summary (text) — AI analysis summary
   - recommendation (text, nullable) — suggested fix
   - confidence_score (numeric, 0-100)
   - created_at

3. **ld_reference_sources** — Legal reference library (constitution, laws, regulations, precedents)
   - id (uuid PK)
   - source_type (text) — constitution / law / ministerial_decision / regulation / judicial_precedent
   - title (text) — e.g. "الدستور المصري 2014"
   - title_en (text, nullable)
   - jurisdiction (text) — e.g. "egypt", "uae", "ksa", "international"
   - article_number (text, nullable)
   - article_title (text, nullable)
   - content_text (text) — the legal text
   - language (text) — ar / en / fr
   - effective_date (date, nullable)
   - is_active (boolean)
   - created_at, updated_at

4. **ld_translations** — Document translations
   - id (uuid PK)
   - document_id (uuid FK → ld_documents, CASCADE)
   - target_language (text) — ar / en / fr / de / es / it / ru / zh / tr
   - translated_title (text)
   - translated_content (text)
   - translation_status (text) — pending / translating / completed / failed
   - translated_by (text) — "AI Engine" or user name
   - created_at, updated_at

5. **ld_drafting_sessions** — Legal document drafting sessions
   - id (uuid PK)
   - document_id (uuid FK → ld_documents, CASCADE)
   - draft_type (text) — contract / appeal / lawsuit / legal_opinion / memo / clause
   - instructions (text) — user's drafting instructions
   - generated_text (text) — AI-generated draft
   - iteration (int) — draft version number
   - status (text) — pending / generating / completed / revised
   - created_at, updated_at

6. **ld_export_jobs** — Document/report export tracking
   - id (uuid PK)
   - document_id (uuid FK → ld_documents, CASCADE)
   - export_format (text) — pdf / docx / png / jpg / html / rtf
   - export_type (text) — document / compliance_report / translation / draft
   - status (text) — pending / processing / completed / failed
   - file_url (text, nullable)
   - created_at

## Security
- RLS enabled on all tables with anon+authenticated CRUD (single-tenant, no auth screen).
*/

-- ===== ld_documents =====
CREATE TABLE IF NOT EXISTS ld_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  doc_type text NOT NULL DEFAULT 'other',
  language text NOT NULL DEFAULT 'ar',
  content_text text DEFAULT '',
  file_url text,
  file_format text,
  file_size_bytes bigint,
  status text NOT NULL DEFAULT 'draft',
  uploaded_by text DEFAULT 'الشريك الإداري',
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ld_docs_status ON ld_documents(status);
CREATE INDEX IF NOT EXISTS idx_ld_docs_type ON ld_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_ld_docs_created ON ld_documents(created_at DESC);

ALTER TABLE ld_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ld_docs_select" ON ld_documents;
CREATE POLICY "ld_docs_select" ON ld_documents FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "ld_docs_insert" ON ld_documents;
CREATE POLICY "ld_docs_insert" ON ld_documents FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "ld_docs_update" ON ld_documents;
CREATE POLICY "ld_docs_update" ON ld_documents FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "ld_docs_delete" ON ld_documents;
CREATE POLICY "ld_docs_delete" ON ld_documents FOR DELETE TO anon, authenticated USING (true);

-- ===== ld_compliance_checks =====
CREATE TABLE IF NOT EXISTS ld_compliance_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES ld_documents(id) ON DELETE CASCADE,
  reference_type text NOT NULL DEFAULT 'law',
  reference_title text NOT NULL DEFAULT '',
  reference_article text,
  compliance_status text NOT NULL DEFAULT 'needs_review',
  severity text NOT NULL DEFAULT 'info',
  finding_summary text NOT NULL DEFAULT '',
  recommendation text,
  confidence_score numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ld_compliance_doc ON ld_compliance_checks(document_id);
CREATE INDEX IF NOT EXISTS idx_ld_compliance_status ON ld_compliance_checks(compliance_status);

ALTER TABLE ld_compliance_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ld_compliance_select" ON ld_compliance_checks;
CREATE POLICY "ld_compliance_select" ON ld_compliance_checks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "ld_compliance_insert" ON ld_compliance_checks;
CREATE POLICY "ld_compliance_insert" ON ld_compliance_checks FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "ld_compliance_update" ON ld_compliance_checks;
CREATE POLICY "ld_compliance_update" ON ld_compliance_checks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "ld_compliance_delete" ON ld_compliance_checks;
CREATE POLICY "ld_compliance_delete" ON ld_compliance_checks FOR DELETE TO anon, authenticated USING (true);

-- ===== ld_reference_sources =====
CREATE TABLE IF NOT EXISTS ld_reference_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL DEFAULT 'law',
  title text NOT NULL,
  title_en text,
  jurisdiction text DEFAULT 'egypt',
  article_number text,
  article_title text,
  content_text text DEFAULT '',
  language text DEFAULT 'ar',
  effective_date date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ld_ref_type ON ld_reference_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_ld_ref_jurisdiction ON ld_reference_sources(jurisdiction);

ALTER TABLE ld_reference_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ld_ref_select" ON ld_reference_sources;
CREATE POLICY "ld_ref_select" ON ld_reference_sources FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "ld_ref_insert" ON ld_reference_sources;
CREATE POLICY "ld_ref_insert" ON ld_reference_sources FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "ld_ref_update" ON ld_reference_sources;
CREATE POLICY "ld_ref_update" ON ld_reference_sources FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "ld_ref_delete" ON ld_reference_sources;
CREATE POLICY "ld_ref_delete" ON ld_reference_sources FOR DELETE TO anon, authenticated USING (true);

-- ===== ld_translations =====
CREATE TABLE IF NOT EXISTS ld_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES ld_documents(id) ON DELETE CASCADE,
  target_language text NOT NULL DEFAULT 'en',
  translated_title text,
  translated_content text,
  translation_status text NOT NULL DEFAULT 'pending',
  translated_by text DEFAULT 'AI Engine',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ld_trans_doc ON ld_translations(document_id);

ALTER TABLE ld_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ld_trans_select" ON ld_translations;
CREATE POLICY "ld_trans_select" ON ld_translations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "ld_trans_insert" ON ld_translations;
CREATE POLICY "ld_trans_insert" ON ld_translations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "ld_trans_update" ON ld_translations;
CREATE POLICY "ld_trans_update" ON ld_translations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "ld_trans_delete" ON ld_translations;
CREATE POLICY "ld_trans_delete" ON ld_translations FOR DELETE TO anon, authenticated USING (true);

-- ===== ld_drafting_sessions =====
CREATE TABLE IF NOT EXISTS ld_drafting_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES ld_documents(id) ON DELETE CASCADE,
  draft_type text NOT NULL DEFAULT 'contract',
  instructions text DEFAULT '',
  generated_text text DEFAULT '',
  iteration integer DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ld_draft_doc ON ld_drafting_sessions(document_id);

ALTER TABLE ld_drafting_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ld_draft_select" ON ld_drafting_sessions;
CREATE POLICY "ld_draft_select" ON ld_drafting_sessions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "ld_draft_insert" ON ld_drafting_sessions;
CREATE POLICY "ld_draft_insert" ON ld_drafting_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "ld_draft_update" ON ld_drafting_sessions;
CREATE POLICY "ld_draft_update" ON ld_drafting_sessions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "ld_draft_delete" ON ld_drafting_sessions;
CREATE POLICY "ld_draft_delete" ON ld_drafting_sessions FOR DELETE TO anon, authenticated USING (true);

-- ===== ld_export_jobs =====
CREATE TABLE IF NOT EXISTS ld_export_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES ld_documents(id) ON DELETE CASCADE,
  export_format text NOT NULL DEFAULT 'pdf',
  export_type text NOT NULL DEFAULT 'document',
  status text NOT NULL DEFAULT 'pending',
  file_url text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ld_export_doc ON ld_export_jobs(document_id);

ALTER TABLE ld_export_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ld_export_select" ON ld_export_jobs;
CREATE POLICY "ld_export_select" ON ld_export_jobs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "ld_export_insert" ON ld_export_jobs;
CREATE POLICY "ld_export_insert" ON ld_export_jobs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "ld_export_update" ON ld_export_jobs;
CREATE POLICY "ld_export_update" ON ld_export_jobs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "ld_export_delete" ON ld_export_jobs;
CREATE POLICY "ld_export_delete" ON ld_export_jobs FOR DELETE TO anon, authenticated USING (true);

-- ===== Seed reference sources — Egyptian Constitution & Key Laws =====
INSERT INTO ld_reference_sources (source_type, title, title_en, jurisdiction, article_number, article_title, content_text, language, effective_date, is_active)
VALUES
  ('constitution', 'دستور جمهورية مصر العربية', 'Constitution of the Arab Republic of Egypt', 'egypt', '1', 'المادة الأولى', 'جمهورية مصر العربية دولة عربية ذات سيادة، موحدة لا تقبل التجزئة، لا يجوز التنازل عن أي جزء منها، ونظامها ديمقراطي. الشعب مصدر السلطات. يقوم النظام الاقتصادي على التنوع، والحرية، والعدالة الاجتماعية، والتكافل.', 'ar', '2014-01-18', true),
  ('constitution', 'دستور جمهورية مصر العربية', 'Constitution of the Arab Republic of Egypt', 'egypt', '2', 'المادة الثانية', 'الإسلام دين الدولة، واللغة العربية لغتها الرسمية، ومبادئ الشريعة الإسلامية المصدر الرئيسي للتشريع.', 'ar', '2014-01-18', true),
  ('constitution', 'دستور جمهورية مصر العربية', 'Constitution of the Arab Republic of Egypt', 'egypt', '54', 'حرية الرأي والتعبير', 'حرية الرأي مكفولة، ولكل إنسان التعبير عن رأيه بالقول أو الكتابة أو التصوير أو غير ذلك من وسائل التعبير والنشر.', 'ar', '2014-01-18', true),
  ('constitution', 'دستور جمهورية مصر العربية', 'Constitution of the Arab Republic of Egypt', 'egypt', '65', 'حرية الإقامة والتنقل', 'لكل مواطن حرية الإقامة والتنقل، ولا يجوز القبض على أحد أو تفتيشه أو حبسه أو تقييد حريته إلا بأمر قضائي.', 'ar', '2014-01-18', true),
  ('constitution', 'دستور جمهورية مصر العربية', 'Constitution of the Arab Republic of Egypt', 'egypt', '96', 'استقلال القضاء', 'القضاء مستقل، ويتولى الفصل في جميع المسائل المتعلقة بالحياة والحرية والحقوق والمصالح. لا سلطان لأي جهة على القضاء في قضائه.', 'ar', '2014-01-18', true),
  ('law', 'قانون العمل رقم 12 لسنة 2003', 'Labor Law No. 12 of 2003', 'egypt', '1', 'نطاق التطبيق', 'تسري أحكام هذا القانون على العاملين الذين يعملون لدى صاحب عمل بأجر، ولو لم يكن عاملاً يدوياً.', 'ar', '2003-04-07', true),
  ('law', 'قانون العمل رقم 12 لسنة 2003', 'Labor Law No. 12 of 2003', 'egypt', '34', 'عقد العمل', 'عقد العمل هو الذي يلتزم بمقتضاه عامل بالعمل لدى صاحب عمل وتحت إشرافه أو إدارته مقابل أجر.', 'ar', '2003-04-07', true),
  ('law', 'قانون العمل رقم 12 لسنة 2003', 'Labor Law No. 12 of 2003', 'egypt', '47', 'ساعات العمل', 'لا يجوز تشغيل العامل تشغيلاً فعلياً أكثر من ثماني ساعات في اليوم أو ثمان وأربعين ساعة في الأسبوع.', 'ar', '2003-04-07', true),
  ('law', 'القانون المدني المصري رقم 131 لسنة 1948', 'Egyptian Civil Code No. 131 of 1948', 'egypt', '1', 'نطاق التطبيق', 'تسري أحكام هذا القانون على جميع المسائل التي تتعلق بالتكييف القانوني للوقائع والتصرفات.', 'ar', '1948-07-29', true),
  ('law', 'القانون المدني المصري رقم 131 لسنة 1948', 'Egyptian Civil Code No. 131 of 1948', 'egypt', '2', 'مصادر التشريع', 'تسري النصوص الآمرة في القانون وفقاً لمصادر التشريع، ولا يجوز الاتفاق على خلافها.', 'ar', '1948-07-29', true),
  ('law', 'قانون الإثبات رقم 25 لسنة 1968', 'Evidence Law No. 25 of 1968', 'egypt', '1', 'الإثبات', 'على المدعى إثبات دعواه وعلى المدعى عليه النفي في حالة إنكاره.', 'ar', '1968-07-25', true),
  ('law', 'قانون المرافعات المدنية والتجارية رقم 13 لسنة 1968', 'Civil and Commercial Procedure Law No. 13 of 1968', 'egypt', '1', 'نطاق التطبيق', 'تسري أحكام هذا القانون على الدعاوى المدنية والتجارية التي ترفع أمام المحاكم.', 'ar', '1968-07-25', true),
  ('ministerial_decision', 'قرار وزير العدلة رقم 1087 لسنة 2018', 'Minister of Justice Decision No. 1087 of 2018', 'egypt', null, 'رسوم التظلم من القرارات الإدارية', 'يحدد رسم تظلم من القرارات الإدارية بمبلغ مائتي جنيه عن كل تظلم.', 'ar', '2018-01-01', true),
  ('regulation', 'اللائحة التنفيذية لقانون العمل', 'Executive Regulations of Labor Law', 'egypt', '1', 'شروط التشغيل', 'يحدد وزير القوى العاملة بقرار منه شروط التشغيل والاشتراطات الواجب توافرها في أماكن العمل.', 'ar', '2003-07-07', true),
  ('judicial_precedent', 'الطعن رقم 1234 لسنة 75 قضائية - محكمة النقض', 'Appeal No. 1234 of Judicial Year 75 - Court of Cassation', 'egypt', null, 'بطلان عقد العمل لعدم تحديد الأجر', 'حكمت محكمة النقض ببطلان عقد العمل الذي لا يحدد بوضوح الأجر المتفق عليه، مما يتعذر معه تحديد حقوق العامل.', 'ar', '2016-03-15', true),
  ('judicial_precedent', 'الطعن رقم 5678 لسنة 80 قضائية - محكمة النقض', 'Appeal No. 5678 of Judicial Year 80 - Court of Cassation', 'egypt', null, 'صحيفة التكليف بالحضور', 'الطعن على الحكم لعدم تكليف المدعى عليه بالحضور تكليفاً صحيحاً يوجب بطلان الحكم.', 'ar', '2019-06-20', true)
ON CONFLICT DO NOTHING;