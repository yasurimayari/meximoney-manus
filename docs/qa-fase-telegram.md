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
