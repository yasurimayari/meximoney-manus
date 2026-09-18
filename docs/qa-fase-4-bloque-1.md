# QA técnica — Fase 4, bloque 1

**Fecha:** 17 de septiembre de 2026

La revisión visual técnica de `/espacio` se ejecutó en escritorio a 1280×720 y móvil a 375×812. La captura de escritorio mostró la pantalla de redirección deliberada hacia el dominio publicado, porque la vista previa técnica no comparte la sesión autenticada. La captura móvil mostró el esqueleto de carga previo a esa misma barrera de sesión. Por tanto, estas capturas confirman que la protección de la sesión permanece activa, pero no pueden renderizar los elementos privados de colaboración.

La validación funcional se cubrió mediante pruebas de router para bloquear a una persona no propietaria de administrar invitaciones, aceptar sólo la invitación dirigida al correo autenticado, rechazar correos ajenos y registrar la aceptación o revocación en la bitácora. La suite completa y la compilación de producción se ejecutaron correctamente. La comprobación visual autenticada de la pantalla Espacio queda disponible en el dominio publicado para la propietaria antes de invitar a una persona real.
