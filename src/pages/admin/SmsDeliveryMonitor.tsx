import React, { useEffect, useState, useMemo } from 'react';
import { 
  Send, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Phone, 
  Calendar, 
  Loader, 
  RefreshCw,
  Smartphone,
  ShieldAlert,
  X
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

interface SmsNotification {
  id: string;
  type: string;
  channel: string;
  message: string;
  sent_at: string;
  delivery_status: 'sent' | 'failed' | 'pending';
  user_id: string;
  users?: {
    name: string;
    mobile_number: string;
  } | null;
}

export const SmsDeliveryMonitor: React.FC = () => {
  const [notifications, setNotifications] = useState<SmsNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'failed' | 'sent' | 'pending'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSmsLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchErr } = await supabase
        .from('notifications')
        .select(`
          id,
          type,
          channel,
          message,
          sent_at,
          delivery_status,
          user_id,
          users (
            name,
            mobile_number
          )
        `)
        .eq('channel', 'sms')
        .order('sent_at', { ascending: false })
        .limit(200);

      if (fetchErr) throw fetchErr;
      setNotifications((data as unknown as SmsNotification[]) || []);
    } catch (err: any) {
      console.error('Error fetching SMS delivery logs:', err);
      setError(err.message || 'Failed to load SMS notification logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSmsLogs();
  }, []);

  // Filtered Notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      // Status Filter (specifically supports showing only 'failed')
      if (statusFilter !== 'all' && n.delivery_status !== statusFilter) {
        return false;
      }

      // Type Filter
      if (typeFilter !== 'all' && n.type !== typeFilter) {
        return false;
      }

      // Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const recipientName = n.users?.name?.toLowerCase() || '';
        const recipientMobile = n.users?.mobile_number?.toLowerCase() || '';
        const msg = n.message.toLowerCase();

        const matches = recipientName.includes(q) || recipientMobile.includes(q) || msg.includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [notifications, statusFilter, typeFilter, searchQuery]);

  // Counts & Gateway Health Metrics
  const metrics = useMemo(() => {
    let sent = 0;
    let failed = 0;
    let pending = 0;

    for (const n of notifications) {
      if (n.delivery_status === 'sent') sent++;
      else if (n.delivery_status === 'failed') failed++;
      else if (n.delivery_status === 'pending') pending++;
    }

    const total = notifications.length;
    const successRate = total > 0 ? Math.round((sent / total) * 100) : 100;

    return { total, sent, failed, pending, successRate };
  }, [notifications]);

  // Format type into human readable label
  const formatNotificationType = (type: string) => {
    switch (type) {
      case 'reminder_1day':
        return { label: '24h Appointment Reminder', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'turn_approaching':
        return { label: 'Turn Approaching', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'turn_near':
        return { label: 'Queue Ready (Now)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'cancellation':
        return { label: 'Booking Cancelled', color: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'reschedule':
        return { label: 'Rescheduled', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      default:
        return { label: type.replace(/_/g, ' '), color: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const hasActiveFilters = statusFilter !== 'all' || typeFilter !== 'all' || searchQuery;

  return (
    <div className="space-y-6">
      {/* Gateway Health & Failure Alert Banner */}
      {metrics.failed > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 shadow-sm flex items-start gap-4">
          <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-rose-950 text-base">
              Gateway Delivery Warning: {metrics.failed} Failed SMS Delivery {metrics.failed === 1 ? 'Attempt' : 'Attempts'}
            </h3>
            <p className="text-xs text-rose-800 mt-1 max-w-2xl">
              SMS dispatch depends on your connected httpSMS gateway Android device. Failed attempts indicate the phone may be offline, battery depleted, SMS credit exhausted, or out of carrier coverage.
            </p>
            <button
              onClick={() => setStatusFilter('failed')}
              className="mt-3 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors"
            >
              Filter to View {metrics.failed} Failed Messages
            </button>
          </div>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total SMS Dispatched */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Total SMS Logged</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-2">{metrics.total} Messages</h3>
            </div>
            <span className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Send className="w-6 h-6" />
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
            Channel: httpSMS Android Gateway
          </div>
        </div>

        {/* Successfully Delivered */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Successfully Sent</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-2">{metrics.sent} Sent</h3>
            </div>
            <span className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-emerald-700 font-medium">
            {metrics.successRate}% Success Rate
          </div>
        </div>

        {/* Failed Messages (Clickable filter - Amber Accent for Needs Attention) */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'failed' ? 'all' : 'failed')}
          className={`p-6 rounded-2xl border shadow-sm transition-all duration-200 cursor-pointer ${
            metrics.failed > 0 
              ? 'bg-amber-50/60 border-amber-300 hover:border-amber-400 shadow-sm shadow-amber-900/5' 
              : 'bg-white border-slate-200 hover:shadow-md'
          }`}
          title="Click to filter failed messages"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Delivery Failures</p>
              <h3 className={`text-2xl font-bold mt-2 ${metrics.failed > 0 ? 'text-amber-900' : 'text-slate-900'}`}>
                {metrics.failed} Failed
              </h3>
            </div>
            <span className={`p-3 rounded-xl border shadow-xs ${metrics.failed > 0 ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
              <AlertTriangle className="w-6 h-6" />
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 text-xs font-semibold">
            <span className={metrics.failed > 0 ? 'text-amber-700 underline font-bold' : 'text-slate-500'}>
              {metrics.failed > 0 ? 'Click to inspect failed logs' : 'Zero gateway errors'}
            </span>
          </div>
        </div>

        {/* Pending Queue */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">In Dispatch Queue</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-2">{metrics.pending} Pending</h3>
            </div>
            <span className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
            Awaiting carrier acknowledgment
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search recipient name, phone, or SMS content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm placeholder:text-slate-400"
            />
          </div>

          {/* Status Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({metrics.total})
            </button>
            <button
              onClick={() => setStatusFilter('failed')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'failed'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
              }`}
            >
              Failed Only ({metrics.failed})
            </button>
            <button
              onClick={() => setStatusFilter('sent')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'sent'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Delivered ({metrics.sent})
            </button>

            {/* Type dropdown */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All SMS Types</option>
              <option value="reminder_1day">24h Reminders</option>
              <option value="turn_approaching">Turn Approaching</option>
              <option value="turn_near">Queue Ready</option>
              <option value="cancellation">Cancellations</option>
              <option value="reschedule">Reschedules</option>
            </select>

            <button
              onClick={fetchSmsLogs}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors ml-1"
              title="Refresh SMS logs"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Indicator */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between text-xs pt-2 text-slate-500 border-t border-slate-100">
            <span>Showing {filteredNotifications.length} of {notifications.length} SMS logs</span>
            <button
              onClick={() => { setStatusFilter('all'); setTypeFilter('all'); setSearchQuery(''); }}
              className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 font-semibold"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* SMS Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Loader className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
            <p className="text-sm font-medium">Loading SMS delivery records...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600">
            <p className="font-semibold">{error}</p>
            <button
              onClick={fetchSmsLogs}
              className="mt-3 px-4 py-2 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold hover:bg-rose-100 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Smartphone className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-base">No SMS Messages Found</h3>
            <p className="text-sm mt-1 text-slate-400 max-w-sm mx-auto">
              {statusFilter === 'failed' 
                ? 'Great news! There are no failed SMS deliveries logged in the system.' 
                : 'No SMS delivery records match your current filter settings.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={() => { setStatusFilter('all'); setTypeFilter('all'); setSearchQuery(''); }}
                className="mt-4 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-4 px-6">Sent Timestamp</th>
                  <th className="py-4 px-6">Recipient</th>
                  <th className="py-4 px-6">Message Type</th>
                  <th className="py-4 px-6">Content Preview</th>
                  <th className="py-4 px-6">Delivery Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {filteredNotifications.map((notif) => {
                  const typeInfo = formatNotificationType(notif.type);
                  const timeFormatted = new Date(notif.sent_at).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <tr 
                      key={notif.id} 
                      className={`hover:bg-slate-50/60 transition-colors ${
                        notif.delivery_status === 'failed' ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      {/* Sent At */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs font-medium">{timeFormatted}</span>
                        </div>
                      </td>

                      {/* Recipient */}
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-bold text-slate-900">{notif.users?.name || 'Registered User'}</p>
                          <p className="text-xs font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {notif.users?.mobile_number || 'N/A'}
                          </p>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                      </td>

                      {/* Content Preview */}
                      <td className="py-4 px-6 max-w-xs">
                        <p className="text-xs text-slate-600 truncate font-mono" title={notif.message}>
                          {notif.message}
                        </p>
                      </td>

                      {/* Delivery Status */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        {notif.delivery_status === 'sent' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Delivered
                          </span>
                        ) : notif.delivery_status === 'failed' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                            Failed Delivery
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Pending Dispatch
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-2">
          <span>Read-only gateway delivery monitoring • Source: public.notifications</span>
          <span>Showing {filteredNotifications.length} records</span>
        </div>
      </div>
    </div>
  );
};

export default SmsDeliveryMonitor;
