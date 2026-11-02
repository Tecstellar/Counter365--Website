import { supabase } from '../lib/supabase';
import { storage } from '../lib/storage';
import { CustomerRecord, VendorRecord } from '../types/models';
import { generateUUID } from '../lib/uuid';

const CUSTOMERS_KEY_PREFIX = '@counterpro/customers_';
const VENDORS_KEY_PREFIX = '@counterpro/vendors_';

export const contactService = {
  async getCustomers(shopId: string): Promise<CustomerRecord[]> {
    const key = `${CUSTOMERS_KEY_PREFIX}${shopId}`;
    const local = await storage.getObject<CustomerRecord[]>(key, []);

    try {
      const { data, error } = await (supabase.from('customers') as any)
        .select('*')
        .eq('shop_id', shopId)
        .order('name', { ascending: true });

      if (!error && data) {
        const records: CustomerRecord[] = data.map((c: any) => ({
          id: c.id,
          shopId: c.shop_id,
          name: c.name,
          phone: c.phone,
          location: c.location,
          notes: c.notes,
          totalBills: Number(c.total_bills) || 0,
          pendingBalance: Number(c.pending_balance) || 0,
          statusTag: c.status_tag || (Number(c.pending_balance) > 0 ? 'Pending' : 'Regular'),
          isActive: c.is_active ?? true,
        }));
        await storage.setObject(key, records);
        return records;
      }
    } catch (err) {
      console.warn('getCustomers remote notice:', err);
    }

    return local;
  },

  async saveCustomer(customer: CustomerRecord): Promise<CustomerRecord> {
    const key = `${CUSTOMERS_KEY_PREFIX}${customer.shopId}`;
    const customers = await storage.getObject<CustomerRecord[]>(key, []);
    const idx = customers.findIndex(c => c.id === customer.id);

    if (idx >= 0) {
      customers[idx] = customer;
    } else {
      customers.push(customer);
    }
    await storage.setObject(key, customers);

    try {
      await (supabase.from('customers') as any).upsert({
        id: customer.id,
        shop_id: customer.shopId,
        name: customer.name,
        phone: customer.phone,
        location: customer.location,
        notes: customer.notes,
        total_bills: customer.totalBills,
        pending_balance: customer.pendingBalance,
        status_tag: customer.statusTag,
        is_active: customer.isActive ?? true,
      });
    } catch (err) {
      console.warn('saveCustomer remote error:', err);
    }

    return customer;
  },

  async getVendors(shopId: string): Promise<VendorRecord[]> {
    const key = `${VENDORS_KEY_PREFIX}${shopId}`;
    return await storage.getObject<VendorRecord[]>(key, []);
  },

  async saveVendor(vendor: VendorRecord): Promise<VendorRecord> {
    const key = `${VENDORS_KEY_PREFIX}${vendor.shopId}`;
    const vendors = await storage.getObject<VendorRecord[]>(key, []);
    const idx = vendors.findIndex(v => v.id === vendor.id);

    if (idx >= 0) {
      vendors[idx] = vendor;
    } else {
      vendors.push(vendor);
    }
    await storage.setObject(key, vendors);
    return vendor;
  },
};
