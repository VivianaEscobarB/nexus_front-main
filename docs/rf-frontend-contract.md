# Contrato frontend — módulo RF (entrada)

El cliente web no debe acoplarse a los nombres o la forma exacta del JSON del API. El flujo oficial es:

1. **DTO del API** — definidos en `modules/warehouse/api/operatorInventoryTypes.ts` (`RfScanResponse`, `RfConfirmResponse`, cuerpos `RfScanBody`, `RfConfirmBody`).
2. **Mapper** — `modules/rf/mappers/rfApiMapper.ts` traduce DTO → ViewModel y formatea mensajes para el usuario.
3. **Servicio** — `modules/rf/services/rfService.ts` expone `rfScan` y `rfConfirm`, que devuelven solo ViewModels.
4. **UI** — componentes como `RfGoodsReceiptView` consumen `RFScanViewModel` / `RFConfirmViewModel`, no los tipos del API.

## ViewModels (`modules/rf/viewModels/rfViewModels.ts`)

### `RFScanViewModel`

| Campo | Significado |
| --- | --- |
| `receptionLineId` | Línea de recepción a confirmar. |
| `productName` | Nombre para mostrar del producto. |
| `productSku` | SKU si existe; `null` si no aplica. |
| `expectedQuantity` | Cantidad esperada de referencia (≥ 0). |
| `requiresLot` | Si el producto exige lote obligatorio. |
| `suggestedStorageSpaceId` | ID numérico de ubicación sugerida, o `null`. |
| `suggestedStorageSpaceCode` | Código legible de ubicación, o `null`. |

### `RFConfirmViewModel`

| Campo | Significado |
| --- | --- |
| `statusLabel` | Estado devuelto por el backend, listo para mostrar. |
| `quantityDifference` | Diferencia numérica (esperado vs recibido u regla de negocio del API). |
| `alertRaised` | Si se generó alerta de proceso. |

## Expectativa hacia el API

Los endpoints siguen siendo los acordados (`POST /api/inventory/rf/scan`, `POST /api/inventory/rf/confirm`). Si el backend cambia nombres de propiedades o anida objetos, solo se actualizan los DTO y el mapper; la UI no debería cambiar.

## Cola offline

La cola IndexedDB guarda `RfConfirmBody` (contrato de envío), no ViewModels. Tras recuperar red, se reenvía el mismo cuerpo con `rfConfirm`.

## Pruebas y calidad

- **Tests unitarios (Vitest):** `npm run test` — cubren deduplicación de lecturas, store RF, mapper y cola offline (`*.test.ts` bajo `modules/rf/`).
- **Lint del módulo RF:** `npm run lint:rf` — ESLint solo sobre `modules/rf` (el lint global del repo puede fallar por deuda técnica fuera de RF).

En GitHub Actions, el workflow `.github/workflows/ci.yml` ejecuta `npm ci`, `npm run test` y `npm run lint:rf`.

## Variables de entorno (opcionales)

Definidas en `lib/config/env.ts` y documentadas en `.env.example`:

| Variable | Efecto |
| --- | --- |
| `NEXT_PUBLIC_RF_ZXING_FALLBACK_ENABLED` | `false` desactiva el fallback ZXing si no hay `BarcodeDetector`. |
| `NEXT_PUBLIC_RF_HAPTICS_ENABLED` | `false` desactiva vibración al escanear/confirmar. |
| `NEXT_PUBLIC_RF_TELEMETRY_ENABLED` | `false` desactiva `trackRFEvent` (sin eventos ni logs en consola). |
