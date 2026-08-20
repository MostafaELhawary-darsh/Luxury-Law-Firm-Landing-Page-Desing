import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders as getCorsHeaders, preflight, requirePrivilegedUser } from "../_shared/security.ts";

// HMAC-SHA256 signing key — must be set via environment, fail-closed if missing
const SECRET_KEY_RAW = Deno.env.get("DEEPLINK_HMAC_SECRET");
if (!SECRET_KEY_RAW) {
  throw new Error("FATAL: DEEPLINK_HMAC_SECRET environment variable is not set. Aborting.");
}
const SECRET_KEY = SECRET_KEY_RAW;
const LINK_TTL_MINUTES = 30;

// Simple HMAC-SHA256 implementation using Web Crypto API
async function hmacSign(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function hmacVerify(message: string, signature: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const sigBytes = Uint8Array.from(atob(signature.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
  return crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(message));
}

// Base64url encode/decode
function b64urlEncode(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): string {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return atob(str);
}

// Generate a signed token
async function generateToken(subscriberId: string, docId: string): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + (LINK_TTL_MINUTES * 60);
  const payload = {
    sub: subscriberId,
    doc_id: docId,
    iss: "LOCC_ONPREM_GATEWAY",
    iat: issuedAt,
    exp: expiresAt,
  };
  const payloadB64 = b64urlEncode(JSON.stringify(payload));
  const signature = await hmacSign(payloadB64);
  return `${payloadB64}.${signature}`;
}

// Verify a signed token
async function verifyToken(token: string): Promise<{ payload: any; valid: boolean; reason: string }> {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) {
      return { payload: null, valid: false, reason: "invalid_format" };
    }
    const [payloadB64, signature] = parts;
    const valid = await hmacVerify(payloadB64, signature);
    if (!valid) {
      return { payload: null, valid: false, reason: "invalid_signature" };
    }
    const payload = JSON.parse(b64urlDecode(payloadB64));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return { payload, valid: false, reason: "expired" };
    }
    return { payload, valid: true, reason: "ok" };
  } catch {
    return { payload: null, valid: false, reason: "invalid_token" };
  }
}

// Generate a cryptographically secure 6-digit OTP code
function generateOtp(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0] % 900000 + 100000).padStart(6, "0");
}

