# Diseño — Notificaciones PWA personales

**Fecha:** 27 de agosto de 2026  
**Alcance aprobado:** notificaciones en el dispositivo para la PWA personal de Meximoney.  
**Exclusiones:** no se crea un cron adicional, no se modifica Telegram, no se conectan bancos, no se ejecutan pagos, transferencias o inversiones, y no se envían avisos con movimientos completos, números de cuenta, credenciales ni documentos.

## Decisión de la primera versión

La primera versión utiliza el permiso nativo del navegador y el worker que ya posee la PWA. El permiso sólo puede solicitarse tras pulsar un botón explícito. En iPhone, Apple exige que la web app esté añadida a la pantalla de inicio y que la solicitud provenga de una interacción directa de la persona usuaria.[1] La aplicación registra visualmente si el permiso está pendiente, concedido, denegado o no es compatible.

| Componente | Comportamiento aprobado | Límite de privacidad |
|---|---|---|
| Activación | Botón manual «Activar notificaciones en este dispositivo». | No se solicita el permiso al abrir una pantalla ni se infiere consentimiento. |
| Entrega local | Al pulsar «Actualizar avisos», la aplicación muestra un aviso genérico sólo si hay recordatorios nuevos y el permiso ya fue concedido. | El texto sólo comunica un conteo de recordatorios; no incluye saldos, importes, nombres de acreedores ni información fiscal. |
| Insignia | El icono puede reflejar el número de avisos internos sin leer mientras la PWA está abierta. | El número no revela la categoría, el importe ni el contenido. |
| Cierre | Tocar el aviso abre la bandeja privada de Meximoney. | La pantalla exige sesión; no expone contenido en la notificación. |
| Revocación | El permiso se revoca desde los ajustes del navegador o del sistema operativo. | No se guardan suscripciones de terceros ni tokens en esta primera versión. |

> La aplicación seguirá siendo una herramienta de consulta y revisión. Una notificación no confirma, completa ni ejecuta ninguna acción financiera.

## Alcance técnico y límite consciente

El estándar Web Push permite entregar mensajes aun si la aplicación no está abierta, pero requiere una suscripción única por worker y que el endpoint de la suscripción se trate como secreto.[2] Esa modalidad necesita un servicio emisor, claves VAPID y suscripciones persistidas de forma segura. No se incluye en este bloque para evitar introducir credenciales, un nuevo proceso de envío o avisos automáticos sin una decisión posterior y explícita de la usuaria.

Por tanto, esta versión proporciona **avisos personales de dispositivo bajo actualización manual**, no recordatorios de fondo garantizados. Es una restricción deliberada y visible en la interfaz, no una promesa implícita de entrega diaria.

## Referencias

[1] [WebKit — Web Push for Web Apps on iOS and iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)  
[2] [MDN — Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
