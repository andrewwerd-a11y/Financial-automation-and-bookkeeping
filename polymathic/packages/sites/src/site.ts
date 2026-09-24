import { getTrade, type PriceEstimate, type ProviderProfile } from '@polymathic/core';

/** What the provider controls. Everything else comes from verified platform data. */
export interface SiteSettings {
  ownerId: string;
  slug: string;
  published: boolean;
  headline?: string;
  about?: string;
  /** Hex brand color, e.g. #2f6fdf. */
  accent?: string;
  /** Services to feature; defaults to everything the provider's trades cover. */
  serviceIds?: string[];
  /** Provider's own starting prices per service (USD, per the service's unit). */
  prices?: Record<string, number>;
  /** Portfolio photos (https URLs). */
  photos?: string[];
}

export interface SiteService {
  id: string;
  name: string;
  unit: string;
  startingAt?: number;
  typicalRange: { low: number; high: number };
}

export interface SiteReview {
  rating: number;
  comment?: string;
  date: string;
}

export interface SiteData {
  settings: SiteSettings;
  provider: ProviderProfile;
  services: SiteService[];
  reviews: SiteReview[];
  /** Absolute origin, e.g. https://polymathic.app */
  baseUrl: string;
  /** Set after a quote request is submitted from this page. */
  flash?: string;
}

const RESERVED = new Set(['admin', 'api', 'app', 'www', 'polymathic', 'login', 'signup', 'find', 'sites', 'static', 'vendor']);

export function validateSlug(slug: string): string | null {
  if (!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(slug)) return 'Use 3–40 lowercase letters, numbers, or dashes';
  if (RESERVED.has(slug)) return 'That address is reserved';
  return null;
}

