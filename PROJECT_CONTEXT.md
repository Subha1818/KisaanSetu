# KisaanSetu (किसानसेतु) — Comprehensive Project & Technical Architecture Context

> **Audience:** Any AI Assistant (e.g. Claude, GPT, Antigravity, Gemini) or Developer continuing development on this codebase.  
> **Purpose:** Serves as a single source of truth for the project's functional architecture, database schemas, code-level execution flows, security models, and prompt engineering instructions for subsequent tasks.

---

## 1. Project Overview & Vision

**KisaanSetu** is a decentralized, digital agricultural procurement and queue-management platform built for rural India. It bridges **Smallholder Farmers**, **Government Grain Depots / Procurement Centres (PACS/APMC)**, and **State Food & Supplies Administrators**.

### Core Problem Solved
1. **Long Queues & Spoilage:** Farmers previously waited for days outside mandis with harvest trucks without knowing depot load.
2. **Quota Violations & Middlemen:** Lack of digital validation allowed aggregators to exploit Minimum Support Prices (MSP).
3. **Low Digital Literacy:** Rural farmers struggled with complex English-only apps or SMS-based portals.

### Three Integrated Portals
1. **Farmer Portal (`/farmer`):** GPS depot discovery, quota-enforced booking wizard, live estimated arrival slot calculation, scannable QR gate passes, live queue monitoring, and token rescheduling.
2. **Procurement Centre Portal (`/centre`):** Real-time gate check-in via device camera QR scanner, calling system, moisture & quality grading, weight-based MSP procurement receipt issuance, and auto-no-show expiry.
3. **State Admin Governance Portal (`/admin`):** Depot approval/rejection pipeline, interactive geospatial Leaflet map, MSP rate configurations, SMS audit logs, and procurement ledger analytics.

---

## 2. Technology Stack & Directory Structure

### Frontend Stack
* **Framework:** React 19 (`react`, `react-dom`) with TypeScript (`tsc -b`).
* **Build Tool:** Vite 8.x with Tailwind CSS v4 (`@tailwindcss/vite`).
* **Icons:** `lucide-react`.
* **Maps & Geo:** `leaflet` & `@types/leaflet`.
* **Charts & Analytics:** `recharts`.
* **Camera QR Scanner & QR Gen:** `@yudiel/react-qr-scanner`, `qrcode.react`, `qrcode`.
* **PDF Engine:** `jspdf` & `html2canvas` (client-side gate pass & procurement slips).
* **Internationalization (i18n):** `i18next`, `react-i18next`, `i18next-browser-languagedetector`.
  * **7 Supported Regional Languages:** English (`en`), Hindi (`hi`), Bengali (`bn`), Marathi (`mr`), Telugu (`te`), Tamil (`ta`), Punjabi (`pa`).

### Backend Stack (Supabase & PostgreSQL)
* **BaaS:** Supabase (Project hosted at `https://ljfqbrdaznbmzgymfywp.supabase.co`).
* **Database:** PostgreSQL 15+ with Row Level Security (RLS) enabled on every public table.
* **Serverless Edge Functions:** Deno runtime in `supabase/functions/` (`send-otp`, `verify-otp`).
* **Realtime:** Supabase Realtime Channels (PostgreSQL publication on `bookings`, `booking_dates`).
* **Transactions:** Database-level stored procedures (PL/pgSQL RPCs) with `SECURITY DEFINER` and `FOR UPDATE` row locking.

