# QA de restauración gradual: compras financiadas

## Estado técnico inicial

La reconciliación confirmó que la migración `0016_reflective_landau` ya está registrada en el diario y aplicada en la base de datos. La tabla `debtPayments` y los campos de compras financiadas de `debts` están presentes, por lo que no se ejecutó ninguna migración adicional ni se modificaron datos existentes.

La validación de tipos y la suite Vitest pasaron con 61 pruebas. La comprobación visual del entorno local no permitió confirmar las pantallas autenticadas: `/planificacion` apareció en blanco y `/registros` respondió con una página 404 del entorno. La validación visual se repitió en el dominio publicado después de crear el checkpoint de esta fase.

El dominio publicado cargó el Panel y la pestaña Planificación/Deudas sin HTTP 500. Al cargar Planificación directamente se detectó el error React #310: el filtro de espacio se calculaba en un hook posterior al retorno de carga inicial. Se movió ese cálculo antes del retorno condicional y la validación estática y de regresión volvió a pasar. Esta corrección se publicará y verificará antes de marcar la fase como validada.

Después de la publicación de la corrección, Panel y Registros cargaron directamente con la sesión autenticada. Planificación sigue aislando el error React #310 al concluir su carga, por lo que el problema se limita a esa vista y requiere una corrección adicional antes de continuar con alertas internas.

## Límite de esta fase

Esta entrega no incorpora alertas de tarjetas, alertas de deudas, preferencias de Telegram, tareas programadas ni cambios a la infraestructura del servidor.
