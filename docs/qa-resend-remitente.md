# QA — Remitente de recuperación por correo

## Estado actual

La revisión más reciente del panel autenticado de Resend muestra el dominio `mexi.richeon.app` con estado **Failed**. Los CNAME `rsend.mexi` y `send.mexi` figuran como **Verified**, pero Resend reporta que el TXT DKIM `resend._domainkey.mexi` sigue ausente. La clave configurada para la aplicación es de envío restringido y no permite consultar dominios por API; la revisión visual del panel es la evidencia actual.

Por ello, Meximoney mantiene bloqueado el envío real de recuperación de contraseña. La interfaz, los tokens de un solo uso y la expiración segura permanecen implementados, pero no se habilitará el canal hasta que el dominio aparezca como **Verified** y se valide una entrega controlada.

## Acción requerida

Se debe revisar en el proveedor DNS que el registro TXT se haya añadido con el nombre y el valor exactos que muestra Resend, sin duplicar el sufijo del dominio ni dejar el valor truncado. Cuando esté publicado, se debe pulsar **Restart verification** en Resend y comprobar que tanto el TXT DKIM como el estado general cambien a **Verified**. Sólo entonces se activará de forma explícita el envío de recuperación y se validará una entrega controlada, sin revelar la existencia de una cuenta.
