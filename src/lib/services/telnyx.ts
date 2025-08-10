import { PUBLIC_TELNYX_API_KEY, PUBLIC_TELNYX_FROM_NUMBER, PUBLIC_SMS_MODE } from '$env/static/public';

import { dev } from '$app/environment';
import { formatToE164, isE164 } from '$lib/helpers/phone';

interface TelnyxSMSResponse {
  data: {
    id: string;
    status: string;
    to: string;
    from: string;
    text: string;
  };
}

// Dev-only: In-memory store for mock SMS codes
interface MockSMS {
  id: string;
  to: string;
  message: string;
  timestamp: Date;
  code: string;
}

// Store recent SMS codes in development
let mockSMSStore: MockSMS[] = [];

export class TelnyxSMSService {
  private apiKey: string;
  private fromNumber: string;
  private baseURL = 'https://api.telnyx.com/v2';

  constructor() {
    this.apiKey = PUBLIC_TELNYX_API_KEY;
    this.fromNumber = PUBLIC_TELNYX_FROM_NUMBER;

    if (!dev && !this.apiKey) {
      throw new Error('TELNYX_API_KEY environment variable is required');
    }
    if (!dev && !this.fromNumber) {
      throw new Error('TELNYX_FROM_NUMBER environment variable is required');
    }
  }

  async sendSMS(to: string, message: string): Promise<boolean> {
    // Check SMS mode - use mock in dev mode unless explicitly set to production
    const useMockSMS = dev && PUBLIC_SMS_MODE !== 'production';
    
    if (useMockSMS) {
      console.log(`📱 [DEV MODE] Mock SMS to ${to}: ${message}`);
      
      // Extract verification code from message
      const codeMatch = message.match(/\b\d{6}\b/);
      const code = codeMatch ? codeMatch[0] : '';
      
      const mockSMS: MockSMS = {
        id: `mock_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        to,
        message,
        timestamp: new Date(),
        code
      };
      
      // Keep only last 10 SMS for dev testing
      mockSMSStore.unshift(mockSMS);
      if (mockSMSStore.length > 10) {
        mockSMSStore = mockSMSStore.slice(0, 10);
      }
      
      console.log(`📱 [DEV MODE] SMS stored in mock receiver. Code: ${code}`);
      console.log(`📱 [DEV MODE] ⭐ Quick Access: Visit /dev/mock-sms to view all codes or copy this code: ${code}`);
      return true;
    }

    // Production mode: Send real SMS via Telnyx
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
    return formatToE164(phone);
  }

  // Validate phone number format
  isValidPhoneNumber(phone: string): boolean {
    return isE164(phone);
  }

      // Dev-only: Get recent mock SMS codes
  getMockSMSCodes(): MockSMS[] {
    const useMockSMS = dev && PUBLIC_SMS_MODE !== 'production';
    if (!useMockSMS) {
      throw new Error('Mock SMS codes are only available in development mode');
    }
    return [...mockSMSStore];
  }

  // Dev-only: Clear mock SMS store
  clearMockSMSCodes(): void {
    const useMockSMS = dev && PUBLIC_SMS_MODE !== 'production';
    if (!useMockSMS) {
      throw new Error('Mock SMS codes can only be cleared in development mode');
    }
    mockSMSStore = [];
    console.log('📱 [DEV MODE] Mock SMS store cleared');
  }

  // Dev-only: Get verification code for a phone number
  getLatestCodeForPhone(phoneNumber: string): string | null {
    const useMockSMS = dev && PUBLIC_SMS_MODE !== 'production';
    if (!useMockSMS) {
      throw new Error('Mock SMS codes are only available in development mode');
    }
    
    const formatted = this.formatPhoneNumber(phoneNumber);
    const sms = mockSMSStore.find(sms => sms.to === formatted);
    return sms ? sms.code : null;
  }
}

export const telnyxSMS = new TelnyxSMSService(); 