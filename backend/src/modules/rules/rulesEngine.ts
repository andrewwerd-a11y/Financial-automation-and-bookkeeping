export type RuleInput = {
  vendor: string;
  rawDescription?: string;
  amount: number;
  direction: 'income' | 'expense';
  category?: string;
  activity?: string;
};

export type RuleResult = {
  suggestion: string;
  confidence: number;
  explanation: string;
  reviewFlag: boolean;
  matchedReason: string;
  categorySuggestion?: string;
};

type Rule = {
  id: string;
  version: string;
  evaluate: (input: RuleInput) => RuleResult | null;
};

const contains = (v: string, patterns: string[]) => patterns.some((p) => v.includes(p));

export const confidenceFromSignals = (base: number, requiresReview: boolean): number => {
  const adjusted = requiresReview ? base - 0.15 : base;
  return Math.max(0.1, Math.min(0.99, Number(adjusted.toFixed(2))));
};

const rules: Rule[] = [
  {
    id: 'income-by-direction',
    version: '2026.phase0.v1',
    evaluate: (i) => i.direction === 'income' ? {
      suggestion: 'likely_current_year_business_expense',
      confidence: confidenceFromSignals(0.9, false),
      explanation: 'Income transaction identified by direction.',
      reviewFlag: false,
      matchedReason: 'direction=income',
      categorySuggestion: 'income'
    } : null
  },
  {
    id: 'software-vendors',
    version: '2026.phase0.v1',
    evaluate: (i) => contains(`${i.vendor} ${i.rawDescription ?? ''}`.toLowerCase(), ['adobe', 'github', 'notion', 'openai', 'google workspace']) ? {
      suggestion: 'likely_current_year_business_expense',
      confidence: confidenceFromSignals(0.85, false),
      explanation: 'Known software vendor pattern matched.',
      reviewFlag: false,
      matchedReason: 'software-vendor-keyword',
      categorySuggestion: 'software_subscriptions'
    } : null
  },
  {
    id: 'high-risk-categories',
    version: '2026.phase0.v1',
    evaluate: (i) => ['meals', 'vehicle', 'equipment_computer', 'phone_internet'].includes(i.category ?? '') ? {
      suggestion: i.category === 'equipment_computer' ? 'likely_capital_asset_equipment' : 'likely_mixed_use_partial',
      confidence: confidenceFromSignals(0.7, true),
      explanation: 'Category is high-risk or often mixed-use and needs review.',
      reviewFlag: true,
      matchedReason: `category=${i.category}`
    } : null
  },
  {
    id: 'startup-org-ambiguity',
    version: '2026.phase0.v1',
    evaluate: (i) => ['software_startup', 'llc_organizational'].includes(i.activity ?? '') ? {
      suggestion: i.activity === 'llc_organizational' ? 'likely_organizational_cost' : 'likely_startup_cost',
      confidence: confidenceFromSignals(0.75, true),
      explanation: 'Startup/organizational activity can be special treatment and should be reviewed.',
      reviewFlag: true,
      matchedReason: `activity=${i.activity}`
    } : null
  },
  {
    id: 'marketplace-patterns',
    version: '2026.phase0.v1',
    evaluate: (i) => contains(`${i.vendor} ${i.rawDescription ?? ''}`.toLowerCase(), ['ebay fee', 'shipping label', 'usps', 'fedex']) ? {
      suggestion: 'likely_current_year_business_expense',
      confidence: confidenceFromSignals(0.8, false),
      explanation: 'Marketplace/shipping pattern matched.',
      reviewFlag: false,
      matchedReason: 'marketplace-shipping-pattern',
      categorySuggestion: i.vendor.toLowerCase().includes('fee') ? 'marketplace_fees' : 'shipping_postage'
    } : null
  },
  {
    id: 'personal-patterns',
    version: '2026.phase0.v1',
    evaluate: (i) => contains(`${i.vendor} ${i.rawDescription ?? ''}`.toLowerCase(), ['netflix', 'spotify', 'walmart', 'target']) ? {
      suggestion: 'likely_personal_nondeductible',
      confidence: confidenceFromSignals(0.6, true),
      explanation: 'Potential personal merchant pattern; confidence reduced and review recommended.',
      reviewFlag: true,
      matchedReason: 'personal-pattern',
      categorySuggestion: 'personal'
    } : null
  }
];

export const evaluateRules = (input: RuleInput): RuleResult => {
  for (const rule of rules) {
    const matched = rule.evaluate(input);
    if (matched) return matched;
  }
  return {
    suggestion: 'needs_review',
    confidence: confidenceFromSignals(0.55, true),
    explanation: 'No specific rule matched. Needs manual review.',
    reviewFlag: true,
    matchedReason: 'fallback'
  };
};
