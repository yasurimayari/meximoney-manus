# Diseño de trazabilidad, ahorro, inversiones y patrimonio

## Referencia de patrimonio

La página histórica de Patrimonio Neto en Notion se usará como referencia de estructura, no como fuente de saldos para copiar. Sus elementos útiles son el cálculo visible **activos menos pasivos**, activos y pasivos vivos, una revisión de valuaciones mensual, objetivos patrimoniales y una serie de snapshots mensuales. Meximoney conservará el enfoque manual, privado y multi-moneda: no sincronizará Notion, bancos, precios de mercado ni criptocotizaciones.

## Trazabilidad con contactos

Cada CxC y CxP tendrá un `contactId` opcional. El servidor comprobará que el contacto pertenece a la misma propietaria del espacio; la interfaz rellenará la contraparte textual desde el contacto seleccionado sin borrar la descripción histórica. Los movimientos manuales y las plantillas recurrentes también podrán incorporar el contacto opcional, de modo que un cobro, pago o suscripción conserve su relación sin obligar a duplicar una persona u organización.

## Ahorro e inversiones

Los activos de inversión se representarán como posiciones privadas con tipo, nombre, plataforma o emisor, moneda, coste acumulado, valor actual, fecha de valoración, entidad/proyecto opcionales, estado y notas. Los tipos iniciales cubrirán ahorro, renta fija, fondos o ETF, acciones, criptoactivos, terreno, inmueble, participación empresarial, jubilación y otros.

Las aportaciones, retiros, rendimientos y ajustes de valoración se guardarán como historial separado. Un movimiento financiero ya registrado podrá enlazarse de manera opcional para evidenciar el fondeo, pero la aplicación no creará órdenes, cotizaciones ni transferencias. Los valores de cartera se actualizarán únicamente cuando la usuaria introduzca una valuación manual y, si requiere consolidación a la moneda base, el tipo de cambio se guardará explícitamente.

## Patrimonio neto

La nueva vista consolidará cuentas y activos actuales, posiciones de inversión que se hayan marcado para incluir en patrimonio y deudas. Para evitar doble conteo, una posición debe representar el activo económico y una cuenta bancaria sólo el efectivo disponible; el formulario advertirá si se intenta usar ambos para el mismo valor. Los snapshots históricos serán manuales y reutilizarán los cierres mensuales existentes, ampliados para incluir posiciones de inversión sin tratarlas como liquidez.

## Correo de invitaciones

Se recomienda Resend para invitaciones transaccionales: su plan gratuito publica 3,000 correos al mes y un límite de 100 diarios. Gmail se conserva como bandeja personal y posible dominio de respuesta, pero no como emisor directo de la aplicación. Antes de activar envíos se requerirá autorización explícita de la usuaria, configuración del dominio remitente y una credencial de proveedor guardada de forma segura.

## Fuentes de referencia

- Página privada de Notion: Patrimonio Neto, consultada el 24 de agosto de 2026.
- [Resend Pricing](https://resend.com/pricing), consultada el 24 de agosto de 2026.
- [Gmail Help: Limits for sending and getting mail](https://support.google.com/mail/answer/22839?hl=en), consultada el 24 de agosto de 2026.
