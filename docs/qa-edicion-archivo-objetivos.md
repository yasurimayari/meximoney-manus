# QA — Edición y archivado de objetivos

## Hallazgo inicial de publicación

Tras guardar el checkpoint `3a8349c8`, la sesión autenticada abrió Planificación → Objetivos con el objetivo Fondo de Emergencia y su capital vinculado correctamente visibles. Sin embargo, el botón mostrado en la pantalla servida aún tenía la etiqueta accesible **Eliminar objetivo**, propia de la versión anterior, en lugar de las acciones nuevas **Editar** y **Archivar**.

No se pulsó ese botón ni se modificaron datos financieros. Se requiere comprobar de nuevo el dominio publicado tras la propagación del paquete antes de cerrar la QA de este cambio.

Una recarga forzada posterior a la espera inicial siguió mostrando la versión anterior. Después de esa comprobación llegó la confirmación de despliegue del dominio, por lo que la siguiente recarga debe validarse contra el paquete recién propagado.

La inspección directa del paquete JavaScript servido por el dominio confirmó que contiene las cadenas **Archivar**, **Restaurar** y **Objetivos archivados**. Aun así, la sesión de navegador seguía exponiendo la acción previa en la pestaña Objetivos. No se ejecutaron acciones de edición ni archivado. La diferencia se tratará como estado transitorio de caché de la sesión hasta realizar una comprobación nueva en el paquete actualizado.

## Validación publicada completada

Una navegación nueva contra el paquete ya propagado mostró correctamente las acciones **Editar Fondo de Emergencia** y **Archivar Fondo de Emergencia**, junto con el panel **Objetivos archivados**. Al abrir Editar, el formulario cargó los campos existentes de nombre, tipo, ámbito, entidad, proyecto, moneda, meta, saldo manual, aportación, fecha, prioridad y notas. El diálogo informa que no modifica posiciones, aportaciones ni patrimonio.

La QA no guardó el formulario ni archivó el objetivo real, para no alterar información financiera de la usuaria durante la validación. Las pruebas Vitest cubren que el archivado conserva los importes y sólo actualiza el estado del objetivo.

El formulario se cerró sin guardar. La pantalla regresó al objetivo activo con sus valores manuales y la posición vinculada intactos. La comprobación manual y las 74 pruebas se consideran suficientes para esta entrega, sin usar el objetivo real como dato de prueba para archivar y restaurar.
