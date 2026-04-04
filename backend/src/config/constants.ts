export const ACTIVITIES = [
  'personal',
  'spark_gig_work',
  'ebay_reselling',
  'software_startup',
  'llc_organizational',
  'unclear_mixed'
] as const;

export const CATEGORIES = [
  'income',
  'inventory_purchases',
  'shipping_postage',
  'marketplace_fees',
  'software_subscriptions',
  'phone_internet',
  'equipment_computer',
  'startup_costs',
  'organizational_costs',
  'vehicle',
  'meals',
  'insurance',
  'office_supplies',
  'advertising_marketing',
  'bank_processing_fees',
  'personal',
  'unclear'
] as const;

export const TAX_TREATMENTS = [
  'likely_current_year_business_expense',
  'likely_startup_cost',
  'likely_organizational_cost',
  'likely_capital_asset_equipment',
  'likely_inventory_cogs_related',
  'likely_mixed_use_partial',
  'likely_personal_nondeductible',
  'needs_review'
] as const;
