import React, { useEffect, useState } from 'react';
import { 
  Loader, Building, RefreshCw, AlertCircle, CheckCircle2, 
  Settings, Users, Wallet, Play, Check, AlertTriangle, 
  Volume2, Trash2, Plus, Edit3, Download, Camera, XCircle
} from 'lucide-react';
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
  booking_window_start: string;
  booking_window_end: string;
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


const CentreDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'queue' | 'settings' | 'payouts'>('queue');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [session, setSession] = useState<any>(null);
  const [centre, setCentre] = useState<Centre | null>(null);
  const [todaySlotId, setTodaySlotId] = useState<string | undefined>(undefined);
  const [products, setProducts] = useState<Product[]>([]);
  const [procurements, setProcurements] = useState<any[]>([]);

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
  const [windowStart, setWindowStart] = useState('');
  const [windowEnd, setWindowEnd] = useState('');

  // Location States
  const [statesList, setStatesList] = useState<{ state_code: number; state_name: string }[]>([]);
  const [districtsList, setDistrictsList] = useState<{ district_code: number; district_name: string; state_code: number }[]>([]);
  const [blocksList, setBlocksList] = useState<{ block_code: number; block_name: string }[]>([]);

  const [selectedStateCode, setSelectedStateCode] = useState('');
  const [selectedDistrictCode, setSelectedDistrictCode] = useState('');
  const [selectedBlockCode, setSelectedBlockCode] = useState('');

  // Products Edit states
  const [newProductName, setNewProductName] = useState('');
  const [newMaxQty, setNewMaxQty] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Scanner states
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedBookingId, setScannedBookingId] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

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
      setWindowStart(centreRow.booking_window_start);
      setWindowEnd(centreRow.booking_window_end);

      // Initialize dropdown selections
      const blockCode = centreRow.block_code?.toString() || '';
      const districtCode = centreRow.geo_blocks?.district_code?.toString() || '';
      const stateCode = centreRow.geo_blocks?.state_code?.toString() || '';

      setSelectedStateCode(stateCode);
      setSelectedDistrictCode(districtCode);
      setSelectedBlockCode(blockCode);

      // Fetch states, districts, and blocks for cascading dropdowns
      const [statesRes, districtsRes, blocksRes] = await Promise.all([
        supabase.rpc('get_lgd_states'),
        stateCode ? supabase.rpc('get_lgd_districts', { p_state_code: parseInt(stateCode) }) : Promise.resolve({ data: [] }),
        districtCode ? supabase.rpc('get_lgd_blocks', { p_district_code: parseInt(districtCode) }) : Promise.resolve({ data: [] })
      ]);

      setStatesList(statesRes.data || []);
      setDistrictsList(districtsRes.data || []);
      setBlocksList(blocksRes.data || []);

      // 3. Find today's booking date slot
      const now = new Date();
      const localDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      const { data: todaySlot } = await supabase
        .from('booking_dates')
        .select('*')
        .eq('centre_id', centreId)
        .eq('date', localDateStr)
        .single();

      if (todaySlot) {
        setTodaySlotId(todaySlot.id);
      } else {
        setTodaySlotId(undefined);
      }

      // 4. Fetch Products List
      const { data: prodData } = await supabase
        .from('centre_products')
        .select('*')
        .eq('centre_id', centreId);
      setProducts(prodData || []);

      // 5. Fetch completed procurements for Payouts
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
            users (
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
          booking_window_start: windowStart,
          booking_window_end: windowEnd,
          block_code: parseInt(selectedBlockCode),
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

  // Update Payout Status (pending -> initiated -> credited)
  const handleUpdatePaymentStatus = async (paymentId: string, newStatus: any) => {
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
        <div className="bg-gradient-to-r from-blue-800 to-indigo-700 text-white rounded-2xl p-8 shadow-xl shadow-indigo-950/15 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2">
              <Building className="w-6 h-6 text-indigo-200" />
              <span className="text-xs uppercase tracking-widest text-indigo-200 font-bold">Procurement Depot Panel</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mt-1">{centre.name}</h1>
            <p className="text-indigo-100/90 text-sm mt-1">
              Location: {centre.geo_blocks?.block_name}, {centre.geo_blocks?.district_name}, {centre.geo_blocks?.state_name} | In-Charge: {centre.owner_name}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchCentreData(true)}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/10 transition-colors shadow-inner"
              title="Manual Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <span className={`px-4 py-2 rounded-xl text-sm font-bold border ${
              centre.status === 'open' 
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                : 'bg-red-500/10 text-red-300 border-red-500/30'
            }`}>
              {centre.status === 'open' ? 'Open' : 'Closed'}
            </span>
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
      <div className="flex border-b border-slate-200 gap-1 bg-white p-1 rounded-xl border">
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

      {/* TAB 1: QUEUE CONSOLE */}
      {activeTab === 'queue' && (
        <div className="space-y-6">
          {/* Stats Bar */}
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
              <p className="text-xs text-slate-400 mt-0.5">Call next farmers in sequence and manage gate admissions.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsScannerOpen(true)}
                className="px-6 py-3.5 bg-white border-2 border-indigo-600 hover:bg-indigo-50 text-indigo-700 font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 text-sm"
              >
                <Camera className="w-4 h-4" />
                Scan Token
              </button>
              <button
                onClick={handleCallNext}
                disabled={waitingToday === 0}
                className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2 text-sm disabled:opacity-50"
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
                    <div className="flex gap-2">
                      {b.status === 'called' && (
                        <button
                          onClick={() => handleStartProcurement(b.id)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm inline-flex items-center gap-1.5 shadow-sm transition-all"
                        >
                          <Play className="w-4 h-4" />
                          Start
                        </button>
                      )}
                      {b.status === 'in_progress' && (
                        <button
                          onClick={() => setCompletingBooking(b)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm inline-flex items-center gap-1.5 shadow-sm transition-all"
                        >
                          <Check className="w-4 h-4" />
                          Complete
                        </button>
                      )}
                      {(b.status === 'booked' || b.status === 'called') && (
                        <button
                          onClick={() => handleSkipBooking(b.id, b.status)}
                          className="px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded-lg text-sm inline-flex items-center gap-1.5 shadow-sm transition-all"
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
                            <select
                              value={payRow.status}
                              onChange={(e) => handleUpdatePaymentStatus(payRow.id, e.target.value)}
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
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Booking Window Start</label>
                  <input
                    type="date"
                    value={windowStart}
                    onChange={(e) => setWindowStart(e.target.value)}
                    className="block w-full rounded-xl border border-slate-300 py-3 px-4 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Booking Window End</label>
                  <input
                    type="date"
                    value={windowEnd}
                    onChange={(e) => setWindowEnd(e.target.value)}
                    className="block w-full rounded-xl border border-slate-300 py-3 px-4 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none sm:text-sm"
                  />
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
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all text-sm cursor-pointer"
                >
                  Save Settings
                </button>
              </div>
            </form>
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
    </div>
  );
};

export default CentreDashboard;
