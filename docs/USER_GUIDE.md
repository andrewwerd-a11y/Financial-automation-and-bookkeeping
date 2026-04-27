# Financial Intake & Bookkeeping Platform - User Guide

## What this system does

This platform is a local-first financial intake and bookkeeping tool for small businesses and freelancers. It helps you:

- Import your bank and credit card transactions from CSV files
- Organize transactions by business entity
- Attach receipts and documents as evidence for each transaction
- Review and approve how transactions are categorized
- Flag transactions that need your accountant's attention
- Export clean, organized data for tax prep or accounting software

The system runs on your own computer. Your data stays local unless you choose to export it and send it to someone else.

---

## First-time setup (do this once)

### Step 1: Start the application

Open two PowerShell windows in the project folder.

In the first window, run:

```powershell
npm install
npm rebuild better-sqlite3 -w backend
npm run db:init -w backend
npm run dev -w backend
```

Healthy backend startup looks like this:

- A line showing the database path, such as `[startup] db=...finance.db`
- `Backend listening on http://localhost:4000`

In the second window, run:

```powershell
npm run dev -w frontend
```

Healthy frontend startup looks like this:

- Vite starts without errors
- The app is available at `http://localhost:5173`

Open `http://localhost:5173` in your browser. If the system is healthy, the **Settings** tab should show `Backend health: ok`.

### Step 2: Create a workspace

A workspace is the top-level container for everything in the system. Think of it like a binder that holds all of your financial records, businesses, users, settings, receipts, and exports.

Go to the **Workspace** tab and fill in:

- **Workspace name**: the full name you want to see on screen, such as `Acme Consulting`
- **Workspace slug**: a short lowercase identifier, such as `acme-consulting`

The slug should be simple:

- Use lowercase letters
- Use hyphens instead of spaces
- Keep it short

Example:

- Workspace name: `River City Resale`
- Workspace slug: `river-city-resale`

Click **Create Workspace**. Then click **Select** so the workspace becomes active for the rest of the system.

### Step 3: Create a business entity

A business is the specific entity you are tracking money for inside the workspace.

Examples:

- Your LLC
- Your eBay resale operation
- Your freelance design business
- Your delivery gig activity if you track it separately

Go to the **Businesses** tab and create one business record for each business entity you want to track.

Fields:

- **Business name**: the name you use to recognize the entity
- **Type/Label**: a short description such as `LLC`, `sole proprietor`, `resale`, or `consulting`

Examples:

- Name: `Main Street Resale LLC`, Type/Label: `LLC`
- Name: `Jane Doe Freelance`, Type/Label: `sole proprietor`

After creating the business, click **Select** so the system knows which entity you are currently working in.

### Step 4: Create your first policy rule (optional but recommended)

A policy rule is a simple automatic flag. In plain English, it means:

"If a transaction matches this condition, call my attention to it."

Go to the **Policy Rules** tab and choose one of the three rule types:

- **Amount threshold**: flags any transaction above a dollar amount
- **Category restriction**: flags any transaction in a category you want to watch closely
- **Missing evidence**: flags any transaction that has no receipt or supporting document attached

Examples:

- Amount threshold of `50`: useful if you want to review anything over $50
- Category restriction of `meals`: useful if you want to double-check meal expenses
- Missing evidence: useful if you want the system to remind you about every transaction that still needs a receipt

For most small businesses, a good starting point is an **amount threshold** of `$50` or `$75`.

---

## Daily workflow - importing transactions

### How to get your CSV from your bank

Most banks and credit card providers let you export account activity as a CSV file.

Common labels you may see:

- `Download CSV`
- `Export transactions`
- `Activity export`
- `Download account history`

The system can recognize the most common column names automatically. It looks for:

- Date columns such as `Date` or `Transaction Date`
- Vendor columns such as `Vendor`, `Merchant`, `Payee`, or sometimes `Description`
- Amount columns such as `Amount`, `Debit`, or `Credit`

If your bank uses unusual column names, save an import template once and reuse it every time.

### Importing a single CSV file

Go to the **Imports** tab.

In **Single File Import**:

1. Choose your CSV file
2. Optionally select a saved template
3. Optionally enter a template name if you want the system to save a new detected mapping
4. Click **Upload CSV**

After the import finishes, the page will show a message like:

`Imported 120 rows, skipped 3.`

That means:

- `Imported 120 rows`: 120 rows were turned into transactions
- `Skipped 3`: 3 rows were ignored because they could not be safely imported

Common reasons rows are skipped:

- Missing date
- Missing vendor or payee
- Missing amount
- A row that is just a blank separator line in the CSV

### Importing multiple CSV files at once

Use **Bulk File Import** when you have several files at once.

This is useful when:

- You download one file per month
- You have one file per credit card
- You are catching up on several months of records

