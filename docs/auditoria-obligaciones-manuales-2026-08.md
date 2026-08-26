# Auditoría de obligaciones manuales — 2026-08

## Cobertura actual confirmada

Meximoney ya permite registrar una tarjeta con emisor, límite, saldo real —incluso sobregirado—, tasa, pago mínimo, corte, fecha de pago, ámbito y pagos desde cuenta como traspaso. Por tanto, una **Tarjeta Coppel** se puede guardar hoy como tarjeta genérica; sin embargo, el módulo no distingue explícitamente entre tarjeta bancaria y tarjeta departamental.

Las deudas admiten tipos manuales de préstamo, hipoteca, compra financiada y tarjeta departamental. También registran acreedor, saldo, tasa anual opcional, pago mínimo, próximo vencimiento, fecha final y pagos con principal separado. Una hipoteca cabe explícitamente en el tipo `mortgage`; un préstamo automotriz o personal se registra hoy como `loan` con nombre y acreedor manuales. La brecha es de clasificación visible: no se identifica el subtipo automotriz o personal de forma estructurada, y la cuota se vincula a un gasto real existente en lugar de un flujo guiado de pago desde cuenta.

El Calendario ya soporta eventos fiscales manuales y el perfil conserva una fecha fiscal futura opcional. El Libro PFAE ya permite seleccionar un documento de evidencia al editar un renglón, pero el estado de evidencia faltante no conduce directamente a esa acción.

## Decisión de implementación

La fase añadirá etiquetas estructuradas y manuales para **tarjeta departamental**, **préstamo automotriz**, **hipoteca** y **préstamo personal**, sin crear obligaciones ni tocar las existentes. La clasificación debe ser opcional y conservar los datos actuales. Se añadirá una agenda de vencimientos que sólo lea eventos fiscales, fechas de deuda y fechas de tarjetas ya configuradas, además de accesos de corrección al Libro PFAE. No se crearán fechas, pagos, importes ni cálculos de interés automáticamente.
