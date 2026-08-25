# QA — Préstamos y pagos por contacto

## Validación técnica

La migración `0019_bouncy_raider.sql` añadió únicamente la columna opcional `debts.contactId`; no modifica deudas, tarjetas, transacciones ni saldos históricos. Se verificaron correctamente `pnpm check`, `pnpm test` con 69 pruebas y `pnpm build`.

La prueba de servidor confirma que un pago desde cuenta crea una pareja conciliada de movimientos, vincula el pago a la deuda elegida y reduce sólo su principal. También se validó que la interfaz no permite pagar más que el saldo pendiente y exige una cuenta activa de la misma moneda.

## Validación publicada

En el dominio publicado, la vista **Contactos** muestra el botón **Pagos e historial** en las tarjetas. El diálogo del contacto presenta el estado vacío, el acceso **Registrar préstamo** y el formulario con nombre, saldo pendiente, cuota orientativa, moneda, próximo pago, área, prioridad y notas.

No se guardaron préstamos, pagos, contactos ni movimientos durante esta QA. La comprobación del formulario de pago con una cuenta de origen queda cubierta por las pruebas de servidor para no introducir datos financieros de prueba en el espacio privado de la usuaria.
