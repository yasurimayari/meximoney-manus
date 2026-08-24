# Auditoría de la versión histórica de Notion de Meximoney

**Fecha de revisión:** 23 de agosto de 2026  
**Alcance:** análisis de la página histórica de Notion y de cuatro componentes accesibles vinculados. Esta auditoría no copia datos personales a la aplicación, no modifica Notion y no implementa funcionalidades.

## Dictamen ejecutivo

La versión de Notion aporta sobre todo una **capa operativa y de priorización**, no una sustitución del núcleo de datos de Meximoney. La aplicación actual ya supera a Notion en aislamiento por usuaria, consentimiento, multi-moneda manual, entidades/proyectos, revisión humana, estados financieros, referencias documentales y exportaciones. El mayor vacío funcional no es un gráfico adicional: es convertir la información disponible en una **cola manual y trazable de acciones** para cobros, vencimientos, cierre mensual y revisión de deuda.

> La re-auditoría histórica confirma una lección importante: el tablero perdió fiabilidad cuando los indicadores y tareas no se recalibraron durante varios meses. Cualquier incorporación debe mostrar fecha de actualización, procedencia manual y estado de revisión; no debe prometer “sincronización viva” si no existe. [3]

| Veredicto | Resultado |
|---|---|
| Valor alto e inmediato | Cuentas por cobrar, panel de prioridades operativas, rituales guiados y un centro de ayuda contextual. |
| Valor alto, tras validar métricas | Control ampliado de tarjetas/deudas y un indicador de salud financiera opcional y explicable. |
| Valor medio | Fondos de apartado y obligaciones fiscales como checklist manual. |
| No trasladar | Agentes de Gmail/Drive/Slack, cálculos o presentación fiscal automática, cifras históricas y reglas de reparto rígidas. |

## Qué ya resolvió mejor la aplicación actual

Meximoney conserva un modelo privado y manual: no conecta bancos, no ejecuta transacciones y sólo trabaja con registros que la persona usuaria guarda. Además, separa entidades, proyectos, moneda original y conversión explícita; los avisos se consultan dentro del sitio y requieren consentimiento financiero. [7]

| Necesidad del sistema histórico | Cobertura actual en Meximoney | Lectura de la brecha |
|---|---|---|
| Flujo, presupuesto, activos, pasivos y patrimonio | Panel, Registros, Planificación, Analítica, Estados y Exportar. | Cubierto con un modelo más coherente y privado. |
| Fechas de pago, documentos y tareas | Calendario, deudas, documentos, tareas y bandeja interna. | Cubierto en lo esencial; falta una vista operacional más prescriptiva. |
| Multi-moneda | Moneda original + conversión manual confirmada. | La aplicación mejora el enfoque histórico porque no convierte sin trazabilidad. |
| Separación personal/negocio | Ámbito, entidades y proyectos. | Cubierto y extensible a YMC, ELM y futuras entidades. |
| Presupuesto contra real | Presupuestos, analítica y estados mensuales. | Cubierto; el valor pendiente está en guiar la revisión. |
| Cierre mensual | Estados mensuales y exportaciones. | Parcialmente cubierto; falta un checklist de cierre y evidencia de completitud. |
| Recordatorios | Bandeja privada con contador, filtros, lectura, descarte y reglas manuales. | Más seguro que los avisos externos históricos, pero todavía bajo consulta manual. |

## Aportes recomendados

### Prioridad 1 — Cuentas por cobrar y por pagar operativas

El mayor aporte transferible es una entidad específica de **cuenta por cobrar**: contraparte, entidad/proyecto, importe y moneda, fecha de emisión, fecha de cobro esperada, fecha de pago efectivo, estado, notas y referencia documental. El sistema histórico distinguía pendiente, vencido, pagado y conciliado, con vistas de vencidas, próximos 7 días y seguimiento de días vencidos/DSO. [2] [6]

Esto no debe confundirse con un simple ingreso: una cuenta por cobrar permite separar el derecho a cobrar del efectivo recibido. Debe integrarse con los movimientos de manera manual y reversible, sin enviar mensajes al cliente ni cambiar registros automáticamente. La vista inicial debería resaltar **vencidas**, **vencen en 7 días**, **cobros del mes** y **concentración por contraparte**, siempre filtrable por entidad, proyecto y moneda.

