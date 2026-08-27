# QA — PWA personal y notificaciones

**Fecha:** 27 de agosto de 2026  
**Alcance:** PWA personal con bóveda cifrada y ciclo explícito de avisos.  
**Método:** revisión publicada de solo lectura, pruebas automatizadas y revisión de los recursos del PWA. No se creó una copia offline con datos reales, no se pulsó «Actualizar avisos» y no se cambió ninguna preferencia, movimiento, saldo, calendario ni configuración de Telegram.

| Área | Comprobación | Resultado |
|---|---|---|
| Ruta offline pública | Se abrió `/offline` sin una sesión financiera ni una copia guardada. | Correcto: aparece únicamente la pantalla de desbloqueo, sin cifras, movimientos ni datos de perfil. |
| Manifiesto de instalación | Se comprobó el manifiesto publicado. | Correcto: apunta a `/offline`, declara el icono de Meximoney y usa modo de aplicación independiente. |
| Worker de servicio | Se inspeccionó el recurso publicado. | Correcto: permite conservar el shell de interfaz y omite expresamente las solicitudes `/api/`. |
| Bóveda local | Prueba unitaria de construcción del snapshot. | Correcto: conserva información financiera autorizada y omite fecha de nacimiento, correo, foto, URLs y notas de documentos. |
| Notificaciones | Pruebas del generador de candidatos y revisión del procedimiento. | Correcto: abrir la bandeja sólo lee los avisos existentes; la detección/persistencia exige la acción explícita `refreshInbox`. |
| Telegram | Revisión de alcance. | Sin cambios de cron, destinatario ni contenido autorizado; no se envió ningún mensaje. |
| Borrado completo | Revisión de la transacción privada. | Ahora incluye avisos y preferencias; al completar el borrado en la interfaz también se elimina la bóveda del dispositivo actual. |

## Validación técnica

La versión publicada `5e27109e` pasó `pnpm check`, **127 pruebas correctas** y `pnpm build`. La ruta offline publicada se comprobó visualmente y no expone contenido financiero hasta el desbloqueo local.

## Comprobación pendiente de la propietaria

La prueba de guardar y abrir una bóveda requiere una sesión autenticada y la creación voluntaria de una copia de los datos reales de la propietaria. No se realizó para preservar los datos y el consentimiento explícito. Cuando la usuaria lo decida, debe entrar en **Yasuri → Datos offline**, definir un código local y actualizar la copia; después podrá verificar `/offline` con la red desactivada. La primera versión sigue siendo de consulta: no crea movimientos, pagos, transferencias, inversiones ni cambios presupuestarios sin conexión.
