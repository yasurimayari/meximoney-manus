# QA — Rutina mensual y exportación PFAE

## Comprobación inicial publicada

La sesión autenticada abrió el Libro PFAE sin crear ni editar renglones. La vista conservó los importes en cero y el estado vacío esperado. Sin embargo, tras recorrer toda la página, aún no aparecieron los controles de **Rutina mensual PFAE** ni **Exportar CSV** correspondientes al checkpoint `fd430436`.

El comportamiento es consistente con un retraso de propagación del paquete publicado; no se activó ninguna descarga ni se guardó una rutina. La QA se repetirá en una URL nueva después de confirmar que el paquete publicado contiene los controles.

## Segundo intento tras propagación

La vista volvió a cargar correctamente en una URL nueva, pero el paquete servido todavía muestra la versión anterior del Libro PFAE: no contiene el botón de exportación ni la rutina mensual al final de la página. El navegador no mostró errores funcionales del Libro y no se modificó información. Se mantiene la QA abierta hasta que el paquete actualizado sea visible; las validaciones técnicas locales ya cubren la rutina y el contenido del CSV.

## Validación publicada tras estabilización del CDN

Después de la ventana adicional de propagación, la vista autenticada mostró **Exportar CSV**, la tarjeta **Rutina mensual PFAE**, los tres pasos manuales, el estado inicial «Rutina abierta», el área de notas y los controles «Guardar rutina abierta» y «Marcar periodo revisado». El botón de marcar revisión está condicionado a las tres confirmaciones, lo que se verificó visualmente sin seleccionar casillas, guardar estado ni activar una descarga. La advertencia de ausencia de cálculos tributarios y la nota de privacidad de la exportación permanecen visibles.
