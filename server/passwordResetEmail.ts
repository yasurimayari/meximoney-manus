type PasswordResetEmail = { to: string; resetUrl: string };

export async function sendPasswordResetEmail({ to, resetUrl }: PasswordResetEmail) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("El correo transaccional no está configurado.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Meximoney <hola@mexi.richeon.app>",
      to: [to],
      subject: "Restablece tu contraseña de Meximoney",
      text: `Solicitaste restablecer tu contraseña de Meximoney. Abre este enlace dentro de los próximos 30 minutos: ${resetUrl}\n\nSi no solicitaste este cambio, puedes ignorar este mensaje.`,
      html: `<p>Solicitaste restablecer tu contraseña de <strong>Meximoney</strong>.</p><p><a href="${resetUrl}">Restablecer contraseña</a></p><p>El enlace vence en 30 minutos. Si no solicitaste este cambio, puedes ignorar este mensaje.</p>`,
    }),
  });
  if (!response.ok) throw new Error(`El servicio de correo no aceptó la solicitud (${response.status}).`);
}
