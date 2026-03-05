import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export const metadata: Metadata = {
  title: "Nexus — Gestión de Bodegas y Control de Inventario",
  description: "Nexus es la plataforma SaaS integral para empresas que buscan automatizar, medir y escalar el rendimiento de sus almacenes y bodegas de distribución.",
};

// ---------------------------------------------------------------------------
// Íconos SVG reutilizables (Estilo Minimalista Flat)
// ---------------------------------------------------------------------------

function BoxIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  );
}

function LightningIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
    </svg>
  )
}


// ---------------------------------------------------------------------------
// Página Principal (Landing / Home)
// ---------------------------------------------------------------------------

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-brand-muted selection:text-brand-dark" style={{ background: "var(--color-surface-app)" }}>

      {/* 1. Header / Navegación */}
      <header className="sticky top-0 z-50 w-full border-b backdrop-blur-md" style={{ background: "var(--color-surface-app)", borderColor: "var(--color-border-subtle)" }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="Nexus Logo" className="h-8 w-8 object-contain" />
            <span className="font-bold text-xl tracking-tight" style={{ color: "var(--color-text-primary)" }}>Nexus</span>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="primary" size="sm" className="hidden sm:flex">
                Entrar
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">

        {/* 2. Hero Section (Portada principal) */}
        <section className="relative py-24 md:py-32 overflow-hidden flex flex-col items-center text-center px-6">
          {/* Elemento de fondo sutil usando los colores brand del CSS */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-30 pointer-events-none blur-3xl animate-in fade-in duration-1000"
            style={{ background: "radial-gradient(circle, var(--color-brand-muted) 0%, transparent 60%)" }} />

          <div className="relative z-10 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium mb-4"
              style={{ background: "var(--color-surface-base)", borderColor: "var(--color-border-default)", color: "var(--color-text-secondary)" }}>
              <span className="flex h-2 w-2 rounded-full relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "var(--color-brand-strong)" }}></span>
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "var(--color-brand-default)" }}></span>
              </span>
              SaaS Operativo v2.0 ya disponible
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight" style={{ color: "var(--color-text-primary)" }}>
              Controla tu inventario con <span style={{ color: "var(--color-text-brand)" }}>precisión absoluta.</span>
            </h1>

            <p className="text-xl md:text-2xl max-w-2xl mx-auto leading-relaxed" style={{ color: "var(--color-text-tertiary)" }}>
              Nexus es la plataforma definitiva para empresas que quieren automatizar sus almacenes, evitar pérdidas y escalar sus operaciones logísticas sin complicaciones.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/register" className="w-full sm:w-auto">
                <Button variant="primary" size="lg" className="w-full h-14 text-lg px-8">
                  Comenzar ahora
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 ml-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </Button>
              </Link>
              <Link href="#soluciones" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="w-full h-14 text-lg px-8">
                  Ver soluciones
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* 3. Logos o Barra de Confianza (Trust indicators) */}
        <section className="py-10 border-y" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-surface-sunken)" }}>
          <div className="max-w-7xl mx-auto px-6 text-center">
            <p className="text-sm font-medium uppercase tracking-widest mb-6" style={{ color: "var(--color-text-disabled)" }}>Poder operativo respaldado por tecnología moderna</p>
            <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-300">
              {/* Mock de logos de industrias */}
              <span className="text-xl font-bold font-serif" style={{ color: "var(--color-text-secondary)" }}>GLOBAL LOGISTICS</span>
              <span className="text-xl font-bold font-mono" style={{ color: "var(--color-text-secondary)" }}>TechStore Corp.</span>
              <span className="text-xl font-extrabold tracking-widest" style={{ color: "var(--color-text-secondary)" }}>AERO CARGO</span>
              <span className="text-xl font-bold italic" style={{ color: "var(--color-text-secondary)" }}>MedSupply</span>
            </div>
          </div>
        </section>

        {/* 4. Propuesta de Valor / Características Principales */}
        <section id="soluciones" className="py-24 px-6 max-w-7xl mx-auto w-full">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
              Todo lo que necesitas en un solo lugar
            </h2>
            <p className="text-lg" style={{ color: "var(--color-text-tertiary)" }}>
              Olvídate de las hojas de cálculo gigantes. Nuestra solución cloud te da visibilidad completa del ciclo de vida de tus productos.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Propuesta 1 */}
            <div className="p-8 rounded-3xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              style={{ background: "var(--color-surface-base)", borderColor: "var(--color-border-subtle)" }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: "var(--color-surface-hover)", color: "var(--color-text-brand)" }}>
                <BoxIcon className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-3" style={{ color: "var(--color-text-primary)" }}>Stock Inmediato</h3>
              <p className="leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                Conoce exactamente qué tienes, en qué pasillo está y cuándo debes ordenar más, todo sincronizado a través de escáneres o reportes en tiempo real.
              </p>
            </div>

            {/* Propuesta 2 */}
            <div className="p-8 rounded-3xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl relative overflow-hidden"
              style={{ background: "var(--color-sidebar-bg)", borderColor: "var(--color-border-default)" }}>

              <div className="absolute top-0 right-0 w-32 h-32 opacity-10 blur-xl" style={{ background: "var(--color-brand-strong)" }} />

              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: "var(--color-brand-strong)", color: "var(--color-text-inverse)" }}>
                <LightningIcon className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-3" style={{ color: "var(--color-text-inverse)" }}>Flujos Automatizados</h3>
              <p className="leading-relaxed" style={{ color: "var(--color-sidebar-text)" }}>
                Rutas de despacho y recepciones rápidas. Ahorra hasta el 40% del tiempo operativo del personal logístico.
              </p>
            </div>

            {/* Propuesta 3 */}
            <div className="p-8 rounded-3xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              style={{ background: "var(--color-surface-base)", borderColor: "var(--color-border-subtle)" }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: "var(--color-surface-hover)", color: "var(--color-text-brand)" }}>
                <ChartIcon className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-3" style={{ color: "var(--color-text-primary)" }}>Reportes Inteligentes</h3>
              <p className="leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                Toma decisiones basadas en datos. Descarga matrices o visualiza rotación, valor de stock y eficiencia por bodega a nivel gerencial.
              </p>
            </div>
          </div>
        </section>

        {/* 5. Cierre / CTA Final */}
        <section className="py-24 border-t mt-auto" style={{ borderColor: "var(--color-border-default)", background: "var(--color-surface-sunken)" }}>
          <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
            <img src="/logo.svg" alt="Nexus Decoración" className="h-20 w-20 mx-auto object-contain drop-shadow-lg scale-110 mb-6" />

            <h2 className="text-4xl md:text-5xl font-bold" style={{ color: "var(--color-text-primary)" }}>
              La organización del futuro.
            </h2>

            <p className="text-xl max-w-2xl mx-auto" style={{ color: "var(--color-text-tertiary)" }}>
              Únete a cientos de bodegas que ya dejaron atrás las fallas operativas. Ponemos en la nube el control total de tus centros de distribución.
            </p>

            <div className="pt-8">
              <Link href="/login">
                <Button variant="primary" size="lg" className="h-14 px-10 text-lg shadow-xl shadow-indigo-500/20">
                  Iniciar sesión en Nexus
                </Button>
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="py-8 border-t text-center text-sm" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-surface-app)", color: "var(--color-text-disabled)" }}>
        <p>© {new Date().getFullYear()} Nexus WMS (Warehouse Management System). Todos los derechos reservados.</p>
      </footer>

    </div>
  );
}
