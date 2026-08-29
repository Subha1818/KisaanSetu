import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export const useLiveQueue = (centreId?: string, bookingDateId?: string) => {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = useCallback(async () => {
    if (!centreId || !bookingDateId) return;
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          product_name,
          quantity,
          token,
          status,
          farmer_id,
          users (
            name,
            mobile_number
          )
        `)
        .eq('centre_id', centreId)
        .eq('booking_date_id', bookingDateId);

      if (error) throw error;
      
      // Sort by token sequence number
      const sorted = (data || []).sort((a: any, b: any) => {
        const numA = parseInt(a.token.split('-')[1]) || 0;
        const numB = parseInt(b.token.split('-')[1]) || 0;
        return numA - numB;
      });
      
      setQueue(sorted);
    } catch (err) {
      console.error('Error fetching live queue:', err);
    } finally {
      setLoading(false);
    }
  }, [centreId, bookingDateId]);

  useEffect(() => {
    setLoading(true);
    fetchQueue();

    if (!centreId || !bookingDateId) return;

    const channelName = `live-queue-${centreId}-${bookingDateId}-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `centre_id=eq.${centreId}`, 
        },
        (payload) => {
          const row: any = payload.new || payload.old;
          if (row && row.booking_date_id === bookingDateId) {
            fetchQueue();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [centreId, bookingDateId, fetchQueue]);

  return { queue, loading, refetchQueue: fetchQueue };
};
