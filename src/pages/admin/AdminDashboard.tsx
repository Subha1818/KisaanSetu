import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Users, Building, Clock, Package, Loader, ArrowRight, CheckCircle2, XCircle, FileSpreadsheet, Smartphone, History, Coins } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import UserDirectory from './UserDirectory';
import ProcurementLedger from './ProcurementLedger';
import SmsDeliveryMonitor from './SmsDeliveryMonitor';
import ActivityLog from './ActivityLog';
import MspRatesManager from './MspRatesManager';
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

      const [
        activeRes,
        totalApprovedRes,
        usersRes,
        pendingCountRes,
        centreListRes,
        pendingListRes
      ] = await Promise.all([
        activeCentresPromise,
        totalApprovedPromise,
        usersPromise,
        pendingCountPromise,
        centreListPromise,
        pendingListPromise
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
    <div className="space-y-6">
      <DashboardBackground variant="admin" />

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-8 shadow-xl shadow-slate-950/15 border border-slate-700/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              National Procurement Portal
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Admin Executive Panel</h1>
          <p className="mt-1 text-slate-300 text-sm max-w-2xl">
            Centralized oversight authority. Regulate regional depots, monitor live transactions, inspect delivery gateways, and govern MSP benchmarks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 text-xs font-semibold text-slate-200">
            Role: <strong className="text-white font-bold">Administrator</strong>
          </div>
        </div>
      </div>

      {/* Navigation Tabs - Restyled matching Centre Dashboard pattern */}
      <div className="flex gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto whitespace-nowrap">
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
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-200">
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
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all duration-200 cursor-pointer group"
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
            <div className={`p-6 rounded-2xl border transition-all duration-200 ${
              pendingApprovalsCount > 0 
                ? 'bg-amber-50/40 border-amber-300 shadow-sm shadow-amber-900/5 hover:border-amber-400' 
                : 'bg-white border-slate-200 shadow-sm hover:shadow-md'
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
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">System Role</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-2">Administrator</h3>
                </div>
                <span className="p-3 bg-purple-50 text-purple-600 rounded-xl border border-purple-100 shadow-xs">
                  <ShieldCheck className="w-6 h-6" />
                </span>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <span className="text-xs text-slate-500 font-medium">Role: Administrator</span>
              </div>
            </div>
          </div>

      {/* Pending Approvals Section */}
      {pendingCentres.length > 0 && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-amber-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
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
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
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
                className="border border-slate-200 rounded-xl p-6 hover:shadow-md hover:border-indigo-200 transition-all duration-200 cursor-pointer bg-white group flex flex-col justify-between"
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
