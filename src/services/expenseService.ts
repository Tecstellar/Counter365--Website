import { supabase } from '../lib/supabase';
import { storage } from '../lib/storage';
import { ExpenseRecord } from '../types/models';
import { generateUUID } from '../lib/uuid';

const EXPENSES_KEY_PREFIX = '@counterpro/expenses_';

export const EXPENSE_CATEGORIES = [
  'Vegetables & Fruits',
  'Milk & Dairy',
  'Groceries & Provisions',
  'Staff Salary & Advance',
  'Gas & Fuel',
  'Rent & Electricity',
  'Maintenance & Repairs',
  'Packaging & Disposables',
  'Other Expenses',
];

export const expenseService = {
  async getExpenses(shopId: string): Promise<ExpenseRecord[]> {
    const key = `${EXPENSES_KEY_PREFIX}${shopId}`;
    const local = await storage.getObject<ExpenseRecord[]>(key, []);

    try {
      const { data, error } = await (supabase.from('expenses') as any)
        .select('*')
        .eq('shop_id', shopId)
        .order('expense_date', { ascending: false })
        .limit(300);

      if (!error && data) {
        const records: ExpenseRecord[] = data.map((e: any) => ({
          id: e.id,
          shopId: e.shop_id,
          description: e.description,
          amount: Number(e.amount) || 0,
          category: e.category || 'Other Expenses',
          paymentMode: e.payment_mode || 'Cash',
          expenseDate: e.expense_date,
          createdByName: e.created_by_name,
          createdByRole: e.created_by_role,
          createdAt: e.created_at,
        }));
        await storage.setObject(key, records);
        return records;
      }
    } catch (err) {
      console.warn('getExpenses remote notice:', err);
    }

    return local;
  },

  async addExpense(
    shopId: string,
    params: {
      description: string;
      amount: number;
      category?: string;
      paymentMode?: string;
      expenseDate?: string;
      creator?: { name?: string; role?: string; id?: string };
    }
  ): Promise<ExpenseRecord> {
    const key = `${EXPENSES_KEY_PREFIX}${shopId}`;
    const expenses = await storage.getObject<ExpenseRecord[]>(key, []);

    const newExpense: ExpenseRecord = {
      id: generateUUID(),
      shopId,
      description: params.description.trim(),
      amount: Math.round(params.amount),
      category: params.category || 'Other Expenses',
      paymentMode: params.paymentMode || 'Cash',
      expenseDate: params.expenseDate || new Date().toISOString().split('T')[0],
      createdByName: params.creator?.name || 'Owner',
      createdByRole: params.creator?.role || 'Owner',
      createdById: params.creator?.id || null,
      createdAt: new Date().toISOString(),
    };

    expenses.unshift(newExpense);
    await storage.setObject(key, expenses);

    try {
      await (supabase.from('expenses') as any).insert({
        id: newExpense.id,
        shop_id: shopId,
        description: newExpense.description,
        amount: newExpense.amount,
        category: newExpense.category,
        payment_mode: newExpense.paymentMode,
        expense_date: newExpense.expenseDate,
        created_by_name: newExpense.createdByName,
        created_by_role: newExpense.createdByRole,
        created_at: newExpense.createdAt,
      });
    } catch (err) {
      console.warn('addExpense remote error:', err);
    }

    return newExpense;
  },

  async deleteExpense(expenseId: string, shopId: string): Promise<void> {
    const key = `${EXPENSES_KEY_PREFIX}${shopId}`;
    const expenses = await storage.getObject<ExpenseRecord[]>(key, []);
    const updated = expenses.filter(e => e.id !== expenseId);
    await storage.setObject(key, updated);

    try {
      await (supabase.from('expenses') as any).delete().eq('id', expenseId);
    } catch (err) {
      console.warn('deleteExpense remote error:', err);
    }
  },
};
