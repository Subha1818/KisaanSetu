const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://ljfqbrdaznbmzgymfywp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZnFicmRhem5ibXpneW1meXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3NTU3MjksImV4cCI6MjEwMzMzMTcyOX0.6gY5eUEffdDSzbzC5BxiMCSH4gtBIruTb0ZQ9B-1hCA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from('geo_blocks')
    .select('block_code, block_name, district_code, district_name, state_code, state_name')
    .eq('block_name', 'Rampur Block');
  
  if (error) {
    console.error(error);
  } else {
    console.log("Found Rampur Block:", data);
  }
}

test();
