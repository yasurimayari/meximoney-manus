# Diseño — Patrimonio financiado, Score y Proyectos

**Fecha:** 27 de agosto de 2026  
**Alcance:** registro manual de activos adquiridos con anticipo y financiación, score crediticio y de progreso financiero, y proyectos financieros con tareas.  
**Límite:** la aplicación no valora activos automáticamente, no consulta Buró, no ejecuta pagos ni crea tareas, eventos o movimientos desde las páginas históricas sin confirmación de la propietaria.

> El activo y su deuda son dos hechos distintos. El patrimonio muestra el valor manual vigente del activo como activo y el saldo pendiente de la financiación como pasivo; la diferencia es su patrimonio neto asociado. Así se evita mostrar como patrimonio propio el importe todavía adeudado.

## Registro de una compra financiada

| Paso manual | Registro en Meximoney | Efecto contable en la app |
|---|---|---|
| 1. Definir la adquisición | Crear un activo patrimonial de tipo **vehículo**, **vivienda** o terreno/otro; indicar valor de adquisición, fecha y valor vigente. | Incorpora el activo al patrimonio a su valor manual. |
| 2. Registrar el anticipo | Seleccionar cuenta de origen e importe pagado al momento de la compra. Se conserva como desembolso de adquisición, no como gasto operativo recurrente. | Documenta la salida de efectivo sin sumar otra vez el activo. |
| 3. Registrar la financiación | Crear una deuda vinculada de tipo **automotriz**, **hipotecaria** o **compra financiada** con saldo inicial, cuota, tasa opcional y próximo vencimiento. | Incorpora el pasivo separado y permite sus pagos parciales. |
| 4. Actualizar valor | Registrar una actualización manual de valor. Para vehículo puede ser depreciación; para vivienda puede ser apreciación o una corrección. | Modifica sólo el valor actual del activo, nunca el costo de adquisición ni la deuda. |
| 5. Pagar cuotas | Vincular un gasto real aprobado desde la cuenta de origen y señalar qué parte reduce principal. | Reduce sólo el saldo de la financiación por el principal registrado. |

La aplicación exigirá que **anticipo + financiación = valor de adquisición**. El anticipo puede ser cero; en ese caso la adquisición sigue siendo válida, siempre que exista financiación por el total. Las cuentas bancarias mantienen su saldo manual, por lo que después de registrar el flujo se debe actualizar su valor sólo cuando la usuaria cuente con el dato real.

## Score crediticio y SPF

El score crediticio es un dato **manual**, con fecha de consulta y fuente opcional. Meximoney no consulta ni infiere un score de Buró. El SPF toma como punto de partida la fórmula histórica de Notion: patrimonio neto, utilización promedio de tarjetas, score crediticio manual, fondo de emergencia, flujo del periodo, hábito de registro y pagos de deuda.[1]

| Factor SPF | Máximo | Fuente en Meximoney | Regla transparente |
|---|---:|---|---|
| Patrimonio neto | 200 | Patrimonio neto en MXN | Escalones configurables; inicialmente se mantienen los de la versión histórica. |
| Utilización de tarjetas | 200 | Saldos y límites manuales de TDC | Promedio ponderado: saldo utilizado / límite total. |
| Score crediticio | 150 | Registro manual de score | Sin un dato actualizado, los puntos quedan pendientes, no se inventan. |
| Fondo de emergencia | 150 | Objetivo de emergencia y/o valor indicado manualmente | Meta predeterminada editable de $60,000 MXN. |
| Flujo positivo | 100 | Cierre o flujo manual del periodo | Otorga puntos sólo si ingresos superan gastos del periodo elegido. |
| Hábito de registro | 100 | Movimientos manuales de los últimos 7 días | Se explica la ventana y el conteo utilizado. |
| Pago mensual de deuda | 100 | Pagos de principal registrados en 30 días | Mide pagos registrados frente a deuda inicial visible; no presume pagos. |

Los cortes históricos se guardarán **sólo al pulsar «Guardar corte de score»**. Así la gráfica refleja decisiones y datos manuales revisados, no una captura automática ni notificaciones de fondo. La página incluirá el total, nivel, factores, evidencia faltante, fórmula y evolución.

## Proyectos financieros y Calendario

Cada proyecto tendrá propósito, entidad, ámbito, fecha de inicio/meta, estado y color. Sus **partes** serán hitos editables y archivables; sus tareas tendrán prioridad, estado de tablero, fecha, objetivo/deuda opcionales y notas. Las vistas serán lista, tablero Kanban y calendario. El tablero reutiliza estados explícitos: pendiente, en curso, esperando, completada o archivada.

| Acción | Comportamiento |
|---|---|
| Editar | Cambia campos manuales de proyecto, hito o tarea sin tocar movimientos, deudas o metas vinculadas. |
| Archivar | Oculta el elemento de las vistas activas y conserva su trazabilidad y vínculos históricos. |
| Eliminar | Sólo se permite cuando no se perderían datos financieros vinculados; de otro modo la interfaz explica que se archive. Al borrar una tarea, los eventos manuales vinculados permanecen y se desvinculan. |
| Calendario | Las tareas con fecha aparecen en el calendario. Editar la tarea cambia su fecha/estado desde Proyectos; el evento manual puede mantener su propio contenido y vínculo. |

## Integración del plan Jul–Dic 2026

El plan de Notion se tratará como una **plantilla revisable**, no como fuente de datos financieros vigentes. Contiene importes, saldos, tasas, acciones y fechas de julio–diciembre de 2026 que pueden haber cambiado. La pantalla preparará un borrador legible con sus fases, reglas y acciones; la propietaria elegirá explícitamente qué partes, tareas y fechas guardar. No se crearán registros, eventos, pagos ni movimientos sólo por leer Notion.[2]

## Referencias

[1] [SPF Score — de Progreso Financiero, Notion](https://app.notion.com/p/7b18651b387444b1b497b08339376bf7)  
[2] [Plan Financiero Jul–Dic 2026 · Ingresos Irregulares, Notion](https://app.notion.com/p/6db95fd49ae448b88d42857e50dd23c0)
