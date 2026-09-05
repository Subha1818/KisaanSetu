import React, { useEffect, useState } from 'react';
import { 
  Loader, Building, RefreshCw, AlertCircle, CheckCircle2, 
  Settings, Users, Wallet, Play, Check, AlertTriangle, 
  Volume2, Trash2, Plus, Edit3, Download, Camera, XCircle, Calendar, Pencil, X, MapPin,
  Ticket, Wheat, Clock
} from 'lucide-react';

const AllBookingsTable = ({ centreId, bookingDateId }: { centreId?: string; bookingDateId?: string }) => {
  const { queue: allBookings, loading } = useLiveQueue(centreId, bookingDateId);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 bg-slate-50/50 rounded-xl border border-slate-100">
        <Loader className="w-6 h-6 animate-spin text-indigo-600" />
        <p className="text-slate-400 font-semibold text-xs">Loading bookings...</p>
      </div>
    );
  }

  const totalCount = allBookings.length;
  const completedCount = allBookings.filter((b: any) => b.status === 'completed').length;
  const activeCount = allBookings.filter((b: any) => b.status === 'in_progress' || b.status === 'called').length;
  const bookedCount = allBookings.filter((b: any) => b.status === 'booked').length;

  return (
    <div className="space-y-4">
      {/* Metric Stat Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total</span>
          <span className="font-extrabold text-slate-900 text-lg">{totalCount}</span>
        </div>
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 flex items-center justify-between">
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Booked</span>
          <span className="font-extrabold text-amber-900 text-lg">{bookedCount}</span>
        </div>
        <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3 flex items-center justify-between">
          <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Active</span>
          <span className="font-extrabold text-blue-900 text-lg">{activeCount}</span>
        </div>
        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 flex items-center justify-between">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Done</span>
          <span className="font-extrabold text-emerald-900 text-lg">{completedCount}</span>
        </div>
      </div>

      {/* Styled Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden relative shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50/90 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5 font-bold tracking-wider">
                  <span className="inline-flex items-center gap-1.5 text-slate-700">
                    <Ticket className="w-3.5 h-3.5 text-indigo-500" />
                    Token
                  </span>
                </th>
                <th className="px-6 py-3.5 font-bold tracking-wider">
                  <span className="inline-flex items-center gap-1.5 text-slate-700">
                    <Users className="w-3.5 h-3.5 text-indigo-500" />
                    Farmer
                  </span>
                </th>
                <th className="px-6 py-3.5 font-bold tracking-wider">
                  <span className="inline-flex items-center gap-1.5 text-slate-700">
                    <Wheat className="w-3.5 h-3.5 text-indigo-500" />
                    Crop & Qty
                  </span>
                </th>
                <th className="px-6 py-3.5 font-bold tracking-wider text-right">
                  <span className="inline-flex items-center gap-1.5 text-slate-700 justify-end">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    Status
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allBookings.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="max-w-xs mx-auto space-y-2">
                      <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <p className="text-slate-800 font-bold text-sm">No Bookings Scheduled</p>
                      <p className="text-slate-400 text-xs">There are no farmer drop-off bookings recorded for this selected date.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                allBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 text-xs tracking-wide shadow-2xs">
                        {booking.token}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs border border-indigo-100 shrink-0">
                          {booking.users?.name ? booking.users.name.charAt(0).toUpperCase() : 'F'}
                        </div>
                        <span className="font-bold text-slate-800">{booking.users?.name || 'Farmer'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{booking.product_name}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          {booking.quantity} kg
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        booking.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        booking.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        booking.status === 'called' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse' :
                        booking.status === 'no_show' ? 'bg-red-50 text-red-700 border-red-200' :
                        booking.status === 'cancelled' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {booking.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {booking.status === 'in_progress' && <Play className="w-3 h-3 text-blue-600" />}
                        {booking.status === 'called' && <Volume2 className="w-3 h-3 text-indigo-600" />}
                        {booking.status === 'no_show' && <XCircle className="w-3 h-3 text-red-600" />}
                        {booking.status === 'cancelled' && <X className="w-3 h-3 text-slate-500" />}
                        {booking.status === 'booked' && <Clock className="w-3 h-3 text-amber-600" />}
                        {booking.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import { Scanner } from '@yudiel/react-qr-scanner';
import { supabase } from '../../lib/supabaseClient';
import { useLiveQueue } from '../../hooks/useLiveQueue';
import { generateProcurementReceipt } from '../../utils/pdfGenerator';
import { DashboardBackground } from '../../components/DashboardBackground';

interface Centre {
  id: string;
  name: string;
  owner_name: string;
  block_code: number;
  status: 'open' | 'closed';
  daily_capacity: number;
  geo_blocks?: {
    block_name: string;
    district_name: string;
    state_name: string;
  };
  latitude?: number;
  longitude?: number;
}


interface Product {
  id: string;
  product_name: string;
  max_quantity_per_farmer: number;
}


const CentreDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'queue' | 'all_bookings' | 'settings' | 'payouts'>('queue');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [session, setSession] = useState<any>(null);
  const [centre, setCentre] = useState<Centre | null>(null);
  const [todaySlotId, setTodaySlotId] = useState<string | undefined>(undefined);
  const [selectedAllBookingsDateId, setSelectedAllBookingsDateId] = useState<string | undefined>(undefined);
  const [availableDates, setAvailableDates] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [procurements, setProcurements] = useState<any[]>([]);
  const [showNudge, setShowNudge] = useState(false);

  // Modal / Form States
  const [completingBooking, setCompletingBooking] = useState<any | null>(null);
  const [weightBrought, setWeightBrought] = useState('');
  const [weightAccepted, setWeightAccepted] = useState('');
  const [ratePerKg, setRatePerKg] = useState('22.75'); // Default wheat rate placeholder
  const [procurementNote, setProcurementNote] = useState('');
  const [completedProcurementId, setCompletedProcurementId] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Settings Edit states
  const [dailyCapacity, setDailyCapacity] = useState<number>(50);
  const [centreStatus, setCentreStatus] = useState<'open' | 'closed'>('open');
  const [selectedNewDate, setSelectedNewDate] = useState('');

  // Location States
  const [statesList, setStatesList] = useState<{ state_code: number; state_name: string }[]>([]);
  const [districtsList, setDistrictsList] = useState<{ district_code: number; district_name: string; state_code: number }[]>([]);
  const [blocksList, setBlocksList] = useState<{ block_code: number; block_name: string }[]>([]);

  const [selectedStateCode, setSelectedStateCode] = useState('');
  const [selectedDistrictCode, setSelectedDistrictCode] = useState('');
  const [selectedBlockCode, setSelectedBlockCode] = useState('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');

  // Products Edit states
  const [newProductName, setNewProductName] = useState('');
  const [newMaxQty, setNewMaxQty] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Scanner states
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedBookingId, setScannedBookingId] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Fix 2: Payment correction modal state
  const [correctionModal, setCorrectionModal] = useState<{
    paymentId: string;
    currentStatus: string;
    bookingId?: string;
  } | null>(null);
  const [correctionStatus, setCorrectionStatus] = useState<string>('pending');
  const [correctionReason, setCorrectionReason] = useState<string>('');

  // Live Queue Subscription
  const { queue: bookings } = useLiveQueue(centre?.id, todaySlotId);

  // Fetch core session and centre mapping
  const fetchCentreData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      // 1. Get staff mapping for user
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.user) throw new Error('Not authenticated');
      setSession(currentSession);

      const { data: staffRow, error: staffErr } = await supabase
        .from('staff')
        .select('centre_id')
        .eq('user_id', currentSession.user.id)
        .single();

      if (staffErr || !staffRow) {
        throw new Error('Staff member is not assigned to any procurement depot.');
      }

      const centreId = staffRow.centre_id;

      // 2. Fetch centre details with joins to geo_blocks
      const { data: centreRow, error: centreErr } = await supabase
        .from('procurement_centres')
        .select(`
          *,
          geo_blocks (
            block_name,
            district_name,
            state_name,
            state_code,
            district_code,
            block_code
          )
        `)
        .eq('id', centreId)
        .single();

      if (centreErr || !centreRow) throw new Error('Could not load depot operational records.');

      setCentre(centreRow);
      setDailyCapacity(centreRow.daily_capacity);
      setCentreStatus(centreRow.status);

      // Initialize dropdown selections
      const blockCode = centreRow.block_code?.toString() || '';
      const districtCode = centreRow.geo_blocks?.district_code?.toString() || '';
      const stateCode = centreRow.geo_blocks?.state_code?.toString() || '';

      setSelectedStateCode(stateCode);
      setSelectedDistrictCode(districtCode);
      setSelectedBlockCode(blockCode);
      setLatitude(centreRow.latitude?.toString() || '');
      setLongitude(centreRow.longitude?.toString() || '');

      // Fetch states, districts, and blocks for cascading dropdowns
      const [statesRes, districtsRes, blocksRes] = await Promise.all([
        supabase.from('distinct_states').select('*'),
        stateCode ? supabase.from('distinct_districts').select('*').eq('state_code', parseInt(stateCode)) : Promise.resolve({ data: [] }),
        districtCode ? supabase.from('geo_blocks').select('block_code, block_name').eq('district_code', parseInt(districtCode)) : Promise.resolve({ data: [] })
      ]);

      setStatesList(statesRes.data || []);
      setDistrictsList(districtsRes.data || []);
      setBlocksList(blocksRes.data || []);

      // 3. Find all booking date slots
      const now = new Date();
      const localDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      const { data: allSlots } = await supabase
        .from('booking_dates')
        .select('*')
        .eq('centre_id', centreId)
        .order('date', { ascending: false });

      setAvailableDates(allSlots || []);

      if (allSlots && allSlots.length > 0) {
        const todayMatch = allSlots.find(s => s.date === localDateStr);
        setTodaySlotId(todayMatch ? todayMatch.id : undefined);
        setSelectedAllBookingsDateId(todayMatch ? todayMatch.id : allSlots[0].id);
      } else {
        setTodaySlotId(undefined);
        setSelectedAllBookingsDateId(undefined);
      }

      // 4. Fetch Products List
      const { data: prodData } = await supabase
        .from('centre_products')
        .select('*')
        .eq('centre_id', centreId);
      setProducts(prodData || []);

      // 5. Fetch completed procurements for Payouts — scoped to this centre
      const { data: procData, error: procErr } = await supabase
        .from('procurements')
        .select(`
          id,
          booking_id,
          quantity_brought,
          quantity_accepted,
          quantity_rejected,
          rate_per_kg,
          total_amount,
          created_at,
          bookings (
            product_name,
            centre_id,
            users:farmer_id (
              name
            )
          ),
          payments (
            id,
            status
          )
        `)
        .order('created_at', { ascending: false });

      if (procErr) throw new Error(procErr.message);
      setProcurements(procData || []);

      // Fix 3: Run auto-expire check after data loads
      if (centreId) {
        autoExpireStaleBookings(centreId);
      }

      // Check for unconfigured centre (first login nudge)
      if (centreRow.approval_status === 'approved') {
        const hasNoProducts = (prodData || []).length === 0;
        const hasNoDates = (allSlots || []).length === 0;
        const hasNoCapacity = centreRow.daily_capacity <= 0;
        if (hasNoProducts || hasNoDates || hasNoCapacity) {
          setShowNudge(true);
        }
      }

    } catch (err: any) {
      console.error('Error fetching staff dashboard data:', err);
      setError(err.message || 'An error occurred while loading dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCentreData();
  }, []);

  // Fix 3: Auto-expire stale bookings (booked/called) whose date has fully passed
  const autoExpireStaleBookings = async (centreId: string) => {
    const now = new Date();
    const localDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    try {
      // Find all past booking_dates for this centre (dates strictly before today)
      const { data: pastDates } = await supabase
        .from('booking_dates')
        .select('id')
        .eq('centre_id', centreId)
        .lt('date', localDateStr);

      if (!pastDates || pastDates.length === 0) return;

      const pastDateIds = pastDates.map((d: any) => d.id);

      // Find bookings on past dates still stuck in booked/called
      const { data: staleBookings } = await supabase
        .from('bookings')
        .select('id, farmer_id, token, status')
        .in('booking_date_id', pastDateIds)
        .in('status', ['booked', 'called']);

      if (!staleBookings || staleBookings.length === 0) return;

      // Transition each to no_show
      for (const b of staleBookings) {
        await supabase
          .from('bookings')
          .update({ status: 'no_show' })
          .eq('id', b.id);

        // Note: skip booking_history here because changed_by is NOT NULL
        // and we have no user context in this system-triggered check.
        // The status change itself is the audit trail.

        await supabase.from('notifications').insert({
          user_id: b.farmer_id,
          type: 'no_show',
          channel: 'app',
          message: `Your booking token ${b.token} was marked as No Show as the procurement date has passed.`,
          delivery_status: 'sent',
        });
      }

      console.log(`[AutoExpire] Marked ${staleBookings.length} stale booking(s) as no_show.`);
    } catch (err) {
      console.error('[AutoExpire] Error expiring stale bookings:', err);
    }
  };

  // Fetch districts when state code changes
  useEffect(() => {
    const fetchDistricts = async () => {
      if (!selectedStateCode) {
        setDistrictsList([]);
        setBlocksList([]);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('distinct_districts')
          .select('*')
          .eq('state_code', parseInt(selectedStateCode))
          .order('district_name', { ascending: true });
        if (error) throw error;
        setDistrictsList(data || []);
      } catch (err: any) {
        console.error('Error fetching districts in settings:', err);
      }
    };
    fetchDistricts();
  }, [selectedStateCode]);

  // Fetch blocks when district code changes
  useEffect(() => {
    const fetchBlocks = async () => {
      if (!selectedDistrictCode) {
        setBlocksList([]);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('geo_blocks')
          .select('block_code, block_name')
          .eq('district_code', parseInt(selectedDistrictCode))
          .order('block_name', { ascending: true });
        if (error) throw error;
        setBlocksList(data || []);
      } catch (err: any) {
        console.error('Error fetching blocks in settings:', err);
      }
    };
    fetchBlocks();
  }, [selectedDistrictCode]);

  const triggerNotification = (text: string) => {
    setSuccess(text);
    setTimeout(() => setSuccess(null), 4000);
  };

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

  // Stats Computations
  const totalToday = bookings.length;
  const waitingToday = bookings.filter((b) => b.status === 'booked').length;
  const inProgressToday = bookings.filter((b) => b.status === 'called' || b.status === 'in_progress').length;
  const completedToday = bookings.filter((b) => b.status === 'completed').length;
  
  const currentToken = bookings.find((b) => b.status === 'called' || b.status === 'in_progress')?.token || 'None';

  // QUEUE ACTIONS
  const handleCallNext = async () => {
    const nextBooked = bookings.find((b) => b.status === 'booked');
    if (!nextBooked || !centre || !session) return;

    try {
      setLoading(true);
      setError(null);

      // 1. Update Booking status to 'called'
      const { error: bErr } = await supabase
        .from('bookings')
        .update({ status: 'called' })
        .eq('id', nextBooked.id);

      if (bErr) throw new Error(bErr.message);

      // 2. Log History
      await supabase.from('booking_history').insert({
        booking_id: nextBooked.id,
        previous_status: 'booked',
        new_status: 'called',
        changed_by: session.user.id,
        note: 'Called next queue ticket by staff',
      });

      // 3. Dispatch Turn Notification
      await supabase.from('notifications').insert({
        user_id: nextBooked.farmer_id,
        type: 'turn_approaching',
        channel: 'app',
        message: `Your token ${nextBooked.token} has been called at ${centre.name}. Please proceed to Gate 1.`,
        delivery_status: 'sent',
      });

      triggerNotification(`Token ${nextBooked.token} has been called.`);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleStartProcurement = async (bookingId: string) => {
    if (!session) return;
    try {
      setLoading(true);
      const { error: bErr } = await supabase
        .from('bookings')
        .update({ status: 'in_progress' })
        .eq('id', bookingId);

      if (bErr) throw new Error(bErr.message);

      await supabase.from('booking_history').insert({
        booking_id: bookingId,
        previous_status: 'called',
        new_status: 'in_progress',
        changed_by: session.user.id,
        note: 'Procurement started by staff',
      });

      triggerNotification('Procurement weighment started.');
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSkipBooking = async (bookingId: string, currentStatus: any) => {
    if (!session) return;
    try {
      setLoading(true);
      const { error: bErr } = await supabase
        .from('bookings')
        .update({ status: 'no_show' })
        .eq('id', bookingId);

      if (bErr) throw new Error(bErr.message);

      await supabase.from('booking_history').insert({
        booking_id: bookingId,
        previous_status: currentStatus,
        new_status: 'no_show',
        changed_by: session.user.id,
        note: 'Marked as no show/skipped by staff',
      });

      triggerNotification('Farmer marked as no-show.');
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleScan = (result: any) => {
    if (result && result.length > 0 && result[0].rawValue) {
      const scannedId = result[0].rawValue;
      const found = bookings.find(b => b.id === scannedId);
      if (!found) {
        setScanError('Invalid token: Not found in today\'s active queue.');
      } else if (found.status === 'completed' || found.status === 'no_show' || found.status === 'cancelled') {
        setScanError(`Invalid token: Booking is already ${found.status.toUpperCase()}.`);
      } else {
        setScannedBookingId(found.id);
        setIsScannerOpen(false);
        setScanError(null);
        triggerNotification(`Token ${found.token} successfully scanned and selected.`);
      }
    }
  };

  // Submit Crop details to procurements + payments
  const handleRecordWeighment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingBooking || !session) return;

    const brought = parseFloat(weightBrought);
    const accepted = parseFloat(weightAccepted);
    const rate = parseFloat(ratePerKg);

    if (isNaN(brought) || isNaN(accepted) || isNaN(rate) || brought < 0 || accepted < 0 || rate < 0) {
      setError('Please enter valid positive crop weighments.');
      return;
    }

    if (accepted > brought) {
      setError('Accepted weight cannot be higher than the brought weight.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const rejected = brought - accepted;

      // 1. Insert Procurement Receipt
      const { data: proc, error: procErr } = await supabase
        .from('procurements')
        .insert({
          booking_id: completingBooking.id,
          quantity_brought: brought,
          quantity_accepted: accepted,
          quantity_rejected: rejected,
          rate_per_kg: rate,
          recorded_by: session.user.id,
          note: procurementNote.trim() || null
        })
        .select()
        .single();

      if (procErr) throw new Error(procErr.message);

      // 2. Insert Payout ledger
      const { error: payErr } = await supabase
        .from('payments')
        .insert({
          procurement_id: proc.id,
          status: 'pending',
          updated_by: session.user.id,
        });

      if (payErr) throw new Error(payErr.message);

      // 3. Complete booking
      await supabase.from('bookings').update({ status: 'completed' }).eq('id', completingBooking.id);

      // 4. Log History
      await supabase.from('booking_history').insert({
        booking_id: completingBooking.id,
        previous_status: 'in_progress',
        new_status: 'completed',
        changed_by: session.user.id,
        note: `Procured ${accepted} kg accepted weight at ₹${rate}/kg.`,
      });

      // Instead of closing immediately, show success view
      setCompletedProcurementId(proc.id);
      triggerNotification('Procurement completed successfully!');
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!completedProcurementId) return;
    try {
      setIsGeneratingPdf(true);
      await generateProcurementReceipt(completedProcurementId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleCloseModal = () => {
    setCompletingBooking(null);
    setCompletedProcurementId(null);
    setWeightBrought('');
    setWeightAccepted('');
    setProcurementNote('');
  };

  // SETTINGS UPDATES
  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!centre) return;
    if (!selectedBlockCode) {
      setError('Please select a valid block location.');
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const { data: updateData, error: updateErr } = await supabase
        .from('procurement_centres')
        .update({
          daily_capacity: dailyCapacity,
          status: centreStatus,
          block_code: parseInt(selectedBlockCode),
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
        })
        .eq('id', centre.id)
        .select();

      if (updateErr) throw new Error(updateErr.message);
      if (!updateData || updateData.length === 0) {
        throw new Error('Update failed (0 rows affected). Please ensure you have permission and all migrations are applied.');
      }

      triggerNotification('Centre settings updated.');
      await fetchCentreData(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleAddOperatingDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!centre || !selectedNewDate) return;
    try {
      setLoading(true);
      setError(null);
      const { error: insertErr } = await supabase.from('booking_dates').insert({
        centre_id: centre.id,
        date: selectedNewDate,
        capacity: centre.daily_capacity,
        booked_count: 0,
        status: 'open'
      });
      if (insertErr) {
        if (insertErr.code === '23505') { // Postgres Unique Violation
          throw new Error('This date is already open.');
        }
        throw new Error(insertErr.message);
      }
      triggerNotification(`Date ${selectedNewDate} successfully added.`);
      setSelectedNewDate('');
      await fetchCentreData(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleDeleteOperatingDate = async (dateId: string, dateStr: string) => {
    try {
      setLoading(true);
      setError(null);

      // FIX 1: Only block on genuinely active bookings (booked/called/in_progress)
      // Completed/cancelled/no_show bookings should NOT prevent date removal
      const { data: activeBookings, error: bErr } = await supabase
        .from('bookings')
        .select('id')
        .eq('booking_date_id', dateId)
        .in('status', ['booked', 'called', 'in_progress'])
        .limit(1);

      if (bErr) throw new Error(bErr.message);

      if (activeBookings && activeBookings.length > 0) {
        throw new Error(`Cannot remove ${dateStr} because there are active (booked/in-progress) bookings. Please cancel or complete them first.`);
      }

      // Safe to delete
      const { error: delErr } = await supabase.from('booking_dates').delete().eq('id', dateId);
      if (delErr) throw new Error(delErr.message);

      triggerNotification(`Date ${dateStr} has been removed.`);
      await fetchCentreData(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  // accepted crop products edits
  const handleAddOrEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!centre || !newProductName || !newMaxQty) return;

    try {
      setLoading(true);
      setError(null);
      const parsedMax = parseFloat(newMaxQty);

      if (editingProduct) {
        // Edit existing product
        const { data: pData, error: pErr } = await supabase
          .from('centre_products')
          .update({
            product_name: newProductName.trim(),
            max_quantity_per_farmer: parsedMax,
          })
          .eq('id', editingProduct.id)
          .select();

        if (pErr) throw new Error(pErr.message);
        if (!pData || pData.length === 0) {
           throw new Error('Update failed (0 rows affected). Please ensure you have permission and all migrations are applied.');
        }
        triggerNotification('Product updated.');
      } else {
        // Insert new product
        const { error: pErr } = await supabase
          .from('centre_products')
          .insert({
            centre_id: centre.id,
            product_name: newProductName.trim(),
            max_quantity_per_farmer: parsedMax,
          });

        if (pErr) throw new Error(pErr.message);
        triggerNotification('Product added.');
      }

      setNewProductName('');
      setNewMaxQty('');
      setEditingProduct(null);
      await fetchCentreData(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const { error: delErr } = await supabase
        .from('centre_products')
        .delete()
        .eq('id', id);

      if (delErr) throw new Error(delErr.message);
      triggerNotification('Product deleted.');
      await fetchCentreData(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Update Payout Status (normal one-way progression: pending -> initiated -> credited)
  const handleUpdatePaymentStatus = async (paymentId: string, newStatus: any, currentStatus: any) => {
    // Enforce one-way progression for normal dropdown
    const order: Record<string, number> = { pending: 0, initiated: 1, credited: 2 };
    if (order[newStatus] <= order[currentStatus]) {
      setError('Normal status update only allows forward progression (Pending → Initiated → Credited). Use the "Correct Status" button to reverse.');
      return;
    }
    if (!session) return;
    try {
      setLoading(true);
      setError(null);

      const { error: payErr } = await supabase
        .from('payments')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
          updated_by: session.user.id,
        })
        .eq('id', paymentId);

      if (payErr) throw new Error(payErr.message);

      triggerNotification(`Payment status updated to ${newStatus}.`);
      await fetchCentreData(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  // FIX 2: Corrective override — allows any status change but requires an audit reason
  const handleCorrectionSubmit = async () => {
    if (!correctionModal || !session) return;
    if (!correctionReason.trim()) {
      setError('Please enter a reason for this status correction.');
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const { error: payErr } = await supabase
        .from('payments')
        .update({
          status: correctionStatus,
          updated_at: new Date().toISOString(),
          updated_by: session.user.id,
        })
        .eq('id', correctionModal.paymentId);

      if (payErr) throw new Error(payErr.message);

      // Log to booking_history if we have a booking context
      if (correctionModal.bookingId) {
        await supabase.from('booking_history').insert({
          booking_id: correctionModal.bookingId,
          previous_status: correctionModal.currentStatus,
          new_status: correctionStatus,
          changed_by: session.user.id,
          note: `[PAYMENT CORRECTION] ${correctionReason.trim()}`,
        });
      }

      triggerNotification(`Payment corrected to "${correctionStatus}" with audit note.`);
      setCorrectionModal(null);
      setCorrectionReason('');
      await fetchCentreData(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading && !centre) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-slate-500 font-semibold text-sm">Verifying depot status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative z-0">
      <DashboardBackground variant="centre" />
      {/* Centre Dashboard Banner */}
      {centre && (
        <div className="bg-gradient-to-r from-blue-800 to-indigo-700 text-white rounded-2xl p-8 shadow-xl shadow-indigo-950/15 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
          {/* Minimalist Panoramic Depot Weighbridge & Intake Logistics SVG */}
          <div className="absolute right-0 top-0 bottom-0 w-[58%] md:w-[65%] lg:w-[70%] max-w-[850px] pointer-events-none hidden md:block overflow-hidden">
            <svg viewBox="0 0 750 220" fill="none" preserveAspectRatio="xMaxYMid meet" className="w-full h-full">
              {/* Technical Ground & Intake Flow Contours */}
              <path d="M0 194 Q200 164 420 186 Q620 158 750 178 L750 220 L0 220 Z" fill="white" fillOpacity="0.05" />
              <path d="M30 208 Q260 176 500 198 Q660 178 750 196" stroke="white" strokeWidth="1" strokeOpacity="0.18" fill="none" />
              <path d="M70 216 Q320 190 560 208 Q700 192 750 206" stroke="#38BDF8" strokeWidth="1.2" strokeOpacity="0.22" fill="none" />

              {/* Distant Telemetry Nodes & Grid Flow (Extending Leftward toward Depot Title) */}
              <circle cx="95" cy="180" r="3.5" fill="#38BDF8" fillOpacity="0.6" />
              <circle cx="165" cy="165" r="3" fill="#FBBF24" fillOpacity="0.75" />
              <circle cx="235" cy="175" r="3.5" fill="#34D399" fillOpacity="0.7" />

              {/* Minimalist Sample Grain Stalk on Left Margin */}
              <path d="M65 218 Q85 156 118 112" stroke="#FBBF24" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.7" />
              <ellipse cx="116" cy="116" rx="3.5" ry="6.5" transform="rotate(22 116 116)" fill="#FDE047" fillOpacity="0.85" />
              <ellipse cx="111" cy="127" rx="3.5" ry="6.5" transform="rotate(-18 111 127)" fill="#FBBF24" fillOpacity="0.85" />
              <ellipse cx="107" cy="138" rx="3.5" ry="6.5" transform="rotate(20 107 138)" fill="#F59E0B" fillOpacity="0.8" />
              <line x1="116" y1="112" x2="130" y2="88" stroke="#FDE047" strokeWidth="1" strokeOpacity="0.7" strokeLinecap="round" />

              {/* Grain Quality Testing Cylinder & Moisture Meter (Center-Left) */}
              <g transform="translate(260, 0)">
                <path d="M35 186 L35 146 Q35 136 43 136 L51 136 Q59 136 59 146 L59 186 Z" fill="white" fillOpacity="0.12" stroke="white" strokeWidth="1.2" strokeOpacity="0.45" />
                <line x1="39" y1="176" x2="55" y2="176" stroke="#FBBF24" strokeWidth="1.5" strokeOpacity="0.7" />
                <line x1="39" y1="166" x2="51" y2="166" stroke="white" strokeWidth="1" strokeOpacity="0.5" />
                <line x1="39" y1="156" x2="55" y2="156" stroke="white" strokeWidth="1" strokeOpacity="0.5" />
              </g>

              {/* Certified Weighment Slip / Depot Pass Clipboard (Center) */}
              <g transform="translate(350, 0)">
                <rect x="0" y="106" width="68" height="92" rx="8" fill="white" fillOpacity="0.12" stroke="white" strokeWidth="1.4" strokeOpacity="0.45" />
                <rect x="19" y="99" width="30" height="12" rx="3" fill="white" fillOpacity="0.35" />
                <line x1="14" y1="126" x2="54" y2="126" stroke="white" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.7" />
                <line x1="14" y1="139" x2="46" y2="139" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.35" />
                <line x1="14" y1="151" x2="50" y2="151" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.35" />
                <line x1="14" y1="163" x2="38" y2="163" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.35" />
                {/* Certified Checkmark Badge */}
                <circle cx="48" cy="178" r="9" fill="#10B981" fillOpacity="0.3" stroke="#34D399" strokeWidth="1.2" />
                <path d="M44 178 L47 181 L52 175" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </g>

              {/* Electronic Platform Weighbridge Ramp & Gate Barrier (Center-Right) */}
              <g transform="translate(470, 0)">
                {/* Left Approach Ramp */}
                <path d="M0 192 L28 178 L28 192 Z" fill="white" fillOpacity="0.16" stroke="white" strokeWidth="1" strokeOpacity="0.4" />
                {/* Heavy-Duty Weighbridge Platform Surface */}
                <rect x="28" y="178" width="125" height="14" rx="3" fill="#38BDF8" fillOpacity="0.25" stroke="white" strokeWidth="1.2" strokeOpacity="0.6" />
                <line x1="38" y1="185" x2="143" y2="185" stroke="#FBBF24" strokeWidth="2" strokeDasharray="8 8" strokeOpacity="0.65" />
                {/* Right Departure Ramp */}
                <path d="M153 178 L181 192 L153 192 Z" fill="white" fillOpacity="0.16" stroke="white" strokeWidth="1" strokeOpacity="0.4" />

                {/* Digital Weighment Readout Pillar */}
                <rect x="156" y="110" width="20" height="70" rx="3" fill="white" fillOpacity="0.18" stroke="white" strokeWidth="1.2" strokeOpacity="0.5" />
                <rect x="147" y="115" width="38" height="22" rx="4" fill="#0F172A" fillOpacity="0.65" stroke="#38BDF8" strokeWidth="1" strokeOpacity="0.8" />
                <text x="166" y="129" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#34D399" letterSpacing="0.5">SCALE</text>

                {/* Gate Barrier Post & Striped Boom Arm */}
                <rect x="22" y="148" width="8" height="36" rx="2" fill="white" fillOpacity="0.4" />
                <line x1="26" y1="154" x2="105" y2="154" stroke="#FBBF24" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.8" />
                <line x1="36" y1="154" x2="48" y2="154" stroke="white" strokeWidth="3" strokeLinecap="round" />
                <line x1="60" y1="154" x2="72" y2="154" stroke="white" strokeWidth="3" strokeLinecap="round" />
                <line x1="84" y1="154" x2="96" y2="154" stroke="white" strokeWidth="3" strokeLinecap="round" />
              </g>

              {/* Modern Cylindrical Grain Silos & Elevator Chute (Far Right) */}
              <g transform="translate(660, 0)">
                {/* Silo 1 */}
                <rect x="10" y="66" width="32" height="114" rx="6" fill="white" fillOpacity="0.14" stroke="white" strokeWidth="1.2" strokeOpacity="0.3" />
                <path d="M10 66 Q26 46 42 66 Z" fill="#38BDF8" fillOpacity="0.3" stroke="white" strokeWidth="1" strokeOpacity="0.4" />
                <line x1="10" y1="96" x2="42" y2="96" stroke="white" strokeWidth="0.8" strokeOpacity="0.25" />
                <line x1="10" y1="126" x2="42" y2="126" stroke="white" strokeWidth="0.8" strokeOpacity="0.25" />

                {/* Silo 2 */}
                <rect x="48" y="56" width="30" height="124" rx="6" fill="white" fillOpacity="0.12" stroke="white" strokeWidth="1.2" strokeOpacity="0.3" />
                <path d="M48 56 Q63 36 78 56 Z" fill="#38BDF8" fillOpacity="0.25" stroke="white" strokeWidth="1" strokeOpacity="0.4" />

                {/* Angled Intake Elevator Chute */}
                <line x1="-30" y1="150" x2="20" y2="76" stroke="#38BDF8" strokeWidth="3" strokeOpacity="0.6" strokeLinecap="round" />
                <line x1="-30" y1="150" x2="20" y2="76" stroke="white" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.75" />
              </g>
            </svg>
          </div>

          <div className="relative z-10 max-w-xl">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-indigo-200 border border-white/10">
                <Building className="w-3.5 h-3.5 text-indigo-300" />
                Procurement Depot Panel
              </span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border backdrop-blur-md ${
                centre.status === 'open' 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40' 
                  : 'bg-rose-500/20 text-rose-300 border-rose-400/40'
              }`}>
                <span className={`w-2 h-2 rounded-full ${centre.status === 'open' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                {centre.status === 'open' ? 'Depot Open' : 'Depot Closed'}
              </span>
              <button
                onClick={() => fetchCentreData(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 text-indigo-200 hover:text-white rounded-full border border-white/10 text-xs font-bold transition-all backdrop-blur-md shadow-xs"
                title="Sync / Refresh live depot data"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Sync</span>
              </button>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mt-1">{centre.name}</h1>
            <p className="text-indigo-100/90 text-sm mt-1 max-w-lg leading-relaxed">
              Location: {centre.geo_blocks?.block_name}, {centre.geo_blocks?.district_name}, {centre.geo_blocks?.state_name} | In-Charge: {centre.owner_name}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm flex items-start gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Main Tab Links */}
      <div className="flex border-b border-slate-200 gap-1 bg-white p-1 rounded-xl border overflow-x-auto whitespace-nowrap">
        <button
          onClick={() => setActiveTab('queue')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'queue'
              ? 'bg-indigo-50 text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          Queue Console
        </button>
        <button
          onClick={() => setActiveTab('all_bookings')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'all_bookings'
              ? 'bg-indigo-50 text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          All Bookings
        </button>
        <button
          onClick={() => setActiveTab('payouts')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'payouts'
              ? 'bg-indigo-50 text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Wallet className="w-4 h-4" />
          Payouts Management
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'settings'
              ? 'bg-indigo-50 text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Settings className="w-4 h-4" />
          Depot Settings
        </button>
      </div>

      {/* TAB 1: LIVE QUEUE CONSOLE */}
      {activeTab === 'queue' && (
        <div className="space-y-6">
          
          {showNudge && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 shadow-sm relative pr-10">
              <span className="text-2xl mt-0.5 block shrink-0">👋</span>
              <div>
                <h4 className="font-bold text-amber-900">Welcome to your new depot!</h4>
                <p className="text-amber-800 text-sm mt-1">
                  Complete your <button onClick={() => setActiveTab('settings')} className="font-bold underline hover:text-amber-950">Depot Settings</button> (crops, capacity, operating dates) before farmers can book with you.
                </p>
              </div>
              <button onClick={() => setShowNudge(false)} className="absolute top-4 right-4 text-amber-400 hover:text-amber-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl border-2 border-indigo-100 shadow-sm shadow-indigo-900/5 hover:border-indigo-200 hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all duration-300">
              <span className="text-xs text-slate-400 font-extrabold uppercase">Today's Bookings</span>
              <p className="text-2xl font-black text-slate-800 mt-1">{totalToday}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border-2 border-indigo-100 shadow-sm shadow-indigo-900/5 hover:border-indigo-200 hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all duration-300">
              <span className="text-xs text-slate-400 font-extrabold uppercase">Waiting</span>
              <p className="text-2xl font-black text-amber-600 mt-1">{waitingToday}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border-2 border-indigo-100 shadow-sm shadow-indigo-900/5 hover:border-indigo-200 hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all duration-300">
              <span className="text-xs text-slate-400 font-extrabold uppercase">In Procurement</span>
              <p className="text-2xl font-black text-blue-600 mt-1">{inProgressToday}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border-2 border-indigo-100 shadow-sm shadow-indigo-900/5 hover:border-indigo-200 hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all duration-300">
              <span className="text-xs text-slate-400 font-extrabold uppercase">Completed</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">{completedToday}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border-2 border-indigo-100 shadow-sm shadow-indigo-900/5 hover:border-indigo-200 hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all duration-300 col-span-2 md:col-span-1 bg-indigo-50/20 border-indigo-100">
              <span className="text-xs text-indigo-700 font-extrabold uppercase">Serving Token</span>
              <p className="text-2xl font-black text-indigo-900 mt-1">{currentToken}</p>
            </div>
          </div>

          {/* Queue Actions Controller */}
          <div className="bg-white rounded-2xl border-2 border-indigo-100 p-6 flex flex-wrap justify-between items-center gap-4 shadow-sm shadow-indigo-900/5 hover:border-indigo-200 hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all duration-300">
            <div>
              <h2 className="font-bold text-slate-800 text-lg">Queue Controller</h2>
              <p className="text-xs text-slate-400 mt-0.5 mb-3">Call next farmers in sequence and manage gate admissions.</p>
            </div>
            <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3 mt-4 sm:mt-0">
              <button
                onClick={() => setIsScannerOpen(true)}
                className="w-full sm:w-auto px-6 py-3.5 bg-white border-2 border-indigo-600 hover:bg-indigo-50 text-indigo-700 font-bold rounded-xl shadow-sm transition-all flex justify-center items-center gap-2 text-sm"
              >
                <Camera className="w-4 h-4" />
                Scan Token
              </button>
              <button
                onClick={handleCallNext}
                disabled={waitingToday === 0}
                className="w-full sm:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex justify-center items-center gap-2 text-sm disabled:opacity-50"
              >
                <Volume2 className="w-4 h-4" />
                Call Next Token
              </button>
            </div>
          </div>

          {/* Scanned Token Display */}
          {scannedBookingId && (
            <div className="bg-emerald-50 rounded-2xl border-2 border-emerald-200 p-6 shadow-sm shadow-emerald-900/5 mb-6 relative">
              <button 
                onClick={() => setScannedBookingId(null)}
                className="absolute top-4 right-4 text-emerald-600 hover:text-emerald-800"
              >
                <XCircle className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-emerald-900 text-lg">Verified Token</h3>
              </div>
              
              {(() => {
                const b = bookings.find(bk => bk.id === scannedBookingId);
                if (!b) return null;
                return (
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex gap-6 items-center">
                      <div className="bg-emerald-100 text-emerald-800 p-4 rounded-xl text-center">
                        <span className="block text-xs uppercase font-bold opacity-70">Token</span>
                        <span className="block text-2xl font-black">{b.token}</span>
                      </div>
                      <div>
                        <p className="font-bold text-emerald-950 text-lg">{b.users?.name}</p>
                        <p className="text-sm text-emerald-800">{b.product_name} • {b.quantity} kg</p>
                        <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-white text-emerald-700 border border-emerald-200">
                          {b.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                      {b.status === 'called' && (
                        <button
                          onClick={() => handleStartProcurement(b.id)}
                          className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm inline-flex justify-center items-center gap-1.5 shadow-sm transition-all"
                        >
                          <Play className="w-4 h-4" />
                          Start
                        </button>
                      )}
                      {b.status === 'in_progress' && (
                        <button
                          onClick={() => setCompletingBooking(b)}
                          className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm inline-flex justify-center items-center gap-1.5 shadow-sm transition-all"
                        >
                          <Check className="w-4 h-4" />
                          Complete
                        </button>
                      )}
                      {(b.status === 'booked' || b.status === 'called') && (
                        <button
                          onClick={() => handleSkipBooking(b.id, b.status)}
                          className="w-full sm:w-auto px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded-lg text-sm inline-flex justify-center items-center gap-1.5 shadow-sm transition-all"
                        >
                          <AlertTriangle className="w-4 h-4" />
                          Mark No-Show
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Bookings Queue Table */}
          <div className="bg-white rounded-2xl border-2 border-indigo-100 overflow-hidden shadow-sm shadow-indigo-900/5 hover:border-indigo-200 hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-lg">Today's Appointment Log</h3>
              <span className="text-xs text-slate-400">Sorted by Queue Sequence</span>
            </div>
            
            {bookings.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Users className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="font-semibold text-sm">No bookings scheduled for today.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-55 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase">
                      <th className="py-4 px-6">Token</th>
                      <th className="py-4 px-6">Farmer Name</th>
                      <th className="py-4 px-6">Crop / Qty</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {bookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-slate-50/50">
                        <td className="py-4 px-6 font-extrabold text-slate-900">{booking.token}</td>
                        <td className="py-4 px-6">
                          <p className="font-bold text-slate-700">{booking.users?.name}</p>
                          <p className="text-xs text-slate-400">{booking.users?.mobile_number}</p>
                        </td>
                        <td className="py-4 px-6">
                          <p className="font-semibold text-slate-700">{booking.product_name}</p>
                          <p className="text-xs text-slate-500">{booking.quantity} kg (est.)</p>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                            booking.status === 'booked' && 'bg-slate-100 text-slate-700'
                          } ${
                            booking.status === 'called' && 'bg-amber-100 text-amber-700'
                          } ${
                            booking.status === 'in_progress' && 'bg-blue-100 text-blue-700'
                          } ${
                            booking.status === 'completed' && 'bg-emerald-100 text-emerald-700'
                          } ${
                            booking.status === 'no_show' && 'bg-red-100 text-red-700'
                          }`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right space-x-1">
                          {booking.status === 'called' && (
                            <button
                              onClick={() => handleStartProcurement(booking.id)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-750 text-white font-bold rounded-lg text-xs inline-flex items-center gap-1 shadow-sm transition-all"
                            >
                              <Play className="w-3.5 h-3.5" />
                              Start
                            </button>
                          )}
                          {booking.status === 'in_progress' && (
                            <button
                              onClick={() => setCompletingBooking(booking)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-750 text-white font-bold rounded-lg text-xs inline-flex items-center gap-1 shadow-sm transition-all"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Complete
                            </button>
                          )}
                          {(booking.status === 'booked' || booking.status === 'called') && (
                            <button
                              onClick={() => handleSkipBooking(booking.id, booking.status)}
                              className="px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 font-bold rounded-lg text-xs inline-flex items-center gap-1 transition-all"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Skip
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PAYOUTS MANAGEMENT */}
      {/* TAB 2: ALL BOOKINGS */}
      {activeTab === 'all_bookings' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border-2 border-indigo-100 p-6 shadow-sm shadow-indigo-900/5 transition-all duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800">All Bookings</h2>
                <p className="text-xs text-slate-500 mt-0.5">View past and future booking records for this depot.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-bold uppercase">Date:</span>
                <select
                  value={selectedAllBookingsDateId || ''}
                  onChange={(e) => setSelectedAllBookingsDateId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-1.5 font-semibold cursor-pointer"
                >
                  {availableDates.length === 0 && <option value="">No dates found</option>}
                  {availableDates.map((dateObj: any) => {
                    const n = new Date();
                    const localDateStr = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
                    const isToday = dateObj.date === localDateStr;
                    return (
                      <option key={dateObj.id} value={dateObj.id}>
                        {new Date(dateObj.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        {isToday ? ' (Today)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <AllBookingsTable centreId={centre?.id} bookingDateId={selectedAllBookingsDateId} />
          </div>
        </div>
      )}

      {activeTab === 'payouts' && (
        <div className="bg-white rounded-2xl border-2 border-indigo-100 overflow-hidden shadow-sm shadow-indigo-900/5 hover:border-indigo-200 hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all duration-300">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-lg">Procured Grain Ledger & Payouts</h3>
            <p className="text-xs text-slate-400 mt-0.5">Track dropoff logs and update payout disbursement cycles.</p>
          </div>

          {procurements.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Wallet className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="font-semibold text-sm mt-2">No completed procurement weights logged yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-55 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase">
                    <th className="py-4 px-6">Timestamp</th>
                    <th className="py-4 px-6">Farmer</th>
                    <th className="py-4 px-6">Accepted Weight</th>
                    <th className="py-4 px-6">Calculated Payout</th>
                    <th className="py-4 px-6">Disbursement Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {procurements.map((proc) => {
                    const payRow = proc.payments?.[0];
                    return (
                      <tr key={proc.id} className="hover:bg-slate-50/50">
                        <td className="py-4 px-6 text-slate-500 font-medium">
                          {new Date(proc.created_at).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-700">{proc.bookings?.users?.name}</td>
                        <td className="py-4 px-6">
                          <p className="font-bold text-slate-800">{proc.quantity_accepted} kg</p>
                          <p className="text-xs text-slate-400">
                            Brought: {proc.quantity_brought} kg | Rejected: {proc.quantity_rejected} kg
                          </p>
                        </td>
                        <td className="py-4 px-6 font-extrabold text-slate-900">
                          ₹{parseFloat(proc.total_amount?.toString() || '0').toLocaleString('en-IN')}
                          <span className="text-[10px] text-slate-400 block font-normal mt-0.5">Rate: ₹{proc.rate_per_kg}/kg</span>
                        </td>
                        <td className="py-4 px-6">
                          {payRow ? (
                            <div className="flex items-center gap-2">
                              {/* Normal forward-only dropdown */}
                              <select
                                value={payRow.status}
                                onChange={(e) => handleUpdatePaymentStatus(payRow.id, e.target.value, payRow.status)}
                                className={`rounded-lg border px-3 py-1.5 text-xs font-bold focus:outline-none transition-all ${
                                  payRow.status === 'pending' && 'bg-amber-50 text-amber-700 border-amber-200'
                                } ${
                                  payRow.status === 'initiated' && 'bg-blue-50 text-blue-700 border-blue-200'
                                } ${
                                  payRow.status === 'credited' && 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                <option value="pending">Pending</option>
                                <option value="initiated">Initiated</option>
                                <option value="credited">Credited</option>
                              </select>
                              {/* FIX 2: Correction override — visually distinct pencil icon with orange color */}
                              <button
                                title="Correct Status (requires reason)"
                                onClick={() => {
                                  setCorrectionModal({ paymentId: payRow.id, currentStatus: payRow.status, bookingId: proc.booking_id });
                                  setCorrectionStatus(payRow.status);
                                  setCorrectionReason('');
                                }}
                                className="p-1.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-600 hover:bg-orange-100 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">No Payment Ledger</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CENTRE SETTINGS */}
      {activeTab === 'settings' && centre && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main settings form */}
          <div className="lg:col-span-2 bg-white rounded-2xl border-2 border-indigo-100 p-8 shadow-sm shadow-indigo-900/5 hover:border-indigo-200 hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all duration-300">
            <h3 className="font-bold text-slate-800 text-lg border-b border-slate-100 pb-3 mb-6">Operations & Capacity Rules</h3>
            
            <form onSubmit={handleUpdateSettings} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Daily Slot Capacity</label>
                  <input
                    type="number"
                    value={dailyCapacity}
                    onChange={(e) => setDailyCapacity(parseInt(e.target.value) || 0)}
                    className="block w-full rounded-xl border border-slate-300 py-3 px-4 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Operating Status</label>
                  <select
                    value={centreStatus}
                    onChange={(e) => setCentreStatus(e.target.value as any)}
                    className="block w-full rounded-xl border border-slate-300 py-3 px-4 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none sm:text-sm"
                  >
                    <option value="open">Open / Accepting Bookings</option>
                    <option value="closed">Closed / Blocked</option>
                  </select>
                </div>


                <div className="md:col-span-2 border-t border-slate-100 pt-4 mt-2">
                  <h4 className="text-xs uppercase font-extrabold tracking-wider text-indigo-700 mb-4">Depot Location (LGD)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* State Selector */}
                    <div>
                      <label className="block text-xs font-bold text-slate-650 mb-2">State</label>
                      <select
                        value={selectedStateCode}
                        onChange={(e) => {
                          setSelectedStateCode(e.target.value);
                          setSelectedDistrictCode('');
                          setSelectedBlockCode('');
                          setDistrictsList([]);
                          setBlocksList([]);
                        }}
                        className="block w-full rounded-xl border border-slate-300 py-3 px-4 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none sm:text-xs bg-white"
                      >
                        <option value="">Select State</option>
                        {statesList.map((s) => (
                          <option key={s.state_code} value={s.state_code}>{s.state_name}</option>
                        ))}
                      </select>
                    </div>

                    {/* District Selector */}
                    <div>
                      <label className="block text-xs font-bold text-slate-650 mb-2">District</label>
                      <select
                        value={selectedDistrictCode}
                        onChange={(e) => {
                          setSelectedDistrictCode(e.target.value);
                          setSelectedBlockCode('');
                          setBlocksList([]);
                        }}
                        disabled={!selectedStateCode}
                        className="block w-full rounded-xl border border-slate-300 py-3 px-4 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none sm:text-xs disabled:opacity-50 bg-white"
                      >
                        <option value="">Select District</option>
                        {districtsList.map((d) => (
                          <option key={d.district_code} value={d.district_code}>{d.district_name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Block Selector */}
                    <div>
                      <label className="block text-xs font-bold text-slate-650 mb-2">Block</label>
                      <select
                        value={selectedBlockCode}
                        onChange={(e) => setSelectedBlockCode(e.target.value)}
                        disabled={!selectedDistrictCode}
                        className="block w-full rounded-xl border border-slate-300 py-3 px-4 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none sm:text-xs disabled:opacity-50 bg-white"
                      >
                        <option value="">Select Block</option>
                        {blocksList.map((b) => (
                          <option key={b.block_code} value={b.block_code}>{b.block_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-bold text-slate-650">Centre Coordinates (Optional)</label>
                      <button
                        type="button"
                        onClick={handleGetLocation}
                        className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:text-indigo-700 transition-colors"
                      >
                        <MapPin className="w-3 h-3" />
                        Use My Location
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="number"
                        step="any"
                        placeholder="Latitude"
                        value={latitude}
                        onChange={(e) => setLatitude(e.target.value)}
                        className="block w-full rounded-xl border border-slate-300 py-3 px-4 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none sm:text-sm bg-white"
                      />
                      <input
                        type="number"
                        step="any"
                        placeholder="Longitude"
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value)}
                        className="block w-full rounded-xl border border-slate-300 py-3 px-4 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none sm:text-sm bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-indigo-200 transition-all focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>

            <div className="mt-12 pt-8 border-t-2 border-slate-100">
              <h3 className="font-bold text-slate-800 text-lg mb-2">Manage Operating Dates</h3>
              <p className="text-sm text-slate-500 mb-6">Select specific dates when the centre will be open and accepting drop-offs. Dates are automatically populated with the daily slot capacity configured above.</p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <input
                  type="date"
                  value={selectedNewDate}
                  onChange={(e) => setSelectedNewDate(e.target.value)}
                  className="block w-full sm:w-auto rounded-xl border border-slate-300 py-3 px-4 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none sm:text-sm"
                  min={new Date().toISOString().split('T')[0]}
                />
                <button
                  type="button"
                  onClick={handleAddOperatingDate}
                  disabled={!selectedNewDate || loading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl shadow-sm transition-all focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span className="text-lg leading-none">+</span> Add Date
                </button>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Currently Open Dates</h4>
                {availableDates.length === 0 ? (
                  <p className="text-sm text-slate-500 italic bg-slate-50 p-4 rounded-xl">No operating dates are currently set. Add some dates above to allow farmers to book slots.</p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {availableDates.filter(d => d.status !== 'closed').map(dateObj => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      const isPast = dateObj.date < todayStr;
                      const badgeClasses = isPast 
                        ? "inline-flex items-center bg-red-50 border border-red-100 text-red-700 rounded-lg overflow-hidden shadow-sm opacity-80"
                        : "inline-flex items-center bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg overflow-hidden shadow-sm";
                      const btnClasses = isPast
                        ? "px-3 py-2 bg-red-100/50 hover:bg-red-200 hover:text-red-800 transition-colors border-l border-red-100"
                        : "px-3 py-2 bg-indigo-100/50 hover:bg-red-100 hover:text-red-600 transition-colors border-l border-indigo-100";
                      
                      return (
                        <div key={dateObj.id} className={badgeClasses}>
                          <span className="px-3 py-2 text-sm font-semibold">
                            {new Date(dateObj.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteOperatingDate(dateObj.id, dateObj.date)}
                            disabled={loading}
                            className={btnClasses}
                            title="Remove this date"
                          >
                            &times;
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Manage Centre accepted Products list */}
          <div className="bg-white rounded-2xl border-2 border-indigo-100 p-8 shadow-sm shadow-indigo-900/5 hover:border-indigo-200 hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all duration-300 flex flex-col justify-between space-y-6">
            <div>
              <h3 className="font-bold text-slate-800 text-lg border-b border-slate-100 pb-3">Procurable Crops</h3>
              
              {/* Product insert/edit inline form */}
              <form onSubmit={handleAddOrEditProduct} className="mt-4 space-y-3.5 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs font-bold text-indigo-700 uppercase">
                  {editingProduct ? 'Edit Crop Parameters' : 'Add New Crop Product'}
                </p>
                <div>
                  <input
                    type="text"
                    placeholder="Crop Name (e.g. Wheat)"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    required
                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="Max weight limit per farmer (kg)"
                    value={newMaxQty}
                    onChange={(e) => setNewMaxQty(e.target.value)}
                    required
                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  {editingProduct && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProduct(null);
                        setNewProductName('');
                        setNewMaxQty('');
                      }}
                      className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 font-bold rounded-lg text-[10px] text-slate-600 transition-all"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[10px] shadow-sm transition-all inline-flex items-center gap-1"
                  >
                    {editingProduct ? <Edit3 className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                    {editingProduct ? 'Update Product' : 'Add Crop'}
                  </button>
                </div>
              </form>

              {/* List products */}
              <div className="mt-6 space-y-2">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Crops</p>
                {products.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">No crop products assigned.</p>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
                    {products.map((prod) => (
                      <div key={prod.id} className="py-2.5 flex justify-between items-center text-sm">
                        <div>
                          <p className="font-bold text-slate-700">{prod.product_name}</p>
                          <p className="text-xs text-slate-400">Limit: {prod.max_quantity_per_farmer} kg</p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingProduct(prod);
                              setNewProductName(prod.product_name);
                              setNewMaxQty(prod.max_quantity_per_farmer.toString());
                            }}
                            className="p-1.5 hover:bg-slate-100 rounded text-slate-500"
                            title="Edit Product"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod.id)}
                            className="p-1.5 hover:bg-red-50 text-red-500 rounded"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WEIGHMENT MODAL (COMPLETE TICKET) */}
      {completingBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden relative">
            {/* Modal Top indicator */}
            <div className="h-1.5 bg-emerald-600"></div>

            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {completedProcurementId ? 'Procurement Complete' : 'Record Grain Dropoff'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {completedProcurementId ? `Token ${completingBooking.token} successfully processed` : `Weighment checklist for Token ${completingBooking.token}`}
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {completedProcurementId ? (
                <div className="py-6 text-center space-y-6 flex flex-col items-center">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-800">Ready to issue receipt</h4>
                    <p className="text-sm text-slate-500 mt-2">Print or download the official procurement receipt for the farmer.</p>
                  </div>
                  <div className="w-full space-y-3 mt-4">
                    <button
                      onClick={handleDownloadReceipt}
                      disabled={isGeneratingPdf}
                      className="w-full inline-flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-colors"
                    >
                      {isGeneratingPdf ? <Loader className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                      Download Receipt PDF
                    </button>
                    <button
                      onClick={handleCloseModal}
                      className="w-full py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleRecordWeighment} className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100 text-xs">
                    <p><strong>Farmer:</strong> {completingBooking.users?.name}</p>
                    <p><strong>Crop Type:</strong> {completingBooking.product_name}</p>
                    <p><strong>Estimated Weight:</strong> {completingBooking.quantity} kg</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity Brought (kg)</label>
                    <input
                      type="number"
                      required
                      value={weightBrought}
                      onChange={(e) => setWeightBrought(e.target.value)}
                      placeholder="e.g. 2100"
                      className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity Accepted (kg)</label>
                    <input
                      type="number"
                      required
                      value={weightAccepted}
                      onChange={(e) => setWeightAccepted(e.target.value)}
                      placeholder="e.g. 2000"
                      className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Procurement Rate per kg (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={ratePerKg}
                      onChange={(e) => setRatePerKg(e.target.value)}
                      placeholder="e.g. 22.75"
                      className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Note (Optional)</label>
                    <textarea
                      value={procurementNote}
                      onChange={(e) => setProcurementNote(e.target.value)}
                      placeholder="Staff comments, deductions context, etc."
                      className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      rows={2}
                    />
                  </div>

                  {/* Auto Calculated payout summary */}
                  {weightAccepted && ratePerKg && !isNaN(parseFloat(weightAccepted)) && !isNaN(parseFloat(ratePerKg)) && (
                    <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 flex justify-between items-center text-xs">
                      <div>
                        <span className="block font-medium">MSP Payout Amount</span>
                        <span className="font-extrabold text-sm block">
                          ₹{(parseFloat(weightAccepted) * parseFloat(ratePerKg)).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[10px]">Rejected: {Math.max(0, parseFloat(weightBrought) - parseFloat(weightAccepted)) || 0} kg</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 font-bold rounded-xl text-xs transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors"
                    >
                      {loading ? 'Processing...' : 'Certify Dropoff'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scanner Modal */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col h-[80vh] sm:h-auto max-h-[800px]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-600" />
                Scan Token QR Code
              </h3>
              <button 
                onClick={() => {
                  setIsScannerOpen(false);
                  setScanError(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <p className="text-sm text-slate-500 mb-4 text-center">
                Point your camera at the farmer's token QR code. Make sure you are using a secure connection (HTTPS) for camera access.
              </p>
              
              {scanError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <span>{scanError}</span>
                </div>
              )}
              
              <div className="relative rounded-xl overflow-hidden bg-black flex-1 min-h-[300px] border border-slate-200 shadow-inner">
                <Scanner 
                  onScan={handleScan}
                  onError={(err: any) => setScanError(err?.message || 'Camera error. Please ensure camera permissions are granted.')}
                  components={{
                    onOff: true,
                    torch: true,
                    zoom: true,
                    finder: true,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FIX 2: Payment Correction Modal */}
      {correctionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" role="dialog" aria-modal="true">
            <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-orange-50">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Pencil className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Correct Payment Status</h3>
                <p className="text-xs text-orange-700 mt-0.5">This is a corrective override — an audit log will be created.</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Set Correct Status To</label>
                <select
                  value={correctionStatus}
                  onChange={(e) => setCorrectionStatus(e.target.value)}
                  className="w-full rounded-xl border border-orange-200 bg-orange-50 px-3 py-2.5 text-sm font-bold text-orange-800 focus:ring-2 focus:ring-orange-300 focus:outline-none"
                >
                  <option value="pending">Pending</option>
                  <option value="initiated">Initiated</option>
                  <option value="credited">Credited</option>
                </select>
                <p className="text-xs text-slate-400 mt-1">Current: <span className="font-semibold capitalize">{correctionModal.currentStatus}</span></p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Reason for Correction <span className="text-red-500">*</span></label>
                <textarea
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="e.g. Payment was credited but system showed wrong status due to bank delay"
                  className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none"
                  rows={3}
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => { setCorrectionModal(null); setCorrectionReason(''); }}
                className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-100 font-bold rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCorrectionSubmit}
                disabled={!correctionReason.trim() || loading}
                className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition-colors"
              >
                {loading ? 'Saving...' : 'Save Correction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CentreDashboard;
