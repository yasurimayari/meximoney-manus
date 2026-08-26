export function passwordResetRequestResponse(deliveryReady: boolean) {
  return {
    success: true as const,
    deliveryReady,
    message: deliveryReady
      ? "Si existe una cuenta con ese correo, enviaremos instrucciones. Si no ves el mensaje en unos minutos, revisa spam o solicita otro enlace."
      : "La recuperación por correo está preparada y se activará cuando se verifique el remitente de Meximoney.",
  };
}
