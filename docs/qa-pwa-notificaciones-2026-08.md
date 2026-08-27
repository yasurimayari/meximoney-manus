# QA — PWA personal y notificaciones

**Fecha:** 27 de agosto de 2026  
**Alcance:** PWA personal con bóveda cifrada, instalación móvil y ciclo explícito de avisos.  
**Método:** revisión publicada de solo lectura, pruebas automatizadas y revisión de los recursos del PWA. No se creó una copia offline con datos reales, no se pulsó «Actualizar avisos» y no se cambió ninguna preferencia, movimiento, saldo, calendario ni configuración de Telegram.

| Área | Comprobación | Resultado |
|---|---|---|
| Ruta offline pública | Se abrió `/offline` sin una sesión financiera ni una copia guardada. | Correcto: aparece únicamente la pantalla de desbloqueo, sin cifras, movimientos ni datos de perfil. |
| Manifiesto de instalación | Se comprobó el manifiesto publicado. | Correcto: inicia una instalación nueva en `/`, declara el icono de Meximoney y usa modo de aplicación independiente. |
| Worker de servicio | Se inspeccionó el recurso publicado y su registro en navegador. | Correcto: está activo en el dominio de Meximoney, conserva el shell de interfaz y omite expresamente las solicitudes `/api/`. |
| Caché del worker | Se listaron las entradas del caché de la sesión de QA. | Correcto: no contiene rutas de API ni recursos privados de almacenamiento; sólo se admite el icono estático de instalación. |
| Bóveda local | Prueba unitaria de construcción del snapshot. | Correcto: conserva información financiera autorizada y omite fecha de nacimiento, correo, foto, URLs y notas de documentos. |
| Notificaciones | Pruebas del generador de candidatos y revisión del procedimiento. | Correcto: abrir la bandeja sólo lee los avisos existentes; la detección/persistencia exige la acción explícita `refreshInbox`. |
| Telegram | Revisión de alcance. | Sin cambios de cron, destinatario ni contenido autorizado; no se envió ningún mensaje. |
| Borrado completo | Revisión de la transacción privada. | Ahora incluye avisos y preferencias; al completar el borrado en la interfaz también se elimina la bóveda del dispositivo actual. |

## Validación técnica

La versión publicada `55286d6d` pasó `pnpm check`, **130 pruebas correctas** y `pnpm build`; se comprobó además la sintaxis del worker. La ruta offline publicada se comprobó visualmente y no expone contenido financiero hasta el desbloqueo local. El navegador confirmó el registro activo del worker bajo el dominio de Meximoney y un caché sin entradas de API ni recursos privados.

## Notificaciones PWA personales

La pantalla publicada de notificaciones permaneció protegida por sesión: sin credenciales sólo muestra el acceso de Meximoney, no la bandeja ni datos financieros. No se solicitó el permiso del navegador, no se activó el interruptor local, no se pulsó «Actualizar avisos» y no se emitió ninguna notificación de prueba en este navegador ni en el dispositivo de la propietaria.

| Comprobación | Resultado |
|---|---|
| Permiso y control por dispositivo | Correcto: el permiso sólo puede abrirse desde el botón explícito de la pantalla autenticada; la preferencia adicional se conserva en el almacenamiento local del dispositivo y no modifica Telegram. |
| Contenido del aviso | Correcto: la prueba unitaria comprueba que sólo se muestra un conteo genérico de recordatorios; no incluye importes, saldos, deudas, cuentas ni movimientos. |
| Condiciones de entrega | Correcto: la regla comprobada requiere recordatorios nuevos, permiso concedido, worker disponible e interruptor local activado. |
| Worker publicado | Correcto: la versión `meximoney-personal-shell-v2` ya está publicada, incluye el acceso a `/notificaciones` al tocar un aviso y no contiene manejador push ni polling. |
| Caché publicado | Correcto: tras recargar, sólo existe el caché `meximoney-personal-shell-v2`; no hay entradas `/api/` ni recursos privados de almacenamiento. |

La primera entrega no pretende enviar recordatorios cuando la aplicación está cerrada. Implementar esa capacidad requeriría Web Push completo, suscripciones protegidas y una aprobación separada de la propietaria; no se incorporó un cron, un proceso de fondo ni un nuevo proveedor de mensajería.

## Instalación móvil y contenedor externo

Se confirmó la revisión visual autenticada del Presupuesto adaptativo por parte de la usuaria, sin cambios de datos. La guía visible en la pantalla de acceso ahora indica instalar la PWA desde el dominio publicado de Meximoney en Safari (iPhone) o Chrome (Android), y el manifiesto inicia una instalación nueva en la página principal en línea; la pantalla offline sólo aparece como respaldo sin red o acceso deliberado a la copia cifrada.

El aviso «Amplitude Logger: Failed to fetch remote config» no está incluido en el código fuente, dependencias ni recursos de Meximoney. La captura lo muestra en el contenedor de vista previa de Manus; por ello no puede corregirse desde la aplicación. La instalación desde Safari o Chrome evita depender de dicho contenedor técnico. Si el aviso persiste dentro de la vista de Manus, debe reportarse en https://help.manus.im.

## Comprobación pendiente de la propietaria

La prueba de guardar y abrir una bóveda requiere una sesión autenticada y la creación voluntaria de una copia de los datos reales de la propietaria. No se realizó para preservar los datos y el consentimiento explícito. Cuando la usuaria lo decida, debe entrar en **Yasuri → Datos offline**, definir un código local y actualizar la copia; después podrá verificar `/offline` con la red desactivada. La primera versión sigue siendo de consulta: no crea movimientos, pagos, transferencias, inversiones ni cambios presupuestarios sin conexión.
