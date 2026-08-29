const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://ljfqbrdaznbmzgymfywp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZnFicmRhem5ibXpneW1meXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3NTU3MjksImV4cCI6MjEwMzMzMTcyOX0.6gY5eUEffdDSzbzC5BxiMCSH4gtBIruTb0ZQ9B-1hCA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCentres() {
  const { data, error } = await supabase
    .from('procurement_centres')
    .select('*');
  
  if (error) {
    console.error("Error fetching centres:", error);
  } else {
    console.log("Centres found:", data.map(c => `${c.name} (Block: ${c.block_code})`));
  }
}

checkCentres();
