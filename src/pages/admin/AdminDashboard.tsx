import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Building, 
  Clock, 
  Package, 
  Loader, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  FileSpreadsheet, 
  Smartphone, 
  History, 
  Coins, 
  TrendingUp, 
  Layers 
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { supabase } from '../../lib/supabaseClient';
import UserDirectory from './UserDirectory';
import ProcurementLedger from './ProcurementLedger';
import SmsDeliveryMonitor from './SmsDeliveryMonitor';
import ActivityLog from './ActivityLog';
import MspRatesManager from './MspRatesManager';
import AdminCentresMap, { type MapCentre } from '../../components/admin/AdminCentresMap';
import { DashboardBackground } from '../../components/DashboardBackground';

interface CentreStat {
  centre_id: string;
  centre_name: string;
  owner_name: string;
  status: string;
  total_quantity_purchased: number;
}

interface PendingCentre {
  id: string;
  name: string;
  owner_name: string;
  geo_blocks?: any;
  created_at: string;
  staff: any;
}

interface RoleCounts {
  total: number;
  farmers: number;
  staff: number;
  admins: number;
}

interface DailyProcurement {
  date: string;
  quantity: number;
}

interface ApprovalChartItem {
  name: string;
  value: number;
  color: string;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'depots' | 'users' | 'ledger' | 'sms' | 'activity' | 'msp'>('depots');
  const [centres, setCentres] = useState<CentreStat[]>([]);
  const [pendingCentres, setPendingCentres] = useState<PendingCentre[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [session, setSession] = useState<any>(null);

  // Live stat card states
  const [activeCentresCount, setActiveCentresCount] = useState<number>(0);
  const [totalApprovedCount, setTotalApprovedCount] = useState<number>(0);
  const [roleCounts, setRoleCounts] = useState<RoleCounts>({ total: 0, farmers: 0, staff: 0, admins: 0 });
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);

  // Lightweight charts states (recharts)
  const [procurement7Days, setProcurement7Days] = useState<DailyProcurement[]>([]);
  const [sevenDaysTotal, setSevenDaysTotal] = useState<number>(0);
  const [approvalPieData, setApprovalPieData] = useState<ApprovalChartItem[]>([]);
  const [totalCentresCount, setTotalCentresCount] = useState<number>(0);

  // Map centres with coordinates
  const [mapCentres, setMapCentres] = useState<MapCentre[]>([]);

