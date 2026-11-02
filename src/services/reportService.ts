import { Bill, ExpenseRecord, DayClosingReport, MonthlyReportData, Shop } from '../types/models';

export const reportService = {
  getDayClosingReport(bills: Bill[], expenses: ExpenseRecord[], shop: Shop, targetDate?: string): DayClosingReport {
    const todayStr = targetDate || new Date().toISOString().split('T')[0];
    const filteredBills = bills.filter(b => b.status !== 'cancelled' && b.createdAt.startsWith(todayStr));
    const filteredExpenses = expenses.filter(e => e.expenseDate.startsWith(todayStr));

    let cashSales = 0;
    let gpaySales = 0;
    let pendingSales = 0;
    let totalSales = 0;

    filteredBills.forEach(b => {
      totalSales += b.totalAmount;
      if (b.paymentMode === 'Cash') {
        cashSales += b.paidAmount;
      } else if (b.paymentMode === 'GPay') {
        gpaySales += b.paidAmount;
      } else if (b.paymentMode === 'Cash + GPay') {
        cashSales += b.cashAmount || 0;
        gpaySales += b.gpayAmount || 0;
      } else if (b.paymentMode === 'Pending') {
        pendingSales += b.pendingAmount;
      } else if (b.paymentMode === 'Partial Pay') {
        cashSales += b.paidAmount || 0;
        pendingSales += b.pendingAmount || 0;
      } else {
        cashSales += b.paidAmount;
      }
    });

    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalSales - totalExpenses;

    return {
      date: todayStr,
      shopTitle: shop.name || 'Counter 365 Shop',
      shopAddress: shop.address || '',
      phone: shop.phone || '',
      totalSales,
      cashSales,
      gpaySales,
      pendingSales,
      totalExpenses,
      netProfit,
      billsCount: filteredBills.length,
      hoursNote: 'Full Day Business Summary',
    };
  },

  getMonthlyReportData(bills: Bill[], expenses: ExpenseRecord[], year: number, month: number): MonthlyReportData {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

    const monthBills = bills.filter(b => b.status !== 'cancelled' && b.createdAt.startsWith(monthPrefix));
    const monthExpenses = expenses.filter(e => e.expenseDate.startsWith(monthPrefix));

    let totalSales = 0;
    let cashSales = 0;
    let gpaySales = 0;
    let pendingSales = 0;

    monthBills.forEach(b => {
      totalSales += b.totalAmount;
      if (b.paymentMode === 'Cash') cashSales += b.paidAmount;
      else if (b.paymentMode === 'GPay') gpaySales += b.paidAmount;
      else if (b.paymentMode === 'Cash + GPay') {
        cashSales += b.cashAmount || 0;
        gpaySales += b.gpayAmount || 0;
      } else if (b.paymentMode === 'Pending') pendingSales += b.pendingAmount;
      else if (b.paymentMode === 'Partial Pay') {
        cashSales += b.paidAmount;
        pendingSales += b.pendingAmount;
      } else cashSales += b.paidAmount;
    });

    const totalExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const profit = totalSales - totalExpenses;
    const profitMarginPct = totalSales > 0 ? Math.round((profit / totalSales) * 100) : 0;

    // Top Selling Items
    const itemMap: Record<string, { quantity: number; amount: number }> = {};
    monthBills.forEach(b => {
      (b.items || []).forEach(it => {
        const key = it.itemName;
        if (!itemMap[key]) itemMap[key] = { quantity: 0, amount: 0 };
        itemMap[key].quantity += it.quantity;
        itemMap[key].amount += it.lineTotal;
      });
    });

    const topItems = Object.entries(itemMap)
      .map(([name, data]) => ({
        rank: 1,
        name,
        quantity: data.quantity,
        amount: data.amount,
        pct: totalSales > 0 ? `${Math.round((data.amount / totalSales) * 100)}%` : '0%',
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    // Days in Month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const dayNumber = i + 1;
      const dayDateStr = `${monthPrefix}-${String(dayNumber).padStart(2, '0')}`;
      const dayBills = monthBills.filter(b => b.createdAt.startsWith(dayDateStr));
      const dayExpenses = monthExpenses.filter(e => e.expenseDate.startsWith(dayDateStr));
      const daySales = dayBills.reduce((s, b) => s + b.totalAmount, 0);
      const dayExp = dayExpenses.reduce((s, e) => s + e.amount, 0);

      const d = new Date(year, month, dayNumber);
      const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'short' });

      return {
        dayNumber,
        dateFormatted: dayDateStr,
        dayOfWeek,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        isToday: dayDateStr === new Date().toISOString().split('T')[0],
        sales: daySales,
        expenses: dayExp,
        profit: daySales - dayExp,
      };
    });

    // Best Day
    let bestDay = { day: 1, dow: 'Mon', profit: 0 };
    days.forEach(d => {
      if (d.profit > bestDay.profit) {
        bestDay = { day: d.dayNumber, dow: d.dayOfWeek, profit: d.profit };
      }
    });

    // Payment Modes
    const paymentModes = [
      {
        name: 'Cash',
        amount: cashSales,
        pct: totalSales > 0 ? `${Math.round((cashSales / totalSales) * 100)}%` : '0%',
        color: '#16A34A',
      },
      {
        name: 'GPay / UPI',
        amount: gpaySales,
        pct: totalSales > 0 ? `${Math.round((gpaySales / totalSales) * 100)}%` : '0%',
        color: '#2563EB',
      },
      {
        name: 'Pending Due',
        amount: pendingSales,
        pct: totalSales > 0 ? `${Math.round((pendingSales / totalSales) * 100)}%` : '0%',
        color: '#D97706',
      },
    ];

    return {
      month,
      year,
      monthLabel: `${monthNames[month]} ${year}`,
      monthShort: shortMonths[month],
      rangeLabel: `1 ${shortMonths[month]} - ${daysInMonth} ${shortMonths[month]} ${year}`,
      totalSales,
      totalExpenses,
      profit,
      profitMarginPct,
      billsCount: monthBills.length,
      bestDay,
      weeks: [],
      paymentModes,
      days,
      topItems,
    };
  },
};
