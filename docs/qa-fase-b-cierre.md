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
