# API de bodega — Supervisor y operador (Nexus Front)

Documento de referencia para el equipo backend: **funcionalidades ya planteadas en el cliente web** y **endpoints sugeridos** para `WAREHOUSE_SUPERVISOR` (supervisor de bodega) y `WAREHOUSE_OPERATOR` (operador de bodega).

> **Nota:** Los paths son una **propuesta** coherente con REST. Ajusten prefijos (`/api/v1/...`) y nombres al estándar del monolito o BFF existente. El front hoy usa datos **mock** en varias pantallas; este listado describe lo que debe soportar la API para reemplazarlos.

---

## 1. Autenticación y autorización

| Aspecto | Recomendación |
|--------|----------------|
| Identidad | JWT (o sesión) con claims de roles canónicos: `WAREHOUSE_SUPERVISOR`, `WAREHOUSE_OPERATOR` (y otros ya existentes). |
| Autorización | Cada endpoint valida que el usuario posea al menos uno de los roles permitidos. Operador y supervisor pueden compartir lecturas; **escrituras** deben acotarse por rol (ver columna en cada recurso). |
| Alcance de datos | Filtrar por **bodega(s)** asignada(s) al usuario cuando aplique, salvo que el supervisor tenga visión multi-sede explícita en el modelo de negocio. |
| Auditoría | Registrar `userId`, timestamp y, si aplica, `warehouseId` / `sectorId` en altas de movimientos, recepciones, conteos y transferencias. |

---

## 2. Mapa pantalla (web) → rol

Rutas actuales en el front (`app/(dashboard)/dashboard/...`):

| Ruta web | Roles (`RoleGuard`) | Resumen funcional |
|----------|---------------------|-------------------|
| `/dashboard/operador/recepcion-mercancia` | Operador | Recepción formal: vehículo, conductor, condiciones, seguridad, documentos. |
| `/dashboard/operador/recepcion-rf` | Operador | Entrada rápida por **código de barras** (cámara/manual) ligada a recepción activa. |
| `/dashboard/operador/movimientos-inventario` | Operador | Registro de movimiento (entrada/salida/ajuste) con subtipo, ubicación, cantidad. |
| `/dashboard/operador/conteo-inventario-rf` | Operador | Conteo físico vs cantidad **trazabilidad/sistema** por producto-lote-sector. |
| `/dashboard/consulta-inventario` | Operador, Supervisor | Consulta de existencias con filtros (producto, bodega, sector, estado). |
| `/dashboard/historial-movimientos` | Operador, Supervisor | Histórico de movimientos con filtros por fechas y tipo. |
| `/dashboard/supervisor/transferencias-bodegas` | Supervisor | Transferencias entre bodegas (origen, destino, fechas, producto, cantidad). |
| `/dashboard/supervisor/alertas-sistema` | Supervisor | Alertas operativas (vencimientos, stock bajo, etc.) y acciones (notificar, detalle). |
| `/dashboard/infrastructure` | (Navegación operador/supervisor; permisos según política actual del API) | Estructura de bodegas / consulta espacial — ya existe integración parcial vía `/api/warehouses`, sectores, espacios, etc. |

**Clasificación real / demo / mixto en la UI (Fase 0):** ver [supervisor-ui-scope.md](./supervisor-ui-scope.md).

---

## 3. Convenciones sugeridas para la API

- **Listados:** `GET` con query params (`page`, `pageSize`, `sort`, filtros). Respuesta con `items`, `total`, `page`, `pageSize`.
- **IDs:** UUID o bigint; exponer siempre `id` estable en respuestas.
- **Fechas:** ISO-8601 en UTC (`2026-05-20T10:30:00Z`).
- **Errores:** Cuerpo JSON `{ "code", "message", "details?" }` con HTTP 4xx/5xx coherentes.
- **Roles en documentación:** `OP` = operador, `SUP` = supervisor, `OP+SUP` = ambos.

---

## 4. Endpoints por dominio

### 4.1 Recepción de mercancía (formulario completo)

**Rol:** principalmente `OP` (creación); `SUP` puede requerir solo lectura o aprobación según negocio.

| Método | Ruta propuesta | Descripción | Roles |
|--------|----------------|-------------|-------|
| `POST` | `/api/receptions` | Crear recepción (cabecera: datos vehículo, conductor, condiciones transporte, seguridad, documentos adjuntos/metadata). | OP |
| `GET` | `/api/receptions/{id}` | Detalle de recepción. | OP, SUP |
| `PATCH` | `/api/receptions/{id}` | Actualizar borrador o estado (ej. `DRAFT` → `CONFIRMED`). | OP (SUP si aplica) |
| `POST` | `/api/receptions/{id}/attachments` | Subir archivo (multipart o URL firmada según diseño). | OP |

