# Diseño — Conciliación visible de CxC y Libro PFAE

## Propósito

El Libro PFAE mostrará, junto a cada renglón vinculado con una cuenta por cobrar, una lectura informativa del estado de cobro. La lectura reutiliza exclusivamente los abonos existentes de la CxC y sus enlaces a ingresos aprobados. No crea abonos, no registra ingresos, no cambia la CxC ni calcula obligaciones fiscales.

| Estado visible | Condición informativa | Importe que se muestra |
|---|---|---|
| Facturado · pendiente de cobro | La CxC vinculada no tiene abonos. | Saldo CxC pendiente. |
| Cobrado parcialmente conciliado | Hay abonos, queda saldo, y todos están ligados a ingresos aprobados. | Cobrado conciliado y saldo pendiente. |
| Cobrado parcialmente · conciliación pendiente | Hay abonos y queda saldo, pero falta enlazar al menos uno a un ingreso aprobado. | Cobrado registrado, conciliado y pendiente. |
| Cobrado conciliado | La CxC está totalmente cubierta y todos los abonos están ligados. | Total conciliado y saldo cero. |
| Cobrado · conciliación pendiente | La CxC está cubierta, pero algún abono no tiene ingreso vinculado. | Total registrado, conciliado y pendiente de vínculo. |

## Límites

El estado se calcula en la interfaz a partir de la CxC, sus abonos y los enlaces existentes. El periodo fiscal no altera la fecha ni el importe del cobro. Si una misma CxC se asocia con más de un renglón fiscal, la vista lo advertirá como una relación que requiere revisión humana para evitar interpretar el mismo cobro como dos facturas.

> Los importes de cobro son evidencia operativa de una CxC. No determinan IVA, ISR, deducibilidad ni el contenido de una declaración.
