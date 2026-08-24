# Diseño: captura rápida por texto natural

La captura rápida se mantiene como una **opción futura desactivada por defecto**. Su finalidad será convertir texto como “pagué 280 MXN a Notion hoy” en un borrador de movimiento visible para revisión humana.

## Flujo previsto

1. La usuaria activa la función de forma explícita desde Configuración.
2. Escribe una instrucción de texto y ve un aviso sobre el posible coste variable del modelo de lenguaje.
3. El sistema devuelve un borrador con tipo, importe, moneda, fecha, contraparte y campos que no pudo inferir.
4. La usuaria completa o corrige los campos y pulsa **Confirmar y guardar**.
5. Sin esa confirmación no se crea ningún movimiento, pago, transferencia, registro fiscal ni comunicación externa.

## Límites de privacidad y alcance

La futura función no conectará bancos, no guardará credenciales, no iniciará pagos, no usará voz ni OCR y no presentará declaraciones fiscales. Cualquier integración de IA deberá documentar modelo, coste variable, tratamiento de datos y controles de consentimiento antes de habilitarse.
