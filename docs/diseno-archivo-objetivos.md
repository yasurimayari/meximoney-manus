# Diseño — Edición y archivado de objetivos

## Regla de archivado

Un objetivo archivado conserva todos sus campos, saldo manual, fecha, notas y posiciones vinculadas. Técnicamente usa el estado histórico `cancelled`; no se elimina ningún registro y no se cambia `investments.goalId`.

| Acción | Resultado | Datos que se conservan |
|---|---|---|
| Editar | Actualiza los campos manuales del objetivo. | Posiciones vinculadas, operaciones, valor de inversiones y patrimonio. |
| Archivar | Lo retira de objetivos activos y de los nuevos selectores de vínculo. | Saldo, meta, notas, historial y relaciones existentes. |
| Restaurar | Devuelve el objetivo al estado activo. | Todos los datos originales y sus posiciones vinculadas. |

## Prevención de efectos financieros

Editar o archivar un objetivo nunca ejecuta movimientos, no altera el valor de una inversión ni cambia patrimonio. Las posiciones que permanecen vinculadas a un objetivo archivado siguen registradas y visibles desde Ahorro e inversiones, pero no se ofrecen para nuevas vinculaciones hasta que el objetivo se restaure.
