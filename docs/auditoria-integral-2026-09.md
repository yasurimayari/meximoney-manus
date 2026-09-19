# Auditoría integral de Meximoney

**Fecha:** 19 de septiembre de 2026  
**Alcance:** revisión estática y de pruebas de fases A–E y Fase 4, con corrección de defectos reproducibles de aislamiento, privacidad, offline, consistencia de saldos, agregación financiera y rendimiento de carga.

## Estado de fases

| Fase | Estado | Evidencia principal |
|---|---|---|
| A — Base de datos y multi-entidad | Completada | Entidades, proyectos, moneda de reporte, conversiones manuales y filtros están presentes; las referencias cruzadas ahora validan ownership de forma centralizada en los flujos auditados. |
| B — Captura y control de calidad | Completada | Importación revisable, detección de duplicados, captura rápida y plantillas existen; la previsualización y confirmación de importaciones ahora rechazan cuentas, categorías, entidades y proyectos ajenos. |
| C — Libro PFAE y CxC | Completada | Persisten límites manuales, evidencias y revisiones; no se convierte en declaración fiscal automática. |
| D — Decisión y simulación | Completada | Simuladores, presupuesto y política de excedentes siguen siendo informativos y de solo lectura; las entradas financieras aprobadas son la base de cálculo. |
| E — Experiencia avanzada | Completada, con voz fuera de alcance aprobado | PWA, ICS, notificaciones consentidas, score transparente, estacionalidad, hábitos opt-in y OCR revisable están disponibles. Voz permanece excluida por decisión expresa. |
| Fase 0–3 de mejora | Completadas | Línea base, calidad, PWA/offline y Mexi explicable se encuentran documentadas y entregadas. |
| Fase 4 — colaboración, permisos y auditoría | Completada | Invitación, aceptación, mínimo privilegio, revocación, bitácora y separación de funciones con historial de revisión. |
| Fase 5 | Completada | OCR revisable, estacionalidad y hábitos opt-in. |
| Fase 6 | Aplazada intencionalmente | Integraciones externas, mensajería y automatización sólo se evaluarán tras uso real y una solicitud explícita. |

## Hallazgos corregidos

| Severidad | Hallazgo | Corrección aplicada | Validación |
|---|---|---|---|
| Alta | Algunas referencias cruzadas de movimientos, importaciones y viajes podían depender de validaciones específicas dispersas. | Se incorporó `assertOwnedReferences`, que comprueba ownership de cuenta, categoría, objetivo, entidad, proyecto, deuda, tarjeta, contacto, movimiento, tarea y documento antes de los flujos auditados. | Regresión cross-user y suite del router. |
| Alta | El proxy `/manus-storage/*` podía generar una URL firmada sin comprobar que la clave privada perteneciera a la sesión. | El proxy ahora exige sesión autenticada y ownership server-side para avatar, documentos, OCR, informes crediticios y adjuntos del Diario. La única excepción es el icono PWA público permitido explícitamente. | TypeScript, build y revisión de registro Express. |
| Alta | El borrado integral no limpiaba algunas credenciales locales y artefactos de colaboración/espacio asociados. | Se añadieron credenciales locales, entidades, proyectos, tipos de cambio e invitaciones/auditoría vinculadas a la limpieza transaccional. | Prueba de privacidad extendida. |
| Alta | La bóveda offline era global al dispositivo y dejaba un resumen en claro. | Versión 2: asociación con `ownerUserId`, limpieza al cambiar/cerrar sesión, resumen sólo tras renovación en memoria, metadata cifrada, lockout progresivo tras intentos fallidos y consulta server-side exclusiva de propietaria. | Prueba de snapshot, TypeScript, SW y captura móvil de `/offline`. |
| Alta | El cálculo de cuentas podía divergir de patrimonio/exportaciones y se corría riesgo de volver a aplicar movimientos en el cliente. | El snapshot calcula el saldo efectivo desde base manual más movimientos confirmados y aprobados; expone `manualValueCents` para que Cuentas no duplique la variación. | Regresiones de cuenta y suite completa. |
| Media | Eliminar un gasto de tarjeta limitaba el saldo a cero y podía borrar un saldo a favor legítimo. | Se eliminó el clamp a cero en borrado individual y masivo. | Router y pruebas completas. |
| Media | Analítica, Presupuesto vs Real y PDF podían agregar movimientos no confirmados o pendientes. | Se alinearon con `status: confirmed` y `reviewStatus: approved`; las exportaciones incluyen sólo registros contables aprobados. | Pruebas de analítica, presupuesto y reportes. |
| Media | El factor de hábito del Score otorgaba puntos por registrar movimientos aunque el módulo de Hábitos fuera opt-in. | El factor exige consentimiento explícito; no usa actividad de registro como proxy de hábito. | Prueba del Score personal. |
| Media | El bundle inicial incluía de forma eager módulos pesados de todo el producto. | Las páginas internas se cargan bajo demanda; el entry principal pasó de aproximadamente 4.13 MB / 924 KB gzip a aproximadamente 740 KB / 215 KB gzip. | Build de producción. |
| Baja | El drawer móvil podía quedar abierto tras elegir una sección. | Navegación centralizada que cierra el drawer antes de cambiar ruta. | TypeScript y revisión de componente. |

## Controles confirmados

La auditoría confirma que Mexi IA conserva un límite de solo lectura; el OCR genera propuestas revisables y no crea movimientos automáticamente; la PWA no cachea respuestas `/api` ni medios privados; las operaciones financieras requieren conexión y acción humana; y las exportaciones no ejecutan acciones externas.

## Límites y seguimiento

No se realizó una prueba autenticada end-to-end contra datos reales, porque la vista previa técnica no comparte la sesión del dominio publicado. Las capturas móviles de rutas protegidas (`/datos-offline` y `/cuentas`) quedaron vacías por esta barrera de sesión, mientras que `/offline` se verificó visualmente. Antes de una nueva fase, conviene que la propietaria compruebe en el dominio publicado: creación/renovación de la bóveda, acceso a un archivo privado propio, saldo de una cuenta con movimientos posteriores a su valoración y cierre del menú móvil después de navegar.

Las integraciones externas de Fase 6 siguen **aplazadas**: no se activaron conexiones bancarias, mensajería ni automatizaciones. El build conserva chunks pesados bajo demanda, en particular Asistente y dependencias de renderizado; ya no forman parte del bundle inicial, pero podrían optimizarse de manera adicional si el uso medido lo justifica.

## Validación ejecutada

| Comprobación | Resultado |
|---|---|
| `pnpm check` | Correcto |
| `pnpm test -- --run` | 101 archivos aprobados, 1 omitido; 307 pruebas aprobadas, 2 omitidas |
| `pnpm build` | Correcto |
| `node --check client/public/sw.js` | Correcto |
| `git diff --check` | Correcto |
| Captura móvil `/offline` | Correcta: tarjeta de desbloqueo legible y sin acciones financieras |
| Capturas protegidas `/datos-offline`, `/cuentas` | Limitadas por sesión de vista previa independiente; no se infiere fallo funcional |
