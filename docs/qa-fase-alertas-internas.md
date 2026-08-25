# QA — Alertas internas

## Alcance de esta publicación

Esta fase añade únicamente avisos que aparecen dentro de la bandeja privada de Meximoney. No introduce un cron, no modifica `server/_core/index.ts`, no activa Telegram y no ejecuta pagos, conexiones bancarias ni comunicaciones externas.

| Regla | Condición manual | Destino de contexto |
|---|---|---|
| Calendario y SAT | Evento manual planificado dentro de siete días | Calendario |
| Deudas y compras financiadas | Deuda activa con próximo vencimiento dentro de siete días | Planificación |
| Corte de tarjeta | Día de corte registrado dentro de siete días | Tarjetas |
| Pago de tarjeta | Día de pago registrado dentro de siete días | Tarjetas |
| Sobregiro | Saldo manual superior al límite de una tarjeta activa | Tarjetas |

## Protección contable y de privacidad

Los avisos se generan al abrir la bandeja; no crean movimientos ni cambian saldos. El sobregiro se trata como dato real confirmado y sólo recuerda revisarlo. La preferencia existente «Vencimientos de deudas» controla conjuntamente deudas, cuotas y tarjetas, de modo que una usuaria puede ocultarlos sin borrar datos ni recibir comunicaciones externas.

## Validación técnica

`pnpm check` y `pnpm test` finalizaron correctamente: 25 archivos de prueba y 64 pruebas. La nueva suite cubre ajustes de fecha al último día del mes, avisos de corte/pago/sobregiro y exclusión de tarjetas pausadas. Falta comprobar la ruta publicada antes de marcar esta fase como validada.
