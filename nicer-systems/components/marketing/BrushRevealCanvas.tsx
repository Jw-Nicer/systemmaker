"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { track, EVENTS } from "@/lib/analytics";

interface BrushRevealCanvasProps {
  className?: string;
}

export function BrushRevealCanvas({ className }: BrushRevealCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const hasStarted = useRef(false);
  const hasCompleted = useRef(false);
  const rafRef = useRef<number>(0);
  const [fallback, setFallback] = useState(false);

  // Draw the blueprint grid overlay on an offscreen canvas
  const drawBlueprint = useCallback((w: number, h: number): HTMLCanvasElement => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;

    // Dark navy base
    ctx.fillStyle = "#0a0e1a";
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    const spacing = 40;
    ctx.strokeStyle = "rgba(0, 212, 255, 0.08)";
    ctx.lineWidth = 1;

    for (let x = 0; x <= w; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Node dots at intersections (sparse)
    ctx.fillStyle = "rgba(0, 212, 255, 0.15)";
    for (let x = 0; x <= w; x += spacing) {
      for (let y = 0; y <= h; y += spacing) {
        if (Math.random() > 0.7) {
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Connecting lines between some nodes
    ctx.strokeStyle = "rgba(0, 212, 255, 0.06)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const x1 = Math.floor(Math.random() * (w / spacing)) * spacing;
      const y1 = Math.floor(Math.random() * (h / spacing)) * spacing;
      const x2 = x1 + (Math.random() > 0.5 ? spacing : 0);
      const y2 = y1 + (Math.random() > 0.5 ? spacing : 0);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    return c;
  }, []);

  // Check reveal percentage
  const checkReveal = useCallback(() => {
    if (!overlayRef.current || hasCompleted.current) return;
    const ctx = overlayRef.current.getContext("2d")!;
    const w = overlayRef.current.width;
    const h = overlayRef.current.height;
    const step = 20;
    let total = 0;
    let cleared = 0;

    const data = ctx.getImageData(0, 0, w, h).data;
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        total++;
        const idx = (y * w + x) * 4 + 3; // alpha channel
        if (data[idx] < 128) cleared++;
      }
    }

    if (cleared / total > 0.5) {
      hasCompleted.current = true;
      track(EVENTS.BRUSH_REVEAL_COMPLETE);
    }
  }, []);

  // Draw brush stroke
  const draw = useCallback(
    (x: number, y: number) => {
      if (!overlayRef.current) return;
      const ctx = overlayRef.current.getContext("2d")!;
      const rect = canvasRef.current!.getBoundingClientRect();
      const scaleX = overlayRef.current.width / rect.width;
      const scaleY = overlayRef.current.height / rect.height;
      const cx = (x - rect.left) * scaleX;
      const cy = (y - rect.top) * scaleY;

      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(cx, cy, 40, 0, Math.PI * 2);
      ctx.fill();

      // Render to visible canvas
      const mainCtx = canvasRef.current!.getContext("2d")!;
      mainCtx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
      mainCtx.drawImage(overlayRef.current, 0, 0);
    },
    [checkReveal]
  );

  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      isDrawing.current = true;
      if (!hasStarted.current) {
        hasStarted.current = true;
        track(EVENTS.BRUSH_REVEAL_START);
      }
      draw(e.clientX, e.clientY);
    },
    [draw]
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDrawing.current) return;
      draw(e.clientX, e.clientY);
    },
    [draw]
  );

  const handlePointerUp = useCallback(() => {
    isDrawing.current = false;
    checkReveal();
  }, [checkReveal]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const w = container.offsetWidth;
    const h = container.offsetHeight;

    // Performance check
    const start = performance.now();
    const testCanvas = document.createElement("canvas");
    testCanvas.width = 100;
    testCanvas.height = 100;
    const testCtx = testCanvas.getContext("2d")!;
    for (let i = 0; i < 100; i++) {
      testCtx.beginPath();
      testCtx.arc(50, 50, 30, 0, Math.PI * 2);
      testCtx.fill();
    }
    if (performance.now() - start > 200) {
      setFallback(true);
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = w * dpr;
    const ch = h * dpr;

    canvas.width = cw;
    canvas.height = ch;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    // Create overlay (blueprint grid)
    const overlay = drawBlueprint(cw, ch);
    overlayRef.current = overlay;

    // Draw overlay to visible canvas
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(overlay, 0, 0);

    // Event listeners
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      cancelAnimationFrame(rafRef.current);
    };
  }, [drawBlueprint, handlePointerDown, handlePointerMove, handlePointerUp]);

  if (fallback) {
    return (
      <div className={className}>
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-secondary)] opacity-20" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`absolute inset-0 ${className ?? ""}`}>
      {/* Bottom layer: gradient revealed by brush */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--theme-primary)]/30 via-[var(--theme-secondary)]/20 to-transparent" />
      {/* Top layer: canvas with blueprint grid */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-crosshair"
        style={{ touchAction: "none" }}
      />
    </div>
  );
}
