# Compras financiadas y préstamos en Meximoney

## Propósito

Las compras a mensualidades, préstamos y tarjetas departamentales se registran como **deudas manuales**. Una compra financiada puede describir el bien adquirido —por ejemplo, lavadora, freidora o moto—, pero no crea automáticamente un activo: el patrimonio sólo incorpora activos que la usuaria haya registrado y valuado explícitamente.

## Regla de registro de una cuota

Cada cuota parte de un **gasto real ya aprobado** en Registros. Al vincularla desde Deudas, Meximoney conserva ese único gasto y guarda por separado el pago de deuda. El importe total de la cuota puede incluir interés o comisiones; únicamente la porción declarada como principal reduce el saldo pendiente de la deuda.

| Elemento | Efecto contable en Meximoney |
|---|---|
| Gasto real aprobado | Se registra una sola vez en flujo de caja y categorías. |
| Pago total de la cuota | Se conserva como referencia y se valida contra el gasto vinculado. |
| Principal | Reduce el saldo de la deuda y, por ello, el pasivo en patrimonio. |
| Interés o comisión | Permanece dentro del gasto real; no reduce el saldo de la deuda. |

La aplicación rechaza un principal mayor que el pago total, una reducción mayor que el saldo pendiente, monedas distintas o un gasto ajeno/no aprobado. Si se desvincula una cuota, se revierte solamente el principal de la deuda y se conserva el gasto original.

## Límites

El módulo es manual: no conecta bancos, no cobra deudas, no ejecuta pagos, no infiere intereses ni automatiza el alta de activos. Las fechas de vencimiento son referencias introducidas por la usuaria para su organización.
