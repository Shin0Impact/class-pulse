import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { PageCapture } from '../../../api/ai.ts';

// Opening lesson files and turning "the page on screen" into what the AI reads: the page as a
// JPEG (so diagrams, charts and scanned slides count) plus its text (exact wording).

export type OpenDocument =
  | { kind: 'pdf'; name: string; pdf: PDFDocumentProxy; task: PDFDocumentLoadingTask; pages: number }
  | { kind: 'image'; name: string; url: string; image: HTMLImageElement; pages: 1 };

export const ACCEPTED = 'application/pdf,image/png,image/jpeg,image/webp';

// pdf.js is big: it only loads when a PDF is actually opened. The "legacy" build on purpose: the
// modern one uses brand-new JavaScript (Map.getOrInsertComputed) that school computers' browsers
// don't have yet, and simply fails to draw the page there.
let pdfjsPromise: Promise<typeof import('pdfjs-dist/legacy/build/pdf.mjs')> | null = null;
function loadPdfjs() {
  pdfjsPromise ??= Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
  ]).then(
    ([pdfjs, worker]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      return pdfjs;
    },
  );
  return pdfjsPromise;
}

export async function openDocument(blob: Blob, name: string): Promise<OpenDocument> {
  if (blob.type === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) {
    const pdfjs = await loadPdfjs();
    const task = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
    const pdf = await task.promise;
    return { kind: 'pdf', name, pdf, task, pages: pdf.numPages };
  }
  if (!blob.type.startsWith('image/')) throw new Error('Open a PDF or an image');
  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.src = url;
  await image.decode();
  return { kind: 'image', name, url, image, pages: 1 };
}

export function closeDocument(doc: OpenDocument | null): void {
  if (!doc) return;
  if (doc.kind === 'pdf') void doc.task.destroy();
  else URL.revokeObjectURL(doc.url);
}

const CAPTURE_MAX = 1400; // px on the long side: plenty for the model to read, small to upload

function canvasToJpeg(canvas: HTMLCanvasElement): PageCapture['image'] {
  const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
  return { mimeType: 'image/jpeg', data: dataUrl.slice(dataUrl.indexOf(',') + 1) };
}

export async function capturePage(doc: OpenDocument, pageNumber: number): Promise<PageCapture> {
  const canvas = document.createElement('canvas');
  canvas.dir = 'ltr'; // see DocumentViewer: never inherit the Arabic UI's right-to-left
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');

  if (doc.kind === 'image') {
    const scale = Math.min(1, CAPTURE_MAX / Math.max(doc.image.naturalWidth, doc.image.naturalHeight));
    canvas.width = Math.round(doc.image.naturalWidth * scale);
    canvas.height = Math.round(doc.image.naturalHeight * scale);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(doc.image, 0, 0, canvas.width, canvas.height);
    return { text: '', image: canvasToJpeg(canvas) };
  }

  const page = await doc.pdf.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: Math.min(3, CAPTURE_MAX / Math.max(base.width, base.height)) });
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  ctx.direction = 'ltr'; // after resizing: a resize resets the context
  await page.render({ canvas, canvasContext: ctx, viewport }).promise;

  const content = await page.getTextContent();
  const text = content.items
    .map((item) => ('str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : ''))
    .join('')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { text, image: canvasToJpeg(canvas) };
}
