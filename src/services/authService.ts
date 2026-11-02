import { supabase } from '../lib/supabase';
import { storage } from '../lib/storage';
import { UserProfile, ShopMember, Shop, ShopType, UserRole, PermissionKey } from '../types/models';
import { twoFactorService, SendOtpResult, DEMO_REVIEW_PHONE } from './twoFactorService';
import { generateUUID } from '../lib/uuid';

export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, Record<PermissionKey, boolean>> = {
  Owner: { bill: true, total: true, exp: true, pend: true, report: true, menu: true, menu_delete: true, users: true, subscription: true },
  Supervisor: { bill: true, total: true, exp: true, pend: true, report: true, menu: true, menu_delete: true, users: false, subscription: false },
  Biller: { bill: true, total: true, exp: false, pend: false, report: false, menu: false, menu_delete: false, users: false, subscription: false },
};

export const LOCAL_PROFILE_KEY = '@counterpro/user_profile';
export const LOCAL_MEMBER_KEY = '@counterpro/shop_member';
export const LOCAL_SHOP_KEY = '@counterpro/active_shop';

export interface VerifyAuthResult {
  success: boolean;
  profile?: UserProfile;
  isExistingShop?: boolean;
  shop?: Shop;
  member?: ShopMember;
  error?: string;
}

