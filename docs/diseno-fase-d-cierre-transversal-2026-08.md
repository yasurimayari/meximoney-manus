# Diseño — Fase D: cierre y control mensual transversal

## Objetivo

La Fase D concentrará en una sola rutina mensual los elementos que ya existen en Meximoney y que requieren revisión humana. Será una vista de **lectura, confirmación manual y trazabilidad**; no sustituirá las páginas de Registros, Calendario, Tarjetas, Planificación, Libro PFAE, Patrimonio o Estados.

> El control mensual no aprobará movimientos, cerrará estados, completará eventos, pagará obligaciones ni registrará datos en nombre de la usuaria. Cada acción seguirá siendo explícita.

## Fuentes auditadas

| Fuente existente | Hallazgo | Uso en el cierre transversal |
|---|---|---|
| Bandeja de revisión | Muestra borradores y movimientos pendientes de revisión | Confirmar que no queden movimientos sin revisar en el periodo |
| Calidad de datos | Reúne alertas de categoría, cuenta, conversión, transferencias y valores manuales | Indicar alertas abiertas y enlazar a la corrección original |
| Calendario | Muestra eventos manuales, tareas, documentos, deudas y fechas fiscales | Mostrar vencimientos del mes como referencias de lectura |
| Tarjetas y deudas | Conservan saldo, corte, pago, vencimiento y sobregiro manual | Exponer obligaciones del mes, sin ejecutar pagos |
| Libro PFAE | Conserva renglones, rutina y fechas fiscales manuales | Indicar estado de revisión y pendientes del periodo; no calcular impuestos |
| Estados mensuales | Guarda fotografías de flujo, activos, pasivos y patrimonio | Indicar si existe un cierre financiero para el periodo, sin cerrarlo automáticamente |
| Revisiones mensuales | Ya guarda periodo, estado, observaciones y siguientes acciones | Reutilizarla como registro narrativo y de estado de la rutina transversal |

## Decisiones de diseño

La nueva vista se llamará **Control mensual** y utilizará un periodo mensual consolidado. Permitirá revisar seis bloques: movimientos, calidad, agenda y vencimientos, tarjetas y deudas, PFAE y fotografía patrimonial. Cada bloque mostrará un conteo o estado derivado de los datos existentes y un enlace a su fuente.

La confirmación de cada bloque será **manual y persistente**. Se añadirá una tabla privada de confirmaciones vinculada a la revisión mensual del periodo. La usuaria podrá marcar o desmarcar cada bloque, escribir observaciones y siguientes acciones, y escoger el estado `borrador`, `revisada` o `cerrada`. Ningún estado se deducirá por la aplicación.

## Modelo técnico

Se reutilizará `monthlyReviews` como registro narrativo del periodo, puesto que ya conserva el estado, observaciones, siguientes acciones y los totales manuales del flujo. La nueva tabla privada `monthlyReviewControls` tendrá una fila por revisión y sólo almacenará seis confirmaciones humanas: `transactionsConfirmed`, `qualityConfirmed`, `calendarConfirmed`, `obligationsConfirmed`, `fiscalConfirmed` y `patrimonyConfirmed`. Sus valores iniciales serán `false` y el único momento de cambio será la acción explícita de guardar.

El `getFinanceSnapshot` incluirá esas confirmaciones en el mismo conjunto privado que ya sirve al Panel y a Planificación. Un procedimiento tRPC específico creará o actualizará la revisión mensual y su checklist en una transacción lógica de usuario. Si no existe revisión para el periodo, se creará como `borrador` cuando la usuaria presione **Guardar control**; la sola consulta de la página nunca crea registros.

| Criterio de aceptación | Límite explícito |
|---|---|
| El periodo se guarda en UTC al primer día del mes y se presenta localmente | No se infieren fechas fiscales ni vencimientos externos |
| Las confirmaciones quedan aisladas por usuario y por revisión mensual | No se alteran movimientos, saldos, tarjetas, deudas ni estados existentes |
| Los enlaces permiten resolver el pendiente en su fuente original | No se aprueban movimientos ni se completan eventos desde la vista |
| El estado de la rutina sólo cambia por selección humana | No hay cron, recordatorios externos ni pagos automáticos |

## Alcance excluido

Este bloque no implementa banca conectada, importación automática, cálculos o declaraciones fiscales, CFDI, pagos, conciliación bancaria automática, alertas externas nuevas ni uso de IA para cambiar datos financieros.
