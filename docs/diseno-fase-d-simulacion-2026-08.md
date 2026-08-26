# Diseño — Fase D: decisión y simulación

## Principios

Los resultados serán una proyección matemática, no una orden de pago ni una recomendación financiera personalizada. El simulador usará únicamente datos manuales existentes y las hipótesis que la usuaria introduzca temporalmente. Todo resultado expondrá la moneda, periodo, datos excluidos y supuestos activos.

## Comparador de deudas

Las tarjetas activas y deudas activas en la moneda de reporte serán entradas independientes. El motor mensual aplicará primero el interés y después el pago:

> `interés del mes = redondeo(saldo inicial × tasa anual en puntos base ÷ 120,000)`
>
> `principal = máximo(0, pago mensual − interés del mes)`
>
> `saldo siguiente = máximo(0, saldo inicial + interés − pago mensual)`

El pago mínimo de cada obligación se mantiene en todas las obligaciones y el pago extra indicado se aplica a una sola deuda objetivo; al liquidarse, el importe liberado se dirige a la siguiente. **Avalancha** ordena por tasa anual descendente y **bola de nieve** por saldo ascendente. Los empates se resuelven de forma estable por saldo, tasa y nombre. La simulación tendrá un máximo de 600 meses; si una obligación carece de tasa, pago mínimo o moneda comparable, se marcará como dato pendiente, no se asumirá un valor.

## Escenarios de flujo y sensibilidad

La línea base será el flujo del periodo seleccionado en la moneda de reporte: ingresos aprobados menos gastos aprobados, sin traspasos. La usuaria podrá aplicar una variación hipotética de ingreso, gasto y pago adicional. La sensibilidad comparará al menos tres hipótesis explícitas de ingreso y gasto, sin predicciones externas ni tipos de cambio inventados.

## Presupuesto adaptativo

El presupuesto adaptativo no reescribe ninguna partida. Para cada partida compatible mostrará el planeado, el real existente y una propuesta temporal derivada:

> `presupuesto temporal = máximo(0, real del periodo × (1 + ajuste manual %))`

La usuaria puede elegir el ajuste; el valor se etiqueta como escenario y queda fuera de `budgets` hasta que ella cree o edite una partida en Planificación.

## Política personal de excedentes

Se añadirá una sola política privada, guardada únicamente cuando la usuaria pulse **Guardar política**. Tendrá cuatro porcentajes explícitos: reserva, deuda, ahorro e inversión. Los porcentajes deben sumar 100%; para un excedente indicado por la usuaria, cada importe será `excedente × porcentaje ÷ 10,000`. La política no transfiere ni invierte fondos y no presupone que un excedente sea disponible.

| Riesgo de interpretación | Salvaguarda |
|---|---|
| Confundir escenario con saldo real | Etiqueta persistente “solo simulación” y ninguna mutación de registros fuente |
| Tasa, pago o moneda faltante | Exclusión visible de la comparación y sin supuestos silenciosos |
| Escenario de deuda inviable | Mostrar pago mínimo total, corto de caja y horizonte máximo sin afirmar liquidación |
| Convertir porcentaje en ejecución | La política sólo distribuye una cifra hipotética y nunca crea movimientos |
