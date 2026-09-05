import React, { useEffect, useState, useMemo } from 'react';
import { 
  History, 
  Search, 
  XCircle, 
  AlertCircle, 
  Calendar, 
  CheckCircle2, 
  Building, 
  Clock, 
  Loader, 
  RefreshCw, 
  X, 
  FileText 
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

interface ActivityItem {
  id: string;
  timestamp: string;
  category: 'booking' | 'centre';
  eventType: 'cancellation' | 'reschedule' | 'no_show' | 'completed' | 'status_change' | 'centre_approved' | 'centre_rejected' | 'centre_submitted';
  title: string;
  description: string;
  badge: {
    label: string;
    color: string;
  };
  actor?: string;
  metadata?: {
    token?: string;
    farmerName?: string;
    farmerMobile?: string;
    depotName?: string;
    crop?: string;
    note?: string;
    reason?: string;
  };
}

export const ActivityLog: React.FC = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'cancellations_noshows' | 'centre_events' | 'reschedules' | 'completions'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchActivityFeed = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch booking history transitions (cancellations, reschedules, no-shows, completions)
      const bookingHistoryPromise = supabase
        .from('booking_history')
        .select(`
          id,
          booking_id,
          previous_status,
          new_status,
          changed_at,
          note,
          bookings (
            token,
            product_name,
            users (
              name,
              mobile_number
            ),
            procurement_centres (
              name
            )
          )
        `)
        .order('changed_at', { ascending: false })
        .limit(100);

      // 2. Fetch centre approval, rejection, and onboarding events
      const centreEventsPromise = supabase
        .from('procurement_centres')
        .select(`
          id,
          name,
          owner_name,
          approval_status,
          reviewed_at,
          reviewed_by,
          rejection_reason,
          created_at,
          reviewer:users!reviewed_by (
            name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      const [historyRes, centreRes] = await Promise.all([
        bookingHistoryPromise,
        centreEventsPromise
      ]);

      if (historyRes.error) console.error('Error fetching booking history:', historyRes.error);
      if (centreRes.error) console.error('Error fetching centre events:', centreRes.error);

      const items: ActivityItem[] = [];

      // Process booking history rows
      if (historyRes.data) {
        for (const row of historyRes.data as any[]) {
          const b = row.bookings;
          const farmerName = b?.users?.name || 'Farmer';
          const farmerMobile = b?.users?.mobile_number || '';
          const depotName = b?.procurement_centres?.name || 'Depot';
          const token = b?.token || 'N/A';
          const crop = b?.product_name || '';

          const isCancellation = row.new_status === 'cancelled';
          const isNoShow = row.new_status === 'no_show';
          const isCompleted = row.new_status === 'completed';
          const isReschedule = 
            (row.note && row.note.toLowerCase().includes('reschedule')) ||
            (row.previous_status === 'booked' && row.new_status === 'booked');

          let eventType: ActivityItem['eventType'] = 'status_change';
          let title = `Booking Transition: ${row.previous_status || 'initial'} ➔ ${row.new_status}`;
          let badge = { label: row.new_status.toUpperCase(), color: 'bg-slate-100 text-slate-700 border-slate-200' };

          if (isCancellation) {
            eventType = 'cancellation';
            title = `Booking Cancelled: Token ${token}`;
            badge = { label: 'Cancellation', color: 'bg-rose-100 text-rose-800 border-rose-200' };
          } else if (isNoShow) {
            eventType = 'no_show';
            title = `Farmer Marked No-Show: Token ${token}`;
            badge = { label: 'No-Show', color: 'bg-amber-100 text-amber-800 border-amber-200' };
          } else if (isReschedule) {
            eventType = 'reschedule';
            title = `Booking Rescheduled: Token ${token}`;
            badge = { label: 'Rescheduled', color: 'bg-blue-100 text-blue-800 border-blue-200' };
          } else if (isCompleted) {
            eventType = 'completed';
            title = `Procurement Intake Completed: Token ${token}`;
            badge = { label: 'Completed', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
          }

          const description = `${farmerName} (${farmerMobile || 'No phone'}) • ${crop ? `${crop} • ` : ''}${depotName}`;

          items.push({
            id: `bh-${row.id}`,
            timestamp: row.changed_at,
            category: 'booking',
            eventType,
            title,
            description,
            badge,
            metadata: {
              token,
              farmerName,
              farmerMobile,
              depotName,
              crop,
              note: row.note
            }
          });
        }
      }

      // Process centre review events
      if (centreRes.data) {
        for (const c of centreRes.data as any[]) {
          const reviewerName = c.reviewer?.name || 'Administrator';

          // 1. If reviewed, record approval or rejection event
          if (c.reviewed_at) {
            if (c.approval_status === 'approved') {
              items.push({
                id: `cp-app-${c.id}`,
                timestamp: c.reviewed_at,
                category: 'centre',
                eventType: 'centre_approved',
                title: `Depot Application Approved: "${c.name}"`,
                description: `Authorized for procurement operations by ${reviewerName}. In-charge: ${c.owner_name}`,
                badge: { label: 'Depot Approved', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
                actor: reviewerName,
                metadata: {
                  depotName: c.name,
                  farmerName: c.owner_name
                }
              });
            } else if (c.approval_status === 'rejected') {
              items.push({
                id: `cp-rej-${c.id}`,
                timestamp: c.reviewed_at,
                category: 'centre',
                eventType: 'centre_rejected',
                title: `Depot Application Rejected: "${c.name}"`,
                description: `Application reviewed and rejected by ${reviewerName}. Reason: ${c.rejection_reason || 'Not specified'}`,
                badge: { label: 'Depot Rejected', color: 'bg-rose-100 text-rose-800 border-rose-200' },
                actor: reviewerName,
                metadata: {
                  depotName: c.name,
                  farmerName: c.owner_name,
                  reason: c.rejection_reason
                }
              });
            }
          }

          // 2. Depot application submission event
          if (c.created_at) {
            items.push({
              id: `cp-sub-${c.id}`,
              timestamp: c.created_at,
              category: 'centre',
              eventType: 'centre_submitted',
              title: `Depot Application Submitted: "${c.name}"`,
              description: `New regional depot onboarding request registered by applicant ${c.owner_name}`,
              badge: { label: 'Depot Submitted', color: 'bg-purple-100 text-purple-800 border-purple-200' },
              metadata: {
                depotName: c.name,
                farmerName: c.owner_name
              }
            });
          }
        }
      }

      // Sort unified feed: most recent first
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivities(items);

    } catch (err: any) {
      console.error('Error fetching unified activity log:', err);
      setError(err.message || 'Failed to load activity feed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivityFeed();
  }, []);

  // Filtered Feed
  const filteredActivities = useMemo(() => {
    return activities.filter(item => {
      // Category filter
      if (categoryFilter === 'cancellations_noshows') {
        if (item.eventType !== 'cancellation' && item.eventType !== 'no_show') return false;
      } else if (categoryFilter === 'centre_events') {
        if (item.category !== 'centre') return false;
      } else if (categoryFilter === 'reschedules') {
        if (item.eventType !== 'reschedule') return false;
      } else if (categoryFilter === 'completions') {
        if (item.eventType !== 'completed') return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const title = item.title.toLowerCase();
        const desc = item.description.toLowerCase();
        const token = item.metadata?.token?.toLowerCase() || '';
        const depot = item.metadata?.depotName?.toLowerCase() || '';
        const farmer = item.metadata?.farmerName?.toLowerCase() || '';

        const matches = title.includes(q) || desc.includes(q) || token.includes(q) || depot.includes(q) || farmer.includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [activities, categoryFilter, searchQuery]);

  // Event counts for category buttons
  const counts = useMemo(() => {
    let cancelNoShow = 0;
    let centres = 0;
    let reschedules = 0;
    let completions = 0;

    for (const a of activities) {
      if (a.eventType === 'cancellation' || a.eventType === 'no_show') cancelNoShow++;
      if (a.category === 'centre') centres++;
      if (a.eventType === 'reschedule') reschedules++;
      if (a.eventType === 'completed') completions++;
    }

    return { all: activities.length, cancelNoShow, centres, reschedules, completions };
  }, [activities]);

  const getEventIcon = (eventType: ActivityItem['eventType']) => {
    switch (eventType) {
      case 'cancellation':
        return <XCircle className="w-5 h-5 text-rose-600" />;
      case 'no_show':
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      case 'reschedule':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'centre_approved':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'centre_rejected':
        return <XCircle className="w-5 h-5 text-rose-600" />;
      case 'centre_submitted':
        return <Building className="w-5 h-5 text-purple-600" />;
      default:
        return <History className="w-5 h-5 text-slate-500" />;
    }
  };

  const hasActiveFilters = categoryFilter !== 'all' || searchQuery;

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search audit trail by token, farmer, depot, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm placeholder:text-slate-400"
            />
          </div>

          {/* Refresh button */}
          <div className="flex items-center gap-2">
            <button
              onClick={fetchActivityFeed}
              className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              title="Refresh activity feed"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              categoryFilter === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Activity ({counts.all})
          </button>
          <button
            onClick={() => setCategoryFilter('cancellations_noshows')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              categoryFilter === 'cancellations_noshows'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            Cancellations & No-Shows ({counts.cancelNoShow})
          </button>
          <button
            onClick={() => setCategoryFilter('centre_events')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              categoryFilter === 'centre_events'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            Depot Approvals & Reviews ({counts.centres})
          </button>
          <button
            onClick={() => setCategoryFilter('reschedules')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              categoryFilter === 'reschedules'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Reschedules ({counts.reschedules})
          </button>
          <button
            onClick={() => setCategoryFilter('completions')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              categoryFilter === 'completions'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Intake Completions ({counts.completions})
          </button>
        </div>

        {/* Reset Filter Action */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between text-xs pt-2 text-slate-500 border-t border-slate-100">
            <span>Showing {filteredActivities.length} of {activities.length} audit events</span>
            <button
              onClick={() => { setCategoryFilter('all'); setSearchQuery(''); }}
              className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 font-semibold"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Activity Timeline Feed */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Loader className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
            <p className="text-sm font-medium">Aggregating system-wide audit trail...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600">
            <p className="font-semibold">{error}</p>
            <button
              onClick={fetchActivityFeed}
              className="mt-3 px-4 py-2 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold hover:bg-rose-100 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <History className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-base">No Audit Events Found</h3>
            <p className="text-sm mt-1 text-slate-400 max-w-sm mx-auto">
              {hasActiveFilters 
                ? 'No activity matches your active search or category filters.' 
                : 'No platform activity events have been recorded yet.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={() => { setCategoryFilter('all'); setSearchQuery(''); }}
                className="mt-4 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="relative pl-6 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {filteredActivities.map((item) => {
              const formattedDate = new Date(item.timestamp).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div key={item.id} className="relative group">
                  {/* Timeline icon node */}
                  <div className="absolute -left-6 top-1 -translate-x-1/2 w-8 h-8 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                    {getEventIcon(item.eventType)}
                  </div>

                  {/* Card Content */}
                  <div className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-xl p-4 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${item.badge.color}`}>
                          {item.badge.label}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formattedDate}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 mt-2">
                      {item.description}
                    </p>

                    {/* Additional Metadata Details */}
                    {item.metadata?.note && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-start gap-1.5 text-xs text-slate-500 bg-white/60 p-2 rounded-lg">
                        <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                        <span>Audit Note: <em>"{item.metadata.note}"</em></span>
                      </div>
                    )}

                    {item.metadata?.reason && (
                      <div className="mt-2.5 pt-2 border-t border-rose-100 flex items-start gap-1.5 text-xs text-rose-700 bg-rose-50/60 p-2 rounded-lg">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500 mt-0.5 flex-shrink-0" />
                        <span>Rejection Reason: <strong>{item.metadata.reason}</strong></span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-2">
          <span>Read-only system audit trail • Unified from booking_history & procurement_centres</span>
          <span>Showing {filteredActivities.length} events</span>
        </div>
      </div>
    </div>
  );
};

export default ActivityLog;
