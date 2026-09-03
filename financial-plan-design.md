# Plan Financiero dentro de Proyectos

## Fuente y alcance

La estructura funcional se inspira en el plan compartido por la usuaria: [Plan Financiero Jul–Dic 2026 · Ingresos Irregulares](https://yasurimayari-consulting.notion.site/Plan-Financiero-Jul-Dic-2026-Ingresos-Irregulares-6db95fd49ae448b88d42857e50dd23c0). El principio conservado es que el presupuesto y las prioridades se activan sobre ingresos confirmados, no sobre expectativas. Los importes históricos de la página no se importan automáticamente ni se usan para crear transacciones, deudas, pagos, presupuestos o tareas.

## Modelo manual propuesto

| Entidad | Finalidad | Datos editables |
|---|---|---|
| Plan financiero | Configuración del plan dentro de un proyecto | título, moneda, estado, fechas, regla guía y notas |
| Prioridad de asignación | Orden en que se cubren compromisos | posición, título, importe mensual orientativo, condición de activación y notas |
| Escenario de ingreso | Guía de actuación según ingresos reales | rango de ingreso, nivel máximo de asignación, guía y color |
| Mes del plan | Planeación y revisión por mes | ingreso esperado, compromisos, ahorro planeado, estado y observaciones |
| Referencia | Vínculo no destructivo a datos existentes | presupuesto, deuda, tarjeta, CxC/CxP, objetivo, tarea, calendario, revisión fiscal o documento |

## Reglas de seguridad

1. Los ingresos y gastos reales se derivan de movimientos confirmados y comparables del proyecto y moneda del plan; no se persisten como una copia.
2. El disponible planeado es una referencia informativa: ingreso esperado menos compromisos y ahorro planeado. No crea una transferencia, pago, inversión o presupuesto.
3. Las referencias son de solo lectura y se validan contra el espacio privado de la propietaria.
4. Las acciones financieras continúan requiriendo creación o confirmación explícita dentro de su módulo de origen.
