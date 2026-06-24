import { useCallback, useEffect, useRef, useState } from "react";
import { Undo2, Eraser } from "lucide-react";
import {
  type HandwritingData,
  type Stroke,
  type StrokePoint,
  drawHandwriting,
  emptyHandwriting,
  handwritingByteSize,
  formatBytes,
} from "../../lib/handwriting";

interface Props {
  value: HandwritingData;
  onChange: (data: HandwritingData) => void;
  height?: number;
  color?: string;
  baseWidth?: number;
  /** Show live byte-size readout (POC diagnostics). */
  showSize?: boolean;
}

/**
 * A pen-friendly handwriting field. Captures Apple-Pencil strokes (with pressure)
 * as compact vector data. Renders imperatively for smooth drawing — React state
 * is only touched when a stroke completes.
 */
export function HandwritingCanvas({
  value,
  onChange,
  height = 180,
  color = "#1f2937",
  baseWidth = 2.2,
  showSize = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Strokes live in a ref for fast drawing; value prop seeds/syncs them.
  const strokesRef = useRef<Stroke[]>(value.strokes);
  const currentRef = useRef<Stroke | null>(null);
  const baseRef = useRef<{ w: number; h: number }>({ w: value.w, h: value.h });
  const drawingPointerId = useRef<number | null>(null);
  // Palm rejection: once a pen is seen, ignore touch input.
  const penSeenRef = useRef(false);

  const [cssWidth, setCssWidth] = useState(0);
  const [byteSize, setByteSize] = useState(() => handwritingByteSize(value));

  // Keep ref in sync if parent resets the value (e.g. "clear all" from outside).
  useEffect(() => {
    strokesRef.current = value.strokes;
    baseRef.current = { w: value.w, h: value.h };
    redraw();
    setByteSize(handwritingByteSize(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // ── Canvas sizing (responsive width, fixed height, DPI-aware) ──────────────
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const w = container.clientWidth;
    if (w === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    setCssWidth(w);
    // Lock base coordinate space to the first non-zero layout.
    if (baseRef.current.w === 0 || baseRef.current.h === 0) {
      baseRef.current = { w, h: height };
    }
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height]);

  useEffect(() => {
    setupCanvas();
    const ro = new ResizeObserver(setupCanvas);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [setupCanvas]);

  function redraw() {
    const canvas = canvasRef.current;
    if (!canvas || cssWidth === 0) {
      // cssWidth may be stale on first call; fall back to container width
      const w = containerRef.current?.clientWidth ?? 0;
      if (!canvas || w === 0) return;
      drawTo(canvas, w);
      return;
    }
    drawTo(canvas, cssWidth);
  }

  function drawTo(canvas: HTMLCanvasElement, w: number) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, height);
    const data: HandwritingData = {
      w: baseRef.current.w || w,
      h: baseRef.current.h || height,
      strokes: strokesRef.current,
    };
    drawHandwriting(ctx, data, w, height, { baseWidth, color });
  }

  // ── Coordinate conversion: screen → base space ─────────────────────────────
  function toBase(e: React.PointerEvent): StrokePoint {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;
    const base = baseRef.current;
    const bx = (localX / rect.width) * base.w;
    const by = (localY / rect.height) * base.h;
    // Apple Pencil reports real pressure; mouse/touch report 0 or 0.5.
    const pressure =
      e.pointerType === "pen" && e.pressure > 0 ? e.pressure : 0.5;
    return [bx, by, pressure];
  }

  function shouldIgnore(e: React.PointerEvent): boolean {
    if (e.pointerType === "pen") {
      penSeenRef.current = true;
      return false;
    }
    // Reject touch (palm) once a pen has been used; allow mouse always.
    if (e.pointerType === "touch" && penSeenRef.current) return true;
    return false;
  }

  // ── Pointer handlers ───────────────────────────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent) => {
    if (shouldIgnore(e)) return;
    if (drawingPointerId.current !== null) return;
    e.preventDefault();
    drawingPointerId.current = e.pointerId;
    canvasRef.current?.setPointerCapture(e.pointerId);
    currentRef.current = { pts: [toBase(e)], color };
    strokesRef.current = [...strokesRef.current, currentRef.current];
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.pointerId !== drawingPointerId.current || !currentRef.current) return;
    e.preventDefault();
    // Coalesced events give higher-fidelity strokes on supported devices.
    const events = (e.nativeEvent as PointerEvent).getCoalescedEvents?.() ?? [e.nativeEvent];
    for (const ev of events) {
      currentRef.current.pts.push(toBaseNative(ev));
    }
    redraw();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.pointerId !== drawingPointerId.current) return;
    e.preventDefault();
    drawingPointerId.current = null;
    canvasRef.current?.releasePointerCapture?.(e.pointerId);
    currentRef.current = null;
    commit();
  };

  // Native-event variant for coalesced points
  function toBaseNative(e: PointerEvent): StrokePoint {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const base = baseRef.current;
    const bx = ((e.clientX - rect.left) / rect.width) * base.w;
    const by = ((e.clientY - rect.top) / rect.height) * base.h;
    const pressure = e.pointerType === "pen" && e.pressure > 0 ? e.pressure : 0.5;
    return [bx, by, pressure];
  }

  function commit() {
    const data: HandwritingData = {
      w: baseRef.current.w,
      h: baseRef.current.h,
      strokes: strokesRef.current,
    };
    setByteSize(handwritingByteSize(data));
    onChange(data);
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  const undo = () => {
    strokesRef.current = strokesRef.current.slice(0, -1);
    redraw();
    commit();
  };

  const clear = () => {
    strokesRef.current = [];
    redraw();
    commit();
  };

  const isEmpty = strokesRef.current.length === 0;

  return (
    <div ref={containerRef} className="w-full">
      <div className="relative rounded-xl border-2 border-gray-200 bg-white overflow-hidden">
        {/* Ruled background to suggest a writing line */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(transparent calc(100% - 1px), #e5e7eb 1px)",
            backgroundSize: `100% ${Math.round(height / 3)}px`,
          }}
        />
        <canvas
          ref={canvasRef}
          className="relative block touch-none cursor-crosshair"
          style={{ height }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        {isEmpty && (
          <span className="absolute top-2 right-3 text-xs text-gray-300 pointer-events-none">
            כתוב/י כאן בעט או באצבע…
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mt-1.5">
        <button
          type="button"
          onClick={undo}
          disabled={isEmpty}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40"
        >
          <Undo2 className="w-3.5 h-3.5" />
          בטל
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={isEmpty}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 disabled:opacity-40"
        >
          <Eraser className="w-3.5 h-3.5" />
          נקה
        </button>
        {showSize && (
          <span className="text-xs text-gray-400 mr-auto" dir="ltr">
            {formatBytes(byteSize)}
          </span>
        )}
      </div>
    </div>
  );
}

export { emptyHandwriting };
