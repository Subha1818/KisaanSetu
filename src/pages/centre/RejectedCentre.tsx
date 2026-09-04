import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const RejectedCentre: React.FC = () => {
  const navigate = useNavigate();
  const [centreName, setCentreName] = useState('your centre');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  useEffect(() => {
    const fetchCentre = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data: staffData } = await supabase
        .from('staff')
        .select('centre_id')
        .eq('user_id', session.user.id)
        .maybeSingle();
        
      if (staffData?.centre_id) {
        const { data: centreData } = await supabase
          .from('procurement_centres')
          .select('name, rejection_reason')
          .eq('id', staffData.centre_id)
          .maybeSingle();
          
        if (centreData?.name) {
          setCentreName(centreData.name);
          setRejectionReason(centreData.rejection_reason);
        }
      }
    };
    fetchCentre();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-slate-200 p-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-rose-500"></div>
        
        <div className="mx-auto w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6 text-rose-500">
          <XCircle className="w-10 h-10" />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Registration Not Approved</h1>
        <p className="text-slate-600 mb-6 leading-relaxed">
          Your registration for <strong className="text-slate-900">{centreName}</strong> was not approved by the administration.
        </p>
        
        {rejectionReason && (
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 mb-8 text-left">
            <h3 className="text-sm font-bold text-rose-800 mb-1">Reason:</h3>
            <p className="text-rose-700 text-sm">{rejectionReason}</p>
          </div>
        )}
        
        <button
          onClick={handleLogout}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default RejectedCentre;