  const fetchDashboardData = async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);

      // 1. Active Centres count: approval_status='approved' AND status='open'
      const activeCentresPromise = supabase
        .from('procurement_centres')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'approved')
        .eq('status', 'open');

      // Total approved centres for context
      const totalApprovedPromise = supabase
        .from('procurement_centres')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'approved');

      // 2. Users count broken down by role
      const usersPromise = supabase
        .from('users')
        .select('role');

      // 3. Pending approvals count: approval_status='pending'
      const pendingCountPromise = supabase
        .from('procurement_centres')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'pending');

      // 4. Approved centres list for bottom table
      const centreListPromise = supabase
        .from('admin_centre_list_stats')
        .select('*')
        .eq('approval_status', 'approved')
        .order('centre_name');

      // 5. Pending centres full details for pending approval cards
      const pendingListPromise = supabase
        .from('procurement_centres')
        .select(`
          id,
          name,
          owner_name,
          geo_blocks (
            district_name,
            block_name
          ),
          created_at,
          staff (
            users (
              mobile_number
            )
          )
        `)
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false });

      // 6. Centre approval status breakdown for Donut Chart (Approved / Pending / Rejected)
      const centresStatusPromise = supabase
        .from('procurement_centres')
        .select('approval_status');

      // 7. Last 7 days procurement intake volume for Line Chart
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const recentProcurementsPromise = supabase
        .from('procurements')
        .select('created_at, quantity_accepted')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      // 8. Map Procurement Centres (Approved centres with GPS coordinates for India Map)
      const mapCentresPromise = supabase
        .from('procurement_centres')
        .select(`
          id,
          name,
          owner_name,
          status,
          approval_status,
          latitude,
          longitude,
          daily_capacity,
          geo_blocks (
            district_name,
            block_name,
            state_name
          )
        `)
        .eq('approval_status', 'approved')
        .order('name');

      const [
        activeRes,
        totalApprovedRes,
        usersRes,
        pendingCountRes,
        centreListRes,
        pendingListRes,
        centresStatusRes,
        recentProcurementsRes,
        mapCentresRes
      ] = await Promise.all([
        activeCentresPromise,
        totalApprovedPromise,
        usersPromise,
        pendingCountPromise,
        centreListPromise,
        pendingListPromise,
        centresStatusPromise,
        recentProcurementsPromise,
        mapCentresPromise
      ]);

      if (activeRes.error) {
        console.error('Error fetching active centres count:', activeRes.error);
      } else {
        setActiveCentresCount(activeRes.count || 0);
      }

      if (totalApprovedRes.error) {
        console.error('Error fetching total approved count:', totalApprovedRes.error);
      } else {
        setTotalApprovedCount(totalApprovedRes.count || 0);
      }

      if (usersRes.error) {
        console.error('Error fetching users:', usersRes.error);
      } else if (usersRes.data) {
        let farmers = 0;
        let staff = 0;
        let admins = 0;
        for (const u of usersRes.data) {
          if (u.role === 'farmer') farmers++;
          else if (u.role === 'staff') staff++;
          else if (u.role === 'admin') admins++;
        }
        setRoleCounts({
          total: usersRes.data.length,
          farmers,
          staff,
          admins
        });
      }

      if (pendingCountRes.error) {
        console.error('Error fetching pending approvals count:', pendingCountRes.error);
      } else {
        setPendingApprovalsCount(pendingCountRes.count || 0);
      }

      if (centreListRes.error) throw centreListRes.error;
      setCentres(centreListRes.data || []);

      if (pendingListRes.error) throw pendingListRes.error;
      setPendingCentres(pendingListRes.data || []);

      if (mapCentresRes.error) {
        console.error('Error fetching map centres:', mapCentresRes.error);
      } else {
        setMapCentres((mapCentresRes.data as unknown as MapCentre[]) || []);
      }

      // Process Donut Chart data (Centre Approvals Status)
      if (centresStatusRes.data) {
        let approved = 0;
        let pending = 0;
        let rejected = 0;
        for (const c of centresStatusRes.data) {
          if (c.approval_status === 'approved') approved++;
          else if (c.approval_status === 'pending') pending++;
          else if (c.approval_status === 'rejected') rejected++;
        }
        setTotalCentresCount(centresStatusRes.data.length);
        setApprovalPieData([
          { name: 'Approved', value: approved, color: '#10B981' },
          { name: 'Pending', value: pending, color: '#F59E0B' },
          { name: 'Rejected', value: rejected, color: '#EF4444' }
        ]);
      }

      // Process Line Chart data (Procurement Last 7 Days)
      const daysMap = new Map<string, number>();
      const datesList: { key: string; label: string }[] = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        daysMap.set(key, 0);
        datesList.push({ key, label });
      }

      let total7d = 0;
      if (recentProcurementsRes.data) {
        for (const p of recentProcurementsRes.data) {
          const pDate = p.created_at ? p.created_at.split('T')[0] : '';
          const qty = Number(p.quantity_accepted || 0);
          if (daysMap.has(pDate)) {
            daysMap.set(pDate, (daysMap.get(pDate) || 0) + qty);
            total7d += qty;
          }
        }
      }

      const formatted7DaysData: DailyProcurement[] = datesList.map(({ key, label }) => ({
        date: label,
        quantity: daysMap.get(key) || 0
      }));

      setProcurement7Days(formatted7DaysData);
      setSevenDaysTotal(total7d);

    } catch (err) {
      console.error('Error fetching admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleApprove = async (centreId: string) => {
    if (!session?.user) return;
    try {
      const { error } = await supabase.rpc('approve_centre', {
        p_centre_id: centreId,
        p_reviewer_id: session.user.id
      });
      if (error) throw error;
      fetchDashboardData();
    } catch (err: any) {
      alert('Error approving centre: ' + err.message);
    }
  };

  const handleReject = async (centreId: string) => {
    if (!session?.user || !rejectionReason.trim()) return;
    try {
      const { error } = await supabase.rpc('reject_centre', {
        p_centre_id: centreId,
        p_reviewer_id: session.user.id,
        p_reason: rejectionReason.trim()
      });
      if (error) throw error;
      setRejectingId(null);
      setRejectionReason('');
      fetchDashboardData();
    } catch (err: any) {
      alert('Error rejecting centre: ' + err.message);
    }
  };
  return (
    <div className="space-y-6 relative z-0">
      <DashboardBackground variant="admin" />

      {/* Hero Header - Deep Navy/Indigo Gradient with Indian Agricultural Government Procurement Panoramic Illustration */}
      <div className="bg-gradient-to-r from-[#1e2a5e] to-[#2d3a7a] text-white rounded-2xl p-8 shadow-xl shadow-indigo-950/20 border border-indigo-900/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        {/* Panoramic Indian Agricultural & Government Procurement SVG extending left till the text */}
        <div className="absolute right-0 top-0 bottom-0 w-[58%] md:w-[65%] lg:w-[70%] max-w-[900px] pointer-events-none hidden md:block overflow-hidden">
          <svg viewBox="0 0 800 220" fill="none" preserveAspectRatio="xMaxYMid meet" className="w-full h-full">
            {/* Defs for soft left-edge fade so stalks seamlessly blend near the text */}
            <defs>
              <linearGradient id="agriLeftFade" x1="0" y1="0" x2="160" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#1e2a5e" stopOpacity="0" />
                <stop offset="100%" stopColor="#1e2a5e" stopOpacity="1" />
              </linearGradient>
            </defs>

            {/* Radiant Dawn Sun over the Mandi Horizon (Far Right) */}
            <circle cx="650" cy="85" r="50" fill="#FBBF24" fillOpacity="0.22" />
            <circle cx="650" cy="85" r="32" fill="#FDE047" fillOpacity="0.25" />
            {/* Sunburst Rays */}
            <line x1="650" y1="25" x2="650" y2="12" stroke="#FBBF24" strokeWidth="2" strokeOpacity="0.3" strokeLinecap="round" />
            <line x1="605" y1="42" x2="592" y2="30" stroke="#FBBF24" strokeWidth="2" strokeOpacity="0.3" strokeLinecap="round" />
            <line x1="695" y1="42" x2="708" y2="30" stroke="#FBBF24" strokeWidth="2" strokeOpacity="0.3" strokeLinecap="round" />
            <line x1="585" y1="85" x2="570" y2="85" stroke="#FBBF24" strokeWidth="2" strokeOpacity="0.3" strokeLinecap="round" />
            <line x1="715" y1="85" x2="730" y2="85" stroke="#FBBF24" strokeWidth="2" strokeOpacity="0.3" strokeLinecap="round" />

            {/* Birds in the morning sky */}
            <path d="M260 40 Q270 32 280 40 Q290 32 300 40" stroke="white" strokeWidth="1.5" strokeOpacity="0.35" fill="none" />
            <path d="M315 30 Q323 24 331 30 Q339 24 347 30" stroke="white" strokeWidth="1.2" strokeOpacity="0.3" fill="none" />
            <path d="M380 46 Q390 38 400 46 Q410 38 420 46" stroke="white" strokeWidth="1.3" strokeOpacity="0.28" fill="none" />

            {/* Distant Rolling Agricultural Fields & Terraced Furrows */}
            <path d="M20 185 Q180 145 360 170 Q540 140 800 165 L800 220 L20 220 Z" fill="#34D399" fillOpacity="0.07" />
            <path d="M0 198 Q200 162 420 188 Q620 155 800 178 L800 220 L0 220 Z" fill="white" fillOpacity="0.05" />
            
            {/* Field Furrow Contour Lines */}
            <path d="M40 210 Q240 175 480 200 Q660 175 800 195" stroke="white" strokeWidth="1" strokeOpacity="0.18" fill="none" />
            <path d="M80 218 Q300 190 540 210 Q700 190 800 205" stroke="#FBBF24" strokeWidth="1" strokeOpacity="0.2" fill="none" />

            {/* Layer 1: Indian Government Mandi / Regional Grain Depot Architecture (Far Right) */}
            <g transform="translate(630, 0)">
              {/* Background Grain Silo Cylinders */}
              <rect x="105" y="65" width="28" height="115" rx="5" fill="white" fillOpacity="0.12" stroke="white" strokeWidth="1" strokeOpacity="0.25" />
              <path d="M105 65 Q119 46 133 65 Z" fill="#FBBF24" fillOpacity="0.3" stroke="white" strokeWidth="1" strokeOpacity="0.35" />
              <line x1="105" y1="95" x2="133" y2="95" stroke="white" strokeWidth="0.8" strokeOpacity="0.25" />
              <line x1="105" y1="125" x2="133" y2="125" stroke="white" strokeWidth="0.8" strokeOpacity="0.25" />

              {/* Mandi Depot Intake Pavilion Building */}
              <rect x="0" y="105" width="95" height="80" rx="3" fill="white" fillOpacity="0.14" stroke="white" strokeWidth="1.2" strokeOpacity="0.35" />
              
              {/* Classical Indian Chhatri / Arched Dome Roof */}
              <path d="M-8 105 Q47 52 103 105 Z" fill="#FBBF24" fillOpacity="0.32" stroke="white" strokeWidth="1.5" strokeOpacity="0.55" />
              {/* Kalash & Finial on Mandi Dome */}
              <path d="M47 52 L47 38 M43 45 L51 45 M44 37 L50 37 L47 30 Z" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />

              {/* Cusped Traditional Indian Arch Entrance Gate */}
              <path d="M16 185 L16 148 Q47 128 78 148 L78 185 Z" fill="#141E46" fillOpacity="0.75" stroke="white" strokeWidth="1.5" strokeOpacity="0.6" />
              
              {/* Classical Mandi Pillars */}
              <rect x="8" y="118" width="6" height="67" rx="1" fill="white" fillOpacity="0.45" />
              <rect x="26" y="118" width="6" height="67" rx="1" fill="white" fillOpacity="0.35" />
              <rect x="62" y="118" width="6" height="67" rx="1" fill="white" fillOpacity="0.35" />
              <rect x="80" y="118" width="6" height="67" rx="1" fill="white" fillOpacity="0.45" />

              {/* Official Mandi Depot Signboard */}
              <rect x="12" y="110" width="70" height="11" rx="2" fill="#38BDF8" fillOpacity="0.35" stroke="white" strokeWidth="0.8" strokeOpacity="0.6" />
              <text x="47" y="118" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="white" fillOpacity="0.9" letterSpacing="1">MANDI DEPOT</text>
            </g>

            {/* Layer 2: Stack of Certified Government Procurement Jute Sacks (Bori) with Official MSP Seal */}
            <g transform="translate(520, 0)">
              {/* Bottom Sacks */}
              <rect x="5" y="172" width="56" height="24" rx="7" fill="#F59E0B" fillOpacity="0.4" stroke="white" strokeWidth="1.2" strokeOpacity="0.6" />
              <circle cx="8" cy="175" r="2.5" fill="#FBBF24" />
              <circle cx="58" cy="175" r="2.5" fill="#FBBF24" />

              <rect x="55" y="174" width="54" height="24" rx="7" fill="#F59E0B" fillOpacity="0.35" stroke="white" strokeWidth="1.2" strokeOpacity="0.5" />
              <circle cx="58" cy="177" r="2.5" fill="#FBBF24" />
              <circle cx="106" cy="177" r="2.5" fill="#FBBF24" />

              {/* Top Sack with Certified Government MSP Stencil */}
              <rect x="28" y="152" width="58" height="24" rx="7" fill="#FBBF24" fillOpacity="0.5" stroke="white" strokeWidth="1.3" strokeOpacity="0.75" />
              <circle cx="31" cy="155" r="2.5" fill="#FDE047" />
              <circle cx="83" cy="155" r="2.5" fill="#FDE047" />

              {/* Official Circular Stencil Seal */}
              <circle cx="57" cy="164" r="8.5" stroke="white" strokeWidth="1" strokeOpacity="0.9" fill="#1E2A5E" fillOpacity="0.5" />
              <text x="57" y="167" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="white" fillOpacity="0.95" letterSpacing="0.8">MSP</text>
            </g>

            {/* Layer 3: Indian Farm Tractor with Grain Trolley delivering Harvest */}
            <g transform="translate(410, 0)">
              {/* Trolley Laden with Harvest Wheat/Paddy */}
              <rect x="0" y="172" width="46" height="22" rx="3" fill="white" fillOpacity="0.22" stroke="white" strokeWidth="1.2" strokeOpacity="0.6" />
              <circle cx="23" cy="195" r="7.5" stroke="white" strokeWidth="2" strokeOpacity="0.85" fill="#141E46" fillOpacity="0.65" />
              {/* Mounded Golden Grain in Trolley */}
              <path d="M1 172 Q23 154 45 172 Z" fill="#FBBF24" fillOpacity="0.65" stroke="white" strokeWidth="0.8" strokeOpacity="0.6" />

              {/* Hitch connector */}
              <line x1="46" y1="188" x2="53" y2="188" stroke="white" strokeWidth="2" />

              {/* Tractor Big Rear Wheel */}
              <circle cx="68" cy="186" r="16" stroke="white" strokeWidth="2.5" strokeOpacity="0.9" fill="#141E46" fillOpacity="0.65" />
              <circle cx="68" cy="186" r="6" fill="#FBBF24" fillOpacity="0.9" />

              {/* Tractor Front Wheel */}
              <circle cx="106" cy="193" r="9" stroke="white" strokeWidth="2" strokeOpacity="0.9" fill="#141E46" fillOpacity="0.65" />
              <circle cx="106" cy="193" r="3.5" fill="#FBBF24" fillOpacity="0.8" />

              {/* Tractor Hood / Bonnet in Agricultural Emerald Green */}
              <path d="M68 171 L88 171 L108 178 L112 193 L82 193 L68 180 Z" fill="#34D399" fillOpacity="0.6" stroke="white" strokeWidth="1.3" strokeOpacity="0.75" />
              
              {/* Exhaust Silencer Pipe */}
              <line x1="100" y1="174" x2="100" y2="156" stroke="white" strokeWidth="2" strokeLinecap="round" />
              
              {/* Steering Wheel and Driver Canopy Seat */}
              <path d="M70 169 L76 161 M62 171 L66 163" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </g>

            {/* Layer 4: Majestic Golden Wheat & Paddy Stalks Extending Lengthy to the Left till the Text */}
            <g>
              {/* Leftmost Wheat Stalk 1 (Near text: x=25 to 105, y=65 to 220) */}
              <path d="M25 218 Q50 145 88 72" stroke="#FBBF24" strokeWidth="2.2" strokeLinecap="round" strokeOpacity="0.85" />
              {/* Wheat Grain Beads */}
              <ellipse cx="86" cy="76" rx="4.5" ry="8" transform="rotate(25 86 76)" fill="#FDE047" fillOpacity="0.9" stroke="white" strokeWidth="0.5" strokeOpacity="0.6" />
              <ellipse cx="80" cy="88" rx="4.5" ry="8" transform="rotate(-15 80 88)" fill="#FBBF24" fillOpacity="0.9" stroke="white" strokeWidth="0.5" strokeOpacity="0.6" />
              <ellipse cx="76" cy="100" rx="4.5" ry="8" transform="rotate(22 76 100)" fill="#F59E0B" fillOpacity="0.9" stroke="white" strokeWidth="0.5" strokeOpacity="0.6" />
              <ellipse cx="70" cy="112" rx="4.5" ry="8" transform="rotate(-18 70 112)" fill="#FBBF24" fillOpacity="0.85" stroke="white" strokeWidth="0.5" strokeOpacity="0.6" />
              <ellipse cx="66" cy="124" rx="4.5" ry="8" transform="rotate(20 66 124)" fill="#F59E0B" fillOpacity="0.85" stroke="white" strokeWidth="0.5" strokeOpacity="0.6" />
              <ellipse cx="60" cy="136" rx="4.5" ry="8" transform="rotate(-15 60 136)" fill="#FBBF24" fillOpacity="0.8" stroke="white" strokeWidth="0.5" strokeOpacity="0.6" />
              <ellipse cx="56" cy="148" rx="4.5" ry="8" transform="rotate(18 56 148)" fill="#F59E0B" fillOpacity="0.8" stroke="white" strokeWidth="0.5" strokeOpacity="0.6" />
              {/* Wheat Awn Whiskers spreading upward */}
              <line x1="86" y1="72" x2="104" y2="38" stroke="#FDE047" strokeWidth="1.2" strokeOpacity="0.75" strokeLinecap="round" />
              <line x1="83" y1="76" x2="108" y2="50" stroke="#FDE047" strokeWidth="1.2" strokeOpacity="0.75" strokeLinecap="round" />
              <line x1="80" y1="82" x2="106" y2="65" stroke="#FBBF24" strokeWidth="1" strokeOpacity="0.65" strokeLinecap="round" />

              {/* Tall Wheat Stalk 2 (x=95 to 185, y=45 to 220) */}
              <path d="M100 220 Q128 128 160 48" stroke="#FBBF24" strokeWidth="2.4" strokeLinecap="round" strokeOpacity="0.9" />
              <ellipse cx="158" cy="52" rx="4.5" ry="8.5" transform="rotate(22 158 52)" fill="#FDE047" fillOpacity="0.95" stroke="white" strokeWidth="0.5" strokeOpacity="0.7" />
              <ellipse cx="152" cy="65" rx="4.5" ry="8.5" transform="rotate(-18 152 65)" fill="#FBBF24" fillOpacity="0.95" stroke="white" strokeWidth="0.5" strokeOpacity="0.7" />
              <ellipse cx="147" cy="78" rx="4.5" ry="8.5" transform="rotate(20 147 78)" fill="#F59E0B" fillOpacity="0.9" stroke="white" strokeWidth="0.5" strokeOpacity="0.7" />
              <ellipse cx="141" cy="91" rx="4.5" ry="8.5" transform="rotate(-15 141 91)" fill="#FBBF24" fillOpacity="0.9" stroke="white" strokeWidth="0.5" strokeOpacity="0.7" />
              <ellipse cx="136" cy="104" rx="4.5" ry="8.5" transform="rotate(20 136 104)" fill="#F59E0B" fillOpacity="0.85" stroke="white" strokeWidth="0.5" strokeOpacity="0.6" />
              <ellipse cx="130" cy="117" rx="4.5" ry="8.5" transform="rotate(-15 130 117)" fill="#FBBF24" fillOpacity="0.85" stroke="white" strokeWidth="0.5" strokeOpacity="0.6" />
              <ellipse cx="125" cy="130" rx="4.5" ry="8.5" transform="rotate(18 125 130)" fill="#F59E0B" fillOpacity="0.8" stroke="white" strokeWidth="0.5" strokeOpacity="0.6" />
              {/* Whiskers */}
              <line x1="158" y1="46" x2="178" y2="16" stroke="#FDE047" strokeWidth="1.3" strokeOpacity="0.8" strokeLinecap="round" />
              <line x1="155" y1="52" x2="184" y2="28" stroke="#FDE047" strokeWidth="1.3" strokeOpacity="0.8" strokeLinecap="round" />
              <line x1="152" y1="58" x2="182" y2="44" stroke="#FBBF24" strokeWidth="1.1" strokeOpacity="0.7" strokeLinecap="round" />

              {/* Wheat Stalk 3 (x=175 to 265, y=55 to 220) */}
              <path d="M180 220 Q205 132 238 58" stroke="#FBBF24" strokeWidth="2.2" strokeLinecap="round" strokeOpacity="0.85" />
              <ellipse cx="236" cy="62" rx="4.5" ry="8" transform="rotate(20 236 62)" fill="#FDE047" fillOpacity="0.9" stroke="white" strokeWidth="0.5" strokeOpacity="0.6" />
              <ellipse cx="230" cy="74" rx="4.5" ry="8" transform="rotate(-18 230 74)" fill="#FBBF24" fillOpacity="0.9" stroke="white" strokeWidth="0.5" strokeOpacity="0.6" />
              <ellipse cx="225" cy="87" rx="4.5" ry="8" transform="rotate(20 225 87)" fill="#F59E0B" fillOpacity="0.85" stroke="white" strokeWidth="0.5" strokeOpacity="0.6" />
              <ellipse cx="219" cy="100" rx="4.5" ry="8" transform="rotate(-15 219 100)" fill="#FBBF24" fillOpacity="0.85" stroke="white" strokeWidth="0.5" strokeOpacity="0.6" />
              <ellipse cx="214" cy="113" rx="4.5" ry="8" transform="rotate(18 214 113)" fill="#F59E0B" fillOpacity="0.8" stroke="white" strokeWidth="0.5" strokeOpacity="0.6" />
              {/* Whiskers */}
              <line x1="236" y1="56" x2="256" y2="26" stroke="#FDE047" strokeWidth="1.2" strokeOpacity="0.75" strokeLinecap="round" />
              <line x1="233" y1="62" x2="262" y2="38" stroke="#FDE047" strokeWidth="1.2" strokeOpacity="0.75" strokeLinecap="round" />

              {/* Arching Paddy (Dhan) Panicle 1 (x=245 to 350, y=75 to 220) */}
              <path d="M250 220 Q290 120 330 82 Q355 92 342 132" stroke="#34D399" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.8" />
              {/* Drooping Rice Grain Beads */}
              <circle cx="332" cy="86" r="3.8" fill="#34D399" fillOpacity="0.85" />
              <circle cx="340" cy="94" r="3.8" fill="#FBBF24" fillOpacity="0.85" />
              <circle cx="346" cy="106" r="3.8" fill="#FBBF24" fillOpacity="0.85" />
              <circle cx="344" cy="118" r="3.8" fill="#34D399" fillOpacity="0.85" />
              <circle cx="339" cy="128" r="3.5" fill="#FBBF24" fillOpacity="0.8" />

              {/* Arching Paddy Panicle 2 (x=315 to 405, y=90 to 220) */}
              <path d="M320 220 Q355 130 388 98 Q410 106 400 142" stroke="#34D399" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.75" />
              <circle cx="390" cy="102" r="3.5" fill="#34D399" fillOpacity="0.8" />
              <circle cx="397" cy="110" r="3.5" fill="#FBBF24" fillOpacity="0.8" />
              <circle cx="403" cy="122" r="3.5" fill="#FBBF24" fillOpacity="0.8" />
              <circle cx="401" cy="134" r="3.5" fill="#34D399" fillOpacity="0.8" />
            </g>
          </svg>
        </div>

        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-indigo-200 border border-white/10">
              <Building className="w-3.5 h-3.5 text-indigo-300" />
              Administrative Operations Portal
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Admin Executive Panel</h1>
          <p className="mt-1 text-indigo-100/90 text-sm max-w-lg leading-relaxed">
            Centralized platform oversight. Regulate depots, monitor transaction ledgers, inspect delivery gateways, and set MSP benchmarks.
          </p>
        </div>
      </div>

      {/* Navigation Tabs - Crisp thin border */}
      <div className="flex gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-300 shadow-sm shadow-slate-900/5 overflow-x-auto whitespace-nowrap">
        <button
          onClick={() => setActiveTab('depots')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'depots'
              ? 'bg-indigo-50 text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Building className="w-4 h-4" />
          Centre Approvals
          {pendingApprovalsCount > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
              {pendingApprovalsCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'ledger'
              ? 'bg-indigo-50 text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Procurement Ledger
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'users'
              ? 'bg-indigo-50 text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          User Directory
          <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
            activeTab === 'users' ? 'bg-indigo-200/60 text-indigo-900' : 'bg-slate-200/60 text-slate-700'
          }`}>
            {roleCounts.total}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('sms')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'sms'
              ? 'bg-indigo-50 text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          SMS Monitor
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'activity'
              ? 'bg-indigo-50 text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <History className="w-4 h-4" />
          Activity Log
        </button>
        <button
          onClick={() => setActiveTab('msp')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'msp'
              ? 'bg-indigo-50 text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Coins className="w-4 h-4" />
          MSP Rates
        </button>
      </div>

      {/* Tab 1: Depot Oversight */}
      {activeTab === 'depots' && (
        <>
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Active Centres */}
            <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm shadow-slate-900/5 hover:shadow-md hover:border-emerald-400 transition-all duration-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">Active Centres</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-2">
                    {loading ? '...' : `${activeCentresCount} Active`}
                  </h3>
                </div>
                <span className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shadow-xs">
                  <Building className="w-6 h-6" />
                </span>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <span className="text-xs text-slate-500 font-medium">
                  {loading ? 'Loading status...' : `${activeCentresCount} of ${totalApprovedCount} approved open`}
                </span>
              </div>
            </div>

            {/* Total Registered */}
            <div 
              onClick={() => setActiveTab('users')}
              className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm shadow-slate-900/5 hover:shadow-md hover:border-indigo-400 transition-all duration-200 cursor-pointer group"
              title="Click to view User Directory"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500 group-hover:text-indigo-600 transition-colors">Total Registered</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-2">
                    {loading ? '...' : `${roleCounts.total.toLocaleString()} Users`}
                  </h3>
                </div>
                <span className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 shadow-xs">
                  <Users className="w-6 h-6" />
                </span>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <span className="text-xs text-slate-500 font-medium">
                  {loading ? 'Loading breakdown...' : `${roleCounts.farmers} Farmers, ${roleCounts.staff} Staff, ${roleCounts.admins} Admins`}
                </span>
              </div>
            </div>

            {/* Pending Approvals (Amber Accent) */}
            <div className={`p-6 rounded-2xl transition-all duration-200 ${
              pendingApprovalsCount > 0 
                ? 'bg-amber-50/50 border-2 border-amber-300 shadow-sm shadow-amber-900/5 hover:border-amber-400' 
                : 'bg-white border border-slate-300 shadow-sm shadow-slate-900/5 hover:shadow-md hover:border-amber-300'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">Pending Approvals</p>
                  <h3 className={`text-2xl font-bold mt-2 ${pendingApprovalsCount > 0 ? 'text-amber-900' : 'text-slate-900'}`}>
                    {loading ? '...' : `${pendingApprovalsCount} Pending`}
                  </h3>
                </div>
                <span className={`p-3 rounded-xl border shadow-xs ${
                  pendingApprovalsCount > 0 
                    ? 'bg-amber-100 text-amber-800 border-amber-300' 
                    : 'bg-amber-50 text-amber-600 border-amber-100'
                }`}>
                  <Clock className="w-6 h-6" />
                </span>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <span className={`text-xs font-semibold ${pendingApprovalsCount > 0 ? 'text-amber-700' : 'text-emerald-600'}`}>
                  {loading ? 'Checking approvals...' : pendingApprovalsCount > 0 ? `${pendingApprovalsCount} depot${pendingApprovalsCount === 1 ? '' : 's'} awaiting review` : 'All depots reviewed'}
                </span>
              </div>
            </div>

            {/* System Role */}
            <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm shadow-slate-900/5 hover:shadow-md hover:border-indigo-400 transition-all duration-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">System Role</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-2">Administrator</h3>
                </div>
                <span className="p-3 bg-purple-50 text-purple-600 rounded-xl border border-purple-100 shadow-xs">
                  <Layers className="w-6 h-6" />
                </span>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <span className="text-xs text-slate-500 font-medium">Role: Administrator</span>
              </div>
            </div>
          </div>

          {/* Centre Locations India Map View */}
          <AdminCentresMap centres={mapCentres} loading={loading} />

          {/* Charts Row: Procurement Overview & Depot Approval Status */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Chart 1: Procurement Overview (Last 7 Days) */}
            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-300 shadow-sm shadow-slate-900/5 hover:shadow-md transition-all duration-200 flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    Procurement Overview (Last 7 Days)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Daily accepted intake volume aggregated across registered depots
                  </p>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 self-start sm:self-auto">
                  {sevenDaysTotal.toLocaleString()} kg total
                </span>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={procurement7Days} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#94A3B8" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={{ stroke: '#E2E8F0' }} 
                    />
                    <YAxis 
                      stroke="#94A3B8" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={{ stroke: '#E2E8F0' }} 
                      tickFormatter={(val) => `${val}kg`}
                    />
                    <Tooltip 
                      formatter={(val: any) => [`${Number(val).toLocaleString()} kg`, 'Volume Procured']}
                      labelStyle={{ fontWeight: 'bold', color: '#0F172A' }}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="quantity" 
                      name="Procured Volume" 
                      stroke="#4F46E5" 
                      strokeWidth={2.5} 
                      dot={{ r: 4, fill: '#4F46E5', strokeWidth: 2, stroke: '#FFFFFF' }} 
                      activeDot={{ r: 6, fill: '#4338CA' }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Centre Approval Status Breakdown Donut Chart */}
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-300 shadow-sm shadow-slate-900/5 hover:shadow-md transition-all duration-200 flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Building className="w-4 h-4 text-indigo-600" />
                    Centre Approval Status
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Distribution across registered depots
                  </p>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 self-start sm:self-auto">
                  {totalCentresCount} Total Depots
                </span>
              </div>

              <div className="h-64 w-full relative flex items-center justify-center">
                {totalCentresCount === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No procurement centre records registered yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={approvalPieData}
                        cx="50%"
                        cy="45%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {approvalPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(val: any) => [`${val} Depots`, 'Count']}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36} 
                        iconType="circle"
                        formatter={(val, entry: any) => (
                          <span className="text-xs font-bold text-slate-700">
                            {val}: {entry.payload?.value || 0}
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

      {/* Pending Approvals Section */}
      {pendingCentres.length > 0 && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-amber-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              Centre Approval Requests
            </h2>
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full uppercase">
              {pendingCentres.length} Pending
            </span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {pendingCentres.map((centre) => {
              const mobile = centre.staff?.[0]?.users?.mobile_number || 'N/A';
              return (
                <div key={centre.id} className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="font-bold text-slate-800">{centre.name}</h3>
                      <p className="text-xs text-slate-500">
                        {Array.isArray(centre.geo_blocks) ? centre.geo_blocks[0]?.district_name : centre.geo_blocks?.district_name || 'N/A'}, 
                        {Array.isArray(centre.geo_blocks) ? centre.geo_blocks[0]?.block_name : centre.geo_blocks?.block_name || 'N/A'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-4 text-sm">
                        <span className="text-slate-600">Applicant: <strong>{centre.owner_name}</strong></span>
                        <span className="text-slate-600">Mobile: <strong>{mobile}</strong></span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                      {rejectingId === centre.id ? (
                        <div className="flex flex-col gap-2">
                          <input 
                            type="text" 
                            placeholder="Reason for rejection..." 
                            className="text-sm border border-slate-300 rounded-lg px-3 py-2 w-full sm:w-48"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleReject(centre.id)}
                              disabled={!rejectionReason.trim()}
                              className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors"
                            >
                              Confirm
                            </button>
                            <button 
                              onClick={() => { setRejectingId(null); setRejectionReason(''); }}
                              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-3 rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2 w-full">
                          <button 
                            onClick={() => handleApprove(centre.id)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-sm font-bold py-2 px-4 rounded-lg transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Approve
                          </button>
                          <button 
                            onClick={() => setRejectingId(centre.id)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-bold py-2 px-4 rounded-lg transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Centres List Section */}
      <div className="bg-white rounded-2xl border border-slate-300 p-8 shadow-sm shadow-slate-900/5">
        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Building className="w-5 h-5 text-indigo-600" />
          Active Procurement Centres
        </h2>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : centres.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No procurement centres found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {centres.map(centre => (
              <div 
                key={centre.centre_id} 
                onClick={() => navigate(`/admin/centre/${centre.centre_id}`)}
                className="border border-slate-300 rounded-xl p-6 hover:shadow-md hover:border-indigo-400 transition-all duration-200 cursor-pointer bg-white group flex flex-col justify-between shadow-xs"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-lg text-slate-800 group-hover:text-indigo-600 transition-colors">
                      {centre.centre_name}
                    </h3>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                      centre.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {centre.status}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Users className="w-4 h-4" />
                      <span>In-charge: <strong>{centre.owner_name}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Package className="w-4 h-4" />
                      <span>Procured: <strong>{centre.total_quantity_purchased.toLocaleString()} kg</strong></span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-indigo-600 font-semibold text-sm group-hover:gap-2 transition-all">
                  <span>View full report</span>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
        </>
      )}

      {/* Tab 2: User Directory */}
      {activeTab === 'users' && (
        <UserDirectory />
      )}

      {/* Tab 3: Procurement Ledger */}
      {activeTab === 'ledger' && (
        <ProcurementLedger />
      )}

      {/* Tab 4: SMS Delivery Monitor */}
      {activeTab === 'sms' && (
        <SmsDeliveryMonitor />
      )}

      {/* Tab 5: Activity Log */}
      {activeTab === 'activity' && (
        <ActivityLog />
      )}

      {/* Tab 6: MSP Rates Management */}
      {activeTab === 'msp' && (
        <MspRatesManager />
      )}
    </div>
  );
};

export default AdminDashboard;
