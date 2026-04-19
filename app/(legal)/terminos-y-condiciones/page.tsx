"use client";

import Link from "next/link";
function ChevronLeftIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
    );
}

export default function TermsAndConditionsPage() {
    return (
        <div className="min-h-screen bg-[var(--color-surface-sunken)]">
            <div className="max-w-4xl mx-auto py-12 px-6 sm:px-8">
                <div className="mb-8 block">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary-default)] transition-colors">
                        <ChevronLeftIcon className="w-4 h-4" />
                        Volver al inicio
                    </Link>
                </div>

                <div className="bg-[var(--color-surface-app)] rounded-2xl shadow-sm border border-[var(--color-border-subtle)] p-8 sm:p-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--color-text-primary)] mb-4">
                        Términos y Condiciones Generales
                    </h1>
                    <p className="text-lg text-[var(--color-text-secondary)] mb-10">
                        Última actualización: Abril 2026
                    </p>

                    <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none space-y-8 text-[var(--color-text-secondary)]">
                        <section>
                            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">1. Aceptación del Acuerdo</h2>
                            <p>
                                Al acceder o utilizar los servicios de gestión de bodegas provistos por <strong>Nexus Inventory</strong> (en adelante, "la Plataforma"), usted acepta estar estrictamente vinculado por estos Términos y Condiciones. Este acuerdo regula su acceso al ecosistema de análisis de stock, distribución de infraestructura (sectores y espacios) y perfilamiento comercial. Si usted representa a una persona jurídica, garantiza tener las facultades vinculantes para aceptar estos términos en su nombre.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">2. Licencia de Uso (SaaS)</h2>
                            <p>
                                Nexus Inventory es un Software como Servicio. Concedemos a su organización una licencia limitada, no exclusiva, intransferible y revocable para utilizar nuestras interfaces, tableros informáticos y API con el único propósito de gestionar operaciones logísticas legítimas y autorizadas por el titular de la bodega matriz. No está permitido:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li>Realizar ingeniería inversa, descompilación o extracción del código fuente de la Plataforma.</li>
                                <li>Subarrendar, vender o explotar económicamente de forma directa la arquitectura de Nexus a terceros, a menos que existan contratos de asociación explícitos (ej. agentes comerciales B2B o partners logísticos integrados).</li>
                                <li>Utilizar la infraestructura para almacenar datos ilegales o maliciosos.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">3. Niveles de Servicio y Modificaciones (SLA)</h2>
                            <p>
                                Nexus hará un esfuerzo comercial razonable para que el Servicio esté disponible las 24 horas del día, los 7 días de la semana (uptime de 99.9%). Nos reservamos el derecho de interrumpir, modificar o retirar secciones de la plataforma temporalmente para ejecutar mantenimientos, liberando notificaciones visuales sobre actualizaciones en su panel (Dashboard) dentro de horarios de baja congestión (Maintenance Status). Nexus no asume responsabilidad frente a paradas derivadas de caso fortuito o fuerza mayor.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">4. Responsabilidades sobre Inventario Contractual</h2>
                            <p>
                                Nuestra herramienta provee medios para rastrear el contenido de almacenaje mediante ubicaciones y contratos digitales. Nexus no es un almacén físico ni un agente de seguros logísticos. Todas las validaciones de las condiciones de la mercancía, manejo de refrigeración (cuando aplique a "control de temperatura") u otros servicios vinculados a las cajas, estibas u órdenes de entrada quedan bajo la estricta responsabilidad del operador / bodega física. 
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">5. Propiedad Intelectual e Identidad Corporativa</h2>
                            <p>
                                Todos los logotipos, iconos interactivos, paletas visuales, menús de accesibilidad inclusivos diseñados e interfaces pertenecientes a Nexus Inventory son de propiedad exclusiva nuestra, protegidos por leyes de diseño y derechos de autor subyacentes. El acceso a nuestra interfaz gráfica (GUI) no otorga autorización de copia visual ni emulación sin consentimiento escrito.
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
