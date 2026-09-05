import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Clock,
  Scale,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Sprout,
  PhoneCall,
  Lock,
  Printer
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DashboardBackground } from '../components/DashboardBackground';

export const TermsOfService: React.FC = () => {
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
            <span className="text-emerald-800 font-bold">Terms of Service</span>
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
        <div className="bg-gradient-to-br from-emerald-850 via-emerald-900 to-teal-950 text-white rounded-3xl p-8 sm:p-10 shadow-xl shadow-emerald-950/15 border border-emerald-700/50 mb-8 relative overflow-hidden">
          {/* Subtle Decorative Elements */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 right-10 opacity-10 pointer-events-none hidden md:block">
            <Scale className="w-48 h-48 text-white" />
          </div>

          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-emerald-200 border border-white/15 mb-4">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              Official Portal Operating Agreement
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Terms of Service</h1>
            <p className="mt-3 text-emerald-100 text-base leading-relaxed">
              These Terms of Service govern the registration, slot scheduling, grain drop-off procedures, quality inspection, and MSP payout settlement across the KisaanSetu digital procurement network.
            </p>

            <div className="flex flex-wrap items-center gap-4 mt-6 pt-6 border-t border-emerald-700/60 text-xs text-emerald-200/90 font-medium">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-300" />
                Effective Date: September 1, 2026
              </span>
              <span>•</span>
              <span>Version: 2.4 (National Procurement Standards)</span>
              <span>•</span>
              <span className="text-emerald-300 font-semibold">Jurisdiction: Republic of India</span>
            </div>
          </div>
        </div>

        {/* Key Guarantees Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-xs flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Pricing Integrity</p>
              <h4 className="text-sm font-bold text-slate-900">100% MSP Guarantee</h4>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-xs flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Fair Intake</p>
              <h4 className="text-sm font-bold text-slate-900">Queue Token Protocol</h4>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-xs flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Settlement</p>
              <h4 className="text-sm font-bold text-slate-900">Direct Bank DBT Payout</h4>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-xs flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-100">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Transparency</p>
              <h4 className="text-sm font-bold text-slate-900">Audit-Verified Log</h4>
            </div>
          </div>
        </div>

        {/* Legal Clauses */}
        <div className="space-y-8 text-slate-700 leading-relaxed">
          {/* Section 1 */}
          <section className="bg-white rounded-2xl border border-slate-300 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black text-sm">
                1
              </span>
              <h2 className="text-xl font-bold text-slate-900">Acceptance of Platform Terms</h2>
            </div>
            <p className="text-sm sm:text-base mb-3">
              By accessing, browsing, registering on, or utilizing the services provided by <strong>KisaanSetu</strong> (including Web Portals, Progressive Web Apps, SMS delivery notifications, and QR token scanners), you agree to be bound by these Terms of Service. If you are registering on behalf of a cooperative, agricultural society, or procurement centre, you represent that you possess the requisite authority to bind said entity.
            </p>
            <p className="text-sm sm:text-base">
              These terms are established in strict accordance with the guidelines set forth under the <em>Food Corporation of India (FCI) Operational Manual</em>, the <em>National Agricultural Market (e-NAM) Architecture</em>, and the <em>Digital Agriculture Mission</em>.
            </p>

            <div className="mt-4 p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs sm:text-sm text-emerald-900 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <strong>Farmer Summary:</strong> Using KisaanSetu to book appointments and deliver grain means you agree to follow the depot rules, arrive during your appointed slot, and abide by official procurement guidelines.
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="bg-white rounded-2xl border border-slate-300 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black text-sm">
                2
              </span>
              <h2 className="text-xl font-bold text-slate-900">User Eligibility & Account Registration</h2>
            </div>
            <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base">
              <li>
                <strong>Farmer Registration:</strong> Must be an individual cultivator, tenant farmer, or legal landholder in India with an active mobile phone number and legitimate identification (Aadhaar or State Farmer ID).
              </li>
              <li>
                <strong>Centre Staff & Operators:</strong> Operators must be officially assigned by government procurement agencies or mandated cooperative societies. Any unauthorized operation of depot accounts will lead to immediate revocation and administrative audit.
              </li>
              <li>
                <strong>Account Integrity:</strong> Users are responsible for safeguarding their login credentials and OTP codes. KisaanSetu officers will never ask for your password or SMS OTP over phone calls.
              </li>
            </ul>

            <div className="mt-4 p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs sm:text-sm text-emerald-900 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <strong>Farmer Summary:</strong> Register with your genuine phone number and identification. Keep your SMS OTP private so your bookings and payment receipts remain safe.
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="bg-white rounded-2xl border border-slate-300 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black text-sm">
                3
              </span>
              <h2 className="text-xl font-bold text-slate-900">Appointment Booking & Queue Token Rules</h2>
            </div>
            <p className="text-sm sm:text-base mb-3">
              KisaanSetu operates on a strict non-discriminatory slot booking system to eliminate physical Mandi congestions:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base">
              <li>
                <strong>Token Generation:</strong> Each scheduled drop-off generates an authenticated QR token pass. Farmers must present this digital pass or physical printout upon depot arrival.
              </li>
              <li>
                <strong>Punctuality & Grace Periods:</strong> Farmers are requested to arrive within 60 minutes of their designated slot. If delayed due to transit issues, the depot manager may re-queue the token for the next available open interval.
              </li>
              <li>
                <strong>Drop-off Capacity Limits:</strong> Booking quantities cannot exceed the maximum daily processing capacity of the selected depot (typically 5,000 kg per booking slot).
              </li>
              <li>
                <strong>Cancellations & Rescheduling:</strong> Appointments may be rescheduled or cancelled via the Farmer Portal up to 12 hours prior to the scheduled intake time without penalty.
              </li>
            </ul>

            <div className="mt-4 p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs sm:text-sm text-emerald-900 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <strong>Farmer Summary:</strong> Download or bring your token slip to the depot. If you cannot make your scheduled day, reschedule early from your dashboard so another farmer can take that slot.
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="bg-white rounded-2xl border border-slate-300 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black text-sm">
                4
              </span>
              <h2 className="text-xl font-bold text-slate-900">Quality Inspection, Moisture Limits & Weighment</h2>
            </div>
            <p className="text-sm sm:text-base mb-3">
              All agricultural produce presented at KisaanSetu accredited procurement centres is subject to mandatory inspection under statutory Fair Average Quality (FAQ) norms:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base">
              <li>
                <strong>Moisture Specification:</strong> Grain moisture must adhere to the crop-specific ceiling (e.g. 12% to 14% for Wheat and Paddy). Produce exceeding permissible limits will require on-site aeration or drying before weighment.
              </li>
              <li>
                <strong>Foreign Matter & Inclusions:</strong> Inclusions of dirt, chaff, or damaged grains beyond official tolerances will result in appropriate proportional deductions or refusal of intake.
              </li>
              <li>
                <strong>Certified Electronic Weighment:</strong> Weighing must take place exclusively on computerized electronic weighbridges inspected and certified by the Department of Legal Metrology. Both the farmer and depot in-charge must sign the electronic weighment slip.
              </li>
            </ul>

            <div className="mt-4 p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 text-xs sm:text-sm text-amber-900 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <strong>Farmer Notice:</strong> Ensure grains are well-dried and cleaned before bringing them to the depot. Certified digital scales are used to protect you from under-weighing.
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section className="bg-white rounded-2xl border border-slate-300 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black text-sm">
                5
              </span>
              <h2 className="text-xl font-bold text-slate-900">MSP Pricing, Invoicing & Direct Benefit Transfer (DBT)</h2>
            </div>
            <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base">
              <li>
                <strong>Statutory MSP Rate:</strong> Payment for accepted produce is guaranteed at or above the official Central/State Government Minimum Support Price (MSP) active for the procurement season. No unauthorized commission or deduction (Mandi Cess on farmer) is permitted.
              </li>
              <li>
                <strong>Receipt Issuance:</strong> An immutable digital procurement receipt stating accepted weight, grade, rate per quintal, total value, and transaction ID is instantly generated and accessible on your dashboard.
              </li>
              <li>
                <strong>Direct Bank Transfer:</strong> Payout funds are disbursed directly into the farmer’s Aadhaar-linked or verified bank account via Public Financial Management System (PFMS) or authorized state payment gateways, typically within 48 to 72 hours of procurement completion.
              </li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="bg-white rounded-2xl border border-slate-300 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black text-sm">
                6
              </span>
              <h2 className="text-xl font-bold text-slate-900">Prohibition of Malpractices & Anti-Scalping</h2>
            </div>
            <p className="text-sm sm:text-base mb-3">
              To guarantee that small and marginal farmers enjoy equal access to procurement facilities:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base">
              <li>Commercial hoarding or reselling of appointment tokens is strictly forbidden.</li>
              <li>Use of automated bots or scripts to bulk-reserve time slots is monitored by system heuristics and will trigger permanent account suspension.</li>
              <li>Collusion between depot operators and middlemen will be reported directly to state anti-corruption vigilance authorities.</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="bg-white rounded-2xl border border-slate-300 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black text-sm">
                7
              </span>
              <h2 className="text-xl font-bold text-slate-900">Grievance Redressal & Contact Information</h2>
            </div>
            <p className="text-sm sm:text-base mb-4">
              If you encounter irregularities during slot booking, weighment disputes, or delay in receipt of DBT payments, you are entitled to file an expedited grievance:
            </p>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div>
                <strong className="text-slate-900 block font-semibold mb-1">State Procurement Helpline:</strong>
                <span className="text-slate-600 flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                  1800-180-1551 (Toll-Free Kisan Call Centre)
                </span>
              </div>
              <div>
                <strong className="text-slate-900 block font-semibold mb-1">Grievance Officer Email:</strong>
                <span className="text-slate-600">grievance@kisaansetu.gov.in</span>
              </div>
              <div className="sm:col-span-2">
                <strong className="text-slate-900 block font-semibold mb-1">Nodal Authority:</strong>
                <span className="text-slate-600">
                  National Procurement Oversight Cell, Smart India Hackathon Initiative & Ministry of Consumer Affairs, Food and Public Distribution.
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Navigation Back to Legal / Home */}
        <div className="mt-10 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} KisaanSetu. All rights reserved under Government of India open digital initiatives.</p>
          <div className="flex items-center gap-4 font-semibold text-emerald-700">
            <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
            <span>•</span>
            <Link to="/" className="hover:underline">Portal Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
