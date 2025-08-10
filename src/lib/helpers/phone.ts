export function sanitizePhoneInput(raw: string): string {
  if (!raw) return '';
  // Keep leading + if present, otherwise only digits
  const trimmed = raw.trim();
  if (trimmed.startsWith('+')) {
    return '+' + trimmed.slice(1).replace(/[^0-9]/g, '');
  }
  return trimmed.replace(/[^0-9]/g, '');
}

export function formatToE164(raw: string, defaultCountry: 'US' | 'CA' = 'US'): string {
  if (!raw) return '';
  const input = raw.trim();

  // Convert 00 international prefix to +
  if (input.startsWith('00')) {
    const digits = input.replace(/\D/g, '');
    const withoutPrefix = digits.slice(2);
    return withoutPrefix ? `+${withoutPrefix}` : '';
  }

  // If already +, normalize to + and digits only
  if (input.startsWith('+')) {
    const digits = input.replace(/\D/g, '');
    return `+${digits}`;
  }

  // Digits only otherwise
  const digitsOnly = input.replace(/\D/g, '');

  // Assume NANP for 10-digit numbers
  if (digitsOnly.length === 10 && (defaultCountry === 'US' || defaultCountry === 'CA')) {
    return `+1${digitsOnly}`;
  }

  // 11 digits starting with 1 is also NANP
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  }

  // Fallback: if 7-15 digits, return with +
  if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
    return `+${digitsOnly}`;
  }

  // Otherwise return best-effort sanitized
  return digitsOnly ? `+${digitsOnly}` : '';
}

export function isE164(phone: string): boolean {
  if (!phone) return false;
  const normalized = formatToE164(phone);
  // E.164: + followed by 7 to 15 digits, first digit 1-9
  return /^\+[1-9]\d{6,14}$/.test(normalized);
} 