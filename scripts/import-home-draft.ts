import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseHomeDocument, serializeHomeDocument } from '../app/utils/homeDocument.ts';

const input = process.argv[2];
if (!input) {
  console.error('Usage: pnpm editor:import path/to/clasteria-home-draft.json');
  process.exitCode = 1;
}
else {
  try {
    const document = parseHomeDocument(await readFile(input, 'utf8'));
    const destination = fileURLToPath(new URL('../app/utils/homePage.json', import.meta.url));
    await writeFile(destination, `${serializeHomeDocument(document)}\n`, 'utf8');
    console.log('Home の下書きをソースへ取り込みました。差分、テスト、プレビューを確認してください。まだ公開されていません。');
  }
  catch (cause) {
    console.error(cause instanceof Error ? cause.message : '下書きを取り込めませんでした。');
    process.exitCode = 1;
  }
}
