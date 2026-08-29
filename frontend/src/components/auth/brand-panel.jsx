import { HeartPulse, Stethoscope, BookOpenCheck, ShieldCheck } from "lucide-react"

const stats = [
  { icon: Stethoscope, label: "Formation clinique" },
  { icon: BookOpenCheck, label: "Cours & examens" },
  { icon: ShieldCheck, label: "Suivi des stages" },
]

export function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between" aria-label="Présentation ESFPP">
      {/* Background image */}
      <img
        src="/nursing.png"
        alt="Étudiants en soins infirmiers en formation à l'ESFPP"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Multi-stop gradient for richer depth */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/75 to-secondary/50"
        aria-hidden="true"
      />
      {/* Diagonal stripe pattern for texture */}
      <div
        className="absolute inset-0 opacity-[0.06] [background-image:repeating-linear-gradient(45deg,var(--color-primary-foreground)_0,var(--color-primary-foreground)_1px,transparent_0,transparent_50%)] [background-size:16px_16px]"
        aria-hidden="true"
      />

      {/* Logo / top branding */}
      <div className="relative z-10 flex items-center gap-3 p-10 text-primary-foreground">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary-foreground/10 backdrop-blur-sm ring-1 ring-primary-foreground/25 shadow-lg">
          <HeartPulse className="size-6 text-accent" />
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-black tracking-tight uppercase leading-none">ESFPP</span>
          <span className="text-[11px] font-semibold opacity-75 uppercase tracking-[0.25em] mt-0.5">Mohammedia</span>
        </div>
      </div>

      {/* Hero text */}
      <div className="relative z-10 max-w-md p-10 text-primary-foreground">
        <h2 className="text-balance text-[2.25rem] font-black leading-tight tracking-tight">
          L'excellence en formation paramédicale.
        </h2>
        <p className="mt-4 text-pretty text-base leading-relaxed text-primary-foreground/80">
          Bienvenue sur le dashboard officiel de l'ESFPP. Accédez à vos outils pédagogiques et administrez votre parcours en toute simplicité.
        </p>

        <ul className="mt-10 flex flex-wrap gap-2.5" aria-label="Fonctionnalités principales">
          {stats.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex items-center gap-2 rounded-full bg-primary-foreground/10 backdrop-blur-md px-4 py-2 text-sm font-semibold ring-1 ring-primary-foreground/20 transition-colors duration-150 hover:bg-primary-foreground/20"
            >
              <Icon className="size-4 text-accent shrink-0" aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
      </div>

      {/* Footer */}
      <div className="relative z-10 p-10 mt-auto">
        <p className="text-xs font-semibold text-primary-foreground/40 uppercase tracking-[0.2em]">
          ESFPP Dashboard &copy; {new Date().getFullYear()}
        </p>
      </div>
    </aside>
  )
}
