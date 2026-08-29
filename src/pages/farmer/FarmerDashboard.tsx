import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Wheat, Clock, Award, AlertCircle, Loader, Sprout, Building, Play, RefreshCw, XCircle, Download, CheckCircle2, History } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useLiveQueue } from '../../hooks/useLiveQueue';
import { RescheduleModal } from '../../components/farmer/RescheduleModal';
import { useTranslation } from 'react-i18next';
import { generateProcurementReceipt } from '../../utils/pdfGenerator';
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

        // Get past completed procurements
        const { data: historyData, error: histErr } = await supabase
          .from('procurements')
          .select(`
            id,
            created_at,
            quantity_accepted,
            total_amount,
            note,
            bookings!inner (
              farmer_id,
              token,
              product_name,
              booking_dates ( date ),
              procurement_centres ( name )
            ),
            payments ( status )
          `)
          .eq('bookings.farmer_id', session.user.id)
          .order('created_at', { ascending: false });

        if (!histErr && historyData) {
          setProcurementHistory(historyData);
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
    (b.status === 'booked' || b.status === 'called') && 
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
      <div className="bg-gradient-to-r from-emerald-800 to-teal-700 text-white rounded-2xl p-8 shadow-xl shadow-emerald-950/15 relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 translate-x-12 translate-y-12">
          <Sprout className="w-80 h-80" />
        </div>
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{t('dashboard.namaste', { name: farmerName })}</h1>
          <p className="mt-2 text-emerald-100/90 text-base sm:text-lg max-w-2xl">
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
              <div className="flex items-center gap-4">
                <div className="p-4 bg-emerald-600 text-white rounded-xl shadow-md">
                  <Sprout className="w-8 h-8" />
                </div>
                <div>
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

      {/* Static MSP Info Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Award className="w-5 h-5 text-emerald-600" />
          <h2 className="text-xl font-bold text-slate-900">{t('dashboard.msp_title')}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="border border-slate-100 rounded-xl p-6 bg-slate-50/50 flex flex-col justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">{t('dashboard.wheat')}</p>
              <p className="text-2xl font-extrabold text-slate-800 mt-2">₹2,275 <span className="text-xs text-slate-400 font-medium">{t('dashboard.per_quintal')}</span></p>
            </div>
            <span className="text-xs text-slate-400 block mt-4 font-semibold uppercase tracking-wider">{t('dashboard.rabi')}</span>
          </div>

          <div className="border border-slate-100 rounded-xl p-6 bg-slate-50/50 flex flex-col justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">{t('dashboard.paddy')}</p>
              <p className="text-2xl font-extrabold text-slate-800 mt-2">₹2,183 <span className="text-xs text-slate-400 font-medium">{t('dashboard.per_quintal')}</span></p>
            </div>
            <span className="text-xs text-slate-400 block mt-4 font-semibold uppercase tracking-wider">{t('dashboard.kharif')}</span>
          </div>

          <div className="border border-slate-100 rounded-xl p-6 bg-slate-50/50 flex flex-col justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">{t('dashboard.maize')}</p>
              <p className="text-2xl font-extrabold text-slate-800 mt-2">₹2,090 <span className="text-xs text-slate-400 font-medium">{t('dashboard.per_quintal')}</span></p>
            </div>
            <span className="text-xs text-slate-400 block mt-4 font-semibold uppercase tracking-wider">{t('dashboard.kharif')}</span>
          </div>
        </div>
      </div>

      {/* Procurement History Section */}
      {procurementHistory.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <History className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-bold text-slate-900">Procurement History</h2>
          </div>
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
        </div>
      )}

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
