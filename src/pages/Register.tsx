import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Sprout, AlertCircle, CheckCircle2, Loader, ArrowLeft, Building2, Shield, Eye, EyeOff, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import { useCascadingGeo } from '../hooks/useCascadingGeo';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') || 'farmer';
  const [role, setRole] = useState<'farmer' | 'staff'>(initialRole as 'farmer' | 'staff');

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [centreName, setCentreName] = useState('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const { t, i18n } = useTranslation();

  // Geo Selection Hook for Centre Staff
  const {
    statesList,
    districtsList,
    blocksList,
    selectedStateCode,
    setSelectedStateCode,
    selectedDistrictCode,
    setSelectedDistrictCode,
    selectedBlockCode,
    setSelectedBlockCode
  } = useCascadingGeo();

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setLoading(false);
      },
      () => {
        setError('Unable to retrieve your location. Please enter manually.');
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

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
      const internalEmail = `${formattedPhone.replace('+', '')}@farmerapp.internal`;

      // 1. Sign up the user with Supabase Auth, mapping metadata
      // NOTE: Even for staff, we create with 'farmer' role in auth metadata.
      // The staff table linkage + approval status is what grants staff access.
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: internalEmail,
        password: password,
        options: {
          data: {
            name: name.trim(),
            role: 'farmer', // Force farmer role as harmless default
            preferred_language: i18n.language || 'en',
            mobile_number: formattedPhone,
          },
        },
      });

      if (authError) throw new Error(authError.message);
      if (!authData.user) throw new Error('User creation failed.');

      if (role === 'staff') {
        // Sign in immediately to get a valid session for RLS on insert
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: internalEmail,
          password: password,
        });

        if (signInErr) throw new Error('Could not sign in to complete registration.');

        // Insert new procurement centre (pending approval)
        const today = new Date();
        const nextYear = new Date();
        nextYear.setFullYear(today.getFullYear() + 1);

        const { data: centreData, error: centreErr } = await supabase
          .from('procurement_centres')
          .insert({
            name: centreName.trim(),
            owner_name: name.trim(),
            owner_user_id: authData.user.id,
            block_code: parseInt(selectedBlockCode),
            latitude: latitude ? parseFloat(latitude) : null,
            longitude: longitude ? parseFloat(longitude) : null,
            status: 'closed',
            approval_status: 'pending',
            daily_capacity: 0,
            booking_window_start: today.toISOString().split('T')[0],
            booking_window_end: nextYear.toISOString().split('T')[0],
            cancellation_window_hours: 24
          })
          .select()
          .single();

        if (centreErr) throw new Error(`Failed to create centre: ${centreErr.message}`);

        // Insert staff linkage
        const { error: staffErr } = await supabase
          .from('staff')
          .insert({
            user_id: authData.user.id,
            centre_id: centreData.id
          });

        if (staffErr) throw new Error(`Failed to link staff account: ${staffErr.message}`);

        // Sign out again so they must explicitly log in
        await supabase.auth.signOut();
      }

      setSuccess(true);

      // Auto-redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 p-4 sm:p-8 items-center justify-center">
      <div className="w-full max-w-6xl bg-white flex rounded-[2rem] shadow-2xl shadow-emerald-900/5 border border-emerald-200 overflow-hidden min-h-[700px]">

        {/* Left Decorative Panel (Hidden on Mobile) */}
        <div className="hidden lg:flex lg:w-1/2 bg-emerald-900 text-white flex-col p-12 relative overflow-hidden">
          {/* Abstract background shapes */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-emerald-800/30 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 rounded-full bg-emerald-950/40 blur-2xl"></div>

          <div className="relative z-10">
            <Link to="/" className="flex items-center gap-2 group mb-12 inline-flex">
              <div className="p-2 bg-white rounded-xl text-emerald-900 group-hover:scale-105 transition-all duration-300 shadow-xl">
                <Sprout className="w-8 h-8" />
              </div>
              <span className="font-extrabold text-2xl tracking-tight">
                AgriProcure
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

          {/* Minimal SVG Illustration */}
          <div className="relative z-10 flex justify-center items-center flex-1 mt-8 w-full">
            <svg width="320" height="240" viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="max-w-full h-auto drop-shadow-2xl">
              {/* Sun */}
              <circle cx="260" cy="60" r="30" fill="#D97706" fillOpacity="0.8" />
              {/* Abstract Fields */}
              <path d="M0 200C80 170 160 210 320 180V240H0V200Z" fill="#FCD34D" fillOpacity="0.4" />
              <path d="M0 220C120 190 200 230 320 200V240H0V220Z" fill="#F59E0B" fillOpacity="0.3" />
              {/* Minimal Farmer */}
              <circle cx="100" cy="110" r="14" fill="#FCD34D" />
              <path d="M75 100C90 85 110 85 125 100L115 110C105 100 95 100 85 110L75 100Z" fill="#D97706" />
              <path d="M70 220C70 190 85 150 100 130C115 150 130 190 130 220H70Z" fill="#FCD34D" />
            </svg>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="w-full lg:w-1/2 flex flex-col p-6 sm:p-12 overflow-y-auto">
          <div className="w-full max-w-md mx-auto space-y-8">
            <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>

            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 font-sans">{t('auth.create_account')}</h2>
              <p className="mt-2 text-sm text-slate-600">
                {t('auth.already_have')} {' '}
                <Link to="/login" className="font-semibold text-emerald-600 hover:text-emerald-500 hover:underline">
                  {t('auth.sign_in_here')}
                </Link>
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  {role === 'staff' ? (
                    <>
                      <p className="font-semibold">Registration submitted!</p>
                      <p className="mt-0.5 text-emerald-600">Your request to register <strong>{centreName}</strong> is awaiting admin approval. You will be able to log in once approved.</p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold">{t('auth.reg_success')}</p>
                      <p className="mt-0.5 text-emerald-600">{t('auth.redirecting')}</p>
                    </>
                  )}
                </div>
              </div>
            )}

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>

              {/* Role Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-700">{t('auth.role_select')}</label>
                <div className="grid grid-cols-1 gap-3">

                  {/* Farmer Card */}
                  <button
                    type="button"
                    onClick={() => setRole('farmer')}
                    className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${role === 'farmer'
                        ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                        : 'border-slate-200 hover:border-slate-300'
                      }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${role === 'farmer' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                      <Sprout className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Farmer</p>
                      <p className="text-xs text-slate-500 mt-0.5">{t('auth.farmer_desc')}</p>
                    </div>
                  </button>

                  {/* Centre Staff Card */}
                  <button
                    type="button"
                    onClick={() => setRole('staff')}
                    className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${role === 'staff'
                        ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                        : 'border-slate-200 hover:border-slate-300'
                      }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${role === 'staff' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Centre Staff</p>
                      <p className="text-xs text-slate-500 mt-0.5">{t('auth.staff_desc')}</p>
                    </div>
                  </button>

                  {/* Admin Card (Disabled) */}
                  <button
                    type="button"
                    disabled
                    className="p-4 rounded-xl border border-slate-100 bg-slate-50 text-left flex items-start gap-3 opacity-60 cursor-not-allowed"
                  >
                    <div className="p-2 rounded-lg shrink-0 bg-slate-200 text-slate-400">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Administrator</p>
                      <p className="text-xs text-slate-500 mt-0.5">Admin accounts are provisioned manually.</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-1">
                    {t('auth.full_name')}
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-all"
                    placeholder="Narendra Modi"
                  />
                </div>
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
                    className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-all"
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
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="appearance-none rounded-xl relative block w-full px-4 py-3 pr-12 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-all"
                      placeholder={t('auth.min_6_chars')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-emerald-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Centre Staff Extra Fields */}
              {role === 'staff' && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">Procurement Centre Details</h3>

                  <div>
                    <label htmlFor="centreName" className="block text-sm font-semibold text-slate-700 mb-1">
                      Centre Name
                    </label>
                    <input
                      id="centreName"
                      name="centreName"
                      type="text"
                      required
                      value={centreName}
                      onChange={(e) => setCentreName(e.target.value)}
                      className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-all"
                      placeholder="e.g. Rampur Depot B"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">State</label>
                    <select
                      value={selectedStateCode}
                      onChange={(e) => setSelectedStateCode(e.target.value)}
                      required
                      className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                    >
                      <option value="">Select State</option>
                      {statesList.map((state) => (
                        <option key={state.state_code} value={state.state_code}>
                          {state.state_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">District</label>
                    <select
                      value={selectedDistrictCode}
                      onChange={(e) => setSelectedDistrictCode(e.target.value)}
                      required
                      disabled={!selectedStateCode}
                      className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <option value="">{selectedStateCode ? 'Select District' : 'Select State first'}</option>
                      {districtsList.map((district) => (
                        <option key={district.district_code} value={district.district_code}>
                          {district.district_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Block</label>
                    <select
                      value={selectedBlockCode}
                      onChange={(e) => setSelectedBlockCode(e.target.value)}
                      required
                      disabled={!selectedDistrictCode}
                      className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <option value="">{selectedDistrictCode ? 'Select Block' : 'Select District first'}</option>
                      {blocksList.map((block) => (
                        <option key={block.block_code} value={block.block_code}>
                          {block.block_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-2 border-t border-slate-100 mt-2">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-semibold text-slate-700">
                        Centre Coordinates (Optional)
                      </label>
                      <button
                        type="button"
                        onClick={handleGetLocation}
                        className="text-xs font-bold text-emerald-600 flex items-center gap-1 hover:text-emerald-700"
                      >
                        <MapPin className="w-3 h-3" />
                        Use My Location
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        step="any"
                        placeholder="Latitude"
                        value={latitude}
                        onChange={(e) => setLatitude(e.target.value)}
                        className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-all"
                      />
                      <input
                        type="number"
                        step="any"
                        placeholder="Longitude"
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value)}
                        className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading || success || (role === 'staff' && (!selectedBlockCode || !centreName))}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-md shadow-emerald-600/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader className="w-5 h-5 animate-spin text-white" />
                  ) : (
                    t('auth.create_account')
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
