import { supabase } from '../lib/supabase';
import { storage } from '../lib/storage';
import {
  Bill,
  Shop,
  CartItem,
  PaymentMethod,
  UserRole,
  BillItemRecord,
  CustomerRecord,
} from '../types/models';
import { calculateGST, formatRupee } from '../lib/money';
import { generateUUID } from '../lib/uuid';
import { subscriptionService } from './subscriptionService';
import { LOCAL_SHOP_KEY } from './authService';

const BILLS_KEY_PREFIX = '@counterpro/bills_';
const BILL_COUNT_KEY_PREFIX = '@counterpro/bill_count_';

export const billingService = {
  getStorageKey(shopId: string): string {
    return `${BILLS_KEY_PREFIX}${shopId}`;
  },

  async getTotalBillsCreated(shopId: string): Promise<number> {
    const key = `@counterpro/total_bills_created_${shopId}`;
    const local = await storage.getObject<number>(key, 0);
    try {
      const { data } = await (supabase.from('shops') as any)
        .select('total_bills_created')
        .eq('id', shopId)
        .maybeSingle();
      if (data && typeof data.total_bills_created === 'number') {
        const val = Math.max(local, data.total_bills_created);
        await storage.setObject(key, val);
        return val;
      }
    } catch {}
    return local;
  },

  async getNextBillNumber(shopId: string, customPrefix?: string): Promise<string> {
    const monthName = new Date().toLocaleDateString('en-US', { month: 'long', timeZone: 'Asia/Kolkata' });
    let prefix = customPrefix?.trim().toUpperCase();

    // 1. If prefix not provided, fetch from shops table or local cache
    if (!prefix) {
      try {
        const { data: shopRow } = await (supabase.from('shops') as any)
          .select('invoice_prefix, name')
          .eq('id', shopId)
          .maybeSingle();

        if (shopRow?.invoice_prefix) {
          prefix = shopRow.invoice_prefix.trim().toUpperCase();
        } else if (shopRow?.name) {
          prefix = shopRow.name.trim().slice(0, 3).toUpperCase();
        }
      } catch {}
    }
    if (!prefix) prefix = 'TTS';

    const countKey = `${BILL_COUNT_KEY_PREFIX}${shopId}_${monthName.toLowerCase()}`;
    let current = await storage.getObject<number>(countKey, 0);

    // Try fetching max bill_number for this month from Supabase
    try {
      const { data } = await (supabase.from('bills') as any)
        .select('bill_number')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (data && data.length > 0) {
        for (const row of data) {
          const bNum = row.bill_number;
          if (!bNum) continue;
          // Match if this bill belongs to the current month e.g. TTS-November-001 or DTS-November-005
          if (bNum.toLowerCase().includes(monthName.toLowerCase())) {
            const match = bNum.match(/(\d+)$/);
            if (match) {
              const parsed = parseInt(match[1], 10);
              if (!isNaN(parsed) && parsed > current) {
                current = parsed;
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('getNextBillNumber Supabase check notice:', err);
    }

    const next = current + 1;
    await storage.setObject(countKey, next);
    return `${prefix}-${monthName}-${next.toString().padStart(3, '0')}`;
  },

  async getBills(shopId: string): Promise<Bill[]> {
    const key = this.getStorageKey(shopId);
    const local = await storage.getObject<Bill[]>(key, []);

    try {
      const { data: billRows, error } = await (supabase.from('bills') as any)
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (!error && billRows) {
        // Fetch items for recent bills
        const billIds = billRows.map((b: any) => b.id);
        let itemsMap: Record<string, BillItemRecord[]> = {};

        if (billIds.length > 0) {
          const { data: itemRows } = await (supabase.from('bill_items') as any)
            .select('*')
            .in('bill_id', billIds);

          if (itemRows) {
            itemRows.forEach((it: any) => {
              if (!itemsMap[it.bill_id]) itemsMap[it.bill_id] = [];
              itemsMap[it.bill_id].push({
                id: it.id,
                menuItemId: it.menu_item_id,
                itemName: it.item_name,
                isHalf: it.is_half ?? false,
                unitPrice: Number(it.unit_price) || 0,
                quantity: Number(it.quantity) || 1,
                lineTotal: Number(it.line_total) || 0,
              });
            });
          }
        }

        const remoteBills: Bill[] = billRows.map((b: any) => ({
          id: b.id,
          shopId: b.shop_id,
          billNumber: b.bill_number || '#0001',
          customerId: b.customer_id,
          customerName: b.customer_name,
          customerPhone: b.customer_phone,
          tableNumber: b.table_number,
          status: b.status || 'completed',
          subtotal: Number(b.subtotal) || 0,
          discountType: b.discount_type,
          discountValue: Number(b.discount_value) || 0,
          discountAmount: Number(b.discount_amount) || 0,
          gstRate: Number(b.gst_rate) || 0,
          gstAmount: Number(b.gst_amount) || 0,
          totalAmount: Number(b.total_amount) || 0,
          paidAmount: Number(b.paid_amount) || 0,
          pendingAmount: Number(b.pending_amount) || 0,
          cashAmount: b.cash_amount ? Number(b.cash_amount) : undefined,
          gpayAmount: b.gpay_amount ? Number(b.gpay_amount) : undefined,
          paymentMode: b.payment_mode || 'Cash',
          clientOperationId: b.client_operation_id,
          items: itemsMap[b.id] || [],
          createdAt: b.created_at,
          completedAt: b.completed_at || b.created_at,
          createdByName: b.created_by_name,
          createdByRole: b.created_by_role,
          isEdited: b.is_edited ?? false,
          editedAt: b.edited_at,
          editedByName: b.edited_by_name || null,
          isCancelled: b.is_cancelled ?? false,
          cancellationReason: b.cancellation_reason,
          deletedByName: b.cancellation_reason && b.cancellation_reason.startsWith('Deleted by ')
            ? b.cancellation_reason.replace('Deleted by ', '').split(' (')[0]
            : null,
          deletedByRole: b.cancellation_reason && b.cancellation_reason.includes('(')
            ? b.cancellation_reason.split('(')[1]?.replace(')', '')
            : null,
        }));

        await storage.setObject(key, remoteBills);
        return remoteBills;
      }
    } catch (err) {
      console.warn('getBills remote fetch notice:', err);
    }

    return local;
  },

  /**
   * Authoritative public bill & shop resolver for WhatsApp shared links (/b/:billId).
   * Dynamically reflects updates/edits immediately.
   */
  async getPublicBill(billIdentifier: string): Promise<{
    bill: Bill;
    shop: Shop | null;
  } | null> {
    if (!billIdentifier) return null;
    const cleanId = billIdentifier.trim();

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
      let billData: any = null;

      // 1. Try finding by UUID
      if (isUuid) {
        const { data, error } = await (supabase.from('bills') as any)
          .select('*')
          .eq('id', cleanId)
          .maybeSingle();
        if (!error && data) billData = data;
      }

      // 2. Try finding by exact bill_number
      if (!billData) {
        const { data, error } = await (supabase.from('bills') as any)
          .select('*')
          .eq('bill_number', cleanId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!error && data) billData = data;
      }

      // 3. Try with or without '#' prefix
      if (!billData) {
        const altNumber = cleanId.startsWith('#') ? cleanId.replace(/^#/, '') : `#${cleanId}`;
        const { data, error } = await (supabase.from('bills') as any)
          .select('*')
          .eq('bill_number', altNumber)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!error && data) billData = data;
      }

      // 4. Try ilike match if still not found
      if (!billData && cleanId.length >= 3) {
        const { data, error } = await (supabase.from('bills') as any)
          .select('*')
          .ilike('bill_number', `%${cleanId}%`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!error && data) billData = data;
      }

      if (billData) {
        // Fetch items directly from bill_items (guaranteeing edited items show)
        const { data: itemRows } = await (supabase.from('bill_items') as any)
          .select('*')
          .eq('bill_id', billData.id)
          .order('created_at', { ascending: true });

        const items: BillItemRecord[] = (itemRows || []).map((it: any) => ({
          id: it.id,
          menuItemId: it.menu_item_id,
          itemName: it.item_name,
          isHalf: it.is_half ?? false,
          unitPrice: Number(it.unit_price) || 0,
          quantity: Number(it.quantity) || 1,
          lineTotal: Number(it.line_total) || 0,
        }));

        // Fetch shop details
        let shopObj: Shop | null = null;
        if (billData.shop_id) {
          const { data: sData } = await (supabase.from('shops') as any)
            .select('*')
            .eq('id', billData.shop_id)
            .maybeSingle();

          if (sData) {
            shopObj = {
              id: sData.id,
              name: sData.name,
              shopType: sData.shop_type,
              phone: sData.phone,
              email: sData.email,
              address: sData.address || '',
              city: sData.city || '',
              state: sData.state || 'Tamil Nadu',
              country: sData.country || 'India',
              pincode: sData.pincode || '',
              latitude: sData.latitude,
              longitude: sData.longitude,
              logoUrl: sData.logo_url,
              currencyCode: sData.currency_code || 'INR',
              timezone: sData.timezone || 'Asia/Kolkata',
              gstEnabled: sData.gst_enabled ?? false,
              gstRate: sData.gst_rate ?? 5,
              gstNumber: sData.gst_number,
              roundOffEnabled: sData.round_off_enabled ?? true,
              dailyBackupEnabled: sData.daily_backup_enabled ?? true,
              printerEnabled: sData.printer_enabled ?? false,
              printerName: sData.printer_name,
              tableManagementEnabled: sData.table_management_enabled ?? false,
              tableCount: sData.table_count ?? 6,
              ownerName: sData.owner_name,
              invoicePrefix: sData.invoice_prefix,
              invoiceResetCycle: sData.invoice_reset_cycle,
              totalBillsCreated: sData.total_bills_created ?? 0,
              upiId: sData.upi_id,
              isActive: sData.is_active ?? true,
              createdAt: sData.created_at,
              updatedAt: sData.updated_at,
            };
          }
        }

        const bill: Bill = {
          id: billData.id,
          shopId: billData.shop_id,
          billNumber: billData.bill_number || '#0001',
          customerId: billData.customer_id,
          customerName: billData.customer_name,
          customerPhone: billData.customer_phone,
          tableNumber: billData.table_number,
          status: billData.status || 'completed',
          subtotal: Number(billData.subtotal) || 0,
          discountType: billData.discount_type,
          discountValue: Number(billData.discount_value) || 0,
          discountAmount: Number(billData.discount_amount) || 0,
          gstRate: Number(billData.gst_rate) || 0,
          gstAmount: Number(billData.gst_amount) || 0,
          totalAmount: Number(billData.total_amount) || 0,
          paidAmount: Number(billData.paid_amount) || 0,
          pendingAmount: Number(billData.pending_amount) || 0,
          cashAmount: billData.cash_amount ? Number(billData.cash_amount) : undefined,
          gpayAmount: billData.gpay_amount ? Number(billData.gpay_amount) : undefined,
          paymentMode: billData.payment_mode || 'Cash',
          items,
          createdAt: billData.created_at,
          completedAt: billData.completed_at || billData.created_at,
          createdByName: billData.created_by_name,
          createdByRole: billData.created_by_role,
          isEdited: billData.is_edited ?? false,
          editedAt: billData.edited_at,
          editedByName: billData.edited_by_name || null,
          isCancelled: billData.is_cancelled ?? false,
          cancellationReason: billData.cancellation_reason,
        };

        return { bill, shop: shopObj };
      }
    } catch (err) {
      console.warn('getPublicBill remote fetch notice:', err);
    }

    // Local storage fallback if viewing on shop's own browser
    try {
      const activeShop = await storage.getObject<Shop | null>(LOCAL_SHOP_KEY, null);
      if (activeShop) {
        const key = this.getStorageKey(activeShop.id);
        const localBills = await storage.getObject<Bill[]>(key, []);
        const found = localBills.find(
          (b) =>
            b.id === cleanId ||
            b.billNumber === cleanId ||
            b.billNumber?.replace(/[^a-zA-Z0-9_-]/g, '') === cleanId
        );
        if (found) {
          return { bill: found, shop: activeShop };
        }
      }
    } catch {}

    return null;
  },

  async createBill(params: {
    shopId: string;
    invoicePrefix?: string;
    cart: CartItem[];
    paymentMode: PaymentMethod;
    gstEnabled: boolean;
    gstRate?: number;
    customerName?: string;
    customerPhone?: string;
    customerId?: string;
    paidAmount?: number;
    cashAmount?: number;
    gpayAmount?: number;
    tableNumber?: string | null;
    creator?: { name?: string; role?: string; id?: string };
    discount?: { type: 'percentage' | 'fixed'; value: number; appliedBy?: string; approvedBy?: string };
    roundOffEnabled?: boolean;
    createdAt?: string;
  }): Promise<{ bill: Bill; isDuplicate: boolean }> {
    if (!params.cart || params.cart.length === 0) {
      throw new Error('Cart cannot be empty.');
    }

    // 1. Subscription check (100 free bill limit)
    const totalCreatedCount = await this.getTotalBillsCreated(params.shopId);
    const { statusInfo } = await subscriptionService.getShopSubscription(params.shopId, null, totalCreatedCount);

    if (statusInfo.billLimitReached && !statusInfo.isPaidActive) {
      throw new Error('Free tier limit of 100 bills reached. Please upgrade to Pro to continue billing.');
    }

    const nextCount = totalCreatedCount + 1;
    const billNumber = await this.getNextBillNumber(params.shopId, params.invoicePrefix);

    // Update total count
    const TOTAL_KEY = `@counterpro/total_bills_created_${params.shopId}`;
    await storage.setObject(TOTAL_KEY, nextCount);
    try {
      await (supabase.from('shops') as any)
        .update({ total_bills_created: nextCount })
        .eq('id', params.shopId);
    } catch {}

    const originalSubtotal = params.cart.reduce((sum, item) => sum + item.lineTotal, 0);

    // Validate discount authority
    let discountAmount = 0;
    if (params.discount && params.discount.value > 0) {
      if (params.creator?.role === 'Biller') {
        const isExceeded = params.discount.type === 'percentage'
          ? params.discount.value > 10
          : params.discount.value > (originalSubtotal * 0.1);
        if (isExceeded && !params.discount.approvedBy) {
          throw new Error('Unauthorized: Discounts above 10% require Supervisor or Owner approval.');
        }
      }
      discountAmount = params.discount.type === 'percentage'
        ? (originalSubtotal * params.discount.value) / 100
        : params.discount.value;
      discountAmount = Math.max(0, Math.min(discountAmount, originalSubtotal));
    }

    const finalSubtotal = originalSubtotal - discountAmount;
    const gstRate = params.gstEnabled
      ? (params.gstRate !== undefined && params.gstRate !== null ? params.gstRate : 5)
      : 0;
    const gstAmount = params.gstEnabled ? calculateGST(finalSubtotal, gstRate) : 0;
    const rawTotal = finalSubtotal + gstAmount;
    const totalAmount = params.roundOffEnabled ? Math.round(rawTotal) : rawTotal;
    const originalTotal = originalSubtotal + (params.gstEnabled ? calculateGST(originalSubtotal, gstRate) : 0);

    let paidAmount = totalAmount;
    let pendingAmount = 0;
    let cashAmount = params.cashAmount || 0;
    let gpayAmount = params.gpayAmount || 0;

    if (params.paymentMode === 'Pending') {
      paidAmount = 0;
      pendingAmount = totalAmount;
    } else if (params.paymentMode === 'Partial Pay') {
      paidAmount = Math.max(0, Math.min(totalAmount, Number(params.paidAmount) || 0));
      pendingAmount = Math.max(0, totalAmount - paidAmount);
    } else if (params.paymentMode === 'Cash + GPay') {
      cashAmount = Number(params.cashAmount) || 0;
      gpayAmount = Number(params.gpayAmount) || Math.max(0, totalAmount - cashAmount);
      paidAmount = totalAmount;
      pendingAmount = 0;
    } else {
      paidAmount = totalAmount;
      pendingAmount = 0;
    }

    const billId = generateUUID();
    const cleanCustomerPhone = params.customerPhone ? params.customerPhone.replace(/[^0-9]/g, '').slice(-10) : null;
    const resolvedCustomerName = params.customerName?.trim() || (cleanCustomerPhone ? 'Customer' : (pendingAmount > 0 ? 'Valued Customer' : 'Walk-in Customer'));

    const bill: Bill = {
      id: billId,
      shopId: params.shopId,
      billNumber,
      customerName: resolvedCustomerName,
      customerPhone: cleanCustomerPhone,
      customerId: params.customerId || null,
      tableNumber: params.tableNumber || null,
      status: 'completed',
      subtotal: finalSubtotal,
      originalSubtotal,
      originalTotal,
      discountType: params.discount?.type || null,
      discountValue: params.discount?.value || 0,
      discountAmount,
      discountAppliedBy: params.discount?.appliedBy || params.creator?.name || null,
      discountApprovedBy: params.discount?.approvedBy || null,
      gstRate,
      gstAmount,
      totalAmount,
      paidAmount,
      pendingAmount,
      cashAmount: params.paymentMode === 'Cash + GPay' ? cashAmount : undefined,
      gpayAmount: params.paymentMode === 'Cash + GPay' ? gpayAmount : undefined,
      paymentMode: params.paymentMode,
      clientOperationId: generateUUID(),
      items: params.cart.map(c => ({
        id: generateUUID(),
        menuItemId: c.itemId,
        itemName: c.name,
        isHalf: c.isHalf,
        unitPrice: c.unitPrice,
        quantity: c.quantity,
        lineTotal: c.lineTotal,
      })),
      createdAt: params.createdAt || new Date().toISOString(),
      completedAt: params.createdAt || new Date().toISOString(),
      createdByName: params.creator?.name || 'Owner',
      createdByRole: (params.creator?.role as UserRole) || 'Owner',
      createdById: params.creator?.id || null,
      collections: paidAmount > 0 ? [{
        id: generateUUID(),
        amount: paidAmount,
        paymentMode: params.paymentMode,
        paidAt: new Date().toISOString(),
        receivedByName: params.creator?.name || 'Owner',
        receivedById: params.creator?.id || null,
      }] : [],
    };

    // Save locally
    const existing = await storage.getObject<Bill[]>(this.getStorageKey(params.shopId), []);
    const updated = [bill, ...existing];
    await storage.setObject(this.getStorageKey(params.shopId), updated);

    // Cloud persistence
    await this.persistBillToCloud(bill, params.paymentMode, cashAmount, gpayAmount);

    return { bill, isDuplicate: false };
  },

  async persistBillToCloud(bill: Bill, paymentMode: PaymentMethod, cashAmount?: number, gpayAmount?: number): Promise<void> {
    try {
      // 1. Insert into bills table
      const { error: billErr } = await (supabase.from('bills') as any).insert({
        id: bill.id,
        shop_id: bill.shopId,
        bill_number: bill.billNumber,
        customer_id: bill.customerId || null,
        customer_name: bill.customerName || null,
        customer_phone: bill.customerPhone || null,
        table_number: bill.tableNumber || null,
        status: bill.status,
        subtotal: bill.subtotal,
        discount_type: bill.discountType || null,
        discount_value: bill.discountValue || 0,
        discount_amount: bill.discountAmount || 0,
        gst_rate: bill.gstRate,
        gst_amount: bill.gstAmount,
        total_amount: bill.totalAmount,
        paid_amount: bill.paidAmount,
        pending_amount: bill.pendingAmount,
        cash_amount: paymentMode === 'Cash + GPay' ? cashAmount : null,
        gpay_amount: paymentMode === 'Cash + GPay' ? gpayAmount : null,
        payment_mode: bill.paymentMode,
        client_operation_id: bill.clientOperationId,
        created_by_name: bill.createdByName,
        created_by_role: bill.createdByRole,
        created_at: bill.createdAt,
        completed_at: bill.completedAt,
      });

      if (billErr) {
        console.warn('Bill insert error:', billErr.message);
      }

      // 2. Insert items
      if (bill.items && bill.items.length > 0) {
        const itemRows = bill.items.map(it => ({
          id: it.id || generateUUID(),
          shop_id: bill.shopId,
          bill_id: bill.id,
          menu_item_id: it.menuItemId || null,
          item_name: it.itemName,
          quantity: it.quantity,
          unit_price: it.unitPrice,
          line_total: it.lineTotal,
          is_half: it.isHalf ?? false,
          created_at: bill.createdAt,
        }));

        const { error: itemErr } = await (supabase.from('bill_items') as any).insert(itemRows);
        if (itemErr) {
          console.warn('Bill items insert error:', itemErr.message);
        }
      }

      // 3. Insert payment ledger entry if paid amount > 0
      if (bill.paidAmount > 0) {
        try {
          await (supabase.from('payments') as any).insert({
            id: generateUUID(),
            shop_id: bill.shopId,
            bill_id: bill.id,
            payment_mode: bill.paymentMode,
            amount: bill.paidAmount,
            status: 'successful',
            paid_at: bill.createdAt,
            created_at: bill.createdAt,
          });
        } catch (payErr) {
          console.warn('Payment insert error:', payErr);
        }
      }

      // 4. Insert pending_payments entry if pending amount > 0
      if (bill.pendingAmount > 0) {
        try {
          await (supabase.from('pending_payments') as any).insert({
            id: generateUUID(),
            shop_id: bill.shopId,
            bill_id: bill.id,
            customer_id: bill.customerId || null,
            customer_name: bill.customerName || 'Valued Customer',
            customer_phone: bill.customerPhone || null,
            amount_due: bill.pendingAmount,
            amount_paid: 0,
            status: 'open',
            notes: null,
            created_at: bill.createdAt,
            updated_at: bill.createdAt,
          });
        } catch (penErr) {
          console.warn('Pending payment insert error:', penErr);
        }
      }

      // 5. Update customer balance if pending
      if (bill.pendingAmount > 0 && (bill.customerPhone || bill.customerName)) {
        try {
          const custKey = `@counterpro/customers_${bill.shopId}`;
          const customers = await storage.getObject<CustomerRecord[]>(custKey, []);
          const cleanPhone = bill.customerPhone?.slice(-10);

          let cust = customers.find(c =>
            (cleanPhone && c.phone && c.phone.slice(-10) === cleanPhone) ||
            (bill.customerName && c.name.toLowerCase() === bill.customerName.toLowerCase())
          );

          if (cust) {
            cust.totalBills = (cust.totalBills || 0) + 1;
            cust.pendingBalance = (cust.pendingBalance || 0) + bill.pendingAmount;
            cust.statusTag = 'Pending';
          } else {
            cust = {
              id: bill.customerId || generateUUID(),
              shopId: bill.shopId,
              name: bill.customerName || 'Customer',
              phone: cleanPhone || null,
              totalBills: 1,
              pendingBalance: bill.pendingAmount,
              statusTag: 'Pending',
              isActive: true,
            };
            customers.push(cust);
          }

          await storage.setObject(custKey, customers);

          await (supabase.from('customers') as any).upsert({
            id: cust.id,
            shop_id: cust.shopId,
            name: cust.name,
            phone: cust.phone,
            total_bills: cust.totalBills,
            pending_balance: cust.pendingBalance,
            status_tag: cust.statusTag,
            is_active: true,
          });
        } catch (cErr) {
          console.warn('Customer update error:', cErr);
        }
      }
    } catch (err) {
      console.warn('persistBillToCloud exception:', err);
    }
  },

  async cancelBill(billId: string, shopId: string, reason: string, user?: { name?: string; role?: string }): Promise<void> {
    const key = this.getStorageKey(shopId);
    const bills = await storage.getObject<Bill[]>(key, []);
    const match = bills.find(b => b.id === billId);

    if (match) {
      match.status = 'cancelled';
      match.isCancelled = true;
      match.cancellationReason = reason;
      match.deletedByName = user?.name || 'Owner';
      match.deletedByRole = (user?.role as UserRole) || 'Owner';
      match.deletedAt = new Date().toISOString();
      await storage.setObject(key, bills);
    }

    try {
      await (supabase.from('bills') as any)
        .update({
          status: 'cancelled',
          is_cancelled: true,
          cancellation_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', billId);
    } catch (err) {
      console.warn('cancelBill remote update error:', err);
    }
  },

  async deleteBill(billId: string, shopId: string, user?: { name?: string; role?: string }): Promise<void> {
    const key = this.getStorageKey(shopId);
    const bills = await storage.getObject<Bill[]>(key, []);
    const match = bills.find(b => b.id === billId);

    const deleterName = user?.name || 'Owner';
    const deleterRole = (user?.role as UserRole) || 'Owner';
    const deletedTime = new Date().toISOString();

    if (match) {
      match.status = 'deleted';
      match.isDeleted = true;
      match.deletedByName = deleterName;
      match.deletedByRole = deleterRole;
      match.deletedAt = deletedTime;
      match.cancellationReason = `Deleted by ${deleterName} (${deleterRole})`;
      await storage.setObject(key, bills);
    }

    try {
      await (supabase.from('bills') as any)
        .update({
          status: 'deleted',
          is_cancelled: true,
          cancellation_reason: `Deleted by ${deleterName} (${deleterRole})`,
          updated_at: deletedTime,
        })
        .eq('id', billId);

      // Record in audit_logs table (Master Table 18)
      await (supabase.from('audit_logs') as any).insert({
        id: generateUUID(),
        shop_id: shopId,
        action: 'BILL_DELETED',
        entity_type: 'bills',
        entity_id: billId,
        old_values: match ? { billNumber: match.billNumber, totalAmount: match.totalAmount } : null,
        new_values: { status: 'deleted', deletedBy: deleterName, role: deleterRole },
        created_at: deletedTime,
      });
    } catch (err) {
      console.warn('deleteBill remote update error:', err);
    }
  },

  async updateBill(shopId: string, updatedBill: Bill, user?: { id?: string; name?: string; role?: string }): Promise<void> {
    const key = this.getStorageKey(shopId);
    const bills = await storage.getObject<Bill[]>(key, []);
    const idx = bills.findIndex(b => b.id === updatedBill.id);

    const editorName = user?.name || updatedBill.editedByName || 'Owner';
    const editorRole = user?.role || updatedBill.editedByRole || 'Owner';
    const editedTime = new Date().toISOString();

    updatedBill.isEdited = true;
    updatedBill.editedAt = editedTime;
    updatedBill.editedByName = editorName;
    updatedBill.editedByRole = editorRole;

    if (idx >= 0) {
      bills[idx] = updatedBill;
      await storage.setObject(key, bills);
    }

    try {
      await (supabase.from('bills') as any)
        .update({
          customer_name: updatedBill.customerName,
          customer_phone: updatedBill.customerPhone,
          payment_mode: updatedBill.paymentMode,
          total_amount: updatedBill.totalAmount,
          paid_amount: updatedBill.paidAmount,
          pending_amount: updatedBill.pendingAmount,
          status: updatedBill.status,
          is_edited: true,
          edited_at: editedTime,
          edited_by_name: editorName,
          edited_by_role: editorRole,
          edited_by_id: user?.id || null,
          updated_at: editedTime,
        })
        .eq('id', updatedBill.id);
    } catch (err) {
      console.warn('updateBill remote update error:', err);
    }
  },

  async collectPendingDue(billId: string, shopId: string, paidAmount: number, paymentMode: PaymentMethod, user?: { id?: string; name?: string; role?: string }): Promise<void> {
    const key = this.getStorageKey(shopId);
    let bills = await storage.getObject<Bill[]>(key, []);
    let match = bills.find(b => b.id === billId);

    // If not in local cache, fetch authoritative bill directly from Supabase
    if (!match) {
      try {
        const { data: dbBill } = await (supabase.from('bills') as any)
          .select('*')
          .eq('id', billId)
          .maybeSingle();
        if (dbBill) {
          match = {
            id: dbBill.id,
            shopId: dbBill.shop_id,
            billNumber: dbBill.bill_number,
            customerId: dbBill.customer_id,
            customerName: dbBill.customer_name,
            customerPhone: dbBill.customer_phone,
            tableNumber: dbBill.table_number,
            status: dbBill.status,
            subtotal: Number(dbBill.subtotal) || 0,
            discountAmount: Number(dbBill.discount_amount) || 0,
            gstRate: Number(dbBill.gst_rate) || 0,
            gstAmount: Number(dbBill.gst_amount) || 0,
            totalAmount: Number(dbBill.total_amount) || 0,
            paidAmount: Number(dbBill.paid_amount) || 0,
            pendingAmount: Number(dbBill.pending_amount) || 0,
            paymentMode: dbBill.payment_mode || 'Pending',
            collections: dbBill.collections || [],
            createdAt: dbBill.created_at,
            completedAt: dbBill.completed_at,
            settledAt: dbBill.settled_at,
            items: [],
          };
          bills.push(match);
        }
      } catch (fErr) {
        console.warn('collectPendingDue fetch bill error:', fErr);
      }
    }

    if (!match) return;

    const newPaid = (match.paidAmount || 0) + paidAmount;
    const newPending = Math.max(0, match.totalAmount - newPaid);
    const nowIso = new Date().toISOString();
    const isFullySettled = newPending === 0;

    match.paidAmount = newPaid;
    match.pendingAmount = newPending;
    if (isFullySettled) {
      match.paymentMode = paymentMode;
      match.settledAt = nowIso;
      match.completedAt = nowIso;
    } else {
      match.paymentMode = 'Partial Pay';
    }

    const collectionRecord = {
      id: generateUUID(),
      amount: paidAmount,
      paidAt: nowIso,
      paymentMode,
      receivedById: user?.id || null,
      receivedByName: user?.name || 'Owner',
    };

    match.collections = match.collections || [];
    match.collections.push(collectionRecord);

    await storage.setObject(key, bills);

    try {
      // 1. Update bills table in Supabase (including collections, settled_at, completed_at)
      await (supabase.from('bills') as any)
        .update({
          paid_amount: newPaid,
          pending_amount: newPending,
          payment_mode: match.paymentMode,
          collections: match.collections,
          settled_at: isFullySettled ? nowIso : (match.settledAt || null),
          completed_at: isFullySettled ? nowIso : (match.completedAt || nowIso),
          updated_at: nowIso,
        })
        .eq('id', billId);

      // 2. Insert into payments table (with payment_method and recorded_at for mobile app revenue calculation)
      await (supabase.from('payments') as any).insert({
        id: collectionRecord.id,
        shop_id: shopId,
        bill_id: billId,
        payment_mode: paymentMode,
        payment_method: paymentMode,
        amount: paidAmount,
        status: 'successful',
        recorded_at: nowIso,
        paid_at: nowIso,
        created_at: nowIso,
      });

      // 3. Update pending_payments table (reducing amount_due so mobile app pending section updates)
      const { data: penRows } = await (supabase.from('pending_payments') as any)
        .select('*')
        .eq('bill_id', billId);

      if (penRows && penRows.length > 0) {
        for (const pen of penRows) {
          const updatedPaid = (Number(pen.amount_paid) || 0) + paidAmount;
          await (supabase.from('pending_payments') as any)
            .update({
              amount_due: newPending,
              amount_paid: updatedPaid,
              status: isFullySettled ? 'settled' : 'partial',
              is_settled: isFullySettled,
              is_cleared: isFullySettled,
              cleared_at: isFullySettled ? nowIso : null,
              settled_at: isFullySettled ? nowIso : null,
              updated_at: nowIso,
            })
            .eq('id', pen.id);
        }
      } else if (newPending > 0) {
        // Fallback: create pending_payments entry if none existed
        await (supabase.from('pending_payments') as any).insert({
          id: generateUUID(),
          shop_id: shopId,
          bill_id: billId,
          customer_id: match.customerId || null,
          customer_name: match.customerName || 'Valued Customer',
          customer_phone: match.customerPhone || null,
          amount_due: newPending,
          amount_paid: newPaid,
          status: isFullySettled ? 'settled' : 'partial',
          is_settled: isFullySettled,
          is_cleared: isFullySettled,
          settled_at: isFullySettled ? nowIso : null,
          created_at: nowIso,
          updated_at: nowIso,
        });
      }

      // 4. Update customer pending balance in local storage & Supabase
      if (match.customerPhone || match.customerName || match.customerId) {
        const custKey = `@counterpro/customers_${shopId}`;
        const customers = await storage.getObject<CustomerRecord[]>(custKey, []);
        const cleanPhone = match.customerPhone?.slice(-10);

        const cust = customers.find(c =>
          (match.customerId && c.id === match.customerId) ||
          (cleanPhone && c.phone && c.phone.slice(-10) === cleanPhone) ||
          (match.customerName && c.name.toLowerCase() === match.customerName.toLowerCase())
        );

        if (cust) {
          cust.pendingBalance = Math.max(0, (cust.pendingBalance || 0) - paidAmount);
          if (cust.pendingBalance === 0) {
            cust.statusTag = 'Regular';
          }
          await storage.setObject(custKey, customers);
        }

        // Direct update to Supabase customers table by ID or phone
        if (match.customerId) {
          const { data: dbCust } = await (supabase.from('customers') as any)
            .select('pending_balance')
            .eq('id', match.customerId)
            .maybeSingle();
          if (dbCust) {
            const nextBal = Math.max(0, (Number(dbCust.pending_balance) || 0) - paidAmount);
            await (supabase.from('customers') as any)
              .update({
                pending_balance: nextBal,
                status_tag: nextBal > 0 ? 'Pending' : 'Regular',
                updated_at: nowIso,
              })
              .eq('id', match.customerId);
          }
        } else if (cleanPhone) {
          const { data: dbCusts } = await (supabase.from('customers') as any)
            .select('id, pending_balance')
            .eq('shop_id', shopId)
            .ilike('phone', `%${cleanPhone}`);
          if (dbCusts && dbCusts.length > 0) {
            for (const c of dbCusts) {
              const nextBal = Math.max(0, (Number(c.pending_balance) || 0) - paidAmount);
              await (supabase.from('customers') as any)
                .update({
                  pending_balance: nextBal,
                  status_tag: nextBal > 0 ? 'Pending' : 'Regular',
                  updated_at: nowIso,
                })
                .eq('id', c.id);
            }
          }
        }
      }
    } catch (err) {
      console.warn('collectPendingDue remote error:', err);
    }
  },

  /**
   * Real-time listener for bills & pending payments changes
   */
  subscribeToBillChanges(shopId: string, onUpdate: () => void): () => void {
    const channelName = `bills_changes_${shopId}_${generateUUID().slice(0, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bills', filter: `shop_id=eq.${shopId}` },
        () => onUpdate()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pending_payments', filter: `shop_id=eq.${shopId}` },
        () => onUpdate()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
