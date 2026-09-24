import type { Opportunity } from '@polymathic/core';

type JobDefaults = 'requiredCertifications' | 'requiredEquipment' | 'minTrustTier' | 'requiresBackgroundCheck' | 'headcount';
export type JobInput = Omit<Opportunity, 'id' | 'source' | 'postedBy' | JobDefaults> & Partial<Pick<Opportunity, JobDefaults>>;

export const JOB_BODY_SCHEMA = {
  type: 'object',
  required: ['title', 'description', 'category', 'engagement', 'urgency', 'remote', 'requiredSkills'],
  properties: {
    title: { type: 'string', minLength: 3 },
    description: { type: 'string' },
    category: { type: 'string', minLength: 1 },
    engagement: { enum: ['gig', 'contract', 'temp', 'full_time'] },
    urgency: { enum: ['immediate', 'scheduled', 'long_term'] },
    remote: { type: 'boolean' },
    requiredSkills: { type: 'array' },
    headcount: { type: 'integer', minimum: 1 },
  },
} as const;
