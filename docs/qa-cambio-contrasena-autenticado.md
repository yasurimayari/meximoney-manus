# QA — Cambio de contraseña autenticado

## Validación técnica inicial

La migración `0023_tired_lester.sql` amplía sin pérdida de datos el tipo de evento privado con `password_changed`. El procedimiento protegido exige sesión autenticada, verifica la contraseña actual, exige una nueva distinta de al menos doce caracteres, invalida los tokens de recuperación previos y registra sólo un evento mínimo sin contraseña, hash ni token. Las 87 pruebas pasan, incluyendo rechazo sin sesión, rechazo de contraseña actual incorrecta y actualización privada sin secretos. `pnpm check` y `pnpm build` finalizaron correctamente.

## Validación publicada

La primera y la segunda navegación autenticada a `/seguridad/cambiar-contrasena` devolvieron la pantalla 404 de la aplicación durante la propagación. Tras la confirmación del despliegue, la misma sesión autenticada mostró correctamente la página con los tres campos de contraseña, el aviso de invalidación de solicitudes de recuperación y las acciones de actualizar o cancelar. Se introdujeron sólo valores ficticios en los campos de nueva contraseña y confirmación; al intentar continuar sin contraseña actual, el navegador enfocó el campo obligatorio y no envió la mutación. Por tanto, no se modificó ninguna credencial ni se generó un evento real durante esta comprobación.