### Directory Organization
```
├── public/                 # Static assets and icons
├── src/
│   ├── App.tsx             # Main routing table with ProtectedRoute wrappers
│   ├── main.tsx            # App bootstrap mounting i18n
│   ├── i18n.ts             # i18next configuration & language detector
│   ├── index.css           # Tailwind v4 theme & global resets
│   ├── components/
│   │   ├── Layout.tsx      # Global sticky navbar with language selector & auth modals
│   │   ├── ProtectedRoute.tsx # Multi-role session guard and route protection
│   │   ├── FirstVisitLanguageModal.tsx # Fullscreen native-script language picker
│   │   ├── DashboardBackground.tsx     # Organic aesthetic backdrop components
│   │   ├── admin/          # AdminCentresMap, Ledger components, charts
│   │   ├── centre/         # CentreDetailsModal, Queue components
│   │   └── farmer/         # RescheduleModal, ArrivalWindow cards
│   ├── hooks/
│   │   ├── useCascadingGeo.ts # State -> District -> Block cascading picker hook
│   │   ├── useLiveQueue.ts    # Realtime WebSocket subscription for bookings
│   │   └── useQueue.ts        # Polling fallback queue hook
│   ├── lib/
│   │   └── supabaseClient.ts  # Singleton Supabase client configuration
│   ├── locales/               # 7 translation dictionaries: en, hi, bn, mr, te, ta, pa
│   ├── pages/
│   │   ├── Landing.tsx        # Public marketing hero with MSP tickers and CTAs
│   │   ├── Login.tsx          # Mobile number + password authentication with visual register card
│   │   ├── Register.tsx       # OTP verification + farmer/centre registration form
│   │   ├── PrivacyPolicy.tsx & TermsOfService.tsx
│   │   ├── farmer/
│   │   │   ├── FarmerDashboard.tsx  # Active ticket, live queue, MSP rates, cancellation
│   │   │   └── BookAppointment.tsx # 4-step wizard (Geo/GPS -> Depot -> Crop/Slot -> Confirm)
│   │   ├── centre/
│   │   │   ├── CentreDashboard.tsx  # Live counter, QR scanner, procurement weighing modal
│   │   │   ├── PendingApproval.tsx & RejectedCentre.tsx # Depot onboarding gates
│   │   └── admin/
│   │       ├── AdminDashboard.tsx   # Core dashboard, metrics, depot approvals
│   │       ├── AdminCentreDetails.tsx
│   │       ├── ActivityLog.tsx
│   │       ├── MspRatesManager.tsx  # Live MSP crop rate updates
│   │       ├── ProcurementLedger.tsx
│   │       ├── SmsDeliveryMonitor.tsx
│   │       └── UserDirectory.tsx
│   └── utils/
│       ├── arrivalEstimator.ts # Algorithm calculating estimated slot windows
│       └── pdfGenerator.ts     # jsPDF Gate Pass and receipt slip builder
└── supabase/
    ├── schema.sql              # Master table DDL
    ├── rls_policies.sql        # Master RLS policies & SECURITY DEFINER helpers
    ├── booking_transaction.sql # create_farmer_booking stored procedure
    ├── migration_*.sql         # Incremental database migrations (002 through 020)
    └── functions/              # Edge functions (send-otp, verify-otp)
```

---

## 3. Database Schema & Supabase Architecture

### Core Relational Tables
1. `public.users`:
   * Primary key: `id` (`UUID`, references `auth.users.id`).
   * Columns: `name`, `mobile_number`, `role` (`'farmer' | 'staff' | 'admin'`), `preferred_language`.
2. `public.farmers`:
   * Links to `users.id`. Contains land holding details, Aadhaar hash, bank account details.
3. `public.procurement_centres`:
   * Columns: `id`, `name`, `owner_name`, `block_code`, `daily_capacity`, `status` (`'open' | 'closed'`), `approval_status` (`'pending' | 'approved' | 'rejected'`), `latitude`, `longitude`, `opening_time` (`TIME`, default `'08:00:00'`), `avg_minutes_per_farmer` (default `10`), `cancellation_window_hours` (default `24`).
4. `public.centre_products`:
   * Permitted crops per depot. Columns: `centre_id`, `product_name`, `max_quantity_per_farmer` (kg limit).
5. `public.booking_dates`:
   * Available dropoff days. Columns: `id`, `centre_id`, `date` (`DATE`), `capacity`, `booked_count`, `status` (`'open' | 'full' | 'closed'`).
6. `public.bookings`:
   * Active and historical appointments. Columns: `id`, `farmer_id`, `centre_id`, `booking_date_id`, `product_name`, `quantity`, `token` (e.g. `'L-001'`), `status` (`'booked' | 'called' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'`), `booking_source`.
7. `public.booking_history`:
   * Audit log tracking timestamp and status transitions per booking.
8. `public.procurements` & `public.payments`:
   * Records finalized gross/tare weights, moisture deduction, MSP rate applied, total payout amount, and payment status (`'credited'`).
9. `public.msp_rates`:
   * Government floor prices per quintal: `crop_name`, `rate_per_kg`, `effective_date`.
10. `public.geo_blocks`:
    * Indian administrative hierarchy: `state_code`, `state_name`, `district_code`, `district_name`, `block_code`, `block_name`.

### Authentication Architecture
* **Email Proxy for Phone Numbers:** Because SMS gateways can be cost-prohibitive in development/test, phone auth is proxied via Supabase Auth using the internal domain format:
  $$\text{Email: } \texttt{+919876543210} \rightarrow \texttt{919876543210@farmerapp.internal}$$
* **Trigger:** An `on_auth_user_created` PostgreSQL trigger parses `raw_user_meta_data->>'mobile_number'` and inserts into `public.users` with the appropriate role (`farmer` or `staff`).

### Row Level Security (RLS) Model
All tables have RLS enabled. Helper functions avoid infinite recursion:
* `get_auth_role()`: `SELECT role FROM public.users WHERE id = auth.uid()` (`SECURITY DEFINER`).
* `get_auth_staff_centre()`: `SELECT centre_id FROM public.staff WHERE user_id = auth.uid()` (`SECURITY DEFINER`).
* **Farmers:** Can read active centres, products, and booking dates; can select/update only their own bookings.
* **Depot Staff:** Can read and update bookings only for their assigned `centre_id`.
* **Admins:** Global SELECT and UPDATE access across all depots, ledgers, and logs.

---

## 4. Key Workflows & Code Execution Mechanics

