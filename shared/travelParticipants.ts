export function normalizeParticipantIds(values: number[] | undefined): number[] | undefined {
  if (values === undefined) return undefined;
  return Array.from(new Set(values.filter(id => Number.isInteger(id) && id > 0)));
}

export function participantContactTypeLabel(type: string | null | undefined): string {
  if (!type) return "Contacto";
  const labels: Record<string, string> = {
    family: "Familia",
    friend: "Amistad",
    partner: "Socio",
    provider: "Proveedor",
    client: "Cliente",
    team: "Equipo",
  };
  return labels[type] ?? type;
}
