import { Bill, Shop } from '../types/models';
import { formatRupee } from '../lib/money';

export const exportService = {
  stripEmojis(str: string): string {
    return (str || '')
      .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
      .trim();
  },

  generateQrSvg(data: string, size: number = 100): string {
    // Generate clean QR code data URI or SVG placeholder
    return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#FFFFFF" rx="8"/>
      <!-- QR Corner 1 -->
      <rect x="10" y="10" width="24" height="24" rx="4" fill="#111111"/>
      <rect x="15" y="15" width="14" height="14" rx="2" fill="#FFFFFF"/>
      <rect x="18" y="18" width="8" height="8" rx="1" fill="#FF5F00"/>
      <!-- QR Corner 2 -->
      <rect x="66" y="10" width="24" height="24" rx="4" fill="#111111"/>
      <rect x="71" y="15" width="14" height="14" rx="2" fill="#FFFFFF"/>
      <rect x="74" y="18" width="8" height="8" rx="1" fill="#FF5F00"/>
      <!-- QR Corner 3 -->
      <rect x="10" y="66" width="24" height="24" rx="4" fill="#111111"/>
      <rect x="15" y="71" width="14" height="14" rx="2" fill="#FFFFFF"/>
      <rect x="18" y="74" width="8" height="8" rx="1" fill="#FF5F00"/>
      <!-- Data Pattern Blocks -->
      <rect x="42" y="14" width="16" height="6" fill="#111111"/>
      <rect x="42" y="24" width="8" height="10" fill="#111111"/>
      <rect x="14" y="42" width="10" height="8" fill="#111111"/>
      <rect x="28" y="42" width="6" height="16" fill="#111111"/>
      <rect x="42" y="42" width="16" height="16" rx="2" fill="#FF5F00"/>
      <rect x="66" y="42" width="20" height="6" fill="#111111"/>
      <rect x="78" y="52" width="8" height="16" fill="#111111"/>
      <rect x="42" y="66" width="6" height="20" fill="#111111"/>
      <rect x="54" y="74" width="16" height="12" fill="#111111"/>
      <rect x="76" y="76" width="14" height="14" rx="2" fill="#111111"/>
    </svg>`;
  },

  buildBillReceiptHtml(bill: Bill, shop: Shop): string {
    const timeStr = new Date(bill.createdAt || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const dateStr = new Date(bill.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const formatMoney = (amount: number): string => {
      if (amount === 0) return '₹0.00';
      if (amount % 1 !== 0) {
        return '\u20B9' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      return formatRupee(amount);
    };

    const cleanShopName = this.stripEmojis(shop.name || 'Counter 365 Merchant');
    const cleanShopAddress = this.stripEmojis(shop.address || '');
    const cleanShopCity = this.stripEmojis(shop.city || '');
    const cleanShopPhone = (shop.phone || '').trim();
    const cleanBillNumber = (bill.billNumber || '0001').replace(/[^a-zA-Z0-9_-]/g, '');

    const rawCustName = (bill.customerName || '').trim();
    const isWalkIn = !rawCustName || rawCustName === 'Not tracked' || rawCustName.toLowerCase() === 'walk-in' || rawCustName.toLowerCase() === 'walk-in customer';
    const cleanCustName = isWalkIn ? 'Walk-in Customer' : this.stripEmojis(rawCustName);
    const cleanCustPhone = (bill.customerPhone || '').replace(/[^0-9]/g, '').slice(-10);

    const isFullyPending = bill.paymentMode === 'Pending' || ((bill.paidAmount === 0 || bill.paidAmount === undefined) && (bill.pendingAmount || 0) > 0 && bill.totalAmount > 0);
    const isPartiallyPaid = !isFullyPending && (bill.paymentMode === 'Partial Pay' || ((bill.paidAmount || 0) > 0 && (bill.pendingAmount || 0) > 0));
    const isFullyPaid = !isFullyPending && !isPartiallyPaid;

    const subtotal = bill.subtotal !== undefined && bill.subtotal !== null ? bill.subtotal : bill.totalAmount;
    const discountAmount = bill.discountAmount || 0;
    const gstAmount = bill.gstAmount || 0;

    const itemRowsHtml = (bill.items || []).map(item => {
      const rawName = item.itemName || 'Item';
      const cleanItemName = this.stripEmojis(rawName).replace(/\s*\((?:half|full)\)/gi, '').trim();
      const portionTag = item.isHalf ? `<span style="font-size: 13px; color: #EA580C; font-weight: 700; margin-left: 5px;">(Half)</span>` : '';
      const lineTotal = item.lineTotal || (item.unitPrice * item.quantity);
      return `
        <tr class="table-tr">
          <td class="td-item">${cleanItemName}${portionTag}</td>
          <td class="td-qty">${item.quantity}</td>
          <td class="td-price">${formatMoney(item.unitPrice)}</td>
          <td class="td-total">${formatMoney(lineTotal)}</td>
        </tr>
      `;
    }).join('');

    let intermediateRowsHtml = '';
    if (discountAmount > 0) {
      intermediateRowsHtml += `
        <div class="subtotal-row">
          <span class="subtotal-label">Discount</span>
          <span class="subtotal-val" style="color: #16A34A;">-${formatMoney(discountAmount)}</span>
        </div>
      `;
    }
    if (gstAmount > 0) {
      const displayGstRate = bill.gstRate !== undefined && bill.gstRate !== null && bill.gstRate > 0 ? bill.gstRate : (shop.gstRate || 5);
      intermediateRowsHtml += `
        <div class="subtotal-row">
          <span class="subtotal-label">GST (${displayGstRate}%)</span>
          <span class="subtotal-val">${formatMoney(gstAmount)}</span>
        </div>
      `;
    }

    let paymentDetailsHtml = '';
    let upiBlockHtml = '';

    if (isFullyPaid) {
      let paidMethodLabel: string = bill.paymentMode || 'Cash';
      if (bill.paymentMode === 'Cash + GPay' && (bill.cashAmount !== undefined || bill.gpayAmount !== undefined)) {
        paidMethodLabel = `Cash ${formatMoney(bill.cashAmount || 0)} + GPay ${formatMoney(bill.gpayAmount || 0)}`;
      }
      paymentDetailsHtml = `
        <div class="status-panel" style="background: #FFF7ED; border-left: 4px solid #FF5F00;">
          <div class="status-left">
            <div>
              <div class="status-badge-title" style="color: #FF5F00;">PAID</div>
              <div class="status-badge-sub">Paid via ${paidMethodLabel}</div>
            </div>
          </div>
          <div class="status-right-amount" style="color: #111111;">${formatMoney(bill.totalAmount)}</div>
        </div>
      `;
    } else if (isPartiallyPaid) {
      const paid = bill.paidAmount || 0;
      const balance = bill.pendingAmount || Math.max(0, bill.totalAmount - paid);
      paymentDetailsHtml = `
        <div class="status-panel" style="background: #FFF7ED; border-left: 4px solid #EA580C;">
          <div class="status-left">
            <div>
              <div class="status-badge-title" style="color: #EA580C;">PARTIALLY PAID</div>
              <div class="status-badge-sub">Paid ${formatMoney(paid)} · Due ${formatMoney(balance)}</div>
            </div>
          </div>
          <div class="status-right-amount" style="color: #EA580C;">Due ${formatMoney(balance)}</div>
        </div>
      `;

      if (balance > 0 && shop.upiId && shop.upiId.trim()) {
        const cleanUpi = shop.upiId.trim();
        const upiUri = `upi://pay?pa=${cleanUpi}&pn=${encodeURIComponent(cleanShopName)}&am=${balance.toFixed(2)}&cu=INR&tn=Bill-${cleanBillNumber}`;
        const qrSvg = this.generateQrSvg(upiUri, 84);
        upiBlockHtml = `
          <div class="upi-block">
            <div class="upi-details">
              <div class="upi-label">PAY BALANCE VIA UPI</div>
              <div class="upi-id-val">${cleanUpi}</div>
              <div class="upi-due-val">Amount: ${formatMoney(balance)}</div>
            </div>
            <div class="upi-qr-tile">${qrSvg}</div>
          </div>
        `;
      }
    } else {
      const pendingBalance = bill.pendingAmount || bill.totalAmount;
      paymentDetailsHtml = `
        <div class="status-panel" style="background: #FFFBEB; border-left: 4px solid #D97706;">
          <div class="status-left">
            <div>
              <div class="status-badge-title" style="color: #D97706;">PAYMENT PENDING</div>
              <div class="status-badge-sub">Payment Due · Amount Paid: ₹0.00</div>
            </div>
          </div>
          <div class="status-right-amount" style="color: #D97706;">Due ${formatMoney(pendingBalance)}</div>
        </div>
      `;

      if (pendingBalance > 0 && shop.upiId && shop.upiId.trim()) {
        const cleanUpi = shop.upiId.trim();
        const upiUri = `upi://pay?pa=${cleanUpi}&pn=${encodeURIComponent(cleanShopName)}&am=${pendingBalance.toFixed(2)}&cu=INR&tn=Bill-${cleanBillNumber}`;
        const qrSvg = this.generateQrSvg(upiUri, 84);
        upiBlockHtml = `
          <div class="upi-block">
            <div class="upi-details">
              <div class="upi-label">PAY VIA UPI · SCAN QR</div>
              <div class="upi-id-val">${cleanUpi}</div>
              <div class="upi-due-val">Amount: ${formatMoney(pendingBalance)}</div>
            </div>
            <div class="upi-qr-tile">${qrSvg}</div>
          </div>
        `;
      }
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Receipt #${cleanBillNumber} - ${cleanShopName}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #FFFFFF;
            color: #111111;
            padding: 16px;
            font-size: 14px;
            line-height: 1.4;
          }
          .receipt-container {
            max-width: 420px;
            margin: 0 auto;
            border: 1px solid #EBE7E1;
            border-radius: 12px;
            padding: 20px;
            background: #FFFFFF;
          }
          .shop-header { text-align: center; margin-bottom: 16px; border-bottom: 2px dashed #EBE7E1; padding-bottom: 14px; }
          .shop-name { font-size: 22px; font-weight: 800; color: #111111; margin-bottom: 4px; }
          .shop-meta { font-size: 13px; color: #555555; margin-bottom: 2px; }
          .shop-gst { font-size: 12px; color: #FF5F00; font-weight: 600; margin-top: 4px; }
          
          .bill-meta-grid { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 12px; color: #444444; }
          .bill-meta-col-left { text-align: left; }
          .bill-meta-col-right { text-align: right; }
          .bill-number { font-weight: 700; color: #111111; font-size: 15px; }

          table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
          th { text-align: left; font-size: 12px; text-transform: uppercase; color: #777777; padding: 8px 4px; border-bottom: 1px solid #EBE7E1; }
          th.td-qty, th.td-price, th.td-total { text-align: right; }
          .td-item { padding: 8px 4px; font-weight: 600; color: #111111; }
          .td-qty { text-align: right; padding: 8px 4px; }
          .td-price { text-align: right; padding: 8px 4px; color: #555555; }
          .td-total { text-align: right; padding: 8px 4px; font-weight: 700; }
          .table-tr { border-bottom: 1px dashed #F0ECE6; }

          .subtotal-section { border-top: 1px solid #EBE7E1; padding-top: 10px; margin-bottom: 14px; }
          .subtotal-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 6px; }
          .subtotal-label { color: #555555; }
          .subtotal-val { font-weight: 600; }
          .grand-total-row { display: flex; justify-content: space-between; font-size: 18px; font-weight: 800; border-top: 2px solid #111111; padding-top: 8px; margin-top: 6px; }

          .status-panel { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; border-radius: 8px; margin-bottom: 14px; }
          .status-badge-title { font-size: 14px; font-weight: 800; letter-spacing: 0.5px; }
          .status-badge-sub { font-size: 12px; color: #666666; margin-top: 2px; }
          .status-right-amount { font-size: 16px; font-weight: 800; }

          .upi-block { display: flex; justify-content: space-between; align-items: center; border: 1px solid #FED7AA; background: #FFF7ED; padding: 12px; border-radius: 8px; margin-bottom: 14px; }
          .upi-label { font-size: 11px; font-weight: 700; color: #EA580C; letter-spacing: 0.5px; }
          .upi-id-val { font-size: 14px; font-weight: 700; color: #111111; margin: 2px 0; }
          .upi-due-val { font-size: 12px; color: #EA580C; font-weight: 600; }
          .upi-qr-tile { display: flex; align-items: center; justify-content: center; }

          .receipt-footer { text-align: center; border-top: 1px dashed #EBE7E1; padding-top: 12px; font-size: 12px; color: #777777; }
          .footer-brand { font-weight: 700; color: #FF5F00; font-size: 13px; margin-bottom: 2px; }

          @media print {
            body { padding: 0; background: #FFFFFF; }
            .receipt-container { border: none; max-width: 100%; width: 100%; border-radius: 0; padding: 0; }
            @page { margin: 4mm; size: auto; }
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="shop-header">
            <div class="shop-name">${cleanShopName}</div>
            ${cleanShopAddress ? `<div class="shop-meta">${cleanShopAddress}${cleanShopCity ? `, ${cleanShopCity}` : ''}</div>` : ''}
            ${cleanShopPhone ? `<div class="shop-meta">Phone: +91 ${cleanShopPhone}</div>` : ''}
            ${shop.gstNumber ? `<div class="shop-gst">GSTIN: ${shop.gstNumber}</div>` : ''}
          </div>

          <div class="bill-meta-grid">
            <div class="bill-meta-col-left">
              <div class="bill-number">Bill #${cleanBillNumber}</div>
              <div>${cleanCustName}${cleanCustPhone ? ` (${cleanCustPhone})` : ''}</div>
              ${bill.tableNumber ? `<div>Table: ${bill.tableNumber}</div>` : ''}
            </div>
            <div class="bill-meta-col-right">
              <div>${dateStr}</div>
              <div>${timeStr}</div>
              <div>Cashier: ${bill.createdByName || 'Staff'}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th class="td-qty">Qty</th>
                <th class="td-price">Price</th>
                <th class="td-total">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemRowsHtml}
            </tbody>
          </table>

          <div class="subtotal-section">
            <div class="subtotal-row">
              <span class="subtotal-label">Subtotal</span>
              <span class="subtotal-val">${formatMoney(subtotal)}</span>
            </div>
            ${intermediateRowsHtml}
            <div class="grand-total-row">
              <span>Grand Total</span>
              <span>${formatMoney(bill.totalAmount)}</span>
            </div>
          </div>

          ${paymentDetailsHtml}
          ${upiBlockHtml}

          <div class="receipt-footer">
            <div class="footer-brand">Counter 365</div>
            <div>Thank you for your visit! Please visit again.</div>
          </div>
        </div>
      </body>
      </html>
    `;
  },

  printReceipt(bill: Bill, shop: Shop): void {
    const html = this.buildBillReceiptHtml(bill, shop);
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 1500);
      }, 350);
    }
  },
};
