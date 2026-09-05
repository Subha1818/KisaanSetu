import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Sprout,
  Clock,
  CheckCircle,
  Languages,
  Wallet,
  ArrowRight,
  Building
} from 'lucide-react';
import { LANDING_CONSTANTS } from '../config/constants';

const Landing: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col">
      {/* Top Section with Zinc Yellow Background */}
      <div className="bg-[#FEFBE8] pt-12 md:pt-20 pb-16 md:pb-20 px-4 w-[95%] xl:max-w-7xl mx-auto rounded-3xl shadow-sm border border-amber-100/50 mb-12 mt-6">
        <section className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text */}
          <div className="space-y-6 text-center lg:text-left flex flex-col items-center lg:items-start">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
              {t('landing.hero_title')}
            </h1>
            <p className="text-lg md:text-xl text-slate-700 max-w-xl mx-auto lg:mx-0 font-medium leading-relaxed">
              {t('landing.hero_subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row justify-center lg:justify-start items-center gap-4 pt-6 w-full sm:w-auto">
              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-8 py-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl shadow-lg shadow-amber-600/20 transition-all text-lg"
              >
                {t('landing.register_cta')}
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-8 py-4 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 hover:border-slate-300 font-bold rounded-2xl shadow-sm transition-all text-lg"
              >
                {t('landing.login_cta')}
              </Link>
            </div>
          </div>
          {/* Right: SVG Illustration */}
          <div className="flex justify-center lg:justify-end w-full px-4 sm:px-0">
            <svg width="480" height="360" viewBox="0 0 480 360" fill="none" xmlns="http://www.w3.org/2000/svg" className="max-w-full h-auto drop-shadow-xl">
              {/* Sun */}
              <circle cx="380" cy="100" r="50" fill="#D97706" fillOpacity="0.1" />
              <circle cx="380" cy="100" r="30" fill="#D97706" fillOpacity="0.8" />

              {/* Field Layers - Changed from Green to Warm Amber/Wheat tones */}
              <path d="M0 320C120 280 240 340 480 300V360H0V320Z" fill="#FCD34D" fillOpacity="0.3" />
              <path d="M0 340C160 300 320 350 480 320V360H0V340Z" fill="#F59E0B" fillOpacity="0.2" />

              {/* Wheat Silhouettes */}
              <path d="M280 320C285 280 295 240 310 200" stroke="#B45309" strokeWidth="4" strokeLinecap="round" />
              <path d="M275 240L295 230M280 260L300 250M285 280L305 270" stroke="#B45309" strokeWidth="4" strokeLinecap="round" />

              <path d="M330 330C335 290 345 250 360 210" stroke="#B45309" strokeWidth="4" strokeLinecap="round" />
              <path d="M325 250L345 240M330 270L350 260M335 290L355 280" stroke="#B45309" strokeWidth="4" strokeLinecap="round" />

              <path d="M380 310C385 270 395 230 410 190" stroke="#B45309" strokeWidth="4" strokeLinecap="round" />
              <path d="M375 230L395 220M380 250L400 240M385 270L405 260" stroke="#B45309" strokeWidth="4" strokeLinecap="round" />

              {/* Minimal Farmer Figure - Changed to Neutral Slate/Amber */}
              <circle cx="160" cy="180" r="18" fill="#475569" />
              <path d="M130 170C150 150 170 150 190 170L175 180C165 170 155 170 145 180L130 170Z" fill="#B45309" />
              <path d="M125 320C125 280 140 240 160 210C180 240 195 280 195 320H125Z" fill="#475569" />
              <path d="M140 260L120 280M180 260L200 280" stroke="#475569" strokeWidth="8" strokeLinecap="round" />
            </svg>
          </div>
        </section>
      </div>

      {/* Deep Green Token Section */}
      <section className="bg-emerald-900 w-[95%] xl:max-w-7xl mx-auto rounded-3xl py-16 md:py-24 px-4 relative overflow-hidden mb-16 shadow-xl">
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-emerald-800/30 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 rounded-full bg-emerald-950/40 blur-2xl"></div>

        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center relative z-10">
          {/* Left: Mockup Card */}
          <div className="relative mx-auto w-full max-w-md lg:ml-0 lg:mr-auto mt-4 ml-4">
            {/* subtle rotated background card */}
            <div className="absolute inset-0 bg-amber-400 rounded-3xl transform -rotate-6 scale-100 shadow-xl"></div>
            {/* foreground card */}
            <div className="relative bg-white text-slate-900 p-6 md:p-8 rounded-3xl shadow-2xl border-none transform rotate-2">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Procurement Token</p>
                  <p className="text-xs text-slate-400 mt-1">Ludhiana Central Depot</p>
                </div>
                <div className="px-3 py-1 bg-amber-50 text-amber-700 font-bold rounded-lg border border-amber-200 text-xl shadow-sm">
                  A-104
                </div>
              </div>

              <div className="space-y-4 mb-6 text-left">
                <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                  <p className="text-slate-500 font-medium">Date</p>
                  <p className="font-bold text-slate-800">12 Oct 2026</p>
                </div>
                <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                  <p className="text-slate-500 font-medium">Product</p>
                  <p className="font-bold text-slate-800">Wheat (400 kg)</p>
                </div>
                <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                  <p className="text-slate-500 font-medium">Farmer</p>
                  <p className="font-bold text-slate-800">Narendra Modi</p>
                </div>
              </div>

              <div className="flex items-center gap-2 justify-center w-full bg-emerald-50 text-emerald-700 py-3 rounded-xl border border-emerald-100 font-bold shadow-sm">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                Payment Credited
              </div>
            </div>
          </div>

          {/* Right: Article Text */}
          <div className="space-y-6 text-center lg:text-left text-white">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
              {t('landing.token_section_title')}
            </h2>
            <p className="text-lg md:text-xl text-emerald-100/90 leading-relaxed font-medium">
              {t('landing.token_section_desc')}
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-col space-y-24 py-16">

        {/* How It Works Section */}
        <section className="max-w-7xl mx-auto px-4 w-full">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">{t('landing.how_it_works_title')}</h2>
          </div>

          <div className="space-y-16 md:space-y-24 mt-12 relative max-w-6xl mx-auto">
            {/* Step 1 */}
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
              <div className="w-full md:w-1/2">
                <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-6 overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-full h-2 bg-emerald-600"></div>
                  {/* SVG Mockup for Auth Form */}
                  <svg viewBox="0 0 400 300" className="w-full h-auto drop-shadow-sm" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0" y="0" width="400" height="300" fill="#ffffff" />

                    {/* Role Selector */}
                    <text x="20" y="30" fill="#334155" fontSize="14" fontWeight="bold" fontFamily="sans-serif">Select Your Portal Role</text>
                    <rect x="20" y="45" width="360" height="45" rx="8" fill="#f0fdf4" stroke="#10b981" strokeWidth="2" />
                    <rect x="35" y="55" width="25" height="25" rx="6" fill="#d1fae5" />
                    <path d="M42 68 v-2 a4 4 0 0 1 4 -4 h4 M42 68 a4 4 0 0 0 4 4 h2" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="52" cy="62" r="2" fill="#059669" />
                    <text x="75" y="72" fill="#0f172a" fontSize="14" fontWeight="bold" fontFamily="sans-serif">Farmer</text>

                    <rect x="20" y="100" width="360" height="40" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />

                    {/* Mobile Number */}
                    <text x="20" y="165" fill="#334155" fontSize="13" fontWeight="bold" fontFamily="sans-serif">Mobile Number</text>
                    <rect x="20" y="175" width="360" height="40" rx="6" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
                    <text x="35" y="200" fill="#94a3b8" fontSize="13" fontFamily="sans-serif">e.g. 9876543210</text>

                    {/* Password */}
                    <text x="20" y="235" fill="#334155" fontSize="13" fontWeight="bold" fontFamily="sans-serif">Password</text>
                    <rect x="20" y="245" width="360" height="40" rx="6" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
                    <text x="35" y="270" fill="#94a3b8" fontSize="13" fontFamily="sans-serif">Minimum 6 characters</text>
                    <circle cx="360" cy="265" r="5" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
                    <circle cx="360" cy="265" r="2" fill="#94a3b8" />
                  </svg>
                </div>
              </div>
              <div className="w-full md:w-1/2 space-y-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 font-black text-2xl mb-2 shadow-inner ring-4 ring-white">1</div>
                <h3 className="text-3xl font-bold text-slate-900">{t('landing.step_1')}</h3>
                <p className="text-xl text-slate-600 leading-relaxed font-medium">
                  Create a secure account using your mobile number and Aadhaar details to get started with KisaanSetu.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-8 md:gap-16">
              <div className="w-full md:w-1/2">
                <div className="bg-slate-50 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 p-6">
                  <svg viewBox="0 0 400 300" className="w-full h-auto drop-shadow-sm" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0" y="0" width="400" height="300" fill="#f8fafc" />

                    {/* Info Box */}
                    <rect x="20" y="20" width="360" height="40" rx="6" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
                    <circle cx="40" cy="40" r="6" fill="none" stroke="#10b981" strokeWidth="2" />
                    <circle cx="40" cy="40" r="2" fill="#10b981" />
                    <text x="60" y="44" fill="#64748b" fontSize="11" fontFamily="sans-serif">Select your location parameters to retrieve live depot counts.</text>

                    {/* Dropdowns */}
                    <text x="20" y="85" fill="#334155" fontSize="12" fontWeight="bold" fontFamily="sans-serif">State</text>
                    <rect x="20" y="95" width="110" height="35" rx="6" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
                    <text x="30" y="117" fill="#334155" fontSize="11" fontFamily="sans-serif">HARYANA</text>
                    <path d="M 115 112 l 4 4 l 4 -4" fill="none" stroke="#94a3b8" strokeWidth="1.5" />

                    <text x="140" y="85" fill="#334155" fontSize="12" fontWeight="bold" fontFamily="sans-serif">District</text>
                    <rect x="140" y="95" width="115" height="35" rx="6" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
                    <text x="150" y="117" fill="#334155" fontSize="10" fontFamily="sans-serif">MAHENDRAGARH</text>
                    <path d="M 240 112 l 4 4 l 4 -4" fill="none" stroke="#94a3b8" strokeWidth="1.5" />

                    <text x="265" y="85" fill="#334155" fontSize="12" fontWeight="bold" fontFamily="sans-serif">Block</text>
                    <rect x="265" y="95" width="115" height="35" rx="6" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
                    <text x="275" y="117" fill="#334155" fontSize="11" fontFamily="sans-serif">KANINA</text>
                    <path d="M 365 112 l 4 4 l 4 -4" fill="none" stroke="#94a3b8" strokeWidth="1.5" />

                    {/* Result Card */}
                    <text x="20" y="165" fill="#64748b" fontSize="11" fontFamily="sans-serif">Showing active depots located in KANINA:</text>
                    <rect x="20" y="180" width="220" height="85" rx="8" fill="#ffffff" stroke="#10b981" strokeWidth="1.5" />
                    <text x="35" y="205" fill="#0f172a" fontSize="14" fontWeight="bold" fontFamily="sans-serif">Rampur Depot A</text>
                    <text x="35" y="220" fill="#64748b" fontSize="10" fontFamily="sans-serif">In-Charge: Rajesh Sharma</text>
                    <rect x="215" y="195" width="14" height="14" rx="2" fill="#d1fae5" />
                    <line x1="35" y1="240" x2="225" y2="240" stroke="#f1f5f9" strokeWidth="1" />
                    <text x="35" y="255" fill="#64748b" fontSize="10" fontFamily="sans-serif">Daily Dropoff Limit:</text>
                    <text x="195" y="255" fill="#0f172a" fontSize="10" fontWeight="bold" fontFamily="sans-serif">50 slots</text>

                    {/* Button */}
                    <rect x="260" y="225" width="120" height="40" rx="8" fill="#10b981" />
                    <text x="320" y="250" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">Select Products</text>
                  </svg>
                </div>
              </div>
              <div className="w-full md:w-1/2 space-y-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 font-black text-2xl mb-2 shadow-inner ring-4 ring-white">2</div>
                <h3 className="text-3xl font-bold text-slate-900">{t('landing.step_2')}</h3>
                <p className="text-xl text-slate-600 leading-relaxed font-medium">
                  Easily find your nearest government procurement centre by filtering down through your State, District, and Block.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
              <div className="w-full md:w-1/2">
                <div className="bg-slate-50 p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200">
                  <svg viewBox="0 0 400 300" className="w-full h-auto drop-shadow-sm" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0" y="0" width="400" height="300" fill="#f8fafc" />

                    <text x="20" y="30" fill="#10b981" fontSize="10" fontWeight="bold" fontFamily="sans-serif" letterSpacing="1">UPCOMING APPOINTMENT</text>
                    <text x="20" y="55" fill="#0f172a" fontSize="18" fontWeight="900" fontFamily="sans-serif">Active Procurement Ticket</text>

                    <rect x="330" y="20" width="50" height="20" rx="10" fill="#ecfdf5" stroke="#10b981" strokeWidth="1" />
                    <text x="355" y="34" fill="#059669" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">BOOKED</text>

                    {/* Ticket Card */}
                    <rect x="20" y="75" width="360" height="120" rx="12" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5" />

                    {/* QR Code Placeholder */}
                    <rect x="35" y="90" width="70" height="70" rx="4" fill="#f1f5f9" />
                    <rect x="40" y="95" width="20" height="20" fill="#0f172a" />
                    <rect x="75" y="95" width="20" height="20" fill="#0f172a" />
                    <rect x="40" y="130" width="20" height="20" fill="#0f172a" />
                    <rect x="70" y="125" width="10" height="10" fill="#0f172a" />
                    <rect x="85" y="135" width="10" height="10" fill="#0f172a" />
                    <rect x="65" y="145" width="30" height="10" fill="#0f172a" />

                    <text x="125" y="105" fill="#64748b" fontSize="10" fontWeight="bold" fontFamily="sans-serif">YOUR QUEUE TOKEN</text>
                    <text x="125" y="130" fill="#0f172a" fontSize="24" fontWeight="900" fontFamily="sans-serif">TKT-001</text>

                    <text x="260" y="105" fill="#64748b" fontSize="10" fontWeight="bold" fontFamily="sans-serif">SCHEDULED DROPOFF</text>
                    <text x="260" y="130" fill="#0f172a" fontSize="14" fontWeight="bold" fontFamily="sans-serif">2 September 2026</text>

                    <line x1="20" y1="175" x2="380" y2="175" stroke="#f1f5f9" strokeWidth="2" strokeDasharray="6 6" />

                    <text x="40" y="210" fill="#64748b" fontSize="11" fontFamily="sans-serif">Procurement Centre</text>
                    <text x="40" y="225" fill="#0f172a" fontSize="13" fontWeight="bold" fontFamily="sans-serif">Rampur Depot A</text>
                    <text x="40" y="240" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">DURBUK, LEH LADAKH</text>

                    <text x="220" y="210" fill="#64748b" fontSize="11" fontFamily="sans-serif">Dropoff Quantity</text>
                    <text x="220" y="225" fill="#0f172a" fontSize="13" fontWeight="bold" fontFamily="sans-serif">Wheat</text>
                    <text x="220" y="240" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">Weight: </text>
                    <text x="260" y="240" fill="#0f172a" fontSize="10" fontWeight="bold" fontFamily="sans-serif">1,000 kg</text>
                  </svg>
                </div>
              </div>
              <div className="w-full md:w-1/2 space-y-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 font-black text-2xl mb-2 shadow-inner ring-4 ring-white">3</div>
                <h3 className="text-3xl font-bold text-slate-900">{t('landing.step_3')}</h3>
                <p className="text-xl text-slate-600 leading-relaxed font-medium">
                  Pick an open date that suits you, declare your crop quantity, and instantly receive a valid queue token.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-8 md:gap-16">
              <div className="w-full md:w-1/2">
                <div className="bg-slate-50 p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200">
                  <svg viewBox="0 0 400 200" className="w-full h-auto drop-shadow-sm" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0" y="0" width="400" height="200" fill="#f8fafc" />

                    <text x="20" y="30" fill="#4f46e5" fontSize="11" fontWeight="900" fontFamily="sans-serif" letterSpacing="1">LIVE QUEUE STATUS</text>

                    {/* Now Serving Card */}
                    <rect x="20" y="50" width="170" height="110" rx="12" fill="#eff6ff" />
                    <rect x="20" y="50" width="170" height="4" fill="#6366f1" />
                    <text x="35" y="80" fill="#4338ca" fontSize="10" fontWeight="bold" fontFamily="sans-serif" letterSpacing="1">NOW SERVING</text>
                    <text x="35" y="125" fill="#312e81" fontSize="32" fontWeight="900" fontFamily="sans-serif">TKT-038</text>

                    {/* People Ahead Card */}
                    <rect x="210" y="50" width="170" height="110" rx="12" fill="#fffbeb" />
                    <rect x="210" y="50" width="170" height="4" fill="#f59e0b" />
                    <text x="225" y="80" fill="#b45309" fontSize="10" fontWeight="bold" fontFamily="sans-serif" letterSpacing="1">PEOPLE AHEAD OF YOU</text>
                    <text x="225" y="125" fill="#78350f" fontSize="32" fontWeight="900" fontFamily="sans-serif">3</text>
                  </svg>
                </div>
              </div>
              <div className="w-full md:w-1/2 space-y-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 font-black text-2xl mb-2 shadow-inner ring-4 ring-white">4</div>
                <h3 className="text-3xl font-bold text-slate-900">{t('landing.step_4')}</h3>
                <p className="text-xl text-slate-600 leading-relaxed font-medium">
                  Monitor the live queue from home. You'll know exactly who is being served and how many people are ahead of you in real time.
                </p>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
              <div className="w-full md:w-1/2">
                <div className="bg-slate-50 p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200">
                  <svg viewBox="0 0 400 250" className="w-full h-auto drop-shadow-sm" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0" y="0" width="400" height="250" fill="#f8fafc" />

                    <rect x="20" y="20" width="360" height="200" rx="12" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />

                    <rect x="40" y="40" width="140" height="30" rx="15" fill="#ecfdf5" stroke="#10b981" strokeWidth="1.5" />
                    <circle cx="55" cy="55" r="8" fill="#10b981" />
                    <path d="M52 55 l2 2 l4 -5" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <text x="75" y="59" fill="#065f46" fontSize="12" fontWeight="bold" fontFamily="sans-serif">Payment Credited</text>

                    <line x1="40" y1="90" x2="360" y2="90" stroke="#f1f5f9" strokeWidth="2" />

                    <text x="40" y="125" fill="#64748b" fontSize="11" fontFamily="sans-serif">Final Crop Weighed</text>
                    <text x="40" y="145" fill="#0f172a" fontSize="16" fontWeight="bold" fontFamily="sans-serif">Wheat (2,050 kg)</text>

                    <text x="40" y="180" fill="#64748b" fontSize="11" fontFamily="sans-serif">Amount Issued</text>
                    <text x="40" y="205" fill="#10b981" fontSize="22" fontWeight="900" fontFamily="sans-serif">₹ 46,637.50</text>

                    <rect x="260" y="175" width="100" height="35" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
                    <text x="310" y="196" fill="#334155" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">View Receipt</text>
                  </svg>
                </div>
              </div>
              <div className="w-full md:w-1/2 space-y-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 font-black text-2xl mb-2 shadow-inner ring-4 ring-white">5</div>
                <h3 className="text-3xl font-bold text-slate-900">{t('landing.step_5')}</h3>
                <p className="text-xl text-slate-600 leading-relaxed font-medium">
                  Drop off your grains and receive direct, transparent payment to your bank account with a digital receipt.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="bg-emerald-900 text-white rounded-3xl p-8 md:p-12 max-w-5xl mx-auto w-full">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold">{t('landing.why_use_title')}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-emerald-800/50 p-6 rounded-2xl flex items-start gap-4 hover:bg-emerald-800/70 transition-colors">
              <div className="p-3 bg-amber-500 rounded-xl shrink-0">
                <Clock className="w-6 h-6 text-emerald-900" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{t('landing.benefit_1')}</h3>
              </div>
            </div>
            <div className="bg-emerald-800/50 p-6 rounded-2xl flex items-start gap-4 hover:bg-emerald-800/70 transition-colors">
              <div className="p-3 bg-amber-500 rounded-xl shrink-0">
                <Wallet className="w-6 h-6 text-emerald-900" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{t('landing.benefit_2')}</h3>
              </div>
            </div>
            <div className="bg-emerald-800/50 p-6 rounded-2xl flex items-start gap-4 hover:bg-emerald-800/70 transition-colors">
              <div className="p-3 bg-amber-500 rounded-xl shrink-0">
                <Languages className="w-6 h-6 text-emerald-900" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{t('landing.benefit_3')}</h3>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="max-w-5xl mx-auto px-4 w-full">
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-slate-100">
              {LANDING_CONSTANTS.TRUST_STATS.map((stat, idx) => (
                <div key={idx} className="text-center pt-6 md:pt-0 first:pt-0">
                  <p className="text-4xl md:text-5xl font-black text-amber-600 mb-2">{stat.value}</p>
                  <p className="text-slate-500 font-medium uppercase tracking-wider text-sm">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Admin/Staff Section */}
        <section className="max-w-3xl mx-auto px-4 text-center space-y-4 pb-12">
          <div className="inline-flex justify-center items-center p-3 bg-slate-100 rounded-2xl text-slate-500 mb-2">
            <Building className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">{t('landing.staff_title')}</h2>
          <p className="text-slate-500">{t('landing.staff_desc')}</p>
          <div className="pt-2">
            <Link to="/login" className="text-emerald-600 font-semibold hover:underline">
              {t('landing.staff_login_link')}
            </Link>
          </div>
        </section>
      </div>

      {/* Footer - Only on Landing */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-10 mt-auto w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <Link to="/" className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-emerald-600 rounded-lg text-white">
                  <Sprout className="w-5 h-5" />
                </div>
                <span className="font-bold text-xl text-white tracking-tight">KisaanSetu</span>
              </Link>
              <p className="text-sm text-slate-500 max-w-sm leading-relaxed mb-1">
                {t('layout.footer', { year: new Date().getFullYear() })}
              </p>
              <p className="text-sm text-slate-400 font-medium">
                Made with ❤️ by Team PARALLAX
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">{t('layout.footer_links_title')}</h3>
              <ul className="space-y-3 text-sm">
                <li><Link to="/" className="hover:text-emerald-400 transition-colors">{t('layout.footer_home')}</Link></li>
                <li><Link to="/farmer" className="hover:text-emerald-400 transition-colors">{t('layout.farmer_portal')}</Link></li>
                <li><Link to="/login" className="hover:text-emerald-400 transition-colors">{t('layout.login')}</Link></li>
                <li><Link to="/register" className="hover:text-emerald-400 transition-colors">{t('layout.register')}</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">{t('layout.footer_legal_title')}</h3>
              <ul className="space-y-3 text-sm">
                <li><Link to="/" className="hover:text-emerald-400 transition-colors">{t('layout.footer_about')}</Link></li>
                <li><Link to="/privacy" className="hover:text-emerald-400 transition-colors">{t('layout.footer_privacy')}</Link></li>
                <li><Link to="/terms" className="hover:text-emerald-400 transition-colors">{t('layout.footer_terms')}</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
