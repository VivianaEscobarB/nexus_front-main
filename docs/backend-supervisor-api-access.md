# Acceso API — supervisor y operador de bodega (Nexus front ↔ backend)

Documento de **coordinación** entre el cliente web y la seguridad Spring. Incluye el problema histórico (regla global `/api/inventory/**`) y el **estado alineado** tras los cambios en backend descritos a continuación.

**Roles canónicos:** `WAREHOUSE_SUPERVISOR`, `WAREHOUSE_OPERATOR` (y `ROLE_*` según convención del proyecto).

---

## 1. Estado actual del `SecurityFilterChain` (referencia)

Resumen de cómo quedó la cadena respecto al checklist del front:

| Ámbito | Quién accede | Comentario |
|--------|----------------|------------|
| `GET /api/inventory/overview` | Solo **SUP** | Indicadores del dashboard supervisor. |
| `GET /api/alerts` y **PATCH** resolve de alertas | Solo **SUP** | `SystemAlertsView` y acciones asociadas. |
| `GET /api/kardex` | Solo **SUP** | Kardex en `MovementHistoryView` (pestaña supervisor). |
| `GET /api/inventory` y `GET /api/inventory/{productId}` | **OPERATOR** y **SUP** | Consulta de inventario (`InventoryQueryView` compartida). |
| **Resto** de `POST` / `PATCH` (y similares) bajo `/api/inventory/**` | Solo **OPERATOR** | RF, movimientos, conteos, recepciones bajo el módulo de proceso, etc. |

En `SecurityConfig` debe existir un comentario que aclare **lecturas SUP** frente a **escritura operador**. Los `@PreAuthorize` de `InventoryController` y `AlertController` deben coincidir con estas reglas.

---

## 2. Kardex (`GET /api/kardex`)

Implementación de referencia en backend:

- **Controlador:** `KardexController` (nuevo o dedicado).
- **Query opcionales:** `productId`, `dateFrom`, `dateTo` (fechas **inclusivas** por día; `dateTo` hasta fin de día).
- **Respuesta:** `ApiResponse<List<InventoryMovementResponseDTO>>` (mismo DTO que movimientos).
- **Límite:** 500 filas, orden **`createdAt` descendente**.
- **Servicio / repositorio:** `InventoryProcessService.findKardexMovements` + `InventoryMovementRepository.findForKardex` (nombres según el código real).

El front (`MovementHistoryView`) ya consume kardex con `productId` y rango de fechas; conviene mantener el contrato estable con este límite documentado.

---

## 3. Escrituras logísticas y operador

En **`TransferController`**, **`ReceptionController`**, **`DispatchController`** e **`InventoryOperationController`** se añadió **`WAREHOUSE_OPERATOR`** a `@PreAuthorize`, además de roles tipo **ADMIN / SUP / EMPLOYEE**, para que el operador no reciba **403** en flujos que el front asigna al operador, manteniendo el filtro HTTP general (`anyRequest().authenticated()` + método).

---

## 4. OpenAPI / documentación de API

- **InventoryController:** `@Tag` y `@SecurityRequirement(bearer)` con texto explícito **OP/SUP** y aclaración de que **`/overview` solo SUP**.
- **AlertController:** descripción de roles acorde a lectura/resolución SUP.
- **InventoryProcessController:** `@Tag` indicando que el bloque es **operación solo OPERATOR** y que consulta/kardex viven en otros controladores.
- Corrección aplicada en `InventoryProcessController`: imports / `RequestMapping`, `RequestParam`, `CreateInventoryCountRequestDTO` (evitar paquetes erróneos tipo `org.springframework.webs...`).

---

## 5. Pendiente de producto (siguiente iteración)

| Tema | Descripción |
|------|-------------|
| **Alcance por bodega para SUP** | Filtrado en consultas, overview y kardex según **bodegas asignadas al supervisor**. Requiere modelo de asignación y filtros en servicios/SQL. **No implementado** en la iteración descrita. |
| **`GET /api/inventory/{productId}`** | A nivel HTTP el patrón con segmento dinámico es válido; si en el futuro **choca** con rutas fijas (`/products`, `/overview`, …), conviene ordenar matchers estáticos antes o usar prefijo explícito, p. ej. `/api/inventory/by-product/{id}`. |

---

## 6. Endpoints que el front usa (tabla rápida)

| Método | Ruta (aprox.) | Rol esperado (estado actual) | Uso en el front |
|--------|----------------|------------------------------|-----------------|
| `GET` | `/api/alerts` | SUP | `SystemAlertsView` |
| `GET` | `/api/inventory` | OP + SUP | `InventoryQueryView` |
| `GET` | `/api/inventory/overview` | SUP | `SupervisorDashboard` |
| `GET` | `/api/inventory/{productId}` | OP + SUP | Detalle / ampliaciones |
| `GET` | `/api/kardex` | SUP | `MovementHistoryView` (kardex) |
| `POST` / `PATCH` bajo `/api/inventory/**` (proceso) | Varias | OP | RF, movimientos, conteos, etc. |

---

## 7. Problema estructural histórico (ya resuelto en backend alineado)

Si una regla global aplicaba `requestMatchers("/api/inventory/**").hasRole("WAREHOUSE_OPERATOR")`, el supervisor recibía **403** en **GET** aunque `@PreAuthorize` permitiera SUP. La solución es **acotar por método y subpath** (ver §1), no solo anotaciones en controlador.

---

## 8. Cómo interpreta el front un 403

El cliente muestra mensajes orientados a usuario; en desarrollo puede mostrar referencias técnicas. Tras alinear la cadena, un **403** en consulta de inventario con usuario **solo SUP** puede deberse a otra regla, a datos fuera de alcance o a despliegue desactualizado.

---

## 9. Control de versiones

| Fecha | Cambio |
|-------|--------|
| (inicial) | Checklist y problema de regla global `/api/inventory/**`. |
| 2026-05-06 | Sincronizado con backend: reglas GET/POST por rol, kardex dedicado, escrituras logísticas con OP, OpenAPI, pendientes alcance SUP y path `/{productId}`. |

---

*Ajustar paths exactos si el monolito usa prefijos (`/api/v1/...`) distintos.*
