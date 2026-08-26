# QA — Conciliación de CxC en Libro PFAE

## Controles técnicos

Se añadieron tres pruebas unitarias para los estados de una CxC sin cobros, con cobro parcial pendiente de conciliación y totalmente cobrada con ingreso vinculado. La utilidad sólo recibe la CxC y sus abonos existentes; no contiene operaciones de escritura ni de cálculo fiscal. La suite completa finalizó con 77 pruebas correctas, además de `pnpm check` y la compilación de producción.

## Validación publicada

La pantalla publicada del **Libro PFAE** muestra las métricas **Cobros conciliados** y **Cobros por conciliar**, así como la advertencia de que el dato reutiliza abonos existentes y no calcula IVA, ISR ni declaraciones. En el periodo revisado no había renglones fiscales ni CxC vinculadas, por lo que los importes se mostraron en cero y no se crearon datos de prueba.

La tabla renderizará el estado de cobro, el importe cobrado y el saldo pendiente cuando una CxC existente se vincule manualmente con un renglón fiscal. La vinculación sigue siendo una decisión humana; esta vista no modifica movimientos, CxC, patrimonio, saldos ni documentación.
