export type IntegrationKey = 'webhook' | 'deepLink' | 'dlp' | 'vault';

export function isIntegrationEnabled(_key: IntegrationKey): boolean {
  return true;
}
