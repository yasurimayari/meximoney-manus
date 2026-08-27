# QA publicada — Simulaciones y Cuentas

**Fecha:** 27 de agosto de 2026.  
**Versión validada:** `87cd383c`.  
**Método:** sesión autenticada en producción, únicamente de lectura y simulación temporal.

| Área | Verificación | Resultado |
|---|---|---|
| Simulaciones | Se cargó el escenario de deudas con los datos existentes. | Correcto: los indicadores mostraron 23 meses, $24,190.72 de interés proyectado y $0.00 de saldo no liquidado como resultado parcial. |
| Recalcular hipótesis | El pago extra temporal se cambió de 0 a 1,000 sin guardar. | Correcto: el resultado se actualizó a 15 meses y $14,882.76 de interés. El cambio sólo vivió en el navegador. |
| Salvaguarda | Una tarjeta con pago mínimo que no cubre el interés permanece identificada. | Correcto: se excluye de la proyección, pero ya no bloquea las obligaciones modelables. |

No se guardó una política, no se actualizó ninguna tarjeta y no se ejecutó pago, transferencia ni inversión. Falta validar la experiencia publicada de Cuentas y revisar la traza de ausencia de mutaciones.
