# QA — Historial privado de recuperación

## Validación técnica

La migración `0022_yielding_anita_blake.sql` creó sólo la tabla `passwordResetEvents` con identificador de usuario, tipo de evento, canal genérico, origen genérico y fecha. No contiene dirección de correo, token, hash, contraseña, enlace, IP ni encabezados. La migración fue aplicada correctamente. `pnpm check` y la compilación de producción finalizaron correctamente. La suite Vitest contiene 84 pruebas correctas: una prueba específica confirma que la consulta protegida no serializa correo, token ni hash y otra verifica que el borrado completo elimina tanto los tokens como los eventos privados de recuperación.

## Validación publicada

La primera carga autenticada de `Calidad, perfil y privacidad` sirvió la versión previa, antes de que el despliegue terminara de propagar. Tras confirmarse el despliegue, la misma sesión autenticada mostró correctamente la tarjeta **Seguridad de acceso** con los rótulos `Canal habilitado`, `Remitente configurado`, la explicación de protección no enumerativa y el estado vacío. La revisión visual verificó que no se muestra dirección de correo, enlace, token, hash, contraseña, IP ni detalles de Resend. No se creó ninguna solicitud de recuperación ni se modificaron credenciales durante esta QA.
