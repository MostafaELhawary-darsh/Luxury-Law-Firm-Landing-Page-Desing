/**
 * Hybrid Document Editor Setup & Integration
 * This file contains all necessary setup for Tauri + Python backend + React frontend
 */

import React, { useEffect, useState } from 'react';
import { getSystemInfo, checkBackendHealth } from '@/lib/documentEditorService';
import { initializePythonBackend, shutdownPythonBackend } from '@/lib/pythonBackendManager';

interface BackendStatus {
  isHealthy: boolean;
  isInitialized: boolean;
  pythonDocx: boolean;
  pypandoc: boolean;
  pymupdf: boolean;
  message: string;
}

const initialStatus: BackendStatus = {
  isHealthy: false,
  isInitialized: false,
  pythonDocx: false,
  pypandoc: false,
  pymupdf: false,
  message: '⏳ جاري التحقق من الخادم...',
};

/**
 * Hook to initialize and manage backend connection
 */
export function useBackendConnection() {
  const [status, setStatus] = useState<BackendStatus>(initialStatus);

  useEffect(() => {
    const initBackend = async () => {
      try {
        // Initialize Python backend
        const initialized = await initializePythonBackend();
        
        if (!initialized) {
          setStatus({
            ...initialStatus,
            message: '❌ فشل تشغيل الخادم - تأكد من تثبيت Python',
          });
          return;
        }

        // Check health
        const isHealthy = await checkBackendHealth();

        if (isHealthy) {
          // Get system info
          const sysInfo = await getSystemInfo();
          setStatus({
            isHealthy: true,
            isInitialized: true,
            pythonDocx: sysInfo.python_docx,
            pypandoc: sysInfo.pypandoc,
            pymupdf: sysInfo.pymupdf,
            message: '✅ الخادم جاهز',
          });
        } else {
          setStatus({
            ...initialStatus,
            isInitialized: true,
            message: '⚠️ الخادم قيد التشغيل ولكن لا يستجيب',
          });
        }
      } catch (error) {
        console.error('Backend initialization error:', error);
        setStatus({
          ...initialStatus,
          message: `❌ خطأ: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    };

    initBackend();

    return () => {
      shutdownPythonBackend();
    };
  }, []);

  return status;
}

/**
 * Component to display backend status
 */
export function BackendStatusIndicator() {
  const status = useBackendConnection();

  return (
    <div
      className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg border ${
        status.isHealthy
          ? 'bg-green-900/20 border-green-500 text-green-300'
          : status.isInitialized
          ? 'bg-yellow-900/20 border-yellow-500 text-yellow-300'
          : 'bg-red-900/20 border-red-500 text-red-300'
      }`}
    >
      <div className="text-sm font-semibold">{status.message}</div>
      {status.isHealthy && (
        <div className="text-xs opacity-75 mt-2 space-y-1">
          <div>📄 python-docx: {status.pythonDocx ? '✅' : '❌'}</div>
          <div>📝 pypandoc: {status.pypandoc ? '✅' : '❌'}</div>
          <div>📕 PyMuPDF: {status.pymupdf ? '✅' : '❌'}</div>
        </div>
      )}
    </div>
  );
}
