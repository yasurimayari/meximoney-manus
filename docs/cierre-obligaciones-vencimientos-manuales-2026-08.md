# Cierre — Vencimientos y obligaciones manuales

## Resultado entregado

Meximoney incorpora una agenda fiscal mensual dentro del Calendario. La agenda sólo lee eventos manuales clasificados como fiscales y la fecha fiscal configurada en el perfil. Permite iniciar la captura de un evento con “Fiscal” preseleccionado, pero no crea fechas del SAT, no estima impuestos y no ejecuta recordatorios externos.

El Libro PFAE ahora ofrece el acceso contextual **“Vincular evidencia existente”** para cada renglón sin documento. El acceso abre el renglón correcto y requiere que la usuaria elija un documento existente y guarde explícitamente. Durante esta entrega, el renglón “Factura de gasolina” no fue modificado.

| Área | Soporte manual confirmado | Regla de trazabilidad |
|---|---|---|
| Tarjeta Coppel u otra departamental | Clasificación explícita de tarjeta departamental, saldo, límite opcional, corte, fecha de pago, tasa, pago mínimo y ámbito | Los pagos desde cuenta permanecen como traspasos y reducen el saldo de tarjeta sin duplicar gasto |
| Préstamo personal | Clase personal, saldo, acreedor, cuota, tasa opcional, vencimiento y fecha final | La cuota se vincula a un gasto aprobado desde una cuenta; sólo el principal reduce el saldo |
| Préstamo automotriz | Clase automotriz con los mismos campos y pagos manuales | No se calcula tabla de amortización ni se crea pago automáticamente |
| Préstamo hipotecario | Tipo y clase hipotecaria visibles con los mismos campos y pagos manuales | El saldo histórico no se altera salvo por una cuota manual con principal indicado |

## Protección de datos existentes

La migración `0026_cloudy_rhino.sql` añadió únicamente las columnas `cardKind` y `loanKind`, con valores predeterminados compatibles. No reetiquetó ni modificó las tarjetas, deudas, saldos, movimientos, fechas, documentos o registros fiscales que ya existían. La QA autenticada se limitó a abrir y cerrar formularios; el registro de red no mostró mutaciones de calendario, tarjetas, deudas, cuotas o renglones fiscales.

## Validación y límites

La comprobación de tipos, la compilación de producción y las 92 pruebas de Vitest finalizaron correctamente. La QA publicada confirmó el estado vacío de la agenda, el selector de evento fiscal, la clase de tarjeta departamental, las clases de préstamo y el acceso de evidencia PFAE. El alcance sigue siendo deliberadamente manual: no hay conexiones bancarias, pagos ejecutados, cálculos de amortización, consultas al SAT, generación de CFDI, cálculo o presentación de impuestos.
