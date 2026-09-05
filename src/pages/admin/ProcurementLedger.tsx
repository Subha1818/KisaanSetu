import React, { useEffect, useState, useMemo } from 'react';
import { 
  Download, 
  Search, 
  Calendar, 
  Building, 
  Package, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  Send,
  Loader, 
  RefreshCw,
  TrendingUp,
  FileSpreadsheet,
  X
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

interface ProcurementRecord {
  id: string;
  created_at: string;
  quantity_brought: number;
  quantity_accepted: number;
  quantity_rejected: number;
  rate_per_kg: number;
  total_amount: number;
  bookings: {
    id: string;
    token: string;
    product_name: string;
    booking_dates?: { date: string } | null;
    users?: {
      name: string;
      mobile_number: string;
    } | null;
    procurement_centres?: {
      id: string;
      name: string;
      geo_blocks?: {
        block_name: string;
        district_name: string;
        state_name: string;
      } | null;
    } | null;
  } | null;
  payments?: Array<{
    id: string;
    status: 'pending' | 'initiated' | 'credited';
    updated_at: string;
  }> | null;
}

interface GeoSummary {
  state: string;
  district: string;
  transactionCount: number;
  totalQuantity: number;
  totalAmount: number;
}

export const ProcurementLedger: React.FC = () => {
  const [records, setRecords] = useState<ProcurementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('all');
  const [selectedCentre, setSelectedCentre] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showGeoBreakdown, setShowGeoBreakdown] = useState(true);

  const fetchLedger = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchErr } = await supabase
        .from('procurements')
        .select(`
          id,
          created_at,
          quantity_brought,
          quantity_accepted,
          quantity_rejected,
          rate_per_kg,
          total_amount,
          bookings (
            id,
            token,
            product_name,
            booking_dates ( date ),
            users ( name, mobile_number ),
            procurement_centres (
              id,
              name,
              geo_blocks (
                block_name,
                district_name,
                state_name
              )
            )
          ),
          payments (
            id,
            status,
            updated_at
          )
        `)
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setRecords((data as unknown as ProcurementRecord[]) || []);
    } catch (err: any) {
      console.error('Error fetching procurement ledger:', err);
      setError(err.message || 'Failed to load procurement ledger.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  // Unique crops for filter dropdown
  const uniqueCrops = useMemo(() => {
    const crops = new Set<string>();
    for (const r of records) {
      const name = r.bookings?.product_name;
      if (name) crops.add(name);
    }
    return Array.from(crops).sort();
  }, [records]);

  // Unique centres for filter dropdown
  const uniqueCentres = useMemo(() => {
    const centresMap = new Map<string, string>();
    for (const r of records) {
      const c = r.bookings?.procurement_centres;
      if (c?.id && c?.name) {
        centresMap.set(c.id, c.name);
      }
    }
    return Array.from(centresMap.entries()).map(([id, name]) => ({ id, name }));
  }, [records]);

  // Filtered dataset
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // Date filter
      const recordDate = r.created_at ? r.created_at.slice(0, 10) : '';
      if (dateFrom && recordDate < dateFrom) return false;
      if (dateTo && recordDate > dateTo) return false;

      // Crop filter
      if (selectedCrop !== 'all') {
        const cropName = r.bookings?.product_name || '';
        if (cropName.toLowerCase() !== selectedCrop.toLowerCase()) return false;
      }

      // Centre filter
      if (selectedCentre !== 'all') {
        const centreId = r.bookings?.procurement_centres?.id;
        if (centreId !== selectedCentre) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const token = r.bookings?.token?.toLowerCase() || '';
        const farmerName = r.bookings?.users?.name?.toLowerCase() || '';
        const farmerMobile = r.bookings?.users?.mobile_number?.toLowerCase() || '';
        const centreName = r.bookings?.procurement_centres?.name?.toLowerCase() || '';
        const district = r.bookings?.procurement_centres?.geo_blocks?.district_name?.toLowerCase() || '';

        const matches = token.includes(q) ||
          farmerName.includes(q) ||
          farmerMobile.includes(q) ||
          centreName.includes(q) ||
          district.includes(q);

        if (!matches) return false;
      }

      return true;
    });
  }, [records, dateFrom, dateTo, selectedCrop, selectedCentre, searchQuery]);

  // Summary Metrics for filtered records
  const summaryMetrics = useMemo(() => {
    let totalBrought = 0;
    let totalAccepted = 0;
    let totalRejected = 0;
    let totalAmount = 0;
    let creditedAmount = 0;
    let creditedCount = 0;
    let pendingCount = 0;
    let initiatedCount = 0;

    for (const r of filteredRecords) {
      totalBrought += Number(r.quantity_brought || 0);
      totalAccepted += Number(r.quantity_accepted || 0);
      totalRejected += Number(r.quantity_rejected || 0);
      totalAmount += Number(r.total_amount || 0);

      const pay = r.payments?.[0];
      if (pay?.status === 'credited') {
        creditedAmount += Number(r.total_amount || 0);
        creditedCount++;
      } else if (pay?.status === 'initiated') {
        initiatedCount++;
      } else {
        pendingCount++;
      }
    }

    return {
      totalBrought,
      totalAccepted,
      totalRejected,
      totalAmount,
      creditedAmount,
      creditedCount,
      pendingCount,
      initiatedCount,
      count: filteredRecords.length
    };
  }, [filteredRecords]);

  // State & District Breakdown
  const geoBreakdown = useMemo(() => {
    const map = new Map<string, GeoSummary>();

    for (const r of filteredRecords) {
      const geo = r.bookings?.procurement_centres?.geo_blocks;
      const state = geo?.state_name || 'Unassigned State';
      const district = geo?.district_name || 'Unassigned District';
      const key = `${state}__${district}`;

      if (!map.has(key)) {
        map.set(key, {
          state,
          district,
          transactionCount: 0,
          totalQuantity: 0,
          totalAmount: 0,
        });
      }

      const item = map.get(key)!;
      item.transactionCount++;
      item.totalQuantity += Number(r.quantity_accepted || 0);
      item.totalAmount += Number(r.total_amount || 0);
    }

    return Array.from(map.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [filteredRecords]);

  // CSV Export Function
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return;

    const headers = [
      'Receipt ID',
      'Date & Time',
      'Token',
      'Farmer Name',
      'Farmer Mobile',
      'Crop',
      'Quantity Brought (kg)',
      'Quantity Accepted (kg)',
      'Quantity Rejected (kg)',
      'Rate per kg (INR)',
      'Total Amount (INR)',
      'Payment Status',
      'Procurement Centre',
      'Block',
      'District',
      'State'
    ];

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = filteredRecords.map(r => {
      const b = r.bookings;
      const c = b?.procurement_centres;
      const g = c?.geo_blocks;
      const pay = r.payments?.[0];
      const farmer = b?.users;

      return [
        escapeCSV(r.id),
        escapeCSV(new Date(r.created_at).toLocaleString()),
        escapeCSV(b?.token || ''),
        escapeCSV(farmer?.name || 'N/A'),
        escapeCSV(farmer?.mobile_number || 'N/A'),
        escapeCSV(b?.product_name || ''),
        escapeCSV(r.quantity_brought),
        escapeCSV(r.quantity_accepted),
        escapeCSV(r.quantity_rejected),
        escapeCSV(r.rate_per_kg),
        escapeCSV(r.total_amount),
        escapeCSV(pay?.status || 'pending'),
        escapeCSV(c?.name || 'N/A'),
        escapeCSV(g?.block_name || 'N/A'),
        escapeCSV(g?.district_name || 'N/A'),
        escapeCSV(g?.state_name || 'N/A')
      ].join(',');
    });

    // Summary totals row
    const totalRow = [
      'TOTAL',
      '',
      '',
      '',
      '',
      '',
      escapeCSV(summaryMetrics.totalBrought),
      escapeCSV(summaryMetrics.totalAccepted),
      escapeCSV(summaryMetrics.totalRejected),
      '',
      escapeCSV(summaryMetrics.totalAmount),
      '',
      '',
      '',
      '',
      ''
    ].join(',');

    const csvContent = [headers.join(','), ...rows, totalRow].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `AgriProcure_Ledger_Report_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSelectedCrop('all');
    setSelectedCentre('all');
    setSearchQuery('');
  };

  const hasActiveFilters = dateFrom || dateTo || selectedCrop !== 'all' || selectedCentre !== 'all' || searchQuery;

  return (
    <div className="space-y-6">
      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Quantity Procured */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Quantity Procured</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-2">
                {summaryMetrics.totalAccepted.toLocaleString()} kg
              </h3>
            </div>
            <span className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 shadow-xs">
              <Package className="w-6 h-6" />
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-xs text-slate-500">
            <span>Brought: {summaryMetrics.totalBrought.toLocaleString()} kg</span>
            <span className="text-rose-600">Rej: {summaryMetrics.totalRejected.toLocaleString()} kg</span>
          </div>
        </div>

        {/* Total Amount Disbursed */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Procurement Value</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-2">
                ₹{summaryMetrics.totalAmount.toLocaleString()}
              </h3>
            </div>
            <span className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shadow-xs">
              <TrendingUp className="w-6 h-6" />
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-xs text-slate-500">
            <span className="text-emerald-700 font-semibold">
              Credited: ₹{summaryMetrics.creditedAmount.toLocaleString()}
            </span>
            <span>({summaryMetrics.creditedCount} paid)</span>
          </div>
        </div>

        {/* Payment Pipeline */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-200 transition-all duration-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Payout Pipeline</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-2">
                {summaryMetrics.creditedCount} of {summaryMetrics.count} Paid
              </h3>
            </div>
            <span className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 shadow-xs">
              <Clock className="w-6 h-6" />
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex gap-3 text-xs">
            <span className="text-amber-700 font-bold">Pending: {summaryMetrics.pendingCount}</span>
            <span className="text-blue-600 font-medium">Initiated: {summaryMetrics.initiatedCount}</span>
          </div>
        </div>

        {/* Total Receipts */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Certified Transactions</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-2">
                {summaryMetrics.count} Receipts
              </h3>
            </div>
            <span className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shadow-xs">
              <FileSpreadsheet className="w-6 h-6" />
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
            <span>Aggregated across all registered depots</span>
          </div>
        </div>
      </div>

      {/* Filter and Export Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by token, farmer, phone, depot, or district..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm placeholder:text-slate-400"
            />
          </div>

          {/* Action Buttons: Export & Refresh */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowGeoBreakdown(!showGeoBreakdown)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors border ${
                showGeoBreakdown 
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 inline mr-1.5" />
              Regional Summary ({geoBreakdown.length})
            </button>

            <button
              onClick={handleExportCSV}
              disabled={filteredRecords.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
              title="Download CSV report of currently filtered transactions"
            >
              <Download className="w-4 h-4" />
              Export CSV ({filteredRecords.length})
            </button>

            <button
              onClick={fetchLedger}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Refresh ledger data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
          
          {/* Date From */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Crop Filter */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Crop Variety</label>
            <select
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 capitalize"
            >
              <option value="all">All Crops ({uniqueCrops.length})</option>
              {uniqueCrops.map(crop => (
                <option key={crop} value={crop}>{crop}</option>
              ))}
            </select>
          </div>

          {/* Centre Filter */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Procurement Centre</label>
            <select
              value={selectedCentre}
              onChange={(e) => setSelectedCentre(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 truncate"
            >
              <option value="all">All Depots ({uniqueCentres.length})</option>
              {uniqueCentres.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Stats & Reset */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between text-xs pt-2 text-slate-500 border-t border-slate-100">
            <span>Filtered {filteredRecords.length} of {records.length} transactions</span>
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 font-semibold"
            >
              <X className="w-3.5 h-3.5" />
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* Regional State & District Breakdown Panel */}
      {showGeoBreakdown && geoBreakdown.length > 0 && (
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <MapPin className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-base">Regional Procurement Breakdown (State & District)</h3>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-white/10 px-2.5 py-1 rounded-lg">
              {geoBreakdown.length} Regional Units
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {geoBreakdown.map((geo, idx) => (
              <div key={idx} className="bg-white/10 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-white text-sm">{geo.district}</p>
                    <p className="text-xs text-slate-400">{geo.state}</p>
                  </div>
                  <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-mono">
                    {geo.transactionCount} receipts
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-white/10 flex justify-between items-end">
                  <div>
                    <p className="text-xs text-slate-400">Total Intake</p>
                    <p className="text-base font-black text-white">{geo.totalQuantity.toLocaleString()} kg</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Total Value</p>
                    <p className="text-sm font-bold text-emerald-400">₹{geo.totalAmount.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Loader className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
            <p className="text-sm font-medium">Loading procurement ledger transactions...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600">
            <p className="font-semibold">{error}</p>
            <button
              onClick={fetchLedger}
              className="mt-3 px-4 py-2 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold hover:bg-rose-100 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-base">No Procurement Records Found</h3>
            <p className="text-sm mt-1 text-slate-400 max-w-sm mx-auto">
              {hasActiveFilters 
                ? 'No transactions match the selected dates, crop, depot, or search filters.' 
                : 'No procurement weighments have been certified yet in the system.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
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
                  <th className="py-4 px-6">Date & Token</th>
                  <th className="py-4 px-6">Farmer</th>
                  <th className="py-4 px-6">Crop & Quantity</th>
                  <th className="py-4 px-6">Rate & Amount</th>
                  <th className="py-4 px-6">Depot / Regional Location</th>
                  <th className="py-4 px-6">Payment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {filteredRecords.map((record) => {
                  const b = record.bookings;
                  const c = b?.procurement_centres;
                  const g = c?.geo_blocks;
                  const pay = record.payments?.[0];
                  const farmer = b?.users;

                  const dateFormatted = new Date(record.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });

                  return (
                    <tr key={record.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Date & Token */}
                      <td className="py-4 px-6">
                        <div>
                          <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-xs">
                            {b?.token || 'N/A'}
                          </span>
                          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {dateFormatted}
                          </p>
                        </div>
                      </td>

                      {/* Farmer */}
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-bold text-slate-900">{farmer?.name || 'Unnamed'}</p>
                          <p className="text-xs font-mono text-slate-400">{farmer?.mobile_number || 'N/A'}</p>
                        </div>
                      </td>

                      {/* Crop & Quantity */}
                      <td className="py-4 px-6">
                        <div>
                          <span className="font-bold text-slate-800 capitalize">{b?.product_name || 'Grain'}</span>
                          <p className="text-xs text-slate-500 mt-0.5">
                            <strong className="text-slate-900">{record.quantity_accepted.toLocaleString()} kg</strong> accepted
                          </p>
                          {record.quantity_rejected > 0 && (
                            <p className="text-[11px] text-rose-500">
                              ({record.quantity_rejected.toLocaleString()} kg rejected)
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Rate & Total Amount */}
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-bold text-slate-900">₹{record.total_amount.toLocaleString()}</p>
                          <p className="text-xs text-slate-400">@ ₹{record.rate_per_kg}/kg</p>
                        </div>
                      </td>

                      {/* Centre & Location */}
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-semibold text-slate-900 flex items-center gap-1">
                            <Building className="w-3.5 h-3.5 text-slate-400" />
                            {c?.name || 'Unassigned Depot'}
                          </p>
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {g?.district_name ? `${g.district_name}, ${g.state_name || ''}` : 'Location unmapped'}
                          </p>
                        </div>
                      </td>

                      {/* Payment Status */}
                      <td className="py-4 px-6">
                        {pay?.status === 'credited' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Credited
                          </span>
                        ) : pay?.status === 'initiated' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            <Send className="w-3.5 h-3.5 text-blue-600" />
                            Initiated
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Pending
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

        {/* Footer info */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-2">
          <span>Read-only system procurement ledger • Pulling directly from certified weighment records</span>
          <span>Showing {filteredRecords.length} transactions</span>
        </div>
      </div>
    </div>
  );
};

export default ProcurementLedger;
