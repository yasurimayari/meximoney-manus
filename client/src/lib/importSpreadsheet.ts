import * as XLSX from "xlsx";

export type ImportColumn = "date" | "description" | "amount" | "type" | "currency" | "bankReference" | "debit" | "credit";
export type ImportMapping = Partial<Record<ImportColumn, string>>;
export type SpreadsheetRow = Record<string, string | number | Date | null>;

const aliases: Record<ImportColumn, string[]> = {
  date: ["fecha", "date", "fecha de movimiento", "posted date"],
  description: ["concepto", "descripción", "descripcion", "detalle", "description", "memo"],
  amount: ["importe", "monto", "cantidad", "amount", "importe mxn"],
  type: ["tipo", "type", "naturaleza"],
  currency: ["moneda", "currency", "divisa"],
  bankReference: ["referencia bancaria", "referencia", "bank reference", "bankreference", "folio", "clave de rastreo"],
  // Muchos bancos mexicanos (HSBC entre ellos) no traen un solo "Importe" con
  // signo, sino dos columnas separadas sin combinar.
  debit: ["cargo", "cargos", "debe", "retiro", "retiros", "debit"],
  credit: ["abono", "abonos", "haber", "depósito", "depósitos", "deposito", "depositos", "credit"],
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

// XLSX.read no valida el tipo real del archivo: si se le pasa un PDF u otro
// binario, lo interpreta como texto plano en una sola columna y genera una
// "fila" falsa por cada línea de la estructura interna del archivo (objetos,
// streams, tablas de fuentes...) en vez de fallar. Con un PDF de varias
// páginas eso produce cientos o miles de filas basura, así que la extensión
// se valida aquí, antes de intentar parsear nada.
const ALLOWED_EXTENSIONS = /\.(csv|xls|xlsx)$/i;

export async function parseSpreadsheet(file: File): Promise<{ headers: string[]; rows: SpreadsheetRow[] }> {
  if (!ALLOWED_EXTENSIONS.test(file.name)) throw new Error("Solo se admiten archivos CSV o Excel (.csv, .xls, .xlsx). Exporta el estado de cuenta de tu banco en ese formato -- un PDF no puede leerse como tabla de datos.");
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

// Para el formato de dos columnas (Cargo/Abono): sólo una de las dos trae
// importe en cada fila. Una fila con las dos vacías no es un movimiento (fila
// de saldo, encabezado repetido, etc.); una fila con las dos llenas es
// ambigua y se descarta explícitamente en vez de adivinar.
export function amountFromDebitCredit(debitValue: unknown, creditValue: unknown): { amountCents: number; type: "income" | "expense" } | null {
  const debitCents = parseImportAmount(debitValue);
  const creditCents = parseImportAmount(creditValue);
  if (debitCents > 0 && creditCents > 0) return null;
  if (debitCents > 0) return { amountCents: debitCents, type: "expense" };
  if (creditCents > 0) return { amountCents: creditCents, type: "income" };
  return null;
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
