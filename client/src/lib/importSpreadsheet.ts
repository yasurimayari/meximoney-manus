import * as XLSX from "xlsx";

export type ImportColumn = "date" | "description" | "amount" | "type" | "currency" | "bankReference";
export type ImportMapping = Partial<Record<ImportColumn, string>>;
export type SpreadsheetRow = Record<string, string | number | Date | null>;

const aliases: Record<ImportColumn, string[]> = {
  date: ["fecha", "date", "fecha de movimiento", "posted date"],
  description: ["concepto", "descripción", "descripcion", "detalle", "description", "memo"],
  amount: ["importe", "monto", "cantidad", "amount", "importe mxn"],
  type: ["tipo", "type", "naturaleza"],
  currency: ["moneda", "currency", "divisa"],
  bankReference: ["referencia bancaria", "referencia", "bank reference", "bankreference", "folio", "clave de rastreo"],
};

function normalized(value: unknown) {
  return String(value ?? "").trim().toLocaleLowerCase();
}

export function inferImportMapping(headers: string[]): ImportMapping {
  return Object.fromEntries((Object.keys(aliases) as ImportColumn[]).flatMap(key => {
    const match = headers.find(header => aliases[key].includes(normalized(header)));
    return match ? [[key, match]] : [];
  }));
}

export async function parseSpreadsheet(file: File): Promise<{ headers: string[]; rows: SpreadsheetRow[] }> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
  if (!firstSheet) throw new Error("El archivo no contiene una hoja que pueda importarse.");
  const rows = XLSX.utils.sheet_to_json<SpreadsheetRow>(firstSheet, { defval: null, raw: false });
  const headers = rows.length ? Object.keys(rows[0]) : [];
  return { headers, rows };
}

export function parseImportAmount(value: unknown) {
  const parsed = Number(String(value ?? "").replace(/[^0-9,.-]/g, "").replace(/,(?=\d{1,2}$)/, ".").replace(/,/g, ""));
  return Number.isFinite(parsed) ? Math.round(Math.abs(parsed) * 100) : 0;
}

export function inferImportType(row: SpreadsheetRow, mapping: ImportMapping) {
  const explicit = normalized(mapping.type ? row[mapping.type] : "");
  if (["ingreso", "income", "abono", "credit"].includes(explicit)) return "income" as const;
  if (["gasto", "expense", "cargo", "debit"].includes(explicit)) return "expense" as const;
  const numeric = Number(String(mapping.amount ? row[mapping.amount] ?? "" : "").replace(/[^0-9,.-]/g, "").replace(/,/g, ""));
  return numeric < 0 ? "expense" as const : "income" as const;
}

export function parseImportDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const text = String(value ?? "").trim();
  const latin = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  const date = latin ? new Date(`${latin[3]}-${latin[2].padStart(2, "0")}-${latin[1].padStart(2, "0")}T12:00:00`) : new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}
