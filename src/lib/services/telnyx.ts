import { TELNYX_API_KEY, TELNYX_FROM_NUMBER } from '$env/static/private';

interface TelnyxSMSResponse {
  data: {
    id: string;
    status: string;
    to: string;
    from: string;
    text: string;
  };
}

export class TelnyxSMSService {
  private apiKey: string;
  private fromNumber: string;
  private baseURL = 'https://api.telnyx.com/v2';

  constructor() {
    this.apiKey = TELNYX_API_KEY;
    this.fromNumber = TELNYX_FROM_NUMBER;

    if (!this.apiKey) {
      throw new Error('TELNYX_API_KEY environment variable is required');
    }
    if (!this.fromNumber) {
      throw new Error('TELNYX_FROM_NUMBER environment variable is required');
    }
  }

  async sendSMS(to: string, message: string): Promise<boolean> {
    try {
      console.log(`📱 Sending SMS to ${to}: ${message}`);
      
      const response = await fetch(`${this.baseURL}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromNumber,
          to: to,
          text: message,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Telnyx SMS Error:', response.status, errorData);
        throw new Error(`Telnyx SMS API error: ${response.status} - ${errorData}`);
      }

      const data: TelnyxSMSResponse = await response.json();
      console.log('✅ SMS sent successfully:', data.data.id);
      return true;

    } catch (error) {
      console.error('❌ Failed to send SMS:', error);
      return false;
    }
  }

  async sendVerificationCode(phoneNumber: string, code: string, companyName: string): Promise<boolean> {
    const message = `Your ${companyName} verification code is: ${code}. This code expires in 10 minutes.`;
    return this.sendSMS(phoneNumber, message);
  }

  // Format phone number to E.164 format if needed
  formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');
    
    // If it starts with '1' and has 11 digits, add '+'
    if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
      return `+${digitsOnly}`;
    }
    
    // If it has 10 digits, assume US number and add '+1'
    if (digitsOnly.length === 10) {
      return `+1${digitsOnly}`;
    }
    
    // If it already starts with '+', return as is
    if (phone.startsWith('+')) {
      return phone;
    }
    
    // Otherwise, add '+'
    return `+${digitsOnly}`;
  }

  // Validate phone number format
  isValidPhoneNumber(phone: string): boolean {
    const formatted = this.formatPhoneNumber(phone);
    // Basic E.164 validation: starts with + and has 7-15 digits
    const e164Regex = /^\+[1-9]\d{6,14}$/;
    return e164Regex.test(formatted);
  }
}

export const telnyxSMS = new TelnyxSMSService(); 