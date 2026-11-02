import { supabase } from '../lib/supabase';
import { generateUUID } from '../lib/uuid';
import { UserProfile, Shop, ShopMember } from '../types/models';

export interface QrPairingSession {
  sessionId: string;
  token: string;
  qrPayload: string;
  expiresAt: number;
}

export interface PairingApprovalData {
  profile: UserProfile;
  shop: Shop;
  member?: ShopMember;
}

export const qrPairingService = {
  createPairingSession(): QrPairingSession {
    const sessionId = generateUUID();
    const token = generateUUID().replace(/-/g, '') + Math.random().toString(36).substring(2);
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

    const qrPayload = JSON.stringify({
      app: 'counter365',
      action: 'web_login',
      version: '1.0.4',
      sessionId,
      token,
      expiresAt,
    });

    return {
      sessionId,
      token,
      qrPayload,
      expiresAt,
    };
  },

  /**
   * Subscribes to Supabase Realtime Broadcast channel for instant pairing confirmation from mobile app
   */
  subscribeToPairing(
    session: QrPairingSession,
    onApproved: (data: PairingApprovalData) => void,
    onError: (err: string) => void
  ) {
    const channelName = `qr-pairing:${session.sessionId}`;
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { ack: true },
      },
    });

    channel
      .on('broadcast', { event: 'pairing_approved' }, (payload) => {
        const data = payload?.payload;
        if (data?.token === session.token && data?.profile && data?.shop) {
          onApproved({
            profile: data.profile,
            shop: data.shop,
            member: data.member,
          });
        } else {
          onError('Pairing verification token mismatch.');
        }
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('Realtime channel error for QR pairing');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