Choose all CSV files in the file picker, then click **Upload Bulk CSVs**.

The system will tell you how many files completed and how many failed.

### Saving an import template

If your bank uses non-standard column names, save a template so you do not have to think about mapping every time.

Example:

- Your bank uses `Transaction Date` instead of `Date`
- Your bank uses `Merchant` instead of `Vendor`
- Your bank uses `Debit` instead of `Amount`

In that case:

1. Upload one file
2. Enter a name in **Save inferred template as (optional)**
3. Use a name like `Chase Business Checking CSV`

Later, pick that template from the dropdown before uploading new files from the same bank.

### What happens after import

When you import a CSV, the system automatically:

1. Reads each row and creates a transaction record
2. Tries to categorize the transaction based on vendor name and description
3. Assigns a confidence score showing how sure it is
4. Sends uncertain transactions to the review workflow
5. Checks policy rules for the active business
6. Creates an ingestion job record so you can see import history

The current built-in category suggestions include:

- `software_tools`: software subscriptions and online tools
- `shipping`: postage and delivery charges
- `fees`: marketplace or platform fees
- `inventory`: items purchased for resale
- `fuel`: gas and fuel expenses
- `vehicle_repair`: vehicle maintenance or repair
- `meals`: restaurant and meal expenses
- `office_equipment`: laptops, monitors, and similar equipment
- `unknown`: the system could not make a confident guess

Plain-English examples:

- `GitHub` usually maps to `software_tools`
- `USPS` usually maps to `shipping`
- `eBay` may map to `fees`
- `Costco` may map to `inventory`
- `Shell` may map to `fuel`

---

## Reviewing transactions

### The Review Queue

The **Review Queue** is where you go when the system wants human input.

It includes transactions such as:

- Unknown categories
- Low-confidence guesses
- Suspected duplicates
- Transactions that policy rules flagged for attention

Think of it as your "decision inbox."

### Quick actions in the Review Queue

For each row, you can use quick actions:

- **Approve**: accept the current suggestion
- **Hold**: leave it unresolved for now because you need more context
- **Mark personal**: mark the transaction as personal rather than business-related

Example:

- A `GitHub` subscription with high confidence is usually safe to approve
- A coffee shop charge that could be personal or business might go on hold until you remember the reason
- A grocery-store expense that was clearly personal should be marked personal

### Deep review in the Transactions tab

For a fuller view, go to the **Transactions** tab and click **Open** on any transaction.

The detail panel shows:

- **Suggested category**: what the system guessed
- **Final category**: your final decision, if you override the suggestion
- **Suggested activity**: what part of the business the system thinks it belongs to
- **Final activity**: your confirmed activity, if you override it
- **Confidence score**: a number from `0.0` to `1.0`
- **Review status**: whether the transaction still needs review
- **Policy flags**: any rules that fired on that transaction
- **Evidence status**: whether a receipt is attached
- **Treatment fields**: the system's tax-treatment suggestion

How to read the confidence score:

- `0.75` and above: usually a strong guess
- `0.60` to `0.74`: useful suggestion, but review it
- Below `0.60`: the system is not very confident

Common review statuses:

- `needs_review`: still needs a decision
- `approved`: accepted
- `held`: waiting for more information
- `personal`: personal expense
- `rejected`: intentionally rejected

### Setting treatment for tax purposes

The **Treatment** tab is separate from the basic category review.

Category tells you what the expense was.
Treatment tells you how it may be handled for accounting or tax purposes.

Treatment buckets in plain English:

- `current_expense`: normal day-to-day deductible business expense
- `asset_candidate`: equipment or property that may need depreciation instead of a full immediate deduction
- `inventory_candidate`: goods you bought to resell
- `vehicle_candidate`: vehicle-related expense that may need mileage support or accountant review
- `meals_candidate`: meal expense that usually needs documentation and may not be fully deductible
- `startup_candidate`: cost from before the business officially began operating
- `organizational_candidate`: setup or entity-formation expense
- `personal_or_excluded`: not a business deduction
- `needs_accountant_review`: the system cannot safely decide
- `unknown`: no useful treatment suggestion yet

Important: using **Save** in the Treatment tab does not file taxes, submit forms, or change a tax return. It is a working note for you and your accountant.

---

## Managing receipts and documents

### Uploading a document

Go to the **Documents** tab.

You can upload:

- PDF files
- JPG or PNG receipts
- GIF or WebP images
- Plain text files
- CSV files
- Excel files (`.xls`, `.xlsx`)
- Word files (`.doc`, `.docx`)

Current file size limit: **50 MB** per document.

Steps:

1. Choose the file
2. Optionally add notes
3. Click **Upload Document**

Examples:

