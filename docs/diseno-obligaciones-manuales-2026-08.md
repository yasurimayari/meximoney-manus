# Diseño — Vencimientos y obligaciones manuales

## Principios

El módulo conserva el enfoque manual: las fechas, saldos, tasas y cuotas sólo se muestran si la usuaria los registra. No consulta entidades financieras, no calcula tablas de amortización, no ejecuta pagos ni deriva obligaciones desde el SAT.

## Tarjeta departamental

La tabla de tarjetas añadirá `cardKind` con valores `bank_credit` y `departmental`. Las tarjetas existentes conservarán `bank_credit` como valor por defecto. La interfaz explicará que una tarjeta departamental como **Coppel** usa el mismo flujo protegido de gastos y pagos desde cuenta, pero queda etiquetada para diferenciarla de una tarjeta bancaria.

## Préstamos bancarios

La tabla de deudas conservará sus tipos existentes e incorporará un subtipo opcional para `personal`, `automotive` y `mortgage`. El formulario mostrará este subtipo sólo cuando aplique. Cada obligación conservará saldo, cuota manual, tasa anual opcional, próximo vencimiento y fecha final. Los pagos seguirán vinculándose a un movimiento existente y confirmado; sólo el principal reduce el saldo. Esta regla evita crear salidas de efectivo o intereses que la usuaria no haya registrado.

## Agenda de vencimientos y evidencia PFAE

La agenda fiscal leerá exclusivamente eventos manuales de tipo fiscal y la fecha fiscal futura del perfil. La página PFAE añadirá una lista de próximos vencimientos configurados y un acceso contextual para editar los renglones cuya evidencia esté pendiente. El acceso no enlaza documentos ni cambia renglones por sí mismo.