### A. Atomic Booking Transaction (`create_farmer_booking` RPC)
Located in `supabase/booking_transaction.sql` and called from `src/pages/farmer/BookAppointment.tsx`:
1. Enforces **Row-Level Lock** (`SELECT ... FROM booking_dates WHERE id = p_booking_date_id FOR UPDATE`).
2. Checks that `booked_count < capacity`.
3. Validates crop limit (`quantity <= max_quantity_per_farmer`).
4. Generates an alphanumeric token sequence: `[Centre Initial]-[3-digit Sequence]` (e.g. `R-004`).
5. Inserts into `public.bookings` with status `'booked'`.
6. Increments `booking_dates.booked_count` by 1; if `booked_count >= capacity`, sets status to `'full'`.
7. Logs initial entry into `public.booking_history`.
8. Returns the generated token atomically, eliminating any race condition.

### B. Dynamic Estimated Slot Window Calculation (`arrivalEstimator.ts`)
Calculates the expected arrival time before and after booking:
* **Function Signature:** `calculateArrivalWindow(openingTime, avgMinutes, peopleAhead, bookingDate)`
* **Inputs:**
  * `openingTime`: Centre operational start (e.g., `'08:00:00'`).
  * `avgMinutes`: Calculated via RPC `get_centre_avg_processing_time(centre_id)` with fallback to centre manual setting (default: 10 minutes).
  * `peopleAhead`:
    * *Pre-booking (Date Card in Step 3):* Equal to `dateSlot.booked_count` (since a new booking joins the end of that date's queue).
    * *Post-booking (Ticket / Dashboard):* Number of active bookings on that date with token sequence lower than the user's token.
* **Math:**
  $$\text{estimatedMinutes} = \text{peopleAhead} \times \text{avgMinutes}$$
  $$\text{buffer} = \max(5, \text{round}(\text{estimatedMinutes} \times 0.2))$$
  $$\text{earliestMinutes} = \max(0, \text{estimatedMinutes} - \text{buffer})$$
  $$\text{latestMinutes} = \text{estimatedMinutes} + \text{buffer}$$
* **Result:** Formats to strings like `8:00 AM – 8:05 AM` (0 booked) or `8:40 AM – 9:00 AM` (5 booked).
* **Live Updates:** `BookAppointment.tsx` subscribes to Supabase Realtime changes on `booking_dates` for that centre. When any other farmer books or cancels, the date card re-renders dynamically.

### C. Live Queue Sync & Gate Check-in (`CentreDashboard.tsx`)
1. **Real-time Queue Listener:** Uses `useLiveQueue(centreId, bookingDateId)` listening to Postgres table `bookings` where `centre_id = centreId`.
2. **Contactless QR Code Scanner:** The depot operator opens the camera scanner powered by `@yudiel/react-qr-scanner`.
3. **State Machine:**
   $$\text{booked} \xrightarrow{\text{Call / Gate In}} \text{called} \xrightarrow{\text{Weighbridge In}} \text{in\_progress} \xrightarrow{\text{Receipt Generated}} \text{completed}$$
4. **Auto-No-Show Expiry:** Detects stale dates/tokens that failed to arrive and flips them to `'no_show'`, reclaiming daily quota metrics.

### D. Multi-Language System (`FirstVisitLanguageModal.tsx` & `i18n.ts`)
* A full-screen language selection modal triggers on first visit if `localStorage.getItem('kisaansetu_lang_selected')` is null.
* Displays 7 large tappable cards, each displaying the language written in its own native script (English, हिन्दी, বাংলা, मराठी, తెలుగు, தமிழ், ਪੰਜਾਬੀ).
* Switching languages updates `i18nextLng`, syncs with Supabase `users.preferred_language` if logged in, and instantly swaps UI labels without page reload.

---

## 5. Instructions for Future AI Prompts & Assistants

When asking an AI (such as Antigravity) to write code or modify features in this repository, follow these rules:

1. **Do Not Break Existing RPCs:** Never bypass `create_farmer_booking` or `cancel_farmer_booking` from client code. All slot increment/decrement and token generation must stay inside database transactions.
2. **Preserve All 7 Locales:** Any newly introduced user-facing string must be declared with `t('namespace.key')` and added to all 7 files in `src/locales/{en,hi,bn,mr,te,ta,pa}/translation.json`.
3. **Respect Mobile-First Touch Targets:** Farmers operate on budget Android phones with touch screens. All interactive elements must maintain a minimum height of `44px`–`48px` (`min-h-[48px]`), clear padding, and high-contrast styling.
4. **Maintain Row Level Security (RLS):** When adding new tables or queries, always ensure foreign keys link to `centre_id` or `farmer_id`, and write corresponding RLS policies in `supabase/`.
5. **Realtime Channels Cleanup:** Whenever establishing a `supabase.channel()`, always store the reference and unsubscribe in the `useEffect` cleanup return function (`supabase.removeChannel(channel)`).
6. **Strict Build Verification:** Always verify changes by running:
   ```bash
   npm run build # runs tsc -b && vite build
   npm run lint  # runs oxlint
   ```
