import React, { useState, useEffect } from 'react';
import {
  Search,
  Printer,
  XCircle,
  Eye,
  Filter,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpDown,
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { billingService } from '../../services/billingService';
import { exportService } from '../../services/exportService';
import { Bill } from '../../types/models';
import { formatRupee } from '../../lib/money';

export const BillsScreen: React.FC = () => {
  const { shop } = useShop();
  const [bills, setBills] = useState<Bill[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'cancelled'>('all');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [cancelModalBill, setCancelModalBill] = useState<Bill | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadBills = async () => {
    if (!shop?.id) return;
    setIsLoading(true);
    const data = await billingService.getBills(shop.id);
    setBills(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadBills();
  }, [shop?.id]);

  const filteredBills = bills.filter((b) => {
    const matchesSearch =
      b.billNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.customerName && b.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.customerPhone && b.customerPhone.includes(searchQuery));

    let matchesStatus = true;
    if (statusFilter === 'paid') matchesStatus = b.status !== 'cancelled' && b.pendingAmount === 0;
    else if (statusFilter === 'pending') matchesStatus = b.status !== 'cancelled' && b.pendingAmount > 0;
    else if (statusFilter === 'cancelled') matchesStatus = b.status === 'cancelled';

    return matchesSearch && matchesStatus;
  });

  const handlePrint = (bill: Bill) => {
    if (shop) {
      exportService.printReceipt(bill, shop);
    }
  };

  const handleCancelBill = async () => {
    if (!cancelModalBill || !shop?.id) return;
    await billingService.cancelBill(cancelModalBill.id, shop.id, cancelReason || 'Customer Request');
    setCancelModalBill(null);
    setCancelReason('');
    await loadBills();
  };

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
      {/* Title & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold font-heading text-[#111111]">Bill Invoices & History</h2>
          <p className="text-xs text-[#76716B]">View, reprint, or cancel past customer bills</p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#76716B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Bill # or Customer..."
            className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-[#EBE7E1] bg-white outline-hidden focus:border-[#FF5F00]"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'all', label: `All Bills (${bills.length})` },
          { key: 'paid', label: `Fully Paid (${bills.filter(b => b.status !== 'cancelled' && b.pendingAmount === 0).length})` },
          { key: 'pending', label: `Pending Due (${bills.filter(b => b.status !== 'cancelled' && b.pendingAmount > 0).length})` },
          { key: 'cancelled', label: `Cancelled (${bills.filter(b => b.status === 'cancelled').length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key as any)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition ${
              statusFilter === tab.key
                ? 'bg-[#111111] text-white shadow-xs'
                : 'bg-white border border-[#EBE7E1] text-[#76716B] hover:text-[#111111]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-2xl border border-[#EBE7E1] shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#76716B]">
            <div className="w-8 h-8 border-3 border-[#FF5F00] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Loading bills...</span>
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#76716B]">
            No bills match your criteria.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF8F5] border-b border-[#EBE7E1] text-[#76716B] font-bold">
                  <tr>
                    <th className="py-3 px-4">Bill Number</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Items</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF8F5]">
                  {filteredBills.map((b) => (
                    <tr key={b.id} className="hover:bg-[#FAF8F5] transition">
                      <td className="py-3 px-4 font-bold text-[#111111]">{b.billNumber}</td>
                      <td className="py-3 px-4 text-[#76716B]">
                        {new Date(b.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}{' '}
                        {new Date(b.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#111111]">{b.customerName || 'Walk-in'}</div>
                        {b.customerPhone && <div className="text-[11px] text-[#76716B]">{b.customerPhone}</div>}
                      </td>
                      <td className="py-3 px-4 text-[#76716B]">
                        {(b.items || []).length} items
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#111111]">{b.paymentMode}</td>
                      <td className="py-3 px-4 text-right font-extrabold text-sm text-[#111111]">
                        {formatRupee(b.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          b.status === 'cancelled'
                            ? 'bg-red-50 text-red-700'
                            : b.pendingAmount > 0
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-green-50 text-green-700'
                        }`}>
                          {b.status === 'cancelled' ? 'CANCELLED' : b.pendingAmount > 0 ? 'DUE' : 'PAID'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedBill(b)}
                            title="View Invoice"
                            className="p-1.5 rounded-lg border border-[#EBE7E1] hover:bg-white text-[#76716B] hover:text-[#111111]"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handlePrint(b)}
                            title="Reprint Receipt"
                            className="p-1.5 rounded-lg border border-[#EBE7E1] hover:bg-[#FFF0E6] text-[#FF5F00]"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {b.status !== 'cancelled' && (
                            <button
                              onClick={() => setCancelModalBill(b)}
                              title="Cancel Bill"
                              className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
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
                      <span className="text-xs font-black text-[#111111]">{b.billNumber}</span>
                      <span className="text-[10px] text-[#76716B] ml-2">
                        {new Date(b.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      b.status === 'cancelled'
                        ? 'bg-red-50 text-red-700'
                        : b.pendingAmount > 0
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-green-50 text-green-700'
                    }`}>
                      {b.status === 'cancelled' ? 'CANCELLED' : b.pendingAmount > 0 ? 'DUE' : 'PAID'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-[#111111]">{b.customerName || 'Walk-in Customer'}</div>
                      <div className="text-[11px] text-[#76716B]">
                        {(b.items || []).length} items · {b.paymentMode}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-sm text-[#111111]">{formatRupee(b.totalAmount)}</div>
                      {b.pendingAmount > 0 && (
                        <div className="text-[10px] font-bold text-amber-700">Due: {formatRupee(b.pendingAmount)}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#FAF8F5]">
                    <button
                      onClick={() => setSelectedBill(b)}
                      className="px-2.5 py-1 rounded-lg border border-[#EBE7E1] bg-white text-xs font-bold text-[#76716B] hover:text-[#111111] flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Details</span>
                    </button>
                    <button
                      onClick={() => handlePrint(b)}
                      className="px-2.5 py-1 rounded-lg border border-[#FED7AA] bg-[#FFF0E6] text-xs font-bold text-[#FF5F00] flex items-center gap-1"
                    >
                      <Printer className="w-3 h-3" />
                      <span>Print</span>
                    </button>
                    {b.status !== 'cancelled' && (
                      <button
                        onClick={() => setCancelModalBill(b)}
                        className="p-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                        title="Cancel Bill"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* MODAL: VIEW BILL DETAILS */}
      {selectedBill && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-modal border border-[#EBE7E1] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#EBE7E1] mb-4">
              <div>
                <h3 className="text-base font-bold text-[#111111]">Bill {selectedBill.billNumber}</h3>
                <span className="text-xs text-[#76716B]">
                  {new Date(selectedBill.createdAt).toLocaleString('en-IN')}
                </span>
              </div>
              <button
                onClick={() => setSelectedBill(null)}
                className="text-xs font-bold text-[#76716B] hover:text-[#111111]"
              >
                Close
              </button>
            </div>

            {/* Items */}
            <div className="space-y-2 mb-4">
              <h4 className="text-xs font-bold uppercase text-[#76716B]">Items Ordered</h4>
              <div className="divide-y divide-[#FAF8F5]">
                {(selectedBill.items || []).map((it, idx) => (
                  <div key={idx} className="py-1.5 flex justify-between text-xs">
                    <div>
                      <span className="font-bold text-[#111111]">{it.itemName}</span>
                      {it.isHalf && <span className="text-[10px] text-[#EA580C] ml-1">(Half)</span>}
                      <span className="text-[#76716B] ml-2">× {it.quantity}</span>
                    </div>
                    <span className="font-bold">{formatRupee(it.lineTotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EBE7E1] space-y-1 text-xs mb-4">
              <div className="flex justify-between text-[#76716B]">
                <span>Subtotal</span>
                <span>{formatRupee(selectedBill.subtotal)}</span>
              </div>
              {selectedBill.discountAmount ? (
                <div className="flex justify-between text-green-600 font-semibold">
                  <span>Discount</span>
                  <span>-{formatRupee(selectedBill.discountAmount)}</span>
                </div>
              ) : null}
              {selectedBill.gstAmount ? (
                <div className="flex justify-between text-[#76716B]">
                  <span>GST ({selectedBill.gstRate}%)</span>
                  <span>{formatRupee(selectedBill.gstAmount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between font-black text-sm text-[#111111] pt-1 border-t border-[#EBE7E1]">
                <span>Total Amount</span>
                <span>{formatRupee(selectedBill.totalAmount)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { handlePrint(selectedBill); setSelectedBill(null); }}
                className="flex-1 py-2.5 rounded-xl bg-[#FF5F00] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Reprint Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CANCEL BILL */}
      {cancelModalBill && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-modal border border-[#EBE7E1]">
            <h3 className="text-sm font-bold text-red-600 mb-1">Cancel Bill {cancelModalBill.billNumber}</h3>
            <p className="text-xs text-[#76716B] mb-3">
              This action will mark the bill as cancelled and reverse any ledger balances.
            </p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-[#111111] mb-1">Reason for Cancellation</label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Order returned / Incorrect item"
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-[#EBE7E1] outline-hidden focus:border-red-500"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCancelModalBill(null)}
                className="flex-1 py-2 rounded-xl border border-[#EBE7E1] text-xs font-bold text-[#76716B]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCancelBill}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white text-xs font-bold"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
