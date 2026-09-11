import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { CACHED_PROFILE_KEY, type CachedSession } from '../lib/offlineAuth';

export { CACHED_PROFILE_KEY, type CachedSession };

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

        // If offline or network failure, try loading cached profile from localStorage first
        const cachedRaw = localStorage.getItem(CACHED_PROFILE_KEY);
        let cachedData = cachedRaw ? JSON.parse(cachedRaw) : null;

        if (!navigator.onLine && cachedData && cachedData.userId === session.user.id) {
          console.log('Offline mode: Using cached user role', cachedData.role);
          setRole(cachedData.role);
          setLoading(false);
          return;
        }

        // Try fetching online role mapping from Supabase
        try {
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
            // Cache profile for offline availability
            localStorage.setItem(
              CACHED_PROFILE_KEY,
              JSON.stringify({
                userId: session.user.id,
                role: currentRole,
                email: session.user.email,
                phone: session.user.phone,
                updatedAt: new Date().toISOString(),
              })
            );
          } else if (cachedData && cachedData.userId === session.user.id) {
            setRole(cachedData.role);
          }
        } catch (fetchErr) {
          console.warn('Network error fetching profile, using offline fallback cache:', fetchErr);
          if (cachedData && cachedData.userId === session.user.id) {
            setRole(cachedData.role);
          }
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
          const cachedRaw = localStorage.getItem(CACHED_PROFILE_KEY);
          const cachedData = cachedRaw ? JSON.parse(cachedRaw) : null;

          if (!navigator.onLine && cachedData && cachedData.userId === session.user.id) {
            setRole(cachedData.role);
            setLoading(false);
            return;
          }

          try {
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
              localStorage.setItem(
                CACHED_PROFILE_KEY,
                JSON.stringify({
                  userId: session.user.id,
                  role: currentRole,
                  email: session.user.email,
                  updatedAt: new Date().toISOString(),
                })
              );
            } else if (cachedData && cachedData.userId === session.user.id) {
              setRole(cachedData.role);
            }
          } catch {
            if (cachedData && cachedData.userId === session.user.id) {
              setRole(cachedData.role);
            }
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
    // Redirect unauthenticated user to login page
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
