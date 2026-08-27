# Propuesta de Fase E — PWA y notificaciones

**Aplicación:** Meximoney  
**Estado:** propuesta de diseño; no autoriza implementación, cambios de datos ni cambios de programación.  
**Fecha:** 27 de agosto de 2026

## Resumen ejecutivo

Meximoney se mantendrá como una aplicación de **uso personal exclusivo**. La usuaria necesita consultar y trabajar con la mayor cantidad de datos posible aun sin Internet, por lo que la PWA incorporará una copia local cifrada bajo control explícito. No se conservarán contraseñas, sesiones, credenciales, URLs de documentos ni archivos. La copia sólo podrá abrirse con un código local definido por la usuaria en cada dispositivo y podrá eliminarse por completo desde la aplicación.

La prioridad funcional anterior a cualquier PWA debe ser fortalecer la política de notificaciones. La bandeja actual ofrece preferencias por categoría y Telegram conserva su programación diaria existente, pero la consulta de la bandeja puede persistir avisos nuevos durante una lectura. Separar la detección de avisos de su persistencia hará el comportamiento más explicable y permitirá controles de consentimiento, retención y canal más precisos.

> **Principio rector:** ningún cambio de PWA o notificaciones debe permitir acceso sin sesión, conservar información financiera offline, ejecutar pagos, modificar saldos, consultar el SAT o alterar la programación actual de Telegram sin aprobación expresa.

## Auditoría actual

| Área | Situación observada | Implicación de diseño |
|---|---|---|
| PWA | No existen manifiesto, iconos de instalación ni service worker. | No hay almacenamiento offline ni notificaciones push del navegador actualmente. |
| Acceso | Las pantallas financieras requieren sesión autenticada. | Debe conservarse el mismo control de acceso aun si la aplicación se instala. |
| Bandeja interna | La persona usuaria puede activar o desactivar avisos de calendario, documentos, deudas/tarjetas, presupuesto, reserva fiscal y revisión humana. | Es una base válida para el consentimiento granular dentro de la aplicación. |
| Generación de avisos | La consulta de la bandeja detecta avisos y puede guardar candidatos nuevos. | Leer la pantalla no es completamente pasivo; esta responsabilidad debe hacerse explícita y separarse en un bloque posterior. |
| Telegram | Existe un interruptor explícito, programación diaria a las 08:00 de Ciudad de México y alcance numérico previamente autorizado. | Debe mantenerse sin cambios hasta una decisión específica de la usuaria. |
| Retención | Los avisos leídos o descartados tienen estado, pero no hay política visible de retención. | Hace falta definir cuánto tiempo se conservan y cómo se eliminan, antes de añadir más canales. |

## Alternativas de PWA

| Alternativa | Qué entrega | Ventajas | Límites y coste de privacidad | Complejidad |
|---|---|---|---|---|
| A. PWA de interfaz segura | Instalación desde navegador, iconos, caché sólo de recursos estáticos y mensaje claro sin conexión. | Acceso más cómodo desde escritorio o teléfono sin retener movimientos, saldos ni documentos. | Requiere conexión y sesión para ver información financiera; no incorpora avisos push. | Baja-media. |
| B. PWA personal con datos cifrados offline | Copia local cifrada de los datos financieros autorizados para consulta y trabajo local protegido. | Permite abrir los principales saldos, registros, presupuestos, calendario, inversiones, deudas y reportes previos sin conexión. | Requiere código local, consentimiento explícito, borrado remoto/local controlado y sincronización manual; no guarda contraseñas ni documentos. | Media-alta. |
| C. Mantener sitio web actual | Ninguna instalación ni caché adicional. | Es el modelo con menor superficie local y no requiere cambios. | No hay acceso directo desde la pantalla de inicio. | Nula. |

## Alcance aprobado: PWA personal con datos cifrados offline

