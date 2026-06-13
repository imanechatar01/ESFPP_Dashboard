import { supabaseAdmin } from '../lib/supabase.js';

async function seed() {
  console.log('Seeding academic year 2025-2026...');
  const { data, error } = await supabaseAdmin
    .from('academic_years')
    .upsert({ 
        label: '2025-2026', 
        start_date: '2025-09-01', 
        end_date: '2026-08-31', 
        is_current: true 
    }, { onConflict: 'label' })
    .select()
    .single();

  if (error) {
    console.error('Seed error:', error.message);
    process.exit(1);
  }
  console.log('Seed successful:', data.label);
}

seed();
