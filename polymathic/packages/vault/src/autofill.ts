import type { AccessContext, Vault } from './vault.js';

export interface ProfileField {
  key: string;
  label: string;
  /** Sensitive fields are masked in autofill previews unless explicitly revealed. */
  sensitive: boolean;
}

/** Canonical profile fields. Entered once, reused on every form. */
export const PROFILE_FIELDS: ProfileField[] = [
  { key: 'legal_name', label: 'Legal name', sensitive: false },
  { key: 'business_name', label: 'Business name / DBA', sensitive: false },
  { key: 'entity_type', label: 'Entity type (sole prop, LLC, S corp…)', sensitive: false },
  { key: 'ssn', label: 'Social Security number', sensitive: true },
  { key: 'ein', label: 'Employer Identification Number', sensitive: true },
  { key: 'address_line1', label: 'Street address', sensitive: false },
  { key: 'city', label: 'City', sensitive: false },
  { key: 'state', label: 'State', sensitive: false },
  { key: 'postal_code', label: 'ZIP code', sensitive: false },
  { key: 'phone', label: 'Phone', sensitive: false },
  { key: 'email', label: 'Email', sensitive: false },
  { key: 'date_of_birth', label: 'Date of birth', sensitive: true },
  { key: 'drivers_license', label: "Driver's license number", sensitive: true },
  { key: 'insurance_carrier', label: 'Insurance carrier', sensitive: false },
  { key: 'insurance_policy', label: 'Insurance policy number', sensitive: false },
  { key: 'insurance_expires', label: 'Insurance expiration', sensitive: false },
  { key: 'license_number', label: 'Trade/contractor license number', sensitive: false },
  { key: 'license_state', label: 'License state', sensitive: false },
  { key: 'website', label: 'Website', sensitive: false },
];

const FIELD_BY_KEY = new Map(PROFILE_FIELDS.map((f) => [f.key, f]));

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  /** Form label → one or more profile keys (first one present wins). */
  fields: { label: string; keys: string[]; required: boolean }[];
}

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    id: 'w9',
    name: 'IRS Form W-9 (request for taxpayer ID)',
    description: 'Clients need this before paying you $600+ in a year.',
    fields: [
      { label: 'Line 1 – Name', keys: ['legal_name'], required: true },
      { label: 'Line 2 – Business name', keys: ['business_name'], required: false },
      { label: 'Line 3a – Federal tax classification', keys: ['entity_type'], required: true },
      { label: 'Line 5 – Address', keys: ['address_line1'], required: true },
      { label: 'Line 6 – City', keys: ['city'], required: true },
      { label: 'Line 6 – State', keys: ['state'], required: true },
      { label: 'Line 6 – ZIP', keys: ['postal_code'], required: true },
      { label: 'Part I – Taxpayer ID (EIN or SSN)', keys: ['ein', 'ssn'], required: true },
    ],
  },
  {
    id: 'subcontractor-onboarding',
    name: 'Subcontractor onboarding packet',
    description: 'What general contractors and property managers ask for before your first job.',
    fields: [
      { label: 'Company name', keys: ['business_name', 'legal_name'], required: true },
      { label: 'Contact name', keys: ['legal_name'], required: true },
      { label: 'Phone', keys: ['phone'], required: true },
      { label: 'Email', keys: ['email'], required: true },
      { label: 'Mailing address', keys: ['address_line1'], required: true },
      { label: 'Tax ID', keys: ['ein', 'ssn'], required: true },
      { label: 'Insurance carrier', keys: ['insurance_carrier'], required: true },
      { label: 'Policy number', keys: ['insurance_policy'], required: true },
      { label: 'Policy expiration', keys: ['insurance_expires'], required: true },
      { label: 'License number', keys: ['license_number'], required: false },
      { label: 'License state', keys: ['license_state'], required: false },
    ],
  },
  {
    id: 'bid-proposal',
    name: 'Bid / proposal header',
    description: 'Company block for quotes and proposals.',
    fields: [
      { label: 'Company', keys: ['business_name', 'legal_name'], required: true },
      { label: 'Phone', keys: ['phone'], required: true },
      { label: 'Email', keys: ['email'], required: true },
      { label: 'Website', keys: ['website'], required: false },
      { label: 'License #', keys: ['license_number'], required: false },
      { label: 'Insured by', keys: ['insurance_carrier'], required: false },
    ],
  },
];

export interface FilledField {
  label: string;
  value: string | null;
  sourceKey: string | null;
  masked: boolean;
}

export interface AutofillResult {
  templateId: string;
  fields: FilledField[];
  /** Required fields the user still needs to provide (once, then never again). */
  missing: string[];
}

export function autofill(
  vault: Vault,
  userId: string,
  templateId: string,
  ctx: AccessContext & { revealSensitive?: boolean },
): AutofillResult {
  const template = FORM_TEMPLATES.find((t) => t.id === templateId);
  if (!template) throw new Error(`Unknown form template ${templateId}`);
  const available = new Set(vault.fieldKeys(userId));
  const purpose = ctx.purpose ?? `autofill:${templateId}`;

  const fields: FilledField[] = template.fields.map((f) => {
    const key = f.keys.find((k) => available.has(k));
    if (!key) return { label: f.label, value: null, sourceKey: null, masked: false };
    const value = vault.getField(userId, key, { actor: ctx.actor, purpose })!;
    const sensitive = FIELD_BY_KEY.get(key)?.sensitive ?? false;
    const mask = sensitive && !ctx.revealSensitive;
    return { label: f.label, value: mask ? maskValue(value) : value, sourceKey: key, masked: mask };
  });

  const missing = template.fields.filter((f, i) => f.required && fields[i]!.value === null).map((f) => f.label);
  return { templateId, fields, missing };
}

export function maskValue(value: string): string {
  const visible = value.replace(/\W/g, '').slice(-4);
  return `•••${visible}`;
}
