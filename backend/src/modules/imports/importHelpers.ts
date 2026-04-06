export type CsvRow = Record<string, string>;

export type NormalizedCsvTransaction = {
  date: string;
  vendor: string;
  amount: number;
  descriptionRaw: string;
};

const pick = (row: CsvRow, keys: string[]): string => {
  const hit = Object.keys(row).find((key) => keys.includes(key.toLowerCase()));
  return hit ? String(row[hit] ?? '') : '';
};

export const normalizeCsvRow = (row: CsvRow): NormalizedCsvTransaction | null => {
  const date = pick(row, ['date', 'transaction date', 'posted date']).trim();
  const vendor = pick(row, ['vendor', 'merchant', 'payee', 'description']).trim();
  const amountText = pick(row, ['amount', 'debit', 'credit']).trim();
  const descriptionRaw = pick(row, ['description', 'memo', 'notes']).trim();

  const amount = Number(amountText.replace(/[$,]/g, ''));
  if (!date || !vendor || Number.isNaN(amount) || amount === 0) return null;

  return {
    date,
    vendor,
    amount: Math.abs(amount),
    descriptionRaw
  };
};
