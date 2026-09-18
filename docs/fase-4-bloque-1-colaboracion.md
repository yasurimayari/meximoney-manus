# Fase 4 — Bloque 1: colaboración, permisos y auditoría

## Alcance aprobado

Este bloque completa la base de colaboración existente sin abrir integraciones bancarias, automatizaciones externas ni cambios en saldos. La propietaria conserva la autoridad sobre sus datos financieros y una persona gestora o revisora sólo accede después de una invitación aceptada y con capacidades explícitas.

La entrega se concentra en tres controles verificables:

1. **Aceptación visible de invitaciones pendientes.** La persona invitada verá únicamente las invitaciones dirigidas a su correo autenticado y podrá aceptarlas desde Espacio.
2. **Principio de mínimo privilegio en Espacio.** Una persona colaboradora no verá la lista de otros correos invitados ni la bitácora de la propietaria. La propietaria sí verá el estado y las capacidades de sus invitaciones.
3. **Bitácora privada de colaboración.** Meximoney registrará, sin importes ni contenido financiero sensible, la creación o actualización de permisos, aceptación y revocación de accesos. La bitácora será visible sólo para la propietaria del espacio.

## Reglas de permisos

| Capacidad | Propietaria | Gestor con permiso | Revisor con permiso |
|---|---:|---:|---:|
| Ver información del espacio compartido | Sí | Sí | Sí |
| Crear borradores | Sí | Según `canCreateDrafts` | No |
| Revisar movimientos | Sí | Según `canReview` | Según `canReview` |
| Administrar invitaciones | Sí | No | No |
| Ver bitácora de colaboración | Sí | No | No |
| Confirmar pagos, transferencias o inversiones | No se automatiza | No se automatiza | No se automatiza |

La bitácora no sustituye los campos de autoría y revisión ya presentes en los movimientos. Es una capa adicional para responder quién cambió la relación de colaboración, qué acción ocurrió, sobre qué invitación y cuándo.

## Privacidad y límites

Los registros de auditoría almacenan actor, propietaria, acción, recurso, identificador del recurso cuando corresponda y un detalle breve no financiero. No almacenan contraseñas, tokens, archivos, importes, notas privadas ni respuestas del asistente. Las invitaciones se mantienen en la base de datos privada del espacio y no se envían correos automáticos en este bloque.

La aceptación sólo será válida cuando el correo de la cuenta autenticada coincida con el correo invitado. Revocar una invitación impide que la relación continúe resolviendo acceso al espacio; no borra los movimientos ni los registros históricos.

## Criterios de aceptación

- La invitación pendiente aparece sólo a la cuenta cuyo correo coincide.
- Aceptar una invitación cambia su estado y registra un evento de auditoría para la propietaria.
- La propietaria puede consultar eventos recientes de colaboración y distinguir invitación creada, permisos actualizados, aceptación y revocación.
- Revocar o actualizar una invitación requiere rol de propietaria y registra el evento correspondiente.
- Una cuenta colaboradora no recibe la lista de invitaciones de otras personas ni los eventos de auditoría.
- Las consultas y mutaciones siguen filtrando por `ownerId` y por propiedad de la invitación.
- El borrado integral de la propietaria elimina invitaciones y bitácora asociadas sin dejar registros huérfanos.
- TypeScript, pruebas, compilación y validación del Service Worker pasan antes del checkpoint.

## Fuera de alcance

Este bloque no envía invitaciones por correo, no incorpora Google Drive, Slack, Telegram, WhatsApp ni bancos, no crea perfiles multiusuario generales y no permite que una persona colaboradora ejecute pagos, transferencias, inversiones o borrados financieros.
