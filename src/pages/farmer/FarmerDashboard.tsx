import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Wheat, Clock, Award, AlertCircle, Loader, Building, Play, RefreshCw, XCircle, Download, CheckCircle2, History, Bot, Volume2, Star, Check, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useLiveQueue } from '../../hooks/useLiveQueue';
import { RescheduleModal } from '../../components/farmer/RescheduleModal';
import { useTranslation } from 'react-i18next';
import { generateProcurementReceipt, generateTokenPDF } from '../../utils/pdfGenerator';
import { calculateArrivalWindow } from '../../utils/arrivalEstimator';
import { QRCodeSVG } from 'qrcode.react';
import { DashboardBackground } from '../../components/DashboardBackground';

// Helper function for Text-to-Speech audio readout for farmers
const speakBookingStatus = (token: string, status: string, peopleAhead: number, arrivalWindow?: any, lang: string = 'hi') => {
  if (!('speechSynthesis' in window)) {
    alert('Audio speech is not supported on this browser.');
    return;
  }
  window.speechSynthesis.cancel();
  
  const voiceLangMap: Record<string, { bcp: string; template: (token: string, status: string, peopleAhead: number, arrivalWindow?: any) => string }> = {
    en: {
      bcp: 'en-IN',
      template: (t, s, p, a) => {
        let msg = `Hello! Your token number is ${t}. `;
        if (s === 'called') msg += 'It is your turn, please reach the depot immediately. ';
        else if (s === 'in_progress') msg += 'Your crop weighing and procurement is in progress. ';
        else {
          msg += `Your token is secured. There are ${p} people ahead of you. `;
          if (a) msg += `Your estimated arrival time is between ${a.earliestTime} and ${a.latestTime}. `;
        }
        return msg + 'Thank you.';
      }
    },
    hi: {
      bcp: 'hi-IN',
      template: (t, s, p, a) => {
        let msg = `नमस्ते! आपका टोकन नंबर है ${t}। `;
        if (s === 'called') msg += 'आपकी बारी आ चुकी है, कृपया तुरंत केंद्र पहुंचें। ';
        else if (s === 'in_progress') msg += 'आपकी फसल की तुलाई और खरीद प्रक्रिया चल रही है। ';
        else {
          msg += `आपकी स्थिति: टोकन सुरक्षित है। आपसे आगे ${p} लोग हैं। `;
          if (a) msg += `आपका संभावित पहुंचने का समय ${a.earliestTime} से ${a.latestTime} के बीच है। `;
        }
        return msg + 'धन्यवाद।';
      }
    },
    bn: {
      bcp: 'bn-IN',
      template: (t, s, p, a) => {
        let msg = `নমস্কার! আপনার টোকেন নম্বর হলো ${t}। `;
        if (s === 'called') msg += 'আপনার নম্বর এসে গেছে, অনুগ্রহ করে অবিলম্বে ডিপোতে যান। ';
        else if (s === 'in_progress') msg += 'আপনার ফসলের ওজন ও ক্রয় প্রক্রিয়া চলছে। ';
        else {
          msg += `আপনার টোকেন নিশ্চিত হয়েছে। আপনার সামনে ${p} জন আছেন। `;
          if (a) msg += `আপনার পৌঁছানোর আনুমানিক সময় ${a.earliestTime} থেকে ${a.latestTime}। `;
        }
        return msg + 'ধন্যবাদ।';
      }
    },
    mr: {
      bcp: 'mr-IN',
      template: (t, s, p, a) => {
        let msg = `नमस्कार! तुमचा टोकन क्रमांक ${t} आहे. `;
        if (s === 'called') msg += 'तुमची पाळी आली आहे, कृपया त्वरित केंद्रावर पोहोचा. ';
        else if (s === 'in_progress') msg += 'तुमच्या पिकाची मोजणी प्रक्रिया सुरू आहे. ';
        else {
          msg += `तुमचा टोकन सुरक्षित आहे. तुमच्या पुढे ${p} लोक आहेत. `;
          if (a) msg += `तुमची पोहोचण्याची अंदाजे वेळ ${a.earliestTime} ते ${a.latestTime} आहे. `;
        }
        return msg + 'धन्यवाद.';
      }
    },
    te: {
      bcp: 'te-IN',
      template: (t, s, p, a) => {
        let msg = `నమస్కారం! మీ టోకెన్ నంబర్ ${t}. `;
        if (s === 'called') msg += 'మీ వంతు వచ్చింది, దయచేసి వెంటనే కేంద్రానికి చేరుకోండి. ';
        else if (s === 'in_progress') msg += 'మీ పంట తూకం ప్రక్రియ జరుగుతోంది. ';
        else {
          msg += `మీ టోకెన్ భద్రపరచబడింది. మీ కంటే ముందు ${p} మంది ఉన్నారు. `;
          if (a) msg += `మీరు చేరుకునే అంచనా సమయం ${a.earliestTime} నుండి ${a.latestTime}. `;
        }
        return msg + 'ధన్యవాదాలు.';
      }
    },
    ta: {
      bcp: 'ta-IN',
      template: (t, s, p, a) => {
        let msg = `வணக்கம்! உங்கள் டோக்கன் எண் ${t}. `;
        if (s === 'called') msg += 'உங்கள் முறை வந்துவிட்டது, உடனடியாக மையத்திற்கு வரவும். ';
        else if (s === 'in_progress') msg += 'உங்கள் பயிர் எடை போடும் பணி நடக்கிறது. ';
        else {
          msg += `உங்கள் டோக்கன் உறுதி செய்யப்பட்டது. உங்களுக்கு આગળ ${p} நபர்கள் உள்ளனர். `;
          if (a) msg += `நீங்கள் வரும் நேரம் ${a.earliestTime} முதல் ${a.latestTime} வரை. `;
        }
        return msg + 'நன்றி.';
      }
    },
    pa: {
      bcp: 'pa-IN',
      template: (t, s, p, a) => {
        let msg = `ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ! ਤੁਹਾਡਾ ਟੋਕਨ ਨੰਬਰ ${t} ਹੈ। `;
        if (s === 'called') msg += 'ਤੁਹਾਡੀ ਵਾਰੀ ਆ ਗਈ ਹੈ, ਕਿਰਪਾ ਕਰਕੇ ਤੁਰੰਤ ਕੇਂਦਰ ਪਹੁੰਚੋ। ';
        else if (s === 'in_progress') msg += 'ਤੁਹਾਡੀ ਫ਼ਸਲ ਦੀ ਤੋਲ ਪ੍ਰਕਿਰਿਆ ਚੱਲ ਰਹੀ ਹੈ। ';
        else {
          msg += `ਤੁਹਾਡਾ ਟੋਕਨ ਸੁਰੱਖਿਅਤ ਹੈ। ਤੁਹਾਡੇ ਤੋਂ ਅੱਗੇ ${p} ਲੋਕ ਹਨ। `;
          if (a) msg += `ਤੁਹਾਡਾ ਪਹੁੰਚਣ ਦਾ ਸਮਾਂ ${a.earliestTime} ਤੋਂ ${a.latestTime} ਹੈ। `;
        }
        return msg + 'ਧੰਨਵਾਦ।';
      }
    }
  };

  const normLang = (lang || 'hi').toLowerCase().split('-')[0];
  const selected = voiceLangMap[normLang] || voiceLangMap['hi'];
  const text = selected.template(token, status, peopleAhead, arrivalWindow);

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = selected.bcp;
  utterance.rate = 0.88;
  window.speechSynthesis.speak(utterance);
};


const FarmerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [procurementHistory, setProcurementHistory] = useState<any[]>([]);
  const [farmerName, setFarmerName] = useState('Farmer');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  
  const [centreOpeningTime, setCentreOpeningTime] = useState<string>('');
  const [todaysPace, setTodaysPace] = useState<number | null>(null);
  const [arrivalWindow, setArrivalWindow] = useState<{ earliestTime: string; latestTime: string } | null>(null);
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  
  const { t, i18n } = useTranslation();
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'booked': return t('dashboard.status_booked');
      case 'called': return t('dashboard.status_called');
      case 'in_progress': return t('dashboard.status_in_progress');
      case 'completed': return t('dashboard.status_completed');
      case 'cancelled': return t('dashboard.status_cancelled');
      default: return status;
    }
  };

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
        try {
          const { data: profile } = await supabase
            .from('users')
            .select('name')
            .eq('id', session.user.id)
            .single();
          if (profile?.name) {
            setFarmerName(profile.name);
            localStorage.setItem('kisaan_farmer_name', profile.name);
          }
        } catch {
          const cachedName = localStorage.getItem('kisaan_farmer_name');
          if (cachedName) setFarmerName(cachedName);
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

        if (!bookingErr && bookings && bookings.length > 0) {
          setActiveBooking(bookings[0]);
          localStorage.setItem('kisaan_active_booking', JSON.stringify(bookings[0]));
        } else if (bookingErr && !navigator.onLine) {
          throw new Error('OFFLINE_FALLBACK');
        }

        // Get past completed procurements for this farmer
        try {
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
              localStorage.setItem('kisaan_procurement_history', JSON.stringify(historyData));
            }
          }
        } catch {
          const cachedHist = localStorage.getItem('kisaan_procurement_history');
          if (cachedHist) setProcurementHistory(JSON.parse(cachedHist));
        }
        
        // Fetch opening time for the active booking's centre
        if (bookings && bookings.length > 0) {
          const centreId = bookings[0].centre_id;
          try {
            const { data: cData } = await supabase
              .from('procurement_centres')
              .select('opening_time')
              .eq('id', centreId)
              .single();
              
            if (cData?.opening_time) {
              const opTime = cData.opening_time.substring(0, 5);
              setCentreOpeningTime(opTime);
              localStorage.setItem('kisaan_centre_opening_time', opTime);
            }
          } catch {
            const cachedOp = localStorage.getItem('kisaan_centre_opening_time');
            if (cachedOp) setCentreOpeningTime(cachedOp);
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
            localStorage.setItem('kisaan_msp_rates', JSON.stringify(mspData));
          } else {
            setMspRates([
              { id: '1', crop_name: 'Wheat', rate_per_kg: 22.75, effective_date: '2024-04-01' },
              { id: '2', crop_name: 'Paddy', rate_per_kg: 21.83, effective_date: '2024-04-01' },
              { id: '3', crop_name: 'Maize', rate_per_kg: 20.90, effective_date: '2024-04-01' }
            ]);
          }
        } catch {
          const cachedMsp = localStorage.getItem('kisaan_msp_rates');
          if (cachedMsp) setMspRates(JSON.parse(cachedMsp));
          setLoadingMsp(false);
        } finally {
          setLoadingMsp(false);
        }

      } catch (err: any) {
        console.warn('Network or error during dashboard fetch, attempting offline restore:', err);
        let restored = false;
        try {
          const cachedBooking = localStorage.getItem('kisaan_active_booking');
          if (cachedBooking) {
            setActiveBooking(JSON.parse(cachedBooking));
            restored = true;
          }
          const cachedName = localStorage.getItem('kisaan_farmer_name');
          if (cachedName) setFarmerName(cachedName);

          const cachedHist = localStorage.getItem('kisaan_procurement_history');
          if (cachedHist) setProcurementHistory(JSON.parse(cachedHist));

          const cachedOp = localStorage.getItem('kisaan_centre_opening_time');
          if (cachedOp) setCentreOpeningTime(cachedOp);
        } catch (e) {
          console.error('Failed to load cached booking:', e);
        }

        if (restored) {
          setError(null);
        } else {
          setError('No cached ticket found offline. Connect to network to fetch bookings.');
        }
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

  // Compute today's processing pace securely via RPC on queue updates
  useEffect(() => {
    if (!activeBooking?.centre_id) return;
    const fetchPace = async () => {
      try {
        const { data } = await supabase.rpc('get_todays_processing_pace', {
          p_centre_id: activeBooking.centre_id
        });
        if (data !== null) {
          setTodaysPace(data as number);
        }
      } catch (e) {
        console.error('Failed to fetch pace:', e);
      }
    };
    fetchPace();
  }, [queue, activeBooking?.centre_id]);

  // Calculate arrival window
  useEffect(() => {
    if (centreOpeningTime && todaysPace && peopleAhead >= 0) {
      setArrivalWindow(
        calculateArrivalWindow(
          centreOpeningTime,
          todaysPace,
          peopleAhead,
          activeBooking?.booking_dates?.date
        )
      );
    }
  }, [centreOpeningTime, todaysPace, peopleAhead, activeBooking?.booking_dates?.date]);

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

  const handleDownloadPass = async () => {
    if (!activeBooking) return;
    try {
      setDownloadingId('token');
      const timeWindow = arrivalWindow 
        ? `${arrivalWindow.earliestTime} — ${arrivalWindow.latestTime}` 
        : undefined;
      await generateTokenPDF(activeBooking.id, timeWindow);
    } catch (err) {
      setError('Failed to download token PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  const mspSnapshotRows = mspRates && mspRates.length > 0
    ? mspRates.slice(0, 3)
    : [
        { id: '1', crop_name: 'Wheat', rate_per_kg: 22.75 },
        { id: '2', crop_name: 'Paddy', rate_per_kg: 21.83 },
        { id: '3', crop_name: 'Maize', rate_per_kg: 20.90 }
      ];

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
    <div className="space-y-6 relative z-0 pb-24 md:pb-8">
      <DashboardBackground variant="farmer" />
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-700 text-white rounded-2xl p-5 sm:p-8 shadow-xl shadow-emerald-950/15 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
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

      {/* Kisan AI Assistant Easy Voice & Option Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-700 rounded-2xl p-5 shadow-lg text-white flex flex-col sm:flex-row items-center justify-between gap-4 border border-amber-300/40">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30">
            <Bot className="w-8 h-8 text-amber-200" />
          </div>
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h2 className="text-lg font-black tracking-tight text-white">{t('dashboard.ai_banner_title')}</h2>
              <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-white text-slate-900 rounded-full shadow-xs">
                {t('dashboard.ai_banner_tag')}
              </span>
            </div>
            <p className="text-xs text-amber-100 mt-1 max-w-xl font-medium">
              {t('dashboard.ai_banner_desc')}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            const btn = document.querySelector('button[aria-label="Open Kisaan Saathi AI Assistant"]') as HTMLButtonElement;
            if (btn) btn.click();
          }}
          className="w-full sm:w-auto px-5 py-3 bg-white text-slate-900 hover:bg-amber-50 font-black rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <Volume2 className="w-4 h-4 text-emerald-600" />
          <span>{t('dashboard.ai_banner_btn')}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Active Booking Block */}
      {activeBooking ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Appointment Details (md:col-span-2) */}
          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 md:p-8 shadow-xs space-y-6">

            {/* Header: Title & Status */}
            <div className="flex flex-wrap justify-between items-center gap-4 pb-5 border-b border-slate-100">
              <div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wide">
                  {t('dashboard.upcoming_badge')}
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">{t('dashboard.active_ticket')}</h2>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-xs sm:text-sm text-slate-500 block font-medium">{t('dashboard.status')}</span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase mt-1 border ${
                  activeBooking.status === 'in_progress' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                  activeBooking.status === 'called' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  {getStatusLabel(activeBooking.status)}
                </span>
              </div>
            </div>

            {/* Token Highlight & Pass Action (Requirement 3: Download Pass PDF inside Ticket Card near QR / Token) */}
            <div className="bg-slate-50 rounded-2xl p-4 sm:p-6 border border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-6">
              <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left w-full sm:w-auto">
                <div className="p-2.5 bg-white rounded-xl shadow-xs border border-slate-200 shrink-0 min-w-[96px] min-h-[96px] flex items-center justify-center">
                  <QRCodeSVG value={activeBooking.id} size={84} level="M" />
                </div>
                <div className="flex flex-col items-center sm:items-start gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">{t('dashboard.queue_token')}</p>
                    <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-0.5">{activeBooking.token}</p>
                  </div>
                  {/* Download Pass PDF Button inside Ticket Card (Desktop / Tablet view) */}
                  <button
                    onClick={handleDownloadPass}
                    disabled={downloadingId === 'token'}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl transition-all text-xs sm:text-sm shadow-xs cursor-pointer"
                    aria-label={t('dashboard.download_pass_pdf')}
                  >
                    {downloadingId === 'token' ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    <span>{t('dashboard.download_pass_pdf')}</span>
                  </button>
                </div>
              </div>

              <div className="text-center sm:text-right w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">{t('dashboard.scheduled_date')}</p>
                <p className="text-base sm:text-lg font-bold text-slate-900 mt-1 flex items-center gap-1.5 justify-center sm:justify-end">
                  <Calendar className="w-5 h-5 text-emerald-600 shrink-0" />
                  {new Date(activeBooking.booking_dates.date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
                {arrivalWindow && (
                  <p className="text-xs text-slate-500 mt-1">
                    Slot: {arrivalWindow.earliestTime} – {arrivalWindow.latestTime}
                  </p>
                )}
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

            {/* Live Queue Status Card Container (Requirement 2: Progress strip inside here, above the 3 stat tiles) */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Play className="w-4 h-4 text-indigo-600" />
                  {t('dashboard.live_queue')}
                </h3>
                {/* Audio Status Listen Button */}
                <button
                  onClick={() => speakBookingStatus(activeBooking.token, activeBooking.status, peopleAhead, arrivalWindow, i18n.language)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0"
                  title={t('dashboard.listen_status')}
                >
                  <Volume2 className="w-3.5 h-3.5 text-amber-700" />
                  <span>{t('dashboard.listen_status')}</span>
                </button>
              </div>

              {/* Compact 3-Step Horizontal Progress Strip */}
              {(() => {
                const currentIdx = activeBooking.status === 'completed' ? 2 : activeBooking.status === 'called' || activeBooking.status === 'in_progress' ? 1 : 0;
                const steps = [
                  { id: 'booked', label: 'Booked' },
                  { id: 'called', label: 'Head to Depot' },
                  { id: 'completed', label: 'Weighing Completed' }
                ];
                return (
                  <div className="w-full bg-slate-50/90 border border-slate-200/80 rounded-xl p-3 sm:p-4 mb-4 overflow-x-auto">
                    <div className="min-w-[280px] sm:min-w-0 relative flex items-center justify-between px-2 sm:px-6">
                      {/* Connecting Line Track */}
                      <div className="absolute top-3.5 left-8 right-8 h-0.5 bg-slate-200 z-0" />
                      <div
                        className="absolute top-3.5 left-8 h-0.5 bg-emerald-500 transition-all duration-500 z-0"
                        style={{ width: `${(currentIdx / 2) * 85}%` }}
                      />

                      {steps.map((s, idx) => {
                        const isDone = idx < currentIdx || (currentIdx === 2 && idx === 2);
                        const isCurrent = idx === currentIdx && !isDone;

                        return (
                          <div key={s.id} className="flex flex-col items-center text-center relative z-10">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                                isDone
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : isCurrent
                                  ? 'bg-emerald-600 text-white ring-4 ring-emerald-200/70 shadow-xs'
                                  : 'bg-white border-2 border-slate-300 text-slate-300'
                              }`}
                            >
                              {isDone ? (
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              ) : isCurrent ? (
                                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                              ) : (
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                              )}
                            </div>
                            <span
                              className={`text-xs mt-1.5 font-bold whitespace-nowrap ${
                                isCurrent
                                  ? 'text-emerald-800'
                                  : isDone
                                  ? 'text-slate-800'
                                  : 'text-slate-400'
                              }`}
                            >
                              {s.label}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {isDone ? 'Completed' : isCurrent ? 'Active' : 'Upcoming'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* 3 Stat Tiles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 sm:p-5">
                  <span className="text-xs text-indigo-600 font-extrabold uppercase">{t('dashboard.now_serving')}</span>
                  <p className="text-2xl font-black text-indigo-900 mt-1">{nowServing}</p>
                </div>
                <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 sm:p-5">
                  <span className="text-xs text-amber-600 font-extrabold uppercase">{t('dashboard.people_ahead')}</span>
                  <p className="text-2xl font-black text-amber-900 mt-1">{peopleAhead}</p>
                </div>
                <div className="bg-teal-50/50 border border-teal-100 rounded-xl p-4 sm:p-5 relative overflow-hidden">
                  <Clock className="w-16 h-16 text-teal-500/10 absolute -right-2 -bottom-2" />
                  <span className="text-xs text-teal-700 font-extrabold uppercase relative z-10">Estimated Arrival</span>
                  <p className="text-lg font-black text-teal-900 mt-1 tracking-tight leading-tight relative z-10">
                    {arrivalWindow ? (
                      <>
                        <span className="block">{arrivalWindow.earliestTime} <span className="text-teal-400 mx-0.5">—</span></span>
                        <span className="block">{arrivalWindow.latestTime}</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Instructions, Secondary Actions & MSP Price Snapshot (md:col-span-1) */}
          <div className="md:col-span-1 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between gap-6">
            {/* 4a. Gate Pass Instructions */}
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">{t('dashboard.instructions')}</h3>
              </div>
              <ul className="mt-3.5 space-y-3 text-xs sm:text-sm text-slate-600">
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0 mt-2" />
                  <span>{t('dashboard.instr_1')}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0 mt-2" />
                  <span>{t('dashboard.instr_2')}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0 mt-2" />
                  <span>{t('dashboard.instr_3', { token: activeBooking.token })}</span>
                </li>
              </ul>
            </div>

            {/* 4b. Secondary / Outlined Style Action Buttons */}
            <div className="pt-4 border-t border-slate-100 space-y-2.5">
              {isCancellable ? (
                <>
                  <button
                    onClick={() => setIsRescheduleModalOpen(true)}
                    aria-label={t('dashboard.reschedule')}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-indigo-50/50 hover:bg-indigo-100/70 text-indigo-700 font-bold rounded-xl border border-indigo-200 transition-colors text-xs sm:text-sm cursor-pointer active:scale-95"
                  >
                    <RefreshCw className="w-4 h-4 text-indigo-600" aria-hidden="true" />
                    <span>{t('dashboard.reschedule')}</span>
                  </button>
                  <button
                    onClick={() => setIsCancelModalOpen(true)}
                    aria-label={t('dashboard.cancel_booking')}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-rose-50/50 hover:bg-rose-100/70 text-rose-700 font-bold rounded-xl border border-rose-200 transition-colors text-xs sm:text-sm cursor-pointer active:scale-95"
                  >
                    <XCircle className="w-4 h-4 text-rose-600" aria-hidden="true" />
                    <span>{t('dashboard.cancel_booking')}</span>
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

            {/* 4c. Compact 2-3 Row MSP Price Snapshot */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <Wheat className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">MSP Snapshot</span>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('msp');
                    const mspElem = document.getElementById('farmer-tabs-section');
                    if (mspElem) {
                      mspElem.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                >
                  View All →
                </button>
              </div>
              <div className="bg-slate-50/80 rounded-xl border border-slate-100 divide-y divide-slate-100 text-xs">
                {mspSnapshotRows.map((crop) => (
                  <div key={crop.id || crop.crop_name} className="flex items-center justify-between px-3 py-2">
                    <span className="font-semibold text-slate-700">{crop.crop_name}</span>
                    <div className="text-right font-mono">
                      <span className="font-bold text-emerald-800">
                        ₹{(Number(crop.rate_per_kg) * 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1 font-sans">/qtl</span>
                    </div>
                  </div>
                ))}
              </div>
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

      {/* 5. Mobile Sticky Bottom Action Bar (when activeBooking exists) */}
      {activeBooking && (
        <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-3 py-2 z-40 md:hidden shadow-lg flex items-center justify-between gap-2 safe-bottom">
          {/* Docked AI Saathi Icon (min touch target 44x44px) */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-kisan-ai'))}
            className="flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 active:scale-95 transition-all cursor-pointer shrink-0"
            aria-label="Open Kisaan Saathi AI"
          >
            <div className="relative">
              <Bot className="w-4 h-4 text-emerald-700" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-amber-400 rounded-full" />
            </div>
            <span className="text-[10px] font-bold text-emerald-900 leading-tight">AI Saathi</span>
          </button>

          {/* Download Pass Button */}
          <button
            onClick={handleDownloadPass}
            disabled={downloadingId === 'token'}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer truncate"
          >
            {downloadingId === 'token' ? <Loader className="w-4 h-4 animate-spin shrink-0" /> : <Download className="w-4 h-4 shrink-0" />}
            <span className="truncate">Download Pass</span>
          </button>

          {/* Reschedule Button */}
          {isCancellable && (
            <button
              onClick={() => setIsRescheduleModalOpen(true)}
              className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] px-2.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl border border-indigo-200 text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0"
              aria-label={t('dashboard.reschedule')}
              title={t('dashboard.reschedule')}
            >
              <RefreshCw className="w-4 h-4 text-indigo-600" />
            </button>
          )}

          {/* Cancel Button */}
          {isCancellable && (
            <button
              onClick={() => setIsCancelModalOpen(true)}
              className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl border border-rose-200 text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0"
              aria-label={t('dashboard.cancel_booking')}
              title={t('dashboard.cancel_booking')}
            >
              <XCircle className="w-4 h-4 text-rose-600" />
            </button>
          )}
        </div>
      )}

      {/* Docked AI Saathi on mobile when no active appointment */}
      {!activeBooking && (
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-kisan-ai'))}
          className="fixed bottom-4 right-4 z-40 md:hidden flex items-center gap-2 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white px-4 py-2.5 rounded-full shadow-lg border border-emerald-500/30 active:scale-95 transition-all cursor-pointer min-h-[44px]"
          aria-label="Open Kisaan Saathi AI"
        >
          <Bot className="w-5 h-5 text-amber-300" />
          <span className="text-xs font-bold">Kisaan Saathi AI</span>
        </button>
      )}

      {/* Tabs Navigation */}
      <div id="farmer-tabs-section" className="flex border-b border-slate-200 mt-8 mb-6">
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          {t('dashboard.tab_history')}
        </button>
        <button
          onClick={() => setActiveTab('msp')}
          className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'msp'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          {t('dashboard.tab_msp')}
        </button>
      </div>

      {/* Tab Content */}
      <div className="mb-8">
        {/* Dynamic MSP Info Cards */}
        {activeTab === 'msp' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 md:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-600" />
                <h2 className="text-xl font-bold text-slate-900">{t('dashboard.msp_title')}</h2>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 w-fit">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {t('dashboard.msp_official_badge')}
              </span>
            </div>

            {loadingMsp ? (
              <div className="flex items-center justify-center py-12 text-slate-500 gap-2">
                <Loader className="w-5 h-5 animate-spin text-emerald-600" />
                <span className="text-sm font-medium">{t('dashboard.fetching_msp')}</span>
              </div>
            ) : mspRates.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Wheat className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">{t('dashboard.no_msp_rates')}</p>
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
                            {t('dashboard.msp_benchmark')}
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
                        <span>{t('dashboard.effective_date')}</span>
                        <span className="font-semibold text-slate-700">
                          {crop.effective_date ? new Date(crop.effective_date).toLocaleDateString(i18n.language === 'en' ? 'en-IN' : i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }) : t('dashboard.immediate')}
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
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <History className="w-5 h-5 text-emerald-600" />
              <h2 className="text-xl font-bold text-slate-900">{t('dashboard.history_title')}</h2>
            </div>
            {procurementHistory.length > 0 ? (
              <div className="space-y-4">
                {procurementHistory.map((item) => (
                  <div key={item.id} className="border border-slate-200/80 rounded-2xl p-5 bg-slate-50/50 flex flex-col space-y-4 hover:shadow-sm transition-all">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-bold text-slate-800 text-lg">{item.bookings.product_name}</span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-mono">
                            {t('dashboard.history_token', { token: item.bookings.token })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mb-2">
                          {new Date(item.created_at).toLocaleDateString(i18n.language === 'en' ? 'en-IN' : i18n.language, {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })} • {item.bookings.procurement_centres.name}
                        </p>
                        <div className="flex gap-4 text-sm font-medium">
                          <span className="text-slate-700">{t('dashboard.history_accepted', { qty: item.quantity_accepted })}</span>
                          <span className="text-emerald-700 font-bold">{t('dashboard.history_amount', { amount: item.total_amount?.toLocaleString('en-IN') })}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col md:items-end gap-3 w-full md:w-auto">
                        <span className={`inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          item.payments[0]?.status === 'credited' ? 'bg-emerald-100 text-emerald-800' :
                          item.payments[0]?.status === 'initiated' ? 'bg-indigo-100 text-indigo-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {item.payments[0]?.status === 'credited' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                          {t('dashboard.payment_status', { status: getStatusLabel(item.payments[0]?.status || 'pending') })}
                        </span>
                        
                        <button
                          onClick={() => handleDownloadReceipt(item.id)}
                          disabled={downloadingId === item.id}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-colors text-xs cursor-pointer"
                        >
                          {downloadingId === item.id ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                          {t('dashboard.download_receipt')}
                        </button>
                      </div>
                    </div>

                    {/* QUALITY INSPECTION REVIEW & DEPOT RATING SECTION */}
                    <div className="pt-3 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-emerald-50/80 border border-emerald-100 p-3 rounded-xl">
                        <span className="font-extrabold text-emerald-900 flex items-center gap-1 mb-1">
                          <Award className="w-4 h-4 text-emerald-600" />
                          Inspection Quality Grade & Remarks
                        </span>
                        <p className="text-slate-700 font-medium">
                          {item.note || 'Grade A • Premium Quality (Moisture < 12%, No Foreign Matter)'}
                        </p>
                      </div>
                      <div className="bg-white border border-slate-200 p-3 rounded-xl flex flex-col justify-between">
                        <span className="font-extrabold text-slate-800 flex items-center gap-1 mb-1">
                          <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                          Depot Service Rating & Review
                        </span>
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => {
                                  setUserRatings(prev => ({ ...prev, [item.id]: star }));
                                  try {
                                    const centreId = item.bookings?.centre_id || item.bookings?.procurement_centres?.id;
                                    if (centreId) {
                                      const saved = JSON.parse(localStorage.getItem('kisaan_centre_ratings') || '{}');
                                      const current = saved[centreId] || [];
                                      current.push(star);
                                      saved[centreId] = current;
                                      localStorage.setItem('kisaan_centre_ratings', JSON.stringify(saved));
                                    }
                                  } catch (e) {
                                    console.error('Failed to save rating:', e);
                                  }
                                }}
                                title={`Rate ${star} Stars`}
                                className="cursor-pointer hover:scale-110 transition-transform"
                              >
                                <Star
                                  className={`w-4 h-4 ${
                                    (userRatings[item.id] || 0) >= star
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-slate-300'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            {userRatings[item.id] ? `${userRatings[item.id]} / 5 Stars` : 'Tap stars to rate'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 font-medium">
                {t('dashboard.no_history')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cancel Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[90vh] flex flex-col overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="cancel-title">
            <div className="p-5 sm:p-6 overflow-y-auto">
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
                  className="w-full rounded-xl border border-slate-300 p-3 min-h-[44px] text-sm focus:ring-rose-500 focus:border-rose-500"
                >
                  <option value="Personal reasons">{t('dashboard.reason_personal')}</option>
                  <option value="Wrong date selected">{t('dashboard.reason_wrong_date')}</option>
                  <option value="Crop not ready">{t('dashboard.reason_not_ready')}</option>
                  <option value="Other">{t('dashboard.reason_other')}</option>
                </select>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => setIsCancelModalOpen(false)}
                className="flex-1 py-3 min-h-[44px] bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-colors text-sm"
              >
                {t('dashboard.keep_booking')}
              </button>
              <button 
                onClick={handleCancelBooking}
                disabled={cancelLoading}
                className="flex-1 py-3 min-h-[44px] bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors text-sm flex justify-center items-center gap-2"
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
