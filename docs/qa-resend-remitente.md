# QA — Remitente de recuperación por correo

## Estado actual

La revisión más reciente del panel autenticado de Resend muestra el dominio `mexi.richeon.app` con estado **Failed**. Los CNAME `rsend.mexi` y `send.mexi` figuran como **Verified**, pero Resend reporta que el TXT DKIM `resend._domainkey.mexi` sigue ausente. La clave configurada para la aplicación es de envío restringido y no permite consultar dominios por API; la revisión visual del panel es la evidencia actual.

Por ello, Meximoney mantiene bloqueado el envío real de recuperación de contraseña. La interfaz, los tokens de un solo uso y la expiración segura permanecen implementados, pero no se habilitará el canal hasta que el dominio aparezca como **Verified** y se valide una entrega controlada.

## Acción requerida

Se debe revisar en el proveedor DNS que el registro TXT se haya añadido con el nombre y el valor exactos que muestra Resend, sin duplicar el sufijo del dominio ni dejar el valor truncado. Cuando esté publicado, se debe pulsar **Restart verification** en Resend y comprobar que tanto el TXT DKIM como el estado general cambien a **Verified**. Sólo entonces se activará de forma explícita el envío de recuperación y se validará una entrega controlada, sin revelar la existencia de una cuenta.

## Verificación posterior

El 25 de agosto, el panel autenticado de Resend mostró el dominio como **Verified** y listo para enviar. El interruptor `PASSWORD_RESET_EMAIL_ENABLED` fue aceptado por la configuración del proyecto y una prueba del procedimiento en el entorno actualizado devolvió `deliveryReady: true` para una dirección inexistente, sin enviar correo.

La primera solicitud controlada desde el dominio publicado todavía devolvió el aviso anterior de remitente pendiente. Esto indica que la instancia publicada no había reiniciado con el nuevo secreto. No se generó un token ni se entregó correo en esa solicitud. Antes de repetirla se debe publicar una versión posterior que cargue el secreto habilitado y comprobar de nuevo la respuesta genérica.

Una publicación posterior se realizó y la página de recuperación volvió a cargarse con una URL nueva. La segunda solicitud controlada aún devolvió el mismo aviso anterior. No se entregó correo ni se modificó contraseña. Se incorporará una lectura explícita del interruptor de entorno en el código de servidor para forzar el reinicio del proceso publicado y separar esta configuración de cualquier estado previo del despliegue antes de volver a intentar la entrega.

Después de esperar la propagación, se realizó una consulta no entregable con una dirección `example.invalid`. La interfaz publicada permaneció en estado **Comprobando…** y no devolvió respuesta. Esta consulta no puede haber enviado correo ni generado token porque no corresponde a una cuenta. Se investigará el error de la solicitud en producción antes de repetir un envío a una cuenta real.
