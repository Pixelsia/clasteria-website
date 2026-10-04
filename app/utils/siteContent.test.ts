import { describe, expect, it } from 'vitest';
import { accountNavItems, featureCards, primaryNavItems, siteNavItems, supportDiscord, supportEmail, relatedServices, externalNavItems } from './siteContent';

describe('initial-release content', () => {
  it('only exposes supported public destinations', () => {
    expect(siteNavItems.map(item => item.to)).toEqual([
      '/', '/articles', '/access', '/support', 'https://recruit.pixelsia.net/',
    ]);
    expect(siteNavItems).toEqual([...primaryNavItems, ...externalNavItems]);
    expect(accountNavItems).toEqual([]);
  });
  it('identifies the official recruitment site as an external navigation destination', () => {
    expect(externalNavItems).toEqual([{ label: '採用情報', to: 'https://recruit.pixelsia.net/', eyebrow: 'RECRUIT', external: true }]);
  });

  it('preserves game prototype data without publishing it in navigation', () => {
    expect(featureCards.map(item => item.to)).toEqual(['/onigokko', '/kakurenbo']);
    expect(featureCards.every(feature => !siteNavItems.some(item => item.to === feature.to))).toBe(true);
    expect(featureCards.every(item => item.image.startsWith('/images/clasteria/'))).toBe(true);
  });

  it('links CodingCraft only as a verified external related service', () => {
    expect(relatedServices).toEqual([{ label: 'CodingCraft', to: 'https://codingcraft.pixelsia.net/login' }]);
    expect(siteNavItems.some(item => item.to === '/codingcraft')).toBe(false);
  });

  it('uses the verified existing contact destinations', () => {
    expect(supportEmail).toBe('support@pixelsia.net');
    expect(supportDiscord).toBe('https://discord.gg/fsts95chH5');
  });
});
