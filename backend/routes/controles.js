// backend/routes/controles.js
import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';

const router = express.Router();

// Helper pour calculer le statut métier
function getComputedStatus(statut, dateControleStr) {
  if (statut === 'done') return 'done';
  if (statut === 'missed') return 'missed';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dateControle = new Date(dateControleStr);
  dateControle.setHours(0, 0, 0, 0);

  const diffTime = dateControle.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'missed';
  if (diffDays <= 7) return 'urgent';
  return 'pending';
}

// GET /api/controles?logigramme_id=xxx
router.get('/', async (req, res) => {
  const { logigramme_id } = req.query;
  
  if (!logigramme_id) {
    return res.status(400).json({ error: 'logigramme_id est requis' });
  }

  try {
    console.log(`[Controles] Fetching for logigramme: ${logigramme_id}`);
    
    const { data, error } = await supabaseAdmin
      .from('controles')
      .select(`
        *,
        unite:unites_formation (
          id, 
          nom, 
          vhg,
          logigramme_id
        )
      `)
      .eq('logigramme_id', logigramme_id)
      .order('date_controle', { ascending: true });

    if (error) {
      console.error('[Controles] Supabase error:', error);
      throw error;
    }

    // Enrichir avec le statut calculé
    const enrichedData = (data || []).map(item => ({
      ...item,
      computed_status: getComputedStatus(item.statut, item.date_controle)
    }));

    console.log(`[Controles] Found ${enrichedData.length} controls`);
    return res.json(enrichedData);
    
  } catch (err) {
    console.error('[Controles] GET error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/controles/all - Récupérer tous les contrôles (pour la vue globale)
router.get('/all', async (req, res) => {
  try {
    console.log('[Controles] Fetching ALL controls');
    
    const { data, error } = await supabaseAdmin
      .from('controles')
      .select(`
        *,
        unite:unites_formation (
          id, 
          nom, 
          vhg,
          logigramme_id
        ),
        logigramme:logigrammes (
          id,
          filiere_id,
          classe_id,
          academic_year_id,
          filiere:filieres (
            id,
            name,
            code,
            niveau
          ),
          classe:classes (
            id,
            label,
            annee
          ),
          academic_year:academic_years (
            id,
            label,
            start_date,
            end_date
          )
        )
      `)
      .order('date_controle', { ascending: true });

    if (error) {
      console.error('[Controles] Supabase error:', error);
      throw error;
    }

    // Enrichir avec le statut calculé
    const enrichedData = (data || []).map(item => ({
      ...item,
      computed_status: getComputedStatus(item.statut, item.date_controle),
      filiereName: item.logigramme?.filiere?.name || '',
      classeLabel: item.logigramme?.classe?.label || '',
      academicYear: item.logigramme?.academic_year?.label || ''
    }));

    console.log(`[Controles] Found ${enrichedData.length} total controls`);
    return res.json(enrichedData);
    
  } catch (err) {
    console.error('[Controles] GET all error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/controles
router.post('/', async (req, res) => {
  const { logigramme_id, unite_id, type, date_controle, label, statut } = req.body;
  
  console.log('[Controles] POST request:', { logigramme_id, unite_id, type, date_controle, label, statut });

  // Validation
  if (!logigramme_id) {
    return res.status(400).json({ error: 'logigramme_id est requis' });
  }
  if (!unite_id) {
    return res.status(400).json({ error: 'unite_id est requis' });
  }
  if (!type) {
    return res.status(400).json({ error: 'type est requis' });
  }
  if (!date_controle) {
    return res.status(400).json({ error: 'date_controle est requis' });
  }

  try {
    // Vérifier que l'unité appartient au logigramme
    const { data: uniteCheck, error: checkError } = await supabaseAdmin
      .from('unites_formation')
      .select('id, logigramme_id')
      .eq('id', unite_id)
      .single();

    if (checkError || !uniteCheck) {
      console.error('[Controles] Unite not found:', checkError);
      return res.status(400).json({ error: 'Unité non trouvée' });
    }

    if (uniteCheck.logigramme_id !== logigramme_id) {
      console.error('[Controles] Unite does not belong to logigramme');
      return res.status(400).json({ error: 'Cette unité n\'appartient pas à ce logigramme' });
    }

    const { data, error } = await supabaseAdmin
      .from('controles')
      .insert([{ 
        logigramme_id, 
        unite_id, 
        type, 
        date_controle, 
        label: label || null,
        statut: statut || 'pending'
      }])
      .select(`
        *,
        unite:unites_formation (
          id, 
          nom,
          vhg
        ),
        logigramme:logigrammes (
          id,
          filiere_id,
          classe_id,
          filiere:filieres (id, name),
          classe:classes (id, label)
        )
      `)
      .single();

    if (error) {
      console.error('[Controles] Insert error:', error);
      throw error;
    }

    console.log('[Controles] Created control:', data.id);
    return res.status(201).json({
      ...data,
      computed_status: getComputedStatus(data.statut, data.date_controle),
      filiereName: data.logigramme?.filiere?.name || '',
      classeLabel: data.logigramme?.classe?.label || ''
    });
    
  } catch (err) {
    console.error('[Controles] POST error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/controles/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { date_controle, label, statut, type, unite_id } = req.body;

  console.log('[Controles] PUT request:', { id, date_controle, label, statut, type, unite_id });

  try {
    // Vérifier que le contrôle existe
    const { data: existing, error: findError } = await supabaseAdmin
      .from('controles')
      .select('id, logigramme_id')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      console.error('[Controles] Control not found:', findError);
      return res.status(404).json({ error: 'Contrôle non trouvé' });
    }

    // Si unite_id est fourni, vérifier qu'elle appartient au logigramme
    if (unite_id) {
      const { data: uniteCheck, error: checkError } = await supabaseAdmin
        .from('unites_formation')
        .select('id, logigramme_id')
        .eq('id', unite_id)
        .single();

      if (checkError || !uniteCheck) {
        console.error('[Controles] Unite not found:', checkError);
        return res.status(400).json({ error: 'Unité non trouvée' });
      }

      if (uniteCheck.logigramme_id !== existing.logigramme_id) {
        console.error('[Controles] Unite does not belong to logigramme');
        return res.status(400).json({ error: 'Cette unité n\'appartient pas à ce logigramme' });
      }
    }

    const updateData = {};
    if (date_controle !== undefined) updateData.date_controle = date_controle;
    if (label !== undefined) updateData.label = label;
    if (statut !== undefined) updateData.statut = statut;
    if (type !== undefined) updateData.type = type;
    if (unite_id !== undefined) updateData.unite_id = unite_id;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('controles')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        unite:unites_formation (
          id, 
          nom,
          vhg
        ),
        logigramme:logigrammes (
          id,
          filiere_id,
          classe_id,
          filiere:filieres (id, name),
          classe:classes (id, label)
        )
      `)
      .single();

    if (error) {
      console.error('[Controles] Update error:', error);
      throw error;
    }

    console.log('[Controles] Updated control:', id);
    return res.json({
      ...data,
      computed_status: getComputedStatus(data.statut, data.date_controle),
      filiereName: data.logigramme?.filiere?.name || '',
      classeLabel: data.logigramme?.classe?.label || ''
    });
    
  } catch (err) {
    console.error('[Controles] PUT error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/controles/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  console.log('[Controles] DELETE request:', id);

  try {
    const { error } = await supabaseAdmin
      .from('controles')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Controles] Delete error:', error);
      throw error;
    }

    console.log('[Controles] Deleted control:', id);
    return res.json({ success: true });
    
  } catch (err) {
    console.error('[Controles] DELETE error:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;