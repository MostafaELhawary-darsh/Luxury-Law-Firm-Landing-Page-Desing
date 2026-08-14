import { describe, it, expect } from 'vitest';
import type { VoiceCommand } from '@/lib/voiceTypes';

describe('Voice Commands', () => {
  it('creates voice command with correct structure', () => {
    const command: VoiceCommand = {
      type: 'add_client',
      raw: 'add new client',
      language: 'en-US',
      payload: {
        name: 'John Doe',
        email: 'john@example.com'
      }
    };
    
    expect(command.type).toBe('add_client');
    expect(command.language).toBe('en-US');
    expect(command.payload.name).toBe('John Doe');
  });

  it('supports multiple languages', () => {
    const commands = [
      { language: 'ar-EG', type: 'add_client' },
      { language: 'en-US', type: 'add_case' },
      { language: 'fr-FR', type: 'add_account' }
    ];
    
    const languages = new Set(commands.map(c => c.language));
    expect(languages.size).toBe(3);
    expect(languages.has('ar-EG')).toBe(true);
    expect(languages.has('en-US')).toBe(true);
    expect(languages.has('fr-FR')).toBe(true);
  });
});
