// ─────────────────────────────────────────────────────────────────────────────
// Handwriting — vector stroke capture & rendering
//
// POC goal: capture Apple-Pencil handwriting (any language, incl. Hebrew) as
// compact VECTOR data — not a raster image. We store the raw stroke points
// (x, y, pressure). A few KB per field vs tens of KB for a PNG, and the result
// stays crisp at any render resolution.
// ─────────────────────────────────────────────────────────────────────────────

/** A single sampled point: [x, y, pressure]. Coords are in the field's base space. */
export type StrokePoint = [number, number, number];

export interface Stroke {
  pts: StrokePoint[];
  color?: string;
}

/** Serializable handwriting payload for one field. */
export interface HandwritingData {
  /** Base coordinate space the points were captured in (logical px). */
  w: number;
  h: number;
  strokes: Stroke[];
}

export function emptyHandwriting(w = 600, h = 200): HandwritingData {
  return { w, h, strokes: [] };
}

export function isHandwritingEmpty(data: HandwritingData | null | undefined): boolean {
  return !data || data.strokes.length === 0;
}

// ── Rendering ────────────────────────────────────────────────────────────────

export interface DrawOptions {
  /** Base stroke width in px (before pressure modulation). */
  baseWidth?: number;
  color?: string;
}

/**
 * Draw a single stroke onto a 2D context, scaling from base space (sx, sy).
 * Width is modulated by pressure; round caps/joins blend the segments smoothly.
 */
function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  sx: number,
  sy: number,
  opts: Required<DrawOptions>,
) {
  const pts = stroke.pts;
  if (pts.length === 0) return;

  const color = stroke.color ?? opts.color;
  const scale = (sx + sy) / 2;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Single dot
  if (pts.length === 1) {
    const [x, y, p] = pts[0];
    ctx.beginPath();
    ctx.arc(x * sx, y * sy, (opts.baseWidth * (0.4 + p)) / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  for (let i = 1; i < pts.length; i++) {
    const [x0, y0, p0] = pts[i - 1];
    const [x1, y1, p1] = pts[i];
    ctx.lineWidth = opts.baseWidth * (0.4 + (p0 + p1) / 2) * scale;
    ctx.beginPath();
    ctx.moveTo(x0 * sx, y0 * sy);
    ctx.lineTo(x1 * sx, y1 * sy);
    ctx.stroke();
  }
}

/** Draw all strokes onto a context, fitting the base space into target dimensions. */
export function drawHandwriting(
  ctx: CanvasRenderingContext2D,
  data: HandwritingData,
  targetW: number,
  targetH: number,
  opts: DrawOptions = {},
) {
  const resolved: Required<DrawOptions> = {
    baseWidth: opts.baseWidth ?? 2.2,
    color: opts.color ?? "#1f2937",
  };
  const sx = targetW / data.w;
  const sy = targetH / data.h;
  for (const stroke of data.strokes) {
    drawStroke(ctx, stroke, sx, sy, resolved);
  }
}

/** Render handwriting to a PNG data URL at the given pixel size (for PDF embedding). */
export function handwritingToDataUrl(
  data: HandwritingData,
  targetW: number,
  targetH: number,
  opts: DrawOptions & { scale?: number } = {},
): string {
  const scale = opts.scale ?? 2; // 2x for crisp print
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(targetW * scale);
  canvas.height = Math.round(targetH * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.scale(scale, scale);
  drawHandwriting(ctx, data, targetW, targetH, opts);
  return canvas.toDataURL("image/png");
}

// ── Serialization (size-optimized) ───────────────────────────────────────────

/**
 * Serialize with coordinate rounding to keep the payload small:
 * x/y to 1 decimal, pressure to 2 decimals. Lossless enough for handwriting.
 */
export function serializeHandwriting(data: HandwritingData): string {
  const compact: HandwritingData = {
    w: data.w,
    h: data.h,
    strokes: data.strokes.map((s) => ({
      ...(s.color ? { color: s.color } : {}),
      pts: s.pts.map(
        ([x, y, p]) =>
          [Math.round(x * 10) / 10, Math.round(y * 10) / 10, Math.round(p * 100) / 100] as StrokePoint,
      ),
    })),
  };
  return JSON.stringify(compact);
}

/** Byte size of the serialized payload (UTF-8). */
export function handwritingByteSize(data: HandwritingData): number {
  return new Blob([serializeHandwriting(data)]).size;
}

/** Human-readable size, e.g. "3.2 KB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}
