# QA — Navegación inferior y asistente Mexi con Claude

## Cambios comprobados

La navegación principal conserva las vistas operativas de Meximoney y ya no muestra **Exportar** ni **Revisión**. Ambas opciones están disponibles dentro del menú del perfil de Yasuri junto con Perfil y privacidad, Contraseña, Notificaciones y Espacio; sus rutas no cambiaron.

Mexi utiliza ahora la Messages API de Claude desde el servidor. La clave `ANTHROPIC_API_KEY` se configuró como secreto del proyecto: no se devuelve por tRPC, no se escribe en la base de datos y no llega al navegador. La llamada envía a Claude una síntesis de los registros manuales del espacio autenticado y la pregunta vigente; no usa cuentas bancarias, herramientas externas ni acciones financieras.

## Validación técnica

| Prueba | Resultado |
|---|---|
| Conteo de tokens con la clave de Anthropic | Correcto |
| Respuesta mínima mediante el cliente real de Mexi | Correcta, sin datos financieros |
| Cliente Claude aislado con pruebas unitarias | Correcto: requiere clave de servidor, usa los encabezados privados y concatena bloques de texto |
| Procedimiento tRPC de Mexi | Correcto: usa el identificador autenticado, exige consentimiento y no incorpora el nombre de la clave en el contexto enviado |
| Tipos, pruebas y compilación | Correctos antes de la QA final |

## Alcance de la QA publicada

El navegador disponible no contenía una sesión autenticada de Meximoney y la usuaria no puede tomar el control del navegador. Por protección de datos, no se creó una cuenta de prueba ni se ingresaron credenciales. La pantalla pública confirmó que el acceso continúa protegido; la validación funcional del proveedor se realizó con una pregunta mínima sin registros financieros y las pruebas de integración verificaron el flujo con un snapshot manual aislado.
