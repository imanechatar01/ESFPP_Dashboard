import { supabaseAdmin } from '../lib/supabase.js';

async function inspectUniteCells() {
  try {
    const { data: completions, error } = await supabaseAdmin
      .from('completions')
      .select('*')
      .limit(10);

    if (error) {
      console.error(error);
      return;
    }

    console.log('Completions:', completions);
  } catch (err) {
    console.error(err);
  }
}

inspectUniteCells();
