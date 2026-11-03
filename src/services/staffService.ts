import { supabase } from '../lib/supabase';
import { generateUUID } from '../lib/uuid';

export type UserRole = 'Owner' | 'Supervisor' | 'Biller';

export type PermissionKey =
  | 'bill'
  | 'total'
  | 'exp'
  | 'pend'
  | 'report'
  | 'menu'
  | 'menu_delete'
  | 'users'
  | 'subscription';

export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, Record<PermissionKey, boolean>> = {
  Owner: {
    bill: true,
    total: true,
    exp: true,
    pend: true,
    report: true,
    menu: true,
    menu_delete: true,
    users: true,
    subscription: true,
  },
  Supervisor: {
    bill: true,
    total: true,
    exp: true,
    pend: true,
    report: true,
    menu: true,
    menu_delete: true,
    users: false,
    subscription: false,
  },
  Biller: {
    bill: true,
    total: true,
    exp: false,
    pend: false,
    report: false,
    menu: false,
    menu_delete: false,
    users: false,
    subscription: false,
  },
};

export interface ShopMember {
  id: string;
  shopId: string;
  userId: string;
  fullName: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  overrides?: Partial<Record<PermissionKey, boolean>>;
  createdAt?: string;
  deactivatedAt?: string | null;
}

export const staffService = {
  /**
   * Resolves whether a member can perform an action based on Role + Overrides
   */
  canPerform(member: ShopMember | null | undefined, perm: PermissionKey): boolean {
    if (!member) return false;
    if (member.role === 'Owner') return true;

    // Check custom overrides first
    if (member.overrides && typeof member.overrides[perm] === 'boolean') {
      return Boolean(member.overrides[perm]);
    }

    // Fallback to role defaults
    return Boolean(ROLE_DEFAULT_PERMISSIONS[member.role]?.[perm]);
  },

  /**
   * Fetch all members for a shop directly from Supabase (Never cache in localStorage)
   */
  async getShopMembers(shopId: string): Promise<ShopMember[]> {
    if (!shopId) return [];

    const { data, error } = await (supabase.from('shop_members') as any)
      .select('*, profiles:profiles!shop_members_user_id_fkey(full_name, phone)')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching shop members:', error);
      throw error;
    }

    return (data || []).map((m: any): ShopMember => {
      let overrides = m.permissions_override;
      if (typeof overrides === 'string') {
        try {
          overrides = JSON.parse(overrides);
        } catch {
          overrides = {};
        }
      }

      return {
        id: m.id,
        shopId: m.shop_id,
        userId: m.user_id,
        fullName: m.full_name || m.profiles?.full_name || (m.role === 'Owner' ? 'Shop Owner' : 'Staff Member'),
        phone: m.phone || m.profiles?.phone || '',
        role: (m.role as UserRole) || 'Biller',
        isActive: m.is_active ?? true,
        overrides: typeof overrides === 'object' && overrides !== null ? overrides : {},
        createdAt: m.created_at,
        deactivatedAt: m.deactivated_at,
      };
    });
  },

  /**
   * Add a new staff member directly to Supabase
   */
  async addMember(
    shopId: string,
    fullName: string,
    role: UserRole,
    phone: string,
    overrides?: Partial<Record<PermissionKey, boolean>>
  ): Promise<ShopMember> {
    const cleanDigits = phone.replace(/[^0-9]/g, '').slice(-10);
    if (!cleanDigits || cleanDigits.length !== 10) {
      throw new Error('Please enter a valid 10-digit mobile number.');
    }

    // 1. Check if profile exists for this phone; if not, create one
    let targetUserId = generateUUID();
    const { data: existingProfile } = await (supabase.from('profiles') as any)
      .select('id')
      .eq('phone', cleanDigits)
      .maybeSingle();

    if (existingProfile?.id) {
      targetUserId = existingProfile.id;
    } else {
      await (supabase.from('profiles') as any).insert({
        id: targetUserId,
        full_name: fullName.trim(),
        phone: cleanDigits,
      });
    }

    // 2. Check if already a member of this shop (by phone or user_id)
    const { data: existingMember } = await (supabase.from('shop_members') as any)
      .select('id, is_active')
      .eq('shop_id', shopId)
      .or(`phone.eq.${cleanDigits},user_id.eq.${targetUserId}`)
      .maybeSingle();

    if (existingMember) {
      if (existingMember.is_active === false) {
        // Re-activate previously deactivated staff member
        await (supabase.from('shop_members') as any)
          .update({
            is_active: true,
            role,
            phone: cleanDigits,
            full_name: fullName.trim(),
            permissions_override: overrides || {},
            deactivated_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingMember.id);

        if (overrides && Object.keys(overrides).length > 0) {
          const upoRows = Object.entries(overrides).map(([k, v]) => ({
            shop_id: shopId,
            member_id: existingMember.id,
            permission_key: k,
            granted: !!v,
          }));
          await (supabase.from('user_permission_overrides') as any).upsert(upoRows);
        }

        return {
          id: existingMember.id,
          shopId,
          userId: targetUserId,
          fullName: fullName.trim(),
          phone: cleanDigits,
          role,
          isActive: true,
          overrides: overrides || {},
        };
      }
      throw new Error('This phone number is already registered as staff for this shop.');
    }

    // 3. Insert into shop_members
    const newMemberId = generateUUID();
    const { error: insertError } = await (supabase.from('shop_members') as any).insert({
      id: newMemberId,
      shop_id: shopId,
      user_id: targetUserId,
      full_name: fullName.trim(),
      phone: cleanDigits,
      role,
      is_active: true,
      permissions_override: overrides || {},
    });

    if (insertError) {
      throw insertError;
    }

    // Sync to user_permission_overrides
    if (overrides && Object.keys(overrides).length > 0) {
      const upoRows = Object.entries(overrides).map(([k, v]) => ({
        shop_id: shopId,
        member_id: newMemberId,
        permission_key: k,
        granted: !!v,
      }));
      await (supabase.from('user_permission_overrides') as any).upsert(upoRows);
    }

    return {
      id: newMemberId,
      shopId,
      userId: targetUserId,
      fullName: fullName.trim(),
      phone: cleanDigits,
      role,
      isActive: true,
      overrides: overrides || {},
    };
  },

  /**
   * Update role (Owner only)
   */
  async updateRole(shopId: string, memberId: string, newRole: UserRole): Promise<void> {
    const { error } = await (supabase.from('shop_members') as any)
      .update({ role: newRole, permissions_override: {} })
      .eq('id', memberId)
      .eq('shop_id', shopId);

    if (error) throw error;
  },

  /**
   * Update individual permission override
   */
  async setPermissionOverride(
    shopId: string,
    memberId: string,
    currentOverrides: Partial<Record<PermissionKey, boolean>>,
    perm: PermissionKey,
    enabled: boolean
  ): Promise<void> {
    const nextOverrides = { ...currentOverrides, [perm]: enabled };
    const { error } = await (supabase.from('shop_members') as any)
      .update({ permissions_override: nextOverrides })
      .eq('id', memberId)
      .eq('shop_id', shopId);

    if (error) throw error;

    // Sync to user_permission_overrides table
    try {
      await (supabase.from('user_permission_overrides') as any).upsert({
        shop_id: shopId,
        member_id: memberId,
        permission_key: perm,
        granted: enabled,
      });
    } catch (err) {
      console.warn('user_permission_overrides sync notice:', err);
    }
  },

  /**
   * Toggle active/inactive status
   */
  async toggleMemberActive(shopId: string, memberId: string, isActive: boolean): Promise<void> {
    const { error } = await (supabase.from('shop_members') as any)
      .update({
        is_active: isActive,
        deactivated_at: isActive ? null : new Date().toISOString(),
      })
      .eq('id', memberId)
      .eq('shop_id', shopId);

    if (error) throw error;
  },

  /**
   * Permanently delete staff member
   */
  async deleteMember(shopId: string, memberId: string): Promise<void> {
    try {
      await (supabase.from('user_permission_overrides') as any)
        .delete()
        .eq('member_id', memberId);
    } catch {}

    const { error } = await (supabase.from('shop_members') as any)
      .delete()
      .eq('id', memberId)
      .eq('shop_id', shopId);

    if (error) throw error;
  },

  /**
   * Listen to real-time changes on shop_members table
   */
  subscribeToShopMembers(shopId: string, onUpdate: () => void) {
    const channel = supabase
      .channel(`shop_members_${shopId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shop_members', filter: `shop_id=eq.${shopId}` },
        () => {
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
