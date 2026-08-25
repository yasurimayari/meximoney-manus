# QA — Remitente de recuperación por correo

## Estado actual

La revisión más reciente del panel autenticado de Resend muestra el dominio `mexi.richeon.app` con estado **Pending**, después de que se corrigieron los DNS. Los CNAME `rsend.mexi` y `send.mexi` ahora aparecen como **Verified**; el TXT DKIM `resend._domainkey.mexi` permanece en **Pending** mientras Resend completa la propagación y la verificación. La clave configurada para la aplicación es de envío restringido y no permite consultar dominios por API; la revisión visual del panel es la evidencia actual.

Por ello, Meximoney mantiene bloqueado el envío real de recuperación de contraseña. La interfaz, los tokens de un solo uso y la expiración segura permanecen implementados, pero no se habilitará el canal hasta que el dominio aparezca como **Verified** y se valide una entrega controlada.

## Acción requerida

Los registros corregidos siguen propagándose. No se debe habilitar el envío hasta que el estado general cambie a **Verified** y el TXT DKIM también figure como verificado. En ese momento se activará de forma explícita el envío de recuperación y se validará una entrega controlada, sin revelar la existencia de una cuenta.
