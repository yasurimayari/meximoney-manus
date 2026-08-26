# Diseño — Historial privado de recuperación y estado del correo

## Principio de mínima exposición

El historial conservará únicamente eventos de recuperación vinculados a una cuenta existente: fecha, tipo de evento, resultado y el canal genérico **correo**. No almacenará tokens, hashes de token, contraseñas, enlaces, direcciones de correo, direcciones IP ni encabezados del navegador.

| Evento | Resultado posible | Visible para la usuaria |
|---|---|---|
| Solicitud de recuperación | Solicitud recibida | Fecha y canal correo. |
| Entrega al proveedor | Enviada | Fecha y confirmación técnica de envío al proveedor. |
| Fallo de proveedor | No enviada | Fecha y aviso no sensible; no detalla si la cuenta existe. |
| Uso de enlace | Contraseña actualizada | Fecha de actualización, sin revelar la nueva contraseña. |

## Aislamiento y estado técnico

Los eventos se consultan exclusivamente mediante un procedimiento protegido y filtrado por `userId`. El estado del canal se deriva del interruptor de servidor `PASSWORD_RESET_EMAIL_ENABLED`; por diseño no intenta consultar ni exponer claves de Resend. La interfaz lo denomina **Canal habilitado** o **Canal no disponible**, en vez de afirmar un estado de DNS que el servidor no verifica continuamente.

> El historial es una ayuda de seguridad personal; no es un registro forense ni una garantía de entrega final en la bandeja de correo.

## Ubicación

La sección se integrará en **Calidad, perfil y privacidad** bajo el bloque “Seguridad de acceso”. Allí se mostrará el estado técnico, el canal usado, la actividad reciente y la recomendación de cambiar contraseña si aparece una solicitud no reconocida.
