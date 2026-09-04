import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Building, Wheat,
  AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Loader,
  Navigation, Layers, Compass, Calendar, Scale, Check
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import { useCascadingGeo } from '../../hooks/useCascadingGeo';
import { DashboardBackground } from '../../components/DashboardBackground';

interface Centre {
  id: string;
  name: string;
  owner_name: string;
  block_code: number;
  daily_capacity: number;
  status: 'open' | 'closed';
  geo_blocks?: {
    block_name: string;
    district_name: string;
    state_name: string;
  };
  latitude?: number;
  longitude?: number;
  distanceKm?: number;
}

interface Product {
  id: string;
  product_name: string;
  max_quantity_per_farmer: number;
}

interface BookingDate {
  id: string;
  date: string;
  capacity: number;
  booked_count: number;
  status: 'open' | 'full' | 'closed';
}

const BookAppointment: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<any>(null);
  const { t } = useTranslation();
  // Geo Selection Hook
  const {
    statesList,
    districtsList,
    blocksList,
    selectedStateCode,
    setSelectedStateCode,
    selectedDistrictCode,
    setSelectedDistrictCode,
    selectedBlockCode,
    setSelectedBlockCode,
    error: geoError
  } = useCascadingGeo();

  // Data lists
  const [filteredCentres, setFilteredCentres] = useState<Centre[]>([]);
  const [nearestCentres, setNearestCentres] = useState<Centre[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dates, setDates] = useState<BookingDate[]>([]);

  // Location states
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<'gps' | 'manual'>('gps');

  // Selection states
  const [selectedCentre, setSelectedCentre] = useState<Centre | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedDate, setSelectedDate] = useState<BookingDate | null>(null);
  const [quantity, setQuantity] = useState('');

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [qtyError, setQtyError] = useState<string | null>(null);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);

  // Fetch session at mount
  useEffect(() => {
    const initBookingFlow = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          navigate('/login');
          return;
        }
        setSession(session);
      } catch {
        setError('Failed to load user session.');
      } finally {
        setLoading(false);
      }
    };
    initBookingFlow();
  }, [navigate]);

  // Handle geoError
  useEffect(() => {
    if (geoError) setError(geoError);
  }, [geoError]);

  // Fetch matching centers when block selected
  useEffect(() => {
    const fetchCentres = async () => {
      if (!selectedBlockCode) {
        setFilteredCentres([]);
        setSelectedCentre(null);
        return;
      }
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('procurement_centres')
          .select('*, geo_blocks(*)')
          .eq('block_code', parseInt(selectedBlockCode));
        if (error) throw error;
        setFilteredCentres(data || []);
        setSelectedCentre(null);
      } catch {
        setError('Failed to initialize session.');
      } finally {
        setLoading(false);
      }
    };
    fetchCentres();
  }, [selectedBlockCode]);

  // Fetch products and dates for selected centre
  useEffect(() => {
    const fetchCentreDetails = async () => {
      if (!selectedCentre) return;
      try {
        setLoading(true);
        setError(null);

        // Query Products
        const { data: prodData, error: prodErr } = await supabase
          .from('centre_products')
          .select('*')
          .eq('centre_id', selectedCentre.id);

        if (prodErr) throw new Error(prodErr.message);
        setProducts(prodData || []);

        // Query Slots (dates in future or today, filter out closed)
        const todayStr = new Date().toISOString().split('T')[0];
        const { data: dateData, error: dateErr } = await supabase
          .from('booking_dates')
          .select('*')
          .eq('centre_id', selectedCentre.id)
          .gte('date', todayStr)
          .neq('status', 'closed')
          .order('date', { ascending: true });

        if (dateErr) throw new Error(dateErr.message);
        setDates(dateData || []);

        // Clear previous steps selections
        setSelectedProduct(null);
        setSelectedDate(null);
        setQuantity('');
      } catch (err: any) {
        console.error('Error fetching centre details:', err);
        setError(err.message || 'Failed to retrieve crop/slots for this centre.');
      } finally {
        setLoading(false);
      }
    };
    fetchCentreDetails();
  }, [selectedCentre]);

  // Haversine formula for distance
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleEnableLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      setSearchMode('manual');
      return;
    }
    setLocationLoading(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        try {
          const { data, error } = await supabase
            .from('procurement_centres')
            .select('*, geo_blocks(*)')
            .eq('approval_status', 'approved')
            .not('latitude', 'is', null)
            .not('longitude', 'is', null);

          if (error) throw error;

          if (data) {
            const withDistances = data.map(c => ({
              ...c,
              distanceKm: calculateDistance(latitude, longitude, c.latitude, c.longitude)
            }));
            withDistances.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
            setNearestCentres(withDistances);
            setSearchMode('gps');
            setStep(2);
          }
        } catch {
          setLocationError('Failed to fetch nearest centres.');
          setSearchMode('manual');
        } finally {
          setLocationLoading(false);
        }
      },
      () => {
        setLocationError('Unable to retrieve your location. Please check your permissions.');
        setLocationLoading(false);
        setSearchMode('manual');
      },
      { enableHighAccuracy: true }
    );
  };

  // Real-time crop weight limits check
  const handleQtyChange = (val: string) => {
    setQuantity(val);
    setQtyError(null);
    if (!selectedProduct) return;

    const parsedQty = parseFloat(val);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setQtyError('Please enter a valid weight quantity.');
    } else if (parsedQty > selectedProduct.max_quantity_per_farmer) {
      setQtyError(
        `Quantity exceeds the center's maximum limit of ${selectedProduct.max_quantity_per_farmer} kg for this crop.`
      );
    }
  };

  // Submit Booking Transaction
  const handleConfirmBooking = async () => {
    if (!session?.user || !selectedCentre || !selectedDate || !selectedProduct || !quantity) return;
    setLoading(true);
    setError(null);

    const parsedQty = parseFloat(quantity);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setQtyError('Enter a valid weight quantity.');
      setLoading(false);
      return;
    }

    try {
      // Call Supabase RPC transaction function
      const { data, error: rpcErr } = await supabase.rpc('create_farmer_booking', {
        p_farmer_id: session.user.id,
        p_centre_id: selectedCentre.id,
        p_booking_date_id: selectedDate.id,
        p_product_name: selectedProduct.product_name,
        p_quantity: parsedQty,
      });

      if (rpcErr) {
        throw new Error(rpcErr.message);
      }

      const result = data as any;
      if (result.success) {
        setGeneratedToken(result.token);
        setStep(5); // Show token receipt screen
      } else {
        throw new Error('An unexpected transaction error occurred.');
      }
    } catch (err: any) {
      console.error('Booking confirmation failed:', err);
      setError(err.message || 'Failed to confirm booking. Slots may have closed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 relative z-0 min-h-[calc(100vh-8rem)]">
      <DashboardBackground variant="farmer" />

      {/* Header Back CTA */}
      {step < 5 && (
        <button
          onClick={() => {
            if (step > 1) {
              setStep(step - 1);
            } else {
              navigate('/farmer');
            }
          }}
          aria-label={step === 1 ? t('booking.back_dashboard') : t('booking.back_prev')}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>{step === 1 ? t('booking.back_dashboard') : t('booking.back_prev')}</span>
        </button>
      )}

      {/* Progress Stepper Banner */}
      {step < 5 && (
        <div className="bg-white rounded-2xl border border-emerald-200/90 p-4 sm:p-6 shadow-sm shadow-emerald-950/5 space-y-4 sm:space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 shadow-xs">
                  {t('booking.step_of', { step })} • In Progress
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1.5 tracking-tight">
                {step === 1 && t('booking.step_1_title')}
                {step === 2 && t('booking.step_2_title')}
                {step === 3 && t('booking.step_3_title')}
                {step === 4 && t('booking.step_4_title')}
              </h1>
            </div>

            {/* Stepper Step Badges (Location -> Depot -> Details -> Confirm) */}
            <div className="flex items-center gap-1 sm:gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
              {[
                { num: 1, label: 'Location', icon: MapPin },
                { num: 2, label: 'Depot', icon: Building },
                { num: 3, label: 'Details', icon: Calendar },
                { num: 4, label: 'Confirm', icon: CheckCircle2 }
              ].map((s, idx) => {
                const isDone = step > s.num;
                const isCurrent = step === s.num;
                const Icon = s.icon;
                return (
                  <React.Fragment key={s.num}>
                    {idx > 0 && (
                      <div className={`h-0.5 w-4 sm:w-6 transition-colors ${step > s.num ? 'bg-emerald-500' : isCurrent ? 'bg-amber-400' : 'bg-slate-200'
                        }`} />
                    )}
                    <div className="flex flex-col items-center gap-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${isDone
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : isCurrent
                            ? 'bg-amber-500 text-white ring-4 ring-amber-100 shadow-sm font-extrabold'
                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                        }`}>
                        {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : <Icon className="w-3.5 h-3.5" />}
                      </div>
                      <span className={`text-[10px] font-bold tracking-tight hidden sm:block ${isDone ? 'text-emerald-700' : isCurrent ? 'text-amber-700 font-extrabold' : 'text-slate-400'
                        }`}>
                        {s.label}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Thicker Amber Progress Bar */}
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/60 p-0.5">
            <div
              className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-500 h-full rounded-full transition-all duration-500 ease-out shadow-xs"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* WIZARD CONTAINER */}
      <div className="bg-white rounded-2xl border border-emerald-200/90 p-4 sm:p-6 md:p-8 shadow-sm shadow-emerald-950/5">
        {loading && step < 4 && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader className="w-8 h-8 animate-spin text-emerald-600" />
            <p className="text-slate-400 font-semibold text-sm">Fetching live details...</p>
          </div>
        )}

        {/* STEP 1: CASCADING LOCATION DROPDOWNS */}
        {!loading && step === 1 && (
          <div className="space-y-6">
            {/* Search Mode Toggle (Two Distinct Large Cards) */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                Choose Discovery Method
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Option 1: GPS */}
                <button
                  type="button"
                  onClick={() => setSearchMode('gps')}
                  className={`p-4 sm:p-5 rounded-2xl border-2 text-left flex items-start gap-3 sm:gap-4 transition-all duration-200 cursor-pointer ${searchMode === 'gps'
                      ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-md'
                      : 'border-emerald-200/70 hover:border-emerald-400 bg-white hover:bg-slate-50/60 shadow-sm'
                    }`}
                >
                  <div className={`p-2.5 sm:p-3 rounded-xl shrink-0 transition-colors ${searchMode === 'gps' ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30' : 'bg-slate-100 text-slate-500'
                    }`}>
                    <Navigation className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-extrabold text-slate-900 text-sm sm:text-base">Use My Location</p>
                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${searchMode === 'gps' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                        }`}>
                        {searchMode === 'gps' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Auto-detect nearest depots instantly with road distance calculation.
                    </p>
                  </div>
                </button>

                {/* Option 2: Manual Hierarchy */}
                <button
                  type="button"
                  onClick={() => setSearchMode('manual')}
                  className={`p-4 sm:p-5 rounded-2xl border-2 text-left flex items-start gap-3 sm:gap-4 transition-all duration-200 cursor-pointer ${searchMode === 'manual'
                      ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-md'
                      : 'border-emerald-200/70 hover:border-emerald-400 bg-white hover:bg-slate-50/60 shadow-sm'
                    }`}
                >
                  <div className={`p-2.5 sm:p-3 rounded-xl shrink-0 transition-colors ${searchMode === 'manual' ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30' : 'bg-slate-100 text-slate-500'
                    }`}>
                    <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-extrabold text-slate-900 text-sm sm:text-base">Select Manually</p>
                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${searchMode === 'manual' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                        }`}>
                        {searchMode === 'manual' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Browse depots through State, District, and Block administrative filters.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {searchMode === 'gps' ? (
              <div className="p-6 sm:p-8 bg-gradient-to-b from-emerald-50/60 to-emerald-50/20 rounded-2xl border border-emerald-200/80 text-center space-y-4 max-w-md mx-auto shadow-sm">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                  <MapPin className="w-7 h-7 sm:w-8 sm:h-8 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-emerald-950">Find Nearest Centres</h3>
                  <p className="text-xs sm:text-sm text-emerald-700 mt-1.5 leading-relaxed">
                    Allow device location access to instantly find approved procurement centres closest to you.
                  </p>
                </div>
                {locationError && (
                  <div className="text-xs text-red-600 font-bold bg-red-50 p-2.5 rounded-xl border border-red-200 flex items-center justify-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{locationError}</span>
                  </div>
                )}
                <button
                  onClick={handleEnableLocation}
                  disabled={locationLoading}
                  className="w-full mt-4 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  {locationLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                  {locationLoading ? 'Locating Your Farm...' : 'Enable Location & Search'}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200/70 flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-xs sm:text-sm text-slate-600">
                    {t('booking.location_desc')}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                  {/* State */}
                  <div>
                    <label htmlFor="state-select" className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200/60 shadow-xs">
                        <MapPin className="w-3 h-3" />
                      </span>
                      {t('booking.state')}
                    </label>
                    <select
                      id="state-select"
                      value={selectedStateCode}
                      onChange={(e) => {
                        setSelectedStateCode(e.target.value);
                        setSelectedDistrictCode('');
                        setSelectedBlockCode('');
                      }}
                      className="block w-full rounded-xl border border-emerald-200/80 py-3 px-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 sm:text-sm bg-white shadow-sm hover:border-emerald-300 transition-all font-medium"
                    >
                      <option value="">{t('booking.select_state')}</option>
                      {statesList.map((s) => (
                        <option key={s.state_code} value={s.state_code}>{s.state_name}</option>
                      ))}
                    </select>
                  </div>

                  {/* District */}
                  <div>
                    <label htmlFor="district-select" className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-teal-50 text-teal-600 border border-teal-200/60 shadow-xs">
                        <Compass className="w-3 h-3" />
                      </span>
                      {t('booking.district')}
                    </label>
                    <select
                      id="district-select"
                      value={selectedDistrictCode}
                      onChange={(e) => {
                        setSelectedDistrictCode(e.target.value);
                        setSelectedBlockCode('');
                      }}
                      disabled={!selectedStateCode}
                      className="block w-full rounded-xl border border-emerald-200/80 py-3 px-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 sm:text-sm disabled:opacity-50 disabled:bg-slate-50 bg-white shadow-sm hover:border-emerald-300 transition-all font-medium disabled:cursor-not-allowed"
                    >
                      <option value="">{t('booking.select_district')}</option>
                      {districtsList.map((d) => (
                        <option key={d.district_code} value={d.district_code}>{d.district_name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Block */}
                  <div>
                    <label htmlFor="block-select" className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-amber-50 text-amber-600 border border-amber-200/60 shadow-xs">
                        <Building className="w-3 h-3" />
                      </span>
                      {t('booking.block')}
                    </label>
                    <select
                      id="block-select"
                      value={selectedBlockCode}
                      onChange={(e) => setSelectedBlockCode(e.target.value)}
                      disabled={!selectedDistrictCode}
                      className="block w-full rounded-xl border border-emerald-200/80 py-3 px-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 sm:text-sm disabled:opacity-50 disabled:bg-slate-50 bg-white shadow-sm hover:border-emerald-300 transition-all font-medium disabled:cursor-not-allowed"
                    >
                      <option value="">{t('booking.select_block')}</option>
                      {blocksList.map((b) => (
                        <option key={b.block_code} value={b.block_code}>{b.block_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setStep(2)}
                    disabled={!selectedStateCode || !selectedDistrictCode || !selectedBlockCode}
                    aria-label={t('booking.find_centres')}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer text-sm"
                  >
                    {t('booking.find_centres')}
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: DEPOT SELECTION */}
        {!loading && step === 2 && (
          <div className="space-y-6">
            
            {/* Search Header and Mode Switch */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-emerald-50/40 p-4 rounded-xl border border-emerald-200/70 gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">
                  {searchMode === 'gps' ? <Navigation className="w-5 h-5" /> : <Building className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">
                    {searchMode === 'gps' ? 'Nearest Depots to Your Location' : 'Centres in Selected Block'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {searchMode === 'gps'
                      ? 'Sorted by computed road proximity to your device GPS coordinates'
                      : `Block: ${blocksList.find(b => b.block_code === parseInt(selectedBlockCode))?.block_name || 'N/A'}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSearchMode(searchMode === 'gps' ? 'manual' : 'gps');
                  setStep(1);
                }}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200/80 transition-colors shrink-0 cursor-pointer shadow-xs"
              >
                {searchMode === 'gps' ? 'Switch to Manual Selection' : 'Switch to GPS Nearby'}
              </button>
            </div>

            {/* Display Centres */}
            {(() => {
              const displayCentres = searchMode === 'gps' ? nearestCentres.slice(0, 4) : filteredCentres;

              if (displayCentres.length === 0) {
                return (
                  <div className="text-center py-12 px-6 space-y-4 bg-gradient-to-b from-red-50/60 to-red-50/20 rounded-2xl border border-red-200/80 shadow-sm max-w-md mx-auto">
                    <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                      <AlertCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-red-950 font-bold text-lg">
                        No Procurement Centres Found
                      </h3>
                      <p className="text-red-700/80 text-xs font-medium mt-1 leading-relaxed">
                        {searchMode === 'gps'
                          ? 'We could not find any active procurement centres with registered coordinates near your device location.'
                          : `No active procurement centres registered in ${blocksList.find(b => b.block_code === parseInt(selectedBlockCode))?.block_name || 'the selected block'}.`
                        }
                      </p>
                    </div>
                    <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                      <button
                        onClick={() => setStep(1)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                      >
                        {searchMode === 'gps' ? 'Try Selecting Manually' : t('booking.mod_filters')}
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {displayCentres.map((centre) => {
                      const isOpen = centre.status === 'open';
                      const dist = centre.distanceKm !== undefined ? centre.distanceKm : (userLocation && centre.latitude && centre.longitude
                        ? calculateDistance(userLocation.lat, userLocation.lng, centre.latitude, centre.longitude)
                        : null);

                      const isSelected = selectedCentre?.id === centre.id;

                      return (
                        <button
                          key={`${searchMode}-${centre.id}`}
                          onClick={() => isOpen && setSelectedCentre(centre)}
                          disabled={!isOpen}
                          aria-label={`Select ${centre.name}`}
                          className={`relative overflow-hidden p-5 sm:p-6 rounded-2xl border-2 text-left transition-all duration-200 w-full cursor-pointer ${!isOpen
                              ? 'opacity-60 bg-slate-50 border-slate-200 cursor-not-allowed'
                              : isSelected
                                ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-md'
                                : 'border-emerald-200/80 hover:border-emerald-400 bg-white shadow-sm'
                            }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex flex-col min-w-0">
                              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg leading-snug">{centre.name}</h3>
                              {dist !== null && (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 mt-1.5 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-md w-max shadow-xs">
                                  <MapPin className="w-3 h-3 text-emerald-600" />
                                  {dist.toFixed(1)} km away
                                </span>
                              )}
                            </div>
                            <div className="shrink-0">
                              {isOpen ? (
                                <div className={`p-2 rounded-xl transition-colors ${isSelected ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                  <Building className="w-5 h-5" />
                                </div>
                              ) : (
                                <span className="bg-red-100 text-red-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider border border-red-200">
                                  Closed
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 mt-2 font-medium">{t('booking.in_charge', { name: centre.owner_name })}</p>

                          <div className="mt-4 pt-3.5 border-t border-slate-100 flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-medium">{t('booking.daily_limit')}</span>
                            <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                              {centre.daily_capacity} {t('booking.slots')}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Guidance Tip Box */}
                  <div className="p-4 rounded-xl bg-slate-50/80 border border-emerald-200/70 flex items-start gap-3 text-xs text-slate-600">
                    <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-200/60 shrink-0 mt-0.5">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">Depot Intake Guidelines</p>
                      <p className="text-slate-500 mt-0.5 leading-relaxed">
                        Depot capacities are capped per day for quality assurance. Choose a centre nearest to your transport route, then choose your harvest crop on the next step.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => setStep(3)}
                      disabled={!selectedCentre}
                      aria-label={t('booking.select_products')}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer text-sm"
                    >
                      {t('booking.select_products')}
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* STEP 3: CROP & CALENDAR DATE SELECTION */}
        {!loading && step === 3 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              {/* Product Select */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200/60 shadow-xs">
                    <Wheat className="w-3 h-3" />
                  </span>
                  {t('booking.select_crop')}
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  {products.length === 0 ? (
                    <p className="text-xs text-slate-400 p-4 border border-dashed border-slate-200 rounded-xl text-center">{t('booking.no_crops')}</p>
                  ) : (
                    products.map((prod) => {
                      const isSelected = selectedProduct?.id === prod.id;
                      return (
                        <button
                          key={prod.id}
                          onClick={() => setSelectedProduct(prod)}
                          aria-label={`Select ${prod.product_name}`}
                          className={`p-4 rounded-xl border-2 text-left cursor-pointer transition-all duration-200 w-full ${isSelected
                              ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-sm'
                              : 'border-emerald-200/80 hover:border-emerald-400 bg-white shadow-xs'
                            }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-slate-900">{prod.product_name}</span>
                            <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                              <Wheat className="w-4 h-4" />
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 font-medium">{t('booking.max_cap', { qty: prod.max_quantity_per_farmer.toLocaleString() })}</p>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Date Select */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-amber-50 text-amber-600 border border-amber-200/60 shadow-xs">
                    <Calendar className="w-3 h-3" />
                  </span>
                  {t('booking.select_slot')}
                </label>
                <div className="max-h-72 overflow-y-auto border border-emerald-200/80 rounded-xl divide-y divide-slate-100 p-2 space-y-1.5 bg-slate-50/50">
                  {dates.length === 0 ? (
                    <p className="text-xs text-slate-400 p-6 text-center">{t('booking.no_slots')}</p>
                  ) : (
                    dates.map((dateSlot) => {
                      const isFull = dateSlot.status === 'full' || dateSlot.booked_count >= dateSlot.capacity;
                      const displayDate = new Date(dateSlot.date).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short'
                      });
                      const isSelected = selectedDate?.id === dateSlot.id;

                      return (
                        <button
                          key={dateSlot.id}
                          onClick={() => {
                            if (!isFull) setSelectedDate(dateSlot);
                          }}
                          disabled={isFull}
                          aria-label={`Select date ${displayDate}`}
                          className={`p-3.5 rounded-xl w-full text-left transition-all duration-200 flex justify-between items-center ${isFull
                              ? 'opacity-45 cursor-not-allowed bg-slate-100/60'
                              : isSelected
                                ? 'bg-emerald-50/60 border-2 border-emerald-500 ring-1 ring-emerald-500/20 shadow-xs'
                                : 'bg-white hover:bg-slate-50/80 border border-emerald-200/70 shadow-xs cursor-pointer'
                            }`}
                        >
                          <div>
                            <span className="font-bold text-slate-900 text-sm">{displayDate}</span>
                            <span className="text-xs text-slate-500 block mt-0.5 font-medium">
                              {t('booking.booked_fraction', { booked: dateSlot.booked_count, total: dateSlot.capacity })}
                            </span>
                          </div>
                          <div>
                            {isFull ? (
                              <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase bg-red-50 text-red-700 border border-red-200 shadow-xs">{t('booking.full')}</span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">{t('booking.open')}</span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(4)}
                disabled={!selectedProduct || !selectedDate}
                aria-label={t('booking.proceed_summary')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer text-sm"
              >
                {t('booking.proceed_summary')}
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: QUANTITY INPUT & CONFIRM SUMMARY */}
        {!loading && step === 4 && selectedCentre && selectedProduct && selectedDate && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Summary Block */}
              <div className="md:col-span-2 space-y-4 md:border-r border-slate-100 pr-0 md:pr-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-lg">{t('booking.summary_title')}</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-emerald-200/80">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      {t('booking.depot_name')}
                    </span>
                    <span className="font-extrabold text-slate-900 block text-base">{selectedCentre.name}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {t('booking.dropoff_date')}
                    </span>
                    <span className="font-extrabold text-slate-900 block text-base">
                      {new Date(selectedDate.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="space-y-1 pt-2 border-t border-slate-200/50">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Wheat className="w-3.5 h-3.5 text-slate-400" />
                      {t('booking.crop_type')}
                    </span>
                    <span className="font-extrabold text-slate-900 block text-base">{selectedProduct.product_name}</span>
                  </div>
                  <div className="space-y-1 pt-2 border-t border-slate-200/50">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {t('booking.center_location')}
                    </span>
                    <span className="font-semibold text-slate-800 block text-sm">
                      {selectedCentre.geo_blocks?.block_name}, {selectedCentre.geo_blocks?.district_name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Crop Weight input */}
              <div className="space-y-4">
                <div>
                  <label htmlFor="weight-input" className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-amber-50 text-amber-600 border border-amber-200/60 shadow-xs">
                      <Scale className="w-3 h-3" />
                    </span>
                    {t('booking.est_weight')}
                  </label>
                  <div className="relative">
                    <input
                      id="weight-input"
                      type="number"
                      value={quantity}
                      onChange={(e) => handleQtyChange(e.target.value)}
                      placeholder="e.g. 1500"
                      className={`block w-full rounded-xl border py-3.5 pl-4 pr-12 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 sm:text-sm shadow-sm transition-all ${qtyError ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-emerald-200/80'
                        }`}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 text-sm font-bold">
                      {t('booking.kg')}
                    </div>
                  </div>
                  {qtyError && (
                    <p className="text-xs text-red-600 font-bold mt-1.5 flex items-start gap-1">
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>{qtyError}</span>
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                    {t('booking.msp_limit', { qty: selectedProduct.max_quantity_per_farmer.toLocaleString() })}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end">
              <button
                onClick={handleConfirmBooking}
                disabled={!quantity || !!qtyError || loading}
                aria-label={t('booking.confirm_gen')}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/25 disabled:opacity-50 transition-all cursor-pointer text-sm w-full md:w-auto"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    {t('booking.completing_tx')}
                  </>
                ) : (
                  t('booking.confirm_gen')
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: TOKEN GENERATION CONFIRMATION */}
        {step === 5 && generatedToken && selectedCentre && selectedProduct && selectedDate && (
          <div className="py-8 text-center space-y-6 max-w-md mx-auto">
            <div className="flex justify-center">
              <div className="p-4 bg-emerald-100 text-emerald-600 rounded-full animate-bounce shadow-sm">
                <CheckCircle2 className="w-16 h-16" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold text-slate-900">{t('booking.confirmed')}</h2>
              <p className="text-slate-500 text-sm">
                {t('booking.confirmed_desc')}
              </p>
            </div>

            {/* Token display Card */}
            <div className="bg-slate-50 border border-emerald-200/80 rounded-2xl p-6 shadow-inner space-y-3 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-emerald-600"></div>
              <p className="text-xs uppercase tracking-widest text-slate-400 font-extrabold">{t('booking.token_code')}</p>
              <p className="text-4xl font-black text-slate-900 tracking-tight">{generatedToken}</p>
              <div className="border-t border-dashed border-slate-200 pt-4 mt-2 text-xs text-left grid grid-cols-2 gap-2 text-slate-600">
                <p><strong>{t('booking.depot_name')}:</strong> {selectedCentre.name}</p>
                <p><strong>{t('booking.dropoff_date')}:</strong> {selectedDate.date}</p>
                <p><strong>{t('booking.crop_type')}:</strong> {selectedProduct.product_name}</p>
                <p><strong>{t('dashboard.weight')}:</strong> {quantity} {t('booking.kg')}</p>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={() => navigate('/farmer')}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-md text-sm cursor-pointer"
              >
                {t('booking.go_dashboard')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookAppointment;
