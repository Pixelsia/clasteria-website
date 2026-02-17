export default defineAppConfig({
  seo: {
    defaultTitle: 'Clasteria',
    description: '新しい創造を、ここから',
    twitter: 'Pixelsia',
    theme: '#008236',
  },
  noscriptHtml: `
    <div style="position: fixed; left: 0; right: 0; bottom: 0; z-index: 6000000; background-color: #dc2626; padding: 1rem; text-align: center; color: #ffffff;">
      <strong style="font-weight: 700;">
        このサイトのすべての機能をご利用になるには、JavaScript が必要です。
        <br>
        JavaScript is required to access all features of this site.
        <br>
        ブラウザの設定で JavaScript を有効にし、ページを再読み込みしてください。
        <br>
        Please enable JavaScript in your browser settings and reload the page.
      </strong>
    </div>
  `.replaceAll(/\s+/g, ' ').trim(),
  ui: {
    colors: {
      primary: 'green',
      secondary: 'orange',
      success: 'green',
      info: 'blue',
      warning: 'yellow',
      error: 'red',
      neutral: 'slate',
    },
  },
});
