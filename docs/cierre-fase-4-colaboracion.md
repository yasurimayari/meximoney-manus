# Cierre de Fase 4 — colaboración, permisos y auditoría

**Fecha de cierre:** 18 de septiembre de 2026  
**Checkpoints de referencia:** `82d016af` y `cedcef48`

La Fase 4 queda cerrada para el uso personal actual de Meximoney. La colaboración se mantiene deliberadamente acotada: la propietaria controla su espacio financiero y puede invitar por correo a una persona gestora o revisora. La invitación sólo puede aceptarse desde la cuenta cuyo correo coincide, y la revocación elimina el acceso efectivo sin alterar los datos financieros históricos.

| Área | Control final | Límite de seguridad |
|---|---|---|
| Invitaciones | Creación, actualización, reactivación, aceptación explícita y revocación. | Sólo la propietaria administra invitaciones. |
| Mínimo privilegio | Gestores y revisores no reciben el directorio de otras personas invitadas ni la bitácora de la propietaria. | El acceso se resuelve por cuenta, correo aceptado y `ownerId`. |
| Borradores | Una colaboradora sólo edita sus propios borradores no aprobados. | No edita registros de otra persona ni registros aprobados. |
| Revisión | Una colaboradora no revisa su propio borrador; la devolución exige un motivo. | La edición de la propietaria no aprueba implícitamente un borrador colaborativo. |
| Auditoría | Bitácora de acceso y decisiones privadas por movimiento con actor, rol, fecha y nota. | No se guardan importes adicionales, secretos, archivos ni contenido financiero ajeno. |
| Retención | El borrado integral elimina invitaciones y ambos historiales de auditoría. | No quedan eventos huérfanos del espacio eliminado. |

> La colaboración no habilita pagos, transferencias, inversiones, borrados automáticos ni sincronización externa. Toda operación financiera continúa requiriendo una acción explícita y la validación de permisos correspondiente.

## Fase 6: condición de reactivación

La evaluación de automatización bancaria e integraciones externas queda **intencionalmente aplazada**. No se activa ninguna conexión por defecto. Se retomará únicamente después de uso real sostenido de la aplicación y de una solicitud explícita que defina el proveedor, los datos permitidos, el consentimiento, los costes, el periodo de prueba y el plan de revocación. Mientras tanto, CSV, conciliación manual, avisos internos y exportaciones permanecen como los mecanismos operativos de menor riesgo.
