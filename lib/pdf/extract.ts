import { createCanvas } from "canvas";

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_PAGES = 20;
const RENDER_SCALE = 1.5;

export function validatePdfConstraints(buffer: Buffer): void {
  if (buffer.byteLength > MAX_BYTES) {
    throw new Error("PDF exceeds 20MB limit");
  }
}

export async function extractPdfPages(
  buffer: Buffer,
  maxPages = MAX_PAGES
): Promise<string[]> {
  validatePdfConstraints(buffer);

  // Dynamic import keeps Next.js from bundling this ESM module into the client.
  // The legacy build disables the worker automatically in Node.js environments.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "";

  const pdf = await pdfjs
    .getDocument({ data: new Uint8Array(buffer) })
    .promise;

  const pageCount = Math.min(pdf.numPages, maxPages);
  const results: string[] = [];

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const canvas = createCanvas(
      Math.round(viewport.width),
      Math.round(viewport.height)
    );
    const ctx = canvas.getContext("2d");

    await page.render({
      // pdfjs-dist v6 requires `canvas`; `canvasContext` is kept for
      // the node-canvas compatibility shim.
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;

    results.push(canvas.toDataURL("image/png"));
    page.cleanup();
  }

  await pdf.cleanup();
  return results;
}
