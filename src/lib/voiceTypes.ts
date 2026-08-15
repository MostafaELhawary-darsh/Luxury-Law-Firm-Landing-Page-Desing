export type VoiceLanguage = 'ar-EG' | 'en-US' | 'fr-FR';

export type VoiceCommandType =
  | 'add_client'
  | 'add_case'
  | 'add_poa'
  | 'add_task'
  | 'add_session'
  | 'add_meeting'
  | 'add_account'
  | 'add_check'
  | 'add_staff'
  | 'add_salary'
  | 'add_document'
  | 'remind'
  | 'email'
  | 'navigate_section'
  | 'navigate_module'
  | 'navigate_home'
  | 'unknown';

export type Section = 'site' | 'library' | 'finance' | 'firm' | 'editor';

export type FirmModuleId = import('./firmTypes').FirmModule;

export type FinanceModuleId = import('./financeTypes').FinanceModule;

export interface VoiceCommand {
  type: VoiceCommandType;
  raw: string;
  language: VoiceLanguage;
  payload: Record<string, string>;
}

export interface VoiceLogEntry {
  id: string;
  transcript: string;
  language: string;
  command_type: string;
  command_payload: unknown;
  status: string;
  created_at: string;
}

export interface VoiceEmailEntry {
  id: string;
  recipient: string;
  subject: string | null;
  body: string | null;
  created_at: string;
}

export interface PendingAddCommand {
  module: FirmModuleId;
  commandType: string;
  fields: Record<string, string>;
  timestamp: number;
}

export interface PendingRemind {
  title: string;
  dueDate: string;
  timestamp: number;
}

export interface PendingEmail {
  recipient: string;
  subject: string;
  timestamp: number;
}

export const LANGUAGE_LABELS: Record<VoiceLanguage, string> = {
  'ar-EG': 'العربية',
  'en-US': 'English',
  'fr-FR': 'Français',
};
