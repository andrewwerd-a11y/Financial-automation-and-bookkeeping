export type ClassificationResult = {
  categorySuggested: string;
  businessActivitySuggested: string;
  confidenceScore: number;
  reviewStatus: 'needs_review' | 'approved' | 'held' | 'personal' | 'rejected';
};

const containsAny = (text: string, patterns: string[]) => patterns.some((p) => text.includes(p));

export const classifyTransaction = (vendor: string, descriptionRaw?: string, duplicateStatus?: string): ClassificationResult => {
  const text = `${vendor} ${descriptionRaw ?? ''}`.toLowerCase();

  let category = 'unknown';
  let activity = 'unknown';
  let confidence = 0.45;

  if (containsAny(text, ['github', 'notion', 'aws', 'google workspace', 'openai'])) {
    category = 'software_tools';
    activity = 'software_business';
    confidence = 0.85;
  } else if (containsAny(text, ['ebay', 'usps', 'fedex', 'shipping'])) {
    category = containsAny(text, ['usps', 'fedex', 'shipping']) ? 'shipping' : 'fees';
    activity = 'ebay';
    confidence = 0.8;
  } else if (containsAny(text, ['costco', 'wholesale', 'inventory'])) {
    category = 'inventory';
    activity = 'ebay';
    confidence = 0.75;
  } else if (containsAny(text, ['shell', 'chevron', 'gas'])) {
    category = 'fuel';
    activity = 'spark';
    confidence = 0.7;
  } else if (containsAny(text, ['repair', 'autozone', 'midas'])) {
    category = 'vehicle_repair';
    activity = 'spark';
    confidence = 0.68;
  } else if (containsAny(text, ['meal', 'diner', 'restaurant', 'coffee'])) {
    category = 'meals';
    activity = 'unknown';
    confidence = 0.58;
  } else if (containsAny(text, ['best buy', 'laptop', 'monitor'])) {
    category = 'office_equipment';
    activity = 'software_business';
    confidence = 0.65;
  }

  let reviewStatus: ClassificationResult['reviewStatus'] = 'needs_review';
  if (duplicateStatus === 'suspected_duplicate') {
    confidence = Math.min(confidence, 0.4);
    reviewStatus = 'needs_review';
  } else if (category !== 'unknown' && confidence >= 0.75) {
    reviewStatus = 'approved';
  }

  return {
    categorySuggested: category,
    businessActivitySuggested: activity,
    confidenceScore: Number(confidence.toFixed(2)),
    reviewStatus
  };
};
