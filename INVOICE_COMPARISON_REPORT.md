# Counter 365: Invoice & Receipt Comparison Report

This report documents the verification, field-by-field layout analysis, and rendering behavior of the **Counter 365 Web** invoice and thermal receipt generation against the Android reference implementation.

---

## 1. Executive Summary

In both the Android (`expo-print`) and Web implementations, invoice rendering is driven by clean, deterministic HTML/CSS templates designed for high-speed thermal printers (58mm and 80mm) and standard A4/Letter desktop printing. 

The Web application (`src/services/exportService.ts`) reproduces the exact structure, font sizing, spacing, borders, dashes, and totals calculated in Android's `src/services/printerService.ts` and `src/services/billingService.ts`.

---

## 2. Receipt Layout & Field-by-Field Breakdown

| Section | Element / Field | Android Reference (`printerService.ts`) | Web Target (`exportService.ts`) | Parity Status |
| :--- | :--- | :--- | :--- | :--- |
| **Header** | Shop Name | Centered bold, 17px (80mm) / 14px (58mm) | Centered bold, 17px (80mm) / 14px (58mm) | **Identical** |
| | Shop Address | Centered, 11px (80mm) / 9.5px (58mm) | Centered, 11px (80mm) / 9.5px (58mm) | **Identical** |
| | Shop Phone | `Ph: +91 {shopPhone}` | `Ph: +91 {shopPhone}` | **Identical** |
| | GSTIN (if enabled)| `GSTIN: {gstin}` centered | `GSTIN: {gstin}` centered | **Identical** |
| | Divider | `1px dashed #000` | `1px dashed #000` | **Identical** |
| **Meta Info** | Bill Number | `Bill #{billNumber}` (Bold Left) | `Bill #{billNumber}` (Bold Left) | **Identical** |
| | Bill Time | `hh:mm a` formatted (Right) | `hh:mm a` formatted (Right) | **Identical** |
| | Table / Type | `Table: {table}` or `Takeaway / Counter` | `Table: {table}` or `Takeaway / Counter` | **Identical** |
| | Bill Date | `DD MMM YYYY` (Right) | `DD MMM YYYY` (Right) | **Identical** |
| | Divider | `1px dashed #000` | `1px dashed #000` | **Identical** |
| **Items Header**| Table Columns | `ITEM` (flex), `QTY` (34px right), `AMT` (70px/55px right) | `ITEM` (flex), `QTY` (34px right), `AMT` (70px/55px right) | **Identical** |
| | Divider | `1px dashed #000` | `1px dashed #000` | **Identical** |
| **Item Rows** | Item Name | Item name with `(Half)` suffix if half portion | Item name with `(Half)` suffix if half portion | **Identical** |
| | Quantity | `x{quantity}` | `x{quantity}` | **Identical** |
| | Line Total | Formatted in Indian Rupee format `₹XX.XX` | Formatted in Indian Rupee format `₹XX.XX` | **Identical** |
| | Divider | `1px dashed #000` | `1px dashed #000` | **Identical** |
| **Financials** | Subtotal | Subtotal amount right-aligned | Subtotal amount right-aligned | **Identical** |
| | GST Row | Displayed only when `gstAmount > 0`: `GST ({rate}%)` | Displayed only when `gstAmount > 0`: `GST ({rate}%)` | **Identical** |
| | Discount Row | Displayed only when `discountAmount > 0`: `- ₹XX.XX` | Displayed only when `discountAmount > 0`: `- ₹XX.XX` | **Identical** |
| | Grand Total | `TOTAL AMOUNT` with `border-top: 1px solid #000` | `TOTAL AMOUNT` with `border-top: 1px solid #000` | **Identical** |
| | Divider | `1px dashed #000` | `1px dashed #000` | **Identical** |
| **Payment** | Payment Mode | `Cash`, `GPay / UPI`, `Card`, `Partial Pay`, `Pending` | `Cash`, `GPay / UPI`, `Card`, `Partial Pay`, `Pending` | **Identical** |
| | Split Breakup | Paid Amount & Balance Due for Partial Pay | Paid Amount & Balance Due for Partial Pay | **Identical** |
| | Khata Box | Solid black box for Pending dues with Customer details | Solid black box for Pending dues with Customer details | **Identical** |
| | UPI QR Code | Dynamic BharatQR / UPI payload for instant scan & pay | Dynamic BharatQR / UPI payload for instant scan & pay | **Identical** |
| **Footer** | Customer Name | Shown when customer is tagged | Shown when customer is tagged | **Identical** |
| | Greeting | `Thank you — Visit Again!` | `Thank you — Visit Again!` | **Identical** |
| | Attribution | `Powered by COUNTER365` | `Powered by COUNTER365` | **Identical** |

---

## 3. Invoice Number Sequencing Comparison

Android uses `generateDefaultInvoicePrefix` and `formatInvoiceNumber` in `src/lib/invoiceUtils.ts`:

- **Prefix Generation**:
  - 1 word: first 3 characters uppercase (`Raj` -> `RAJ`).
  - 2+ words: initial letter of each word (`Raj Tea Stall` -> `RTS`).
  - Fallback: `CP`.
- **Reset Cycles**:
  - **Monthly**: `{PREFIX}-{MONTH}-{SEQ}` (e.g., `RTS-October-001`).
  - **Yearly**: `{PREFIX}-{SEQ}` (e.g., `RTS-001`).

The Web version replicates this exact formatting algorithm inside `src/services/billingService.ts`, ensuring that bills generated from the web integrate seamlessly into the shop's physical invoice continuity.

---

## 4. Cross-Platform Print Architecture

### Android Implementation
- Uses `expo-print` bridging to Android's OS Print Spooler and ESC/POS Bluetooth adapters (RawBT / Service plugin).
- Custom thermal width constraints (`78mm` for 80mm roll, `53mm` for 58mm roll).

### Web Implementation
- Generates an isolated, sandboxed `<iframe>` loaded with the exact thermal CSS `@page { size: 80mm auto; margin: 0; }`.
- Automatically calls `iframe.contentWindow.print()`.
- Compatible with all USB, Network, and Bluetooth thermal printers supported by the operating system (Windows, macOS, Linux, ChromeOS).
- Supports Silent/Kiosk printing (`--kiosk-printing` in Google Chrome and Microsoft Edge) for zero-click instant POS receipts.
