# Auditoría inicial — Amortización, Score, Proyectos y UX

## Hallazgos de interfaz de la captura compartida

La revisión por cortes de la captura panorámica confirma que el menú lateral actual es una lista plana de módulos y que la cabecera de **Movimientos y recursos** concentra título, explicación, acciones de texto y tarjetas de alta en el mismo plano visual. Las acciones secundarias —captura rápida, importación y plantilla— compiten con el alta de registro, y la descripción superior repite detalles ya comunicados por las tarjetas de operación.

| Hallazgo | Cambio previsto |
|---|---|
| Menú lateral plano | Agrupar módulos en bloques colapsables, sin perder enlaces directos ni la configuración personal del pie. |
| Acciones secundarias verbosas | Convertir captura, importar y plantilla en iconos con nombre accesible y ayuda emergente; conservar etiqueta completa en las acciones de alto riesgo o ambiguas. |
| Encabezado con demasiadas capas | Usar una cabecera más breve: etiqueta, título y una sola frase de propósito; desplazar instrucciones específicas a los formularios o ayudas contextuales. |
| Tarjetas de alta | Mantener la selección visible de tipo de operación, separada de las acciones de captura o importación. |

## Base funcional y límites

La tabla de amortización será una proyección editable y explicable, no un cálculo bancario ni una instrucción de pago. Cada cuota distinguirá capital, interés ordinario, interés vencido y cargos únicamente cuando la propietaria los haya capturado o confirmado. Los atrasos no modificarán de forma silenciosa el saldo histórico ni generarán pagos automáticos.

El score crediticio seguirá siendo una cifra introducida manualmente. La interfaz mostrará los rangos cromáticos de la publicación de Buró de Crédito revisada: rojo de 356 a 577, naranja de 587 a 659, amarillo de 660 a 696 y verde de 697 a 848; la propia fuente no asigna ni consulta el valor individual de la usuaria. [1]

## Decisiones de diseño aprobadas para la implementación

| Bloque | Regla de producto | Salvaguarda |
|---|---|---|
| Amortización | La tabla combina el historial de cuotas conciliadas con una proyección de referencia calculada desde el saldo, tasa anual y pago mensual que la usuaria capture. | La proyección no edita saldos ni registra pagos; estará señalada como escenario, no como estado bancario. |
| Interés vencido | Un cargo ordinario, moratorio o comisión se registra manualmente con fecha, importe y nota; incrementa el saldo sólo tras guardar explícitamente el cargo confirmado. | No se calcula ni capitaliza interés vencido de forma automática. |
| Cuota pagada | Cada cuota desglosa capital, interés ordinario, interés vencido y cargos. La suma debe coincidir con el pago total y sólo el capital reduce el saldo. | El gasto real vinculado se conserva como registro único; no se duplica el gasto. |
| Histórico de Score | La gráfica utiliza dos series: cortes SPF manuales de 0 a 1,000 y registros crediticios manuales. Cada punto conserva su propia fecha de captura. | Sin consulta a Buró, predicción ni imputación de meses sin datos. |
| Rango crediticio | Rojo 356–577, naranja 587–659, amarillo 660–696 y verde 697–848, tal como los publica la fuente indicada. Las puntuaciones en huecos o fuera de rango se marcan como no clasificadas. | El color describe el rango publicado, no una recomendación crediticia. |
| Progreso de proyecto | Progreso = tareas completadas o archivadas / tareas no canceladas. Un proyecto sin tareas muestra 0% y se mantiene visible. | Archivar una tarea se interpreta como cerrarla para seguimiento, no como completar una obligación financiera. |
| Vistas de proyecto | Lista, Kanban y Calendario parten del mismo conjunto de proyectos, hitos y tareas. Los tres muestran también proyectos sin tareas y heredan el color del proyecto. | No se generan eventos financieros o tareas automáticamente. |
| PDFs | El formulario permite adjuntar voluntariamente un PDF por documento; se guardan metadatos y la referencia segura, mientras los bytes van a almacenamiento de archivos. | Sólo PDF, límite de tamaño visible, sin caché PWA y sin lectura/OCR del contenido. |
| Navegación | El lateral se organiza en Resumen, Registro, Dinero, Planificación, Análisis y Gestión; configuración permanece en el perfil inferior. | Cada ruta actual conserva acceso directo y etiqueta accesible en modo expandido o contraído. |

La reorganización de controles conserva texto en acciones que crean, eliminan, archivan, confirman o pueden ser ambiguas. Sólo las acciones secundarias de captura rápida, importación y plantilla recurrente se convierten en iconos cuando estén acompañadas por etiqueta accesible y ayuda emergente.

## Referencias

[1]: https://www.burodecredito.com.mx/generales/blog/todo-sobre-bur%C3%B3/tu-mi-score-de-riesgo-crediticio-ha-cambiado-como-quedo-tu-puntuacion.html "Buró de Crédito — Tu Mi Score de riesgo crediticio ha cambiado"
