import { HeartPulse } from "lucide-react"
import { BrandPanel } from "@/components/auth/brand-panel"

export function AuthLayout({ children }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <BrandPanel />
      <section className="flex flex-col px-6 py-8 sm:px-10">
        <div className="flex items-center gap-2 lg:hidden">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HeartPulse className="size-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">École des Sciences Infirmières</span>
        </div>

        <div className="flex flex-1 items-center justify-center py-10">{children}</div>

        <p className="text-center text-xs text-muted-foreground">
          {"© "}
          {new Date().getFullYear()} École des Sciences Infirmières. Tous droits réservés.
        </p>
      </section>
    </main>
  )
}
