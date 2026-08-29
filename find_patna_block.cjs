const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://ljfqbrdaznbmzgymfywp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZnFicmRhem5ibXpneW1meXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3NTU3MjksImV4cCI6MjEwMzMzMTcyOX0.6gY5eUEffdDSzbzC5BxiMCSH4gtBIruTb0ZQ9B-1hCA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function getBlock() {
  const { data, error } = await supabase
    .from('geo_blocks')
    .select('*')
    .ilike('district_name', '%PATNA%')
    .limit(1);
  
  if (error) {
    console.error(error);
  } else {
    console.log("Found real block:", data);
  }
}

getBlock();
