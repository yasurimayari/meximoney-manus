# QA — Cierre de Fase B

## Alcance publicado pendiente de propagación

La versión candidata incorpora dos controles a la vista **Registros**:

| Control | Protección de datos |
|---|---|
| Plantillas recurrentes | Crear, editar, pausar, eliminar y aplicar sólo tras una confirmación explícita. Una plantilla no genera movimientos por sí misma. |
| Captura rápida por texto | Envía sólo el texto que la usuaria introduce al extractor estructurado del servidor. Devuelve un borrador sin guardar; la usuaria revisa el formulario completo antes de confirmar un movimiento. |

## Validación técnica

La compilación de tipos, la regresión de 27 archivos y 68 pruebas Vitest, y una instancia local de producción respondieron correctamente. La prueba nueva verifica que el borrador rechaza importe, moneda, fecha y ámbito ambiguos para forzar revisión humana.

## Publicación

El checkpoint inicial encontró un rechazo temporal de cuota de creación de compilaciones de infraestructura. La aplicación publicada continúa disponible con la versión anterior, sin HTTP 500 y sin cambios de datos. La verificación visual de los controles nuevos se repetirá cuando la publicación se propague; no se crearán movimientos ni plantillas de prueba durante esa QA.

Tras respetar una ventana adicional de propagación, el dominio aún sirvió el paquete anterior. Se realizará un único reintento controlado de publicación y se verificará el paquete antes de interactuar con la interfaz publicada.

La publicación se propagó correctamente después de esa espera. La ruta autenticada de Registros muestra los accesos «Captura rápida», «Importar CSV/Excel» y «Plantilla recurrente», además de la sección de plantillas en estado vacío. Al abrir Captura rápida se confirma el texto de privacidad, la advertencia de no introducir secretos y que ningún movimiento se guarda antes de una revisión posterior.

Al probar la propuesta con el ejemplo no sensible «Pagué 349 pesos de Notion hoy», la interfaz devolvió el aviso «No fue posible interpretar el texto». No se creó ningún movimiento ni se modificó información financiera. El error se investigará y corregirá antes de cerrar la validación de Fase B.

La causa fue un límite único de salida aplicado a un modelo GPT con razonamiento interno: los tokens se agotaban antes de devolver el JSON estructurado. El helper del servidor ahora admite el límite específico de finalización de GPT y la captura usa razonamiento mínimo con una reserva de salida visible. Una llamada de comprobación con el mismo ejemplo devolvió contenido estructurado, y `pnpm check` junto con las 68 pruebas volvió a finalizar correctamente. Falta republicar y repetir la validación visual sin guardar el borrador.

Tras la publicación de la corrección, la vista autenticada volvió a cargar y el diálogo de Captura rápida abrió correctamente. La validación final repite únicamente el ejemplo no sensible para confirmar la propuesta y se cierra antes de cualquier botón de guardado.

La propuesta corregida se generó correctamente para el ejemplo no sensible: identificó un gasto de $349.00, fecha de la prueba, confianza del 92 % y ámbito pendiente de confirmar. La interfaz lo presentó como «Borrador sin guardar» y ofreció únicamente «Revisar en formulario antes de guardar». No se abrió el formulario ni se confirmó ningún movimiento; el contador permaneció en siete registros.

El formulario de nueva plantilla recurrente también cargó correctamente sin persistir una plantilla de prueba. Expone nombre, tipo, frecuencia, importe, moneda, próxima fecha, estado activo o en pausa, contacto, cuenta, entidad, proyecto, categoría, ámbito y notas. Su texto confirma que las plantillas no crean movimientos automáticos y que la usuaria decide cuándo aplicarlas. Con ello se valida el flujo de gestión visible y la captura rápida revisable de Fase B, sin cambios en los siete movimientos existentes.
