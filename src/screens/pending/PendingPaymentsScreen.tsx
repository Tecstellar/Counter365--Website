import React, { useState, useEffect } from 'react';
import {
  Clock,
  Search,
  CheckCircle2,
  Phone,
  User,
  ArrowUpRight,
  Receipt,
  CreditCard,
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import { billingService } from '../../services/billingService';
import { Bill, PaymentMethod } from '../../types/models';
import { formatRupee } from '../../lib/money';

export const PendingPaymentsScreen: React.FC = () => {
  const { shop } = useShop();
  const { profile, currentRole } = useAuth();

  const [pendingBills, setPendingBills] = useState<Bill[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [collectModalBill, setCollectModalBill] = useState<Bill | null>(null);
  const [collectAmount, setCollectAmount] = useState<string>('');
  const [collectMode, setCollectMode] = useState<PaymentMethod>('Cash');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    if (!shop?.id) return;
    setIsLoading(true);
    const allBills = await billingService.getBills(shop.id);
    const dueBills = allBills.filter(b => b.status !== 'cancelled' && b.pendingAmount > 0);
    setPendingBills(dueBills);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [shop?.id]);

  const filteredBills = pendingBills.filter((b) => {
    return (
      b.billNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.customerName && b.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.customerPhone && b.customerPhone.includes(searchQuery))
    );
  });

  const totalOutstanding = pendingBills.reduce((sum, b) => sum + b.pendingAmount, 0);

  const handleOpenCollect = (bill: Bill) => {
    setCollectModalBill(bill);
    setCollectAmount(bill.pendingAmount.toString());
    setCollectMode('Cash');
  };

  const handleConfirmCollect = async () => {
    if (!collectModalBill || !shop?.id) return;
    const amt = Number(collectAmount);
    if (isNaN(amt) || amt <= 0) return;

    await billingService.collectPendingDue(
      collectModalBill.id,
      shop.id,
      amt,
      collectMode,
      { name: profile?.fullName || 'Owner', role: currentRole }
    );

    setCollectModalBill(null);
    setCollectAmount('');
    await loadData();
  };

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
      {/* Title & Total Due Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-amber-50 border border-amber-200 shadow-xs">
        <div>
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block mb-1">
            Khata & Customer Dues
          </span>
          <h2 className="text-2xl font-black text-amber-900">{formatRupee(totalOutstanding)}</h2>
          <p className="text-xs text-amber-800 mt-1">
            Total outstanding credit across {pendingBills.length} unpaid / partially paid customer bills
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#76716B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone, bill..."
            className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-amber-200 bg-white outline-hidden focus:border-amber-500"
          />
        </div>
      </div>

      {/* Due Bills Table */}
      <div className="bg-white rounded-2xl border border-[#EBE7E1] shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#76716B]">
            <div className="w-8 h-8 border-3 border-[#FF5F00] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Loading pending dues...</span>
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#76716B]">
            <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="font-bold text-[#111111]">No Outstanding Dues!</p>
            <p>All bills are fully paid and settled.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF8F5] border-b border-[#EBE7E1] text-[#76716B] font-bold">
                  <tr>
                    <th className="py-3 px-4">Customer Details</th>
                    <th className="py-3 px-4">Bill Number</th>
                    <th className="py-3 px-4">Date Billed</th>
                    <th className="py-3 px-4 text-right">Total Bill</th>
                    <th className="py-3 px-4 text-right">Paid</th>
                    <th className="py-3 px-4 text-right text-amber-600">Balance Due</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF8F5]">
                  {filteredBills.map((b) => (
                    <tr key={b.id} className="hover:bg-[#FAF8F5] transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#111111]">{b.customerName || 'Valued Customer'}</div>
                        {b.customerPhone && (
                          <div className="text-[11px] text-[#76716B] flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-[#76716B]" />
                            <span>+91 {b.customerPhone}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#111111]">{b.billNumber}</td>
                      <td className="py-3 px-4 text-[#76716B]">
                        {new Date(b.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-[#111111]">
                        {formatRupee(b.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-green-600">
                        {formatRupee(b.paidAmount || 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-sm text-amber-600">
                        {formatRupee(b.pendingAmount)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenCollect(b)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition"
                        >
                          Collect Due
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View (< md) */}
            <div className="md:hidden divide-y divide-[#EBE7E1]">
              {filteredBills.map((b) => (
                <div key={b.id} className="p-3.5 space-y-2 hover:bg-[#FAF8F5] transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-[#111111]">{b.customerName || 'Customer'}</span>
                      {b.customerPhone && (
                        <span className="text-[11px] text-[#76716B] block">+91 {b.customerPhone}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-amber-600 block">{formatRupee(b.pendingAmount)}</span>
                      <span className="text-[10px] text-[#76716B]">of {formatRupee(b.totalAmount)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-[#FAF8F5]">
                    <span className="text-[11px] text-[#76716B] font-medium">Bill #{b.billNumber}</span>
                    <button
                      onClick={() => handleOpenCollect(b)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs"
                    >
                      Collect Due
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* MODAL: COLLECT DUE PAYMENT */}
      {collectModalBill && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-modal border border-[#EBE7E1]">
            <h3 className="text-sm font-bold text-[#111111] mb-1">
              Collect Khata Due: {collectModalBill.billNumber}
            </h3>
            <p className="text-xs text-[#76716B] mb-4">
              Customer: <span className="font-bold text-[#111111]">{collectModalBill.customerName || 'Customer'}</span>
            </p>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-[#76716B] mb-1">
                  Amount to Collect (Remaining: {formatRupee(collectModalBill.pendingAmount)})
                </label>
                <input
                  type="number"
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-[#EBE7E1] outline-hidden focus:border-[#FF5F00]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#76716B] mb-1">
                  Payment Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCollectMode('Cash')}
                    className={`py-2 rounded-xl text-xs font-bold border ${
                      collectMode === 'Cash'
                        ? 'border-[#FF5F00] bg-[#FFF0E6] text-[#FF5F00]'
                        : 'border-[#EBE7E1] text-[#76716B]'
                    }`}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setCollectMode('GPay')}
                    className={`py-2 rounded-xl text-xs font-bold border ${
                      collectMode === 'GPay'
                        ? 'border-[#FF5F00] bg-[#FFF0E6] text-[#FF5F00]'
                        : 'border-[#EBE7E1] text-[#76716B]'
                    }`}
                  >
                    GPay / UPI
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCollectModalBill(null)}
                className="flex-1 py-2 rounded-xl border border-[#EBE7E1] text-xs font-bold text-[#76716B]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCollect}
                className="flex-1 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold shadow-md"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
