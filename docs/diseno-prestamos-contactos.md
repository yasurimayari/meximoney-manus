# Diseño — Préstamos de contactos y pagos desde cuenta

## Propósito

Este módulo permite registrar que un contacto otorgó un préstamo a la usuaria y hacer pagos manuales parciales desde una cuenta de Meximoney. Un mismo contacto puede tener varios préstamos independientes y cada préstamo conserva su propio saldo, importe original, cuota orientativa y próxima fecha de pago.

## Regla de trazabilidad

Cada préstamo se guarda como una **deuda** con `contactId`. Cada pago desde cuenta crea dos movimientos vinculados por un identificador único: una salida desde la cuenta seleccionada y una entrada de contrapartida asociada a la deuda. El registro del pago de deuda enlaza ese par y reduce exclusivamente el principal de la deuda seleccionada.

| Elemento | Efecto | No ocurre |
|---|---|---|
| Pago de principal | Reduce el saldo de la deuda y queda visible en el historial del contacto. | No se clasifica como gasto ni vuelve a registrar el préstamo como ingreso. |
| Cuenta de origen | Identifica de qué cuenta salió el pago. | No se crea una cuenta ficticia para el contacto. |
| Interés o comisión | Sigue requiriendo un gasto manual revisable si existiera. | No se supone ni se calcula automáticamente. |
| Correcciones | Se conservan como movimientos explícitos y trazables; una modificación posterior debe hacerse desde el historial del préstamo. | No modifica otros pagos ni otros préstamos del contacto. |

## Controles

El flujo exige que la cuenta, el préstamo y el contacto pertenezcan al mismo espacio privado y usen la misma moneda. El pago no puede superar el saldo pendiente. Los pagos creados desde Contactos se editan y eliminan desde el mismo historial para preservar la conciliación.
