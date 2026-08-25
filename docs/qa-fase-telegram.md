# QA — Resumen diario por Telegram

## Alcance de preparación

Esta publicación prepara la integración de Telegram sin crear todavía una tarea diaria ni enviar mensajes. La aplicación conserva la preferencia en `notificationPreferences`, registra el identificador de una tarea futura y monta el manejador exclusivamente bajo `/api/scheduled/telegram-daily-digest`.

El manejador acepta únicamente solicitudes autenticadas como tarea programada. Busca la preferencia por el identificador de tarea confiable, omite el envío si Telegram está desactivado y reserva una fecha de Ciudad de México antes de contactar Telegram para reducir el riesgo de reintentos duplicados.

| Elemento | Comportamiento |
|---|---|
| Contenido | Títulos de avisos; no montos, saldos ni datos bancarios |
| Frecuencia prevista | Diario a las 08:00 de Ciudad de México |
| Interruptor desactivado | La futura ejecución diaria continúa, pero responde sin enviar mensaje |
| Prueba de envío | No realizada; requiere autorización explícita |
| Estado de programación | Aún no creada |

## Validación técnica

La migración `0018_cool_kulan_gath.sql` sólo añade `telegramLastDigestDate` a las preferencias de notificación; no modifica movimientos, tarjetas ni saldos. `pnpm check` y `pnpm test` terminaron correctamente con 26 archivos y 66 pruebas. La suite prueba que el resumen no incluye montos o divisas y que la clave diaria se calcula en horario de Ciudad de México.

La construcción local de producción finalizó correctamente y el paquete generado contiene la sección «Resumen diario por Telegram». Se realizará una nueva publicación de control antes de crear la tarea diaria, porque la primera comprobación del dominio aún servía el paquete anterior.

## Programación registrada y validación sin envío

Se registró una única tarea diaria administrada por el proyecto con el identificador `2BKgs2j9xPoCKfhpui64Hs`, asociada de forma duradera con el perfil privado y configurada con la expresión UTC `0 0 14 * * *`, equivalente a las 08:00 de Ciudad de México. El inventario de tareas confirmó que está activa, usa exclusivamente la ruta autenticada `/api/scheduled/telegram-daily-digest` y conserva el horario diario correcto tras una validación temporal sin envío.

La preferencia de Telegram se mantuvo explícitamente desactivada. La pantalla publicada muestra el control de Telegram disponible y apagado, junto con el alcance de privacidad aprobado. La consulta del historial no mostró ejecuciones ni mensajes de prueba. Una futura ejecución diaria comprobará la preferencia y devolverá una omisión segura mientras continúe desactivada.

## Prueba controlada autorizada

Con autorización explícita de la usuaria se envió una única prueba controlada. Telegram confirmó la entrega. El contenido incluyó sólo títulos de recordatorio y una indicación de que la prueba no activa los envíos diarios.

Una consulta posterior confirmó que `telegramEnabled` permanece en `false`, que la tarea diaria sigue asociada a la preferencia privada y que no existe una marca de resumen diario enviado. Por tanto, la tarea continuará ejecutándose a las 08:00 de Ciudad de México, pero omitirá cualquier envío hasta que la usuaria active el interruptor desde Notificaciones.

## Alcance operativo autorizado

La usuaria autorizó convertir el resumen en una herramienta operativa y confirmó que puede incluir: título de la alerta, fecha o días restantes, importe de pago o cuota y saldo asociado cuando la alerta corresponda a una tarjeta o deuda. Se mantienen excluidos los números de cuenta, credenciales, movimientos completos y cualquier instrucción de pago.

El nuevo formato elimina secuencias numéricas de cuatro o más dígitos desde títulos para prevenir la divulgación accidental de números de cuenta. La lógica conserva fechas, importes y saldos en el detalle de los avisos, y la prueba de regresión confirma ambos comportamientos. Falta publicar este contenido y activar la preferencia diaria.

## Activación diaria autorizada

Tras publicar el manejador actualizado, la usuaria activó el interruptor «Resumen diario por Telegram» desde la pantalla publicada de Notificaciones. La interfaz confirmó la actualización de la preferencia. El resumen diario queda programado a las 08:00 de Ciudad de México e incluirá sólo el alcance autorizado: título, fecha o días restantes, importe de pago o cuota y saldo relacionado con alertas de tarjeta o deuda.

La divulgación visible se actualizó para reflejar exactamente ese alcance y mantener explícita la exclusión de números de cuenta, credenciales, movimientos completos e instrucciones de pago. La compilación estática y 68 pruebas de regresión finalizaron correctamente antes de publicar dicha divulgación.
