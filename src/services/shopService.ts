import { supabase } from '../lib/supabase';
import { storage } from '../lib/storage';
import { Shop, ShopMember, ShopType, UserRole, PermissionKey } from '../types/models';
import { generateUUID } from '../lib/uuid';
import { LOCAL_SHOP_KEY, LOCAL_MEMBER_KEY } from './authService';
import { menuService } from './menuService';

export const DEFAULT_ROLE_PERMS: Record<UserRole, Record<PermissionKey, boolean>> = {
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

export const MODULE_PERMISSIONS: Array<{ key: PermissionKey; label: string; desc: string }> = [
  { key: 'bill', label: 'Take bills', desc: 'Create, collect payment, and print customer bills' },
  { key: 'total', label: "See the day's takings", desc: 'View today revenue summary, split, and total bills' },
  { key: 'exp', label: 'Add expenses', desc: 'Record shop daily payouts, wages, and raw materials' },
  { key: 'pend', label: 'Clear pending', desc: 'Settle customer udhar khata balances and dues' },
  { key: 'report', label: 'See day report and analytics', desc: 'Access monthly reports, graphs, and audit ledgers' },
  { key: 'menu', label: 'Edit menu and prices', desc: 'Change prices, portion availability, and food names' },
  { key: 'menu_delete', label: 'Delete menu items and categories', desc: 'Permanently remove dishes or categories' },
  { key: 'users', label: 'Add or remove users', desc: 'Manage staff accounts and operational roles' },
];

export const shopService = {
  async registerShop(params: {
    name: string;
    shopType: ShopType;
    phone: string;
    address: string;
    city: string;
    pincode: string;
    ownerName?: string;
    ownerId?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
    hasLogo?: boolean;
    logoUrl?: string;
    gstEnabled?: boolean;
    gstRate?: number;
    gstNumber?: string;
    tableManagementEnabled?: boolean;
    tableCount?: number;
    invoicePrefix?: string;
  }): Promise<{ shop: Shop; member: ShopMember }> {
    const cleanPhone = params.phone ? params.phone.replace(/\D/g, '') : '';
    let shopId = '';

    // Anti-duplicate protection: check if phone already registered in Supabase
    if (cleanPhone && cleanPhone !== '9999999999') {
      try {
        const { data: existingShops } = await (supabase.from('shops') as any)
          .select('id')
          .eq('phone', cleanPhone)
          .order('created_at', { ascending: false })
          .limit(1);

        if (existingShops && existingShops.length > 0) {
          shopId = existingShops[0].id;
        }
      } catch (checkErr) {
        console.warn('registerShop anti-duplicate notice:', checkErr);
      }
    }

    if (!shopId) {
      shopId = generateUUID();
    }
    const memberId = generateUUID();
    const ownerUserId = params.ownerId || generateUUID();
    const cleanOwnerName = (params.ownerName || 'Shop Owner').trim();

    const shop: Shop = {
      id: shopId,
      name: params.name.trim(),
      shopType: params.shopType,
      phone: cleanPhone || params.phone,
      address: params.address.trim(),
      city: params.city.trim(),
      state: params.state?.trim() || 'Tamil Nadu',
      country: 'India',
      pincode: params.pincode.trim(),
      latitude: params.latitude,
      longitude: params.longitude,
      logoUrl: params.logoUrl,
      currencyCode: 'INR',
      timezone: 'Asia/Kolkata',
      gstEnabled: params.gstEnabled ?? false,
      gstRate: params.gstRate ?? 5,
      gstNumber: params.gstNumber?.trim() || null,
      tableManagementEnabled: params.tableManagementEnabled ?? false,
      tableCount: params.tableCount || 6,
      roundOffEnabled: true,
      dailyBackupEnabled: true,
      printerEnabled: false,
      ownerName: cleanOwnerName,
      invoicePrefix: params.invoicePrefix || params.name.trim().slice(0, 3).toUpperCase(),
      totalBillsCreated: 0,
      createdAt: new Date().toISOString(),
    };

    const member: ShopMember = {
      id: memberId,
      shopId: shop.id,
      userId: ownerUserId,
      fullName: cleanOwnerName,
      phone: shop.phone,
      role: 'Owner',
      isActive: true,
    };

    await storage.setObject(LOCAL_SHOP_KEY, shop);
    await storage.setObject(LOCAL_MEMBER_KEY, member);

    try {
      // 1. Upsert shop
      await (supabase.from('shops') as any).upsert({
        id: shop.id,
        name: shop.name,
        shop_type: shop.shopType,
        phone: shop.phone,
        address: shop.address,
        city: shop.city,
        state: shop.state,
        country: shop.country,
        pincode: shop.pincode,
        latitude: shop.latitude,
        longitude: shop.longitude,
        logo_url: shop.logoUrl,
        currency_code: shop.currencyCode,
        timezone: shop.timezone,
        gst_enabled: shop.gstEnabled,
        gst_rate: shop.gstRate,
        gst_number: shop.gstNumber,
        table_management_enabled: shop.tableManagementEnabled,
        table_count: shop.tableCount,
        owner_name: shop.ownerName,
        round_off_enabled: shop.roundOffEnabled,
        daily_backup_enabled: shop.dailyBackupEnabled,
        is_active: true,
        total_bills_created: 0,
        created_at: shop.createdAt,
      });

      // 2. Ensure Profile exists
      await (supabase.from('profiles') as any).upsert({
        id: ownerUserId,
        full_name: cleanOwnerName,
        phone: shop.phone,
      });

      // 3. Upsert Owner Member
      await (supabase.from('shop_members') as any).upsert({
        id: member.id,
        shop_id: shop.id,
        user_id: ownerUserId,
        phone: shop.phone,
        full_name: member.fullName,
        role: 'Owner',
        is_active: true,
      });

      // 4. Create Free Lifetime Subscription
      await (supabase.from('subscriptions') as any).upsert({
        id: generateUUID(),
        shop_id: shop.id,
        plan: 'free',
        plan_name: 'Free Forever',
        status: 'active',
        amount: 0.00,
        interval: 'lifetime',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // 5. Bootstrap starter menu items
      await menuService.bootstrapShopCatalog(shop.id, shop.shopType);
    } catch (err) {
      console.warn('registerShop remote notice:', err);
    }

    return { shop, member };
  },

  async updateShop(shop: Shop): Promise<Shop> {
    await storage.setObject(LOCAL_SHOP_KEY, shop);

    try {
      await (supabase.from('shops') as any)
        .update({
          name: shop.name,
          shop_type: shop.shopType,
          address: shop.address,
          city: shop.city,
          pincode: shop.pincode,
          gst_enabled: shop.gstEnabled,
          gst_rate: shop.gstRate,
          gst_number: shop.gstNumber,
          round_off_enabled: shop.roundOffEnabled,
          upi_id: shop.upiId,
          printer_enabled: shop.printerEnabled,
          printer_name: shop.printerName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shop.id);
    } catch (err) {
      console.warn('updateShop remote error:', err);
    }

    return shop;
  },

  async getShopMembers(shopId: string): Promise<ShopMember[]> {
    const key = `@counterpro/members_${shopId}`;
    const local = await storage.getObject<ShopMember[]>(key, []);

    try {
      const { data, error } = await (supabase.from('shop_members') as any)
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const members: ShopMember[] = data.map((m: any) => ({
          id: m.id,
          shopId: m.shop_id,
          userId: m.user_id,
          fullName: m.full_name || 'Staff Member',
          phone: m.phone || '',
          role: m.role as UserRole,
          isActive: m.is_active ?? true,
          overrides: m.permissions_override,
          deactivatedAt: m.deactivated_at,
          deactivatedBy: m.deactivated_by,
          deactivationReason: m.deactivation_reason,
        }));
        await storage.setObject(key, members);
        return members;
      }
    } catch (err) {
      console.warn('getShopMembers remote notice:', err);
    }

    return local;
  },

  async addStaffMember(
    shopId: string,
    params: { fullName: string; phone: string; role: UserRole; overrides?: Partial<Record<PermissionKey, boolean>> }
  ): Promise<ShopMember> {
    const key = `@counterpro/members_${shopId}`;
    const members = await storage.getObject<ShopMember[]>(key, []);

    const newMember: ShopMember = {
      id: generateUUID(),
      shopId,
      userId: generateUUID(),
      fullName: params.fullName.trim(),
      phone: params.phone.replace(/[^0-9]/g, '').slice(-10),
      role: params.role,
      isActive: true,
      overrides: params.overrides,
    };

    members.push(newMember);
    await storage.setObject(key, members);

    try {
      await (supabase.from('shop_members') as any).insert({
        id: newMember.id,
        shop_id: shopId,
        user_id: newMember.userId,
        full_name: newMember.fullName,
        phone: newMember.phone,
        role: newMember.role,
        is_active: true,
        permissions_override: params.overrides || null,
      });
    } catch (err) {
      console.warn('addStaffMember remote error:', err);
    }

    return newMember;
  },

  async updateMemberRole(
    memberId: string,
    shopId: string,
    role: UserRole,
    overrides?: Partial<Record<PermissionKey, boolean>>
  ): Promise<void> {
    const key = `@counterpro/members_${shopId}`;
    const members = await storage.getObject<ShopMember[]>(key, []);
    const match = members.find(m => m.id === memberId);
    if (match) {
      match.role = role;
      match.overrides = overrides;
      await storage.setObject(key, members);
    }

    try {
      await (supabase.from('shop_members') as any)
        .update({
          role,
          permissions_override: overrides || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', memberId);
    } catch (err) {
      console.warn('updateMemberRole remote error:', err);
    }
  },

  async toggleMemberActive(memberId: string, shopId: string, isActive: boolean): Promise<void> {
    const key = `@counterpro/members_${shopId}`;
    const members = await storage.getObject<ShopMember[]>(key, []);
    const match = members.find(m => m.id === memberId);
    if (match) {
      match.isActive = isActive;
      await storage.setObject(key, members);
    }

    try {
      await (supabase.from('shop_members') as any)
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', memberId);
    } catch (err) {
      console.warn('toggleMemberActive remote error:', err);
    }
  },

  async removeStaffMember(memberId: string, shopId: string): Promise<void> {
    const key = `@counterpro/members_${shopId}`;
    const members = await storage.getObject<ShopMember[]>(key, []);
    const filtered = members.filter(m => m.id !== memberId);
    await storage.setObject(key, filtered);

    try {
      await (supabase.from('shop_members') as any)
        .delete()
        .eq('id', memberId);
    } catch (err) {
      console.warn('removeStaffMember remote error:', err);
    }
  },
};
