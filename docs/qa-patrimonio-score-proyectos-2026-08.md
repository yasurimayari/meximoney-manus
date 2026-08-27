# QA — Patrimonio financiado, Score y Proyectos

## Alcance validado

Esta entrega incorpora estructuras y flujos para capturar **datos manuales confirmados por la propietaria**. No accede a bancos, Buró, SAT, proveedores de precios o cuentas externas; tampoco ejecuta pagos, transferencias, inversiones, notificaciones ni tareas programadas.

| Área | Validación aplicada | Resultado |
|---|---|---|
| Activo financiado | El formulario exige un valor de adquisición superior al anticipo y, cuando existe anticipo, una cuenta de origen activa en la misma moneda. | Correcto: crea activo, deuda y el traspaso patrimonial de anticipo dentro de una única operación de guardado. |
| Patrimonio | El valor actual del activo se conserva como activo y la financiación como pasivo independiente. | Correcto: Patrimonio expone ambos importes y su diferencia sin doble conteo. |
| Valuación | Se añadieron apreciación y depreciación manuales al historial de la posición. | Correcto: una depreciación reduce el valor y conserva el costo histórico. |
| SPF Score | La metodología contiene siete factores, rangos visibles y huecos de datos explícitos. | Correcto: no estima el score crediticio ni consulta fuentes externas; sólo usa el valor que la propietaria capture manualmente. |
| Proyectos | Se incluyen proyecto personal sin entidad, proyecto asociado, hitos, tareas, archivado y borrado protegido. | Correcto: las tareas se visualizan en Lista, Kanban y Calendario de Proyectos; con fecha, también se muestran en el Calendario financiero principal. |
| Plan de Notion | El plan histórico autorizado se presenta como borrador editable. | Correcto: no se importaron automáticamente importes, fechas, tareas, movimientos ni compromisos históricos. |

## Pruebas técnicas

La entrega pasó `pnpm check`, `pnpm test` y `pnpm build`. La suite informa **48 archivos correctos, 1 omitido; 131 pruebas correctas y 2 omitidas**. Las nuevas regresiones verifican la depreciación sin cambio de costo histórico y que el SPF no adjudica puntos por un score crediticio no registrado.

El aviso de tamaño de bundle superior a 500 kB permanece como advertencia de compilación preexistente, no como fallo. El servidor de desarrollo se reinició correctamente tras los cambios de esquema y no presenta errores recientes de aplicación.

## Integridad de datos

Las migraciones `0030`, `0031` y `0032` fueron revisadas antes de aplicarse. Son aditivas o amplían valores permitidos; no eliminan columnas ni registros existentes. La consulta de control posterior confirmó cero filas en `financedAssetPurchases`, `creditScoreRecords`, `personalScoreSnapshots` y `projectMilestones`. Por tanto, el desarrollo **no creó activos, deudas, transferencias, scores, proyectos, hitos ni tareas reales**.

## QA pendiente de la propietaria

La comprobación autenticada se deja intencionadamente para la propietaria, porque requeriría guardar información financiera personal. Para probar sin ambigüedad, puede crear primero un registro manual de ejemplo propio que desee conservar y revisar que el activo, el pasivo y la diferencia aparezcan separados. El borrador del plan de julio a diciembre debe revisarse y confirmarse sólo si continúa representando sus prioridades actuales.

Durante la comprobación pasiva inicial, una instalación PWA con shell anterior no reconocía aún la ruta nueva de Score. Se rotó el caché del worker a `meximoney-personal-shell-v3`, que eliminará el shell v2 durante la activación y permitirá descargar el cliente actualizado. La nueva comprobación publicada se realizará después de la propagación, sin iniciar sesión ni guardar datos.
