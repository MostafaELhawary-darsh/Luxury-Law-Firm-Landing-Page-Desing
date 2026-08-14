import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// HMAC pepper for blind indexing — must be set via environment, fail-closed if missing
const HMAC_PEPPER_RAW = Deno.env.get("DLP_HMAC_PEPPER");
if (!HMAC_PEPPER_RAW) {
  throw new Error("FATAL: DLP_HMAC_PEPPER environment variable is not set. Aborting.");
}
const HMAC_PEPPER = HMAC_PEPPER_RAW;

// Master KEK for envelope encryption — must be set via environment, fail-closed if missing
const MASTER_KEK_RAW = Deno.env.get("DLP_MASTER_KEK");
if (!MASTER_KEK_RAW) {
  throw new Error("FATAL: DLP_MASTER_KEK environment variable is not set. Aborting.");
}
const MASTER_KEK = MASTER_KEK_RAW;

// ===== Arabic Normalization =====
function normalizeArabic(text: string): string {
  return text
    .replace(/[\u064B-\u0652]/g, "") // remove diacritics
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

// ===== HMAC-SHA256 for blind indexing =====
async function computeBlindIndex(docId: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(HMAC_PEPPER),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(docId));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ===== AES-256-GCM Encryption (Envelope) =====
async function generateDek(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

async function encryptWithKey(key: CryptoKey, plaintext: Uint8Array): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return { ciphertext, iv };
}

async function decryptWithKey(key: CryptoKey, ciphertext: ArrayBuffer, iv: Uint8Array): Promise<string> {
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

async function exportKey(key: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey("raw", key);
}

async function importKey(raw: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
}

// Get master KEK as CryptoKey (latest active version)
async function getMasterKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = await crypto.subtle.digest("SHA-256", encoder.encode(MASTER_KEK));
  return crypto.subtle.importKey("raw", keyData, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
}

// Versioned KEK derivation — simulates Vault Transit key versions
// Each version derives a distinct KEK by hashing MASTER_KEK + version
async function getMasterKeyForVersion(version: number): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const versionedSeed = `${MASTER_KEK}::v${version}`;
  const keyData = await crypto.subtle.digest("SHA-256", encoder.encode(versionedSeed));
  return crypto.subtle.importKey("raw", keyData, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
}

// Fetch the current active encryption version from the database
async function getActiveKeyVersion(supabase: any): Promise<number> {
  const { data, error } = await supabase.from("laas_vault_key_versions")
    .select("version")
    .eq("key_name", "master-kek-unmasking")
    .eq("is_encryption_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn("Failed to fetch active key version, defaulting to 1:", error.message);
    return 1;
  }
  return data?.version || 1;
}

// Build Vault-style versioned ciphertext string: vault:v{N}:{base64}
function buildVaultCiphertext(version: number, encryptedDekBlob: Uint8Array): string {
  const b64 = btoa(String.fromCharCode(...encryptedDekBlob));
  return `vault:v${version}:${b64}`;
}

// Parse Vault-style ciphertext: returns { version, blob }
function parseVaultCiphertext(vaultCiphertext: string): { version: number; blob: Uint8Array } | null {
  const match = vaultCiphertext.match(/^vault:v(\d+):(.+)$/);
  if (!match) return null;
  const version = parseInt(match[1], 10);
  const b64 = match[2];
  const blob = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return { version, blob };
}

// ===== Arabic Legal DLP Engine =====
interface DlpEntity {
  type: string;
  original: string;
  placeholder: string;
  method: string;
}

function extractEntities(text: string): { entities: DlpEntity[]; maskedText: string } {
  const entities: DlpEntity[] = [];
  let maskedText = text;
  let counter = 1;

  // 1. Structured patterns (Regex)
  const patterns: { type: string; regex: RegExp; method: string }[] = [
    { type: "NATIONAL_ID", regex: /\b[23]\d{13}\b/g, method: "regex" },
    { type: "CASE_NUMBER", regex: /(?:قضية|دعوى|طعن|حصر|رقم)\s*(?:رقم)?\s*(\d+)\s*(?:لسنة|\/)\s*(\d{2,4})\s*(?:ق|\d+)?/g, method: "regex" },
    { type: "FINANCIAL_AMOUNT", regex: /(\d+(?:[,\d]*)*(?:\.\d+)?)\s*(?:جنيه|ريال|دولار|درهم|جم|ر\.س)/g, method: "regex" },
    { type: "COMMERCIAL_REG", regex: /(?:سجل\s*تجاري|س\.ت)\s*(?:رقم)?\s*(\d+)/g, method: "regex" },
  { type: "DOC_REF", regex: /(?:المحرر\s*رقم|رقم\s*الشيك|العقد\s*المؤرخ\s*في)\s*(\d+)/g, method: "regex" },
  { type: "LOCATION", regex: /(?:المقيم\s*(?:في|بـ?)|الكائن\s*مقرها?\s*بـ?|الموطن\s*المختار\s*(?:في|بـ?))\s*([^\n،\.]+)/g, method: "contextual_anchor" },
  { type: "PARTY_NAME", regex: /(?:السيد|السيدة|المواطن|الخصم|المدعي|المدعية|المدعى عليه|المدعى عليها|المجني عليه|المجني عليها)\s*\/?\s*([^\n،\.]+)/g, method: "contextual_anchor" },
    { type: "COMPANY_NAME", regex: /(?:شركة|مؤسسة|منشأة)\s*\/?\s*([^\n،\.]+)/g, method: "contextual_anchor" },
  ];

  for (const { type, regex, method } of patterns) {
    let match;
    while ((match = regex.exec(maskedText)) !== null) {
      const original = match[0];
      const namePart = match[1] ? match[1].trim() : original;
      const cleanName = namePart.split(/\s+/).slice(0, 4).join(" ");

      if (cleanName.length > 3) {
        const placeholder = `[${type}_${counter}]`;
        entities.push({ type, original: cleanName, placeholder, method });
        maskedText = maskedText.replace(cleanName, placeholder);
        counter++;
      }
    }
  }

  return { entities, maskedText };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);
  const path = url.pathname;

  try {
    // ===== POST /anonymize — Anonymize Arabic legal text =====
    if (path.endsWith("/anonymize") && req.method === "POST") {
      const body = await req.json();
      const { text, doc_id, ttl_hours } = body;

      if (!text || !doc_id) {
        return new Response(JSON.stringify({ error: "text and doc_id are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Step 1: Normalize and extract entities
      const normalized = normalizeArabic(text);
      const { entities, maskedText } = extractEntities(normalized);

      // Step 2: Build unmasking map
      const unmaskMap: Record<string, string> = {};
      entities.forEach(e => { unmaskMap[e.placeholder] = e.original; });

      // Step 3: Encrypt the map with envelope encryption
      const blindIndex = await computeBlindIndex(doc_id);
      const dek = await generateDek();
      const mapJson = JSON.stringify(unmaskMap);
      const { ciphertext, iv } = await encryptWithKey(dek, new TextEncoder().encode(mapJson));

      // Encrypt DEK with master KEK (versioned)
      const activeVersion = await getActiveKeyVersion(supabase);
      const versionedKek = await getMasterKeyForVersion(activeVersion);
      const dekRaw = await exportKey(dek);
      const { ciphertext: encryptedDek, iv: dekIv } = await encryptWithKey(versionedKek, new Uint8Array(dekRaw));

      // Combine DEK IV + encrypted DEK
      const encryptedDekBlob = new Uint8Array(dekIv.length + encryptedDek.byteLength);
      encryptedDekBlob.set(dekIv, 0);
      encryptedDekBlob.set(new Uint8Array(encryptedDek), dekIv.length);

      // Build Vault-style versioned ciphertext string
      const vaultCiphertext = buildVaultCiphertext(activeVersion, encryptedDekBlob);

      const ttlHours = Math.min(Math.max(ttl_hours || 72, 1), 168);
      const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

      // Step 4: Store encrypted map with key version
      const { data: mapData, error: mapError } = await supabase.from("laas_unmasking_maps").upsert({
        doc_blind_index: blindIndex,
        encrypted_dek: Array.from(encryptedDekBlob),
        encrypted_map_payload: Array.from(new Uint8Array(ciphertext)),
        iv: Array.from(iv),
        status: "ACTIVE",
        expires_at: expiresAt.toISOString(),
        key_version: activeVersion,
        vault_ciphertext: vaultCiphertext,
      }, { onConflict: "doc_blind_index" }).select().single();

      if (mapError) {
        return new Response(JSON.stringify({ error: mapError.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Step 5: Log to DLP audit
      const entityCounts: Record<string, number> = {};
      entities.forEach(e => { entityCounts[e.type] = (entityCounts[e.type] || 0) + 1; });

      for (const [etype, ecount] of Object.entries(entityCounts)) {
        await supabase.from("laas_dlp_audit_logs").insert({
          doc_id,
          doc_blind_index: blindIndex,
          entity_type: etype,
          entity_count: ecount,
          anonymization_method: entities.find(e => e.type === etype)?.method || "regex",
          masked_text_preview: maskedText.slice(0, 200),
          map_id: mapData.id,
          executed_by: "نظام التجهيل الآلي",
        });
      }

      // Log to security events
      await supabase.from("laas_security_events").insert({
        event_type: "anonymization_check",
        severity: "info",
        source_entity: "محرك التجهيل العربي",
        description: `تم تجهيل ${entities.length} كيان من مستند ${doc_id} — مؤشر معمى: ${blindIndex.slice(0, 16)}...`,
        action_taken: "تشفير غلافي AES-256-GCM + تخزين الخريطة",
        status: "resolved",
      });

      // Log key operation to rotation audit
      await supabase.from("laas_key_rotation_audit").insert({
        operation: "encrypt",
        key_name: "master-kek-unmasking",
        version: activeVersion,
        ciphertext_preview: vaultCiphertext.slice(0, 20),
        performed_by: "محرك التجهيل العربي",
      });

      return new Response(JSON.stringify({
        success: true,
        doc_id,
        blind_index: blindIndex,
        masked_text: maskedText,
        entity_count: entities.length,
        entities: entities.map(e => ({ type: e.type, placeholder: e.placeholder, method: e.method })),
        map_id: mapData.id,
        expires_at: expiresAt.toISOString(),
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== POST /decrypt — Decrypt unmasking map (authorized only) =====
    if (path.endsWith("/decrypt") && req.method === "POST") {
      const body = await req.json();
      const { doc_id } = body;

      if (!doc_id) {
        return new Response(JSON.stringify({ error: "doc_id is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const blindIndex = await computeBlindIndex(doc_id);

      const { data: mapRecord } = await supabase.from("laas_unmasking_maps")
        .select("*")
        .eq("doc_blind_index", blindIndex)
        .maybeSingle();

      if (!mapRecord || mapRecord.status !== "ACTIVE") {
        return new Response(JSON.stringify({ error: "الخريطة غير موجودة أو تم إتلافها" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (new Date(mapRecord.expires_at) < new Date()) {
        await supabase.from("laas_unmasking_maps").update({ status: "EXPIRED" }).eq("id", mapRecord.id);
        return new Response(JSON.stringify({ error: "انتهت صلاحية خريطة فك التجهيل" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Decrypt DEK with versioned KEK (based on stored key_version)
      const keyVersion = mapRecord.key_version || 1;
      const versionedKek = await getMasterKeyForVersion(keyVersion);
      const encryptedDekBlob = new Uint8Array(mapRecord.encrypted_dek);
      const dekIv = encryptedDekBlob.slice(0, 12);
      const encDek = encryptedDekBlob.slice(12);
      const dekRaw = await crypto.subtle.decrypt({ name: "AES-GCM", iv: dekIv }, versionedKek, encDek);
      const dek = await importKey(dekRaw);

      // Decrypt map payload with DEK
      const iv = new Uint8Array(mapRecord.iv);
      const ciphertext = new Uint8Array(mapRecord.encrypted_map_payload);
      const decryptedJson = await decryptWithKey(dek, ciphertext.buffer, iv);
      const unmaskMap = JSON.parse(decryptedJson);

      // Log access
      await supabase.from("laas_security_events").insert({
        event_type: "unauthorized_access",
        severity: "warning",
        source_entity: "نظام فك التجهيل المصرح",
        description: `تم فك تشفير خريطة المستند ${doc_id} بواسطة طلب مصرح`,
        action_taken: "تسجيل في سجل التدقيق",
        status: "resolved",
      });

      // Log key operation to rotation audit
      await supabase.from("laas_key_rotation_audit").insert({
        operation: "decrypt",
        key_name: "master-kek-unmasking",
        version: keyVersion,
        ciphertext_preview: mapRecord.vault_ciphertext?.slice(0, 20) || null,
        performed_by: "نظام فك التجهيل المصرح",
      });

      return new Response(JSON.stringify({
        success: true,
        doc_id,
        unmask_map: unmaskMap,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== POST /purge — Run secure purge of expired maps =====
    if (path.endsWith("/purge") && req.method === "POST") {
      // Step 1: Cryptographic shredding — overwrite with random bytes
      await supabase.rpc("secure_purge_unmasking_maps");

      // Count remaining active maps
      const { count } = await supabase.from("laas_unmasking_maps")
        .select("*", { count: "exact", head: true })
        .eq("status", "ACTIVE");

      return new Response(JSON.stringify({
        success: true,
        message: "تم تنفيذ الإتلاف الآمن — الكتابة الفوقية + الحذف",
        active_maps_remaining: count,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== POST /ban-ip — Record failed attempt and ban if threshold exceeded =====
    if (path.endsWith("/ban-ip") && req.method === "POST") {
      const body = await req.json();
      const { ip_address, http_status, token_snippet, endpoint, user_agent } = body;

      if (!ip_address) {
        return new Response(JSON.stringify({ error: "ip_address is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Log the failed attempt
      await supabase.from("laas_fail2ban_events").insert({
        ip_address, http_status: http_status || 403,
        token_snippet: token_snippet?.slice(0, 20) || null,
        endpoint: endpoint || "/v1/auth/claim",
        user_agent: user_agent || null,
      });

      // Check if IP is whitelisted
      const { data: existing } = await supabase.from("laas_banned_ips")
        .select("*")
        .eq("ip_address", ip_address)
        .single();

      if (existing?.is_whitelisted) {
        return new Response(JSON.stringify({ success: true, message: "IP whitelisted — no action", action: "ignored" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Count recent failed attempts (last 10 minutes)
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count: attemptCount } = await supabase.from("laas_fail2ban_events")
        .select("*", { count: "exact", head: true })
        .eq("ip_address", ip_address)
        .gte("created_at", tenMinAgo);

      const maxAttempts = 3;

      if (attemptCount && attemptCount >= maxAttempts) {
        // Ban the IP
        const banReason = http_status === 404 ? "token_enumeration" : http_status === 401 ? "brute_force" : "revoked_link_access";
        const bannedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        await supabase.from("laas_banned_ips").upsert({
          ip_address,
          ban_reason: banReason,
          failed_attempts: attemptCount,
          first_attempt_at: tenMinAgo,
          last_attempt_at: new Date().toISOString(),
          banned_until: bannedUntil,
          is_permanent: attemptCount >= 10,
          status: "active",
        }, { onConflict: "ip_address" });

        // Log to security events
        await supabase.from("laas_security_events").insert({
          event_type: "unauthorized_access",
          severity: "critical",
          source_entity: ip_address,
          source_ip: ip_address,
          description: `تم حظر ${ip_address} تلقائياً بعد ${attemptCount} محاولات فاشلة — Fail2ban iptables`,
          action_taken: `iptables REJECT — f2b-nginx-deeplink chain — حتى ${bannedUntil}`,
          status: "active",
        });

        return new Response(JSON.stringify({
          success: true,
          action: "banned",
          ip_address,
          ban_reason: banReason,
          failed_attempts: attemptCount,
          banned_until: bannedUntil,
          is_permanent: attemptCount >= 10,
        }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        action: "logged",
        ip_address,
        failed_attempts: attemptCount,
        threshold: maxAttempts,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== POST /unban — Manually unban an IP =====
    if (path.endsWith("/unban") && req.method === "POST") {
      const body = await req.json();
      const { ip_address } = body;

      await supabase.from("laas_banned_ips").update({
        status: "unbanned",
        banned_until: null,
      }).eq("ip_address", ip_address);

      await supabase.from("laas_security_events").insert({
        event_type: "unauthorized_access",
        severity: "info",
        source_entity: ip_address,
        description: `تم إلغاء حظر ${ip_address} يدوياً — fail2ban-client unbanip`,
        action_taken: "unban manually",
        status: "resolved",
      });

      return new Response(JSON.stringify({ success: true, message: `تم إلغاء حظر ${ip_address}` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== POST /whitelist — Add IP to whitelist =====
    if (path.endsWith("/whitelist") && req.method === "POST") {
      const body = await req.json();
      const { ip_address } = body;

      await supabase.from("laas_banned_ips").upsert({
        ip_address,
        is_whitelisted: true,
        status: "whitelisted",
        ban_reason: "whitelist",
        failed_attempts: 0,
      }, { onConflict: "ip_address" });

      return new Response(JSON.stringify({ success: true, message: `تمت إضافة ${ip_address} للقائمة البيضاء` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== POST /rotate-key — Rotate KEK (create new version) =====
    if (path.endsWith("/rotate-key") && req.method === "POST") {
      // Step 1: Get current latest version
      const { data: currentVersions } = await supabase.from("laas_vault_key_versions")
        .select("version")
        .eq("key_name", "master-kek-unmasking")
        .order("version", { ascending: false })
        .limit(1);

      const currentLatest = currentVersions?.[0]?.version || 1;
      const newVersion = currentLatest + 1;

      // Step 2: Deactivate old active version
      await supabase.from("laas_vault_key_versions")
        .update({ is_encryption_active: false })
        .eq("key_name", "master-kek-unmasking")
        .eq("is_encryption_active", true);

      // Step 3: Create new active version
      await supabase.from("laas_vault_key_versions").insert({
        key_name: "master-kek-unmasking",
        version: newVersion,
        is_encryption_active: true,
        can_decrypt: true,
        rotated_by: "مسؤول أمن النظام",
      });

      // Step 4: Log to rotation audit
      await supabase.from("laas_key_rotation_audit").insert({
        operation: "rotate",
        key_name: "master-kek-unmasking",
        version: newVersion,
        performed_by: "مسؤول أمن النظام",
      });

      // Step 5: Log to security events
      await supabase.from("laas_security_events").insert({
        event_type: "unauthorized_access",
        severity: "warning",
        source_entity: "خزانة المفاتيح Vault",
        description: `تم تدوير مفتاح KEK الرئيسي إلى الإصدار v${newVersion} — الإصدارات القديمة محتفظة لفك التشفير فقط`,
        action_taken: `Key Rotation: v${currentLatest} → v${newVersion}`,
        status: "resolved",
      });

      return new Response(JSON.stringify({
        success: true,
        operation: "rotate",
        key_name: "master-kek-unmasking",
        previous_version: currentLatest,
        new_version: newVersion,
        message: `تم تدوير المفتاح من v${currentLatest} إلى v${newVersion} — العمليات الجديدة تستخدم v${newVersion}`,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== POST /rewrap — Re-encrypt old ciphertext with latest key version =====
    if (path.endsWith("/rewrap") && req.method === "POST") {
      const body = await req.json();
      const { doc_id } = body;

      if (!doc_id) {
        return new Response(JSON.stringify({ error: "doc_id is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const blindIndex = await computeBlindIndex(doc_id);

      const { data: mapRecord } = await supabase.from("laas_unmasking_maps")
        .select("*")
        .eq("doc_blind_index", blindIndex)
        .maybeSingle();

      if (!mapRecord || mapRecord.status !== "ACTIVE") {
        return new Response(JSON.stringify({ error: "الخريطة غير موجودة أو تم إتلافها" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const oldVersion = mapRecord.key_version || 1;
      const activeVersion = await getActiveKeyVersion(supabase);

      if (oldVersion === activeVersion) {
        return new Response(JSON.stringify({
          success: true,
          operation: "rewrap",
          message: `الخريطة مشفرة بالإصدار v${oldVersion} وهو الإصدار النشط — لا حاجة لإعادة التشفير`,
          version: oldVersion,
        }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Step 1: Decrypt DEK with old version key
      const oldKek = await getMasterKeyForVersion(oldVersion);
      const encryptedDekBlob = new Uint8Array(mapRecord.encrypted_dek);
      const dekIv = encryptedDekBlob.slice(0, 12);
      const encDek = encryptedDekBlob.slice(12);
      const dekRaw = await crypto.subtle.decrypt({ name: "AES-GCM", iv: dekIv }, oldKek, encDek);

      // Step 2: Re-encrypt DEK with new active version key
      const newKek = await getMasterKeyForVersion(activeVersion);
      const { ciphertext: rewrappedDek, iv: newDekIv } = await encryptWithKey(newKek, new Uint8Array(dekRaw));

      const newEncryptedDekBlob = new Uint8Array(newDekIv.length + rewrappedDek.byteLength);
      newEncryptedDekBlob.set(newDekIv, 0);
      newEncryptedDekBlob.set(new Uint8Array(rewrappedDek), newDekIv.length);

      const newVaultCiphertext = buildVaultCiphertext(activeVersion, newEncryptedDekBlob);

      // Step 3: Update the record with new version
      await supabase.from("laas_unmasking_maps").update({
        encrypted_dek: Array.from(newEncryptedDekBlob),
        key_version: activeVersion,
        vault_ciphertext: newVaultCiphertext,
      }).eq("id", mapRecord.id);

      // Step 4: Log to rotation audit
      await supabase.from("laas_key_rotation_audit").insert({
        operation: "rewrap",
        key_name: "master-kek-unmasking",
        version: activeVersion,
        ciphertext_preview: newVaultCiphertext.slice(0, 20),
        performed_by: "نظام إدارة المفاتيح",
      });

      return new Response(JSON.stringify({
        success: true,
        operation: "rewrap",
        doc_id,
        previous_version: oldVersion,
        new_version: activeVersion,
        message: `تم إعادة تشفير الخريطة من v${oldVersion} إلى v${activeVersion} دون كشف النص الأصلي`,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== GET /key-status — Get current key version status =====
    if (path.endsWith("/key-status") && req.method === "GET") {
      const { data: versions } = await supabase.from("laas_vault_key_versions")
        .select("*")
        .eq("key_name", "master-kek-unmasking")
        .order("version", { ascending: true });

      const { count: totalMaps } = await supabase.from("laas_unmasking_maps")
        .select("*", { count: "exact", head: true })
        .eq("status", "ACTIVE");

      // Count maps per version
      const versionCounts: Record<number, number> = {};
      const { data: allMaps } = await supabase.from("laas_unmasking_maps")
        .select("key_version")
        .eq("status", "ACTIVE");
      allMaps?.forEach((m: any) => {
        const v = m.key_version || 1;
        versionCounts[v] = (versionCounts[v] || 0) + 1;
      });

      return new Response(JSON.stringify({
        success: true,
        key_name: "master-kek-unmasking",
        versions: versions || [],
        active_maps: totalMaps || 0,
        maps_per_version: versionCounts,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "endpoint not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("arabic-legal-dlp error:", err);
    return new Response(JSON.stringify({ error: "internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
