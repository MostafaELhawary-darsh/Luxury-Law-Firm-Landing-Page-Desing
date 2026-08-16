import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ===== Arabic Normalization =====
function normalizeArabic(text: string): string {
  return text
    .replace(/[\u064B-\u0652]/g, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

// ===== Entity Extraction (Regex-based, runs locally) =====
interface ExtractedEntity {
  type: string;
  value: string;
  position: number;
  method: string;
}

interface LegalTerm {
  term: string;
  category: string;
  suggestion: string;
}

const LEGAL_TERMS_DB: { term: string; category: string; suggestion: string }[] = [
  { term: "التعويض", category: "compensation", suggestion: "تحديد نوع التعويض: تعويض عن الضرر المادي/الأدبي" },
  { term: "الفسخ", category: "contract_termination", suggestion: "بيان سبب الفسخ والإجراءات القانونية" },
  { term: "الدفع", category: "legal_defense", suggestion: "تصنيف الدفع: شكلي/موضوعي/عدم قبول" },
  { term: "الالتزام", category: "obligation", suggestion: "تحديد طرف الالتزام ومحله" },
  { term: "الضرر", category: "damages", suggestion: "بيان نوع الضرر: مباشر/غير مباشر، مادي/أدبي" },
  { term: "المسؤولية", category: "liability", suggestion: "تحديد نوع المسؤولية: تقصيرية/عقدية" },
  { term: "التقادم", category: "statute_limitation", suggestion: "بيان مدة التقادم ونقطة بدايته" },
  { term: "التماس", category: "filing", suggestion: "تحديد نوع الالتماس ومستنداته" },
  { term: "الحجز", category: "seizure", suggestion: "بيان نوع الحجز: تحفظي/تنفيذي" },
  { term: "الطعن", category: "appeal", suggestion: "تحديد نوع الطعن: استئناف/نقض/تمييز" },
  { term: "الوكالة", category: "representation", suggestion: "التأكد من سند الوكالة ونطاقه" },
  { term: "الخبرة", category: "expertise", suggestion: "تحديد نوع الخبرة المطلوبة" },
  { term: "اليمين", category: "oath", suggestion: "بيان نوع اليمين: حاسمة/متممة" },
  { term: "الصلح", category: "settlement", suggestion: "التأكد من شروط الصلح وإثباتها" },
  { term: "الإفلاس", category: "bankruptcy", suggestion: "تحديد إجراءات الإفلاس وآثاره" },
  { term: "الرهن", category: "mortgage", suggestion: "بيان نوع الرهن: حيازي/غير حيازي" },
  { term: "الإيجار", category: "lease", suggestion: "تحديد نوع العقد ومدته والمدة القانونية" },
  { term: "التأخير", category: "delay_penalty", suggestion: "احتساب تعويض التأخير وفقاً للسعر القانوني" },
  { term: "الفوائد", category: "interest", suggestion: "بيان نوع الفائدة: قانونية/اتفاقية وحدودها" },
  { term: "الكفالة", category: "guarantee", suggestion: "تحديد نوع الكفالة: كفالة بالنفس/كفالة بالمال" },
];

function extractEntities(text: string): { entities: ExtractedEntity[]; maskedText: string } {
  const entities: ExtractedEntity[] = [];
  let maskedText = text;
  let counter = 1;

  const patterns: { type: string; regex: RegExp; method: string }[] = [
    { type: "NATIONAL_ID", regex: /\b[23]\d{13}\b/g, method: "regex" },
    { type: "CASE_NUMBER", regex: /(?:قضية|دعوى|طعن|حصر|رقم)\s*(?:رقم)?\s*(\d+)\s*(?:لسنة|\/)\s*(\d{2,4})\s*(?:ق|\d+)?/g, method: "regex" },
    { type: "FINANCIAL_AMOUNT", regex: /(\d+(?:[,\d]*)*(?:\.\d+)?)\s*(?:جنيه|ريال|دولار|درهم|جم|ر\.س)/g, method: "regex" },
    { type: "COMMERCIAL_REG", regex: /(?:سجل\s*تجاري|س\.ت)\s*(?:رقم)?\s*(\d+)/g, method: "regex" },
    { type: "PHONE", regex: /\b01[0-9]{9}\b/g, method: "regex" },
    { type: "EMAIL", regex: /[\w.+-]+@[\w-]+\.[\w.-]+/g, method: "regex" },
    { type: "BANK_ACCOUNT", regex: /\b\d{16,22}\b/g, method: "regex" },
    { type: "PARTY_NAME", regex: /(?:السيد|السيدة|المواطن|الخصم|المدعي|المدعية|المدعى عليه|المدعى عليها|المجني عليه|المجني عليها)\s*\/?\s*([^\n،\.]+)/g, method: "contextual_anchor" },
    { type: "COMPANY_NAME", regex: /(?:شركة|مؤسسة|منشأة)\s*\/?\s*([^\n،\.]+)/g, method: "contextual_anchor" },
    { type: "LOCATION", regex: /(?:المقيم\s*(?:في|بـ?)|الكائن\s*مقرها?\s*بـ?|الموطن\s*المختار\s*(?:في|بـ?))\s*([^\n،\.]+)/g, method: "contextual_anchor" },
  ];

  for (const { type, regex, method } of patterns) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      const original = match[0];
      const namePart = match[1] ? match[1].trim() : original;
      const cleanName = namePart.split(/\s+/).slice(0, 4).join(" ");

      if (cleanName.length > 3) {
        const placeholder = `[${type}_${counter}]`;
        entities.push({ type, value: cleanName, position: match.index, method });
        maskedText = maskedText.replace(cleanName, placeholder);
        counter++;
      }
    }
  }

  return { entities, maskedText };
}

