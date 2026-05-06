# Alcance UX — Supervisor de bodega (Fase 0)

Documento de **criterios y clasificación de fuentes de datos** para las mejoras de navegación y honestidad en la UI. Se actualiza cuando entren nuevos endpoints; el detalle de contratos API sigue en [api-bodega-supervisor-operador.md](./api-bodega-supervisor-operador.md).

---

## 1. Audiencia

| Perfil | Comportamiento esperado en el cliente |
|--------|--------------------------------------|
| Solo `WAREHOUSE_SUPERVISOR` | Menú y dashboard alineados al rol supervisor (operaciones de supervisión + estructura según permisos). |
| `WAREHOUSE_SUPERVISOR` + `WAREHOUSE_OPERATOR` | Mismo shell base de supervisor en el layout actual: entradas de **operación en piso** (rutas `/dashboard/operador/...`) cuando el usuario tiene también rol operador, más entradas de supervisión. |

---

## 2. Regla de etiquetado en la UI

| Etiqueta interna | Significado | Acción de diseño |
|------------------|-------------|-------------------|
| **Real (API)** | Datos o acciones respaldados por el backend **hoy** (o error explícito 4xx del API). | Copy orientado a negocio; errores claros para el usuario. |
| **Demo** | Flujo o datos **sin** persistencia acordada (mock, formulario no cableado). | Badge o banner “Demo” hasta integrar el endpoint (plan Fase 3). |
| **Mixto** | Conviven dos modos (p. ej. pestaña demo + pestaña API) o una misma pantalla con bloques de distinta procedencia. | Etiquetar cada modo; no mezclar sin indicarlo. |

**Nota:** Un endpoint “real” puede devolver **403** (p. ej. `GET /api/inventory` para supervisor si `SecurityConfig` restringe `/api/inventory/**`). Eso sigue siendo “real” a nivel integración; la UI debe explicar el bloqueo sin asumir demo.

---

## 3. Inventario de pantallas — supervisor (estado actual)

Rutas que el supervisor usa de forma propia o compartida con operador.

| Ruta web | Vista (módulo) | Clasificación | Endpoints / datos hoy |
|----------|----------------|---------------|------------------------|
| `/dashboard` | `SupervisorDashboard` | **Mixto** | **Real:** agregados de bodegas y contratos (`listWarehouses`, `listContracts`). **Real (condicional):** `GET /api/inventory/overview` (404/403 si no aplica). |
| `/dashboard/supervisor/alertas-sistema` | `SystemAlertsView` | **Real** | `GET /api/alerts` |
| `/dashboard/supervisor/transferencias-bodegas` | `WarehouseTransferFormView` | **Demo** | Objetivo futuro: `POST /api/transfers`. Sin integración aún. |
| `/dashboard/consulta-inventario` | `InventoryQueryView` | **Real** | `GET /api/inventory` (`productId`, `storageSpaceId`). Riesgo **403** supervisor por reglas globales de inventario en backend. |
| `/dashboard/historial-movimientos` | `MovementHistoryView` | **Mixto** | **Demo:** tabla de ejemplo (filtros locales). **Real (supervisor):** pestaña kardex con `GET /api/kardex` si el backend lo expone. |
| `/dashboard/infrastructure` | `InfrastructureManagementView` | **Real** | APIs de almacenes, sectores, espacios, etc., según política del API y rol. |

---

## 4. Alcance extendido — operador de bodega

El inventario **pantalla por pantalla** del rol `WAREHOUSE_OPERATOR`, orden objetivo del menú y checklist de QA están en [operator-ui-improvements.md](./operator-ui-improvements.md). Las rutas bajo `/dashboard/operador/*` y las compartidas (`consulta-inventario`, `historial-movimientos`, `infrastructure`) se clasifican allí como **Real / Demo / Mixto** según §2 de este documento.

---

## 5. Endpoints pendientes (recordatorio para cierre del plan UX)

Cuando backend los provea, reclasificar filas de §3:

- `POST /api/transfers` (transferencias).
- Histórico unificado o sustitución del bloque demo en historial.
- Ajuste de seguridad para lecturas de inventario del supervisor (`/api/inventory/**` o rutas GET específicas).
- Cualquier otro GET acordado en el documento de API de bodega.

---

## 6. Control de versiones

| Fecha | Cambio |
|-------|--------|
| 2026-05-05 | Fase 0: criterios + inventario inicial. |
| 2026-05-05 | Fase 1: menú supervisor — orden Alertas → Consulta → Historial → Transferencias → Estructura de bodegas; doble grupo «OPERACIÓN EN PISO» / «SUPERVISIÓN» si hay rol operador; nombre unificado «Estructura de bodegas» (admin/operador/supervisor). |
| 2026-05-05 | Fase 2: `SupervisorDashboard` — accesos rápidos (alertas, consulta, historial), hero operativo, bloque «Indicadores de inventario» con copy de negocio y detalle técnico solo en desarrollo. |
| 2026-05-05 | Fase 3: aviso demo en transferencias (`NEXT_PUBLIC_WAREHOUSE_TRANSFER_API_ENABLED`); pestañas «Ejemplo (sin API)» / «Kardex (API)» y banners en historial; nota técnica kardex solo en desarrollo. |
| 2026-05-05 | Fase 4: alertas — «Notificar cliente» deshabilitado con tooltip; «Ver inventario» enlaza a `/dashboard/consulta-inventario` si el DTO trae `productId` y/o `storageSpaceId`; consulta acepta query params y aviso de prellenado. |
| 2026-05-05 | §4: enlace a Fase 0 operador en `operator-ui-improvements.md`. |
