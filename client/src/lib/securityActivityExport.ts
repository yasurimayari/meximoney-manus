export type SecurityActivityEvent = {
  eventType: "requested" | "email_sent" | "email_failed" | "password_reset" | "password_changed";
  channel: "email";
  createdAt: Date | string;
};

export type SecurityActivityExportRow = {
  Fecha: string;
  Actividad: string;
  Canal: string;
};

export function securityEventLabel(eventType: SecurityActivityEvent["eventType"]) {
  return eventType === "requested" ? "Solicitud recibida" : eventType === "email_sent" ? "Correo solicitado al proveedor" : eventType === "email_failed" ? "Correo no enviado" : eventType === "password_changed" ? "Contraseña cambiada desde sesión" : "Contraseña restablecida";
}

function exportDate(value: Date | string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

function escapeCsv(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export function buildSecurityActivityExportRows(events: SecurityActivityEvent[]): SecurityActivityExportRow[] {
  return events.map(event => ({
    Fecha: exportDate(event.createdAt),
    Actividad: securityEventLabel(event.eventType),
    Canal: event.channel === "email" ? "Correo" : "Canal protegido",
  }));
}

export function buildSecurityActivityCsv(rows: SecurityActivityExportRow[]) {
  const headers: (keyof SecurityActivityExportRow)[] = ["Fecha", "Actividad", "Canal"];
  return `\uFEFF${[headers, ...rows.map(row => headers.map(header => row[header]))].map(row => row.map(escapeCsv).join(",")).join("\n")}`;
}

export function exportSecurityActivityCsv(events: SecurityActivityEvent[]) {
  const rows = buildSecurityActivityExportRows(events);
  const blob = new Blob([buildSecurityActivityCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `meximoney-actividad-seguridad-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