export const authService = {
  async sendOtp(phone: string): Promise<SendOtpResult> {
    return await twoFactorService.sendOtp(phone);
  },

  async verifyOtp(phone: string, token: string): Promise<VerifyAuthResult> {
    const cleanPhone = twoFactorService.sanitizePhone(phone);
    const verifyResult = await twoFactorService.verifyOtp(cleanPhone, token);

    if (!verifyResult.success) {
      return {
        success: false,
        error: verifyResult.error || 'Invalid OTP code entered.',
      };
    }

    try {
      // 1. Check if user profile exists in Supabase
      const { data: existingProfile } = await (supabase.from('profiles') as any)
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle();

      let profile: UserProfile;

      if (existingProfile) {
        profile = {
          id: existingProfile.id,
          fullName: existingProfile.full_name,
          phone: existingProfile.phone,
          avatarUrl: existingProfile.avatar_url,
        };
      } else {
        // Create standard profile for new user
        const newProfileId = generateUUID();
        const defaultName = cleanPhone === DEMO_REVIEW_PHONE ? 'Demo Reviewer' : 'Shop Owner';
        profile = {
          id: newProfileId,
          fullName: defaultName,
          phone: cleanPhone,
        };

        try {
          const { data: inserted, error: insertErr } = await (supabase.from('profiles') as any).insert({
            id: profile.id,
            full_name: profile.fullName,
            phone: profile.phone,
          }).select().single();

          if (inserted) {
            profile.id = inserted.id;
          } else if (insertErr) {
            console.warn('Profile Supabase insert notice:', insertErr.message);
          }
        } catch (dbErr) {
          console.warn('Profile Supabase sync notice:', dbErr);
        }
      }

      await storage.setObject(LOCAL_PROFILE_KEY, profile);

      // 2. Check if this phone belongs to a registered shop owner or shop member
      let shopData: any = null;
      let memberRole: UserRole = 'Owner';
      let memberId = generateUUID();
      let memberOverrides: any = undefined;

      // Staff membership check first
      try {
        const { data: staffList } = await (supabase.from('shop_members') as any)
          .select('*, shops(*)')
          .eq('user_id', profile.id)
          .eq('is_active', true)
          .neq('role', 'Owner')
          .order('created_at', { ascending: false })
          .limit(1);

        if (staffList && staffList.length > 0 && staffList[0].shops && !staffList[0].shops.name?.startsWith('[Deleted]')) {
          shopData = staffList[0].shops;
          memberRole = (staffList[0].role as UserRole) || 'Biller';
          memberId = staffList[0].id;
          memberOverrides = staffList[0].permissions_override;
        }
      } catch (sErr) {
        console.warn('Supabase staff membership check notice:', sErr);
      }

      // If not staff, check Owner shops table by phone
      if (!shopData) {
        const { data: shopList } = await (supabase.from('shops') as any)
          .select('*')
          .eq('phone', cleanPhone)
          .order('created_at', { ascending: false })
          .limit(1);
        shopData = (shopList && shopList.length > 0 && !shopList[0].phone?.includes('_del_') && !shopList[0].name?.startsWith('[Deleted]')) ? shopList[0] : null;
      }

      if (!shopData) {
        // Check by direct phone on shop_members
        try {
          const { data: memberByPhone } = await (supabase.from('shop_members') as any)
            .select('*, shops(*)')
            .eq('phone', cleanPhone)
            .order('created_at', { ascending: false })
            .limit(1);

          const activeMemberRow = memberByPhone && memberByPhone.length > 0 ? memberByPhone[0] : null;

          if (activeMemberRow) {
            if (activeMemberRow.is_active === false) {
              return {
                success: false,
                error: 'Your staff account has been deactivated. Please contact the shop owner.',
              };
            }
            if (activeMemberRow.shops) {
              shopData = activeMemberRow.shops;
              memberRole = (activeMemberRow.role as UserRole) || 'Biller';
              memberId = activeMemberRow.id;
              memberOverrides = activeMemberRow.permissions_override;
            }
          }
        } catch (mErr) {
          console.warn('Member check by phone notice:', mErr);
        }
      }

      if (shopData) {
        const shop: Shop = {
          id: shopData.id,
          name: shopData.name,
          shopType: (shopData.shop_type as ShopType) || 'Tea Shop',
          phone: shopData.phone,
          email: shopData.email,
          address: shopData.address || '',
          city: shopData.city || '',
          state: shopData.state || 'Tamil Nadu',
          country: shopData.country || 'India',
          pincode: shopData.pincode || '',
          latitude: shopData.latitude,
          longitude: shopData.longitude,
          logoUrl: shopData.logo_url,
          currencyCode: shopData.currency_code || 'INR',
          timezone: shopData.timezone || 'Asia/Kolkata',
          gstEnabled: shopData.gst_enabled ?? false,
          gstRate: shopData.gst_rate ?? 5,
          gstNumber: shopData.gst_number,
          roundOffEnabled: shopData.round_off_enabled ?? true,
          dailyBackupEnabled: shopData.daily_backup_enabled ?? true,
          printerEnabled: shopData.printer_enabled ?? false,
          printerName: shopData.printer_name,
          upiId: shopData.upi_id,
          totalBillsCreated: shopData.total_bills_created ?? 0,
          createdAt: shopData.created_at,
        };

        const member: ShopMember = {
          id: memberId,
          shopId: shop.id,
          userId: profile.id,
          fullName: profile.fullName,
          phone: profile.phone,
          role: memberRole,
          isActive: true,
          overrides: memberOverrides,
        };

        await storage.setObject(LOCAL_SHOP_KEY, shop);
        await storage.setObject(LOCAL_MEMBER_KEY, member);

        return {
          success: true,
          profile,
          isExistingShop: true,
          shop,
          member,
        };
      }

      return {
        success: true,
        profile,
        isExistingShop: false,
      };
    } catch (err: any) {
      console.error('verifyOtp critical exception:', err);
      return {
        success: false,
        error: 'Failed to authenticate user profile and shop. Please retry.',
      };
    }
  },

  async getStoredSession(): Promise<{ profile: UserProfile | null; shop: Shop | null; member: ShopMember | null }> {
    const profile = await storage.getObject<UserProfile | null>(LOCAL_PROFILE_KEY, null);
    const shop = await storage.getObject<Shop | null>(LOCAL_SHOP_KEY, null);
    const member = await storage.getObject<ShopMember | null>(LOCAL_MEMBER_KEY, null);
    return { profile, shop, member };
  },

  async clearSession(): Promise<void> {
    await storage.removeItem(LOCAL_PROFILE_KEY);
    await storage.removeItem(LOCAL_SHOP_KEY);
    await storage.removeItem(LOCAL_MEMBER_KEY);
  },

  canUserPerform(
    role: UserRole,
    permission: PermissionKey,
    overrides?: Partial<Record<PermissionKey, boolean>>
  ): boolean {
    if (role === 'Owner') return true;
    if (overrides && overrides[permission] !== undefined) {
      return !!overrides[permission];
    }
    const roleMap = ROLE_DEFAULT_PERMISSIONS[role];
    return !!(roleMap && roleMap[permission]);
  },
};
