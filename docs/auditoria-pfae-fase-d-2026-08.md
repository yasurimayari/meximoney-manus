# Auditoría PFAE y siguiente fase — 2026-08

## Dictamen del bloque cerrado

La revisión posterior confirma que el Libro PFAE conserva su naturaleza **manual e informativa**. La rutina mensual exige confirmaciones explícitas; la exportación se limita a los datos manuales del periodo; las notas de decisión se almacenan separadas de las notas de revisión; y la comparación mensual sólo cuenta estados ya registrados. No se identificó una acción que calcule impuestos, genere CFDI, consulte al SAT o altere movimientos, CxC, patrimonio o declaraciones.

La regresión técnica completó chequeo de tipos, compilación y 33 archivos / 92 pruebas. La QA autenticada confirmó el estado vacío, la rutina abierta y la comparación de seis periodos sin crear renglones ni cerrar revisiones. El recordatorio PFAE es derivado en la bandeja interna: sólo aplica a la propietaria cuando el periodo anterior tiene renglones o una rutina abierta, y no usa cron ni canales externos.

## Hallazgo y decisión de fase

El Libro PFAE sólo permite elegir el periodo. Aunque sus renglones ya conservan `entityId` y `projectId`, no existe un filtro de lectura para separar el análisis operativo por entidad o proyecto. Esto dificulta revisar una línea de negocio sin mezclar renglones de otras entidades dentro del mismo periodo.

> La rutina mensual seguirá siendo una constancia consolidada de revisión PFAE por periodo. Un filtro de lectura no debe crear ni sustituir cierres fiscales por entidad, ni inferir el tratamiento de renglones sin entidad o proyecto.

La siguiente fase añade filtros manuales de **Todas las entidades / entidad específica** y **Todos los proyectos / proyecto específico**. El conjunto filtrado se aplicará de forma coherente a métricas, calidad, conciliación, tabla, comparación mensual y CSV. El estado inicial seguirá siendo consolidado. Los renglones sin vínculo sólo aparecerán en la vista consolidada; no se asignarán automáticamente a una entidad o proyecto.
