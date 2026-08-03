export const INTEGRATIONS_ENABLED = false;

export const INTEGRATION_STATUS = {
  trello: false,
  webhook: false,
  deepLink: false,
  dlp: false,
  emailDispatch: false,
  calendarSync: false,
} as const;

export function isIntegrationEnabled(key: keyof typeof INTEGRATION_STATUS): boolean {
  return INTEGRATIONS_ENABLED && INTEGRATION_STATUS[key];
}
