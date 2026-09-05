import React, { useEffect, useState } from 'react';
import { 
  Tag, 
  Plus, 
  Edit2, 
  Check, 
  X, 
  Calendar, 
  Loader, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw,
  Coins
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export interface MspRate {
  id: string;
  crop_name: string;
  rate_per_kg: number;
  effective_date: string;
  updated_at: string;
  updated_by?: string | null;
}

// Fallback baseline rates if table hasn't been migrated yet
const BASELINE_FALLBACK_RATES: MspRate[] = [
  { id: '1', crop_name: 'Wheat', rate_per_kg: 22.75, effective_date: '2026-04-01', updated_at: new Date().toISOString() },
  { id: '2', crop_name: 'Paddy', rate_per_kg: 21.83, effective_date: '2026-04-01', updated_at: new Date().toISOString() },
  { id: '3', crop_name: 'Maize', rate_per_kg: 20.90, effective_date: '2026-04-01', updated_at: new Date().toISOString() },
  { id: '4', crop_name: 'Mustard', rate_per_kg: 56.50, effective_date: '2026-04-01', updated_at: new Date().toISOString() },
  { id: '5', crop_name: 'Soybean', rate_per_kg: 46.00, effective_date: '2026-04-01', updated_at: new Date().toISOString() },
];

export const MspRatesManager: React.FC = () => {
  const [rates, setRates] = useState<MspRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [migrationNeeded, setMigrationNeeded] = useState(false);

  // Edit / Form state
  const [editingCropId, setEditingCropId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Add new crop state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCropName, setNewCropName] = useState('');
  const [newCropRate, setNewCropRate] = useState('');
  const [newCropDate, setNewCropDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchRates = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchErr } = await supabase
        .from('msp_rates')
        .select('*')
        .order('crop_name');

      if (fetchErr) {
        // Check if table does not exist
        if (fetchErr.message?.includes('does not exist') || fetchErr.code === '42P01') {
          setMigrationNeeded(true);
          setRates(BASELINE_FALLBACK_RATES);
        } else {
          throw fetchErr;
        }
      } else {
        setMigrationNeeded(false);
        setRates(data && data.length > 0 ? (data as MspRate[]) : BASELINE_FALLBACK_RATES);
      }
    } catch (err: any) {
      console.error('Error fetching MSP rates:', err);
      setError(err.message || 'Failed to load MSP rates.');
      setRates(BASELINE_FALLBACK_RATES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const handleStartEdit = (rate: MspRate) => {
    setEditingCropId(rate.id);
    setEditRate(rate.rate_per_kg.toString());
    setEditDate(rate.effective_date || new Date().toISOString().split('T')[0]);
    setError(null);
    setSuccessMsg(null);
  };

  const handleCancelEdit = () => {
    setEditingCropId(null);
    setEditRate('');
    setEditDate('');
  };

  const handleSaveEdit = async (cropId: string) => {
    const numericRate = parseFloat(editRate);
    if (isNaN(numericRate) || numericRate <= 0) {
      setError('Please enter a valid rate greater than 0.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);

      const { data: { session } } = await supabase.auth.getSession();

      const { error: updateErr } = await supabase
        .from('msp_rates')
        .update({
          rate_per_kg: numericRate,
          effective_date: editDate || new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
          updated_by: session?.user?.id || null
        })
        .eq('id', cropId);

      if (updateErr) throw updateErr;

      setSuccessMsg('MSP rate updated successfully.');
      setEditingCropId(null);
      await fetchRates();
    } catch (err: any) {
      console.error('Error updating MSP rate:', err);
      setError(err.message || 'Failed to update MSP rate.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCrop = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newCropName.trim();
    const numericRate = parseFloat(newCropRate);

    if (!cleanName) {
      setError('Please enter a crop name.');
      return;
    }

    if (isNaN(numericRate) || numericRate <= 0) {
      setError('Please enter a valid rate per kg greater than 0.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);

      const { data: { session } } = await supabase.auth.getSession();

      const { error: insertErr } = await supabase
        .from('msp_rates')
        .insert({
          crop_name: cleanName,
          rate_per_kg: numericRate,
          effective_date: newCropDate || new Date().toISOString().split('T')[0],
          updated_by: session?.user?.id || null
        });

      if (insertErr) throw insertErr;

      setSuccessMsg(`MSP rate for ${cleanName} added successfully.`);
      setShowAddForm(false);
      setNewCropName('');
      setNewCropRate('');
      setNewCropDate(new Date().toISOString().split('T')[0]);
      await fetchRates();
    } catch (err: any) {
      console.error('Error creating crop MSP rate:', err);
      setError(err.message || 'Failed to add crop MSP rate.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notice Banner if migration needed */}
      {migrationNeeded && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-900 text-sm">Table Setup Recommended</h4>
            <p className="text-xs text-amber-800 mt-1">
              Table <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">public.msp_rates</code> is not yet created in your Supabase project. Displaying default baseline prices. Run <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">supabase/migration_019_msp_rates.sql</code> in your Supabase SQL Editor to enable persistent admin editing.
            </p>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-800 text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-800 text-sm font-semibold">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Actions Bar */}
      <div className="bg-white rounded-2xl border border-slate-300 p-6 shadow-sm shadow-slate-900/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Government Minimum Support Prices (MSP)</h2>
              <p className="text-xs text-slate-500">Official statutory baseline rates applied across certified procurement receipts.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Crop MSP
            </button>
          )}

          <button
            onClick={fetchRates}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            title="Refresh MSP rates"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Add New Crop Form Drawer / Card */}
      {showAddForm && (
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-400" />
              Set MSP Rate for New Crop Variety
            </h3>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreateCrop} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Crop Name</label>
              <input
                type="text"
                placeholder="e.g. Barley, Cotton"
                value={newCropName}
                onChange={(e) => setNewCropName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Rate per kg (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 24.50"
                value={newCropRate}
                onChange={(e) => setNewCropRate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Effective Date</label>
              <input
                type="date"
                value={newCropDate}
                onChange={(e) => setNewCropDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors"
              >
                {saving ? 'Saving...' : 'Save MSP Rate'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rates Grid / Cards */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 flex flex-col items-center justify-center text-slate-500 shadow-sm">
          <Loader className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
          <p className="text-sm font-medium">Loading statutory MSP rates...</p>
        </div>
      ) : rates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm">
          <Coins className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-base">No MSP Rates Configured</h3>
          <p className="text-sm text-slate-400 mt-1">Add your first crop support price using the button above.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm shadow-slate-900/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-6">Crop Name</th>
                  <th className="py-3 px-6">Rate (₹/quintal)</th>
                  <th className="py-3 px-6">Rate (₹/kg)</th>
                  <th className="py-3 px-6">Effective Date</th>
                  <th className="py-3 px-6">Last Updated</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rates.map((rate) => {
                  const isEditing = editingCropId === rate.id;
                  const ratePerQuintal = Math.round(Number(rate.rate_per_kg) * 100);

                  return (
                    <tr key={rate.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-6 align-middle">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 capitalize text-sm">{rate.crop_name}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mt-0.5">Statutory MSP</span>
                        </div>
                      </td>
                      
                      {isEditing ? (
                        <td colSpan={4} className="py-3 px-6 bg-slate-50">
                          <div className="flex items-center gap-4 max-w-lg">
                            <div className="flex-1">
                              <label className="sr-only">Rate per kg</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">₹</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  value={editRate}
                                  onChange={(e) => setEditRate(e.target.value)}
                                  className="w-full pl-7 pr-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold bg-white"
                                  placeholder="Rate/kg"
                                  autoFocus
                                />
                              </div>
                              <span className="text-[10px] font-semibold text-slate-500 mt-1 block">
                                = ₹{(parseFloat(editRate || '0') * 100).toLocaleString()} / quintal
                              </span>
                            </div>
                            <div className="flex-1">
                              <label className="sr-only">Effective Date</label>
                              <input
                                type="date"
                                value={editDate}
                                onChange={(e) => setEditDate(e.target.value)}
                                className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                              />
                            </div>
                          </div>
                        </td>
                      ) : (
                        <>
                          <td className="py-3 px-6 align-middle">
                            <span className="text-sm font-black text-slate-900">₹{ratePerQuintal.toLocaleString()}</span>
                          </td>
                          <td className="py-3 px-6 align-middle">
                            <span className="text-sm font-bold text-emerald-700">₹{Number(rate.rate_per_kg).toFixed(2)}</span>
                          </td>
                          <td className="py-3 px-6 align-middle">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {rate.effective_date ? new Date(rate.effective_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Immediate'}
                            </div>
                          </td>
                          <td className="py-3 px-6 align-middle text-xs font-medium text-slate-400">
                            {new Date(rate.updated_at).toLocaleDateString()}
                          </td>
                        </>
                      )}
                      
                      <td className="py-3 px-6 align-middle text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSaveEdit(rate.id)}
                              disabled={saving}
                              className="p-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg transition-colors shadow-sm"
                              title="Save Changes"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(rate)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex"
                            title={`Edit MSP rate for ${rate.crop_name}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MspRatesManager;