La PWA permitirá instalar Meximoney y conservará la interfaz estática para iniciar sin red. La copia financiera se guardará únicamente tras una acción explícita de la usuaria, usando IndexedDB y cifrado AES-GCM; la clave se deriva localmente de un código de desbloqueo personal mediante PBKDF2 y nunca viaja al servidor. La copia incluirá los datos financieros que ya recibe el resumen privado —cuentas, tarjetas, deudas, movimientos, presupuestos, inversiones, objetivos, calendario, estados y metadatos de documentos—, pero excluirá contraseñas, tokens, sesión, foto, fecha de nacimiento, correo, URLs de referencia, claves de almacenamiento y archivos.

Cuando no haya conectividad, una pantalla de desbloqueo solicitará el código local y abrirá una vista de consulta. La primera iteración no sincronizará automáticamente altas, ediciones, borradores, pagos, transferencias, inversiones ni declaraciones: esos cambios seguirán requiriendo conexión y confirmación explícita. Las actualizaciones en línea ofrecerán un botón de actualización de la copia cifrada, nunca una sincronización silenciosa. Las actualizaciones del software invalidarán las cachés estáticas obsoletas sin borrar la bóveda hasta que la usuaria lo indique.

## Política de notificaciones recomendada

La política debe seguir una jerarquía de exposición mínima. Los avisos internos pueden contener el contexto que ya está protegido por la sesión. Cualquier canal externo debe requerir consentimiento independiente, reversible y limitado por categoría, contenido y frecuencia.

| Nivel | Canal | Contenido permitido | Consentimiento y control |
|---|---|---|---|
| 1 | Bandeja privada de Meximoney | Título y contexto vinculado al registro, visibles sólo dentro de una sesión autenticada. | Preferencias por categoría existentes; añadir una política de retención visible. |
| 2 | Aviso genérico del navegador, si se aprueba en el futuro | Sólo señal mínima, por ejemplo: «Tienes recordatorios financieros pendientes». Sin importes, saldos, nombres de cuentas o movimientos. | Permiso del navegador más interruptor independiente dentro de Meximoney. |
| 3 | Telegram existente | Únicamente títulos, fechas o días restantes, importes de pago/cuota y saldos de alertas cuyo alcance ya fue autorizado. | Mantener el interruptor reversible y la frecuencia diaria actual; no añadir destinatarios ni categorías sin confirmación. |

La política propuesta incluye una retención predeterminada de **90 días para avisos internos leídos o descartados**, con visualización previa y control manual antes de cualquier eliminación permanente. Los avisos activos no se borrarían automáticamente. Es una propuesta de producto, no una decisión aplicada ni una recomendación legal.

## Bloque funcional prioritario de Fase E

Se propone priorizar **Integridad, consentimiento y ciclo de vida de notificaciones** antes de la PWA. Este bloque no añade envíos externos, no cambia la programación de Telegram y no genera información financiera nueva. Su objetivo es hacer que cada aviso sea verificable y que abrir la bandeja no tenga efectos implícitos.

| Entregable | Criterio de aceptación | Fuera de alcance |
|---|---|---|
| Detección separada de persistencia | Consultar la bandeja no crea avisos; la creación queda en una acción explícita, segura e idempotente. | Cron nuevo, consulta bancaria, SAT o cambios de registros financieros. |
| Preferencias por canal | Cada canal disponible muestra alcance, frecuencia y datos expuestos antes de activarse. | Activar push del navegador o cambiar Telegram sin consentimiento. |
| Retención y trazabilidad | La usuaria puede ver estado, fecha y origen del aviso; la limpieza exige confirmación humana. | Borrado automático de datos financieros o de evidencias. |
| Pruebas y QA | Cobertura de aislamiento, idempotencia, consentimiento y ausencia de envíos; QA sin mutaciones de datos fuente. | Envíos de prueba por Telegram sin autorización expresa. |

## Orden recomendado

Primero se implementa el bloque de integridad de notificaciones. Después se prepara la PWA personal con bóveda cifrada, con pruebas que demuestren que no almacena respuestas financieras sin cifrar, credenciales, enlaces de evidencia ni datos personales no financieros. Las notificaciones push, la sincronización automática de altas o ediciones, OCR, voz y cualquier sincronización externa quedan fuera del alcance hasta una decisión posterior y una evaluación de privacidad específica.
