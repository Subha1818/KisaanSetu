import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useCascadingGeo() {
  const [statesList, setStatesList] = useState<{ state_code: number; state_name: string }[]>([]);
  const [districtsList, setDistrictsList] = useState<{ district_code: number; district_name: string; state_code: number }[]>([]);
  const [blocksList, setBlocksList] = useState<{ block_code: number; block_name: string }[]>([]);
  
  const [selectedStateCode, setSelectedStateCode] = useState('');
  const [selectedDistrictCode, setSelectedDistrictCode] = useState('');
  const [selectedBlockCode, setSelectedBlockCode] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch states at mount
  useEffect(() => {
    const fetchStates = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('distinct_states')
          .select('*')
          .order('state_name', { ascending: true });

        if (error) throw new Error(error.message);
        setStatesList(data || []);
      } catch (err: any) {
        console.error('Error fetching states:', err);
        setError(err.message || 'Failed to load states.');
      } finally {
        setLoading(false);
      }
    };
    fetchStates();
  }, []);

  // Fetch districts when state selected
  useEffect(() => {
    const fetchDistricts = async () => {
      if (!selectedStateCode) {
        setDistrictsList([]);
        setBlocksList([]);
        setSelectedDistrictCode('');
        setSelectedBlockCode('');
        return;
      }
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('distinct_districts')
          .select('*')
          .eq('state_code', parseInt(selectedStateCode))
          .order('district_name', { ascending: true });
        
        if (error) throw error;
        setDistrictsList(data || []);
        
        // Reset dependent fields
        setBlocksList([]);
        setSelectedDistrictCode('');
        setSelectedBlockCode('');
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDistricts();
  }, [selectedStateCode]);

  // Fetch blocks when district selected
  useEffect(() => {
    const fetchBlocks = async () => {
      if (!selectedDistrictCode) {
        setBlocksList([]);
        setSelectedBlockCode('');
        return;
      }
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('geo_blocks')
          .select('block_code, block_name')
          .eq('district_code', parseInt(selectedDistrictCode))
          .order('block_name', { ascending: true });
        
        if (error) throw error;
        setBlocksList(data || []);
        
        // Reset dependent fields
        setSelectedBlockCode('');
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchBlocks();
  }, [selectedDistrictCode]);

  return {
    statesList,
    districtsList,
    blocksList,
    selectedStateCode,
    setSelectedStateCode,
    selectedDistrictCode,
    setSelectedDistrictCode,
    selectedBlockCode,
    setSelectedBlockCode,
    loading,
    error
  };
}
