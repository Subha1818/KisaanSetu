import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Lock, 
  EyeOff, 
  Smartphone, 
  CheckCircle2, 
  ChevronRight, 
  ArrowLeft, 
  Sprout, 
  FileCheck, 
  Printer
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DashboardBackground } from '../components/DashboardBackground';

export const PrivacyPolicy: React.FC = () => {
  const { t } = useTranslation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col relative overflow-hidden">
      {/* Background Watermark */}
      <DashboardBackground variant="farmer" />

      {/* Main Content Container */}
      <div className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10 w-full">
        {/* Navigation Breadcrumb & Back */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <nav className="flex items-center gap-2 text-sm text-slate-500">
            <Link to="/" className="hover:text-emerald-700 transition-colors flex items-center gap-1 font-medium">
              <Sprout className="w-4 h-4 text-emerald-600" />
              {t('layout.footer_home') || 'Home'}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Legal</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-emerald-800 font-bold">Privacy Policy</span>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer"
              title="Print or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              Print / Save
            </button>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 transition shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Home
            </Link>
          </div>
        </div>

        {/* Hero Header Card */}
        <div className="bg-gradient-to-br from-teal-900 via-emerald-900 to-slate-950 text-white rounded-3xl p-8 sm:p-10 shadow-xl shadow-teal-950/15 border border-emerald-700/50 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 right-10 opacity-10 pointer-events-none hidden md:block">
            <Lock className="w-48 h-48 text-white" />
          </div>

          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-teal-200 border border-white/15 mb-4">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-300" />
              Farmer Data Protection Charter
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Privacy Policy</h1>
            <p className="mt-3 text-emerald-100 text-base leading-relaxed">
              At KisaanSetu, the confidentiality of your personal records, landholding credentials, phone number, and DBT bank account details is our foremost priority. We comply with the Digital Personal Data Protection (DPDP) Act, 2023.
            </p>

            <div className="flex flex-wrap items-center gap-4 mt-6 pt-6 border-t border-emerald-700/60 text-xs text-teal-200/90 font-medium">
              <span className="flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-teal-300" />
                Governing Law: DPDP Act 2023 (India)
              </span>
              <span>•</span>
              <span>Last Revised: September 1, 2026</span>
              <span>•</span>
              <span className="text-emerald-300 font-semibold">Strict Zero-Monetization Policy</span>
            </div>
          </div>
        </div>

        {/* Key Trust Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-xs flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Compliance</p>
              <h4 className="text-sm font-bold text-slate-900">DPDP Act 2023</h4>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-xs flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Security</p>
              <h4 className="text-sm font-bold text-slate-900">Row-Level Security (RLS)</h4>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-xs flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
              <EyeOff className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Commercial Ads</p>
              <h4 className="text-sm font-bold text-slate-900">Never Sold or Rented</h4>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-xs flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-100">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">SMS Notifications</p>
              <h4 className="text-sm font-bold text-slate-900">Direct Alerts Only</h4>
            </div>
          </div>
        </div>

        {/* Privacy Sections */}
        <div className="space-y-8 text-slate-700 leading-relaxed">
          {/* Section 1 */}
          <section className="bg-white rounded-2xl border border-slate-300 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-teal-100 text-teal-800 font-black text-sm">
                1
              </span>
              <h2 className="text-xl font-bold text-slate-900">Information We Collect</h2>
            </div>
            <p className="text-sm sm:text-base mb-3">
              KisaanSetu collects only the minimum necessary data points required to securely verify identity, schedule grain procurement appointments, and facilitate direct government MSP disbursements:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base">
              <li>
                <strong>Farmer Identification:</strong> Full Name, Mobile Number (E.164 format e.g. +91XXXXXXXXXX), Aadhaar hash or State Farmer ID (for DBT beneficiary linkage).
              </li>
              <li>
                <strong>Agricultural Booking Records:</strong> Crop variety (e.g. Wheat FAQ, Paddy Common), estimated harvest volume (quintals/kg), preferred procurement date, and designated procurement centre ID.
              </li>
              <li>
                <strong>Geolocation Data:</strong> Device latitude and longitude retrieved only with your explicit browser permission during the "Find Nearest Depots" discovery flow.
              </li>
              <li>
                <strong>Transaction & Payment Audit Trail:</strong> Scale weighment readings, moisture test percentages, issued queue tokens, digital signatures, and banking transaction reference IDs.
              </li>
            </ul>

            <div className="mt-4 p-3.5 bg-teal-50/70 rounded-xl border border-teal-200 text-xs sm:text-sm text-teal-900 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
              <div>
                <strong>Farmer Summary:</strong> We only ask for information necessary to identify you, give you your queue pass, and ensure your grain sale payment reaches your bank account.
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="bg-white rounded-2xl border border-slate-300 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-teal-100 text-teal-800 font-black text-sm">
                2
              </span>
              <h2 className="text-xl font-bold text-slate-900">How We Use Your Data</h2>
            </div>
            <p className="text-sm sm:text-base mb-3">
              Your collected information is processed solely for public interest and statutory procurement operations:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base">
              <li>Generating unique digital appointment passes and live Mandi queue tokens.</li>
              <li>Dispatching critical SMS alerts regarding slot confirmation, queue callouts, and payment transfers.</li>
              <li>Preventing duplicate token bookings and maintaining depot capacity limits.</li>
              <li>Generating verifiable government procurement receipts in tamper-evident PDF format.</li>
              <li>Complying with statutory audits conducted by State Food & Civil Supplies Departments and the Comptroller and Auditor General (CAG).</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="bg-white rounded-2xl border border-slate-300 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-teal-100 text-teal-800 font-black text-sm">
                3
              </span>
              <h2 className="text-xl font-bold text-slate-900">Geolocation & Mapping Policy</h2>
            </div>
            <p className="text-sm sm:text-base mb-3">
              KisaanSetu integrates open-source Leaflet and OpenStreetMap technologies for geographic visualization:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base">
              <li>
                <strong>Ephemeral Location Matching:</strong> When you tap "Use My Location", your coordinates are used in-memory solely to compute straight-line distances to nearby depots.
              </li>
              <li>
                <strong>No Continuous Tracking:</strong> The platform does not track your location in the background or monitor your physical movements outside the booking search session.
              </li>
              <li>
                <strong>OpenStreetMap Tiles:</strong> Mapping tiles are rendered from public OpenStreetMap servers with standard privacy-conscious HTTP referrers. No proprietary user profiling or third-party ad beacons are embedded.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="bg-white rounded-2xl border border-slate-300 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-teal-100 text-teal-800 font-black text-sm">
                4
              </span>
              <h2 className="text-xl font-bold text-slate-900">SMS Communications & OTP Gateways</h2>
            </div>
            <p className="text-sm sm:text-base mb-3">
              To guarantee that farmers without high-speed smartphones remain informed, KisaanSetu integrates direct SMS delivery through authorized government/commercial gateways:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base">
              <li>
                <strong>Transactional Messages Only:</strong> We send exclusively transactional messages: 6-digit registration OTPs, booking confirmations, callout notifications, and payment receipts.
              </li>
              <li>
                <strong>Zero Promotional Spam:</strong> We will never send commercial advertisements, fertilizer promotions, or loan solicitations.
              </li>
              <li>
                <strong>Delivery Gateway Security:</strong> SMS routing is executed via encrypted Supabase Edge Functions with secret keys stored securely in isolated environment vaults.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="bg-white rounded-2xl border border-slate-300 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-teal-100 text-teal-800 font-black text-sm">
                5
              </span>
              <h2 className="text-xl font-bold text-slate-900">Data Storage, Encryption & Row-Level Security</h2>
            </div>
            <p className="text-sm sm:text-base mb-3">
              KisaanSetu adopts defense-in-depth database architectures:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base">
              <li>
                <strong>Database Row-Level Security (RLS):</strong> Every table in the PostgreSQL database is guarded by strict RLS policies. A farmer cannot view another farmer’s booking records or personal mobile number.
              </li>
              <li>
                <strong>Transit & Rest Encryption:</strong> All data transmitted between your browser and our servers is encrypted using Transport Layer Security (TLS 1.3) with 256-bit encryption.
              </li>
              <li>
                <strong>Role-Based Administrative Access:</strong> Only vetted depot staff and authorized nodal administrators can view operational records, and all administrative actions are permanently inscribed in immutable activity audit logs.
              </li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="bg-white rounded-2xl border border-slate-300 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-teal-100 text-teal-800 font-black text-sm">
                6
              </span>
              <h2 className="text-xl font-bold text-slate-900">Sharing with Official Authorities</h2>
            </div>
            <p className="text-sm sm:text-base mb-3">
              We never sell, monetize, or commercialize your personal data. We disclose information strictly to:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base">
              <li>Accredited Procurement Centres managing your specific grain drop-off.</li>
              <li>State Department of Food, Civil Supplies & Consumer Affairs for quota settlement.</li>
              <li>National Payment Corporation of India (NPCI) / PFMS payment gateways for DBT account crediting.</li>
              <li>Statutory law enforcement or judicial bodies only when compelled by valid legal warrant.</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="bg-white rounded-2xl border border-slate-300 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-teal-100 text-teal-800 font-black text-sm">
                7
              </span>
              <h2 className="text-xl font-bold text-slate-900">Your Rights Under DPDP Act 2023</h2>
            </div>
            <p className="text-sm sm:text-base mb-3">
              As a registered farmer and citizen of India, you enjoy the following rights:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base">
              <li><strong>Right to Information:</strong> Access a full summary of your personal data and procurement transactions at any time via your Farmer Portal dashboard.</li>
              <li><strong>Right to Correction:</strong> Request immediate correction of outdated mobile numbers, misspelt names, or incorrect bank account details.</li>
              <li><strong>Right to Grievance Redressal:</strong> File a formal inquiry if you suspect unauthorized access or misuse of your records.</li>
            </ul>
          </section>

          {/* Section 8 */}
          <section className="bg-white rounded-2xl border border-slate-300 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-teal-100 text-teal-800 font-black text-sm">
                8
              </span>
              <h2 className="text-xl font-bold text-slate-900">Data Protection Officer (DPO) Contact</h2>
            </div>
            <p className="text-sm sm:text-base mb-4">
              For inquiries regarding personal data processing, correction requests, or data privacy grievances, please reach out to our designated Data Protection Officer:
            </p>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div>
                <strong className="text-slate-900 block font-semibold mb-1">Data Protection Officer:</strong>
                <span className="text-slate-600">Nodal Privacy & Information Security Officer</span>
              </div>
              <div>
                <strong className="text-slate-900 block font-semibold mb-1">Official Privacy Email:</strong>
                <span className="text-slate-600">privacy@kisaansetu.gov.in</span>
              </div>
              <div className="sm:col-span-2">
                <strong className="text-slate-900 block font-semibold mb-1">Administrative Address:</strong>
                <span className="text-slate-600">
                  Directorate of Digital Agriculture & Information Technology, Department of Agriculture & Farmers Welfare, Krishi Bhawan, New Delhi - 110001.
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Navigation Back to Legal / Home */}
        <div className="mt-10 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} KisaanSetu. All rights reserved under Government of India open digital initiatives.</p>
          <div className="flex items-center gap-4 font-semibold text-teal-700">
            <Link to="/terms" className="hover:underline">Terms of Service</Link>
            <span>•</span>
            <Link to="/" className="hover:underline">Portal Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
