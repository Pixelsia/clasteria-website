export function formatDate(date?: Date, { includeTime = true } = {}): string {
  if (date == null) {
    return includeTime ? '????/??/?? ??:??' : '????/??/??';
  }
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: includeTime ? '2-digit' : undefined,
    minute: includeTime ? '2-digit' : undefined,
  });
};
