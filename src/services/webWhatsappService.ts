import { Bill } from '../types/models';

export const webWhatsappService = {
  formatCustomerBill(
    bill: Bill,
    shopName: string,
    shopUpiId?: string | null,
    shopPhone?: string | null
  ): string {
    const rawCustName = ((bill as any).customerName || '').trim();
    const custName = rawCustName && rawCustName !== 'Not tracked' ? rawCustName : 'Valued Customer';

    const rawBillId = bill.id || (bill.billNumber ? bill.billNumber.replace(/[^a-zA-Z0-9_-]/g, '') : 'latest');
    const pdfUrl = `https://counter365.tecstellar.com/b/${rawBillId}`;

    const cleanUpi = shopUpiId?.trim();
    const hasValidUpi = !!(cleanUpi && cleanUpi.includes('@') && !cleanUpi.toLowerCase().includes('example'));
    const cleanPhone = shopPhone?.trim();
    const hasContact = !!cleanPhone;

    const formatCurrency = (amt: number = 0) =>
      `₹${Number(amt).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const isFullyPending =
      bill.paymentMode === 'Pending' ||
      ((bill.paidAmount === 0 || bill.paidAmount === undefined) &&
        (bill.pendingAmount || 0) > 0 &&
        bill.totalAmount > 0);

    const isPartiallyPaid =
      !isFullyPending &&
      (bill.paymentMode === 'Partial Pay' ||
        ((bill.paidAmount || 0) > 0 && (bill.pendingAmount || 0) > 0));

    // ==========================================
    // A. Fully Paid
    // ==========================================
    if (!isFullyPending && !isPartiallyPaid) {
      const paymentMethod = bill.paymentMode || 'Cash';
      let msg = `Hi ${custName} 👋\n\n`;
      msg += `Thank you for choosing *${shopName}*!\n\n`;
      msg += `💰 *Total Amount:* ${formatCurrency(bill.totalAmount)}\n`;
      msg += `✅ *Payment Status:* PAID (${paymentMethod})\n\n`;
      msg += `📄 *View Receipt:*\n${pdfUrl}\n\n`;
      if (hasContact) {
        msg += `📞 *Contact:* ${cleanPhone}\n\n`;
      }
      msg += `Thank you for your business!`;
      return msg;
    }

    // ==========================================
    // B. Partially Paid
    // ==========================================
    if (isPartiallyPaid) {
      const paid = bill.paidAmount || 0;
      const balance = bill.pendingAmount || Math.max(0, bill.totalAmount - paid);
      let msg = `Hi ${custName} 👋\n\n`;
      msg += `Thank you for choosing *${shopName}*!\n\n`;
      msg += `💰 *Total Amount:* ${formatCurrency(bill.totalAmount)}\n`;
      msg += `💵 *Total Paid:* ${formatCurrency(paid)}\n`;
      msg += `🔴 *Balance Due:* ${formatCurrency(balance)}\n`;
      msg += `⚠️ *Payment Status:* PARTIALLY PAID\n\n`;
      msg += `📄 *View Receipt:*\n${pdfUrl}\n\n`;

      if (hasValidUpi) msg += `💳 *UPI ID:* ${cleanUpi}\n`;
      if (hasContact) msg += `📞 *Contact:* ${cleanPhone}\n`;
      msg += `\nThank you for your business!`;
      return msg;
    }

    // ==========================================
    // C. Fully Pending
    // ==========================================
    const pendingBalance = bill.pendingAmount || bill.totalAmount;
    let msg = `Hi ${custName} 👋\n\n`;
    msg += `Thank you for choosing *${shopName}*!\n\n`;
    msg += `💰 *Total Amount:* ${formatCurrency(bill.totalAmount)}\n`;
    msg += `💵 *Total Paid:* ₹0.00\n`;
    msg += `🔴 *Balance Due:* ${formatCurrency(pendingBalance)}\n`;
    msg += `⚠️ *Payment Status:* PENDING\n\n`;
    msg += `📄 *View Receipt:*\n${pdfUrl}\n\n`;

    if (hasValidUpi) msg += `💳 *UPI ID:* ${cleanUpi}\n`;
    if (hasContact) msg += `📞 *Contact:* ${cleanPhone}\n`;
    msg += `\nThank you for your business!`;
    return msg;
  },

  /**
   * Opens WhatsApp Web or WhatsApp Desktop directly
   */
  shareCustomerBill(
    bill: Bill,
    shopName: string,
    shopUpiId?: string | null,
    shopPhone?: string | null,
    customerPhone?: string | null
  ) {
    const text = this.formatCustomerBill(bill, shopName, shopUpiId, shopPhone);
    const rawDigits = (customerPhone || bill.customerPhone || '').replace(/[^0-9]/g, '');
    const cleanPhone =
      rawDigits.length >= 10
        ? rawDigits.length === 10
          ? '91' + rawDigits
          : rawDigits
        : '';

    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(url, '_blank');
  },
};
