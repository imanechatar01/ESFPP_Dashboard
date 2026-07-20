import { useLogigrammeContext } from '@/contexts/logigramme-context';

export function KpiBar() {
  const { kpis, loadingKpis } = useLogigrammeContext();

  if (!kpis && loadingKpis) {
    return (
      <div className="grid grid-cols-4 gap-3 mb-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 rounded-xl border border-border bg-card animate-pulse" />
        ))}
      </div>
    );
  }

  if (!kpis) return null;

  const stats = [
    { label: "Programmes", value: kpis.total_programmes },
    { label: "Heures totales", value: kpis.total_heures.toLocaleString() + 'h' },
    { label: "Formateurs", value: kpis.total_formateurs },
    { label: "Taux global", value: Math.round(kpis.taux_global * 100) + '%' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
      {stats.map((stat) => (
        <div key={stat.label} className="p-2.5 rounded-xl border border-border bg-card shadow-sm medical-glass flex items-center gap-3">
          <p className="text-lg font-black text-primary tracking-tight leading-none">{stat.value}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 leading-tight">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
