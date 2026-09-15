# Fase 0 — Línea base de uso y privacidad

## Propósito

La línea base es un instrumento privado para conocer qué información existe en Meximoney y qué cobertura tiene. No es un score, no evalúa a la usuaria y no crea, modifica ni elimina registros financieros.

## Criterios iniciales de éxito

| Métrica | Fórmula visible | Meta inicial | Uso previsto |
|---|---|---:|---|
| Medio de pago | Movimientos con cuenta, TDC o deuda vinculada ÷ movimientos totales | 100% | Evitar importes sin trazabilidad de pago. |
| Categoría | Ingresos y gastos con categoría ÷ ingresos y gastos | 95% | Mejorar presupuesto y analítica. |
| Revisión | Movimientos confirmados y aprobados ÷ movimientos totales | 95% | Distinguir datos verificados de borradores o pendientes. |
| Conciliación | Movimientos conciliados ÷ movimientos con medio de pago | 80% | Facilitar la comparación gradual con estados de cuenta. |

Estas metas son criterios de orientación para el uso personal. Un porcentaje bajo puede deberse a datos históricos importados, periodos aún no conciliados o partidas que requieren una decisión humana; no demuestra necesariamente un error financiero.

## Inventario privado

La sección **Espacio → Línea base privada** muestra cantidades agregadas de entidades, cuentas, tarjetas, movimientos, documentos, planificación y patrimonio. También muestra alertas de calidad abiertas y el estado de dos opciones: revisión humana y consentimiento del perfil ampliado.

## Política operativa de privacidad

Los datos financieros se consultan mediante procedimientos protegidos y se aíslan por usuaria o espacio autorizado. La aplicación permite el borrado integral de los datos privados asociados al espacio. La copia offline es voluntaria, local y cifrada; se protege con un PIN local y no incluye contraseñas, sesiones, email, fecha de nacimiento, archivos, enlaces de documentos, URLs de archivo ni claves de almacenamiento.

La caché de la PWA conserva sólo recursos de la aplicación y el icono de instalación. No guarda respuestas de `/api/` ni archivos privados de almacenamiento. El modo offline es de consulta: no puede registrar, editar, aprobar ni sincronizar movimientos.

> La seguridad de la copia offline también depende del dispositivo y del secreto del PIN local. La usuaria debe eliminar la copia cuando deje de usar un dispositivo compartido.

## Límites y revisión

Los criterios deben revisarse después de varias semanas de uso real. La conciliación no se debe forzar para cerrar una métrica: cada coincidencia requiere revisión contra el estado de cuenta. Las automatizaciones bancarias y las integraciones externas permanecen fuera de la Fase 0.
