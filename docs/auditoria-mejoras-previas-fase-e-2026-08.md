# Auditoría — Mejoras previas a la Fase E

## Hallazgos confirmados

| Solicitud | Estado actual | Cambio necesario |
|---|---|---|
| Periodo actual | El Panel publicado mostró julio de 2026, aunque la fecha efectiva de Ciudad de México ya es agosto de 2026 | Pasar una referencia mensual local y explícita desde el cliente al resumen del Panel; el servidor normalizará el mes para conservar los límites de consulta |
| Resumen de Telegram | El resumen usa viñetas anidadas y texto plano, con hasta 12 entradas | Reorganizar por prioridad, limitar el detalle y usar formato HTML seguro de Telegram; no cambiar horario, canal ni programación |
| Registros | La lista se limita a 16 filas y no ofrece páginas | Mostrar 15 iniciales y paginar el resto en grupos de 20 con números de página |
| Cuentas | Existe un bloque de cuentas dentro de Registros, y las tarjetas/deudas viven en otras páginas | Crear un centro de consulta que consolide cuentas, tarjetas, préstamos y movimientos relacionados, sin duplicar el modelo |
| Analítica | Sólo ofrece 3, 6 y 12 meses | Añadir 18, 24 y 36 meses, y vistas anuales de los cinco años más recientes disponibles |
| Fechas fiscales | La fecha fiscal del perfil ya es editable desde Perfil; los eventos fiscales manuales se pueden actualizar por contrato, pero la interfaz no ofrece edición contextual | Añadir accesos de edición manual en Calendario para ambos orígenes |
| Eventos de tarjeta | El calendario distingue corte y pago, pero no tiene `linkedCreditCardId` | Añadir vínculo nullable, validado por propiedad, con selector que se muestra sólo en eventos de corte o pago |

## Límite del ajuste de periodo

No se cambiarán las fechas de movimientos, cierres, documentos, eventos ni registros fiscales. El ajuste se limita a la **referencia de lectura del mes vigente**; los datos existentes conservarán sus marcas de tiempo UTC y se presentarán en zona local.

## Resumen de Telegram

El rediseño conservará el método `sendMessage` y el envío diario existente. Telegram admite solicitudes JSON por HTTPS y formato HTML mediante `parse_mode`; se usarán únicamente etiquetas básicas compatibles y se escapará todo título o detalle procedente de registros manuales. [1]

La nueva estructura priorizará: una cabecera breve con fecha, un conteo de pendientes, hasta tres alertas prioritarias con un detalle útil y una línea final que dirija a Meximoney. Los importes sólo aparecerán si ya estaban habilitados por las preferencias existentes. No se enviará un mensaje de prueba ni se añadirá automatización.

## Referencias

[1]: https://core.telegram.org/bots/api#sendmessage "Telegram Bot API — sendMessage y opciones de formato"
