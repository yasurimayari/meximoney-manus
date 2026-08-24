# Experiencia, acceso y alcance de Meximoney

## Acceso privado

Meximoney ofrece registro e inicio de sesión por **correo y contraseña**. Esta es la vía de acceso recomendada para los espacios financieros privados, ya que crea una sesión propia de Meximoney y no requiere conectar bancos, iniciar pagos ni conservar credenciales de terceros.

El inicio de sesión OAuth anterior puede depender de un servicio de autenticación externo. Si dicho servicio devuelve un error de devolución de llamada o entra en mantenimiento, la opción de correo y contraseña permite continuar accediendo a Meximoney sin utilizar OAuth.

> La aplicación almacena únicamente los registros manuales que la persona usuaria decide guardar. No conecta bancos ni ejecuta transacciones financieras.

## Convenciones visibles por vista

| Vista | Moneda | Periodo | Separación personal y empresarial |
|---|---|---|---|
| Panel | Muestra la moneda base del perfil en los importes consolidados. Las partidas en otra divisa sin conversión manual confirmada no se suman y se señalan como pendientes. | Indica el mes del resumen financiero. | Declara la gestión diferenciada de finanzas personales y empresariales en el encabezado. |
| Registros | Cada movimiento conserva moneda original, importe de reporte, tipo de cambio manual y fecha cuando procede. | Las transacciones contienen una fecha de ocurrencia. | Los movimientos pueden asociarse a entidad y proyecto, además de su ámbito personal, empresarial o mixto. |
| Planificación | Los importes previstos se muestran en la moneda del registro. | Los presupuestos y revisiones se asocian a un periodo mensual. | Presupuestos, deudas, objetivos y tareas conservan el ámbito definido por la persona usuaria. |
| Calidad | Permite configurar la moneda base del perfil. | La reserva fiscal tiene una fecha estimada opcional. | El contexto permite declarar residencia y restricciones sin mezclar datos de terceros. |
| Analítica | Formatea indicadores y gráficos con la moneda base, excluyendo importes no convertidos de forma manual. | El selector permite consultar 3, 6 o 12 meses. | Los datos proceden de registros con ámbito y no combinan fuentes externas. |
| Asistente Mexi | Explica importes en la moneda configurada cuando existen registros. | Usa el resumen del periodo actual disponible. | Analiza exclusivamente el conjunto manual del espacio privado, sin fuentes externas. |
| Calendario | Muestra importes estimados en la moneda indicada en cada evento. | Presenta el mes elegido y recurrencias manuales mensuales, trimestrales o anuales. | Cada evento manual puede asociarse a entidad y proyecto, además de mostrar fechas derivadas del espacio. |
| Estados | Usa la moneda base del perfil en resultados, flujo, activos, pasivos, patrimonio y liquidez; excluye divisas pendientes de conversión. | Cada cierre se guarda para un mes definido. | El selector calcula y archiva por ámbito y, opcionalmente, por entidad. |
| Exportar | El CSV conserva moneda original, moneda e importe de reporte, tipo de cambio y estado de revisión; el PDF usa la moneda base sin sumar pendientes. | El PDF incluye el periodo del informe. | Los archivos incluyen entidad, proyecto y ámbito cuando existen, sin contener credenciales bancarias. |
| Notificaciones | No consolida importes ni muestra saldos: presenta recordatorios mínimos de una fecha, documento, deuda o revisión. | Identifica próximas fechas manuales dentro de los siguientes 7 días al abrir la bandeja. | Las preferencias y los avisos quedan aislados por persona usuaria y requieren el consentimiento financiero privado existente. |

## Controles de interacción

Los formularios muestran estados vacíos, límites de caracteres, mensajes de error y confirmaciones de guardado o descarga. Los controles de navegación mantienen etiquetas visibles, orden lógico de teclado, foco estándar y opciones agrupadas por áreas: Panel, Registros, Planificación, Calidad, Analítica, Calendario, Estados, Asistente y Exportar.

Los documentos permiten clasificar referencias de residencia, fiscalidad, seguros, testamento o sucesión, propiedades, instrumentos de inversión, créditos y contratos. Los vínculos con activos y deudas se guardan como referencia explícita dentro de Meximoney. En cambio, los documentos de seguros u obligaciones fiscales se **clasifican y recuerdan manualmente**: no se vinculan a una aseguradora, al SAT ni a ninguna entidad externa, y no activan trámites, pagos o avisos automáticos.

La aceptación del consentimiento explícito es necesaria antes de guardar o analizar información financiera. La pantalla de Calidad permite también eliminar todos los datos financieros manuales del espacio, sin convertir esta acción en un pago, transferencia o cambio de inversión.

## Presupuesto, inversiones y cierres mensuales

La vista **Presupuesto vs. Real** compara cada partida mensual en la moneda base de reporte. Los ingresos y gastos reales proceden únicamente de movimientos manuales aprobados; los movimientos de otra moneda sólo entran si conservan una conversión manual confirmada a la moneda de reporte. Los ingresos por encima de lo previsto se señalan como favorables; gastos, ahorro e inversión por encima del importe previsto se señalan como desviación.

Las partidas de **Ahorro** se calculan con aportaciones manuales a posiciones de tipo `savings`; las partidas de **Inversión** usan aportaciones a las demás posiciones. Un traspaso entre cuentas, incluido Santander → Plata, no se convierte en ingreso o gasto. Puede quedar ligado a una aportación de la posición correspondiente sin duplicar el dato financiero.

Los **cierres mensuales** conservan una fotografía privada de activos, pasivos, patrimonio neto y liquidez en el momento de guardar. La gráfica de Patrimonio muestra esas fotografías guardadas. Las exportaciones de inversiones se generan localmente en CSV, Excel o PDF desde posiciones y operaciones manuales; no transmiten el archivo importado ni ejecutan operaciones en plataformas financieras.

