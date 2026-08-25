# Diseño contable: préstamos y compras financiadas

Las compras financiadas y los préstamos se gestionarán dentro de **Planificación → Deudas y obligaciones**, con una vista separada para **Préstamos** y otra para **Compras financiadas**. Una compra financiada —por ejemplo, lavadora, freidora o moto— se modela como una obligación manual con bien, proveedor, saldo, importe original, cuota, número de mensualidades, interés, próxima fecha de pago y vencimiento final.

| Elemento | Tratamiento en Meximoney | Motivo contable |
|---|---|---|
| Alta de la compra o préstamo | Crea una deuda manual; no crea un gasto automático. | Evita contabilizar dos veces el coste al pagar mensualidades. |
| Pago de cuota | Se vincula a un gasto manual real y registra cuánto redujo el principal. | El gasto refleja salida de efectivo; la reducción de principal ajusta la deuda. |
| Interés o comisión | Puede quedar dentro del gasto real, aunque la reducción de saldo sea menor. | Un pago no siempre reduce el principal por el mismo importe. |
| Patrimonio y cierres | Incluyen el saldo pendiente como pasivo activo o en revisión. | El pasivo disminuye el patrimonio neto desde el alta. |
| Calendario | Muestra el próximo pago y, cuando se informen cuotas, la programación de fechas. | Facilita el seguimiento sin ejecutar pagos. |
| Bien adquirido | No se convierte en activo automáticamente. | Una lavadora, freidora o moto sólo debe registrarse como activo si la usuaria decide llevar una valuación manual separada. |

El método predeterminado es **base de efectivo**: cada cuota se registra como gasto cuando se paga. Por ello, el alta de la deuda no genera un gasto inicial automático. Si una usuaria ya registró un gasto original, puede conservarlo, pero deberá usar un tratamiento consistente y evitar volver a registrar las cuotas como gastos equivalentes.

Las alertas internas se calcularán desde los datos privados de tarjetas, deudas, calendario y perfil. La aplicación no ejecutará pagos, no conectará bancos y no inferirá obligaciones del SAT: las fechas fiscales se mantendrán como eventos manuales revisables.
