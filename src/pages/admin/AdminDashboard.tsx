import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Users, Building, Activity, Package, Loader, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

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

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [centres, setCentres] = useState<CentreStat[]>([]);
  const [pendingCentres, setPendingCentres] = useState<PendingCentre[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [session, setSession] = useState<any>(null);

  const fetchDashboardData = async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);

      // Fetch active centres stats
      const { data: activeData, error: activeErr } = await supabase
        .from('admin_centre_list_stats')
        .select('*')
        .eq('approval_status', 'approved')
        .order('centre_name');
      
      if (activeErr) throw activeErr;
      setCentres(activeData || []);

      // Fetch pending requests
      const { data: pendingData, error: pendingErr } = await supabase
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

      if (pendingErr) throw pendingErr;
      setPendingCentres(pendingData || []);

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
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-8 shadow-xl">
        <h1 className="text-3xl font-extrabold tracking-tight">Admin Panel</h1>
        <p className="mt-2 text-slate-300 text-lg max-w-2xl">
          Global administrator dashboard. Configure crop parameters, authorize regional procurement depots, override schedules, and view system logs.
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Active Centers</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-2">12 Active</h3>
            </div>
            <span className="p-3 bg-slate-100 text-slate-700 rounded-xl">
              <Building className="w-6 h-6" />
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <span className="text-xs text-emerald-600 font-semibold">100% Operational</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Registered</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-2">1,482 Users</h3>
            </div>
            <span className="p-3 bg-slate-100 text-slate-700 rounded-xl">
              <Users className="w-6 h-6" />
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <span className="text-xs text-slate-500">Farmers, Officers, Admins</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Global System Status</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-2">Normal</h3>
            </div>
            <span className="p-3 bg-slate-100 text-slate-700 rounded-xl">
              <Activity className="w-6 h-6" />
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <span className="text-xs text-slate-500">Latency: 48ms</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">System Role</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-2">Superuser</h3>
            </div>
            <span className="p-3 bg-slate-100 text-slate-700 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <span className="text-xs text-slate-500">Role: Root Administrator</span>
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
    </div>
  );
};

export default AdminDashboard;
