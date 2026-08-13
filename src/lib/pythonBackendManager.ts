/**
 * Tauri Sidecar Configuration
 * Starts Python FastAPI backend as a local service
 */

import { Command } from '@tauri-apps/api/shell';
import { resourceDir } from '@tauri-apps/api/path';

let pythonBackendProcess: Command | null = null;

const BACKEND_PORT = 8000;
const BACKEND_HOST = '127.0.0.1';
const MAX_RETRIES = 5;
const RETRY_DELAY = 1000; // ms

/**
 * Initialize Python backend as Tauri sidecar
 */
export async function initializePythonBackend(): Promise<boolean> {
  try {
    console.log('🚀 Starting Python FastAPI backend...');

    // Get resource directory for Python files
    const resourcePath = await resourceDir();

    // Determine Python executable path
    const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
    const scriptPath = `${resourcePath}backend/document_engine.py`;

    // Start Python process
    pythonBackendProcess = new Command('start-python', [
      pythonPath,
      scriptPath,
    ]);

    await pythonBackendProcess.execute();

    // Wait for backend to be ready
    let retries = MAX_RETRIES;
    while (retries > 0) {
      try {
        const response = await fetch(`http://${BACKEND_HOST}:${BACKEND_PORT}/health`);
        if (response.ok) {
          console.log('✅ Python backend started successfully');
          return true;
        }
      } catch (error) {
        retries--;
        if (retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        }
      }
    }

    console.error('❌ Failed to start Python backend');
    return false;
  } catch (error) {
    console.error('❌ Error starting Python backend:', error);
    return false;
  }
}

/**
 * Shutdown Python backend
 */
export async function shutdownPythonBackend(): Promise<void> {
  try {
    if (pythonBackendProcess) {
      pythonBackendProcess = null;
      console.log('✅ Python backend shutdown');
    }
  } catch (error) {
    console.error('❌ Error shutting down Python backend:', error);
  }
}

/**
 * Get backend API URL
 */
export function getBackendApiUrl(): string {
  return `http://${BACKEND_HOST}:${BACKEND_PORT}`;
}
