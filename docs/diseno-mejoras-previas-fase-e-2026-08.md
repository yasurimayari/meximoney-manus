# Diseño — Mejoras operativas previas a la Fase E

## Periodo vigente

El resumen recibirá la fecha local actual como referencia de lectura. El servidor normalizará esa referencia al mes de Ciudad de México y conservará UTC en toda persistencia. Este ajuste no modifica fechas históricas, sino que evita que un resumen activo conserve el mes de una consulta anterior.

## Registros y centro de cuentas

La primera página de Registros mostrará 15 movimientos ordenados por fecha descendente. A partir de la segunda página, cada página mostrará 20 movimientos; la navegación será numerada y se reiniciará al cambiar filtros.

Se añadirá la ruta **Cuentas**. Será una vista de lectura que agrupa cuentas y activos, tarjetas de crédito y deudas/préstamos activos. Cada grupo enlazará a su módulo de gestión y mostrará los movimientos ya vinculados a la cuenta, tarjeta o préstamo; no duplicará datos ni permitirá pagos desde la nueva vista.

## Analítica histórica

La serie mensual recibirá una fecha de referencia explícita y permitirá ventanas de 3, 6, 12, 18, 24 y 36 meses. La selección anual permitirá ver doce meses de cada uno de los cinco años más recientes, incluido 2022 cuando el año vigente sea 2026. Los gráficos conservarán el criterio actual: sólo importes comparables en la moneda de reporte y transferencias fuera del flujo.

## Telegram

El resumen conservará la programación y preferencias actuales. Usará el formato HTML básico admitido por `sendMessage`, escapando todo dato procedente de títulos y notas. El nuevo contenido tendrá cabecera, conteo de recordatorios, hasta tres alertas prioritarias y una instrucción final breve. [1]

## Fechas fiscales y tarjetas en Calendario

Los eventos fiscales manuales podrán abrirse en edición desde la agenda fiscal. La fecha fiscal configurada en Perfil tendrá un acceso directo y explícito al formulario existente de Perfil; seguirán sin existir calendarios SAT ni fechas inferidas.

Se añadirá `linkedCreditCardId` nullable en `calendarEvents`. El selector de tarjeta aparecerá sólo para `credit_card_cutoff` y `credit_card_payment`. El servidor verificará que la tarjeta pertenezca al espacio privado antes de guardar. Cambiar un evento a un tipo no relacionado con tarjeta limpiará el vínculo; guardar o editar el evento no creará pago, traspaso ni actualizará saldo.

| Cambio | Persistencia | Mutación excluida |
|---|---|---|
| Periodo actual | Ninguna | Movimientos, cierres y fechas históricas |
| Paginación y analítica | Ninguna | Registros y presupuesto |
| Centro de cuentas | Ninguna | Saldos, tarjetas, préstamos y pagos |
| Formato Telegram | Ninguna | Programación, preferencias y envíos de prueba |
| Vínculo TDC-calendario | Columna nullable manual | Pagos, traspasos y saldos de tarjeta |

## Referencias

[1]: https://core.telegram.org/bots/api#sendmessage "Telegram Bot API — sendMessage y formato HTML"
