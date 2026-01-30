const toDayIndex = (date: Date): number => Math.floor(date.getTime() / 86400e3);

/**
 * 記事の重みと投稿日時からホットスコアを算出します。投稿日時が未来、または重みが 0 以下の場合は Infinity を返します。
 *
 * @param weight - ランキング計算に用いる記事の重み (重要度)
 * @param postedAt - 記事の投稿日時
 * @param currentTime - スコア計算時の基準時刻
 * @returns ホットスコア (小さいほど上位)
 * @remarks UTC 日単位で切り捨てた経過日数を使用します。
 */
export function calculateHotScore(weight: number, postedAt: Date, currentTime = new Date()): number {
  if (weight <= 0) return Infinity;
  if (postedAt > currentTime) return Infinity;

  return (toDayIndex(currentTime) - toDayIndex(postedAt)) / weight;
}
