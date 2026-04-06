export type CsvRow = Record<string, string>;

export type NormalizedCsvTransaction = {
  date: string;
  vendor: string;
  amount: number;
  descriptionRaw: string;
};

export type CsvMappingConfig = {
  dateColumn: string;
  vendorColumn: string;
  amountColumn: string;
  descriptionColumn?: string;
};

const pick = (row: CsvRow, keys: string[]): string => {
  const hit = Object.keys(row).find((key) => keys.includes(key.toLowerCase()));
  return hit ? String(row[hit] ?? '') : '';
};

const parseAmount = (amountText: string) => Number(amountText.replace(/[$,]/g, ''));

const normalizeCore = (date: string, vendor: string, amountText: string, descriptionRaw: string): NormalizedCsvTransaction | null => {
  const amount = parseAmount(amountText.trim());
  if (!date.trim() || !vendor.trim() || Number.isNaN(amount) || amount === 0) return null;

  return {
    date: date.trim(),
    vendor: vendor.trim(),
    amount: Math.abs(amount),
    descriptionRaw: descriptionRaw.trim()
  };
};

export const normalizeCsvRow = (row: CsvRow): NormalizedCsvTransaction | null => {
  const date = pick(row, ['date', 'transaction date', 'posted date']);
  const vendor = pick(row, ['vendor', 'merchant', 'payee', 'description']);
  const amountText = pick(row, ['amount', 'debit', 'credit']);
  const descriptionRaw = pick(row, ['description', 'memo', 'notes']);

  return normalizeCore(date, vendor, amountText, descriptionRaw);
};

export const normalizeCsvRowWithMapping = (row: CsvRow, mapping: CsvMappingConfig): NormalizedCsvTransaction | null => {
  const date = String(row[mapping.dateColumn] ?? '');
  const vendor = String(row[mapping.vendorColumn] ?? '');
  const amountText = String(row[mapping.amountColumn] ?? '');
  const descriptionRaw = mapping.descriptionColumn ? String(row[mapping.descriptionColumn] ?? '') : '';

  return normalizeCore(date, vendor, amountText, descriptionRaw);
};
