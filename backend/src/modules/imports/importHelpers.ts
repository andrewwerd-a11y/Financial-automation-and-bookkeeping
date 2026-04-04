export type CsvRow = Record<string, string>;

export type CsvMapping = {
  date: string;
  amount: string;
  vendor?: string;
  description?: string;
  sourceAccount?: string;
  direction?: string;
};

export type NormalizedCsvTransaction = {
  date: string;
  amount: number;
  vendor: string;
  sourceAccount: string;
  direction: 'income' | 'expense';
  rawDescription?: string;
  duplicateKey: string;
};

export const buildDuplicateKey = (date: string, vendor: string, amount: number): string =>
  `${date}|${vendor}|${Math.abs(amount)}`;

export const normalizeCsvRow = (row: CsvRow, mapping: CsvMapping): NormalizedCsvTransaction | null => {
  const date = row[mapping.date] ?? '';
  const rawAmount = Number(row[mapping.amount] ?? 0);
  const amount = Math.abs(rawAmount);
  const vendor = row[mapping.vendor ?? ''] ?? row[mapping.description ?? ''] ?? 'Unknown';
  const sourceAccount = row[mapping.sourceAccount ?? ''] ?? 'Unspecified';
  const rawDescription = mapping.description ? row[mapping.description] : undefined;

  const directionField = mapping.direction ? (row[mapping.direction] ?? '').toLowerCase() : '';
  const direction: 'income' | 'expense' = directionField === 'income' || rawAmount < 0 ? 'income' : 'expense';

  if (!date || !amount || Number.isNaN(amount)) return null;

  return {
    date,
    amount,
    vendor,
    sourceAccount,
    direction,
    rawDescription,
    duplicateKey: buildDuplicateKey(date, vendor, amount)
  };
};
