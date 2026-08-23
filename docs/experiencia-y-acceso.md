# Experiencia, acceso y alcance de Meximoney

## Acceso privado

Meximoney ofrece registro e inicio de sesión por **correo y contraseña**. Esta es la vía de acceso recomendada para los espacios financieros privados, ya que crea una sesión propia de Meximoney y no requiere conectar bancos, iniciar pagos ni conservar credenciales de terceros.

El inicio de sesión OAuth anterior puede depender de un servicio de autenticación externo. Si dicho servicio devuelve un error de devolución de llamada o entra en mantenimiento, la opción de correo y contraseña permite continuar accediendo a Meximoney sin utilizar OAuth.

> La aplicación almacena únicamente los registros manuales que la persona usuaria decide guardar. No conecta bancos ni ejecuta transacciones financieras.

## Convenciones visibles por vista

| Vista | Moneda | Periodo | Separación personal y empresarial |
|---|---|---|---|
| Panel | Muestra la moneda base del perfil en los importes del resumen. | Indica el mes del resumen financiero. | Declara la gestión diferenciada de finanzas personales y empresariales en el encabezado. |
| Registros | Cada movimiento, cuenta o activo conserva su moneda. | Las transacciones contienen una fecha de ocurrencia. | Las categorías, cuentas, documentos y movimientos admiten ámbito personal, empresarial o mixto. |
| Planificación | Los importes previstos se muestran en la moneda del registro. | Los presupuestos y revisiones se asocian a un periodo mensual. | Presupuestos, deudas, objetivos y tareas conservan el ámbito definido por la persona usuaria. |
| Calidad | Permite configurar la moneda base del perfil. | La reserva fiscal tiene una fecha estimada opcional. | El contexto permite declarar residencia y restricciones sin mezclar datos de terceros. |
| Analítica | Formatea indicadores y gráficos con la moneda del perfil. | El selector permite consultar 3, 6 o 12 meses. | Los datos proceden de registros con ámbito y no combinan fuentes externas. |
| Asistente Mexi | Explica importes en la moneda configurada cuando existen registros. | Usa el resumen del periodo actual disponible. | Analiza exclusivamente el conjunto manual del espacio privado, sin fuentes externas. |
| Exportar | El CSV conserva la moneda de cada movimiento y el PDF usa la moneda base. | El PDF incluye el periodo del informe. | Los archivos reflejan el ámbito registrado y no contienen credenciales bancarias. |

## Controles de interacción

Los formularios muestran estados vacíos, límites de caracteres, mensajes de error y confirmaciones de guardado o descarga. Los controles de navegación mantienen etiquetas visibles, orden lógico de teclado, foco estándar y opciones agrupadas por áreas: Panel, Registros, Planificación, Calidad, Analítica, Asistente y Exportar.

La aceptación del consentimiento explícito es necesaria antes de guardar o analizar información financiera. La pantalla de Calidad permite también eliminar todos los datos financieros manuales del espacio, sin convertir esta acción en un pago, transferencia o cambio de inversión.

## Límites del asistente Mexi

Mexi recibe una síntesis estructurada de los datos manuales guardados en el espacio de la persona usuaria. No consulta internet, no obtiene precios actuales, no conecta entidades bancarias y no ejecuta transferencias, pagos, compras, ventas ni contrataciones. Si el servicio de IA no estuviera disponible, muestra una respuesta de indisponibilidad sin modificar ningún registro.
