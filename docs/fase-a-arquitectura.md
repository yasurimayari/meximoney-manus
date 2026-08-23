# Fase A — arquitectura de datos y colaboración

## Principios innegociables

Meximoney seguirá operando sin conexión bancaria, sin ejecución de pagos o inversiones y con confirmación humana antes de consolidar información financiera. La propietaria conserva la autoridad total; una persona gestora o contadora sólo accede tras invitación, aceptación y permisos explícitos.

## Espacio propietario y colaboración

Cada fila financiera continúa perteneciendo a una **propietaria de espacio**. El acceso de gestor no duplica datos ni convierte a la persona gestora en copropietaria. La resolución de acceso devuelve el identificador de la propietaria junto con una capacidad: `owner`, `manager` o `reviewer`.

| Rol | Puede ver | Puede crear borradores | Puede confirmar/revisar | Puede invitar o borrar |
|---|---:|---:|---:|---:|
| Propietaria | Sí | Sí | Sí | Sí |
| Gestor | Según permiso | Según permiso | Según permiso | No |
| Revisor | Según permiso | No | Según permiso | No |

Las invitaciones se emiten por correo, se aceptan desde una cuenta local existente o recién creada y pueden revocarse. No se envían correos automáticos en esta fase.

## Entidad, proyecto y moneda

Todo registro nuevo puede asociarse a una entidad y, opcionalmente, a un proyecto. La entidad contiene país, forma legal, estado, moneda funcional y régimen; el proyecto permite diferenciar líneas operativas bajo una misma entidad.

Cada importe conserva moneda original. Cuando el usuario decide mostrarlo en moneda base, se guarda el tipo de cambio manual aplicado, la fecha, fuente y el importe convertido; si falta tipo de cambio, la interfaz lo muestra como pendiente y nunca inventa una conversión.

## Revisión humana

Los movimientos usan el estado existente `needs_review`, `estimated` o `confirmed`. La Fase A agrega trazabilidad de quién creó, modificó y revisó cada movimiento; la confirmación nunca es automática por IA ni por importación.

## Onboarding inicial

El onboarding captura nombre de espacio, moneda base, residencia fiscal, régimen PFAE, política de tipo de cambio y confirmación de revisión humana. Propone entidades configurables con datos editables antes de guardarlos; no crea obligaciones, tasas, declaraciones ni datos fiscales a partir de inferencias.

## Archivos

Los documentos continúan almacenando metadatos y un enlace de referencia. Para Google Drive se guardará una URL manual validada y una etiqueta de proveedor; no se copiarán PDF ni se pedirá acceso a Drive en la Fase A.
