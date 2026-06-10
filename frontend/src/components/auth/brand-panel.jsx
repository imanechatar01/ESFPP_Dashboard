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
        alt="Étudiants en soins infirmiers en formation dans un laboratoire médical moderne"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-primary/75" aria-hidden="true" />

      <div className="relative z-10 flex items-center gap-2 p-10 text-primary-foreground">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary-foreground/15 ring-1 ring-primary-foreground/25">
          <HeartPulse className="size-5" />
        </div>
        <span className="text-lg font-semibold tracking-tight">École des Sciences Infirmières</span>
      </div>

      <div className="relative z-10 max-w-md p-10 text-primary-foreground">
        <h2 className="text-balance text-3xl font-semibold leading-tight tracking-tight">
          Votre parcours en soins infirmiers, réuni en un seul espace.
        </h2>
        <p className="mt-4 text-pretty leading-relaxed text-primary-foreground/80">
          Accédez à vos cours, vos évaluations, vos plannings de stage et vos annonces. Un espace
          dédié aux étudiants et à l&apos;administration.
        </p>

        <ul className="mt-8 flex flex-wrap gap-3">
          {stats.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1.5 text-sm font-medium ring-1 ring-primary-foreground/20"
            >
              <Icon className="size-4" />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
