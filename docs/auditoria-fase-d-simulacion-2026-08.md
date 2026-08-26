# Auditoría — Fase D: decisión y simulación

## Dictamen de viabilidad

Meximoney ya dispone de las entradas manuales necesarias para construir simuladores de decisión sin conectarse a instituciones ni alterar registros. Las simulaciones deben operar como una capa temporal y transparente sobre el `snapshot` privado: el cambio de una tasa, pago extra o presupuesto dentro del simulador no editará la tarjeta, deuda, presupuesto, movimiento u objetivo de origen.

## Entradas disponibles

| Dominio | Campos disponibles | Uso permitido en simulación | Límite |
|---|---|---|---|
| Deudas | Saldo, tasa anual opcional, pago mínimo, vencimiento, prioridad y estado | Comparar pagos mínimos, pagos extra y orden de liquidación | Una tasa o pago no configurado debe señalarse; nunca se inventa |
| Tarjetas | Saldo, tasa anual opcional, pago mínimo, corte, fecha de pago y estado | Incluirlas como obligaciones rotativas en avalancha/bola de nieve | No se ejecutan pagos ni se alteran saldos |
| Flujo | Ingresos y gastos aprobados comparables en moneda de reporte | Construir una línea base mensual y aplicar variaciones hipotéticas | Divisas sin conversión manual quedan excluidas y visibles como límite |
| Presupuesto | Importe planeado, tipo y alcance | Comparar presupuesto actual con ajuste hipotético por categoría o tipo | No modifica partidas presupuestarias existentes |
| Objetivos e inversiones | Objetivo, aportación y valor manual | Distribuir un excedente hipotético por porcentajes elegidos por la usuaria | No recomienda activos ni ejecuta inversiones |

## Huecos que no se deben ocultar

El modelo no cuenta necesariamente con plazo, tasa o pago mínimo para cada obligación. Esos datos no se completarán mediante supuestos silenciosos: el simulador mostrará el valor configurado, permitirá una **hipótesis temporal explícita** y etiquetará el resultado como incompleto cuando falte un dato crítico.

Las tarjetas y deudas en moneda distinta de la moneda de reporte no se sumarán a una misma comparación hasta que exista una conversión manual. Del mismo modo, los movimientos con conversión pendiente no formarán parte del flujo base; se mostrará su conteo por separado.

## Primer bloque implementable

El primer bloque de la Fase D será un espacio **Simulaciones** con cuatro pestañas: Comparador de deudas, Escenarios de flujo, Presupuesto adaptativo y Política de excedentes. Las tres primeras mantendrán valores sólo en memoria del navegador. La política de excedentes se podrá guardar únicamente por confirmación explícita, con porcentajes manuales que sumen 100% y sin instrucciones de inversión o pago.
