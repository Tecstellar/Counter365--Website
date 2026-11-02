import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Plus,
  Trash2,
  Calendar,
  CreditCard,
  DollarSign,
  Tag,
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import { expenseService, EXPENSE_CATEGORIES } from '../../services/expenseService';
import { ExpenseRecord } from '../../types/models';
import { formatRupee } from '../../lib/money';

export const ExpensesScreen: React.FC = () => {
  const { shop } = useShop();
  const { profile, currentRole } = useAuth();

  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [paymentMode, setPaymentMode] = useState('Cash');

  const loadData = async () => {
    if (!shop?.id) return;
    setIsLoading(true);
    const data = await expenseService.getExpenses(shop.id);
    setExpenses(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [shop?.id]);

  const totalExpenseAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop?.id || !description.trim() || !amount) return;

    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) return;

    await expenseService.addExpense(shop.id, {
      description,
      amount: amt,
      category,
      paymentMode,
      creator: {
        name: profile?.fullName || 'Owner',
        role: currentRole,
      },
    });

    setDescription('');
    setAmount('');
    setIsModalOpen(false);
    await loadData();
  };

  const handleDelete = async (id: string) => {
    if (!shop?.id) return;
    if (confirm('Delete this expense record?')) {
      await expenseService.deleteExpense(id, shop.id);
      await loadData();
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
      {/* Title & Add CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-[#EBE7E1] shadow-card">
        <div>
          <span className="text-xs font-bold text-red-600 uppercase tracking-wider block mb-1">
            Store Expenses & Payouts
          </span>
          <h2 className="text-2xl font-black text-[#111111]">{formatRupee(totalExpenseAmount)}</h2>
          <p className="text-xs text-[#76716B] mt-0.5">
            Total recorded outlays for raw materials, provisions, rent and operations
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-[#111111] hover:bg-[#222222] text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4 text-[#FF5F00]" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-[#EBE7E1] shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#76716B]">
            <div className="w-8 h-8 border-3 border-[#FF5F00] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Loading store expenses...</span>
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#76716B]">
            No expenses logged yet. Click "Add Expense" to record daily purchases.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF8F5] border-b border-[#EBE7E1] text-[#76716B] font-bold">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Recorded By</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF8F5]">
                  {expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-[#FAF8F5] transition">
                      <td className="py-3 px-4 text-[#76716B]">{e.expenseDate}</td>
                      <td className="py-3 px-4 font-bold text-[#111111]">{e.description}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F3F0EB] text-[#76716B]">
                          {e.category || 'General'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#76716B] font-semibold">{e.paymentMode || 'Cash'}</td>
                      <td className="py-3 px-4 text-[#76716B]">{e.createdByName || 'Staff'}</td>
                      <td className="py-3 px-4 text-right font-extrabold text-sm text-red-600">
                        -{formatRupee(e.amount)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600"
                          title="Delete Expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View (< md) */}
            <div className="md:hidden divide-y divide-[#EBE7E1]">
              {expenses.map((e) => (
                <div key={e.id} className="p-3.5 space-y-2 hover:bg-[#FAF8F5] transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-[#111111]">{e.description}</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-[#F3F0EB] text-[#76716B]">
                          {e.category || 'General'}
                        </span>
                        <span className="text-[10px] text-[#76716B]">{e.expenseDate}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-red-600 block">-{formatRupee(e.amount)}</span>
                      <span className="text-[10px] text-[#76716B]">{e.paymentMode || 'Cash'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-[#FAF8F5]">
                    <span className="text-[10px] text-[#76716B]">By {e.createdByName || 'Staff'}</span>
                    <button
                      onClick={() => handleDelete(e.id)}
                      className="text-[11px] font-bold text-red-600 hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* MODAL: ADD EXPENSE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-modal border border-[#EBE7E1]">
            <h3 className="text-base font-bold text-[#111111] mb-4">Add Store Expense</h3>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">Description *</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Milk 20L Packet, Vegetables"
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-[#EBE7E1] outline-hidden focus:border-[#FF5F00]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">Amount Paid (₹) *</label>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="650"
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-[#EBE7E1] outline-hidden focus:border-[#FF5F00]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-[#EBE7E1] outline-hidden bg-white"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">Payment Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Cash', 'GPay'].map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setPaymentMode(m)}
                      className={`py-2 rounded-xl text-xs font-bold border ${
                        paymentMode === m
                          ? 'border-[#FF5F00] bg-[#FFF0E6] text-[#FF5F00]'
                          : 'border-[#EBE7E1] text-[#76716B]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#EBE7E1] text-xs font-bold text-[#76716B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#111111] text-white text-xs font-bold shadow-md"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
