*** Begin Patch
*** Add File: src/services/supabaseWrapper.ts
+import { supabase } from '@/lib/financeUtils';
+
+type SupabaseErrorLike = { message?: string; code?: string } | null;
+
+async function withTimeout<T>(p: Promise<T>, ttl = 8000): Promise<T> {
+  let timeout: NodeJS.Timeout;
+  const t = new Promise<T>((_, reject) => {
+    timeout = setTimeout(() => reject(new Error('Request timeout')), ttl);
+  });
+  try {
+    const r = await Promise.race([p, t]);
+    clearTimeout(timeout!);
+    return r as T;
+  } catch (err) {
+    clearTimeout(timeout!);
+    throw err;
+  }
+}
+
+function formatError(err: any) {
+  if (!err) return { message: 'Unknown error', code: 'UNKNOWN' };
+  return { message: err.message || err.error_description || String(err), code: err.code || 'ERR' };
+}
+
+export async function supabaseSelect(table: string, query = (q: any) => q, opts = { ttl: 8000 }) {
+  try {
+    const p = (async () => query(supabase.from(table).select('*'))).call(null);
+    const res: any = await withTimeout(p, opts.ttl);
+    if (res.error) throw res.error;
+    return res.data;
+  } catch (err) {
+    throw formatError(err);
+  }
+}
+
+export async function supabaseUpsert(table: string, payload: any, opts = { ttl: 8000 }) {
+  try {
+    const p = supabase.from(table).upsert(payload);
+    const res: any = await withTimeout(p, opts.ttl);
+    if (res.error) throw res.error;
+    return res.data;
+  } catch (err) {
+    throw formatError(err);
+  }
+}
+
+export async function supabaseInsert(table: string, payload: any, opts = { ttl: 8000 }) {
+  try {
+    const p = supabase.from(table).insert(payload);
+    const res: any = await withTimeout(p, opts.ttl);
+    if (res.error) throw res.error;
+    return res.data;
+  } catch (err) {
+    throw formatError(err);
+  }
+}
+
+export async function supabaseUpdate(table: string, payload: any, match: any, opts = { ttl: 8000 }) {
+  try {
+    const p = supabase.from(table).update(payload).match(match);
+    const res: any = await withTimeout(p, opts.ttl);
+    if (res.error) throw res.error;
+    return res.data;
+  } catch (err) {
+    throw formatError(err);
+  }
+}
+
+export async function supabaseDelete(table: string, match: any, opts = { ttl: 8000 }) {
+  try {
+    const p = supabase.from(table).delete().match(match);
+    const res: any = await withTimeout(p, opts.ttl);
+    if (res.error) throw res.error;
+    return res.data;
+  } catch (err) {
+    throw formatError(err);
+  }
+}
+
+export default { supabaseSelect, supabaseInsert, supabaseUpdate, supabaseDelete, supabaseUpsert };
+
*** End Patch
