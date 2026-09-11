import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { Logo } from './Logo';
import { loadLanguageFont } from '../i18n';
import { supabase } from '../lib/supabaseClient';

interface LanguageOption {
  code: string;
  nativeName: string;
  englishName: string;
  greeting: string;
  glyph: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', greeting: 'नमस्ते', glyph: 'अ' },
  { code: 'bn', nativeName: 'বাংলা', englishName: 'Bengali', greeting: 'নমস্কার', glyph: 'অ' },
  { code: 'mr', nativeName: 'मराठी', englishName: 'Marathi', greeting: 'नमस्कार', glyph: 'म' },
  { code: 'te', nativeName: 'తెలుగు', englishName: 'Telugu', greeting: 'నమస్కారం', glyph: 'తె' },
  { code: 'ta', nativeName: 'தமிழ்', englishName: 'Tamil', greeting: 'வணக்கம்', glyph: 'த' },
  { code: 'pa', nativeName: 'ਪੰਜਾਬੀ', englishName: 'Punjabi', greeting: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ', glyph: 'ਪੰ' },
  { code: 'en', nativeName: 'English', englishName: 'English', greeting: 'Welcome', glyph: 'En' },
];

const ROTATING_HEADERS = [
  { text: 'अपनी भाषा चुनें', lang: 'हिन्दी' },
  { text: 'আপনার ভাষা বেছে নিন', lang: 'বাংলা' },
  { text: 'Choose your language', lang: 'English' },
];

export const FirstVisitLanguageModal: React.FC = () => {
  const { i18n } = useTranslation();

  // Check localStorage immediately on mount — synchronous check avoids flicker
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const hasSelected = localStorage.getItem('kisaansetu_lang_selected');
    return !hasSelected;
  });

  const [headerIndex, setHeaderIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  // Preload all Indian language fonts so native scripts render crisply without delay
  useEffect(() => {
    if (isOpen) {
      ['hi', 'bn', 'mr', 'te', 'ta', 'pa'].forEach(loadLanguageFont);
    }
  }, [isOpen]);

  // Rotate header through 2-3 scripts smoothly
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setHeaderIndex((prev) => (prev + 1) % ROTATING_HEADERS.length);
        setIsFading(false);
      }, 250);
    }, 2600);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectLanguage = async (code: string) => {
    setSelectedCode(code);

    try {
      // 1. Mark in localStorage so popup is skipped on repeat visits
      localStorage.setItem('kisaansetu_lang_selected', 'true');
      localStorage.setItem('i18nextLng', code);

      // 2. Set as active language in i18n
      await i18n.changeLanguage(code);
      loadLanguageFont(code);

      // 3. Sync with authenticated user profile if currently signed in
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase
          .from('users')
          .update({ preferred_language: code })
          .eq('id', session.user.id);
      }
    } catch (err) {
      console.error('Error setting language on first visit:', err);
    } finally {
      // Brief delay to give the farmer positive tactile feedback on selection
      setTimeout(() => {
        setIsOpen(false);
      }, 180);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Select Language"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-2.5 sm:p-5 md:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-300"
    >
      <div className="relative w-full max-w-2xl my-auto bg-gradient-to-b from-amber-50/95 via-white to-emerald-50/90 rounded-3xl border-2 border-amber-300 shadow-2xl shadow-emerald-950/50 p-4 sm:p-8 overflow-y-auto max-h-[92vh] overscroll-contain">
        {/* Subtle decorative background glow circles matching homepage wheat/emerald theme */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Branding & Rotating Header */}
        <div className="relative text-center flex flex-col items-center">
          {/* Logo badge */}
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-2xl flex items-center justify-center shadow-md shadow-emerald-900/10 border-2 border-emerald-200/80">
              <Logo className="w-8 h-8 sm:w-9 sm:h-9" />
            </div>
            <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-emerald-800 to-teal-700 bg-clip-text text-transparent">
              KisaanSetu
            </span>
          </div>

          {/* Rotating "Choose your language" Title */}
          <div className="min-h-[40px] sm:min-h-[56px] flex items-center justify-center">
            <h2
              className={`text-xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight transition-all duration-300 transform ${
                isFading ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
              }`}
            >
              {ROTATING_HEADERS[headerIndex].text}
            </h2>
          </div>

          {/* Rotation Indicators (Dots) */}
          <div className="flex items-center gap-1.5 mt-1.5 sm:mt-2 mb-1">
            {ROTATING_HEADERS.map((item, idx) => (
              <span
                key={item.text}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === headerIndex
                    ? 'w-6 bg-amber-600'
                    : 'w-1.5 bg-slate-300'
                }`}
                aria-hidden="true"
              />
            ))}
          </div>

          {/* Subtitle / Visual instruction for farmer */}
          <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-0.5 sm:mt-1">
            अपनी भाषा पर टैप करें • আপনার ভাষায় ট্যাপ করুন • Tap to continue
          </p>
        </div>

        {/* Large Farmer-Friendly Tappable Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5 mt-4 sm:mt-6 relative z-10">
          {LANGUAGES.map((lang, index) => {
            const isSelected = selectedCode === lang.code || (!selectedCode && i18n.language === lang.code);
            // On a 2-column grid, have the 7th item (English) span both columns for perfect symmetry
            const isLastOddItem = index === LANGUAGES.length - 1;

            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelectLanguage(lang.code)}
                aria-label={`Select ${lang.englishName} (${lang.nativeName})`}
                className={`group relative w-full text-left p-3.5 sm:p-4.5 rounded-2xl border-2 transition-all duration-200 flex items-center justify-between cursor-pointer focus:outline-none focus:ring-4 focus:ring-emerald-500/30 active:scale-[0.98] min-h-[64px] ${
                  isLastOddItem ? 'sm:col-span-2' : ''
                } ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/90 shadow-md shadow-emerald-700/15'
                    : 'border-amber-200/90 bg-white/95 hover:border-emerald-500 hover:bg-emerald-50/50 hover:shadow-md hover:shadow-emerald-900/10'
                }`}
              >
                {/* Left side: Glyph + Large Native Script Name */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg border transition-colors shrink-0 ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-amber-100/80 group-hover:bg-emerald-100 text-amber-900 group-hover:text-emerald-800 border-amber-300/80 group-hover:border-emerald-300'
                    }`}
                  >
                    {lang.glyph}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span
                      className={`text-2xl sm:text-[1.65rem] font-black leading-tight tracking-tight transition-colors truncate ${
                        isSelected
                          ? 'text-emerald-900'
                          : 'text-slate-900 group-hover:text-emerald-900'
                      }`}
                    >
                      {lang.nativeName}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 group-hover:text-emerald-700 transition-colors">
                      {lang.englishName}
                    </span>
                  </div>
                </div>

                {/* Right side: Native Greeting Pill & Status */}
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-amber-100 text-amber-900 border-amber-300 group-hover:bg-emerald-100 group-hover:text-emerald-900 group-hover:border-emerald-300'
                    }`}
                  >
                    {lang.greeting}
                  </span>

                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default FirstVisitLanguageModal;
