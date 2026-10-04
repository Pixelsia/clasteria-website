export function draftObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} の形式が正しくありません。`);
  }
  return value as Record<string, unknown>;
}

export function requireDraftKeys(value: Record<string, unknown>, keys: string[], label: string) {
  const actual = Object.keys(value);
  if (actual.length !== keys.length || actual.some(key => !keys.includes(key))) {
    throw new Error(`${label} に未対応の項目があります。`);
  }
}

export function draftText(value: unknown, label: string): string {
  // 改行とタブは文章として維持し、それ以外の制御文字だけを拒否する。
  if (typeof value !== 'string' || value.length > 2000
    || Array.from(value).some(character => character.charCodeAt(0) < 32 && !['\t', '\n', '\r'].includes(character))) {
    throw new Error(`${label} が無効です。`);
  }
  return value;
}
