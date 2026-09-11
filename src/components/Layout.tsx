import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sprout, Building2, Shield, LogIn, UserPlus, Globe, Menu, X, LogOut, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabaseClient';
import { FirstVisitLanguageModal } from './FirstVisitLanguageModal';
import { Logo } from './Logo';
import { KisanAgentWidget } from './farmer/KisanAgentWidget';
import { CentreAgentWidget } from './centre/CentreAgentWidget';

interface LayoutProps {
  children?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const [session, setSession] = useState<any>(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Auth session listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await supabase.auth.signOut();
      setIsLogoutModalOpen(false);
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Handle scroll for navbar styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const loadUserLang = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase.from('users').select('preferred_language').eq('id', session.user.id).single();
        if (data?.preferred_language && data.preferred_language !== i18n.language) {
          i18n.changeLanguage(data.preferred_language);
        }
      }
    };
    loadUserLang();
  }, [i18n]);

  const changeLanguage = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lng = e.target.value;
    localStorage.setItem('kisaansetu_lang_selected', 'true');
    localStorage.setItem('i18nextLng', lng);
    i18n.changeLanguage(lng);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.from('users').update({ preferred_language: lng }).eq('id', session.user.id);
    }
  };

  const navItems = [
    { path: '/farmer', label: t('layout.farmer_portal'), icon: Sprout },
    { path: '/centre', label: t('layout.centre_portal'), icon: Building2 },
    { path: '/admin', label: t('layout.admin_portal'), icon: Shield },
  ];

  const authItems = [
    { path: '/login', label: t('layout.login'), icon: LogIn },
    { path: '/register', label: t('layout.register'), icon: UserPlus },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* First-visit Language Selection Popup */}
      <FirstVisitLanguageModal />

      {/* Header */}
      <header className="sticky top-3 sm:top-4 z-50 w-[calc(100%-1rem)] sm:w-[96%] max-w-[90rem] mx-auto">
        <div className={`px-3 sm:px-6 lg:px-8 transition-all duration-500 ease-out ${isMobileMenuOpen ? 'rounded-3xl' : 'rounded-full'} ${isScrolled || isMobileMenuOpen
            ? 'bg-amber-100/95 backdrop-blur-md border-2 border-amber-400/80 shadow-md shadow-amber-900/10'
            : 'bg-emerald-50/90 backdrop-blur-md border-2 border-emerald-200/80 shadow-sm shadow-emerald-900/5'
          }`}>
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group shrink-0">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center group-hover:scale-105 transition-all duration-300 shadow-md shadow-emerald-900/10 border border-emerald-200/60">
                <Logo className="w-8 h-8" />
              </div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent hidden sm:block">
                KisaanSetu
              </span>
            </Link>

            {/* Navigation links */}
            <nav className="hidden md:flex space-x-1">
              {navItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${isActive
                      ? 'bg-white text-emerald-800 shadow-md border-2 border-emerald-400'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right section: Lang Switcher & Auth Buttons (Desktop) */}
            <div className="hidden md:flex items-center gap-4">

              {/* Language Switcher */}
              <div className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 bg-white/80 rounded-xl hover:border-emerald-300 transition-colors shadow-sm">
                <Globe className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                <select
                  value={i18n.language}
                  onChange={changeLanguage}
                  aria-label="Select Language"
                  className="bg-transparent border-none text-sm font-semibold text-slate-700 focus:ring-0 cursor-pointer p-0 pr-6"
                >
                  <option value="en">English</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                  <option value="bn">বাংলা (Bengali)</option>
                  <option value="mr">मराठी (Marathi)</option>
                  <option value="te">తెలుగు (Telugu)</option>
                  <option value="ta">தமிழ் (Tamil)</option>
                  <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
                </select>
              </div>

              {/* Auth Buttons */}
              <div className="flex items-center gap-2">
                {session ? (
                  <button
                    onClick={() => setIsLogoutModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 border border-slate-200 bg-white text-red-600 hover:bg-red-50 hover:border-red-200"
                  >
                    <LogOut className="w-4 h-4" />
                    {t('layout.logout')}
                  </button>
                ) : (
                  authItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${isActive
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10'
                          : item.path === '/register'
                            ? 'bg-slate-900 text-white hover:bg-slate-800'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 bg-white'
                          }`}
                      >
                        <Icon className="w-4 h-4" />
                        {item.label}
                      </Link>
                    );
                  })
                )}
              </div>
            </div>

            {/* Mobile Menu Button & Mobile Language Selector with 44px+ tap targets */}
            <div className="md:hidden flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-white/90 border border-slate-200 rounded-xl px-2.5 h-11 shadow-sm">
                <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
                <select
                  value={i18n.language}
                  onChange={changeLanguage}
                  aria-label="Select Language"
                  className="bg-transparent border-none text-xs sm:text-sm font-semibold text-slate-700 focus:ring-0 cursor-pointer pl-0.5 pr-6 py-0 h-full"
                >
                  <option value="en">English</option>
                  <option value="hi">हिन्दी</option>
                  <option value="bn">বাংলা</option>
                  <option value="mr">मराठी</option>
                  <option value="te">తెలుగు</option>
                  <option value="ta">தமிழ்</option>
                  <option value="pa">ਪੰਜਾਬੀ</option>
                </select>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="w-11 h-11 rounded-xl text-slate-600 hover:bg-slate-100/80 active:bg-slate-200/80 flex items-center justify-center transition-colors shrink-0"
                aria-label="Toggle Menu"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Dropdown Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-amber-300/60 flex flex-col space-y-1.5 pb-5">

              {/* Portals Section */}
              <div className="px-1 pb-2 text-[10px] font-extrabold text-amber-700/80 uppercase tracking-widest">{t('layout.portals')}</div>
              {navItems.map((item, idx) => {
                const isActive = location.pathname.startsWith(item.path);
                const Icon = item.icon;
                // Each portal gets its own accent colour
                const accentStyles = [
                  { bg: 'bg-emerald-500', light: 'bg-emerald-50 border-emerald-300 text-emerald-900', icon: 'text-white' },
                  { bg: 'bg-blue-500',    light: 'bg-blue-50   border-blue-300   text-blue-900',    icon: 'text-white' },
                  { bg: 'bg-violet-500',  light: 'bg-violet-50 border-violet-300 text-violet-900',  icon: 'text-white' },
                ];
                const accent = accentStyles[idx % accentStyles.length];
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all min-h-[52px] border ${
                      isActive
                        ? `${accent.light} shadow-sm`
                        : 'bg-white/70 border-slate-200 text-slate-800 hover:bg-white active:scale-[0.98]'
                    }`}
                  >
                    {/* Colored icon badge */}
                    <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive ? accent.bg : accent.bg + ' opacity-80'
                    }`}>
                      <Icon className="w-5 h-5 text-white" />
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-current opacity-60 mr-1" />
                    )}
                  </Link>
                );
              })}

              {/* Account Section */}
              <div className="px-1 pt-3 pb-2 text-[10px] font-extrabold text-amber-700/80 uppercase tracking-widest border-t border-amber-300/60 mt-1">{t('layout.account')}</div>
              {session ? (
                <button
                  onClick={() => {
                    setIsLogoutModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 min-h-[52px] active:scale-[0.98]"
                >
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-red-500">
                    <LogOut className="w-5 h-5 text-white" />
                  </span>
                  {t('layout.logout')}
                </button>
              ) : (
                authItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;
                  const isRegister = item.path === '/register';
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all min-h-[52px] border active:scale-[0.98] ${
                        isRegister
                          ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-md shadow-emerald-600/20'
                          : isActive
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-white/70 text-slate-800 border-slate-200 hover:bg-white'
                      }`}
                    >
                      <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isRegister ? 'bg-emerald-700' : 'bg-slate-700'
                      }`}>
                        <Icon className="w-5 h-5 text-white" />
                      </span>
                      {item.label}
                    </Link>
                  );
                })
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className={`flex-1 w-full ${location.pathname === '/' ? '' : 'max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8'}`}>
        {children}
      </main>

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
            <div className="p-5 sm:p-6 overflow-y-auto">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 text-center mb-2">{t('layout.confirm_logout')}</h3>
              <p className="text-slate-500 text-center text-sm mb-6">{t('layout.logout_confirm_msg')}</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setIsLogoutModalOpen(false)}
                  disabled={isLoggingOut}
                  className="flex-1 py-3 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
                >
                  {t('layout.cancel')}
                </button>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex-1 py-3 min-h-[44px] bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-md shadow-red-600/20 text-sm"
                >
                  {isLoggingOut ? t('layout.logging_out') : t('layout.confirm_logout')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scoped AI Assistant Widgets (Not shown on Landing page) */}
      {location.pathname.startsWith('/farmer') && <KisanAgentWidget />}
      {location.pathname.startsWith('/centre') && <CentreAgentWidget />}
    </div>
  );
};
