# Alcance UX — Operador de bodega (Fase 0)

Documento de **criterios, inventario de pantallas y checklist de QA** para las mejoras de inicio, navegación y honestidad en la UI del rol `WAREHOUSE_OPERATOR`. Los contratos HTTP de referencia están en [api-bodega-supervisor-operador.md](./api-bodega-supervisor-operador.md). La taxonomía **Real / Demo / Mixto** es la misma que en [supervisor-ui-scope.md](./supervisor-ui-scope.md) §2.

---

## 1. Audiencia y comportamiento del shell

| Perfil | Comportamiento en el cliente (estado actual) |
|--------|-----------------------------------------------|
| Solo `WAREHOUSE_OPERATOR` | `/dashboard` renderiza `UserDashboard`. Menú lateral: grupo **BODEGA** (7 ítems) si el proceso `warehouseStructure` es visible para el usuario. |
| `WAREHOUSE_SUPERVISOR` + `WAREHOUSE_OPERATOR` | `/dashboard` prioriza `SupervisorDashboard` (ver `app/(dashboard)/dashboard/page.tsx`). El operador accede a rutas `/dashboard/operador/*` y compartidas vía menú de supervisor (grupos «OPERACIÓN EN PISO», etc.). Las mejoras de **inicio operador puro** no cambian ese caso hasta decisión de producto. |

---

## 2. Principios de copy y datos

| Principio | Aplicación |
|-----------|------------|
| Lenguaje de negocio en producción | Evitar mostrar paths HTTP (`GET /api/...`) como título o label principal; reservar detalle técnico a `appEnv.isDevelopment` o bloques colapsables. |
| IDs numéricos explícitos | `productId`, `storageSpaceId`, `warehouseId`, etc. siguen siendo el contrato actual; las mejoras de UX **no sustituyen** selectores en cascada hasta una fase dedicada (infra + permisos). |
| Errores reales del API | 401/403/404/5xx son **Real (API)**; la UI debe explicar el bloqueo o reintento sin etiquetar como demo. |
| Demo visible | Pantallas sin persistencia acordada llevan badge o banner **Demo** (recepción formal multi-paso). |

---

## 3. Inventario de pantallas — operador

Rutas habituales del rol (mismo orden que el menú actual en `app/(dashboard)/layout.tsx`, rama `WAREHOUSE_OPERATOR`).

| Ruta web | Vista (módulo) | Clasificación | Endpoints / datos hoy |
|----------|----------------|---------------|------------------------|
| `/dashboard` | `UserDashboard` | **Mixto** | Sin llamadas a inventario en el inicio; CTA a estructura (`/dashboard/infrastructure`). Copy actual centrado en “consulta estructura” vs tareas de piso (gap de producto documentado en plan Fase 1). |
| `/dashboard/operador/recepcion-mercancia` | `MerchandiseReceptionView` | **Demo** | Formulario por pasos **sin** `operatorInventoryApi` ni `httpClient`; datos locales / maqueta. |
| `/dashboard/operador/recepcion-rf` | `RfGoodsReceiptView` | **Real** | `POST /api/inventory/receptions`, `POST /api/inventory/rf/scan`, `POST /api/inventory/rf/confirm`, `PATCH /api/inventory/rf/reception/:id/complete`, creación de producto/lote según flujo. |
| `/dashboard/operador/movimientos-inventario` | `InventoryMovementFormView` | **Real** | `GET /api/inventory/movement-types`, subtipos, `GET /api/inventory/balances`, `POST /api/inventory/movements`. |
| `/dashboard/operador/conteo-inventario-rf` | `RfInventoryCountView` | **Real** | `POST /api/inventory/counts`, líneas, listados, `PATCH .../complete`. |
| `/dashboard/consulta-inventario` | `InventoryQueryView` | **Real** | `GET /api/inventory` con `productId` / `storageSpaceId` (riesgo 403 según `SecurityConfig` del backend; supervisor más expuesto que operador). |
| `/dashboard/historial-movimientos` | `MovementHistoryView` | **Demo** (operador) / **Mixto** (supervisor) | **Operador:** tabla `MOCK_ROWS` + filtros locales; sin pestaña kardex. **Supervisor:** pestaña kardex vía `GET /api/kardex` (`getKardex`). El cliente ya expone `listRecentMovements` / `listRecentInventoryHistory` en `operatorInventoryApi.ts` pero **no** están cableados en esta vista (oportunidad futura). |
| `/dashboard/infrastructure` | `InfrastructureManagementView` | **Real** | APIs de almacenes, sectores, espacios, etc. Revisar permisos mutadores por rol en fases posteriores. |

**Condición de visibilidad del menú:** el bloque BODEGA solo se construye si `isBusinessProcessVisible("warehouseStructure")` es verdadero.

---

## 4. Orden objetivo del menú (Fase 2 — implementación pendiente)

Referencia para cuando se agrupen ítems **sin cambiar rutas**:

1. **Entrada y ajustes** — Recepción de mercancía → Entrada RF → Movimientos de inventario → Conteo RF  
2. **Consulta y trazabilidad** — Consulta de inventario → Historial de movimientos  
3. **Ubicación / estructura** — Estructura de bodegas  

Los títulos de grupo pueden ajustarse con producto; la secuencia respeta el flujo operativo de piso.

---

## 5. Checklist de QA manual (operador)

Ejecutar con usuario **solo** `WAREHOUSE_OPERATOR` y proceso `warehouseStructure` activo.

- [ ] `/dashboard`: hero y CTAs coherentes con tareas reales (tras Fase 1; hoy validar que enlace a infraestructura funciona).  
- [ ] Menú: 7 rutas accesibles; en móvil, cierre del drawer tras navegación.  
- [ ] Recepción formal: se entiende que es maqueta si hay banner Demo (tras Fase 3).  
- [ ] RF recepción / movimientos / conteo: flujo completo contra backend de pruebas; errores de red legibles.  
- [ ] Consulta inventario: consulta con IDs válidos; mensaje claro si 403.  
- [ ] Historial: operador ve solo bloque de ejemplo y aviso de datos no reales (comportamiento actual).  
- [ ] Infraestructura: carga de datos; si hay acciones no permitidas, feedback acorde (tras endurecimiento por rol si aplica).  

**Regresión supervisor+operador:** comprobar que usuarios con ambos roles siguen viendo el dashboard y menú esperados según reglas actuales.

---

## 6. Dependencias de backend (recordatorio)

Para reclasificar filas de §3 o ampliar historial operador:

- Histórico unificado o uso de `GET /api/inventory/movements/recent` / `GET /api/inventory/history/recent` en UI de historial.  
- API de recepción formal alineada con `MerchandiseReceptionView` (sustituir Demo).  
- Política de seguridad explícita para lecturas de inventario por rol (`/api/inventory/**`).  

---

## 7. Control de versiones

| Fecha | Cambio |
|-------|--------|
| 2026-05-05 | Fase 0: criterios, inventario de pantallas operador, orden objetivo de menú, checklist QA. |
