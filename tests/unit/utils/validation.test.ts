import { describe, it, expect } from 'vitest';

// Validation utilities
const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePhone = (phone: string) => /^\d{10,}$/.test(phone.replace(/\D/g, ''));
const validateRequired = (value: string) => value.trim().length > 0;

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.email@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid.email')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('should validate phone numbers with at least 10 digits', () => {
      expect(validatePhone('1234567890')).toBe(true);
      expect(validatePhone('+1 (123) 456-7890')).toBe(true);
    });

    it('should reject phone numbers with fewer than 10 digits', () => {
      expect(validatePhone('12345')).toBe(false);
    });
  });

  describe('validateRequired', () => {
    it('should validate non-empty strings', () => {
      expect(validateRequired('text')).toBe(true);
      expect(validateRequired('  text  ')).toBe(true);
    });

    it('should reject empty or whitespace-only strings', () => {
      expect(validateRequired('')).toBe(false);
      expect(validateRequired('   ')).toBe(false);
    });
  });
});