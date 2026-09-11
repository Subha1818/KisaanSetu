import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sprout, AlertCircle, Loader, ArrowLeft, Eye, EyeOff, WifiOff, UserCheck, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from 'react-i18next';

const CACHED_PROFILE_KEY = 'kisaansetu_cached_user_profile';

interface CachedSession {
  userId: string;
  role: string;
  email?: string;
  mobile?: string;
  updatedAt: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [cachedSession, setCachedSession] = useState<CachedSession | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check for cached session in localStorage
    try {
      const raw = localStorage.getItem(CACHED_PROFILE_KEY);
      if (raw) {
        setCachedSession(JSON.parse(raw));
      }
    } catch {
      // Ignore storage errors
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleContinueOffline = () => {
    if (!cachedSession) return;
    const role = cachedSession.role;
    if (role === 'admin') navigate('/admin');
    else if (role === 'staff') navigate('/centre');
    else navigate('/farmer');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!navigator.onLine) {
      setError(t('auth.offline_login_err', 'You are currently offline. Initial login requires an internet connection. If you logged in previously, click "Continue Offline" below.'));
      return;
    }

    setLoading(true);
    setError(null);

    // Format phone number to standard E.164 (+91 for India if only 10 digits provided)
    let formattedPhone = mobile.trim();
    if (/^\d{10}$/.test(formattedPhone)) {
      formattedPhone = `+91${formattedPhone}`;
    } else if (!formattedPhone.startsWith('+')) {
      setError(t('auth.invalid_mobile'));
      setLoading(false);
      return;
    }

    try {
      // 1. Sign in with Supabase Auth
      const internalEmail = `${formattedPhone.replace('+', '')}@farmerapp.internal`;
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password: password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!data.user) {
        throw new Error('No user data returned from login.');
      }

      // 2. Query custom user role from public.users table
      const { data: profile, error: dbError } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (dbError || !profile) {
        throw new Error('Failed to retrieve user profile or role mapping.');
      }

      const role = profile.role;
      let finalRole = role;

      // Check if user has a staff row mapping
      const { data: staffMapping } = await supabase
        .from('staff')
        .select('centre_id')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (staffMapping?.centre_id) {
        finalRole = 'staff';
      }

      // Cache session details in localStorage for seamless offline usage
      localStorage.setItem(
        CACHED_PROFILE_KEY,
        JSON.stringify({
          userId: data.user.id,
          role: finalRole,
          email: data.user.email,
          mobile: formattedPhone,
          updatedAt: new Date().toISOString(),
        })
      );

      // 3. Redirect to correct panel
      if (finalRole === 'admin') {
        navigate('/admin');
        return;
      }

      if (staffMapping?.centre_id) {
        const { data: centreData } = await supabase
          .from('procurement_centres')
          .select('approval_status')
          .eq('id', staffMapping.centre_id)
          .single();

        if (centreData?.approval_status === 'pending') {
          navigate('/centre/pending');
        } else if (centreData?.approval_status === 'rejected') {
          navigate('/centre/rejected');
        } else {
          navigate('/centre');
        }
      } else {
        navigate('/farmer');
      }
    } catch (err: any) {
      if (!navigator.onLine || err.message?.includes('Failed to fetch')) {
        setError('Network offline. Failed to connect to server. Please check internet connectivity.');
      } else {
        setError(err.message || 'An error occurred during authentication.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 p-3 sm:p-8 items-center justify-center">
      <div className="w-full max-w-6xl bg-white flex rounded-2xl sm:rounded-[2rem] shadow-2xl shadow-emerald-900/5 border border-emerald-200 overflow-hidden min-h-0 sm:min-h-[700px]">
        
        {/* Left Decorative Panel (Hidden on Mobile) */}
        <div className="hidden lg:flex lg:w-1/2 bg-emerald-900 text-white flex-col p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-emerald-800/30 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 rounded-full bg-emerald-950/40 blur-2xl"></div>

          <div className="relative z-10">
            <Link to="/" className="flex items-center gap-2 group mb-12 inline-flex">
              <div className="p-2 bg-white rounded-xl text-emerald-900 group-hover:scale-105 transition-all duration-300 shadow-xl">
                <Sprout className="w-8 h-8" />
              </div>
              <span className="font-extrabold text-2xl tracking-tight">
                KisaanSetu
              </span>
            </Link>

            <div className="space-y-4 max-w-md">
              <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
                {t('landing.hero_title')}
              </h1>
              <p className="text-lg text-emerald-100/90 font-medium leading-relaxed">
                {t('landing.hero_subtitle')}
              </p>
            </div>
          </div>
          
          <div className="relative z-10 flex justify-center items-center flex-1 mt-8 w-full">
            <svg width="320" height="240" viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="max-w-full h-auto drop-shadow-2xl">
              <circle cx="260" cy="60" r="30" fill="#D97706" fillOpacity="0.8" />
              <path d="M0 200C80 170 160 210 320 180V240H0V200Z" fill="#FCD34D" fillOpacity="0.4" />
              <path d="M0 220C120 190 200 230 320 200V240H0V220Z" fill="#F59E0B" fillOpacity="0.3" />
              <circle cx="100" cy="110" r="14" fill="#FCD34D" />
              <path d="M75 100C90 85 110 85 125 100L115 110C105 100 95 100 85 110L75 100Z" fill="#D97706" />
              <path d="M70 220C70 190 85 150 100 130C115 150 130 190 130 220H70Z" fill="#FCD34D" />
            </svg>
          </div>
        </div>

      {/* Right Form Panel */}
      <div className="w-full lg:w-1/2 flex flex-col p-5 sm:p-12 overflow-y-auto justify-center">
        <div className="w-full max-w-md mx-auto space-y-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors py-1">
            <ArrowLeft className="w-4 h-4" />
            {t('auth.back_to_home')}
          </Link>

          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-sans">{t('auth.sign_in')}</h2>
          </div>

          {/* Offline Banner & Cached Session Prompt */}
          {isOffline && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 space-y-3">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <WifiOff className="w-5 h-5 text-amber-600 shrink-0" />
                <span>Offline Mode Active</span>
              </div>
              <p className="text-xs text-amber-700 leading-relaxed">
                Initial login requires internet connection. However, if you have logged in on this device before, your session can be restored.
              </p>
              {cachedSession && (
                <button
                  type="button"
                  onClick={handleContinueOffline}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-sm transition-colors shadow-sm"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Continue Offline ({cachedSession.role.toUpperCase()})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="mobile" className="block text-sm font-semibold text-slate-700 mb-1">
                  {t('auth.mobile')}
                </label>
                <input
                  id="mobile"
                  name="mobile"
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="appearance-none rounded-xl relative block w-full px-4 py-3 min-h-[48px] border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base sm:text-sm transition-all"
                  placeholder="e.g. 9876543210"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1">
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none rounded-xl relative block w-full px-4 py-3 min-h-[48px] pr-12 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base sm:text-sm transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 w-12 flex items-center justify-center text-slate-400 hover:text-emerald-600 focus:outline-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center items-center py-3.5 min-h-[48px] px-4 border border-transparent text-base sm:text-sm font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-md shadow-emerald-600/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <Loader className="w-5 h-5 animate-spin text-white" />
                ) : (
                  t('auth.sign_in_btn')
                )}
              </button>
            </div>

            <p className="text-center text-sm text-slate-600">
              {t('auth.no_account', "Don't have an account?")}{' '}
              <Link
                to="/register"
                className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
              >
                {t('auth.create_account', 'Create an account')}
              </Link>
            </p>
          </form>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Login;
