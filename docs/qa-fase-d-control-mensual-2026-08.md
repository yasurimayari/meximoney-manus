# QA — Fase D: Control mensual transversal

## Verificación visual autenticada

La ruta publicada `/control-mensual` se abrió con la sesión autenticada de Yasuri. El menú lateral mostró el nuevo acceso **Control mensual** y la vista cargó el periodo de agosto de 2026.

La pantalla mostró el estado inicial correcto: no había rutina guardada, las seis confirmaciones estaban desmarcadas, el estado era borrador y los campos narrativos estaban vacíos. Los seis bloques de lectura estuvieron visibles con enlaces a sus fuentes originales: Movimientos y revisión, Calidad de datos, Agenda y vencimientos, Tarjetas y deudas, Libro PFAE, y Patrimonio y fotografía.

Se verificó el límite manual visible: la página no calcula impuestos, no envía recordatorios, no ejecuta pagos y no cierra estados por sí sola. No se marcaron confirmaciones, no se eligió otro estado, no se escribieron observaciones y no se pulsó **Guardar control**.

La verificación acotada de solicitudes no encontró llamadas a `monthlyControl.save` durante la QA. Por tanto, no se creó ni actualizó una revisión mensual o su checklist privado.

## Datos de solo lectura observados

La interfaz reflejó cuatro alertas de calidad, cuatro referencias de obligaciones y la ausencia de una fotografía patrimonial cerrada para el periodo. Estos valores sólo se visualizaron como referencias derivadas; no se corrigieron ni modificaron registros financieros existentes.
