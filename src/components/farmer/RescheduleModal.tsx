import React, { useState, useEffect } from 'react';
import { X, Calendar, Loader, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useTranslation } from 'react-i18next';

interface BookingDate {
  id: string;
  date: string;
  capacity: number;
  booked_count: number;
  status: 'open' | 'full' | 'closed';
}

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  onSuccess: () => void;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  isOpen,
  onClose,
  booking,
  onSuccess
}) => {
  const [loadingDates, setLoadingDates] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [dates, setDates] = useState<BookingDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successToken, setSuccessToken] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (isOpen && booking?.centre_id) {
      fetchDates();
    } else {
      setDates([]);
      setSelectedDate(null);
      setError(null);
      setSuccessToken(null);
    }
  }, [isOpen, booking]);

  const fetchDates = async () => {
    try {
      setLoadingDates(true);
      setError(null);
      const todayStr = new Date().toISOString().split('T')[0];
      
      const { data, error: dateErr } = await supabase
        .from('booking_dates')
        .select('*')
        .eq('centre_id', booking.centre_id)
        .gte('date', todayStr)
        .neq('status', 'closed')
        .order('date', { ascending: true });

      if (dateErr) throw dateErr;
      
      const availableDates = (data || []).filter(d => d.id !== booking.booking_date_id);
      setDates(availableDates);
    } catch (err: any) {
      setError(err.message || 'Failed to load available dates.');
    } finally {
      setLoadingDates(false);
    }
  };

  const handleReschedule = async () => {
    if (!selectedDate) return;
    
    try {
      setLoadingSubmit(true);
      setError(null);

      const { data, error: rpcErr } = await supabase.rpc('reschedule_farmer_booking', {
        p_old_booking_id: booking.id,
        p_new_booking_date_id: selectedDate
      });

      if (rpcErr) throw rpcErr;

      const result = data as any;
      if (result.success) {
        setSuccessToken(result.token);
      } else {
        throw new Error('Transaction failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reschedule. The slot may have filled up.');
    } finally {
      setLoadingSubmit(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative" role="dialog" aria-modal="true" aria-labelledby="reschedule-title">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 id="reschedule-title" className="text-xl font-bold text-slate-900">{t('reschedule.title')}</h2>
            <p className="text-sm text-slate-500 mt-1">{t('reschedule.subtitle', { crop: booking.product_name })}</p>
          </div>
          <button 
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successToken ? (
            <div className="text-center py-6 space-y-4">
              <div className="flex justify-center">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Rescheduled!</h3>
                <p className="text-slate-500 text-sm mt-2">Your new queue token is:</p>
                <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-3xl font-black text-slate-900">{successToken}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onSuccess();
                }}
                className="w-full mt-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all"
              >
                Return to Dashboard
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {loadingDates ? (
                <div className="flex justify-center py-8">
                  <Loader className="w-6 h-6 animate-spin text-emerald-600" />
                  <span className="ml-3 text-slate-500 text-sm font-semibold">{t('reschedule.loading_dates')}</span>
                </div>
              ) : dates.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">{t('reschedule.no_dates')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dates.map((d) => {
                    const isFull = d.status === 'full' || d.booked_count >= d.capacity;
                    const displayDate = new Date(d.date).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short'
                    });

                    return (
                      <button
                        key={d.id}
                        onClick={() => !isFull && setSelectedDate(d.id)}
                        disabled={isFull}
                        aria-label={`Select date ${displayDate}`}
                        className={`w-full p-4 rounded-xl text-left border flex justify-between items-center transition-all ${
                          isFull 
                            ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                            : selectedDate === d.id
                            ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <span className="font-bold text-slate-800">{displayDate}</span>
                          <span className="block text-xs text-slate-500 mt-1">
                            {t('booking.booked_fraction', { booked: d.booked_count, total: d.capacity })}
                          </span>
                        </div>
                        {isFull ? (
                          <span className="px-2.5 py-1 rounded text-[10px] font-extrabold uppercase bg-red-100 text-red-700">{t('booking.full')}</span>
                        ) : (
                          <span className="px-2.5 py-1 rounded text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-700">{t('booking.open')}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!successToken && (
          <div className="p-6 border-t border-slate-100 bg-white">
            <button
              onClick={handleReschedule}
              disabled={!selectedDate || loadingSubmit}
              aria-label={t('reschedule.confirm_reschedule')}
              className="w-full inline-flex justify-center items-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all"
            >
              {loadingSubmit ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {t('reschedule.confirm_reschedule')}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
