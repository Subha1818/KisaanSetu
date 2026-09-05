import React, { useEffect, useState, useMemo } from 'react';
import { Users, Search, Phone, Calendar, Shield, Loader, CheckCircle2, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

interface SystemUser {
  id: string;
  name: string;
  mobile_number: string;
  role: 'farmer' | 'staff' | 'admin';
  created_at: string;
  phone_verified?: boolean;
}

export const UserDirectory: React.FC = () => {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<'all' | 'farmer' | 'staff' | 'admin'>('all');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Read-only query against public.users
      const { data, error: fetchErr } = await supabase
        .from('users')
        .select('id, name, mobile_number, role, created_at, phone_verified')
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setUsers((data as SystemUser[]) || []);
    } catch (err: any) {
      console.error('Error fetching user directory:', err);
      setError(err.message || 'Failed to load user directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users by role and search term (name or mobile)
  const filteredUsers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return users.filter(user => {
      const matchesRole = selectedRole === 'all' || user.role === selectedRole;
      const matchesQuery = 
        !query ||
        (user.name && user.name.toLowerCase().includes(query)) ||
        (user.mobile_number && user.mobile_number.toLowerCase().includes(query));
      return matchesRole && matchesQuery;
    });
  }, [users, searchQuery, selectedRole]);

  // Dynamic counts per role
  const roleCounts = useMemo(() => {
    const counts = { all: users.length, farmer: 0, staff: 0, admin: 0 };
    for (const u of users) {
      if (u.role === 'farmer') counts.farmer++;
      else if (u.role === 'staff') counts.staff++;
      else if (u.role === 'admin') counts.admin++;
    }
    return counts;
  }, [users]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'farmer':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Farmer
          </span>
        );
      case 'staff':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            Depot Staff
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <Shield className="w-3 h-3 text-purple-600" />
            Administrator
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {role}
          </span>
        );
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name or mobile number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm placeholder:text-slate-400"
            />
          </div>

          {/* Role Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedRole('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedRole === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Roles ({roleCounts.all})
            </button>
            <button
              onClick={() => setSelectedRole('farmer')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedRole === 'farmer'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Farmers ({roleCounts.farmer})
            </button>
            <button
              onClick={() => setSelectedRole('staff')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedRole === 'staff'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              Staff ({roleCounts.staff})
            </button>
            <button
              onClick={() => setSelectedRole('admin')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedRole === 'admin'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              Admins ({roleCounts.admin})
            </button>
            
            <button
              onClick={fetchUsers}
              title="Refresh Directory"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors ml-1"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Oversight Note */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-slate-500 gap-2">
          <span>Showing {filteredUsers.length} of {users.length} registered system users</span>
          <span className="italic text-slate-400">Read-only administrative oversight</span>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Loader className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
            <p className="text-sm font-medium">Loading user directory...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600">
            <p className="font-semibold">{error}</p>
            <button
              onClick={fetchUsers}
              className="mt-3 px-4 py-2 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold hover:bg-rose-100 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-base">No Users Found</h3>
            <p className="text-sm mt-1 text-slate-400 max-w-sm mx-auto">
              No registered users match your search query or role filter.
            </p>
            {(searchQuery || selectedRole !== 'all') && (
              <button
                onClick={() => { setSearchQuery(''); setSelectedRole('all'); }}
                className="mt-4 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-4 px-6">User / Name</th>
                  <th className="py-4 px-6">Mobile Number</th>
                  <th className="py-4 px-6">Role</th>
                  <th className="py-4 px-6">Registered Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {filteredUsers.map((user) => {
                  const initials = user.name
                    ? user.name
                        .split(' ')
                        .map(n => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()
                    : 'U';

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs border border-slate-200">
                            {initials}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{user.name || 'Unnamed User'}</p>
                            <p className="text-xs text-slate-400 font-mono">ID: {user.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>

                      {/* Mobile */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono text-slate-800">{user.mobile_number}</span>
                          {user.phone_verified && (
                            <span title="Phone Verified" className="text-emerald-600">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-4 px-6">
                        {getRoleBadge(user.role)}
                      </td>

                      {/* Registration Date */}
                      <td className="py-4 px-6 text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(user.created_at)}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDirectory;
