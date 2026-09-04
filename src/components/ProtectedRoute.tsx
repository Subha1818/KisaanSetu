import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('farmer' | 'staff' | 'admin')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }

        setUser(session.user);

        // Fetch custom role from public.users table
        const { data: profile, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();

        let currentRole = profile?.role;

        // If their role is farmer, double check if they have a staff mapping
        // (Staff are registered with 'farmer' role by default in users table)
        if (currentRole === 'farmer') {
          const { data: staffMapping } = await supabase
            .from('staff')
            .select('centre_id')
            .eq('user_id', session.user.id)
            .maybeSingle();
            
          if (staffMapping?.centre_id) {
            currentRole = 'staff';
          }
        }

        if (currentRole && !error) {
          setRole(currentRole);
        }
      } catch (err) {
        console.error('Error during ProtectedRoute auth check:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session) {
          setUser(session.user);
          const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();
          let currentRole = profile?.role;
          
          if (currentRole === 'farmer') {
            const { data: staffMapping } = await supabase
              .from('staff')
              .select('centre_id')
              .eq('user_id', session.user.id)
              .maybeSingle();
              
            if (staffMapping?.centre_id) {
              currentRole = 'staff';
            }
          }
          
          if (currentRole) {
            setRole(currentRole);
          }
        } else {
          setUser(null);
          setRole(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-semibold text-sm">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to register page with pre-selected role if exactly one role is required
    if (allowedRoles && allowedRoles.length === 1) {
      return <Navigate to={`/register?role=${allowedRoles[0]}`} state={{ from: location }} replace />;
    }
    // Fallback to login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && (!role || !allowedRoles.includes(role as any))) {
    // Authorized but role mismatch. Route them to their own correct panel
    const defaultRedirect =
      role === 'staff'
        ? '/centre'
        : role === 'admin'
        ? '/admin'
        : '/farmer';
    return <Navigate to={defaultRedirect} replace />;
  }

  return <>{children}</>;
};
