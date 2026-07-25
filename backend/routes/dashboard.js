import express from "express";
import { supabaseAdmin } from "../lib/supabase.js";

const router = express.Router();

router.get("/stats", async (req, res) => {
  try {
    // Get profiles for active accounts and invitations
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("status, created_at, first_name, last_name");
      
    if (profilesError) throw profilesError;

    const activeAccounts = profiles.filter(p => p.status === 'active').length;
    const invitations = profiles.filter(p => p.status === 'invited').length;

    // Get logigrammes for "Stages planifiés"
    const { count: stagesCount, error: stagesError } = await supabaseAdmin
      .from("logigrammes")
      .select("*", { count: 'exact', head: true });
      
    if (stagesError && stagesError.code !== '42P01') {
        console.error(stagesError);
    }

    // Get recent activity (e.g. recent profiles created/updated)
    const recentActivity = profiles
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 4)
      .map(p => ({
        event: p.status === 'invited' ? "Invitation envoyée" : "Profil actif",
        user: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Utilisateur',
        time: new Date(p.created_at).toLocaleDateString(),
        type: p.status === 'invited' ? 'invite' : 'active'
      }));

    res.json({
      activeAccounts,
      invitations,
      stages: stagesCount || 0,
      completionRate: "N/A",
      recentActivity
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
