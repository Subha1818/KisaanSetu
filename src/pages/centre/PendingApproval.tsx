import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hourglass, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const PendingApproval: React.FC = () => {
  const navigate = useNavigate();
  const [centreName, setCentreName] = useState('your centre');

  useEffect(() => {
    let intervalId: any;

    const fetchCentre = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data: staffData } = await supabase
        .from('staff')
        .select('centre_id')
        .eq('user_id', session.user.id)
        .single();
        
      if (staffData?.centre_id) {
        const { data: centreData } = await supabase
          .from('procurement_centres')
          .select('name, approval_status')
          .eq('id', staffData.centre_id)
          .single();
          
        if (centreData?.name) {
          setCentreName(centreData.name);
        }

        // Redirect automatically when admin updates the status
        if (centreData?.approval_status === 'approved') {
          navigate('/centre');
        } else if (centreData?.approval_status === 'rejected') {
          navigate('/centre/rejected');
        }
      }
    };
    
    fetchCentre();

    // Poll every 5 seconds for status updates
    intervalId = setInterval(fetchCentre, 5000);

    return () => clearInterval(intervalId);
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-slate-200 p-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-amber-500"></div>
        
        <div className="mx-auto w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6 text-amber-500 relative">
          <div className="absolute inset-0 border-4 border-amber-100 rounded-full animate-ping opacity-75"></div>
          <Hourglass className="w-10 h-10 animate-pulse relative z-10" />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Registration Pending</h1>
        <p className="text-slate-600 mb-8 leading-relaxed">
          Your request to register <strong className="text-slate-900">{centreName}</strong> is awaiting admin approval. You'll receive access to the dashboard once an administrator reviews your application.
        </p>
        
        <button
          onClick={handleLogout}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default PendingApproval;
