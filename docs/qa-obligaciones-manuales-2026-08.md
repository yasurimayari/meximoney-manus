# QA técnica — Vencimientos y obligaciones manuales

## Comprobaciones completadas

La migración `0026_cloudy_rhino.sql` fue revisada y aplicada. Sólo añade `cardKind` a las tarjetas y `loanKind` a las deudas con valores predeterminados compatibles; no altera saldos, movimientos, fechas, documentos, ni obligaciones existentes.

Las verificaciones `pnpm check`, `pnpm test` y `pnpm build` finalizaron correctamente. La suite contiene 33 archivos y 92 pruebas. Se agregaron pruebas unitarias para la etiqueta departamental, las clases de préstamo y la agenda fiscal que excluye eventos no fiscales o cancelados.

La comprobación HTTP de `/calendario` respondió correctamente. La captura aislada del entorno de vista previa no recibe la sesión autenticada, por lo que se muestra en blanco tras la redirección de sesión de la vista previa; el navegador conectado agotó tiempo de respuesta antes de poder inspeccionar la sesión real. No se enviaron formularios ni se crearon, modificaron o vincularon tarjetas, préstamos, fechas, documentos o renglones PFAE durante la validación.

## QA publicada pendiente

Tras publicar, debe verificarse en sesión autenticada que el Calendario muestra la agenda fiscal mensual, que el acceso de evidencia abre el renglón correcto sin guardarlo, que Tarjetas permite elegir “departamental” y que Planificación presenta las tres clases de préstamo. Esta prueba no debe guardar datos reales salvo autorización explícita de la usuaria.
