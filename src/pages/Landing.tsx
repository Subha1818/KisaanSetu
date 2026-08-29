import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Sprout, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle, 
  Languages, 
  Wallet,
  ArrowRight,
  Building,
  Award,
  Phone,
  Smartphone
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
                  <p className="font-bold text-slate-800">Ramesh Kumar</p>
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
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 relative">
          {/* Desktop Connecting Line */}
          <div className="hidden md:block absolute top-8 left-[10%] right-[10%] h-0.5 bg-amber-200 -z-10"></div>
          
          {/* Step 1 */}
          <div className="relative bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center flex flex-col items-center hover:border-amber-300 transition-colors h-full">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center font-bold text-2xl mb-4 shadow-inner ring-4 ring-white relative shrink-0">
              <Phone className="w-8 h-8" />
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-slate-900 text-white text-xs font-bold rounded-full flex items-center justify-center">1</div>
            </div>
            <p className="text-slate-700 font-medium leading-relaxed">{t('landing.step_1')}</p>
          </div>

          {/* Step 2 */}
          <div className="relative bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center flex flex-col items-center hover:border-amber-300 transition-colors h-full">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center font-bold text-2xl mb-4 shadow-inner ring-4 ring-white relative shrink-0">
              <MapPin className="w-8 h-8" />
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-slate-900 text-white text-xs font-bold rounded-full flex items-center justify-center">2</div>
            </div>
            <p className="text-slate-700 font-medium leading-relaxed">{t('landing.step_2')}</p>
          </div>

          {/* Step 3 */}
          <div className="relative bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center flex flex-col items-center hover:border-amber-300 transition-colors h-full">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center font-bold text-2xl mb-4 shadow-inner ring-4 ring-white relative shrink-0">
              <Calendar className="w-8 h-8" />
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-slate-900 text-white text-xs font-bold rounded-full flex items-center justify-center">3</div>
            </div>
            <p className="text-slate-700 font-medium leading-relaxed">{t('landing.step_3')}</p>
          </div>

          {/* Step 4 */}
          <div className="relative bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center flex flex-col items-center hover:border-amber-300 transition-colors h-full">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center font-bold text-2xl mb-4 shadow-inner ring-4 ring-white relative shrink-0">
              <Smartphone className="w-8 h-8" />
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-slate-900 text-white text-xs font-bold rounded-full flex items-center justify-center">4</div>
            </div>
            <p className="text-slate-700 font-medium leading-relaxed">{t('landing.step_4')}</p>
          </div>

          {/* Step 5 */}
          <div className="relative bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center flex flex-col items-center hover:border-amber-300 transition-colors h-full">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center font-bold text-2xl mb-4 shadow-inner ring-4 ring-white relative shrink-0">
              <CheckCircle className="w-8 h-8" />
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-slate-900 text-white text-xs font-bold rounded-full flex items-center justify-center">5</div>
            </div>
            <p className="text-slate-700 font-medium leading-relaxed">{t('landing.step_5')}</p>
          </div>

          {/* Mobile Connecting Line */}
          <div className="md:hidden absolute top-[10%] bottom-[10%] left-1/2 w-0.5 bg-amber-200 -z-10 -translate-x-1/2"></div>
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
                <span className="font-bold text-xl text-white tracking-tight">AgriProcure</span>
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
                <li><Link to="/" className="hover:text-emerald-400 transition-colors">{t('layout.footer_privacy')}</Link></li>
                <li><Link to="/" className="hover:text-emerald-400 transition-colors">{t('layout.footer_terms')}</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
