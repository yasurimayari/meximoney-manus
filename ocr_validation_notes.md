# Validación visual de OCR

La captura automática de `/registros` devolvió 404 porque la ruta real del módulo es `/movimientos`.

La captura posterior de `/movimientos` quedó vacía en el entorno de vista previa sin una sesión autenticada. Por ello, la interfaz OCR se validó mediante TypeScript, pruebas unitarias de carga y extracción, suite completa y compilación de producción; la interacción visual autenticada deberá comprobarse en el dominio publicado.
