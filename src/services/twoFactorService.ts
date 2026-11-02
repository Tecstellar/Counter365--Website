import { storage } from '../lib/storage';

export const TWOFACTOR_CONFIG = {
  API_KEY: import.meta.env.VITE_TWOFACTOR_API_KEY || 'e11be203-4f77-11f1-9800-0200cd936042',
  TEMPLATE_NAME: import.meta.env.VITE_TWOFACTOR_TEMPLATE_NAME || 'Login_Verification_OTP',
  BASE_URL: 'https://2factor.in/API/V1',
};

const SESSION_KEY_PREFIX = '@counterpro/2factor_session_';

export interface SendOtpResult {
  success: boolean;
  sessionId?: string;
  message?: string;
  error?: string;
}

export interface VerifyOtpResult {
  success: boolean;
  message?: string;
  error?: string;
}

export const DEMO_REVIEW_PHONE = '9999999999';
export const DEMO_REVIEW_OTP = '123456';

export const twoFactorService = {
  sanitizePhone(phone: string): string {
    const clean = phone.replace(/[^0-9]/g, '');
    if (clean.length === 12 && clean.startsWith('91')) {
      return clean.slice(2);
    }
    if (clean.length > 10) {
      return clean.slice(-10);
    }
    return clean;
  },

  async sendOtp(rawPhone: string): Promise<SendOtpResult> {
    const phone = this.sanitizePhone(rawPhone);
    if (phone.length !== 10) {
      return { success: false, error: 'Please enter a valid 10-digit mobile number.' };
    }

    // STRICT SINGLE DEMO LOGIN ID FOR REVIEW PURPOSES
    if (phone === DEMO_REVIEW_PHONE) {
      const demoSessionId = `demo_review_session_${phone}`;
      await storage.setItem(`${SESSION_KEY_PREFIX}${phone}`, demoSessionId);
      return {
        success: true,
        sessionId: demoSessionId,
        message: 'Reviewer demo login active. OTP: 123456',
      };
    }

    try {
      const url = `${TWOFACTOR_CONFIG.BASE_URL}/${TWOFACTOR_CONFIG.API_KEY}/SMS/${phone}/AUTOGEN/${TWOFACTOR_CONFIG.TEMPLATE_NAME}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data && data.Status === 'Success') {
        const sessionId = data.Details;
        await storage.setItem(`${SESSION_KEY_PREFIX}${phone}`, sessionId);
        return {
          success: true,
          sessionId,
          message: 'OTP sent successfully to your mobile number.',
        };
      }

      return {
        success: false,
        error: data?.Details || 'Failed to send OTP via SMS gateway. Please try again.',
      };
    } catch (err: any) {
      console.warn('2Factor sendOtp error:', err);
      return {
        success: false,
        error: 'Network error connecting to SMS service. Please verify internet connection.',
      };
    }
  },

  async verifyOtp(rawPhone: string, token: string): Promise<VerifyOtpResult> {
    const phone = this.sanitizePhone(rawPhone);
    const cleanToken = token.trim();

    if (phone.length !== 10) {
      return { success: false, error: 'Invalid phone number format.' };
    }
    if (cleanToken.length !== 6) {
      return { success: false, error: 'Please enter a 6-digit OTP code.' };
    }

    if (phone === DEMO_REVIEW_PHONE) {
      if (cleanToken === DEMO_REVIEW_OTP) {
        return { success: true, message: 'Demo verification successful.' };
      }
      return { success: false, error: 'Invalid OTP code. For demo login use 123456.' };
    }

    try {
      const sessionId = await storage.getItem(`${SESSION_KEY_PREFIX}${phone}`);
      if (!sessionId) {
        return {
          success: false,
          error: 'OTP session expired. Please request a new OTP.',
        };
      }

      const url = `${TWOFACTOR_CONFIG.BASE_URL}/${TWOFACTOR_CONFIG.API_KEY}/SMS/VERIFY/${sessionId}/${cleanToken}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data && data.Status === 'Success' && data.Details === 'OTP Matched') {
        await storage.removeItem(`${SESSION_KEY_PREFIX}${phone}`);
        return {
          success: true,
          message: 'OTP verified successfully.',
        };
      }

      return {
        success: false,
        error: data?.Details || 'Invalid OTP code entered. Please check and retry.',
      };
    } catch (err: any) {
      console.warn('2Factor verifyOtp error:', err);
      return {
        success: false,
        error: 'Network error while verifying OTP code.',
      };
    }
  },
};
