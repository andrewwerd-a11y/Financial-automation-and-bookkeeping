import { reputation, type Review } from './reviews.js';
import { computeTrust } from './trust.js';
import { getEquipment } from './equipment.js';
import { getTrade } from './trades.js';
import type { WorkerProfile } from './types.js';

export interface CompletedJob {
  title: string;
  tradeId: string;
  completedAt: string;
  clientName?: string;
}

export interface Resume {
  name: string;
  headline: string;
  location: string;
  trustLine: string;
  verifiedSkills: string[];
  otherSkills: string[];
  certifications: string[];
  equipment: string[];
  experience: { trade: string; jobs: number; latest: string }[];
  stats: { label: string; value: string }[];
}

const LEVEL = ['', 'Learning', 'Competent', 'Proficient', 'Expert', 'Master'];

/**
 * A resume that writes itself from verified platform activity, so it's always
 * current and every line is backed by evidence.
 */
export function buildResume(worker: WorkerProfile, jobs: CompletedJob[] = [], reviews: Review[] = []): Resume {
  const trust = computeTrust(worker);
  const rep = reputation(worker.id, reviews);
  const skillLine = (s: WorkerProfile['skills'][number]) => `${titleCase(s.id)} (${LEVEL[s.level]})`;

  const byTrade = new Map<string, CompletedJob[]>();
  for (const j of jobs) byTrade.set(j.tradeId, [...(byTrade.get(j.tradeId) ?? []), j]);
  const experience = [...byTrade.entries()]
    .map(([tradeId, list]) => ({
      trade: getTrade(tradeId)?.name ?? titleCase(tradeId),
      jobs: list.length,
      latest: list.map((j) => j.completedAt).sort().at(-1)!.slice(0, 10),
    }))
    .sort((a, b) => b.jobs - a.jobs);

  const topSkills = [...worker.skills].sort((a, b) => b.level - a.level).slice(0, 3).map((s) => titleCase(s.id));
  const h = worker.history;
  const stats = [
    { label: 'Completed jobs', value: String(h.completedJobs) },
    h.averageRating !== null ? { label: 'Average rating', value: `${h.averageRating.toFixed(2)} (${h.ratingCount} reviews)` } : null,
    h.onTimeRate !== null ? { label: 'On-time', value: `${Math.round(h.onTimeRate * 100)}%` } : null,
    rep.overall !== null ? { label: 'Polymathic client rating', value: rep.overall.toFixed(2) } : null,
  ].filter((x): x is { label: string; value: string } => x !== null);

  return {
    name: worker.displayName,
    headline: topSkills.length ? `${topSkills.join(' · ')} professional` : 'Independent professional',
    location: worker.home.region,
    trustLine: `Polymathic ${trust.tier} (${trust.score}/100)${worker.verification.identity ? ' · ID verified' : ''}${
      worker.verification.backgroundCheck === 'clear' ? ' · Background checked' : ''
    }${worker.verification.insurance ? ' · Insured' : ''}`,
    verifiedSkills: worker.skills.filter((s) => s.evidence !== 'self_reported').map(skillLine),
    otherSkills: worker.skills.filter((s) => s.evidence === 'self_reported').map(skillLine),
    certifications: worker.certifications.map((c) => `${c.id.toUpperCase()} — ${c.issuer}${c.verified ? ' (verified)' : ''}`),
    equipment: worker.equipment.map((x) => getEquipment(x.id)?.name ?? titleCase(x.id)),
    experience,
    stats,
  };
}

export function resumeToMarkdown(r: Resume): string {
  const section = (title: string, items: string[]) => (items.length ? `\n## ${title}\n${items.map((i) => `- ${i}`).join('\n')}\n` : '');
  return [
    `# ${r.name}`,
    `**${r.headline}** — ${r.location}`,
    '',
    r.trustLine,
    section('Verified skills', r.verifiedSkills),
    section('Other skills', r.otherSkills),
    section('Certifications', r.certifications),
    section('Equipment', r.equipment),
    section('Experience', r.experience.map((e) => `${e.trade}: ${e.jobs} jobs (latest ${e.latest})`)),
    section('Track record', r.stats.map((s) => `${s.label}: ${s.value}`)),
  ].join('\n');
}

function titleCase(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
