import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Wheat, Clock, Award, AlertCircle, Loader, Sprout, Building, Play, RefreshCw, XCircle, Download, CheckCircle2, History } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useLiveQueue } from '../../hooks/useLiveQueue';
import { RescheduleModal } from '../../components/farmer/RescheduleModal';
import { useTranslation } from 'react-i18next';
import { generateProcurementReceipt, generateTokenPDF } from '../../utils/pdfGenerator';
import { QRCodeSVG } from 'qrcode.react';
import { DashboardBackground } from '../../components/DashboardBackground';

const FarmerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [procurementHistory, setProcurementHistory] = useState<any[]>([]);
  const [farmerName, setFarmerName] = useState('Farmer');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { t } = useTranslation();
  
  // Modals state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Personal reasons');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);

// Tab state
  const [activeTab, setActiveTab] = useState<'history' | 'msp'>('history');

  // MSP Rates state
  const [mspRates, setMspRates] = useState<any[]>([]);
  const [loadingMsp, setLoadingMsp] = useState<boolean>(true);

  // Realtime Live Queue Subscription
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Get user session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setError('User session not found.');
          return;
        }

        // Get farmer name
        const { data: profile } = await supabase
          .from('users')
          .select('name')
          .eq('id', session.user.id)
          .single();
        if (profile) {
          setFarmerName(profile.name);
        }

        // Get active booking (booked, called, or in_progress)
        const { data: bookings, error: bookingErr } = await supabase
          .from('bookings')
          .select(`
            id,
            centre_id,
            booking_date_id,
            product_name,
            quantity,
            token,
            status,
            created_at,
            procurement_centres (
              id,
              name,
              geo_blocks (
                block_name,
                district_name,
                state_name
              )
            ),
            booking_dates (
              id,
              date
            )
          `)
          .eq('farmer_id', session.user.id)
          .in('status', ['booked', 'called', 'in_progress'])
          .order('created_at', { ascending: false })
          .limit(1);

        if (bookingErr) {
          throw new Error(bookingErr.message);
        }

        if (bookings && bookings.length > 0) {
          setActiveBooking(bookings[0]);
        }

        // Get past completed procurements for this farmer
        // Use subquery approach: get booking IDs first, then query procurements
        const { data: farmerBookingIds } = await supabase
          .from('bookings')
          .select('id')
          .eq('farmer_id', session.user.id);

        if (farmerBookingIds && farmerBookingIds.length > 0) {
          const bookingIds = farmerBookingIds.map((b: any) => b.id);
          const { data: historyData, error: histErr } = await supabase
            .from('procurements')
            .select(`
              id,
              created_at,
              quantity_accepted,
              total_amount,
              note,
              booking_id,
              bookings (
                token,
                product_name,
                booking_dates ( date ),
                procurement_centres ( name )
              ),
              payments ( status )
            `)
            .in('booking_id', bookingIds)
            .order('created_at', { ascending: false });

          if (!histErr && historyData) {
            setProcurementHistory(historyData);
          } else if (histErr) {
            console.error('Error fetching procurement history:', histErr);
          }
        }

        // Fetch live Government MSP rates
        try {
          const { data: mspData, error: mspErr } = await supabase
            .from('msp_rates')
            .select('id, crop_name, rate_per_kg, effective_date')
            .order('crop_name');

          if (!mspErr && mspData && mspData.length > 0) {
            setMspRates(mspData);
          } else {
            // Default baseline values if table empty or pending migration
            setMspRates([
              { id: '1', crop_name: 'Wheat', rate_per_kg: 22.75, effective_date: '2024-04-01' },
              { id: '2', crop_name: 'Paddy', rate_per_kg: 21.83, effective_date: '2024-04-01' },
              { id: '3', crop_name: 'Maize', rate_per_kg: 20.90, effective_date: '2024-04-01' }
            ]);
          }
        } catch (mspCatchErr) {
          console.error('Error fetching MSP rates:', mspCatchErr);
        } finally {
          setLoadingMsp(false);
        }

      } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message || 'Failed to fetch dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Live Queue calculations
  const { queue } = useLiveQueue(activeBooking?.centre_id, activeBooking?.booking_date_id);
  
  const myTokenNum = activeBooking ? parseInt(activeBooking.token.split('-')[1]) || 0 : 0;
  const peopleAhead = queue.filter(b => 
    (b.status === 'booked' || b.status === 'called' || b.status === 'in_progress') && 
    (parseInt(b.token.split('-')[1]) || 0) < myTokenNum
  ).length;

  const nowServing = queue.find(b => b.status === 'in_progress' || b.status === 'called')?.token || 'None';

  // Cancellation logic
  const cancelWindowHours = activeBooking?.procurement_centres?.cancellation_window_hours || 24;
  const deadline = activeBooking ? new Date(new Date(activeBooking.booking_dates.date).getTime() - cancelWindowHours * 60 * 60 * 1000) : new Date(0);
  const isPastDeadline = new Date() > deadline;
  const isCancellable = activeBooking?.status === 'booked' && !isPastDeadline;

  const handleCancelBooking = async () => {
    if (!activeBooking) return;
    try {
      setCancelLoading(true);
      setError(null);
      const { error: rpcErr } = await supabase.rpc('cancel_farmer_booking', {
        p_booking_id: activeBooking.id,
        p_reason: cancelReason
      });
      if (rpcErr) throw rpcErr;
      
      // Successfully cancelled, remove active booking from UI
      setActiveBooking(null);
      setIsCancelModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to cancel booking.');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleDownloadReceipt = async (procurementId: string) => {
    try {
      setDownloadingId(procurementId);
      await generateProcurementReceipt(procurementId);
    } catch (err: any) {
      setError(err.message || 'Failed to generate receipt.');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-slate-500 font-semibold text-sm">{t('dashboard.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative z-0">
      <DashboardBackground variant="farmer" />
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-700 text-white rounded-2xl p-8 shadow-xl shadow-emerald-950/15 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        {/* Minimalist Panoramic Indian Rural Farm & Harvest SVG */}
        <div className="absolute right-0 top-0 bottom-0 w-[58%] md:w-[65%] lg:w-[70%] max-w-[850px] pointer-events-none hidden md:block overflow-hidden">
          <svg viewBox="0 0 750 220" fill="none" preserveAspectRatio="xMaxYMid meet" className="w-full h-full">
            {/* Dawn Sun over Rural Horizon */}
            <circle cx="610" cy="80" r="46" fill="#FBBF24" fillOpacity="0.22" />
            <circle cx="610" cy="80" r="28" fill="#FDE047" fillOpacity="0.28" />
            {/* Soft Sun Rays */}
            <line x1="610" y1="24" x2="610" y2="10" stroke="#FBBF24" strokeWidth="2" strokeOpacity="0.35" strokeLinecap="round" />
            <line x1="568" y1="42" x2="556" y2="30" stroke="#FBBF24" strokeWidth="2" strokeOpacity="0.3" strokeLinecap="round" />
            <line x1="652" y1="42" x2="664" y2="30" stroke="#FBBF24" strokeWidth="2" strokeOpacity="0.3" strokeLinecap="round" />
            <line x1="548" y1="80" x2="534" y2="80" stroke="#FBBF24" strokeWidth="2" strokeOpacity="0.3" strokeLinecap="round" />
            <line x1="672" y1="80" x2="686" y2="80" stroke="#FBBF24" strokeWidth="2" strokeOpacity="0.3" strokeLinecap="round" />

            {/* Morning Birds in flight */}
            <path d="M230 42 Q240 34 250 42 Q260 34 270 42" stroke="white" strokeWidth="1.5" strokeOpacity="0.4" fill="none" />
            <path d="M285 32 Q293 26 301 32 Q309 26 317 32" stroke="white" strokeWidth="1.2" strokeOpacity="0.35" fill="none" />
            <path d="M360 48 Q370 40 380 48 Q390 40 400 48" stroke="white" strokeWidth="1.3" strokeOpacity="0.3" fill="none" />

            {/* Rolling Terraced Paddy Fields */}
            <path d="M0 182 Q180 142 360 168 Q540 138 750 162 L750 220 L0 220 Z" fill="#34D399" fillOpacity="0.09" />
            <path d="M0 196 Q200 160 420 185 Q620 152 750 174 L750 220 L0 220 Z" fill="white" fillOpacity="0.06" />
            
            {/* Field Furrow Contour Lines */}
            <path d="M30 208 Q240 172 480 198 Q640 172 750 192" stroke="white" strokeWidth="1" strokeOpacity="0.2" fill="none" />
            <path d="M70 216 Q300 188 540 208 Q680 188 750 202" stroke="#FBBF24" strokeWidth="1" strokeOpacity="0.22" fill="none" />

            {/* Indian Rural Village Farmstead (Cottage & Banyan Tree Canopy) */}
            <g transform="translate(540, 0)">
              {/* Spreading Tree Canopy */}
              <path d="M85 180 Q90 145 95 128 Q78 112 84 92 Q105 76 128 86 Q150 72 165 92 Q176 112 160 132 Q166 148 135 154 Q105 154 100 180 Z" fill="#34D399" fillOpacity="0.35" stroke="white" strokeWidth="1.2" strokeOpacity="0.5" />
              {/* Tree Trunk */}
              <path d="M96 180 L102 142 L112 142 L118 180 Z" fill="#064E3B" fillOpacity="0.7" stroke="white" strokeWidth="0.8" strokeOpacity="0.4" />

              {/* Thatched Indian Kisan Cottage */}
              <path d="M12 138 L48 108 L84 138 Z" fill="#FBBF24" fillOpacity="0.45" stroke="white" strokeWidth="1.3" strokeOpacity="0.65" />
              <rect x="20" y="138" width="56" height="42" fill="white" fillOpacity="0.18" stroke="white" strokeWidth="1.2" strokeOpacity="0.45" />
              {/* Cottage Door & Window */}
              <rect x="40" y="150" width="16" height="30" rx="2" fill="#064E3B" fillOpacity="0.75" stroke="white" strokeWidth="1" strokeOpacity="0.5" />
              <rect x="25" y="146" width="10" height="10" rx="1.5" fill="#FDE047" fillOpacity="0.4" stroke="white" strokeWidth="0.8" strokeOpacity="0.5" />

              {/* Stacked Hayrick / Straw Sheaf */}
              <path d="M-10 180 Q-2 155 8 180 Z" fill="#FBBF24" fillOpacity="0.5" stroke="white" strokeWidth="1" strokeOpacity="0.5" />
            </g>

            {/* Graceful Wheat & Paddy Stalks Extending Lengthy to the Left */}
            <g>
              {/* Leftmost Wheat Stalk (Reaching toward the text: x=25 to 105) */}
              <path d="M25 218 Q50 146 88 74" stroke="#FBBF24" strokeWidth="2.2" strokeLinecap="round" strokeOpacity="0.85" />
              <ellipse cx="86" cy="78" rx="4.5" ry="8" transform="rotate(25 86 78)" fill="#FDE047" fillOpacity="0.9" stroke="white" strokeWidth="0.5" strokeOpacity="0.6" />
              <ellipse cx="80" cy="90" rx="4.5" ry="8" transform="rotate(-15 80 90)" fill="#FBBF24" fillOpacity="0.9" stroke="white" strokeWidth="0.5" strokeOpacity="0.6" />
              <ellipse cx="76" cy="102" rx="4.5" ry="8" transform="rotate(22 76 102)" fill="#F59E0B" fillOpacity="0.85" stroke="white" strokeWidth="0.5" strokeOpacity="0.6" />
              <ellipse cx="70" cy="114" rx="4.5" ry="8" transform="rotate(-18 70 114)" fill="#FBBF24" fillOpacity="0.85" stroke="white" strokeWidth="0.5" strokeOpacity="0.6" />
              <ellipse cx="66" cy="126" rx="4.5" ry="8" transform="rotate(20 66 126)" fill="#F59E0B" fillOpacity="0.85" stroke="white" strokeWidth="0.5" strokeOpacity="0.6" />
              {/* Awn Whiskers */}
              <line x1="86" y1="74" x2="105" y2="42" stroke="#FDE047" strokeWidth="1.2" strokeOpacity="0.75" strokeLinecap="round" />
              <line x1="83" y1="78" x2="108" y2="52" stroke="#FDE047" strokeWidth="1.2" strokeOpacity="0.75" strokeLinecap="round" />

              {/* Tall Central Wheat Stalk (x=95 to 185) */}
              <path d="M100 220 Q128 128 158 50" stroke="#FBBF24" strokeWidth="2.4" strokeLinecap="round" strokeOpacity="0.9" />
              <ellipse cx="156" cy="54" rx="4.5" ry="8.5" transform="rotate(22 156 54)" fill="#FDE047" fillOpacity="0.95" stroke="white" strokeWidth="0.5" strokeOpacity="0.7" />
              <ellipse cx="150" cy="67" rx="4.5" ry="8.5" transform="rotate(-18 150 67)" fill="#FBBF24" fillOpacity="0.95" stroke="white" strokeWidth="0.5" strokeOpacity="0.7" />
              <ellipse cx="145" cy="80" rx="4.5" ry="8.5" transform="rotate(20 145 80)" fill="#F59E0B" fillOpacity="0.9" stroke="white" strokeWidth="0.5" strokeOpacity="0.7" />
              <ellipse cx="139" cy="93" rx="4.5" ry="8.5" transform="rotate(-15 139 93)" fill="#FBBF24" fillOpacity="0.9" stroke="white" strokeWidth="0.5" strokeOpacity="0.7" />
              <ellipse cx="134" cy="106" rx="4.5" ry="8.5" transform="rotate(20 134 106)" fill="#F59E0B" fillOpacity="0.85" stroke="white" strokeWidth="0.5" strokeOpacity="0.6" />
              {/* Whiskers */}
              <line x1="156" y1="48" x2="176" y2="18" stroke="#FDE047" strokeWidth="1.3" strokeOpacity="0.8" strokeLinecap="round" />
              <line x1="153" y1="54" x2="182" y2="30" stroke="#FDE047" strokeWidth="1.3" strokeOpacity="0.8" strokeLinecap="round" />

              {/* Drooping Paddy (Dhan) Panicle (x=180 to 290) */}
              <path d="M190 220 Q230 122 270 86 Q295 96 282 136" stroke="#34D399" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.85" />
              <circle cx="272" cy="90" r="3.8" fill="#34D399" fillOpacity="0.9" />
              <circle cx="280" cy="98" r="3.8" fill="#FBBF24" fillOpacity="0.9" />
              <circle cx="286" cy="110" r="3.8" fill="#FBBF24" fillOpacity="0.9" />
              <circle cx="284" cy="122" r="3.8" fill="#34D399" fillOpacity="0.9" />
              <circle cx="279" cy="132" r="3.5" fill="#FBBF24" fillOpacity="0.85" />

              {/* Sprouting Young Leaf Shoot (x=290 to 360) */}
              <path d="M300 220 Q315 170 345 155 Q325 185 305 220 Z" fill="#34D399" fillOpacity="0.6" stroke="white" strokeWidth="0.8" strokeOpacity="0.5" />
              <path d="M305 195 Q330 180 348 190 Q325 205 305 220 Z" fill="#FBBF24" fillOpacity="0.55" stroke="white" strokeWidth="0.8" strokeOpacity="0.5" />
            </g>
          </svg>
        </div>

        <div className="relative z-10 max-w-xl">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{t('dashboard.namaste', { name: farmerName })}</h1>
          <p className="mt-2 text-emerald-100/90 text-base sm:text-lg max-w-lg leading-relaxed">
            {t('dashboard.welcome_msg')}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Active Booking Block */}
      {activeBooking ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Appointment Details */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4 pb-6 border-b border-slate-100">
              <div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wide">
                  {t('dashboard.upcoming_badge')}
                </span>
                <h2 className="text-2xl font-bold text-slate-900 mt-2">{t('dashboard.active_ticket')}</h2>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-sm text-slate-500 block font-medium">{t('dashboard.status')}</span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase mt-1 border ${
                  activeBooking.status === 'in_progress' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                  activeBooking.status === 'called' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  {activeBooking.status}
                </span>
              </div>
            </div>

            {/* Token Highlight */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-200 shrink-0">
                  <QRCodeSVG value={activeBooking.id} size={80} level="M" />
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">{t('dashboard.queue_token')}</p>
                  <p className="text-3xl font-extrabold text-slate-900 mt-1">{activeBooking.token}</p>
                </div>
              </div>
              <div className="text-center md:text-right">
                <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">{t('dashboard.scheduled_date')}</p>
                <p className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-1.5 justify-center md:justify-end">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                  {new Date(activeBooking.booking_dates.date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* Metadata Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex gap-3">
                <Building className="w-6 h-6 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-slate-500">{t('dashboard.centre')}</p>
                  <p className="font-bold text-slate-800 mt-0.5">{activeBooking.procurement_centres.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {activeBooking.procurement_centres.geo_blocks?.block_name}, {activeBooking.procurement_centres.geo_blocks?.district_name}, {activeBooking.procurement_centres.geo_blocks?.state_name}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Wheat className="w-6 h-6 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-slate-500">{t('dashboard.quantity')}</p>
                  <p className="font-bold text-slate-800 mt-0.5">{activeBooking.product_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t('dashboard.weight')}: <span className="font-bold text-slate-700 text-sm">{parseFloat(activeBooking.quantity).toLocaleString('en-IN')} kg</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Live Queue Tracker */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Play className="w-4 h-4 text-indigo-600" />
                {t('dashboard.live_queue')}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5">
                  <span className="text-xs text-indigo-600 font-extrabold uppercase">{t('dashboard.now_serving')}</span>
                  <p className="text-2xl font-black text-indigo-900 mt-1">{nowServing}</p>
                </div>
                <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-5">
                  <span className="text-xs text-amber-600 font-extrabold uppercase">{t('dashboard.people_ahead')}</span>
                  <p className="text-2xl font-black text-amber-900 mt-1">{peopleAhead}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Info Sidebar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">{t('dashboard.instructions')}</h3>
              <ul className="mt-4 space-y-3.5 text-sm text-slate-600">
                <li className="flex gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0 mt-2"></span>
                  <span>{t('dashboard.instr_1')}</span>
                </li>
                <li className="flex gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0 mt-2"></span>
                  <span>{t('dashboard.instr_2')}</span>
                </li>
                <li className="flex gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0 mt-2"></span>
                  <span>{t('dashboard.instr_3', { token: activeBooking.token })}</span>
                </li>
              </ul>
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
              <button 
                onClick={async () => {
                  try {
                    setDownloadingId('token');
                    await generateTokenPDF(activeBooking.id);
                  } catch (err) {
                    setError('Failed to download token PDF.');
                  } finally {
                    setDownloadingId(null);
                  }
                }}
                disabled={downloadingId === 'token'}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors text-sm shadow-md"
              >
                {downloadingId === 'token' ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Download Pass PDF
              </button>
              
              {isCancellable ? (
                <>
                  <button 
                    onClick={() => setIsRescheduleModalOpen(true)}
                    aria-label={t('dashboard.reschedule')}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl transition-colors text-sm"
                  >
                    <RefreshCw className="w-4 h-4" aria-hidden="true" />
                    {t('dashboard.reschedule')}
                  </button>
                  <button 
                    onClick={() => setIsCancelModalOpen(true)}
                    aria-label={t('dashboard.cancel_booking')}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl transition-colors text-sm"
                  >
                    <XCircle className="w-4 h-4" aria-hidden="true" />
                    {t('dashboard.cancel_booking')}
                  </button>
                </>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
                  <p className="text-xs font-semibold text-slate-500">
                    {t('dashboard.mod_closed', { hours: cancelWindowHours })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Empty State CTA */
        <div className="bg-white rounded-2xl border border-slate-200 p-12 shadow-sm text-center max-w-3xl mx-auto space-y-6">
          <div className="flex justify-center">
            <div className="p-5 bg-emerald-50 text-emerald-600 rounded-full">
              <Calendar className="w-12 h-12" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">{t('dashboard.no_appointments')}</h2>
            <p className="text-slate-500 max-w-md mx-auto text-sm leading-relaxed">
              {t('dashboard.no_appt_desc')}
            </p>
          </div>
          <div>
            <button
              onClick={() => navigate('/farmer/book')}
              aria-label={t('dashboard.book_btn')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/25 transition-all duration-200 transform hover:-translate-y-0.5"
            >
              {t('dashboard.book_btn')}
            </button>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 mt-8 mb-6">
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Procurement History
        </button>
        <button
          onClick={() => setActiveTab('msp')}
          className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'msp'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Government Minimum Support Prices (MSP)
        </button>
      </div>

      {/* Tab Content */}
      <div className="mb-8">
        {/* Dynamic MSP Info Cards */}
        {activeTab === 'msp' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-600" />
                <h2 className="text-xl font-bold text-slate-900">{t('dashboard.msp_title')}</h2>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 w-fit">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Official Admin-Verified Rates
              </span>
            </div>

            {loadingMsp ? (
              <div className="flex items-center justify-center py-12 text-slate-500 gap-2">
                <Loader className="w-5 h-5 animate-spin text-emerald-600" />
                <span className="text-sm font-medium">Fetching live MSP rates...</span>
              </div>
            ) : mspRates.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Wheat className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">No active MSP rates published yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {mspRates.map((crop) => {
                  const quintalRate = Number(crop.rate_per_kg) * 100;
                  return (
                    <div
                      key={crop.id}
                      className="border border-slate-200/80 rounded-2xl p-6 bg-gradient-to-b from-white to-slate-50/50 hover:shadow-md hover:border-emerald-200 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-100">
                            MSP Benchmark
                          </span>
                          <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded">
                            ₹{Number(crop.rate_per_kg).toFixed(2)}/kg
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">{crop.crop_name}</h3>
                        <p className="text-3xl font-extrabold text-slate-900 mt-3">
                          ₹{quintalRate.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          <span className="text-xs text-slate-500 font-medium ml-1.5">{t('dashboard.per_quintal')}</span>
                        </p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span>Effective date:</span>
                        <span className="font-semibold text-slate-700">
                          {crop.effective_date ? new Date(crop.effective_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Immediate'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Procurement History Section */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <History className="w-5 h-5 text-emerald-600" />
              <h2 className="text-xl font-bold text-slate-900">Procurement History</h2>
            </div>
            {procurementHistory.length > 0 ? (
              <div className="space-y-4">
                {procurementHistory.map((item) => (
                  <div key={item.id} className="border border-slate-100 rounded-xl p-5 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-bold text-slate-800 text-lg">{item.bookings.product_name}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                          Token {item.bookings.token}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mb-2">
                        {new Date(item.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })} • {item.bookings.procurement_centres.name}
                      </p>
                      <div className="flex gap-4 text-sm font-medium">
                        <span className="text-slate-700">Accepted: {item.quantity_accepted} kg</span>
                        <span className="text-emerald-700">Amount: ₹{item.total_amount?.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col md:items-end gap-3 w-full md:w-auto">
                      <span className={`inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        item.payments[0]?.status === 'credited' ? 'bg-emerald-100 text-emerald-800' :
                        item.payments[0]?.status === 'initiated' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {item.payments[0]?.status === 'credited' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        Payment {item.payments[0]?.status || 'pending'}
                      </span>
                      
                      <button
                        onClick={() => handleDownloadReceipt(item.id)}
                        disabled={downloadingId === item.id}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-colors text-xs"
                      >
                        {downloadingId === item.id ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Download Receipt
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 font-medium">
                No procurement history found.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cancel Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="cancel-title">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 id="cancel-title" className="text-xl font-bold text-slate-900">{t('dashboard.cancel_title')}</h3>
              <p className="text-sm text-slate-500 mt-2">
                {t('dashboard.cancel_desc', { token: activeBooking?.token })}
              </p>
              
              <div className="mt-6">
                <label htmlFor="cancel-reason" className="block text-sm font-semibold text-slate-700 mb-2">{t('dashboard.cancel_reason')}</label>
                <select 
                  id="cancel-reason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:ring-rose-500 focus:border-rose-500"
                >
                  <option value="Personal reasons">{t('dashboard.reason_personal')}</option>
                  <option value="Wrong date selected">{t('dashboard.reason_wrong_date')}</option>
                  <option value="Crop not ready">{t('dashboard.reason_not_ready')}</option>
                  <option value="Other">{t('dashboard.reason_other')}</option>
                </select>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => setIsCancelModalOpen(false)}
                className="flex-1 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-colors text-sm"
              >
                {t('dashboard.keep_booking')}
              </button>
              <button 
                onClick={handleCancelBooking}
                disabled={cancelLoading}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors text-sm flex justify-center items-center gap-2"
              >
                {cancelLoading ? <Loader className="w-4 h-4 animate-spin" /> : t('dashboard.confirm_cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      <RescheduleModal 
        isOpen={isRescheduleModalOpen} 
        onClose={() => setIsRescheduleModalOpen(false)} 
        booking={activeBooking}
        onSuccess={() => {
          // Trigger a full reload to get the newly scheduled booking data
          window.location.reload();
        }}
      />
    </div>
  );
};

export default FarmerDashboard;