| Diseño propuesto | Control de privacidad y alcance |
|---|---|
| Registro manual de CxC/CxP con contraparte, fechas, importe, estado y vínculo opcional al movimiento/documento. | No sincroniza facturas, correo, Drive ni bancos. |
| Días vencidos y DSO como métricas descriptivas. | No infiere probabilidad de cobro ni inicia gestiones de cobranza. |
| Avisos in-app para vencidas y próximas a vencer. | Sin correo, SMS, Slack o Telegram por defecto. |
| Confirmación humana para marcar pago/conciliación. | Mantiene trazabilidad de quién hizo el cambio. |

### Prioridad 1 — Cockpit operativo y rituales guiados

La página histórica reunía un “Cockpit Hoy”, foco semanal, alertas y un manual con rituales diario, semanal, mensual y trimestral. [1] [5] Meximoney ya dispone de las piezas de datos, por lo que conviene crear una vista **Mi revisión** que no invente prioridades: debe listar elementos manuales que cumplen reglas transparentes.

La pantalla puede mostrar tres secciones: “resolver hoy” (vencidos o pendientes de revisión), “esta semana” (fechas dentro de 7 días y CxC próximas) y “cierre mensual” (presupuestos por revisar, valuaciones por actualizar y estado financiero pendiente). Cada ítem debe incluir por qué aparece, la fecha de origen, el módulo de destino y una acción manual para marcarlo revisado.

### Prioridad 1 — Ayuda contextual y glosario operativo

El Manual de Operación resolvía dudas frecuentes: dónde registrar un movimiento, cómo elegir entidad/proyecto, qué distingue un pago de deuda de un gasto y cuándo actualizar un saldo. [5] Es una mejora de bajo riesgo y alto valor de adopción.

La versión en Meximoney debe ser concisa y contextual: ayuda junto a formularios, categorías con descripción y una página “Guía de uso” privada. Debe conservar las definiciones que ya son propias de Meximoney —como `family_support`, tipos de cambio manuales y revisión humana— y no repetir reglas fiscales históricas como si fueran asesoramiento vigente.

### Prioridad 2 — Control ampliado de tarjetas y deudas

Notion registraba fechas de corte/pago, alertas por proximidad y utilización de tarjetas; la re-auditoría reveló que la gravedad de ciertos casos quedó oculta cuando el dato no se actualizó. [2] [3] Meximoney ya maneja deudas y próximas fechas, pero puede ganar valor con campos opcionales para límite de crédito, fecha de corte, pago mínimo confirmado y fecha de actualización del saldo.

La interfaz debería mostrar **utilización declarada** y **antigüedad del saldo**, no calificar crédito ni recomendar refinanciación. Si la usuaria registra manualmente un score de Buró, éste debe quedar como dato sensible, con fuente y fecha, y sin enviar consulta alguna a servicios externos.

### Prioridad 2 — Indicador de salud financiera explicable

El SPF histórico organizaba siete componentes: patrimonio, utilización de tarjetas, score de Buró, fondo de emergencia, flujo mensual, hábito de registro y pagos de deuda. [4] La idea aporta una narrativa útil, pero la fórmula y los umbrales no deben copiarse: contienen supuestos históricos, y la propia re-auditoría advierte que no se recalibraron. [3]

La alternativa adecuada es un **tablero de progreso configurable**, con componentes activables, ponderaciones visibles, fecha de corte y la opción de no mostrar una puntuación total. Primero se construiría como “salud del dato”: registros al día, saldos actualizados, presupuesto revisado, deuda con próxima fecha y cierre mensual completado. Sólo después, con tu validación explícita, se podrían añadir métricas de patrimonio, liquidez y deuda.

### Prioridad 2 — Fondos de apartado y obligaciones manuales

El sistema histórico usaba apartados mensuales para gastos grandes no mensuales y un calendario fiscal con obligaciones. [1] [2] Meximoney ya tiene objetivos, calendario, documentos y reserva fiscal, de modo que no necesita replicar otra base de datos. El valor está en especializar una meta como **fondo de apartado**: importe objetivo, próximo vencimiento manual, contribución mensual sugerida registrada por la usuaria y avance, sin cálculo fiscal automático.