function detectLegalTerms(text: string): LegalTerm[] {
  const normalized = normalizeArabic(text);
  const found: LegalTerm[] = [];
  const seen = new Set<string>();

  for (const entry of LEGAL_TERMS_DB) {
    const normalizedTerm = normalizeArabic(entry.term);
    if (normalized.includes(normalizedTerm) && !seen.has(entry.term)) {
      found.push(entry);
      seen.add(entry.term);
    }
  }

  return found;
}

function detectRiskFlags(text: string, entities: ExtractedEntity[], terms: LegalTerm[]): string[] {
  const flags: string[] = [];
  const normalized = normalizeArabic(text);

  if (entities.some((e) => e.type === "NATIONAL_ID")) {
    flags.push("contain_national_ids");
  }
  if (entities.some((e) => e.type === "BANK_ACCOUNT")) {
    flags.push("contain_bank_accounts");
  }
  if (entities.some((e) => e.type === "FINANCIAL_AMOUNT")) {
    const amounts = entities.filter((e) => e.type === "FINANCIAL_AMOUNT");
    flags.push(`financial_disclosure_${amounts.length}_amounts`);
  }
  if (normalized.includes("سر") || normalized.includes("سرى") || normalized.includes("استشارات")) {
    flags.push("confidentiality_clause_present");
  }
  if (terms.some((t) => t.term === "التقادم")) {
    flags.push("statute_of_limitation_referenced");
  }
  if (terms.some((t) => t.term === "الفوائد") || terms.some((t) => t.term === "التأخير")) {
    flags.push("interest_penalty_calculation_needed");
  }

  return flags;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const url = new URL(req.url);
  const path = url.pathname.replace("/functions/v1/local-nlp-engine", "");

  try {
    // POST /analyze — Run local NLP analysis on document text
    if (path === "/analyze" && req.method === "POST") {
      const body = await req.json();
      const { text, document_id, processing_type } = body;

      if (!text || !document_id) {
        return json({ error: "text and document_id are required" }, 400);
      }

      const startTime = Date.now();
      const pType = processing_type || "entity_extraction";

      // Step 1: Extract entities (all local, no external calls)
      const { entities, maskedText } = extractEntities(text);

      // Step 2: Detect legal terms
      const legalTerms = detectLegalTerms(text);

      // Step 3: Detect risk flags
      const riskFlags = detectRiskFlags(text, entities, legalTerms);

      const processingMs = Date.now() - startTime;

      // Step 4: Store processing log
      const { data: logData, error: logError } = await supabase
        .from("m114_nlp_processing_logs")
        .insert({
          document_id,
          processing_type: pType,
          entities_found: entities,
          legal_terms_found: legalTerms,
          risk_flags: riskFlags,
          anonymized_preview: pType === "anonymization" ? maskedText.slice(0, 500) : null,
          entity_count: entities.length,
          term_count: legalTerms.length,
          processing_ms: processingMs,
          privacy_status: "local_only",
        })
        .select()
        .single();

      if (logError) {
        return json({ error: "Failed to store NLP log", detail: logError.message }, 500);
      }

      // Step 5: Log to editor audit
      const { data: lastAudit } = await supabase
        .from("m114_editor_audit")
        .select("hash_chain")
        .order("created_at", { ascending: false })
        .limit(1);

      const previousHash = lastAudit?.[0]?.hash_chain || "00000000";
      let hash = 0;
      const hashInput = `${previousHash}-nlp-${document_id}-${Date.now()}`;
      for (let i = 0; i < hashInput.length; i++) {
        hash = ((hash << 5) - hash) + hashInput.charCodeAt(i);
        hash = Math.abs(hash);
      }
      const newHash = hash.toString(16).padStart(8, "0");

      await supabase.from("m114_editor_audit").insert({
        document_id,
        action: "nlp_processed",
        actor: "local-nlp-engine",
        actor_role: "system",
        detail: `معالجة لغوية محلية: ${entities.length} كيان، ${legalTerms.length} مصطلح قانوني — ${processingMs}ms — البيانات لم تغادر الخادم`,
        hash_chain: newHash,
        previous_hash: previousHash,
        accessed_fields: ["document_text"],
      });

      return json({
        success: true,
        document_id,
        processing_type: pType,
        entities,
        legal_terms: legalTerms,
        risk_flags: riskFlags,
        anonymized_preview: pType === "anonymization" ? maskedText : undefined,
        entity_count: entities.length,
        term_count: legalTerms.length,
        processing_ms: processingMs,
        privacy_status: "local_only",
        privacy_guarantee: "جميع المعالجات تمت محلياً — لم يتم إرسال أي بيانات خارج الخوادم المحلية",
        log_id: logData?.id,
      });
    }

    // POST /anonymize — Full anonymization with masked text return
    if (path === "/anonymize" && req.method === "POST") {
      const body = await req.json();
      const { text, document_id } = body;

      if (!text || !document_id) {
        return json({ error: "text and document_id are required" }, 400);
      }

      const startTime = Date.now();
      const { entities, maskedText } = extractEntities(text);
      const legalTerms = detectLegalTerms(text);
      const riskFlags = detectRiskFlags(text, entities, legalTerms);
      const processingMs = Date.now() - startTime;

      const { error: logError } = await supabase
        .from("m114_nlp_processing_logs")
        .insert({
          document_id,
          processing_type: "anonymization",
          entities_found: entities,
          legal_terms_found: legalTerms,
          risk_flags: riskFlags,
          anonymized_preview: maskedText.slice(0, 500),
          entity_count: entities.length,
          term_count: legalTerms.length,
          processing_ms: processingMs,
          privacy_status: "local_only",
        });

      if (logError) {
        return json({ error: "Failed to store anonymization log", detail: logError.message }, 500);
      }

      return json({
        success: true,
        document_id,
        masked_text: maskedText,
        entities,
        entity_count: entities.length,
        processing_ms: processingMs,
        privacy_status: "local_only",
        privacy_guarantee: "التجهيل تم محلياً — النص الأصلي لم يغادر الخادم",
      });
    }

    // GET /history — Fetch NLP processing history for a document
    if (path === "/history" && req.method === "GET") {
      const documentId = url.searchParams.get("document_id");
      if (!documentId) {
        return json({ error: "document_id is required" }, 400);
      }

      const { data, error } = await supabase
        .from("m114_nlp_processing_logs")
        .select("*")
        .eq("document_id", documentId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        return json({ error: "Failed to fetch history", detail: error.message }, 500);
      }

      return json({ success: true, logs: data || [] });
    }

    // GET /legal-terms — Return the legal terms dictionary
    if (path === "/legal-terms" && req.method === "GET") {
      return json({ success: true, terms: LEGAL_TERMS_DB });
    }

    return json({ error: "endpoint not found" }, 404);
  } catch (err) {
    return json({ error: "internal error", detail: String(err) }, 500);
  }
});
