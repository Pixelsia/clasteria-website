/**
 * 記事の重みと投稿日時からホットスコアを算出します。投稿日時が未来、または重みが 0 以下の場合は Infinity を返します。
 *
 * @param hotDays - ランキング計算に用いる記事の重み (スコア +1.0 あたりの日数)
 * @param publishedAt - 記事の投稿日時
 * @param currentTime - スコア計算時の基準時刻
 * @returns ホットスコア (小さいほど上位)
 */
export function calculateHotScore(hotDays: number, publishedAt: Date, currentTime = new Date()): number {
  if (hotDays <= 0) return Infinity;
  if (publishedAt > currentTime) return Infinity;

  return (currentTime.getTime() - publishedAt.getTime()) / (86400e3 * hotDays);
}
