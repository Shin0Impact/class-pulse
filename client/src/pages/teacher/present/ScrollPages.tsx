import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { OpenDocument } from "./documents.ts";

type PdfDoc = Extract<OpenDocument, { kind: "pdf" }>;

const GAP = 14; // px between pages

// Every page of a PDF stacked at the stage's full width and scrolled continuously. Only the pages
// near the screen are drawn (a 200-page file must not hold 200 canvases). Reports which page is in
// the middle of the view, follows `page` when the teacher jumps (clicker / arrows), and can report
// or follow the scroll position as a 0..1 ratio, which is how the Screen window mirrors this one.
export default function ScrollPages({
  doc,
  page,
  onPageChange,
  onScrollRatio,
  scrollRatio,
}: {
  doc: PdfDoc;
  page: number;
  onPageChange?: (page: number) => void;
  onScrollRatio?: (ratio: number) => void;
  scrollRatio?: number;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  // height/width of each page; unknown pages use page 1's until they are drawn
  const [aspects, setAspects] = useState<Record<number, number>>({});
  const [firstAspect, setFirstAspect] = useState(1.3);
  const [active, setActive] = useState<Set<number>>(new Set([1, 2]));
  const [error, setError] = useState("");
  const canvases = useRef(new Map<number, HTMLCanvasElement>());
  const drawn = useRef(new Map<number, number>()); // page -> width it was drawn at
  const detected = useRef(page); // the page the scroll position says is current
  const following = scrollRatio !== undefined; // the Screen window: the teacher's scroll drives it

  const aspectOf = (n: number) => aspects[n] ?? firstAspect;

  // stage width (the page always fills it)
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // page 1's shape sizes the placeholders of every page not drawn yet
  useEffect(() => {
    let cancelled = false;
    doc.pdf.getPage(1).then((p) => {
      if (cancelled) return;
      const v = p.getViewport({ scale: 1 });
      setFirstAspect(v.height / v.width);
    });
    return () => {
      cancelled = true;
    };
  }, [doc]);

  // which pages are near the screen
  useEffect(() => {
    const root = stageRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        setActive((prev) => {
          const next = new Set(prev);
          for (const e of entries) {
            const n = Number((e.target as HTMLElement).dataset.page);
            if (e.isIntersecting) next.add(n);
            else next.delete(n);
          }
          return next;
        });
      },
      { root, rootMargin: "100% 0px" },
    );
    root.querySelectorAll("[data-page]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [doc, width]);

  // draw the near pages at the current width; free the ones that left
  useEffect(() => {
    if (!width) return;
    let cancelled = false;
    const tasks: Array<{ cancel: () => void }> = [];
    const ratio = window.devicePixelRatio || 1;

    for (const [n, canvas] of canvases.current) {
      if (!active.has(n) && drawn.current.has(n)) {
        canvas.width = 1;
        canvas.height = 1;
        drawn.current.delete(n);
      }
    }

    (async () => {
      for (const n of [...active].sort((a, b) => a - b)) {
        if (cancelled) return;
        const canvas = canvases.current.get(n);
        if (!canvas || drawn.current.get(n) === width || n < 1 || n > doc.pages) continue;
        try {
          const pdfPage = await doc.pdf.getPage(n);
          if (cancelled) return;
          const base = pdfPage.getViewport({ scale: 1 });
          const viewport = pdfPage.getViewport({ scale: (width / base.width) * ratio });
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          ctx.direction = "ltr"; // after resizing: a resize resets the context
          const render = pdfPage.render({ canvas, canvasContext: ctx, viewport });
          tasks.push(render);
          await render.promise;
          drawn.current.set(n, width);
          const aspect = base.height / base.width;
          setAspects((prev) => (Math.abs((prev[n] ?? firstAspect) - aspect) < 0.001 ? prev : { ...prev, [n]: aspect }));
          setError("");
        } catch (e) {
          if (!cancelled && !(e instanceof Error && e.name === "RenderingCancelledException")) {
            setError(e instanceof Error ? e.message : String(e));
          }
        }
      }
    })();

    return () => {
      cancelled = true;
      for (const t of tasks) t.cancel();
    };
  }, [doc, active, width, firstAspect]);

  // where a page starts, in the stage's own scroll coordinates
  const pageTop = (n: number) => {
    const stage = stageRef.current;
    const el = stage?.querySelector<HTMLElement>(`[data-page="${n}"]`);
    if (!stage || !el) return 0;
    return el.getBoundingClientRect().top - stage.getBoundingClientRect().top + stage.scrollTop;
  };

  // teacher jumps to a page (clicker, arrows, pager): scroll there. Scrolling itself sets `page`
  // through onPageChange, which is already the detected page, so it never fights the user.
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el || following || !width || page === detected.current) return;
    detected.current = page;
    el.scrollTop = Math.max(0, pageTop(page) - 8);
  }, [page, width, following]);

  // the Screen window follows the teacher's scroll, again whenever the layout changes height
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el || !following || !width) return;
    el.scrollTop = (scrollRatio ?? 0) * Math.max(0, el.scrollHeight - el.clientHeight);
  }, [scrollRatio, following, width, aspects, firstAspect]);

  const raf = useRef(0);
  const onScroll = useCallback(() => {
    if (following) return;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const el = stageRef.current;
      if (!el) return;
      const max = el.scrollHeight - el.clientHeight;
      onScrollRatio?.(max > 0 ? el.scrollTop / max : 0);
      // the page under the middle of the view
      const stageTop = el.getBoundingClientRect().top;
      const middle = el.clientHeight / 2;
      let current = 1;
      for (const child of el.querySelectorAll<HTMLElement>("[data-page]")) {
        if (child.getBoundingClientRect().top - stageTop <= middle) current = Number(child.dataset.page);
        else break;
      }
      if (current !== detected.current) {
        detected.current = current;
        onPageChange?.(current);
      }
    });
  }, [following, onPageChange, onScrollRatio]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const pages = Array.from({ length: doc.pages }, (_, i) => i + 1);
  return (
    <div className="present-stage present-stage--scroll" ref={stageRef} dir="ltr" onScroll={onScroll}>
      <div className="present-scroll">
        {pages.map((n) => (
          <div
            key={n}
            data-page={n}
            className="present-scroll__page"
            style={{ height: Math.round(width * aspectOf(n)) || undefined, marginBottom: GAP }}
          >
            <canvas
              ref={(c) => {
                if (c) canvases.current.set(n, c);
                else canvases.current.delete(n);
              }}
              className="present-scroll__canvas"
              style={{ width: "100%", height: "100%" }}
              aria-label={`${doc.name}, ${n}`}
            />
          </div>
        ))}
      </div>
      {error && (
        <p className="present-stage__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
