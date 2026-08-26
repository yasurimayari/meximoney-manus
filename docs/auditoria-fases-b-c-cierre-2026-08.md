# Auditoría de cierre — Fases B y C de Meximoney

**Fecha:** 26 de agosto de 2026  
**Método:** contraste entre alcance aprobado, contratos tRPC, pruebas automatizadas, compilación y QA con sesión autenticada sin crear ni modificar datos financieros.

## Fase B — Hallazgos iniciales

La revisión de contratos confirma que la captura rápida sólo devuelve un borrador y no escribe movimientos; las plantillas requieren una acción manual `applyNow`; y las importaciones se previsualizan, marcan coincidencias potenciales y bloquean duplicados salvo aceptación explícita. La compilación y regresión completas finalizaron correctamente con 88 pruebas.

La QA publicada se dirigió inicialmente a `/registros`, una ruta inexistente; la ruta vigente de la vista denominada «Registros» es `/movimientos`. En esta última se verificaron los accesos a Captura rápida, Importar CSV/Excel y Plantilla recurrente, los filtros transversales, la plantilla existente y la advertencia visible de que las plantillas sólo crean movimientos cuando la usuaria las aplica. No se abrió ningún flujo de guardado, importación o aplicación.

No se identificó un pendiente funcional de Fase B que requiera corrección: el desajuste detectado fue sólo el nombre visible frente a la ruta interna de la aplicación y no afecta la navegación del menú ni los flujos publicados.

## Fase C — Revisión pendiente

La vista publicada de Libro PFAE muestra el control manual obligatorio, el selector mensual, métricas separadas de facturado, cobros conciliados, cobros por conciliar, base e IVA registrados, y un estado vacío sin renglones fiscales. La leyenda visible confirma que no calcula IVA/ISR ni presenta declaraciones.

El formulario «Nuevo renglón fiscal» se abrió sin guardar y expuso los campos manuales previstos: periodo, soporte, descripción, referencia, moneda, importe, base, IVA, área, fechas, deducibilidad, estado de revisión y vínculos a entidad/proyecto. El diálogo reafirma que no calcula impuestos, no genera CFDI y no presenta declaraciones. No se ingresó ni se persistió dato alguno durante la revisión.

Durante la auditoría se detectó que el servidor verificaba los vínculos a movimiento, CxC, contacto y documento, pero no verificaba explícitamente la pertenencia y coherencia de entidad/proyecto. Se reforzó el procedimiento: ambos vínculos ahora deben pertenecer al espacio privado y, si se informan juntos, el proyecto debe pertenecer a la entidad elegida. Cuando se informa sólo un proyecto válido, su entidad queda alineada de forma determinista en el renglón fiscal. La corrección no modifica movimientos, CxC, CxP, saldos, tarjetas ni renglones históricos; sólo protege nuevos guardados o ediciones. Los tipos, la regresión automatizada y la compilación de producción finalizaron correctamente.
