import { createCanvas } from "canvas";
import { join } from "path";

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_PAGES = 20;
const RENDER_SCALE = 1.5;

export function validatePdfConstraints(buffer: Buffer): void {
  if (buffer.byteLength > MAX_BYTES) {
    throw new Error("PDF exceeds 20MB limit");
  }
}

// pdfjs-dist v3 requires a canvas factory for Node.js so it can create
// intermediate canvases for image operations without touching the browser DOM.
class NodeCanvasFactory {
  create(width: number, height: number) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");
    return { canvas, context };
  }

  reset(
    canvasAndContext: { canvas: ReturnType<typeof createCanvas>; context: unknown },
    width: number,
    height: number
  ) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(canvasAndContext: {
    canvas: ReturnType<typeof createCanvas>;
    context: unknown;
  }) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
  }
}

export async function extractPdfPages(
  buffer: Buffer,
  maxPages = MAX_PAGES
): Promise<string[]> {
  validatePdfConstraints(buffer);

  // pdfjs-dist v3 legacy build — explicit Node.js support with NodeCanvasFactory.
  // Dynamic import keeps Next.js from bundling it into the client.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.js");
  pdfjs.GlobalWorkerOptions.workerSrc = join(
    process.cwd(),
    "node_modules/pdfjs-dist/legacy/build/pdf.worker.js"
  );

  const canvasFactory = new NodeCanvasFactory();

  const loadingTask = (pdfjs as any).getDocument({
    data: new Uint8Array(buffer),
    canvasFactory,
    verbosity: 0,
  });
  const pdf = await loadingTask.promise;

  const pageCount = Math.min(pdf.numPages, maxPages);
  const results: string[] = [];

  try {
    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: RENDER_SCALE });
      const { canvas, context } = canvasFactory.create(
        Math.round(viewport.width),
        Math.round(viewport.height)
      );

      await page.render({
        canvasContext: context,
        viewport,
      }).promise;

      results.push(canvas.toDataURL("image/png"));
      canvasFactory.destroy({ canvas, context });
      page.cleanup();
    }
  } finally {
    await loadingTask.destroy().catch(() => {});
  }

  return results;
}
