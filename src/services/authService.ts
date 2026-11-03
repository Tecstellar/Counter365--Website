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

      // 2A. Priority 1: Check Staff Membership (by phone OR user_id)
      try {
        const { data: memberList, error: staffErr } = await (supabase.from('shop_members') as any)
          .select('*, shops(*)')
          .or(`phone.eq.${cleanPhone},user_id.eq.${profile.id}`)
          .neq('role', 'Owner')
          .order('created_at', { ascending: false })
          .limit(1);

        const activeMemberRow = memberList && memberList.length > 0 ? memberList[0] : null;

        if (activeMemberRow) {
          if (activeMemberRow.is_active === false) {
            return {
              success: false,
              error: 'Your staff account has been deactivated. Please contact the shop owner.',
            };
          }

          let s = activeMemberRow.shops;
          if (!s && activeMemberRow.shop_id) {
            const { data: directShop } = await (supabase.from('shops') as any)
              .select('*')
              .eq('id', activeMemberRow.shop_id)
              .maybeSingle();
            s = directShop;
          }

          if (s && !s.name?.startsWith('[Deleted]') && !s.phone?.includes('_del_')) {
            shopData = s;
            memberRole = (activeMemberRow.role as UserRole) || 'Supervisor';
            memberId = activeMemberRow.id;
            memberOverrides = activeMemberRow.permissions_override || {};

            // Link user_id and phone in shop_members if missing or outdated
            if (activeMemberRow.user_id !== profile.id || activeMemberRow.phone !== cleanPhone) {
              try {
                await (supabase.from('shop_members') as any)
                  .update({ user_id: profile.id, phone: cleanPhone, updated_at: new Date().toISOString() })
                  .eq('id', activeMemberRow.id);
              } catch (linkErr) {
                console.warn('Link staff member to profile notice:', linkErr);
              }
            }

            // Sync profile full_name if staff member has an established full_name
            if (activeMemberRow.full_name && (!profile.fullName || profile.fullName === 'Shop Owner' || profile.fullName === 'Staff Member' || profile.fullName === 'Demo Reviewer')) {
              profile.fullName = activeMemberRow.full_name;
              await storage.setObject(LOCAL_PROFILE_KEY, profile);
              try {
                await (supabase.from('profiles') as any)
                  .update({ full_name: activeMemberRow.full_name, updated_at: new Date().toISOString() })
                  .eq('id', profile.id);
              } catch (pUpErr) {
                console.warn('Update profile name notice:', pUpErr);
              }
            }
          }
        }
      } catch (sErr) {
        console.warn('Supabase staff membership check notice:', sErr);
      }

      // 2B. Priority 2: Check Owner shops table by phone
      if (!shopData) {
        try {
          const { data: shopList } = await (supabase.from('shops') as any)
            .select('*')
            .eq('phone', cleanPhone)
            .order('created_at', { ascending: false })
            .limit(1);
          shopData = (shopList && shopList.length > 0 && !shopList[0].phone?.includes('_del_') && !shopList[0].name?.startsWith('[Deleted]')) ? shopList[0] : null;
          if (shopData) {
            memberRole = 'Owner';
          }
        } catch (oErr) {
          console.warn('Supabase owner shops check notice:', oErr);
        }
      }

      // 2C. Priority 3: Check shop_members where role = 'Owner'
      if (!shopData) {
        try {
          const { data: ownerMemberList } = await (supabase.from('shop_members') as any)
            .select('*, shops(*)')
            .or(`phone.eq.${cleanPhone},user_id.eq.${profile.id}`)
            .eq('role', 'Owner')
            .order('created_at', { ascending: false })
            .limit(1);

          if (ownerMemberList && ownerMemberList.length > 0) {
            let s = ownerMemberList[0].shops;
            if (!s && ownerMemberList[0].shop_id) {
              const { data: directShop } = await (supabase.from('shops') as any)
                .select('*')
                .eq('id', ownerMemberList[0].shop_id)
                .maybeSingle();
              s = directShop;
            }
            if (s && !s.name?.startsWith('[Deleted]') && !s.phone?.includes('_del_')) {
              shopData = s;
              memberRole = 'Owner';
              memberId = ownerMemberList[0].id;
            }
          }
        } catch (omErr) {
          console.warn('Supabase owner member list check notice:', omErr);
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
          printerPaperWidth: shopData.printer_paper_width || '80mm',
          printerName: shopData.printer_name,
          printerUrl: shopData.printer_url,
          printerConnectionType: shopData.printer_connection_type,
          tableManagementEnabled: shopData.table_management_enabled ?? false,
          tableCount: shopData.table_count ?? 4,
          maxStaffLimit: shopData.max_staff_limit ?? 5,
          ownerName: shopData.owner_name,
          invoicePrefix: shopData.invoice_prefix,
          invoiceResetCycle: shopData.invoice_reset_cycle || 'monthly',
          upiId: shopData.upi_id,
          totalBillsCreated: shopData.total_bills_created ?? 0,
          isActive: shopData.is_active ?? true,
          createdAt: shopData.created_at,
          updatedAt: shopData.updated_at,
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
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(LOCAL_PROFILE_KEY);
        window.localStorage.removeItem(LOCAL_SHOP_KEY);
        window.localStorage.removeItem(LOCAL_MEMBER_KEY);
      }
    } catch (e) {
      console.warn('clearSession notice:', e);
    }
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
