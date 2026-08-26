# QA — Fase D: Simulaciones

## Estado inicial de publicación

Tras publicar la versión `5430bd82`, la navegación directa a `/simulaciones` devolvió temporalmente la pantalla 404, incluso después de una actualización del navegador. No se realizaron interacciones de formulario, cambios de hipótesis ni guardados de política durante este diagnóstico.

La validación funcional continúa pendiente de confirmar que el dominio publicado ya sirve el paquete de la nueva versión y que la nueva ruta queda disponible dentro de la sesión autenticada.

## Hallazgo de fórmula y corrección

La primera carga de la pestaña Deudas reveló un resultado exponencial cuando un pago mínimo no cubría el interés mensual. La corrección publicada cambia este caso a **Datos por completar**, sin proyectar interés ni saldo, y enumera la obligación que requiere una hipótesis temporal de pago mínimo.

El artefacto actualizado del dominio ya contiene el mensaje de corrección. La sesión del navegador aún conserva temporalmente el paquete anterior en la misma ruta, por lo que la QA visual continuará con una navegación limpia desde otra ruta; no se editó ninguna tasa, pago, escenario ni política durante este proceso.

## Validación publicada

Con el paquete actualizado, la ruta `/simulaciones` presentó **Personal** como una opción explícita del selector Entidad. Al seleccionarla, el listado redujo las tarjetas mostradas de cuatro a tres y excluyó HSBC Air, cuya clasificación es PFAE. La aplicación no guardó esta selección ni modificó ninguna tarjeta.

La misma comprobación confirmó la salvaguarda de deuda: Klar se muestra como una obligación con pago mínimo insuficiente para el interés inicial, mientras los importes de interés y saldo proyectado permanecen como no calculados. No se editaron tasas, pagos, presupuestos, escenarios ni política de excedentes durante la QA.

Las pestañas **Flujo** y **Presupuesto** cargaron correctamente bajo el alcance Personal. Flujo mostró la base de agosto de 2026, sus tres campos de hipótesis inicializados en cero y los tres escenarios de sensibilidad sin predicciones. Presupuesto mostró su estado vacío para el periodo y alcance seleccionados, además de la fórmula temporal; no creó ni modificó partidas.

La pestaña **Excedentes** presentó la política inicial de 100% reserva, la nota vacía, el botón de guardado y una distribución de $0.00 sin pulsar el botón ni introducir excedente. La inspección acotada de solicitudes de QA mostró únicamente lecturas del snapshot; no se enviaron mutaciones de política, tarjetas, deudas, movimientos ni presupuesto.
