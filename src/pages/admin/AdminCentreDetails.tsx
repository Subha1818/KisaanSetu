import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building, MapPin, Users, Package, Activity, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

interface CentreDetails {
  id: string;
  name: string;
  owner_name: string;
  status: string;
  geo_blocks: {
    block_name: string;
    district_name: string;
    state_name: string;
  };
}

interface ProductStat {
  product_name: string;
  total_quantity: number;
}

const AdminCentreDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [centre, setCentre] = useState<CentreDetails | null>(null);
  const [farmersServed, setFarmersServed] = useState<number>(0);
  const [productStats, setProductStats] = useState<ProductStat[]>([]);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return;
      try {
        setLoading(true);

        // 1. Fetch core centre info
        const { data: centreData, error: centreErr } = await supabase
          .from('procurement_centres')
          .select(`
            id, name, owner_name, status,
            geo_blocks (
              block_name, district_name, state_name
            )
          `)
          .eq('id', id)
          .single();
        if (centreErr) throw centreErr;
        setCentre(centreData);

        // 2. Fetch distinct farmers served
        const { data: farmersData, error: farmersErr } = await supabase
          .rpc('get_centre_farmers_served', { p_centre_id: id });
        if (farmersErr) throw farmersErr;
        setFarmersServed(farmersData || 0);

        // 3. Fetch product stats
        const { data: statsData, error: statsErr } = await supabase
          .from('admin_centre_product_stats')
          .select('product_name, total_quantity')
          .eq('centre_id', id);
        if (statsErr) throw statsErr;
        setProductStats(statsData || []);

      } catch (err) {
        console.error('Error fetching centre details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!centre) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-slate-800">Centre not found</h2>
        <button onClick={() => navigate('/admin')} className="mt-4 text-indigo-600 hover:underline">
          Return to Admin Dashboard
        </button>
      </div>
    );
  }

  const location = centre.geo_blocks
    ? `${centre.geo_blocks.block_name}, ${centre.geo_blocks.district_name}, ${centre.geo_blocks.state_name}`
    : 'Location not configured';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/admin')}
          className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Centre Intelligence</h1>
          <p className="text-slate-500 mt-1">Detailed operational metrics and procurement breakdown.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Info Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 lg:col-span-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-indigo-50 text-indigo-600 rounded-xl">
                <Building className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{centre.name}</h2>
                <div className="flex items-center gap-2 text-slate-500 mt-1">
                  <MapPin className="w-4 h-4" />
                  <span>{location}</span>
                </div>
              </div>
            </div>
            <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider ${
              centre.status === 'open' 
                ? 'bg-emerald-100 text-emerald-700' 
                : 'bg-rose-100 text-rose-700'
            }`}>
              {centre.status}
            </span>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-100 grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">In-Charge Officer</p>
              <p className="text-lg font-bold text-slate-800 mt-1">{centre.owner_name}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Unique Farmers Served</p>
              <div className="flex items-center gap-2 mt-1">
                <Users className="w-5 h-5 text-indigo-500" />
                <p className="text-2xl font-black text-indigo-900">{farmersServed.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Product Breakdown Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-lg p-8 text-white flex flex-col h-full">
          <div className="flex items-center gap-3 mb-6">
            <Package className="w-6 h-6 text-indigo-400" />
            <h3 className="text-xl font-bold">Procurement Volume</h3>
          </div>
          
          <div className="flex-grow space-y-4">
            {productStats.length > 0 ? (
              productStats.map(stat => (
                <div key={stat.product_name} className="bg-white/10 rounded-xl p-4 border border-white/5 backdrop-blur-sm">
                  <p className="text-sm text-slate-300 font-medium uppercase tracking-wider">{stat.product_name}</p>
                  <div className="flex items-end gap-2 mt-1">
                    <p className="text-3xl font-black text-white">{stat.total_quantity.toLocaleString()}</p>
                    <span className="text-sm text-slate-400 mb-1">kg</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-80">
                <Activity className="w-8 h-8 mb-2" />
                <p>No procurements yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCentreDetails;