- A photographed paper receipt
- A PDF invoice from a software vendor
- An emailed receipt saved as PDF

### Linking a document to a transaction

There are two ways to link evidence.

From the **Transactions** tab:

1. Open the transaction
2. In **Link Document**, choose the document
3. Optionally set a relation type
4. Choose a strength
5. Optionally add a business-purpose note
6. Click **Link Document**

From the **Documents** tab:

1. Open the document
2. In **Link to Transaction**, choose the transaction
3. Optionally set relation type and note
4. Click **Link Transaction**

Strength values:

- `linked`: you are confident this document belongs to that transaction
- `weak`: you think it probably matches, but you are not fully sure

Use `weak` if, for example, a receipt total is slightly different because of a tip or a timing delay.

### The Missing Evidence queue

The **Missing Evidence** tab shows transactions with no receipt linked.

This is your weekly "what still needs a receipt?" checklist.

A practical rule:

- For small routine items, you may decide the documentation is less critical
- For anything over `$75`, it is usually wise to attach a receipt

### The Unmatched Documents queue

The **Unmatched Documents** tab shows uploaded documents that are not linked to any transaction yet.

This usually means one of two things:

- You uploaded the receipt before importing the transaction
- You forgot to connect the receipt after uploading it

Good habit:

- Upload receipts the same day
- Match them the same day if possible

That keeps the unmatched queue small and manageable.

---

## Connectors

A connector is a way to simulate pulling in transaction data from an external source.

Right now, connectors are **simulated only**. They are useful for demos and practice, but they are not live bank connections.

Current connector types:

- `simulated_csv_feed`
- `manual_external_file`

Go to the **Connectors** tab to:

1. Choose a connector type
2. Click **Create Connector**
3. Click **Run Sync**

This is useful if you want to see how the sync-job workflow behaves, but it is not a replacement for real bank downloads yet.

---

## Reconciliation

Reconciliation is the duplicate-checking step.

Plain English version:

"Did I import the same transaction twice by mistake?"

Go to the **Reconciliation** tab and click **Run Reconciliation Scan**.

The system looks for likely duplicate pairs and shows each candidate in a table.

For each candidate:

- **Resolve**: yes, these are the same underlying transaction
- **Reject**: no, they only look similar

Example:

- Two `$42.00` entries on the same date for the same vendor may be a real duplicate
- Two identical fuel purchases on the same day might also be two separate trips, so you would reject that pair

Use reconciliation as a cleanup pass, especially after imports.

---

## Reports

### What the reports show

The **Reports** tab summarizes the system in business language.

Sections:

- **Overall summary**: total transactions, total dollar amount, document count, linked evidence count
- **By Category**: spending by category
- **By Business Activity**: spending by part of your business
- **By Review Status**: how much is approved, pending, held, personal, or rejected
- **By Evidence Status**: how many transactions have receipts and how many still need them

If you use multiple businesses, the active business selection affects what you see in several workflow pages. Use the business selector first if you want to review one entity at a time.

### Using reports for tax prep

A good year-end goal is:

- Most transactions are `approved`
- Most important transactions have `linked` evidence
- The review queue is empty or close to empty
- The accountant queue in Treatment is short and understandable

Reports help you see whether you are ready.

Example:

- If **By Review Status** shows a large `needs_review` count, you still have cleanup work
- If **By Evidence Status** shows many `missing` items, you should focus on finding receipts before tax prep

---

## Exporting data

### When to export

Use exports when:

- You want a quarterly backup
- You are preparing for a tax meeting
- Your accountant asked for structured records
- You want to open the data in Excel

### What export types do

- **Transactions CSV**: transaction records, categories, review status, treatment fields, policy flags, and related fields
- **Documents CSV**: uploaded document records and metadata
- **Evidence Links CSV**: the mapping between transactions and supporting documents

### Downloading the export file

Go to the **Exports** tab.

1. Click the export type you want
2. Wait for the job to appear
3. Click **Download**

The file is created on your machine. The download link opens the generated CSV from the backend.

---

## Workspaces and multi-business management

### Using the workspace context

The active workspace and active business matter.

The left sidebar shows:

- `Workspace: ...`
- `Business: ...`

That tells you what context you are working in.

Typical pattern:

1. Select the workspace
2. Select the business
3. Then work in Transactions, Imports, Policies, and Documents

If you track multiple businesses, switch the active business before importing, reviewing, or exporting.

### Workspace settings

The **Settings** tab has a workspace settings section where you can store freeform key/value notes.

These are not hard-coded accounting rules. Think of them as operational reference data.

Examples:

- `currency` -> `"USD"`
- `fiscal_year_start` -> `"January"`
- `bookkeeper_notes` -> `"Use resale category for marketplace supply purchases"`

Because values are stored as JSON text, you can keep either simple values or structured notes.