export function validateSettings(s: Partial<SiteSettings>): string[] {
  const errors: string[] = [];
  if (s.slug !== undefined) {
    const e = validateSlug(s.slug);
    if (e) errors.push(e);
  }
  if (s.accent !== undefined && !/^#[0-9a-fA-F]{6}$/.test(s.accent)) errors.push('Accent must be a hex color like #2f6fdf');
  if (s.headline !== undefined && s.headline.length > 120) errors.push('Headline is limited to 120 characters');
  if (s.about !== undefined && s.about.length > 2000) errors.push('About is limited to 2000 characters');
  for (const url of s.photos ?? []) {
    if (!/^https:\/\/[^\s"'<>]+$/.test(url)) errors.push(`Photo must be an https URL: ${url.slice(0, 60)}`);
  }
  if ((s.photos?.length ?? 0) > 12) errors.push('Up to 12 photos');
  for (const [id, price] of Object.entries(s.prices ?? {})) {
    if (!(typeof price === 'number' && price > 0 && price < 1_000_000)) errors.push(`Invalid price for ${id}`);
  }
  return errors;
}

export function siteService(estimate: PriceEstimate, startingAt?: number): SiteService {
  return {
    id: estimate.serviceId,
    name: estimate.serviceName,
    unit: estimate.unit,
    startingAt,
    typicalRange: { low: Math.round(estimate.perUnit.low), high: Math.round(estimate.perUnit.high) },
  };
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** JSON for a <script> block: escape "<" so user text can never close the tag. */
const jsonForScript = (x: unknown) => JSON.stringify(x).replace(/</g, '\\u003c');

const UNIT_LABEL: Record<string, string> = {
  job: 'per job', hour: 'per hour', visit: 'per visit', day: 'per day', month: 'per month', room: 'per room',
  item: 'per item', sqft: 'per sq ft', linear_ft: 'per linear ft', guest: 'per guest',
};

export function siteUrl(data: Pick<SiteData, 'baseUrl' | 'settings'>): string {
  return `${data.baseUrl}/s/${data.settings.slug}`;
}

/** schema.org structured data so search engines understand the business. */
export function structuredData(data: SiteData): Record<string, unknown> {
  const { provider, settings, services, reviews } = data;
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: provider.name,
    url: siteUrl(data),
    description: settings.headline ?? `${provider.trades.map((t) => getTrade(t)?.name ?? t).join(', ')} in ${provider.home.region}`,
    areaServed: provider.home.region,
    makesOffer: services.map((svc) => ({
      '@type': 'Offer',
      itemOffered: { '@type': 'Service', name: svc.name },
      ...(svc.startingAt ? { priceSpecification: { '@type': 'UnitPriceSpecification', price: svc.startingAt, priceCurrency: 'USD', unitText: UNIT_LABEL[svc.unit] } } : {}),
    })),
  };
  if (settings.photos?.length) ld.image = settings.photos;
  if (reviews.length) {
    ld.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Math.round((reviews.reduce((a, r) => a + r.rating, 0) / reviews.length) * 10) / 10,
      reviewCount: reviews.length,
    };
  }
  return ld;
}

export function renderSite(data: SiteData): string {
  const { provider, settings, services, reviews } = data;
  const accent = settings.accent ?? '#2f6fdf';
  const trades = provider.trades.map((t) => getTrade(t)?.name ?? t);
  const headline = settings.headline ?? `${trades.slice(0, 3).join(' · ')} in ${provider.home.region}`;
  const badges = [
    provider.verified.identity && 'ID verified',
    provider.verified.backgroundCheck && 'Background checked',
    provider.verified.insurance && 'Insured',
    provider.verified.license && 'Licensed',
    provider.trustTier && `Polymathic ${provider.trustTier}`,
  ].filter((b): b is string => !!b);
  const rating = provider.rating !== null ? `${provider.rating.toFixed(1)}★ from ${provider.reviewCount} reviews` : '';
  const title = `${provider.name} — ${headline}`;
  const url = siteUrl(data);

  const serviceCards = services
    .map(
      (svc) => `<div class="card"><h3>${esc(svc.name)}</h3>
        ${svc.startingAt ? `<p class="price">From $${svc.startingAt.toLocaleString('en-US')} <span>${esc(UNIT_LABEL[svc.unit] ?? '')}</span></p>` : ''}
        <p class="muted">Typical local range $${svc.typicalRange.low.toLocaleString('en-US')}–$${svc.typicalRange.high.toLocaleString('en-US')} ${esc(UNIT_LABEL[svc.unit] ?? '')}</p></div>`,
    )
    .join('');
  const reviewItems = reviews
    .slice(0, 6)
    .map((r) => `<blockquote><p class="stars" aria-label="${r.rating} out of 5">${'★'.repeat(Math.round(r.rating))}${'☆'.repeat(5 - Math.round(r.rating))}</p>${r.comment ? `<p>${esc(r.comment)}</p>` : ''}<footer class="muted">Verified job · ${esc(r.date.slice(0, 10))}</footer></blockquote>`)
    .join('');
  const photos = (settings.photos ?? []).map((p) => `<img src="${esc(p)}" alt="Work by ${esc(provider.name)}" loading="lazy">`).join('');
  const serviceOptions = services.map((svc) => `<option value="${esc(svc.id)}">${esc(svc.name)}</option>`).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(headline)}. ${esc(badges.join(', '))}. Request a quote online.">
<link rel="canonical" href="${esc(url)}">
<link rel="icon" href="data:,">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(headline)}">
<meta property="og:url" content="${esc(url)}">
${settings.photos?.[0] ? `<meta property="og:image" content="${esc(settings.photos[0])}">` : ''}
<script type="application/ld+json">${jsonForScript(structuredData(data))}</script>
<style>
:root{--accent:${accent};--bg:#fff;--fg:#1a1d23;--muted:#5d6573;--card:#f6f7f9;--border:#e1e4ea}
@media (prefers-color-scheme:dark){:root{--bg:#111318;--fg:#e8eaef;--muted:#9aa3b2;--card:#1a1d24;--border:#2b303a}}
*{box-sizing:border-box}body{margin:0;font:16px/1.5 system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--fg)}
.wrap{max-width:960px;margin:0 auto;padding:0 16px}
header{padding:48px 0 32px;border-bottom:4px solid var(--accent)}
h1{font-size:clamp(28px,5vw,42px);margin:0 0 8px}h2{margin:40px 0 16px}h3{margin:0 0 6px;font-size:17px}
.lead{font-size:19px;color:var(--muted);margin:0 0 16px}
.badges{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 20px}.badges span{background:var(--card);border:1px solid var(--border);border-radius:99px;padding:3px 12px;font-size:13px}
.btn{display:inline-block;background:var(--accent);color:#fff;text-decoration:none;border:0;border-radius:8px;padding:12px 20px;font:600 16px system-ui;cursor:pointer}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
.card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px}
.price{font-weight:700;font-size:18px;margin:4px 0}.price span,.muted{color:var(--muted);font-size:13px;font-weight:400}
.photos{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px}.photos img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px}
blockquote{margin:0 0 12px;padding:12px 16px;background:var(--card);border-left:4px solid var(--accent);border-radius:6px}.stars{color:#e0a100;margin:0}
form{display:grid;gap:12px;max-width:560px}label{display:grid;gap:4px;font-weight:600;font-size:14px}
input,select,textarea{font:inherit;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--fg)}
.flash{background:#1f9d55;color:#fff;padding:12px 16px;border-radius:8px;margin:16px 0}
footer.site{margin:48px 0 24px;color:var(--muted);font-size:13px}
</style>
</head>
<body>
<div class="wrap">
<header>
  <h1>${esc(provider.name)}</h1>
  <p class="lead">${esc(headline)}</p>
  ${rating ? `<p>${esc(rating)}</p>` : ''}
  <div class="badges">${badges.map((b) => `<span>${esc(b)}</span>`).join('')}</div>
  <a class="btn" href="#quote">Request a quote</a>
  ${data.flash ? `<p class="flash" role="status">${esc(data.flash)}</p>` : ''}
</header>
${services.length ? `<section><h2>Services</h2><div class="grid">${serviceCards}</div></section>` : ''}
${settings.about ? `<section><h2>About</h2><p>${esc(settings.about).replace(/\n/g, '<br>')}</p></section>` : ''}
${photos ? `<section><h2>Recent work</h2><div class="photos">${photos}</div></section>` : ''}
${reviewItems ? `<section><h2>Reviews</h2>${reviewItems}</section>` : ''}
<section><h2>Service area</h2><p>${esc(provider.home.region)} and within about ${Math.round(provider.serviceRadiusKm * 0.621)} miles.</p></section>
<section id="quote"><h2>Request a quote</h2>
<form method="post" action="/s/${esc(settings.slug)}/request">
  <label>What do you need done?<textarea name="description" rows="4" required maxlength="2000"></textarea></label>
  ${serviceOptions ? `<label>Service<select name="serviceId"><option value="">Not sure</option>${serviceOptions}</select></label>` : ''}
  <label>When<select name="timing"><option value="asap">As soon as possible</option><option value="this_week">This week</option><option value="flexible">I'm flexible</option></select></label>
  <label>Your name<input name="name" required maxlength="100" autocomplete="name"></label>
  <label>Email<input name="email" type="email" maxlength="200" autocomplete="email"></label>
  <label>Phone<input name="phone" type="tel" maxlength="30" autocomplete="tel"></label>
  <button class="btn" type="submit">Send request</button>
  <p class="muted">Payments are held securely by Polymathic until the job is done.</p>
</form></section>
<footer class="site">Verified profile on Polymathic · Payments protected by escrow</footer>
</div>
</body>
</html>`;
}

export function renderSitemap(baseUrl: string, slugs: string[]): string {
  const urls = slugs.map((slug) => `  <url><loc>${esc(`${baseUrl}/s/${slug}`)}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
