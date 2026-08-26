# QA — Fase D: Simulaciones

## Estado inicial de publicación

Tras publicar la versión `5430bd82`, la navegación directa a `/simulaciones` devolvió temporalmente la pantalla 404, incluso después de una actualización del navegador. No se realizaron interacciones de formulario, cambios de hipótesis ni guardados de política durante este diagnóstico.

La validación funcional continúa pendiente de confirmar que el dominio publicado ya sirve el paquete de la nueva versión y que la nueva ruta queda disponible dentro de la sesión autenticada.

## Hallazgo de fórmula y corrección

La primera carga de la pestaña Deudas reveló un resultado exponencial cuando un pago mínimo no cubría el interés mensual. La corrección publicada cambia este caso a **Datos por completar**, sin proyectar interés ni saldo, y enumera la obligación que requiere una hipótesis temporal de pago mínimo.

El artefacto actualizado del dominio ya contiene el mensaje de corrección. La sesión del navegador aún conserva temporalmente el paquete anterior en la misma ruta, por lo que la QA visual continuará con una navegación limpia desde otra ruta; no se editó ninguna tasa, pago, escenario ni política durante este proceso.
