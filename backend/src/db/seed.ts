import { db, bootstrapDb } from './client.js';
import { ACTIVITIES, CATEGORIES } from '../config/constants.js';
import { makeId } from '../shared/id.js';

export const seedIfEmpty = (): void => {
  const insertActivity = db.prepare('INSERT OR IGNORE INTO businesses_or_activities (id, name) VALUES (?, ?)');
  ACTIVITIES.forEach((name) => insertActivity.run(name, name));

  const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (id, name) VALUES (?, ?)');
  CATEGORIES.forEach((name) => insertCategory.run(name, name));

  const count = db.prepare('SELECT COUNT(*) as total FROM transactions').get() as { total: number };
  if (count.total > 0) return;

  const txInsert = db.prepare(`INSERT INTO transactions (
    id, date, vendor, amount, direction, source_account, source_type, raw_description,
    activity_or_business, category, tax_treatment_suggestion, treatment_explanation,
    confidence_score, review_status, notes, duplicate_key
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const rows = [
    ['2026-01-05', 'Spark Driver Payout', 625, 'income', 'Spark', 'manual', 'Gig payout', 'spark_gig_work', 'income', 'likely_current_year_business_expense', 'Income event.', 0.95, 'approved'],
    ['2026-01-08', 'Costco Wholesale', 410, 'expense', 'Chase Card', 'csv', 'Inventory purchase for resale', 'ebay_reselling', 'inventory_purchases', 'likely_inventory_cogs_related', 'Inventory related expense.', 0.81, 'pending'],
    ['2026-01-10', 'Adobe', 54.99, 'expense', 'Amex', 'csv', 'Creative cloud subscription', 'software_startup', 'software_subscriptions', 'likely_current_year_business_expense', 'Software subscription pattern match.', 0.92, 'approved'],
    ['2026-01-12', 'Local Diner', 38.41, 'expense', 'Amex', 'csv', 'Meal with potential business purpose', 'unclear_mixed', 'meals', 'needs_review', 'Meals should be reviewed.', 0.55, 'pending'],
    ['2026-01-18', 'State Filing Fee', 250, 'expense', 'Chase Checking', 'manual', 'LLC formation filing fee', 'llc_organizational', 'organizational_costs', 'likely_organizational_cost', 'Likely organizational filing cost.', 0.86, 'pending'],
    ['2026-01-20', 'Best Buy', 1399, 'expense', 'Amex', 'csv', 'Laptop for startup work', 'software_startup', 'equipment_computer', 'likely_capital_asset_equipment', 'Equipment may need capitalization review.', 0.67, 'pending'],
    ['2026-01-21', 'Shell Gas', 72.12, 'expense', 'Chase Card', 'csv', 'Vehicle gas', 'spark_gig_work', 'vehicle', 'likely_mixed_use_partial', 'Vehicle expenses are mixed-use sensitive.', 0.52, 'pending'],
    ['2026-01-22', 'AT&T', 120.45, 'expense', 'Chase Card', 'csv', 'Phone bill', 'unclear_mixed', 'phone_internet', 'likely_mixed_use_partial', 'Phone/internet often mixed-use.', 0.6, 'pending'],
    ['2026-01-24', 'eBay Fees', 44.2, 'expense', 'eBay', 'manual', 'Marketplace transaction fees', 'ebay_reselling', 'marketplace_fees', 'likely_current_year_business_expense', 'Marketplace fee pattern.', 0.88, 'approved'],
    ['2026-01-25', 'Unknown Vendor 5501', 89.14, 'expense', 'Amex', 'csv', 'Unclear spend', 'unclear_mixed', 'unclear', 'needs_review', 'Unknown vendor and unclear purpose.', 0.35, 'pending']
  ];

  rows.forEach((row) => {
    txInsert.run(
      makeId('txn'),
      row[0], row[1], row[2], row[3], row[4], row[5], row[6],
      row[7], row[8], row[9], row[10], row[11], row[12], 'Seeded transaction', `${row[0]}|${row[1]}|${row[2]}`
    );
  });
};

if (import.meta.url === `file://${process.argv[1]}`) {
  bootstrapDb();
  seedIfEmpty();
  console.log('Seed complete');
}
