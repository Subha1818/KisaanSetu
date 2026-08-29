import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Users, Building, Activity, Package, Loader, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

interface CentreStat {
  centre_id: string;
  centre_name: string;
  owner_name: string;
  status: string;
  total_quantity_purchased: number;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [centres, setCentres] = useState<CentreStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCentres = async () => {
      try {
        const { data, error } = await supabase
          .from('admin_centre_list_stats')
          .select('*')
          .order('centre_name');
        
        if (error) throw error;
        setCentres(data || []);
      } catch (err) {
        console.error('Error fetching admin stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCentres();
  }, []);
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

      {/* Centres List Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Building className="w-5 h-5 text-indigo-600" />
          Procurement Centres
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
