import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  TrendingUp,
  CreditCard,
  PieChart,
  ShoppingBag,
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { billingService } from '../../services/billingService';
import { expenseService } from '../../services/expenseService';
import { reportService } from '../../services/reportService';
import { MonthlyReportData, Bill, ExpenseRecord } from '../../types/models';
import { formatRupee } from '../../lib/money';

export const MonthlyReportsScreen: React.FC = () => {
  const { shop } = useShop();

  const [bills, setBills] = useState<Bill[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [report, setReport] = useState<MonthlyReportData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
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

      const rep = reportService.getMonthlyReportData(bList, eList, selectedYear, selectedMonth);
      setReport(rep);
      setIsLoading(false);
    }
    loadData();
  }, [shop?.id, selectedMonth, selectedYear]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">
      {/* Title & Date Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-heading text-[#111111]">Monthly Business Analytics</h2>
          <p className="text-xs text-[#76716B]">Audit sales, profit margins, item ranks and revenue channels</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-3 py-2 rounded-xl text-xs font-bold border border-[#EBE7E1] bg-white outline-hidden"
          >
            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => (
              <option key={idx} value={idx}>{m}</option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 rounded-xl text-xs font-bold border border-[#EBE7E1] bg-white outline-hidden"
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
          </select>

          <button
            onClick={handlePrint}
            className="px-3 py-2 rounded-xl border border-[#EBE7E1] bg-white hover:bg-[#FAF8F5] text-xs font-bold flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-[#FF5F00]" />
            <span className="hidden sm:inline">Print Report</span>
          </button>
        </div>
      </div>

      {report && (
        <>
          {/* Top 3 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-[#EBE7E1] shadow-card">
              <span className="text-xs font-semibold text-[#76716B] block mb-1">Total Month Sales</span>
              <div className="text-2xl font-black text-[#111111]">{formatRupee(report.totalSales)}</div>
              <span className="text-[11px] text-[#76716B] mt-1 block">{report.billsCount} Bills Generated</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#EBE7E1] shadow-card">
              <span className="text-xs font-semibold text-[#76716B] block mb-1">Total Store Expenses</span>
              <div className="text-2xl font-black text-red-600">-{formatRupee(report.totalExpenses)}</div>
              <span className="text-[11px] text-[#76716B] mt-1 block">Provisions & Operational</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFF0E6] border border-[#FED7AA] shadow-card">
              <span className="text-xs font-bold text-[#EA580C] block mb-1">Net Operating Profit</span>
              <div className="text-2xl font-black text-[#FF5F00]">{formatRupee(report.profit)}</div>
              <span className="text-[11px] font-bold text-[#EA580C] mt-1 block">
                Profit Margin: {report.profitMarginPct}%
              </span>
            </div>
          </div>

          {/* Payment Distribution & Top Selling Items */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Distribution */}
            <div className="p-5 rounded-2xl bg-white border border-[#EBE7E1] shadow-card">
              <h3 className="text-sm font-bold text-[#111111] mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#FF5F00]" />
                <span>Payment Mode Breakdown</span>
              </h3>

              <div className="space-y-3">
                {report.paymentModes.map((m) => (
                  <div key={m.name}>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>{m.name}</span>
                      <span className="text-[#111111]">{formatRupee(m.amount)} ({m.pct})</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-[#FAF8F5] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: m.pct,
                          backgroundColor: m.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Selling Dishes */}
            <div className="p-5 rounded-2xl bg-white border border-[#EBE7E1] shadow-card">
              <h3 className="text-sm font-bold text-[#111111] mb-4 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#FF5F00]" />
                <span>Top Selling Dishes</span>
              </h3>

              {report.topItems.length === 0 ? (
                <p className="text-xs text-[#76716B] text-center py-4">No item sales recorded for this month</p>
              ) : (
                <div className="space-y-2">
                  {report.topItems.slice(0, 5).map((it) => (
                    <div
                      key={it.name}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF8F5] text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-[#111111] text-white flex items-center justify-center font-bold text-[10px]">
                          {it.rank}
                        </span>
                        <span className="font-bold text-[#111111]">{it.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-[#111111] block">{formatRupee(it.amount)}</span>
                        <span className="text-[10px] text-[#76716B]">{it.quantity} portions</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Daily Table Summary */}
          <div className="bg-white rounded-2xl border border-[#EBE7E1] shadow-card overflow-hidden">
            <div className="p-4 border-b border-[#EBE7E1] bg-[#FAF8F5]">
              <h3 className="text-sm font-bold text-[#111111]">Day-by-Day Daily Register</h3>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF8F5] border-b border-[#EBE7E1] text-[#76716B] font-bold sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Day</th>
                    <th className="py-2.5 px-4 text-right">Daily Sales</th>
                    <th className="py-2.5 px-4 text-right">Expenses</th>
                    <th className="py-2.5 px-4 text-right">Net Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF8F5]">
                  {report.days.map((d) => (
                    <tr key={d.dayNumber} className={`hover:bg-[#FAF8F5] ${d.isToday ? 'bg-orange-50/50' : ''}`}>
                      <td className="py-2.5 px-4 font-bold text-[#111111]">{d.dateFormatted}</td>
                      <td className="py-2.5 px-4 text-[#76716B]">{d.dayOfWeek}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-[#111111]">{formatRupee(d.sales)}</td>
                      <td className="py-2.5 px-4 text-right text-red-600 font-semibold">{d.expenses > 0 ? `-${formatRupee(d.expenses)}` : '₹0'}</td>
                      <td className={`py-2.5 px-4 text-right font-extrabold ${d.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatRupee(d.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
