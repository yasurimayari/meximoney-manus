# QA técnica — Vencimientos y obligaciones manuales

## Comprobaciones completadas

La migración `0026_cloudy_rhino.sql` fue revisada y aplicada. Sólo añade `cardKind` a las tarjetas y `loanKind` a las deudas con valores predeterminados compatibles; no altera saldos, movimientos, fechas, documentos, ni obligaciones existentes.

Las verificaciones `pnpm check`, `pnpm test` y `pnpm build` finalizaron correctamente. La suite contiene 33 archivos y 92 pruebas. Se agregaron pruebas unitarias para la etiqueta departamental, las clases de préstamo y la agenda fiscal que excluye eventos no fiscales o cancelados.

La comprobación HTTP de `/calendario` respondió correctamente. La captura aislada del entorno de vista previa no recibe la sesión autenticada, por lo que se muestra en blanco tras la redirección de sesión de la vista previa; el navegador conectado agotó tiempo de respuesta antes de poder inspeccionar la sesión real. No se enviaron formularios ni se crearon, modificaron o vincularon tarjetas, préstamos, fechas, documentos o renglones PFAE durante la validación.

## QA publicada

La QA autenticada se realizó en el dominio publicado sin enviar formularios. En Calendario, la agenda fiscal mensual mostró su estado vacío correcto y el botón “Añadir fecha fiscal” abrió un evento nuevo con el tipo “Fiscal” preseleccionado. No se guardó ningún evento.

En Tarjetas, la vista conservó las cuatro tarjetas existentes y sus saldos, ámbitos, fechas y sobregiros visibles. El formulario “Nueva tarjeta” mostró la clase “Tarjeta departamental (ej. Coppel)” sin crear un registro. En Planificación, Deudas mostró su estado vacío preexistente y el formulario ofreció “Préstamo bancario”, “Préstamo hipotecario” y las clases “Personal”, “Automotriz”, “Hipotecario” y “Sin especificar”. No se creó deuda ni pago.

En el Libro PFAE, el renglón existente “Factura de gasolina” continuó mostrando los valores registrados y el estado de evidencia pendiente. El acceso “Vincular evidencia existente” abrió exactamente el formulario de ese renglón, con sus valores conservados. No se eligió documento ni se guardó el formulario; por tanto, el renglón y sus vínculos permanecieron intactos.
