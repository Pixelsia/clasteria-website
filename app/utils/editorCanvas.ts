import type { Editor } from 'grapesjs';

/** Install theme styles after GrapesJS has rebuilt the loading frame's head. */
export function configureHomeEditorCanvas(editor: Pick<Editor, 'on'>, sourceDocument: Document): void {
  editor.on('canvas:frame:load:head', ({ window: frameWindow }: { window: Window }) => {
    // An about:blank iframe may load synchronously while GrapesJS appends it.
    // Canvas.getDocument() can still be unset then; the event owns the correct frame.
    const frameDocument = frameWindow.document;
    for (const style of sourceDocument.querySelectorAll('style')) {
      frameDocument.head.appendChild(style.cloneNode(true));
    }
    const style = frameDocument.createElement('style');
    style.dataset.clasteriaCanvas = 'true';
    style.textContent = '[data-editor-section] a { cursor: default; } [data-editor-field] { pointer-events: auto; cursor: text; } [data-editor-field]:hover { outline: 2px dashed #16a34a; outline-offset: 3px; } [data-editor-field][contenteditable] { outline: 3px solid #16a34a; outline-offset: 4px; min-width: 1em; } .gjs-selected { outline: 3px solid #16a34a !important; } .site-reveal { transform: none !important; opacity: 1 !important; } body { margin: 0; }';
    frameDocument.head.appendChild(style);
    frameDocument.documentElement.lang = 'ja';
  });
}
