# Counter 365 Web Application

Production-ready web application for **Counter 365 (Counter Pro)**, converted directly from the production Android mobile application with exact functional parity, unified Supabase database reuse, deterministic financial calculations, and reproduction of the AI-designed landing page.

---

## 1. Documentation Index

For in-depth analysis and technical specifications, refer to the following companion documents:

- 📊 [**Android to Web Comparison Matrix**](file:///d:/CounterproBill/Counter365-Web/ANDROID_TO_WEB_COMPARISON.md): Feature-by-feature parity analysis across all application modules.
- 🧾 [**Invoice & Receipt Comparison Report**](file:///d:/CounterproBill/Counter365-Web/INVOICE_COMPARISON_REPORT.md): Field-by-field layout analysis, thermal receipt formatting, and print behavior.
- 📱 [**WhatsApp Web-Style QR Pairing Protocol**](file:///d:/CounterproBill/Counter365-Web/QR_INTEGRATION.md): Realtime pairing protocol, session security, and Android mobile scanner guide.
- 🧪 [**Comprehensive QA & Testing Report**](file:///d:/CounterproBill/Counter365-Web/TESTING_REPORT.md): Visual fidelity tests, authentication verification, and POS billing math checks.
- 🔌 [**External Dependencies & Hardware Considerations**](file:///d:/CounterproBill/Counter365-Web/REMAINING_DEPENDENCIES.md): 3rd-party services, environment variables, and thermal printer hardware guide.

---

## 2. Architecture & Tech Stack

- **Framework**: React 18, TypeScript, Vite 5
- **Styling**: Tailwind CSS with custom Counter 365 Brand Family Tokens
- **Typography**: `Bricolage Grotesque` & `DM Sans` (Landing Page), `Jost` & `Lexend` (Dashboard, POS), `Noto Sans Tamil` (Multilingual fallback)
- **Database & Sync**: Realtime PostgreSQL on Supabase (`tziqjkklqtmjlncoraba.supabase.co`) — **Zero alterations to the existing Android database**
- **Authentication**:
  1. **Option A (QR Code Web Pairing)**: End-to-end encrypted session pairing over Supabase Realtime broadcast channel (`qr-pairing:{sessionId}`).
  2. **Option B (SMS OTP)**: Official 2Factor.in SMS Gateway (`AUTOGEN` / `Login_Verification_OTP`) with Demo Login fallback (`9999999999` / `123456`).
- **Icons**: Lucide React
- **Printing**: Native browser print frame generating the exact thermal bill HTML template matching Android's receipt engine (80mm & 58mm).

---

## 3. Application Routing & User Journeys

| Route | View Component | Description & Access Control |
| :--- | :--- | :--- |
| `/` | `LandingPage.tsx` | **Public Landing Page**. Exact reproduction of `counter365-light.html`, featuring interactive receipt machine, teapot demo, 3D tilt bento cards, marquee, FAQ, and CTA buttons linking to `/login`. |
| `/login` | `LoginScreen.tsx` | **Two Authentication Options**: Option A (QR Code pairing) and Option B (Mobile OTP). Verified existing accounts redirect to `/dashboard`. Unregistered numbers display a warning and a "Register Your Shop" button linking to `/register`. |
| `/register` | `RegisterScreen.tsx` | **Replication of Android Onboarding**: Phone verification, Shop Type selection (5 categories), Shop Details (Location, Indian states/cities, 6-digit Pincode, GPS Tagging, GSTIN, Table Management). Seeds starter catalog and creates lifetime free subscription. |
| `/dashboard/*` | `DashboardApp.tsx` | **Protected POS Application Dashboard**: Route guard redirects unauthenticated users to `/login` and users without shops to `/register`. |
| `/dashboard/pos` | `PosScreen.tsx` | Fast-tap category-filtered billing, portions (half/full), custom price overrides, percentage/flat discounts, partial pay, and Khata dues. |
| `/dashboard/bills` | `BillsScreen.tsx` | Reverse-chronological bill feed, search, status filtering, thermal reprinting, and soft cancellation. |
| `/dashboard/pending` | `PendingScreen.tsx` | Customer Khata dues, grouped outstanding balances, and one-click payment settlement. |
| `/dashboard/menu` | `MenuScreen.tsx` | Category & item catalog manager, half-portion pricing, and availability toggles. |
| `/dashboard/expenses`| `ExpensesScreen.tsx` | Shop expense logging, category categorization, and daily cash outflow. |
| `/dashboard/contacts`| `ContactsScreen.tsx` | Customer ledger directory, purchase history, and contact lookup. |
| `/dashboard/reports` | `ReportsScreen.tsx` | Monthly and daily business intelligence, net profit cards, top dishes, and CSV export. |
| `/dashboard/account` | `AccountScreen.tsx` | Shop profile, invoice prefix settings, GSTIN configuration, and staff management. |

---

## 4. Directory Structure

```text
D:\CounterproBill\Counter365-Web\
├── src\
│   ├── components\
│   │   ├── common\           # ToastBanner, modals, alerts
│   │   ├── header\           # AppHeader with store details, Pro tier status, Day Closing, Lang
│   │   └── navigation\       # Sidebar with module access guard by user role
│   ├── context\
│   │   ├── AuthContext.tsx    # Session, User profile, role-based permissions (can)
│   │   ├── ShopContext.tsx    # Active Shop, Supabase persistence, Pro tier calculation
│   │   ├── CartContext.tsx    # Order Cart, discounts, portions, line totals
│   │   └── LanguageContext.tsx# English & Tamil bilingual switcher
│   ├── lib\
│   │   ├── money.ts          # Exact financial calculations matching Android money.ts
│   │   ├── storage.ts        # LocalStorage wrapper matching Android AsyncStorage API
│   │   ├── supabase.ts       # Supabase client connected to existing production schema
│   │   └── uuid.ts           # RFC4122 v4 crypto UUID generator
│   ├── screens\
│   │   ├── landing\
│   │   │   └── LandingPage.tsx   # Exact AI-designed public landing page
│   │   ├── dashboard\
│   │   │   └── DashboardApp.tsx  # Protected POS Dashboard container
│   │   ├── LoginScreen.tsx       # QR pairing + Mobile OTP authentication
│   │   ├── RegisterScreen.tsx    # Multi-step Android onboarding replication
│   │   ├── home\                 # Live Dashboard, sales cards, net profit, recent bills
│   │   ├── sales\                # POS Menu, dishes, portions (half/full), instant checkout
│   │   ├── bills\                # Bill history, search, status filter, reprint, cancellation
│   │   ├── pending\              # Khata dues, customer ledger, collect due payment
│   │   ├── menu\                 # Category & dish catalog, pricing, portion settings
│   │   ├── expenses\             # Expense tracking, categories, cashier logging
│   │   ├── contacts\             # Customer directory, phone lookup, khata history
│   │   ├── reports\              # Monthly analytics, day-by-day register, top items
│   │   └── account\              # Shop settings, UPI ID for QR bills, GSTIN, staff roles
│   ├── services\
│   │   ├── authService.ts        # OTP auth and profile lookup
│   │   ├── billingService.ts     # Checkout, invoice numbering, Khata settlement
│   │   ├── contactService.ts     # Customer ledger aggregation
│   │   ├── expenseService.ts     # Outflow records
│   │   ├── exportService.ts      # Thermal receipt (80mm/58mm) and CSV generator
│   │   ├── menuService.ts        # Menu items and starter catalog bootstrap
│   │   ├── qrPairingService.ts   # Realtime QR session broadcaster
│   │   ├── reportService.ts      # Daily and monthly aggregations
│   │   ├── shopService.ts        # Multi-shop CRUD & member permissions
│   │   ├── subscriptionService.ts# Pro tier checks and payment gateways
│   │   └── twoFactorService.ts   # 2Factor.in SMS integration
│   ├── types\
│   │   ├── database.types.ts     # Supabase public schema types
│   │   ├── models.ts             # Core domain models (Shop, Bill, MenuItem, etc.)
│   │   └── navigation.ts         # Application routes
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── dist\                         # Optimized production bundle
├── .env                          # Production credentials
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 5. Getting Started

### Prerequisites
- Node.js (v18+)
- npm or pnpm

### Installation
```bash
cd D:\CounterproBill\Counter365-Web
npm install
```

### Environment Configuration
The `.env` file is pre-configured with the production Supabase and 2Factor credentials:
```env
VITE_SUPABASE_URL=https://tziqjkklqtmjlncoraba.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_CkIw1TkmOb9qbIVd8Lb0RA_8FCAHfli
VITE_TWOFACTOR_API_KEY=e11be203-4f77-11f1-9800-0200cd936042
VITE_TWOFACTOR_TEMPLATE_NAME=Login_Verification_OTP
VITE_PAYU_ENV=live
VITE_PAYU_MERCHANT_ID=13821850
VITE_PAYU_KEY=pb2hmj
```

### Development Server
```bash
npm run dev
```
Launches on `http://localhost:3000`.

### Production Build
```bash
npm run build
```
Creates minified, tree-shaken assets in `dist/`.
