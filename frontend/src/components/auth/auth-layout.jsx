import { HeartPulse } from "lucide-react"
import { BrandPanel } from "@/components/auth/brand-panel"

export function AuthLayout({ children }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2 bg-background">
      <BrandPanel />
      <section className="relative flex flex-col px-6 py-8 sm:px-10 overflow-hidden">
        {/* Subtle decorative background for the form area */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none [background-image:radial-gradient(var(--primary)_1px,transparent_1px)] [background-size:32px_32px]" aria-hidden="true" />
        
        <div className="relative z-10 flex items-center gap-3 lg:hidden mb-8">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <HeartPulse className="size-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight uppercase leading-none text-foreground">ESFPP</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">Mohammedia</span>
          </div>
        </div>

        <div className="relative z-10 flex flex-1 items-center justify-center py-10">
          {children}
        </div>

        <footer className="relative z-10 mt-auto pt-8 border-t border-border/50">
          <p className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
            &copy; {new Date().getFullYear()} ESFPP Mohammedia — Portail Académique
          </p>
        </footer>
      </section>
    </main>
  )
}

