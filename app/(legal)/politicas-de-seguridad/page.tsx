"use client";

import { useRouter } from "next/navigation";
import { Brand } from "@/components/Brand";
function ChevronLeftIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
    );
}

export default function SecurityPoliciesPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-[var(--color-surface-sunken)]">
            <div className="max-w-4xl mx-auto py-12 px-6 sm:px-8">
                <div className="mb-8 flex items-center justify-between gap-4">
                    <button 
                        onClick={() => router.back()}
                        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary-default)] transition-colors cursor-pointer"
                    >
                        <ChevronLeftIcon className="w-4 h-4" />
                        Volver
                    </button>
                    <Brand
                        variant="logomarca"
                        alt="Logomarca Nexus"
                        className="h-6 w-auto object-contain opacity-90"
                    />
                </div>

                <div className="bg-[var(--color-surface-app)] rounded-2xl shadow-sm border border-[var(--color-border-subtle)] p-8 sm:p-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--color-text-primary)] mb-4">
                        Políticas de Seguridad y Calidad
                    </h1>
                    <p className="text-lg text-[var(--color-text-secondary)] mb-10">
                        Última actualización: Abril 2026
                    </p>

                    <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none space-y-8 text-[var(--color-text-secondary)]">
                        <section>
                            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">1. Compromiso con la Seguridad y el Estándar ISO/IEC 25010</h2>
                            <p>
                                En <strong>Nexus Inventory</strong>, garantizamos que nuestra plataforma SaaS opera bajo los más altos niveles de exigencia arquitectónica y metodológica, fundamentando nuestros procesos en el modelo de calidad de software <strong>ISO/IEC 25010</strong>. Nuestro objetivo es blindar las operaciones de gestión de inventarios y logística inter-bodegas mediante principios técnicos rigurosos.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">2. Gestión de la Calidad del Producto (ISO/IEC 25010)</h2>
                            <p className="mb-4">
                                Nuestra infraestructura ha sido evaluada y construida basándose en las métricas del estándar para ofrecer un servicio robusto:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>Seguridad:</strong> Implementamos controles de confidencialidad, integridad, no repudio, responsabilidad y autenticidad. Los datos en tránsito y en reposo se encuentran encriptados mediante protocolos AES-256 y TLS 1.3.</li>
                                <li><strong>Fiabilidad:</strong> Contamos con arquitecturas redundantes y clústeres tolerantes a fallos garantizando la disponibilidad de la plataforma incluso ante anomalías operativas.</li>
                                <li><strong>Eficiencia de Desempeño:</strong> Optimizamos la utilización de recursos y los tiempos de respuesta para asegurar transacciones en tiempo real durante la entrada y salida de mercancía.</li>
                                <li><strong>Mantenibilidad y Usabilidad:</strong> Nuestro código se encuentra modularizado bajo prácticas sólidas que permiten actualizaciones sin disrupción de servicio y una interfaz de usuario inclusiva, con menús de accesibilidad nativos.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">3. Acceso y Control de Perfiles</h2>
                            <p>
                                La utilización del sistema está regida por arquitecturas <strong>RBAC (Control de Acceso Basado en Roles)</strong>. Cada agente, desde los operarios, agentes comerciales (ventas) hasta supervisores de infraestructura operan sobre un modelo de mínimos privilegios. A ningún rol se le concederán permisos que excedan las autorizaciones predefinidas para su alcance de sistema.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">4. Privacidad y Soberanía de Datos</h2>
                            <p>
                                Los registros financieros, catalogación de infraestructura, listados de contratos y perfiles comerciales guardados en nuestra aplicación, se consideran altamente confidenciales. Usted retiene todos los derechos sobre la propiedad intelectual de sus datos y Nexus Inventory actuará exclusivamente bajo el rol de procesador y custodio de la información para fines analíticos operativos anónimos.
                            </p>
                        </section>

                        <section className="bg-[var(--color-surface-hover)] p-6 rounded-xl border border-[var(--color-border-subtle)] mt-12">
                            <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-3">5. Contacto Legal y de Datos Personales</h2>
                            <p className="text-[var(--color-text-primary)] font-medium text-base">
                                Para cualquier consulta legal o relacionada con datos personales, el usuario podrá contactar a Nexus Inventory mediante el siguiente correo electronico: <strong className="text-[var(--color-brand-strong)]">nexusgestionbodegas@gmail.com</strong>
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
