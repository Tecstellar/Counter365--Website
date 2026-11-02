# Counter 365 Web: External Dependencies & Hardware Considerations

This document provides a complete inventory of external third-party services, API keys, operational dependencies, and hardware printer considerations for deploying and maintaining **Counter 365 Web**.

---

## 1. Cloud & Third-Party Service Dependencies

| Service | Provider | Purpose | Configuration / Keys | Production Readiness |
| :--- | :--- | :--- | :--- | :--- |
| **Database & Auth** | Supabase | PostgreSQL storage, RLS, Realtime broadcast channels (`qr-pairing:*`), Storage bucket | `VITE_SUPABASE_URL`<br>`VITE_SUPABASE_ANON_KEY` | **Fully Configured & Shared with Android** |
| **SMS Gateway** | 2Factor.in | Delivering transactional OTPs via SMS (`Login_Verification_OTP`) | `VITE_TWOFACTOR_API_KEY`<br>`VITE_TWOFACTOR_TEMPLATE_NAME` | **Active & Live** |
| **Payment Gateway** | PayU India | Online bill payment links and subscription payments | `VITE_PAYU_ENV`<br>`VITE_PAYU_MERCHANT_ID`<br>`VITE_PAYU_KEY` | **Pre-configured in `.env`** |
| **Typography** | Google Fonts | Web typography: `Bricolage Grotesque`, `DM Sans`, `Jost`, `Lexend`, `Noto Sans Tamil` | Loaded via `<link>` in `index.html` | **CDN Cached & Fallbacked** |

---

## 2. Hardware Printing Considerations in Web Browsers

While mobile apps (Android) interact directly with Bluetooth POS printers through Android's Bluetooth RFCOMM / ESC/POS socket services, web browsers operate inside a sandboxed security model.

The following methods are supported for printing receipts from **Counter 365 Web**:

### Method A: Browser Native Print Spooler (Default & Universal)
- **Supported Printers**: Any USB, Network, Wi-Fi, or Bluetooth printer installed in the host OS (Windows, macOS, Linux).
- **Mechanism**: Counter 365 Web generates an isolated thermal receipt DOM with CSS `@page { size: 80mm auto; margin: 0; }` or `@page { size: 58mm auto; margin: 0; }` and triggers `window.print()`.
- **User Experience**: The browser print dialog pops up pre-formatted to thermal paper width.

### Method B: Chrome / Edge Kiosk Mode (Zero-Click Instant Printing)
- For high-speed POS billing counters where the cashier wants the receipt to print immediately upon pressing Enter/Checkout without displaying the print dialog:
- **Startup Flag**:
  ```bash
  chrome.exe --kiosk --kiosk-printing "https://counter365.yourdomain.com/dashboard"
  ```
- **Behavior**: Chrome automatically dispatches the print job directly to the default receipt printer in under 500ms without opening any dialog.

### Method C: Web Bluetooth API (Direct ESC/POS)
- Supported natively in Chromium-based browsers (Chrome, Edge, Opera, Samsung Internet) on Windows, macOS, Android, and ChromeOS.
- Allows direct raw binary transmission of ESC/POS byte streams to Bluetooth thermal printers (`ESC @`, `GS V 66 0` paper cut commands).

---

## 3. Environment Variables Reference

Ensure all environment variables are populated in production hosting (e.g. Vercel, Netlify, Cloudflare Pages, AWS Amplify):

```env
# Supabase Production Backend (Shared with Android App)
VITE_SUPABASE_URL=https://tziqjkklqtmjlncoraba.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_CkIw1TkmOb9qbIVd8Lb0RA_8FCAHfli

# 2Factor SMS OTP Gateway
VITE_TWOFACTOR_API_KEY=e11be203-4f77-11f1-9800-0200cd936042
VITE_TWOFACTOR_TEMPLATE_NAME=Login_Verification_OTP

# Payment Gateway
VITE_PAYU_ENV=live
VITE_PAYU_MERCHANT_ID=13821850
VITE_PAYU_KEY=pb2hmj
```
