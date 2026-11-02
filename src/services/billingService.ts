import { supabase } from '../lib/supabase';
import { storage } from '../lib/storage';
import {
  Bill,
  CartItem,
  PaymentMethod,
  UserRole,
  BillItemRecord,
  CustomerRecord,
} from '../types/models';
import { calculateGST, formatRupee } from '../lib/money';
import { generateUUID } from '../lib/uuid';
import { subscriptionService } from './subscriptionService';

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

  async getNextBillNumber(shopId: string): Promise<string> {
    const countKey = `${BILL_COUNT_KEY_PREFIX}${shopId}`;
    let current = await storage.getObject<number>(countKey, 0);

    // Try fetching max bill_number count from Supabase
    try {
      const { data } = await (supabase.from('bills') as any)
        .select('bill_number')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const lastNoStr = data[0].bill_number;
        const match = lastNoStr.match(/\d+$/);
        if (match) {
          const parsed = parseInt(match[0], 10);
          if (!isNaN(parsed) && parsed > current) {
            current = parsed;
          }
        }
      }
    } catch {}

    const next = current + 1;
    await storage.setObject(countKey, next);
    return `#${next.toString().padStart(4, '0')}`;
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
          isCancelled: b.is_cancelled ?? false,
          cancellationReason: b.cancellation_reason,
        }));

        await storage.setObject(key, remoteBills);
        return remoteBills;
      }
    } catch (err) {
      console.warn('getBills remote fetch notice:', err);
    }

    return local;
  },

  async createBill(params: {
    shopId: string;
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
    const billNumber = await this.getNextBillNumber(params.shopId);

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

    if (match) {
      match.status = 'deleted';
      match.deletedByName = user?.name || 'Owner';
      match.deletedByRole = (user?.role as UserRole) || 'Owner';
      match.deletedAt = new Date().toISOString();
      await storage.setObject(key, bills);
    }

    try {
      await (supabase.from('bills') as any)
        .update({
          status: 'deleted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', billId);
    } catch (err) {
      console.warn('deleteBill remote update error:', err);
    }
  },

  async updateBill(shopId: string, updatedBill: Bill): Promise<void> {
    const key = this.getStorageKey(shopId);
    const bills = await storage.getObject<Bill[]>(key, []);
    const idx = bills.findIndex(b => b.id === updatedBill.id);

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
          updated_at: new Date().toISOString(),
        })
        .eq('id', updatedBill.id);
    } catch (err) {
      console.warn('updateBill remote update error:', err);
    }
  },

  async collectPendingDue(billId: string, shopId: string, paidAmount: number, paymentMode: PaymentMethod, user?: { name?: string; role?: string }): Promise<void> {
    const key = this.getStorageKey(shopId);
    const bills = await storage.getObject<Bill[]>(key, []);
    const match = bills.find(b => b.id === billId);

    if (!match) return;

    const newPaid = (match.paidAmount || 0) + paidAmount;
    const newPending = Math.max(0, match.totalAmount - newPaid);

    match.paidAmount = newPaid;
    match.pendingAmount = newPending;
    if (newPending === 0) {
      match.paymentMode = paymentMode;
      match.settledAt = new Date().toISOString();
    } else {
      match.paymentMode = 'Partial Pay';
    }

    match.collections = match.collections || [];
    match.collections.push({
      id: generateUUID(),
      amount: paidAmount,
      paymentMode,
      paidAt: new Date().toISOString(),
      receivedByName: user?.name || 'Owner',
      receivedById: null,
    });

    await storage.setObject(key, bills);

    try {
      await (supabase.from('bills') as any)
        .update({
          paid_amount: newPaid,
          pending_amount: newPending,
          payment_mode: match.paymentMode,
          updated_at: new Date().toISOString(),
        })
        .eq('id', billId);

      // Record in payments table
      await (supabase.from('payments') as any).insert({
        id: generateUUID(),
        shop_id: shopId,
        bill_id: billId,
        payment_mode: paymentMode,
        amount: paidAmount,
        status: 'successful',
        paid_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });

      // Update pending_payments table
      const { data: penRows } = await (supabase.from('pending_payments') as any)
        .select('*')
        .eq('bill_id', billId)
        .limit(1);

      if (penRows && penRows.length > 0) {
        const pen = penRows[0];
        const updatedPaid = (Number(pen.amount_paid) || 0) + paidAmount;
        const status = newPending === 0 ? 'settled' : 'partial';
        await (supabase.from('pending_payments') as any)
          .update({
            amount_paid: updatedPaid,
            status,
            settled_at: newPending === 0 ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', pen.id);
      }

      // Update customer pending balance in local storage & supabase
      if (match.customerPhone || match.customerName) {
        const custKey = `@counterpro/customers_${shopId}`;
        const customers = await storage.getObject<CustomerRecord[]>(custKey, []);
        const cleanPhone = match.customerPhone?.slice(-10);

        const cust = customers.find(c =>
          (cleanPhone && c.phone && c.phone.slice(-10) === cleanPhone) ||
          (match.customerName && c.name.toLowerCase() === match.customerName.toLowerCase())
        );

        if (cust) {
          cust.pendingBalance = Math.max(0, (cust.pendingBalance || 0) - paidAmount);
          if (cust.pendingBalance === 0) {
            cust.statusTag = 'Regular';
          }
          await storage.setObject(custKey, customers);
          await (supabase.from('customers') as any)
            .update({
              pending_balance: cust.pendingBalance,
              status_tag: cust.statusTag,
              updated_at: new Date().toISOString(),
            })
            .eq('id', cust.id);
        }
      }
    } catch (err) {
      console.warn('collectPendingDue remote error:', err);
    }
  },
};
