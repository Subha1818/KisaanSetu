import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sprout, Building2, Shield, LogIn, UserPlus, Globe, Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabaseClient';

interface LayoutProps {
  children?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

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
      {/* Header */}
      <header className="sticky top-4 z-50 mx-4 sm:mx-6 lg:mx-auto w-[96%] max-w-[90rem]">
        <div className={`px-4 sm:px-6 lg:px-8 transition-all duration-500 ease-out ${isMobileMenuOpen ? 'rounded-3xl' : 'rounded-full'} ${isScrolled || isMobileMenuOpen
            ? 'bg-amber-100/95 backdrop-blur-md border-2 border-amber-400/80 shadow-md shadow-amber-900/10'
            : 'bg-emerald-50/90 backdrop-blur-md border-2 border-emerald-200/80 shadow-sm shadow-emerald-900/5'
          }`}>
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="p-2 bg-emerald-600 rounded-xl text-white group-hover:scale-105 transition-all duration-300 shadow-lg shadow-emerald-600/20">
                <Sprout className="w-6 h-6" />
              </div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent hidden sm:block">
                AgriProcure
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
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-400" aria-hidden="true" />
                <select
                  value={i18n.language}
                  onChange={changeLanguage}
                  aria-label="Select Language"
                  className="bg-transparent border-none text-sm font-semibold text-slate-700 focus:ring-0 cursor-pointer"
                >
                  <option value="en">English</option>
                  <option value="hi">हिंदी (HI)</option>
                  <option value="bn">বাংলা (BN)</option>
                </select>
              </div>

              {/* Auth Buttons */}
              <div className="flex items-center gap-2">
                {authItems.map((item) => {
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
                })}
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg px-2 py-1 mr-2">
                <Globe className="w-4 h-4 text-slate-500" />
                <select
                  value={i18n.language}
                  onChange={changeLanguage}
                  className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:ring-0 cursor-pointer pl-1 pr-6 py-1"
                >
                  <option value="en">EN</option>
                  <option value="hi">HI</option>
                  <option value="bn">BN</option>
                </select>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Toggle Menu"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Dropdown Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-slate-100 flex flex-col space-y-2 pb-6">
              <div className="px-2 pb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Portals</div>
              {navItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive
                      ? 'bg-white text-emerald-800 shadow-sm border-2 border-emerald-400'
                      : 'text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                    {item.label}
                  </Link>
                );
              })}

              <div className="px-2 pt-4 pb-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-t border-slate-100 mt-2">Account</div>
              {authItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${item.path === '/register'
                      ? 'bg-slate-900 text-white mt-2'
                      : isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-slate-600 border border-slate-200'
                      }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className={`flex-1 w-full ${location.pathname === '/' ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'}`}>
        {children}
      </main>

    </div>
  );
};
