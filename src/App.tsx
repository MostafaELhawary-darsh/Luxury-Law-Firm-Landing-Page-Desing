*** Begin Patch
*** Update File: src/App.tsx
@@
-import { VoiceProvider, useVoice } from '@/lib/voiceContext';
+import { VoiceProvider, useVoice } from '@/lib/voiceContext';
+import { ToastProvider } from '@/components/Toast';
@@
 function App() {
   return (
-    <VoiceProvider>
-      <AppInner />
-    </VoiceProvider>
+    <VoiceProvider>
+      <ToastProvider>
+        <AppInner />
+      </ToastProvider>
+    </VoiceProvider>
   );
 }
*** End Patch