Para obligaciones fiscales, la opción segura es un checklist con periodo, fuente de referencia, fecha manual, estado y enlace documental. No debe estimar ISR/IVA, afirmar obligaciones aplicables ni presentar declaraciones.

## Elementos que no conviene trasladar

| Elemento histórico | Motivo para no incorporarlo ahora |
|---|---|
| Lectura automática de Gmail, Drive o movimientos bancarios | Contradice el alcance manual y el límite de no conectar servicios externos. |
| Clasificación automática de CFDI, IVA o declaración en Taxo | Incrementa riesgo fiscal y requiere validación/conectores que no forman parte del alcance actual. |
| Alertas a Slack y agentes recurrentes | Exponen detalles financieros y añaden infraestructura programada; la bandeja interna cubre el caso privado básico. |
| Importes, atrasos y metas de las páginas históricas | Son datos de 2026 que la propia re-auditoría califica como desactualizados. [3] |
| Cascada de porcentajes, Bola de Nieve y umbrales SPF como valores fijos | Son decisiones personales/estratégicas, no reglas universales; sólo podrían existir como plantillas configurables confirmadas por la usuaria. |
| “Auto-sync” o cifras “en vivo” | Meximoney debe etiquetar la fecha de actualización y no sugerir automatización inexistente. |

## Hoja de ruta sugerida

| Orden | Entrega | Beneficio | Dependencias |
|---|---|---|---|
| 1 | CxC/CxP manual con estado, contraparte y vencimiento | Mejora cobros, liquidez y foco operativo. | Nuevo modelo de datos y vistas privadas. |
| 2 | Vista “Mi revisión” con ritual semanal/mensual | Convierte datos existentes en acciones manuales visibles. | Reutiliza tareas, calendario, presupuestos, deudas y notificaciones. |
| 3 | Guía contextual y glosario | Reduce errores de captura y carga cognitiva. | Contenido validado por la usuaria. |
| 4 | Deuda ampliada con corte, límite y actualización | Hace visibles riesgos de vencimiento/utilización manual. | Campos opcionales y consentimiento para datos sensibles. |
| 5 | Progreso financiero configurable | Añade seguimiento motivacional sin fórmula opaca. | Requiere validar métricas, pesos y periodicidad. |

## Decisión recomendada

Comenzaría por **CxC/CxP manual + “Mi revisión”**. Es la combinación que traduce mejor la utilidad del Notion histórico en un flujo privado y actualizable, sin adoptar automatismos, consejos financieros o fuentes externas. Antes de desarrollar, conviene confirmar tres reglas: qué entidades usarán CxC, si se registrarán cuentas por pagar además de cobrar y qué estados deseas utilizar.

## Referencias

[1] [MEXIMONEY — Finanzas Personales](https://app.notion.com/p/16498866cf2b42a4bf6cf06a1e2d63fc) — Cockpit, módulos, apartados y enlaces operativos históricos.

[2] [Meximoney Auditoría — Plan Maestro](https://app.notion.com/p/17ead34f032b4f208a0953c5b6f4382d) — arquitectura, pendientes, deuda, calendario y operación histórica.

[3] [Re-auditoría 5 agosto 2026](https://app.notion.com/p/41b960310a924a468a65b1e13eeee5ec) — advertencia sobre desactualización de cifras, SPF y alertas.

[4] [SPF Score — de Progreso Financiero](https://app.notion.com/p/7b18651b387444b1b497b08339376bf7) — componentes, ponderaciones y narrativa histórica del indicador.

[5] [Manual de Operación Meximoney](https://app.notion.com/p/458a345388714466aeda7822f9625600) — rituales, glosario y decisiones de captura históricas.

[6] [Movimientos Finanzas V&V](https://app.notion.com/p/c8ebb18159424b9194f8115fe4d40132) — datos de contraparte, fecha de pago efectivo, estado, CxC/CxP y vistas operativas.

[7] [Experiencia, acceso y alcance de Meximoney actual](experiencia-y-acceso.md) — alcance manual, controles de privacidad y capacidades implementadas.
