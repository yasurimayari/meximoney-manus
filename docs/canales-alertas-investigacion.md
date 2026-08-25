# Canales externos de alertas: investigación inicial

La aplicación debe conservar las alertas internas como canal predeterminado y mantener el contenido externo mínimo. Para este caso, se analizaron tres opciones oficiales.

| Canal | Hallazgo oficial relevante | Implicación para Meximoney |
|---|---|---|
| Telegram | La Bot API es una interfaz HTTPS; cada bot usa un token y permite solicitudes POST con respuesta JSON. | Permite alertas breves a un chat que la usuaria vincule, pero requiere proteger el token y el identificador de chat. |
| Slack | Un webhook entrante recibe un JSON en una URL secreta específica de un canal; Slack advierte no exponerla. | Es sencillo para un canal privado, pero la integración Slack disponible no está activada y se requeriría una URL webhook o autorización explícita. |
| WhatsApp Business | Los mensajes iniciados fuera de la ventana de atención requieren plantillas y Meta cobra por mensaje entregado según categoría y país. | No es la primera opción de bajo coste para recordatorios proactivos; necesita configuración de negocio y plantillas. |

La recomendación preliminar, pendiente de elección y configuración de la usuaria, es: alertas dentro de Meximoney primero; Telegram como primer canal externo opcional de bajo coste; Slack sólo si la usuaria ya opera un espacio privado; WhatsApp como alternativa posterior por su mayor configuración y costes variables.

## Fuentes oficiales

1. [Telegram Bot API](https://core.telegram.org/bots/api)
2. [Slack: Sending messages using incoming webhooks](https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks)
3. [Meta: Pricing on the WhatsApp Business Platform](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing)