**Payload orientativo (POST):** `warehouseId`, `vehicle` (placa, tipo, empresa transporte), `driver`, `transportConditions`, `seal`, `documents[]`, `observations`, etc.

---

### 4.2 Recepción RF (entrada por código de barras)

**Rol:** `OP`.

| Método | Ruta propuesta | Descripción | Roles |
|--------|----------------|-------------|-------|
| `GET` | `/api/receptions/active` | Listar recepciones **activas** asignables al operador (equivalente al select `REC-000xxx`). | OP |
| `GET` | `/api/products/resolve-barcode` | `?code={ean|code128}` → producto, lote sugerido, unidad (catálogo + inventario). | OP |
| `POST` | `/api/receptions/{receptionId}/lines` | Alta de línea de recepción: `barcode`, `productId`, `lotId` o `lotCode`, `quantity`, `unit`. | OP |

*(Alternativa:* unificar con `POST /api/receptions/{id}/lines` usado también desde el formulario completo.)

---

### 4.3 Movimientos de inventario

**Rol:** `OP` (alta); `SUP` y `OP` lectura en histórico.

| Método | Ruta propuesta | Descripción | Roles |
|--------|----------------|-------------|-------|
| `POST` | `/api/inventory/movements` | Registrar movimiento: tipo (`ENTRY`/`EXIT`/`ADJUSTMENT`), subtipo, `productId`, `lotId`/`lotCode`, `locationId` (puesto), `quantity`, `observation`. | OP |
| `GET` | `/api/inventory/locations/{locationId}/stock` | Saldo disponible en ubicación (para el panel “después del movimiento” en UI). | OP, SUP |

**Payload orientativo:** `movementType`, `subtype`, `productId`, `batchReference`, `storageSpaceId`, `quantity`, `notes`.

---

### 4.4 Conteo RF (inventario físico vs trazabilidad)

**Rol:** `OP`.

| Método | Ruta propuesta | Descripción | Roles |
|--------|----------------|-------------|-------|
| `GET` | `/api/traceability/expected-quantity` | `?warehouseId&sectorId&productId&lotCode` → cantidad esperada según documento de trazabilidad del pedido/cliente. | OP |
| `GET` | `/api/products/resolve-barcode` | Reutilizar mismo resolver que recepción RF. | OP |
| `POST` | `/api/inventory/physical-counts` | Guardar conteo: `warehouseId`, `sectorId`, `productId`, `lotCode`, `physicalQuantity`, `systemQuantitySnapshot`, `difference`, referencia a documento trazabilidad si existe. | OP |
| `GET` | `/api/inventory/physical-counts` | Listar conteos (filtros por fecha, sector, usuario). | OP, SUP |

---

### 4.5 Consulta de inventario

**Rol:** `OP`, `SUP`.

| Método | Ruta propuesta | Descripción | Roles |
|--------|----------------|-------------|-------|
| `GET` | `/api/inventory/stock` | Listado paginado: filtros `productSearch`, `warehouseId`, `sectorId`, `status` (disponible, bajo, agotado, etc.). | OP, SUP |

**Respuesta orientativa por ítem:** producto, lote, bodega, sector-puesto, cantidad disponible, vencimiento, estado operativo.

---

### 4.6 Historial de movimientos

**Rol:** `OP`, `SUP`.

| Método | Ruta propuesta | Descripción | Roles |
|--------|----------------|-------------|-------|
| `GET` | `/api/inventory/movements` | Histórico paginado: `dateFrom`, `dateTo`, `movementType`, orden descendente por fecha. | OP, SUP |

**Respuesta orientativa:** fecha/hora, tipo, subtipo, producto, cantidad, usuario (`displayName` o rol), observación.

---

### 4.7 Transferencias entre bodegas

**Rol:** `SUP` (alta y seguimiento); lectura puede extenderse a `OP` si negocio lo define.

| Método | Ruta propuesta | Descripción | Roles |
|--------|----------------|-------------|-------|
| `POST` | `/api/transfers` | Crear transferencia: `originWarehouseId`, `destinationWarehouseId`, `shipDate`, `estimatedArrivalDate`, `productId`, `lotCode`, `quantity`, `observations`. | SUP |
| `GET` | `/api/transfers` | Listar con filtros (estado, fechas, bodegas). | SUP (OP si aplica) |
| `GET` | `/api/transfers/{id}` | Detalle + líneas + estado logístico. | SUP |

