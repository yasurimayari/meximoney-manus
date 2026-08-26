# Fase C — Libro PFAE manual y revisable

## Propósito y límite

El libro PFAE de Meximoney organizará la evidencia fiscal que la usuaria capture manualmente para cada operación relevante. No sustituye la contabilidad profesional, no determina impuestos, no infiere deducibilidad, no genera CFDI, no presenta declaraciones y no realiza ninguna acción ante el SAT.

> La información se mostrará como un **expediente de revisión**. La clasificación, los importes de IVA, la deducibilidad y el estado de cada comprobante son decisiones humanas confirmadas por la usuaria.

## Modelo propuesto

Cada renglón fiscal se asocia de forma opcional con un movimiento confirmado, una cuenta por cobrar, un contacto y un documento de referencia. La asociación es opcional para admitir gastos o comprobantes que se revisan antes de contar con un movimiento conciliado; las relaciones se validarán dentro del espacio privado de la usuaria.

| Campo manual | Finalidad | Regla de seguridad |
|---|---|---|
| Periodo fiscal | Agrupar la revisión mensual. | Se captura como mes de referencia; no crea una declaración. |
| Tipo de comprobante | Distinguir ingreso facturado, gasto con comprobante, complemento de pago u otro soporte. | No interpreta ni extrae datos de archivos. |
| Folio fiscal o referencia | Localizar el comprobante en la referencia externa. | Es opcional, no se valida contra SAT ni se consulta en línea. |
| Facturado y cobrado | Separar la emisión del documento del cobro real. | El cobro puede enlazarse a CxC y a un ingreso aprobado. |
| Base, IVA e importe total | Registrar los datos que la usuaria determine. | No se recalcula ni se convierte en impuesto a pagar. |
| Deducibilidad | Marcar pendiente, deducible, no deducible o por revisar. | Nunca se asigna automáticamente. |
| Evidencia | Enlazar un documento o URL ya registrado manualmente. | No se carga, OCR ni sincroniza un archivo externo. |
| Revisión | Mantener borrador, pendiente, revisado o excluido. | Sólo un registro revisado se considera listo para el resumen informativo. |

## Trazabilidad de ingresos y CxC

Una factura o cuenta por cobrar puede estar emitida y seguir pendiente de cobro. Cuando la usuaria registre un abono y lo vincule con un ingreso real aprobado, el libro PFAE mostrará el estado **cobrado parcialmente** o **cobrado** según los abonos registrados, sin crear un segundo ingreso. Si el vínculo falta, se mostrará como pendiente de conciliación.

## Vista predeclaración informativa

La vista mensual consolidará únicamente los renglones capturados para mostrar el total facturado, el total cobrado conciliado, la base e IVA registrados, los gastos marcados por revisar y las evidencias faltantes. Incluirá avisos de calidad y una leyenda permanente: los importes son registros manuales informativos, no cálculo ni declaración fiscal.

## Reglas de no regresión

La Fase C no modifica transacciones históricas, cuentas, tarjetas, saldos, CxC o CxP. Sólo crea o actualiza los renglones fiscales manuales y sus vínculos. Las tarjetas PFAE sin entidad única conservan su regla de consolidación ya documentada.
