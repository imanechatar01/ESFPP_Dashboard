import { HeartPulse, Stethoscope, BookOpenCheck, ShieldCheck } from "lucide-react"

const stats = [
  { icon: Stethoscope, label: "Formation clinique" },
  { icon: BookOpenCheck, label: "Cours & examens" },
  { icon: ShieldCheck, label: "Suivi des stages" },
]

export function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between">
      <img
        src="/nursing.png"
        alt="Étudiants en soins infirmiers en formation à l'ESFPP"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Primary brand overlay with a subtle gradient for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/80 to-primary/60" aria-hidden="true" />
      
      {/* Decorative medical grid pattern */}
      <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(var(--primary-foreground)_1px,transparent_1px)] [background-size:20px_20px]" aria-hidden="true" />

      <div className="relative z-10 flex items-center gap-3 p-10 text-primary-foreground">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary-foreground/15 backdrop-blur-sm ring-1 ring-primary-foreground/30 shadow-lg">
          <HeartPulse className="size-6 text-accent" />
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-bold tracking-tight uppercase leading-none">ESFPP</span>
          <span className="text-xs font-medium opacity-80 uppercase tracking-widest mt-0.5">Mohammedia</span>
        </div>
      </div>

      <div className="relative z-10 max-w-md p-10 text-primary-foreground">
        <h2 className="text-balance text-4xl font-bold leading-tight tracking-tight">
          L'excellence en formation paramédicale.
        </h2>
        <p className="mt-4 text-pretty text-lg leading-relaxed text-primary-foreground/85">
          Bienvenue sur le dashboard officiel de l'ESFPP. Accédez à vos outils pédagogiques et administrez votre parcours en toute simplicité.
        </p>

        <ul className="mt-10 flex flex-wrap gap-3">
          {stats.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex items-center gap-2.5 rounded-full bg-white/10 backdrop-blur-md px-4 py-2 text-sm font-semibold ring-1 ring-white/20 transition-all hover:bg-white/20"
            >
              <Icon className="size-4 text-accent" />
              {label}
            </li>
          ))}
        </ul>
      </div>
      
      {/* Subtle branding footer */}
      <div className="relative z-10 p-10 mt-auto">
        <p className="text-xs font-medium text-primary-foreground/50 uppercase tracking-[0.2em]">
          ESFPP Dashboard &copy; {new Date().getFullYear()}
        </p>
      </div>
    </aside>
  )
}

