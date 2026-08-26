# QA — Filtros y exportación privada de seguridad

## Validación técnica

El historial privado acepta períodos de 30, 90 y 180 días y aplica el límite de fecha en el procedimiento protegido usando el identificador de la sesión. La exportación CSV se crea localmente a partir de los eventos ya visibles y contiene exclusivamente Fecha, Actividad y Canal. La prueba unitaria verifica que no serialice correo, token, hash ni contraseña actual. `pnpm check`, `pnpm test` con 88 pruebas y `pnpm build` finalizaron correctamente.

## Validación publicada

La primera carga de `/calidad` se realizó antes de la propagación completa y todavía mostró la versión sin filtros. Tras confirmarse el despliegue, la sesión autenticada mostró correctamente los selectores de 30, 90 y 180 días, el botón de exportación desactivado ante estado vacío y el aviso explícito de exclusión de correos, enlaces, contraseñas, tokens, hashes, IP y datos del proveedor. El selector se cambió a 30 días y conservó el estado vacío correspondiente, lo que confirmó la interacción sin crear actividad ni descargar el archivo. El estado vacío es esperado porque no se generaron eventos reales posteriores a la puesta en marcha del historial.
