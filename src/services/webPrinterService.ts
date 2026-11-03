import { Bill, Shop } from '../types/models';

export type ThermalPaperSize = '80mm' | '58mm';

export const webPrinterService = {
  /**
   * Generates production-grade thermal receipt HTML for 58mm / 80mm roll widths
   */
  generateThermalHtml(
    bill: Bill,
    shop: Shop,
    paperSize: ThermalPaperSize = '80mm'
  ): string {
    const is80 = paperSize === '80mm';
    const paperWidth = is80 ? '78mm' : '53mm';
    const fontSize = is80 ? '13px' : '11px';
    const titleSize = is80 ? '17px' : '14px';
    const totalSize = is80 ? '16px' : '13px';

    const formatCurrency = (amt: number = 0) =>
      `₹${Number(amt).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const lines = (bill.items || []).map((i) => {
      const baseItemName = (i.itemName || 'Item').replace(/\s*\((?:half|full)\)/gi, '').trim();
      const portionText = (i as any).isHalf ? ' (Half)' : '';
      return `
        <div style="display:flex; justify-content:space-between; padding:3px 0; font-size:${fontSize};">
          <span style="flex:1; word-break:break-word;">${baseItemName}${portionText}</span>
          <span style="width:34px; text-align:right;">x${i.quantity}</span>
          <span style="width:${is80 ? '75px' : '60px'}; text-align:right; font-weight:bold;">${formatCurrency(i.lineTotal)}</span>
        </div>
      `;
    }).join('');

    const dateStr = new Date(bill.createdAt || Date.now()).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const timeStr = new Date(bill.createdAt || Date.now()).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Bill #${bill.billNumber}</title>
          <style>
            @page {
              margin: 0;
              size: ${is80 ? '80mm' : '58mm'} auto;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              width: ${paperWidth};
              margin: 0 auto;
              padding: ${is80 ? '8px 10px' : '5px 6px'};
              color: #000;
              font-size: ${fontSize};
              line-height: 1.35;
              background: #fff;
            }
            .center { text-align: center; }
            .dashed { border-top: 1px dashed #000; margin: 6px 0; }
            .solid { border-top: 1px solid #000; margin: 6px 0; }
            .flex { display: flex; justify-content: space-between; }
            .bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: ${titleSize}; letter-spacing: 0.5px;">${shop.name}</div>
          ${shop.address ? `<div class="center" style="font-size: ${is80 ? '11px' : '9.5px'}; margin-top:2px;">${shop.address}</div>` : ''}
          ${shop.phone ? `<div class="center" style="font-size: ${is80 ? '11px' : '9.5px'};">Ph: +91 ${shop.phone}</div>` : ''}
          <div class="dashed"></div>
          
          <div class="flex" style="font-size: ${fontSize};">
            <span class="bold">Bill #${bill.billNumber}</span>
            <span>${timeStr}</span>
          </div>
          <div class="flex" style="font-size: ${is80 ? '11px' : '9.5px'};">
            <span>${(bill as any).tableNumber ? 'Table: ' + (bill as any).tableNumber : 'Takeaway / Counter'}</span>
            <span>${dateStr}</span>
          </div>
          
          <div class="dashed"></div>
          <div class="flex bold" style="font-size: ${fontSize}; margin-bottom: 2px;">
            <span style="flex:1;">ITEM</span>
            <span style="width:34px; text-align:right;">QTY</span>
            <span style="width:${is80 ? '75px' : '60px'}; text-align:right;">AMT</span>
          </div>
          <div class="dashed" style="margin: 2px 0 4px 0;"></div>
          
          ${lines}
          
          <div class="dashed"></div>
          <div class="flex">
            <span>Subtotal</span>
            <span class="bold">${formatCurrency(bill.subtotal)}</span>
          </div>
          
          ${bill.gstAmount && bill.gstAmount > 0 ? `
          <div class="flex">
            <span>GST (${(bill as any).gstRate || 5}%)</span>
            <span>${formatCurrency(bill.gstAmount)}</span>
          </div>` : ''}
          
          ${bill.discountAmount && bill.discountAmount > 0 ? `
          <div class="flex">
            <span>Discount</span>
            <span>- ${formatCurrency(bill.discountAmount)}</span>
          </div>` : ''}
          
          <div class="solid"></div>
          <div class="flex bold" style="font-size: ${totalSize};">
            <span>TOTAL AMOUNT</span>
            <span>${formatCurrency(bill.totalAmount)}</span>
          </div>
          <div class="dashed"></div>
          
          <div class="flex" style="font-size: ${is80 ? '11.5px' : '10px'};">
            <span>Payment Mode</span>
            <span class="bold">${bill.paymentMode || 'Cash'}</span>
          </div>
          
          ${bill.paymentMode === 'Partial Pay' ? `
          <div class="flex" style="font-size: ${is80 ? '11px' : '9.5px'};">
            <span>Paid Amount</span>
            <span>${formatCurrency(bill.paidAmount)}</span>
          </div>
          <div class="flex bold" style="font-size: ${is80 ? '11px' : '9.5px'};">
            <span>Balance Due</span>
            <span>${formatCurrency(bill.pendingAmount)}</span>
          </div>` : ''}
          
          ${bill.paymentMode === 'Cash + GPay' ? `
          <div class="flex" style="font-size: ${is80 ? '11px' : '9.5px'};">
            <span>Cash</span>
            <span>${formatCurrency((bill as any).cashAmount || 0)}</span>
          </div>
          <div class="flex" style="font-size: ${is80 ? '11px' : '9.5px'};">
            <span>GPay / UPI</span>
            <span>${formatCurrency((bill as any).gpayAmount || 0)}</span>
          </div>` : ''}
          
          ${bill.paymentMode === 'Pending' ? `
          <div style="border:1px solid #000; padding:4px; margin-top:4px; font-size:${is80 ? '11px' : '9.5px'};">
            PENDING DUES: ${(bill as any).customerName || 'Customer'}${bill.customerPhone ? ' (' + bill.customerPhone + ')' : ''}
          </div>` : ''}
          
          ${((bill as any).customerName || bill.customerPhone) && bill.paymentMode !== 'Pending' ? `
          <div style="padding:2px 0; margin-top:3px; font-size:${is80 ? '11px' : '9.5px'};">
            Customer: ${(bill as any).customerName || ''}${bill.customerPhone ? ' (' + bill.customerPhone + ')' : ''}
          </div>` : ''}
          
          <div class="dashed"></div>
          <div class="center" style="font-size: ${is80 ? '10px' : '9px'}; margin-top: 6px;">
            Thank you — Visit Again!<br/>Powered by COUNTER365
          </div>
        </body>
      </html>
    `;
  },

  /**
   * Generates thermal test slip HTML
   */
  generateTestSlipHtml(shop: Shop, paperSize: ThermalPaperSize = '80mm'): string {
    const is80 = paperSize === '80mm';
    const paperWidth = is80 ? '78mm' : '53mm';
    const fontSize = is80 ? '13px' : '11px';
    const nowStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Test Print</title>
          <style>
            @page { margin: 0; size: ${is80 ? '80mm' : '58mm'} auto; }
            body {
              font-family: 'Courier New', Courier, monospace;
              width: ${paperWidth};
              margin: 0 auto;
              padding: 10px 8px;
              color: #000;
              font-size: ${fontSize};
              line-height: 1.35;
              background: #fff;
            }
            .center { text-align: center; }
            .dashed { border-top: 1px dashed #000; margin: 6px 0; }
            .solid { border-top: 2px solid #000; margin: 6px 0; }
            .flex { display: flex; justify-content: space-between; }
            .bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: ${is80 ? '16px' : '14px'};">${shop.name}</div>
          ${shop.address ? `<div class="center" style="font-size: 10px; margin-top:2px;">${shop.address}</div>` : ''}
          ${shop.phone ? `<div class="center" style="font-size: 10px;">Ph: +91 ${shop.phone}</div>` : ''}
          <div class="dashed"></div>
          <div class="center bold" style="font-size: ${is80 ? '14px' : '12px'}; letter-spacing: 1px;">*** TEST SLIP ***</div>
          <div class="flex" style="font-size: 10.5px; margin-top: 4px;">
            <span>Time: ${nowStr}</span>
            <span>Date: ${dateStr}</span>
          </div>
          <div class="dashed"></div>
          <div class="flex">
            <span>Printer Status:</span>
            <span class="bold">ONLINE</span>
          </div>
          <div class="flex" style="margin-top: 3px;">
            <span>Paper Size:</span>
            <span class="bold">${paperSize} Thermal Roll</span>
          </div>
          <div class="dashed"></div>
          <div class="flex bold">
            <span>ITEM</span>
            <span>QTY</span>
            <span>AMT</span>
          </div>
          <div class="dashed"></div>
          <div class="flex">
            <span>Sample Coffee</span>
            <span>x1</span>
            <span class="bold">₹25.00</span>
          </div>
          <div class="flex">
            <span>Sample Snack</span>
            <span>x1</span>
            <span class="bold">₹35.00</span>
          </div>
          <div class="solid"></div>
          <div class="flex bold" style="font-size: ${is80 ? '15px' : '13px'};">
            <span>TEST TOTAL:</span>
            <span>₹60.00</span>
          </div>
          <div class="dashed"></div>
          <div class="center" style="font-size: 10px; margin-top: 6px;">
            THERMAL HARDWARE WORKING PERFECTLY<br/>
            Powered by COUNTER365
          </div>
        </body>
      </html>
    `;
  },

  /**
   * Executes silent browser print via a hidden iframe
   */
  printHtml(htmlContent: string) {
    const iframeId = '__counter365_thermal_printer_frame__';
    let iframe = document.getElementById(iframeId) as HTMLIFrameElement;

    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = iframeId;
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 250);
  },

  printReceipt(bill: Bill, shop: Shop, paperSize?: ThermalPaperSize) {
    const size = paperSize || (shop as any).printerPaperWidth || '80mm';
    const html = this.generateThermalHtml(bill, shop, size);
    this.printHtml(html);
  },

  printTestSlip(shop: Shop, paperSize?: ThermalPaperSize) {
    const size = paperSize || (shop as any).printerPaperWidth || '80mm';
    const html = this.generateTestSlipHtml(shop, size);
    this.printHtml(html);
  },
};
