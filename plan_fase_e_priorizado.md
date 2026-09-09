# Meximoney — Plan priorizado de Fase E

**Objetivo.** Completar la Fase E sin sacrificar la exactitud de los datos ni la trazabilidad. La voz queda fuera de alcance por decisión de la usuaria. La PWA, exportación ICS, notificaciones consentidas y Score transparente ya están implementados; esta fase se centra en consolidar y completar las capacidades pendientes.

| Prioridad | Bloque | Alcance | Resultado verificable | Participación de Yasuri |
|---:|---|---|---|---|
| 1 | Estabilidad y calidad de datos | Saldos, medios de pago, conciliación, actualización entre módulos, errores y auditoría de cálculos | Cada saldo se puede rastrear a una base y a movimientos; las diferencias de conciliación son corregibles | Registrar movimientos reales, importar estados de cuenta y reportar cualquier diferencia |
| 2 | Proyecciones y estacionalidad | Tendencias por mes, categoría, entidad y moneda; patrones de gastos e ingresos; advertencias de liquidez | Se muestran patrones sólo cuando hay historial suficiente y se distinguen hechos de estimaciones | Mantener categorías y fechas consistentes; validar si los patrones reflejan tu realidad |
| 3 | Hábitos opt-in | Indicadores voluntarios, metas de comportamiento y revisión periódica | Panel configurable, sin monitoreo oculto ni efecto sobre Score crediticio | Elegir qué hábitos quieres revisar y cuáles no deseas medir |
| 4 | OCR con revisión humana | Extracción de datos de JPG, PNG y PDF para comprobantes, facturas y estados de cuenta | Propuesta editable antes de crear o actualizar cualquier registro; archivo privado y fuente visible | Subir muestras reales y confirmar los campos que conviene extraer |
| 5 | Cierre de Fase E | Privacidad, PWA offline, rendimiento, pruebas de regresión y documentación operativa | Checklist de seguridad y operación aprobado; versión PWA actualizada | Probar los flujos críticos en web y móvil y confirmar resultados |

## Prioridad 1 — Estabilidad y calidad de datos

Primero se resolverán las discrepancias de saldos, los refrescos entre Registro, Cuentas y Tarjetas, y cualquier cálculo que no conserve trazabilidad. La conciliación debe permitir explicar el saldo mediante: saldo base, movimientos considerados, ajustes y diferencia pendiente. No se añade automatización nueva hasta que los movimientos, pagos de tarjeta y traspasos se reflejen coherentemente en todos los módulos relacionados.

**Criterio para pasar a la prioridad 2:** un ciclo mensual de movimientos reales puede revisarse sin saldos no explicados y sin registros que desaparezcan o se dupliquen.

## Prioridad 2 — Proyecciones y estacionalidad

Se construirán análisis de ingresos, gastos, liquidez y compromisos recurrentes por horizonte de 3, 6, 12 y, cuando exista suficiente información, 18 a 36 meses. Los resultados no se presentarán como predicciones ciertas: cada visualización distinguirá entre dato observado, tendencia estimada, escenario y dato pendiente.

**Criterio para pasar a la prioridad 3:** los indicadores se comprenden, sus fórmulas están visibles y su resultado coincide con el historial registrado.

## Prioridad 3 — Hábitos financieros voluntarios

Se añadirá una configuración explícita para seleccionar hábitos a revisar, como registro oportuno, ahorro periódico, pagos antes de vencimiento o cumplimiento de revisiones mensuales. Estos indicadores serán privados, desactivables y separados del Score crediticio para evitar confundir comportamiento operativo con riesgo crediticio.

## Prioridad 4 — OCR con revisión humana

El OCR propondrá campos extraídos de comprobantes y documentos, pero nunca los guardará automáticamente. Cada resultado mostrará el archivo fuente, los campos detectados, su nivel de confianza y una pantalla de confirmación para editar, rechazar o guardar. Se limitarán formatos y tamaño, y los archivos permanecerán privados.

## Prioridad 5 — Cierre de Fase E

Finalmente se realizará una prueba integrada de operación online y offline, notificaciones, calendario, exportaciones, seguridad de archivos, permisos y recuperabilidad de datos. La Fase E se cerrará sólo con los puntos críticos validados en web y PWA instalada.

> **Decisión de alcance.** No se implementará control por voz. Las integraciones de Telegram y correo pueden seguir como canales consentidos, pero no ejecutarán acciones financieras ni sustituirán la validación dentro de Meximoney.
