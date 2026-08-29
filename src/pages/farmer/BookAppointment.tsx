import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, Building, Wheat, 
  AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Loader 
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useTranslation } from 'react-i18next';

interface Centre {
  id: string;
  name: string;
  owner_name: string;
  block_code: number;
  daily_capacity: number;
  geo_blocks?: {
    block_name: string;
    district_name: string;
    state_name: string;
  };
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
  
  // Data lists
  const [statesList, setStatesList] = useState<{ state_code: number; state_name: string }[]>([]);
  const [districtsList, setDistrictsList] = useState<{ district_code: number; district_name: string; state_code: number }[]>([]);
  const [blocksList, setBlocksList] = useState<{ block_code: number; block_name: string }[]>([]);
  const [filteredCentres, setFilteredCentres] = useState<Centre[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dates, setDates] = useState<BookingDate[]>([]);

  // Selection states
  const [selectedStateCode, setSelectedStateCode] = useState('');
  const [selectedDistrictCode, setSelectedDistrictCode] = useState('');
  const [selectedBlockCode, setSelectedBlockCode] = useState('');
  const [selectedCentre, setSelectedCentre] = useState<Centre | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedDate, setSelectedDate] = useState<BookingDate | null>(null);
  const [quantity, setQuantity] = useState('');

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [qtyError, setQtyError] = useState<string | null>(null);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);

  // Fetch session and distinct states at mount
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

        const { data, error } = await supabase
          .from('distinct_states')
          .select('*')
          .order('state_name', { ascending: true });

        if (error) throw new Error(error.message);
        setStatesList(data || []);
      } catch (err: any) {
        console.error('Error initializing wizard:', err);
        setError(err.message || 'Failed to load location metadata.');
      } finally {
        setLoading(false);
      }
    };
    initBookingFlow();
  }, [navigate]);

  // Fetch districts when state selected
  useEffect(() => {
    const fetchDistricts = async () => {
      if (!selectedStateCode) {
        setDistrictsList([]);
        setBlocksList([]);
        setFilteredCentres([]);
        setSelectedCentre(null);
        return;
      }
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('distinct_districts')
          .select('*')
          .eq('state_code', parseInt(selectedStateCode))
          .order('district_name', { ascending: true });
        if (error) throw error;
        setDistrictsList(data || []);
        setBlocksList([]);
        setFilteredCentres([]);
        setSelectedCentre(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDistricts();
  }, [selectedStateCode]);

  // Fetch blocks when district selected
  useEffect(() => {
    const fetchBlocks = async () => {
      if (!selectedDistrictCode) {
        setBlocksList([]);
        setFilteredCentres([]);
        setSelectedCentre(null);
        return;
      }
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('geo_blocks')
          .select('block_code, block_name')
          .eq('district_code', parseInt(selectedDistrictCode))
          .order('block_name', { ascending: true });
        if (error) throw error;
        setBlocksList(data || []);
        setFilteredCentres([]);
        setSelectedCentre(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchBlocks();
  }, [selectedDistrictCode]);

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
          .eq('block_code', parseInt(selectedBlockCode))
          .eq('status', 'open');
        if (error) throw error;
        setFilteredCentres(data || []);
        setSelectedCentre(null);
      } catch (err: any) {
        setError(err.message);
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
    <div className="max-w-4xl mx-auto space-y-6">
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
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors font-semibold"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          {step === 1 ? t('booking.back_dashboard') : t('booking.back_prev')}
        </button>
      )}

      {/* Progress Stepper Banner */}
      {step < 5 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100/50">
              {t('booking.step_of', { step })}
            </span>
            <h1 className="text-xl font-bold text-slate-900">
              {step === 1 && t('booking.step_1_title')}
              {step === 2 && t('booking.step_2_title')}
              {step === 3 && t('booking.step_3_title')}
              {step === 4 && t('booking.step_4_title')}
            </h1>
          </div>
          {/* Stepper Progress bar */}
          <div className="w-32 bg-slate-100 h-2 rounded-full hidden sm:block overflow-hidden">
            <div 
              className="bg-emerald-600 h-full transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            ></div>
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
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        {loading && step < 4 && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader className="w-8 h-8 animate-spin text-emerald-600" />
            <p className="text-slate-400 font-semibold text-sm">Fetching live details...</p>
          </div>
        )}

        {/* STEP 1: CASCADING LOCATION DROPDOWNS */}
        {!loading && step === 1 && (
          <div className="space-y-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
              <MapPin className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm text-slate-600">
                {t('booking.location_desc')}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* State */}
              <div>
                <label htmlFor="state-select" className="block text-sm font-semibold text-slate-700 mb-2">{t('booking.state')}</label>
                <select
                  id="state-select"
                  value={selectedStateCode}
                  onChange={(e) => {
                    setSelectedStateCode(e.target.value);
                    setSelectedDistrictCode('');
                    setSelectedBlockCode('');
                  }}
                  className="block w-full rounded-xl border border-slate-300 py-3 px-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                >
                  <option value="">{t('booking.select_state')}</option>
                  {statesList.map((s) => (
                    <option key={s.state_code} value={s.state_code}>{s.state_name}</option>
                  ))}
                </select>
              </div>

              {/* District */}
              <div>
                <label htmlFor="district-select" className="block text-sm font-semibold text-slate-700 mb-2">{t('booking.district')}</label>
                <select
                  id="district-select"
                  value={selectedDistrictCode}
                  onChange={(e) => {
                    setSelectedDistrictCode(e.target.value);
                    setSelectedBlockCode('');
                  }}
                  disabled={!selectedStateCode}
                  className="block w-full rounded-xl border border-slate-300 py-3 px-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm disabled:opacity-50"
                >
                  <option value="">{t('booking.select_district')}</option>
                  {districtsList.map((d) => (
                    <option key={d.district_code} value={d.district_code}>{d.district_name}</option>
                  ))}
                </select>
              </div>

              {/* Block */}
              <div>
                <label htmlFor="block-select" className="block text-sm font-semibold text-slate-700 mb-2">{t('booking.block')}</label>
                <select
                  id="block-select"
                  value={selectedBlockCode}
                  onChange={(e) => setSelectedBlockCode(e.target.value)}
                  disabled={!selectedDistrictCode}
                  className="block w-full rounded-xl border border-slate-300 py-3 px-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm disabled:opacity-50"
                >
                  <option value="">{t('booking.select_block')}</option>
                  {blocksList.map((b) => (
                    <option key={b.block_code} value={b.block_code}>{b.block_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setStep(2)}
                disabled={!selectedStateCode || !selectedDistrictCode || !selectedBlockCode}
                aria-label={t('booking.find_centres')}
                className="inline-flex items-center gap-1.5 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50 transition-all cursor-pointer"
              >
                {t('booking.find_centres')}
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: DEPOT SELECTION */}
        {!loading && step === 2 && (
          <div className="space-y-6">
            {filteredCentres.length === 0 ? (
              <div className="text-center py-8 px-4 space-y-3 bg-red-50 rounded-2xl border border-red-100 mt-4">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                <h3 className="text-red-700 font-bold text-lg">
                  No Procurement Center found nearby
                </h3>
                <p className="text-red-600/80 text-sm font-medium max-w-sm mx-auto">
                  {t('booking.no_centres', { block: blocksList.find(b => b.block_code === parseInt(selectedBlockCode))?.block_name || 'selected block' })}
                </p>
                <button
                  onClick={() => setStep(1)}
                  className="text-red-700 hover:text-red-900 hover:underline font-bold pt-2 inline-block"
                >
                  {t('booking.mod_filters')}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-500">
                  {t('booking.showing_depots', { block: blocksList.find(b => b.block_code === parseInt(selectedBlockCode))?.block_name || 'selected block' })}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredCentres.map((centre) => (
                    <button
                      key={centre.id}
                      onClick={() => setSelectedCentre(centre)}
                      aria-label={`Select ${centre.name}`}
                      className={`p-6 rounded-xl border text-left cursor-pointer transition-all duration-200 w-full ${
                        selectedCentre?.id === centre.id
                          ? 'border-emerald-500 bg-emerald-50/20 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/20'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-slate-800 text-lg">{centre.name}</h3>
                        <Building className={`w-5 h-5 ${selectedCentre?.id === centre.id ? 'text-emerald-600' : 'text-slate-400'}`} />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{t('booking.in_charge', { name: centre.owner_name })}</p>
                      <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">{t('booking.daily_limit')}</span>
                        <span className="font-bold text-slate-700">{centre.daily_capacity} {t('booking.slots')}</span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => setStep(3)}
                    disabled={!selectedCentre}
                    aria-label={t('booking.select_products')}
                    className="inline-flex items-center gap-1.5 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {t('booking.select_products')}
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: CROP & CALENDAR DATE SELECTION */}
        {!loading && step === 3 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Product Select */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-700">{t('booking.select_crop')}</label>
                <div className="grid grid-cols-1 gap-2">
                  {products.length === 0 ? (
                    <p className="text-xs text-slate-400">{t('booking.no_crops')}</p>
                  ) : (
                    products.map((prod) => (
                      <button
                        key={prod.id}
                        onClick={() => setSelectedProduct(prod)}
                        aria-label={`Select ${prod.product_name}`}
                        className={`p-4 rounded-xl border text-left cursor-pointer transition-all w-full ${
                          selectedProduct?.id === prod.id
                            ? 'border-emerald-500 bg-emerald-50/20'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-800">{prod.product_name}</span>
                          <Wheat className={`w-4 h-4 ${selectedProduct?.id === prod.id ? 'text-emerald-600' : 'text-slate-400'}`} />
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{t('booking.max_cap', { qty: prod.max_quantity_per_farmer.toLocaleString() })}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Date Select */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-700">{t('booking.select_slot')}</label>
                <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 p-2 space-y-1">
                  {dates.length === 0 ? (
                    <p className="text-xs text-slate-400 p-4 text-center">{t('booking.no_slots')}</p>
                  ) : (
                    dates.map((dateSlot) => {
                      const isFull = dateSlot.status === 'full' || dateSlot.booked_count >= dateSlot.capacity;
                      const displayDate = new Date(dateSlot.date).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short'
                      });

                      return (
                        <button
                          key={dateSlot.id}
                          onClick={() => {
                            if (!isFull) setSelectedDate(dateSlot);
                          }}
                          disabled={isFull}
                          aria-label={`Select date ${displayDate}`}
                          className={`p-3 rounded-lg w-full text-left transition-all flex justify-between items-center ${
                            isFull 
                              ? 'opacity-40 cursor-not-allowed bg-slate-50' 
                              : selectedDate?.id === dateSlot.id
                              ? 'bg-emerald-50/40 border border-emerald-500'
                              : 'hover:bg-slate-50 border border-transparent cursor-pointer'
                          }`}
                        >
                          <div>
                            <span className="font-bold text-slate-800 text-sm">{displayDate}</span>
                            <span className="text-xs text-slate-400 block mt-0.5">
                              {t('booking.booked_fraction', { booked: dateSlot.booked_count, total: dateSlot.capacity })}
                            </span>
                          </div>
                          <div>
                            {isFull ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-red-100 text-red-900 border border-red-200 shadow-sm">{t('booking.full')}</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-900 border border-emerald-200 shadow-sm">{t('booking.open')}</span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setStep(4)}
                disabled={!selectedProduct || !selectedDate}
                aria-label={t('booking.proceed_summary')}
                className="inline-flex items-center gap-1.5 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50 transition-all cursor-pointer"
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
              <div className="md:col-span-2 space-y-4 border-r border-slate-100 pr-0 md:pr-6">
                <h3 className="font-bold text-slate-800 text-lg border-b border-slate-100 pb-2">{t('booking.summary_title')}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400 block">{t('booking.depot_name')}</span>
                    <span className="font-semibold text-slate-800">{selectedCentre.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{t('booking.dropoff_date')}</span>
                    <span className="font-semibold text-slate-800">
                      {new Date(selectedDate.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{t('booking.crop_type')}</span>
                    <span className="font-semibold text-slate-800">{selectedProduct.product_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{t('booking.center_location')}</span>
                    <span className="font-semibold text-slate-800">
                      {selectedCentre.geo_blocks?.block_name}, {selectedCentre.geo_blocks?.district_name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Crop Weight input */}
              <div className="space-y-4">
                <div>
                  <label htmlFor="weight-input" className="block text-sm font-semibold text-slate-700 mb-2">{t('booking.est_weight')}</label>
                  <div className="relative">
                    <input
                      id="weight-input"
                      type="number"
                      value={quantity}
                      onChange={(e) => handleQtyChange(e.target.value)}
                      placeholder="e.g. 1500"
                      className={`block w-full rounded-xl border py-3 pl-4 pr-12 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm ${
                        qtyError ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-300'
                      }`}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 text-sm font-semibold">
                      {t('booking.kg')}
                    </div>
                  </div>
                  {qtyError && (
                    <p className="text-xs text-red-600 font-semibold mt-1 flex items-start gap-1">
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>{qtyError}</span>
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1">
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
              <div className="p-4 bg-emerald-100 text-emerald-600 rounded-full animate-bounce">
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
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-inner space-y-3 relative overflow-hidden">
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
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-md text-sm"
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
