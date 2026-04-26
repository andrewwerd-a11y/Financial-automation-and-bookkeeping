# Runbook

## Starting the stack

```bash
npm install                        # install all workspace deps
npm rebuild better-sqlite3 -w backend   # rebuild native addon for current Node
npm run db:init -w backend         # create/migrate the database
npm run dev -w backend             # backend on :4000
npm run dev -w frontend            # frontend on :5173
```

## Resetting the database

To wipe all data and start fresh:

```bash
# Option 1: delete the db file and re-init
rm backend/data/finance.db
npm run db:init -w backend

# Option 2: use the API (keeps the file, truncates all tables)
curl -X POST http://localhost:4000/api/system/clear-data
```

## Seeding demo data

Set `FIN_DB_SEED=1` before starting the backend, or run directly:

```bash
FIN_DB_SEED=1 npm run dev -w backend
# or one-shot
npx tsx backend/src/db/seed.ts
```

## Running tests

```bash
npm test -w backend                # all tests (unit + integration + e2e)
npm run test:watch -w backend      # watch mode
```

## Changing the database file location

Set `FIN_DB_FILE` before starting:

```bash
FIN_DB_FILE=/path/to/custom.db npm run dev -w backend
```

## Changing the backend port

```bash
PORT=5000 npm run dev -w backend
```

Update `VITE_API_BASE_URL` in `frontend/.env.local` to match.

## Rebuilding after Node version change

better-sqlite3 is a native addon and must be rebuilt when the Node version changes:

```bash
npm rebuild better-sqlite3 -w backend
```

## CSV import

1. Navigate to the **Imports** tab in the frontend.
2. Upload a CSV file. Columns are auto-detected (date, vendor/payee, amount).
3. To use a saved mapping, select a template before uploading.
4. To save the detected mapping as a template, set a template name before uploading.

Supported column name variants:
- Date: any column containing `date`
- Vendor: `vendor`, `merchant`, `payee`, `description`
- Amount: `amount`, `debit`, `credit`

## Document upload

Supported MIME types: PDF, JPEG, PNG, GIF, WebP, plain text, CSV, Excel (xls/xlsx),
Word (doc/docx). Maximum file size: 50 MB.

## Export

1. Navigate to the **Exports** tab.
2. Choose export type (transactions, documents, or evidence links).
3. Optionally filter by business.
4. Click Create Export — the CSV is generated synchronously.
5. Click Download to retrieve the file.

## Connector sync

1. Navigate to the **Connectors** tab.
2. Create a connector (type: `simulated_csv_feed` or `simulated_api_feed`).
3. Click Sync to run a simulated import.

Note: both connector types use the same random-data generator. Real bank feeds
require implementing an actual connector.

## Troubleshooting

**Backend won't start — "Module did not self-register"**
Node version mismatch for better-sqlite3. Run:
```bash
npm rebuild better-sqlite3 -w backend
```

**Frontend shows blank page or network errors**
Check that `VITE_API_BASE_URL` in `frontend/.env.local` points to the running backend.

**Database locked / WAL errors**
Another process holds the db. Stop all backend instances first.

**TypeScript errors after pulling**
Run `npm install` to pick up any new deps, then check `frontend/tsconfig.json`
has `"types": ["vite/client"]` under `compilerOptions`.
