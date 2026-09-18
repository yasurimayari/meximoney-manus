# QA técnica — Fase 4, bloque 2

**Fecha:** 18 de septiembre de 2026

Se validó la separación de funciones en el router: una persona colaboradora con permiso de revisión no puede aprobar ni devolver su propio borrador, no puede editar borradores creados por otra persona y no puede editar un movimiento aprobado. La devolución exige un motivo de al menos tres caracteres y la aprobación o devolución registra actor, rol, fecha y nota en un historial privado por movimiento.

La regresión específica pasó con 43 pruebas en los routers financieros y privacidad. La suite completa pasó con 303 pruebas aprobadas y 2 omitidas en 102 archivos. `pnpm check`, `pnpm build`, `node --check client/public/sw.js` y `git diff --check` terminaron correctamente. La migración 0061 crea únicamente la tabla e índices del historial de revisión, sin operaciones destructivas.

La captura de `/revision` se solicitó en escritorio y móvil. Si la vista previa técnica no comparte sesión autenticada, se mantiene la redirección al dominio publicado y la comprobación visual privada debe realizarse con la cuenta de la propietaria en el dominio publicado.


Las capturas técnicas de `/revision` devolvieron el esqueleto de carga en escritorio y una vista vacía durante la inicialización en móvil; no compartieron una sesión autenticada que permitiese evaluar datos privados reales. No se interpretan como fallo de la pantalla protegida. La prueba visual funcional debe completarse con la sesión de la propietaria en el dominio publicado.