Validación de negocio: `originWarehouseId !== destinationWarehouseId`.

---

### 4.8 Alertas del sistema

**Rol:** `SUP` (consumo principal); opcionalmente generación vía jobs/backend.

| Método | Ruta propuesta | Descripción | Roles |
|--------|----------------|-------------|-------|
| `GET` | `/api/alerts` | Listar alertas: tipo (`EXPIRY_CRITICAL`, `EXPIRY_WARNING`, `LOW_STOCK`, …), severidad, producto, lote, ubicación, mensaje. | SUP |
| `GET` | `/api/alerts/{id}` | Detalle ampliado (trazas, histórico, acciones sugeridas). | SUP |
| `POST` | `/api/alerts/{id}/notify-client` | Disparar notificación al cliente (email/WhatsApp según integración). | SUP |
| `POST` | `/api/alerts/generate` | *(Interno o admin)* Reglas batch para poblar alertas desde vencimientos y umbrales de stock. | Sistema / ADMIN |

---

### 4.9 Infraestructura / estructura (ya referenciada en front)

El front consume hoy rutas del tipo:

- `/api/warehouses`, `/api/sectors`, `/api/storage-spaces`, `/api/entity-types`, `/api/status-catalogs`

**Rol:** depende de la política actual (operador suele ser **lectura**; supervisor/admin **gestión**). No duplicar aquí el contrato completo; alinear permisos con `InfrastructureManagementView` y guards del backend.

---

## 5. Catálogos y dependencias transversales

Endpoints que suelen ser compartidos por varias pantallas:

| Recurso | Uso en front actual |
|---------|---------------------|
| Bodegas | Filtros, transferencias, stock. |
| Sectores / puestos (espacios) | Movimientos, consulta inventario, conteo RF. |
| Productos y lotes | Todas las pantallas de inventario. |
| Usuarios / roles | Mostrar “Operador” vs “Supervisor” en historial. |
| Documentos de trazabilidad / pedidos cliente | Conteo RF, validación de cantidades esperadas. |

Sugerencia: exponer **`GET /api/catalog/warehouses`**, **`GET /api/catalog/sectors?warehouseId=`**, **`GET /api/catalog/products?q=`** unificados para selects del front.

---

## 6. Resumen ejecutivo para backlog

| Prioridad sugerida | Módulo | Endpoints mínimos |
|--------------------|--------|-------------------|
| Alta | Inventario base | `GET /api/inventory/stock`, `POST /api/inventory/movements`, `GET /api/inventory/movements` |
| Alta | Recepción | `POST /api/receptions`, líneas RF, `GET /api/receptions/active`, resolver código |
| Media | Transferencias | `POST/GET /api/transfers` |
| Media | Conteo RF | `GET traceability expected`, `POST physical-counts` |
| Media | Alertas | `GET /api/alerts`, detalle, `notify-client` |
| Continua | Infraestructura | Mantener/ajustar contrato existente de warehouses/sectores/espacios |

---

## 7. Cliente web — módulo inventario operador

Los endpoints bajo `/api/inventory/...` acordados con el backend (recepciones, RF scan/confirm/complete, productos y lotes, tipos y subtipos de movimiento, saldos, movimientos, historial reciente, alertas de proceso, conteos cíclicos) están encapsulados en:

- `modules/warehouse/api/operatorInventoryApi.ts` — llamadas HTTP (`httpClient`)
- `modules/warehouse/api/operatorInventoryTypes.ts` — DTOs TypeScript

**Vistas integradas con el API:** `RfGoodsReceiptView` (recepción RF), `InventoryMovementFormView` (movimientos), `RfInventoryCountView` (conteos). El formulario extendido de recepción (`MerchandiseReceptionView`) conserva la maqueta multi-paso hasta disponer de un contrato equivalente en el backend.

---

## 8. Contacto con el front

- Guards de ruta en cliente: `ProcessVisibilityGuard` usa el flag de negocio `warehouseStructure` (config `processVisibility.ts`). Si el backend introduce **feature flags** distintos, coordinar.
- Roles en sesión deben normalizarse como ya hace el front (`shared/auth/primaryRole.ts`: prefijos `ROLE_`, alias `MANAGER` → `ADMIN`, etc.).

---

*Documento generado a partir del estado del repositorio Nexus Front (pantallas operador/supervisor de bodega). Actualizar cuando se cierren contratos OpenAPI o Swagger en el backend.*
