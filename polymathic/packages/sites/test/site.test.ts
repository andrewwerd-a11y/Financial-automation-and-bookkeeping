import { describe, expect, it } from 'vitest';
import { estimatePrice, type ProviderProfile } from '@polymathic/core';
import { renderSite, renderSitemap, siteService, structuredData, validateSettings, validateSlug, type SiteData } from '../src/index.js';

const provider: ProviderProfile = {
  id: 'w_alex',
  kind: 'worker',
  name: 'Alex R.',
  home: { lat: 30.27, lng: -97.74, region: 'Austin, TX' },
  serviceRadiusKm: 60,
  trades: ['handyman'],
  trustScore: 84,
  trustTier: 'pro',
  rating: 4.8,
  reviewCount: 118,
  verified: { identity: true, backgroundCheck: true, insurance: false, license: false },
  availableNow: true,
};

function data(overrides: Partial<SiteData['settings']> = {}): SiteData {
  return {
    settings: { ownerId: 'w_alex', slug: 'alex-handyman', published: true, ...overrides },
    provider,
    services: [siteService(estimatePrice('handyman-hourly', { location: provider.home }), 70)],
    reviews: [{ rating: 5, comment: 'Great work', date: '2026-09-01T00:00:00Z' }],
    baseUrl: 'https://polymathic.example',
  };
}

describe('provider websites', () => {
  it('renders services, prices, badges, reviews and a quote form', () => {
    const html = renderSite(data({ headline: 'Handyman in Austin' }));
    expect(html).toContain('<title>Alex R. — Handyman in Austin</title>');
    expect(html).toContain('From $70');
    expect(html).toContain('Background checked');
    expect(html).toContain('Great work');
    expect(html).toContain('action="/s/alex-handyman/request"');
    expect(html).toContain('<link rel="canonical" href="https://polymathic.example/s/alex-handyman">');
  });

  it('escapes everything the provider types, including inside structured data', () => {
    const html = renderSite(data({ headline: '</script><script>alert(1)</script>', about: '<img src=x onerror=alert(1)>' }));
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<img src=x');
    const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]!;
    expect(ld).not.toContain('</script');
    expect(JSON.parse(ld).description).toBe('</script><script>alert(1)</script>');
  });

  it('emits schema.org LocalBusiness data for search engines', () => {
    const ld = structuredData(data());
    expect(ld['@type']).toBe('LocalBusiness');
    expect(ld.aggregateRating).toEqual({ '@type': 'AggregateRating', ratingValue: 5, reviewCount: 1 });
    expect(JSON.stringify(ld)).toContain('"price":70');
  });

  it('validates settings', () => {
    expect(validateSlug('ok-slug')).toBeNull();
    expect(validateSlug('Bad Slug')).not.toBeNull();
    expect(validateSlug('admin')).toMatch(/reserved/);
    expect(validateSettings({ accent: 'red', photos: ['http://insecure.example/a.jpg', 'javascript:alert(1)'] })).toHaveLength(3);
    expect(validateSettings({ accent: '#12ab34', photos: ['https://cdn.example/a.jpg'] })).toEqual([]);
  });

  it('builds a sitemap', () => {
    expect(renderSitemap('https://p.example', ['a-b', 'c-d'])).toContain('<loc>https://p.example/s/c-d</loc>');
  });
});
