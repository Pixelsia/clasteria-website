import { describe, expect, it } from 'vitest';
import { accountNavItems, featureCards, primaryNavItems, siteNavItems, supportDiscord, supportEmail } from './siteContent';

describe('initial-release content', () => {
  it('only exposes supported public destinations', () => {
    expect(siteNavItems.map(item => item.to)).toEqual([
      '/', '/onigokko', '/kakurenbo', '/articles', '/support',
    ]);
    expect(primaryNavItems).toEqual(siteNavItems);
    expect(accountNavItems).toEqual([]);
  });

  it('does not promote unavailable features from game cards', () => {
    expect(featureCards.map(item => item.to)).toEqual(['/onigokko', '/kakurenbo']);
    expect(featureCards.every(item => item.image.startsWith('/images/clasteria/'))).toBe(true);
  });

  it('uses the verified existing contact destinations', () => {
    expect(supportEmail).toBe('support@pixelsia.net');
    expect(supportDiscord).toBe('https://discord.gg/TwTPa4Yp4h');
  });
});
