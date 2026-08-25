# QA — Remitente de recuperación por correo

## Estado actual

La revisión del panel autenticado de Resend mostró el dominio `mexi.richeon.app` con estado **Failed**. La clave configurada para la aplicación es de envío restringido y no permite consultar dominios por API; la revisión visual del panel es la evidencia actual.

Por ello, Meximoney mantiene bloqueado el envío real de recuperación de contraseña. La interfaz, los tokens de un solo uso y la expiración segura permanecen implementados, pero no se habilitará el canal hasta que el dominio aparezca como **Verified** y se valide una entrega controlada.

## Acción requerida

Se deben revisar y corregir en el proveedor DNS los registros que muestra Resend para `mexi.richeon.app`. La inspección del panel identificó dos fallos: el TXT DKIM con nombre `resend._domainkey.mexi` no se encontró y el CNAME SPF con nombre `rsend.mexi` no resuelve a `rsend.forge.rmta.net`. El CNAME `send.mexi` ya figura como verificado.

El valor íntegro de la clave DKIM debe copiarse desde el panel de Resend abierto en el navegador, sin inventarlo ni sustituirlo por un valor abreviado. Una vez propagados ambos registros, se debe ejecutar **Restart verification** en Resend y comprobar que el estado cambie a **Verified** antes de activar el envío desde Meximoney.
