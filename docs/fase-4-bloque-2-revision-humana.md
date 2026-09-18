# Fase 4 — Bloque 2: revisión humana y separación de funciones

## Objetivo

Este bloque refuerza el trabajo compartido entre propietaria y colaboradoras sin convertir Meximoney en un sistema que ejecute operaciones. Un borrador financiero creado por una persona gestora debe seguir requiriendo una revisión humana independiente antes de entrar a las cifras confirmadas.

## Riesgos identificados

La auditoría encontró que una cuenta con permiso de revisión podía aprobar el mismo borrador que había creado, y que una cuenta con permiso de crear borradores podía intentar editar registros que no le pertenecían. Además, el flujo de devolución no exigía explicar qué debía corregirse.

## Controles implementables

| Control | Regla |
|---|---|
| Separación de funciones | Una persona colaboradora no puede aprobar ni devolver su propio borrador. La propietaria conserva la capacidad de revisar cualquier registro de su espacio. |
| Edición de borradores | Una persona colaboradora sólo puede editar sus propios borradores pendientes o devueltos; no puede editar registros ajenos ni registros ya aprobados. |
| Devolución explicable | Devolver un borrador exige un motivo breve y legible para que la persona creadora pueda corregirlo. |
| Historial por movimiento | Cada aprobación o devolución crea una entrada privada con acción, actor, fecha y comentario opcional o de devolución. |
| Edición no aprobatoria | Si la propietaria corrige un borrador colaborativo, conserva su estado pendiente; sólo el botón explícito de aprobación lo integra a las cifras confirmadas. |
| Sin ejecución financiera | Revisar sólo cambia el estado de revisión; no crea pagos, transferencias, inversiones, deudas ni movimientos adicionales. |

## Privacidad y retención

El historial pertenece al espacio de la propietaria y se filtra por `userId` y `transactionId`. Al borrar integralmente el espacio, se eliminan también estos eventos. El historial no expone contraseñas, secretos, archivos privados ni datos de otros espacios.

## Criterios de aceptación

Una cuenta colaboradora no puede aprobar ni devolver su propio borrador, ni editar un borrador creado por otra persona. La propietaria puede aprobar o devolver; una devolución sin motivo se rechaza. La revisión se conserva en una línea de historial visible junto al movimiento. Las acciones se prueban en el router, respetan el aislamiento por espacio y no alteran los importes ni los saldos.
