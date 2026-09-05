import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Building, 
  MapPin, 
  Users, 
  Package, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Loader, 
  Scale, 
  Eye,
  UserCheck,
  CreditCard,
  Send,
  Calendar,
  Navigation
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { DashboardBackground } from '../../components/DashboardBackground';

interface CentreDetails {
  id: string;
  name: string;
  owner_name: string;
  status: 'open' | 'closed';
  approval_status: string;
  daily_capacity: number;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  geo_blocks?: {
    block_name: string;
    district_name: string;
    state_name: string;
  } | null;
  staff?: Array<{
    users?: {
      name: string;
      mobile_number: string;
    };
  }>;
}

interface ProductStat {
  product_name: string;
  total_quantity: number;
}

interface PaymentStats {
  pending: number;
  initiated: number;
  credited: number;
  total: number;
  totalCreditedAmount: number;
}

const AdminCentreDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [centre, setCentre] = useState<CentreDetails | null>(null);
  const [farmersServed, setFarmersServed] = useState<number>(0);
  const [productStats, setProductStats] = useState<ProductStat[]>([]);
  const [paymentStats, setPaymentStats] = useState<PaymentStats>({
    pending: 0,
    initiated: 0,
    credited: 0,
    total: 0,
    totalCreditedAmount: 0
  });

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch core centre info including full location, daily capacity, coordinates, staff
        const { data: centreData, error: centreErr } = await supabase
          .from('procurement_centres')
          .select(`
            id, 
            name, 
            owner_name, 
            status,
            approval_status,
            daily_capacity,
            latitude,
            longitude,
            created_at,
            geo_blocks (
              block_name, 
              district_name, 
              state_name
            ),
            staff (
              users (
                name,
                mobile_number
              )
            )
          `)
          .eq('id', id)
          .maybeSingle();

        if (centreErr) throw centreErr;
        if (!centreData) {
          setError('Procurement centre not found.');
          setLoading(false);
          return;
        }
        setCentre(centreData as unknown as CentreDetails);

        // 2. Fetch distinct farmers served via existing RPC
        const { data: farmersData, error: farmersErr } = await supabase
          .rpc('get_centre_farmers_served', { p_centre_id: id });
        if (farmersErr) console.warn('Could not fetch farmers served:', farmersErr);
        setFarmersServed(farmersData || 0);

        // 3. Fetch product stats (quantity procured broken down by crop)
        const { data: statsData, error: statsErr } = await supabase
          .from('admin_centre_product_stats')
          .select('product_name, total_quantity')
          .eq('centre_id', id);
        if (statsErr) console.warn('Could not fetch product stats:', statsErr);
        setProductStats(statsData || []);

        // 4. Fetch payment status breakdown from existing bookings -> procurements -> payments
        const { data: bookingsData, error: bookingsErr } = await supabase
          .from('bookings')
          .select(`
            id,
            procurements (
              id,
              quantity_accepted,
              total_amount,
              payments (
                id,
                status
              )
            )
          `)
          .eq('centre_id', id);

        if (bookingsErr) console.warn('Could not fetch bookings payments:', bookingsErr);

        let pendingCount = 0;
        let initiatedCount = 0;
        let creditedCount = 0;
        let totalCreditedVal = 0;

        if (bookingsData) {
          for (const b of bookingsData) {
            if (b.procurements && Array.isArray(b.procurements)) {
              for (const p of b.procurements) {
                if (p.payments && Array.isArray(p.payments)) {
                  for (const pay of p.payments) {
                    if (pay.status === 'pending') {
                      pendingCount++;
                    } else if (pay.status === 'initiated') {
                      initiatedCount++;
                    } else if (pay.status === 'credited') {
                      creditedCount++;
                      if (p.total_amount) {
                        totalCreditedVal += Number(p.total_amount);
                      }
                    }
                  }
                }
              }
            }
          }
        }

        setPaymentStats({
          pending: pendingCount,
          initiated: initiatedCount,
          credited: creditedCount,
          total: pendingCount + initiatedCount + creditedCount,
          totalCreditedAmount: totalCreditedVal
        });

      } catch (err: any) {
        console.error('Error fetching centre details:', err);
        setError(err.message || 'An error occurred while loading depot details.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
        <Loader className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm font-medium">Loading centre intelligence report...</p>
      </div>
    );
  }

  if (error || !centre) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-sm my-12">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-2xl font-bold text-slate-800">{error || 'Centre Not Found'}</h2>
        <p className="text-sm text-slate-500 mt-2">
          Unable to locate the requested procurement depot in the registry.
        </p>
        <button 
          onClick={() => navigate('/admin')} 
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Admin Dashboard
        </button>
      </div>
    );
  }

  // Location string formatting
  const locationString = centre.geo_blocks
    ? `${centre.geo_blocks.block_name} Block, ${centre.geo_blocks.district_name}, ${centre.geo_blocks.state_name}`
    : 'Location block not configured';

  const staffMobile = centre.staff?.[0]?.users?.mobile_number;

  // Total quantity procured across all crops
  const totalProcuredVolume = productStats.reduce(
    (sum, stat) => sum + Number(stat.total_quantity || 0), 
    0
  );

  return (
    <div className="space-y-6 relative z-0">
      <DashboardBackground variant="admin" />
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/admin')}
            className="p-2.5 bg-white border border-slate-300 rounded-xl shadow-sm shadow-slate-900/5 hover:bg-slate-50 transition-colors text-slate-600 hover:text-slate-900"
            title="Return to Admin Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                <Building className="w-7 h-7 text-indigo-600 flex-shrink-0" />
                <span>{centre.name}</span>
              </h1>
              {/* Operating Status Badge */}
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                centre.status === 'open' 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                  : 'bg-rose-100 text-rose-800 border border-rose-200'
              }`}>
                {centre.status === 'open' ? '● Open for Intake' : '○ Closed'}
              </span>
              {/* Approval Badge */}
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                {centre.approval_status}
              </span>
            </div>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 text-sm mt-1.5">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>{locationString}</span>
              </div>
              {centre.latitude && centre.longitude && (
                <div className="flex items-center gap-1 text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                  <Navigation className="w-3 h-3 text-indigo-500" />
                  <span>GPS: {centre.latitude.toFixed(4)}, {centre.longitude.toFixed(4)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Read-Only Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold border border-slate-200">
          <Eye className="w-4 h-4 text-slate-500" />
          Read-Only Oversight
        </div>
      </div>

      {/* 4 Core Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 1. Daily Capacity */}
        <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm shadow-slate-900/5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Current Daily Capacity</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-2">
                {centre.daily_capacity ? `${centre.daily_capacity.toLocaleString()} kg/day` : '0 kg/day'}
              </h3>
            </div>
            <span className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Scale className="w-6 h-6" />
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <span className="text-xs text-slate-500 font-medium">
              Maximum intake limit per booking date
            </span>
          </div>
        </div>

        {/* 2. Farmers Served */}
        <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm shadow-slate-900/5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Farmers Served</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-2">
                {farmersServed.toLocaleString()} Farmers
              </h3>
            </div>
            <span className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Users className="w-6 h-6" />
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <span className="text-xs text-slate-500 font-medium">
              Distinct producers with completed intake
            </span>
          </div>
        </div>

        {/* 3. Total Quantity Procured */}
        <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm shadow-slate-900/5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Grain Procured</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-2">
                {totalProcuredVolume.toLocaleString()} kg
              </h3>
            </div>
            <span className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Package className="w-6 h-6" />
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <span className="text-xs text-slate-500 font-medium">
              Across {productStats.length} grain {productStats.length === 1 ? 'variety' : 'varieties'}
            </span>
          </div>
        </div>

        {/* 4. In-Charge Name */}
        <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm shadow-slate-900/5 hover:shadow-md hover:border-indigo-300 transition-all duration-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">In-Charge Officer</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-2 truncate max-w-[160px]" title={centre.owner_name}>
                {centre.owner_name}
              </h3>
            </div>
            <span className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shadow-xs">
              <UserCheck className="w-6 h-6" />
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <span className="text-xs text-slate-500 font-medium">
              Mobile: {staffMobile || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Analytics Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Panel 1: Crop-wise Procurement Volume */}
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm shadow-slate-900/5 p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Procurement Volume by Crop</h2>
                  <p className="text-xs text-slate-500">Cumulative certified intake broken down by variety</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                {productStats.length} {productStats.length === 1 ? 'Crop' : 'Crops'}
              </span>
            </div>

            {productStats.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Package className="w-10 h-10 mx-auto mb-2 text-slate-300 opacity-60" />
                <p className="text-sm font-medium text-slate-500">No grain procurements recorded yet.</p>
                <p className="text-xs text-slate-400 mt-1">Intake records will appear here as farmers complete appointments.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {productStats.map(stat => {
                  const percent = totalProcuredVolume > 0 
                    ? Math.round((Number(stat.total_quantity) / totalProcuredVolume) * 100) 
                    : 0;

                  return (
                    <div key={stat.product_name} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <span className="font-bold text-slate-800 capitalize text-sm">{stat.product_name}</span>
                          <span className="text-xs text-slate-400 ml-2 font-medium">({percent}% of depot total)</span>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-black text-slate-900">{Number(stat.total_quantity).toLocaleString()}</span>
                          <span className="text-xs text-slate-500 ml-1">kg</span>
                        </div>
                      </div>
                      {/* Visual progress bar */}
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
            <span>Overall Cumulative Volume</span>
            <span className="font-bold text-slate-900 text-sm">{totalProcuredVolume.toLocaleString()} kg</span>
          </div>
        </div>

        {/* Panel 2: Payment Status Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm shadow-slate-900/5 p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">MSP Payout Status Breakdown</h2>
                  <p className="text-xs text-slate-500">Disbursement tracking across all verified intake weighments</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                {paymentStats.total} Total
              </span>
            </div>

            {/* 3 Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {/* Pending */}
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50">
                <div className="flex items-center gap-1.5 text-amber-800 text-xs font-bold">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Pending
                </div>
                <p className="text-2xl font-black text-amber-900 mt-2">{paymentStats.pending}</p>
                <p className="text-xs text-amber-700/80 mt-1">Awaiting batch release</p>
              </div>

              {/* Initiated */}
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50">
                <div className="flex items-center gap-1.5 text-blue-800 text-xs font-bold">
                  <Send className="w-3.5 h-3.5 text-blue-600" />
                  Initiated
                </div>
                <p className="text-2xl font-black text-blue-900 mt-2">{paymentStats.initiated}</p>
                <p className="text-xs text-blue-700/80 mt-1">In bank processing</p>
              </div>

              {/* Credited */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
                <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Credited
                </div>
                <p className="text-2xl font-black text-emerald-900 mt-2">{paymentStats.credited}</p>
                <p className="text-xs text-emerald-700/80 mt-1">Paid to farmers</p>
              </div>
            </div>

            {/* Progress Distribution Bar */}
            {paymentStats.total > 0 ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-500 font-medium">
                  <span>Disbursement Progress</span>
                  <span>
                    {paymentStats.total > 0 
                      ? Math.round((paymentStats.credited / paymentStats.total) * 100) 
                      : 0}% Completed
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                  {paymentStats.credited > 0 && (
                    <div 
                      className="bg-emerald-500 h-full" 
                      style={{ width: `${(paymentStats.credited / paymentStats.total) * 100}%` }}
                      title={`Credited: ${paymentStats.credited}`}
                    />
                  )}
                  {paymentStats.initiated > 0 && (
                    <div 
                      className="bg-blue-500 h-full" 
                      style={{ width: `${(paymentStats.initiated / paymentStats.total) * 100}%` }}
                      title={`Initiated: ${paymentStats.initiated}`}
                    />
                  )}
                  {paymentStats.pending > 0 && (
                    <div 
                      className="bg-amber-500 h-full" 
                      style={{ width: `${(paymentStats.pending / paymentStats.total) * 100}%` }}
                      title={`Pending: ${paymentStats.pending}`}
                    />
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Credited
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Initiated
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span> Pending
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400">
                <p className="text-xs">No payouts recorded yet for this centre.</p>
              </div>
            )}
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
            <span>Total Successfully Disbursed</span>
            <span className="font-bold text-emerald-700 text-sm">
              ₹{paymentStats.totalCreditedAmount.toLocaleString()}
            </span>
          </div>
        </div>

      </div>

      {/* Audit and Facility Information Footer */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Onboarded: {new Date(centre.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
          <span className="font-mono text-slate-400">Depot ID: {centre.id}</span>
        </div>
        <div className="italic text-slate-400">
          Read-only administrative oversight view. Direct ledger synchronization.
        </div>
      </div>

    </div>
  );
};

export default AdminCentreDetails;
