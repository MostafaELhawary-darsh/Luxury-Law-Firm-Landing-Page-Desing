/**
 * Document Editor API Service
 */

const API_BASE = 'http://127.0.0.1:8000';

export interface MediaUploadResponse {
  url: string;
  local_path: string;
  file_name: string;
  file_type: string;
  size: number;
}

export interface ExportResponse {
  status: string;
  message: string;
  file_path: string;
  file_name: string;
}

export interface DocumentInfo {
  file_name: string;
  file_type: string;
  size: number;
  created: number;
  modified: number;
}

/**
 * Upload media file (image/video)
 */
export async function uploadMedia(file: File): Promise<MediaUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/api/media/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Delete media file
 */
export async function deleteMedia(fileName: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/media/${fileName}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Delete failed: ${response.statusText}`);
  }
}

/**
 * Export document to specified format
 */
export async function exportDocument(
  htmlContent: string,
  format: string,
  title: string,
  fileName?: string
): Promise<ExportResponse> {
  const response = await fetch(`${API_BASE}/api/document/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      html_content: htmlContent,
      output_format: format,
      document_title: title,
      author: 'Luxury Law Firm',
      file_name: fileName || title.replace(/\s+/g, '_'),
    }),
  });

  if (!response.ok) {
    throw new Error(`Export failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Download document
 */
export async function downloadDocument(fileName: string): Promise<Blob> {
  const response = await fetch(`${API_BASE}/api/documents/download/${fileName}`);

  if (!response.ok) {
    throw new Error(`Download failed: ${response.statusText}`);
  }

  return response.blob();
}

/**
 * List all documents
 */
export async function listDocuments(): Promise<DocumentInfo[]> {
  const response = await fetch(`${API_BASE}/api/documents/list`);

  if (!response.ok) {
    throw new Error(`List failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.documents;
}

/**
 * Delete document
 */
export async function deleteDocument(fileName: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/documents/${fileName}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Delete failed: ${response.statusText}`);
  }
}

/**
 * Read document content
 */
export async function readDocument(fileName: string): Promise<any> {
  const response = await fetch(`${API_BASE}/api/document/read/${fileName}`);

  if (!response.ok) {
    throw new Error(`Read failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Check backend health
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Get system info
 */
export async function getSystemInfo(): Promise<any> {
  const response = await fetch(`${API_BASE}/api/system/info`);

  if (!response.ok) {
    throw new Error('Failed to get system info');
  }

  return response.json();
}
