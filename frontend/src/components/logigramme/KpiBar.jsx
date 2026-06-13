import { useState, useEffect } from 'react';
import { useLogigrammeContext } from '@/contexts/logigramme-context';
import { apiRequest } from '@/lib/api';
import { Loader2 } from 'lucide-react';

export function KpiBar() {
  const { filters } = useLogigrammeContext();
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchKpis() {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (filters.year_id) query.append('year_id', filters.year_id);
        if (filters.filiere_id) query.append('filiere_id', filters.filiere_id);
        if (filters.formateur_id) query.append('formateur_id', filters.formateur_id);

        const data = await apiRequest(`/api/logigramme/kpis?${query.toString()}`);
        setKpis(data);
      } catch (err) {
        console.error('Failed to fetch KPIs:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchKpis();
  }, [filters.year_id, filters.filiere_id, filters.formateur_id]);

  if (!kpis && loading) {
    return (
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-2xl border border-border bg-card animate-pulse" />
        ))}
      </div>
    );
  }

  if (!kpis) return null;

  const stats = [
    { label: "Programmes", value: kpis.total_programmes },
    { label: "Heures totales", value: kpis.total_heures.toLocaleString() + 'h' },
    { label: "Formateurs", value: kpis.total_formateurs },
    { label: "Taux de réalisation global", value: Math.round(kpis.taux_global * 100) + '%' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => (
        <div key={stat.label} className="p-4 rounded-2xl border border-border bg-card shadow-sm medical-glass flex flex-col justify-center items-center text-center">
          <p className="text-2xl font-black text-primary tracking-tight">{stat.value}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mt-1">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
