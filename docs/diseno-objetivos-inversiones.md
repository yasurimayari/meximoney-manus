# Diseño — Objetivos vinculados con ahorro e inversiones

## Decisión de diseño

Cada posición de ahorro o inversión podrá vincularse de manera opcional con **un solo objetivo activo de la misma moneda**. Esto cubre el caso del fondo de emergencia sin crear aportaciones, movimientos ni valuaciones duplicadas. Una posición que financie varios fines deberá dividirse en posiciones manuales separadas hasta que exista una futura asignación porcentual explícita y verificable.

> La posición es el activo económico y el objetivo es el propósito. Vincularlos permite ver su relación, pero no mueve dinero ni modifica la valuación de ninguno de los dos.

## Progreso visible y prevención de doble conteo

El avance del objetivo distinguirá entre el **saldo manual del objetivo** y el **valor de las posiciones vinculadas**. El progreso combinado se mostrará como ambos importes sumados sólo para orientar la meta.

| Concepto | Fuente | Efecto sobre patrimonio | Efecto sobre el objetivo |
|---|---|---|---|
| Saldo manual | `currentCents` del objetivo | Ninguno adicional. | Conserva el importe capturado manualmente. |
| Posición vinculada | Valor manual actual de ahorro o inversión. | Continúa apareciendo una sola vez en patrimonio. | Se visualiza como capital que respalda la meta. |
| Aportación de inversión | Historial de operaciones de la posición. | Actualiza la posición según las reglas existentes. | Aparece en el historial de la posición; no crea un segundo aporte al objetivo. |

Para evitar un doble conteo, la interfaz advertirá que el saldo manual del objetivo **no debe incluir** el valor de una posición ya vinculada. El sistema no reducirá ni reescribirá importes anteriores de forma automática.

## Reglas de integridad

La vinculación exige que objetivo y posición pertenezcan al mismo espacio privado y tengan la misma moneda. No es necesario que compartan entidad, proyecto o ámbito, ya que una meta personal puede respaldarse con una posición sin entidad; esos datos continúan visibles para revisión. Eliminar, pausar o cerrar una posición no altera el objetivo: sólo deja de aportar valor activo al resumen vinculado.

## Alcance de esta entrega

La vista de **Ahorro e inversiones** permitirá elegir o retirar el objetivo vinculado al editar una posición. La vista de **Planificación → Objetivos** mostrará las posiciones respaldantes, su valor actual y un progreso separado del saldo manual. No se modificará el valor de inversiones, las operaciones, el patrimonio, movimientos históricos ni el saldo manual del objetivo.
