# QA — Amortización, Score, Proyectos, documentos y navegación

## Alcance validado

La entrega sigue siendo de **registro y análisis manual**. No abre conexiones bancarias, no consulta Buró de Crédito, no crea pagos, no programa cobros ni cambia Telegram o las notificaciones existentes. La amortización es un escenario de referencia y los cargos por atraso sólo se reflejan tras un guardado explícito.

| Área | Validación | Resultado |
|---|---|---|
| Amortización | Se probaron interés ordinario, reducción de capital, saldo final sin negativo y la advertencia cuando la cuota de referencia no cubre el interés. | Correcto: la tabla es derivada y no muta datos al abrirse. |
| Cuotas | Se valida que capital, interés ordinario, interés vencido y cargos sumen exactamente el pago total. | Correcto: se preserva compatibilidad para cuotas antiguas sin desglose, tratándolas como interés ordinario residual. |
| Atrasos | El cargo manual admite interés vencido, cargo financiero, otro cargo y corrección confirmada. | Correcto: valida moneda, propiedad, saldo no negativo y no capitaliza datos automáticamente. |
| Score | Se probaron límites de los cuatro rangos visuales publicados y la ausencia de clasificación en huecos o valores externos. | Correcto: las series de gráfica sólo representan registros crediticios y cortes SPF manuales. |
| Proyectos | Se probó el cálculo del progreso con tareas completadas, archivadas, pendientes y canceladas. | Correcto: Lista, Kanban y Calendario toman la misma colección y muestran proyectos sin tareas. |
| PDFs | Se probaron MIME, firma PDF y saneamiento del nombre. | Correcto: sólo se envían bytes al almacenamiento durante el guardado explícito; la base conserva únicamente metadatos y referencia. |
| Navegación | Se reorganizó el lateral en Resumen, Registro, Dinero, Planificación y Gestión. | Correcto: la vista contraída mantiene iconos y el menú inferior conserva configuración, privacidad y seguridad. |

## Pruebas y compilación

Se ejecutaron `pnpm check`, `pnpm test`, `pnpm build` y la comprobación de sintaxis del worker. La suite terminó con **52 archivos correctos, 1 omitido; 140 pruebas correctas y 2 omitidas**. La compilación completó correctamente; conserva el aviso preexistente de paquetes superiores a 500 kB, sin constituir un error de ejecución.

La revisión visual sin autenticación confirmó que el entorno técnico sólo muestra la puerta de acceso protegida. No se intentó iniciar sesión ni efectuar una prueba que implicara guardar datos de la propietaria.

## Integridad de datos

Las migraciones `0033` y `0034` fueron revisadas antes de aplicarse. Únicamente crean `debtBalanceAdjustments`, añaden el desglose de cuota y agregan metadatos para archivos PDF. La comprobación posterior encontró **cero cargos manuales**, **cero cuotas**, y **cero documentos con PDF**. Había un proyecto y una tarea anteriores, que no fueron creados, editados ni eliminados durante este bloque.

## Comprobación voluntaria pendiente

La propietaria puede probar primero con información propia que desee conservar. Para una moto financiada, debe registrar en **Planificación → Deudas → Ver amortización** cada interés vencido o cargo exactamente como aparezca en su estado de cuenta y, al pagar, desglosar la cuota conciliada. La tabla no sustituye los términos del crédito ni el estado de cuenta del acreedor. [1]

En **Documentos**, un PDF de hasta 10 MB se guarda sólo al confirmar el formulario. No debe incluirse en la copia offline y no se analiza su contenido. En **Proyectos**, crear o editar un proyecto, parte o tarea debe reflejarse de inmediato en las tres vistas y heredar el color elegido.

## Referencias

[1]: https://www.burodecredito.com.mx/generales/blog/todo-sobre-bur%C3%B3/tu-mi-score-de-riesgo-crediticio-ha-cambiado-como-quedo-tu-puntuacion.html "Buró de Crédito — Rangos visuales de Mi Score"
