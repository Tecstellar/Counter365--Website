import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Receipt,
  Wallet,
  Clock,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { billingService } from '../../services/billingService';
import { expenseService } from '../../services/expenseService';
import { reportService } from '../../services/reportService';
import { Bill, ExpenseRecord, DayClosingReport } from '../../types/models';
import { formatRupee } from '../../lib/money';

interface HomeScreenProps {
  onNavigateToBilling: () => void;
  onNavigateToBills: () => void;
  onNavigateToPending: () => void;
  onNavigateToExpenses: () => void;
  onOpenSubscriptionModal: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateToBilling,
  onNavigateToBills,
  onNavigateToPending,
  onNavigateToExpenses,
  onOpenSubscriptionModal,
}) => {
  const { shop, subscriptionStatus } = useShop();

  const [bills, setBills] = useState<Bill[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [closingReport, setClosingReport] = useState<DayClosingReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!shop?.id) return;
      setIsLoading(true);
      const [bList, eList] = await Promise.all([
        billingService.getBills(shop.id),
        expenseService.getExpenses(shop.id),
      ]);
      setBills(bList);
      setExpenses(eList);

      const report = reportService.getDayClosingReport(bList, eList, shop);
      setClosingReport(report);
      setIsLoading(false);
    }
    loadData();
  }, [shop?.id]);

  const recentBills = bills.slice(0, 8);

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">
      {/* Top Banner: Welcome & Quick Billing CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-[#EBE7E1] shadow-card">
        <div>
          <span className="text-xs font-bold text-[#FF5F00] uppercase tracking-wider block mb-1">
            Live Counter Overview
          </span>
          <h2 className="text-xl font-bold font-heading text-[#111111]">
            Welcome to {shop?.name || 'Counter 365'}
          </h2>
          <p className="text-xs text-[#76716B] mt-0.5">
            Real-time business performance synced across Web and Android counters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateToBilling}
            className="px-5 py-2.5 rounded-xl bg-[#FF5F00] hover:bg-[#EA580C] text-white font-extrabold text-xs shadow-md transition active:scale-95 flex items-center gap-2"
          >
            <Receipt className="w-4 h-4" />
            <span>Open New Bill</span>
          </button>
        </div>
      </div>

      {/* Subscription Limit Warning if close or expired */}
      {subscriptionStatus && subscriptionStatus.billLimitReached && !subscriptionStatus.isPaidActive && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-red-800">
                Free Tier Bill Limit Reached (100 Bills)
              </p>
              <p className="text-[11px] text-red-600">
                Upgrade to Counter 365 Pro to unlock unlimited billing, multi-staff roles and reports.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenSubscriptionModal}
            className="px-3.5 py-1.5 rounded-xl bg-red-600 text-white font-bold text-xs shrink-0 hover:bg-red-700 transition"
          >
            Upgrade Pro
          </button>
        </div>
      )}

      {/* 4 Primary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Today Sales */}
        <div className="p-4 rounded-2xl bg-white border border-[#EBE7E1] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#76716B]">Today Sales</span>
            <div className="w-7 h-7 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-[#111111]">
            {closingReport ? formatRupee(closingReport.totalSales) : '₹0'}
          </div>
          <span className="text-[11px] text-[#76716B] mt-1 block">
            {closingReport?.billsCount || 0} Bills Generated
          </span>
        </div>

        {/* Cash Collected */}
        <div className="p-4 rounded-2xl bg-white border border-[#EBE7E1] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#76716B]">Cash Sales</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-[#111111]">
            {closingReport ? formatRupee(closingReport.cashSales) : '₹0'}
          </div>
          <span className="text-[11px] text-[#76716B] mt-1 block">In Register Drawer</span>
        </div>

        {/* GPay / UPI Collected */}
        <div className="p-4 rounded-2xl bg-white border border-[#EBE7E1] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#76716B]">GPay / UPI</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-[#111111]">
            {closingReport ? formatRupee(closingReport.gpaySales) : '₹0'}
          </div>
          <span className="text-[11px] text-[#76716B] mt-1 block">Bank Account Credits</span>
        </div>

        {/* Pending Khata Due */}
        <div
          onClick={onNavigateToPending}
          className="p-4 rounded-2xl bg-white border border-[#EBE7E1] shadow-xs cursor-pointer hover:border-[#FED7AA] transition"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#76716B]">Pending Due</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-amber-600">
            {closingReport ? formatRupee(closingReport.pendingSales) : '₹0'}
          </div>
          <span className="text-[11px] text-[#76716B] mt-1 block hover:underline">
            View Khata Customers →
          </span>
        </div>
      </div>

      {/* Net Profit & Expenses Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EBE7E1] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[#76716B]">Today Expenses</span>
            <div className="text-lg font-bold text-red-600 mt-0.5">
              {closingReport ? formatRupee(closingReport.totalExpenses) : '₹0'}
            </div>
          </div>
          <button
            onClick={onNavigateToExpenses}
            className="text-xs font-bold text-[#111111] hover:text-[#FF5F00] transition"
          >
            Manage Expenses →
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-[#FFF0E6] border border-[#FED7AA] flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-[#EA580C]">Estimated Net Profit</span>
            <div className="text-lg font-black text-[#FF5F00] mt-0.5">
              {closingReport ? formatRupee(closingReport.netProfit) : '₹0'}
            </div>
          </div>
          <span className="text-xs font-bold text-[#EA580C]">
            Sales minus Expenses
          </span>
        </div>
      </div>

      {/* Recent Bills Table */}
      <div className="bg-white rounded-2xl border border-[#EBE7E1] p-5 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#111111]">Recent Counter Transactions</h3>
            <p className="text-xs text-[#76716B]">Latest invoices processed at this store</p>
          </div>
          <button
            onClick={onNavigateToBills}
            className="text-xs font-bold text-[#FF5F00] hover:underline"
          >
            View All Bills ({bills.length}) →
          </button>
        </div>

        {recentBills.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#76716B]">
            No bills created yet today. Click "Open New Bill" to begin!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#EBE7E1] text-[#76716B]">
                  <th className="pb-2 font-bold">Bill #</th>
                  <th className="pb-2 font-bold">Time</th>
                  <th className="pb-2 font-bold">Customer</th>
                  <th className="pb-2 font-bold">Mode</th>
                  <th className="pb-2 font-bold text-right">Amount</th>
                  <th className="pb-2 font-bold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FAF8F5]">
                {recentBills.map((b) => (
                  <tr key={b.id} className="hover:bg-[#FAF8F5] transition">
                    <td className="py-2.5 font-bold text-[#111111]">{b.billNumber}</td>
                    <td className="py-2.5 text-[#76716B]">
                      {new Date(b.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 text-[#111111]">
                      {b.customerName || 'Walk-in'}
                    </td>
                    <td className="py-2.5 font-semibold text-[#76716B]">{b.paymentMode}</td>
                    <td className="py-2.5 font-extrabold text-right text-[#111111]">
                      {formatRupee(b.totalAmount)}
                    </td>
                    <td className="py-2.5 text-right">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
