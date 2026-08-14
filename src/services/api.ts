*** Begin Patch
*** Update File: src/services/api.ts
@@
 export async function postContactRequest(name: string, email: string): Promise<{ ok: boolean }> {
-  return request('/contact', { method: 'POST', body: JSON.stringify({ name, email }) });
+  // Use Supabase fallback if API not available
+  try {
+    return request('/contact', { method: 'POST', body: JSON.stringify({ name, email }) }) as Promise<{ ok: boolean }>;
+  } catch (err) {
+    // Fallback to Supabase client if request fails or API not present
+    try {
+      // dynamic import to avoid circular deps
+      const mod = await import('@/lib/financeUtils');
+      const { supabase } = mod;
+      const { error } = await supabase.from('contact_requests').insert({ name, email });
+      if (error) throw error;
+      return { ok: true };
+    } catch (e) {
+      throw err;
+    }
+  }
 }
*** End Patch