Deno.serve(async (req: Request) => {
  const corsResponse = preflight(req);
  if (corsResponse) return corsResponse;
  const corsHeaders = getCorsHeaders(req);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);
  const path = url.pathname;

  try {
    if (path.endsWith("/generate") || path.endsWith("/revoke")) {
      const authorization = await requirePrivilegedUser(supabase, req);
      if ("response" in authorization) return authorization.response;
    }
    // ===== POST /generate — Generate a secure deep link =====
    if (path.endsWith("/generate") && req.method === "POST") {
      const body = await req.json();
      const { subscriber_id, doc_id, doc_title, trello_card_id } = body;

      if (!subscriber_id || !doc_id) {
        return new Response(JSON.stringify({ error: "subscriber_id and doc_id are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = await generateToken(subscriber_id, doc_id);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + LINK_TTL_MINUTES * 60 * 1000);

      const { data, error } = await supabase.from("laas_deep_link_tokens").insert({
        token,
        subscriber_id,
        doc_id,
        doc_title: doc_title || "مستند قانوني",
        trello_card_id: trello_card_id || null,
        issued_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        is_one_time: true,
      }).select().single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Log token generation
      await supabase.from("laas_document_access_logs").insert({
        token_id: data.id,
        subscriber_id,
        doc_id,
        access_type: "token_generated",
        result: "success",
      });

      const baseUrl = Deno.env.get("PUBLIC_BASE_URL") || "https://secure.firm.com";
      const deepLink = `${baseUrl}/v1/auth/claim?token=${token}`;

      return new Response(JSON.stringify({
        success: true,
        token,
        deep_link: deepLink,
        expires_at: expiresAt.toISOString(),
        ttl_minutes: LINK_TTL_MINUTES,
        token_id: data.id,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== POST /verify — Verify a token (DMZ Gateway step) =====
    if (path.endsWith("/verify") && req.method === "POST") {
      const body = await req.json();
      const { token, ip_address, user_agent } = body;

      if (!token) {
        return new Response(JSON.stringify({ error: "token is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check token in DB
      const { data: tokenRecord } = await supabase.from("laas_deep_link_tokens")
        .select("*")
        .eq("token", token)
        .maybeSingle();

      if (!tokenRecord) {
        await supabase.from("laas_document_access_logs").insert({
          subscriber_id: null,
          doc_id: "unknown",
          access_type: "access_denied",
          ip_address, user_agent,
          result: "invalid_token",
        });
        return new Response(JSON.stringify({ error: "رابط غير صالح أو تم التلاعب به" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check revocation
      if (tokenRecord.is_revoked) {
        await supabase.from("laas_document_access_logs").insert({
          token_id: tokenRecord.id,
          subscriber_id: tokenRecord.subscriber_id,
          doc_id: tokenRecord.doc_id,
          access_type: "token_revoked",
          ip_address, user_agent,
          result: "revoked",
        });
        return new Response(JSON.stringify({ error: "تم إلغاء صلاحية هذا الرابط" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check one-time usage
      if (tokenRecord.is_one_time && tokenRecord.used_at) {
        await supabase.from("laas_document_access_logs").insert({
          token_id: tokenRecord.id,
          subscriber_id: tokenRecord.subscriber_id,
          doc_id: tokenRecord.doc_id,
          access_type: "access_denied",
          ip_address, user_agent,
          result: "already_used",
        });
        return new Response(JSON.stringify({ error: "تم استخدام هذا الرابط مسبقاً — الرابط لمرة واحدة فقط" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify HMAC signature and expiry
      const verification = await verifyToken(token);
      if (!verification.valid) {
        const result = verification.reason === "expired" ? "expired" : "invalid_signature";
        await supabase.from("laas_document_access_logs").insert({
          token_id: tokenRecord.id,
          subscriber_id: tokenRecord.subscriber_id,
          doc_id: tokenRecord.doc_id,
          access_type: verification.reason === "expired" ? "token_expired" : "access_denied",
          ip_address, user_agent,
          result,
        });
        const msg = verification.reason === "expired"
          ? "انتهت صلاحية هذا الرابط. يمكنك طلب رابط جديد من لوحة Trello"
          : "رابط غير صالح أو تم التلاعب به";
        return new Response(JSON.stringify({ error: msg }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark as used (one-time enforcement) — atomic conditional update to prevent race
      const { data: updatedRows } = await supabase.from("laas_deep_link_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("id", tokenRecord.id)
        .is("used_at", null)
        .select();

      if (!updatedRows || updatedRows.length === 0) {
        await supabase.from("laas_document_access_logs").insert({
          token_id: tokenRecord.id,
          subscriber_id: tokenRecord.subscriber_id,
          doc_id: tokenRecord.doc_id,
          access_type: "access_denied",
          ip_address, user_agent,
          result: "already_used",
        });
        return new Response(JSON.stringify({ error: "تم استخدام هذا الرابط مسبقاً — الرابط لمرة واحدة فقط" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Log verification
      await supabase.from("laas_document_access_logs").insert({
        token_id: tokenRecord.id,
        subscriber_id: tokenRecord.subscriber_id,
        doc_id: tokenRecord.doc_id,
        access_type: "token_verified",
        ip_address, user_agent,
        result: "success",
      });

      // Check for active MFA session
      const { data: mfaSession } = await supabase.from("laas_mfa_sessions")
        .select("*")
        .eq("subscriber_id", tokenRecord.subscriber_id)
        .eq("mfa_verified", true)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!mfaSession) {
        // Generate MFA challenge
        const otp = generateOtp();
        const sessionToken = crypto.randomUUID();
        const sessionExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min for MFA challenge

        await supabase.from("laas_mfa_sessions").insert({
          subscriber_id: tokenRecord.subscriber_id,
          session_token: sessionToken,
          mfa_verified: false,
          otp_code: otp,
          challenge_at: new Date().toISOString(),
          expires_at: sessionExpiry.toISOString(),
          ip_address,
          user_agent,
        });

        await supabase.from("laas_document_access_logs").insert({
          token_id: tokenRecord.id,
          subscriber_id: tokenRecord.subscriber_id,
          doc_id: tokenRecord.doc_id,
          access_type: "mfa_challenged",
          ip_address, user_agent,
          result: "success",
        });

        return new Response(JSON.stringify({
          verified: true,
          mfa_required: true,
          session_token: sessionToken,
          message: "مطلوب توثيق MFA — تم إرسال رمز التحقق",
        }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // MFA already verified — stream document
      await supabase.from("laas_document_access_logs").insert({
        token_id: tokenRecord.id,
        subscriber_id: tokenRecord.subscriber_id,
        doc_id: tokenRecord.doc_id,
        access_type: "document_streamed",
        ip_address, user_agent,
        result: "success",
      });

      return new Response(JSON.stringify({
        verified: true,
        mfa_required: false,
        doc_id: tokenRecord.doc_id,
        doc_title: tokenRecord.doc_title,
        subscriber_id: tokenRecord.subscriber_id,
        message: "تم التحقق — جاري بث المستند",
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== POST /mfa-verify — Verify OTP code =====
    if (path.endsWith("/mfa-verify") && req.method === "POST") {
      const body = await req.json();
      const { session_token, otp_code, ip_address, user_agent } = body;

      if (!session_token || !otp_code) {
        return new Response(JSON.stringify({ error: "session_token and otp_code are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: session } = await supabase.from("laas_mfa_sessions")
        .select("*")
        .eq("session_token", session_token)
        .maybeSingle();

      if (!session) {
        return new Response(JSON.stringify({ error: "جلسة غير صالحة" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (new Date(session.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "انتهت صلاحية جلسة التوثيق" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (session.otp_code !== otp_code) {
        return new Response(JSON.stringify({ error: "رمز التحقق غير صحيح" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark MFA as verified
      const verifiedExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour session
      await supabase.from("laas_mfa_sessions").update({
        mfa_verified: true,
        verified_at: new Date().toISOString(),
        expires_at: verifiedExpiry.toISOString(),
      }).eq("id", session.id);

      await supabase.from("laas_document_access_logs").insert({
        subscriber_id: session.subscriber_id,
        doc_id: "mfa_session",
        access_type: "mfa_verified",
        ip_address, user_agent,
        result: "success",
      });

      return new Response(JSON.stringify({
        success: true,
        message: "تم التوثيق بنجاح — يمكنك الوصول للمستند",
        session_expires_at: verifiedExpiry.toISOString(),
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== POST /revoke — Revoke a token manually =====
    if (path.endsWith("/revoke") && req.method === "POST") {
      const body = await req.json();
      const { token_id } = body;

      if (!token_id) {
        return new Response(JSON.stringify({ error: "token_id is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("laas_deep_link_tokens").update({
        is_revoked: true,
      }).eq("id", token_id);

      return new Response(JSON.stringify({ success: true, message: "تم إلغاء الرابط" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "endpoint not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("deep-link-verify error:", err);
    return new Response(JSON.stringify({ error: "internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