Examples:

- `"January"`
- `{"accountant":"Pat","closeDay":"last business day of month"}`

---

## Best practices for intake

### Weekly routine (30 minutes)

1. **Import this week's transactions** - download CSV files from each account and upload them
2. **Clear the Review Queue** - approve, hold, or mark personal as needed
3. **Clear Missing Evidence** - attach receipts to anything still missing support
4. **Upload new receipts** - keep your receipt folder current
5. **Link new receipts** - clear the unmatched-documents queue

### Monthly routine (1 hour)

1. Run reports and look at category totals
2. Check the Treatment accountant queue
3. Run reconciliation to catch duplicates
4. Export transactions, documents, and evidence links for your records

### Before meeting with your accountant

1. Clear as much of the review queue as possible
2. Link receipts for major expenses
3. Export all three CSV types
4. Review the Treatment accountant queue together

### Category best practices

Examples for common business types:

For an eBay resale business:

- Inventory bought for resale -> `inventory`
- eBay platform charges -> `fees`
- USPS postage -> `shipping`
- Packing supplies might also land in `shipping` depending on vendor wording

For gig delivery or driving:

- Gas station purchases -> `fuel`
- Auto parts or garage work -> `vehicle_repair`
- Meals while working are not automatically business deductions, so review them carefully

For software or consulting businesses:

- GitHub, Notion, OpenAI, AWS -> `software_tools`
- Laptop or monitor purchases -> `office_equipment`
- Office lunch or coffee -> often `meals`, but confirm the real business purpose

### What NOT to do

- Do not import the same CSV twice on purpose
- Do not mark every unknown transaction as personal just to clear the queue
- Do not ignore receipts for larger transactions
- Do not wait until year-end to do a full cleanup if you can avoid it

Small weekly maintenance is much easier than a once-a-year scramble.

---

## Troubleshooting

### "The backend isn't running" or pages show errors

Open this in your browser:

`http://localhost:4000/health`

If it does not return:

```json
{"ok":true}
```

restart the backend with:

```powershell
npm run dev -w backend
```

### Import shows 0 rows imported

Most common causes:

- The CSV does not have a real header row
- The vendor, date, or amount column names are unusual
- Important cells are blank

Fix:

1. Open the CSV in Excel or a text editor
2. Confirm the first row contains column names
3. Create an import template with the exact column names your bank uses

### A transaction has the wrong category

The system only makes a suggestion. Your final decision is what matters.

Use the Review Queue or the transaction detail panel to approve, hold, or reclassify.

Examples:

- `GitHub` should usually be software
- `Shell` should usually be fuel
- `Costco` could be inventory or something else depending on what you bought

Always use your own judgment over the suggestion.

### The database seems corrupted or I want to start over

See [docs/RUNBOOK.md](./RUNBOOK.md) for the reset procedure.

The main database file is:

`backend/data/finance.db`

Deleting that file and re-running database init resets the system.

Important: that removes your local data, so make exports first if you need a backup.

### Performance is slow with large imports

The current import flow is synchronous.

Practical guidance:

- A few hundred rows should feel fine
- Around 1,000 rows may take a bit longer
- Very large imports are not heavily optimized yet

If you have many files, break them into smaller batches.

---

## Reference: keyboard shortcuts and tips

- Use the **Refresh** button on pages instead of reloading the whole browser tab
- In the **Treatment** tab, clicking a bucket button filters the transaction list to that treatment bucket
- In the **Transactions** tab, use **Open** to see the full detail panel before making a decision
- In the **Documents** tab, open a document before linking it if you want to review the file metadata first
- Keep the active workspace and business in mind before importing or creating records

---

## Glossary

| Term | Plain English definition |
|---|---|
| Transaction | A single money event, such as a purchase, fee, or payment |
| Source file | The CSV file that produced imported transactions |
| Document | A receipt, invoice, or supporting file you uploaded |
| Evidence link | The connection between a transaction and a document |
| Evidence status | Whether a transaction has no receipt, a strong receipt link, or only a weak possible match |
| Review status | Your decision state for a transaction, such as needs review, approved, held, personal, or rejected |
| Treatment | The likely accounting or tax handling of the expense |
| Policy rule | A rule that automatically flags transactions that match certain conditions |
| Workspace | The top-level container for all your data, like a binder |
| Business | A specific entity or activity you track inside the workspace |
| Ingestion job | A record of an import run, useful for checking what happened |
| Connector | A simulated external source that can create transactions through a sync flow |
| Reconciliation candidate | A pair of transactions the system thinks may be duplicates |
| Export job | A CSV export the system created for download |
| Treatment bucket | A named treatment category such as current expense, inventory candidate, or needs accountant review |
| Accountant queue | Transactions flagged as needing professional accounting review |
