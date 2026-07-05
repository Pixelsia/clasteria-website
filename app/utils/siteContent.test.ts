import { describe, expect, it } from 'vitest';
import { accountNavItems, leaderboardGroups, primaryNavItems, siteNavItems, unresolvedItems } from './siteContent';

describe('siteContent', () => {
  it('仕様書で求められた9ページをナビゲーションに持つ', () => {
    expect(siteNavItems.map(item => item.to)).toEqual([
      '/',
      '/codingcraft',
      '/onigokko',
      '/kakurenbo',
      '/leaderboard',
      '/support',
      '/articles',
      '/login',
      '/register',
    ]);
    expect(primaryNavItems).toHaveLength(7);
    expect(accountNavItems).toHaveLength(2);
  });

  it('各リーダーボードはTop10の枠だけを持つ', () => {
    expect(leaderboardGroups).toHaveLength(3);
    expect(leaderboardGroups.every(group => group.rows.length === 10)).toBe(true);
    expect(leaderboardGroups.flatMap(group => group.rows).every(row => row.score === 'TODO')).toBe(true);
  });

  it('未決事項をPRへ転記できる形で保持する', () => {
    expect(unresolvedItems.map(item => item.title)).toEqual([
      'TODO: リーダーボード',
      'TODO: サポートフォーム',
      'TODO: ログイン',
      'TODO: 購入・登録',
      'TODO: ニュース',
    ]);
  });
});
