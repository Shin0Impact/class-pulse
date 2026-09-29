import { useEffect, useRef, useState } from "react";
import type { OpenDocument } from "./documents.ts";

// Draws one page of the open document as large as the stage allows, crisp on hi-DPI projectors.
export default function DocumentViewer({ doc, page }: { doc: OpenDocument; page: number }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [error, setError] = useState("");

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ w: Math.floor(entry.contentRect.width), h: Math.floor(entry.contentRect.height) }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (doc.kind !== "pdf" || !size.w || !size.h) return;
    let cancelled = false;
    let task: { cancel: () => void } | null = null;
    setError("");
    (async () => {
      try {
        const pdfPage = await doc.pdf.getPage(page);
        if (cancelled) return;
        const base = pdfPage.getViewport({ scale: 1 });
        const fit = Math.min(size.w / base.width, size.h / base.height);
        const ratio = window.devicePixelRatio || 1;
        const viewport = pdfPage.getViewport({ scale: fit * ratio });
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        ctx.direction = "ltr"; // after resizing: a resize resets the context
        canvas.style.width = `${Math.floor(viewport.width / ratio)}px`;
        canvas.style.height = `${Math.floor(viewport.height / ratio)}px`;
        const render = pdfPage.render({ canvas, canvasContext: ctx, viewport });
        task = render;
        await render.promise;
      } catch (e) {
        // A newer page/size replaced this render: not an error.
        if (!cancelled && !(e instanceof Error && e.name === "RenderingCancelledException")) {
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, page, size.w, size.h]);

  return (
    // dir="ltr": a canvas inherits the page direction, and in Arabic mode pdf.js would then lay out
    // the PDF's own text right-to-left (scrambled). The document keeps its own direction.
    <div className="present-stage" ref={stageRef} dir="ltr">
      {doc.kind === "pdf" ? (
        <canvas ref={canvasRef} className="present-stage__page" aria-label={`${doc.name}, ${page}`} />
      ) : (
        <img className="present-stage__page present-stage__image" src={doc.url} alt={doc.name} />
      )}
      {error && (
        <p className="present-stage__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
