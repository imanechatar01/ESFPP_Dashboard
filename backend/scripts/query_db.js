import { supabaseAdmin } from '../lib/supabase.js';

async function inspectUniteCells() {
  try {
    const logigrammeId = '89f0f4c9-dc3d-41f0-93e3-b605cdfc198c';
    const { data: unites, error } = await supabaseAdmin
      .from('unites_formation')
      .select(`
        id,
        nom,
        cells:week_cells (
          id,
          semaine,
          cell_type,
          heures,
          completion:completions (status)
        )
      `)
      .eq('logigramme_id', logigrammeId)
      .eq('id', '5729bd46-d8cf-4b95-bedf-d4e5b80af387'); // Let's inspect the specific unite

    if (error) {
      console.error(error);
      return;
    }

    console.log('Unite cells count:', unites?.[0]?.cells?.length);
    console.log('Sample cell with completion:', unites?.[0]?.cells?.find(c => c.id === 'c51ad1c2-413f-47cb-8970-eeffb980a93b'));
  } catch (err) {
    console.error(err);
  }
}

inspectUniteCells();
