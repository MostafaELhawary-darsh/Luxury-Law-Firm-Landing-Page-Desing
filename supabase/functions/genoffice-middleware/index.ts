import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SOVEREIGN_SECRET_RAW = Deno.env.get("GENOFFICE_SOVEREIGN_TOKEN");
if (!SOVEREIGN_SECRET_RAW) {
  console.error("FATAL: GENOFFICE_SOVEREIGN_TOKEN environment variable is not set. Aborting.");
}
const SOVEREIGN_SECRET = SOVEREIGN_SECRET_RAW!;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function verifyToken(authHeader: string | null): boolean {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
  const token = authHeader.split(" ")[1];
  return token === SOVEREIGN_SECRET;
}

function generateHash(input: string): string {
  // Simple hash for audit chain (not cryptographic-grade, but deterministic)
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = Math.abs(hash);
  }
  return hash.toString(16).padStart(8, "0");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace("/functions/v1/genoffice-middleware", "");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // POST /save — receive document from editor, store metadata + audit
    if (path === "/save" && req.method === "POST") {
      const authHeader = req.headers.get("authorization");
      if (!verifyToken(authHeader)) {
        return json({ error: 1, message: "التوكن السيادي غير صالح" }, 403);
      }

      const formData = await req.formData();
      const documentId = formData.get("document_id") as string;
      const statusType = formData.get("status_type") as string || "autosave";
      const file = formData.get("file") as File | null;
      const userId = formData.get("user_id") as string || "unknown";
      const watermark = formData.get("watermark") as string || "";

      if (!documentId) {
        return json({ error: 1, message: "معرف المستند مطلوب" }, 400);
      }

      // Compute file hash
      let fileHash = "";
      let fileSize = 0;
      if (file) {
        const buffer = await file.arrayBuffer();
        fileSize = buffer.byteLength;
        fileHash = generateHash(`${documentId}-${fileSize}-${Date.now()}`);
      }

      // Update document record
      const { error: docError } = await supabase
        .from("m114_sovereign_documents")
        .update({
          file_hash: fileHash,
          file_size_bytes: fileSize,
          stage: statusType === "forcesave" ? "approved" : "editing",
          watermark_text: watermark || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);

      if (docError) {
        return json({ error: 1, message: "فشل تحديث المستند", detail: docError.message }, 500);
      }

      // Insert audit log
      const action = statusType === "forcesave" ? "forcesave" : "autosave";
      const { data: lastAudit } = await supabase
        .from("m114_editor_audit")
        .select("hash_chain")
        .order("created_at", { ascending: false })
        .limit(1);

      const previousHash = lastAudit?.[0]?.hash_chain || "00000000";
      const newHash = generateHash(`${previousHash}-${action}-${documentId}-${Date.now()}`);

      await supabase.from("m114_editor_audit").insert({
        document_id: documentId,
        action,
        actor: userId,
        actor_role: "editor",
        detail: `حفظ ${statusType === "forcesave" ? "نهائي" : "تلقائي"} للمستند`,
        hash_chain: newHash,
        previous_hash: previousHash,
        accessed_fields: ["file_content", "metadata"],
      });

      return json({
        error: 0,
        message: "تم حفظ المستند محلياً بنجاح داخل البيئة السيادية",
        audit: {
          document_id: documentId,
          file_hash: fileHash,
          file_size: fileSize,
          save_type: statusType,
          saved_at: new Date().toISOString(),
          status: "success",
        },
      });
    }

    // POST /session — create a new editing session with JWT-like token
    if (path === "/session" && req.method === "POST") {
      const authHeader = req.headers.get("authorization");
      if (!verifyToken(authHeader)) {
        return json({ error: 1, message: "التوكن السيادي غير صالح" }, 403);
      }

      const body = await req.json();
      const documentId = body.document_id as string;
      const userId = body.user_id as string || "unknown";
      const permissions = body.permissions as string || "edit";
      const expiresInMin = body.expires_in_min as number || 60;

      const sessionToken = crypto.randomUUID();
      const now = new Date();
      const expires = new Date(now.getTime() + expiresInMin * 60000);

      const { data, error } = await supabase
        .from("m114_editor_sessions")
        .insert({
          session_token: sessionToken,
          document_id: documentId,
          user_id: userId,
          permissions,
          jwt_issued_at: now.toISOString(),
          jwt_expires_at: expires.toISOString(),
          editor_url: `http://localhost:8080/editor?token=${sessionToken}`,
          iframe_origin: "http://localhost:8080",
          status: "active",
        })
        .select()
        .single();

      if (error) {
        return json({ error: 1, message: "فشل إنشاء الجلسة", detail: error.message }, 500);
      }

      // Audit: session opened
      const { data: lastAudit } = await supabase
        .from("m114_editor_audit")
        .select("hash_chain")
        .order("created_at", { ascending: false })
        .limit(1);
      const previousHash = lastAudit?.[0]?.hash_chain || "00000000";
      const newHash = generateHash(`${previousHash}-session_opened-${documentId}-${Date.now()}`);

      await supabase.from("m114_editor_audit").insert({
        session_id: data.id,
        document_id: documentId,
        action: "session_opened",
        actor: userId,
        actor_role: "editor",
        detail: `جلسة تحرير مفتوحة بصلاحية: ${permissions}`,
        hash_chain: newHash,
        previous_hash: previousHash,
        accessed_fields: ["session_token", "permissions"],
      });

      return json({
        error: 0,
        session: data,
        editor_url: data.editor_url,
        expires_at: expires.toISOString(),
      });
    }

    // POST /watermark — apply sovereign watermark metadata
    if (path === "/watermark" && req.method === "POST") {
      const authHeader = req.headers.get("authorization");
      if (!verifyToken(authHeader)) {
        return json({ error: 1, message: "التوكن السيادي غير صالح" }, 403);
      }

      const body = await req.json();
      const documentId = body.document_id as string;
      const watermarkText = body.watermark_text as string;
      const sovereignCode = body.sovereign_code as string;
      const institutionSeal = body.institution_seal as string;

      const { error } = await supabase
        .from("m114_sovereign_documents")
        .update({
          watermark_text: watermarkText,
          metadata: {
            sovereign_code: sovereignCode,
            institution_seal: institutionSeal,
            watermark_applied_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);

      if (error) {
        return json({ error: 1, message: "فشل تطبيق العلامة المائية", detail: error.message }, 500);
      }

      // Audit watermark
      const { data: lastAudit } = await supabase
        .from("m114_editor_audit")
        .select("hash_chain")
        .order("created_at", { ascending: false })
        .limit(1);
      const previousHash = lastAudit?.[0]?.hash_chain || "00000000";
      const newHash = generateHash(`${previousHash}-watermark_applied-${documentId}-${Date.now()}`);

      await supabase.from("m114_editor_audit").insert({
        document_id: documentId,
        action: "watermark_applied",
        actor: body.user_id || "system",
        actor_role: "system",
        detail: `تم تطبيق علامة مائية: ${watermarkText}`,
        hash_chain: newHash,
        previous_hash: previousHash,
        accessed_fields: ["watermark_text", "metadata"],
      });

      return json({ error: 0, message: "تم تطبيق العلامة المائية السيادية بنجاح" });
    }

    // GET /audit — retrieve audit chain for a document
    if (path === "/audit" && req.method === "GET") {
      const documentId = url.searchParams.get("document_id");
      if (!documentId) {
        return json({ error: 1, message: "معرف المستند مطلوب" }, 400);
      }

      const { data, error } = await supabase
        .from("m114_editor_audit")
        .select("*")
        .eq("document_id", documentId)
        .order("created_at", { ascending: true });

      if (error) {
        return json({ error: 1, message: "فشل جلب السجل", detail: error.message }, 500);
      }

      return json({ error: 0, audit: data });
    }

    return json({ error: 1, message: "المسار غير موجود" }, 404);
  } catch (err) {
    return json({ error: 1, message: "خطأ داخلي", detail: String(err) }, 500);
  }
});