## Notificaciones privadas dentro del sitio

La pantalla **Notificaciones** permite activar o silenciar la bandeja interna y cada categoría: fechas de Calendario, documentos próximos a vencer, vencimientos de deudas y movimientos pendientes de revisión humana. Los avisos se generan al abrir o consultar la bandeja, se deduplican por elemento relacionado y pueden marcarse como leídos o descartarse manualmente.

El menú lateral muestra un contador visual de avisos no leídos junto a **Notificaciones**. El contador se actualiza desde la misma bandeja privada, se limita a `99+` para conservar el menú legible y expone una etiqueta accesible con el total. No aparece cuando no hay avisos pendientes y no revela información financiera fuera del espacio autenticado.

La bandeja puede filtrarse por estado de lectura y categoría, agruparse por fecha o categoría y abrir el área privada relacionada. También incorpora reglas manuales para revisar presupuestos del mes actual y una reserva fiscal con fecha de referencia. Estas reglas sólo señalan datos que la persona usuaria ya registró: **no calculan impuestos, no presentan declaraciones ni sugieren ejecutar pagos**.

> No son notificaciones push, correo, SMS ni un proceso programado. Meximoney no envía información financiera a servicios externos, no ejecuta pagos y no realiza acciones sobre bancos, documentos o deudas desde un aviso.

Al desactivar la bandeja global, no se genera ni muestra ninguna alerta. Al desactivar una categoría, sus alertas quedan ocultas y dejan de generarse hasta volver a activarla. La persona usuaria puede volver a habilitarlas desde su propio perfil; una cuenta no puede leer, modificar o descartar notificaciones de otra.

### Evaluación de Telegram

Telegram es técnicamente viable como canal opcional mediante su [Bot API HTTP](https://core.telegram.org/bots/api). No está conectado en esta versión porque requeriría un bot, una autorización explícita de la usuaria y un vínculo privado de chat. El diseño seguro sería enviar únicamente una señal mínima, por ejemplo: “Tienes un aviso nuevo en Meximoney; abre tu bandeja privada”, sin categoría, importe, documento, fecha ni otro detalle financiero. Si se quisieran avisos sin abrir la aplicación, habría que configurar una ejecución programada determinista; no requiere un modelo de IA, pero sí una credencial de bot y una programación propia. Telegram admite webhooks HTTPS para enlazar el chat y recibir actualizaciones, con un secreto de verificación recomendado por su documentación oficial [1](https://core.telegram.org/bots/api) [2](https://core.telegram.org/bots/webhooks).

| Alternativa | Privacidad | Coste de ejecución | Configuración |
|---|---|---|---|
| Bandeja interna actual | Máxima: los detalles permanecen dentro de Meximoney. | No añade ejecuciones externas ni consultas de IA. | Ninguna. |
| Telegram con señal mínima opcional | El contenido financiero no sale de Meximoney; Telegram recibe sólo una señal genérica. | Una solicitud HTTP determinista, sin modelo de IA; requiere evaluar el coste de cualquier programación futura. | Crear bot, guardar credencial de forma segura, vincular un chat privado y consentimiento específico. |

## Espacio, colaboración y multi-moneda de Fase A

El primer acceso privado guía a la propietaria por un onboarding que registra el nombre del espacio, moneda base, residencia y régimen declarados, política de conversión manual y el requisito de revisión humana. El onboarding puede proponer entidades editables; no infiere tasas, obligaciones, declaraciones ni presenta nada ante el SAT.

Cada entidad puede definir país, forma legal, estado, moneda funcional y régimen. Los proyectos permiten separar líneas de trabajo dentro de una entidad. La ayuda recibida de familiares se guarda como naturaleza de ingreso `family_support`, separada del ingreso de negocio y del salario o comisión; esto evita clasificarla automáticamente como ingreso PFAE.

> Una conversión se consolida únicamente cuando se registra de forma manual la moneda base, el importe reportado, el tipo aplicado y su fecha. Si falta alguno de esos datos, la partida se conserva en su moneda original, se muestra como pendiente y se excluye de los totales comparables.

La propietaria puede invitar a una persona gestora o revisora por correo. La persona invitada debe crear o usar una cuenta con el mismo correo y aceptar la invitación dentro de Meximoney. Los permisos determinan si puede crear borradores y/o revisar; un gestor no se vuelve propietario, los registros creados por un gestor pasan a `pending_review`, y la aprobación o devolución exige una acción humana autorizada. La propietaria puede revocar una invitación o acceso aceptado. Las invitaciones repetidas para el mismo correo actualizan el permiso existente en lugar de crear duplicados.

Los documentos admiten una URL manual y la etiqueta de proveedor **Google Drive**, URL u otra referencia. Meximoney conserva el enlace y metadatos; no copia archivos, no solicita autorización de Drive, no sincroniza carpetas y no utiliza almacenamiento de archivos para esta modalidad.

En el Calendario, el selector de estado se refiere al **estado del evento** —planeado, completado o cancelado—. Los eventos derivados de documentos, tareas, deudas o fechas fiscales no tienen un estado de revisión homogéneo, por lo que no se presentan como movimientos aprobados o pendientes. El estado de revisión de movimientos se mantiene disponible en Panel, Registros, Analítica, Estados y Exportar.

## Límites del asistente Mexi

Mexi recibe una síntesis estructurada de los datos manuales guardados en el espacio de la persona usuaria. No consulta internet, no obtiene precios actuales, no conecta entidades bancarias y no ejecuta transferencias, pagos, compras, ventas ni contrataciones. Si el servicio de IA no estuviera disponible, muestra una respuesta de indisponibilidad sin modificar ningún registro.
