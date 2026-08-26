# Rutina mensual y exportación PFAE informativa

## Propósito

Esta mejora organiza una **revisión humana por periodo** y permite compartir una exportación privada de los datos capturados en el Libro PFAE. No determina obligaciones, impuestos, deducibilidad ni declaraciones. La usuaria conserva la decisión sobre cada renglón, vínculo, evidencia y cierre de revisión.

> El estado mensual representa una constancia interna de revisión manual. No es una declaración, una contabilidad certificada ni una confirmación de cumplimiento ante el SAT.

## Rutina mensual propuesta

| Paso manual | Evidencia visible | Resultado persistido |
|---|---|---|
| Clasificar los renglones del periodo | Conteo de renglones y pendientes de revisión | Confirmación manual de clasificación |
| Revisar evidencia y referencias | Conteo de documentos faltantes y referencias capturadas | Confirmación manual de evidencia |
| Revisar cobros CxC vinculados | Cobros conciliados y abonos pendientes de enlace | Confirmación manual de conciliación |
| Registrar la conclusión del periodo | Nota opcional y fecha de confirmación | Estado de rutina: abierta o revisada |

La aplicación mostrará estos indicadores para orientar la revisión, pero no bloqueará la decisión humana ni inferirá que una partida es correcta fiscalmente. Sólo la propietaria podrá registrar la conclusión del periodo.

## Estado por periodo

Se almacenará una fila privada por usuaria y mes. Su estado será **abierta** hasta que la propietaria confirme los tres controles manuales y la marque como **revisada**. Reabrir el periodo conservará la nota y la trazabilidad de la última revisión, sin alterar ningún renglón PFAE ni vínculo financiero.

## Exportación informativa

La exportación será un CSV generado localmente desde el periodo seleccionado. Incluirá una cabecera de alcance, resumen de importes manuales y renglones con descripción, tipo, estado de revisión, deducibilidad manual, entidad/proyecto, referencia, estado de CxC, evidencia por nombre, importes, moneda y fechas. No incluirá contraseñas, tokens, direcciones de correo, URLs de documentos, credenciales, datos bancarios ni cálculos tributarios.

El archivo llevará una advertencia explícita: los valores son datos manuales informativos y requieren revisión humana antes de cualquier uso contable o fiscal externo.
