export interface TelnyxSMSService {
    formatPhoneNumber(phone: string): string;
    isValidPhoneNumber(phone: string): boolean;
    sendVerificationCode(phone: string, code: string, company: string): Promise<boolean>;
}

export const telnyxSMS: TelnyxSMSService;
export default telnyxSMS; 