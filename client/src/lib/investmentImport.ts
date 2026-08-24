export type InvestmentImportRow = { name: string; type: string; institution: string; currency: string; cost: number; current: number; valuationDate: string; includeInNetWorth: boolean; notes: string };
const allowedTypes = new Set(["savings", "fixed_income", "fund_etf", "stock", "crypto", "land", "property", "business_equity", "retirement", "other"]);

export function parseInvestmentCsv(text: string) {
  const [header, ...lines] = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const columns = header.split(",").map(value => value.trim().toLowerCase());
  const valueAt = (line: string, name: string) => line.split(",").map(value => value.trim()).at(columns.indexOf(name)) ?? "";
  const errors: string[] = [];
  const rows = lines.map((line, index) => {
    const name = valueAt(line, "nombre"); const type = valueAt(line, "tipo").toLowerCase() || "other"; const currency = valueAt(line, "moneda").toUpperCase();
    const cost = Number(valueAt(line, "costo")); const current = Number(valueAt(line, "valor_actual"));
    if (!name || !currency || !Number.isFinite(cost) || !Number.isFinite(current) || !allowedTypes.has(type)) errors.push(`Fila ${index + 2}: revisa Nombre, Tipo, Moneda, Costo y Valor_actual.`);
    return { name, type, institution: valueAt(line, "institucion"), currency, cost, current, valuationDate: valueAt(line, "fecha_valoracion"), includeInNetWorth: !["no", "false", "0"].includes(valueAt(line, "incluir_patrimonio").toLowerCase()), notes: valueAt(line, "notas") };
  });
  return { rows, errors };
}

export function investmentTemplateCsv() { return "Nombre,Tipo,Institucion,Moneda,Costo,Valor_actual,Fecha_valoracion,Incluir_patrimonio,Notas\nFondo de emergencia,savings,Plata,MXN,10000,10000,2026-08-24,Si,Valuación manual\nBitcoin,crypto,Plataforma,USD,500,540,2026-08-24,Si,Confirmar conversión manual a MXN"; }
